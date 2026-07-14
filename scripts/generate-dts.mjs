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
    GUIDE_BASE_URL,
    platformFunctionUrl,
    httpMethodUrl,
    wsproxyMethodUrl,
    globalFunctionUrl,
    PLATFORM_OBJECT_URLS,
    CORE_LIBRARY_URLS,
    GUIDE_URLS,
    httpRequestMethodUrl,
    GLOBAL_FUNCTION_PAGES,
    PLATFORM_FUNCTION_GLOBAL_ALIAS,
    ECMASCRIPT_URLS,
    mdnBuiltinUrl,
} from '../src/urls.js';

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
    SCRIPT_UTIL_REQUEST_PROPERTIES,
    SCRIPT_UTIL_HTTPGET_PROPERTIES,
    SCRIPT_UTIL_RESPONSE_PROPERTIES,
    WSPROXY_RESULT_PROPERTIES,
    CONSTRUCTIBLE_BUILTINS,
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
    HttpResponseInstance: 'HttpResponseInstance',
    WSProxyResult: 'WSProxyResult',
    AccountInstance: 'AccountInstance',
    AccountUserInstance: 'AccountUserInstance',
    PortfolioInstance: 'PortfolioInstance',
    ContentAreaObjInstance: 'ContentAreaObjInstance',
    FolderInstance: 'FolderInstance',
    TemplateInstance: 'TemplateInstance',
    DeliveryProfileInstance: 'DeliveryProfileInstance',
    SenderProfileInstance: 'SenderProfileInstance',
    SendClassificationInstance: 'SendClassificationInstance',
    FilterDefinitionInstance: 'FilterDefinitionInstance',
    QueryDefinitionInstance: 'QueryDefinitionInstance',
    ListInstance: 'ListInstance',
    SubscriberInstance: 'SubscriberInstance',
    EmailInstance: 'EmailInstance',
    SendInstance: 'SendInstance',
    SendDefinitionInstance: 'SendDefinitionInstance',
    TriggeredSendInstance: 'TriggeredSendInstance',
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
    const mapped = INSTANCE_TYPE_MAP[s];
    if (mapped) {
        return mapped;
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
    // Inline object-literal types like "{ Status: number, Content: string }" pass through verbatim.
    if (s.startsWith('{') && s.endsWith('}')) {
        return s;
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
 * Resolve the minimum required argument count for an ECMAScript builtin entry.
 *
 * ECMASCRIPT_BUILTINS entries do not carry minArgs/maxArgs. Optionality is
 * encoded in the `syntax` string: parameters before the first `[` are
 * required, everything from `[` onward is optional. Falling back to 0 would
 * (incorrectly) mark every parameter optional in the generated .d.ts — e.g.
 * `Date.parse(dateString)` would become `parse(dateString?: string)`.
 *
 * Per-param `optional` flags still take precedence in buildParamStr; this only
 * supplies the inference baseline for params with no explicit flag.
 *
 * @param {object} m - ssjs-data ECMASCRIPT_BUILTINS entry
 * @returns {number} Number of leading required parameters
 */
function ecmaBuiltinMinArgs(m) {
    if (typeof m.minArgs === 'number') {
        return m.minArgs;
    }
    if (!m.params || m.params.length === 0) {
        return 0;
    }
    if (typeof m.syntax !== 'string') {
        // No syntax to infer from — treat all declared params as required.
        return m.params.length;
    }
    const open = m.syntax.indexOf('[');
    if (open === -1) {
        // No optional bracket — every declared param is required.
        return m.params.length;
    }
    // Count comma-separated args in the required (pre-bracket) portion of the
    // arg list. e.g. "Math.pow(base, exponent)" → 2; "Date.parse(dateString)" → 1.
    const lparen = m.syntax.indexOf('(');
    const required = m.syntax
        .slice(lparen + 1, open)
        .trim()
        .replace(/,\s*$/, '');
    if (required === '') {
        return 0;
    }
    return required.split(',').filter((s) => s.trim() !== '').length;
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
        const isOptional = p.optional === true || (p.optional === undefined && i >= minArgs);
        if (i === restIdx) {
            parts.push(`...${p.name}: ${restParamType}[]`);
        } else {
            const tsType = toTsType(p.type);
            parts.push(`${p.name}${isOptional ? '?' : ''}: ${tsType}`);
        }
    }
    return parts.join(', ');
}

// ── Emission helpers ──────────────────────────────────────────────────────────

/**
 * Maps Platform.X namespace paths to their methods arrays and doc URLs.
 * Used by the bare-name globals loop to emit top-level `declare namespace`
 * blocks for SSJS_GLOBALS entries with `type: 'object'` + `aliasOf`.
 */
const PLATFORM_NAMESPACE_MAP = {
    'Platform.Variable': {
        methods: PLATFORM_VARIABLE_METHODS,
        url: GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Variable'],
    },
    'Platform.Request': {
        methods: PLATFORM_REQUEST_METHODS,
        url: GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Request'],
    },
    'Platform.Recipient': {
        methods: PLATFORM_RECIPIENT_METHODS,
        url: GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Recipient'],
    },
};

/**
 * Build a JSDoc block comment for a method entry.
 * Emits: description, ssjs.guide link, \@deprecated, \@remarks (incl. caveat), \@param, \@returns, \@example.
 * Returns an empty string when there is nothing to say.
 *
 * @param {object} m - ssjs-data method entry
 * @param {string} indent - indentation string to prepend
 * @param {string|null} guideUrl - optional ssjs.guide reference URL
 * @param {string|null} mdnUrl - optional MDN reference URL
 * @returns {string} JSDoc comment string (including trailing newline) or empty string
 */
function buildJsDocComment(m, indent = ' '.repeat(4), guideUrl = null, mdnUrl = null) {
    const lines = [];

    // ── Description + guide / MDN links ───────────────────────────────────────
    if (m.description) {
        lines.push(`${indent} * ${m.description}`);
        if (guideUrl || mdnUrl) {
            lines.push(`${indent} *`);
        }
    }
    // Render available reference links on a single line, MDN first, separated by
    // " / " — matching the AMPscript hover style (e.g. `MDN / ssjs.guide reference`).
    // When only one link is present, show it alone.
    const linkParts = [];
    if (mdnUrl) {
        linkParts.push(`[MDN](${mdnUrl})`);
    }
    if (guideUrl) {
        linkParts.push(`[ssjs.guide reference](${guideUrl})`);
    }
    if (linkParts.length > 0) {
        lines.push(`${indent} * ${linkParts.join(' / ')}`);
    }
    if (m.description || guideUrl || mdnUrl) {
        lines.push(`${indent} *`);
    }

    // ── Lifecycle / Core flags ────────────────────────────────────────────────
    if (m.deprecated) {
        lines.push(`${indent} * @deprecated`);
    }
    if (m.requiresCoreLoad) {
        lines.push(`${indent} * @remarks Requires \`Platform.Load("Core", "1")\` before use.`);
    }
    // SFMC-specific caveat (e.g. an engine bug or unreliable behaviour). Emitted as
    // a @remarks line so editors surface it in hover below the description.
    if (m.caveat) {
        lines.push(`${indent} * @remarks ⚠️ ${m.caveat}`);
    }
    // Runtime-verification status: `isConfirmed` means the type/behaviour was validated
    // with a live CloudPage test; `differsFromOfficialDocs` flags a validated contradiction
    // of the official Salesforce docs (explained by `officialDocsNote`).
    if (m.isConfirmed) {
        lines.push(`${indent} * @remarks ✅ Runtime-verified in a live SFMC test.`);
    }
    if (m.differsFromOfficialDocs) {
        const note = m.officialDocsNote ? ` ${m.officialDocsNote}` : '';
        lines.push(`${indent} * @remarks ⚠️ Differs from the official Salesforce docs.${note}`);
    }

    // ── @param ────────────────────────────────────────────────────────────────
    const params = m.params ?? [];
    for (const p of params) {
        const descPart = p.description ? ` - ${p.description}` : '';
        lines.push(`${indent} * @param ${p.name}${descPart}`);
    }

    // ── @returns ──────────────────────────────────────────────────────────────
    if (m.returnDescription) {
        lines.push(`${indent} * @returns ${m.returnDescription}`);
    }

    // ── @example ─────────────────────────────────────────────────────────────
    if (m.example) {
        lines.push(`${indent} * @example`);
        for (const exLine of m.example.split('\n')) {
            lines.push(exLine ? `${indent} * ${exLine}` : `${indent} *`);
        }
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
 * @param {string|null} guideUrl - optional ssjs.guide reference URL
 * @returns {string} TypeScript declaration line(s)
 */
function emitNsMember(m, indent = ' '.repeat(4), guideUrl = null) {
    const comment = buildJsDocComment(m, indent, guideUrl);
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
 * @param {string|null} guideUrl - optional ssjs.guide reference URL
 * @param {string|null} mdnUrl - optional MDN reference URL
 * @returns {string} TypeScript declaration line(s)
 */
function emitIfaceMember(m, indent = ' '.repeat(4), guideUrl = null, mdnUrl = null) {
    const comment = buildJsDocComment(m, indent, guideUrl, mdnUrl);
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
        paramStr = buildParamStr(
            allParams,
            ecmaBuiltinMinArgs(m),
            restType === 'any' ? 'any' : restType,
        );
    } else {
        paramStr = buildParamStr(m.params, ecmaBuiltinMinArgs(m));
    }
    return `${comment}${indent}${m.name}(${paramStr}): ${retType};`;
}

/**
 * Emit a block of interface/class members.
 *
 * @param {Array} methods - array of ssjs-data method entries
 * @param {string} indent - indentation string to prepend to each member
 * @param {string|null} guideUrl - optional ssjs.guide reference URL forwarded to each member
 * @returns {string} Newline-joined TypeScript declaration lines
 */
function emitIfaceBlock(methods, indent = ' '.repeat(4), guideUrl = null) {
    return methods.map((m) => emitIfaceMember(m, indent, guideUrl)).join('\n');
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
function emitArrayMember(m, indent = ' '.repeat(4)) {
    if (isPropertyEntry(m)) {
        return `${indent}readonly ${m.name}: number;`;
    }
    const retType = Object.hasOwn(ARRAY_T_RETURNS, m.name)
        ? ARRAY_T_RETURNS[m.name]
        : toTsType(m.returnType);
    if (!m.params || m.params.length === 0) {
        return `${indent}${m.name}(): ${retType};`;
    }
    const isUseT = ARRAY_T_ELEMENT_METHODS.has(m.name);
    let paramStr;
    if (isVariadicMethod(m)) {
        // Last param becomes rest
        const lead = buildParamStr(m.params.slice(0, -1), ecmaBuiltinMinArgs(m));
        const last = m.params.at(-1);
        const restElem = isUseT ? 'T' : toTsType(last.type);
        const rest = `...${last.name}s: ${restElem}[]`;
        paramStr = lead ? `${lead}, ${rest}` : rest;
    } else {
        const adjusted = m.params.map((p) => {
            if (isUseT && (p.type === 'any' || p.type === 'array')) {
                return { ...p, type: 'T_PLACEHOLDER' };
            }
            return p;
        });
        paramStr = buildParamStr(adjusted, ecmaBuiltinMinArgs(m)).replaceAll('T_PLACEHOLDER', 'T');
    }
    // splice has 3 declared params but item should be rest
    if (m.name === 'splice') {
        // Rebuild: start: number, deleteCount?: number, ...items: T[]
        paramStr = 'start: number, deleteCount?: number, ...items: T[]';
    }
    return `${indent}${m.name}(${paramStr}): ${retType};`;
}

// ── Constructible built-ins helpers ──────────────────────────────────────────

/**
 * Build a parameter list from explicit `{ name, type, optional }` entries.
 * Unlike buildParamStr, optionality is taken solely from each param's `optional`
 * flag (no minArgs inference). An optional trailing `rest` type appends `...args`.
 *
 * @param {{name: string, type: string, optional?: boolean}[]} params - parameter entries
 * @param {string|null} restType - element type for a trailing rest parameter, or null
 * @returns {string} Comma-separated TypeScript parameter declarations
 */
function buildExplicitParamStr(params, restType = null) {
    const parts = (params ?? []).map(
        (p) => `${p.name}${p.optional ? '?' : ''}: ${toTsType(p.type)}`,
    );
    if (restType) {
        parts.push(`...args: ${toTsType(restType)}[]`);
    }
    return parts.join(', ');
}

/**
 * Resolve a constructible-built-in type reference. `$iface` resolves to the
 * entry's interface name (e.g. `Error`, `Array<T>` → element form), everything
 * else is passed through unchanged.
 *
 * @param {string} ref - a type reference, possibly the sentinel `$iface`
 * @param {string} ifaceType - the resolved interface type for this entry
 * @returns {string} The concrete TypeScript type string
 */
function resolveBuiltinRef(ref, ifaceType) {
    return ref === '$iface' ? ifaceType : ref;
}

/**
 * Emit the constructor interface + value declaration for one constructible
 * built-in. Instance members live in the matching `interface <name>` emitted by
 * the ECMASCRIPT_BUILTINS block (or, for Error, in `extraInstanceMembers`).
 *
 * @param {object} c - a CONSTRUCTIBLE_BUILTINS entry
 * @param {object[]} [extraStatics] - additional static members (from ECMASCRIPT_BUILTINS
 * owner groups such as `Date` or `Object`) emitted onto the constructor interface so
 * they do not require a conflicting `declare namespace` that would break `new X()`.
 * @returns {void}
 */
function emitConstructibleBuiltin(c, extraStatics = []) {
    // The instance/interface type referenced by `new` (e.g. `Error`, `any[]`).
    // For generic Array we reference the non-generic instance via `any[]`.
    const ifaceType = c.interfaceName ? c.interfaceName.replace(/<.*>$/, '') : c.name;
    const protoType = resolveBuiltinRef(c.prototype, ifaceType);
    const ctorName = `${c.name}Constructor`;

    line(`interface ${ctorName} {`);
    if (c.construct) {
        const p = buildExplicitParamStr(c.construct.params, c.construct.rest);
        line(`    new (${p}): ${resolveBuiltinRef(c.construct.returns, ifaceType)};`);
    }
    if (c.call) {
        const p = buildExplicitParamStr(c.call.params, c.call.rest);
        line(`    (${p}): ${resolveBuiltinRef(c.call.returns, ifaceType)};`);
    }
    const statics = c.statics ?? [];
    for (const s of statics) {
        const p = buildExplicitParamStr(s.params, s.rest);
        line(`    ${s.name}(${p}): ${resolveBuiltinRef(s.returns, ifaceType)};`);
    }
    // ECMASCRIPT_BUILTINS statics (e.g. Date.UTC, Object.defineProperty) live on the
    // constructor interface — not a separate namespace — so `new Date()` keeps its
    // construct signature.
    const cGuidePath = ECMASCRIPT_URLS[c.name];
    const staticGuideUrl = cGuidePath ? GUIDE_BASE_URL + cGuidePath : null;
    for (const m of extraStatics) {
        const comment = buildJsDocComment(
            m,
            ' '.repeat(4),
            staticGuideUrl,
            mdnBuiltinUrl(c.name, m.name),
        );
        const paramStr = buildParamStr(m.params, ecmaBuiltinMinArgs(m));
        line(`${comment}    ${m.name}(${paramStr}): ${toTsType(m.returnType)};`);
    }
    // The Number constructor exposes ES numeric constants in the SFMC engine.
    // These are referenced by the shipped Math.max/Math.min polyfills, so declare
    // them to avoid spurious ts2339 "Property does not exist on NumberConstructor".
    if (c.name === 'Number') {
        line('    readonly MAX_VALUE: number;');
        line('    readonly MIN_VALUE: number;');
        line('    readonly NaN: number;');
        line('    readonly NEGATIVE_INFINITY: number;');
        line('    readonly POSITIVE_INFINITY: number;');
    }
    line(`    readonly prototype: ${protoType};`);
    line('}');
    line(`declare var ${c.name}: ${ctorName};`);
    line('');
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

// ── Runtime built-in objects (noLib:true replacements for lib.es5.d.ts) ────────
// Under noLib:true there is no lib.es5.d.ts, so the `arguments` object every
// non-arrow function exposes has no type. Declare a minimal IArguments interface
// and ambient `arguments` so `arguments.length` / `arguments[i]` type-check in
// SSJS bodies (SFMC's engine is ES3-era but does expose `arguments`).
line('// ── Runtime built-ins ────────────────────────────────────────────────────────');
line('interface IArguments {');
line('    [index: number]: any;');
line('    length: number;');
line('    callee: Function;');
line('}');
line('declare var arguments: IArguments;');
line('');
// Under noLib:true there is no lib.es5.d.ts, so the ES1 numeric globals `NaN`
// and `Infinity` are undeclared. The SFMC engine exposes both, and the shipped
// Math.max/Math.min polyfills reference `NaN`, so declare them here to avoid
// spurious "Cannot find name" (ts2304) diagnostics.
line('declare const NaN: number;');
line('declare const Infinity: number;');
line('');

// ── Platform namespace ────────────────────────────────────────────────────────
line('// ── Platform ────────────────────────────────────────────────────────────────');
line('declare namespace Platform {');
// Platform.Load (and any other PLATFORM_METHODS)
for (const m of PLATFORM_METHODS) {
    line(emitNsMember(m, ' '.repeat(4), GUIDE_BASE_URL + PLATFORM_OBJECT_URLS.Platform));
}
// Platform.Function
line(
    `${buildJsDocComment({ description: 'SFMC Platform function API.' }, ' '.repeat(4), GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Function'])}    namespace Function {`,
);
for (const m of PLATFORM_FUNCTIONS) {
    const lower = m.name.toLowerCase();
    const fnUrl =
        GUIDE_BASE_URL +
        (PLATFORM_FUNCTION_GLOBAL_ALIAS.has(lower)
            ? globalFunctionUrl(m.name)
            : platformFunctionUrl(m.name));
    line(emitNsMember(m, ' '.repeat(8), fnUrl));
}
line('    }');
// Platform.Variable
line(
    `${buildJsDocComment({ description: 'SSJS variable declaration and retrieval methods.' }, ' '.repeat(4), GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Variable'])}    namespace Variable {`,
);
for (const m of PLATFORM_VARIABLE_METHODS) {
    line(
        emitNsMember(m, ' '.repeat(8), GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Variable']),
    );
}
line('    }');
// Platform.Response
line(
    `${buildJsDocComment({ description: 'HTTP response manipulation methods.' }, ' '.repeat(4), GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Response'])}    namespace Response {`,
);
for (const m of PLATFORM_RESPONSE_METHODS) {
    if (isPropertyEntry(m)) {
        // Response properties are mutable (get/set) — no JSDoc here; just the TS declaration
        line(`        var ${m.name}: ${toTsType(m.returnType)};`);
    } else {
        line(
            emitNsMember(
                m,
                ' '.repeat(8),
                GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Response'],
            ),
        );
    }
}
line('    }');
// Platform.Request
line(
    `${buildJsDocComment({ description: 'HTTP request reading methods and properties.' }, ' '.repeat(4), GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Request'])}    namespace Request {`,
);
for (const m of PLATFORM_REQUEST_METHODS) {
    if (isPropertyEntry(m)) {
        // Request properties are read-only — no JSDoc here; just the TS declaration
        line(`        const ${m.name}: ${toTsType(m.returnType)};`);
    } else {
        line(
            emitNsMember(
                m,
                ' '.repeat(8),
                GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Request'],
            ),
        );
    }
}
line('    }');
// Platform.Recipient
line(
    `${buildJsDocComment({ description: 'Methods to access subscriber and recipient data.' }, ' '.repeat(4), GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Recipient'])}    namespace Recipient {`,
);
for (const m of PLATFORM_RECIPIENT_METHODS) {
    line(
        emitNsMember(m, ' '.repeat(8), GUIDE_BASE_URL + PLATFORM_OBJECT_URLS['Platform.Recipient']),
    );
}
line('    }');
line('}');
line('');

// ── Bare-name globals ─────────────────────────────────────────────────────────
// Names handled by the constructible-built-ins block (emitted as `declare var X:
// XConstructor` later) must NOT also be emitted here as `declare function`.
const CONSTRUCTIBLE_NAMES = new Set(CONSTRUCTIBLE_BUILTINS.map((c) => c.name));
line('// ── Bare-name globals ────────────────────────────────────────────────────────');
for (const g of SSJS_GLOBALS) {
    if (CONSTRUCTIBLE_NAMES.has(g.name)) {
        continue;
    }
    // notDefinedAtRuntime: officially documented but proven not to exist in the engine.
    // Do NOT emit a declaration so editors never offer it as a real global.
    if (g.notDefinedAtRuntime) {
        continue;
    }
    // Namespace object (e.g. Variable alias of Platform.Variable, or Request which
    // reuses Platform.Request's members via namespaceMethodsOf) — emit declare namespace
    if (g.type === 'object' && (g.aliasOf || g.namespaceMethodsOf)) {
        const ns = PLATFORM_NAMESPACE_MAP[g.aliasOf ?? g.namespaceMethodsOf];
        if (ns) {
            // When the bare-name global has its own dedicated page (see globalFunctionUrl),
            // link members to that page instead of the shared Platform.* namespace page.
            const gn = g.name.toLowerCase();
            const memberUrl = GLOBAL_FUNCTION_PAGES.has(gn)
                ? GUIDE_BASE_URL + globalFunctionUrl(gn)
                : ns.url;
            line(`declare namespace ${g.name} {`);
            for (const m of ns.methods) {
                line(emitNsMember(m, ' '.repeat(4), memberUrl));
            }
            line('}');
            line('');
        }
        continue;
    }

    // Full function definition without aliasOf — emit directly from this entry's own params/types
    if (!g.aliasOf) {
        if (!g.params) {
            continue; // skip non-function entries without params
        }
        const gn = g.name.toLowerCase();
        const globalGuideUrl = GLOBAL_FUNCTION_PAGES.has(gn)
            ? GUIDE_BASE_URL + globalFunctionUrl(gn)
            : null;
        const comment = buildJsDocComment(g, '', globalGuideUrl);
        const retType = toTsType(g.returnType);
        const paramStr = buildParamStr(g.params, g.minArgs ?? 0);
        if (comment) {
            line(comment.trimEnd());
        }
        line(`declare function ${g.name}(${paramStr}): ${retType};`);
        continue;
    }

    // aliasOf: resolve the source Platform.Function entry and inherit its signature
    // Dotted-name aliases (e.g. DateTime.SystemDateToLocalDate) are emitted via their
    // CORE_CLASS_MAP namespace block — skip here to avoid invalid dotted declare function.
    if (g.name.includes('.')) {
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
    const gn = g.name.toLowerCase();
    let globalGuideUrl;
    if (GLOBAL_FUNCTION_PAGES.has(gn)) {
        globalGuideUrl = GUIDE_BASE_URL + globalFunctionUrl(gn);
    } else {
        // Fall back to the canonical Platform namespace URL derived from aliasOf
        const [, ns, fnName] = (g.aliasOf ?? '').split('.');
        if (ns === 'Function') {
            globalGuideUrl = GUIDE_BASE_URL + platformFunctionUrl(fnName);
        } else if (ns === 'Response') {
            globalGuideUrl = `${GUIDE_BASE_URL}/platform-response/${fnName.toLowerCase()}/`;
        } else {
            globalGuideUrl = null;
        }
    }
    const comment = buildJsDocComment(effective, '', globalGuideUrl);
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
line('interface DataExtensionFields {');
line(
    emitIfaceBlock(
        DATA_EXTENSION_FIELDS_METHODS,
        ' '.repeat(4),
        GUIDE_BASE_URL + CORE_LIBRARY_URLS['DataExtension.Fields'],
    ),
);
line('}');
line('interface DataExtensionRows {');
line(
    emitIfaceBlock(
        DATA_EXTENSION_ROWS_METHODS,
        ' '.repeat(4),
        GUIDE_BASE_URL + CORE_LIBRARY_URLS['DataExtension.Rows'],
    ),
);
line('}');
line('interface DataExtensionInstance {');
line('    Fields: DataExtensionFields;');
line('    Rows: DataExtensionRows;');
line('}');
line('');

// ── Core Library namespaces ───────────────────────────────────────────────────
// Each entry: [TypeScript namespace name, ssjs-data methods array, ssjs.guide URL]
const g = (map, key) => GUIDE_BASE_URL + map[key];
const CORE_CLASS_MAP = [
    ['Account', ACCOUNT_METHODS, g(CORE_LIBRARY_URLS, 'Account')],
    ['Account.Tracking', ACCOUNT_TRACKING_METHODS, g(CORE_LIBRARY_URLS, 'Account.Tracking')],
    ['AccountUser', ACCOUNT_USER_METHODS, g(CORE_LIBRARY_URLS, 'AccountUser')],
    ['Portfolio', PORTFOLIO_METHODS, g(CORE_LIBRARY_URLS, 'Portfolio')],
    ['ContentAreaObj', CONTENT_AREA_OBJ_METHODS, g(CORE_LIBRARY_URLS, 'ContentAreaObj')],
    ['Folder', FOLDER_METHODS, g(CORE_LIBRARY_URLS, 'Folder')],
    ['Template', TEMPLATE_METHODS, g(CORE_LIBRARY_URLS, 'Template')],
    ['DeliveryProfile', DELIVERY_PROFILE_METHODS, g(CORE_LIBRARY_URLS, 'DeliveryProfile')],
    ['SenderProfile', SENDER_PROFILE_METHODS, g(CORE_LIBRARY_URLS, 'SenderProfile')],
    ['SendClassification', SEND_CLASSIFICATION_METHODS, g(CORE_LIBRARY_URLS, 'SendClassification')],
    ['FilterDefinition', FILTER_DEFINITION_METHODS, g(CORE_LIBRARY_URLS, 'FilterDefinition')],
    ['QueryDefinition', QUERY_DEFINITION_METHODS, g(CORE_LIBRARY_URLS, 'QueryDefinition')],
    ['List', LIST_METHODS, g(CORE_LIBRARY_URLS, 'List')],
    ['List.Subscribers', LIST_SUBSCRIBERS_METHODS, g(CORE_LIBRARY_URLS, 'List.Subscribers')],
    [
        'List.Subscribers.Tracking',
        LIST_SUBSCRIBERS_TRACKING_METHODS,
        g(CORE_LIBRARY_URLS, 'List.Subscribers.Tracking'),
    ],
    ['Subscriber', SUBSCRIBER_METHODS, g(CORE_LIBRARY_URLS, 'Subscriber')],
    [
        'Subscriber.Attributes',
        SUBSCRIBER_ATTRIBUTES_METHODS,
        g(CORE_LIBRARY_URLS, 'Subscriber.Attributes'),
    ],
    ['Subscriber.Lists', SUBSCRIBER_LISTS_METHODS, g(CORE_LIBRARY_URLS, 'Subscriber.Lists')],
    ['Email', EMAIL_METHODS, g(CORE_LIBRARY_URLS, 'Email')],
    ['Send', SEND_METHODS, g(CORE_LIBRARY_URLS, 'Send')],
    ['Send.Tracking', SEND_TRACKING_METHODS, g(CORE_LIBRARY_URLS, 'Send.Tracking')],
    ['Send.Definition', SEND_DEFINITION_METHODS, g(CORE_LIBRARY_URLS, 'Send.Definition')],
    ['TriggeredSend', TRIGGERED_SEND_METHODS, g(CORE_LIBRARY_URLS, 'TriggeredSend')],
    [
        'TriggeredSend.Tracking',
        TRIGGERED_SEND_TRACKING_METHODS,
        g(CORE_LIBRARY_URLS, 'TriggeredSend.Tracking'),
    ],
    [
        'TriggeredSend.Tracking.Clicks',
        TRIGGERED_SEND_TRACKING_CLICKS_METHODS,
        g(CORE_LIBRARY_URLS, 'TriggeredSend.Tracking.Clicks'),
    ],
    [
        'TriggeredSend.Tracking.TotalByInterval',
        TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS,
        g(CORE_LIBRARY_URLS, 'TriggeredSend.Tracking.TotalByInterval'),
    ],
    ['DataExtension', DATA_EXTENSION_METHODS, g(CORE_LIBRARY_URLS, 'DataExtension')],
    [
        'DataExtension.Fields',
        DATA_EXTENSION_FIELDS_METHODS,
        g(CORE_LIBRARY_URLS, 'DataExtension.Fields'),
    ],
    ['DataExtension.Rows', DATA_EXTENSION_ROWS_METHODS, g(CORE_LIBRARY_URLS, 'DataExtension.Rows')],
    ['DateTime', DATE_TIME_METHODS, g(PLATFORM_OBJECT_URLS, 'DateTime')],
    ['DateTime.TimeZone', DATE_TIME_TIMEZONE_METHODS, g(PLATFORM_OBJECT_URLS, 'DateTime.TimeZone')],
];

// ── Core Library sub-namespace instance interfaces ────────────────────────────
// Emitted leaf-first so child types are declared before the parent interfaces that
// reference them (e.g. ListSubscribersTrackingInstance before ListSubscribersInstance).
line('// ── Core Library sub-namespace instance interfaces ───────────────────────────');
const SUB_NS_IFACE_DEFS = [
    // Leaf-level (no children)
    [
        'ListSubscribersTrackingInstance',
        LIST_SUBSCRIBERS_TRACKING_METHODS,
        g(CORE_LIBRARY_URLS, 'List.Subscribers.Tracking'),
        [],
    ],
    [
        'ListSubscribersInstance',
        LIST_SUBSCRIBERS_METHODS,
        g(CORE_LIBRARY_URLS, 'List.Subscribers'),
        [{ prop: 'Tracking', type: 'ListSubscribersTrackingInstance' }],
    ],
    [
        'SubscriberAttributesInstance',
        SUBSCRIBER_ATTRIBUTES_METHODS,
        g(CORE_LIBRARY_URLS, 'Subscriber.Attributes'),
        [],
    ],
    [
        'SubscriberListsInstance',
        SUBSCRIBER_LISTS_METHODS,
        g(CORE_LIBRARY_URLS, 'Subscriber.Lists'),
        [],
    ],
    ['SendTrackingInstance', SEND_TRACKING_METHODS, g(CORE_LIBRARY_URLS, 'Send.Tracking'), []],
    [
        'TriggeredSendTrackingClicksInstance',
        TRIGGERED_SEND_TRACKING_CLICKS_METHODS,
        g(CORE_LIBRARY_URLS, 'TriggeredSend.Tracking.Clicks'),
        [],
    ],
    [
        'TriggeredSendTrackingTotalByIntervalInstance',
        TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS,
        g(CORE_LIBRARY_URLS, 'TriggeredSend.Tracking.TotalByInterval'),
        [],
    ],
    // Parent-level (reference the leaf interfaces above)
    [
        'TriggeredSendTrackingInstance',
        TRIGGERED_SEND_TRACKING_METHODS,
        g(CORE_LIBRARY_URLS, 'TriggeredSend.Tracking'),
        [
            { prop: 'Clicks', type: 'TriggeredSendTrackingClicksInstance' },
            { prop: 'TotalByInterval', type: 'TriggeredSendTrackingTotalByIntervalInstance' },
        ],
    ],
];

/** Sub-namespace properties to inject into top-level instance interfaces. */
const INSTANCE_SUB_NAMESPACES = {
    List: [{ prop: 'Subscribers', type: 'ListSubscribersInstance' }],
    Subscriber: [
        { prop: 'Attributes', type: 'SubscriberAttributesInstance' },
        { prop: 'Lists', type: 'SubscriberListsInstance' },
    ],
    Send: [{ prop: 'Tracking', type: 'SendTrackingInstance' }],
    TriggeredSend: [{ prop: 'Tracking', type: 'TriggeredSendTrackingInstance' }],
};

for (const [ifaceName, methods, guideUrl, subProps] of SUB_NS_IFACE_DEFS) {
    const instanceMethods = (methods ?? []).filter((m) => m.isStatic === false);
    if (instanceMethods.length === 0 && subProps.length === 0) {
        continue;
    }
    line(`interface ${ifaceName} {`);
    for (const m of instanceMethods) {
        line(emitIfaceMember(m, ' '.repeat(4), guideUrl));
    }
    for (const { prop, type } of subProps) {
        line(`    readonly ${prop}: ${type};`);
    }
    line('}');
}
line('');

line('// ── Core Library namespaces ──────────────────────────────────────────────────');
for (const [nsName, methods, guideUrl] of CORE_CLASS_MAP) {
    if (!methods || methods.length === 0) {
        continue;
    }
    const staticMethods = methods.filter((m) => m.isStatic !== false);
    const instanceMethods = methods.filter((m) => m.isStatic === false);
    // Emit namespace block containing only static methods.
    // isStatic:false methods must NOT appear here — they are only callable on an
    // instance returned by Init(), not directly on the class namespace.
    if (staticMethods.length > 0) {
        line(`declare namespace ${nsName} {`);
        for (const m of staticMethods) {
            line(emitNsMember(m, ' '.repeat(4), guideUrl));
        }
        line('}');
    }
    // Emit a matching instance interface for top-level classes (no dot in name).
    // Dotted sub-namespace paths (e.g. DataExtension.Fields, List.Subscribers) are
    // accessed via their parent class instance; their instance interfaces are declared
    // in the SUB_NS_IFACE_DEFS block above and injected as typed properties below.
    // DataExtensionInstance is already emitted explicitly above — skip it here.
    if (!nsName.includes('.') && nsName !== 'DataExtension') {
        const subProps = INSTANCE_SUB_NAMESPACES[nsName] ?? [];
        if (instanceMethods.length > 0 || subProps.length > 0) {
            line(`interface ${nsName}Instance {`);
            for (const m of instanceMethods) {
                line(emitIfaceMember(m, ' '.repeat(4), guideUrl));
            }
            for (const { prop, type } of subProps) {
                line(`    readonly ${prop}: ${type};`);
            }
            line('}');
        }
    }
}
line('');

// ── Standalone Core Library globals ───────────────────────────────────────────
line('// ── Standalone Core Library globals ──────────────────────────────────────────');
line('declare namespace Attribute {');
for (const m of ATTRIBUTE_METHODS) {
    line(emitNsMember(m, ' '.repeat(4), GUIDE_BASE_URL + GUIDE_URLS.attribute));
}
line('}');
line('');

line('declare namespace ErrorUtil {');
for (const m of ERROR_UTIL_METHODS) {
    line(emitNsMember(m, ' '.repeat(4), GUIDE_BASE_URL + PLATFORM_OBJECT_URLS.ErrorUtil));
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
    line(emitNsMember(m, ' '.repeat(4), GUIDE_BASE_URL + httpMethodUrl(m.name)));
}
line('}');
line('');

line('declare namespace HTTPHeader {');
for (const m of HTTPHEADER_METHODS) {
    line(emitNsMember(m, ' '.repeat(4), GUIDE_BASE_URL + PLATFORM_OBJECT_URLS.HTTPHeader));
}
line('}');
line('');

// ── Script.Util namespace (WSProxy, HttpRequest, HttpGet) ─────────────────────
line('// ── Script.Util ──────────────────────────────────────────────────────────────');
line('declare namespace Script {');
line('    namespace Util {');
for (const ctor of SCRIPT_UTIL_CONSTRUCTORS) {
    const ctorParamStr = buildParamStr(ctor.params, ctor.minArgs ?? 0);
    let ctorGuidePath;
    if (ctor.name === 'WSProxy') {
        ctorGuidePath = GUIDE_URLS.wsproxy;
    } else if (ctor.name === 'HttpRequest') {
        ctorGuidePath = GUIDE_URLS.scriptUtilHttpRequest;
    } else {
        ctorGuidePath = GUIDE_URLS.scriptUtilHttpGet;
    }
    const ctorGuideUrl = GUIDE_BASE_URL + ctorGuidePath;
    line(`${buildJsDocComment(ctor, ' '.repeat(8), ctorGuideUrl)}        class ${ctor.name} {`);
    line(
        `${buildJsDocComment(ctor, ' '.repeat(12), ctorGuideUrl)}            constructor(${ctorParamStr});`,
    );
    // Instance methods: WSProxy gets WSPROXY_METHODS; Http* gets SCRIPT_UTIL_REQUEST_METHODS
    if (ctor.name === 'WSProxy') {
        for (const m of WSPROXY_METHODS) {
            line(emitIfaceMember(m, ' '.repeat(12), GUIDE_BASE_URL + wsproxyMethodUrl(m.name)));
        }
    } else {
        // HttpRequest and HttpGet share the same request instance methods
        for (const m of SCRIPT_UTIL_REQUEST_METHODS) {
            line(emitIfaceMember(m, ' '.repeat(12), GUIDE_BASE_URL + httpRequestMethodUrl(m.name)));
        }
        // Writable instance properties differ between HttpRequest and HttpGet
        const props =
            ctor.name === 'HttpGet'
                ? SCRIPT_UTIL_HTTPGET_PROPERTIES
                : SCRIPT_UTIL_REQUEST_PROPERTIES;
        for (const p of props) {
            line(
                `${buildJsDocComment(p, ' '.repeat(12))}            ${p.name}: ${toTsType(p.type)};`,
            );
        }
    }
    line('        }');
}
line('    }');
line('}');
line('');

// ── Script.Util HTTP response instance (returned by <request>.send()) ─────────
line('// ── Script.Util HTTP response instance ──────────────────────────────────────');
line('interface HttpResponseInstance {');
for (const p of SCRIPT_UTIL_RESPONSE_PROPERTIES) {
    line(`${buildJsDocComment(p, ' '.repeat(4))}    readonly ${p.name}: ${toTsType(p.type)};`);
}
line('}');
line('');

// ── WSProxy result object (returned by createItem/retrieve/execute/…) ─────────
line('// ── WSProxy result object ───────────────────────────────────────────────────');
line('interface WSProxyResult {');
for (const p of WSPROXY_RESULT_PROPERTIES) {
    line(`    /** ${p.description} */`);
    line(`    readonly ${p.name}${p.optional ? '?' : ''}: ${toTsType(p.type)};`);
}
line('}');
line('');

// ── ECMAScript built-ins (SFMC-supported subset) ──────────────────────────────
line('// ── ECMAScript built-ins (SFMC-supported subset only) ───────────────────────');

/**
 * Statics for constructible owners (Date, Object) captured from ECMASCRIPT_BUILTINS,
 * emitted onto the `*Constructor` interface instead of a conflicting `declare namespace`.
 *
 * @type {Map<string, object[]>}
 */
const constructibleStatics = new Map();
{
    /**
     * Resolve the ssjs.guide reference URL for an ECMAScript built-in member.
     *
     * @param {string} owner - the member's `owner` (e.g. 'Array.prototype', 'Math', 'Global')
     * @returns {string|null} fully-qualified ssjs.guide URL, or null when unmapped
     */
    const ecmaGuideUrl = (owner) => {
        const path = ECMASCRIPT_URLS[owner];
        return path ? GUIDE_BASE_URL + path : null;
    };

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
    const arrayGuideUrl = ecmaGuideUrl('Array.prototype');
    line('interface Array<T> {');
    for (const m of arrayMembers) {
        const comment = buildJsDocComment(
            m,
            ' '.repeat(4),
            arrayGuideUrl,
            mdnBuiltinUrl('Array.prototype', m.name),
        );
        line(`${comment}${emitArrayMember(m)}`);
    }
    line('}');
    line('');

    // String.prototype → interface String
    const stringMembers = byOwner.get('String.prototype') ?? [];
    const stringGuideUrl = ecmaGuideUrl('String.prototype');
    line('interface String {');
    for (const m of stringMembers) {
        const comment = buildJsDocComment(
            m,
            ' '.repeat(4),
            stringGuideUrl,
            mdnBuiltinUrl('String.prototype', m.name),
        );
        if (isPropertyEntry(m)) {
            line(`${comment}    readonly ${m.name}: number;`);
        } else {
            const retType = toTsType(m.returnType);
            let paramStr;
            if (isVariadicMethod(m) && m.params && m.params.length > 0) {
                const last = m.params.at(-1);
                const restName = last.name.endsWith('s') ? last.name : `${last.name}s`;
                paramStr = buildParamStr(
                    [...m.params.slice(0, -1), { ...last, name: restName }],
                    ecmaBuiltinMinArgs(m),
                    'string',
                );
            } else {
                paramStr = buildParamStr(m.params, ecmaBuiltinMinArgs(m));
            }
            line(`${comment}    ${m.name}(${paramStr}): ${retType};`);
        }
    }
    line('}');
    line('');

    // Number.prototype → interface Number
    const numberMembers = byOwner.get('Number.prototype') ?? [];
    if (numberMembers.length > 0) {
        const numberGuideUrl = ecmaGuideUrl('Number.prototype');
        line('interface Number {');
        for (const m of numberMembers) {
            line(
                emitIfaceMember(
                    m,
                    ' '.repeat(4),
                    numberGuideUrl,
                    mdnBuiltinUrl('Number.prototype', m.name),
                ),
            );
        }
        line('}');
        line('');
    }

    // Object.prototype → interface Object (instance members)
    const objectMembers = byOwner.get('Object.prototype') ?? [];
    if (objectMembers.length > 0) {
        const objectGuideUrl = ecmaGuideUrl('Object.prototype');
        line('interface Object {');
        for (const m of objectMembers) {
            line(
                emitIfaceMember(
                    m,
                    ' '.repeat(4),
                    objectGuideUrl,
                    mdnBuiltinUrl('Object.prototype', m.name),
                ),
            );
        }
        line('}');
        line('');
    }

    // Object statics (e.g. Object.defineProperty) are emitted onto ObjectConstructor
    // by the constructible-built-ins block below — NOT as a `declare namespace Object`,
    // which would shadow the constructor and break `new Object()`.
    constructibleStatics.set('Object', byOwner.get('Object') ?? []);

    // Date.prototype → interface Date (instance methods)
    const dateMembers = byOwner.get('Date.prototype') ?? [];
    if (dateMembers.length > 0) {
        const dateGuideUrl = ecmaGuideUrl('Date.prototype');
        line('interface Date {');
        for (const m of dateMembers) {
            line(
                emitIfaceMember(
                    m,
                    ' '.repeat(4),
                    dateGuideUrl,
                    mdnBuiltinUrl('Date.prototype', m.name),
                ),
            );
        }
        line('}');
        line('');
    }

    // Date statics (e.g. Date.UTC) are emitted onto DateConstructor by the
    // constructible-built-ins block below — NOT as a `declare namespace Date`, which
    // would shadow the constructor and break `new Date()`.
    constructibleStatics.set('Date', byOwner.get('Date') ?? []);

    // Math → declare namespace Math
    const mathMembers = byOwner.get('Math') ?? [];
    if (mathMembers.length > 0) {
        const mathGuideUrl = ecmaGuideUrl('Math');
        line('declare namespace Math {');
        for (const m of mathMembers) {
            const comment = buildJsDocComment(
                m,
                ' '.repeat(4),
                mathGuideUrl,
                mdnBuiltinUrl('Math', m.name),
            );
            if (isPropertyEntry(m)) {
                line(`${comment}    const ${m.name}: number;`);
            } else {
                const retType = toTsType(m.returnType);
                let paramStr;
                if (isVariadicMethod(m) && m.params && m.params.length > 0) {
                    const last = m.params.at(-1);
                    const restName = last.name.endsWith('s') ? last.name : `${last.name}s`;
                    paramStr = buildParamStr(
                        [...m.params.slice(0, -1), { ...last, name: restName }],
                        ecmaBuiltinMinArgs(m),
                        'number',
                    );
                } else {
                    paramStr = buildParamStr(m.params, ecmaBuiltinMinArgs(m));
                }
                line(`${comment}    function ${m.name}(${paramStr}): ${retType};`);
            }
        }
        line('}');
        line('');
    }

    // RegExp → interface RegExp (if present)
    const regexpMembers = byOwner.get('RegExp') ?? [];
    if (regexpMembers.length > 0) {
        const regexpGuideUrl = ecmaGuideUrl('RegExp');
        line('interface RegExp {');
        for (const m of regexpMembers) {
            line(
                emitIfaceMember(m, ' '.repeat(4), regexpGuideUrl, mdnBuiltinUrl('RegExp', m.name)),
            );
        }
        line('}');
        line('');
    }

    // Function.prototype → interface Function (call/apply are native; bind is not — see
    // POLYFILLABLE_METHODS for the standalone bindFn helper). Required under noLib:true so
    // that `fn.call(...)` / `fn.apply(...)` type-check.
    const functionMembers = byOwner.get('Function.prototype') ?? [];
    if (functionMembers.length > 0) {
        const functionGuideUrl = ecmaGuideUrl('Function.prototype');
        line('interface Function {');
        // Call signature so a value typed `Function` (e.g. a JSDoc
        // `@param {Function} callback`) is callable. Without it, calling such a
        // value raises ts2349 ("Type 'never' has no call signatures") — which broke
        // inserted polyfills like Array.prototype.forEach whose body invokes the
        // callback. Do NOT add a `new (...)` construct signature here: it would force
        // every value assigned to a `Function` param to be constructable, so a plain
        // function/arrow expression (`function (x) { return x; }`) would fail to match
        // and raise ts2769 ("provides no match for the signature new (...)").
        line('    (...args: any[]): any;');
        for (const m of functionMembers) {
            line(
                emitIfaceMember(
                    m,
                    ' '.repeat(4),
                    functionGuideUrl,
                    mdnBuiltinUrl('Function.prototype', m.name),
                ),
            );
        }
        line('}');
        line('');
    }

    // Global → top-level declare function
    // Names handled by the constructible-built-ins block (emitted as
    // `declare var X: XConstructor`, e.g. RegExp) must NOT also be emitted here as
    // `declare function` — that would shadow the constructor and break `new X()`.
    const globalMembers = byOwner.get('Global') ?? [];
    const emittedGlobals = globalMembers.filter((m) => !CONSTRUCTIBLE_NAMES.has(m.name));
    if (emittedGlobals.length > 0) {
        line('// Global ECMAScript functions');
        for (const m of emittedGlobals) {
            const comment = buildJsDocComment(m, '', null, mdnBuiltinUrl('Global', m.name));
            const retType = toTsType(m.returnType);
            const paramStr = buildParamStr(m.params, ecmaBuiltinMinArgs(m));
            line(`${comment}declare function ${m.name}(${paramStr}): ${retType};`);
        }
        line('');
    }

    // Emit any remaining owner groups not already handled
    const HANDLED_OWNERS = new Set([
        'Array.prototype',
        'String.prototype',
        'Number.prototype',
        'Object.prototype',
        'Object',
        'Date.prototype',
        'Date',
        'Math',
        'RegExp',
        'Function.prototype',
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

// ── Constructible built-ins (Error, String, Array, Number, Object, Date) ──────
// Emits, per entry, a `<name>Constructor` interface and a `declare var <name>`.
// This is what makes `new Error("x")`, `new Date()`, `new Array()` type-check and
// gives `<name>.prototype` a typed shape so polyfills like
// `String.prototype.startsWith = function () {}` compile under noLib:true.
// Instance method/property shapes are emitted by the ECMASCRIPT_BUILTINS block
// above (owner `<name>.prototype`); entries with `instanceMembers` (e.g. Error,
// which has no prototype owner group) get their `interface <name>` emitted here.
line('// ── Constructible built-ins (value + constructor declarations) ───────────────');
for (const c of CONSTRUCTIBLE_BUILTINS) {
    if (Array.isArray(c.instanceMembers) && c.instanceMembers.length > 0) {
        line(`interface ${c.interfaceName ?? c.name} {`);
        for (const m of c.instanceMembers) {
            line(`    ${m.name}: ${toTsType(m.type)};`);
        }
        line('}');
    }
    emitConstructibleBuiltin(c, constructibleStatics.get(c.name) ?? []);
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
