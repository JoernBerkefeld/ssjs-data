/**
 * urls.js
 *
 * Single source of truth for all ssjs.guide URL derivation rules.
 *
 * Imported by generate-dts.mjs, generate-site-index.mjs, and any consumer
 * that needs to resolve or validate links to ssjs.guide documentation.
 *
 * All paths are site-relative (starting with /) and include a trailing slash.
 * Prepend GUIDE_BASE_URL to produce fully-qualified links.
 */

/** Base URL of the ssjs.guide documentation site. */
export const GUIDE_BASE_URL = 'https://ssjs.guide';

/** Base URL of the MDN JavaScript reference. */
export const MDN_BASE_URL = 'https://developer.mozilla.org/en-US';

/**
 * Known JavaScript global constructors that MDN documents under
 * /docs/Web/JavaScript/Reference/Global_Objects/<Ctor>/.
 */
const MDN_GLOBAL_CONSTRUCTORS = new Set([
    'Array',
    'String',
    'Number',
    'Object',
    'Math',
    'Date',
    'RegExp',
    'Boolean',
    'Function',
    'JSON',
    'Symbol',
    'BigInt',
    // Keyed collections, reflection, and async/iteration (ES6+, absent in SSJS)
    'Map',
    'Set',
    'WeakMap',
    'WeakSet',
    'Proxy',
    'Reflect',
    'Promise',
    // Typed arrays and binary buffers (ES6+, absent in SSJS)
    'ArrayBuffer',
    'SharedArrayBuffer',
    'DataView',
    'Atomics',
    'Int8Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float16Array',
    'Float32Array',
    'Float64Array',
    'BigInt64Array',
    'BigUint64Array',
    // Memory management (ES2021, absent in SSJS)
    'WeakRef',
    'FinalizationRegistry',
    // Internationalization (ES2015, absent in SSJS)
    'Intl',
]);

/** Top-level global functions/values that MDN documents under Global_Objects/<member>. */
export const MDN_GLOBAL_FUNCTIONS = new Set([
    'eval',
    'parseInt',
    'parseFloat',
    'isNaN',
    'isFinite',
    'encodeURI',
    'decodeURI',
    'encodeURIComponent',
    'decodeURIComponent',
    'escape',
    'unescape',
    'undefined',
    'NaN',
    'Infinity',
    'globalThis',
]);

/**
 * Derive the MDN documentation URL for an ECMAScript built-in.
 *
 * Produces a direct deep link when the owner/member resolves to a known
 * constructor or global function, and a search-URL fallback otherwise so the
 * link always lands the user on a useful MDN page.
 *
 * @param {string} owner - The builtin's `owner` (e.g. 'Array.prototype', 'Math', 'Global')
 * @param {string} member - The method/property name (e.g. 'splice', 'PI', 'parseInt')
 * @returns {string} Fully-qualified MDN URL
 */
export const mdnBuiltinUrl = (owner, member) => {
    const reference = `${MDN_BASE_URL}/docs/Web/JavaScript/Reference`;
    const search = () => `${MDN_BASE_URL}/search?q=${encodeURIComponent(`${owner}.${member}`)}`;

    if (!owner || !member) {
        return search();
    }

    // Global owner: either a global function (parseInt, isNaN, …) or a
    // constructor referenced as a member (e.g. RegExp itself).
    if (owner === 'Global') {
        if (MDN_GLOBAL_CONSTRUCTORS.has(member)) {
            return `${reference}/Global_Objects/${member}`;
        }
        if (MDN_GLOBAL_FUNCTIONS.has(member)) {
            return `${reference}/Global_Objects/${member}`;
        }
        return search();
    }

    // Strip `.prototype` to get the owning constructor for instance members.
    const constructor = owner.replace(/\.prototype$/, '');
    if (MDN_GLOBAL_CONSTRUCTORS.has(constructor)) {
        return `${reference}/Global_Objects/${constructor}/${member}`;
    }

    return search();
};

// ── Per-function URL derivation ──────────────────────────────────────────────
// These functions map a function/method name to its own dedicated page URL.

/**
 * URL for a Platform.Function page.
 *
 * @param {string} name - Function name (any case)
 * @returns {string} Site-relative URL
 */
export const platformFunctionUrl = (name) => `/platform-functions/${name.toLowerCase()}/`;

