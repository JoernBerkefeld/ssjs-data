/**
 * Canonical SSJS (Server-Side JavaScript) catalog for SFMC tooling.
 *
 * Single source of truth consumed by:
 *   - eslint-plugin-sfmc  (globals, unknown-function detection, platform-load checks)
 *   - prettier-plugin-sfmc (language registration)
 *   - vscode-sfmc-language (completions, hover, diagnostics)
 *
 * Schema version: 0.3.0 — additive fields added in this version:
 *   - isStatic?: boolean      — true for namespace-level calls (Class.Method()), false for instance calls
 *   - deprecated?: boolean    — true for entries that resolve at runtime but should not be used in new code
 *   - isProperty?: boolean    — true for entries accessed without parentheses (e.g. Platform.Request.HasSSL)
 *   - requiresCoreLoad?: boolean — true when the call site requires a preceding Platform.Load("core", "<version>")
 *   - aliasOf?: string        — names the canonical entry this one aliases (dual-call modeling)
 *   - returnEnum?: (string|number|boolean)[] — allowed return literals when returnType is a primitive
 *   - enum?: (string|number|boolean)[]       — allowed literals for a parameter value
 *   - default?: string|number|boolean        — documented default value for a parameter
 *   - optional?: boolean                     — equivalent to Required:No in the docs
 *   - caseInsensitive?: boolean              — true for SOAP-style enums where casing is not enforced
 */

// ── Global functions ─────────────────────────────────────────────────────────
// Functions and objects available at the top scope of any SSJS execution context.

