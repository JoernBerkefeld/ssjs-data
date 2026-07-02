/**
 * audit-method-coverage.mjs
 *
 * 1. Enumerates every SSJS API entry in ssjs-data
 * 2. Compares against dist/sfmc-globals.d.ts
 * 3. Compares against ssjs.guide documented APIs
 * 4. Writes vscode-sfmc-language/client/testFixture/test-ssjs-catalog.ssjs
 * 5. Writes audit report JSON for tabular overview
 *
 * Run: node scripts/audit-method-coverage.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DTS = path.join(ROOT, 'dist/sfmc-globals.d.ts');
const TEST_OUT = path.join(
    __dirname,
    '../../vscode-sfmc-language/client/testFixture/test-ssjs-catalog.ssjs',
);
const REPORT_OUT = path.join(ROOT, 'dist/method-coverage-audit.json');

import {
    SSJS_GLOBALS,
    PLATFORM_METHODS,
    PLATFORM_FUNCTIONS,
    PLATFORM_VARIABLE_METHODS,
    PLATFORM_RESPONSE_METHODS,
    PLATFORM_REQUEST_METHODS,
    PLATFORM_RECIPIENT_METHODS,
    HTTP_METHODS,
    HTTPHEADER_METHODS,
    WSPROXY_METHODS,
    SCRIPT_UTIL_CONSTRUCTORS,
    SCRIPT_UTIL_REQUEST_METHODS,
    EVENT_METHODS,
    DATA_EXTENSION_METHODS,
    DATA_EXTENSION_FIELDS_METHODS,
    DATA_EXTENSION_ROWS_METHODS,
    ECMASCRIPT_BUILTINS,
    ATTRIBUTE_METHODS,
    DATE_TIME_TIMEZONE_METHODS,
    DATE_TIME_METHODS,
    ERROR_UTIL_METHODS,
    ACCOUNT_METHODS,
    ACCOUNT_TRACKING_METHODS,
    ACCOUNT_USER_METHODS,
    PORTFOLIO_METHODS,
    CONTENT_AREA_OBJ_METHODS,
    FOLDER_METHODS,
    TEMPLATE_METHODS,
    DELIVERY_PROFILE_METHODS,
    SENDER_PROFILE_METHODS,
    SEND_CLASSIFICATION_METHODS,
    FILTER_DEFINITION_METHODS,
    QUERY_DEFINITION_METHODS,
    LIST_METHODS,
    LIST_SUBSCRIBERS_METHODS,
    LIST_SUBSCRIBERS_TRACKING_METHODS,
    SUBSCRIBER_METHODS,
    SUBSCRIBER_ATTRIBUTES_METHODS,
    SUBSCRIBER_LISTS_METHODS,
    EMAIL_METHODS,
    SEND_METHODS,
    SEND_TRACKING_METHODS,
    SEND_DEFINITION_METHODS,
    TRIGGERED_SEND_METHODS,
    TRIGGERED_SEND_TRACKING_METHODS,
    TRIGGERED_SEND_TRACKING_CLICKS_METHODS,
    TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS,
} from '../src/index.js';

/** @typedef {{ id: string, category: string, entry: object, callExpr: string, isProperty?: boolean }} CatalogEntry */

/** @type {CatalogEntry[]} */
const catalog = [];

/**
 * @param {string} id - Dot-notation identifier for the method (e.g. 'Platform.Function.Lookup')
 * @param {string} category - Display category label (e.g. 'Platform Functions')
 * @param {object} entry - ssjs-data method entry object
 * @param {string} callExpr - The stub call expression for the test fixture
 * @param {boolean} [isProperty] - True when the entry is a property, not a function
 */
function add(id, category, entry, callExpr, isProperty = false) {
    catalog.push({ id, category, entry, callExpr, isProperty });
}

/**
 * @param {object} m - ssjs-data method entry
 * @returns {boolean} True when the entry represents a property rather than a callable
 */
