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

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { dirname, join } = path;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const GUIDE = join(__dirname, '../../ssjs.guide');

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
 * @param {string} name - Qualified name for lookup (e.g. "HTTP.Get", "proxy.createItem")
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
for (const fn of PLATFORM_FUNCTIONS) {
    index.push(
        record(
            fn.name,
            `/platform-functions/${fn.name.toLowerCase()}/`,
            'Platform Functions',
            'function',
            fn,
        ),
    );
}

// ── HTTP Core Library: HTTP.Get, HTTP.Post ─────────────────────────────────
// Rule 4: http/ folder matches HTTP prefix → strip prefix → /http/<member>/
for (const fn of HTTP_METHODS) {
    index.push(
        record(`HTTP.${fn.name}`, `/http/${fn.name.toLowerCase()}/`, 'HTTP & REST', 'function', fn),
    );
}

// ── WSProxy methods ────────────────────────────────────────────────────────
// Rule 4: wsproxy/ folder matches proxy prefix → strip prefix → /wsproxy/<method>/
for (const fn of WSPROXY_METHODS) {
    index.push(
        record(`proxy.${fn.name}`, `/wsproxy/${fn.name.toLowerCase()}/`, 'WSProxy', 'method', fn),
    );
}

// ── Script.Util constructors ───────────────────────────────────────────────
const SCRIPT_UTIL_URLS = {
    WSProxy: '/wsproxy/',
    HttpRequest: '/http/script-util-httprequest/',
};
for (const fn of SCRIPT_UTIL_CONSTRUCTORS) {
    const url = SCRIPT_UTIL_URLS[fn.name] ?? `/http/${fn.name.toLowerCase()}/`;
    index.push(record(`new Script.Util.${fn.name}`, url, 'HTTP & REST', 'function', fn));
}

// ── Script.Util.HttpRequest instance methods ───────────────────────────────
for (const fn of SCRIPT_UTIL_REQUEST_METHODS) {
    index.push(
        record(
            `<HttpRequestInstance>.${fn.name}`,
            '/http/request-methods/',
            'HTTP & REST',
            'method',
            fn,
        ),
    );
}

