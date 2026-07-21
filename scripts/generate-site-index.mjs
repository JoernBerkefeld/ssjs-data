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
    globalFunctionCategory,
    PLATFORM_OBJECT_URLS,
    CORE_LIBRARY_URLS,
    ECMASCRIPT_URLS,
    ecmascriptAnchor,
    GUIDE_URLS,
    httpRequestMethodUrl,
    PLATFORM_FUNCTION_GLOBAL_ALIAS,
    GLOBAL_FUNCTION_PAGES,
    MDN_GLOBAL_FUNCTIONS,
    mdnBuiltinUrl,
    methodAnchor,
    eventAnchor,
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
    REQUEST_UTILITY_METHODS,
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
    return match ? match[0].trim() : text.split('\n', 1)[0].trim();
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
 * Extract the last path segment (page slug) from a site-relative page URL.
 *
 * @param {string} url - Site-relative URL (e.g. `/core-library/senddefinition/`)
 * @returns {string} Last non-empty path segment (e.g. `senddefinition`)
 */
function pageSlug(url) {
    const segments = String(url).split('#', 1)[0].split('/').filter(Boolean);
    return segments.at(-1) ?? '';
}

/**
 * Append an in-page anchor to a page URL, avoiding a double '#'.
 *
 * @param {string} url - Page URL (without fragment)
 * @param {string} anchor - Anchor slug (no leading '#'); empty leaves the URL unchanged
 * @returns {string} URL with `#anchor` appended when anchor is non-empty
 */