function isProperty(m) {
    return (
        m.isProperty === true ||
        (Array.isArray(m.params) &&
            m.params.length === 0 &&
            typeof m.syntax === 'string' &&
            !m.syntax.includes('('))
    );
}

/**
 * @param {object} m - ssjs-data method entry
 * @param {number} [minOverride] - Override for the minimum required argument count
 * @returns {string} Comma-separated stub argument list suitable for a call expression
 */
function stubArgs(m, minOverride) {
    const min = minOverride ?? m.minArgs ?? 0;
    const params = m.params ?? [];
    const parts = [];
    // Emit at least `min` required args. When a signature is optional-only
    // (min === 0) emit no args so the generated call still type-checks; otherwise
    // emit correctly-typed stubs for the required leading params.
    for (let i = 0; i < min; i++) {
        const p = params[i];
        if (!p) {
            parts.push('null');
            continue;
        }
        const t = (p.type ?? 'any').toLowerCase();
        // A union/array type (e.g. `string|string[]`, `string[]`) maps to `string[]`
        // in the generated .d.ts, so emit an array stub to satisfy the signature.
        if (t.includes('[]') || t.includes('array')) {
            parts.push('[]');
        } else if (t.includes('string')) {
            parts.push(`"${p.name}"`);
        } else if (t.includes('number')) {
            parts.push('1');
        } else if (t.includes('boolean')) {
            parts.push('true');
        } else if (t.includes('function')) {
            parts.push('function() {}');
        } else if (t === 'regexp') {
            // Use the shared RegExp instance stub so String.match/search type-check.
            parts.push('_re');
        } else {
            parts.push('{}');
        }
    }
    return parts.join(', ');
}

/**
 * Resolve a global alias's `aliasOf` (e.g. 'Platform.Function.Now',
 * 'Platform.Response.Redirect') to its source ssjs-data method entry so the
 * generated test call can use the real signature.
 *
 * @param {string} aliasOf - dotted path of the alias target
 * @returns {object|null} The source method entry, or null when not resolvable
 */
function resolveGlobalAlias(aliasOf) {
    const parts = (aliasOf ?? '').split('.');
    if (parts.length !== 3 || parts[0] !== 'Platform') {
        return null;
    }
    const key = parts[2].toLowerCase();
    const tables = {
        Function: PLATFORM_FUNCTIONS,
        Response: PLATFORM_RESPONSE_METHODS,
        Variable: PLATFORM_VARIABLE_METHODS,
        Request: PLATFORM_REQUEST_METHODS,
        Recipient: PLATFORM_RECIPIENT_METHODS,
    };
    const table = tables[parts[1]];
    return table?.find((m) => m.name.toLowerCase() === key) ?? null;
}

/**
 * @param {string} receiver - The receiver expression (e.g. 'Platform', '_listInst')
 * @param {object} m - ssjs-data method entry
 * @returns {string} A stub call expression for the method on the given receiver
 */
function methodCall(receiver, m) {
    if (isProperty(m)) {
        return `${receiver}.${m.name}`;
    }
    return `${receiver}.${m.name}(${stubArgs(m)})`;
}

// ── Catalog builders ─────────────────────────────────────────────────────────

for (const m of PLATFORM_METHODS) {
    add(`Platform.${m.name}`, 'Platform', m, methodCall('Platform', m));
}

for (const m of PLATFORM_FUNCTIONS) {
    add(`Platform.Function.${m.name}`, 'Platform.Function', m, methodCall('Platform.Function', m));
}

const platformGroups = [
    ['Platform.Variable', PLATFORM_VARIABLE_METHODS],
    ['Platform.Response', PLATFORM_RESPONSE_METHODS],
    ['Platform.Request', PLATFORM_REQUEST_METHODS],
    ['Platform.Recipient', PLATFORM_RECIPIENT_METHODS],
    ['HTTPHeader', HTTPHEADER_METHODS],
    ['Attribute', ATTRIBUTE_METHODS],
    ['DateTime', DATE_TIME_METHODS],
    ['DateTime.TimeZone', DATE_TIME_TIMEZONE_METHODS],
    ['ErrorUtil', ERROR_UTIL_METHODS],
];