// ── Platform objects ───────────────────────────────────────────────────────
// Rule 3: platform-objects/ is a grouping folder → full dot-notation slug
const PLATFORM_OBJECT_GROUPS = [
    { array: PLATFORM_METHODS, prefix: 'Platform', url: '/platform-objects/platform-load/' },
    {
        array: PLATFORM_VARIABLE_METHODS,
        prefix: 'Platform.Variable',
        url: '/platform-objects/platform-variable/',
    },
    {
        array: PLATFORM_RESPONSE_METHODS,
        prefix: 'Platform.Response',
        url: '/platform-objects/platform-response/',
    },
    {
        array: PLATFORM_REQUEST_METHODS,
        prefix: 'Platform.Request',
        url: '/platform-objects/platform-request/',
    },
    {
        array: PLATFORM_RECIPIENT_METHODS,
        prefix: 'Platform.Recipient',
        url: '/platform-objects/platform-recipient/',
    },
    { array: HTTPHEADER_METHODS, prefix: 'HTTPHeader', url: '/platform-objects/httpheader/' },
    {
        array: DATE_TIME_TIMEZONE_METHODS,
        prefix: 'DateTime.TimeZone',
        url: '/platform-objects/datetime-timezone/',
    },
    { array: ERROR_UTIL_METHODS, prefix: 'ErrorUtil', url: '/platform-objects/errorutil/' },
    { array: ATTRIBUTE_METHODS, prefix: 'Attribute', url: '/global-functions/attribute/' },
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
    { array: DATA_EXTENSION_METHODS, prefix: 'DataExtension', url: '/core-library/dataextension/' },
    {
        array: DATA_EXTENSION_FIELDS_METHODS,
        prefix: 'DataExtension.Fields',
        url: '/core-library/dataextension-fields/',
    },
    {
        array: DATA_EXTENSION_ROWS_METHODS,
        prefix: 'DataExtension.Rows',
        url: '/core-library/dataextension-rows/',
    },
    { array: ACCOUNT_METHODS, prefix: 'Account', url: '/core-library/account/' },
    { array: ACCOUNT_TRACKING_METHODS, prefix: 'Account.Tracking', url: '/core-library/account/' },
    { array: ACCOUNT_USER_METHODS, prefix: 'AccountUser', url: '/core-library/accountuser/' },
    { array: EMAIL_METHODS, prefix: 'Email', url: '/core-library/email/' },
    {
        array: FILTER_DEFINITION_METHODS,
        prefix: 'FilterDefinition',
        url: '/core-library/filterdefinition/',
    },
    { array: FOLDER_METHODS, prefix: 'Folder', url: '/core-library/folder/' },
    { array: LIST_METHODS, prefix: 'List', url: '/core-library/list/' },
    {
        array: LIST_SUBSCRIBERS_METHODS,
        prefix: 'List.Subscribers',
        url: '/core-library/list-subscribers/',
    },
    {
        array: LIST_SUBSCRIBERS_TRACKING_METHODS,
        prefix: 'List.Subscribers.Tracking',
        url: '/core-library/list-subscribers/',
    },
    { array: SUBSCRIBER_METHODS, prefix: 'Subscriber', url: '/core-library/subscriber/' },
    {
        array: SUBSCRIBER_ATTRIBUTES_METHODS,
        prefix: 'Subscriber.Attributes',
        url: '/core-library/subscriber/',
    },
    {
        array: SUBSCRIBER_LISTS_METHODS,
        prefix: 'Subscriber.Lists',
        url: '/core-library/subscriber/',
    },
    { array: TEMPLATE_METHODS, prefix: 'Template', url: '/core-library/template/' },
    {
        array: DELIVERY_PROFILE_METHODS,
        prefix: 'DeliveryProfile',
        url: '/core-library/deliveryprofile/',
    },
    { array: SENDER_PROFILE_METHODS, prefix: 'SenderProfile', url: '/core-library/senderprofile/' },
    {
        array: SEND_CLASSIFICATION_METHODS,
        prefix: 'SendClassification',
        url: '/core-library/sendclassification/',
    },
    {
        array: QUERY_DEFINITION_METHODS,
        prefix: 'QueryDefinition',
        url: '/core-library/querydefinition/',
    },
    { array: SEND_METHODS, prefix: 'Send', url: '/core-library/send/' },
    { array: SEND_TRACKING_METHODS, prefix: 'Send.Tracking', url: '/core-library/send/' },
    {
        array: SEND_DEFINITION_METHODS,
        prefix: 'Send.Definition',
        url: '/core-library/senddefinition/',
    },
    { array: TRIGGERED_SEND_METHODS, prefix: 'TriggeredSend', url: '/core-library/triggeredsend/' },
    {
        array: TRIGGERED_SEND_TRACKING_METHODS,
        prefix: 'TriggeredSend.Tracking',
        url: '/core-library/triggeredsend/',
    },
    {
        array: TRIGGERED_SEND_TRACKING_CLICKS_METHODS,
        prefix: 'TriggeredSend.Tracking.Clicks',
        url: '/core-library/triggeredsend/',
    },
    {
        array: TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS,
        prefix: 'TriggeredSend.Tracking.TotalByInterval',
        url: '/core-library/triggeredsend/',
    },
    { array: EVENT_METHODS, prefix: 'Tracking', url: '/core-library/events/' },
    {
        array: CONTENT_AREA_OBJ_METHODS,
        prefix: 'ContentAreaObj',
        url: '/core-library/contentareaobj/',
    },
    { array: PORTFOLIO_METHODS, prefix: 'Portfolio', url: '/core-library/portfolio/' },
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

// Core Library object overview entries (one entry per object, points to the object page)
for (const obj of CORE_LIBRARY_OBJECTS) {
    const slug = obj.name.toLowerCase().replaceAll('.', '-');
    const url = `/core-library/${slug}/`;
    index.push({
        name: obj.name,
        url,
        section: 'Core Library',
        type: 'object',
        description: firstSentence(obj.description),
    });
}

// ── ECMAScript builtins ────────────────────────────────────────────────────
const ECMA_OWNER_URL = {
    'Array.prototype': '/ecmascript-builtins/array-methods/',
    'String.prototype': '/ecmascript-builtins/string-methods/',
    Math: '/ecmascript-builtins/math/',
    'Number.prototype': '/ecmascript-builtins/number-methods/',
    'Object.prototype': '/ecmascript-builtins/object-methods/',
};

for (const fn of ECMASCRIPT_BUILTINS) {
    const url = ECMA_OWNER_URL[fn.owner];
    if (!url) {
        continue;
    }
    const ownerShort = fn.owner.replace('.prototype', '');
    index.push(
        record(
            `${ownerShort}.${fn.name}`,
            url,
            'ECMAScript Builtins',
            fn.isProperty ? 'property' : 'method',
            fn,
        ),
    );
}

// ── SSJS Globals ───────────────────────────────────────────────────────────
// Functions with dedicated pages under /global-functions/
for (const g of SSJS_GLOBALS) {
    if (g.type !== 'function') {
        continue;
    }
    index.push(
        record(
            g.name,
            `/global-functions/${g.name.toLowerCase()}/`,
            'Global Functions',
            'function',
            g,
        ),
    );
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
