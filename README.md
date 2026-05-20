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
    // Globals
    SSJS_GLOBALS,
    SSJS_GLOBALS_MAP,
    ssjsGlobalsLookup,
    // Platform methods
    PLATFORM_METHODS,
    PLATFORM_FUNCTIONS,
    platformFunctionLookup,
    platformFunctionNames,
    // Platform objects
    PLATFORM_VARIABLE_METHODS,
    platformVariableLookup,
    PLATFORM_RESPONSE_METHODS,
    platformResponseLookup,
    PLATFORM_REQUEST_METHODS,
    platformRequestLookup,
    PLATFORM_RECIPIENT_METHODS,
    platformRecipientMethodNames,
    platformRecipientLookup,
    // Core library objects
    CORE_LIBRARY_OBJECTS,
    coreObjectNames,
    coreObjectLookup,
    coreMethodArityLookup,
    // HTTP + HTTPHeader
    HTTP_METHODS,
    httpMethodNames,
    httpMethodLookup,
    HTTPHEADER_METHODS,
    httpHeaderMethodNames,
    httpHeaderMethodLookup,
    // WSProxy
    WSPROXY_METHODS,
    wsproxyMethodNames,
    wsproxyMethodLookup,
    // WSProxy object-specific method arrays
    ACCOUNT_METHODS,
    ACCOUNT_TRACKING_METHODS,
    ACCOUNT_USER_METHODS,
    ATTRIBUTE_METHODS,
    attributeMethodNames,
    attributeMethodLookup,
    CONTENT_AREA_OBJ_METHODS,
    DATA_EXTENSION_METHODS,
    DATA_EXTENSION_FIELDS_METHODS,
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
    SEND_METHODS,
    SEND_CLASSIFICATION_METHODS,
    SEND_DEFINITION_METHODS,
    SEND_TRACKING_METHODS,
    SENDER_PROFILE_METHODS,
    SUBSCRIBER_METHODS,
    SUBSCRIBER_ATTRIBUTES_METHODS,
    SUBSCRIBER_LISTS_METHODS,
    TEMPLATE_METHODS,
    TRIGGERED_SEND_METHODS,
    TRIGGERED_SEND_TRACKING_METHODS,
    TRIGGERED_SEND_TRACKING_CLICKS_METHODS,
    TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS,
    // DateTime / ErrorUtil
    DATE_TIME_TIMEZONE_METHODS,
    ERROR_UTIL_METHODS,
    // Script.Util
    SCRIPT_UTIL_CONSTRUCTORS,
    SCRIPT_UTIL_REQUEST_METHODS,
    // ECMAScript / polyfills / unsupported syntax
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

### `HTTP_METHODS` / `httpMethodNames` / `httpMethodLookup`

Methods available on the `HTTP` platform object:

```js
import { HTTP_METHODS, httpMethodNames, httpMethodLookup } from 'ssjs-data';

for (const method of HTTP_METHODS) {
    console.log(method.name);   // e.g. 'Get', 'Post'
    console.log(method.syntax);
}

if (httpMethodNames.has('get')) { /* ... */ }

const m = httpMethodLookup.get('get');
```

### `WSPROXY_METHODS` / `wsproxyMethodNames` / `wsproxyMethodLookup`

SOAP API methods available on the `WSProxy` object:

```js
import { WSPROXY_METHODS, wsproxyMethodNames, wsproxyMethodLookup } from 'ssjs-data';

for (const method of WSPROXY_METHODS) {
    console.log(method.name);   // e.g. 'retrieve', 'create', 'update'
    console.log(method.syntax);
}

if (wsproxyMethodNames.has('retrieve')) { /* ... */ }

const method = wsproxyMethodLookup.get('retrieve');
```

### `HTTPHEADER_METHODS` / `httpHeaderMethodNames` / `httpHeaderMethodLookup`

Methods on the `HTTPHeader` Core object (requires `Platform.Load("core", "1")`):

```js
import { HTTPHEADER_METHODS, httpHeaderMethodNames, httpHeaderMethodLookup } from 'ssjs-data';

for (const method of HTTPHEADER_METHODS) {
    console.log(method.name);   // 'GetValue', 'SetValue'
    console.log(method.syntax);
}

if (httpHeaderMethodNames.has('getvalue')) { /* ... */ }
const method2 = httpHeaderMethodLookup.get('getvalue');
```

### `PLATFORM_VARIABLE_METHODS` / `platformVariableLookup`

Methods on the `Platform.Variable` bridge (reads and writes AMPscript variables from SSJS):

```js
import { PLATFORM_VARIABLE_METHODS, platformVariableLookup } from 'ssjs-data';

for (const method of PLATFORM_VARIABLE_METHODS) {
    console.log(method.name);   // 'GetValue', 'SetValue'
}
const m = platformVariableLookup.get('getvalue');
```

### `PLATFORM_RESPONSE_METHODS` / `platformResponseLookup`

Methods on the `Platform.Response` object (HTTP response control):

```js
import { PLATFORM_RESPONSE_METHODS, platformResponseLookup } from 'ssjs-data';

for (const method of PLATFORM_RESPONSE_METHODS) {
    console.log(method.name);   // e.g. 'Write', 'Redirect', 'SetResponseHeader'
}
const m = platformResponseLookup.get('write');
```

### `PLATFORM_REQUEST_METHODS` / `platformRequestLookup`

Methods on the `Platform.Request` object (HTTP request introspection):

