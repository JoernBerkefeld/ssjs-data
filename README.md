# ssjs-data

Canonical SSJS (Server-Side JavaScript) function catalog, Core library objects, Platform methods, and globals for Salesforce Marketing Cloud (SFMC) tooling.

This package is the single source of truth consumed by:

- [eslint-plugin-sfmc](https://www.npmjs.com/package/eslint-plugin-sfmc) — globals registration, unknown-function detection, platform-load checks
- [prettier-plugin-sfmc](https://www.npmjs.com/package/prettier-plugin-sfmc) — language registration
- [VSCode: sfmc-language](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-language) — completions, hover, and diagnostics

## Installation

```sh
npm install ssjs-data
```

## Usage

```js
import {
    SSJS_GLOBALS,
    SSJS_GLOBALS_MAP,
    PLATFORM_METHODS,
    PLATFORM_FUNCTIONS,
    platformFunctionLookup,
    platformFunctionNames,
    CORE_LIBRARY_OBJECTS,
    coreObjectNames,
    coreObjectLookup,
    HTTP_METHODS,
    httpMethodNames,
    WSPROXY_METHODS,
    wsproxyMethodNames,
    SCRIPT_UTIL_CONSTRUCTORS,
    SCRIPT_UTIL_REQUEST_METHODS,
    ECMASCRIPT_BUILTINS,
    UNSUPPORTED_SYNTAX,
    unsupportedByNodeType,
    POLYFILLABLE_METHODS,
    polyfillByPrototypeName,
    polyfillByStaticName,
} from 'ssjs-data';
```

### `SSJS_GLOBALS` / `SSJS_GLOBALS_MAP`

Global functions and objects available at the top scope of any SSJS execution context (no `Platform.Load` required):

```js
import { SSJS_GLOBALS, SSJS_GLOBALS_MAP } from 'ssjs-data';

for (const global of SSJS_GLOBALS) {
    console.log(global.name);        // e.g. 'Write', 'Stringify'
    console.log(global.type);        // 'function' | 'object'
    console.log(global.description);
}

// SSJS_GLOBALS_MAP is shaped for ESLint's globals config:
// { Write: 'readonly', Platform: 'readonly', ... }
console.log(SSJS_GLOBALS_MAP['Write']); // 'readonly'
```

### `PLATFORM_METHODS`

Top-level `Platform.*` methods (e.g. `Platform.Load`):

```js
import { PLATFORM_METHODS } from 'ssjs-data';

for (const method of PLATFORM_METHODS) {
    console.log(method.name);     // e.g. 'Load'
    console.log(method.syntax);   // e.g. 'Platform.Load(libraryName, version)'
    console.log(method.minArgs);
    console.log(method.maxArgs);
}
```

### `PLATFORM_FUNCTIONS` / `platformFunctionLookup` / `platformFunctionNames`

The `Platform.Function.*` catalog — available without `Platform.Load`:

```js
import { PLATFORM_FUNCTIONS, platformFunctionLookup, platformFunctionNames } from 'ssjs-data';

// Full catalog
for (const fn of PLATFORM_FUNCTIONS) {
    console.log(fn.name);        // e.g. 'Lookup'
    console.log(fn.minArgs);
    console.log(fn.maxArgs);
    console.log(fn.description);
    console.log(fn.params);      // array of { name, description, type?, optional? }
    console.log(fn.returnType);
    console.log(fn.syntax);
}

// O(1) lookup by lowercase name
const entry = platformFunctionLookup.get('lookup');

// Existence check
if (platformFunctionNames.has('lookup')) { /* ... */ }
```

### `CORE_LIBRARY_OBJECTS` / `coreObjectNames` / `coreObjectLookup`

Objects that require `Platform.Load("core", "1")` before use (e.g. `DataExtension`, `Subscriber`):

```js
import { CORE_LIBRARY_OBJECTS, coreObjectNames, coreObjectLookup } from 'ssjs-data';

for (const obj of CORE_LIBRARY_OBJECTS) {
    console.log(obj.name);        // e.g. 'DataExtension', 'DataExtension.Rows'
    console.log(obj.methods);     // e.g. ['Init', 'Add', 'Remove', 'Update', 'Retrieve']
    console.log(obj.description);
}

// Existence check
if (coreObjectNames.has('DataExtension')) { /* ... */ }

// O(1) lookup
const de = coreObjectLookup.get('DataExtension');
```

### `HTTP_METHODS` / `httpMethodNames`

Methods available on the `HTTP` platform object:

```js
import { HTTP_METHODS, httpMethodNames } from 'ssjs-data';

for (const method of HTTP_METHODS) {
    console.log(method.name);   // e.g. 'Get', 'Post'
    console.log(method.syntax);
}

if (httpMethodNames.has('get')) { /* ... */ }
```

### `WSPROXY_METHODS` / `wsproxyMethodNames`

SOAP API methods available on the `WSProxy` object:

```js
import { WSPROXY_METHODS, wsproxyMethodNames } from 'ssjs-data';

for (const method of WSPROXY_METHODS) {
    console.log(method.name);   // e.g. 'retrieve', 'create', 'update'
    console.log(method.syntax);
}

if (wsproxyMethodNames.has('retrieve')) { /* ... */ }
```

### `SCRIPT_UTIL_CONSTRUCTORS` / `SCRIPT_UTIL_REQUEST_METHODS`

`Script.Util` constructors (e.g. `Script.Util.HttpRequest`) and their instance methods:

```js
import { SCRIPT_UTIL_CONSTRUCTORS, SCRIPT_UTIL_REQUEST_METHODS } from 'ssjs-data';

for (const ctor of SCRIPT_UTIL_CONSTRUCTORS) {
    console.log(ctor.name);       // e.g. 'HttpRequest'
    console.log(ctor.returnType); // e.g. 'HttpRequest'
}

for (const method of SCRIPT_UTIL_REQUEST_METHODS) {
    console.log(method.name);     // e.g. 'send', 'setHeader'
}
```

### `ECMASCRIPT_BUILTINS`

ECMAScript built-in methods and properties supported by the SSJS engine:

```js
import { ECMASCRIPT_BUILTINS } from 'ssjs-data';

for (const builtin of ECMASCRIPT_BUILTINS) {
    console.log(builtin.name);    // e.g. 'push', 'slice'
    console.log(builtin.owner);   // e.g. 'Array', 'String', 'Math'
    console.log(builtin.description);
}
```

### `UNSUPPORTED_SYNTAX` / `unsupportedByNodeType`

JavaScript syntax constructs that the SSJS engine does not support:

```js
import { UNSUPPORTED_SYNTAX, unsupportedByNodeType } from 'ssjs-data';

for (const item of UNSUPPORTED_SYNTAX) {
    console.log(item.nodeType);   // AST node type, e.g. 'ArrowFunctionExpression'
    console.log(item.name);       // human-readable name
    console.log(item.description);
}

// Keyed lookup by AST node type
const info = unsupportedByNodeType.get('ArrowFunctionExpression');
```

### `POLYFILLABLE_METHODS` / `polyfillByPrototypeName` / `polyfillByStaticName`

Methods that are absent from the SSJS engine but can be polyfilled:

```js
import { POLYFILLABLE_METHODS, polyfillByPrototypeName, polyfillByStaticName } from 'ssjs-data';

for (const method of POLYFILLABLE_METHODS) {
    console.log(method.name);       // e.g. 'startsWith'
    console.log(method.owner);      // e.g. 'String'
    console.log(method.description);
}

// Lookup by prototype method name (e.g. 'startsWith')
const info = polyfillByPrototypeName.get('startsWith');

// Lookup by static invocation name (e.g. 'Array.isArray')
const info2 = polyfillByStaticName.get('Array.isArray');
```

## License

MIT