for (const [prefix, methods] of platformGroups) {
    for (const m of methods) {
        add(`${prefix}.${m.name}`, prefix, m, methodCall(prefix, m), isProperty(m));
    }
}

for (const m of HTTP_METHODS) {
    add(`HTTP.${m.name}`, 'HTTP', m, methodCall('HTTP', m));
}

for (const ctor of SCRIPT_UTIL_CONSTRUCTORS) {
    const args = stubArgs(ctor);
    const expr = args ? `new Script.Util.${ctor.name}(${args})` : `new Script.Util.${ctor.name}()`;
    add(`new Script.Util.${ctor.name}`, 'Script.Util', ctor, expr);
}

for (const m of WSPROXY_METHODS) {
    add(`<WSProxyInstance>.${m.name}`, 'WSProxy', m, methodCall('_wsproxy', m));
}

for (const m of SCRIPT_UTIL_REQUEST_METHODS) {
    add(`<HttpRequestInstance>.${m.name}`, 'Script.Util.HttpRequest', m, methodCall('_httpReq', m));
}

const coreGroups = [
    ['DataExtension', DATA_EXTENSION_METHODS, '_de'],
    ['DataExtension.Fields', DATA_EXTENSION_FIELDS_METHODS, '_de.Fields'],
    ['DataExtension.Rows', DATA_EXTENSION_ROWS_METHODS, '_de.Rows'],
    ['Account', ACCOUNT_METHODS, '_account'],
    ['Account.Tracking', ACCOUNT_TRACKING_METHODS, 'Account.Tracking'],
    ['AccountUser', ACCOUNT_USER_METHODS, '_accountUser'],
    ['Portfolio', PORTFOLIO_METHODS, '_portfolio'],
    ['ContentAreaObj', CONTENT_AREA_OBJ_METHODS, '_contentArea'],
    ['Folder', FOLDER_METHODS, '_folder'],
    ['Template', TEMPLATE_METHODS, '_template'],
    ['DeliveryProfile', DELIVERY_PROFILE_METHODS, '_deliveryProfile'],
    ['SenderProfile', SENDER_PROFILE_METHODS, '_senderProfile'],
    ['SendClassification', SEND_CLASSIFICATION_METHODS, '_sendClass'],
    ['FilterDefinition', FILTER_DEFINITION_METHODS, '_filterDef'],
    ['QueryDefinition', QUERY_DEFINITION_METHODS, '_queryDef'],
    ['List', LIST_METHODS, '_list'],
    ['List.Subscribers', LIST_SUBSCRIBERS_METHODS, '_listSubscribers'],
    ['List.Subscribers.Tracking', LIST_SUBSCRIBERS_TRACKING_METHODS, '_listSubTracking'],
    ['Subscriber', SUBSCRIBER_METHODS, '_subscriber'],
    ['Subscriber.Attributes', SUBSCRIBER_ATTRIBUTES_METHODS, '_subscriberAttrs'],
    ['Subscriber.Lists', SUBSCRIBER_LISTS_METHODS, '_subscriberLists'],
    ['Email', EMAIL_METHODS, '_email'],
    ['Send', SEND_METHODS, '_send'],
    ['Send.Tracking', SEND_TRACKING_METHODS, '_sendTracking'],
    ['Send.Definition', SEND_DEFINITION_METHODS, '_sendDef'],
    ['TriggeredSend', TRIGGERED_SEND_METHODS, '_triggeredSend'],
    ['TriggeredSend.Tracking', TRIGGERED_SEND_TRACKING_METHODS, '_tsTracking'],
    ['TriggeredSend.Tracking.Clicks', TRIGGERED_SEND_TRACKING_CLICKS_METHODS, '_tsClicks'],
    [
        'TriggeredSend.Tracking.TotalByInterval',
        TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS,
        '_tsInterval',
    ],
];