/**
 * URL for an HTTP method page.
 *
 * @param {string} name - Method name (any case)
 * @returns {string} Site-relative URL
 */
export const httpMethodUrl = (name) => `/http/${name.toLowerCase()}/`;

/**
 * URL for a WSProxy method page.
 *
 * @param {string} name - Method name (any case)
 * @returns {string} Site-relative URL
 */
export const wsproxyMethodUrl = (name) => `/wsproxy/${name.toLowerCase()}/`;

/**
 * Bare-name globals whose ssjs.guide page lives under /ecmascript-builtins/
 * because they are native ECMAScript constructors, not Core-library injections.
 * String() is documented on the string-methods page (constructor section).
 *
 * @type {Record<string, string>}
 */
const ECMASCRIPT_GLOBAL_URLS = {
    string: '/ecmascript-builtins/string-methods/#string-constructor',
    error: '/ecmascript-builtins/error/',
    boolean: '/ecmascript-builtins/boolean/',
    symbol: '/ecmascript-builtins/symbol/',
    bigint: '/ecmascript-builtins/bigint/',
    // Global URI functions and the missing escape/unescape live on one page.
    encodeuri: '/ecmascript-builtins/global-functions/#encodeuri',
    encodeuricomponent: '/ecmascript-builtins/global-functions/#encodeuricomponent',
    decodeuri: '/ecmascript-builtins/global-functions/#decodeuri',
    decodeuricomponent: '/ecmascript-builtins/global-functions/#decodeuricomponent',
    escape: '/ecmascript-builtins/global-functions/#escape',
    unescape: '/ecmascript-builtins/global-functions/#unescape',
    // Global value properties.
    undefined: '/ecmascript-builtins/global-values/#undefined',
    nan: '/ecmascript-builtins/global-values/#nan',
    infinity: '/ecmascript-builtins/global-values/#infinity',
    globalthis: '/ecmascript-builtins/global-values/#globalthis',
    // Typed arrays and binary buffers (all absent).
    arraybuffer: '/ecmascript-builtins/typed-arrays/#arraybuffer',
    sharedarraybuffer: '/ecmascript-builtins/typed-arrays/#sharedarraybuffer',
    dataview: '/ecmascript-builtins/typed-arrays/#dataview',
    atomics: '/ecmascript-builtins/typed-arrays/#atomics',
    int8array: '/ecmascript-builtins/typed-arrays/#int8array',
    uint8array: '/ecmascript-builtins/typed-arrays/#uint8array',
    uint8clampedarray: '/ecmascript-builtins/typed-arrays/#uint8array',
    int16array: '/ecmascript-builtins/typed-arrays/#int16array',
    uint16array: '/ecmascript-builtins/typed-arrays/#int16array',
    int32array: '/ecmascript-builtins/typed-arrays/#int32array',
    uint32array: '/ecmascript-builtins/typed-arrays/#int32array',
    float16array: '/ecmascript-builtins/typed-arrays/#float32array',
    float32array: '/ecmascript-builtins/typed-arrays/#float32array',
    float64array: '/ecmascript-builtins/typed-arrays/#float32array',
    bigint64array: '/ecmascript-builtins/typed-arrays/#bigint64array',
    biguint64array: '/ecmascript-builtins/typed-arrays/#bigint64array',
    // Memory management (absent).
    weakref: '/ecmascript-builtins/memory-management/#weakref',
    finalizationregistry: '/ecmascript-builtins/memory-management/#finalizationregistry',
    // Internationalization (absent).
    intl: '/ecmascript-builtins/internationalization/#intl',
};

/**
 * URL for a bare-name global's dedicated page.
 *
 * Former /global-functions/ pages were relocated: ECMAScript constructors
 * (String, Error) live under /ecmascript-builtins/, everything else — the
 * Core-library-injected bare names (Write, Stringify, Format, …) — under
 * /core-library/. Old /global-functions/ URLs redirect via redirect_from.
 *
 * @param {string} name - Function name (any case)
 * @returns {string} Site-relative URL
 */
export const globalFunctionUrl = (name) => {
    const lower = name.toLowerCase();
    return ECMASCRIPT_GLOBAL_URLS[lower] ?? `/core-library/${lower}/`;
};

/**
 * Site-index / navigation category for a bare-name global, matching where its
 * page lives (see globalFunctionUrl).
 *
 * @param {string} name - Function name (any case)
 * @returns {string} Category label
 */
