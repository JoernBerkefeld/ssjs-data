/**
 * generate-dts.mjs
 *
 * Generates ssjs-data/dist/sfmc-globals.d.ts — ambient TypeScript declarations
 * for every SFMC SSJS global API surface, derived from the ssjs-data source arrays.
 *
 * Run: node scripts/generate-dts.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { dirname, join, resolve } = path;

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
    platformFunctionLookup,
    platformResponseLookup,
    platformVariableLookup,
    platformRequestLookup,
    platformRecipientLookup,
} from '../src/index.js';

// ── Type helpers ──────────────────────────────────────────────────────────────

/** Maps ssjs-data instance-type strings to their TypeScript names. */
const INSTANCE_TYPE_MAP = {
    DataExtensionInstance: 'DataExtensionInstance',
    WSProxyInstance: 'Script.Util.WSProxy',
    HttpRequestInstance: 'Script.Util.HttpRequest',
};

/**
 * Convert an ssjs-data type string to a TypeScript type string.
 *
 * @param {string} s - ssjs-data type string
 * @returns {string} Equivalent TypeScript type string
 */
function toTsType(s) {
    if (!s || s === 'any') {
        return 'any';
    }
    if (INSTANCE_TYPE_MAP[s]) {
        return INSTANCE_TYPE_MAP[s];
    }
    if (s === 'void') {
        return 'void';
    }
    if (s === 'boolean') {
        return 'boolean';
    }
    if (s === 'number') {
        return 'number';
    }
    if (s === 'string') {
        return 'string';
    }
    if (s === 'object') {
        return 'object';
    }
    if (s === 'array') {
        return 'any[]';
    }
    if (s === 'string[]') {
        return 'string[]';
    }
    if (s === 'object[]') {
        return 'object[]';
    }
    if (s === 'RegExp') {
        return 'RegExp';
    }
    // Union types like "string|number"
    if (s.includes('|')) {
        return s
            .split('|')
            .map((p) => toTsType(p.trim()))
            .join(' | ');
    }
    // Generic array suffix like "foo[]"
    if (s.endsWith('[]')) {
        return toTsType(s.slice(0, -2)) + '[]';
    }
    return 'any';
}

/**
 * True when a method entry represents a property rather than a callable.
 * Detected by explicit isProperty:true OR by having no params and no `(` in syntax.
 *
 * @param {object} m - ssjs-data method entry
 * @returns {boolean} True if the entry is a property, false if callable
 */
function isPropertyEntry(m) {
    return (
        m.isProperty === true ||
        (Array.isArray(m.params) &&
            m.params.length === 0 &&
            typeof m.syntax === 'string' &&
            !m.syntax.includes('('))
    );
}

/**
 * True when the last parameter is variadic.
 * Matches patterns like `element[, ...]` and `value1[, value2, ...]`.
 *
 * @param {object} m - ssjs-data method entry
 * @returns {boolean} True if the last parameter is variadic
 */
function isVariadicMethod(m) {
    return typeof m.syntax === 'string' && m.syntax.includes('...]');
}

/**
 * Build a TypeScript parameter list string.
 *
 * @param {Array} params - parameter entries from ssjs-data
 * @param {number} minArgs - minimum required argument count
 * @param {string|null} restParamType When set, the last param is emitted as a rest: `...paramName: type[]`
 * @returns {string} Comma-separated TypeScript parameter declarations
 */
function buildParamStr(params, minArgs, restParamType = null) {
    if (!params || params.length === 0) {
        return '';
    }
    const parts = [];
    const restIdx = restParamType == null ? -1 : params.length - 1;
    for (const [i, p] of params.entries()) {
        const optional = p.optional === true || (p.optional === undefined && i >= minArgs);
        if (i === restIdx) {
            parts.push(`...${p.name}: ${restParamType}[]`);
        } else {
            const tsType = toTsType(p.type);
            parts.push(`${p.name}${optional ? '?' : ''}: ${tsType}`);
        }
    }
    return parts.join(', ');
}

