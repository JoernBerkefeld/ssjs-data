/**
 * build-catalog.mjs
 *
 * Single traversal of every ssjs-data catalog array, producing one rich record
 * per documented API member.
 *
 * Two generators consume it:
 *   - generate-site-index.mjs   → dist/site-index.json (projects the record down)
 *   - generate-function-index.mjs → ssjs.guide/_data/ssjs_functions.yml
 *
 * Record order is part of the contract: site-index.json is committed in this
 * exact order, so new sources must be appended at the position their loop
 * already occupies.
 */

import {
    platformFunctionUrl,
    httpMethodUrl,
    wsproxyMethodUrl,
    globalFunctionUrl,
    globalFunctionCategory,
    PLATFORM_OBJECT_URLS,
    CORE_LIBRARY_URLS,
    ecmascriptMemberLink,
    GUIDE_URLS,
    httpRequestMethodUrl,
    PLATFORM_FUNCTION_GLOBAL_ALIAS,
    GLOBAL_FUNCTION_PAGES,
    methodAnchor,
    eventAnchor,
    polyfillMemberLink,
} from '../../src/urls.js';

import { shortDescription } from '../../src/short-description.js';

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
} from '../../src/index.js';

// ── Membership lookups for status resolution ───────────────────────────────

const UNSUPPORTED_KEYS = new Set(KNOWN_UNSUPPORTED.map((fn) => `${fn.owner}.${fn.member}`));
const POLYFILLABLE_KEYS = new Set(POLYFILLABLE_METHODS.map((fn) => `${fn.owner}.${fn.method}`));

/**
Text appended to a blocked row by the renderer; kept here so tests can assert it.
 */
export const BLOCKED_TEXT = 'no working runtime invocation';

// ── Display-name helpers ───────────────────────────────────────────────────

/**
 * Owners whose members are globals — the owner is a grouping label in the
 * catalog, not part of the member's written form.
 */
const BARE_OWNERS = new Set(['Global', 'GlobalValues', 'Error', 'ErrorTypes']);

/**
Owners whose members are always statics, even without an `isStatic` flag.
 */
const STATIC_OWNERS = new Set(['Math', 'JSON']);

/**
 * Members that have no MDN member heading because they are not properties at
 * all. Written in the form MDN documents them in.
 */
const ECMASCRIPT_NAME_OVERRIDES = {
    // Three pseudo-entries splitting the Boolean page into its documented cases.
    'Boolean.boolean-coercion': { display: 'Boolean()', sort: 'Boolean' },
    'Boolean.boolean-boxed': { display: 'new Boolean()', sort: 'Boolean.new' },
    'Boolean.boolean-prototype': { display: 'Boolean.prototype', sort: 'Boolean.prototype' },
    // An operator, not a member of RegExp — but it belongs in the RegExp block.
    'RegExp.instanceof': { display: 'instanceof RegExp', sort: 'RegExp.instanceof' },
};

/**
 * Render an ECMAScript built-in the way MDN titles its reference pages:
 * `Array.prototype.join()`, `Array.isArray()`, `Math.PI`, `eval()`.
 *
 * Derived purely from `owner` + member name + `isProperty`/`isStatic`, because
 * the 109 KNOWN_UNSUPPORTED and 24 POLYFILLABLE_METHODS entries carry no
 * `syntax` field — and ssjs-data's `syntax` uses an `Array.join(…)` shorthand
 * that is not the standard notation anyway.
 *
 * @param {string} owner - Catalog `owner` (e.g. 'Array.prototype', 'Global', 'Math')
 * @param {string} member - Member name (`name` / `member` / `method`)
 * @param {object} entry - Catalog entry, read for `isProperty` / `isStatic`
 * @returns {{display: string, sort: string}} MDN-style display name and its dotted sort base
 */
function ecmascriptDisplayName(owner, member, entry) {
    const override = ECMASCRIPT_NAME_OVERRIDES[`${owner}.${member}`];
    if (override) {
        return override;
    }

    let qualified;
    if (BARE_OWNERS.has(owner)) {
        qualified = member;
    } else if (owner.endsWith('.prototype') || entry.isStatic || STATIC_OWNERS.has(owner)) {
        qualified = `${owner}.${member}`;
    } else {
        // A non-static member of a constructor object lives on its prototype.
        qualified = `${owner}.prototype.${member}`;
    }

    // `isProperty` is only set where the distinction mattered to the .d.ts
    // generator; for the rest, a `syntax` without a call parenthesis (Math.PI,
    // Array.length) is the catalog's own record that the member is a value.
    const isProperty =
        entry.isProperty === true || Boolean(entry.syntax && !entry.syntax.includes('('));

    return { display: isProperty ? qualified : `${qualified}()`, sort: qualified };
}