```js
import { PLATFORM_REQUEST_METHODS, platformRequestLookup } from 'ssjs-data';

for (const method of PLATFORM_REQUEST_METHODS) {
    console.log(method.name);   // e.g. 'GetQueryStringParameter', 'GetPostData'
}
const m = platformRequestLookup.get('getquerystringparameter');
```

### `PLATFORM_RECIPIENT_METHODS` / `platformRecipientMethodNames` / `platformRecipientLookup`

Methods on the `Platform.Recipient` object (subscriber / recipient data):

```js
import { PLATFORM_RECIPIENT_METHODS, platformRecipientMethodNames, platformRecipientLookup } from 'ssjs-data';

for (const method of PLATFORM_RECIPIENT_METHODS) {
    console.log(method.name);   // e.g. 'GetAttributeValue'
}
if (platformRecipientMethodNames.has('getattributevalue')) { /* ... */ }
const m = platformRecipientLookup.get('getattributevalue');
```

### `ATTRIBUTE_METHODS` / `attributeMethodNames` / `attributeMethodLookup`

Methods on the `Attribute` Core object (requires `Platform.Load("core", "1.1.5")`):

```js
import { ATTRIBUTE_METHODS, attributeMethodNames, attributeMethodLookup } from 'ssjs-data';

for (const method of ATTRIBUTE_METHODS) {
    console.log(method.name);        // 'GetValue'
    console.log(method.description); // reads subscriber attribute / DE field for current recipient
}
if (attributeMethodNames.has('getvalue')) { /* ... */ }
const m = attributeMethodLookup.get('getvalue');
```

### `DATE_TIME_TIMEZONE_METHODS`

Methods on the `DateTime.TimeZone` namespace (requires `Platform.Load("core", "1.1.5")`):

```js
import { DATE_TIME_TIMEZONE_METHODS } from 'ssjs-data';

for (const method of DATE_TIME_TIMEZONE_METHODS) {
    console.log(method.name);   // 'Retrieve'
    console.log(method.syntax); // 'DateTime.TimeZone.Retrieve(filter)'
}
```

### `ERROR_UTIL_METHODS`

Utility methods on the `ErrorUtil` namespace for WSProxy error handling (requires `Platform.Load("core", "1.1.5")`):

```js
import { ERROR_UTIL_METHODS } from 'ssjs-data';

for (const method of ERROR_UTIL_METHODS) {
    console.log(method.name);   // 'ThrowWSProxyError'
    console.log(method.syntax);
}
```

### WSProxy object-specific method arrays

Each WSProxy-accessible object has its own named export. These follow the same shape as `WSPROXY_METHODS` and are used by tooling for per-object completions and hover.

| Export | WSProxy object |
|---|---|
| `ACCOUNT_METHODS` | `Account` |
| `ACCOUNT_TRACKING_METHODS` | `Account.Tracking` |
| `ACCOUNT_USER_METHODS` | `AccountUser` |
| `CONTENT_AREA_OBJ_METHODS` | `ContentAreaObj` |
| `DATA_EXTENSION_METHODS` | `DataExtension` |
| `DATA_EXTENSION_FIELDS_METHODS` | `DataExtension.Fields` |
| `DATA_EXTENSION_ROWS_METHODS` | `DataExtension.Rows` |
| `DELIVERY_PROFILE_METHODS` | `DeliveryProfile` |
| `EMAIL_METHODS` | `Email` |
| `EVENT_METHODS` | `Event` |
| `FILTER_DEFINITION_METHODS` | `FilterDefinition` |
| `FOLDER_METHODS` | `Folder` |
| `LIST_METHODS` | `List` |
| `LIST_SUBSCRIBERS_METHODS` | `List.Subscribers` |
| `LIST_SUBSCRIBERS_TRACKING_METHODS` | `List.Subscribers.Tracking` |
| `PORTFOLIO_METHODS` | `Portfolio` |
| `QUERY_DEFINITION_METHODS` | `QueryDefinition` |
| `SEND_METHODS` | `Send` |
| `SEND_CLASSIFICATION_METHODS` | `SendClassification` |
| `SEND_DEFINITION_METHODS` | `SendDefinition` |
| `SEND_TRACKING_METHODS` | `Send.Tracking` |
| `SENDER_PROFILE_METHODS` | `SenderProfile` |
| `SUBSCRIBER_METHODS` | `Subscriber` |
| `SUBSCRIBER_ATTRIBUTES_METHODS` | `Subscriber.Attributes` |
| `SUBSCRIBER_LISTS_METHODS` | `Subscriber.Lists` |
| `TEMPLATE_METHODS` | `Template` |
| `TRIGGERED_SEND_METHODS` | `TriggeredSend` |
| `TRIGGERED_SEND_TRACKING_METHODS` | `TriggeredSend.Tracking` |
| `TRIGGERED_SEND_TRACKING_CLICKS_METHODS` | `TriggeredSend.Tracking.Clicks` |
| `TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS` | `TriggeredSend.Tracking.TotalByInterval` |

### `ssjsGlobalsLookup` / `coreMethodArityLookup`

Additional O(1) lookup maps:

```js
import { ssjsGlobalsLookup, coreMethodArityLookup } from 'ssjs-data';

// Lookup a global by lowercase name
const writeGlobal = ssjsGlobalsLookup.get('write');

// Lookup arity (min/max args) of a Core library method by 'ObjectName.methodName'
const arity = coreMethodArityLookup.get('DataExtension.Init');
// e.g. { minArgs: 1, maxArgs: 1 }
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