for (const [prefix, methods, instanceVar] of coreGroups) {
    for (const m of methods) {
        const isStaticCall = m.isStatic === false;
        const receiver = isStaticCall ? instanceVar : prefix;
        add(`${prefix}.${m.name}`, 'Core Library', m, methodCall(receiver, m), isProperty(m));
    }
}

for (const m of EVENT_METHODS) {
    add(`${m.owner}.${m.name}`, 'Events', m, methodCall(m.owner, m));
}

/**
 * Build the JS expression used to exercise an ECMAScript builtin in the coverage stub.
 *
 * @param {object} m - ECMAScript builtin catalog entry
 * @returns {string} Expression that references the builtin
 */
function ecmaCallExpr(m) {
    const owner = m.owner;
    switch (owner) {
        case 'Array.prototype': {
            return isProperty(m) ? '_arr.length' : `_arr.${m.name}(${stubArgs(m)})`;
        }
        case 'String.prototype': {
            return isProperty(m) ? '_str.length' : `_str.${m.name}(${stubArgs(m)})`;
        }
        case 'Number.prototype': {
            return `_num.${m.name}(${stubArgs(m)})`;
        }
        case 'Date.prototype': {
            // Instance methods are exercised on a Date instance stub, mirroring how
            // Array/String/Number prototype methods use _arr/_str/_num.
            return isProperty(m) ? `_date.${m.name}` : `_date.${m.name}(${stubArgs(m)})`;
        }
        case 'Date': {
            // Statics such as Date.UTC live on the Date namespace/constructor.
            return isProperty(m) ? `Date.${m.name}` : `Date.${m.name}(${stubArgs(m)})`;
        }
        case 'Object': {
            // Statics such as Object.defineProperty live on the Object namespace.
            return isProperty(m) ? `Object.${m.name}` : `Object.${m.name}(${stubArgs(m)})`;
        }
        case 'Object.prototype': {
            return `_obj.${m.name}(${stubArgs(m)})`;
        }
        case 'Math': {
            return isProperty(m) ? `Math.${m.name}` : `Math.${m.name}(${stubArgs(m)})`;
        }
        case 'Global': {
            return isProperty(m) ? m.name : `${m.name}(${stubArgs(m)})`;
        }
        case 'RegExp': {
            return isProperty(m) ? `_re.${m.name}` : `_re.${m.name}(${stubArgs(m)})`;
        }
        default: {
            return `${owner}.${m.name}(${stubArgs(m)})`;
        }
    }
}

for (const m of ECMASCRIPT_BUILTINS) {
    add(`${m.owner}.${m.name}`, 'ECMAScript', m, ecmaCallExpr(m), isProperty(m));
}

for (const g of SSJS_GLOBALS) {
    if (g.type === 'object') {
        continue;
    }
    if (g.aliasOf && g.name.includes('.')) {
        continue;
    }
    if (g.params) {
        const expr = isProperty(g)
            ? g.name
            : g.syntax?.startsWith('new ')
              ? `new ${g.name.replace(/^new\s+/, '').replace(/\(.*$/, '')}(${stubArgs(g)})`
              : `${g.name}(${stubArgs(g)})`;
        add(g.name, 'SSJS Global', g, expr, isProperty(g));
    } else if (g.aliasOf) {
        // Resolve the alias target so the generated call uses the real signature
        // (correct arg count and types) instead of a single `{}` placeholder.
        const target = resolveGlobalAlias(g.aliasOf);
        const callExpr = target ? `${g.name}(${stubArgs(target)})` : `${g.name}()`;
        add(`${g.name} (alias of ${g.aliasOf})`, 'SSJS Global Alias', g, callExpr);
    }
}