export const globalFunctionCategory = (name) =>
    Object.hasOwn(ECMASCRIPT_GLOBAL_URLS, name.toLowerCase())
        ? 'ECMAScript Builtins'
        : 'Core Library';

// ── Group-page URL maps ──────────────────────────────────────────────────────
// All methods on a class share one documentation page.
// Keys use the dot-notation prefix from ssjs-data (e.g. 'Platform.Variable').

/**
 * Site-relative URLs for Platform-namespace object pages.
 * Key: dot-notation class prefix used in ssjs-data (e.g. 'Platform.Variable').
 *
 * @type {Record<string, string>}
 */
export const PLATFORM_OBJECT_URLS = {
    Platform: '/platform-objects/platform-load/',
    'Platform.Function': '/platform-functions/',
    'Platform.Variable': '/platform-objects/platform-variable/',
    'Platform.Response': '/platform-objects/platform-response/',
    'Platform.Request': '/platform-objects/platform-request/',
    'Platform.Recipient': '/platform-objects/platform-recipient/',
    // Moved out of platform-objects: HTTPHeader & DateTime now live under core-library
    // (they require Platform.Load("core", ...)); ErrorUtil now lives under wsproxy.
    HTTPHeader: '/core-library/httpheader/',
    DateTime: '/core-library/datetime/',
    'DateTime.TimeZone': '/core-library/datetime/',
    ErrorUtil: '/wsproxy/errorutil/',
};

/**
 * Site-relative URLs for Core Library class pages.
 * Key: dot-notation class prefix used in ssjs-data (e.g. 'DataExtension.Fields').
 * Sub-classes that share a parent page point to the same URL.
 *
 * @type {Record<string, string>}
 */
export const CORE_LIBRARY_URLS = {
    Account: '/core-library/account/',
    'Account.Tracking': '/core-library/account/',
    AccountUser: '/core-library/accountuser/',
    ContentAreaObj: '/core-library/contentareaobj/',
    DataExtension: '/core-library/dataextension/',
    'DataExtension.Fields': '/core-library/dataextension-fields/',
    'DataExtension.Rows': '/core-library/dataextension-rows/',
    DeliveryProfile: '/core-library/deliveryprofile/',
    Email: '/core-library/email/',
    FilterDefinition: '/core-library/filterdefinition/',
    Folder: '/core-library/folder/',
    List: '/core-library/list/',
    'List.Subscribers': '/core-library/list-subscribers/',
    'List.Subscribers.Tracking': '/core-library/list-subscribers/',
    Portfolio: '/core-library/portfolio/',
    QueryDefinition: '/core-library/querydefinition/',
    Send: '/core-library/send/',
    'Send.Definition': '/core-library/senddefinition/',
    'Send.Tracking': '/core-library/send/',
    'Send.Tracking.Clicks': '/core-library/send/',
    'Send.Tracking.TotalByInterval': '/core-library/send/',
    SendClassification: '/core-library/sendclassification/',
    SenderProfile: '/core-library/senderprofile/',
    Subscriber: '/core-library/subscriber/',
    'Subscriber.Attributes': '/core-library/subscriber/',
    'Subscriber.Lists': '/core-library/subscriber/',
    Template: '/core-library/template/',
    Tracking: '/core-library/events/',
    BounceEvent: '/core-library/events/',
    ClickEvent: '/core-library/events/',
    ForwardedEmailEvent: '/core-library/events/',
    ForwardedEmailOptInEvent: '/core-library/events/',
    NotSentEvent: '/core-library/events/',
    OpenEvent: '/core-library/events/',
    SentEvent: '/core-library/events/',
    SurveyEvent: '/core-library/events/',
    UnsubEvent: '/core-library/events/',
    TriggeredSend: '/core-library/triggeredsend/',
    'TriggeredSend.Tracking': '/core-library/triggeredsend/',
    'TriggeredSend.Tracking.Clicks': '/core-library/triggeredsend/',
    'TriggeredSend.Tracking.TotalByInterval': '/core-library/triggeredsend/',
};

/**
 * Site-relative URLs for ECMAScript built-in section pages.
 * Key: `owner` field value from ECMASCRIPT_BUILTINS entries.
 *
 * @type {Record<string, string>}
 */
