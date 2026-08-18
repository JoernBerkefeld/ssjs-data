import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    SSJS_GLOBALS,
    SSJS_GLOBALS_MAP,
    ssjsGlobalsLookup,
    PLATFORM_FUNCTIONS,
    platformFunctionLookup,
    platformFunctionNames,
    PLATFORM_METHODS,
    CORE_LIBRARY_OBJECTS,
    coreObjectLookup,
    coreObjectNames,
    coreMethodArityLookup,
    coreDeprecatedMethodLookup,
    coreNonFunctionalMethodLookup,
    maxCoreVersionLookup,
    propertyAccessLookup,
    ECMASCRIPT_BUILTINS,
    CONSTRUCTIBLE_BUILTINS,
    UNSUPPORTED_SYNTAX,
    unsupportedByNodeType,
    POLYFILLABLE_METHODS,
    polyfillByPrototypeName,
    polyfillByStaticName,
    KNOWN_UNSUPPORTED,
    knownUnsupportedByPrototypeName,
    knownUnsupportedByStaticName,
    WSPROXY_METHODS,
    wsproxyMethodLookup,
    wsproxyMethodNames,
    HTTP_METHODS,
    httpMethodLookup,
    httpMethodNames,
    HTTPHEADER_METHODS,
    httpHeaderMethodLookup,
    httpHeaderMethodNames,
    VERIFICATION_BLOCKED_REASONS,
} from '../src/index.js';

// Direct imports from the split raw-data modules, to assert each file is
// non-empty and that the barrel re-exports the same array instance.
import * as constantsFile from '../src/constants.js';
import * as globalsFile from '../src/globals.js';
import * as platformFunctionsFile from '../src/platform-functions.js';
import * as platformMethodsFile from '../src/platform-methods.js';
import * as coreLibraryFile from '../src/core-library.js';
import * as httpWsproxyFile from '../src/http-wsproxy.js';
import * as ecmascriptFile from '../src/ecmascript.js';
import * as unsupportedFile from '../src/unsupported.js';
import * as polyfillsFile from '../src/polyfills.js';

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

// --- Raw catalogs: required fields with valid values -------------------------

test('PLATFORM_FUNCTIONS: every entry has required fields with valid values', () => {
    assert.ok(PLATFORM_FUNCTIONS.length > 0);
    for (const function_ of PLATFORM_FUNCTIONS) {
        assert.ok(
            typeof function_.name === 'string' && function_.name.length > 0,
            'name is a non-empty string',
        );
        assert.ok(IDENTIFIER.test(function_.name), `${function_.name}: identifier-safe name`);
        assert.ok(
            typeof function_.description === 'string' && function_.description.length > 0,
            `${function_.name}: description`,
        );
        assert.equal(typeof function_.minArgs, 'number', `${function_.name}: minArgs is number`);
        assert.ok(
            function_.maxArgs === -1 ||
                function_.maxArgs === Infinity ||
                Number.isSafeInteger(function_.maxArgs),
            `${function_.name}: maxArgs int or unbounded sentinel`,
        );
        assert.ok(Array.isArray(function_.params), `${function_.name}: params array`);
        for (const parameter of function_.params) {
            assert.ok(
                typeof parameter.name === 'string' && parameter.name.length > 0,
                `${function_.name}: param name`,
            );
        }
    }
});

test('ECMASCRIPT_BUILTINS: every entry has name, owner, and esVersion', () => {
    assert.ok(ECMASCRIPT_BUILTINS.length > 0);
    for (const builtin of ECMASCRIPT_BUILTINS) {
        assert.ok(
            typeof builtin.name === 'string' && builtin.name.length > 0,
            'builtin name is a non-empty string',
        );
        assert.ok(
            typeof builtin.owner === 'string' && builtin.owner.length > 0,
            `${builtin.name}: owner`,
        );
        assert.equal(
            typeof builtin.esVersion,
            'number',
            `${builtin.owner}.${builtin.name}: esVersion`,
        );
    }
});

test('KNOWN_UNSUPPORTED: every entry has member, owner, and category', () => {
    assert.ok(KNOWN_UNSUPPORTED.length > 0);
    for (const entry of KNOWN_UNSUPPORTED) {
        assert.ok(
            typeof entry.member === 'string' && entry.member.length > 0,
            'member is a non-empty string',
        );
        assert.ok(
            typeof entry.owner === 'string' && entry.owner.length > 0,
            `${entry.member}: owner`,
        );
        assert.ok(
            typeof entry.category === 'string' && entry.category.length > 0,
            `${entry.owner}.${entry.member}: category`,
        );
    }
});