// ── d.ts coverage ─────────────────────────────────────────────────────────────

const dts = readFileSync(DTS, 'utf8');

/**
 * @param {CatalogEntry} item - Catalog entry to check
 * @returns {boolean} True when the method or property is declared in sfmc-globals.d.ts
 */
function inDts(item) {
    const id = item.id;
    const name = item.entry.name;

    if (id.startsWith('Platform.Function.')) {
        return dts.includes(`function ${name}(`) && dts.includes('namespace Function');
    }
    if (id.startsWith('Platform.')) {
        const sub = id.split('.', 2)[1];
        if (sub === 'Function') {
            return false;
        }
        if (item.isProperty) {
            return new RegExp(String.raw`(?:var|const|readonly)\s+${name}\b`).test(dts);
        }
        const ns = sub === 'Load' ? 'Platform' : `Platform.${sub}`;
        return dts.includes(ns) && new RegExp(String.raw`function\s+${name}\b`).test(dts);
    }
    if (id.startsWith('HTTP.')) {
        return (
            dts.includes('namespace HTTP') && new RegExp(String.raw`function\s+${name}\b`).test(dts)
        );
    }
    if (id.startsWith('HTTPHeader.')) {
        return (
            dts.includes('namespace HTTPHeader') &&
            new RegExp(String.raw`function\s+${name}\b`).test(dts)
        );
    }
    if (id.startsWith('new Script.Util.')) {
        return dts.includes(`class ${name}`) || dts.includes(`class ${item.entry.name}`);
    }
    if (id.startsWith('<WSProxyInstance>.')) {
        return dts.includes('class WSProxy') && new RegExp(String.raw`\b${name}\(`).test(dts);
    }
    if (id.startsWith('<HttpRequestInstance>.')) {
        return (
            (dts.includes('class HttpRequest') || dts.includes('class HttpGet')) &&
            new RegExp(String.raw`\b${name}\b`).test(dts)
        );
    }
    if (item.category === 'Core Library' || item.category === 'Events') {
        const prefix = id.split('.').slice(0, -1).join('.');
        if (item.entry.isStatic === false) {
            const instIface = prefix.includes('.') ? null : `${prefix.split('.', 1)[0]}Instance`;
            if (instIface && dts.includes(`interface ${instIface}`)) {
                return new RegExp(String.raw`\b${name}\b`).test(
                    dts.slice(dts.indexOf(`interface ${instIface}`)),
                );
            }
            if (prefix === 'DataExtension.Fields' || prefix === 'DataExtension.Rows') {
                const iface =
                    prefix === 'DataExtension.Fields' ? 'DataExtensionFields' : 'DataExtensionRows';
                return (
                    dts.includes(`interface ${iface}`) &&
                    new RegExp(String.raw`\b${name}\b`).test(dts)
                );
            }
            return new RegExp(String.raw`\b${name}\b`).test(dts);
        }
        return (
            dts.includes(`namespace ${prefix}`) &&
            new RegExp(String.raw`function\s+${name}\b`).test(dts)
        );
    }
    if (item.category === 'ECMAScript') {
        const owner = item.entry.owner;
        if (owner === 'Global') {
            // Constructible globals (e.g. RegExp) are emitted as
            // `declare var X: XConstructor`; plain globals as `declare function X`.
            return new RegExp(String.raw`declare (?:function|var) ${name}\b`).test(dts);
        }
        if (owner === 'Math') {
            return dts.includes('namespace Math') && new RegExp(String.raw`\b${name}\b`).test(dts);
        }
        if (owner === 'RegExp') {
            return (
                dts.includes('interface RegExp') && new RegExp(String.raw`\b${name}\b`).test(dts)
            );
        }
        if (owner.endsWith('.prototype')) {
            const iface = owner.replace('.prototype', '');
            return (
                dts.includes(`interface ${iface}`) && new RegExp(String.raw`\b${name}\b`).test(dts)
            );
        }
        return new RegExp(String.raw`\b${name}\b`).test(dts);
    }
    if (item.category === 'SSJS Global' || item.category === 'SSJS Global Alias') {
        const bare = id.split(' ', 1)[0];
        // Constructible globals (String, Error, RegExp, …) are emitted as
        // `declare var X: XConstructor`; plain globals as `declare function X`.
        return new RegExp(String.raw`declare (?:function|var) ${bare}\b`).test(dts);
    }
    if (id.startsWith('Attribute.')) {
        return dts.includes('namespace Attribute');
    }
    if (id.startsWith('DateTime') || id.startsWith('ErrorUtil')) {
        const prefix = id.split('.').slice(0, -1).join('.');
        return dts.includes(`namespace ${prefix}`);
    }
    return dts.includes(name);
}