// ── Emission helpers ──────────────────────────────────────────────────────────

/**
 * Build a JSDoc block comment for a method entry when it has notable metadata.
 * Returns an empty string when no comment is needed.
 *
 * @param {object} m - ssjs-data method entry
 * @param {string} indent - indentation string to prepend
 * @returns {string} JSDoc comment string (including trailing newline) or empty string
 */
function buildJsDocComment(m, indent = '    ') {
    const lines = [];
    if (m.deprecated) {
        lines.push(`${indent} * @deprecated`);
    }
    if (m.requiresCoreLoad) {
        lines.push(`${indent} * @remarks Requires \`Platform.Load("Core", "1")\` before use.`);
    }
    if (lines.length === 0) {
        return '';
    }
    return [`${indent}/**`, ...lines, `${indent} */`].join('\n') + '\n';
}

/**
 * Emit a single method/property inside a `declare namespace` block.
 * Uses `function` keyword for callables, `var`/`const` for properties.
 *
 * @param {object} m - ssjs-data method entry
 * @param {string} indent - indentation string to prepend
 * @returns {string} TypeScript declaration line(s)
 */
function emitNsMember(m, indent = '    ') {
    const comment = buildJsDocComment(m, indent);
    const retType = toTsType(m.returnType);
    if (isPropertyEntry(m)) {
        // Response properties are writable (var); Request properties are readonly (const).
        // We use var universally here — callers that need const can override.
        return `${comment}${indent}var ${m.name}: ${retType};`;
    }
    let paramStr;
    if (isVariadicMethod(m) && m.params && m.params.length > 0) {
        const last = m.params.at(-1);
        const restType = toTsType(last.type);
        const restName = last.name.endsWith('s') ? last.name : `${last.name}s`;
        const overrideLast = { ...last, name: restName };
        const allParams = [...m.params.slice(0, -1), overrideLast];
        paramStr = buildParamStr(allParams, m.minArgs ?? 0, restType === 'any' ? 'any' : restType);
    } else {
        paramStr = buildParamStr(m.params, m.minArgs ?? 0);
    }
    return `${comment}${indent}function ${m.name}(${paramStr}): ${retType};`;
}

/**
 * Emit a single method/property inside an `interface` or `class` block.
 * Does NOT use the `function` keyword.
 *
 * @param {object} m - ssjs-data method entry
 * @param {string} indent - indentation string to prepend
 * @returns {string} TypeScript declaration line(s)
 */
function emitIfaceMember(m, indent = '    ') {
    const comment = buildJsDocComment(m, indent);
    const retType = toTsType(m.returnType);
    if (isPropertyEntry(m)) {
        return `${comment}${indent}readonly ${m.name}: ${retType};`;
    }
    let paramStr;
    if (isVariadicMethod(m) && m.params && m.params.length > 0) {
        const last = m.params.at(-1);
        const restType = toTsType(last.type);
        const restName = last.name.endsWith('s') ? last.name : `${last.name}s`;
        const overrideLast = { ...last, name: restName };
        const allParams = [...m.params.slice(0, -1), overrideLast];
        paramStr = buildParamStr(allParams, m.minArgs ?? 0, restType === 'any' ? 'any' : restType);
    } else {
        paramStr = buildParamStr(m.params, m.minArgs ?? 0);
    }
    return `${comment}${indent}${m.name}(${paramStr}): ${retType};`;
}

/**
 * Emit a block of interface/class members.
 *
 * @param {Array} methods - array of ssjs-data method entries
 * @param {string} indent - indentation string to prepend to each member
 * @returns {string} Newline-joined TypeScript declaration lines
 */
function emitIfaceBlock(methods, indent = '    ') {
    return methods.map((m) => emitIfaceMember(m, indent)).join('\n');
}