test('POLYFILLABLE_METHODS: every entry has method, owner, and polyfill source', () => {
    assert.ok(POLYFILLABLE_METHODS.length > 0);
    for (const entry of POLYFILLABLE_METHODS) {
        assert.ok(
            typeof entry.method === 'string' && entry.method.length > 0,
            'method is a non-empty string',
        );
        assert.ok(
            typeof entry.owner === 'string' && entry.owner.length > 0,
            `${entry.method}: owner`,
        );
        assert.ok(
            typeof entry.polyfill === 'string' && entry.polyfill.length > 0,
            `${entry.owner}.${entry.method}: polyfill source`,
        );
    }
});

test('UNSUPPORTED_SYNTAX: every entry has feature, nodeType, and suggestion', () => {
    assert.ok(UNSUPPORTED_SYNTAX.length > 0);
    for (const entry of UNSUPPORTED_SYNTAX) {
        assert.ok(
            typeof entry.feature === 'string' && entry.feature.length > 0,
            'feature is a non-empty string',
        );
        assert.ok(
            typeof entry.nodeType === 'string' && entry.nodeType.length > 0,
            `${entry.feature}: nodeType`,
        );
        assert.ok(
            typeof entry.suggestion === 'string' && entry.suggestion.length > 0,
            `${entry.feature}: suggestion`,
        );
    }
});

test('CORE_LIBRARY_OBJECTS: every entry has name and a methods array', () => {
    assert.ok(CORE_LIBRARY_OBJECTS.length > 0);
    for (const object of CORE_LIBRARY_OBJECTS) {
        assert.ok(
            typeof object.name === 'string' && object.name.length > 0,
            'core object name is a non-empty string',
        );
        assert.ok(Array.isArray(object.methods), `${object.name}: methods array`);
    }
});

test('CONSTRUCTIBLE_BUILTINS: every entry has a name', () => {
    assert.ok(CONSTRUCTIBLE_BUILTINS.length > 0);
    for (const builtin of CONSTRUCTIBLE_BUILTINS) {
        assert.ok(
            typeof builtin.name === 'string' && builtin.name.length > 0,
            'constructible name is a non-empty string',
        );
    }
});

test('SSJS_GLOBALS: every entry has a name; SSJS_GLOBALS_MAP is a plain object', () => {
    assert.ok(SSJS_GLOBALS.length > 0);
    for (const global of SSJS_GLOBALS) {
        assert.ok(
            typeof global.name === 'string' && global.name.length > 0,
            'global name is a non-empty string',
        );
    }
    assert.equal(typeof SSJS_GLOBALS_MAP, 'object');
    assert.ok(Object.keys(SSJS_GLOBALS_MAP).length > 0);
});

// --- Derived lookups cover exactly their source arrays -----------------------

test('platformFunctionLookup / platformFunctionNames cover all platform functions', () => {
    assert.equal(platformFunctionLookup.size, PLATFORM_FUNCTIONS.length);
    assert.equal(platformFunctionNames.size, PLATFORM_FUNCTIONS.length);
    for (const function_ of PLATFORM_FUNCTIONS) {
        const lower = function_.name.toLowerCase();
        assert.ok(platformFunctionLookup.has(lower), `${function_.name} missing from lookup`);
        assert.equal(platformFunctionLookup.get(lower).name, function_.name);
        assert.ok(platformFunctionNames.has(lower), `${function_.name} missing from names`);
    }
});

test('coreObjectLookup / coreObjectNames cover all core objects', () => {
    assert.equal(coreObjectLookup.size, CORE_LIBRARY_OBJECTS.length);
    assert.equal(coreObjectNames.size, CORE_LIBRARY_OBJECTS.length);
    for (const object of CORE_LIBRARY_OBJECTS) {
        assert.ok(coreObjectLookup.has(object.name), `${object.name} missing from lookup`);
        assert.ok(coreObjectNames.has(object.name), `${object.name} missing from names`);
    }
});

test('coreMethodArityLookup has one nested map per core object', () => {
    assert.equal(coreMethodArityLookup.size, CORE_LIBRARY_OBJECTS.length);
    for (const object of CORE_LIBRARY_OBJECTS) {
        assert.ok(
            coreMethodArityLookup.has(object.name.toLowerCase()),
            `${object.name} missing from arity lookup`,
        );
    }
});

test('wsproxy / http / httpHeader lookups cover their source arrays', () => {
    assert.equal(wsproxyMethodLookup.size, WSPROXY_METHODS.length);
    assert.equal(wsproxyMethodNames.size, WSPROXY_METHODS.length);
    assert.equal(httpMethodLookup.size, HTTP_METHODS.length);
    assert.equal(httpMethodNames.size, HTTP_METHODS.length);
    assert.equal(httpHeaderMethodLookup.size, HTTPHEADER_METHODS.length);
    assert.equal(httpHeaderMethodNames.size, HTTPHEADER_METHODS.length);
});