// ── ssjs.guide gaps (curated — not auto-scanned) ─────────────────────────────

/** Known guide-only APIs documented outside ssjs-data catalog */
const GUIDE_ONLY_CANDIDATES = [
    {
        id: 'RegExp (constructor)',
        source: 'ssjs.guide/language/regular-expressions.md',
        note: 'new RegExp() — native constructor, not in ECMASCRIPT_BUILTINS',
    },
    {
        id: 'RegExp.test',
        source: 'ssjs.guide/language/regular-expressions.md',
        note: 'Instance method documented in guide',
    },
    {
        id: 'RegExp.exec',
        source: 'ssjs.guide/language/regular-expressions.md',
        note: 'Instance method documented in guide',
    },
    {
        id: 'RegExp.match (via String)',
        source: 'ssjs.guide/language/regular-expressions.md',
        note: 'String.match documented with RegExp',
    },
    {
        id: 'Date (constructor)',
        source: 'ssjs.guide/engine-limitations/known-bugs.md',
        note: 'Listed as safe for new operator',
    },
    {
        id: 'Object (constructor)',
        source: 'ssjs.guide/engine-limitations/known-bugs.md',
        note: 'Listed as safe for new operator',
    },
    {
        id: 'Array (constructor)',
        source: 'ssjs.guide/engine-limitations/known-bugs.md',
        note: 'Listed as safe for new operator',
    },
];

// ── Build report ─────────────────────────────────────────────────────────────

/** Nested sub-namespace instance methods that generate-dts does not yet emit on parent interfaces. */
const NESTED_INSTANCE_GROUPS = [
    ['List.Subscribers', LIST_SUBSCRIBERS_METHODS, 'ListInstance', 'Subscribers'],
    [
        'List.Subscribers.Tracking',
        LIST_SUBSCRIBERS_TRACKING_METHODS,
        'ListInstance',
        'Subscribers.Tracking',
    ],
    ['Subscriber.Attributes', SUBSCRIBER_ATTRIBUTES_METHODS, 'SubscriberInstance', 'Attributes'],
    ['Subscriber.Lists', SUBSCRIBER_LISTS_METHODS, 'SubscriberInstance', 'Lists'],
    [
        'Send.Tracking',
        SEND_TRACKING_METHODS.filter((m) => m.isStatic === false),
        'SendInstance',
        'Tracking',
    ],
    [
        'TriggeredSend.Tracking',
        TRIGGERED_SEND_TRACKING_METHODS,
        'TriggeredSendInstance',
        'Tracking',
    ],
    [
        'TriggeredSend.Tracking.Clicks',
        TRIGGERED_SEND_TRACKING_CLICKS_METHODS,
        'TriggeredSendInstance',
        'Tracking.Clicks',
    ],
    [
        'TriggeredSend.Tracking.TotalByInterval',
        TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS,
        'TriggeredSendInstance',
        'Tracking.TotalByInterval',
    ],
];