export const SSJS_GLOBALS = [
    // ── Native JS globals (not Platform.Function.* aliases) ──────────────────
    {
        name: 'Variable',
        type: 'object',
        description: 'Namespace marker — bare-name access to Platform.Variable.* methods.',
    },
    {
        name: 'Attribute',
        type: 'object',
        description:
            'Namespace for reading subscriber attribute values. ' +
            'Call `Attribute.GetValue(name)` to retrieve an attribute for the current recipient. ' +
            'Requires `Platform.Load("core", "1.1.5")` before use.',
        requiresCoreLoad: true,
    },
    {
        name: 'HTTPHeader',
        type: 'object',
        description:
            'Object that provides access to HTTP request headers in SSJS CloudPage context. ' +
            'Requires `Platform.Load("core", "1.1.5")` before use.',
        requiresCoreLoad: true,
    },
    {
        name: 'Platform',
        type: 'object',
        description:
            'Root namespace for SFMC platform APIs including Function, Variable, Response, and Request.',
    },
    {
        name: 'Script',
        type: 'object',
        description:
            'Root namespace for SFMC script utilities. ' +
            'Access sub-namespaces such as `Script.Util` for HTTP request helpers.',
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
    // ── Bare-name aliases for Platform.Function.* (dual-call rule) ───────────
    // Every Platform.Function.X() is also callable as X(). The canonical
    // definition lives in PLATFORM_FUNCTIONS. A subset requires a preceding
    // Platform.Load("core", "1.1.5") call (requiresCoreLoad: true).
    { name: 'Lookup', aliasOf: 'Platform.Function.Lookup' },
    { name: 'LookupRows', aliasOf: 'Platform.Function.LookupRows' },
    { name: 'LookupOrderedRows', aliasOf: 'Platform.Function.LookupOrderedRows' },
    { name: 'InsertData', aliasOf: 'Platform.Function.InsertData' },
    { name: 'InsertDE', aliasOf: 'Platform.Function.InsertDE' },
    { name: 'UpdateData', aliasOf: 'Platform.Function.UpdateData' },
    { name: 'UpdateDE', aliasOf: 'Platform.Function.UpdateDE' },
    { name: 'UpsertData', aliasOf: 'Platform.Function.UpsertData' },
    { name: 'UpsertDE', aliasOf: 'Platform.Function.UpsertDE' },
    { name: 'DeleteData', aliasOf: 'Platform.Function.DeleteData' },
    { name: 'DeleteDE', aliasOf: 'Platform.Function.DeleteDE' },
    { name: 'ContentBlockByKey', aliasOf: 'Platform.Function.ContentBlockByKey' },
    { name: 'ContentBlockByName', aliasOf: 'Platform.Function.ContentBlockByName' },
    { name: 'ContentBlockByID', aliasOf: 'Platform.Function.ContentBlockByID' },
    { name: 'ContentImageByKey', aliasOf: 'Platform.Function.ContentImageByKey' },
    { name: 'ContentImageByID', aliasOf: 'Platform.Function.ContentImageByID' },
    { name: 'TreatAsContent', aliasOf: 'Platform.Function.TreatAsContent' },
    // deprecated Platform.Function.* aliases — NOT flagged requiresCoreLoad (Platform.Function.* is always available)
    { name: 'ContentArea', aliasOf: 'Platform.Function.ContentArea', deprecated: true },
    { name: 'ContentAreaByName', aliasOf: 'Platform.Function.ContentAreaByName', deprecated: true },
    {
        name: 'BeginImpressionRegion',
        aliasOf: 'Platform.Function.BeginImpressionRegion',
        requiresCoreLoad: true,
    },
    {
        name: 'EndImpressionRegion',
        aliasOf: 'Platform.Function.EndImpressionRegion',
        requiresCoreLoad: true,
    },
    { name: 'Now', aliasOf: 'Platform.Function.Now', requiresCoreLoad: true },
    {
        name: 'SystemDateToLocalDate',
        aliasOf: 'Platform.Function.SystemDateToLocalDate',
        requiresCoreLoad: true,
    },
    {
        name: 'LocalDateToSystemDate',
        aliasOf: 'Platform.Function.LocalDateToSystemDate',
        requiresCoreLoad: true,
    },
    { name: 'RaiseError', aliasOf: 'Platform.Function.RaiseError' },
    { name: 'Redirect', aliasOf: 'Platform.Response.Redirect', requiresCoreLoad: true },
    { name: 'GUID', aliasOf: 'Platform.Function.GUID', requiresCoreLoad: true },
    {
        name: 'IsEmailAddress',
        aliasOf: 'Platform.Function.IsEmailAddress',
        requiresCoreLoad: true,
    },
    {
        name: 'IsPhoneNumber',
        aliasOf: 'Platform.Function.IsPhoneNumber',
        requiresCoreLoad: true,
    },
    { name: 'CreateObject', aliasOf: 'Platform.Function.CreateObject' },
    { name: 'SetObjectProperty', aliasOf: 'Platform.Function.SetObjectProperty' },
    { name: 'AddObjectArrayItem', aliasOf: 'Platform.Function.AddObjectArrayItem' },
    { name: 'InvokeCreate', aliasOf: 'Platform.Function.InvokeCreate' },
    { name: 'InvokeUpdate', aliasOf: 'Platform.Function.InvokeUpdate' },
    { name: 'InvokeDelete', aliasOf: 'Platform.Function.InvokeDelete' },
    { name: 'InvokeRetrieve', aliasOf: 'Platform.Function.InvokeRetrieve' },
    { name: 'InvokePerform', aliasOf: 'Platform.Function.InvokePerform' },
    { name: 'InvokeConfigure', aliasOf: 'Platform.Function.InvokeConfigure' },
    { name: 'InvokeExecute', aliasOf: 'Platform.Function.InvokeExecute' },
    { name: 'InvokeExtract', aliasOf: 'Platform.Function.InvokeExtract' },
    { name: 'InvokeSchedule', aliasOf: 'Platform.Function.InvokeSchedule' },
    { name: 'HTTPGet', aliasOf: 'Platform.Function.HTTPGet' },
    { name: 'HTTPPost', aliasOf: 'Platform.Function.HTTPPost' },
    { name: 'ParseJSON', aliasOf: 'Platform.Function.ParseJSON' },
    { name: 'UrlEncode', aliasOf: 'Platform.Function.UrlEncode' },
    { name: 'RedirectTo', aliasOf: 'Platform.Function.RedirectTo' },
    { name: 'Write', aliasOf: 'Platform.Function.Write', requiresCoreLoad: true },
    { name: 'Stringify', aliasOf: 'Platform.Function.Stringify', requiresCoreLoad: true },
    { name: 'IsCHTMLBrowser', aliasOf: 'Platform.Function.IsCHTMLBrowser', requiresCoreLoad: true },
    // ── Core-library namespace markers ───────────────────────────────────────
    {
        name: 'DateTime',
        type: 'object',
        description:
            'Namespace for time zone and date utilities. ' +
            'Requires `Platform.Load("core", "1.1.5")` before use. ' +
            'Access sub-namespaces such as `DateTime.TimeZone` for time zone operations.',
        requiresCoreLoad: true,
    },
    {
        name: 'ErrorUtil',
        type: 'object',
        description:
            'Utility namespace for WSProxy error handling. ' +
            'Call `ErrorUtil.ThrowWSProxyError(result)` to convert WSProxy error-status results into thrown exceptions.',
        requiresCoreLoad: true,
    },
    {
        name: 'Format',
        type: 'function',
        minArgs: 2,
        maxArgs: 2,
        requiresCoreLoad: true,
        description:
            'Applies a formatting rule to a string or numeric value. ' +
            'Use format codes such as `C` (currency), `D` (decimal), `N` (number with separators), ' +
            '`P` (percentage), `O` (ISO 8601 date), `s` (sortable date), `d` (short date), `t` (12-hour time), etc. ' +
            'Append a digit to control decimal places, e.g. `C2` for two decimal places.',
        params: [
            {
                name: 'textToFormat',
                description: 'The string or number to apply a formatting rule to.',
                type: 'string|number',
            },
            {
                name: 'formatCode',
                description:
                    'A format code to apply. Numeric: C, D, E, F, G, N, P (append digit for decimal places). ' +
                    'Date/time: d, M, f, g, O, r, s, t, T, or a custom pattern.',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'Format(textToFormat, formatCode)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var price = Format(4213.65, "C2");  // "$4,213.65"\n' +
            'var isoDate = Format("2024-08-05T13:41:23", "O");  // "2024-08-05T13:41:23.0000000"\n' +
            'Write(price + " / " + isoDate);',
    },
];

/**
 * Map of global names for ESLint no-undef configuration.
 * Keys are identifiers; values are "readonly" or "writable".
 */
export const SSJS_GLOBALS_MAP = Object.fromEntries([
    ...SSJS_GLOBALS.map((g) => [g.name, 'readonly']),
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
        maxArgs: 4,
        description:
            'Retrieves a single field value from a Data Extension row matching filter criteria. ' +
            'To filter by multiple columns, pass string arrays for whereFieldNames and whereFieldValues (AND logic).',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            { name: 'returnField', description: 'Name of the field to return', type: 'string' },
            {
                name: 'whereFieldNames',
                description:
                    'Filter field name, or an array of field names connected with AND logic',
                type: 'string|string[]',
            },
            {
                name: 'whereFieldValues',
                description:
                    'Filter field value matching whereFieldNames; must be an array of equal length when whereFieldNames is an array',
                type: 'string|array',
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.Lookup(deName, returnField, whereFieldNames, whereFieldValues)',
        example:
            '// Single filter:\n' +
            'var email = Platform.Function.Lookup("Subscribers", "EmailAddress", "SubscriberKey", "abc123");\n\n' +
            '// Multiple filters (AND logic):\n' +
            'var phone = Platform.Function.Lookup("CustomerData", "Phone", ["FirstName", "LastName"], ["Carolyn", "Baumgartner"]);',
    },
    {
        name: 'LookupRows',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Returns a result set of rows from a Data Extension matching filter criteria. ' +
            'Returns up to 2,000 rows. To filter by multiple columns, pass string arrays for whereFieldNames and whereFieldValues (AND logic).',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'whereFieldNames',
                description:
                    'Filter field name, or an array of field names connected with AND logic',
                type: 'string|string[]',
            },
            {
                name: 'whereFieldValues',
                description:
                    'Filter field value matching whereFieldNames; must be an array of equal length when whereFieldNames is an array',
                type: 'string|array',
            },
        ],
        returnType: 'object',
        syntax: 'Platform.Function.LookupRows(deName, whereFieldNames, whereFieldValues)',
        example:
            '// Single filter:\n' +
            'var rows = Platform.Function.LookupRows("MyDE", "Status", "active");\n' +
            'for (var i = 0; i < rows.length; i++) {\n    Write(rows[i]["Name"] + "<br>");\n}\n\n' +
            '// Multiple filters (AND logic):\n' +
            'var rows2 = Platform.Function.LookupRows("CustomerData", ["PreferredLanguage", "RewardsTier"], ["English", "Gold"]);',
    },
    {
        name: 'LookupOrderedRows',
        minArgs: 5,
        maxArgs: 5,
        description:
            'Returns an ordered result set from a Data Extension. ' +
            'The sort expression is a single string in the format "ColumnName ASC" or "ColumnName DESC". ' +
            'Multiple columns can be separated by commas. Returns up to 2,000 rows; values below 1 for count default to 2,000. ' +
            'To filter by multiple columns, pass string arrays for whereFieldNames and whereFieldValues (AND logic).',
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
                name: 'whereFieldNames',
                description:
                    'Filter field name, or an array of field names connected with AND logic',
                type: 'string|string[]',
            },
            {
                name: 'whereFieldValues',
                description:
                    'Filter field value matching whereFieldNames; must be an array of equal length when whereFieldNames is an array',
                type: 'string|array',
            },
        ],
        returnType: 'object',
        syntax: 'Platform.Function.LookupOrderedRows(deName, count, orderBy, whereFieldNames, whereFieldValues)',
        example:
            '// Single filter, sorted by LastName ASC:\n' +
            'var rows = Platform.Function.LookupOrderedRows("MyDE", 10, "LastName ASC", "RewardsTier", "Silver");\n' +
            'for (var i = 0; i < rows.length; i++) {\n    Write(rows[i]["Email"] + "<br>");\n}\n\n' +
            '// Multiple filters (AND logic):\n' +
            'var rows2 = Platform.Function.LookupOrderedRows("CustomerData", 0, "LastName ASC", ["PreferredLanguage", "RewardsTier"], ["English", "Silver"]);',
    },
    {
        name: 'InsertData',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Adds a new row to a Data Extension. ' +
            'Use this function in CloudPages, landing pages, microsites, and SMS messages. ' +
            'Use InsertDE() for email contexts.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'fieldNames',
                description: 'Array of column names to populate',
                type: 'string[]',
            },
            {
                name: 'fieldValues',
                description: 'Array of values aligned to fieldNames',
                type: 'array',
            },
        ],
        returnType: 'number',
        syntax: 'Platform.Function.InsertData(deName, fieldNames, fieldValues)',
        example:
            'var rowsAffected = Platform.Function.InsertData("MyDE", ["Email", "Name"], ["jane@example.com", "Jane"]);',
    },
    {
        name: 'InsertDE',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Adds a new row to a Data Extension. ' +
            'Use this function in email contexts. ' +
            'Use InsertData() for CloudPages, landing pages, microsites, and SMS messages.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'fieldNames',
                description: 'Array of column names to populate',
                type: 'string[]',
            },
            {
                name: 'fieldValues',
                description: 'Array of values aligned to fieldNames',
                type: 'array',
            },
        ],
        returnType: 'void',
        syntax: 'Platform.Function.InsertDE(deName, fieldNames, fieldValues)',
        example:
            'Platform.Function.InsertDE("MyDE", ["Email", "Name"], ["jane@example.com", "Jane"]);',
    },
    {
        name: 'UpdateData',
        minArgs: 5,
        maxArgs: 5,
        description:
            'Modifies existing rows in a Data Extension matching filter criteria. ' +
            'Use this function in CloudPages, landing pages, microsites, and SMS messages. ' +
            'Use UpdateDE() for email contexts.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'whereFieldNames',
                description:
                    'Column name(s) to identify the rows to update; use an array for multiple columns (AND logic)',
                type: 'string|string[]',
            },
            {
                name: 'whereFieldValues',
                description:
                    'Value(s) to match in whereFieldNames; must be an array of equal length when whereFieldNames is an array',
                type: 'string|array',
            },
            {
                name: 'fieldNames',
                description: 'Array of column names to update',
                type: 'string[]',
            },
            {
                name: 'fieldValues',
                description: 'Array of new values aligned to fieldNames',
                type: 'array',
            },
        ],
        returnType: 'number',
        syntax: 'Platform.Function.UpdateData(deName, whereFieldNames, whereFieldValues, fieldNames, fieldValues)',
        example:
            'var count = Platform.Function.UpdateData("MyDE", ["Email"], ["jane@example.com"], ["Status"], ["inactive"]);',
    },
    {
        name: 'UpdateDE',
        minArgs: 5,
        maxArgs: 5,
        description:
            'Modifies existing rows in a Data Extension matching filter criteria. ' +
            'Use this function in email contexts. ' +
            'Use UpdateData() for CloudPages, landing pages, microsites, and SMS messages.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'whereFieldNames',
                description:
                    'Column name(s) to identify the rows to update; use an array for multiple columns (AND logic)',
                type: 'string|string[]',
            },
            {
                name: 'whereFieldValues',
                description:
                    'Value(s) to match in whereFieldNames; must be an array of equal length when whereFieldNames is an array',
                type: 'string|array',
            },
            {
                name: 'fieldNames',
                description: 'Array of column names to update',
                type: 'string[]',
            },
            {
                name: 'fieldValues',
                description: 'Array of new values aligned to fieldNames',
                type: 'array',
            },
        ],
        returnType: 'number',
        syntax: 'Platform.Function.UpdateDE(deName, whereFieldNames, whereFieldValues, fieldNames, fieldValues)',
        example:
            'var count = Platform.Function.UpdateDE("MyDE", ["Email"], ["jane@example.com"], ["Status"], ["inactive"]);',
    },
    {
        name: 'UpsertData',
        minArgs: 5,
        maxArgs: 5,
        description:
            'Inserts a new row or updates an existing one in a Data Extension. ' +
            'Use this function in non-sendable contexts such as CloudPages and landing pages.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'whereFieldNames',
                description:
                    'Column name(s) to identify an existing row; use an array for multiple columns (AND logic)',
                type: 'string|string[]',
            },
            {
                name: 'whereFieldValues',
                description:
                    'Value(s) to match in whereFieldNames; must be an array of equal length when whereFieldNames is an array',
                type: 'string|array',
            },
            {
                name: 'fieldNames',
                description: 'Array of column names to insert or update',
                type: 'string[]',
            },
            {
                name: 'fieldValues',
                description: 'Array of values aligned to fieldNames',
                type: 'array',
            },
        ],
        returnType: 'number',
        syntax: 'Platform.Function.UpsertData(deName, whereFieldNames, whereFieldValues, fieldNames, fieldValues)',
        example:
            'var count = Platform.Function.UpsertData("CustomerData", ["ID"], ["12345"], ["Company", "Country"], ["exampleCompany", "USA"]);',
    },
    {
        name: 'UpsertDE',
        minArgs: 5,
        maxArgs: 5,
        description:
            'Inserts a new row or updates an existing one in a Data Extension. ' +
            'Use this function in sendable contexts such as email messages.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'whereFieldNames',
                description:
                    'Column name(s) to identify an existing row; use an array for multiple columns (AND logic)',
                type: 'string|string[]',
            },
            {
                name: 'whereFieldValues',
                description:
                    'Value(s) to match in whereFieldNames; must be an array of equal length when whereFieldNames is an array',
                type: 'string|array',
            },
            {
                name: 'fieldNames',
                description: 'Array of column names to insert or update',
                type: 'string[]',
            },
            {
                name: 'fieldValues',
                description: 'Array of values aligned to fieldNames',
                type: 'array',
            },
        ],
        returnType: 'number',
        syntax: 'Platform.Function.UpsertDE(deName, whereFieldNames, whereFieldValues, fieldNames, fieldValues)',
        example:
            'var count = Platform.Function.UpsertDE("CustomerData", ["ID"], ["12345"], ["Company", "Country"], ["exampleCompany", "USA"]);',
    },
    {
        name: 'DeleteData',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Removes rows from a Data Extension matching filter criteria. ' +
            'Use this function in non-sendable contexts such as CloudPages and landing pages. ' +
            'Use DeleteDE() for email contexts.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'whereFieldNames',
                description: 'Array of column names to match for deletion',
                type: 'string[]',
            },
            {
                name: 'whereFieldValues',
                description:
                    'Array of values aligned to whereFieldNames that identify rows to delete',
                type: 'array',
            },
        ],
        returnType: 'number',
        syntax: 'Platform.Function.DeleteData(deName, whereFieldNames, whereFieldValues)',
        example:
            'var count = Platform.Function.DeleteData("MyDE", ["Email"], ["jane@example.com"]);',
    },
    {
        name: 'DeleteDE',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Removes rows from a Data Extension matching filter criteria. ' +
            'Use this function in email contexts. ' +
            'Use DeleteData() for CloudPages, landing pages, microsites, and SMS messages.',
        params: [
            { name: 'deName', description: 'Data Extension name or external key', type: 'string' },
            {
                name: 'whereFieldNames',
                description: 'Array of column names to match for deletion',
                type: 'string[]',
            },
            {
                name: 'whereFieldValues',
                description:
                    'Array of values aligned to whereFieldNames that identify rows to delete',
                type: 'array',
            },
        ],
        returnType: 'number',
        syntax: 'Platform.Function.DeleteDE(deName, whereFieldNames, whereFieldValues)',
        example: 'var count = Platform.Function.DeleteDE("MyDE", ["Email"], ["jane@example.com"]);',
    },
    {
        name: 'ContentBlockByKey',
        minArgs: 1,
        maxArgs: 4,
        description: 'Renders a Content Builder asset referenced by customer key.',
        params: [
            {
                name: 'customerKey',
                description: 'Customer key of the Content Builder asset',
                type: 'string',
            },
            {
                name: 'regionName',
                description: 'Impression region name for tracking',
                type: 'string',
                optional: true,
            },
            {
                name: 'stopOnError',
                description:
                    'When true, returns an exception and terminates if content cannot be retrieved. When false, the call proceeds.',
                type: 'boolean',
                optional: true,
            },
            {
                name: 'fallbackContent',
                description: 'Default content to display if the call does not return content',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.ContentBlockByKey(customerKey[, regionName, stopOnError, fallbackContent])',
        example:
            'var html = Platform.Function.ContentBlockByKey("my-header-block");\nWrite(html);\n\n' +
            '// With optional params:\n' +
            'var html2 = Platform.Function.ContentBlockByKey("my-header-block", "impressionRegion", false, "defaultContent");',
    },
    {
        name: 'ContentBlockByName',
        minArgs: 1,
        maxArgs: 5,
        description:
            'Renders a Content Builder asset referenced by folder path and name. ' +
            'If the same name is used across multiple folders, supply the full path.',
        params: [
            {
                name: 'name',
                description: 'Folder path and name of the Content Builder asset',
                type: 'string',
            },
            {
                name: 'regionName',
                description: 'Impression region name for tracking',
                type: 'string',
                optional: true,
            },
            {
                name: 'stopOnError',
                description:
                    'When true, returns an error if the content area cannot be found or is invalid. When false, no error is returned.',
                type: 'boolean',
                optional: true,
            },
            {
                name: 'fallbackContent',
                description:
                    'Default content to return if an error occurs. Defaults to empty string.',
                type: 'string',
                optional: true,
            },
            {
                name: 'statusVariable',
                description:
                    'Receives the status of the call: 0 = success, -1 = no content or invalid content area',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.ContentBlockByName(name[, regionName, stopOnError, fallbackContent, statusVariable])',
        example:
            'var html = Platform.Function.ContentBlockByName("Shared Content/Footer");\nWrite(html);',
    },
    {
        name: 'ContentBlockByID',
        minArgs: 1,
        maxArgs: 4,
        description: 'Renders a Content Builder asset by its numeric identifier.',
        params: [
            { name: 'id', description: 'Numeric ID of the Content Builder asset', type: 'number' },
            {
                name: 'regionName',
                description: 'Impression region name for tracking',
                type: 'string',
                optional: true,
            },
            {
                name: 'stopOnError',
                description:
                    'When true, returns an exception and terminates if content cannot be retrieved. When false, the call proceeds.',
                type: 'boolean',
                optional: true,
            },
            {
                name: 'fallbackContent',
                description: 'Default content to display if the call does not return content',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.ContentBlockByID(id[, regionName, stopOnError, fallbackContent])',
        example:
            'var html = Platform.Function.ContentBlockByID(12345);\nWrite(html);\n\n' +
            '// With optional params:\n' +
            'var html2 = Platform.Function.ContentBlockByID(12345, "impressionRegion", false, "defaultContent");',
    },
    {
        name: 'ContentImageByKey',
        minArgs: 1,
        maxArgs: 2,
        description:
            'Returns an HTML img tag for a Content Builder image identified by its external key. An optional fallback image ID can be supplied if the primary image is not found.',
        params: [
            {
                name: 'key',
                description: 'External key of the Content Builder image',
                type: 'string',
            },
            {
                name: 'fallbackId',
                description: 'Numeric ID of a fallback image when the primary cannot be found',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.ContentImageByKey(key[, fallbackId])',
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
        syntax: 'Platform.Function.ContentImageByID(id[, fallbackId])',
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
        syntax: 'Platform.Function.TreatAsContent(content)',
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
        syntax: 'Platform.Function.BeginImpressionRegion(name)',
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
        syntax: 'Platform.Function.EndImpressionRegion([closeAll])',
        example:
            'Platform.Function.BeginImpressionRegion("footer");\nWrite(footerContent);\nPlatform.Function.EndImpressionRegion();',
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
        syntax: 'Platform.Function.Now([useContextTime])',
        example:
            'var current = Platform.Function.Now();\nWrite(current); // e.g. "8/5/2025 12:00:00 PM"\n\n// Use context time during triggered sends:\nvar sendTime = Platform.Function.Now(true);',
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
        syntax: 'Platform.Function.SystemDateToLocalDate(dateValue)',
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
        syntax: 'Platform.Function.LocalDateToSystemDate(dateValue)',
        example:
            'var localDate = "8/5/2025 12:00:00 PM";\nvar systemDate = Platform.Function.LocalDateToSystemDate(localDate);\nWrite(systemDate);',
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
        syntax: 'Platform.Function.RaiseError(message[, currentRecipientOnly[, errorCode[, errorNumber]]])',
        example:
            'var status = Platform.Function.Lookup("MyDE", "Status", "Email", emailAddress);\nif (!status) {\n    Platform.Function.RaiseError("Subscriber not found", true, "NOT_FOUND", 404);\n}',
    },
    {
        name: 'GUID',
        minArgs: 0,
        maxArgs: 0,
        description: 'Generates a new globally unique identifier string.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Function.GUID()',
        example:
            'var id = Platform.Function.GUID();\nWrite(id); // e.g. "550e8400-e29b-41d4-a716-446655440000"',
    },
    {
        name: 'IsEmailAddress',
        minArgs: 1,
        maxArgs: 1,
        description: 'Checks whether a string is a valid email address format.',
        params: [{ name: 'value', description: 'String to validate', type: 'string' }],
        returnType: 'boolean',
        syntax: 'Platform.Function.IsEmailAddress(value)',
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
        syntax: 'Platform.Function.IsPhoneNumber(value)',
        example:
            'if (Platform.Function.IsPhoneNumber(phoneInput)) {\n    Write("Valid phone");\n} else {\n    Write("Invalid phone number");\n}',
    },
    {
        name: 'CreateObject',
        minArgs: 1,
        maxArgs: 1,
        description: 'Instantiates a Marketing Cloud SOAP API object.',
        params: [{ name: 'objectType', description: 'SOAP API object type name', type: 'string' }],
        returnType: 'object',
        syntax: 'Platform.Function.CreateObject(objectType)',
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
        syntax: 'Platform.Function.SetObjectProperty(apiObject, propertyName, value)',
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
        syntax: 'Platform.Function.AddObjectArrayItem(apiObject, propertyName, value)',
        example:
            'var ts = Platform.Function.CreateObject("TriggeredSend");\nPlatform.Function.AddObjectArrayItem(ts, "Subscribers", sub);',
    },
    {
        name: 'InvokeCreate',
        minArgs: 3,
        maxArgs: 3,
        description: 'Executes a SOAP API Create call on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'status',
                description:
                    'Array that receives the status and request ID of the API call (e.g. [0, 0])',
                type: 'array',
            },
            {
                name: 'options',
                description:
                    'API configure options to include in the call. Can contain a null value.',
                type: 'object',
            },
        ],
        returnType: 'object',
        syntax: 'Platform.Function.InvokeCreate(apiObject, status, options)',
        example:
            'var StatusAndRequestID = [0, 0];\n' +
            'var result = Platform.Function.InvokeCreate(CreateRequest, StatusAndRequestID, null);\n' +
            'var status = StatusAndRequestID[0];\n' +
            'var requestID = StatusAndRequestID[1];',
    },
    {
        name: 'InvokeUpdate',
        minArgs: 3,
        maxArgs: 3,
        description: 'Executes a SOAP API Update call on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'status',
                description:
                    'Array that receives the status and request ID of the API call (e.g. [0, 0])',
                type: 'array',
            },
            {
                name: 'options',
                description:
                    'API configure options to include in the call. Can contain a null value.',
                type: 'object',
            },
        ],
        returnType: 'object',
        syntax: 'Platform.Function.InvokeUpdate(apiObject, status, options)',
        example:
            'var StatusAndRequestID = [0, 0];\n' +
            'var result = Platform.Function.InvokeUpdate(UpdateRequest, StatusAndRequestID, null);\n' +
            'var status = StatusAndRequestID[0];\n' +
            'var requestID = StatusAndRequestID[1];',
    },
    {
        name: 'InvokeDelete',
        minArgs: 3,
        maxArgs: 3,
        description: 'Executes a SOAP API Delete call on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'status',
                description:
                    'Array that receives the status and request ID of the API call (e.g. [0, 0])',
                type: 'array',
            },
            {
                name: 'options',
                description:
                    'API configure options to include in the call. Can contain a null value.',
                type: 'object',
            },
        ],
        returnType: 'object',
        syntax: 'Platform.Function.InvokeDelete(apiObject, status, options)',
        example:
            'var StatusAndRequestID = [0, 0];\n' +
            'var result = Platform.Function.InvokeDelete(DeleteRequest, StatusAndRequestID, null);\n' +
            'var status = StatusAndRequestID[0];\n' +
            'var requestID = StatusAndRequestID[1];',
    },
    {
        name: 'InvokeRetrieve',
        minArgs: 2,
        maxArgs: 2,
        description: 'Executes a SOAP API Retrieve call.',
        params: [
            {
                name: 'apiObject',
                description: 'SOAP API RetrieveRequest object instance',
                type: 'object',
            },
            {
                name: 'status',
                description:
                    'Array that receives the status and request ID of the API call (e.g. [0, 0])',
                type: 'array',
            },
        ],
        returnType: 'object',
        syntax: 'Platform.Function.InvokeRetrieve(apiObject, status)',
        example:
            'var RetrieveRequest = Platform.Function.CreateObject("RetrieveRequest");\n' +
            'Platform.Function.SetObjectProperty(RetrieveRequest, "ObjectType", "Email");\n' +
            'Platform.Function.AddObjectArrayItem(RetrieveRequest, "Properties", "Email.Name");\n' +
            'var StatusAndRequestID = [0, 0];\n' +
            'var Emails = Platform.Function.InvokeRetrieve(RetrieveRequest, StatusAndRequestID);',
    },
    {
        name: 'InvokePerform',
        minArgs: 4,
        maxArgs: 4,
        description: 'Executes a SOAP API Perform action on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            { name: 'method', description: 'Method to perform on the object', type: 'string' },
            {
                name: 'status',
                description:
                    'Array that receives the status, error code, and perform response of the API call (e.g. [0, 0, 0])',
                type: 'array',
            },
            {
                name: 'options',
                description:
                    'API configure options to include in the call. Can contain a null value.',
                type: 'object',
            },
        ],
        returnType: 'object',
        syntax: 'Platform.Function.InvokePerform(apiObject, method, status, options)',
        example:
            'var StatusAndRequestID = [0, 0, 0];\n' +
            'var result = Platform.Function.InvokePerform(APIObject, "Validate", StatusAndRequestID, null);\n' +
            'var statusMessage = StatusAndRequestID[0];\n' +
            'var errorCode = StatusAndRequestID[1];\n' +
            'var performResponse = StatusAndRequestID[2];',
    },
    {
        name: 'InvokeConfigure',
        minArgs: 4,
        maxArgs: 4,
        description: 'Executes a SOAP API Configure call on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            { name: 'method', description: 'Method to perform on the object', type: 'string' },
            {
                name: 'status',
                description:
                    'Array that receives the status and request ID of the API call (e.g. [0, 0])',
                type: 'array',
            },
            {
                name: 'options',
                description:
                    'API configure options to include in the call. Can contain a null value.',
                type: 'object',
            },
        ],
        returnType: 'object',
        syntax: 'Platform.Function.InvokeConfigure(apiObject, method, status, options)',
        example:
            'var StatusAndRequestID = [0, 0];\n' +
            'var result = Platform.Function.InvokeConfigure(ConfigureObject, "create", StatusAndRequestID, null);',
    },
    {
        name: 'InvokeExecute',
        minArgs: 3,
        maxArgs: 3,
        description: 'Executes a SOAP API Execute call on an API object.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'status',
                description:
                    'Array that receives the status and request ID of the API call (e.g. [0, 0])',
                type: 'array',
            },
            {
                name: 'options',
                description:
                    'API configure options to include in the call. Can contain a null value.',
                type: 'object',
            },
        ],
        returnType: 'object',
        syntax: 'Platform.Function.InvokeExecute(apiObject, status, options)',
        example:
            'var StatusAndRequestID = [0, 0];\n' +
            'var result = Platform.Function.InvokeExecute(ExecuteRequest, StatusAndRequestID, null);\n' +
            'var status = StatusAndRequestID[0];\n' +
            'var requestID = StatusAndRequestID[1];',
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
        syntax: 'Platform.Function.InvokeExtract(apiObject, statusArray[, options])',
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
        syntax: 'Platform.Function.InvokeSchedule(apiObject, action, schedule[, statusArray, options])',
        example:
            'var statusArr = [];\nvar result = Platform.Function.InvokeSchedule(sendDef, "start", scheduleDef, statusArr);\nWrite(result);',
    },
    {
        name: 'HTTPGet',
        minArgs: 2,
        maxArgs: 6,
        description:
            'Performs an HTTP GET request and returns the response body. ' +
            'Only works with HTTP on port 80 and HTTPS on port 443. Times out after 30 seconds.',
        params: [
            { name: 'url', description: 'URL to request', type: 'string' },
            {
                name: 'continueOnError',
                description:
                    'When true, the request terminates if an error occurs. When false, the request continues on error.',
                type: 'boolean',
            },
            {
                name: 'emptyContentHandling',
                description:
                    'How to handle a URL that returns empty content: 0 = allow empty, 1 = return error, 2 = skip subscriber',
                type: 'number',
                optional: true,
            },
            {
                name: 'headerNames',
                description: 'Array of header names to include in the GET request',
                type: 'string[]',
                optional: true,
            },
            {
                name: 'headerValues',
                description: 'Array of header values corresponding to headerNames',
                type: 'string[]',
                optional: true,
            },
            {
                name: 'statusVariable',
                description:
                    'Array that receives the status code: 0 = success, -1 = URL not found, -2 = HTTP error, -3 = success but no content',
                type: 'number[]',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.HTTPGet(url, continueOnError[, emptyContentHandling, headerNames, headerValues, statusVariable])',
        example:
            'var status = [0];\n' +
            'var content = Platform.Function.HTTPGet(\n' +
            '    "https://api.example.com/data",\n' +
            '    false,\n' +
            '    0,\n' +
            '    ["x-request-id"],\n' +
            '    ["sampleValue"],\n' +
            '    status\n' +
            ');\n' +
            'if (status[0] === 0) {\n' +
            '    var obj = Platform.Function.ParseJSON(content);\n' +
            '}',
    },
    {
        name: 'HTTPPost',
        minArgs: 3,
        maxArgs: 6,
        description:
            'Performs an HTTP POST request with a content type and payload. ' +
            'Only works with HTTP on port 80 and HTTPS on port 443. Times out after 30 seconds. ' +
            'Returns the HTTP status code (e.g. 200 for success).',
        params: [
            { name: 'url', description: 'URL to post to', type: 'string' },
            { name: 'contentType', description: 'MIME type of the request body', type: 'string' },
            { name: 'payload', description: 'Request body content', type: 'string' },
            {
                name: 'headerNames',
                description: 'Array of header names',
                type: 'string[]',
                optional: true,
            },
            {
                name: 'headerValues',
                description: 'Array of header values corresponding to headerNames',
                type: 'string[]',
                optional: true,
            },
            {
                name: 'response',
                description: 'Array that receives the response body from the POST request',
                type: 'array',
                optional: true,
            },
        ],
        returnType: 'number',
        syntax: 'Platform.Function.HTTPPost(url, contentType, payload[, headerNames, headerValues, response])',
        example:
            'var headerNames = ["Authorization"];\n' +
            'var headerValues = ["Bearer " + accessToken];\n' +
            'var response;\n' +
            'var statusCode = Platform.Function.HTTPPost(\n' +
            '    "https://api.example.com/items",\n' +
            '    "application/json",\n' +
            '    Stringify({ name: "Jane", status: "active" }),\n' +
            '    headerNames,\n' +
            '    headerValues,\n' +
            '    response\n' +
            ');\n' +
            'if (statusCode == 200) { Write(response[0]); }',
    },
    {
        name: 'ParseJSON',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Parses a JSON-formatted string (or array of strings) and returns the resulting JavaScript object (or array of objects). ' +
            'SFMC-native equivalent of JSON.parse(), which is not available in the legacy SSJS engine.',
        params: [
            {
                name: 'jsonString',
                description: 'A valid JSON-formatted string or array of JSON strings to parse',
                type: 'string|string[]',
            },
        ],
        returnType: 'object|object[]',
        syntax: 'Platform.Function.ParseJSON(jsonString)',
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
        name: 'RedirectTo',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Specifies the target of an email link as a complete URL stored in an attribute, ' +
            'data extension field, or variable. ' +
            'Use only within the href attribute of an anchor tag in HTML emails. ' +
            'In text emails, add the http:// prefix without spaces inside the parentheses. ' +
            'Include anchor tags in the email body (not in retrieved link content) to retain click-tracking.',
        params: [{ name: 'url', description: 'The URL to redirect to', type: 'string' }],
        returnType: 'void',
        syntax: 'Platform.Function.RedirectTo(url)',
        example:
            'var email = "aruiz@example.com";\n' +
            'var firstName = "Angela";\n' +
            'var baseUrl = "https://example.com?email=";\n' +
            'var nameJoin = "&name=";\n' +
            'Platform.Function.RedirectTo(baseUrl.concat(email, nameJoin, firstName));\n' +
            '// Use inside href: <a href="%%=RedirectTo(...)=%%">link</a>',
    },
    {
        name: 'UrlEncode',
        minArgs: 1,
        maxArgs: 2,
        description:
            'Percent-encodes a complete URL. ' +
            'When encodeReservedKeywords is false (default), only space characters are encoded as %20. ' +
            'When true, all URL-reserved characters are also encoded (spaces become +).',
        params: [
            { name: 'url', description: 'The complete URL to encode', type: 'string' },
            {
                name: 'encodeReservedKeywords',
                description:
                    'When true, encodes all reserved characters; spaces become +. ' +
                    'When false (default), only spaces are encoded as %20.',
                type: 'boolean',
                optional: true,
                default: false,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.UrlEncode(url[, encodeReservedKeywords])',
        example:
            'var baseURL = "http://www.example.com?value=12+3 12;3";\n' +
            'var encoded = Platform.Function.UrlEncode(baseURL);\n' +
            'Write(encoded); // "http://www.example.com?value=12+3%2012;3"\n' +
            'var encodedFull = Platform.Function.UrlEncode(baseURL, true);\n' +
            'Write(encodedFull); // "http://www.example.com?value%3d12%2b3+12%3b3"',
    },
    {
        name: 'Write',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Outputs the specified string value to the rendered page. ' +
            'Distinct from `Platform.Response.Write()`, which writes to the HTTP response output.',
        params: [
            {
                name: 'content',
                description: 'The string content to write to the page output.',
                type: 'string',
            },
        ],
        returnType: 'void',
        syntax: 'Platform.Function.Write(content)',
        example: 'Platform.Function.Write("Hello, world!");',
    },
    {
        name: 'Stringify',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Converts a JavaScript object into its JSON string representation. ' +
            'Works only with known JSON-serializable types. ' +
            'Not to be confused with `String()`, which converts CLR response objects to plain strings.',
        params: [
            {
                name: 'object',
                description: 'JavaScript object to serialize to JSON.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnDescription: 'JSON string representation of the object.',
        syntax: 'Platform.Function.Stringify(object)',
        example:
            'var json = Platform.Function.Stringify({ name: "Jane", age: 30 });\nPlatform.Function.Write(json);',
    },
    {
        name: 'ContentArea',
        minArgs: 1,
        maxArgs: 4,
        deprecated: true,
        description:
            'Retrieves content from a specified classic Content Area by numeric ID. ' +
            'Deprecated — Content Areas are no longer supported on current SFMC infrastructure.',
        params: [
            { name: 'id', description: 'Numeric ID of the Content Area.', type: 'number' },
            {
                name: 'regionName',
                description: 'Impression region for content.',
                type: 'string',
                optional: true,
            },
            {
                name: 'stopOnError',
                description: 'When true, throws on failure; when false the call proceeds.',
                type: 'boolean',
                optional: true,
            },
            {
                name: 'fallbackContent',
                description: 'Default content to display when the area cannot be retrieved.',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        returnDescription: 'Rendered content from the Content Area.',
        syntax: 'Platform.Function.ContentArea(id[, regionName, stopOnError, fallbackContent])',
        example:
            'var content = Platform.Function.ContentArea(123456, "impressionRegion", false, "defaultContentHere");',
    },
    {
        name: 'ContentAreaByName',
        minArgs: 1,
        maxArgs: 4,
        deprecated: true,
        description:
            'Retrieves content from a specified classic Content Area by name. ' +
            'Deprecated — Content Areas are no longer supported on current SFMC infrastructure.',
        params: [
            { name: 'name', description: 'Name of the Content Area.', type: 'string' },
            {
                name: 'regionName',
                description: 'Impression region for content.',
                type: 'string',
                optional: true,
            },
            {
                name: 'stopOnError',
                description: 'When true, throws on failure; when false the call proceeds.',
                type: 'boolean',
                optional: true,
            },
            {
                name: 'fallbackContent',
                description: 'Default content to display when the area cannot be retrieved.',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        returnDescription: 'Rendered content from the Content Area.',
        syntax: 'Platform.Function.ContentAreaByName(name[, regionName, stopOnError, fallbackContent])',
        example: String.raw`var content = Platform.Function.ContentAreaByName("My Content\\myContentArea", "impressionRegion", false, "defaultContentHere");`,
    },
    {
        name: 'IsCHTMLBrowser',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Indicates whether the passed-in user-agent value represents a CHTML browser. ' +
            'CHTML browsers (e.g. feature phones) use a modified version of HTML. ' +
            'Returns true when the user agent is a CHTML browser.',
        params: [
            {
                name: 'userAgentString',
                description: 'User-agent string to evaluate.',
                type: 'string',
            },
        ],
        returnType: 'boolean',
        returnDescription: 'True if the user agent represents a CHTML browser.',
        syntax: 'Platform.Function.IsCHTMLBrowser(userAgentString)',
        example:
            'Platform.Response.Write(Platform.Request.UserAgent);\n' +
            'Platform.Response.Write("<br>Is CHTML: ");\n' +
            'Platform.Response.Write(Platform.Function.IsCHTMLBrowser(Platform.Request.UserAgent));',
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
        methods: ['Init', 'Add', 'Retrieve'],
        requiresCoreLoad: true,
        description:
            'Manages Data Extension definitions and their field schemas. ' +
            'Note: Core Library DataExtension methods do not support enterprise-level data extensions.',
    },
    {
        name: 'DataExtension.Fields',
        methods: ['Add', 'Retrieve', 'UpdateSendableField'],
        requiresCoreLoad: true,
        description: 'Accesses and manages field definitions within a Data Extension.',
    },
    {
        name: 'DataExtension.Rows',
        methods: ['Add', 'Retrieve', 'Update', 'Remove', 'Lookup'],
        requiresCoreLoad: true,
        description:
            'Manages individual rows within a Data Extension. ' +
            'CAVEAT: Rows.Retrieve() does NOT work on CloudPages.',
    },
    {
        name: 'Subscriber',
        methods: [
            'Init',
            'Add',
            'Retrieve',
            'Update',
            'Remove',
            'Unsubscribe',
            'Upsert',
            'Statistics',
        ],
        requiresCoreLoad: true,
        description: 'Manages subscriber records in the account.',
    },
    {
        name: 'Subscriber.Attributes',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Accesses attributes belonging to a specific subscriber.',
    },
    {
        name: 'Subscriber.Lists',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Lists the subscriber lists a specific subscriber belongs to.',
    },
    {
        name: 'Email',
        methods: ['Init', 'Add', 'Retrieve', 'Update', 'Remove', 'Validate', 'CheckContent'],
        requiresCoreLoad: true,
        description: 'Manages email message definitions.',
    },
    {
        name: 'TriggeredSend',
        methods: ['Init', 'Add', 'Retrieve', 'Update', 'Send', 'Pause', 'Publish', 'Start'],
        requiresCoreLoad: true,
        description:
            'Manages triggered send definitions and fires individual sends. ' +
            'Note: TriggeredSend methods cannot be used in the context of an email message or email preview.',
    },
    {
        name: 'TriggeredSend.Tracking',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves tracking data for a specific triggered send.',
    },
    {
        name: 'TriggeredSend.Tracking.Clicks',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves click tracking data for a specific triggered send.',
    },
    {
        name: 'TriggeredSend.Tracking.TotalByInterval',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Returns aggregated tracking data for a triggered send by type and interval.',
    },
    {
        name: 'List',
        methods: ['Init', 'Add', 'Retrieve', 'Remove', 'Subscribers'],
        requiresCoreLoad: true,
        description: 'Manages subscriber lists.',
    },
    {
        name: 'List.Subscribers',
        methods: ['Add', 'Retrieve', 'Unsubscribe', 'Update', 'Upsert'],
        requiresCoreLoad: true,
        description: 'Manages the subscribers belonging to a specific list.',
    },
    {
        name: 'List.Subscribers.Tracking',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves tracking data for subscribers on a specific list.',
    },
    {
        name: 'ContentAreaObj',
        methods: ['Init', 'Add', 'Retrieve', 'Update', 'Remove'],
        deprecated: true,
        requiresCoreLoad: true,
        description:
            'Manages classic content area objects. ' +
            'DEPRECATED — Content Areas have been deprecated; new content areas cannot be created or updated. ' +
            'Existing content areas remain readable on older accounts only.',
    },
    {
        name: 'Folder',
        methods: ['Init', 'Add', 'Retrieve', 'Update', 'Remove', 'SetID'],
        requiresCoreLoad: true,
        description: 'Manages folder structures within the Marketing Cloud account.',
    },
    {
        name: 'QueryDefinition',
        methods: [...STANDARD_METHODS, 'Perform'],
        description: 'Manages SQL query activity definitions.',
    },
    {
        name: 'Send',
        methods: ['Init', 'Add', 'Retrieve', 'RetrieveLists', 'Remove', 'CancelSend'],
        requiresCoreLoad: true,
        description: 'Manages email sends.',
    },
    {
        name: 'Send.Tracking',
        methods: ['Retrieve', 'ClickRetrieve', 'TotalByIntervalRetrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves tracking data for a specific send.',
    },
    {
        name: 'Send.Definition',
        methods: [
            'Init',
            'Add',
            'AddWithDE',
            'AddWithFilterDefinition',
            'Retrieve',
            'Update',
            'Remove',
            'Send',
        ],
        requiresCoreLoad: true,
        description:
            'Manages reusable Send Definition configurations that define all parameters for a send including content, audience, and delivery settings.',
    },
    {
        name: 'Template',
        methods: ['Init', 'Add', 'Retrieve', 'Update'],
        requiresCoreLoad: true,
        description: 'Manages email template definitions.',
    },
    {
        name: 'DeliveryProfile',
        methods: ['Init', 'Add', 'Update', 'Remove'],
        requiresCoreLoad: true,
        description:
            'Manages delivery profile configurations. ' +
            'Note: DeliveryProfile.Retrieve() does not exist.',
    },
    {
        name: 'SenderProfile',
        methods: ['Init', 'Add', 'Update', 'Remove'],
        requiresCoreLoad: true,
        description:
            'Manages sender profile definitions. ' +
            'Note: SenderProfile.Retrieve() does not exist. ' +
            'SenderProfile methods only work on landing pages — they cannot run inside email messages at send time.',
    },
    {
        name: 'SendClassification',
        methods: ['Init', 'Add', 'Retrieve', 'Update', 'Remove'],
        requiresCoreLoad: true,
        description: 'Manages send classification settings.',
    },
    {
        name: 'FilterDefinition',
        methods: STANDARD_METHODS,
        description: 'Manages data filter definitions.',
    },
    {
        name: 'Account',
        methods: ['Init', 'Retrieve', 'Update'],
        requiresCoreLoad: true,
        description: 'Manages Marketing Cloud account settings.',
    },
    {
        name: 'AccountUser',
        methods: ['Init', 'Add', 'Retrieve', 'Update', 'Activate', 'Deactivate'],
        requiresCoreLoad: true,
        description: 'Manages user accounts within the Marketing Cloud business unit.',
    },
    {
        name: 'Account.Tracking',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves tracking data associated with account-level sends.',
    },
    {
        name: 'Portfolio',
        methods: ['Init', 'Add', 'Retrieve', 'Update', 'Remove'],
        requiresCoreLoad: true,
        description: 'Manages portfolio (file) items in the account.',
    },
    {
        name: 'BounceEvent',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves bounce event data for message sends.',
    },
    {
        name: 'ClickEvent',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves click tracking event data for message sends.',
    },
    {
        name: 'ForwardedEmailEvent',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves forwarded email event data for message sends.',
    },
    {
        name: 'ForwardedEmailOptInEvent',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves forwarded email opt-in event data for message sends.',
    },
    {
        name: 'NotSentEvent',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves not-sent event data for message sends.',
    },
    {
        name: 'OpenEvent',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves open tracking event data for message sends.',
    },
    {
        name: 'SentEvent',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves sent event data for message sends.',
    },
    {
        name: 'SurveyEvent',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves survey response event data for message sends.',
    },
    {
        name: 'UnsubEvent',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves unsubscribe event data for message sends.',
    },
    {
        name: 'DateTime.TimeZone',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Time zone utilities for SSJS date/time conversions.',
    },
];

export const coreObjectNames = new Set(CORE_LIBRARY_OBJECTS.map((o) => o.name));

export const coreObjectLookup = new Map(CORE_LIBRARY_OBJECTS.map((o) => [o.name, o]));

// ── Core Library — rich method definitions ───────────────────────────────────
// Each export below provides full parameter/return/syntax/example metadata for
// a Core Library namespace. The matching CORE_LIBRARY_OBJECTS entry lists the
// method names; these exports carry the rich shapes for completions and hover.

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const ACCOUNT_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes an Account instance bound to the specified external key. ' +
            'Required before invoking any other Account method on the returned instance.',
        params: [{ name: 'key', description: 'External key of the account.', type: 'string' }],
        returnType: 'AccountInstance',
        returnDescription: 'An initialized Account bound to the specified external key.',
        syntax: 'Account.Init(key)',
        example:
            'Platform.Load("core", "1.1.5");\n' + 'var myAccount = Account.Init("MyCustomerKey");',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Retrieves accounts based on the specified filter criteria.',
        params: [
            {
                name: 'filter',
                description:
                    'Criteria used to search for the account. Use a filter expression or a JSON object containing filter and additional search parameters.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of results matching the filter.',
        syntax: 'Account.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var getAcct = Account.Retrieve({Property:"CustomerKey",SimpleOperator:"equals",Value:"MyAccount"});',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Updates the account with the supplied attributes. ' +
            'If `properties` includes `TimeZoneID`, the call uses that value to update the account time zone.',
        params: [
            { name: 'properties', description: 'Account attributes to change.', type: 'object' },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<AccountInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myAccount = Account.Init("MyCustomerKey");\n' +
            'var status = myAccount.Update({ "FromName" : "Demo From Name" });',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const ACCOUNT_TRACKING_METHODS = [
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns an array of tracking data related to the accounts specified by the passed filter argument.',
        params: [
            {
                name: 'filter',
                description: 'Criteria used to search for the account.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of results matching the filter.',
        syntax: 'Account.Tracking.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var acctTracking = Account.Tracking.Retrieve({Property:"CustomerKey",SimpleOperator:"equals",Value:"MyAccount"});',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const ACCOUNT_USER_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 2,
        maxArgs: 2,
        description:
            'Initializes an AccountUser instance bound to the specified external key and client ID (MID). ' +
            'Required before invoking any other AccountUser method on the returned instance.',
        params: [
            { name: 'targetUserKey', description: 'External key of the user.', type: 'string' },
            { name: 'myClientID', description: 'MID of the business unit.', type: 'number' },
        ],
        returnType: 'AccountUserInstance',
        returnDescription:
            'An initialized AccountUser bound to the specified external key and client ID.',
        syntax: 'AccountUser.Init(targetUserKey, myClientID)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var acctUser = AccountUser.Init("myAccountUser", 123456789);',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Creates a new account user from the supplied properties object.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new account user (Name, UserID, Password, Email, ClientID, DefaultBusinessUnitKey, AssociatedBusinessUnits, ...).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'AccountUser.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var newUser = {\n' +
            '    "Name": "Andrea Cruz",\n' +
            '    "UserID": "acruz",\n' +
            '    "Password": "insert new password here",\n' +
            '    "Email": "acruz@example.com",\n' +
            '    "ClientID": 123456789,\n' +
            '    "DefaultBusinessUnitKey": "childBUKey",\n' +
            '    "AssociatedBusinessUnits": ["childBUKey", "grandchildBUKey"]\n' +
            '};\n' +
            'var status = AccountUser.Add(newUser);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Retrieves account users based on the specified filter criteria.',
        params: [
            {
                name: 'filter',
                description: 'Criteria used to search for the account user.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of results matching the filter.',
        syntax: 'AccountUser.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var accountUser = AccountUser.Retrieve({Property:"CustomerKey",SimpleOperator:"equals",Value:"MyAccount"});',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the account user with the supplied attributes.',
        params: [
            {
                name: 'properties',
                description: 'Attributes of the account user to change.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<AccountUserInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var acctUser = AccountUser.Init("myAccountUser", 123456789);\n' +
            'var status = acctUser.Update({ "Password": "XXXXX" });',
    },
    {
        name: 'Activate',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Activates the account user.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<AccountUserInstance>.Activate()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var acctUser = AccountUser.Init("myAccountUser", 123456789);\n' +
            'var status = acctUser.Activate();',
    },
    {
        name: 'Deactivate',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Deactivates the account user. ' +
            'Note: account users cannot be deleted via server-side JavaScript — deactivation is the only "removal" path.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<AccountUserInstance>.Deactivate()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var acctUser = AccountUser.Init("myAccountUser", 123456789);\n' +
            'var status = acctUser.Deactivate();',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const PORTFOLIO_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a Portfolio instance bound to the specified external key. ' +
            'Required before invoking any other Portfolio method on the returned instance.',
        params: [{ name: 'key', description: 'External key of the portfolio.', type: 'string' }],
        returnType: 'PortfolioInstance',
        returnDescription: 'An initialized Portfolio bound to the specified external key.',
        syntax: 'Portfolio.Init(key)',
        example:
            'Platform.Load("core", "1.1.5");\n' + 'var portObj = Portfolio.Init("myPortfolioCK");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Creates a new portfolio (file) object from the supplied properties.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new portfolio item (DisplayName, CustomerKey, CategoryID, FileName, FileLocation).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'Portfolio.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var newPortfolio = {\n' +
            '    DisplayName: "SSJS Portfolio Object",\n' +
            '    CustomerKey: "myPortfolioCK",\n' +
            '    CategoryID: 12345,\n' +
            '    FileName: "logo.png",\n' +
            '    FileLocation: "http://www.example.com/Portals/0/images/global/logo_main.png"\n' +
            '};\n' +
            'var status = Portfolio.Add(newPortfolio);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns an array of portfolio objects matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'Criteria used to search for portfolio objects. PascalCase WSProxy-style filter object: `{Property, SimpleOperator, Value}`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of portfolio objects matching the filter.',
        syntax: 'Portfolio.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var portObjArr = Portfolio.Retrieve({ Property: "CustomerKey", SimpleOperator: "equals", Value: "PortfolioObjectKey" });',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the portfolio object with the supplied attributes.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the portfolio object.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<PortfolioInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var portObj = Portfolio.Init("myPortfolioCK");\n' +
            'var status = portObj.Update({ DisplayName: "Updated SSJS Image" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes the previously initialized portfolio object.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<PortfolioInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var portObj = Portfolio.Init("myPortfolioCK");\n' +
            'var status = portObj.Remove();',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const CONTENT_AREA_OBJ_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        deprecated: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a ContentAreaObj instance bound to the specified external key. ' +
            'DEPRECATED — Content Areas have been deprecated; new content areas cannot be created or updated. Existing content areas remain readable on older accounts only.',
        params: [{ name: 'key', description: 'External key of the content area.', type: 'string' }],
        returnType: 'ContentAreaObjInstance',
        returnDescription: 'An initialized ContentAreaObj bound to the specified external key.',
        syntax: 'ContentAreaObj.Init(key)',
        example: 'Platform.Load("core", "1.1.5");\n' + 'var area = ContentAreaObj.Init("myCA");',
    },
    {
        name: 'Add',
        isStatic: true,
        deprecated: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new content area from the supplied properties. ' +
            'DEPRECATED — calls fail on accounts where the Content Areas feature has been retired.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new content area (CustomerKey, Name, CategoryID, Layout, LayoutSpecified, Content).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'ContentAreaObj.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var exampleArea = {\n' +
            '    CustomerKey: "exampleArea",\n' +
            '    Name: "SSJS Content Area Example",\n' +
            '    CategoryID: 123456,\n' +
            '    Layout: "RawText",\n' +
            '    LayoutSpecified: true,\n' +
            '    Content: "<b>This is example content</b>"\n' +
            '};\n' +
            'var status = ContentAreaObj.Add(exampleArea);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        deprecated: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns an array of content areas matching the specified filter. ' +
            'DEPRECATED — read-only access only; the Content Areas feature has been retired for new content.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object: `{Property, SimpleOperator, Value}`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of content areas matching the filter.',
        syntax: 'ContentAreaObj.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var results = ContentAreaObj.Retrieve({ Property: "CustomerKey", SimpleOperator: "equals", Value: "myCA" });',
    },
    {
        name: 'Update',
        isStatic: false,
        deprecated: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Updates the content area with the supplied attributes. ' +
            'DEPRECATED — calls fail on accounts where the Content Areas feature has been retired.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the content area.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<ContentAreaObjInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var obj = ContentAreaObj.Init("myCA");\n' +
            'var status = obj.Update({ Name: "Name Updated By SSJS" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        deprecated: true,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Removes the previously initialized content area. ' +
            'DEPRECATED — calls fail on accounts where the Content Areas feature has been retired.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<ContentAreaObjInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var obj = ContentAreaObj.Init("myCA");\n' +
            'var status = obj.Remove();',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const FOLDER_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 1,
        description:
            'Initializes a Folder instance, optionally bound to the specified external key. ' +
            'When called without arguments, a subsequent `<FolderInstance>.SetID(id)` call is required to bind the instance to a specific folder.',
        params: [
            {
                name: 'key',
                description:
                    'External key of the folder. Optional — pass nothing and use `SetID()` when the folder has no external key.',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'FolderInstance',
        returnDescription:
            'An initialized Folder; bound to the specified external key when one is supplied.',
        syntax: 'Folder.Init([key])',
        example:
            'Platform.Load("core", "1");\n' +
            'var myFolder = Folder.Init("myFolder");\n' +
            '// or, when the folder has no external key:\n' +
            'var myIDFolder = Folder.Init();\n' +
            'myIDFolder.SetID(12345);',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Creates a new folder as a child of an existing folder.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new folder (Name, CustomerKey, Description, ContentType, IsActive, IsEditable, AllowChildren, ParentFolderID).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'Folder.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var newFolder = {\n' +
            '    Name: "Test Add Folder",\n' +
            '    CustomerKey: "test_folder_key",\n' +
            '    Description: "Test added",\n' +
            '    ContentType: "email",\n' +
            '    IsActive: "true",\n' +
            '    IsEditable: "true",\n' +
            '    AllowChildren: "false",\n' +
            '    ParentFolderID: 123456\n' +
            '};\n' +
            'var status = Folder.Add(newFolder);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns an array of folders matching the specified filter. ' +
            'Supports simple `{Property, SimpleOperator, Value}` filters and complex filters with `LeftOperand`, `LogicalOperator`, `RightOperand`. Use dot notation (e.g. `ParentFolder.Name`) to filter on child fields.',
        params: [
            {
                name: 'filter',
                description: 'WSProxy-style filter object — simple or compound with `AND`/`OR`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'Array of folder objects (including nested `ParentFolder` info).',
        syntax: 'Folder.Retrieve(filter)',
        example:
            'Platform.Load("core", "1");\n' +
            'var folders = Folder.Retrieve({\n' +
            '    Property: "ParentFolder.Name",\n' +
            '    SimpleOperator: "equals",\n' +
            '    Value: "RewardsProgram"\n' +
            '});\n' +
            'Write(Stringify(folders));',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the folder with the supplied attributes.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the folder.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<FolderInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myFolder = Folder.Init("myFolder");\n' +
            'var status = myFolder.Update({ Name: "Updated Folder Name" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes the previously initialized folder.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<FolderInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myFolder = Folder.Init("myFolder");\n' +
            'myFolder.Remove();',
    },
    {
        name: 'SetID',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Binds a previously initialized Folder instance to a specific folder ID. ' +
            'Use this when the folder has no external key, after calling `Folder.Init()` without arguments.',
        params: [
            {
                name: 'id',
                description: 'The folder ID to bind to this Folder instance.',
                type: 'number',
            },
        ],
        returnType: 'void',
        returnDescription: 'No return value.',
        syntax: '<FolderInstance>.SetID(id)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myIDFolder = Folder.Init();\n' +
            'myIDFolder.SetID(12345);',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const TEMPLATE_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a Template instance bound to the specified external key. ' +
            'Required before invoking any other Template method on the returned instance.',
        params: [{ name: 'key', description: 'External key of the template.', type: 'string' }],
        returnType: 'TemplateInstance',
        returnDescription: 'An initialized Template bound to the specified external key.',
        syntax: 'Template.Init(key)',
        example: 'Platform.Load("core", "1");\n' + 'var t = Template.Init("myTemplate");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Creates a new template from the supplied properties.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new template (CustomerKey, TemplateName, LayoutHTML).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'Template.Add(properties)',
        example:
            'Platform.Load("core", "1");\n' +
            'var myTemp = {\n' +
            '    CustomerKey: "test_template",\n' +
            '    TemplateName: "SSJS Test Template",\n' +
            '    LayoutHTML: "this is some HTML"\n' +
            '};\n' +
            'var status = Template.Add(myTemp);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns an array of templates matching the specified filter. ' +
            'Pass `{ Filter: { Property, SimpleOperator, Value }, QueryAllAccounts: true }` to query across all accessible accounts.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object, optionally wrapped with `QueryAllAccounts: true`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of templates matching the filter.',
        syntax: 'Template.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var getTemplate = Template.Retrieve({ Property: "CustomerKey", SimpleOperator: "equals", Value: "MyTemplate" });',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the template with the supplied attributes.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the template.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<TemplateInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myTemplate = Template.Init("myTemplateCK");\n' +
            'var status = myTemplate.Update({ TemplateName: "Edited Template" });',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const DELIVERY_PROFILE_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a DeliveryProfile instance bound to the specified external key. ' +
            'Required before invoking any other DeliveryProfile method on the returned instance.',
        params: [
            { name: 'key', description: 'External key of the delivery profile.', type: 'string' },
        ],
        returnType: 'DeliveryProfileInstance',
        returnDescription: 'An initialized DeliveryProfile bound to the specified external key.',
        syntax: 'DeliveryProfile.Init(key)',
        example:
            'Platform.Load("core", "1");\n' +
            'var myProfile = DeliveryProfile.Init("myDeliveryProfile");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Creates a new delivery profile from the supplied properties.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new delivery profile (Name, CustomerKey, Description, SourceAddressType, ...).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'DeliveryProfile.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var newDP = {\n' +
            '    Name: "SSJS Added Delivery Profile",\n' +
            '    CustomerKey: "test_delivery_profile",\n' +
            '    Description: "An SSJS Added Profile",\n' +
            '    SourceAddressType: "DefaultPrivateIPAddress"\n' +
            '};\n' +
            'var status = DeliveryProfile.Add(newDP);',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the delivery profile with the supplied attributes.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the delivery profile.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<DeliveryProfileInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myProfile = DeliveryProfile.Init("myDeliveryProfile");\n' +
            'var status = myProfile.Update({ Name: "SSJS Updated Delivery Profile" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes the previously initialized delivery profile.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<DeliveryProfileInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myProfile = DeliveryProfile.Init("myDeliveryProfile");\n' +
            'var status = myProfile.Remove();',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const SENDER_PROFILE_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a SenderProfile instance bound to the specified external key. ' +
            'Note: SenderProfile methods only work on landing pages — they cannot run inside email messages at send time.',
        params: [
            { name: 'key', description: 'External key of the sender profile.', type: 'string' },
        ],
        returnType: 'SenderProfileInstance',
        returnDescription: 'An initialized SenderProfile bound to the specified external key.',
        syntax: 'SenderProfile.Init(key)',
        example:
            'Platform.Load("core", "1");\n' +
            'var myProfile = SenderProfile.Init("mySenderProfile");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Creates a new sender profile from the supplied properties.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new sender profile (Name, CustomerKey, Description, FromName, FromAddress, ...).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'SenderProfile.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var newSP = {\n' +
            '    Name: "SSJS Added Send Profile",\n' +
            '    CustomerKey: "test_send_profile",\n' +
            '    Description: "An SSJS Added Profile",\n' +
            '    FromName: "Andrea Cruz",\n' +
            '    FromAddress: "acruz@example.com"\n' +
            '};\n' +
            'var status = SenderProfile.Add(newSP);',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the sender profile with the supplied attributes.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the sender profile.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SenderProfileInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myProfile = SenderProfile.Init("mySenderProfile");\n' +
            'var status = myProfile.Update({ Name: "SSJS Updated Sender Profile" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes the previously initialized sender profile.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SenderProfileInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myProfile = SenderProfile.Init("mySenderProfile");\n' +
            'var status = myProfile.Remove();',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const SEND_CLASSIFICATION_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a SendClassification instance bound to the specified external key. ' +
            'Required before invoking any other SendClassification method on the returned instance.',
        params: [
            {
                name: 'key',
                description: 'External key of the send classification.',
                type: 'string',
            },
        ],
        returnType: 'SendClassificationInstance',
        returnDescription: 'An initialized SendClassification bound to the specified external key.',
        syntax: 'SendClassification.Init(key)',
        example:
            'Platform.Load("core", "1");\n' +
            'var sc = SendClassification.Init("mySendClassification");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Creates a new send classification from the supplied properties.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new send classification (CustomerKey, Name, Description, SenderProfileKey, DeliveryProfileKey).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'SendClassification.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var newSC = {\n' +
            '    CustomerKey: "mySCKey",\n' +
            '    Name: "SSJS Test SC",\n' +
            '    Description: "Test SSJS description",\n' +
            '    SenderProfileKey: "mySPKey",\n' +
            '    DeliveryProfileKey: "myDPKey"\n' +
            '};\n' +
            'SendClassification.Add(newSC);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns an array of send classifications matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object: `{Property, SimpleOperator, Value}`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of send classifications matching the filter.',
        syntax: 'SendClassification.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var results = SendClassification.Retrieve({ Property: "CustomerKey", SimpleOperator: "equals", Value: "mySendClassification" });',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Updates the send classification with the supplied attributes. ' +
            'You must include both `SenderProfileKey` and `DeliveryProfileKey` in `properties` for the update to succeed.',
        params: [
            {
                name: 'properties',
                description:
                    'Attributes to change. Must include `SenderProfileKey` and `DeliveryProfileKey`.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SendClassificationInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var sc = SendClassification.Init("mySendClassification");\n' +
            'var updatedSC = {\n' +
            '    Name: "Updated Send Classification",\n' +
            '    SenderProfileKey: "mySPKey",\n' +
            '    DeliveryProfileKey: "myDPKey"\n' +
            '};\n' +
            'var status = sc.Update(updatedSC);',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes the previously initialized send classification.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SendClassificationInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var sc = SendClassification.Init("mySendClassification");\n' +
            'var status = sc.Remove();',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const FILTER_DEFINITION_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a FilterDefinition instance bound to the specified external key. ' +
            'Required before invoking any other FilterDefinition method on the returned instance.',
        params: [
            { name: 'key', description: 'External key of the filter definition.', type: 'string' },
        ],
        returnType: 'FilterDefinitionInstance',
        returnDescription: 'An initialized FilterDefinition bound to the specified external key.',
        syntax: 'FilterDefinition.Init(key)',
        example: 'Platform.Load("core", "1");\n' + 'var fd = FilterDefinition.Init("myFilterDef");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new filter definition from the supplied properties. ' +
            'The `Filter` field accepts either a simple `{Property, SimpleOperator, Value}` filter or a complex filter with `LeftOperand`, `LogicalOperator`, `RightOperand`. ' +
            '`DataSource.Type` must be `"SubscriberList"` or `"DataExtension"`.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new filter definition (Name, CustomerKey, Filter, DataSource).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'FilterDefinition.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var filterObj = { Property: "LuckyNumber", SimpleOperator: "equals", Value: 77 };\n' +
            'var newFD = {\n' +
            '    Name: "SSJS Filter Definition",\n' +
            '    CustomerKey: "myFilterDef",\n' +
            '    Filter: filterObj,\n' +
            '    DataSource: { Type: "SubscriberList", CustomerKey: "example_list_key" }\n' +
            '};\n' +
            'var status = FilterDefinition.Add(newFD);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns an array of filter definitions matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object: `{Property, SimpleOperator, Value}`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of filter definitions matching the filter.',
        syntax: 'FilterDefinition.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var results = FilterDefinition.Retrieve({ Property: "CustomerKey", SimpleOperator: "equals", Value: "myFilterDef" });',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the filter definition with the supplied attributes.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the filter definition.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<FilterDefinitionInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var fd = FilterDefinition.Init("myFilterDef");\n' +
            'var status = fd.Update({ Name: "Updated Name" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Deletes the previously initialized filter definition.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<FilterDefinitionInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myFD = FilterDefinition.Init("myFilterDef");\n' +
            'myFD.Remove();',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const QUERY_DEFINITION_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a QueryDefinition instance bound to the specified external key. ' +
            'Required before invoking any other QueryDefinition method on the returned instance.',
        params: [
            { name: 'key', description: 'External key of the query definition.', type: 'string' },
        ],
        returnType: 'QueryDefinitionInstance',
        returnDescription: 'An initialized QueryDefinition bound to the specified external key.',
        syntax: 'QueryDefinition.Init(key)',
        example: 'Platform.Load("core", "1");\n' + 'var qd = QueryDefinition.Init("myQueryDef");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new query definition from the supplied properties. ' +
            'Pass an optional `CategoryID` to place the query inside a specific folder.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new query definition (Name, CustomerKey, optional CategoryID, TargetUpdateType, TargetType, Target, QueryText).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'QueryDefinition.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var queryDef = {\n' +
            '    Name: "Example Query Definition",\n' +
            '    CustomerKey: "myQueryDef",\n' +
            '    TargetUpdateType: "Overwrite",\n' +
            '    TargetType: "DE",\n' +
            '    Target: { Name: "Example Target DE", CustomerKey: "example_target_de" },\n' +
            '    QueryText: "SELECT SubKey, Email, Name FROM [Example Target DE] where FavoriteItemID=77"\n' +
            '};\n' +
            'var status = QueryDefinition.Add(queryDef);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns an array of query definitions matching the specified filter. ' +
            'Supports simple `{Property, SimpleOperator, Value}` filters and complex filters with `LeftOperand`, `LogicalOperator`, `RightOperand`.',
        params: [
            {
                name: 'filter',
                description: 'WSProxy-style filter object — simple or compound with `AND`/`OR`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription:
            'Array of query definition objects (with nested `DataExtensionTarget` info when applicable).',
        syntax: 'QueryDefinition.Retrieve(filter)',
        example:
            'Platform.Load("Core", "1");\n' +
            'var result = QueryDefinition.Retrieve({\n' +
            '    Property: "Status",\n' +
            '    SimpleOperator: "equals",\n' +
            '    Value: "Active"\n' +
            '});\n' +
            'Write(Stringify(result));',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the query definition with the supplied attributes.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the query definition.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<QueryDefinitionInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var qd = QueryDefinition.Init("myQueryDef");\n' +
            'var status = qd.Update({\n' +
            '    Name: "Updated Query Definition Name",\n' +
            '    QueryText: "SELECT SubKey, Email, Name FROM [Example Target DE] where FavoriteItemID=12"\n' +
            '});',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes the previously initialized query definition.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<QueryDefinitionInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var qd = QueryDefinition.Init("myQueryDef");\n' +
            'var status = qd.Remove();',
    },
    {
        name: 'Perform',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Executes the query definition. Runs the SQL and writes results into the configured target Data Extension.',
        params: [
            {
                name: 'action',
                description: 'The action to perform. Use `"start"` to execute the query.',
                type: 'string',
                enum: ['start'],
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<QueryDefinitionInstance>.Perform(action)',
        example:
            'Platform.Load("core", "1");\n' +
            'var qd = QueryDefinition.Init("MY_QUERY_KEY");\n' +
            'var result = qd.Perform("start");\n' +
            'Write(Stringify(result));',
    },
];

// ── List / Subscriber methods ────────────────────────────────────────────────

export const LIST_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a List instance bound to the specified external key. ' +
            'Required before invoking any other List method on the returned instance.',
        params: [{ name: 'key', description: 'External key of the list.', type: 'string' }],
        returnType: 'ListInstance',
        returnDescription: 'An initialized List bound to the specified external key.',
        syntax: 'List.Init(key)',
        example: 'Platform.Load("core", "1");\n' + 'var myList = List.Init("myList");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new list from the supplied properties and returns an initialized list instance. ' +
            'Note: unlike most static `Add` methods, this returns a `ListInstance`, not `"OK"`.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new list (CustomerKey, Name, Description, ...).',
                type: 'object',
            },
        ],
        returnType: 'ListInstance',
        returnDescription: 'An initialized List bound to the newly-created list.',
        syntax: 'List.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myNewList = List.Add({ CustomerKey: "libList", Name: "testLib", Description: "desc" });',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns an array of lists matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object: `{Property, SimpleOperator, Value}`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of list objects matching the filter.',
        syntax: 'List.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var lists = List.Retrieve({ Property: "ListName", SimpleOperator: "equals", Value: "BirthdayList" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes the previously initialized list.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<ListInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myList = List.Init("myList");\n' +
            'var status = myList.Remove();',
    },
];

export const LIST_SUBSCRIBERS_METHODS = [
    {
        name: 'Add',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Adds a subscriber to the previously initialized list.',
        params: [
            {
                name: 'properties',
                description:
                    'Object containing subscriber properties (EmailAddress, SubscriberKey, optionally list status).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<ListInstance>.Subscribers.Add(properties)',
        example:
            'Platform.Load("core", "1");\n' +
            'var list = List.Init("MY_LIST_KEY");\n' +
            'var result = list.Subscribers.Add({\n' +
            '    EmailAddress: "test@example.com",\n' +
            '    SubscriberKey: "test@example.com"\n' +
            '});\n' +
            'Write(Stringify(result));',
    },
    {
        name: 'Retrieve',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 1,
        description:
            'Returns the subscribers belonging to the previously initialized list. ' +
            'Pass an optional filter to narrow the results; omit it to return all subscribers on the list.',
        params: [
            {
                name: 'filter',
                description: 'Optional WSProxy-style filter object to narrow the results.',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'object[]',
        returnDescription:
            'List of subscriber objects on the list (filtered when a filter is supplied).',
        syntax: '<ListInstance>.Subscribers.Retrieve([filter])',
        example:
            'Platform.Load("core", "1");\n' +
            'var list = List.Init("MY_LIST_KEY");\n' +
            'var subscribers = list.Subscribers.Retrieve();',
    },
    {
        name: 'Unsubscribe',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Removes the specified subscriber from the previously initialized list.',
        params: [
            {
                name: 'emailAddress',
                description:
                    'Email address of the subscriber, or a `{EmailAddress, SubscriberKey}` object identifying the subscriber.',
                type: 'string',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<ListInstance>.Subscribers.Unsubscribe(emailAddress)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myList = List.Init("myList");\n' +
            'var status = myList.Subscribers.Unsubscribe("aruiz@example.com");',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 2,
        maxArgs: 2,
        description:
            'Updates the status of the specified subscriber on the previously initialized list.',
        params: [
            {
                name: 'emailAddress',
                description:
                    'Email address of the subscriber, or a `{EmailAddress, SubscriberKey}` object identifying the subscriber.',
                type: 'string',
            },
            {
                name: 'status',
                description: 'New status of the subscriber on the list.',
                type: 'string',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<ListInstance>.Subscribers.Update(emailAddress, status)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myList = List.Init("myList");\n' +
            'var status = myList.Subscribers.Update("aruiz@example.com", "Active");',
    },
    {
        name: 'Upsert',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 2,
        maxArgs: 2,
        description:
            'Adds the subscriber if not on the list, otherwise updates the supplied attributes. ' +
            "If `attributes.Status` is supplied, the subscriber's list status is updated.",
        params: [
            {
                name: 'emailAddress',
                description:
                    'Email address of the subscriber, or a `{EmailAddress, SubscriberKey}` object identifying the subscriber.',
                type: 'string',
            },
            {
                name: 'attributes',
                description: 'Additional subscriber attributes to set or update.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<ListInstance>.Subscribers.Upsert(emailAddress, attributes)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myList = List.Init("myList");\n' +
            'var status = myList.Subscribers.Upsert("aruiz@example.com", { ZipCode: "46202" });',
    },
];

export const LIST_SUBSCRIBERS_TRACKING_METHODS = [
    {
        name: 'Retrieve',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns an array of tracking data for subscribers matching the filter.',
        params: [
            {
                name: 'filter',
                description: 'PascalCase WSProxy-style filter object identifying the subscribers.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of tracking records matching the filter.',
        syntax: '<ListInstance>.Subscribers.Tracking.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myList = List.Init("MyList");\n' +
            'var results = myList.Subscribers.Tracking.Retrieve({ Property: "SubscriberKey", SimpleOperator: "equals", Value: "MyKey" });',
    },
];

export const SUBSCRIBER_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a Subscriber instance bound to the specified subscriber key. ' +
            'Required before invoking any instance method on the returned object.',
        params: [{ name: 'key', description: 'Subscriber key.', type: 'string' }],
        returnType: 'SubscriberInstance',
        returnDescription: 'An initialized Subscriber bound to the specified key.',
        syntax: 'Subscriber.Init(key)',
        example: 'Platform.Load("core", "1");\n' + 'var sub = Subscriber.Init("mySubscriber");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Creates a new subscriber from the supplied properties.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new subscriber (EmailAddress, SubscriberKey, EmailTypePreference, Attributes, Lists, ...).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'Subscriber.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var newSubscriber = {\n' +
            '    EmailAddress: "test.008@example.com",\n' +
            '    SubscriberKey: "20100730001",\n' +
            '    EmailTypePreference: "Text",\n' +
            '    Attributes: { "First Name": "test.008", "Last Name": "test.008" },\n' +
            '    Lists: { Status: "Active", ID: 12345, Action: "Create" }\n' +
            '};\n' +
            'var status = Subscriber.Add(newSubscriber);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns an array of subscribers matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object: `{Property, SimpleOperator, Value}`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of subscribers matching the filter.',
        syntax: 'Subscriber.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var results = Subscriber.Retrieve({ Property: "SubscriberKey", SimpleOperator: "equals", Value: "MySubscriberKey" });',
    },
    {
        name: 'Upsert',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new subscriber, or updates an existing one matched by EmailAddress / SubscriberKey.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the subscriber (EmailAddress, SubscriberKey, Attributes, ...).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'Subscriber.Upsert(properties)',
        example:
            'Platform.Load("core", "1");\n' +
            'var sub = {\n' +
            '    EmailAddress: "test@example.com",\n' +
            '    SubscriberKey: "test@example.com",\n' +
            '    Attributes: [ { Name: "FirstName", Value: "Jane" } ]\n' +
            '};\n' +
            'var result = Subscriber.Upsert(sub);\n' +
            'Write(Stringify(result));',
    },
    {
        name: 'Statistics',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Retrieves statistical data for the specified subscriber (sends, opens, clicks, bounces, unsubscribes).',
        params: [
            {
                name: 'subscriberKey',
                description: 'The subscriber key identifying the subscriber.',
                type: 'string',
            },
        ],
        returnType: 'object',
        returnDescription: 'A single object with subscriber statistics (not an array).',
        syntax: 'Subscriber.Statistics(subscriberKey)',
        example:
            'Platform.Load("core", "1");\n' +
            'var stats = Subscriber.Statistics("test@example.com");\n' +
            'Write(Stringify(stats));',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the previously initialized subscriber with the supplied attributes.',
        params: [
            { name: 'properties', description: 'Subscriber properties to change.', type: 'object' },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SubscriberInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var subObj = Subscriber.Init("SubKey");\n' +
            'var status = subObj.Update({ EmailTypePreference: "HTML", Attributes: { "First Name": "Test", "Last Name": "User" } });',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Deletes the previously initialized subscriber.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SubscriberInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var subObj = Subscriber.Init("SubKey");\n' +
            'var status = subObj.Remove();',
    },
    {
        name: 'Unsubscribe',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Sets the previously initialized subscriber\'s status to `"Unsubscribed"`.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SubscriberInstance>.Unsubscribe()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var subObj = Subscriber.Init("SubKey");\n' +
            'var status = subObj.Unsubscribe();',
    },
];

export const SUBSCRIBER_ATTRIBUTES_METHODS = [
    {
        name: 'Retrieve',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Returns an array of attributes associated with the previously initialized subscriber.',
        params: [],
        returnType: 'object[]',
        returnDescription: 'List of attribute objects for the subscriber.',
        syntax: '<SubscriberInstance>.Attributes.Retrieve()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var subObj = Subscriber.Init("SubKey");\n' +
            'var attributes = subObj.Attributes.Retrieve();',
    },
];

export const SUBSCRIBER_LISTS_METHODS = [
    {
        name: 'Retrieve',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Returns the lists the previously initialized subscriber is a member of.',
        params: [],
        returnType: 'object[]',
        returnDescription: 'List of list objects the subscriber belongs to.',
        syntax: '<SubscriberInstance>.Lists.Retrieve()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var subObj = Subscriber.Init("SubKey");\n' +
            'var listArray = subObj.Lists.Retrieve();',
    },
];

// ── Email methods ────────────────────────────────────────────────────────────

export const EMAIL_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes an Email instance bound to the specified external key. ' +
            'Required before invoking any other Email method on the returned instance. ' +
            'External keys cannot be set in the UI — set one via SOAP API, or look up the value via `Email.Retrieve()`.',
        params: [
            { name: 'key', description: 'External key of the email message.', type: 'string' },
        ],
        returnType: 'EmailInstance',
        returnDescription: 'An initialized Email bound to the specified external key.',
        syntax: 'Email.Init(key)',
        example: 'Platform.Load("core", "1");\n' + 'var myEmail = Email.Init("myEmail");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new email message from the supplied properties and returns an initialized email instance. ' +
            'Note: unlike most static `Add` methods, this returns an `EmailInstance`, not `"OK"`.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new email (CustomerKey, Name, optional CategoryID, HTMLBody, TextBody, Subject, EmailType, ...).',
                type: 'object',
            },
        ],
        returnType: 'EmailInstance',
        returnDescription: 'An initialized Email bound to the newly-created email message.',
        syntax: 'Email.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var newMail = {\n' +
            '    CustomerKey: "test_email_key",\n' +
            '    Name: "Test Email",\n' +
            '    HTMLBody: "<b>This is a test email</b>",\n' +
            '    TextBody: "This is a test email",\n' +
            '    Subject: "Test Email Subject",\n' +
            '    EmailType: "HTML",\n' +
            '    CharacterSet: "US-ASCII"\n' +
            '};\n' +
            'var myEmail = Email.Add(newMail);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns an array of email messages matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object: `{Property, SimpleOperator, Value}`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of email messages matching the filter.',
        syntax: 'Email.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var results = Email.Retrieve({ Property: "CustomerKey", SimpleOperator: "equals", Value: "myEmail" });',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the email message with the supplied attributes.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the email message.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<EmailInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myEmail = Email.Init("myEmail");\n' +
            'var status = myEmail.Update({ Name: "Updated Name", Subject: "Updated Email Subject" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes the previously initialized email message.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<EmailInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myEmail = Email.Init("myEmail");\n' +
            'myEmail.Remove();',
    },
    {
        name: 'Validate',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Runs validation checks on the previously initialized email message. ' +
            'Returns a `{Task: {ValidationStatus: boolean, ValidationMessages: string}}` object.',
        params: [],
        returnType: 'object',
        returnDescription:
            'Validation result with `Task.ValidationStatus` (boolean) and `Task.ValidationMessages` (string).',
        syntax: '<EmailInstance>.Validate()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myEmail = Email.Init("myEmail");\n' +
            'var results = myEmail.Validate();\n' +
            'Write(results.Task.ValidationStatus);\n' +
            'Write(results.Task.ValidationMessages);',
    },
    {
        name: 'CheckContent',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Runs content checks on the previously initialized email message. ' +
            'Returns a `{Task: {CheckPassed: boolean, ResultMessage: string}}` object.',
        params: [],
        returnType: 'object',
        returnDescription:
            'Content-check result with `Task.CheckPassed` (boolean) and `Task.ResultMessage` (string).',
        syntax: '<EmailInstance>.CheckContent()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var myEmail = Email.Init("myEmail");\n' +
            'var results = myEmail.CheckContent();\n' +
            'Write(results.Task.CheckPassed);\n' +
            'Write(results.Task.ResultMessage);',
    },
];

// ── Send / SendDefinition / TriggeredSend methods ────────────────────────────

export const SEND_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a Send instance bound to the specified send ID. ' +
            'Required before invoking any other Send method on the returned instance.',
        params: [{ name: 'id', description: 'Numeric ID of the send.', type: 'number' }],
        returnType: 'SendInstance',
        returnDescription: 'An initialized Send bound to the specified send ID.',
        syntax: 'Send.Init(id)',
        example: 'Platform.Load("core", "1");\n' + 'var s = Send.Init(12345);',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 2,
        maxArgs: 3,
        description:
            'Creates a new send to the specified email and list(s). ' +
            'Pass an `options` object to override From name, From address, subject, send time, etc.',
        params: [
            {
                name: 'emailKey',
                description: 'CustomerKey of the email message to associate with the send.',
                type: 'string',
            },
            { name: 'listIds', description: 'Array of list IDs to send to.', type: 'array' },
            {
                name: 'options',
                description:
                    'Optional send options (FromName, FromAddress, Subject, send time, ...).',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'Send.Add(emailKey, listIds, [options])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var status = Send.Add("test_email", [12345, 12346]);\n' +
            'var options = { FromName: "JSON Specified Name", FromAddress: "aruiz@example.com", Subject: "JSON Test Mail" };\n' +
            'var status2 = Send.Add("test_email", [12345, 12346], options);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns an array of sends matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object — simple or compound with `LeftOperand`/`LogicalOperator`/`RightOperand`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of sends matching the filter.',
        syntax: 'Send.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var sends = Send.Retrieve({ Property: "ID", SimpleOperator: "equals", Value: 12345 });',
    },
    {
        name: 'RetrieveLists',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns information about the lists targeted by a send. ' +
            'Filter must restrict results to specific send ID(s).',
        params: [
            {
                name: 'filter',
                description: 'WSProxy-style filter restricting results to specific send ID(s).',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription:
            'List of list objects associated with matching sends; throws on failure.',
        syntax: 'Send.RetrieveLists(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var listsSentTo = Send.RetrieveLists({ Property: "SendID", SimpleOperator: "equals", Value: 12345 });',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes the previously initialized send.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SendInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' + 'var s = Send.Init(12345);\n' + 's.Remove();',
    },
    {
        name: 'CancelSend',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Attempts to cancel the previously initialized send.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SendInstance>.CancelSend()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var mySend = Send.Init(12345);\n' +
            'var status = mySend.CancelSend();',
    },
];

export const SEND_TRACKING_METHODS = [
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns tracking data for sends matching the filter. ' +
            'This is a static call on `Send.Tracking.*` — no `Send.Init()` is required.',
        params: [{ name: 'filter', description: 'WSProxy-style filter object.', type: 'object' }],
        returnType: 'object[]',
        returnDescription: 'List of tracking records matching the filter.',
        syntax: 'Send.Tracking.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var sendTracking = Send.Tracking.Retrieve({ Property: "SendID", SimpleOperator: "equals", Value: 12345 });',
    },
    {
        name: 'ClickRetrieve',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns click tracking data for the previously initialized send.',
        params: [
            {
                name: 'filter',
                description: 'WSProxy-style filter restricting results.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of click tracking records matching the filter.',
        syntax: '<SendInstance>.Tracking.ClickRetrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var singleSend = Send.Init(12345);\n' +
            'var results = singleSend.Tracking.ClickRetrieve({ Property: "ID", SimpleOperator: "equals", Value: 12345 });',
    },
    {
        name: 'TotalByIntervalRetrieve',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 4,
        maxArgs: 4,
        description:
            'Returns aggregated tracking data for the previously initialized send. ' +
            'Aggregates by `type` over the date range, grouped by `groupBy`.',
        params: [
            {
                name: 'type',
                description: 'Type of data to aggregate.',
                type: 'string',
                enum: ['Send', 'Open', 'Click', 'Bounce', 'Unsubscribe'],
            },
            {
                name: 'startDate',
                description: 'Start date of the data period (MM-DD-YYYY).',
                type: 'string',
            },
            {
                name: 'endDate',
                description: 'End date of the data period (MM-DD-YYYY).',
                type: 'string',
            },
            {
                name: 'groupBy',
                description: 'Interval used to aggregate data.',
                type: 'string',
                enum: ['day', 'hour'],
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of aggregated tracking records.',
        syntax: '<SendInstance>.Tracking.TotalByIntervalRetrieve(type, startDate, endDate, groupBy)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var singleSend = Send.Init(12345);\n' +
            'var results = singleSend.Tracking.TotalByIntervalRetrieve("Click", "07-01-2010", "07-31-2010", "day");',
    },
];

export const SEND_DEFINITION_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a SendDefinition instance bound to the specified external key. ' +
            'Required before invoking any instance method on the returned object.',
        params: [
            { name: 'key', description: 'External key of the send definition.', type: 'string' },
        ],
        returnType: 'SendDefinitionInstance',
        returnDescription: 'An initialized SendDefinition bound to the specified external key.',
        syntax: 'Send.Definition.Init(key)',
        example: 'Platform.Load("core", "1.1.5");\n' + 'var esd = Send.Definition.Init("myESD");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 4,
        maxArgs: 4,
        description: 'Creates a new send definition.',
        params: [
            {
                name: 'esdParams',
                description:
                    'Object with CustomerKey, Name, EmailSubject for the new send definition.',
                type: 'object',
            },
            {
                name: 'sendClassificationKey',
                description: 'CustomerKey of the related send classification.',
                type: 'string',
            },
            {
                name: 'emailKey',
                description: 'CustomerKey of the email message to use.',
                type: 'string',
            },
            {
                name: 'listIds',
                description: 'Array of list IDs targeted by the send definition.',
                type: 'array',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'Send.Definition.Add(esdParams, sendClassificationKey, emailKey, listIds)',
        example:
            'Platform.Load("core", "1");\n' +
            'var esdParams = { CustomerKey: "example_esd", Name: "Example Send Definition", EmailSubject: "Sent By Example Send Definition" };\n' +
            'Send.Definition.Add(esdParams, "example_sc_key", "example_email_key", [12345, 12346]);',
    },
    {
        name: 'AddWithDE',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 5,
        maxArgs: 5,
        description: 'Creates a new send definition that targets a sendable Data Extension.',
        params: [
            {
                name: 'esdParams',
                description:
                    'Object with CustomerKey, Name, EmailSubject for the new send definition.',
                type: 'object',
            },
            {
                name: 'sendClassificationKey',
                description: 'CustomerKey of the related send classification.',
                type: 'string',
            },
            {
                name: 'emailKey',
                description: 'CustomerKey of the email message to use.',
                type: 'string',
            },
            {
                name: 'sendableDataExtensionKey',
                description: 'CustomerKey of the sendable Data Extension.',
                type: 'string',
            },
            {
                name: 'publicationListKey',
                description: 'CustomerKey of the publication list to associate.',
                type: 'string',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'Send.Definition.AddWithDE(esdParams, sendClassificationKey, emailKey, sendableDataExtensionKey, publicationListKey)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var esdParams = { CustomerKey: "ssjs_de_esd_1c", Name: "SSJS DE Test ESD3", EmailSubject: "Third send By Test DE Send Definition" };\n' +
            'var status = Send.Definition.AddWithDE(esdParams, "scKey", "test_email", "deKey", "myPubList");',
    },
    {
        name: 'AddWithFilterDefinition',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 5,
        maxArgs: 5,
        description:
            'Creates a new send definition that targets the audience defined by a filter definition.',
        params: [
            {
                name: 'esdParams',
                description:
                    'Object with CustomerKey, Name, EmailSubject for the new send definition.',
                type: 'object',
            },
            {
                name: 'sendClassificationKey',
                description: 'CustomerKey of the related send classification.',
                type: 'string',
            },
            {
                name: 'emailKey',
                description: 'CustomerKey of the email message to use.',
                type: 'string',
            },
            {
                name: 'filterDefinitionKey',
                description: 'CustomerKey of the filter definition.',
                type: 'string',
            },
            {
                name: 'listId',
                description: 'ID of the list targeted by the filter.',
                type: 'number',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: 'Send.Definition.AddWithFilterDefinition(esdParams, sendClassificationKey, emailKey, filterDefinitionKey, listId)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var esdParams = { CustomerKey: "filterDef_esd", Name: "Example Filtered Send Definition", EmailSubject: "Sent By Filtered Send Definition" };\n' +
            'var status = Send.Definition.AddWithFilterDefinition(esdParams, "scKey", "test_email", "fdKey", 144);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 1,
        description:
            'Returns an array of send definitions, optionally filtered. ' +
            'When no filter is supplied, all send definitions are returned.',
        params: [
            {
                name: 'filter',
                description:
                    'Optional WSProxy-style filter object: `{Property, SimpleOperator, Value}`.',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'object[]',
        returnDescription:
            'List of send definitions matching the filter (or all when no filter is supplied).',
        syntax: 'Send.Definition.Retrieve([filter])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var esd = Send.Definition.Retrieve({ Property: "CustomerKey", SimpleOperator: "equals", Value: "ssjs_test_esd" });',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the previously initialized send definition.',
        params: [{ name: 'properties', description: 'Properties to update.', type: 'object' }],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SendDefinitionInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var sendDef = Send.Definition.Init("MY_SEND_DEF_KEY");\n' +
            'var result = sendDef.Update({ Name: "Updated Send Definition Name" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Deletes the previously initialized send definition.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SendDefinitionInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var esd = Send.Definition.Init("myESD");\n' +
            'var status = esd.Remove();',
    },
    {
        name: 'Send',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Sends email messages to the lists associated with the previously initialized send definition.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SendDefinitionInstance>.Send()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var esd = Send.Definition.Init("myESD");\n' +
            'var status = esd.Send();',
    },
];

export const TRIGGERED_SEND_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a TriggeredSend instance bound to the specified external key. ' +
            'Required before invoking any instance method on the returned object. ' +
            'Note: TriggeredSend methods cannot be used in the context of an email message or email preview.',
        params: [
            {
                name: 'key',
                description: 'External key of the triggered send definition.',
                type: 'string',
            },
        ],
        returnType: 'TriggeredSendInstance',
        returnDescription: 'An initialized TriggeredSend bound to the specified external key.',
        syntax: 'TriggeredSend.Init(key)',
        example:
            'Platform.Load("core", "1");\n' + 'var triggeredSend = TriggeredSend.Init("support");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new triggered send definition from the supplied properties and returns an initialized TriggeredSend instance. ' +
            'Note: unlike most static `Add` methods, this returns a `TriggeredSendInstance`, not `"OK"`.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new triggered send definition (Name, CustomerKey, FromName, FromAddress, EmailID, SendClassificationID, ...).',
                type: 'object',
            },
        ],
        returnType: 'TriggeredSendInstance',
        returnDescription:
            'An initialized TriggeredSend bound to the newly-created triggered send definition.',
        syntax: 'TriggeredSend.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var newTSD = {\n' +
            '    Name: "Test TSD",\n' +
            '    CustomerKey: "ssjs_tsd_key",\n' +
            '    FromName: "Test From Name",\n' +
            '    FromAddress: "me@example.com",\n' +
            '    EmailID: 12345,\n' +
            '    SendClassificationID: 54321\n' +
            '};\n' +
            'var tsd = TriggeredSend.Add(newTSD);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns an array of triggered send definitions matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object: `{Property, SimpleOperator, Value}`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of triggered send definitions matching the filter.',
        syntax: 'TriggeredSend.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var results = TriggeredSend.Retrieve({ Property: "CustomerKey", SimpleOperator: "equals", Value: "ssjs_tsd_key" });',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Updates the previously initialized triggered send definition.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the triggered send definition.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<TriggeredSendInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var tsd = TriggeredSend.Init("triggeredSend");\n' +
            'var status = tsd.Update({ Name: "Updated TSD Name" });',
    },
    {
        name: 'Start',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Starts (reactivates) a paused triggered send definition.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<TriggeredSendInstance>.Start()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var ts = TriggeredSend.Init("MY_TRIGGERED_SEND_KEY");\n' +
            'var result = ts.Start();',
    },
    {
        name: 'Pause',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Pauses an active triggered send definition.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<TriggeredSendInstance>.Pause()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var ts = TriggeredSend.Init("MY_TRIGGERED_SEND_KEY");\n' +
            'var status = ts.Pause();',
    },
    {
        name: 'Publish',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Publishes a triggered send definition, making it active and ready to accept sends. ' +
            'Use this to move a definition from Draft / Inactive to Active.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<TriggeredSendInstance>.Publish()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var ts = TriggeredSend.Init("MY_TRIGGERED_SEND_KEY");\n' +
            'var result = ts.Publish();',
    },
    {
        name: 'Send',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 2,
        description:
            'Sends an email using the previously initialized triggered send definition. ' +
            'On failure, inspect `<TriggeredSendInstance>.LastMessage` for error details.',
        params: [
            {
                name: 'emailAddress',
                description: 'Email address to send to. SubscriberKey is **not** supported.',
                type: 'string',
            },
            {
                name: 'sendTimeAttributes',
                description: 'Optional object with dynamic attributes to include in the send.',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or "Error"; throws on a hard failure.',
        syntax: '<TriggeredSendInstance>.Send(emailAddress, [sendTimeAttributes])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var ts = TriggeredSend.Init("triggeredSend");\n' +
            'var status = ts.Send("aruiz@example.com", { FirstName: "Angel", CouponCode: "AA1AF" });\n' +
            'if (status != "OK") { var message = ts.LastMessage; }',
    },
];

export const TRIGGERED_SEND_TRACKING_METHODS = [
    {
        name: 'Retrieve',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 1,
        description:
            'Returns tracking data for the previously initialized triggered send definition.',
        params: [
            {
                name: 'filter',
                description: 'Optional WSProxy-style filter object.',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of tracking records.',
        syntax: '<TriggeredSendInstance>.Tracking.Retrieve([filter])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var tsd = TriggeredSend.Init("MyTSDKey");\n' +
            'var tsdTracking = tsd.Tracking.Retrieve();',
    },
];

export const TRIGGERED_SEND_TRACKING_CLICKS_METHODS = [
    {
        name: 'Retrieve',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns click tracking information for the previously initialized triggered send definition.',
        params: [
            {
                name: 'filter',
                description: 'WSProxy-style filter restricting click results.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of click tracking records matching the filter.',
        syntax: '<TriggeredSendInstance>.Tracking.Clicks.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var tsd = TriggeredSend.Init("MyTSDKey");\n' +
            'var results = tsd.Tracking.Clicks.Retrieve({ Property: "SendUrlID", SimpleOperator: "equals", Value: 12345 });',
    },
];

export const TRIGGERED_SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS = [
    {
        name: 'Retrieve',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 4,
        maxArgs: 4,
        description:
            'Returns aggregated tracking data for the previously initialized triggered send. ' +
            'Aggregates by `type` over the date range, grouped by `groupBy`.',
        params: [
            {
                name: 'type',
                description: 'Type of data to aggregate.',
                type: 'string',
                enum: ['Send', 'Open', 'Click', 'Bounce', 'Unsubscribe'],
            },
            {
                name: 'startDate',
                description: 'Start date of the data period (MM-DD-YYYY).',
                type: 'string',
            },
            {
                name: 'endDate',
                description: 'End date of the data period (MM-DD-YYYY).',
                type: 'string',
            },
            {
                name: 'groupBy',
                description: 'Interval used to aggregate data.',
                type: 'string',
                enum: ['day', 'hour'],
            },
        ],
        returnType: 'object[]',
        returnDescription: 'List of aggregated tracking records.',
        syntax: '<TriggeredSendInstance>.Tracking.TotalByInterval.Retrieve(type, startDate, endDate, groupBy)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var tsd = TriggeredSend.Init("MyTSDKey");\n' +
            'var results = tsd.Tracking.TotalByInterval.Retrieve("Click", "07-01-2010", "07-31-2010", "day");',
    },
];

// ── Event methods ─────────────────────────────────────────────────────────────
// Shared Retrieve method for all Core Library event objects:
// BounceEvent, ClickEvent, ForwardedEmailEvent, ForwardedEmailOptInEvent,
// NotSentEvent, OpenEvent, SentEvent, SurveyEvent, UnsubEvent.
// Each object exposes an identical Retrieve(filter) signature.
// Require Platform.Load("core", "1.1.5").

export const EVENT_METHODS = [
    {
        name: 'Retrieve',
        owner: 'BounceEvent',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Retrieves bounce event data for message sends matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'Filter criteria object with properties: `Property`, `SimpleOperator`, `Value`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        syntax: 'BounceEvent.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var bounces = BounceEvent.Retrieve({ Property: "SendID", SimpleOperator: "equals", Value: 12345 });\n' +
            'Write(Stringify(bounces));',
    },
    {
        name: 'Retrieve',
        owner: 'ClickEvent',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Retrieves click tracking event data for message sends matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'Filter criteria object with properties: `Property`, `SimpleOperator`, `Value`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        syntax: 'ClickEvent.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var clicks = ClickEvent.Retrieve({ Property: "SendID", SimpleOperator: "equals", Value: 12345 });\n' +
            'Write(Stringify(clicks));',
    },
    {
        name: 'Retrieve',
        owner: 'ForwardedEmailEvent',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Retrieves forwarded email event data for message sends matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'Filter criteria object with properties: `Property`, `SimpleOperator`, `Value`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        syntax: 'ForwardedEmailEvent.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var forwards = ForwardedEmailEvent.Retrieve({ Property: "SendID", SimpleOperator: "equals", Value: 12345 });\n' +
            'Write(Stringify(forwards));',
    },
    {
        name: 'Retrieve',
        owner: 'ForwardedEmailOptInEvent',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Retrieves forwarded email opt-in event data for message sends matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'Filter criteria object with properties: `Property`, `SimpleOperator`, `Value`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        syntax: 'ForwardedEmailOptInEvent.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var optIns = ForwardedEmailOptInEvent.Retrieve({ Property: "SendID", SimpleOperator: "equals", Value: 12345 });\n' +
            'Write(Stringify(optIns));',
    },
    {
        name: 'Retrieve',
        owner: 'NotSentEvent',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Retrieves not-sent event data for message sends matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'Filter criteria object with properties: `Property`, `SimpleOperator`, `Value`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        syntax: 'NotSentEvent.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var notSent = NotSentEvent.Retrieve({ Property: "SendID", SimpleOperator: "equals", Value: 12345 });\n' +
            'Write(Stringify(notSent));',
    },
    {
        name: 'Retrieve',
        owner: 'OpenEvent',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Retrieves open tracking event data for message sends matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'Filter criteria object with properties: `Property`, `SimpleOperator`, `Value`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        syntax: 'OpenEvent.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var opens = OpenEvent.Retrieve({ Property: "SendID", SimpleOperator: "equals", Value: 12345 });\n' +
            'Write(Stringify(opens));',
    },
    {
        name: 'Retrieve',
        owner: 'SentEvent',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Retrieves sent event data for message sends matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'Filter criteria object with properties: `Property`, `SimpleOperator`, `Value`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        syntax: 'SentEvent.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var sent = SentEvent.Retrieve({ Property: "SendID", SimpleOperator: "equals", Value: 12345 });\n' +
            'Write(Stringify(sent));',
    },
    {
        name: 'Retrieve',
        owner: 'SurveyEvent',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Retrieves survey response event data for message sends matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'Filter criteria object with properties: `Property`, `SimpleOperator`, `Value`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        syntax: 'SurveyEvent.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var surveys = SurveyEvent.Retrieve({ Property: "SendID", SimpleOperator: "equals", Value: 12345 });\n' +
            'Write(Stringify(surveys));',
    },
    {
        name: 'Retrieve',
        owner: 'UnsubEvent',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Retrieves unsubscribe event data for message sends matching the specified filter.',
        params: [
            {
                name: 'filter',
                description:
                    'Filter criteria object with properties: `Property`, `SimpleOperator`, `Value`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        syntax: 'UnsubEvent.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var unsubs = UnsubEvent.Retrieve({ Property: "SendID", SimpleOperator: "equals", Value: 12345 });\n' +
            'Write(Stringify(unsubs));',
    },
];

// ── DataExtension (Core Library) methods ─────────────────────────────────────

export const DATA_EXTENSION_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a DataExtension instance bound to the specified external key. ' +
            'Required before invoking any `Fields` or `Rows` sub-namespace method on the returned instance. ' +
            'Note: Core Library DataExtension methods do not support enterprise-level data extensions.',
        params: [
            { name: 'key', description: 'External key of the data extension.', type: 'string' },
        ],
        returnType: 'DataExtensionInstance',
        returnDescription: 'An initialized DataExtension bound to the specified external key.',
        syntax: 'DataExtension.Init(key)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var birthdayDE = DataExtension.Init("birthdayDE");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new data extension from the supplied properties and returns an initialized DataExtension instance. ' +
            'Note: unlike most static `Add` methods, this returns a `DataExtensionInstance`, not `"OK"`.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new data extension (CustomerKey, Name, Fields[], optional SendableInfo).',
                type: 'object',
            },
        ],
        returnType: 'DataExtensionInstance',
        returnDescription:
            'An initialized DataExtension bound to the newly-created data extension.',
        syntax: 'DataExtension.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var deObj = {\n' +
            '    CustomerKey: "SendableDE",\n' +
            '    Name: "Sendable Data Extension",\n' +
            '    Fields: [\n' +
            '        { Name: "SubKey", FieldType: "Text", IsPrimaryKey: true, MaxLength: 50, IsRequired: true },\n' +
            '        { Name: "SecondField", FieldType: "Text", MaxLength: 50 }\n' +
            '    ],\n' +
            '    SendableInfo: {\n' +
            '        Field: { Name: "SubKey", FieldType: "Text" },\n' +
            '        RelatesOn: "Subscriber Key"\n' +
            '    }\n' +
            '};\n' +
            'var de = DataExtension.Add(deObj);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 2,
        description:
            'Returns an array of data extensions matching the specified filter. ' +
            'Pass `queryAllAccounts: true` to search all accounts accessible to the authenticated user.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object: `{Property, SimpleOperator, Value}`.',
                type: 'object',
            },
            {
                name: 'queryAllAccounts',
                description:
                    'When `true`, search across all accounts accessible to the authenticated user. Defaults to `false`.',
                type: 'boolean',
                optional: true,
                default: false,
            },
        ],
        returnType: 'object[]',
        returnDescription:
            'List of data extensions matching the filter. Limit data extension external keys to 36 characters for downstream compatibility.',
        syntax: 'DataExtension.Retrieve(filter, [queryAllAccounts])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var results = DataExtension.Retrieve({ Property: "CustomerKey", SimpleOperator: "equals", Value: "myDEKey" });',
    },
];

export const DATA_EXTENSION_FIELDS_METHODS = [
    {
        name: 'Add',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Adds a field to the previously initialized data extension. ' +
            '`properties.Name` is required; the rest (`CustomerKey`, `FieldType`, `MaxLength`, `IsRequired`, `IsPrimaryKey`, `Ordinal`, `Scale`, `DefaultValue`) are optional. ' +
            "`FieldType` accepts: 'Boolean', 'Date', 'Decimal', 'EmailAddress', 'Locale', 'Number', 'Phone', 'Text'.",
        params: [
            { name: 'properties', description: 'Object describing the new field.', type: 'object' },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<DataExtensionInstance>.Fields.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var de = DataExtension.Init("SSJSTest");\n' +
            'var newField = { Name: "NewFieldV2", CustomerKey: "CustomerKey", FieldType: "Number", IsRequired: true, DefaultValue: "100" };\n' +
            'var status = de.Fields.Add(newField);',
    },
    {
        name: 'Retrieve',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Returns an array of field definitions for the previously initialized data extension.',
        params: [],
        returnType: 'object[]',
        returnDescription: 'List of field-definition objects.',
        syntax: '<DataExtensionInstance>.Fields.Retrieve()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var birthdayDE = DataExtension.Init("birthdayDE");\n' +
            'var fields = birthdayDE.Fields.Retrieve();',
    },
    {
        name: 'UpdateSendableField',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 2,
        maxArgs: 2,
        description:
            'Updates which data extension field is used to relate the data extension to the All Subscribers list during sending. ' +
            'Pass the name of the data extension field, and which subscriber attribute it should map to.',
        params: [
            {
                name: 'deFieldName',
                description:
                    'Name of the data extension field that should make the connection to the subscriber list.',
                type: 'string',
            },
            {
                name: 'subscriberField',
                description: 'Subscriber attribute to map the data extension field to.',
                type: 'string',
                enum: ['Subscriber Key', 'Subscriber Id'],
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription:
            'Returns "OK" on success or throws on failure (assumed; doc has no `@returns`, treated as `"OK"` for consistency with sibling `Fields.*` methods).',
        syntax: '<DataExtensionInstance>.Fields.UpdateSendableField(deFieldName, subscriberField)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var updateDE = DataExtension.Init("sendableDataExtension");\n' +
            'var status = updateDE.Fields.UpdateSendableField("DifferentSubKey", "Subscriber Key");',
    },
];

export const DATA_EXTENSION_ROWS_METHODS = [
    {
        name: 'Add',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description: 'Adds one or more rows to the previously initialized data extension.',
        params: [
            {
                name: 'rowData',
                description:
                    "Array of objects, one per row to add. Each object's keys must match data extension field names.",
                type: 'array',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<DataExtensionInstance>.Rows.Add(rowData)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var arrContacts = [\n' +
            '    { Email: "jdoe@example.com", FirstName: "John", LastName: "Doe" },\n' +
            '    { Email: "aruiz@example.com", FirstName: "Angel", LastName: "Ruiz" }\n' +
            '];\n' +
            'var birthdayDE = DataExtension.Init("birthdayDE");\n' +
            'birthdayDE.Rows.Add(arrContacts);',
    },
    {
        name: 'Lookup',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 2,
        maxArgs: 4,
        description:
            'Returns rows where the specified columns equal the specified values (AND-joined). ' +
            'Optionally limits results and orders by a field. ' +
            'When initializing a data extension for `Lookup()` from an email message, you must use the data extension Name; on landing pages, either Name or external key works — make them identical to be safe.',
        params: [
            {
                name: 'searchFieldNames',
                description: 'Array of column names to match against.',
                type: 'array',
            },
            {
                name: 'searchValues',
                description: 'Array of values to match (one per column, in order).',
                type: 'array',
            },
            {
                name: 'limit',
                description: 'Maximum number of rows to return.',
                type: 'number',
                optional: true,
            },
            {
                name: 'orderByFieldName',
                description: 'Field to order results by.',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'object[]',
        returnDescription: 'Rows matching the lookup criteria.',
        syntax: '<DataExtensionInstance>.Rows.Lookup(searchFieldNames, searchValues, [limit], [orderByFieldName])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var testDE = DataExtension.Init("testDE");\n' +
            'var data = testDE.Rows.Lookup(["Age"], [25], 2, "LastName");',
    },
    {
        name: 'Remove',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 2,
        maxArgs: 2,
        description:
            'Deletes rows from the previously initialized data extension where the specified columns equal the specified values (AND-joined). ' +
            'For large deletion requests, batch the work — this method times out on long-running deletes.',
        params: [
            {
                name: 'columnNames',
                description: 'Array of column names to match against.',
                type: 'array',
            },
            {
                name: 'columnValues',
                description: 'Array of values to match (one per column, in order).',
                type: 'array',
            },
        ],
        returnType: 'number',
        returnDescription: 'The number of rows that were modified (deleted).',
        syntax: '<DataExtensionInstance>.Rows.Remove(columnNames, columnValues)',
        example:
            'Platform.Load("Core", "1.1.5");\n' +
            'var memberDE = DataExtension.Init("MembershipRewards");\n' +
            'var result = memberDE.Rows.Remove(["Area"], ["Kensington"]);',
    },
    {
        name: 'Retrieve',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 1,
        description:
            'Retrieves up to 2500 rows from the previously initialized data extension. ' +
            'When called without a filter, returns all rows (subject to the 2500-row cap). ' +
            'Cannot be used in the context of an email message or email preview.',
        params: [
            {
                name: 'filter',
                description:
                    'WSProxy-style filter object — simple `{Property, SimpleOperator, Value}` or compound with `LeftOperand`/`LogicalOperator`/`RightOperand`. Optional per the example, despite the doc table marking `Required: Yes`.',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'object[]',
        returnDescription:
            'Rows from the data extension matching the filter (or all rows when no filter is supplied).',
        syntax: '<DataExtensionInstance>.Rows.Retrieve([filter])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var birthdayDE = DataExtension.Init("birthdayDE");\n' +
            'var data = birthdayDE.Rows.Retrieve();\n' +
            'var filter = { Property: "Age", SimpleOperator: "greaterThan", Value: 20 };\n' +
            'var moredata = birthdayDE.Rows.Retrieve(filter);',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        minArgs: 3,
        maxArgs: 3,
        description:
            'Updates the columns of rows where `whereFieldNames` equal `whereValues` (AND-joined). ' +
            'Throws if no row matches.',
        params: [
            {
                name: 'rowData',
                description:
                    'Object whose keys are columns to update and values are the new values.',
                type: 'object',
            },
            {
                name: 'whereFieldNames',
                description: 'Array of column names to match against.',
                type: 'array',
            },
            {
                name: 'whereValues',
                description: 'Array of values to match (one per column, in order).',
                type: 'array',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<DataExtensionInstance>.Rows.Update(rowData, whereFieldNames, whereValues)',
        example:
            'Platform.Load("Core", "1");\n' +
            'var dataExt = DataExtension.Init("NTO Customer List");\n' +
            'var fieldsToUpdate = { StateProvince: "QC", PreferredActivity: "Sailing" };\n' +
            'var result = dataExt.Rows.Update(fieldsToUpdate, ["MemberId", "Country"], [9868600, "CA"]);',
    },
];

// ── HTTP object methods ──────────────────────────────────────────────────────

/** @type {{name: string, minArgs: number, maxArgs: number, description: string, params?: {name: string, description: string, type?: string, optional?: boolean}[], returnType?: string, syntax?: string}[]} */
export const HTTP_METHODS = [
    {
        name: 'Get',
        minArgs: 1,
        maxArgs: 3,
        requiresCoreLoad: true,
        description:
            'Performs an HTTP GET request and returns the response body. ' +
            'When supplying `headerNames` and `headerValues`, both arrays must have equal length and parallel ordering.',
        params: [
            { name: 'url', description: 'URL to request.', type: 'string' },
            {
                name: 'headerNames',
                description: 'Array of header names (co-required with headerValues).',
                type: 'array',
                optional: true,
            },
            {
                name: 'headerValues',
                description: 'Array of header values, one per entry in headerNames (co-required).',
                type: 'array',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'HTTP.Get(url[, headerNames, headerValues])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var body = HTTP.Get("https://api.example.com/data");\n' +
            'var obj = Platform.Function.ParseJSON(String(body));',
    },
    {
        name: 'Post',
        minArgs: 5,
        maxArgs: 5,
        requiresCoreLoad: true,
        description:
            'Performs an HTTP POST request with a content type and payload. ' +
            'Pass empty arrays for `headerNames` and `headerValues` if no custom headers are needed.',
        params: [
            { name: 'url', description: 'URL to post to.', type: 'string' },
            { name: 'contentType', description: 'MIME type of the request body.', type: 'string' },
            { name: 'payload', description: 'Request body content.', type: 'string' },
            {
                name: 'headerNames',
                description: 'Array of header names to include in the request.',
                type: 'string[]',
            },
            {
                name: 'headerValues',
                description: 'Array of header values, one per entry in headerNames.',
                type: 'array',
            },
        ],
        returnType: 'object',
        syntax: 'HTTP.Post(url, contentType, payload, headerNames, headerValues)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var payload = Stringify({ email: "jane@example.com" });\n' +
            'var response = HTTP.Post("https://api.example.com/items", "application/json", payload);',
    },
];

export const httpMethodNames = new Set(HTTP_METHODS.map((m) => m.name.toLowerCase()));

// ── WSProxy methods ──────────────────────────────────────────────────────────

/** @type {{name: string, minArgs: number, maxArgs: number, description: string, params?: {name: string, description: string, type?: string, optional?: boolean}[], returnType?: string, syntax?: string}[]} */
export const WSPROXY_METHODS = [
    {
        name: 'createItem',
        isStatic: false,
        minArgs: 2,
        maxArgs: 2,
        description: 'Creates a new Marketing Cloud object via the SOAP API.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            { name: 'properties', description: 'Object properties to set', type: 'object' },
        ],
        returnType: 'object',
        returnDescription: 'Object with Status, StatusMessage, RequestID, and Results array.',
        syntax: '<WSProxyInstance>.createItem(objectType, properties)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var result = api.createItem("DataExtensionObject", {\n' +
            '    CustomerKey: "MyDE",\n' +
            '    Properties: { Property: [{ Name: "Email", Value: "jane@example.com" }] }\n' +
            '});\n' +
            'if (result.Status === "OK") { Write("Created"); }',
    },
    {
        name: 'updateItem',
        isStatic: false,
        minArgs: 2,
        maxArgs: 2,
        description: 'Updates an existing Marketing Cloud object via the SOAP API.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            { name: 'properties', description: 'Object properties to update', type: 'object' },
        ],
        returnType: 'object',
        returnDescription: 'Object with Status, StatusMessage, RequestID, and Results array.',
        syntax: '<WSProxyInstance>.updateItem(objectType, properties)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var result = api.updateItem("DataExtensionObject", {\n' +
            '    CustomerKey: "MyDE",\n' +
            '    Properties: { Property: [{ Name: "Status", Value: "inactive" }] }\n' +
            '});\n' +
            'if (result.Status === "OK") { Write("Updated"); }',
    },
    {
        name: 'deleteItem',
        isStatic: false,
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
        returnDescription: 'Object with Status, StatusMessage, RequestID, and Results array.',
        syntax: '<WSProxyInstance>.deleteItem(objectType, properties)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var result = api.deleteItem("DataExtensionObject", {\n' +
            '    CustomerKey: "MyDE",\n' +
            '    Keys: { Key: [{ Name: "Email", Value: "jane@example.com" }] }\n' +
            '});\n' +
            'if (result.Status === "OK") { Write("Deleted"); }',
    },
    {
        name: 'retrieve',
        isStatic: false,
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
        returnDescription: 'Object with Status, HasMoreRows, RequestID, and Results array.',
        syntax: '<WSProxyInstance>.retrieve(objectType, columns[, filter[, retrieveOptions[, requestProps]]])',
        example:
            'var api = new Script.Util.WSProxy();\n' +
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
        isStatic: false,
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
        returnDescription: 'Object with Status, HasMoreRows, RequestID, and Results array.',
        syntax: '<WSProxyInstance>.getNextBatch(objectType, requestId)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
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
        isStatic: false,
        minArgs: 3,
        maxArgs: 4,
        description: 'Executes a perform action on a single Marketing Cloud object.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name.', type: 'string' },
            {
                name: 'properties',
                description:
                    'Object properties identifying the target item (e.g. { ObjectID: "..." }).',
                type: 'object',
            },
            {
                name: 'action',
                description: 'Action to perform. Only "Start" is valid (lowercase "start" fails).',
                type: 'string',
                enum: ['Start'],
            },
            {
                name: 'performOptions',
                description: 'Properties of the SOAP PerformOptions object.',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'object',
        returnDescription: 'Object with Status, StatusMessage, RequestID, and Results array.',
        syntax: '<WSProxyInstance>.performItem(objectType, properties, action[, performOptions])',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var result = api.performItem("QueryDefinition", { ObjectID: queryObjectId }, "Start");\n' +
            'Write(result.Status);',
    },
    {
        name: 'performBatch',
        isStatic: false,
        minArgs: 3,
        maxArgs: 4,
        description:
            'Executes a perform action on multiple Marketing Cloud objects in a single SOAP API call.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            {
                name: 'propertiesArray',
                description: 'Array of property objects identifying the target items',
                type: 'array',
            },
            {
                name: 'action',
                description: 'Action to perform. Only "Start" is valid (lowercase "start" fails).',
                type: 'string',
                enum: ['Start'],
            },
            {
                name: 'performOptions',
                description: 'Properties of the SOAP PerformOptions object',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'object',
        returnDescription: 'Object with Status, StatusMessage, RequestID, and Results array.',
        syntax: '<WSProxyInstance>.performBatch(objectType, propertiesArray, action[, performOptions])',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var items = [{ ObjectID: id1 }, { ObjectID: id2 }];\n' +
            'var result = api.performBatch("QueryDefinition", items, "Start");\n' +
            'Write(result.Status);',
    },
    {
        name: 'describe',
        isStatic: false,
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
        returnDescription:
            'Object with Status and Results array containing ObjectDefinition entries.',
        syntax: '<WSProxyInstance>.describe(objectType)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var result = api.describe("DataExtension");\n' +
            'Write(Stringify(result.Results));',
    },
    {
        name: 'execute',
        isStatic: false,
        minArgs: 2,
        maxArgs: 2,
        description: 'Executes a named method on a Marketing Cloud object.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name.', type: 'string' },
            {
                name: 'requestName',
                description: 'Name of the request to execute.',
                type: 'string',
                enum: ['LogUnsubEvent'],
            },
        ],
        returnType: 'object',
        returnDescription: 'Object with Status, StatusMessage, RequestID, and Results array.',
        syntax: '<WSProxyInstance>.execute(objectType, requestName)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var result = api.execute("DataExtensionObject", "LogUnsubEvent");\n' +
            'Write(result.Status);',
    },
    {
        name: 'setBatchSize',
        isStatic: false,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Sets the maximum number of objects returned per SOAP API page (default is 2500).',
        params: [
            {
                name: 'batchSize',
                description: 'Maximum number of objects per batch',
                type: 'number',
            },
        ],
        returnType: 'void',
        syntax: '<WSProxyInstance>.setBatchSize(batchSize)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'api.setBatchSize(200);\n' +
            'var result = api.retrieve("DataExtension", ["Name"], {});',
    },
    {
        name: 'setClientId',
        isStatic: false,
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
        syntax: '<WSProxyInstance>.setClientId(clientId)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'api.setClientId({ ID: 12345 }); // target child BU by MID\n' +
            'var result = api.retrieve("DataExtension", ["Name"], {});',
    },
    {
        name: 'resetClientIds',
        isStatic: false,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Clears all client IDs set on the WSProxy instance, reverting to the default execution context credentials.',
        params: [],
        returnType: 'void',
        syntax: '<WSProxyInstance>.resetClientIds()',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'api.setClientId({ ID: 12345 });\n' +
            '// ... perform cross-BU operations ...\n' +
            'api.resetClientIds(); // revert to default context\n' +
            'var result = api.retrieve("DataExtension", ["Name"], {});',
    },
    {
        name: 'createBatch',
        isStatic: false,
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
        returnDescription: 'Object with Status, StatusMessage, RequestID, and Results array.',
        syntax: '<WSProxyInstance>.createBatch(objectType, propertiesArray)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var items = [\n' +
            '    { CustomerKey: "MyDE", Properties: { Property: [{ Name: "Email", Value: "a@example.com" }] } },\n' +
            '    { CustomerKey: "MyDE", Properties: { Property: [{ Name: "Email", Value: "b@example.com" }] } }\n' +
            '];\n' +
            'var result = api.createBatch("DataExtensionObject", items);\n' +
            'Write(result.Status);',
    },
    {
        name: 'updateBatch',
        isStatic: false,
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
        returnDescription: 'Object with Status, StatusMessage, RequestID, and Results array.',
        syntax: '<WSProxyInstance>.updateBatch(objectType, propertiesArray)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var items = [\n' +
            '    { CustomerKey: "MyDE", Keys: { Key: [{ Name: "Email", Value: "a@example.com" }] }, Properties: { Property: [{ Name: "Status", Value: "active" }] } }\n' +
            '];\n' +
            'var result = api.updateBatch("DataExtensionObject", items);\n' +
            'Write(result.Status);',
    },
    {
        name: 'deleteBatch',
        isStatic: false,
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
        returnDescription: 'Object with Status, StatusMessage, RequestID, and Results array.',
        syntax: '<WSProxyInstance>.deleteBatch(objectType, propertiesArray)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var items = [\n' +
            '    { CustomerKey: "MyDE", Keys: { Key: [{ Name: "Email", Value: "old@example.com" }] } }\n' +
            '];\n' +
            'var result = api.deleteBatch("DataExtensionObject", items);\n' +
            'Write(result.Status);',
    },
];

export const wsproxyMethodNames = new Set(WSPROXY_METHODS.map((m) => m.name.toLowerCase()));

// ── HTTPHeader (Core library) ─────────────────────────────────────────────────
// Requires Platform.Load("core", "1") before use.

export const HTTPHEADER_METHODS = [
    {
        name: 'GetValue',
        minArgs: 1,
        maxArgs: 1,
        isStatic: false,
        requiresCoreLoad: true,
        description: 'Retrieves the value of the specified HTTP request header.',
        params: [{ name: 'name', description: 'Name of the HTTP header to read', type: 'string' }],
        returnType: 'string',
        syntax: 'HTTPHeader.GetValue(name)',
        example:
            'Platform.Load("core", "1");\n' +
            'var from = HTTPHeader.GetValue("From");\n' +
            'Write(from);',
    },
    {
        name: 'SetValue',
        minArgs: 2,
        maxArgs: 2,
        isStatic: false,
        requiresCoreLoad: true,
        description:
            'Sets the value of the specified HTTP header. ' +
            'The host and content-length headers cannot be changed.',
        params: [
            { name: 'name', description: 'Name of the header to set', type: 'string' },
            { name: 'value', description: 'Value to assign to the header', type: 'string' },
        ],
        returnType: 'void',
        syntax: 'HTTPHeader.SetValue(name, value)',
        example:
            'Platform.Load("core", "1");\n' + 'HTTPHeader.SetValue("From", "aruiz@example.com");',
    },
    {
        name: 'Remove',
        minArgs: 1,
        maxArgs: 1,
        isStatic: false,
        requiresCoreLoad: true,
        description: 'Removes the specified entry from the HTTP header.',
        params: [
            { name: 'headerName', description: 'Name of the header to remove', type: 'string' },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        syntax: 'HTTPHeader.Remove(headerName)',
        example:
            'Platform.Load("core", "1");\n' +
            'var result = HTTPHeader.Remove("From"); // returns "OK"',
    },
];

export const httpHeaderMethodNames = new Set(HTTPHEADER_METHODS.map((m) => m.name.toLowerCase()));

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
        syntax: 'Platform.Variable.GetValue(variableName)',
        example:
            'var sk = Platform.Variable.GetValue("SubscriberKey");\n' +
            'Write(sk);\n' +
            '// Bare-name alias: Variable.GetValue("SubscriberKey")',
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
        syntax: 'Platform.Variable.SetValue(variableName, value)',
        example:
            'Platform.Variable.SetValue("greeting", "Hello from SSJS");\n' +
            '// @greeting is now available in subsequent AMPscript blocks\n' +
            '// Bare-name alias: Variable.SetValue("greeting", "Hello from SSJS")',
    },
];

export const PLATFORM_RESPONSE_METHODS = [
    {
        name: 'SetResponseHeader',
        minArgs: 2,
        maxArgs: 2,
        description: 'Sets a response header on the current page response.',
        params: [
            { name: 'headerName', description: 'Name of the response header.', type: 'string' },
            { name: 'value', description: 'Value for the response header.', type: 'string' },
        ],
        returnType: 'void',
        syntax: 'Platform.Response.SetResponseHeader(headerName, value)',
        example:
            'Platform.Response.SetResponseHeader("Content-Type", "application/json");\nPlatform.Response.Write(Stringify({ status: "ok" }));',
    },
    {
        name: 'RemoveResponseHeader',
        minArgs: 1,
        maxArgs: 1,
        description: 'Removes a previously set HTTP response header from the response.',
        params: [
            {
                name: 'headerName',
                description: 'Name of the HTTP response header to remove.',
                type: 'string',
            },
        ],
        returnType: 'void',
        syntax: 'Platform.Response.RemoveResponseHeader(headerName)',
        example: 'Platform.Response.RemoveResponseHeader("X-Powered-By");',
    },
    {
        name: 'Redirect',
        minArgs: 2,
        maxArgs: 2,
        description:
            'Redirects the current page to a new URL. ' +
            'Pass false for a 302 temporary redirect or true for a 301 permanent redirect. ' +
            'Do not use 301 if you want browsers to re-check the original URL later.',
        params: [
            { name: 'url', description: 'URL to redirect to.', type: 'string' },
            {
                name: 'movedPermanently',
                description: 'True for 301 permanent redirect, false for 302 temporary.',
                type: 'boolean',
            },
        ],
        returnType: 'void',
        syntax: 'Platform.Response.Redirect(url, movedPermanently)',
        example: 'Platform.Response.Redirect("https://pub.pages.example.com/thank-you", false);',
    },
    {
        name: 'SetCookie',
        minArgs: 2,
        maxArgs: 4,
        description: 'Sets a cookie on the client browser response.',
        params: [
            { name: 'name', description: 'Name of the cookie to set.', type: 'string' },
            { name: 'value', description: 'Value to store in the cookie.', type: 'string' },
            {
                name: 'expires',
                description: 'Expiration date/time for the cookie.',
                type: 'string',
                optional: true,
            },
            {
                name: 'secure',
                description: 'If true, the cookie is only sent over HTTPS.',
                type: 'boolean',
                optional: true,
            },
        ],
        returnType: 'void',
        syntax: 'Platform.Response.SetCookie(name, value[, expires, secure])',
        example: 'Platform.Response.SetCookie("userId", subscriberKey, "12/31/2025", true);',
    },
    {
        name: 'RemoveCookie',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Removes a cookie from the client browser by setting its expiration to a past date.',
        params: [{ name: 'name', description: 'Name of the cookie to remove.', type: 'string' }],
        returnType: 'void',
        syntax: 'Platform.Response.RemoveCookie(name)',
        example: 'Platform.Response.RemoveCookie("userId");',
    },
    {
        name: 'Write',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Writes content to the HTTP response output. ' +
            'Distinct from the bare-name `Write()` / `Platform.Function.Write()`, which write to the rendered page output.',
        params: [
            {
                name: 'content',
                description: 'Content string to write to the response.',
                type: 'string',
            },
        ],
        returnType: 'void',
        syntax: 'Platform.Response.Write(content)',
        example:
            'var data = { name: "Jane", status: "active" };\nPlatform.Response.Write(Stringify(data));',
    },
    // ── Response properties (no parentheses — isProperty: true) ──────────────
    {
        name: 'ContentType',
        minArgs: 0,
        maxArgs: 0,
        isProperty: true,
        description: 'Gets or sets the Content-Type of the HTTP response.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Response.ContentType',
        example: 'Platform.Response.ContentType = "application/json";',
    },
    {
        name: 'CharacterSet',
        minArgs: 0,
        maxArgs: 0,
        isProperty: true,
        description: 'Gets or sets the character set of the HTTP response.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Response.CharacterSet',
        example: 'Platform.Response.CharacterSet = "UTF-8";',
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
                description: 'Name of the query string parameter.',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Request.GetQueryStringParameter(parameterName)',
        example:
            '// Page URL: /mypage?email=jane@example.com\nvar email = Platform.Request.GetQueryStringParameter("email");\nWrite(email);',
    },
    {
        name: 'GetFormField',
        minArgs: 1,
        maxArgs: 1,
        description: 'Retrieves data from a named form field, including values sent via POST.',
        params: [
            { name: 'name', description: 'Name of the form field to retrieve.', type: 'string' },
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
                description: 'Character encoding for the post data.',
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
        name: 'GetCookieValue',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Retrieves the value of a named cookie from the HTTP request sent by the client browser.',
        params: [
            { name: 'cookieName', description: 'Name of the cookie to retrieve.', type: 'string' },
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
    {
        name: 'GetRequestHeader',
        minArgs: 1,
        maxArgs: 1,
        description: 'Returns the value of the named HTTP request header, or null if not present.',
        params: [
            {
                name: 'headerName',
                description: 'Name of the HTTP request header to retrieve.',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Request.GetRequestHeader(headerName)',
        example:
            'var auth = Platform.Request.GetRequestHeader("Authorization");\nif (auth) { Write("Auth: " + auth); }',
    },
    // ── Request properties (no parentheses — isProperty: true) ───────────────
    {
        name: 'Browser',
        minArgs: 0,
        maxArgs: 0,
        isProperty: true,
        description: 'Returns an object describing the client browser.',
        params: [],
        returnType: 'object',
        syntax: 'Platform.Request.Browser',
        example: 'var browser = Platform.Request.Browser;\nWrite(Stringify(browser));',
    },
    {
        name: 'ClientIP',
        minArgs: 0,
        maxArgs: 0,
        isProperty: true,
        description: 'Returns the IP address of the client.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Request.ClientIP',
        example: 'Write(Platform.Request.ClientIP);',
    },
    {
        name: 'HasSSL',
        minArgs: 0,
        maxArgs: 0,
        isProperty: true,
        description: 'Returns true if the current request was made over HTTPS.',
        params: [],
        returnType: 'boolean',
        syntax: 'Platform.Request.HasSSL',
        example:
            'if (Platform.Request.HasSSL) {\n    Write("Secure connection");\n} else {\n    Platform.Response.Redirect("https://" + Platform.Request.RequestURL);\n}',
    },
    {
        name: 'IsSSL',
        minArgs: 0,
        maxArgs: 0,
        isProperty: true,
        description: 'Returns true if the current request was made over HTTPS (alias of HasSSL).',
        params: [],
        returnType: 'boolean',
        syntax: 'Platform.Request.IsSSL',
        example: 'Write(Platform.Request.IsSSL);',
    },
    {
        name: 'Method',
        minArgs: 0,
        maxArgs: 0,
        isProperty: true,
        description: 'Returns the HTTP method (GET, POST, etc.) of the current request.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Request.Method',
        example:
            'var method = Platform.Request.Method;\nif (method === "POST") {\n    var body = Platform.Request.GetPostData();\n    // handle POST\n}',
    },
    {
        name: 'QueryString',
        minArgs: 0,
        maxArgs: 0,
        isProperty: true,
        description: 'Returns the full query string of the current request URL.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Request.QueryString',
        example: 'Write(Platform.Request.QueryString);',
    },
    {
        name: 'ReferrerURL',
        minArgs: 0,
        maxArgs: 0,
        isProperty: true,
        description: 'Returns the referrer URL from the HTTP Referer header.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Request.ReferrerURL',
        example: 'Write(Platform.Request.ReferrerURL);',
    },
    {
        name: 'RequestURL',
        minArgs: 0,
        maxArgs: 0,
        isProperty: true,
        description: 'Returns the full URL of the current page request.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Request.RequestURL',
        example: 'Write("Current page: " + Platform.Request.RequestURL);',
    },
    {
        name: 'UserAgent',
        minArgs: 0,
        maxArgs: 0,
        isProperty: true,
        description: 'Returns the user-agent string from the HTTP request.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Request.UserAgent',
        example: 'Write(Platform.Request.UserAgent);',
    },
];

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

// ── Attribute methods ────────────────────────────────────────────────────────
// Methods on the bare `Attribute` global. Require Platform.Load("core", "1.1.5").
// Preferred over Platform.Recipient.GetAttributeValue() for readability.

export const ATTRIBUTE_METHODS = [
    {
        name: 'GetValue',
        minArgs: 1,
        maxArgs: 1,
        isStatic: true,
        requiresCoreLoad: true,
        description:
            'Returns the value of the specified subscriber attribute or sendable data extension field for the current recipient. ' +
            'Preferred over Platform.Recipient.GetAttributeValue() — both methods are equivalent.',
        params: [
            {
                name: 'name',
                description: 'Name of the subscriber attribute or sendable DE field to retrieve.',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'Attribute.GetValue(name)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var email = Attribute.GetValue("EmailAddress");\n' +
            'Write(email);',
    },
];

export const attributeMethodNames = new Set(ATTRIBUTE_METHODS.map((m) => m.name.toLowerCase()));

// ── DateTime.TimeZone methods ────────────────────────────────────────────────
// Methods on the DateTime.TimeZone namespace. Require Platform.Load("core", "1.1.5").

export const DATE_TIME_TIMEZONE_METHODS = [
    {
        name: 'Retrieve',
        minArgs: 1,
        maxArgs: 1,
        isStatic: true,
        requiresCoreLoad: true,
        description:
            'Retrieves an array of time zones matching the specified filter criteria. ' +
            'If no filter is supplied the function returns all available time zones.',
        params: [
            {
                name: 'filter',
                description:
                    'Filter criteria object with properties: `Property`, `SimpleOperator`, `Value`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        syntax: 'DateTime.TimeZone.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var timezones = DateTime.TimeZone.Retrieve({ Property: "ID", SimpleOperator: "equals", Value: 1 });\n' +
            'Write(Stringify(timezones));',
    },
];

// ── ErrorUtil methods ────────────────────────────────────────────────────────
// Utility functions for WSProxy error handling. Require Platform.Load("core", "1.1.5").

export const ERROR_UTIL_METHODS = [
    {
        name: 'ThrowWSProxyError',
        minArgs: 1,
        maxArgs: 1,
        isStatic: true,
        requiresCoreLoad: true,
        description:
            'Inspects a WSProxy result object and throws an exception when its `Status` property ' +
            'starts with `"Error:"`. WSProxy methods never raise exceptions on SOAP-level errors — ' +
            'instead they return a result object whose `Status` field signals the outcome. ' +
            'Wrap WSProxy calls in a `try`/`catch` block and call this function immediately after ' +
            'each call to convert non-OK results into catchable exceptions.',
        params: [
            {
                name: 'result',
                description:
                    'Result object returned by any WSProxy method. ' +
                    'Minimum shape: `{ Status: string, RequestID: string, Results: object[] }`. ' +
                    'Retrieve and perform variants may include additional fields.',
                type: 'object',
            },
        ],
        returnType: 'void',
        syntax: 'ErrorUtil.ThrowWSProxyError(result)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var api = new Script.Util.WSProxy();\n' +
            'var customerKey = "0b744ffa-bab5-458d-9e7d-fb05a7873380";\n' +
            'try {\n' +
            '    var result = api.retrieve(\n' +
            '        "DataExtensionObject[" + customerKey + "]",\n' +
            '        ["FirstName", "LastName", "EmailAddress"]\n' +
            '    );\n' +
            '    ErrorUtil.ThrowWSProxyError(result);\n' +
            '    // process successful results\n' +
            '} catch (ex) {\n' +
            '    // custom error-handling logic\n' +
            '}',
    },
];

// ── Script.Util HTTP constructors ────────────────────────────────────────────
// Request handler constructors under the Script.Util namespace.
// Instantiated with `new Script.Util.HttpRequest(url)` etc.

/** @type {{name: string, minArgs: number, maxArgs: number, description: string, params?: {name: string, description: string, type?: string, optional?: boolean}[], returnType?: string, syntax?: string, example?: string}[]} */
export const SCRIPT_UTIL_CONSTRUCTORS = [
    {
        name: 'WSProxy',
        minArgs: 0,
        maxArgs: 0,
        description:
            'Creates a WSProxy instance for making SOAP API calls against the Marketing Cloud web service. ' +
            'No Platform.Load is required.',
        params: [],
        returnType: 'WSProxyInstance',
        returnDescription:
            'An authenticated WSProxy object bound to the current execution context.',
        syntax: 'new Script.Util.WSProxy()',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var result = api.retrieve("DataExtension", ["Name", "CustomerKey"]);\n' +
            'if (result.Status === "OK") {\n' +
            '    Write(Stringify(result.Results));\n' +
            '}',
    },
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
        returnType: 'HttpRequestInstance',
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
        returnType: 'HttpRequestInstance',
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
];

// ── Script.Util request object methods ──────────────────────────────────────
// Methods available on a request object returned by Script.Util.HttpRequest,
// Methods available on a request object returned by Script.Util.HttpRequest or Script.Util.HttpGet.

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
        syntax: '<HttpRequestInstance>.send()',
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
        syntax: '<HttpRequestInstance>.setHeader(name, value)',
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
        syntax: '<HttpRequestInstance>.clearHeaders()',
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
        syntax: '<HttpRequestInstance>.removeHeader(name)',
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
        syntax: 'Array.join([separator])',
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
        syntax: 'Array.push(element[, ...])',
        example: 'var arr = [1, 2];\narr.push(3);\n// arr is now [1, 2, 3]',
    },
    {
        name: 'pop',
        owner: 'Array.prototype',
        description: 'Removes and returns the last element from an array.',
        params: [],
        returnType: 'any',
        syntax: 'Array.pop()',
        example: 'var arr = [1, 2, 3];\nvar last = arr.pop(); // 3',
    },
    {
        name: 'shift',
        owner: 'Array.prototype',
        description: 'Removes and returns the first element from an array.',
        params: [],
        returnType: 'any',
        syntax: 'Array.shift()',
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
        syntax: 'Array.unshift(element[, ...])',
        example: 'var arr = [2, 3];\narr.unshift(1);\n// arr is now [1, 2, 3]',
    },
    {
        name: 'concat',
        owner: 'Array.prototype',
        description:
            'Returns a new array formed by merging this array with other arrays or values.',
        params: [{ name: 'value', description: 'Array or value to concatenate', type: 'any' }],
        returnType: 'array',
        syntax: 'Array.concat(value[, ...])',
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
        syntax: 'Array.slice([start[, end]])',
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
        syntax: 'Array.sort([compareFn])',
        example: 'var arr = [3, 1, 2];\narr.sort(function(a, b) { return a - b; }); // [1, 2, 3]',
    },
    {
        name: 'reverse',
        owner: 'Array.prototype',
        description: 'Reverses the elements of an array in place.',
        params: [],
        returnType: 'array',
        syntax: 'Array.reverse()',
        example: 'var arr = [1, 2, 3];\narr.reverse(); // [3, 2, 1]',
    },
    {
        name: 'splice',
        owner: 'Array.prototype',
        description:
            'Removes or replaces elements and optionally inserts new ones in place. ' +
            'Returns an array of the removed elements.',
        params: [
            {
                name: 'start',
                description: 'Index at which to start changing the array',
                type: 'number',
            },
            {
                name: 'deleteCount',
                description: 'Number of elements to remove (omit to remove all from start)',
                type: 'number',
                optional: true,
            },
            {
                name: 'item',
                description: 'Elements to insert at start (repeat for multiple)',
                type: 'any',
                optional: true,
            },
        ],
        returnType: 'array',
        syntax: 'Array.splice(start[, deleteCount[, item1[, ...]]])',
        example:
            'var arr = [1, 2, 3, 4];\n' +
            'var removed = arr.splice(1, 2); // removed: [2, 3], arr: [1, 4]\n' +
            'arr.splice(1, 0, 9, 8); // arr: [1, 9, 8, 4]',
    },
    {
        name: 'length',
        owner: 'Array.prototype',
        description: 'Returns the number of elements in the array.',
        params: [],
        returnType: 'number',
        syntax: 'Array.length',
        example: 'var arr = [1, 2, 3];\nWrite(arr.length); // 3',
    },
    // ── String.prototype ─────────────────────────────────────────────────────
    {
        name: 'charAt',
        owner: 'String.prototype',
        description: 'Returns the character at the specified index.',
        params: [{ name: 'index', description: 'Zero-based character index', type: 'number' }],
        returnType: 'string',
        syntax: 'String.charAt(index)',
        example: 'var str = "Hello";\nWrite(str.charAt(1)); // "e"',
    },
    {
        name: 'charCodeAt',
        owner: 'String.prototype',
        description: 'Returns the UTF-16 code unit at the specified index.',
        params: [{ name: 'index', description: 'Zero-based character index', type: 'number' }],
        returnType: 'number',
        syntax: 'String.charCodeAt(index)',
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
        syntax: 'String.indexOf(searchValue[, fromIndex])',
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
        syntax: 'String.lastIndexOf(searchValue[, fromIndex])',
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
        syntax: 'String.match(regexp)',
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
        syntax: 'String.replace(searchValue, replaceValue)',
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
        syntax: 'String.search(regexp)',
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
        syntax: 'String.slice(start[, end])',
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
        syntax: 'String.split(separator[, limit])',
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
        syntax: 'String.substring(start[, end])',
        example: 'var str = "Hello, world!";\nWrite(str.substring(7, 12)); // "world"',
    },
    {
        name: 'toLowerCase',
        owner: 'String.prototype',
        description: 'Returns the string converted to lowercase.',
        params: [],
        returnType: 'string',
        syntax: 'String.toLowerCase()',
        example: 'var str = "Hello World";\nWrite(str.toLowerCase()); // "hello world"',
    },
    {
        name: 'toUpperCase',
        owner: 'String.prototype',
        description: 'Returns the string converted to uppercase.',
        params: [],
        returnType: 'string',
        syntax: 'String.toUpperCase()',
        example: 'var str = "Hello World";\nWrite(str.toUpperCase()); // "HELLO WORLD"',
    },
    {
        name: 'concat',
        owner: 'String.prototype',
        description:
            'Returns a new string formed by concatenating this string with one or more additional strings.',
        params: [
            {
                name: 'string',
                description: 'String to append (repeat for multiple)',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'String.concat(string[, ...])',
        example: 'var str = "Hello";\nWrite(str.concat(", ", "world!")); // "Hello, world!"',
    },
    {
        name: 'substr',
        owner: 'String.prototype',
        description:
            'Returns a substring starting at start and running for length characters. ' +
            'If start is negative it is treated as (stringLength + start). ' +
            'Note: prefer substring() for portability; substr is defined in ES3 Annex B.',
        params: [
            {
                name: 'start',
                description: 'Start index (negative counts from end of string)',
                type: 'number',
            },
            {
                name: 'length',
                description: 'Number of characters to extract (omit to extract to end)',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'String.substr(start[, length])',
        example: 'var str = "Hello, world!";\nWrite(str.substr(7, 5)); // "world"',
    },
    {
        name: 'length',
        owner: 'String.prototype',
        description: 'Returns the number of characters in the string.',
        params: [],
        returnType: 'number',
        syntax: 'String.length',
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
    {
        name: 'sin',
        owner: 'Math',
        description: 'Returns the sine of an angle given in radians.',
        params: [{ name: 'x', description: 'Angle in radians', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.sin(x)',
        example: 'Write(Math.sin(Math.PI / 2)); // 1',
    },
    {
        name: 'cos',
        owner: 'Math',
        description: 'Returns the cosine of an angle given in radians.',
        params: [{ name: 'x', description: 'Angle in radians', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.cos(x)',
        example: 'Write(Math.cos(0)); // 1',
    },
    {
        name: 'tan',
        owner: 'Math',
        description: 'Returns the tangent of an angle given in radians.',
        params: [{ name: 'x', description: 'Angle in radians', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.tan(x)',
        example: 'Write(Math.tan(Math.PI / 4)); // ~1',
    },
    {
        name: 'asin',
        owner: 'Math',
        description: 'Returns the arc sine (in radians) of a number in the range [-1, 1].',
        params: [{ name: 'x', description: 'A number between -1 and 1', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.asin(x)',
        example: 'Write(Math.asin(1)); // ~1.5708 (π/2)',
    },
    {
        name: 'acos',
        owner: 'Math',
        description: 'Returns the arc cosine (in radians) of a number in the range [-1, 1].',
        params: [{ name: 'x', description: 'A number between -1 and 1', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.acos(x)',
        example: 'Write(Math.acos(1)); // 0',
    },
    {
        name: 'atan',
        owner: 'Math',
        description: 'Returns the arc tangent (in radians) of a number.',
        params: [{ name: 'x', description: 'A number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.atan(x)',
        example: 'Write(Math.atan(1)); // ~0.7854 (π/4)',
    },
    {
        name: 'atan2',
        owner: 'Math',
        description:
            'Returns the angle (in radians) from the positive x-axis to the point (x, y). ' +
            'Unlike atan, atan2 correctly handles all quadrants.',
        params: [
            { name: 'y', description: 'Y coordinate', type: 'number' },
            { name: 'x', description: 'X coordinate', type: 'number' },
        ],
        returnType: 'number',
        syntax: 'Math.atan2(y, x)',
        example: 'Write(Math.atan2(1, 1)); // ~0.7854 (π/4)',
    },
    {
        name: 'exp',
        owner: 'Math',
        description: 'Returns e raised to the power of x (e^x).',
        params: [{ name: 'x', description: 'The exponent', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.exp(x)',
        example: 'Write(Math.exp(1)); // ~2.71828 (e)',
    },
    {
        name: 'log',
        owner: 'Math',
        description: 'Returns the natural logarithm (base e) of a number.',
        params: [{ name: 'x', description: 'A positive number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.log(x)',
        example: 'Write(Math.log(Math.E)); // 1',
    },
    // ── Math constants ───────────────────────────────────────────────────────
    {
        name: 'PI',
        owner: 'Math',
        description: "The ratio of a circle's circumference to its diameter (~3.14159).",
        params: [],
        returnType: 'number',
        syntax: 'Math.PI',
        example: 'var area = Math.PI * r * r;',
    },
    {
        name: 'E',
        owner: 'Math',
        description: "Euler's number, the base of the natural logarithm (~2.71828).",
        params: [],
        returnType: 'number',
        syntax: 'Math.E',
        example: 'Write(Math.E); // ~2.71828',
    },
    {
        name: 'LN2',
        owner: 'Math',
        description: 'The natural logarithm of 2 (~0.69315).',
        params: [],
        returnType: 'number',
        syntax: 'Math.LN2',
        example: 'Write(Math.LN2); // ~0.693',
    },
    {
        name: 'LN10',
        owner: 'Math',
        description: 'The natural logarithm of 10 (~2.30259).',
        params: [],
        returnType: 'number',
        syntax: 'Math.LN10',
        example: 'Write(Math.LN10); // ~2.303',
    },
    {
        name: 'LOG2E',
        owner: 'Math',
        description: 'The base-2 logarithm of e (~1.44270).',
        params: [],
        returnType: 'number',
        syntax: 'Math.LOG2E',
        example: 'Write(Math.LOG2E); // ~1.443',
    },
    {
        name: 'LOG10E',
        owner: 'Math',
        description: 'The base-10 logarithm of e (~0.43429).',
        params: [],
        returnType: 'number',
        syntax: 'Math.LOG10E',
        example: 'Write(Math.LOG10E); // ~0.434',
    },
    {
        name: 'SQRT2',
        owner: 'Math',
        description: 'The square root of 2 (~1.41421).',
        params: [],
        returnType: 'number',
        syntax: 'Math.SQRT2',
        example: 'Write(Math.SQRT2); // ~1.414',
    },
    {
        name: 'SQRT1_2',
        owner: 'Math',
        description: 'The square root of 1/2 (~0.70711); equivalent to 1/Math.SQRT2.',
        params: [],
        returnType: 'number',
        syntax: 'Math.SQRT1_2',
        example: 'Write(Math.SQRT1_2); // ~0.707',
    },
    // ── Number.prototype ─────────────────────────────────────────────────────
    {
        name: 'toFixed',
        owner: 'Number.prototype',
        description:
            'Returns a string representing the number in fixed-point notation with the given number of decimal places.',
        params: [
            {
                name: 'fractionDigits',
                description: 'Number of digits after the decimal point (0–20, default 0)',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Number.toFixed([fractionDigits])',
        example:
            'var price = 9.99;\nWrite(price.toFixed(2)); // "9.99"\nWrite((1.5).toFixed(0)); // "2"',
    },
    {
        name: 'toExponential',
        owner: 'Number.prototype',
        description:
            'Returns a string representing the number in exponential notation. ' +
            'If fractionDigits is omitted, enough digits are included to uniquely identify the value.',
        params: [
            {
                name: 'fractionDigits',
                description: 'Digits after the decimal point in the significand (0–20)',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Number.toExponential([fractionDigits])',
        example: 'Write((123456).toExponential(2)); // "1.23e+5"',
    },
    {
        name: 'toPrecision',
        owner: 'Number.prototype',
        description:
            'Returns a string representing the number to the specified number of significant digits.',
        params: [
            {
                name: 'precision',
                description: 'Number of significant digits (1–21)',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Number.toPrecision([precision])',
        example: 'Write((123.456).toPrecision(5)); // "123.46"',
    },
    // ── Object.prototype ─────────────────────────────────────────────────────
    {
        name: 'hasOwnProperty',
        owner: 'Object.prototype',
        description:
            'Returns true if the object has the specified property as its own (not inherited) property. ' +
            'Commonly used to safely iterate for...in loops.',
        params: [{ name: 'v', description: 'Property name to test', type: 'string' }],
        returnType: 'boolean',
        syntax: 'Object.hasOwnProperty(v)',
        example:
            'var obj = {a: 1};\n' +
            'for (var key in obj) {\n' +
            '    if (obj.hasOwnProperty(key)) { Write(key); }\n' +
            '}',
    },
    // ── Global functions ─────────────────────────────────────────────────────
    {
        name: 'parseInt',
        owner: 'Global',
        description:
            'Parses a string and returns an integer in the specified radix (base). ' +
            'Leading whitespace is ignored. Returns NaN if no valid integer is found. ' +
            'Always specify a radix to avoid octal/hex ambiguity.',
        params: [
            { name: 'string', description: 'The string to parse', type: 'string' },
            {
                name: 'radix',
                description: 'Base of the numeral system (2–36); use 10 for decimal',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'number',
        syntax: 'parseInt(string[, radix])',
        example:
            'Write(parseInt("42", 10)); // 42\n' +
            'Write(parseInt("0xFF", 16)); // 255\n' +
            'Write(parseInt("abc", 10)); // NaN',
    },
    {
        name: 'parseFloat',
        owner: 'Global',
        description:
            'Parses a string and returns a floating-point number. ' +
            'Stops parsing at the first character that is not part of a valid number. ' +
            'Returns NaN if no valid number is found.',
        params: [{ name: 'string', description: 'The string to parse', type: 'string' }],
        returnType: 'number',
        syntax: 'parseFloat(string)',
        example:
            'Write(parseFloat("3.14")); // 3.14\n' +
            'Write(parseFloat("3.14abc")); // 3.14\n' +
            'Write(parseFloat("abc")); // NaN',
    },
    {
        name: 'isNaN',
        owner: 'Global',
        description:
            'Returns true if the value is NaN (Not-a-Number) after applying ToNumber conversion. ' +
            'Use this to guard against failed parseInt/parseFloat calls.',
        params: [{ name: 'value', description: 'Value to test', type: 'any' }],
        returnType: 'boolean',
        syntax: 'isNaN(value)',
        example:
            'Write(isNaN(NaN)); // true\n' +
            'Write(isNaN(parseInt("abc", 10))); // true\n' +
            'Write(isNaN(42)); // false',
    },
    {
        name: 'isFinite',
        owner: 'Global',
        description:
            'Returns true if the value is a finite number (not NaN, +Infinity, or -Infinity) ' +
            'after applying ToNumber conversion.',
        params: [{ name: 'value', description: 'Value to test', type: 'any' }],
        returnType: 'boolean',
        syntax: 'isFinite(value)',
        example:
            'Write(isFinite(42)); // true\n' +
            'Write(isFinite(1 / 0)); // false (Infinity)\n' +
            'Write(isFinite(NaN)); // false',
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
            const NATIVE = ['Date', 'RegExp', 'Error', 'Object', 'Array'];
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
// Maps class name (lowercase) → Map<method name (lowercase), entry>.
// Covers all CORE_LIBRARY_OBJECTS namespaces plus their rich *_METHODS arrays.
export const coreMethodArityLookup = new Map();
for (const [className, methods] of [
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
]) {
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