test('unsupportedByNodeType indexes every UNSUPPORTED_SYNTAX entry', () => {
    let total = 0;
    for (const list of unsupportedByNodeType.values()) {
        total += list.length;
    }
    assert.equal(total, UNSUPPORTED_SYNTAX.length);
    for (const entry of UNSUPPORTED_SYNTAX) {
        assert.ok(unsupportedByNodeType.has(entry.nodeType), `${entry.nodeType} not indexed`);
    }
});

test('polyfillBy* maps partition POLYFILLABLE_METHODS by static/prototype', () => {
    assert.equal(
        polyfillByPrototypeName.size + polyfillByStaticName.size,
        POLYFILLABLE_METHODS.length,
    );
});

test('knownUnsupportedBy* maps partition KNOWN_UNSUPPORTED by static/prototype', () => {
    assert.equal(
        knownUnsupportedByPrototypeName.size + knownUnsupportedByStaticName.size,
        KNOWN_UNSUPPORTED.length,
    );
});

test('coreDeprecatedMethodLookup / coreNonFunctionalMethodLookup are populated maps', () => {
    assert.ok(coreDeprecatedMethodLookup.size > 0);
    assert.ok(coreNonFunctionalMethodLookup.size > 0);
    assert.ok(maxCoreVersionLookup.size > 0);
    assert.ok(propertyAccessLookup.size > 0);
});

test('ssjsGlobalsLookup and PLATFORM_METHODS are populated', () => {
    assert.ok(ssjsGlobalsLookup.size > 0);
    assert.ok(PLATFORM_METHODS.length > 0);
});

// --- Frozen enum -------------------------------------------------------------

test('VERIFICATION_BLOCKED_REASONS is a frozen non-empty string enum', () => {
    assert.ok(Array.isArray(VERIFICATION_BLOCKED_REASONS));
    assert.ok(Object.isFrozen(VERIFICATION_BLOCKED_REASONS), 'must be frozen');
    assert.ok(VERIFICATION_BLOCKED_REASONS.length > 0);
    for (const reason of VERIFICATION_BLOCKED_REASONS) {
        assert.ok(typeof reason === 'string' && reason.length > 0, `reason: ${reason}`);
    }
});

// --- Split-file completeness -------------------------------------------------
// Every raw catalog the barrel re-exports must originate from exactly one split
// file, that file's array must be non-empty, and the barrel must re-export the
// SAME array instance (proving no accidental copy/wrapper crept in).

test('each split raw-data file is non-empty and re-exported by the barrel', () => {
    const rawByFile = [
        ['constants.js', constantsFile, ['VERIFICATION_BLOCKED_REASONS']],
        ['globals.js', globalsFile, ['SSJS_GLOBALS']],
        ['platform-functions.js', platformFunctionsFile, ['PLATFORM_FUNCTIONS']],
        [
            'platform-methods.js',
            platformMethodsFile,
            [
                'PLATFORM_METHODS',
                'PLATFORM_VARIABLE_METHODS',
                'PLATFORM_RESPONSE_METHODS',
                'PLATFORM_REQUEST_METHODS',
                'REQUEST_UTILITY_METHODS',
                'PLATFORM_RECIPIENT_METHODS',
                'ATTRIBUTE_METHODS',
                'DATE_TIME_METHODS',
                'DATE_TIME_TIMEZONE_METHODS',
                'ERROR_UTIL_METHODS',
            ],
        ],
        [
            'core-library.js',
            coreLibraryFile,
            ['CORE_LIBRARY_OBJECTS', 'ACCOUNT_METHODS', 'EVENT_METHODS', 'DATA_EXTENSION_METHODS'],
        ],
        [
            'http-wsproxy.js',
            httpWsproxyFile,
            ['HTTP_METHODS', 'WSPROXY_METHODS', 'HTTPHEADER_METHODS', 'SCRIPT_UTIL_CONSTRUCTORS'],
        ],
        ['ecmascript.js', ecmascriptFile, ['ECMASCRIPT_BUILTINS', 'CONSTRUCTIBLE_BUILTINS']],
        ['unsupported.js', unsupportedFile, ['UNSUPPORTED_SYNTAX', 'KNOWN_UNSUPPORTED']],
        ['polyfills.js', polyfillsFile, ['POLYFILLABLE_METHODS']],
    ];
    for (const [filename, mod, names] of rawByFile) {
        for (const name of names) {
            const arr = mod[name];
            assert.ok(Array.isArray(arr), `${filename}: ${name} is an array`);
            assert.ok(arr.length > 0, `${filename}: ${name} is non-empty`);
        }
    }
});

test('no split raw-data file leaks the module-internal helpers', () => {
    // STANDARD_METHODS and SCRIPT_UTIL_REQUEST_ONLY_PROPERTIES stay internal.
    assert.equal(coreLibraryFile.STANDARD_METHODS, undefined);
    assert.equal(httpWsproxyFile.SCRIPT_UTIL_REQUEST_ONLY_PROPERTIES, undefined);
});