function withAnchor(url, anchor) {
    return anchor ? `${url.split('#', 1)[0]}#${anchor}` : url;
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
        if (params.length > 0) {
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
// Exceptions: functions whose primary page is the bare-name global's page use that URL instead;
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
            httpRequestMethodUrl(fn.name),
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
    // Moved to Core Library (require Platform.Load("core", ...)).
    {
        array: HTTPHEADER_METHODS,
        prefix: 'HTTPHeader',
        url: PLATFORM_OBJECT_URLS.HTTPHeader,
        category: 'Core Library',
    },
    {
        array: DATE_TIME_METHODS,
        prefix: 'DateTime',
        url: PLATFORM_OBJECT_URLS['DateTime'],
        category: 'Core Library',
    },
    {
        array: DATE_TIME_TIMEZONE_METHODS,
        prefix: 'DateTime.TimeZone',
        url: PLATFORM_OBJECT_URLS['DateTime.TimeZone'],
        category: 'Core Library',
    },
    // Moved to WSProxy.
    {
        array: ERROR_UTIL_METHODS,
        prefix: 'ErrorUtil',
        url: PLATFORM_OBJECT_URLS.ErrorUtil,
        category: 'WSProxy',
    },
    {
        array: ATTRIBUTE_METHODS,
        prefix: 'Attribute',
        url: GUIDE_URLS.attribute,
        category: 'Core Library',
    },
];

for (const { array, prefix, url, category } of PLATFORM_OBJECT_GROUPS) {
    const slug = pageSlug(url);
    for (const fn of array) {
        const anchor = methodAnchor(fn.syntax || `${prefix}.${fn.name}`, slug);
        index.push(
            record(
                `${prefix}.${fn.name}`,
                withAnchor(url, anchor),
                category ?? 'Platform Objects',
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
    const slug = pageSlug(url);
    // The events page groups methods by event type (H2 anchor per event), so its
    // per-method anchor is derived from the method's `owner` (e.g. BounceEvent),
    // not from the method syntax like every other Core Library page.
    const isEventsPage = prefix === 'Tracking';
    for (const fn of array) {
        const anchor = isEventsPage
            ? eventAnchor(fn.owner)
            : methodAnchor(fn.syntax || `${prefix}.${fn.name}`, slug);
        index.push(
            record(
                `${prefix}.${fn.name}`,
                withAnchor(url, anchor),
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

// ── ECMAScript global functions without a dedicated ssjs.guide page ─────────
// Top-level global functions (eval, parseInt, parseFloat, isNaN, isFinite) live
// in ECMASCRIPT_BUILTINS with owner 'Global'. They are documented by MDN rather
// than by an ssjs.guide page, so their canonical link is the MDN deep link from
// mdnBuiltinUrl(). Derived dynamically: any owner==='Global' builtin that MDN
// documents as a global function (MDN_GLOBAL_FUNCTIONS) and that does not already
// have a dedicated ssjs.guide page (GLOBAL_FUNCTION_PAGES) or a section-page entry
// (e.g. the RegExp constructor, handled by the ECMASCRIPT_BUILTINS loop above).
// Their MDN url is external, so they are marked `external: true` and skipped by
// the ssjs.guide URL validation below.
for (const fn of ECMASCRIPT_BUILTINS) {
    if (fn.owner !== 'Global') {
        continue;
    }
    const lower = fn.name.toLowerCase();
    // Skip globals that MDN treats as constructors (RegExp, …) — those already
    // resolve to an /ecmascript-builtins/ page via the ECMASCRIPT_BUILTINS loop.
    if (!MDN_GLOBAL_FUNCTIONS.has(fn.name)) {
        continue;
    }
    // Skip anything that already has a dedicated ssjs.guide page.
    if (GLOBAL_FUNCTION_PAGES.has(lower)) {
        continue;
    }
    const rec = record(
        fn.name,
        mdnBuiltinUrl(fn.owner, fn.name),
        'ECMAScript Builtins',
        'function',
        fn,
    );
    rec.external = true;
    index.push(rec);
}

// ── SSJS bare-name globals ─────────────────────────────────────────────────
// Functions with dedicated pages under /core-library/ (Core-injected bare
// names) or /ecmascript-builtins/ (native constructors) — see globalFunctionUrl.
//
// A bare-name global gets its own /core-library/ page ONLY when it is in the
// GLOBAL_FUNCTION_PAGES allowlist. Every other bare-name global is an alias
// (aliasOf) whose documentation lives on its aliased Platform page — resolve to
// that page instead of a nonexistent /core-library/<name>/ URL (mirrors the
// generate-dts fallback in this same package).
for (const g of SSJS_GLOBALS) {
    if (g.type !== 'function') {
        continue;
    }
    // Dotted-name aliases (e.g. DateTime.SystemDateToLocalDate) are already
    // indexed by their owning group loop above (PLATFORM_OBJECT_GROUPS →
    // DATE_TIME_METHODS → /core-library/datetime/#anchor). Skip here to avoid a
    // duplicate entry pointing at a nonexistent /core-library/<dotted>/ page.
    if (g.name.includes('.')) {
        continue;
    }
    const lower = g.name.toLowerCase();
    let url;
    let category;
    if (GLOBAL_FUNCTION_PAGES.has(lower) || !g.aliasOf) {
        // Dedicated page (allowlist) or a full standalone definition.
        url = globalFunctionUrl(g.name);
        category = globalFunctionCategory(g.name);
    } else {
        // Alias fallback: the bare-name global has no dedicated page, so point
        // it at the aliased Platform page (mirrors the generate-dts fallback).
        const [, ns, fnName] = g.aliasOf.split('.');
        if (ns === 'Function') {
            url = platformFunctionUrl(fnName);
            category = 'Platform Functions';
        } else if (ns === 'Response') {
            url = PLATFORM_OBJECT_URLS['Platform.Response'];
            category = 'Platform Objects';
        } else {
            url = globalFunctionUrl(g.name);
            category = globalFunctionCategory(g.name);
        }
    }
    index.push(record(g.name, url, category, 'function', g));
}

// Request is a bare-name global object (type: 'object') with a dedicated
// /core-library/request/ page, so it is not covered by the function loop above.
// It resolves its OWN member set (REQUEST_UTILITY_METHODS) — a smaller,
// method-based set distinct from Platform.Request. We emit both the object
// overview entry and one entry per member (Request.URL, Request.GetFormField, …)
// so those members are searchable and linkable just like Platform.Request.*.
//
// Request-scoped (not generic): the other bare-name `type: 'object'` globals are
// deliberately excluded. `Variable` (namespaceMethodsOf: 'Platform.Variable') has
// no `Variable.*` member entries today and adding them would be a behavior change;
// `Recipient` is notDefinedAtRuntime; `HTTPHeader`/`Attribute` members are already
// emitted via PLATFORM_OBJECT_GROUPS; `Platform`/`Script` are pure namespaces.
const requestGlobal = SSJS_GLOBALS.find((x) => x.name === 'Request');
if (requestGlobal) {
    const requestUrl = globalFunctionUrl(requestGlobal.name);
    index.push(
        record(
            requestGlobal.name,
            requestUrl,
            globalFunctionCategory(requestGlobal.name),
            'object',
            requestGlobal,
        ),
    );
    // The /core-library/request/ page uses `layout: function` and lists its
    // members in a `## Members` table without per-member H3 anchors (unlike the
    // Platform.Request page). Deep-link every member to that table's `#members`
    // heading so entries still carry a resolving anchor.
    for (const fn of REQUEST_UTILITY_METHODS) {
        index.push(
            record(
                `${requestGlobal.name}.${fn.name}`,
                withAnchor(requestUrl, 'members'),
                globalFunctionCategory(requestGlobal.name),
                fn.isProperty ? 'property' : 'method',
                fn,
            ),
        );
    }
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
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
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
    // fragment that is not part of the page URL set. Entries flagged `external`
    // point at off-site docs (e.g. MDN) and have no ssjs.guide page to validate.
    const missingEntries = index.filter(
        (entry) => !entry.external && !knownUrls.has(entry.url.split('#', 1)[0]),
    );
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