export const ECMASCRIPT_URLS = {
    'Array.prototype': '/ecmascript-builtins/array-methods/',
    Array: '/ecmascript-builtins/array-methods/',
    'String.prototype': '/ecmascript-builtins/string-methods/',
    Math: '/ecmascript-builtins/math/',
    'Number.prototype': '/ecmascript-builtins/number-methods/',
    Number: '/ecmascript-builtins/number-methods/',
    'Object.prototype': '/ecmascript-builtins/object-methods/',
    Object: '/ecmascript-builtins/object-methods/',
    'Function.prototype': '/ecmascript-builtins/function-methods/',
    'Date.prototype': '/ecmascript-builtins/date-methods/',
    Date: '/ecmascript-builtins/date-methods/',
    RegExp: '/ecmascript-builtins/regular-expressions/',
    JSON: '/ecmascript-builtins/json/',
    Boolean: '/ecmascript-builtins/boolean/',
    'Boolean.prototype': '/ecmascript-builtins/boolean/',
    Symbol: '/ecmascript-builtins/symbol/',
    BigInt: '/ecmascript-builtins/bigint/',
    // Base Error constructor page.
    Error: '/ecmascript-builtins/error/',
    // Native Error subtypes (EvalError, RangeError, TypeError, …) share one page.
    ErrorTypes: '/ecmascript-builtins/error-types/',
    // Present global value properties (undefined) live on the global-values page.
    GlobalValues: '/ecmascript-builtins/global-values/',
    // Global owner: URI functions/escape live on global-functions; value
    // properties (undefined/NaN/Infinity/globalThis) on global-values.
    Global: '/ecmascript-builtins/global-functions/',
};

/**
 * Derive the in-page anchor for an ECMAScript built-in member on its
 * ecmascript-builtins section page.
 *
 * Each builtin page (array-methods, string-methods, math, …) renders one H3 per
 * member with an explicit `{#anchor}` ID equal to the lowercased member name.
 * Array and String live on separate pages, so member names are unique per page
 * and no owner qualifier is needed.
 *
 * @param {string} member - The method/property/constant name (e.g. 'splice', 'PI', 'toISOString')
 * @returns {string} Lowercased anchor slug (no leading '#')
 */
export const ecmascriptAnchor = (member) => String(member).toLowerCase();

/**
 * Split a PascalCase / camelCase identifier into lowercase hyphen-joined words.
 * Used for event-type anchors (e.g. `ForwardedEmailOptInEvent` → `forwarded-email-opt-in-event`).
 *
 * @param {string} name - Identifier to slugify
 * @returns {string} Hyphen-joined lowercase slug
 */
const kebabCase = (name) =>
    String(name)
        .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase();

/**
 * Derive the in-page H3 anchor for a Core Library / Platform object method on its
 * shared documentation page, matching the `{#anchor}` IDs authored in the .md pages
 * (see the SSJS Guide Page Structure rule).
 *
 * The anchor is derived from the method's `syntax` string:
 *
 * - **Instance methods** (`syntax` begins with `<XxxInstance>.`): drop the
 *   `<XxxInstance>` token, lowercase the remaining dot-separated path, join with
 *   hyphens, and prefix with `instance-`
 *   (e.g. `<ListInstance>.Subscribers.Tracking.Retrieve` → `instance-subscribers-tracking-retrieve`).
 * - **Static methods** (`syntax` begins with `ClassName.`): drop the leading
 *   segments that make up the page-owning class (derived from `pageSlug`), then
 *   lowercase + hyphen-join the remaining path
 *   (e.g. `Send.Tracking.Retrieve` on the `send` page → `tracking-retrieve`;
 *   `Send.Definition.AddWithDE` on the `senddefinition` page → `addwithde`).
 *
 * @param {string} syntax - The method's `syntax` string (may include a trailing `(args)` list)
 * @param {string} pageSlug - Last path segment of the method's page URL (e.g. `send`, `senddefinition`, `list-subscribers`)
 * @returns {string} Lowercased anchor slug (no leading `#`), or '' if it cannot be derived
 */
