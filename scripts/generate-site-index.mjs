/**
 * generate-site-index.mjs
 *
 * Generates dist/site-index.json — a static search index and link catalog
 * for ssjs.guide, derived from the ssjs-data source arrays.
 *
 * Each entry carries: name, url, section, type, description, params, returnType
 * (and optionally: aliases, deprecated).
 *
 * The JSON array is written to:
 *   - ssjs-data/dist/site-index.json  (npm package export at ./site-index.json)
 *   - ssjs.guide/site-index.json      (static website asset served at /site-index.json)
 *
 * Run: node scripts/generate-site-index.mjs
 */

import { writeFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { dirname, join } = path;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const GUIDE = join(__dirname, '../../ssjs.guide');

import {
    platformFunctionUrl,
    httpMethodUrl,
    wsproxyMethodUrl,
    globalFunctionUrl,
    PLATFORM_OBJECT_URLS,
    CORE_LIBRARY_URLS,
    ECMASCRIPT_URLS,
    ecmascriptAnchor,
    GUIDE_URLS,
    PLATFORM_FUNCTION_GLOBAL_ALIAS,
} from '../src/urls.js';

import {
    PLATFORM_FUNCTIONS,
    HTTP_METHODS,
    WSPROXY_METHODS,
    SCRIPT_UTIL_CONSTRUCTORS,
    SCRIPT_UTIL_REQUEST_METHODS,
    PLATFORM_METHODS,
    PLATFORM_VARIABLE_METHODS,
    PLATFORM_RESPONSE_METHODS,
    PLATFORM_REQUEST_METHODS,
    PLATFORM_RECIPIENT_METHODS,
    HTTPHEADER_METHODS,
    DATE_TIME_TIMEZONE_METHODS,
    DATE_TIME_METHODS,
    ERROR_UTIL_METHODS,
    ATTRIBUTE_METHODS,
    DATA_EXTENSION_METHODS,
    DATA_EXTENSION_FIELDS_METHODS,
    DATA_EXTENSION_ROWS_METHODS,
    ACCOUNT_METHODS,
    ACCOUNT_TRACKING_METHODS,
    ACCOUNT_USER_METHODS,
    EMAIL_METHODS,
    FILTER_DEFINITION_METHODS,
    FOLDER_METHODS,
    LIST_METHODS,
    LIST_SUBSCRIBERS_METHODS,
    LIST_SUBSCRIBERS_TRACKING_METHODS,
    SUBSCRIBER_METHODS,
    SUBSCRIBER_ATTRIBUTES_METHODS,
    SUBSCRIBER_LISTS_METHODS,
    TEMPLATE_METHODS,
    DELIVERY_PROFILE_METHODS,
    SENDER_PROFILE_METHODS,
    SEND_CLASSIFICATION_METHODS,
    QUERY_DEFINITION_METHODS,
    SEND_METHODS,
    SEND_TRACKING_METHODS,
    SEND_DEFINITION_METHODS,
    TRIGGERED_SEND_METHODS,
    TRIGGERED_SEND_TRACKING_METHODS,
    TRIGGERED_SEND_TRACKING_CLICKS_METHODS,
    TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS,
    EVENT_METHODS,
    CONTENT_AREA_OBJ_METHODS,
    PORTFOLIO_METHODS,
    ECMASCRIPT_BUILTINS,
    POLYFILLABLE_METHODS,
    KNOWN_UNSUPPORTED,
    CORE_LIBRARY_OBJECTS,
    SSJS_GLOBALS,
} from '../src/index.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Truncate a description to its first sentence.
 *
 * @param {string} text - Input text
 * @returns {string} First sentence or first line
 */
function firstSentence(text) {
    if (!text) {
        return '';
    }
    const match = text.match(/^[^.!?]+[.!?]/);
    return match ? match[0].trim() : text.split('\n')[0].trim();
}

/**
 * Extract parameter names from an ssjs-data entry.
 *
 * @param {object} entry - ssjs-data entry with optional params array
 * @returns {string[]} Parameter names
 */
function paramNames(entry) {
    return (entry.params || []).map((p) => p.name);
}

/**
 * Build one index record from an ssjs-data entry.
 *
 * @param {string} name - Qualified name for lookup (e.g. "HTTP.Get", "<WSProxyInstance>.createItem")
 * @param {string} url - Site-relative URL (e.g. "/http/get/")
 * @param {string} section - Human-readable section label
 * @param {string} type - "function" | "method" | "object" | "property"
 * @param {object|null} entry - ssjs-data entry (for description/params/returnType)
 * @param {object} [opts] - Extra fields: aliases
 * @returns {object} Index record
 */
function record(name, url, section, type, entry, opts = {}) {
    const rec = { name, url, section, type };
    if (entry) {
        rec.description = firstSentence(entry.description);
        const params = paramNames(entry);
        if (params.length) {
            rec.params = params;
        }
        if (entry.returnType) {
            rec.returnType = entry.returnType;
        }
        if (entry.deprecated) {
            rec.deprecated = true;
        }
    }
    if (opts.aliases?.length) {
        rec.aliases = opts.aliases;
    }
    return rec;
}

const index = [];

// ── Platform Functions ─────────────────────────────────────────────────────
// Each function has its own page at /platform-functions/<name.toLowerCase()>/
// Exceptions: functions whose primary page is under /global-functions/ use that URL instead;
// deprecated functions with no ssjs.guide page are omitted.
for (const fn of PLATFORM_FUNCTIONS) {
    const lower = fn.name.toLowerCase();
    const url = PLATFORM_FUNCTION_GLOBAL_ALIAS.has(lower)
        ? globalFunctionUrl(fn.name)
        : platformFunctionUrl(fn.name);
    index.push(record(fn.name, url, 'Platform Functions', 'function', fn));
}

// ── HTTP Core Library: HTTP.Get, HTTP.Post ─────────────────────────────────
// Rule 4: http/ folder matches HTTP prefix → strip prefix → /http/<member>/
for (const fn of HTTP_METHODS) {
    index.push(record(`HTTP.${fn.name}`, httpMethodUrl(fn.name), 'HTTP & REST', 'function', fn));
}

// ── WSProxy methods ────────────────────────────────────────────────────────
// Rule 4: wsproxy/ folder matches WSProxyInstance prefix → /wsproxy/<method>/
for (const fn of WSPROXY_METHODS) {
    index.push(
        record(`<WSProxyInstance>.${fn.name}`, wsproxyMethodUrl(fn.name), 'WSProxy', 'method', fn),
    );
}

// ── Script.Util constructors ───────────────────────────────────────────────
const SCRIPT_UTIL_CONSTRUCTOR_URLS = {
    WSProxy: GUIDE_URLS.wsproxy,
    HttpRequest: GUIDE_URLS.scriptUtilHttpRequest,
    HttpGet: GUIDE_URLS.scriptUtilHttpGet,
};
for (const fn of SCRIPT_UTIL_CONSTRUCTORS) {
    const url = SCRIPT_UTIL_CONSTRUCTOR_URLS[fn.name] ?? httpMethodUrl(fn.name);
    index.push(record(`new Script.Util.${fn.name}`, url, 'HTTP & REST', 'function', fn));
}

// ── Script.Util.HttpRequest instance methods ───────────────────────────────
for (const fn of SCRIPT_UTIL_REQUEST_METHODS) {
    index.push(
        record(
            `<HttpRequestInstance>.${fn.name}`,
            GUIDE_URLS.httpRequestMethods,
            'HTTP & REST',
            'method',
            fn,
        ),
    );
}

// ── Platform objects ───────────────────────────────────────────────────────
// Rule 3: platform-objects/ is a grouping folder → full dot-notation slug
const PLATFORM_OBJECT_GROUPS = [
    { array: PLATFORM_METHODS, prefix: 'Platform', url: PLATFORM_OBJECT_URLS.Platform },
    {
        array: PLATFORM_VARIABLE_METHODS,
        prefix: 'Platform.Variable',
        url: PLATFORM_OBJECT_URLS['Platform.Variable'],
    },
    {
        array: PLATFORM_RESPONSE_METHODS,
        prefix: 'Platform.Response',
        url: PLATFORM_OBJECT_URLS['Platform.Response'],
    },
    {
        array: PLATFORM_REQUEST_METHODS,
        prefix: 'Platform.Request',
        url: PLATFORM_OBJECT_URLS['Platform.Request'],
    },
    {
        array: PLATFORM_RECIPIENT_METHODS,
        prefix: 'Platform.Recipient',
        url: PLATFORM_OBJECT_URLS['Platform.Recipient'],
    },
    { array: HTTPHEADER_METHODS, prefix: 'HTTPHeader', url: PLATFORM_OBJECT_URLS.HTTPHeader },
    {
        array: DATE_TIME_METHODS,
        prefix: 'DateTime',
        url: PLATFORM_OBJECT_URLS['DateTime'],
    },
    {
        array: DATE_TIME_TIMEZONE_METHODS,
        prefix: 'DateTime.TimeZone',
        url: PLATFORM_OBJECT_URLS['DateTime.TimeZone'],
    },
    { array: ERROR_UTIL_METHODS, prefix: 'ErrorUtil', url: PLATFORM_OBJECT_URLS.ErrorUtil },
    { array: ATTRIBUTE_METHODS, prefix: 'Attribute', url: GUIDE_URLS.attribute },
];

for (const { array, prefix, url } of PLATFORM_OBJECT_GROUPS) {
    for (const fn of array) {
        index.push(
            record(
                `${prefix}.${fn.name}`,
                url,
                prefix === 'Attribute' ? 'Global Functions' : 'Platform Objects',
                fn.isProperty ? 'property' : 'method',
                fn,
            ),
        );
    }
}

// ── Core Library object methods ────────────────────────────────────────────
// Rule 3: core-library/ is a grouping folder → full dot-notation slug with hyphen separator
const CORE_LIBRARY_GROUPS = [
    {
        array: DATA_EXTENSION_METHODS,
        prefix: 'DataExtension',
        url: CORE_LIBRARY_URLS.DataExtension,
    },
    {
        array: DATA_EXTENSION_FIELDS_METHODS,
        prefix: 'DataExtension.Fields',
        url: CORE_LIBRARY_URLS['DataExtension.Fields'],
    },
    {
        array: DATA_EXTENSION_ROWS_METHODS,
        prefix: 'DataExtension.Rows',
        url: CORE_LIBRARY_URLS['DataExtension.Rows'],
    },
    { array: ACCOUNT_METHODS, prefix: 'Account', url: CORE_LIBRARY_URLS.Account },
    {
        array: ACCOUNT_TRACKING_METHODS,
        prefix: 'Account.Tracking',
        url: CORE_LIBRARY_URLS['Account.Tracking'],
    },
    { array: ACCOUNT_USER_METHODS, prefix: 'AccountUser', url: CORE_LIBRARY_URLS.AccountUser },
    { array: EMAIL_METHODS, prefix: 'Email', url: CORE_LIBRARY_URLS.Email },
    {
        array: FILTER_DEFINITION_METHODS,
        prefix: 'FilterDefinition',
        url: CORE_LIBRARY_URLS.FilterDefinition,
    },
    { array: FOLDER_METHODS, prefix: 'Folder', url: CORE_LIBRARY_URLS.Folder },
    { array: LIST_METHODS, prefix: 'List', url: CORE_LIBRARY_URLS.List },
    {
        array: LIST_SUBSCRIBERS_METHODS,
        prefix: 'List.Subscribers',
        url: CORE_LIBRARY_URLS['List.Subscribers'],
    },
    {
        array: LIST_SUBSCRIBERS_TRACKING_METHODS,
        prefix: 'List.Subscribers.Tracking',
        url: CORE_LIBRARY_URLS['List.Subscribers.Tracking'],
    },
    { array: SUBSCRIBER_METHODS, prefix: 'Subscriber', url: CORE_LIBRARY_URLS.Subscriber },
    {
        array: SUBSCRIBER_ATTRIBUTES_METHODS,
        prefix: 'Subscriber.Attributes',
        url: CORE_LIBRARY_URLS['Subscriber.Attributes'],
    },
    {
        array: SUBSCRIBER_LISTS_METHODS,
        prefix: 'Subscriber.Lists',
        url: CORE_LIBRARY_URLS['Subscriber.Lists'],
    },
    { array: TEMPLATE_METHODS, prefix: 'Template', url: CORE_LIBRARY_URLS.Template },
    {
        array: DELIVERY_PROFILE_METHODS,
        prefix: 'DeliveryProfile',
        url: CORE_LIBRARY_URLS.DeliveryProfile,
    },
    {
        array: SENDER_PROFILE_METHODS,
        prefix: 'SenderProfile',
        url: CORE_LIBRARY_URLS.SenderProfile,
    },
    {
        array: SEND_CLASSIFICATION_METHODS,
        prefix: 'SendClassification',
        url: CORE_LIBRARY_URLS.SendClassification,
    },
    {
        array: QUERY_DEFINITION_METHODS,
        prefix: 'QueryDefinition',
        url: CORE_LIBRARY_URLS.QueryDefinition,
    },
    { array: SEND_METHODS, prefix: 'Send', url: CORE_LIBRARY_URLS.Send },
    {
        array: SEND_TRACKING_METHODS,
        prefix: 'Send.Tracking',
        url: CORE_LIBRARY_URLS['Send.Tracking'],
    },
    {
        array: SEND_DEFINITION_METHODS,
        prefix: 'Send.Definition',
        url: CORE_LIBRARY_URLS['Send.Definition'],
    },
    {
        array: TRIGGERED_SEND_METHODS,
        prefix: 'TriggeredSend',
        url: CORE_LIBRARY_URLS.TriggeredSend,
    },
    {
        array: TRIGGERED_SEND_TRACKING_METHODS,
        prefix: 'TriggeredSend.Tracking',
        url: CORE_LIBRARY_URLS['TriggeredSend.Tracking'],
    },
    {
        array: TRIGGERED_SEND_TRACKING_CLICKS_METHODS,
        prefix: 'TriggeredSend.Tracking.Clicks',
        url: CORE_LIBRARY_URLS['TriggeredSend.Tracking.Clicks'],
    },
    {
        array: TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS,
        prefix: 'TriggeredSend.Tracking.TotalByInterval',
        url: CORE_LIBRARY_URLS['TriggeredSend.Tracking.TotalByInterval'],
    },
    { array: EVENT_METHODS, prefix: 'Tracking', url: CORE_LIBRARY_URLS.Tracking },
    {
        array: CONTENT_AREA_OBJ_METHODS,
        prefix: 'ContentAreaObj',
        url: CORE_LIBRARY_URLS.ContentAreaObj,
    },
    { array: PORTFOLIO_METHODS, prefix: 'Portfolio', url: CORE_LIBRARY_URLS.Portfolio },
];

for (const { array, prefix, url } of CORE_LIBRARY_GROUPS) {
    for (const fn of array) {
        index.push(
            record(
                `${prefix}.${fn.name}`,
                url,
                'Core Library',
                fn.isProperty ? 'property' : 'method',
                fn,
            ),
        );
    }
}

// Core Library object overview entries (one entry per object, points to the object page).
// URL lookup priority: CORE_LIBRARY_URLS → PLATFORM_OBJECT_URLS → dynamic slug derivation.
// The lookup handles sub-objects that share a parent page (e.g. TriggeredSend.Tracking →
// /core-library/triggeredsend/) and objects catalogued under platform-objects (DateTime.TimeZone).
for (const obj of CORE_LIBRARY_OBJECTS) {
    const url =
        CORE_LIBRARY_URLS[obj.name] ??
        PLATFORM_OBJECT_URLS[obj.name] ??
        `/core-library/${obj.name.toLowerCase().replaceAll('.', '-')}/`;
    index.push({
        name: obj.name,
        url,
        section: 'Core Library',
        type: 'object',
        description: firstSentence(obj.description),
    });
}

// ── ECMAScript builtins ────────────────────────────────────────────────────
// Each member is deep-linked to its own H3 anchor on the owner page, e.g.
// /ecmascript-builtins/array-methods/#splice — matching the per-method headings
// rendered on those pages and the deep-link pattern used for proprietary methods.
for (const fn of ECMASCRIPT_BUILTINS) {
    const url = ECMASCRIPT_URLS[fn.owner];
    if (!url) {
        continue;
    }
    const ownerShort = fn.owner.replace('.prototype', '');
    index.push(
        record(
            `${ownerShort}.${fn.name}`,
            `${url}#${ecmascriptAnchor(fn.name)}`,
            'ECMAScript Builtins',
            fn.isProperty ? 'property' : 'method',
            fn,
        ),
    );
}

// ── ECMAScript builtins that are broken / unavailable (need polyfills) ──────
// These have no native working behavior but are documented on the same
// ecmascript-builtins owner page (and on /engine-limitations/polyfills/), so
// they must be discoverable via search and linkable from the VS Code extension.
for (const fn of POLYFILLABLE_METHODS) {
    const url = ECMASCRIPT_URLS[fn.owner];
    if (!url) {
        continue;
    }
    const ownerShort = fn.owner.replace('.prototype', '');
    index.push(
        record(
            `${ownerShort}.${fn.method}`,
            `${url}#${ecmascriptAnchor(fn.method)}`,
            'ECMAScript Builtins',
            'method',
            fn,
        ),
    );
}

// ── ECMAScript members confirmed unsupported (no native behavior, no polyfill) ─
// Surfaced so searchers can FIND that a method is missing and see the suggested
// workaround. Documented as a ❌ Missing H3 on the owner page; deep-linked to it.
for (const fn of KNOWN_UNSUPPORTED) {
    const url = ECMASCRIPT_URLS[fn.owner];
    if (!url) {
        continue;
    }
    const ownerShort = fn.owner.replace('.prototype', '');
    index.push(
        record(
            `${ownerShort}.${fn.member}`,
            `${url}#${ecmascriptAnchor(fn.member)}`,
            'ECMAScript Builtins',
            fn.isProperty ? 'property' : 'method',
            { description: fn.suggestion },
        ),
    );
}

// ── SSJS Globals ───────────────────────────────────────────────────────────
// Functions with dedicated pages under /global-functions/
for (const g of SSJS_GLOBALS) {
    if (g.type !== 'function') {
        continue;
    }
    index.push(record(g.name, globalFunctionUrl(g.name), 'Global Functions', 'function', g));
}

// ── Validate URLs against ssjs.guide ──────────────────────────────────────

/**
 * Walk the ssjs.guide folder and collect all known page URLs (canonical only).
 * Explicit `permalink:` frontmatter values take precedence; otherwise the URL
 * is derived from the file path using Jekyll's pretty-URL rule.
 * Skips Jekyll special directories (`_*`), `assets`, `node_modules`, and `.`-prefixed dirs.
 *
 * @param {string} guideRoot - Absolute path to the ssjs.guide directory
 * @returns {Set.<string>} All known site-relative guide page URLs
 */
function collectGuideUrls(guideRoot) {
    const urls = new Set();

    /**
     * @param {string} dir - directory to walk
     */
    function walk(dir) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                if (
                    !entry.name.startsWith('_') &&
                    !entry.name.startsWith('.') &&
                    entry.name !== 'assets' &&
                    entry.name !== 'node_modules'
                ) {
                    walk(fullPath);
                }
            } else if (entry.name.endsWith('.md')) {
                const content = readFileSync(fullPath, 'utf8');
                const permalinkMatch = content.match(/^permalink:\s*(\S+)\s*$/m);
                if (permalinkMatch) {
                    urls.add(permalinkMatch[1].trim());
                } else {
                    // Derive URL from file path — Jekyll's pretty-URLs rule
                    const relative = fullPath.slice(guideRoot.length).replaceAll('\\', '/');
                    let urlPath = relative.replace(/\.md$/, '');
                    if (urlPath === '/index') {
                        urlPath = '/';
                    } else if (urlPath.endsWith('/index')) {
                        urlPath = urlPath.slice(0, -'index'.length);
                    } else {
                        urlPath += '/';
                    }
                    urls.add(urlPath);
                }
            }
        }
    }

    walk(guideRoot);
    return urls;
}

