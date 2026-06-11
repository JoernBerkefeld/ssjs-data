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
 * URL for a global-function page.
 *
 * @param {string} name - Function name (any case)
 * @returns {string} Site-relative URL
 */
export const globalFunctionUrl = (name) => `/global-functions/${name.toLowerCase()}/`;

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
    HTTPHeader: '/platform-objects/httpheader/',
    DateTime: '/platform-objects/datetime/',
    'DateTime.TimeZone': '/platform-objects/datetime/',
    ErrorUtil: '/platform-objects/errorutil/',
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
    'String.prototype': '/ecmascript-builtins/string-methods/',
    Math: '/ecmascript-builtins/math/',
    'Number.prototype': '/ecmascript-builtins/number-methods/',
    'Object.prototype': '/ecmascript-builtins/object-methods/',
    RegExp: '/language/regular-expressions/',
};

/**
 * Standalone URL constants for pages not covered by the function-per-page patterns above.
 *
 * @type {Record<string, string>}
 */
export const GUIDE_URLS = {
    /** Attribute global-function page (lives under /global-functions/, not /platform-objects/). */
    attribute: '/global-functions/attribute/',
    /** Shared page for all Script.Util.HttpRequest / HttpGet instance methods. */
    httpRequestMethods: '/http/request-methods/',
    /** Script.Util.HttpRequest constructor overview page. */
    scriptUtilHttpRequest: '/http/script-util-httprequest/',
    /** Script.Util.HttpGet constructor overview page. */
    scriptUtilHttpGet: '/http/script-util-httpget/',
    /** WSProxy constructor and overview page. */
    wsproxy: '/wsproxy/',
};

/**
 * Names of SSJS global functions that have a dedicated ssjs.guide page at
 * /global-functions/<name>/. All other globals fall back to the URL of their
 * aliased Platform.Function page.
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
    'contentarea',
    'contentareabyname',
]);

/**
 * Platform.Function names (all lowercase) whose ssjs.guide page lives under
 * /global-functions/ rather than /platform-functions/ because the function's
 * primary documentation entry point is the shorter global alias.
 * Use globalFunctionUrl() for these in the site-index.
 *
 * @type {Set.<string>}
 */
export const PLATFORM_FUNCTION_GLOBAL_ALIAS = new Set();