/**
 * @param {string} ifaceName - Name of the TypeScript interface (e.g. 'ListInstance')
 * @returns {string} The raw text block of the interface from sfmc-globals.d.ts, or empty string
 */
function extractInterfaceBlock(ifaceName) {
    const marker = `interface ${ifaceName}`;
    const start = dts.indexOf(marker);
    if (start === -1) {
        return '';
    }
    const end = dts.indexOf('declare namespace', start + 1);
    return dts.slice(start, end > 0 ? end : undefined);
}

/** @type {{ id: string, iface: string, propPath: string }[]} */
const nestedDtsMissing = [];
for (const [prefix, methods, iface, propPath] of NESTED_INSTANCE_GROUPS) {
    const block = extractInterfaceBlock(iface);
    for (const m of methods) {
        const hasMethod =
            block.includes(`${m.name}(`) ||
            block.includes(`readonly ${m.name}`) ||
            block.includes(`var ${m.name}`);
        if (!hasMethod) {
            nestedDtsMissing.push({
                id: `${prefix}.${m.name}`,
                iface,
                propPath,
                syntax: m.syntax ?? null,
            });
        }
    }
}

const dtsMissing = [
    ...catalog.filter((c) => !inDts(c)),
    ...nestedDtsMissing
        .filter((n) => catalog.every((c) => c.id !== n.id))
        .map((n) => ({
            id: n.id,
            category: 'Nested instance (d.ts gap)',
            entry: { name: n.id.split('.').pop(), syntax: n.syntax },
            callExpr: '',
            isProperty: false,
        })),
];
const dtsCovered = catalog.filter((c) => inDts(c));

const catalogIds = new Set(catalog.map((c) => c.id.split(' ', 1)[0]));

/** @type {{ id: string, source: string, note: string, inSsjsData: boolean }[]} */
const guideOnly = Array.from(GUIDE_ONLY_CANDIDATES, (item) => ({
    id: item.id,
    source: item.source,
    note: item.note,
    inSsjsData:
        catalogIds.has(item.id) || catalog.some((c) => c.id.includes(item.id.split('.', 1)[0])),
}));

// RegExp specific check
const hasRegexpInData = catalog.some((c) => c.entry.owner === 'RegExp' || c.id.includes('RegExp'));
guideOnly.push({
    id: 'RegExp API (constructor + prototype methods)',
    source: 'ssjs.guide/language/regular-expressions.md',
    note: 'Documented in guide; ECMASCRIPT_BUILTINS has no RegExp owner group; d.ts has no interface RegExp or declare function RegExp',
    inSsjsData: hasRegexpInData,
});

const report = {
    generatedAt: new Date().toISOString(),
    totals: {
        catalogEntries: catalog.length,
        dtsCovered: dtsCovered.length,
        dtsMissingFlat: catalog.filter((c) => !inDts(c)).length,
        dtsMissingNested: nestedDtsMissing.length,
        dtsMissingTotal: catalog.filter((c) => !inDts(c)).length + nestedDtsMissing.length,
    },
    dtsMissing: dtsMissing.map((c) => ({
        id: c.id,
        category: c.category,
        name: c.entry.name,
        syntax: c.entry.syntax ?? null,
    })),
    nestedDtsMissing,
    guideOnly,
    categories: Object.groupBy(catalog, (c) => c.category),
};

