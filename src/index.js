/**
 * Canonical SSJS (Server-Side JavaScript) catalog for SFMC tooling.
 *
 * Single source of truth consumed by:
 *   - eslint-plugin-sfmc  (globals, unknown-function detection, platform-load checks)
 *   - prettier-plugin-sfmc (language registration)
 *   - vscode-sfmc-language (completions, hover, diagnostics)
 */

const INF = Infinity;

// ── Global functions ─────────────────────────────────────────────────────────
// Functions and objects available at the top scope of any SSJS execution context.

export const SSJS_GLOBALS = [
    {
        name: 'Write',
        type: 'function',
        minArgs: 1,
        maxArgs: 1,
        description: 'Outputs a string to the rendered page.',
        params: [{ name: 'content', description: 'String to output', type: 'string' }],
        returnType: 'void',
        syntax: 'Write(content)',
        example: 'var greeting = "Hello, world!";\nWrite(greeting);',
    },
    {
        name: 'Stringify',
        type: 'function',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Converts an object to its JSON text representation. Use this to serialize objects before writing or storing them. Not to be confused with the native String() function, which converts a CLR response object to a plain string.',
        params: [{ name: 'value', description: 'Object to serialize', type: 'object' }],
        returnType: 'string',
        syntax: 'Stringify(value)',
        example:
            'var obj = { name: "Jane", age: 30 };\nvar jsonStr = Stringify(obj);\nWrite(jsonStr); // outputs: {"name":"Jane","age":30}',
    },
    {
        name: 'Variable',
        type: 'object',
        description: 'Provides access to AMPscript variables from SSJS context.',
    },
    {
        name: 'Attribute',
        type: 'object',
        description: 'Provides access to subscriber attribute values.',
    },
    {
        name: 'Platform',
        type: 'object',
        description:
            'Root namespace for SFMC platform APIs including Function, Variable, Response, and Request.',
    },
    {
        name: 'ContentBlockByKey',
        type: 'function',
        minArgs: 1,
        maxArgs: 1,
        description: 'Renders a Content Builder asset by its customer key.',
        params: [
            {
                name: 'customerKey',
                description: 'Customer key of the Content Builder asset',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'ContentBlockByKey(customerKey)',
        example: 'var html = ContentBlockByKey("my-header-block");\nWrite(html);',
    },
    {
        name: 'ContentBlockByName',
        type: 'function',
        minArgs: 1,
        maxArgs: 1,
        description: 'Renders a Content Builder asset by its folder path and name.',
        params: [
            {
                name: 'name',
                description: 'Folder path and name of the Content Builder asset',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'ContentBlockByName(name)',
        example: 'var html = ContentBlockByName("Shared Content/Footer");\nWrite(html);',
    },
    {
        name: 'ContentBlockByID',
        type: 'function',
        minArgs: 1,
        maxArgs: 1,
        description: 'Renders a Content Builder asset by its numeric ID.',
        params: [
            { name: 'id', description: 'Numeric ID of the Content Builder asset', type: 'number' },
        ],
        returnType: 'string',
        syntax: 'ContentBlockByID(id)',
        example: 'var html = ContentBlockByID(12345);\nWrite(html);',
    },
    {
        name: 'ContentAreaByKey',
        type: 'function',
        minArgs: 1,
        maxArgs: 1,
        description: 'Renders a classic content area by its external key.',
        params: [
            {
                name: 'key',
                description: 'External key of the classic content area',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'ContentAreaByKey(key)',
        example: 'var html = ContentAreaByKey("my-content-area-key");\nWrite(html);',
    },
    {
        name: 'TreatAsContent',
        type: 'function',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Evaluates a string containing AMPscript or HTML and returns the rendered result.',
        params: [
            {
                name: 'content',
                description: 'String containing AMPscript or HTML to evaluate',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'TreatAsContent(content)',
        example:
            'var ampBlock = "%%[Set @msg = \'Dynamic content\']%% %%=v(@msg)=%%";\nWrite(TreatAsContent(ampBlock));',
    },
    {
        name: 'TreatAsContentArea',
        type: 'function',
        minArgs: 1,
        maxArgs: 1,
        description: 'Renders a classic content area stored in the system.',
        params: [
            {
                name: 'content',
                description: 'Classic content area markup to render',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'TreatAsContentArea(content)',
        example:
            'var rendered = TreatAsContentArea("%%[ContentAreaByKey(\'my-key\')]%%");\nWrite(rendered);',
    },
    {
        name: 'String',
        type: 'function',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Native JavaScript function that converts any value to its string representation. ' +
            'Essential in SSJS for converting the CLR response object returned by Script.Util.HttpRequest.send().content ' +
            'into a JavaScript string that can be passed to Platform.Function.ParseJSON(). ' +
            'Unlike Stringify(), String() works on CLR/.NET objects and does not produce JSON output.',
        params: [
            {
                name: 'value',
                description: 'Value to convert to string (any type, including CLR objects)',
                type: 'any',
            },
        ],
        returnType: 'string',
        syntax: 'String(value)',
        example:
            '// Convert a CLR response object to a JavaScript string for JSON parsing:\n' +
            'var req = new Script.Util.HttpRequest("https://api.example.com/data");\n' +
            'req.method = "GET";\n' +
            'var resp = req.send();\n' +
            'var responseStr = String(resp.content);  // CLR -> JS string\n' +
            'var responseJSON = Platform.Function.ParseJSON(responseStr);\n\n' +
            '// Also works for numbers and other primitives:\n' +
            'var num = 42;\n' +
            'var str = String(num); // "42"',
    },
    {
        name: 'Error',
        type: 'function',
        minArgs: 0,
        maxArgs: 1,
        description:
            'Native JavaScript Error constructor. Creates an Error object that can be thrown or caught. ' +
            'Use inside try/catch blocks for structured error handling in SSJS. ' +
            'The caught error object has a message property.',
        params: [
            {
                name: 'message',
                description: 'Human-readable description of the error',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'new Error([message])',
        example:
            'try {\n' +
            '    var req = new Script.Util.HttpRequest("https://api.example.com/data");\n' +
            '    req.method = "GET";\n' +
            '    req.continueOnError = false;\n' +
            '    var resp = req.send();\n' +
            '    if (resp.statusCode !== 200) {\n' +
            '        throw new Error("Request failed with status: " + resp.statusCode);\n' +
            '    }\n' +
            '} catch (e) {\n' +
            '    Write("Error: " + e.message);\n' +
            '}',
    },
];

/**
 * Map of global names for ESLint no-undef configuration.
 * Keys are identifiers; values are "readonly" or "writable".
 */
export const SSJS_GLOBALS_MAP = Object.fromEntries([
    ...SSJS_GLOBALS.map((g) => [g.name, 'readonly']),
    ['HTTP', 'readonly'],
    ['WSProxy', 'readonly'],
    ['Script', 'readonly'],
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
    ['SendDefinition', 'readonly'],
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

// ── Top-level Platform methods ───────────────────────────────────────────────
// Direct methods on the Platform object (e.g. Platform.Load).

export const PLATFORM_METHODS = [
    {
        name: 'Load',
        minArgs: 2,
        maxArgs: 2,
        description: 'Loads a platform library. Must be called before using Core library objects.',
        params: [
            { name: 'libraryName', description: 'Library to load (e.g. "core")', type: 'string' },
            { name: 'version', description: 'Library version (e.g. "1.1.5")', type: 'string' },
        ],
        returnType: 'void',
        syntax: 'Platform.Load(libraryName, version)',
        example:
            'Platform.Load("core", "1.1.5");\nvar de = DataExtension.Init("MyDE");\nvar rows = de.Rows.Retrieve();',
    },
];

// ── Platform.Function methods ────────────────────────────────────────────────
// Methods available under Platform.Function.* without requiring Platform.Load.

/** @type {{name: string, minArgs: number, maxArgs: number, description: string, params?: {name: string, description: string, type?: string, optional?: boolean}[], returnType?: string, syntax?: string}[]} */
export const PLATFORM_FUNCTIONS = [
    {
        name: 'Lookup',
        minArgs: 4,
        maxArgs: INF,
        description:
            'Retrieves a single field value from a Data Extension row matching filter criteria.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            { name: 'returnField', description: 'Name of the field to return', type: 'string' },
            { name: 'fieldName', description: 'Filter field name', type: 'string' },
            { name: 'fieldValue', description: 'Filter field value', type: 'string' },
        ],
        returnType: 'string',
        syntax: 'Lookup(deName, returnField, fieldName, fieldValue[, fieldName2, fieldValue2, ...])',
        example:
            'var email = Platform.Function.Lookup("Subscribers", "EmailAddress", "SubscriberKey", "abc123");',
    },
    {
        name: 'LookupRows',
        minArgs: 3,
        maxArgs: INF,
        description: 'Returns a result set of rows from a Data Extension matching filter criteria.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            { name: 'fieldName', description: 'Filter field name', type: 'string' },
            { name: 'fieldValue', description: 'Filter field value', type: 'string' },
        ],
        returnType: 'object',
        syntax: 'LookupRows(deName, fieldName, fieldValue[, fieldName2, fieldValue2, ...])',
        example:
            'var rows = Platform.Function.LookupRows("MyDE", "Status", "active");\nfor (var i = 0; i < rows.length; i++) {\n    Write(rows[i]["Name"] + "<br>");\n}',
    },
    {
        name: 'LookupOrderedRows',
        minArgs: 5,
        maxArgs: INF,
        description:
            'Returns an ordered result set from a Data Extension. ' +
            'The sort expression is a single string in the format "ColumnName ASC" or "ColumnName DESC". ' +
            'Multiple columns can be separated by commas. Returns up to 2,000 rows; values below 1 for count default to 2,000.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'count',
                description: 'Maximum number of rows to return; values below 1 return up to 2,000',
                type: 'number',
            },
            {
                name: 'orderBy',
                description:
                    'Sort expression using "ColumnName ASC/DESC" syntax (e.g. "LastName ASC, FirstName ASC")',
                type: 'string',
            },
            {
                name: 'fieldName',
                description: 'Filter field name or array of field names (AND logic)',
                type: 'string',
            },
            {
                name: 'fieldValue',
                description: 'Filter value or array of values matching the filter field(s)',
                type: 'string',
            },
        ],
        returnType: 'object',
        syntax: 'LookupOrderedRows(deName, count, orderBy, fieldName, fieldValue[, fieldName2, fieldValue2, ...])',
        example:
            'var rows = Platform.Function.LookupOrderedRows("MyDE", 10, "CreatedDate DESC", "Status", "active");\nfor (var i = 0; i < rows.length; i++) {\n    Write(rows[i]["Email"] + "<br>");\n}',
    },
    {
        name: 'InsertData',
        minArgs: 4,
        maxArgs: INF,
        description: 'Adds a new row to a Data Extension.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'fieldName1',
                description: 'First field name (additional field/value pairs may follow)',
                type: 'string',
            },
            { name: 'value1', description: 'Value for the first field', type: 'string' },
        ],
        returnType: 'number',
        syntax: 'InsertData(deName, fieldName1, value1[, fieldName2, value2, ...])',
        example:
            'var rowsAffected = Platform.Function.InsertData("MyDE", "Email", "jane@example.com", "Name", "Jane");',
    },
    {
        name: 'InsertDE',
        minArgs: 4,
        maxArgs: INF,
        description: 'Adds a new row to a Data Extension (alias for InsertData).',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'fieldName1',
                description: 'First field name (additional field/value pairs may follow)',
                type: 'string',
            },
            { name: 'value1', description: 'Value for the first field', type: 'string' },
        ],
        returnType: 'number',
        syntax: 'InsertDE(deName, fieldName1, value1[, fieldName2, value2, ...])',
        example:
            'var count = Platform.Function.InsertDE("MyDE", "Email", "jane@example.com", "Name", "Jane");',
    },
    {
        name: 'UpdateData',
        minArgs: 5,
        maxArgs: INF,
        description: 'Modifies existing rows in a Data Extension matching filter criteria.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            { name: 'fieldName1', description: 'Field name to update', type: 'string' },
            { name: 'value1', description: 'New value for the field', type: 'string' },
            {
                name: 'filterField',
                description: 'Filter field name for identifying rows',
                type: 'string',
            },
            {
                name: 'filterValue',
                description: 'Filter field value for identifying rows',
                type: 'string',
            },
        ],
        returnType: 'number',
        syntax: 'UpdateData(deName, fieldName1, value1, filterField, filterValue[, fieldName2, value2, ...])',
        example:
            'var count = Platform.Function.UpdateData("MyDE", "Status", "inactive", "Email", "jane@example.com");',
    },
    {
        name: 'UpdateDE',
        minArgs: 5,
        maxArgs: INF,
        description: 'Modifies existing rows in a Data Extension (alias for UpdateData).',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            { name: 'fieldName1', description: 'Field name to update', type: 'string' },
            { name: 'value1', description: 'New value for the field', type: 'string' },
            {
                name: 'filterField',
                description: 'Filter field name for identifying rows',
                type: 'string',
            },
            {
                name: 'filterValue',
                description: 'Filter field value for identifying rows',
                type: 'string',
            },
        ],
        returnType: 'number',
        syntax: 'UpdateDE(deName, fieldName1, value1, filterField, filterValue[, fieldName2, value2, ...])',
        example:
            'var count = Platform.Function.UpdateDE("MyDE", "Status", "inactive", "Email", "jane@example.com");',
    },
    {
        name: 'UpsertData',
        minArgs: 5,
        maxArgs: INF,
        description: 'Inserts a new row or updates an existing one in a Data Extension.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            { name: 'fieldName1', description: 'Field name to set', type: 'string' },
            { name: 'value1', description: 'Value for the field', type: 'string' },
            {
                name: 'filterField',
                description: 'Filter field name for identifying rows',
                type: 'string',
            },
            {
                name: 'filterValue',
                description: 'Filter field value for identifying rows',
                type: 'string',
            },
        ],
        returnType: 'number',
        syntax: 'UpsertData(deName, fieldName1, value1, filterField, filterValue[, fieldName2, value2, ...])',
        example:
            'Platform.Function.UpsertData("MyDE", 1, "Status", "active", "Email", "jane@example.com");',
    },
    {
        name: 'UpsertDE',
        minArgs: 5,
        maxArgs: INF,
        description: 'Inserts or updates a Data Extension row (alias for UpsertData).',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            { name: 'fieldName1', description: 'Field name to set', type: 'string' },
            { name: 'value1', description: 'Value for the field', type: 'string' },
            {
                name: 'filterField',
                description: 'Filter field name for identifying rows',
                type: 'string',
            },
            {
                name: 'filterValue',
                description: 'Filter field value for identifying rows',
                type: 'string',
            },
        ],
        returnType: 'number',
        syntax: 'UpsertDE(deName, fieldName1, value1, filterField, filterValue[, fieldName2, value2, ...])',
        example:
            'Platform.Function.UpsertDE("MyDE", 1, "Status", "active", "Email", "jane@example.com");',
    },
    {
        name: 'DeleteData',
        minArgs: 3,
        maxArgs: INF,
        description: 'Removes rows from a Data Extension matching filter criteria.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            { name: 'filterField', description: 'Filter field name', type: 'string' },
            { name: 'filterValue', description: 'Filter field value', type: 'string' },
        ],
        returnType: 'number',
        syntax: 'DeleteData(deName, filterField, filterValue[, filterField2, filterValue2, ...])',
        example: 'var count = Platform.Function.DeleteData("MyDE", "Email", "jane@example.com");',
    },
    {
        name: 'DeleteDE',
        minArgs: 3,
        maxArgs: INF,
        description: 'Removes rows from a Data Extension (alias for DeleteData).',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            { name: 'filterField', description: 'Filter field name', type: 'string' },
            { name: 'filterValue', description: 'Filter field value', type: 'string' },
        ],
        returnType: 'number',
        syntax: 'DeleteDE(deName, filterField, filterValue[, filterField2, filterValue2, ...])',
        example: 'var count = Platform.Function.DeleteDE("MyDE", "Email", "jane@example.com");',
    },
    {
        name: 'ContentBlockByKey',
        minArgs: 1,
        maxArgs: 1,
        description: 'Renders a Content Builder asset referenced by customer key.',
        params: [
            {
                name: 'customerKey',
                description: 'Customer key of the Content Builder asset',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'ContentBlockByKey(customerKey)',
        example: 'var html = Platform.Function.ContentBlockByKey("my-header-block");\nWrite(html);',
    },
    {
        name: 'ContentBlockByName',
        minArgs: 1,
        maxArgs: 1,
        description: 'Renders a Content Builder asset referenced by folder path and name.',
        params: [
            {
                name: 'name',
                description: 'Folder path and name of the Content Builder asset',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'ContentBlockByName(name)',
        example:
            'var html = Platform.Function.ContentBlockByName("Shared Content/Footer");\nWrite(html);',
    },
    {
        name: 'ContentBlockByID',
        minArgs: 1,
        maxArgs: 1,
        description: 'Renders a Content Builder asset by its numeric identifier.',
        params: [
            { name: 'id', description: 'Numeric ID of the Content Builder asset', type: 'number' },
        ],
        returnType: 'string',
        syntax: 'ContentBlockByID(id)',
        example: 'var html = Platform.Function.ContentBlockByID(12345);\nWrite(html);',
    },
    {
        name: 'ContentImageByKey',
        minArgs: 1,
        maxArgs: 2,
        description:
            'Returns an HTML img tag for a Content Builder image identified by its external key. An optional fallback key can be supplied if the primary image is not found.',
        params: [
            {
                name: 'key',
                description: 'External key of the Content Builder image',
                type: 'string',
            },
            {
                name: 'fallbackKey',
                description: 'External key of a fallback image when the primary cannot be found',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'ContentImageByKey(key[, fallbackKey])',
        example:
            'var imgTag = Platform.Function.ContentImageByKey("hero-banner-key");\nWrite(imgTag);',
    },
    {
        name: 'ContentImageByID',
        minArgs: 1,
        maxArgs: 2,
        description:
            'Returns an HTML img tag for a Content Builder image identified by its numeric ID. An optional fallback ID can be supplied if the primary image is not found.',
        params: [
            { name: 'id', description: 'Numeric ID of the Content Builder image', type: 'number' },
            {
                name: 'fallbackId',
                description: 'Numeric ID of a fallback image when the primary cannot be found',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'ContentImageByID(id[, fallbackId])',
        example: 'var imgTag = Platform.Function.ContentImageByID(98765);\nWrite(imgTag);',
    },
    {
        name: 'TreatAsContent',
        minArgs: 1,
        maxArgs: 1,
        description: 'Processes a string as AMPscript/HTML and returns rendered output.',
        params: [
            {
                name: 'content',
                description: 'String containing AMPscript or HTML to evaluate',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'TreatAsContent(content)',
        example:
            'var result = Platform.Function.TreatAsContent("%%[Set @x = 1]%%%%=v(@x)=%%");\nWrite(result); // "1"',
    },
    {
        name: 'BeginImpressionRegion',
        minArgs: 1,
        maxArgs: 1,
        description: 'Marks the start of a named impression tracking region within content.',
        params: [
            { name: 'name', description: 'Name identifying the impression region', type: 'string' },
        ],
        returnType: 'void',
        syntax: 'BeginImpressionRegion(name)',
        example:
            'Platform.Function.BeginImpressionRegion("hero-banner");\nWrite(heroContent);\nPlatform.Function.EndImpressionRegion();',
    },
    {
        name: 'EndImpressionRegion',
        minArgs: 0,
        maxArgs: 1,
        description: 'Marks the end of an impression tracking region within content.',
        params: [
            {
                name: 'closeAll',
                description: 'When true, closes all nested impression regions',
                type: 'boolean',
                optional: true,
            },
        ],
        returnType: 'void',
        syntax: 'EndImpressionRegion([closeAll])',
        example:
            'Platform.Function.BeginImpressionRegion("footer");\nWrite(footerContent);\nPlatform.Function.EndImpressionRegion();',
    },
    {
        name: 'Substring',
        minArgs: 2,
        maxArgs: 3,
        description: 'Extracts part of a string starting at a given position.',
        params: [
            { name: 'value', description: 'Source string', type: 'string' },
            { name: 'start', description: 'Starting position (1-based)', type: 'number' },
            {
                name: 'length',
                description: 'Number of characters to extract',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Substring(value, start[, length])',
        example:
            'var str = "Hello, World!";\nvar sub = Platform.Function.Substring(str, 1, 5);\nWrite(sub); // "Hello"',
    },
    {
        name: 'Trim',
        minArgs: 1,
        maxArgs: 1,
        description: 'Removes leading and trailing whitespace from a string.',
        params: [{ name: 'value', description: 'String to trim', type: 'string' }],
        returnType: 'string',
        syntax: 'Trim(value)',
        example: 'var clean = Platform.Function.Trim("  hello  ");\nWrite(clean); // "hello"',
    },
    {
        name: 'Replace',
        minArgs: 3,
        maxArgs: 3,
        description: 'Substitutes all occurrences of a substring within a string.',
        params: [
            { name: 'value', description: 'Source string', type: 'string' },
            { name: 'search', description: 'Substring to find', type: 'string' },
            { name: 'replacement', description: 'Replacement string', type: 'string' },
        ],
        returnType: 'string',
        syntax: 'Replace(value, search, replacement)',
        example:
            'var result = Platform.Function.Replace("Hello, World!", "World", "SFMC");\nWrite(result); // "Hello, SFMC!"',
    },
    {
        name: 'IndexOf',
        minArgs: 2,
        maxArgs: 2,
        description: 'Returns the zero-based position of the first occurrence of a substring.',
        params: [
            { name: 'value', description: 'String to search in', type: 'string' },
            { name: 'search', description: 'Substring to find', type: 'string' },
        ],
        returnType: 'number',
        syntax: 'IndexOf(value, search)',
        example: 'var pos = Platform.Function.IndexOf("Hello, World!", "World");\nWrite(pos); // 7',
    },
    {
        name: 'Length',
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns the number of characters in a string.',
        params: [{ name: 'value', description: 'String to measure', type: 'string' }],
        returnType: 'number',
        syntax: 'Length(value)',
        example: 'var len = Platform.Function.Length("Hello");\nWrite(len); // 5',
    },
    {
        name: 'Uppercase',
        minArgs: 1,
        maxArgs: 1,
        description: 'Converts a string to uppercase.',
        params: [{ name: 'value', description: 'String to convert', type: 'string' }],
        returnType: 'string',
        syntax: 'Uppercase(value)',
        example: 'var upper = Platform.Function.Uppercase("hello");\nWrite(upper); // "HELLO"',
    },
    {
        name: 'Lowercase',
        minArgs: 1,
        maxArgs: 1,
        description: 'Converts a string to lowercase.',
        params: [{ name: 'value', description: 'String to convert', type: 'string' }],
        returnType: 'string',
        syntax: 'Lowercase(value)',
        example: 'var lower = Platform.Function.Lowercase("HELLO");\nWrite(lower); // "hello"',
    },
    {
        name: 'ProperCase',
        minArgs: 1,
        maxArgs: 1,
        description: 'Converts a string to title case.',
        params: [{ name: 'value', description: 'String to convert', type: 'string' }],
        returnType: 'string',
        syntax: 'ProperCase(value)',
        example:
            'var title = Platform.Function.ProperCase("hello world");\nWrite(title); // "Hello World"',
    },
    {
        name: 'Char',
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns the character for a given ASCII code.',
        params: [{ name: 'asciiCode', description: 'ASCII character code', type: 'number' }],
        returnType: 'string',
        syntax: 'Char(asciiCode)',
        example:
            'var tab = Platform.Function.Char(9); // tab character\nWrite("Col1" + tab + "Col2");',
    },
    {
        name: 'Concat',
        minArgs: 2,
        maxArgs: INF,
        description: 'Joins two or more string values together.',
        params: [
            { name: 'value1', description: 'First string', type: 'string' },
            {
                name: 'value2',
                description: 'Second string (additional strings may follow)',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'Concat(value1, value2[, ...])',
        example:
            'var full = Platform.Function.Concat("Hello", ", ", "World!");\nWrite(full); // "Hello, World!"',
    },
    {
        name: 'Format',
        minArgs: 2,
        maxArgs: INF,
        description: 'Formats a value according to a .NET format string.',
        params: [
            { name: 'value', description: 'Value to format', type: 'string' },
            { name: 'format', description: '.NET format string', type: 'string' },
        ],
        returnType: 'string',
        syntax: 'Format(value, format[, ...])',
        example:
            'var price = Platform.Function.Format(1234.5, "C2");\nWrite(price); // "$1,234.50"',
    },
    {
        name: 'DateAdd',
        minArgs: 3,
        maxArgs: 3,
        description: 'Adds a specified interval to a date value.',
        params: [
            { name: 'date', description: 'Date value to modify', type: 'string' },
            { name: 'interval', description: 'Number of intervals to add', type: 'number' },
            {
                name: 'datePart',
                description: 'Date part to add (e.g. "Y", "M", "D", "H")',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'DateAdd(date, interval, datePart)',
        example:
            'var future = Platform.Function.DateAdd(Platform.Function.Now(), 7, "D");\nWrite(future); // date 7 days from now',
    },
    {
        name: 'DateDiff',
        minArgs: 3,
        maxArgs: 3,
        description: 'Calculates the difference between two dates in a given interval.',
        params: [
            { name: 'date1', description: 'First date value', type: 'string' },
            { name: 'date2', description: 'Second date value', type: 'string' },
            {
                name: 'datePart',
                description: 'Date part for the interval (e.g. "Y", "M", "D", "H")',
                type: 'string',
            },
        ],
        returnType: 'number',
        syntax: 'DateDiff(date1, date2, datePart)',
        example:
            'var days = Platform.Function.DateDiff("2025-01-01", Platform.Function.Now(), "D");\nWrite(days); // days elapsed since Jan 1 2025',
    },
    {
        name: 'DateParse',
        minArgs: 1,
        maxArgs: 2,
        description: 'Converts a string representation to a date object.',
        params: [
            { name: 'dateString', description: 'String to parse as a date', type: 'string' },
            { name: 'format', description: 'Date format pattern', type: 'string', optional: true },
        ],
        returnType: 'object',
        syntax: 'DateParse(dateString[, format])',
        example:
            'var d = Platform.Function.DateParse("2025-08-05T12:00:00Z");\nWrite(Platform.Function.FormatDate(d, "MM/dd/yyyy")); // "08/05/2025"',
    },
    {
        name: 'Now',
        minArgs: 0,
        maxArgs: 1,
        description:
            'Returns the current system timestamp, or the timestamp of the triggering send when called with true.',
        params: [
            {
                name: 'useContextTime',
                description:
                    'When true, returns the time the triggering send or activity was initiated. When false or omitted, returns the current system clock time.',
                type: 'boolean',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Now([useContextTime])',
        example:
            'var current = Platform.Function.Now();\nWrite(current); // e.g. "8/5/2025 12:00:00 PM"\n\n// Use context time during triggered sends:\nvar sendTime = Platform.Function.Now(true);',
    },
    {
        name: 'FormatDate',
        minArgs: 2,
        maxArgs: 3,
        description: 'Formats a date value into a string with the specified pattern.',
        params: [
            { name: 'date', description: 'Date value to format', type: 'string' },
            { name: 'format', description: 'Date format pattern', type: 'string' },
            {
                name: 'locale',
                description: 'Locale for date formatting',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'FormatDate(date, format[, locale])',
        example:
            'var formatted = Platform.Function.FormatDate(Platform.Function.Now(), "MMMM d, yyyy");\nWrite(formatted); // e.g. "August 5, 2025"',
    },
    {
        name: 'SystemDateToLocalDate',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Converts a date-time value from Marketing Cloud system time (CST) to the local time of the account or user.',
        params: [
            {
                name: 'dateValue',
                description: 'Date-time string in system time (CST)',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'SystemDateToLocalDate(dateValue)',
        example:
            'var systemDate = Platform.Function.Now();\nvar localDate = Platform.Function.SystemDateToLocalDate(systemDate);\nWrite(localDate);',
    },
    {
        name: 'LocalDateToSystemDate',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Converts a date-time value from the local time of the account or user to Marketing Cloud system time (CST).',
        params: [
            {
                name: 'dateValue',
                description: 'Date-time string in local account/user time',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'LocalDateToSystemDate(dateValue)',
        example:
            'var localDate = "8/5/2025 12:00:00 PM";\nvar systemDate = Platform.Function.LocalDateToSystemDate(localDate);\nWrite(systemDate);',
    },
    {
        name: 'GetValue',
        minArgs: 1,
        maxArgs: 1,
        description: 'Retrieves the value of an AMPscript variable.',
        params: [
            { name: 'variableName', description: 'Name of the AMPscript variable', type: 'string' },
        ],
        returnType: 'string',
        syntax: 'GetValue(variableName)',
        example:
            '// Retrieve an AMPscript variable from within SSJS:\nvar sk = Platform.Function.GetValue("SubscriberKey");\nWrite(sk);',
    },
    {
        name: 'SetValue',
        minArgs: 2,
        maxArgs: 2,
        description: 'Assigns a value to an AMPscript variable.',
        params: [
            { name: 'variableName', description: 'Name of the AMPscript variable', type: 'string' },
            { name: 'value', description: 'Value to assign', type: 'string' },
        ],
        returnType: 'void',
        syntax: 'SetValue(variableName, value)',
        example:
            'Platform.Function.SetValue("greeting", "Hello from SSJS");\n// @greeting is now accessible in subsequent AMPscript blocks',
    },
    {
        name: 'GetQueryStringParameter',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Retrieves the value of a named query string parameter from the URL of the current CloudPages or landing page.',
        params: [
            {
                name: 'parameterName',
                description: 'Name of the query string parameter to retrieve',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'GetQueryStringParameter(parameterName)',
        example:
            '// Page URL: /mypage?email=jane@example.com\nvar email = Platform.Function.GetQueryStringParameter("email");\nWrite(email); // "jane@example.com"',
    },
    {
        name: 'RaiseError',
        minArgs: 1,
        maxArgs: 4,
        description:
            'Raises an error with an optional scope flag. ' +
            "When the second parameter is true, the error stops only the current recipient's send. " +
            'When false, the error halts the entire send job.',
        params: [
            {
                name: 'message',
                description: 'Error message describing what went wrong',
                type: 'string',
            },
            {
                name: 'currentRecipientOnly',
                description:
                    'When true, the error applies only to the current recipient. When false, the entire send job stops.',
                type: 'boolean',
                optional: true,
            },
            {
                name: 'errorCode',
                description: 'Short user-defined code identifying the error type',
                type: 'string',
                optional: true,
            },
            {
                name: 'errorNumber',
                description: 'User-defined numeric error code for reference',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'void',
        syntax: 'RaiseError(message[, currentRecipientOnly[, errorCode[, errorNumber]]])',
        example:
            'var status = Platform.Function.Lookup("MyDE", "Status", "Email", emailAddress);\nif (!status) {\n    Platform.Function.RaiseError("Subscriber not found", true, "NOT_FOUND", 404);\n}',
    },
    {
        name: 'Redirect',
        minArgs: 1,
        maxArgs: 2,
        description: 'Redirects the browser to a specified URL.',
        params: [
            { name: 'url', description: 'URL to redirect to', type: 'string' },
            {
                name: 'permanent',
                description: 'True for 301 permanent redirect',
                type: 'boolean',
                optional: true,
            },
        ],
        returnType: 'void',
        syntax: 'Redirect(url[, permanent])',
        example: 'Platform.Function.Redirect("https://www.example.com/thank-you");',
    },
    {
        name: 'CloudPagesURL',
        minArgs: 1,
        maxArgs: INF,
        description:
            'Builds an encrypted URL for a CloudPages landing page with optional parameters.',
        params: [
            {
                name: 'pageId',
                description: 'Page ID of the CloudPages landing page',
                type: 'number',
            },
            { name: 'param1', description: 'First parameter name', type: 'string', optional: true },
            {
                name: 'value1',
                description: 'First parameter value',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'CloudPagesURL(pageId[, param1, value1, ...])',
        example:
            'var url = Platform.Function.CloudPagesURL(123, "email", emailAddress, "sk", subscriberKey);\nWrite(\'<a href="\' + url + \'">Click here</a>\');',
    },
    {
        name: 'MicrositeURL',
        minArgs: 1,
        maxArgs: INF,
        description: 'Generates a tracking URL for a microsite page.',
        params: [
            { name: 'pageId', description: 'Page ID of the microsite page', type: 'number' },
            { name: 'param1', description: 'First parameter name', type: 'string', optional: true },
            {
                name: 'value1',
                description: 'First parameter value',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'MicrositeURL(pageId[, param1, value1, ...])',
        example:
            'var url = Platform.Function.MicrositeURL(456, "source", "email");\nWrite(\'<a href="\' + url + \'">Visit microsite</a>\');',
    },
    {
        name: 'GUID',
        minArgs: 0,
        maxArgs: 0,
        description: 'Generates a new globally unique identifier string.',
        params: [],
        returnType: 'string',
        syntax: 'GUID()',
        example:
            'var id = Platform.Function.GUID();\nWrite(id); // e.g. "550e8400-e29b-41d4-a716-446655440000"',
    },
    {
        name: 'Base64Encode',
        minArgs: 1,
        maxArgs: 2,
        description: 'Encodes a string value to Base64.',
        params: [
            { name: 'value', description: 'String to encode', type: 'string' },
            {
                name: 'encoding',
                description: 'Character encoding to use',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Base64Encode(value[, encoding])',
        example:
            'var encoded = Platform.Function.Base64Encode("username:password");\nWrite(encoded); // "dXNlcm5hbWU6cGFzc3dvcmQ="',
    },
    {
        name: 'Base64Decode',
        minArgs: 1,
        maxArgs: 2,
        description: 'Decodes a Base64-encoded string back to plain text.',
        params: [
            { name: 'value', description: 'Base64-encoded string to decode', type: 'string' },
            {
                name: 'encoding',
                description: 'Character encoding to use',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Base64Decode(value[, encoding])',
        example:
            'var decoded = Platform.Function.Base64Decode("dXNlcm5hbWU6cGFzc3dvcmQ=");\nWrite(decoded); // "username:password"',
    },
    {
        name: 'EncryptSymmetric',
        minArgs: 6,
        maxArgs: 8,
        description: 'Encrypts a string using symmetric encryption with a specified algorithm.',
        params: [
            { name: 'value', description: 'String to encrypt', type: 'string' },
            { name: 'algorithm', description: 'Encryption algorithm (e.g. "AES")', type: 'string' },
            {
                name: 'passwordKey',
                description: 'Key Management key name for the password',
                type: 'string',
            },
            { name: 'password', description: 'Encryption password', type: 'string' },
            {
                name: 'saltKey',
                description: 'Key Management key name for the salt',
                type: 'string',
            },
            { name: 'salt', description: 'Salt value', type: 'string' },
            {
                name: 'ivKey',
                description: 'Key Management key name for the initialization vector',
                type: 'string',
                optional: true,
            },
            {
                name: 'iv',
                description: 'Initialization vector value',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'EncryptSymmetric(value, algorithm, passwordKey, password, saltKey, salt[, ivKey, iv])',
        example:
            'var encrypted = Platform.Function.EncryptSymmetric("sensitive data", "AES", "", "myPassword", "", "mySalt");\nWrite(encrypted);',
    },
    {
        name: 'DecryptSymmetric',
        minArgs: 6,
        maxArgs: 8,
        description: 'Decrypts a symmetrically encrypted string.',
        params: [
            { name: 'value', description: 'Encrypted string to decrypt', type: 'string' },
            { name: 'algorithm', description: 'Encryption algorithm (e.g. "AES")', type: 'string' },
            {
                name: 'passwordKey',
                description: 'Key Management key name for the password',
                type: 'string',
            },
            { name: 'password', description: 'Encryption password', type: 'string' },
            {
                name: 'saltKey',
                description: 'Key Management key name for the salt',
                type: 'string',
            },
            { name: 'salt', description: 'Salt value', type: 'string' },
            {
                name: 'ivKey',
                description: 'Key Management key name for the initialization vector',
                type: 'string',
                optional: true,
            },
            {
                name: 'iv',
                description: 'Initialization vector value',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'DecryptSymmetric(value, algorithm, passwordKey, password, saltKey, salt[, ivKey, iv])',
        example:
            'var plain = Platform.Function.DecryptSymmetric(encryptedValue, "AES", "", "myPassword", "", "mySalt");\nWrite(plain);',
    },
    {
        name: 'SHA256',
        minArgs: 1,
        maxArgs: 2,
        description: 'Computes the SHA-256 hash of a string value.',
        params: [
            { name: 'value', description: 'String to hash', type: 'string' },
            { name: 'encoding', description: 'Output encoding', type: 'string', optional: true },
        ],
        returnType: 'string',
        syntax: 'SHA256(value[, encoding])',
        example: 'var hash = Platform.Function.SHA256(emailAddress);\nWrite(hash);',
    },
    {
        name: 'SHA512',
        minArgs: 1,
        maxArgs: 2,
        description: 'Computes the SHA-512 hash of a string value.',
        params: [
            { name: 'value', description: 'String to hash', type: 'string' },
            { name: 'encoding', description: 'Output encoding', type: 'string', optional: true },
        ],
        returnType: 'string',
        syntax: 'SHA512(value[, encoding])',
        example: 'var hash = Platform.Function.SHA512(emailAddress);\nWrite(hash);',
    },
    {
        name: 'MD5',
        minArgs: 1,
        maxArgs: 2,
        description: 'Computes the MD5 hash of a string value.',
        params: [
            { name: 'value', description: 'String to hash', type: 'string' },
            { name: 'encoding', description: 'Output encoding', type: 'string', optional: true },
        ],
        returnType: 'string',
        syntax: 'MD5(value[, encoding])',
        example: 'var hash = Platform.Function.MD5(emailAddress);\nWrite(hash);',
    },
    {
        name: 'IsEmailAddress',
        minArgs: 1,
        maxArgs: 1,
        description: 'Checks whether a string is a valid email address format.',
        params: [{ name: 'value', description: 'String to validate', type: 'string' }],
        returnType: 'boolean',
        syntax: 'IsEmailAddress(value)',
        example:
            'if (Platform.Function.IsEmailAddress(emailInput)) {\n    Write("Valid email");\n} else {\n    Write("Invalid email format");\n}',
    },
    {
        name: 'IsPhoneNumber',
        minArgs: 1,
        maxArgs: 1,
        description: 'Evaluates whether a string contains a valid phone number.',
        params: [{ name: 'value', description: 'String to evaluate', type: 'string' }],
        returnType: 'boolean',
        syntax: 'IsPhoneNumber(value)',
        example:
            'if (Platform.Function.IsPhoneNumber(phoneInput)) {\n    Write("Valid phone");\n} else {\n    Write("Invalid phone number");\n}',
    },
    {
        name: 'IsNull',
        minArgs: 1,
        maxArgs: 1,
        description: 'Checks whether a value is null.',
        params: [{ name: 'value', description: 'Value to check', type: 'any' }],
        returnType: 'boolean',
        syntax: 'IsNull(value)',
        example:
            'var phone = Platform.Function.Lookup("MyDE", "Phone", "Email", email);\nif (Platform.Function.IsNull(phone)) {\n    Write("No phone on record");\n}',
    },
    {
        name: 'Empty',
        minArgs: 1,
        maxArgs: 1,
        description: 'Checks whether a string value is null, empty, or whitespace.',
        params: [{ name: 'value', description: 'String to check', type: 'string' }],
        returnType: 'boolean',
        syntax: 'Empty(value)',
        example:
            'var city = Platform.Function.GetQueryStringParameter("city");\nif (Platform.Function.Empty(city)) {\n    city = "Unknown";\n}',
    },
    {
        name: 'IIf',
        minArgs: 3,
        maxArgs: 3,
        description: 'Returns one of two values based on a boolean condition.',
        params: [
            { name: 'condition', description: 'Boolean expression to evaluate', type: 'boolean' },
            { name: 'trueValue', description: 'Value returned if condition is true', type: 'any' },
            {
                name: 'falseValue',
                description: 'Value returned if condition is false',
                type: 'any',
            },
        ],
        returnType: 'any',
        syntax: 'IIf(condition, trueValue, falseValue)',
        example: 'var label = Platform.Function.IIf(score > 50, "Pass", "Fail");\nWrite(label);',
    },
    {
        name: 'DataExtensionRowCount',
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns the total number of rows in a Data Extension.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
        ],
        returnType: 'number',
        syntax: 'DataExtensionRowCount(deName)',
        example:
            'var count = Platform.Function.DataExtensionRowCount("MyDE");\nWrite("Total rows: " + count);',
    },
    {
        name: 'CreateObject',
        minArgs: 1,
        maxArgs: 1,
        description: 'Instantiates a Marketing Cloud SOAP API object.',
        params: [{ name: 'objectType', description: 'SOAP API object type name', type: 'string' }],
        returnType: 'object',
        syntax: 'CreateObject(objectType)',
        example:
            'var sub = Platform.Function.CreateObject("Subscriber");\nPlatform.Function.SetObjectProperty(sub, "EmailAddress", "jane@example.com");\nPlatform.Function.SetObjectProperty(sub, "SubscriberKey", "sk-123");',
    },
    {
        name: 'SetObjectProperty',
        minArgs: 3,
        maxArgs: 3,
        description: 'Assigns a property value on a SOAP API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            { name: 'propertyName', description: 'Property name to set', type: 'string' },
            { name: 'value', description: 'Value to assign', type: 'any' },
        ],
        returnType: 'void',
        syntax: 'SetObjectProperty(apiObject, propertyName, value)',
        example:
            'var sub = Platform.Function.CreateObject("Subscriber");\nPlatform.Function.SetObjectProperty(sub, "EmailAddress", "jane@example.com");',
    },
    {
        name: 'AddObjectArrayItem',
        minArgs: 3,
        maxArgs: 3,
        description: "Appends an item to a SOAP API object's array property.",
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            { name: 'propertyName', description: 'Array property name', type: 'string' },
            { name: 'value', description: 'Item to append', type: 'any' },
        ],
        returnType: 'void',
        syntax: 'AddObjectArrayItem(apiObject, propertyName, value)',
        example:
            'var ts = Platform.Function.CreateObject("TriggeredSend");\nPlatform.Function.AddObjectArrayItem(ts, "Subscribers", sub);',
    },
    {
        name: 'InvokeCreate',
        minArgs: 1,
        maxArgs: 4,
        description: 'Executes a SOAP API Create call on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'statusMessage',
                description: 'Variable to receive the status message',
                type: 'string',
                optional: true,
            },
            {
                name: 'errorCode',
                description: 'Variable to receive the error code',
                type: 'string',
                optional: true,
            },
            {
                name: 'requestId',
                description: 'Variable to receive the request ID',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'InvokeCreate(apiObject[, statusMessage, errorCode, requestId])',
        example:
            'var sub = Platform.Function.CreateObject("Subscriber");\nPlatform.Function.SetObjectProperty(sub, "EmailAddress", "jane@example.com");\nvar statusMsg = "";\nvar errorCode = "";\nvar status = Platform.Function.InvokeCreate(sub, statusMsg, errorCode);\nWrite(status); // "OK" or "Error"',
    },
    {
        name: 'InvokeUpdate',
        minArgs: 1,
        maxArgs: 4,
        description: 'Executes a SOAP API Update call on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'statusMessage',
                description: 'Variable to receive the status message',
                type: 'string',
                optional: true,
            },
            {
                name: 'errorCode',
                description: 'Variable to receive the error code',
                type: 'string',
                optional: true,
            },
            {
                name: 'requestId',
                description: 'Variable to receive the request ID',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'InvokeUpdate(apiObject[, statusMessage, errorCode, requestId])',
        example:
            'Platform.Function.SetObjectProperty(sub, "Status", "Unsubscribed");\nvar status = Platform.Function.InvokeUpdate(sub);\nWrite(status);',
    },
    {
        name: 'InvokeDelete',
        minArgs: 1,
        maxArgs: 4,
        description: 'Executes a SOAP API Delete call on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'statusMessage',
                description: 'Variable to receive the status message',
                type: 'string',
                optional: true,
            },
            {
                name: 'errorCode',
                description: 'Variable to receive the error code',
                type: 'string',
                optional: true,
            },
            {
                name: 'requestId',
                description: 'Variable to receive the request ID',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'InvokeDelete(apiObject[, statusMessage, errorCode, requestId])',
        example: 'var status = Platform.Function.InvokeDelete(sub);\nWrite(status);',
    },
    {
        name: 'InvokeRetrieve',
        minArgs: 3,
        maxArgs: 5,
        description: 'Executes a SOAP API Retrieve call.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'properties',
                description: 'Array of property names to retrieve',
                type: 'array',
            },
            {
                name: 'filter',
                description: 'Filter object for the retrieve',
                type: 'object',
                optional: true,
            },
            {
                name: 'statusMessage',
                description: 'Variable to receive the status message',
                type: 'string',
                optional: true,
            },
            {
                name: 'requestId',
                description: 'Variable to receive the request ID',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'InvokeRetrieve(apiObject, properties[, filter, statusMessage, requestId])',
        example:
            'var req = Platform.Function.CreateObject("RetrieveRequest");\nPlatform.Function.SetObjectProperty(req, "ObjectType", "Subscriber");\nvar props = ["EmailAddress", "Status"];\nvar results = Platform.Function.InvokeRetrieve(req, props);',
    },
    {
        name: 'InvokePerform',
        minArgs: 2,
        maxArgs: 4,
        description: 'Executes a SOAP API Perform action on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            { name: 'action', description: 'Action to perform', type: 'string' },
            {
                name: 'statusMessage',
                description: 'Variable to receive the status message',
                type: 'string',
                optional: true,
            },
            {
                name: 'errorCode',
                description: 'Variable to receive the error code',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'InvokePerform(apiObject, action[, statusMessage, errorCode])',
        example: 'var status = Platform.Function.InvokePerform(sendDef, "start");\nWrite(status);',
    },
    {
        name: 'InvokeConfigure',
        minArgs: 2,
        maxArgs: 4,
        description: 'Executes a SOAP API Configure call on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            { name: 'action', description: 'Configure action', type: 'string' },
            {
                name: 'statusMessage',
                description: 'Variable to receive the status message',
                type: 'string',
                optional: true,
            },
            {
                name: 'errorCode',
                description: 'Variable to receive the error code',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'InvokeConfigure(apiObject, action[, statusMessage, errorCode])',
        example:
            'var status = Platform.Function.InvokeConfigure(configObj, "create");\nWrite(status);',
    },
    {
        name: 'InvokeExecute',
        minArgs: 2,
        maxArgs: 4,
        description: 'Executes a SOAP API Execute call on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            { name: 'method', description: 'Execute method name', type: 'string' },
            {
                name: 'statusMessage',
                description: 'Variable to receive the status message',
                type: 'string',
                optional: true,
            },
            {
                name: 'errorCode',
                description: 'Variable to receive the error code',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'InvokeExecute(apiObject, method[, statusMessage, errorCode])',
        example:
            'var status = Platform.Function.InvokeExecute(execObj, "LogUnsubEvent");\nWrite(status);',
    },
    {
        name: 'InvokeExtract',
        minArgs: 2,
        maxArgs: 3,
        description: 'Invokes the Extract SOAP API method on the specified object.',
        params: [
            {
                name: 'apiObject',
                description: 'SOAP API object on which to invoke Extract',
                type: 'object',
            },
            {
                name: 'statusArray',
                description: 'Array that receives the status and RequestID of the API call',
                type: 'array',
            },
            {
                name: 'options',
                description: 'Additional API options; may be null',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'InvokeExtract(apiObject, statusArray[, options])',
        example:
            'var statusArr = [];\nvar result = Platform.Function.InvokeExtract(extractObj, statusArr);\nWrite(result);',
    },
    {
        name: 'InvokeSchedule',
        minArgs: 3,
        maxArgs: 5,
        description: 'Invokes the Schedule SOAP API method on the specified object.',
        params: [
            {
                name: 'apiObject',
                description: 'SOAP API object on which to invoke Schedule',
                type: 'object',
            },
            { name: 'action', description: 'Action to perform on the object', type: 'string' },
            { name: 'schedule', description: 'Schedule definition object', type: 'object' },
            {
                name: 'statusArray',
                description: 'Array that receives the status and RequestID of the API call',
                type: 'array',
                optional: true,
            },
            {
                name: 'options',
                description: 'Additional API options; may be null',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'InvokeSchedule(apiObject, action, schedule[, statusArray, options])',
        example:
            'var statusArr = [];\nvar result = Platform.Function.InvokeSchedule(sendDef, "start", scheduleDef, statusArr);\nWrite(result);',
    },
    {
        name: 'AttributeValue',
        minArgs: 1,
        maxArgs: 1,
        description: 'Safely retrieves a subscriber attribute value, returning null if not found.',
        params: [
            {
                name: 'attributeName',
                description: 'Name of the subscriber attribute',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'AttributeValue(attributeName)',
        example:
            'var phone = Platform.Function.AttributeValue("MobilePhone");\nif (phone) { Write(phone); }',
    },
    {
        name: 'HTTPGet',
        minArgs: 1,
        maxArgs: 3,
        description: 'Performs an HTTP GET request and returns the response body.',
        params: [
            { name: 'url', description: 'URL to request', type: 'string' },
            {
                name: 'headerNames',
                description: 'Array of header names',
                type: 'array',
                optional: true,
            },
            {
                name: 'headerValues',
                description: 'Array of header values',
                type: 'array',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'HTTPGet(url[, headerNames, headerValues])',
        example:
            'var headerNames = ["Authorization"];\n' +
            'var headerValues = ["Bearer " + accessToken];\n' +
            'var responseBody = Platform.Function.HTTPGet("https://api.example.com/data", headerNames, headerValues);\n' +
            'var obj = Platform.Function.ParseJSON(responseBody);',
    },
    {
        name: 'HTTPPost',
        minArgs: 3,
        maxArgs: 5,
        description: 'Performs an HTTP POST request with a content type and payload.',
        params: [
            { name: 'url', description: 'URL to post to', type: 'string' },
            { name: 'contentType', description: 'MIME type of the request body', type: 'string' },
            { name: 'payload', description: 'Request body content', type: 'string' },
            {
                name: 'headerNames',
                description: 'Array of header names',
                type: 'array',
                optional: true,
            },
            {
                name: 'headerValues',
                description: 'Array of header values',
                type: 'array',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'HTTPPost(url, contentType, payload[, headerNames, headerValues])',
        example:
            'var payload = Stringify({ name: "Jane", status: "active" });\n' +
            'var headerNames = ["Authorization"];\n' +
            'var headerValues = ["Bearer " + accessToken];\n' +
            'var response = Platform.Function.HTTPPost(\n' +
            '    "https://api.example.com/items",\n' +
            '    "application/json",\n' +
            '    payload,\n' +
            '    headerNames,\n' +
            '    headerValues\n' +
            ');',
    },
    {
        name: 'HTTPRequestHeader',
        minArgs: 1,
        maxArgs: 1,
        description: 'Retrieves the value of an HTTP request header.',
        params: [
            { name: 'headerName', description: 'Name of the HTTP request header', type: 'string' },
        ],
        returnType: 'string',
        syntax: 'HTTPRequestHeader(headerName)',
        example:
            'var auth = Platform.Function.HTTPRequestHeader("Authorization");\nWrite(auth); // e.g. "Bearer abc123"',
    },
    {
        name: 'ParseJSON',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Parses a JSON-formatted string and returns the resulting JavaScript object. ' +
            'SFMC-native equivalent of JSON.parse(), which is not available in the legacy SSJS engine.',
        params: [
            {
                name: 'jsonString',
                description: 'A valid JSON-formatted string to parse',
                type: 'string',
            },
        ],
        returnType: 'object',
        syntax: 'ParseJSON(jsonString)',
        example:
            'var jsonString = \'{"name":"Jane","age":30}\';\n' +
            'var obj = Platform.Function.ParseJSON(jsonString);\n' +
            'Write(obj.name); // outputs: Jane\n\n' +
            '// Use String() to convert CLR response content before parsing:\n' +
            'var req = new Script.Util.HttpRequest("https://api.example.com/data");\n' +
            'req.method = "GET";\n' +
            'var resp = req.send();\n' +
            'var result = Platform.Function.ParseJSON(String(resp.content));',
    },
    {
        name: 'URLEncode',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Encodes a string value so that it can be safely used as a URL query parameter or path component.',
        params: [{ name: 'value', description: 'The string value to URL-encode', type: 'string' }],
        returnType: 'string',
        syntax: 'URLEncode(value)',
        example:
            'var param = "hello world & more";\nvar encoded = Platform.Function.URLEncode(param);\nWrite("?q=" + encoded); // "?q=hello+world+%26+more"',
    },
];

export const platformFunctionLookup = new Map(
    PLATFORM_FUNCTIONS.map((f) => [f.name.toLowerCase(), f]),
);

export const platformFunctionNames = new Set(PLATFORM_FUNCTIONS.map((f) => f.name.toLowerCase()));

// ── Core library objects ─────────────────────────────────────────────────────
// Objects that require Platform.Load("core", "1") before use.
// Each has standard CRUD methods plus object-specific extras.

const STANDARD_METHODS = ['Init', 'Add', 'Remove', 'Update', 'Retrieve'];

/** @type {{name: string, methods: string[], description: string}[]} */
export const CORE_LIBRARY_OBJECTS = [
    {
        name: 'DataExtension',
        methods: [...STANDARD_METHODS, 'Fields', 'Rows'],
        description: 'Manages Data Extension definitions and their field schemas.',
    },
    {
        name: 'DataExtension.Fields',
        methods: ['Init', 'Retrieve'],
        description: 'Accesses field definitions within a Data Extension.',
    },
    {
        name: 'DataExtension.Rows',
        methods: ['Init', 'Add', 'Remove', 'Update', 'Retrieve', 'Lookup'],
        description:
            'Manages individual rows within a Data Extension. ' +
            'CAVEAT: Rows.Retrieve() does NOT work on CloudPages. ' +
            'The filter parameter is required despite the documentation saying it is optional.',
    },
    {
        name: 'Subscriber',
        methods: [...STANDARD_METHODS, 'Unsubscribe', 'Upsert', 'Statistics'],
        description: 'Manages subscriber records in the account.',
    },
    {
        name: 'Email',
        methods: STANDARD_METHODS,
        description: 'Manages email message definitions.',
    },
    {
        name: 'TriggeredSend',
        methods: [...STANDARD_METHODS, 'Send', 'Pause', 'Publish', 'Start'],
        description: 'Manages triggered send definitions and fires individual sends.',
    },
    {
        name: 'TriggeredSend.Tracking',
        methods: ['Retrieve'],
        description: 'Retrieves tracking data for a specific triggered send.',
    },
    {
        name: 'List',
        methods: [...STANDARD_METHODS, 'Subscribers'],
        description: 'Manages subscriber lists.',
    },
    {
        name: 'List.Subscribers',
        methods: ['Init', 'Add', 'Remove', 'Update', 'Upsert', 'Retrieve'],
        description: 'Manages the subscribers belonging to a specific list.',
    },
    {
        name: 'List.Subscribers.Tracking',
        methods: ['Retrieve'],
        description: 'Retrieves tracking data for subscribers on a specific list.',
    },
    {
        name: 'ContentArea',
        methods: STANDARD_METHODS,
        description: 'Manages classic content area objects.',
    },
    {
        name: 'Folder',
        methods: STANDARD_METHODS,
        description: 'Manages folder structures within the Marketing Cloud account.',
    },
    {
        name: 'QueryDefinition',
        methods: [...STANDARD_METHODS, 'Perform'],
        description: 'Manages SQL query activity definitions.',
    },
    {
        name: 'Send',
        methods: [...STANDARD_METHODS, 'CancelSend'],
        description: 'Manages email send definitions.',
    },
    {
        name: 'Send.Tracking',
        methods: ['Retrieve'],
        description: 'Retrieves tracking data for a specific send.',
    },
    {
        name: 'SendDefinition',
        methods: [...STANDARD_METHODS, 'Send'],
        description:
            'Manages reusable Send Definition configurations that define all parameters for a send including content, audience, and delivery settings.',
    },
    {
        name: 'Template',
        methods: STANDARD_METHODS,
        description: 'Manages email template definitions.',
    },
    {
        name: 'DeliveryProfile',
        methods: STANDARD_METHODS,
        description: 'Manages delivery profile configurations.',
    },
    {
        name: 'SenderProfile',
        methods: STANDARD_METHODS,
        description: 'Manages sender profile definitions.',
    },
    {
        name: 'SendClassification',
        methods: STANDARD_METHODS,
        description: 'Manages send classification settings.',
    },
    {
        name: 'FilterDefinition',
        methods: STANDARD_METHODS,
        description: 'Manages data filter definitions.',
    },
    {
        name: 'Account',
        methods: STANDARD_METHODS,
        description: 'Manages Marketing Cloud account settings.',
    },
    {
        name: 'AccountUser',
        methods: [...STANDARD_METHODS, 'Activate', 'Deactivate'],
        description: 'Manages user accounts within the Marketing Cloud business unit.',
    },
    {
        name: 'Account.Tracking',
        methods: ['Retrieve'],
        description: 'Retrieves tracking data associated with account-level sends.',
    },
    {
        name: 'Portfolio',
        methods: STANDARD_METHODS,
        description: 'Manages portfolio (file) items in the account.',
    },
    {
        name: 'BounceEvent',
        methods: ['Retrieve'],
        description: 'Retrieves bounce event data for message sends.',
    },
    {
        name: 'ClickEvent',
        methods: ['Retrieve'],
        description: 'Retrieves click tracking event data for message sends.',
    },
    {
        name: 'ForwardedEmailEvent',
        methods: ['Retrieve'],
        description: 'Retrieves forwarded email event data for message sends.',
    },
    {
        name: 'ForwardedEmailOptInEvent',
        methods: ['Retrieve'],
        description: 'Retrieves forwarded email opt-in event data for message sends.',
    },
    {
        name: 'NotSentEvent',
        methods: ['Retrieve'],
        description: 'Retrieves not-sent event data for message sends.',
    },
    {
        name: 'OpenEvent',
        methods: ['Retrieve'],
        description: 'Retrieves open tracking event data for message sends.',
    },
    {
        name: 'SentEvent',
        methods: ['Retrieve'],
        description: 'Retrieves sent event data for message sends.',
    },
    {
        name: 'SurveyEvent',
        methods: ['Retrieve'],
        description: 'Retrieves survey response event data for message sends.',
    },
    {
        name: 'UnsubEvent',
        methods: ['Retrieve'],
        description: 'Retrieves unsubscribe event data for message sends.',
    },
];

export const coreObjectNames = new Set(CORE_LIBRARY_OBJECTS.map((o) => o.name));

export const coreObjectLookup = new Map(CORE_LIBRARY_OBJECTS.map((o) => [o.name, o]));

// ── HTTP object methods ──────────────────────────────────────────────────────

/** @type {{name: string, minArgs: number, maxArgs: number, description: string, params?: {name: string, description: string, type?: string, optional?: boolean}[], returnType?: string, syntax?: string}[]} */
export const HTTP_METHODS = [
    {
        name: 'Get',
        minArgs: 1,
        maxArgs: 3,
        description: 'Performs an HTTP GET request returning the response body.',
        params: [
            { name: 'url', description: 'URL to request', type: 'string' },
            {
                name: 'headerNames',
                description: 'Array of header names',
                type: 'array',
                optional: true,
            },
            {
                name: 'headerValues',
                description: 'Array of header values',
                type: 'array',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'HTTP.Get(url[, headerNames, headerValues])',
        example:
            'var body = HTTP.Get("https://api.example.com/data");\nvar obj = Platform.Function.ParseJSON(String(body));',
    },
    {
        name: 'Post',
        minArgs: 3,
        maxArgs: 5,
        description: 'Performs an HTTP POST request with a content type and payload.',
        params: [
            { name: 'url', description: 'URL to post to', type: 'string' },
            { name: 'contentType', description: 'MIME type of the request body', type: 'string' },
            { name: 'payload', description: 'Request body content', type: 'string' },
            {
                name: 'headerNames',
                description: 'Array of header names',
                type: 'array',
                optional: true,
            },
            {
                name: 'headerValues',
                description: 'Array of header values',
                type: 'array',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'HTTP.Post(url, contentType, payload[, headerNames, headerValues])',
        example:
            'var payload = Stringify({ email: "jane@example.com" });\nvar response = HTTP.Post("https://api.example.com/items", "application/json", payload);',
    },
    {
        name: 'GetRequest',
        minArgs: 0,
        maxArgs: 0,
        description: 'Returns the HTTP request object for the current page invocation.',
        params: [],
        returnType: 'object',
        syntax: 'HTTP.GetRequest()',
        example: 'var req = HTTP.GetRequest();\nWrite(req.Method); // "GET"',
    },
    {
        name: 'PostRequest',
        minArgs: 0,
        maxArgs: 0,
        description: 'Returns the HTTP post data for the current page invocation.',
        params: [],
        returnType: 'object',
        syntax: 'HTTP.PostRequest()',
        example:
            'var postBody = HTTP.PostRequest();\nvar data = Platform.Function.ParseJSON(String(postBody));',
    },
];

export const httpMethodNames = new Set(HTTP_METHODS.map((m) => m.name.toLowerCase()));

// ── WSProxy methods ──────────────────────────────────────────────────────────

/** @type {{name: string, minArgs: number, maxArgs: number, description: string, params?: {name: string, description: string, type?: string, optional?: boolean}[], returnType?: string, syntax?: string}[]} */
export const WSPROXY_METHODS = [
    {
        name: 'createItem',
        minArgs: 2,
        maxArgs: 2,
        description: 'Creates a new Marketing Cloud object via the SOAP API.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            { name: 'properties', description: 'Object properties to set', type: 'object' },
        ],
        returnType: 'object',
        syntax: 'api.createItem(objectType, properties)',
        example:
            'var api = new WSProxy();\n' +
            'var result = api.createItem("DataExtensionObject", {\n' +
            '    CustomerKey: "MyDE",\n' +
            '    Properties: { Property: [{ Name: "Email", Value: "jane@example.com" }] }\n' +
            '});\n' +
            'if (result.Status === "OK") { Write("Created"); }',
    },
    {
        name: 'updateItem',
        minArgs: 2,
        maxArgs: 2,
        description: 'Updates an existing Marketing Cloud object via the SOAP API.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            { name: 'properties', description: 'Object properties to update', type: 'object' },
        ],
        returnType: 'object',
        syntax: 'api.updateItem(objectType, properties)',
        example:
            'var api = new WSProxy();\n' +
            'var result = api.updateItem("DataExtensionObject", {\n' +
            '    CustomerKey: "MyDE",\n' +
            '    Properties: { Property: [{ Name: "Status", Value: "inactive" }] }\n' +
            '});\n' +
            'if (result.Status === "OK") { Write("Updated"); }',
    },
    {
        name: 'deleteItem',
        minArgs: 2,
        maxArgs: 2,
        description: 'Deletes a Marketing Cloud object via the SOAP API.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            {
                name: 'properties',
                description: 'Object properties identifying the item to delete',
                type: 'object',
            },
        ],
        returnType: 'object',
        syntax: 'api.deleteItem(objectType, properties)',
        example:
            'var api = new WSProxy();\n' +
            'var result = api.deleteItem("DataExtensionObject", {\n' +
            '    CustomerKey: "MyDE",\n' +
            '    Keys: { Key: [{ Name: "Email", Value: "jane@example.com" }] }\n' +
            '});\n' +
            'if (result.Status === "OK") { Write("Deleted"); }',
    },
    {
        name: 'retrieve',
        minArgs: 2,
        maxArgs: 5,
        description:
            'Retrieves Marketing Cloud objects matching an optional filter via the SOAP API. The third parameter is a simple or complex filter; the fourth sets RetrieveOptions; the fifth sets additional request properties such as QueryAllAccounts.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            { name: 'columns', description: 'Array of property names to retrieve', type: 'array' },
            {
                name: 'filter',
                description: 'Simple or complex filter object',
                type: 'object',
                optional: true,
            },
            {
                name: 'retrieveOptions',
                description: 'Properties to set on the SOAP RetrieveOptions object',
                type: 'object',
                optional: true,
            },
            {
                name: 'requestProps',
                description: 'Additional request properties (e.g. QueryAllAccounts)',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'api.retrieve(objectType, columns[, filter[, retrieveOptions[, requestProps]]])',
        example:
            'var api = new WSProxy();\n' +
            'var cols = ["Name", "CustomerKey", "Status"];\n' +
            'var filter = {\n' +
            '    Property: "Status",\n' +
            '    SimpleOperator: "equals",\n' +
            '    Value: "Active"\n' +
            '};\n' +
            'var result = api.retrieve("DataExtension", cols, filter);\n' +
            'if (result.Status === "OK") {\n' +
            '    var rows = result.Results;\n' +
            '    for (var i = 0; i < rows.length; i++) {\n' +
            '        Write(rows[i].Name + "<br>");\n' +
            '    }\n' +
            '}',
    },
    {
        name: 'getNextBatch',
        minArgs: 2,
        maxArgs: 2,
        description:
            'Retrieves the next page of results from a previous retrieve call that returned HasMoreRows = true.',
        params: [
            {
                name: 'objectType',
                description: 'SOAP API object type name used in the original retrieve call',
                type: 'string',
            },
            {
                name: 'requestId',
                description: 'RequestID returned by the previous retrieve response',
                type: 'string',
            },
        ],
        returnType: 'object',
        syntax: 'api.getNextBatch(objectType, requestId)',
        example:
            'var api = new WSProxy();\n' +
            'var result = api.retrieve("DataExtension", ["Name"], {});\n' +
            'while (result.HasMoreRows) {\n' +
            '    result = api.getNextBatch("DataExtension", result.RequestID);\n' +
            '    for (var i = 0; i < result.Results.length; i++) {\n' +
            '        Write(result.Results[i].Name + "<br>");\n' +
            '    }\n' +
            '}',
    },
    {
        name: 'performItem',
        minArgs: 3,
        maxArgs: 3,
        description: 'Executes a perform action on a Marketing Cloud object.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            {
                name: 'action',
                description: 'Action to perform (e.g. "start", "stop")',
                type: 'string',
            },
            { name: 'properties', description: 'Object properties for the action', type: 'object' },
        ],
        returnType: 'object',
        syntax: 'api.performItem(objectType, action, properties)',
        example:
            'var api = new WSProxy();\nvar result = api.performItem("QueryDefinition", "start", { ObjectID: queryObjectId });\nWrite(result.Status);',
    },
    {
        name: 'performBatch',
        minArgs: 3,
        maxArgs: 4,
        description:
            'Executes a perform action on multiple Marketing Cloud objects in a single SOAP API call.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            {
                name: 'propertiesArray',
                description: 'Array of property objects for the action',
                type: 'array',
            },
            { name: 'verb', description: 'Action verb to execute (e.g. "start")', type: 'string' },
            {
                name: 'performOptions',
                description: 'Properties of the SOAP PerformOptions object',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'api.performBatch(objectType, propertiesArray, verb[, performOptions])',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var items = [{ ObjectID: id1 }, { ObjectID: id2 }];\n' +
            'var result = api.performBatch("QueryDefinition", items, "start");\n' +
            'Write(result.Status);',
    },
    {
        name: 'describe',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns structural metadata (ObjectDefinition) for one or more SOAP API object types.',
        params: [
            {
                name: 'objectType',
                description: 'Object type name or array of type names to describe',
                type: 'string',
            },
        ],
        returnType: 'object',
        syntax: 'api.describe(objectType)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var result = api.describe("DataExtension");\n' +
            'Write(Stringify(result.Results));',
    },
    {
        name: 'execute',
        minArgs: 2,
        maxArgs: 2,
        description: 'Executes a named method on a Marketing Cloud object.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            { name: 'method', description: 'Method name to execute', type: 'string' },
        ],
        returnType: 'object',
        syntax: 'api.execute(objectType, method)',
        example:
            'var api = new WSProxy();\nvar result = api.execute("DataExtensionObject", "clearData");\nWrite(result.Status);',
    },
    {
        name: 'setBatchSize',
        minArgs: 1,
        maxArgs: 1,
        description: 'Sets the maximum number of objects per SOAP API batch.',
        params: [
            {
                name: 'batchSize',
                description: 'Maximum number of objects per batch',
                type: 'number',
            },
        ],
        returnType: 'void',
        syntax: 'api.setBatchSize(batchSize)',
        example:
            'var api = new WSProxy();\napi.setBatchSize(200); // default is 2500\nvar result = api.retrieve("DataExtension", ["Name"], {});',
    },
    {
        name: 'setClientId',
        minArgs: 1,
        maxArgs: 1,
        description: 'Sets the business unit MID for cross-account operations.',
        params: [
            {
                name: 'clientId',
                description: 'Object containing the MID of the target business unit',
                type: 'object',
            },
        ],
        returnType: 'void',
        syntax: 'api.setClientId(clientId)',
        example:
            'var api = new WSProxy();\n' +
            'api.setClientId({ ID: 12345 }); // target child BU by MID\n' +
            'var result = api.retrieve("DataExtension", ["Name"], {});',
    },
    {
        name: 'resetClientIds',
        minArgs: 0,
        maxArgs: 0,
        description:
            'Clears all client IDs set on the WSProxy instance, reverting to the default execution context credentials.',
        params: [],
        returnType: 'void',
        syntax: 'api.resetClientIds()',
        example:
            'var api = new WSProxy();\n' +
            'api.setClientId({ ID: 12345 });\n' +
            '// ... perform cross-BU operations ...\n' +
            'api.resetClientIds(); // revert to default context\n' +
            'var result = api.retrieve("DataExtension", ["Name"], {});',
    },
    {
        name: 'createBatch',
        minArgs: 2,
        maxArgs: 2,
        description: 'Creates multiple Marketing Cloud objects in a single SOAP API call.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            {
                name: 'propertiesArray',
                description: 'Array of property objects to create',
                type: 'array',
            },
        ],
        returnType: 'object',
        syntax: 'api.createBatch(objectType, propertiesArray)',
        example:
            'var api = new WSProxy();\nvar items = [\n    { CustomerKey: "MyDE", Properties: { Property: [{ Name: "Email", Value: "a@example.com" }] } },\n    { CustomerKey: "MyDE", Properties: { Property: [{ Name: "Email", Value: "b@example.com" }] } }\n];\nvar result = api.createBatch("DataExtensionObject", items);\nWrite(result.Status);',
    },
    {
        name: 'updateBatch',
        minArgs: 2,
        maxArgs: 2,
        description: 'Updates multiple Marketing Cloud objects in a single SOAP API call.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            {
                name: 'propertiesArray',
                description: 'Array of property objects to update',
                type: 'array',
            },
        ],
        returnType: 'object',
        syntax: 'api.updateBatch(objectType, propertiesArray)',
        example:
            'var api = new WSProxy();\nvar items = [\n    { CustomerKey: "MyDE", Keys: { Key: [{ Name: "Email", Value: "a@example.com" }] }, Properties: { Property: [{ Name: "Status", Value: "active" }] } }\n];\nvar result = api.updateBatch("DataExtensionObject", items);\nWrite(result.Status);',
    },
    {
        name: 'deleteBatch',
        minArgs: 2,
        maxArgs: 2,
        description: 'Deletes multiple Marketing Cloud objects in a single SOAP API call.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            {
                name: 'propertiesArray',
                description: 'Array of property objects to delete',
                type: 'array',
            },
        ],
        returnType: 'object',
        syntax: 'api.deleteBatch(objectType, propertiesArray)',
        example:
            'var api = new WSProxy();\nvar items = [\n    { CustomerKey: "MyDE", Keys: { Key: [{ Name: "Email", Value: "old@example.com" }] } }\n];\nvar result = api.deleteBatch("DataExtensionObject", items);\nWrite(result.Status);',
    },
];

export const wsproxyMethodNames = new Set(WSPROXY_METHODS.map((m) => m.name.toLowerCase()));

// ── Platform.Variable / Platform.Response / Platform.Request ─────────────────

export const PLATFORM_VARIABLE_METHODS = [
    {
        name: 'GetValue',
        minArgs: 1,
        maxArgs: 1,
        description: 'Retrieves the value of an AMPscript variable from the SSJS context.',
        params: [
            { name: 'variableName', description: 'Name of the AMPscript variable', type: 'string' },
        ],
        returnType: 'string',
        syntax: 'Variable.GetValue(variableName)',
        example: 'var sk = Variable.GetValue("SubscriberKey");\nWrite(sk);',
    },
    {
        name: 'SetValue',
        minArgs: 2,
        maxArgs: 2,
        description: 'Assigns a value to an AMPscript variable from the SSJS context.',
        params: [
            { name: 'variableName', description: 'Name of the AMPscript variable', type: 'string' },
            { name: 'value', description: 'Value to assign', type: 'string' },
        ],
        returnType: 'void',
        syntax: 'Variable.SetValue(variableName, value)',
        example:
            'Variable.SetValue("greeting", "Hello from SSJS");\n// @greeting is now available in subsequent AMPscript blocks',
    },
];

export const PLATFORM_RESPONSE_METHODS = [
    {
        name: 'GetResponseHeader',
        minArgs: 1,
        maxArgs: 1,
        description: 'Gets the value of a response header.',
        params: [
            { name: 'headerName', description: 'Name of the response header', type: 'string' },
        ],
        returnType: 'string',
        syntax: 'Platform.Response.GetResponseHeader(headerName)',
        example:
            'var contentType = Platform.Response.GetResponseHeader("Content-Type");\nWrite(contentType);',
    },
    {
        name: 'SetResponseHeader',
        minArgs: 2,
        maxArgs: 2,
        description: 'Sets a response header on the current page response.',
        params: [
            { name: 'headerName', description: 'Name of the response header', type: 'string' },
            { name: 'value', description: 'Value for the response header', type: 'string' },
        ],
        returnType: 'void',
        syntax: 'Platform.Response.SetResponseHeader(headerName, value)',
        example:
            'Platform.Response.SetResponseHeader("Content-Type", "application/json");\nPlatform.Response.Write(Stringify({ status: "ok" }));',
    },
    {
        name: 'Redirect',
        minArgs: 1,
        maxArgs: 2,
        description:
            'Redirects the current page to a new URL. ' +
            'Second parameter: false (default) = 302 temporary redirect, true = 301 permanent redirect.',
        params: [
            { name: 'url', description: 'URL to redirect to', type: 'string' },
            {
                name: 'permanent',
                description: 'True for 301 permanent redirect, false for 302 temporary',
                type: 'boolean',
                optional: true,
            },
        ],
        returnType: 'void',
        syntax: 'Platform.Response.Redirect(url[, permanent])',
        example: 'Platform.Response.Redirect("https://pub.pages.example.com/thank-you");',
    },
    {
        name: 'Write',
        minArgs: 1,
        maxArgs: 1,
        description: 'Writes content to the page response output.',
        params: [
            {
                name: 'content',
                description: 'Content string to write to the response',
                type: 'string',
            },
        ],
        returnType: 'void',
        syntax: 'Platform.Response.Write(content)',
        example:
            'var data = { name: "Jane", status: "active" };\nPlatform.Response.Write(Stringify(data));',
    },
];

export const PLATFORM_REQUEST_METHODS = [
    {
        name: 'GetQueryStringParameter',
        minArgs: 1,
        maxArgs: 1,
        description: 'Retrieves the value of a URL query string parameter.',
        params: [
            {
                name: 'parameterName',
                description: 'Name of the query string parameter',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Request.GetQueryStringParameter(parameterName)',
        example:
            '// Page URL: /mypage?email=jane@example.com\nvar email = Platform.Request.GetQueryStringParameter("email");\nWrite(email);',
    },
    {
        name: 'GetFormData',
        minArgs: 1,
        maxArgs: 1,
        description: 'Retrieves a named value from submitted form data.',
        params: [{ name: 'fieldName', description: 'Name of the form field', type: 'string' }],
        returnType: 'string',
        syntax: 'Platform.Request.GetFormData(fieldName)',
        example:
            'var firstName = Platform.Request.GetFormData("firstName");\nWrite("Hello, " + firstName + "!");',
    },
    {
        name: 'GetFormField',
        minArgs: 1,
        maxArgs: 1,
        description: 'Retrieves data from a named form field, including values sent via POST.',
        params: [
            { name: 'name', description: 'Name of the form field to retrieve', type: 'string' },
        ],
        returnType: 'string',
        syntax: 'Platform.Request.GetFormField(name)',
        example: 'var email = Platform.Request.GetFormField("emailAddress");\nWrite(email);',
    },
    {
        name: 'GetPostData',
        minArgs: 0,
        maxArgs: 1,
        description:
            'Returns the raw body of the HTTP POST request. ' +
            'CAVEAT: Only returns data on the FIRST call per request; subsequent calls return nothing. ' +
            'Store the result in a variable if you need it multiple times.',
        params: [
            {
                name: 'encoding',
                description: 'Character encoding for the post data',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Request.GetPostData([encoding])',
        example:
            '// Read raw POST body once and store it:\nvar rawBody = Platform.Request.GetPostData();\nvar payload = Platform.Function.ParseJSON(rawBody);',
    },
    {
        name: 'HasSSL',
        minArgs: 0,
        maxArgs: 0,
        description: 'Returns true if the current request was made over HTTPS.',
        params: [],
        returnType: 'boolean',
        syntax: 'Platform.Request.HasSSL()',
        example:
            'if (Platform.Request.HasSSL()) {\n    Write("Secure connection");\n} else {\n    Platform.Response.Redirect("https://" + Platform.Request.RequestURL());\n}',
    },
    {
        name: 'Method',
        minArgs: 0,
        maxArgs: 0,
        description: 'Returns the HTTP method (GET, POST, etc.) of the current request.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Request.Method()',
        example:
            'var method = Platform.Request.Method();\nif (method === "POST") {\n    var body = Platform.Request.GetPostData();\n    // handle POST\n}',
    },
    {
        name: 'RequestURL',
        minArgs: 0,
        maxArgs: 0,
        description: 'Returns the full URL of the current page request.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Request.RequestURL()',
        example: 'var url = Platform.Request.RequestURL();\nWrite("Current page: " + url);',
    },
    {
        name: 'GetCookieValue',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Retrieves the value of a named cookie from the HTTP request sent by the client browser.',
        params: [
            { name: 'cookieName', description: 'Name of the cookie to retrieve', type: 'string' },
        ],
        returnType: 'string',
        syntax: 'Platform.Request.GetCookieValue(cookieName)',
        example:
            'var sessionId = Platform.Request.GetCookieValue("sessionId");\nif (sessionId) { Write("Session: " + sessionId); }',
    },
    {
        name: 'GetUserLanguages',
        minArgs: 0,
        maxArgs: 0,
        description:
            'Returns the language preferences of the client browser as specified in the HTTP Accept-Language request header.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Request.GetUserLanguages()',
        example:
            'var lang = Platform.Request.GetUserLanguages();\nWrite(lang); // e.g. "en-US,en;q=0.9"',
    },
];

// ── Platform.ClientBrowser methods ──────────────────────────────────────────

export const PLATFORM_CLIENT_BROWSER_METHODS = [
    {
        name: 'Redirect',
        minArgs: 1,
        maxArgs: 1,
        description: 'Redirects the client browser to a specified URL.',
        params: [
            {
                name: 'url',
                description: 'The URL to redirect the client browser to',
                type: 'string',
            },
        ],
        returnType: 'void',
        syntax: 'Platform.ClientBrowser.Redirect(url)',
        example: 'Platform.ClientBrowser.Redirect("https://www.example.com/landing");',
    },
    {
        name: 'Write',
        minArgs: 1,
        maxArgs: 1,
        description: 'Writes content directly to the HTTP response sent to the client browser.',
        params: [
            {
                name: 'content',
                description: 'The string content to write to the response output',
                type: 'string',
            },
        ],
        returnType: 'void',
        syntax: 'Platform.ClientBrowser.Write(content)',
        example: 'Platform.ClientBrowser.Write("<h1>Hello, World!</h1>");',
    },
    {
        name: 'SetCookie',
        minArgs: 2,
        maxArgs: 6,
        description: 'Sets a cookie on the client browser response.',
        params: [
            { name: 'name', description: 'Name of the cookie to set', type: 'string' },
            { name: 'value', description: 'Value to store in the cookie', type: 'string' },
            {
                name: 'expires',
                description: 'Expiration date/time for the cookie',
                type: 'string',
                optional: true,
            },
            {
                name: 'path',
                description: 'URL path for which the cookie is valid',
                type: 'string',
                optional: true,
            },
            {
                name: 'domain',
                description: 'Domain for which the cookie is valid',
                type: 'string',
                optional: true,
            },
            {
                name: 'secure',
                description: 'If true, the cookie is only sent over HTTPS',
                type: 'boolean',
                optional: true,
            },
        ],
        returnType: 'void',
        syntax: 'Platform.ClientBrowser.SetCookie(name, value[, expires, path, domain, secure])',
        example:
            'Platform.ClientBrowser.SetCookie("userId", subscriberKey, "12/31/2025", "/", ".example.com", true);',
    },
    {
        name: 'RemoveCookie',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Removes a cookie from the client browser by setting its expiration to a past date.',
        params: [{ name: 'name', description: 'Name of the cookie to remove', type: 'string' }],
        returnType: 'void',
        syntax: 'Platform.ClientBrowser.RemoveCookie(name)',
        example: 'Platform.ClientBrowser.RemoveCookie("userId");',
    },
    {
        name: 'SetResponseHeader',
        minArgs: 2,
        maxArgs: 2,
        description:
            'Sets a custom HTTP response header on the response sent to the client browser.',
        params: [
            {
                name: 'headerName',
                description: 'Name of the HTTP response header to set',
                type: 'string',
            },
            {
                name: 'value',
                description: 'Value to assign to the response header',
                type: 'string',
            },
        ],
        returnType: 'void',
        syntax: 'Platform.ClientBrowser.SetResponseHeader(headerName, value)',
        example: 'Platform.ClientBrowser.SetResponseHeader("Cache-Control", "no-store, no-cache");',
    },
    {
        name: 'RemoveResponseHeader',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Removes a previously set HTTP response header from the response sent to the client browser.',
        params: [
            {
                name: 'headerName',
                description: 'Name of the HTTP response header to remove',
                type: 'string',
            },
        ],
        returnType: 'void',
        syntax: 'Platform.ClientBrowser.RemoveResponseHeader(headerName)',
        example: 'Platform.ClientBrowser.RemoveResponseHeader("X-Powered-By");',
    },
];

export const platformClientBrowserMethodNames = new Set(
    PLATFORM_CLIENT_BROWSER_METHODS.map((m) => m.name.toLowerCase()),
);

// ── Platform.Recipient methods ───────────────────────────────────────────────
// Methods available under Platform.Recipient.* for accessing recipient/subscriber
// attribute values and sendable data extension fields during email sends.

export const PLATFORM_RECIPIENT_METHODS = [
    {
        name: 'GetAttributeValue',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns the value of a subscriber attribute or sendable data extension field for the current recipient.',
        params: [
            {
                name: 'attributeName',
                description: 'Name of the subscriber attribute or sendable DE field to retrieve',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Recipient.GetAttributeValue(attributeName)',
        example:
            'var email = Platform.Recipient.GetAttributeValue("EmailAddress");\nPlatform.Response.Write(email);',
    },
];

export const platformRecipientMethodNames = new Set(
    PLATFORM_RECIPIENT_METHODS.map((m) => m.name.toLowerCase()),
);

// ── Script.Util HTTP constructors ────────────────────────────────────────────
// Request handler constructors under the Script.Util namespace.
// Instantiated with `new Script.Util.HttpRequest(url)` etc.

/** @type {{name: string, minArgs: number, maxArgs: number, description: string, params?: {name: string, description: string, type?: string, optional?: boolean}[], returnType?: string, syntax?: string, example?: string}[]} */
export const SCRIPT_UTIL_CONSTRUCTORS = [
    {
        name: 'HttpRequest',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates an HTTP request handler that supports any HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). ' +
            'Unlike Platform.Function.HTTPGet/HTTPPost, this handler supports custom methods and headers. ' +
            'Call send() to execute the request and receive a Script.Util.HttpResponse object.',
        params: [
            { name: 'url', description: 'The destination URL for the request', type: 'string' },
        ],
        returnType: 'object',
        syntax: 'new Script.Util.HttpRequest(url)',
        example:
            'var url = "https://api.example.com/items/123";\n' +
            'var req = new Script.Util.HttpRequest(url);\n' +
            'req.emptyContentHandling = 0;\n' +
            'req.retries = 2;\n' +
            'req.continueOnError = true;\n' +
            'req.contentType = "application/json";\n' +
            'req.method = "PUT";\n' +
            'req.setHeader("Authorization", "Bearer " + accessToken);\n' +
            'req.postData = Stringify({ status: "active" });\n' +
            'var resp = req.send();\n' +
            'var result = Platform.Function.ParseJSON(String(resp.content));',
    },
    {
        name: 'HttpGet',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates an HTTP GET request handler. Unlike Platform.Function.HTTPGet, this handler caches content for use in mail sends and supports custom headers. ' +
            'Only works with HTTP on port 80 and HTTPS on port 443. ' +
            'Call send() to execute the request and receive a Script.Util.HttpResponse object.',
        params: [{ name: 'url', description: 'The URL to retrieve content from', type: 'string' }],
        returnType: 'object',
        syntax: 'new Script.Util.HttpGet(url)',
        example:
            'var req = new Script.Util.HttpGet("https://api.example.com/data");\n' +
            'req.setHeader("Authorization", "Bearer " + accessToken);\n' +
            'req.retries = 2;\n' +
            'req.continueOnError = true;\n' +
            'var resp = req.send();\n' +
            'if (resp.statusCode == 200) {\n' +
            '    var result = Platform.Function.ParseJSON(String(resp.content));\n' +
            '    Platform.Response.Write(Platform.Function.Stringify(result));\n' +
            '}',
    },
    {
        name: 'HttpPost',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Creates an HTTP POST request handler with a URL, content type, and payload. ' +
            'Call send() to execute the request and receive a Script.Util.HttpResponse object.',
        params: [
            { name: 'url', description: 'The destination URL', type: 'string' },
            {
                name: 'contentType',
                description: 'Content-Type header value (e.g. "application/json")',
                type: 'string',
            },
            { name: 'payload', description: 'Request body content as a string', type: 'string' },
        ],
        returnType: 'object',
        syntax: 'new Script.Util.HttpPost(url, contentType, payload)',
        example:
            'var payload = Stringify({ name: "Jane", status: "active" });\n' +
            'var req = new Script.Util.HttpPost("https://api.example.com/items", "application/json", payload);\n' +
            'req.setHeader("Authorization", "Bearer " + accessToken);\n' +
            'var resp = req.send();\n' +
            'var result = Platform.Function.ParseJSON(String(resp.content));',
    },
];

// ── Script.Util request object methods ──────────────────────────────────────
// Methods available on a request object returned by Script.Util.HttpRequest,
// Script.Util.HttpGet, or Script.Util.HttpPost.

/** @type {{name: string, minArgs: number, maxArgs: number, description: string, params?: {name: string, description: string, type?: string, optional?: boolean}[], returnType?: string, syntax?: string, example?: string}[]} */
export const SCRIPT_UTIL_REQUEST_METHODS = [
    {
        name: 'send',
        minArgs: 0,
        maxArgs: 0,
        description:
            'Executes the HTTP request and returns a Script.Util.HttpResponse object. ' +
            'The response object has a `statusCode` property and a `content` property. ' +
            'Use String(resp.content) to convert the CLR content to a JavaScript string before parsing with Platform.Function.ParseJSON().',
        params: [],
        returnType: 'object',
        syntax: 'req.send()',
        example:
            'var req = new Script.Util.HttpRequest("https://api.example.com/data");\n' +
            'req.method = "GET";\n' +
            'req.setHeader("Authorization", "Bearer " + accessToken);\n' +
            'var resp = req.send();\n' +
            'if (resp.statusCode == 200) {\n' +
            '    var result = Platform.Function.ParseJSON(String(resp.content));\n' +
            '}',
    },
    {
        name: 'setHeader',
        minArgs: 2,
        maxArgs: 2,
        description:
            'Sets a request header on the Script.Util HTTP request. ' +
            'Note: setting a custom header disables content caching for Script.Util.HttpGet.',
        params: [
            {
                name: 'name',
                description: 'Header name (e.g. "Authorization", "Content-Type")',
                type: 'string',
            },
            { name: 'value', description: 'Header value', type: 'string' },
        ],
        returnType: 'void',
        syntax: 'req.setHeader(name, value)',
        example:
            'var req = new Script.Util.HttpRequest("https://api.example.com/data");\n' +
            'req.setHeader("Authorization", "Bearer " + accessToken);\n' +
            'req.setHeader("Content-Type", "application/json");\n' +
            'var resp = req.send();',
    },
    {
        name: 'clearHeaders',
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes all custom headers previously set on the request.',
        params: [],
        returnType: 'void',
        syntax: 'req.clearHeaders()',
        example:
            'var req = new Script.Util.HttpRequest("https://api.example.com/data");\n' +
            'req.setHeader("Authorization", "Bearer " + accessToken);\n' +
            'req.clearHeaders(); // removes Authorization and all other custom headers\n' +
            'var resp = req.send();',
    },
    {
        name: 'removeHeader',
        minArgs: 1,
        maxArgs: 1,
        description: 'Removes a specific header from the request by name.',
        params: [{ name: 'name', description: 'Name of the header to remove', type: 'string' }],
        returnType: 'void',
        syntax: 'req.removeHeader(name)',
        example:
            'var req = new Script.Util.HttpRequest("https://api.example.com/data");\n' +
            'req.setHeader("Authorization", "Bearer " + accessToken);\n' +
            'req.setHeader("X-Custom", "value");\n' +
            'req.removeHeader("X-Custom");\n' +
            'var resp = req.send();',
    },
];

// ── ECMAScript 3/5 built-in methods available in SSJS ───────────────────────
// Methods from native JavaScript prototypes that work in the SFMC legacy engine.
// Note: Array.prototype.indexOf, splice, and lastIndexOf exist but are broken;
// use the polyfills from POLYFILLABLE_METHODS for correct behaviour.

/** @type {{name: string, owner: string, description: string, params?: {name: string, description: string, type?: string, optional?: boolean}[], returnType?: string, syntax?: string, example?: string}[]} */
export const ECMASCRIPT_BUILTINS = [
    // ── Array.prototype ──────────────────────────────────────────────────────
    {
        name: 'join',
        owner: 'Array.prototype',
        description:
            'Joins all array elements into a string, separated by the specified delimiter.',
        params: [
            {
                name: 'separator',
                description: 'Delimiter string (default: ",")',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'array.join([separator])',
        example: 'var arr = ["a", "b", "c"];\nvar str = arr.join(", "); // "a, b, c"',
    },
    {
        name: 'push',
        owner: 'Array.prototype',
        description:
            'Appends one or more elements to the end of an array and returns the new length.',
        params: [
            {
                name: 'element',
                description: 'Element to append (repeat for multiple)',
                type: 'any',
            },
        ],
        returnType: 'number',
        syntax: 'array.push(element[, ...])',
        example: 'var arr = [1, 2];\narr.push(3);\n// arr is now [1, 2, 3]',
    },
    {
        name: 'pop',
        owner: 'Array.prototype',
        description: 'Removes and returns the last element from an array.',
        params: [],
        returnType: 'any',
        syntax: 'array.pop()',
        example: 'var arr = [1, 2, 3];\nvar last = arr.pop(); // 3',
    },
    {
        name: 'shift',
        owner: 'Array.prototype',
        description: 'Removes and returns the first element from an array.',
        params: [],
        returnType: 'any',
        syntax: 'array.shift()',
        example: 'var arr = [1, 2, 3];\nvar first = arr.shift(); // 1',
    },
    {
        name: 'unshift',
        owner: 'Array.prototype',
        description:
            'Inserts one or more elements at the start of an array and returns the new length.',
        params: [
            {
                name: 'element',
                description: 'Element to prepend (repeat for multiple)',
                type: 'any',
            },
        ],
        returnType: 'number',
        syntax: 'array.unshift(element[, ...])',
        example: 'var arr = [2, 3];\narr.unshift(1);\n// arr is now [1, 2, 3]',
    },
    {
        name: 'concat',
        owner: 'Array.prototype',
        description:
            'Returns a new array formed by merging this array with other arrays or values.',
        params: [{ name: 'value', description: 'Array or value to concatenate', type: 'any' }],
        returnType: 'array',
        syntax: 'array.concat(value[, ...])',
        example: 'var a = [1, 2];\nvar b = [3, 4];\nvar c = a.concat(b); // [1, 2, 3, 4]',
    },
    {
        name: 'slice',
        owner: 'Array.prototype',
        description: 'Returns a shallow copy of a portion of an array.',
        params: [
            {
                name: 'start',
                description: 'Start index (0-based, negative counts from end)',
                type: 'number',
            },
            { name: 'end', description: 'End index (exclusive)', type: 'number', optional: true },
        ],
        returnType: 'array',
        syntax: 'array.slice([start[, end]])',
        example: 'var arr = [1, 2, 3, 4, 5];\nvar sub = arr.slice(1, 3); // [2, 3]',
    },
    {
        name: 'sort',
        owner: 'Array.prototype',
        description: 'Sorts the array in place and returns it. Default sort is lexicographic.',
        params: [
            {
                name: 'compareFn',
                description:
                    'Optional comparison function (a, b) returning negative, 0, or positive',
                type: 'function',
                optional: true,
            },
        ],
        returnType: 'array',
        syntax: 'array.sort([compareFn])',
        example: 'var arr = [3, 1, 2];\narr.sort(function(a, b) { return a - b; }); // [1, 2, 3]',
    },
    {
        name: 'reverse',
        owner: 'Array.prototype',
        description: 'Reverses the elements of an array in place.',
        params: [],
        returnType: 'array',
        syntax: 'array.reverse()',
        example: 'var arr = [1, 2, 3];\narr.reverse(); // [3, 2, 1]',
    },
    {
        name: 'length',
        owner: 'Array.prototype',
        description: 'Returns the number of elements in the array.',
        params: [],
        returnType: 'number',
        syntax: 'array.length',
        example: 'var arr = [1, 2, 3];\nWrite(arr.length); // 3',
    },
    // ── String.prototype ─────────────────────────────────────────────────────
    {
        name: 'charAt',
        owner: 'String.prototype',
        description: 'Returns the character at the specified index.',
        params: [{ name: 'index', description: 'Zero-based character index', type: 'number' }],
        returnType: 'string',
        syntax: 'str.charAt(index)',
        example: 'var str = "Hello";\nWrite(str.charAt(1)); // "e"',
    },
    {
        name: 'charCodeAt',
        owner: 'String.prototype',
        description: 'Returns the UTF-16 code unit at the specified index.',
        params: [{ name: 'index', description: 'Zero-based character index', type: 'number' }],
        returnType: 'number',
        syntax: 'str.charCodeAt(index)',
        example: 'var str = "A";\nWrite(str.charCodeAt(0)); // 65',
    },
    {
        name: 'indexOf',
        owner: 'String.prototype',
        description:
            'Returns the index of the first occurrence of a substring, or -1 if not found.',
        params: [
            { name: 'searchValue', description: 'Substring to search for', type: 'string' },
            {
                name: 'fromIndex',
                description: 'Index to start the search from',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'number',
        syntax: 'str.indexOf(searchValue[, fromIndex])',
        example: 'var str = "Hello, world!";\nWrite(str.indexOf("world")); // 7',
    },
    {
        name: 'lastIndexOf',
        owner: 'String.prototype',
        description: 'Returns the index of the last occurrence of a substring, or -1 if not found.',
        params: [
            { name: 'searchValue', description: 'Substring to search for', type: 'string' },
            {
                name: 'fromIndex',
                description: 'Index to search backwards from',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'number',
        syntax: 'str.lastIndexOf(searchValue[, fromIndex])',
        example: 'var str = "abcabc";\nWrite(str.lastIndexOf("b")); // 4',
    },
    {
        name: 'match',
        owner: 'String.prototype',
        description: 'Matches a string against a regular expression and returns the matches array.',
        params: [
            { name: 'regexp', description: 'Regular expression to match against', type: 'RegExp' },
        ],
        returnType: 'array',
        syntax: 'str.match(regexp)',
        example:
            'var str = "test@example.com";\nvar matches = str.match(/[\\w.]+@[\\w.]+/);\nif (matches) { Write(matches[0]); }',
    },
    {
        name: 'replace',
        owner: 'String.prototype',
        description:
            'Returns a new string with matches replaced by a replacement string or function.',
        params: [
            { name: 'searchValue', description: 'Substring or RegExp to find', type: 'any' },
            { name: 'replaceValue', description: 'Replacement string', type: 'string' },
        ],
        returnType: 'string',
        syntax: 'str.replace(searchValue, replaceValue)',
        example:
            'var str = "Hello, world!";\nWrite(str.replace("world", "SSJS")); // "Hello, SSJS!"',
    },
    {
        name: 'search',
        owner: 'String.prototype',
        description: 'Searches for a match and returns the index of the first match, or -1.',
        params: [
            { name: 'regexp', description: 'Regular expression to search for', type: 'RegExp' },
        ],
        returnType: 'number',
        syntax: 'str.search(regexp)',
        example: 'var str = "foo123bar";\nWrite(str.search(/\\d+/)); // 3',
    },
    {
        name: 'slice',
        owner: 'String.prototype',
        description: 'Extracts a section of a string and returns it as a new string.',
        params: [
            {
                name: 'start',
                description: 'Start index (negative counts from end)',
                type: 'number',
            },
            { name: 'end', description: 'End index (exclusive)', type: 'number', optional: true },
        ],
        returnType: 'string',
        syntax: 'str.slice(start[, end])',
        example: 'var str = "Hello, world!";\nWrite(str.slice(7, 12)); // "world"',
    },
    {
        name: 'split',
        owner: 'String.prototype',
        description: 'Splits a string into an array of substrings using a separator.',
        params: [
            { name: 'separator', description: 'String or RegExp to split on', type: 'any' },
            {
                name: 'limit',
                description: 'Maximum number of substrings to return',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'array',
        syntax: 'str.split(separator[, limit])',
        example: 'var str = "a,b,c";\nvar parts = str.split(","); // ["a", "b", "c"]',
    },
    {
        name: 'substring',
        owner: 'String.prototype',
        description: 'Returns the characters between two indices of a string.',
        params: [
            { name: 'start', description: 'Start index (inclusive)', type: 'number' },
            { name: 'end', description: 'End index (exclusive)', type: 'number', optional: true },
        ],
        returnType: 'string',
        syntax: 'str.substring(start[, end])',
        example: 'var str = "Hello, world!";\nWrite(str.substring(7, 12)); // "world"',
    },
    {
        name: 'toLowerCase',
        owner: 'String.prototype',
        description: 'Returns the string converted to lowercase.',
        params: [],
        returnType: 'string',
        syntax: 'str.toLowerCase()',
        example: 'var str = "Hello World";\nWrite(str.toLowerCase()); // "hello world"',
    },
    {
        name: 'toUpperCase',
        owner: 'String.prototype',
        description: 'Returns the string converted to uppercase.',
        params: [],
        returnType: 'string',
        syntax: 'str.toUpperCase()',
        example: 'var str = "Hello World";\nWrite(str.toUpperCase()); // "HELLO WORLD"',
    },
    {
        name: 'length',
        owner: 'String.prototype',
        description: 'Returns the number of characters in the string.',
        params: [],
        returnType: 'number',
        syntax: 'str.length',
        example: 'var str = "Hello";\nWrite(str.length); // 5',
    },
    // ── Math ─────────────────────────────────────────────────────────────────
    {
        name: 'abs',
        owner: 'Math',
        description: 'Returns the absolute value of a number.',
        params: [{ name: 'x', description: 'A number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.abs(x)',
        example: 'Write(Math.abs(-5)); // 5',
    },
    {
        name: 'ceil',
        owner: 'Math',
        description: 'Rounds a number up to the next integer.',
        params: [{ name: 'x', description: 'A number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.ceil(x)',
        example: 'Write(Math.ceil(4.1)); // 5',
    },
    {
        name: 'floor',
        owner: 'Math',
        description: 'Rounds a number down to the nearest integer.',
        params: [{ name: 'x', description: 'A number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.floor(x)',
        example: 'Write(Math.floor(4.9)); // 4',
    },
    {
        name: 'max',
        owner: 'Math',
        description: 'Returns the largest of the supplied numbers.',
        params: [{ name: 'values', description: 'Numbers to compare (variadic)', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.max(value1[, value2, ...])',
        example: 'Write(Math.max(1, 5, 3)); // 5',
    },
    {
        name: 'min',
        owner: 'Math',
        description: 'Returns the smallest of the supplied numbers.',
        params: [{ name: 'values', description: 'Numbers to compare (variadic)', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.min(value1[, value2, ...])',
        example: 'Write(Math.min(1, 5, 3)); // 1',
    },
    {
        name: 'pow',
        owner: 'Math',
        description: 'Returns the base raised to the exponent power.',
        params: [
            { name: 'base', description: 'The base number', type: 'number' },
            { name: 'exponent', description: 'The exponent', type: 'number' },
        ],
        returnType: 'number',
        syntax: 'Math.pow(base, exponent)',
        example: 'Write(Math.pow(2, 10)); // 1024',
    },
    {
        name: 'random',
        owner: 'Math',
        description: 'Returns a pseudo-random floating-point number in [0, 1).',
        params: [],
        returnType: 'number',
        syntax: 'Math.random()',
        example: 'var r = Math.random();\nWrite(Math.floor(r * 100)); // random 0–99',
    },
    {
        name: 'round',
        owner: 'Math',
        description: 'Rounds a number to the nearest integer.',
        params: [{ name: 'x', description: 'A number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.round(x)',
        example: 'Write(Math.round(4.5)); // 5',
    },
    {
        name: 'sqrt',
        owner: 'Math',
        description: 'Returns the square root of a number.',
        params: [{ name: 'x', description: 'A non-negative number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.sqrt(x)',
        example: 'Write(Math.sqrt(16)); // 4',
    },
];

// ── Unsupported ES6+ syntax ──────────────────────────────────────────────────
// SFMC runs SSJS on a legacy ECMAScript 3/5 engine (Rhino-based).
// These features cause runtime errors and should be avoided.

export const UNSUPPORTED_SYNTAX = [
    {
        feature: 'ArrowFunctionExpression',
        label: 'arrow functions',
        suggestion: 'Use a regular function expression instead.',
        nodeType: 'ArrowFunctionExpression',
    },
    {
        feature: 'LetDeclaration',
        label: "'let' declarations",
        suggestion: "Use 'var' instead.",
        nodeType: 'VariableDeclaration',
        test: (node) => node.kind === 'let',
    },
    {
        feature: 'ConstDeclaration',
        label: "'const' declarations",
        suggestion: "Use 'var' instead.",
        nodeType: 'VariableDeclaration',
        test: (node) => node.kind === 'const',
    },
    {
        feature: 'TemplateLiteral',
        label: 'template literals',
        suggestion: 'Use string concatenation instead.',
        nodeType: 'TemplateLiteral',
    },
    {
        feature: 'ClassDeclaration',
        label: 'class declarations',
        suggestion: 'Use constructor functions with prototypes instead.',
        nodeType: 'ClassDeclaration',
    },
    {
        feature: 'ClassExpression',
        label: 'class expressions',
        suggestion: 'Use constructor functions with prototypes instead.',
        nodeType: 'ClassExpression',
    },
    {
        feature: 'ForOfStatement',
        label: "'for...of' loops",
        suggestion: "Use a standard 'for' loop or 'for...in' instead.",
        nodeType: 'ForOfStatement',
    },
    {
        feature: 'SpreadElement',
        label: 'spread syntax',
        suggestion: 'Use Array.prototype.concat or manual iteration instead.',
        nodeType: 'SpreadElement',
    },
    {
        feature: 'RestElement',
        label: 'rest parameters',
        suggestion: "Use the 'arguments' object instead.",
        nodeType: 'RestElement',
    },
    {
        feature: 'ObjectDestructuring',
        label: 'destructuring assignment',
        suggestion: 'Access object properties individually instead.',
        nodeType: 'ObjectPattern',
    },
    {
        feature: 'ArrayDestructuring',
        label: 'destructuring assignment',
        suggestion: 'Access array elements by index instead.',
        nodeType: 'ArrayPattern',
    },
    {
        feature: 'DefaultParameter',
        label: 'default parameter values',
        suggestion: 'Check for undefined inside the function body instead.',
        nodeType: 'AssignmentPattern',
    },
    {
        feature: 'AsyncFunction',
        label: 'async functions',
        suggestion: 'SFMC SSJS does not support Promises or async/await.',
        nodeType: 'FunctionDeclaration',
        test: (node) => node.async === true,
    },
    {
        feature: 'AsyncFunctionExpression',
        label: 'async functions',
        suggestion: 'SFMC SSJS does not support Promises or async/await.',
        nodeType: 'FunctionExpression',
        test: (node) => node.async === true,
    },
    {
        feature: 'AwaitExpression',
        label: 'await expressions',
        suggestion: 'SFMC SSJS does not support Promises or async/await.',
        nodeType: 'AwaitExpression',
    },
    {
        feature: 'Generator',
        label: 'generator functions',
        suggestion: 'Use regular iteration patterns instead.',
        nodeType: 'FunctionDeclaration',
        test: (node) => node.generator === true,
    },
    {
        feature: 'YieldExpression',
        label: 'yield expressions',
        suggestion: 'Use regular iteration patterns instead.',
        nodeType: 'YieldExpression',
    },
    {
        feature: 'ImportDeclaration',
        label: 'ES module imports',
        suggestion: 'SFMC SSJS does not support ES modules.',
        nodeType: 'ImportDeclaration',
    },
    {
        feature: 'ExportNamedDeclaration',
        label: 'ES module exports',
        suggestion: 'SFMC SSJS does not support ES modules.',
        nodeType: 'ExportNamedDeclaration',
    },
    {
        feature: 'ExportDefaultDeclaration',
        label: 'ES module exports',
        suggestion: 'SFMC SSJS does not support ES modules.',
        nodeType: 'ExportDefaultDeclaration',
    },
    {
        feature: 'OptionalChaining',
        label: 'optional chaining (?.)',
        suggestion: 'Use explicit null checks instead.',
        nodeType: 'ChainExpression',
    },
    {
        feature: 'NullishCoalescing',
        label: 'nullish coalescing (??)',
        suggestion: 'Use a ternary or logical OR (||) instead.',
        nodeType: 'LogicalExpression',
        test: (node) => node.operator === '??',
    },
    {
        feature: 'DirectObjectReturn',
        label: 'direct object literal returns',
        suggestion: 'Assign the object to a variable first, then return the variable.',
        nodeType: 'ReturnStatement',
        test: (node) => node.argument && node.argument.type === 'ObjectExpression',
    },
    {
        feature: 'NewExpression',
        label: "the 'new' operator on user-defined constructors",
        suggestion:
            'May cause a 500 if the function uses the revealing module pattern ' +
            '(var service = {...}; return service). ' +
            "Ensure the function assigns to 'this' instead (this.service = {...}).",
        nodeType: 'NewExpression',
        test: (node) => {
            const NATIVE = ['Date', 'RegExp', 'Error', 'Object', 'Array', 'WSProxy'];
            return node.callee.type === 'Identifier' && !NATIVE.includes(node.callee.name);
        },
    },
];

// Build a quick-lookup map by AST node type for the ESLint rule
export const unsupportedByNodeType = new Map();
for (const entry of UNSUPPORTED_SYNTAX) {
    if (!unsupportedByNodeType.has(entry.nodeType)) {
        unsupportedByNodeType.set(entry.nodeType, []);
    }
    unsupportedByNodeType.get(entry.nodeType).push(entry);
}

// ── Polyfillable Array methods ────────────────────────────────────────────────
// SFMC SSJS runs on an old ECMAScript 3/5 engine that lacks many Array methods.
// Each entry below describes either a missing method (category: 'unavailable')
// or one that exists natively but returns wrong results (category: 'broken').
// The polyfill strings are rewritten originals based on patterns documented at
// https://gortonington.com/javascript-array-methods-in-sfmc/

export const POLYFILLABLE_METHODS = [
    {
        method: 'copyWithin',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.copyWithin is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.copyWithin = function (targetIndex, startIndex, count) {\n' +
            '    var n = count || 1;\n' +
            '    for (var i = 0; i < n; i++) {\n' +
            '        this[targetIndex + i] = this[startIndex + i];\n' +
            '    }\n' +
            '    return this;\n' +
            '};',
    },
    {
        method: 'entries',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.entries is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.entries = function () {\n' +
            '    var index = 0;\n' +
            '    var arr = this;\n' +
            '    return {\n' +
            '        next: function () {\n' +
            '            if (index < arr.length) {\n' +
            '                return { value: [index, arr[index++]], done: false };\n' +
            '            }\n' +
            '            return { done: true };\n' +
            '        }\n' +
            '    };\n' +
            '};',
    },
    {
        method: 'fill',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.fill is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.fill = function (value, startIndex, endIndex) {\n' +
            '    var start = startIndex || 0;\n' +
            '    var end = (!endIndex || endIndex > this.length) ? this.length : endIndex;\n' +
            '    for (var i = start; i < end; i++) {\n' +
            '        this[i] = value;\n' +
            '    }\n' +
            '    return this;\n' +
            '};',
    },
    {
        method: 'filter',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.filter is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.filter = function (predicate) {\n' +
            "    if (typeof predicate !== 'function') { return []; }\n" +
            '    var result = [];\n' +
            '    for (var i = 0; i < this.length; i++) {\n' +
            '        if (predicate(this[i], i, this)) { result.push(this[i]); }\n' +
            '    }\n' +
            '    return result;\n' +
            '};',
    },
    {
        method: 'find',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.find is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.find = function (predicate) {\n' +
            "    if (typeof predicate !== 'function') { return undefined; }\n" +
            '    for (var i = 0; i < this.length; i++) {\n' +
            '        if (predicate(this[i], i, this)) { return this[i]; }\n' +
            '    }\n' +
            '    return undefined;\n' +
            '};',
    },
    {
        method: 'findIndex',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.findIndex is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.findIndex = function (predicate) {\n' +
            "    if (typeof predicate !== 'function') { return -1; }\n" +
            '    for (var i = 0; i < this.length; i++) {\n' +
            '        if (predicate(this[i], i, this)) { return i; }\n' +
            '    }\n' +
            '    return -1;\n' +
            '};',
    },
    {
        method: 'forEach',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.forEach is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.forEach = function (callback) {\n' +
            "    if (typeof callback !== 'function') { return; }\n" +
            '    for (var i = 0; i < this.length; i++) {\n' +
            '        callback(this[i], i, this);\n' +
            '    }\n' +
            '};',
    },
    {
        method: 'includes',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.includes is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.includes = function (searchValue) {\n' +
            '    for (var i = 0; i < this.length; i++) {\n' +
            '        if (this[i] === searchValue) { return true; }\n' +
            '    }\n' +
            '    return false;\n' +
            '};',
    },
    {
        method: 'indexOf',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: true,
        description: 'Array.prototype.indexOf is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.indexOf = function (searchValue, fromIndex) {\n' +
            '    var start = fromIndex || 0;\n' +
            '    for (var i = start; i < this.length; i++) {\n' +
            '        if (this[i] === searchValue) { return i; }\n' +
            '    }\n' +
            '    return -1;\n' +
            '};',
    },
    {
        method: 'lastIndexOf',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'broken',
        ambiguousWithString: true,
        description:
            'Array.prototype.lastIndexOf exists in SFMC SSJS but always returns -1. A polyfill is needed for correct results.',
        polyfill:
            'Array.prototype.lastIndexOf = function (searchValue, fromIndex) {\n' +
            '    var start = (fromIndex !== undefined) ? fromIndex : this.length - 1;\n' +
            '    for (var i = start; i >= 0; i--) {\n' +
            '        if (this[i] === searchValue) { return i; }\n' +
            '    }\n' +
            '    return -1;\n' +
            '};',
    },
    {
        method: 'map',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.map is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.map = function (callback) {\n' +
            "    if (typeof callback !== 'function') { return []; }\n" +
            '    var result = [];\n' +
            '    for (var i = 0; i < this.length; i++) {\n' +
            '        result.push(callback(this[i], i, this));\n' +
            '    }\n' +
            '    return result;\n' +
            '};',
    },
    {
        method: 'reduce',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.reduce is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.reduce = function (callback, initialValue) {\n' +
            "    if (typeof callback !== 'function') { return initialValue; }\n" +
            '    var accumulator = (arguments.length > 1) ? initialValue : this[0];\n' +
            '    var startIndex = (arguments.length > 1) ? 0 : 1;\n' +
            '    for (var i = startIndex; i < this.length; i++) {\n' +
            '        accumulator = callback(accumulator, this[i], i, this);\n' +
            '    }\n' +
            '    return accumulator;\n' +
            '};',
    },
    {
        method: 'reduceRight',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.reduceRight is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.reduceRight = function (callback, initialValue) {\n' +
            "    if (typeof callback !== 'function') { return initialValue; }\n" +
            '    var accumulator = (arguments.length > 1) ? initialValue : this[this.length - 1];\n' +
            '    var startIndex = (arguments.length > 1) ? this.length - 1 : this.length - 2;\n' +
            '    for (var i = startIndex; i >= 0; i--) {\n' +
            '        accumulator = callback(accumulator, this[i], i, this);\n' +
            '    }\n' +
            '    return accumulator;\n' +
            '};',
    },
    {
        method: 'some',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.some is not available in SFMC SSJS.',
        polyfill:
            'Array.prototype.some = function (predicate) {\n' +
            "    if (typeof predicate !== 'function') { return false; }\n" +
            '    for (var i = 0; i < this.length; i++) {\n' +
            '        if (predicate(this[i], i, this)) { return true; }\n' +
            '    }\n' +
            '    return false;\n' +
            '};',
    },
    {
        method: 'splice',
        owner: 'Array.prototype',
        isStatic: false,
        category: 'broken',
        ambiguousWithString: false,
        description:
            'Array.prototype.splice exists in SFMC SSJS but ignores its first two parameters. A polyfill is needed for correct behavior.',
        polyfill:
            'Array.prototype.splice = function (startIndex, deleteCount) {\n' +
            '    var arr = this;\n' +
            '    var endIndex = startIndex + deleteCount;\n' +
            '    var before = [];\n' +
            '    var removed = [];\n' +
            '    var after = [];\n' +
            '    for (var i = 0; i < arr.length; i++) {\n' +
            '        if (i < startIndex) { before.push(arr[i]); }\n' +
            '        else if (i < endIndex) { removed.push(arr[i]); }\n' +
            '        else { after.push(arr[i]); }\n' +
            '    }\n' +
            '    for (var j = 2; j < arguments.length; j++) {\n' +
            '        before.push(arguments[j]);\n' +
            '    }\n' +
            '    var merged = before.concat(after);\n' +
            '    var maxLen = arr.length > merged.length ? arr.length : merged.length;\n' +
            '    for (var k = 0; k < maxLen; k++) {\n' +
            '        if (k < merged.length) { arr[k] = merged[k]; }\n' +
            '        else { arr.pop(); }\n' +
            '    }\n' +
            '    return removed;\n' +
            '};',
    },
    {
        method: 'trim',
        owner: 'String.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'String.prototype.trim is not available in SFMC SSJS.',
        polyfill:
            'String.prototype.trim = function () {\n' +
            "    return this.replace(/^[\\s\\uFEFF\\xA0]+|[\\s\\uFEFF\\xA0]+$/g, '');\n" +
            '};',
    },
    {
        method: 'startsWith',
        owner: 'String.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'String.prototype.startsWith is not available in SFMC SSJS.',
        polyfill:
            'String.prototype.startsWith = function (searchString, position) {\n' +
            '    position = position || 0;\n' +
            '    return this.indexOf(searchString, position) === position;\n' +
            '};',
    },
    {
        method: 'endsWith',
        owner: 'String.prototype',
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'String.prototype.endsWith is not available in SFMC SSJS.',
        polyfill:
            'String.prototype.endsWith = function (search, length) {\n' +
            '    var len = (length === undefined || length > this.length) ? this.length : length;\n' +
            '    return this.substring(len - search.length, len) === search;\n' +
            '};',
    },
    {
        method: 'isArray',
        owner: 'Array',
        isStatic: true,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.isArray is not available in SFMC SSJS.',
        polyfill:
            'Array.isArray = function (value) {\n' +
            "    return Object.prototype.toString.call(value) === '[object Array]';\n" +
            '};',
    },
    {
        method: 'of',
        owner: 'Array',
        isStatic: true,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.of is not available in SFMC SSJS.',
        polyfill:
            'Array.of = function () {\n' +
            '    var result = [];\n' +
            '    for (var i = 0; i < arguments.length; i++) {\n' +
            '        result.push(arguments[i]);\n' +
            '    }\n' +
            '    return result;\n' +
            '};',
    },
];

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