/**
 * Sort key for the function index: the dotted name only, case- and
 * prefix-insensitive.
 *
 * - the parameter list is dropped, so `Account.Retrieve(filter)` sorts on
 *   `account.retrieve`
 * - a leading `Platform.Function.` / `Platform.` is dropped, so
 *   `Platform.Function.Lookup` sorts under `l`
 * - a leading `new ` is dropped, so `new Script.Util.WSProxy()` sorts under `s`
 * - `<` and `>` are dropped, so `<AccountInstance>.Update` sorts as
 *   `accountinstance.update` — directly after the `Account.*` statics
 * - `.prototype` is kept, so `Array.prototype.join()` sorts after the
 *   `Array.*` statics, mirroring how `AccountInstance.*` follows `Account.*`
 *
 * @param {string} name - Display name or its dotted base
 * @returns {string} Lowercase sort key
 */
function toSortKey(name) {
    return String(name)
        .split('(', 1)[0]
        .replaceAll(/[<>]/g, '')
        .replace(/^new\s+/, '')
        .replace(/^Platform\.(?:Function\.)?/, '')
        .trim()
        .toLowerCase();
}

/**
 * Stable DOM id for a row, derived from its sort key.
 *
 * @param {string} sortKey - Row sort key
 * @returns {string} Anchor id (no leading '#')
 */
function toAnchorId(sortKey) {
    return `fn-${sortKey.replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '')}`;
}

// ── Record construction ────────────────────────────────────────────────────

/**
 * Build one catalog record.
 *
 * @param {object} options - Record inputs
 * @param {string} options.name - Qualified lookup name (e.g. "HTTP.Get")
 * @param {string} options.url - Site-relative URL, optionally with an anchor
 * @param {string} options.section - Section label used by both index and site index
 * @param {string} options.type - "function" | "method" | "object" | "property"
 * @param {object|null} options.entry - Source catalog entry
 * @param {string} [options.descriptionSource] - Text the site index summarises (defaults to `entry.description`)
 * @param {string} [options.display] - Display name; defaults to `entry.syntax` then `name`
 * @param {string} [options.sortName] - Dotted name to sort on; defaults to `display`
 * @returns {object} Catalog record
 */