writeFileSync(REPORT_OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');

// ── Generate test fixture ─────────────────────────────────────────────────────

const lines = [
    '// =============================================================================',
    '// SSJS Catalog Test — AUTO-GENERATED by ssjs-data/scripts/audit-method-coverage.mjs',
    '// Every method/function catalogued in ssjs-data. Use for hover, completion, and',
    '// TypeScript (ssjs-ts) validation in vscode-sfmc-language / sfmc-language-lsp.',
    '// Regenerate: cd ssjs-data && node scripts/audit-method-coverage.mjs',
    '// =============================================================================',
    '',
    'Platform.Load("core", "1.1.5");',
    '',
    '// ── Shared instance stubs (not executed — syntax/IntelliSense validation only) ──',
    'var _wsproxy = new Script.Util.WSProxy();',
    'var _httpReq = new Script.Util.HttpRequest("https://example.com");',
    'var _de = DataExtension.Init("TestDE");',
    'var _account = Account.Init("");',
    'var _accountUser = AccountUser.Init("", 1);',
    'var _portfolio = Portfolio.Init("");',
    'var _contentArea = ContentAreaObj.Init("");',
    'var _folder = Folder.Init("");',
    'var _template = Template.Init("");',
    'var _deliveryProfile = DeliveryProfile.Init("");',
    'var _senderProfile = SenderProfile.Init("");',
    'var _sendClass = SendClassification.Init("");',
    'var _filterDef = FilterDefinition.Init("");',
    'var _queryDef = QueryDefinition.Init("");',
    'var _list = List.Init("");',
    'var _listSubscribers = _list.Subscribers;',
    'var _listSubTracking = _listSubscribers.Tracking;',
    'var _subscriber = Subscriber.Init("");',
    'var _subscriberAttrs = _subscriber.Attributes;',
    'var _subscriberLists = _subscriber.Lists;',
    'var _email = Email.Init("");',
    'var _send = Send.Init(1);',
    'var _sendDef = Send.Definition.Init("");',
    'var _sendTracking = _send.Tracking;',
    'var _triggeredSend = TriggeredSend.Init("");',
    'var _tsTracking = _triggeredSend.Tracking;',
    'var _tsClicks = _tsTracking.Clicks;',
    'var _tsInterval = _tsTracking.TotalByInterval;',
    'var _arr = [1, 2, 3];',
    'var _str = "test";',
    'var _num = 42;',
    'var _obj = {};',
    'var _re = /test/i;',
    'var _date = new Date();',
    '',
];

let currentCategory = '';
for (const item of catalog) {
    if (item.category !== currentCategory) {
        currentCategory = item.category;
        lines.push('', `// ── ${currentCategory} ──`);
    }
    lines.push(`// ${item.id}`, `void (${item.callExpr});`);
}

lines.push(
    '',
    '// =============================================================================',
    '// KNOWN GAPS — documented in ssjs.guide but NOT catalogued in ssjs-data',
    '// Use this block to confirm TypeScript / IntelliSense gaps (e.g. RegExp).',
    '// =============================================================================',
    '',
    '// RegExp — ssjs.guide/language/regular-expressions.md',
    'var _reCtor = new RegExp("pattern", "i");',
    'void (_reCtor.test("sample"));',
    'void (_reCtor.exec("sample"));',
    'void (_str.match(_reCtor));',
    '',
    '// Native constructors — ssjs.guide/engine-limitations/known-bugs.md',
    'var _dateCtor = new Date();',
    'var _arrCtor = new Array(3);',
    'var _objCtor = new Object();',
    '',
);

writeFileSync(TEST_OUT, lines.join('\n'), 'utf8');

// eslint-disable-next-line no-console
console.log(`Catalog entries: ${catalog.length}`);
// eslint-disable-next-line no-console
console.log(
    `d.ts covered: ${dtsCovered.length}, flat missing: ${report.totals.dtsMissingFlat}, nested missing: ${nestedDtsMissing.length}`,
);
// eslint-disable-next-line no-console
console.log(`Test fixture: ${TEST_OUT}`);
// eslint-disable-next-line no-console
console.log(`Report: ${REPORT_OUT}`);
if (dtsMissing.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\nMissing from d.ts:');
    for (const m of dtsMissing.slice(0, 30)) {
        // eslint-disable-next-line no-console
        console.log(`  - ${m.id}`);
    }
    if (dtsMissing.length > 30) {
        // eslint-disable-next-line no-console
        console.log(`  ... and ${dtsMissing.length - 30} more`);
    }
}