if (existsSync(GUIDE)) {
    const knownUrls = collectGuideUrls(GUIDE);
    // Validate the page portion only — deep-link entries carry a `#anchor`
    // fragment that is not part of the page URL set.
    const missingEntries = index.filter((entry) => !knownUrls.has(entry.url.split('#')[0]));
    if (missingEntries.length > 0) {
        const byUrl = new Map();
        for (const entry of missingEntries) {
            if (!byUrl.has(entry.url)) {
                byUrl.set(entry.url, []);
            }

            byUrl.get(entry.url).push(entry.name);
        }

        // eslint-disable-next-line no-console
        console.error('');
        // eslint-disable-next-line no-console
        console.error('ERROR: Generated URLs not found in ssjs.guide:');
        for (const [url, names] of byUrl) {
            // eslint-disable-next-line no-console
            console.error(`  ${url}`);
            // eslint-disable-next-line no-console
            console.error(`    → referenced by: ${names.join(', ')}`);
        }

        // eslint-disable-next-line no-console
        console.error('');
        // eslint-disable-next-line no-console
        console.error('Fix: update ssjs-data/src/urls.js to match ssjs.guide page structure,');
        // eslint-disable-next-line no-console
        console.error('     then run: npm run generate:all');
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.log(`Validated ${index.length} URLs against ssjs.guide (all present).`);
}

// ── Write output ───────────────────────────────────────────────────────────
const distDir = join(ROOT, 'dist');
mkdirSync(distDir, { recursive: true });

const json = JSON.stringify(index, null, 2) + '\n';

const distPath = join(distDir, 'site-index.json');
writeFileSync(distPath, json, 'utf8');
// eslint-disable-next-line no-console
console.log(`Written ${index.length} entries to dist/site-index.json`);

const guidePath = join(GUIDE, 'site-index.json');
writeFileSync(guidePath, json, 'utf8');
// eslint-disable-next-line no-console
console.log(`Copied to ssjs.guide/site-index.json`);
