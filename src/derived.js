import { SSJS_GLOBALS } from './globals.js';
import { PLATFORM_FUNCTIONS } from './platform-functions.js';
import {
    ATTRIBUTE_METHODS,
    DATE_TIME_TIMEZONE_METHODS,
    ERROR_UTIL_METHODS,
    PLATFORM_RECIPIENT_METHODS,
    PLATFORM_REQUEST_METHODS,
    PLATFORM_RESPONSE_METHODS,
    PLATFORM_VARIABLE_METHODS,
    REQUEST_UTILITY_METHODS,
} from './platform-methods.js';
import {
    ACCOUNT_METHODS,
    ACCOUNT_TRACKING_METHODS,
    ACCOUNT_USER_METHODS,
    CONTENT_AREA_OBJ_METHODS,
    CORE_LIBRARY_OBJECTS,
    DATA_EXTENSION_FIELDS_METHODS,
    DATA_EXTENSION_METHODS,
    DATA_EXTENSION_ROWS_METHODS,
    DELIVERY_PROFILE_METHODS,
    EMAIL_METHODS,
    EVENT_METHODS,
    FILTER_DEFINITION_METHODS,
    FOLDER_METHODS,
    LIST_METHODS,
    LIST_SUBSCRIBERS_METHODS,
    LIST_SUBSCRIBERS_TRACKING_METHODS,
    PORTFOLIO_METHODS,
    QUERY_DEFINITION_METHODS,
    SEND_CLASSIFICATION_METHODS,
    SEND_DEFINITION_METHODS,
    SEND_METHODS,
    SEND_TRACKING_CLICKS_METHODS,
    SEND_TRACKING_METHODS,
    SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS,
    SENDER_PROFILE_METHODS,
    SUBSCRIBER_ATTRIBUTES_METHODS,
    SUBSCRIBER_LISTS_METHODS,
    SUBSCRIBER_METHODS,
    TEMPLATE_METHODS,
    TRIGGERED_SEND_METHODS,
    TRIGGERED_SEND_TRACKING_CLICKS_METHODS,
    TRIGGERED_SEND_TRACKING_METHODS,
    TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS,
} from './core-library.js';
import {
    HTTP_METHODS,
    HTTPHEADER_METHODS,
    SCRIPT_UTIL_REQUEST_PROPERTIES,
    WSPROXY_METHODS,
} from './http-wsproxy.js';
import { KNOWN_UNSUPPORTED, UNSUPPORTED_SYNTAX } from './unsupported.js';
import { POLYFILLABLE_METHODS } from './polyfills.js';

/**
 * Map of global names for ESLint no-undef configuration.
 * Keys are identifiers; values are "readonly" or "writable".
 */
export const SSJS_GLOBALS_MAP = Object.fromEntries([
    // Exclude notDefinedAtRuntime entries (e.g. Redirect): they are documented but
    // do not exist in the SSJS engine, so they must NOT be treated as valid globals
    // by ESLint's no-undef — the dedicated ssjs-no-nonexistent-global rule flags them.
    ...SSJS_GLOBALS.filter((g) => !g.notDefinedAtRuntime).map((g) => [g.name, 'readonly']),
    ['HTTP', 'readonly'],

    ['Script', 'readonly'],
    ['DateTime', 'readonly'],
    ['ErrorUtil', 'readonly'],
    ['DataExtension', 'readonly'],
    ['Subscriber', 'readonly'],
    ['Email', 'readonly'],
    ['TriggeredSend', 'readonly'],
    ['List', 'readonly'],
    ['ContentArea', 'readonly'],
    ['Folder', 'readonly'],
    ['QueryDefinition', 'readonly'],
    ['Send', 'readonly'],
    ['Template', 'readonly'],
    ['DeliveryProfile', 'readonly'],
    ['SenderProfile', 'readonly'],
    ['SendClassification', 'readonly'],
    ['FilterDefinition', 'readonly'],
    ['Account', 'readonly'],
    ['AccountUser', 'readonly'],
    ['Portfolio', 'readonly'],
    ['BounceEvent', 'readonly'],
    ['ClickEvent', 'readonly'],
    ['ForwardedEmailEvent', 'readonly'],
    ['ForwardedEmailOptInEvent', 'readonly'],
    ['NotSentEvent', 'readonly'],
    ['OpenEvent', 'readonly'],
    ['SentEvent', 'readonly'],
    ['SurveyEvent', 'readonly'],
    ['UnsubEvent', 'readonly'],
]);