export const methodAnchor = (syntax, pageSlug) => {
    if (!syntax) {
        return '';
    }
    // Strip the argument list: everything from the first '(' onward.
    const call = String(syntax).split('(', 1)[0].trim();
    const instanceMatch = call.match(/^<[^>]+>\.(.+)$/);
    if (instanceMatch) {
        const rest = instanceMatch[1].split('.').filter(Boolean);
        return ['instance', ...rest.map((s) => s.toLowerCase())].join('-');
    }
    // Static method: drop the leading segments that form the page-owner class.
    const segments = call.split('.').filter(Boolean);
    const slugNorm = String(pageSlug || '')
        .replaceAll('-', '')
        .toLowerCase();
    let dropCount = 0;
    let acc = '';
    for (let i = 0; i < segments.length - 1; i++) {
        acc += segments[i].toLowerCase();
        dropCount = i + 1;
        if (acc === slugNorm) {
            break;
        }
    }
    // Fallback: if no prefix matched the page slug, drop only the first segment.
    if (acc !== slugNorm) {
        dropCount = 1;
    }
    const rest = segments.slice(dropCount);
    return rest.map((s) => s.toLowerCase()).join('-');
};

/**
 * Derive the in-page H2 anchor for a tracking event type on the events page,
 * matching the authored `{#anchor}` IDs (e.g. `BounceEvent` → `bounce-event`,
 * `ForwardedEmailOptInEvent` → `forwarded-email-opt-in-event`).
 *
 * @param {string} eventType - Event owner name (e.g. `BounceEvent`)
 * @returns {string} Lowercased hyphen-joined anchor slug (no leading `#`)
 */
export const eventAnchor = (eventType) => kebabCase(eventType);

/**
 * Standalone URL constants for pages not covered by the function-per-page patterns above.
 *
 * @type {Record<string, string>}
 */
export const GUIDE_URLS = {
    /** Attribute bare-name global page (lives under /core-library/, not /platform-objects/). */
    attribute: '/core-library/attribute/',
    /**
     * Shared page for all Script.Util.HttpRequest / HttpGet instance methods.
     * These methods are documented on the Script.Util.HttpRequest page; use
     * {@link httpRequestMethodUrl} to link to a specific method's anchor.
     */
    httpRequestMethods: '/http/script-util-httprequest/',
    /** Script.Util.HttpRequest constructor overview page. */
    scriptUtilHttpRequest: '/http/script-util-httprequest/',
    /** Script.Util.HttpGet constructor overview page. */
    scriptUtilHttpGet: '/http/script-util-httpget/',
    /** WSProxy constructor and overview page. */
    wsproxy: '/wsproxy/',
};

/**
 * Builds the URL for a specific Script.Util.HttpRequest / HttpGet instance method,
 * pointing at its anchor on the Script.Util.HttpRequest page. The anchor is the
 * lowercased method name (e.g. `send` -> `#send`, `setHeader` -> `#setheader`),
 * matching the explicit `{#...}` anchors in script-util-httprequest.md.
 *
 * @param {string} methodName - instance method name (e.g. "send", "setHeader")
 * @returns {string} guide URL with the method anchor
 */
export const httpRequestMethodUrl = (methodName) =>
    `${GUIDE_URLS.httpRequestMethods}#${String(methodName).toLowerCase()}`;

/**
 * Names of SSJS bare-name globals that have a dedicated ssjs.guide page
 * (resolved via globalFunctionUrl — /core-library/<name>/ or an
 * /ecmascript-builtins/ location). All other globals fall back to the URL of
 * their aliased Platform.Function page.
 *
 * @type {Set.<string>}
 */
export const GLOBAL_FUNCTION_PAGES = new Set([
    'write',
    'stringify',
    'base64encode',
    'base64decode',
    'format',
    'string',
    'error',
    'variable',
    'attribute',
    'redirect',
    'request',
    'contentarea',
    'contentareabyname',
    // Bare-name Platform.Function aliases that also get a dedicated
    // /core-library/<name>/ page cross-linked with their Platform.Function page.
    'now',
    'guid',
    'isemailaddress',
    'isphonenumber',
    'beginimpressionregion',
    'endimpressionregion',
]);

/**
 * Platform.Function names (all lowercase) whose ssjs.guide page lives at the
 * bare-name global's page (see globalFunctionUrl) rather than
 * /platform-functions/ because the function's primary documentation entry
 * point is the shorter global alias. Use globalFunctionUrl() for these in the
 * site-index.
 *
 * @type {Set.<string>}
 */
export const PLATFORM_FUNCTION_GLOBAL_ALIAS = new Set();