/**
 * Resolve an aliasOf string like 'Platform.Function.Lookup' to the source method entry.
 * Returns null if not found.
 *
 * @param {string} aliasOf - dotted path string, e.g. 'Platform.Function.Lookup'
 * @returns {object|null} The source method entry, or null if not found
 */
function resolveAlias(aliasOf) {
    const parts = aliasOf.split('.');
    if (parts.length === 3 && parts[0] === 'Platform') {
        const ns = parts[1];
        const key = parts[2].toLowerCase();
        if (ns === 'Function') {
            return platformFunctionLookup.get(key) ?? null;
        }
        if (ns === 'Response') {
            return platformResponseLookup.get(key) ?? null;
        }
        if (ns === 'Variable') {
            return platformVariableLookup.get(key) ?? null;
        }
        if (ns === 'Request') {
            return platformRequestLookup.get(key) ?? null;
        }
        if (ns === 'Recipient') {
            return platformRecipientLookup.get(key) ?? null;
        }
    }
    return null;
}

// ── Array<T> specialisation ───────────────────────────────────────────────────

/** Return-type overrides that use the generic type parameter T for Array<T>. */
const ARRAY_T_RETURNS = {
    pop: 'T',
    shift: 'T',
    concat: 'T[]',
    slice: 'T[]',
    sort: 'T[]',
    reverse: 'T[]',
    splice: 'T[]',
};

/** For these array methods the variadic/element parameter should be typed as T. */
const ARRAY_T_ELEMENT_METHODS = new Set(['push', 'unshift', 'concat', 'splice']);

/**
 * Emit a single Array<T> interface member with generic overrides.
 *
 * @param {object} m - ssjs-data method entry for an Array method
 * @param {string} indent - indentation string to prepend
 * @returns {string} TypeScript declaration line with generic T substitutions
 */
function emitArrayMember(m, indent = '    ') {
    if (isPropertyEntry(m)) {
        return `${indent}readonly ${m.name}: number;`;
    }
    const retType = ARRAY_T_RETURNS[m.name] ?? toTsType(m.returnType);
    if (!m.params || m.params.length === 0) {
        return `${indent}${m.name}(): ${retType};`;
    }
    const useT = ARRAY_T_ELEMENT_METHODS.has(m.name);
    let paramStr;
    if (isVariadicMethod(m)) {
        // Last param becomes rest
        const lead = buildParamStr(m.params.slice(0, -1), m.minArgs ?? 0);
        const last = m.params.at(-1);
        const restElem = useT ? 'T' : toTsType(last.type);
        const rest = `...${last.name}s: ${restElem}[]`;
        paramStr = lead ? `${lead}, ${rest}` : rest;
    } else {
        const adjusted = m.params.map((p) => {
            if (useT && (p.type === 'any' || p.type === 'array')) {
                return { ...p, type: 'T_PLACEHOLDER' };
            }
            return p;
        });
        paramStr = buildParamStr(adjusted, m.minArgs ?? 0).replaceAll('T_PLACEHOLDER', 'T');
    }
    // splice has 3 declared params but item should be rest
    if (m.name === 'splice') {
        // Rebuild: start: number, deleteCount?: number, ...items: T[]
        paramStr = 'start: number, deleteCount?: number, ...items: T[]';
    }
    return `${indent}${m.name}(${paramStr}): ${retType};`;
}

// ── Build output ──────────────────────────────────────────────────────────────

/** Lines of the generated .d.ts file. */
const out = [];

function line(s = '') {
    out.push(s);
}

// ── File header ───────────────────────────────────────────────────────────────
line('// sfmc-globals.d.ts — GENERATED by ssjs-data/scripts/generate-dts.mjs');
line('// DO NOT EDIT — run `npm run generate:dts` in ssjs-data to regenerate.');
line('// Ambient declarations for the complete SFMC SSJS global API surface.');
line("// Designed for use with TypeScript's noLib:true (no lib.es5.d.ts).");
line('');