/**
 * Lowercased names of SSJS globals that are officially documented but proven NOT
 * to exist at runtime (calling them throws a ReferenceError), e.g. `Redirect`.
 * Consumed by the `ssjs-no-nonexistent-global` ESLint rule and the LSP validator
 * to flag these phantom globals instead of treating them as valid.
 */
export const notDefinedAtRuntimeGlobalNames = new Set(
    SSJS_GLOBALS.filter((g) => g.notDefinedAtRuntime).map((g) => g.name.toLowerCase()),
);

/**
 * Lookup map (lowercased name → global entry) for SSJS globals flagged
 * `notDefinedAtRuntime`. Lets consumers surface the runtime-safe replacement
 * (from the entry's `officialDocsNote` / `description`) when reporting the global.
 */
export const notDefinedAtRuntimeGlobalLookup = new Map(
    SSJS_GLOBALS.filter((g) => g.notDefinedAtRuntime).map((g) => [g.name.toLowerCase(), g]),
);

export const platformFunctionLookup = new Map(
    PLATFORM_FUNCTIONS.map((f) => [f.name.toLowerCase(), f]),
);

export const platformFunctionNames = new Set(PLATFORM_FUNCTIONS.map((f) => f.name.toLowerCase()));

export const coreObjectNames = new Set(CORE_LIBRARY_OBJECTS.map((o) => o.name));

export const coreObjectLookup = new Map(CORE_LIBRARY_OBJECTS.map((o) => [o.name, o]));

export const httpMethodNames = new Set(HTTP_METHODS.map((m) => m.name.toLowerCase()));

export const wsproxyMethodNames = new Set(WSPROXY_METHODS.map((m) => m.name.toLowerCase()));

export const httpHeaderMethodNames = new Set(HTTPHEADER_METHODS.map((m) => m.name.toLowerCase()));

export const platformRecipientMethodNames = new Set(
    PLATFORM_RECIPIENT_METHODS.map((m) => m.name.toLowerCase()),
);

export const attributeMethodNames = new Set(ATTRIBUTE_METHODS.map((m) => m.name.toLowerCase()));

// Build a quick-lookup map by AST node type for the ESLint rule
export const unsupportedByNodeType = new Map();

for (const entry of UNSUPPORTED_SYNTAX) {
    if (!unsupportedByNodeType.has(entry.nodeType)) {
        unsupportedByNodeType.set(entry.nodeType, []);
    }
    unsupportedByNodeType.get(entry.nodeType).push(entry);
}

// Pre-built lookups for the ESLint rule — keyed by method name
export const polyfillByPrototypeName = new Map();

export const polyfillByStaticName = new Map();

for (const entry of POLYFILLABLE_METHODS) {
    if (entry.isStatic) {
        polyfillByStaticName.set(entry.method, entry);
    } else {
        polyfillByPrototypeName.set(entry.method, entry);
    }
}

// Pre-built lookups for KNOWN_UNSUPPORTED — keyed by member name (lowercase).
export const knownUnsupportedByPrototypeName = new Map();

export const knownUnsupportedByStaticName = new Map();

for (const entry of KNOWN_UNSUPPORTED) {
    if (entry.isStatic) {
        knownUnsupportedByStaticName.set(entry.member.toLowerCase(), entry);
    } else {
        knownUnsupportedByPrototypeName.set(entry.member.toLowerCase(), entry);
    }
}

// ── Per-namespace method lookup Maps ─────────────────────────────────────────
// Each Map is keyed by method name (lowercase) and contains the full method
// entry (minArgs, maxArgs, params, etc.) for use by ESLint arity/type rules.

export const platformResponseLookup = new Map(
    PLATFORM_RESPONSE_METHODS.map((m) => [m.name.toLowerCase(), m]),
);

export const platformVariableLookup = new Map(
    PLATFORM_VARIABLE_METHODS.map((m) => [m.name.toLowerCase(), m]),
);

export const platformRequestLookup = new Map(
    PLATFORM_REQUEST_METHODS.map((m) => [m.name.toLowerCase(), m]),
);

export const requestUtilityLookup = new Map(
    REQUEST_UTILITY_METHODS.map((m) => [m.name.toLowerCase(), m]),
);

export const platformRecipientLookup = new Map(
    PLATFORM_RECIPIENT_METHODS.map((m) => [m.name.toLowerCase(), m]),
);

export const httpMethodLookup = new Map(HTTP_METHODS.map((m) => [m.name.toLowerCase(), m]));

export const httpHeaderMethodLookup = new Map(
    HTTPHEADER_METHODS.map((m) => [m.name.toLowerCase(), m]),
);

export const wsproxyMethodLookup = new Map(WSPROXY_METHODS.map((m) => [m.name.toLowerCase(), m]));