function makeRecord({ name, url, section, type, entry, descriptionSource, display, sortName }) {
    const displayName = display ?? entry?.syntax ?? name;
    const sortKey = toSortKey(sortName ?? displayName);
    const source = descriptionSource ?? entry?.description ?? '';

    const record = {
        name,
        url,
        section,
        type,
        entry,
        descriptionSource: source,
        displayName,
        sortKey,
        anchorId: toAnchorId(sortKey),
        returnType: entry?.returnType ?? '',
        deprecated: Boolean(entry?.deprecated),
        verified: Boolean(entry?.isConfirmed),
        differsFromDocs: Boolean(entry?.differsFromOfficialDocs),
        polyfill: false,
        polyfillUrl: '',
        es: entry?.esVersion ?? '',
        status: 'ok',
        statusSource: source,
    };

    if (!entry) {
        return record;
    }

    // A polyfillable member always advertises its polyfill, independent of status.
    const member = entry.member ?? entry.method ?? entry.name;
    const memberKey = `${entry.owner}.${member}`;
    const isPolyfillable = POLYFILLABLE_KEYS.has(memberKey);
    record.polyfill = isPolyfillable;
    // Deep-link the polyfill badge to the member's chapter on the polyfills page.
    if (isPolyfillable) {
        record.polyfillUrl = polyfillMemberLink(entry.owner, member);
    }

    // Status precedence: confirmed-missing → caveat (partial) → polyfillable
    // (missing) → blocked. A `caveat` upgrades a polyfillable entry from
    // `missing` to `partial` while keeping `polyfill: true`, so a member that
    // partially works at runtime is not flattened to plain "missing".
    if (UNSUPPORTED_KEYS.has(memberKey) && entry.suggestion) {
        record.status = 'missing';
        record.statusSource = entry.suggestion;
    } else if (entry.caveat) {
        record.status = 'partial';
        record.statusSource = entry.caveat;
    } else if (isPolyfillable) {
        record.status = 'missing';
    } else if (entry.nonFunctionalAtRuntime) {
        record.status = 'blocked';
    }

    return record;
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

// ── Group tables ───────────────────────────────────────────────────────────

const SCRIPT_UTIL_CONSTRUCTOR_URLS = {
    WSProxy: GUIDE_URLS.wsproxy,
    HttpRequest: GUIDE_URLS.scriptUtilHttpRequest,
    HttpGet: GUIDE_URLS.scriptUtilHttpGet,
};

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

// ── Traversal ──────────────────────────────────────────────────────────────

/**
 * Walk every catalog array once and return one record per documented member.
 *
 * @returns {object[]} Catalog records in site-index order
 */
export function buildCatalog() {
    const catalog = [];

    // ── Platform Functions ─────────────────────────────────────────────────
    // Each function has its own page at /platform-functions/<name.toLowerCase()>/
    // Exceptions: functions whose primary page is the bare-name global's page use that URL instead;
    // deprecated functions with no ssjs.guide page are omitted.
    for (const fn of PLATFORM_FUNCTIONS) {
        const lower = fn.name.toLowerCase();
        const url = PLATFORM_FUNCTION_GLOBAL_ALIAS.has(lower)
            ? globalFunctionUrl(fn.name)
            : platformFunctionUrl(fn.name);
        catalog.push(
            makeRecord({
                name: fn.name,
                url,
                section: 'Platform Functions',
                type: 'function',
                entry: fn,
            }),
        );
    }

    // ── HTTP Core Library: HTTP.Get, HTTP.Post ─────────────────────────────
    // Rule 4: http/ folder matches HTTP prefix → strip prefix → /http/<member>/
    for (const fn of HTTP_METHODS) {
        catalog.push(
            makeRecord({
                name: `HTTP.${fn.name}`,
                url: httpMethodUrl(fn.name),
                section: 'HTTP & REST',
                type: 'function',
                entry: fn,
            }),
        );
    }

    // ── WSProxy methods ────────────────────────────────────────────────────
    // Rule 4: wsproxy/ folder matches WSProxyInstance prefix → /wsproxy/<method>/
    for (const fn of WSPROXY_METHODS) {
        catalog.push(
            makeRecord({
                name: `<WSProxyInstance>.${fn.name}`,
                url: wsproxyMethodUrl(fn.name),
                section: 'WSProxy',
                type: 'method',
                entry: fn,
            }),
        );
    }

    // ── Script.Util constructors ───────────────────────────────────────────
    for (const fn of SCRIPT_UTIL_CONSTRUCTORS) {
        const url = SCRIPT_UTIL_CONSTRUCTOR_URLS[fn.name] ?? httpMethodUrl(fn.name);
        catalog.push(
            makeRecord({
                name: `new Script.Util.${fn.name}`,
                url,
                section: 'HTTP & REST',
                type: 'function',
                entry: fn,
            }),
        );
    }

    // ── Script.Util.HttpRequest instance methods ───────────────────────────
    for (const fn of SCRIPT_UTIL_REQUEST_METHODS) {
        catalog.push(
            makeRecord({
                name: `<HttpRequestInstance>.${fn.name}`,
                url: httpRequestMethodUrl(fn.name),
                section: 'HTTP & REST',
                type: 'method',
                entry: fn,
            }),
        );
    }

    // ── Platform objects ───────────────────────────────────────────────────
    for (const { array, prefix, url, category } of PLATFORM_OBJECT_GROUPS) {
        const slug = pageSlug(url);
        for (const fn of array) {
            const anchor = methodAnchor(fn.syntax || `${prefix}.${fn.name}`, slug);
            catalog.push(
                makeRecord({
                    name: `${prefix}.${fn.name}`,
                    url: withAnchor(url, anchor),
                    section: category ?? 'Platform Objects',
                    type: fn.isProperty ? 'property' : 'method',
                    entry: fn,
                }),
            );
        }
    }

    // ── Core Library object methods ────────────────────────────────────────
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
            catalog.push(
                makeRecord({
                    name: `${prefix}.${fn.name}`,
                    url: withAnchor(url, anchor),
                    section: 'Core Library',
                    type: fn.isProperty ? 'property' : 'method',
                    entry: fn,
                }),
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
        catalog.push(
            makeRecord({
                name: obj.name,
                url,
                section: 'Core Library',
                type: 'object',
                entry: obj,
                display: obj.name,
            }),
        );
    }

    // ── ECMAScript builtins ────────────────────────────────────────────────
    // Each member is deep-linked to its own H3 anchor on the owner page, e.g.
    // /ecmascript-builtins/array-methods/#splice — matching the per-method headings
    // rendered on those pages and the deep-link pattern used for proprietary methods.
    for (const fn of ECMASCRIPT_BUILTINS) {
        const link = ecmascriptMemberLink(fn.owner, fn.name);
        if (!link) {
            continue;
        }
        const ownerShort = fn.owner.replace('.prototype', '');
        const mdn = ecmascriptDisplayName(fn.owner, fn.name, fn);
        catalog.push(
            makeRecord({
                name: `${ownerShort}.${fn.name}`,
                url: link,
                section: 'ECMAScript Builtins',
                type: fn.isProperty ? 'property' : 'method',
                entry: fn,
                display: mdn.display,
                sortName: mdn.sort,
            }),
        );
    }

    // ── ECMAScript builtins that are broken / unavailable (need polyfills) ──
    // These have no native working behavior but are documented on the same
    // ecmascript-builtins owner page (and on /engine-limitations/polyfills/), so
    // they must be discoverable via search and linkable from the VS Code extension.
    for (const fn of POLYFILLABLE_METHODS) {
        const link = ecmascriptMemberLink(fn.owner, fn.method);
        if (!link) {
            continue;
        }
        const ownerShort = fn.owner.replace('.prototype', '');
        const mdn = ecmascriptDisplayName(fn.owner, fn.method, fn);
        catalog.push(
            makeRecord({
                name: `${ownerShort}.${fn.method}`,
                url: link,
                section: 'ECMAScript Builtins',
                type: 'method',
                entry: fn,
                display: mdn.display,
                sortName: mdn.sort,
            }),
        );
    }

    // ── ECMAScript members confirmed unsupported (no native behavior, no polyfill) ─
    // Surfaced so searchers can FIND that a method is missing and see the suggested
    // workaround. Documented as a ❌ Missing H3 on the owner page; deep-linked to it.
    for (const fn of KNOWN_UNSUPPORTED) {
        const link = ecmascriptMemberLink(fn.owner, fn.member);
        if (!link) {
            continue;
        }
        const ownerShort = fn.owner.replace('.prototype', '');
        const mdn = ecmascriptDisplayName(fn.owner, fn.member, fn);
        catalog.push(
            makeRecord({
                name: `${ownerShort}.${fn.member}`,
                url: link,
                section: 'ECMAScript Builtins',
                type: fn.isProperty ? 'property' : 'method',
                entry: fn,
                descriptionSource: fn.suggestion,
                display: mdn.display,
                sortName: mdn.sort,
            }),
        );
    }

    // ── SSJS bare-name globals ─────────────────────────────────────────────
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
            const [, ns, fnName] = g.aliasOf.split('.', 3);
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
        catalog.push(
            makeRecord({ name: g.name, url, section: category, type: 'function', entry: g }),
        );
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
        catalog.push(
            makeRecord({
                name: requestGlobal.name,
                url: requestUrl,
                section: globalFunctionCategory(requestGlobal.name),
                type: 'object',
                entry: requestGlobal,
                display: requestGlobal.name,
            }),
        );
        // The /core-library/request/ page uses `layout: function` and lists its
        // members in a `## Members` table without per-member H3 anchors (unlike the
        // Platform.Request page). Deep-link every member to that table's `#members`
        // heading so entries still carry a resolving anchor.
        for (const fn of REQUEST_UTILITY_METHODS) {
            catalog.push(
                makeRecord({
                    name: `${requestGlobal.name}.${fn.name}`,
                    url: withAnchor(requestUrl, 'members'),
                    section: globalFunctionCategory(requestGlobal.name),
                    type: fn.isProperty ? 'property' : 'method',
                    entry: fn,
                }),
            );
        }
    }

    return catalog;
}

/**
 * The one-line teaser a row shows, sourced from whichever field explains the
 * row's status: `suggestion` when confirmed missing, `caveat` when partial,
 * `description` otherwise.
 *
 * @param {object} record - Catalog record from {@link buildCatalog}
 * @returns {string} Teaser text
 */
export function statusText(record) {
    return shortDescription(record.statusSource);
}