// ── Platform namespace ────────────────────────────────────────────────────────
line('// ── Platform ────────────────────────────────────────────────────────────────');
line('declare namespace Platform {');
// Platform.Load (and any other PLATFORM_METHODS)
for (const m of PLATFORM_METHODS) {
    line(emitNsMember(m, '    '));
}
// Platform.Function
line('    namespace Function {');
for (const m of PLATFORM_FUNCTIONS) {
    line(emitNsMember(m, '        '));
}
line('    }');
// Platform.Variable
line('    namespace Variable {');
for (const m of PLATFORM_VARIABLE_METHODS) {
    line(emitNsMember(m, '        '));
}
line('    }');
// Platform.Response
line('    namespace Response {');
for (const m of PLATFORM_RESPONSE_METHODS) {
    if (isPropertyEntry(m)) {
        // Response properties are mutable (get/set)
        line(`        var ${m.name}: ${toTsType(m.returnType)};`);
    } else {
        line(emitNsMember(m, '        '));
    }
}
line('    }');
// Platform.Request
line('    namespace Request {');
for (const m of PLATFORM_REQUEST_METHODS) {
    if (isPropertyEntry(m)) {
        // Request properties are read-only
        line(`        const ${m.name}: ${toTsType(m.returnType)};`);
    } else {
        line(emitNsMember(m, '        '));
    }
}
line('    }');
// Platform.Recipient
line('    namespace Recipient {');
for (const m of PLATFORM_RECIPIENT_METHODS) {
    line(emitNsMember(m, '        '));
}
line('    }');
line('}');
line('');

// ── Bare-name globals (aliasOf Platform.*) ────────────────────────────────────
line('// ── Bare-name globals (aliasOf Platform.*) ──────────────────────────────────');
for (const g of SSJS_GLOBALS) {
    if (!g.aliasOf) {
        continue;
    }
    const src = resolveAlias(g.aliasOf);
    if (!src) {
        // Fallback: emit as any
        line(`declare function ${g.name}(...args: any[]): any;`);
        continue;
    }
    // Inherit deprecated/requiresCoreLoad from the source function if not overridden on the alias
    const effective = { ...src, ...g, aliasOf: g.aliasOf };
    const comment = buildJsDocComment(effective, '');
    const retType = toTsType(src.returnType);
    let paramStr;
    if (isVariadicMethod(src) && src.params && src.params.length > 0) {
        const restType = toTsType(src.params.at(-1).type);
        paramStr = buildParamStr(
            src.params,
            src.minArgs ?? 0,
            restType === 'any' ? 'any' : restType,
        );
    } else {
        paramStr = buildParamStr(src.params, src.minArgs ?? 0);
    }
    if (comment) {
        line(comment.trimEnd());
    }
    line(`declare function ${g.name}(${paramStr}): ${retType};`);
}
line('');

// ── DataExtension instance interfaces ─────────────────────────────────────────
line('// ── DataExtension instance interfaces ───────────────────────────────────────');
line('interface DataExtensionFieldsAccessor {');
line(emitIfaceBlock(DATA_EXTENSION_FIELDS_METHODS));
line('}');
line('interface DataExtensionRowsAccessor {');
line(emitIfaceBlock(DATA_EXTENSION_ROWS_METHODS));
line('}');
line('interface DataExtensionInstance {');
line('    Fields: DataExtensionFieldsAccessor;');
line('    Rows: DataExtensionRowsAccessor;');
line('}');
line('');