export const attributeMethodLookup = new Map(
    ATTRIBUTE_METHODS.map((m) => [m.name.toLowerCase(), m]),
);

export const ssjsGlobalsLookup = new Map(
    SSJS_GLOBALS.filter((g) => g.type === 'function').map((g) => [g.name.toLowerCase(), g]),
);

// ── Core Library rich-method arity lookup ─────────────────────────────────────
// Single source of `[className, methodsArray]` pairs shared by the derived Core
// lookups below (coreMethodArityLookup + coreNonFunctionalMethodLookup) so both
// iterate the SAME grouping (DRY). Covers all CORE_LIBRARY_OBJECTS namespaces plus
// their rich *_METHODS arrays. Event objects are folded in separately because they
// share the single EVENT_METHODS array grouped by each entry's `owner`.
const CORE_METHOD_ARRAYS = [
    ['Account', ACCOUNT_METHODS],
    ['Account.Tracking', ACCOUNT_TRACKING_METHODS],
    ['AccountUser', ACCOUNT_USER_METHODS],
    ['Portfolio', PORTFOLIO_METHODS],
    ['ContentAreaObj', CONTENT_AREA_OBJ_METHODS],
    ['Folder', FOLDER_METHODS],
    ['Template', TEMPLATE_METHODS],
    ['DeliveryProfile', DELIVERY_PROFILE_METHODS],
    ['SenderProfile', SENDER_PROFILE_METHODS],
    ['SendClassification', SEND_CLASSIFICATION_METHODS],
    ['FilterDefinition', FILTER_DEFINITION_METHODS],
    ['QueryDefinition', QUERY_DEFINITION_METHODS],
    ['List', LIST_METHODS],
    ['List.Subscribers', LIST_SUBSCRIBERS_METHODS],
    ['List.Subscribers.Tracking', LIST_SUBSCRIBERS_TRACKING_METHODS],
    ['Subscriber', SUBSCRIBER_METHODS],
    ['Subscriber.Attributes', SUBSCRIBER_ATTRIBUTES_METHODS],
    ['Subscriber.Lists', SUBSCRIBER_LISTS_METHODS],
    ['Email', EMAIL_METHODS],
    ['Send', SEND_METHODS],
    ['Send.Tracking', SEND_TRACKING_METHODS],
    ['Send.Tracking.Clicks', SEND_TRACKING_CLICKS_METHODS],
    ['Send.Tracking.TotalByInterval', SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS],
    ['Send.Definition', SEND_DEFINITION_METHODS],
    ['TriggeredSend', TRIGGERED_SEND_METHODS],
    ['TriggeredSend.Tracking', TRIGGERED_SEND_TRACKING_METHODS],
    ['TriggeredSend.Tracking.Clicks', TRIGGERED_SEND_TRACKING_CLICKS_METHODS],
    ['TriggeredSend.Tracking.TotalByInterval', TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS],
    ['DataExtension', DATA_EXTENSION_METHODS],
    ['DataExtension.Fields', DATA_EXTENSION_FIELDS_METHODS],
    ['DataExtension.Rows', DATA_EXTENSION_ROWS_METHODS],
    ['DateTime.TimeZone', DATE_TIME_TIMEZONE_METHODS],
];

// Maps class name (lowercase) → Map<method name (lowercase), entry>.
export const coreMethodArityLookup = new Map();

for (const [className, methods] of CORE_METHOD_ARRAYS) {
    coreMethodArityLookup.set(
        className.toLowerCase(),
        new Map(methods.map((m) => [m.name.toLowerCase(), m])),
    );
}

// Event objects share the EVENT_METHODS array — group by owner
for (const m of EVENT_METHODS) {
    const key = m.owner.toLowerCase();
    if (!coreMethodArityLookup.has(key)) {
        coreMethodArityLookup.set(key, new Map());
    }
    coreMethodArityLookup.get(key).set(m.name.toLowerCase(), m);
}

// ── Core Library non-functional-at-runtime lookup ─────────────────────────────
// Maps class name (lowercase) → Map<method name (lowercase), entry> for Core methods
// that RESOLVE at runtime but have NO known working invocation (nonFunctionalAtRuntime).
// Mirrors coreMethodArityLookup's shape (full entry stored, so consumers can surface
// officialDocsNote), but only includes methods flagged nonFunctionalAtRuntime === true.
// Classes with no flagged methods are omitted entirely.
export const coreNonFunctionalMethodLookup = new Map();

for (const [className, methods] of CORE_METHOD_ARRAYS) {
    const flagged = methods.filter((m) => m.nonFunctionalAtRuntime === true);
    if (flagged.length > 0) {
        coreNonFunctionalMethodLookup.set(
            className.toLowerCase(),
            new Map(flagged.map((m) => [m.name.toLowerCase(), m])),
        );
    }
}

// Event objects (EVENT_METHODS) — parity with coreMethodArityLookup. None are
// flagged today, but keep the grouping consistent so a future flag is picked up.
for (const m of EVENT_METHODS) {
    if (m.nonFunctionalAtRuntime !== true) {
        continue;
    }
    const key = m.owner.toLowerCase();
    if (!coreNonFunctionalMethodLookup.has(key)) {
        coreNonFunctionalMethodLookup.set(key, new Map());
    }
    coreNonFunctionalMethodLookup.get(key).set(m.name.toLowerCase(), m);
}

// ── Core Library deprecated-method lookup ─────────────────────────────────────
// Maps class name (lowercase) → Map<method name (lowercase), entry> for Core methods
// flagged deprecated === true (still work at runtime, but superseded by newer
// functionality such as Content Builder assets). Mirrors coreNonFunctionalMethodLookup's
// shape. Classes with no flagged methods are omitted entirely.
export const coreDeprecatedMethodLookup = new Map();

for (const [className, methods] of CORE_METHOD_ARRAYS) {
    const flagged = methods.filter((m) => m.deprecated === true);
    if (flagged.length > 0) {
        coreDeprecatedMethodLookup.set(
            className.toLowerCase(),
            new Map(flagged.map((m) => [m.name.toLowerCase(), m])),
        );
    }
}

// Event objects (EVENT_METHODS) — parity with coreMethodArityLookup. None are
// flagged today, but keep the grouping consistent so a future flag is picked up.
for (const m of EVENT_METHODS) {
    if (m.deprecated !== true) {
        continue;
    }
    const key = m.owner.toLowerCase();
    if (!coreDeprecatedMethodLookup.has(key)) {
        coreDeprecatedMethodLookup.set(key, new Map());
    }
    coreDeprecatedMethodLookup.get(key).set(m.name.toLowerCase(), m);
}

// ── Core-version-bound member lookup ──────────────────────────────────────────
// Members that exist only up to a maximum `Platform.Load("Core", <version>)`.
// Beyond that version they are `undefined` at runtime, so calling them throws.
// Maps the lowercase qualified name (e.g. "errorutil", "errorutil.throwwsproxyerror")
// → { name, maxCoreVersion }. Built generically from the catalogs so that flagging a
// future member is a one-field change.
export const maxCoreVersionLookup = new Map();

for (const entry of SSJS_GLOBALS) {
    if (typeof entry.maxCoreVersion === 'string') {
        maxCoreVersionLookup.set(entry.name.toLowerCase(), {
            name: entry.name,
            maxCoreVersion: entry.maxCoreVersion,
        });
    }
}

const ownedMethodEntries = [
    ...[['ErrorUtil', ERROR_UTIL_METHODS], ...CORE_METHOD_ARRAYS].flatMap(([ownerName, methods]) =>
        methods.map((m) => [ownerName, m]),
    ),
    ...EVENT_METHODS.map((m) => [m.owner, m]),
];

for (const [ownerName, m] of ownedMethodEntries) {
    if (typeof m.maxCoreVersion !== 'string') {
        continue;
    }
    const qualifiedName = `${ownerName}.${m.name}`;
    maxCoreVersionLookup.set(qualifiedName.toLowerCase(), {
        name: qualifiedName,
        maxCoreVersion: m.maxCoreVersion,
    });
}

// ── Restricted property-access lookup ────────────────────────────────────────
// Members whose access direction is restricted at runtime:
//   'write-only'        — assignment works, reading THROWS ("Property Get method
//                         was not found."), which aborts the page outside try/catch.
//   'write-only-opaque' — assignment works, reading returns an opaque CLR value
//                         instead of the assigned string. No throw.
//   'read-only'         — reading works, assignment is silently ineffective.
// Keyed by the lowercase qualified name (e.g. "platform.request.method") →
// { name, owner, access }. Built generically from the catalogs so that flagging a
// future property is a one-field change.
export const propertyAccessLookup = new Map(
    [
        ['Script.Util.HttpRequest', SCRIPT_UTIL_REQUEST_PROPERTIES],
        ['Platform.Response', PLATFORM_RESPONSE_METHODS],
        ['Platform.Request', PLATFORM_REQUEST_METHODS],
    ].flatMap(([ownerName, members]) =>
        members
            .filter((m) => typeof m.access === 'string')
            .map((m) => [
                `${ownerName}.${m.name}`.toLowerCase(),
                { name: m.name, owner: ownerName, access: m.access },
            ]),
    ),
);