// ── Core Library namespaces ───────────────────────────────────────────────────
// Each entry: [TypeScript namespace name, ssjs-data methods array]
const CORE_CLASS_MAP = [
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

line('// ── Core Library namespaces ──────────────────────────────────────────────────');
for (const [nsName, methods] of CORE_CLASS_MAP) {
    if (!methods || methods.length === 0) {
        continue;
    }
    line(`declare namespace ${nsName} {`);
    for (const m of methods) {
        line(emitNsMember(m));
    }
    line('}');
}
line('');

// ── Standalone Core Library globals ───────────────────────────────────────────
line('// ── Standalone Core Library globals ──────────────────────────────────────────');
line('declare namespace Attribute {');
for (const m of ATTRIBUTE_METHODS) {
    line(emitNsMember(m));
}
line('}');
line('');

line('declare namespace ErrorUtil {');
for (const m of ERROR_UTIL_METHODS) {
    line(emitNsMember(m));
}
line('}');
line('');

// ── Event namespaces ──────────────────────────────────────────────────────────
// EVENT_METHODS entries have an `owner` field (BounceEvent, ClickEvent, …)
line('// ── Event namespaces ─────────────────────────────────────────────────────────');
{
    const byOwner = new Map();
    for (const m of EVENT_METHODS) {
        if (!byOwner.has(m.owner)) {
            byOwner.set(m.owner, []);
        }
        byOwner.get(m.owner).push(m);
    }
    for (const [owner, methods] of byOwner) {
        line(`declare namespace ${owner} {`);
        for (const m of methods) {
            line(emitNsMember(m));
        }
        line('}');
    }
}
line('');

// ── HTTP / HTTPHeader ─────────────────────────────────────────────────────────
line('// ── HTTP / HTTPHeader ────────────────────────────────────────────────────────');
line('declare namespace HTTP {');
for (const m of HTTP_METHODS) {
    line(emitNsMember(m));
}
line('}');
line('');

line('declare namespace HTTPHeader {');
for (const m of HTTPHEADER_METHODS) {
    line(emitNsMember(m));
}
line('}');
line('');

// ── Script.Util namespace (WSProxy, HttpRequest, HttpGet) ─────────────────────
line('// ── Script.Util ──────────────────────────────────────────────────────────────');
line('declare namespace Script {');
line('    namespace Util {');
for (const ctor of SCRIPT_UTIL_CONSTRUCTORS) {
    const ctorParamStr = buildParamStr(ctor.params, ctor.minArgs ?? 0);
    line(`        class ${ctor.name} {`);
    line(`            constructor(${ctorParamStr});`);
    // Instance methods: WSProxy gets WSPROXY_METHODS; Http* gets SCRIPT_UTIL_REQUEST_METHODS
    if (ctor.name === 'WSProxy') {
        for (const m of WSPROXY_METHODS) {
            line(emitIfaceMember(m, '            '));
        }
    } else {
        // HttpRequest and HttpGet share the same request instance methods
        for (const m of SCRIPT_UTIL_REQUEST_METHODS) {
            line(emitIfaceMember(m, '            '));
        }
    }
    line('        }');
}
line('    }');
line('}');
line('');

// ── ECMAScript built-ins (SFMC-supported subset) ──────────────────────────────
line('// ── ECMAScript built-ins (SFMC-supported subset only) ───────────────────────');
{
    // Group ECMASCRIPT_BUILTINS entries by their `owner` field
    const byOwner = new Map();
    for (const m of ECMASCRIPT_BUILTINS) {
        if (!byOwner.has(m.owner)) {
            byOwner.set(m.owner, []);
        }
        byOwner.get(m.owner).push(m);
    }

    // Array.prototype → interface Array<T>
    const arrayMembers = byOwner.get('Array.prototype') ?? [];
    line('interface Array<T> {');
    for (const m of arrayMembers) {
        line(emitArrayMember(m));
    }
    line('}');
    line('');

    // String.prototype → interface String
    const stringMembers = byOwner.get('String.prototype') ?? [];
    line('interface String {');
    for (const m of stringMembers) {
        if (isPropertyEntry(m)) {
            line(`    readonly ${m.name}: number;`);
        } else {
            const retType = toTsType(m.returnType);
            let paramStr;
            if (isVariadicMethod(m) && m.params && m.params.length > 0) {
                const last = m.params.at(-1);
                const restName = last.name.endsWith('s') ? last.name : `${last.name}s`;
                paramStr = buildParamStr(
                    [...m.params.slice(0, -1), { ...last, name: restName }],
                    m.minArgs ?? 0,
                    'string',
                );
            } else {
                paramStr = buildParamStr(m.params, m.minArgs ?? 0);
            }
            line(`    ${m.name}(${paramStr}): ${retType};`);
        }
    }
    line('}');
    line('');

    // Number.prototype → interface Number
    const numberMembers = byOwner.get('Number.prototype') ?? [];
    if (numberMembers.length > 0) {
        line('interface Number {');
        for (const m of numberMembers) {
            line(emitIfaceMember(m));
        }
        line('}');
        line('');
    }

    // Object.prototype → interface Object
    const objectMembers = byOwner.get('Object.prototype') ?? [];
    if (objectMembers.length > 0) {
        line('interface Object {');
        for (const m of objectMembers) {
            line(emitIfaceMember(m));
        }
        line('}');
        line('');
    }

    // Math → declare namespace Math
    const mathMembers = byOwner.get('Math') ?? [];
    if (mathMembers.length > 0) {
        line('declare namespace Math {');
        for (const m of mathMembers) {
            if (isPropertyEntry(m)) {
                line(`    const ${m.name}: number;`);
            } else {
                const retType = toTsType(m.returnType);
                let paramStr;
                if (isVariadicMethod(m) && m.params && m.params.length > 0) {
                    const last = m.params.at(-1);
                    const restName = last.name.endsWith('s') ? last.name : `${last.name}s`;
                    paramStr = buildParamStr(
                        [...m.params.slice(0, -1), { ...last, name: restName }],
                        m.minArgs ?? 0,
                        'number',
                    );
                } else {
                    paramStr = buildParamStr(m.params, m.minArgs ?? 0);
                }
                line(`    function ${m.name}(${paramStr}): ${retType};`);
            }
        }
        line('}');
        line('');
    }

    // RegExp → interface RegExp (if present)
    const regexpMembers = byOwner.get('RegExp') ?? [];
    if (regexpMembers.length > 0) {
        line('interface RegExp {');
        for (const m of regexpMembers) {
            line(emitIfaceMember(m));
        }
        line('}');
        line('');
    }

    // Global → top-level declare function
    const globalMembers = byOwner.get('Global') ?? [];
    if (globalMembers.length > 0) {
        line('// Global ECMAScript functions');
        for (const m of globalMembers) {
            const retType = toTsType(m.returnType);
            const paramStr = buildParamStr(m.params, m.minArgs ?? 0);
            line(`declare function ${m.name}(${paramStr}): ${retType};`);
        }
        line('');
    }

    // Emit any remaining owner groups not already handled
    const HANDLED_OWNERS = new Set([
        'Array.prototype',
        'String.prototype',
        'Number.prototype',
        'Object.prototype',
        'Math',
        'RegExp',
        'Global',
    ]);
    for (const [owner, members] of byOwner) {
        if (HANDLED_OWNERS.has(owner)) {
            continue;
        }
        // Unknown owner — emit as a declare namespace
        line(`declare namespace ${owner} {`);
        for (const m of members) {
            line(emitNsMember(m));
        }
        line('}');
        line('');
    }
}

// ── Write file ────────────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dir, '../dist');
const outFile = join(outDir, 'sfmc-globals.d.ts');

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, out.join('\n'), 'utf8');

const lineCount = out.length;
const byteCount = Buffer.byteLength(out.join('\n'), 'utf8');
// eslint-disable-next-line no-console
console.log(`Generated: ${outFile}`);
// eslint-disable-next-line no-console
console.log(`  ${lineCount} lines, ${(byteCount / 1024).toFixed(1)} KB`);
