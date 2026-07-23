/**
 * Canonical SSJS (Server-Side JavaScript) catalog for SFMC tooling.
 *
 * Single source of truth consumed by:
 *   - eslint-plugin-sfmc  (globals, unknown-function detection, platform-load checks)
 *   - prettier-plugin-sfmc (language registration)
 *   - vscode-sfmc-language (completions, hover, diagnostics)
 *
 * Schema version: 0.4.0 — additive fields added in this version:
 *   - ampscriptEquivalent?: string | null — the canonical AMPscript function name this
 *       Platform.Function maps to, or null when no AMPscript equivalent exists.
 *       Used by mcp-server-sfmc conversion tools. (PLATFORM_FUNCTIONS only)
 *   - isStatic?: boolean      — true for namespace-level calls (Class.Method()), false for instance calls
 *   - deprecated?: boolean    — true for entries that resolve at runtime but should not be used in new code
 *   - notDefinedAtRuntime?: boolean — true for entries that cannot be USED at runtime in any context
 *       available for testing. Two cases share this flag:
 *         (1) PRIMARY: entries that are officially documented but proven (via live CloudPage test) NOT to
 *             exist in the SSJS engine; calling them throws a ReferenceError (e.g. `Redirect`).
 *         (2) EXTENSION: documented members that the SSJS engine does NOT resolve as documented at
 *             runtime — calling them throws the generic `System.InvalidOperationException:
 *             "Unable to retrieve security descriptor for this frame."`, which in the SFMC SSJS engine
 *             signals an unrecognized member name or an argument count the engine does not accept
 *             (NOT a security or frame restriction). Example: `Platform.Request.GetUserLanguages`, which
 *             throws this error at every arity tried (0/1/2 args), so it cannot be invoked as documented.
 *       The shared EFFECT is identical for both cases: the entry is EXCLUDED from the generated .d.ts so
 *       editors never offer it, flagged by ESLint, but KEPT in ssjs-data (and ssjs.guide) for
 *       discoverability. Pair with officialDocsNote (runtime evidence) and a "use X instead" pointer.
 *   - verificationBlocked?: boolean — true when a runtime verification was ATTEMPTED but could not
 *       complete for a concrete technical/environmental reason (a platform guardrail, missing auth
 *       context, absent test data, etc.). This is a THIRD state, distinct from both "verified"
 *       (isConfirmed: true) and "never checked" (neither flag set). When true, isConfirmed MUST be
 *       explicitly false and verificationBlockedReason MUST name the blocker category. Put the concrete,
 *       human-readable detail (error codes, SOAP fault names) in officialDocsNote, not the enum value.
 *   - verificationBlockedReason?: string — REQUIRED whenever verificationBlocked is true; one of the
 *       VERIFICATION_BLOCKED_REASONS enum values. Never set on its own.
 *   - isProperty?: boolean    — true for entries accessed without parentheses (e.g. Platform.Request.HasSSL)
 *   - requiresCoreLoad?: boolean — true when the call site requires a preceding Platform.Load("core", "<version>").
 *       RUNTIME NOTE: the bare-name globals injected by Platform.Load (Write, Stringify, Base64Encode,
 *       Base64Decode, Format, Variable, Attribute, …) exist ONLY after Platform.Load("core", …) has run,
 *       so the load must precede any use of them. Once loaded they are usable in that scope and in nested
 *       helper-function bodies that close over it (runtime-verified — closures see them).
 *   - aliasOf?: string        — names the canonical entry this one aliases (dual-call modeling)
 *   - returnEnum?: (string|number|boolean)[] — allowed return literals when returnType is a primitive
 *   - enum?: (string|number|boolean)[]       — allowed literals for a parameter value
 *   - default?: string|number|boolean        — documented default value for a parameter
 *   - optional?: boolean                     — equivalent to Required:No in the docs
 *   - caseInsensitive?: boolean              — true for SOAP-style enums where casing is not enforced
 *   - validArities?: number[] — OPTIONAL, PLATFORM_FUNCTIONS only. Exact set of permitted
 *       argument counts for a DISCONTINUOUS OVERLOAD, where a contiguous minArgs..maxArgs
 *       range would wrongly accept intermediate counts. When present, a call is valid only
 *       when its argument count is within [minArgs, maxArgs] AND a member of this array.
 *       Every entry MUST lie within [minArgs, maxArgs], and both minArgs and maxArgs MUST
 *       be members. Example: HTTPGet accepts exactly 1 or 6 arguments (validArities: [1, 6]);
 *       2-5 arguments throw at runtime. Absent → behavior is a pure contiguous range.
 */

// ── Verification-blocked reasons ─────────────────────────────────────────────
// Fixed enum of concrete technical/environmental reasons why a runtime verification
// was ATTEMPTED but could not complete. Set on an entry as `verificationBlockedReason`
// together with `verificationBlocked: true` and `isConfirmed: false`. The specific
// evidence (error codes, SOAP fault names) belongs in `officialDocsNote`, not here.
//
//   - bu-guardrail        the test BU rejects the operation via a platform guardrail
//                         (spam filter, send-definition creation policy, etc.)
//   - needs-auth-context  requires authenticated user / send / subscriber context that
//                         a plain CloudPage test harness cannot provide
//   - no-test-data        requires pre-existing data of a kind not available on the BU
//   - classic-only-no-assets  method only works with classic (legacy) assets and none
//                         exist on the BU to test against
//   - destructive-unsafe  cannot be exercised without unacceptable side effects
//                         (reserved; destructive testing is generally allowed on the QA BU)
export const VERIFICATION_BLOCKED_REASONS = Object.freeze([
    'bu-guardrail',
    'needs-auth-context',
    'no-test-data',
    'classic-only-no-assets',
    'destructive-unsafe',
]);

// ── Global functions ─────────────────────────────────────────────────────────
// Functions and objects available at the top scope of any SSJS execution context.

export const SSJS_GLOBALS = [
    // ── Native JS globals (not Platform.Function.* aliases) ──────────────────
    {
        name: 'Variable',
        type: 'object',
        aliasOf: 'Platform.Variable', // provenance
        // Standalone bare-name object that DOES work at runtime. Shares the Platform.Variable member set.
        namespaceMethodsOf: 'Platform.Variable',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name global `Variable` is `undefined` BEFORE ' +
            '`Platform.Load("core", ...)` and becomes a usable object AFTER it. `Variable.SetValue(key, val)` / ' +
            '`Variable.GetValue(key)` work; `GetValue` on a variable that was set to `""` returns `""`, and on a ' +
            'never-set variable returns `""` (empty string), not `null`.',
        description:
            'Bare-name access to Platform.Variable.* methods (`Variable.SetValue`, `Variable.GetValue`).',
        requiresCoreLoad: true,
    },
    {
        name: 'Request',
        type: 'object',
        // Core Library "Request Object Utility Functions" object. It exposes EXACTLY 6
        // zero-arg METHODS of its own (URL, PagePath, Method, ApplicationID, PackageID,
        // ApplicationBaseURL) — a DIFFERENT, SMALLER member set than Platform.Request
        // (which uses properties like RequestURL and functions like GetCookieValue).
        // The generators resolve its members by this object's OWN name via
        // PLATFORM_NAMESPACE_MAP['Request'] → REQUEST_UTILITY_METHODS (no self-pointer).
        // It must NOT inherit Platform.Request's whole member set.
        isConfirmed: true,
        differsFromOfficialDocs: false,
        officialDocsNote:
            'Runtime-verified (CloudPage GET) per-member: `Request.URL()` returns the full request URL ' +
            'as a string; `Request.Method()` returns the HTTP verb (e.g. `"GET"`); `Request.PagePath()`, ' +
            '`Request.ApplicationID()`, `Request.PackageID()`, and `Request.ApplicationBaseURL()` invoke ' +
            'cleanly and return empty strings (`""`) when read outside their populating context. All 6 ' +
            'members invoke cleanly (a fake member such as `Request.NoSuchMember()` instead throws ' +
            '`Object expected`). This is a smaller, method-based set than `Platform.Request` — do not ' +
            'expect Platform.Request-only members (`RequestURL`, `GetCookieValue`, `GetUserLanguages`) here.',
        description:
            'Core Library "Request Object Utility Functions" object for reading incoming request values. ' +
            'It exposes exactly 6 zero-arg methods: `Request.URL()`, `Request.PagePath()`, `Request.Method()`, ' +
            '`Request.ApplicationID()`, `Request.PackageID()`, and `Request.ApplicationBaseURL()`. Requires ' +
            '`Platform.Load("core","1")`. This is a DISTINCT object from `Platform.Request`, not an alias: ' +
            'it has a smaller, method-only member set and requires Platform.Load, whereas `Platform.Request` ' +
            'works without Platform.Load and mixes properties (e.g. `RequestURL`) with getter methods. ' +
            'For example the current URL is the `Request.URL()` METHOD here versus the `RequestURL` PROPERTY ' +
            'on `Platform.Request`.',
        requiresCoreLoad: true,
    },
    {
        name: 'Recipient',
        type: 'object',
        aliasOf: 'Platform.Recipient',
        isConfirmed: true,
        notDefinedAtRuntime: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name global `Recipient` is `undefined` both BEFORE and ' +
            'AFTER Platform.Load("core", ...) — it does NOT exist as a usable alias. Use ' +
            '`Platform.Recipient.GetAttributeValue(...)`, or `Attribute.GetValue(...)` after Platform.Load.',
        description:
            'Documented bare-name alias for Platform.Recipient, but NOT defined at runtime. ' +
            'Use Platform.Recipient.* or Attribute.GetValue() instead.',
    },
    {
        name: 'Attribute',
        type: 'object',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): available as an object after `Platform.Load("core", "1.1.5")` ' +
            '(before load `typeof Attribute` is `undefined`). `Attribute.GetValue(name)` returns a string; ' +
            'in a CloudPage (no subscriber send context) it returns `""` for both real and unknown attribute ' +
            'names, so treat an empty string as "no value in this context" rather than proof the attribute is absent.',
        description:
            'Namespace for reading subscriber attribute values. ' +
            'Call `Attribute.GetValue(name)` to retrieve an attribute for the current recipient.',
        requiresCoreLoad: true,
    },
    {
        name: 'HTTPHeader',
        type: 'object',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): available after Platform.Load("core", ...). `GetValue` reads INBOUND ' +
            'request headers and returns `null` for a header you set via `SetValue` (separate inbound/outbound ' +
            'collections). `Remove` returns `undefined`, not `"OK"`.',
        description:
            'Object that provides access to HTTP request headers in SSJS CloudPage context.',
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
        minArgs: 0,
        maxArgs: 1,
        isConfirmed: true,
        description:
            'Native JavaScript function that converts any value to its string representation. ' +
            'Essential in SSJS for converting the CLR response object returned by Script.Util.HttpRequest.send().content ' +
            'into a JavaScript string that can be passed to Platform.Function.ParseJSON(). ' +
            'Unlike Stringify(), String() works on CLR/.NET objects and does not produce JSON output. ' +
            'Runtime-verified (CloudPage): available with no Platform.Load; `String()` with no argument returns `""`, ' +
            '`String(null)` returns `"null"`.',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: unlike standard JavaScript, a JS-constructed `new Error("msg")` in the SFMC Jint engine does NOT expose the message via `.message` — `err.message` reads back `undefined`, and `Stringify(err)` surfaces only a hidden `{jintException}` (the .NET stack), not the message. Recover the message with `String(err)` or `("" + err)` (both yield the constructor argument), or `err.toString()` (yields "Error: undefined"). This differs from engine-raised errors, which DO carry `.message` + `.description`. Do not rely on `new Error(...).message`.',
        description:
            'Native JavaScript Error constructor. Creates an Error object that can be thrown or caught. ' +
            'Use inside try/catch blocks for structured error handling in SSJS. ' +
            'CAVEAT: for a JS-constructed `new Error("msg")`, the message is NOT readable via `.message` ' +
            '(it returns undefined); use `String(err)` or `("" + err)` to recover it. Engine-raised errors ' +
            '(e.g. from a bad Platform.Function call) instead expose `.message` and `.description`.',
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
            '    // For new Error(...), the message is recovered via String(e), NOT e.message.\n' +
            '    Write("Error: " + String(e));\n' +
            '}',
    },
    {
        name: 'Base64Encode',
        type: 'function',
        minArgs: 1,
        maxArgs: 1,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: false,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `Base64Encode` works after `Platform.Load("core", ...)` ' +
            'and returns the encoded string (e.g. Base64Encode("hi") -> "aGk="). This matches the official docs — ' +
            'the Core-library intro documents that these bare-name globals require Platform.Load, so the requirement ' +
            'is documented behavior, not a deviation. SCOPE RULE: bare-name Core globals exist ONLY after ' +
            'Platform.Load has run — call the load first. Once loaded they are usable in that scope and inside ' +
            'nested helper-function bodies that close over it. For charset control or a scope-independent form ' +
            'that needs no Platform.Load, use `Platform.Function.Base64Encode(string[, charset])`.',
        description:
            'Encodes plain text to a Base64 encoded string. ' +
            'For charset control or scope-independent use, use `Platform.Function.Base64Encode(string, charset)` instead.',
        params: [{ name: 'string', description: 'Text to encode', type: 'string' }],
        returnType: 'string',
        syntax: 'Base64Encode(string)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var encoded = Base64Encode(\'Convert to Base64\'); // "Q29udmVydCB0byBCYXNlNjQ="',
    },
    {
        name: 'Base64Decode',
        type: 'function',
        minArgs: 1,
        maxArgs: 1,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: false,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `Base64Decode` works after `Platform.Load("core", ...)` ' +
            '(e.g. Base64Decode("aGk=") -> "hi"). This matches the official docs — the Core-library intro documents ' +
            'that these bare-name globals require Platform.Load, so the requirement is documented behavior, not a ' +
            'deviation. SCOPE RULE: bare-name Core globals exist ONLY after Platform.Load has run — call the load ' +
            'first. Once loaded they are usable in that scope and inside nested helper-function bodies that close ' +
            'over it. For charset control or a scope-independent form that needs no Platform.Load, use ' +
            '`Platform.Function.Base64Decode(encodedString[, charset])`.',
        description:
            'Decodes a Base64 encoded string to plain text. ' +
            'For charset control or scope-independent use, use `Platform.Function.Base64Decode(encodedString, charset)` instead.',
        params: [
            {
                name: 'encodedString',
                description: 'Base64 encoded string to decode',
                type: 'string',
            },
        ],
        returnType: 'string',
        syntax: 'Base64Decode(encodedString)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var decoded = Base64Decode(\'VGhpcyB3YXMgYSBCYXNlNjQgZW5jb2RlZCBzdHJpbmcu\'); // "This was a Base64 encoded string."',
    },
    // ── Bare-name aliases for Platform.Function.* (dual-call rule) ───────────
    // Every Platform.Function.X() is also callable as X(). The canonical
    // definition lives in PLATFORM_FUNCTIONS. A subset requires a preceding
    // Platform.Load("core", "1.1.5") call (requiresCoreLoad: true).
    {
        name: 'ContentArea',
        minArgs: 1,
        maxArgs: 4,
        deprecated: true,
        requiresCoreLoad: true,
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `ContentArea` IS defined as a function after ' +
            '`Platform.Load("core", ...)` has run (the load must precede use; once loaded the bare name is ' +
            'usable in that scope and in nested helper bodies that close over it). It throws only because ' +
            'Content Areas are deprecated and the target area no longer resolves on current SFMC ' +
            'infrastructure, not because the global is missing. ' +
            'The Platform.Function.ContentArea() variant does not require Platform.Load.',
        description:
            'Retrieves content from a classic Content Area by numeric ID. ' +
            'Deprecated — Content Areas are no longer supported on current SFMC infrastructure. ' +
            'Note: the Platform.Function.ContentArea() variant does not require Platform.Load and ' +
            'accepts a boolean stopOnError parameter instead of a string errorMsg.',
        params: [
            { name: 'id', description: 'Numeric ID of the Content Area.', type: 'number' },
            {
                name: 'regionName',
                description: 'Impression region for content.',
                type: 'string',
                optional: true,
            },
            {
                name: 'errorMsg',
                description: 'Error message string returned on failure.',
                type: 'string',
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
        syntax: 'ContentArea(id[, regionName, errorMsg, fallbackContent])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var content = ContentArea(123456, "impressionRegion", "fallback error msg", "defaultContentHere");',
    },
    {
        name: 'ContentAreaByName',
        minArgs: 1,
        maxArgs: 4,
        deprecated: true,
        requiresCoreLoad: true,
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `ContentAreaByName` IS defined as a function after ' +
            '`Platform.Load("core", ...)` has run (the load must precede use; once loaded the bare name is ' +
            'usable in that scope and in nested helper bodies that close over it). It throws only because ' +
            'Content Areas are deprecated and the target area no longer resolves on current SFMC ' +
            'infrastructure, not because the global is missing. ' +
            'The Platform.Function.ContentAreaByName() variant does not require Platform.Load.',
        description:
            'Retrieves content from a classic Content Area by name. ' +
            'Deprecated — Content Areas are no longer supported on current SFMC infrastructure. ' +
            'Note: the Platform.Function.ContentAreaByName() variant does not require Platform.Load and ' +
            'accepts a boolean stopOnError parameter instead of a string errorMsg.',
        params: [
            { name: 'name', description: 'Name of the Content Area.', type: 'string' },
            {
                name: 'regionName',
                description: 'Impression region for content.',
                type: 'string',
                optional: true,
            },
            {
                name: 'errorMsg',
                description: 'Error message string returned on failure.',
                type: 'string',
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
        syntax: 'ContentAreaByName(name[, regionName, errorMsg, fallbackContent])',
        example:
            'Platform.Load("core", "1.1.5");' +
            '\n' +
            String.raw`var content = ContentAreaByName("My Content\\myContentArea", "impressionRegion", "fallback error msg", "defaultContentHere");`,
    },
    {
        name: 'BeginImpressionRegion',
        type: 'function',
        aliasOf: 'Platform.Function.BeginImpressionRegion', // provenance
        minArgs: 1,
        maxArgs: 1,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `BeginImpressionRegion` IS defined as a function after ' +
            '`Platform.Load("core", ...)`, but calling it — with either a string literal or a variable — throws ' +
            '"A BeginImpressionRegion function call includes an invalid parameter value. The values making up the ' +
            'parameter value for this call must be a literal (constant) values." The bare alias and the ' +
            '`Platform.Function.BeginImpressionRegion` form behave identically (both throw the same error), so ' +
            'impression regions are effectively unusable from SSJS — they are an AMPscript-only feature. ' +
            'SCOPE RULE: bare-name Core globals exist ONLY after Platform.Load has run — call the load first.',
        description:
            'Marks the start of a named impression tracking region within content. ' +
            'Runtime note: unusable from SSJS — every call (literal or variable argument) throws a ' +
            'resolved-value error; impression regions are an AMPscript-only feature.',
        params: [{ name: 'name', description: 'The impression region name.', type: 'string' }],
        returnType: 'void',
        syntax: 'BeginImpressionRegion(name)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            '// Note: throws at runtime in SSJS — impression regions are AMPscript-only.\n' +
            'BeginImpressionRegion("hero-banner");',
    },
    {
        name: 'EndImpressionRegion',
        type: 'function',
        aliasOf: 'Platform.Function.EndImpressionRegion', // provenance
        minArgs: 0,
        maxArgs: 1,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `EndImpressionRegion` IS defined as a function after ' +
            '`Platform.Load("core", ...)` and can be called without throwing. It DIFFERS from its ' +
            '`Platform.Function.EndImpressionRegion` counterpart in return value: the bare alias returns ' +
            '`undefined` (typeof "undefined"), whereas `Platform.Function.EndImpressionRegion()` returns a genuine ' +
            '`null` (typeof "object", === null). The official docs type the return as void. Because ' +
            '`BeginImpressionRegion` is unusable from SSJS, this method has no practical effect in SSJS either. ' +
            'SCOPE RULE: bare-name Core globals exist ONLY after Platform.Load has run — call the load first.',
        description:
            'Marks the end of an impression tracking region within content. ' +
            'Runtime note: the bare alias returns `undefined` (its `Platform.Function.EndImpressionRegion` ' +
            'counterpart returns `null`); has no practical effect in SSJS because impression regions are ' +
            'AMPscript-only.',
        params: [
            {
                name: 'closeAll',
                description: 'Optional flag to close all open impression regions.',
                type: 'boolean',
                optional: true,
            },
        ],
        returnType: 'undefined',
        syntax: 'EndImpressionRegion([closeAll])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'EndImpressionRegion(); // returns undefined (Platform.Function form returns null)',
    },
    {
        name: 'Now',
        type: 'function',
        aliasOf: 'Platform.Function.Now', // provenance
        minArgs: 0,
        maxArgs: 1,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `Now` works after `Platform.Load("core", ...)` and ' +
            'returns the same value as `Platform.Function.Now()` — a genuine Date object: typeof "object", ' +
            '`Object.prototype.toString` reports "[object Date]", `.constructor === Date`, and ' +
            '`getFullYear()`/`getHours()`/`getTime()` all work (identical to `new Date()`). The only anomaly is that ' +
            '`instanceof Date` returns false, due to the engine-wide `instanceof`-on-builtins bug — detect via ' +
            '`.constructor === Date`, not `instanceof`. It coerces to an RFC 2822-style string such as ' +
            '"Tue, 21 Jul 2026 10:18:24 GMT-06:00" during output. The official docs describe the return as an ' +
            'RFC 2822-compliant date-time string. ' +
            'SCOPE RULE: bare-name Core globals exist ONLY after Platform.Load has run — call the load first.',
        description:
            'Returns the current server date/time as a Date object (in the account timezone, Central by ' +
            'default), or the timestamp of the triggering send when called with `true`. Behaves identically to ' +
            '`Platform.Function.Now()`.',
        params: [
            {
                name: 'useContextTime',
                description:
                    'Pass `true` to return the timestamp of the triggering send instead of the current time.',
                type: 'boolean',
                optional: true,
            },
        ],
        returnType: 'Date',
        syntax: 'Now([useContextTime])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var current = Now(); // e.g. "Tue, 21 Jul 2026 10:18:24 GMT-06:00"\n' +
            'Write(current.getFullYear()); // 2026',
    },
    {
        name: 'DateTime.SystemDateToLocalDate',
        type: 'function',
        aliasOf: 'Platform.Function.SystemDateToLocalDate', // provenance
        minArgs: 1,
        maxArgs: 1,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): `DateTime.SystemDateToLocalDate` works after `Platform.Load("core", ...)` ' +
            'and returns the same value as `Platform.Function.SystemDateToLocalDate()` — a genuine Date object: ' +
            'typeof "object", `Object.prototype.toString` reports "[object Date]", `.constructor === Date`, and ' +
            '`getFullYear()`/`getHours()`/`getTime()` all work (identical to `new Date()`). The only anomaly is that ' +
            '`instanceof Date` returns false, due to the engine-wide `instanceof`-on-builtins bug — detect via ' +
            '`.constructor === Date`, not `instanceof`. It coerces to an ISO-like string when written or stringified. ' +
            'The official docs type the return value as a string. SCOPE RULE: bare-name Core globals exist ONLY after ' +
            'Platform.Load has run — call the load first.',
        description:
            'Converts a date-time value from Marketing Cloud system time (CST, without daylight saving) to the ' +
            'local time of the account or user. Returns a Date object. Behaves identically to ' +
            '`Platform.Function.SystemDateToLocalDate()`.',
        params: [
            {
                name: 'dateString',
                description: 'The system-time date-time value to convert.',
                type: 'string',
            },
        ],
        returnType: 'Date',
        syntax: 'DateTime.SystemDateToLocalDate(dateString)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var localDate = DateTime.SystemDateToLocalDate(Now());\n' +
            'Write(localDate);',
    },
    {
        name: 'DateTime.LocalDateToSystemDate',
        type: 'function',
        aliasOf: 'Platform.Function.LocalDateToSystemDate', // provenance
        minArgs: 1,
        maxArgs: 1,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): `DateTime.LocalDateToSystemDate` works after `Platform.Load("core", ...)` ' +
            'and returns the same value as `Platform.Function.LocalDateToSystemDate()` — a genuine Date object: ' +
            'typeof "object", `Object.prototype.toString` reports "[object Date]", `.constructor === Date`, and ' +
            '`getFullYear()`/`getHours()`/`getTime()` all work (identical to `new Date()`). The only anomaly is that ' +
            '`instanceof Date` returns false, due to the engine-wide `instanceof`-on-builtins bug — detect via ' +
            '`.constructor === Date`, not `instanceof`. It coerces to an ISO-like string when written or stringified. ' +
            'The official docs type the return value as a string. SCOPE RULE: bare-name Core globals exist ONLY after ' +
            'Platform.Load has run — call the load first.',
        description:
            'Converts a date-time value from the local time of the account or user to Marketing Cloud system time ' +
            '(CST, without daylight saving). Returns a Date object. Behaves identically to ' +
            '`Platform.Function.LocalDateToSystemDate()`.',
        params: [
            {
                name: 'dateString',
                description: 'The local-time date-time value to convert.',
                type: 'string',
            },
        ],
        returnType: 'Date',
        syntax: 'DateTime.LocalDateToSystemDate(dateString)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var systemDate = DateTime.LocalDateToSystemDate("8/5/2025 12:00:00 PM");\n' +
            'Write(systemDate);',
    },
    {
        name: 'Redirect',
        type: 'function',
        requiresCoreLoad: true,
        minArgs: 2,
        maxArgs: 2,
        isConfirmed: true,
        differsFromOfficialDocs: false,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `Redirect` IS defined as a function after ' +
            '`Platform.Load("core", ...)` and actually performs the redirect. This matches the official docs — ' +
            'the Core-library intro documents that these bare-name globals require Platform.Load, so the requirement ' +
            'is documented behavior, not a deviation. SCOPE RULE: bare-name Core globals exist ONLY after ' +
            'Platform.Load has run — call the load first. Once loaded they are usable in that scope and inside ' +
            'nested helper-function bodies that close over it. For a scope-independent form that needs no ' +
            'Platform.Load, use `Platform.Response.Redirect(url, movedPermanently)`. ' +
            'Meaningful only in CloudPage context.',
        description:
            'Redirects the browser to another address. ' +
            'For scope-independent use that needs no Platform.Load, use `Platform.Response.Redirect(url, movedPermanently)`. ' +
            'Meaningful only in CloudPage context.',
        params: [
            {
                name: 'url',
                description: 'The address to send the browser to.',
                type: 'string',
            },
            {
                name: 'movedPermanently',
                description:
                    'Pass `true` for an HTTP 301 (permanent) redirect or `false` for a 302 (temporary) redirect.',
                type: 'boolean',
            },
        ],
        returnType: 'void',
        syntax: 'Redirect(url, movedPermanently)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'Redirect("https://www.example.com", false); // or, scope-independent: Platform.Response.Redirect("https://www.example.com", false);',
    },
    {
        name: 'GUID',
        type: 'function',
        aliasOf: 'Platform.Function.GUID', // provenance
        minArgs: 0,
        maxArgs: 0,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: false,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `GUID` works after `Platform.Load("core", ...)` and ' +
            'returns the same value as `Platform.Function.GUID()` — a lowercase canonical UUID v4 string of 36 ' +
            'characters (e.g. "f038aa14-708f-4392-a329-7dfa46abaf4b"). SCOPE RULE: bare-name Core globals exist ' +
            'ONLY after Platform.Load has run — call the load first.',
        description:
            'Generates a new globally unique identifier as a lowercase canonical UUID v4 string (36 characters). ' +
            'Behaves identically to `Platform.Function.GUID()`.',
        params: [],
        returnType: 'string',
        syntax: 'GUID()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var id = GUID(); // e.g. "f038aa14-708f-4392-a329-7dfa46abaf4b"',
    },
    {
        name: 'IsEmailAddress',
        type: 'function',
        aliasOf: 'Platform.Function.IsEmailAddress', // provenance
        minArgs: 1,
        maxArgs: 1,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: false,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `IsEmailAddress` works after `Platform.Load("core", ...)` ' +
            'and returns the same boolean as `Platform.Function.IsEmailAddress()` (e.g. "a@b.com" -> true, ' +
            '"nope" -> false). SCOPE RULE: bare-name Core globals exist ONLY after Platform.Load has run — call ' +
            'the load first.',
        description:
            'Checks whether a string is a valid email address format. Behaves identically to ' +
            '`Platform.Function.IsEmailAddress()`.',
        params: [{ name: 'value', description: 'The string to validate.', type: 'string' }],
        returnType: 'boolean',
        syntax: 'IsEmailAddress(value)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'if (IsEmailAddress(emailInput)) { Write("Valid email"); }',
    },
    {
        name: 'IsPhoneNumber',
        type: 'function',
        aliasOf: 'Platform.Function.IsPhoneNumber', // provenance
        minArgs: 1,
        maxArgs: 1,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `IsPhoneNumber` works after `Platform.Load("core", ...)` ' +
            'and returns the same boolean as `Platform.Function.IsPhoneNumber()`. The official docs describe ' +
            'generic "valid phone number" validation; see the `Platform.Function.IsPhoneNumber` entry for the ' +
            'stricter runtime format details. SCOPE RULE: bare-name Core globals exist ONLY after Platform.Load ' +
            'has run — call the load first.',
        description:
            'Evaluates whether a string is a valid phone number and returns a boolean. Behaves identically to ' +
            '`Platform.Function.IsPhoneNumber()` (see that entry for the strict digits-only runtime format).',
        params: [{ name: 'value', description: 'The string to validate.', type: 'string' }],
        returnType: 'boolean',
        syntax: 'IsPhoneNumber(value)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'if (IsPhoneNumber(phoneInput)) { Write("Valid phone"); }',
    },
    {
        name: 'Write',
        type: 'function',
        aliasOf: 'Platform.Response.Write', // provenance
        minArgs: 1,
        maxArgs: 1,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: false,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `Write` works after `Platform.Load("core", ...)` and ' +
            'outputs to the response. This matches the official docs — the Core-library intro documents that these ' +
            'bare-name globals require Platform.Load, so the requirement is documented behavior, not a deviation. ' +
            'SCOPE RULE: bare-name Core globals exist ONLY after Platform.Load has run — call the load first. Once ' +
            'loaded they are usable in that scope and inside nested helper-function bodies that close over it. For a ' +
            'scope-independent form that needs no Platform.Load and works in any scope, use ' +
            '`Platform.Response.Write(text)` instead.',
        description:
            'Writes text to the HTTP response output. ' +
            'For scope-independent output that needs no Platform.Load, use `Platform.Response.Write(text)` instead.',
        params: [{ name: 'text', description: 'Text to write to the response.', type: 'string' }],
        returnType: 'void',
        syntax: 'Write(text)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'Write("Hello world"); // or, scope-independent: Platform.Response.Write("Hello world");',
    },
    {
        name: 'Stringify',
        type: 'function',
        aliasOf: 'Platform.Function.Stringify', // provenance
        minArgs: 1,
        maxArgs: 1,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: false,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `Stringify` works after `Platform.Load("core", ...)` ' +
            '(e.g. Stringify({a:1,b:"x"}) -> \'{"a":1,"b":"x"}\'). This matches the official docs — the Core-library ' +
            'intro documents that these bare-name globals require Platform.Load, so the requirement is documented ' +
            'behavior, not a deviation. SCOPE RULE: bare-name Core globals exist ONLY after Platform.Load has run — ' +
            'call the load first. Once loaded they are usable in that scope and inside nested helper-function bodies ' +
            'that close over it. For a scope-independent form that needs no Platform.Load, use ' +
            '`Platform.Function.Stringify(value)`.',
        description:
            'Serializes a value to a JSON string. ' +
            'For scope-independent use, use `Platform.Function.Stringify(value)` instead.',
        params: [{ name: 'value', description: 'Value to serialize to JSON.', type: 'any' }],
        returnType: 'string',
        syntax: 'Stringify(value)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var json = Stringify({ a: 1, b: "x" }); // \'{"a":1,"b":"x"}\'',
    },
    // ── Core-library namespace markers ───────────────────────────────────────
    {
        name: 'DateTime',
        type: 'object',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage, Platform.Load("core","1.1.5")): available. ' +
            '`SystemDateToLocalDate` / `LocalDateToSystemDate` return genuine Date objects (typeof "object", ' +
            '`Object.prototype.toString` === "[object Date]", `.constructor === Date`, working `getFullYear()` etc.; ' +
            'only `instanceof Date` is false due to the engine-wide instanceof-on-builtins bug), which also coerce ' +
            'transparently to strings via `"" + value`, `String(value)`, or `Write(value)`. ' +
            '`DateTime.TimeZone.Retrieve(filter)` returns CLR rows ' +
            'that `Stringify()` cannot serialize (throws "Object expected"); enumerate fields with `for..in` instead.',
        description:
            'Namespace for time zone and date utilities. ' +
            'Access sub-namespaces such as `DateTime.TimeZone` for time zone operations.',
        requiresCoreLoad: true,
    },
    {
        name: 'ErrorUtil',
        type: 'object',
        deprecated: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): `ErrorUtil` is provided ONLY by `Platform.Load("Core", "1")`. ' +
            'Under newer Core versions ("1.1.1", "1.1.5", …) it is `undefined`. Effectively deprecated in Core > 1. ' +
            'Prefer checking `result.Status` and throwing `new Error(...)` instead of ErrorUtil.ThrowWSProxyError.',
        description:
            'Utility namespace for WSProxy error handling. ' +
            'Call `ErrorUtil.ThrowWSProxyError(result)` to convert WSProxy error-status results into thrown exceptions. ' +
            'DEPRECATED: only available under `Platform.Load("Core", "1")`; unavailable in newer Core versions.',
        requiresCoreLoad: true,
    },
    {
        name: 'Format',
        type: 'function',
        minArgs: 2,
        maxArgs: 2,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: false,
        officialDocsNote:
            'Runtime-verified (CloudPage): the bare-name `Format` works after `Platform.Load("core", ...)` ' +
            '(e.g. Format(4213.65, "C2") -> "$4,213.65"). This matches the official docs — the Core-library intro ' +
            'documents that these bare-name globals require Platform.Load, so the requirement is documented ' +
            'behavior, not a deviation. SCOPE RULE: bare-name Core globals exist ONLY after Platform.Load has run — ' +
            'call the load first. Once loaded they are usable in that scope and inside nested helper-function ' +
            'bodies that close over it.',
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
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): Platform.Load("core", "1.1.5") succeeds and enables bare-name Core ' +
            'aliases (e.g. `Variable`, `Attribute`, `DataExtension`). The `Platform.*` objects (Request, ' +
            'Response, Variable, Recipient) are already available WITHOUT calling Platform.Load.',
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
        ampscriptEquivalent: 'Lookup',
        minArgs: 4,
        maxArgs: 4,
        description:
            'Retrieves a single field value from the first Data Extension row matching filter criteria. ' +
            "The returned value keeps the column's native runtime type (Text/EmailAddress become string, Number/Decimal become number, Boolean becomes boolean, Date becomes a real Date object). " +
            'Three distinct empty-ish returns: when no row matches it returns a genuine JavaScript null (=== null is true); when a row exists but the field is empty/NULL it returns a CLR null whose typeof is "clr" (=== null is FALSE) and which stringifies to ""; otherwise the populated native value. ' +
            'To filter by multiple columns, pass string arrays for whereFieldNames and whereFieldValues (AND logic).',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs type the return as a string, but at runtime Lookup returns the column\'s typed value. Runtime-verified per DE field type: Text/EmailAddress/Locale/Phone return a string, Number/Decimal return a number, Boolean returns a boolean, and Date returns a real Date object. No-match returns a genuine JavaScript null. A row with an empty/NULL field returns a CLR null (typeof "clr", not === null) that stringifies to "" — so guard empty fields with a loose == null or a String() coercion, not a strict === null check.',
        params: [
            {
                name: 'deName',
                description: 'Data Extension name (resolved by Name, not external key)',
                type: 'string',
            },
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
        returnType: 'string|number|boolean|Date|null',
        syntax: 'Platform.Function.Lookup(deName, returnField, whereFieldNames, whereFieldValues)',
        example:
            '// Single filter:\n' +
            'var email = Platform.Function.Lookup("Subscribers", "EmailAddress", "SubscriberKey", "abc123");\n\n' +
            '// Multiple filters (AND logic):\n' +
            'var phone = Platform.Function.Lookup("CustomerData", "Phone", ["FirstName", "LastName"], ["Carolyn", "Baumgartner"]);',
    },
    {
        name: 'LookupRows',
        ampscriptEquivalent: 'LookupRows',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Returns an array of row objects from a Data Extension matching filter criteria (up to 2,000 rows). ' +
            'Each row object also carries the system fields _CustomObjectKey (number) and _CreatedDate (string). ' +
            'Returns null (not an empty array) when no row matches. ' +
            'To filter by multiple columns, pass string arrays for whereFieldNames and whereFieldValues (AND logic).',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs do not mention that no-match returns null (rather than an empty array) or that each row object includes the system fields _CustomObjectKey and _CreatedDate. Most fields are returned as their typed/native JS value, unlike DataExtension.Rows.Retrieve() which stringifies every field. Runtime-verified per DE field type: Text/EmailAddress/Locale/Phone come back as string, Number/Decimal as number, Boolean as boolean; Date columns are the exception — they come back as an ISO-8601 string (e.g. "2024-01-15T00:00:00.000"), NOT a Date object — this differs from Platform.Function.Lookup, which returns a real Date for Date columns. Runtime testing confirms the return value is a genuine JavaScript Array (Array.isArray is true; .push/.slice/.sort work), so the return type is object[]; note that instanceof Array is unreliable in the SFMC engine, so use the Array.isArray polyfill to test it.',
        params: [
            {
                name: 'deName',
                description: 'Data Extension name (resolved by Name, not external key)',
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
        returnType: 'object[]|null',
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
        ampscriptEquivalent: 'LookupOrderedRows',
        minArgs: 5,
        maxArgs: 5,
        description:
            'Returns an ordered array of row objects from a Data Extension. ' +
            'The sort expression is a single string in the format "ColumnName ASC" or "ColumnName DESC". ' +
            'Multiple columns can be separated by commas. Returns up to 2,000 rows; values below 1 for count default to 2,000. ' +
            'Each row object also carries the system fields _CustomObjectKey (number) and _CreatedDate (string). ' +
            'To filter by multiple columns, pass string arrays for whereFieldNames and whereFieldValues (AND logic).',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs do not mention that each returned row object includes the system fields _CustomObjectKey and _CreatedDate. Most fields are returned as their typed/native JS value, unlike DataExtension.Rows.Retrieve() which stringifies every field. Runtime-verified per DE field type: Text/EmailAddress/Locale/Phone come back as string, Number/Decimal as number, Boolean as boolean; Date columns are the exception — they come back as an ISO-8601 string (e.g. "2024-01-15T00:00:00.000"), NOT a Date object — this differs from Platform.Function.Lookup, which returns a real Date for Date columns. Runtime testing confirms the return value is a genuine JavaScript Array (Array.isArray is true; .push/.slice/.sort work), so the return type is object[]; note that instanceof Array is unreliable in the SFMC engine, so use the Array.isArray polyfill to test it.',
        params: [
            {
                name: 'deName',
                description: 'Data Extension name (resolved by Name, not external key)',
                type: 'string',
            },
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
        returnType: 'object[]|null',
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
        ampscriptEquivalent: 'InsertData',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Adds a new row to a Data Extension and returns the number of rows inserted. ' +
            'Recommended for non-sending contexts (CloudPages, landing pages, microsites, and SMS messages), but the *DE variants also run and commit there — see InsertDE().',
        isConfirmed: true,
        params: [
            {
                name: 'deName',
                description: 'Data Extension name (resolved by Name, not external key)',
                type: 'string',
            },
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
        ampscriptEquivalent: 'InsertDE',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Adds a new row to a Data Extension. Returns null (no value). ' +
            'The official docs describe this as an email-context function, but it was proven to run and commit on a CloudPage as well. ' +
            'InsertData() is still preferred outside email because it returns the affected-row count.',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs restrict InsertDE to email contexts, but at runtime it executes and commits its insert on a CloudPage too; it returns null rather than a row count.',
        params: [
            {
                name: 'deName',
                description: 'Data Extension name (resolved by Name, not external key)',
                type: 'string',
            },
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
        returnType: 'null',
        syntax: 'Platform.Function.InsertDE(deName, fieldNames, fieldValues)',
        example:
            'Platform.Function.InsertDE("MyDE", ["Email", "Name"], ["jane@example.com", "Jane"]);',
    },
    {
        name: 'UpdateData',
        ampscriptEquivalent: 'UpdateData',
        minArgs: 5,
        maxArgs: 5,
        description:
            'Modifies existing rows in a Data Extension matching filter criteria and returns the number of rows updated. ' +
            'Recommended for non-sending contexts (CloudPages, landing pages, microsites, and SMS messages), but the *DE variants also run and commit there — see UpdateDE().',
        isConfirmed: true,
        params: [
            {
                name: 'deName',
                description: 'Data Extension name (resolved by Name, not external key)',
                type: 'string',
            },
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
        ampscriptEquivalent: 'UpdateDE',
        minArgs: 5,
        maxArgs: 5,
        description:
            'Modifies existing rows in a Data Extension matching filter criteria. Returns null (no value). ' +
            'The official docs describe this as an email-context function, but it was proven to run and commit on a CloudPage as well. ' +
            'UpdateData() is still preferred outside email because it returns the affected-row count.',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs restrict UpdateDE to email contexts, but at runtime it executes and commits its update on a CloudPage too; it returns null rather than a row count.',
        params: [
            {
                name: 'deName',
                description: 'Data Extension name (resolved by Name, not external key)',
                type: 'string',
            },
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
        returnType: 'null',
        syntax: 'Platform.Function.UpdateDE(deName, whereFieldNames, whereFieldValues, fieldNames, fieldValues)',
        example:
            'var count = Platform.Function.UpdateDE("MyDE", ["Email"], ["jane@example.com"], ["Status"], ["inactive"]);',
    },
    {
        name: 'UpsertData',
        ampscriptEquivalent: 'UpsertData',
        minArgs: 5,
        maxArgs: 5,
        description:
            'Inserts a new row or updates an existing one in a Data Extension and returns the number of rows affected. ' +
            'Takes array arguments for the where and field pairs — a flat/variadic argument form is not supported and throws at runtime. ' +
            'Recommended for non-sending contexts (CloudPages, landing pages), but the *DE variants also run and commit there — see UpsertDE().',
        isConfirmed: true,
        params: [
            {
                name: 'deName',
                description: 'Data Extension name (resolved by Name, not external key)',
                type: 'string',
            },
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
        ampscriptEquivalent: 'UpsertDE',
        minArgs: 5,
        maxArgs: 5,
        description:
            'Inserts a new row or updates an existing one in a Data Extension. Returns null (no value). ' +
            'The official docs describe this as an email-context function, but it was proven to run and commit on a CloudPage as well. ' +
            'UpsertData() is still preferred outside email because it returns the affected-row count.',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs restrict UpsertDE to email contexts, but at runtime it executes and commits its upsert on a CloudPage too; it returns null rather than a row count.',
        params: [
            {
                name: 'deName',
                description: 'Data Extension name (resolved by Name, not external key)',
                type: 'string',
            },
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
        returnType: 'null',
        syntax: 'Platform.Function.UpsertDE(deName, whereFieldNames, whereFieldValues, fieldNames, fieldValues)',
        example:
            'Platform.Function.UpsertDE("CustomerData", ["ID"], ["12345"], ["Company", "Country"], ["exampleCompany", "USA"]);',
    },
    {
        name: 'DeleteData',
        ampscriptEquivalent: 'DeleteData',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Removes rows from a Data Extension matching filter criteria and returns the number of rows deleted. ' +
            'Recommended for non-sending contexts (CloudPages, landing pages, microsites, and SMS messages), but the *DE variants also run and commit there — see DeleteDE().',
        isConfirmed: true,
        params: [
            {
                name: 'deName',
                description: 'Data Extension name (resolved by Name, not external key)',
                type: 'string',
            },
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
        ampscriptEquivalent: 'DeleteDE',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Removes rows from a Data Extension matching filter criteria. Returns null (no value). ' +
            'The official docs describe this as an email-context function, but it was proven to run and commit on a CloudPage as well. ' +
            'DeleteData() is still preferred outside email because it returns the affected-row count.',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs restrict DeleteDE to email contexts, but at runtime it executes and commits its delete on a CloudPage too; it returns null rather than a row count.',
        params: [
            {
                name: 'deName',
                description: 'Data Extension name (resolved by Name, not external key)',
                type: 'string',
            },
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
        returnType: 'null',
        syntax: 'Platform.Function.DeleteDE(deName, whereFieldNames, whereFieldValues)',
        example: 'Platform.Function.DeleteDE("MyDE", ["Email"], ["jane@example.com"]);',
    },
    {
        name: 'ContentBlockByKey',
        ampscriptEquivalent: 'ContentBlockByKey',
        minArgs: 1,
        maxArgs: 4,
        description:
            'Renders a Content Builder asset referenced by customer key. ' +
            'Runtime note: when optional arguments are supplied, every argument must be a compile-time literal — passing a variable in a multi-argument call throws a resolved-value error.',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs do not mention that supplying the optional arguments requires every argument to be a compile-time literal; variables are rejected at runtime once more than the key is passed.',
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
        ampscriptEquivalent: 'ContentBlockByName',
        minArgs: 1,
        maxArgs: 5,
        description:
            'Renders a Content Builder asset referenced by folder path and name. ' +
            'If the same name is used across multiple folders, supply the full path. ' +
            'Runtime note: when optional arguments are supplied, every argument must be a compile-time literal.',
        isConfirmed: true,
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
        ampscriptEquivalent: 'ContentBlockByID',
        minArgs: 1,
        maxArgs: 4,
        description:
            'Renders a Content Builder asset by its numeric identifier. ' +
            'Runtime note: when optional arguments are supplied, every argument must be a compile-time literal.',
        isConfirmed: true,
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
        ampscriptEquivalent: 'ContentImageByKey',
        minArgs: 1,
        maxArgs: 2,
        description:
            'Returns an HTML img tag for a Content Builder image identified by its external key. An optional fallback image ID can be supplied if the primary image is not found.',
        isConfirmed: true,
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
        ampscriptEquivalent: 'ContentImageByID',
        minArgs: 1,
        maxArgs: 2,
        description:
            'Returns an HTML img tag for a Content Builder image identified by its numeric ID. An optional fallback ID can be supplied if the primary image is not found.',
        isConfirmed: true,
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
        ampscriptEquivalent: 'TreatAsContent',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Processes a string as AMPscript/HTML on the SFMC server and returns the rendered result directly as a string. Inline AMPscript (%%=..=%%) is returned in the result; a block-only %%[..]%% string renders to an empty string but its variable side effects persist and are readable by later calls. Does not require Platform.Load("core").',
        params: [
            {
                name: 'content',
                description:
                    'String containing AMPscript or HTML to evaluate (non-string values are coerced to string)',
                type: 'string',
            },
        ],
        returnType: 'string',
        requiresCoreLoad: false,
        syntax: 'Platform.Function.TreatAsContent(content)',
        example:
            'var result = Platform.Function.TreatAsContent("%%=Add(2,3)=%%");\nWrite(result); // "5"',
        isConfirmed: true,
    },
    {
        name: 'BeginImpressionRegion',
        ampscriptEquivalent: 'BeginImpressionRegion',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Marks the start of a named impression tracking region within content. ' +
            'Runtime note: the region name must be a compile-time literal — a variable is rejected with a resolved-value error.',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs do not mention that the region name must be a compile-time literal; a variable argument is rejected at runtime.',
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
        ampscriptEquivalent: 'EndImpressionRegion',
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
        returnType: 'null',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs type the return as void, but the runtime always returns a genuine null (typeof "object", === null) — including when called with no matching BeginImpressionRegion.',
        syntax: 'Platform.Function.EndImpressionRegion([closeAll])',
        example:
            'Platform.Function.BeginImpressionRegion("footer");\nWrite(footerContent);\nPlatform.Function.EndImpressionRegion();',
    },
    {
        name: 'Now',
        ampscriptEquivalent: 'Now',
        minArgs: 0,
        maxArgs: 1,
        description:
            'Returns the current server date/time as a Date object (in the account timezone, Central by default), or the timestamp of the triggering send when called with true. Concatenating it to a string yields an RFC 2822-style value such as "Tue, 14 Jul 2026 17:59:40 GMT-06:00".',
        params: [
            {
                name: 'useContextTime',
                description:
                    'When true, returns the time the triggering send or activity was initiated. When false or omitted, returns the current system clock time.',
                type: 'boolean',
                optional: true,
            },
        ],
        returnType: 'Date',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the official docs describe the return as an RFC 2822-compliant date-time string, but the runtime returns a genuine Date object — typeof "object", `Object.prototype.toString` reports "[object Date]", `.constructor === Date`, and `getFullYear()`/`getHours()`/`getTime()` all work (identical to `new Date()`). The only anomaly is that `instanceof Date` returns false, due to the engine-wide `instanceof`-on-builtins bug (also affects Array/RegExp/Function) — detect via `.constructor === Date`, not `instanceof`. It coerces to an RFC 2822-style string during output.',
        syntax: 'Platform.Function.Now([useContextTime])',
        example:
            'var current = Platform.Function.Now();\nWrite(current); // e.g. "Tue, 14 Jul 2026 17:59:40 GMT-06:00"\n\n// current is a Date object:\nWrite(current.getFullYear()); // 2026\n\n// Use context time during triggered sends:\nvar sendTime = Platform.Function.Now(true);',
    },
    {
        name: 'SystemDateToLocalDate',
        ampscriptEquivalent: 'SystemDateToLocalDate',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Converts a date-time value from Marketing Cloud system time (CST, without daylight saving) to the local time of the account or user. Returns a Date object (not a string).',
        params: [
            {
                name: 'dateString',
                description: 'Date-time string in system time (CST)',
                type: 'string',
            },
        ],
        returnType: 'Date',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the official docs type the return value as a string, but the runtime returns a genuine Date object — typeof "object", `Object.prototype.toString` reports "[object Date]", `.constructor === Date`, and `getFullYear()`/`getHours()`/`getTime()` all work (identical to `new Date()`). The only anomaly is that `instanceof Date` returns false, due to the engine-wide `instanceof`-on-builtins bug — detect via `.constructor === Date`, not `instanceof`. It coerces to an ISO-like string when written or stringified.',
        syntax: 'Platform.Function.SystemDateToLocalDate(dateString)',
        example:
            'var systemDate = Platform.Function.Now();\nvar localDate = Platform.Function.SystemDateToLocalDate(systemDate);\nWrite(localDate);',
    },
    {
        name: 'LocalDateToSystemDate',
        ampscriptEquivalent: 'LocalDateToSystemDate',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Converts a date-time value from the local time of the account or user to Marketing Cloud system time (CST, without daylight saving). Returns a Date object (not a string).',
        params: [
            {
                name: 'dateString',
                description: 'Date-time string in local account/user time',
                type: 'string',
            },
        ],
        returnType: 'Date',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the official docs type the return value as a string, but the runtime returns a genuine Date object — typeof "object", `Object.prototype.toString` reports "[object Date]", `.constructor === Date`, and `getFullYear()`/`getHours()`/`getTime()` all work (identical to `new Date()`). The only anomaly is that `instanceof Date` returns false, due to the engine-wide `instanceof`-on-builtins bug — detect via `.constructor === Date`, not `instanceof`. It coerces to an ISO-like string when written or stringified.',
        syntax: 'Platform.Function.LocalDateToSystemDate(dateString)',
        example:
            'var localDate = "8/5/2025 12:00:00 PM";\nvar systemDate = Platform.Function.LocalDateToSystemDate(localDate);\nWrite(systemDate);',
    },
    {
        name: 'RaiseError',
        ampscriptEquivalent: 'RaiseError',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs mark currentRecipientOnly, errorCode, and errorNumber as required, but the runtime accepts a single message argument; and the caught exception on a CloudPage exposes only message and description (an AMPScriptRaiseErrorException) — the errorCode and errorNumber values are not surfaced on the error object.',
        example:
            'var status = Platform.Function.Lookup("MyDE", "Status", "Email", emailAddress);\nif (!status) {\n    Platform.Function.RaiseError("Subscriber not found", true, "NOT_FOUND", 404);\n}',
    },
    {
        name: 'GUID',
        ampscriptEquivalent: 'GUID',
        minArgs: 0,
        maxArgs: 0,
        description:
            'Generates a new globally unique identifier as a lowercase canonical UUID v4 string (36 characters). Does not require Platform.Load("core"); passing any argument throws.',
        params: [],
        returnType: 'string',
        syntax: 'Platform.Function.GUID()',
        example:
            'var id = Platform.Function.GUID();\nWrite(id); // e.g. "550e8400-e29b-41d4-a716-446655440000"',
        isConfirmed: true,
    },
    {
        name: 'IsEmailAddress',
        ampscriptEquivalent: 'IsEmailAddress',
        minArgs: 1,
        maxArgs: 1,
        description: 'Checks whether a string is a valid email address format.',
        params: [{ name: 'value', description: 'String to validate', type: 'string' }],
        returnType: 'boolean',
        syntax: 'Platform.Function.IsEmailAddress(value)',
        example:
            'if (Platform.Function.IsEmailAddress(emailInput)) {\n    Write("Valid email");\n} else {\n    Write("Invalid email format");\n}',
        isConfirmed: true,
    },
    {
        name: 'IsPhoneNumber',
        ampscriptEquivalent: 'IsPhoneNumber',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Evaluates whether a string is a valid phone number and returns a boolean. Runtime-verified ' +
            '(CloudPage): the accepted format is digits 0-9 only, with no spaces and no leading 0. To present ' +
            "any country's country code (including the US) you omit the leading 00/+ and write the country code " +
            'as bare digits with no leading zero. Values containing spaces, a leading 0, or a +/00 international ' +
            'prefix return false, as do empty, letters, and mixed-text inputs. This is the same digits-only, ' +
            'no-leading-zero format that SFMC phone-number fields and the SMS (MobileConnect) service expect.',
        params: [{ name: 'value', description: 'String to evaluate', type: 'string' }],
        returnType: 'boolean',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs describe generic "valid phone number" validation, but the runtime enforces a ' +
            'stricter format: digits 0-9 only, no spaces, and no leading 0 — country codes must be written ' +
            'without the leading 00/+ (the same format SFMC phone fields and the SMS service expect).',
        syntax: 'Platform.Function.IsPhoneNumber(value)',
        example:
            'if (Platform.Function.IsPhoneNumber(phoneInput)) {\n    Write("Valid phone");\n} else {\n    Write("Invalid phone number");\n}',
    },
    {
        name: 'CreateObject',
        ampscriptEquivalent: 'CreateObject',
        minArgs: 1,
        maxArgs: 1,
        description: 'Instantiates a Marketing Cloud SOAP API object.',
        isConfirmed: true,
        params: [{ name: 'objectType', description: 'SOAP API object type name', type: 'string' }],
        returnType: 'object',
        syntax: 'Platform.Function.CreateObject(objectType)',
        example:
            'var sub = Platform.Function.CreateObject("Subscriber");\nPlatform.Function.SetObjectProperty(sub, "EmailAddress", "jane@example.com");\nPlatform.Function.SetObjectProperty(sub, "SubscriberKey", "sk-123");',
    },
    {
        name: 'SetObjectProperty',
        ampscriptEquivalent: 'SetObjectProperty',
        minArgs: 3,
        maxArgs: 3,
        description:
            "Assigns a property value on a SOAP API object created with CreateObject. The property name is validated against the object's real SOAP API schema at set-time: setting an unknown property (or a value the property rejects) throws. String and number values are accepted; the assigned property cannot be read back from SSJS because the underlying CLR object blocks introspection. Returns a genuine JavaScript null on success.",
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs type the return as void, but at runtime SetObjectProperty returns a genuine JavaScript null (=== null is true) on success. It also validates the property name against the object schema, throwing when the property is unknown or the value is invalid for it.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            { name: 'propertyName', description: 'Property name to set', type: 'string' },
            { name: 'value', description: 'Value to assign', type: 'any' },
        ],
        returnType: 'null',
        syntax: 'Platform.Function.SetObjectProperty(apiObject, propertyName, value)',
        example:
            'var sub = Platform.Function.CreateObject("Subscriber");\nPlatform.Function.SetObjectProperty(sub, "EmailAddress", "jane@example.com");',
    },
    {
        name: 'AddObjectArrayItem',
        ampscriptEquivalent: 'AddObjectArrayItem',
        minArgs: 3,
        maxArgs: 3,
        description: "Appends an item to a SOAP API object's array property.",
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs list a return value, but at runtime the call returns nothing (undefined); it mutates the passed object in place.',
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
        ampscriptEquivalent: 'InvokeCreate',
        minArgs: 3,
        maxArgs: 3,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs type the return value as an object, but at runtime the call returns the OverallStatus message as a string ("OK" / "Error: ..."); the request ID is written to status[1] and the error code (a number) is written into the status array.',
        description:
            'Executes a SOAP API Create call on an API object and returns the OverallStatus message as a string.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'status',
                description:
                    'Array that receives the status message and request ID of the API call (e.g. [0, 0]); status[0] is the message string, status[1] the request ID',
                type: 'array',
            },
            {
                name: 'options',
                description:
                    'API configure options to include in the call. Can contain a null value.',
                type: 'object',
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.InvokeCreate(apiObject, status, options)',
        example:
            'var StatusAndRequestID = [0, 0];\n' +
            'var result = Platform.Function.InvokeCreate(CreateRequest, StatusAndRequestID, null);\n' +
            'var status = StatusAndRequestID[0];\n' +
            'var requestID = StatusAndRequestID[1];',
    },
    {
        name: 'InvokeUpdate',
        ampscriptEquivalent: 'InvokeUpdate',
        minArgs: 3,
        maxArgs: 3,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs type the return value as an object, but at runtime the call returns the OverallStatus message as a string ("OK" / "Error: ..."); the request ID is written to status[1] and the error code (a number) is written into the status array.',
        description:
            'Executes a SOAP API Update call on an API object and returns the OverallStatus message as a string.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'status',
                description:
                    'Array that receives the status message and request ID of the API call (e.g. [0, 0]); status[0] is the message string, status[1] the request ID',
                type: 'array',
            },
            {
                name: 'options',
                description:
                    'API configure options to include in the call. Can contain a null value.',
                type: 'object',
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.InvokeUpdate(apiObject, status, options)',
        example:
            'var StatusAndRequestID = [0, 0];\n' +
            'var result = Platform.Function.InvokeUpdate(UpdateRequest, StatusAndRequestID, null);\n' +
            'var status = StatusAndRequestID[0];\n' +
            'var requestID = StatusAndRequestID[1];',
    },
    {
        name: 'InvokeDelete',
        ampscriptEquivalent: 'InvokeDelete',
        minArgs: 3,
        maxArgs: 3,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs type the return value as an object, but at runtime the call returns the OverallStatus message as a string ("OK" / "Error: ..."); the request ID is written to status[1] and the error code (a number) is written into the status array.',
        description:
            'Executes a SOAP API Delete call on an API object and returns the OverallStatus message as a string.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'status',
                description:
                    'Array that receives the status message and request ID of the API call (e.g. [0, 0]); status[0] is the message string, status[1] the request ID',
                type: 'array',
            },
            {
                name: 'options',
                description:
                    'API configure options to include in the call. Can contain a null value.',
                type: 'object',
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.InvokeDelete(apiObject, status, options)',
        example:
            'var StatusAndRequestID = [0, 0];\n' +
            'var result = Platform.Function.InvokeDelete(DeleteRequest, StatusAndRequestID, null);\n' +
            'var status = StatusAndRequestID[0];\n' +
            'var requestID = StatusAndRequestID[1];',
    },
    {
        name: 'InvokeRetrieve',
        ampscriptEquivalent: 'InvokeRetrieve',
        minArgs: 2,
        maxArgs: 2,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs do not mention the null return: at runtime the call returns an array of result objects when records match, but returns null on error or when no records match.',
        description:
            'Executes a SOAP API Retrieve call, returning an array of result objects when records match or null on error / no match.',
        params: [
            {
                name: 'apiObject',
                description: 'SOAP API RetrieveRequest object instance',
                type: 'object',
            },
            {
                name: 'status',
                description:
                    'Status out-parameter required by the signature, but inert at runtime — it is never populated (stays empty even on success, so status[0] and status[1] are undefined). Pass an array (e.g. [0, 0]); read the returned array for results.',
                type: 'array',
            },
        ],
        returnType: 'object[]|null',
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
        ampscriptEquivalent: 'InvokePerform',
        minArgs: 3,
        maxArgs: 4,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs type the return value as an object, but the SOAP Perform contract returns the OverallStatus message as a string; the error code and perform response are written into the status array.',
        description:
            'Executes a SOAP API Perform action on an API object and returns the OverallStatus message as a string.',
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
                    'API configure options to include in the call. Can be omitted or null.',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.InvokePerform(apiObject, method, status[, options])',
        example:
            'var StatusAndRequestID = [0, 0, 0];\n' +
            'var result = Platform.Function.InvokePerform(APIObject, "Validate", StatusAndRequestID, null);\n' +
            'var statusMessage = StatusAndRequestID[0];\n' +
            'var errorCode = StatusAndRequestID[1];\n' +
            'var performResponse = StatusAndRequestID[2];',
    },
    {
        name: 'InvokeConfigure',
        ampscriptEquivalent: null,
        minArgs: 4,
        maxArgs: 4,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs type the return value as an object, but the SOAP Configure contract returns the OverallStatus message as a string; the request ID is written into the status array.',
        description:
            'Executes a SOAP API Configure call on an API object and returns the OverallStatus message as a string.',
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
        returnType: 'string',
        syntax: 'Platform.Function.InvokeConfigure(apiObject, method, status, options)',
        example:
            'var StatusAndRequestID = [0, 0];\n' +
            'var result = Platform.Function.InvokeConfigure(ConfigureObject, "create", StatusAndRequestID, null);',
    },
    {
        name: 'InvokeExecute',
        ampscriptEquivalent: 'InvokeExecute',
        minArgs: 2,
        maxArgs: 2,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs list three arguments (including an options object) and type the return value as an object, but at runtime the call takes exactly two arguments (apiObject, status) — passing the documented third argument throws "Unable to retrieve security descriptor for this frame." — and returns an array of result objects.',
        description:
            'Executes a SOAP API Execute call on an API object and returns an array of result objects. Takes exactly two arguments.',
        params: [
            { name: 'apiObject', description: 'SOAP API object instance', type: 'object' },
            {
                name: 'status',
                description:
                    'Status out-parameter required by the signature, but inert at runtime — it is never populated (stays empty even on success). Pass an array (e.g. [0, 0]); read the returned array for results, where each element may carry its own StatusCode/StatusMessage/ErrorCode as data.',
                type: 'array',
            },
        ],
        returnType: 'object[]',
        syntax: 'Platform.Function.InvokeExecute(apiObject, status)',
        example:
            'var StatusAndRequestID = [0, 0];\n' +
            'var result = Platform.Function.InvokeExecute(ExecuteRequest, StatusAndRequestID);\n' +
            'var firstResult = result[0];',
    },
    {
        name: 'InvokeExtract',
        ampscriptEquivalent: null,
        minArgs: 2,
        maxArgs: 2,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs list a third options argument and type the return value as an object; at runtime the call takes exactly two arguments (a third throws) and the statusArray is inert (never populated). The documented OverallStatus string return could not be reproduced from a CloudPage even against real saved Data Extract definitions (the invoke throws a catchable NullReferenceException), so the string return type is per-docs and unproven at runtime.',
        description:
            'Invokes the Extract SOAP API method on the specified object. The docs describe the return as the OverallStatus message string; that string was not reproducible from a CloudPage invoke.',
        params: [
            {
                name: 'apiObject',
                description: 'SOAP API object on which to invoke Extract',
                type: 'object',
            },
            {
                name: 'statusArray',
                description:
                    'Status out-parameter required by the signature, but inert at runtime — it is never populated. Pass an array (e.g. [0, 0]).',
                type: 'array',
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.InvokeExtract(apiObject, statusArray)',
        example:
            'var statusArr = [0, 0];\nvar result = Platform.Function.InvokeExtract(extractObj, statusArr);\nWrite(result);',
    },
    {
        name: 'InvokeSchedule',
        ampscriptEquivalent: null,
        minArgs: 4,
        maxArgs: 5,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs type the return value as an object, but at runtime the call returns the OverallStatus message as a string; the statusArray argument is required (minimum four arguments), with the trailing options argument optional.',
        description:
            'Invokes the Schedule SOAP API method on the specified object and returns the OverallStatus message as a string.',
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
            },
            {
                name: 'options',
                description: 'Additional API options; may be null',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.InvokeSchedule(apiObject, action, schedule, statusArray[, options])',
        example:
            'var statusArr = [];\nvar result = Platform.Function.InvokeSchedule(sendDef, "start", scheduleDef, statusArr);\nWrite(result);',
    },
    {
        name: 'HTTPGet',
        ampscriptEquivalent: 'HTTPGet',
        minArgs: 1,
        maxArgs: 6,
        // Discontinuous overload: only a 1-argument call (url only) or the full
        // 6-argument call are valid at runtime. Calling with 2-5 arguments is
        // an argument count the engine does not accept, so it throws the generic
        // "Unable to retrieve security descriptor for this frame." error. A plain
        // minArgs..maxArgs range cannot express "valid arities = {1, 6}", so this
        // field lists the exact permitted counts. Consumers that support it emit a
        // distinct diagnostic when the count is inside the range but not a member.
        validArities: [1, 6],
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified on a CloudPage. Three corrections to the official docs. ' +
            '(1) The docs state this returns a numeric status, but it actually returns the response body as a string. ' +
            '(2) The argument count is a discontinuous overload, not a simple range: only a 1-argument call (url only) or the full 6-argument call are valid. ' +
            'Calling with 2, 3, 4, or 5 arguments throws "Unable to retrieve security descriptor for this frame." ' +
            'The trailing five arguments (continueOnError, emptyContentHandling, headerNames, headerValues, statusVariable) form an all-or-nothing group — you must supply all five together or none. ' +
            'This contradicts the older claim that "all six arguments are required" (the 1-argument form works) as well as the docs listing arguments 3-6 as independently optional. ' +
            '(3) Even on a successful 6-argument call the statusVariable out-parameter was observed empty (statusVariable.length === 0, statusVariable[0] === undefined), so the numeric status is not reliably delivered in a CloudPage context — read the returned body string and do not depend on statusVariable[0].',
        description:
            'Performs an HTTP GET request and returns the response body as a string. ' +
            'Only works with HTTP on port 80 and HTTPS on port 443. Times out after 30 seconds. ' +
            'Valid call forms are exactly two: HTTPGet(url) with a single argument, or the full 6-argument form; ' +
            'passing 2-5 arguments is an argument count it does not accept and throws the generic "Unable to retrieve security descriptor for this frame." error. ' +
            'The statusVariable out-parameter is unreliable (observed empty even on success), so read the body from the return value.',
        params: [
            { name: 'url', description: 'URL to request', type: 'string' },
            {
                name: 'continueOnError',
                description:
                    'When true, the request terminates if an error occurs. When false, the request continues on error. Only valid in the 6-argument form; the trailing five arguments are all-or-nothing.',
                type: 'boolean',
                optional: true,
            },
            {
                name: 'emptyContentHandling',
                description:
                    'How to handle a URL that returns empty content: 0 = allow empty, 1 = return error, 2 = skip subscriber. Only valid in the 6-argument form (co-required with the other trailing arguments).',
                type: 'number',
                optional: true,
            },
            {
                name: 'headerNames',
                description:
                    'Array of header names to include in the GET request (pass null when none). Only valid in the 6-argument form (co-required with the other trailing arguments).',
                type: 'string[]',
                optional: true,
            },
            {
                name: 'headerValues',
                description:
                    'Array of header values corresponding to headerNames (pass null when none). Only valid in the 6-argument form (co-required with the other trailing arguments).',
                type: 'string[]',
                optional: true,
            },
            {
                name: 'statusVariable',
                description:
                    'Array intended to receive the status code, but observed empty at runtime even on success — do not rely on it. Only valid in the 6-argument form (co-required with the other trailing arguments).',
                type: 'number[]',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.HTTPGet(url) | Platform.Function.HTTPGet(url, continueOnError, emptyContentHandling, headerNames, headerValues, statusVariable)',
        example:
            '// Valid form 1 - single argument, returns the response body as a string\n' +
            'var body = Platform.Function.HTTPGet("https://api.example.com/data");\n' +
            'var obj = Platform.Function.ParseJSON(body);\n\n' +
            '// Valid form 2 - full 6-argument form (the trailing five are all-or-nothing)\n' +
            'var status = [];\n' +
            'var content = Platform.Function.HTTPGet(\n' +
            '    "https://api.example.com/data",\n' +
            '    false,\n' +
            '    0,\n' +
            '    ["x-request-id"],\n' +
            '    ["sampleValue"],\n' +
            '    status\n' +
            ');\n' +
            '// Note: status[0] is unreliable (observed empty); read the body from `content`.\n' +
            'var parsed = Platform.Function.ParseJSON(content);',
    },
    {
        name: 'HTTPPost',
        ampscriptEquivalent: 'HTTPPost',
        minArgs: 3,
        maxArgs: 6,
        isConfirmed: true,
        description:
            'Performs an HTTP POST request with a content type and payload. ' +
            'Only works with HTTP on port 80 and HTTPS on port 443. Times out after 30 seconds. ' +
            'Returns the HTTP status code as a number (e.g. 200 for success). ' +
            'The optional response out-parameter is unreliable — in runtime tests it stayed empty even for successful requests, so read the status code from the return value and use HTTP.Post / a WSProxy call when you need the response body.',
        params: [
            { name: 'url', description: 'URL to post to', type: 'string' },
            { name: 'contentType', description: 'MIME type of the request body', type: 'string' },
            { name: 'payload', description: 'Request body content', type: 'string' },
            {
                name: 'headerNames',
                description: 'Array of header names (co-required with headerValues)',
                type: 'string[]',
                optional: true,
            },
            {
                name: 'headerValues',
                description: 'Array of header values corresponding to headerNames (co-required)',
                type: 'string[]',
                optional: true,
            },
            {
                name: 'response',
                description:
                    'Array intended to receive the response body. Unreliable — observed empty even on successful (200) responses; do not depend on it.',
                type: 'array',
                optional: true,
            },
        ],
        returnType: 'number',
        syntax: 'Platform.Function.HTTPPost(url, contentType, payload[, headerNames, headerValues, response])',
        example:
            'var statusCode = Platform.Function.HTTPPost(\n' +
            '    "https://api.example.com/items",\n' +
            '    "application/json",\n' +
            '    Stringify({ name: "Jane", status: "active" })\n' +
            ');\n' +
            'if (statusCode == 200) { Write("posted"); }',
    },
    {
        name: 'ParseJSON',
        ampscriptEquivalent: null,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified on a CloudPage. Two corrections to the official docs: ' +
            '(1) The docs type the argument as `string or string[]` and describe passing an "array of strings"; ' +
            'at runtime passing an array (or any non-string object) throws `System.InvalidOperationException: ' +
            'Unable to retrieve security descriptor for this frame`. Only a single string argument is accepted. ' +
            '(2) The docs return type `object|object[]` is incomplete: only JSON objects/arrays are deserialised; ' +
            String.raw`a scalar JSON string ("42", "\"hello\"", "true", "null") is returned unchanged as a string, and ` +
            'invalid/empty/null/undefined input returns null (it does NOT throw).',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Parses a JSON-formatted string and returns the resulting JavaScript object or array. ' +
            'SFMC-native equivalent of JSON.parse(), which is not available in the legacy SSJS engine. ' +
            'Only single JSON object/array strings are deserialised; scalar JSON values are returned as strings ' +
            'and invalid, empty, null, or undefined input returns null (no error is thrown). ' +
            'Passing an array or a non-string object throws a runtime error, so pass exactly one string argument.',
        params: [
            {
                name: 'jsonString',
                description:
                    'A single valid JSON-formatted string to parse. Must be a string — passing an array or ' +
                    'other object throws a runtime error (contrary to the official docs).',
                type: 'string',
            },
        ],
        // `any` (not `object`) so callers can access dynamic properties on the parsed
        // result, e.g. `var o = Platform.Function.ParseJSON(s); Write(o.name);`.
        // Runtime returns object|array for JSON objects/arrays, string for scalar JSON, null for invalid input.
        returnType: 'any',
        syntax: 'Platform.Function.ParseJSON(jsonString)',
        example:
            'var jsonString = \'{"name":"Jane","age":30}\';\n' +
            'var obj = Platform.Function.ParseJSON(jsonString);\n' +
            'Write(obj.name); // outputs: Jane\n\n' +
            '// Invalid or empty input returns null (it does NOT throw):\n' +
            'var bad = Platform.Function.ParseJSON("{not json");\n' +
            'if (bad === null) { Write("could not parse"); }\n\n' +
            '// Use String() to convert CLR response content before parsing:\n' +
            'var req = new Script.Util.HttpRequest("https://api.example.com/data");\n' +
            'req.method = "GET";\n' +
            'var resp = req.send();\n' +
            'var result = Platform.Function.ParseJSON(String(resp.content));',
    },
    {
        name: 'RedirectTo',
        ampscriptEquivalent: 'RedirectTo',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Specifies the target of an email link as a complete URL stored in an attribute, ' +
            'data extension field, or variable. ' +
            'Use only within the href attribute of an anchor tag in HTML emails. ' +
            'In text emails, add the http:// prefix without spaces inside the parentheses. ' +
            'Include anchor tags in the email body (not in retrieved link content) to retain click-tracking.',
        params: [{ name: 'url', description: 'The URL to redirect to', type: 'string' }],
        returnType: 'string',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs imply no return value, but at runtime RedirectTo returns the passed-in URL string (typeof "string") and does not issue an HTTP redirect nor halt execution when called from SSJS; it requires exactly one argument (zero or two arguments throw a TypeError).',
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
        ampscriptEquivalent: 'URLEncode',
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
        isConfirmed: true,
        syntax: 'Platform.Function.UrlEncode(url[, encodeReservedKeywords])',
        example:
            'var baseURL = "https://www.example.com?value=12+3 12;3";\n' +
            'var encoded = Platform.Function.UrlEncode(baseURL);\n' +
            'Write(encoded); // "https://www.example.com?value=12+3%2012;3"\n' +
            'var encodedFull = Platform.Function.UrlEncode(baseURL, true);\n' +
            'Write(encodedFull); // "https://www.example.com?value%3d12%2b3+12%3b3"',
    },
    {
        name: 'Base64Encode',
        ampscriptEquivalent: 'Base64Encode',
        minArgs: 1,
        maxArgs: 2,
        description:
            'Encodes any string value to standard Base64. The optional charset controls the byte encoding. ' +
            'The result is interoperable standard Base64 and can be decoded by any Base64 decoder. ' +
            'For a simpler single-parameter form without charset control, see `Base64Encode()`.',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs claim output can only be decoded by the matching Base64Decode() function, but the runtime produces standard interoperable Base64 that any decoder accepts.',
        params: [
            { name: 'string', description: 'String to encode', type: 'string' },
            {
                name: 'charset',
                description: 'Character set to use when encoding, such as ASCII or UTF-8',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.Base64Encode(string[, charset])',
        example:
            'var normalStr = Platform.Function.Lookup("ForBase64Info","ReceiptData","ReceiptKey","stringValue");\n' +
            'var encodedStr = Platform.Function.Base64Encode(normalStr);',
    },
    {
        name: 'Base64Decode',
        ampscriptEquivalent: 'Base64Decode',
        minArgs: 1,
        maxArgs: 2,
        description:
            'Decodes a standard Base64-encoded string. The optional charset controls how the decoded bytes are interpreted. ' +
            'It decodes any valid standard Base64 string, not only values produced by `Base64Encode()`.',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs imply it only decodes values created by the matching Base64Encode() function, but the runtime decodes any valid standard Base64 string.',
        params: [
            {
                name: 'encodedString',
                description: 'Base64 encoded string to decode',
                type: 'string',
            },
            {
                name: 'charset',
                description: 'Character set to use when decoding, such as ASCII or UTF-8',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.Base64Decode(encodedString[, charset])',
        example:
            'var encodedStr = Platform.Function.Lookup("forBase64Info","ReceiptData","ReceiptKey","stringValue");\n' +
            'var decodedStr = Platform.Function.Base64Decode(encodedStr);',
    },
    {
        name: 'MD5',
        ampscriptEquivalent: 'MD5',
        minArgs: 1,
        maxArgs: 2,
        description:
            'Returns a lowercase 32-character hexadecimal MD5 hash for a given string value. The optional charset only affects non-ASCII input and defaults to UTF-8.',
        params: [
            { name: 'string', description: 'String to evaluate', type: 'string' },
            {
                name: 'charset',
                description: 'Character set to use when evaluating, such as ASCII or UTF-8',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Platform.Function.MD5(string[, charset])',
        example:
            'var normalStr = Platform.Function.Lookup("ForMD5Info","HashData","HashKey","stringValue");\n' +
            'var hashedStr = Platform.Function.MD5(normalStr);',
        isConfirmed: true,
    },
    {
        name: 'Stringify',
        ampscriptEquivalent: null,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Converts a JavaScript object into its JSON string representation. ' +
            'Works only with known JSON-serializable types. ' +
            'Not to be confused with `String()`, which converts CLR response objects to plain strings. ' +
            'The bare-name Stringify() global is equivalent but requires Platform.Load("core","1.1.5"); ' +
            'this Platform.Function form works without it.',
        params: [
            {
                name: 'value',
                description:
                    'Value to serialize to JSON. Accepts objects, arrays, strings, numbers, and booleans.',
                type: 'any',
            },
        ],
        returnType: 'string',
        returnDescription:
            'JSON string representation of the value. Serializes objects, arrays, nested structures, and scalars; null and undefined both serialize to the literal string "null".',
        syntax: 'Platform.Function.Stringify(value)',
        example:
            'var json = Platform.Function.Stringify({ name: "Jane", age: 30 });\nPlatform.Function.Write(json);',
        isConfirmed: true,
    },
    {
        name: 'ContentArea',
        ampscriptEquivalent: 'ContentArea',
        minArgs: 1,
        maxArgs: 4,
        deprecated: true,
        description:
            'Retrieves content from a specified classic Content Area by numeric ID. ' +
            'Deprecated — Content Areas are no longer supported on current SFMC infrastructure. ' +
            'Note: the bare-name ContentArea() global uses a string errorMsg as the 3rd parameter ' +
            'and requires Platform.Load("core","1.1.5"); this Platform.Function form does not.',
        isConfirmed: true,
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
        ampscriptEquivalent: 'ContentAreaByName',
        minArgs: 1,
        maxArgs: 4,
        deprecated: true,
        description:
            'Retrieves content from a specified classic Content Area by name. ' +
            'Deprecated — Content Areas are no longer supported on current SFMC infrastructure. ' +
            'Note: the bare-name ContentAreaByName() global uses a string errorMsg as the 3rd parameter ' +
            'and requires Platform.Load("core","1.1.5"); this Platform.Function form does not.',
        isConfirmed: true,
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
        ampscriptEquivalent: 'IsCHTMLBrowser',
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
        isConfirmed: true,
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
        deprecated: true,
        description:
            'Manages classic Email Studio email message definitions. ' +
            'Deprecated — operates on the legacy (classic) email type, not Content Builder `htmlemail` assets. ' +
            'Still works at runtime; prefer Content Builder emails and the modern send methods for new development.',
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
        requiresCoreLoad: true,
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
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves tracking data for a specific send.',
    },
    {
        name: 'Send.Tracking.Clicks',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves click tracking data for the initialized send.',
    },
    {
        name: 'Send.Tracking.TotalByInterval',
        methods: ['Retrieve'],
        requiresCoreLoad: true,
        description: 'Retrieves aggregated tracking data by interval for the initialized send.',
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
        requiresCoreLoad: true,
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
        example: 'Platform.Load("core", "1.1.5");\nvar myAccount = Account.Init("MyCustomerKey");',
        isConfirmed: true,
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
        returnDescription:
            'Array of account rows matching the filter; an empty array (which is falsy in this engine) when nothing matches.',
        syntax: 'Account.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var getAcct = Account.Retrieve({Property:"CustomerKey",SimpleOperator:"equals",Value:"MyAccount"});',
        isConfirmed: true,
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
        returnEnum: ['OK', 'Error'],
        returnDescription:
            'Returns the string "OK" on success. On failure it returns the string "Error" (proven at runtime) rather than throwing.',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs state the call throws on failure, but at runtime it returns the plain string "Error" instead of throwing.',
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
        returnDescription:
            'Array of tracking rows; each row exposes Sends, Bounces, Clicks, Opens and Unsubscribes counters (each an object such as {"Total":N}).',
        syntax: 'Account.Tracking.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var acctTracking = Account.Tracking.Retrieve({Property:"CustomerKey",SimpleOperator:"equals",Value:"MyAccount"});',
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        deprecated: true,
        requiresCoreLoad: true,
        isConfirmed: true,
        officialDocsNote:
            'DEPRECATED — the Portfolio is a legacy Classic Content / Classic Email Studio feature. ' +
            'Salesforce retired classic content creation and editing (the January 2021 release removed the ability to ' +
            'edit/copy/move classic emails and templates, with Classic Content reaching end of life on 24 Apr 2023); ' +
            'Content Builder is now the single cross-channel content repository and SOAP-era Portfolio integrations only ' +
            'operate on the old Classic tools. Prefer Content Builder assets (Asset REST endpoints) for new work.',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a Portfolio instance bound to the specified external key. ' +
            'Required before invoking any other Portfolio method on the returned instance. ' +
            'DEPRECATED — Portfolio is a legacy Classic Content / Classic Email Studio feature superseded by Content Builder.',
        params: [{ name: 'key', description: 'External key of the portfolio.', type: 'string' }],
        returnType: 'PortfolioInstance',
        returnDescription: 'An initialized Portfolio bound to the specified external key.',
        syntax: 'Portfolio.Init(key)',
        example: 'Platform.Load("core", "1.1.5");\nvar portObj = Portfolio.Init("myPortfolioCK");',
    },
    {
        name: 'Add',
        isStatic: true,
        deprecated: true,
        requiresCoreLoad: true,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'no-test-data',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'DEPRECATED — the Portfolio is a legacy Classic Content / Classic Email Studio feature superseded by ' +
            'Content Builder (Classic Content reached end of life on 24 Apr 2023); prefer Content Builder Asset REST ' +
            'endpoints for new work. ' +
            'The official docs state Add returns "OK" on success or throws on failure. Runtime-verification of the ' +
            'success path was BLOCKED: no portfolio item could be created on the test BU (no valid category/file to ' +
            'reference) — every Add attempt (including a full DisplayName/CustomerKey/FileName/FileLocation payload) ' +
            'returned the plain string "Error" and did NOT throw. Treat any non-"OK" return as failure.',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new portfolio (file) object from the supplied properties. ' +
            'DEPRECATED — Portfolio is a legacy Classic Content / Classic Email Studio feature superseded by Content Builder.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new portfolio item (DisplayName, CustomerKey, CategoryID, FileName, FileLocation).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK', 'Error'],
        returnDescription:
            'Returns "OK" on success; returns the string "Error" (not a throw) on failure.',
        syntax: 'Portfolio.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var newPortfolio = {\n' +
            '    DisplayName: "SSJS Portfolio Object",\n' +
            '    CustomerKey: "myPortfolioCK",\n' +
            '    CategoryID: 12345,\n' +
            '    FileName: "logo.png",\n' +
            '    FileLocation: "https://www.example.com/Portals/0/images/global/logo_main.png"\n' +
            '};\n' +
            'var status = Portfolio.Add(newPortfolio);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        deprecated: true,
        requiresCoreLoad: true,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'no-test-data',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'DEPRECATED — the Portfolio is a legacy Classic Content / Classic Email Studio feature superseded by ' +
            'Content Builder (Classic Content reached end of life on 24 Apr 2023); prefer Content Builder Asset REST ' +
            'endpoints for new work. ' +
            'The official docs type the return as an array of portfolio objects. Runtime-verification was BLOCKED: no ' +
            'portfolio item could be created on the test BU (no valid category/file to reference; see Add), so a ' +
            'populated array could not be produced. Against an empty account the call returned an `object` with no ' +
            '`.length` property (not a JS array), so the documented `object[]` shape could not be confirmed.',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns an array of portfolio objects matching the specified filter. ' +
            'DEPRECATED — Portfolio is a legacy Classic Content / Classic Email Studio feature superseded by Content Builder.',
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
        deprecated: true,
        requiresCoreLoad: true,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'no-test-data',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'DEPRECATED — the Portfolio is a legacy Classic Content / Classic Email Studio feature superseded by ' +
            'Content Builder (Classic Content reached end of life on 24 Apr 2023); prefer Content Builder Asset REST ' +
            'endpoints for new work. ' +
            'The official docs state Update returns "OK" on success or throws on failure. Runtime-verification was ' +
            'BLOCKED: no portfolio item could be created on the test BU (no valid category/file to reference; see Add), ' +
            'so Update could not be exercised against a real item. Against a non-existent key it returned the string ' +
            '"Error" (not "OK") and did not throw.',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Updates the portfolio object with the supplied attributes. ' +
            'DEPRECATED — Portfolio is a legacy Classic Content / Classic Email Studio feature superseded by Content Builder.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the portfolio object.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK', 'Error'],
        returnDescription:
            'Returns "OK" on success; returns the string "Error" (not a throw) on failure.',
        syntax: '<PortfolioInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var portObj = Portfolio.Init("myPortfolioCK");\n' +
            'var status = portObj.Update({ DisplayName: "Updated SSJS Image" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        deprecated: true,
        requiresCoreLoad: true,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'no-test-data',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'DEPRECATED — the Portfolio is a legacy Classic Content / Classic Email Studio feature superseded by ' +
            'Content Builder (Classic Content reached end of life on 24 Apr 2023); prefer Content Builder Asset REST ' +
            'endpoints for new work. ' +
            'The official docs state Remove returns "OK" on success or throws on failure. Runtime-verification was ' +
            'BLOCKED: no portfolio item could be created on the test BU (no valid category/file to reference; see Add), ' +
            'so Remove could not be exercised against a real item. Against a non-existent key it returned the string ' +
            '"Error" (not "OK") and did not throw.',
        minArgs: 0,
        maxArgs: 0,
        description:
            'Removes the previously initialized portfolio object. ' +
            'DEPRECATED — Portfolio is a legacy Classic Content / Classic Email Studio feature superseded by Content Builder.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK', 'Error'],
        returnDescription:
            'Returns "OK" on success; returns the string "Error" (not a throw) on failure.',
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
        isConfirmed: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a ContentAreaObj instance bound to the specified external key. ' +
            'DEPRECATED — Content Areas are a legacy Classic Content feature; prefer Content Builder assets for new work.',
        params: [{ name: 'key', description: 'External key of the content area.', type: 'string' }],
        returnType: 'ContentAreaObjInstance',
        returnDescription: 'An initialized ContentAreaObj bound to the specified external key.',
        syntax: 'ContentAreaObj.Init(key)',
        example: 'Platform.Load("core", "1.1.1");\nvar area = ContentAreaObj.Init("myCA");',
    },
    {
        name: 'Add',
        isStatic: true,
        deprecated: true,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official `Add` reference lists `@returns {Enum("OK")}`, but runtime returns an initialized ' +
            'ContentAreaObj instance (an object exposing `Update`/`Remove`, identical in shape to `Init`) — ' +
            'matching the doc\'s own H1 summary ("returns an initialized object") rather than the `@returns` annotation.',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new content area from the supplied properties and returns an initialized ContentAreaObj instance bound to it. ' +
            'DEPRECATED — Content Areas are a legacy Classic Content feature.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new content area (CustomerKey, Name, CategoryID, Layout, LayoutSpecified, Content).',
                type: 'object',
            },
        ],
        returnType: 'ContentAreaObjInstance',
        returnDescription:
            'An initialized ContentAreaObj instance bound to the newly created content area (exposes Update/Remove). ' +
            'Note: contrary to the `@returns {Enum("OK")}` annotation in the official docs, runtime returns an instance object, not the string "OK".',
        syntax: 'ContentAreaObj.Add(properties)',
        example:
            'Platform.Load("core", "1.1.1");\n' +
            'var exampleArea = {\n' +
            '    CustomerKey: "exampleArea",\n' +
            '    Name: "SSJS Content Area Example",\n' +
            '    CategoryID: 123456,\n' +
            '    Layout: "RawText",\n' +
            '    LayoutSpecified: true,\n' +
            '    Content: "<b>This is example content</b>"\n' +
            '};\n' +
            'var area = ContentAreaObj.Add(exampleArea);',
    },
    {
        name: 'Retrieve',
        isStatic: true,
        deprecated: true,
        requiresCoreLoad: true,
        isConfirmed: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns an array of content areas matching the specified filter. ' +
            'DEPRECATED — Content Areas are a legacy Classic Content feature.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object: `{Property, SimpleOperator, Value}`.',
                type: 'object',
            },
        ],
        returnType: 'object[]',
        returnDescription:
            'A host array of content areas matching the filter (empty array when none match). ' +
            'Reports as `[object Array]` and exposes `.length`, but `instanceof Array` is false (host-backed collection).',
        syntax: 'ContentAreaObj.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.1");\n' +
            'var results = ContentAreaObj.Retrieve({ Property: "CustomerKey", SimpleOperator: "equals", Value: "myCA" });',
    },
    {
        name: 'Update',
        isStatic: false,
        deprecated: true,
        requiresCoreLoad: true,
        isConfirmed: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Updates the content area with the supplied attributes. ' +
            'DEPRECATED — Content Areas are a legacy Classic Content feature.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the content area.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success.',
        syntax: '<ContentAreaObjInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.1");\n' +
            'var obj = ContentAreaObj.Init("myCA");\n' +
            'var status = obj.Update({ Name: "Name Updated By SSJS" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        deprecated: true,
        requiresCoreLoad: true,
        isConfirmed: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Removes the previously initialized content area. ' +
            'DEPRECATED — Content Areas are a legacy Classic Content feature.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success.',
        syntax: '<ContentAreaObjInstance>.Remove()',
        example:
            'Platform.Load("core", "1.1.1");\n' +
            'var obj = ContentAreaObj.Init("myCA");\n' +
            'var status = obj.Remove();',
    },
];

/** @type {import('./declarations.js').SsjsDataMethod[]} */
export const FOLDER_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a Template instance bound to the specified external key. ' +
            'Required before invoking any other Template method on the returned instance.',
        params: [{ name: 'key', description: 'External key of the template.', type: 'string' }],
        returnType: 'TemplateInstance',
        returnDescription: 'An initialized Template bound to the specified external key.',
        syntax: 'Template.Init(key)',
        example: 'Platform.Load("core", "1");\nvar t = Template.Init("myTemplate");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified on a CloudPage: returns a CLR object (`ExactTarget.Integration.WSDL.DeliveryProfile`), not the string "OK". ' +
            'The returned object stringifies to its .NET type name and its properties are NOT readable from SSJS ("Use of Common Language Runtime (CLR) is not allowed"). Treat a non-throwing return as success.',
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
        returnType: 'object',
        returnDescription:
            'A CLR DeliveryProfile object on success (its properties are not readable from SSJS). Treat a non-throwing return as success.',
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs annotate Add as returning the string "OK". Runtime-verified on a live CloudPage: it returns ' +
            'a CLR object (`typeof` is `clr`; it stringifies to `ExactTarget.Integration.WSDL.SenderProfile`), not "OK". ' +
            'Reading any property off it throws "Use of Common Language Runtime (CLR) is not allowed", so the object is ' +
            'opaque from SSJS — treat any non-throwing return as success. This mirrors DeliveryProfile.Add.',
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
        returnType: 'object',
        returnDescription:
            'Returns a CLR SenderProfile object (opaque from SSJS) on success; throws on failure. Not the "OK" string the docs imply.',
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'no-test-data',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verification of the success path was BLOCKED on the test BU. The official docs state Add returns "OK" ' +
            'or throws. Confirmed discrepancy: on failure the Core-library method throws an engine error whose `.message` is ' +
            '`undefined` and whose `String()` is "Error adding SendClassification." (no useful `.message`). Even with the ' +
            "account's own proven-valid `Default` SenderProfile + `Default` DeliveryProfile, `SendClassification.Add` threw " +
            '"Error adding SendClassification." A direct WSProxy `createItem("SendClassification")` with ' +
            '`SenderProfile.CustomerKey = "Default"` returned Status=Error, StatusMessage="SenderProfile given an invalid ' +
            'identifier.", ErrorCode=24101 — the SOAP path needs the SenderProfile ObjectID, not its CustomerKey, so a new ' +
            'SendClassification could not be created from SSJS to confirm the "OK" success return.',
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
        isConfirmed: true,
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'no-test-data',
        officialDocsNote:
            'Runtime-verification of the success path was BLOCKED: no SendClassification could be created on the test BU ' +
            '(see Add), so Update could not be exercised against a real item. Against a non-existent key it returned the ' +
            'string "Error" (not "OK") and did not throw.',
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
        returnEnum: ['OK', 'Error'],
        returnDescription:
            'Returns "OK" on success; returns the string "Error" (not a throw) on failure.',
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'no-test-data',
        officialDocsNote:
            'Runtime-verification of the success path was BLOCKED: no SendClassification could be created on the test BU ' +
            '(see Add), so Remove could not be exercised against a real item. Against a non-existent key it returned the ' +
            'string "Error" (not "OK") and did not throw.',
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes the previously initialized send classification.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK', 'Error'],
        returnDescription:
            'Returns "OK" on success; returns the string "Error" (not a throw) on failure.',
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
        isConfirmed: true,
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
        example: 'Platform.Load("core", "1");\nvar fd = FilterDefinition.Init("myFilterDef");',
    },
    {
        name: 'Add',
        isStatic: true,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'no-test-data',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verification of the success path was BLOCKED: a valid FilterDefinition could not be created on the test BU (creating one requires an audience/DataSource configuration the test account could not satisfy). ' +
            'Confirmed discrepancy: on failure the Core-library method returns the string "Error" (not "OK"), and it does NOT throw — the official docs state it returns "OK" or throws. Attempted with SubscriberList (by Type, and by real "All Subscribers" list ID) and DataExtension (by CustomerKey and by Name) DataSources; every attempt returned the string "Error". A direct WSProxy createItem("FilterDefinition") throws with SOAP inner exception "Invalid property name: Type" on DataSource.',
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new filter definition from the supplied properties. ' +
            'The `Filter` field accepts either a simple `{Property, SimpleOperator, Value}` filter or a complex filter with `LeftOperand`, `LogicalOperator`, `RightOperand`. ' +
            '`DataSource.Type` must be `"SubscriberList"` or `"DataExtension"`. ' +
            'On failure the Core library returns the string "Error" rather than throwing.',
        params: [
            {
                name: 'properties',
                description:
                    'JSON object describing the new filter definition (Name, CustomerKey, Filter, DataSource).',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK', 'Error'],
        returnDescription:
            'Returns "OK" on success. On failure the Core library returns the string "Error" (it does not throw).',
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
        isConfirmed: true,
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
        returnDescription:
            'Array of filter definitions matching the filter; an empty array when none match.',
        syntax: 'FilterDefinition.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var results = FilterDefinition.Retrieve({ Property: "CustomerKey", SimpleOperator: "equals", Value: "myFilterDef" });',
    },
    {
        name: 'Update',
        isStatic: false,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'no-test-data',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verification was BLOCKED: no valid FilterDefinition could be created on the test BU (see Add), so Update could not be exercised against a real definition. Against a non-existent definition the Core library returned the string "Error" (not "OK") and did not throw — the official docs state it returns "OK" or throws.',
        requiresCoreLoad: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Updates the filter definition with the supplied attributes. ' +
            'On failure the Core library returns the string "Error" rather than throwing.',
        params: [
            {
                name: 'properties',
                description: 'Attributes to change on the filter definition.',
                type: 'object',
            },
        ],
        returnType: 'string',
        returnEnum: ['OK', 'Error'],
        returnDescription:
            'Returns "OK" on success. On failure the Core library returns the string "Error" (it does not throw).',
        syntax: '<FilterDefinitionInstance>.Update(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var fd = FilterDefinition.Init("myFilterDef");\n' +
            'var status = fd.Update({ Name: "Updated Name" });',
    },
    {
        name: 'Remove',
        isStatic: false,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'no-test-data',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verification was BLOCKED: no valid FilterDefinition could be created on the test BU (see Add), so Remove could not be exercised against a real definition. Against a non-existent definition the Core library returned the string "Error" (not "OK") and did not throw — the official docs state it returns "OK" or throws.',
        requiresCoreLoad: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Deletes the previously initialized filter definition. ' +
            'On failure the Core library returns the string "Error" rather than throwing.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK', 'Error'],
        returnDescription:
            'Returns "OK" on success. On failure the Core library returns the string "Error" (it does not throw).',
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
        isConfirmed: true,
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
        example: 'Platform.Load("core", "1");\nvar qd = QueryDefinition.Init("myQueryDef");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs and this page state Perform returns "OK". Runtime-verified on a live CloudPage: ' +
            'Perform("start") returns the string "QueryDefinition perform called successfully" (not "OK"). It queues the ' +
            'query run asynchronously and returns immediately — the returned string only confirms the run was accepted, ' +
            'not that the query finished. Treat any thrown error as failure; do not string-match against "OK".',
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
        returnEnum: ['QueryDefinition perform called successfully'],
        returnDescription:
            'Returns the string "QueryDefinition perform called successfully" when the run is accepted; throws on failure.',
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
        isConfirmed: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a List instance bound to the specified external key. ' +
            'Required before invoking any other List method on the returned instance.',
        params: [{ name: 'key', description: 'External key of the list.', type: 'string' }],
        returnType: 'ListInstance',
        returnDescription: 'An initialized List bound to the specified external key.',
        syntax: 'List.Init(key)',
        example: 'Platform.Load("core", "1");\nvar myList = List.Init("myList");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a Subscriber instance bound to the specified subscriber key. ' +
            'Required before invoking any instance method on the returned object.',
        params: [{ name: 'key', description: 'Subscriber key.', type: 'string' }],
        returnType: 'SubscriberInstance',
        returnDescription: 'An initialized Subscriber bound to the specified key.',
        syntax: 'Subscriber.Init(key)',
        example: 'Platform.Load("core", "1");\nvar sub = Subscriber.Init("mySubscriber");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: the QA test BU rejects programmatic Subscriber writes ' +
            'via its spam-filter guardrail. The live CloudPage attempt returned SOAP fault ' +
            '`TriggeredSpamFilter` (ErrorCode 12002), so the "OK" success path could not be proven on this BU.',
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
        isConfirmed: true,
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
        isStatic: false,
        requiresCoreLoad: true,
        differsFromOfficialDocs: true,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Official docs document a static Subscriber.Upsert(properties); at runtime Subscriber.Upsert is undefined — the method lives on the instance (Subscriber.Init(key).Upsert(properties)). ' +
            'The instance-method location is proven, but the write itself could not be verified: the QA test BU rejects programmatic Subscriber writes via its spam-filter guardrail (SOAP fault `TriggeredSpamFilter`, ErrorCode 12002).',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new subscriber, or updates the initialized one matched by EmailAddress / SubscriberKey.',
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
        syntax: '<SubscriberInstance>.Upsert(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var subObj = Subscriber.Init("test@example.com");\n' +
            'var result = subObj.Upsert({\n' +
            '    EmailAddress: "test@example.com",\n' +
            '    SubscriberKey: "test@example.com",\n' +
            '    Attributes: [ { Name: "FirstName", Value: "Jane" } ]\n' +
            '});',
    },
    {
        name: 'Statistics',
        isStatic: false,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Official docs document a static Subscriber.Statistics(subscriberKey); at runtime Subscriber.Statistics is undefined — the method lives on the instance (Subscriber.Init(key).Statistics()).',
        minArgs: 0,
        maxArgs: 0,
        description:
            'Retrieves statistical data for the initialized subscriber (sends, opens, clicks, bounces, unsubscribes).',
        params: [],
        returnType: 'object',
        returnDescription: 'A single object with subscriber statistics (not an array).',
        syntax: '<SubscriberInstance>.Statistics()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var subObj = Subscriber.Init("test@example.com");\n' +
            'var stats = subObj.Statistics();',
    },
    {
        name: 'Update',
        isStatic: false,
        requiresCoreLoad: true,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: the QA test BU rejects programmatic Subscriber writes ' +
            'via its spam-filter guardrail (SOAP fault `TriggeredSpamFilter`, ErrorCode 12002), so the ' +
            'update success path could not be proven on this BU.',
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: the QA test BU rejects programmatic Subscriber writes ' +
            'via its spam-filter guardrail (SOAP fault `TriggeredSpamFilter`, ErrorCode 12002), so the ' +
            'delete success path could not be proven on this BU.',
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: the QA test BU rejects programmatic Subscriber writes ' +
            'via its spam-filter guardrail (SOAP fault `TriggeredSpamFilter`, ErrorCode 12002), so the ' +
            'unsubscribe success path could not be proven on this BU.',
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
        deprecated: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes an Email instance bound to the specified external key. ' +
            'Required before invoking any other Email method on the returned instance. ' +
            'External keys cannot be set in the UI — set one via SOAP API, or look up the value via `Email.Retrieve()`. ' +
            'Deprecated — operates on classic Email Studio emails; prefer Content Builder assets for new work.',
        params: [
            { name: 'key', description: 'External key of the email message.', type: 'string' },
        ],
        returnType: 'EmailInstance',
        returnDescription: 'An initialized Email bound to the specified external key.',
        syntax: 'Email.Init(key)',
        example: 'Platform.Load("core", "1");\nvar myEmail = Email.Init("myEmail");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        isConfirmed: true,
        deprecated: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new classic email message from the supplied properties and returns an initialized email instance. ' +
            'Note: unlike most static `Add` methods, this returns an `EmailInstance`, not `"OK"`. ' +
            'Deprecated — operates on classic Email Studio emails; prefer Content Builder assets for new work.',
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
        isConfirmed: true,
        deprecated: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Returns an array of classic email messages matching the specified filter. ' +
            'Deprecated — operates on classic Email Studio emails; prefer Content Builder assets for new work.',
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
        isConfirmed: true,
        deprecated: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Updates the classic email message with the supplied attributes. ' +
            'Deprecated — operates on classic Email Studio emails; prefer Content Builder assets for new work.',
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
        isConfirmed: true,
        deprecated: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Removes the previously initialized classic email message. ' +
            'Deprecated — operates on classic Email Studio emails; prefer Content Builder assets for new work.',
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
        isConfirmed: true,
        deprecated: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): `Task.ValidationStatus` is a STRING (e.g. "Fail"), not the boolean ' +
            'the official docs describe. Compare against string values, not `true`/`false`.',
        minArgs: 0,
        maxArgs: 0,
        description:
            'Runs validation checks on the previously initialized classic email message. ' +
            'Returns a `{Task: {ValidationStatus: string, ValidationMessages: string}}` object. ' +
            'Deprecated — operates on classic Email Studio emails; prefer Content Builder assets for new work.',
        params: [],
        returnType: 'object',
        returnDescription:
            'Validation result with `Task.ValidationStatus` (string, e.g. "Fail") and `Task.ValidationMessages` (string).',
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
        isConfirmed: true,
        deprecated: true,
        minArgs: 0,
        maxArgs: 0,
        description:
            'Runs content checks on the previously initialized classic email message. ' +
            'Returns a `{Task: {CheckPassed: boolean, ResultMessage: string}}` object. ' +
            'Deprecated — operates on classic Email Studio emails; prefer Content Builder assets for new work.',
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
        isConfirmed: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a Send instance bound to the specified send ID. ' +
            'Required before invoking any other Send method on the returned instance.',
        params: [{ name: 'id', description: 'Numeric ID of the send.', type: 'number' }],
        returnType: 'SendInstance',
        returnDescription: 'An initialized Send bound to the specified send ID.',
        syntax: 'Send.Init(id)',
        example: 'Platform.Load("core", "1");\nvar s = Send.Init(12345);',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
        minArgs: 0,
        maxArgs: 0,
        description: 'Removes the previously initialized send.',
        params: [],
        returnType: 'string',
        returnEnum: ['OK'],
        returnDescription: 'Returns "OK" on success or throws on failure.',
        syntax: '<SendInstance>.Remove()',
        example: 'Platform.Load("core", "1.1.5");\nvar s = Send.Init(12345);\ns.Remove();',
    },
    {
        name: 'CancelSend',
        isStatic: false,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): `CancelSend()` returns the literal string "status" on success, ' +
            'not the "OK" the official docs describe. Do not compare its return value against "OK".',
        minArgs: 0,
        maxArgs: 0,
        description: 'Attempts to cancel the previously initialized send.',
        params: [],
        returnType: 'string',
        returnEnum: ['status'],
        returnDescription:
            'Returns the literal string "status" on success (not "OK"); throws on failure.',
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
        isConfirmed: true,
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
];

export const SEND_TRACKING_CLICKS_METHODS = [
    {
        name: 'Retrieve',
        isStatic: false,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Salesforce docs (and older references) document click tracking as `<SendInstance>.Tracking.ClickRetrieve(filter)`. ' +
            'At runtime that name is `undefined`; the working member is `<SendInstance>.Tracking.Clicks.Retrieve(filter)` ' +
            '(a `Clicks` sub-object with a `Retrieve` method), matching the TriggeredSend.Tracking.Clicks pattern.',
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
        syntax: '<SendInstance>.Tracking.Clicks.Retrieve(filter)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var singleSend = Send.Init(12345);\n' +
            'var results = singleSend.Tracking.Clicks.Retrieve({ Property: "ID", SimpleOperator: "equals", Value: 12345 });',
    },
];

export const SEND_TRACKING_TOTAL_BY_INTERVAL_METHODS = [
    {
        name: 'Retrieve',
        isStatic: false,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Salesforce docs (and older references) document interval aggregation as ' +
            '`<SendInstance>.Tracking.TotalByIntervalRetrieve(type, startDate, endDate, groupBy)`. ' +
            'At runtime that name is `undefined`; the working member is ' +
            '`<SendInstance>.Tracking.TotalByInterval.Retrieve(type, startDate, endDate, groupBy)` ' +
            '(a `TotalByInterval` sub-object with a `Retrieve` method), matching the TriggeredSend.Tracking.TotalByInterval pattern.',
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
        syntax: '<SendInstance>.Tracking.TotalByInterval.Retrieve(type, startDate, endDate, groupBy)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var singleSend = Send.Init(12345);\n' +
            'var results = singleSend.Tracking.TotalByInterval.Retrieve("Click", "07-01-2010", "07-31-2010", "day");',
    },
];

export const SEND_DEFINITION_METHODS = [
    {
        name: 'Init',
        isStatic: true,
        requiresCoreLoad: true,
        isConfirmed: true,
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
        example: 'Platform.Load("core", "1.1.5");\nvar esd = Send.Definition.Init("myESD");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: creating a send definition programmatically is rejected ' +
            'by this BU. The live CloudPage attempt returned `CreateEmailSendDefinition` SOAP ErrorCode ' +
            '42116, so the "OK" success path could not be proven on this BU.',
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: creating a send definition programmatically is rejected ' +
            'by this BU (`CreateEmailSendDefinition` SOAP ErrorCode 42116), so the "OK" success path could ' +
            'not be proven on this BU.',
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: creating a send definition programmatically is rejected ' +
            'by this BU (`CreateEmailSendDefinition` SOAP ErrorCode 42116), so the "OK" success path could ' +
            'not be proven on this BU.',
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
        isConfirmed: true,
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: send-definition writes are rejected by this BU ' +
            '(`CreateEmailSendDefinition` SOAP ErrorCode 42116), so the update success path could not be ' +
            'proven on this BU.',
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: send-definition writes are rejected by this BU ' +
            '(`CreateEmailSendDefinition` SOAP ErrorCode 42116), so the delete success path could not be ' +
            'proven on this BU.',
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: triggering a send programmatically is rejected by this BU ' +
            '(send-definition creation policy, `CreateEmailSendDefinition` SOAP ErrorCode 42116), so the ' +
            'send success path could not be proven on this BU.',
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
        isConfirmed: true,
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
        example: 'Platform.Load("core", "1");\nvar triggeredSend = TriggeredSend.Init("support");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: the QA test BU rejects programmatic Triggered Send Definition ' +
            'creation. On a live CloudPage, `TriggeredSend.Add` threw `Error adding TSD.` and the equivalent ' +
            'WSProxy `CreateTriggeredSendDefinition` returned an opaque server exception (ErrorCode 2, no actionable ' +
            'StatusMessage) even with a valid classic email, Default SendClassification, and the All Subscribers list. ' +
            'No working TSD could be provisioned on this BU, so the documented `TriggeredSendInstance` return could not be proven.',
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
        isConfirmed: true,
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: no Triggered Send Definition could be created on the QA test BU ' +
            '(see TriggeredSend.Add), so there was no active TSD to update. On a live CloudPage the call returned the ' +
            'string `"Error"` with `LastMessage` = "Unable to access the specified triggered send definition"; the ' +
            'documented `"OK"` success path could not be proven without a valid TSD.',
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: no Triggered Send Definition could be created on the QA test BU ' +
            '(see TriggeredSend.Add), so there was no paused TSD to reactivate. On a live CloudPage the call returned ' +
            'the string `"Error"` with `LastMessage` = "Unable to access the specified triggered send definition"; the ' +
            'documented `"OK"` success path could not be proven.',
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: no Triggered Send Definition could be created on the QA test BU ' +
            '(see TriggeredSend.Add), so there was no active TSD to pause. On a live CloudPage the call returned ' +
            'the string `"Error"` with `LastMessage` = "Unable to access the specified triggered send definition"; the ' +
            'documented `"OK"` success path could not be proven.',
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: no Triggered Send Definition could be created on the QA test BU ' +
            '(see TriggeredSend.Add), so there was no draft/inactive TSD to publish. On a live CloudPage the call ' +
            'returned the string `"Error"` with `LastMessage` = "Unable to access the specified triggered send ' +
            'definition"; the documented `"OK"` success path could not be proven.',
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
        isConfirmed: false,
        verificationBlocked: true,
        verificationBlockedReason: 'bu-guardrail',
        officialDocsNote:
            'Verification attempted but blocked: no Triggered Send Definition could be created on the QA test BU ' +
            '(see TriggeredSend.Add), so there was no active TSD to send through. On a live CloudPage the call returned ' +
            'the string `"Error"` with `LastMessage` = "Unable to access the specified triggered send definition"; the ' +
            'documented `"OK"` success path and the actual send side effect could not be proven.',
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Initializes a DataExtension instance bound to the specified data extension. ' +
            'Runtime accepts either the External Key or the Name of the data extension (both resolve to the same DE). ' +
            'Binding is lazy — Init never throws for a missing DE; the error surfaces on the first Rows/Fields operation. ' +
            'Required before invoking any `Fields` or `Rows` sub-namespace method on the returned instance. ' +
            'Note: Core Library DataExtension methods do not support enterprise-level data extensions.',
        params: [
            {
                name: 'key',
                description:
                    'External Key or Name of the data extension (the runtime resolves either).',
                type: 'string',
            },
        ],
        returnType: 'DataExtensionInstance',
        returnDescription:
            'An initialized DataExtension (exposing `Rows`, `Fields`, `Update`, `Remove`) bound to the specified data extension.',
        syntax: 'DataExtension.Init(key)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var birthdayDE = DataExtension.Init("birthdayDE");',
    },
    {
        name: 'Add',
        isStatic: true,
        requiresCoreLoad: true,
        isConfirmed: true,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Creates a new data extension from the supplied properties and returns an initialized DataExtension instance ' +
            '(the same shape as `DataExtension.Init`, exposing `Rows`, `Fields`, `Update`, `Remove`). ' +
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official Salesforce docs document `filter` as required, but at runtime it is optional: ' +
            'calling `DataExtension.Retrieve()` with no arguments does not throw and returns the full list of data extensions. ' +
            'A filter that matches nothing returns a real empty array (`[object Array]`, `length: 0`).',
        minArgs: 1,
        maxArgs: 2,
        description:
            'Returns an array of data extensions matching the specified filter. ' +
            'Pass `queryAllAccounts: true` to search all accounts accessible to the authenticated user. ' +
            'The `filter` is documented as required but is optional at runtime — omitting it returns all data extensions.',
        params: [
            {
                name: 'filter',
                description:
                    'PascalCase WSProxy-style filter object: `{Property, SimpleOperator, Value}`. ' +
                    'Documented as required, but optional at runtime (omitting it returns all data extensions).',
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
        returnDescription:
            'Returns "OK" on success. Runtime returns the string "Error" (rather than throwing) when the field cannot be added or arguments are missing.',
        syntax: '<DataExtensionInstance>.Fields.Add(properties)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var de = DataExtension.Init("SSJSTest");\n' +
            'var newField = { Name: "NewFieldV2", CustomerKey: "CustomerKey", FieldType: "Number", IsRequired: true, DefaultValue: "100" };\n' +
            'var status = de.Fields.Add(newField);',
        isConfirmed: true,
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
        returnDescription:
            'List of field-definition objects. Each object exposes `Name` (string), `ObjectID` (string), `FieldType` (string), `IsPrimaryKey` (boolean), `MaxLength` (number), `Ordinal` (number), and `DefaultValue` (string).',
        syntax: '<DataExtensionInstance>.Fields.Retrieve()',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var birthdayDE = DataExtension.Init("birthdayDE");\n' +
            'var fields = birthdayDE.Fields.Retrieve();',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs example response lists only Name, FieldType, IsPrimaryKey, MaxLength, Ordinal, and DefaultValue. At runtime each field object also includes an `ObjectID` (string) property.',
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
            'Returns "OK" on success (confirmed at runtime; the doc has no `@returns`). Returns the string "Error" instead of throwing on failure.',
        syntax: '<DataExtensionInstance>.Fields.UpdateSendableField(deFieldName, subscriberField)',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var updateDE = DataExtension.Init("sendableDataExtension");\n' +
            'var status = updateDE.Fields.UpdateSendableField("DifferentSubKey", "Subscriber Key");',
        isConfirmed: true,
    },
];

export const DATA_EXTENSION_ROWS_METHODS = [
    {
        name: 'Add',
        isStatic: false,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified on a CloudPage: returns a number (the count of rows added), not the string "OK". ' +
            'Also accepts a single row object in addition to an array of objects.',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Adds one or more rows to the previously initialized data extension. ' +
            'Accepts either an array of row objects or a single row object.',
        params: [
            {
                name: 'rowData',
                description:
                    "Array of row objects (or a single row object). Each object's keys must match data extension field names.",
                type: 'array',
            },
        ],
        returnType: 'number',
        returnDescription: 'The number of rows that were added.',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified on a CloudPage: returns typed values (Number columns come back as number, Boolean as boolean, Date as a real Date object, unlike Retrieve which returns every field as a string). ' +
            'On no match, returns `null` (not an empty array). The result is a host array where `instanceof Array` is `false`, but `.length` and index access work.',
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
        isConfirmed: true,
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified on a CloudPage: calling `Retrieve()` without a filter DOES work on CloudPages and returns all rows — the widely-repeated "returns empty on CloudPages" bug could not be reproduced. ' +
            'All field values are returned as strings (even Number/Boolean/Date columns), unlike Lookup which returns typed values. ' +
            'On no match, returns an empty host array (`.length === 0`), not `null`. The result is a host array where `instanceof Array` is `false`, but `.length` and index access work.',
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
            'Rows from the data extension matching the filter (or all rows when no filter is supplied). Field values are strings.',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified on a CloudPage: returns a number (the count of rows updated), not the string "OK". ' +
            'When no row matches the WHERE clause, it returns `0` and does NOT throw.',
        minArgs: 3,
        maxArgs: 3,
        description:
            'Updates the columns of rows where `whereFieldNames` equal `whereValues` (AND-joined). ' +
            'Returns 0 (does not throw) when no row matches.',
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
        returnType: 'number',
        returnDescription: 'The number of rows that were updated (0 when no row matches).',
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
        isConfirmed: true,
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
        returnType: '{ Status: number, Content: string }',
        syntax: 'HTTP.Get(url[, headerNames, headerValues])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var body = HTTP.Get("https://api.example.com/data");\n' +
            'var obj = Platform.Function.ParseJSON(String(body));',
    },
    {
        name: 'Post',
        minArgs: 3,
        maxArgs: 5,
        requiresCoreLoad: true,
        isConfirmed: true,
        description:
            'Performs an HTTP POST request with a content type and payload. ' +
            'Returns an object whose `StatusCode` is a number and whose `Response` is an array-like whose first element (`Response[0]`) is the response body string. ' +
            'Custom headers are optional; when supplied, `headerNames` and `headerValues` must be paired (equal length) — passing only one of the two throws a mismatch error.',
        params: [
            { name: 'url', description: 'URL to post to.', type: 'string' },
            { name: 'contentType', description: 'MIME type of the request body.', type: 'string' },
            { name: 'payload', description: 'Request body content.', type: 'string' },
            {
                name: 'headerNames',
                description:
                    'Array of header names to include in the request (co-required with headerValues).',
                type: 'string[]',
                optional: true,
            },
            {
                name: 'headerValues',
                description: 'Array of header values, one per entry in headerNames (co-required).',
                type: 'array',
                optional: true,
            },
        ],
        returnType: '{ StatusCode: number, Response: string[] }',
        syntax: 'HTTP.Post(url, contentType, payload[, headerNames, headerValues])',
        example:
            'Platform.Load("core", "1.1.5");\n' +
            'var payload = Stringify({ email: "jane@example.com" });\n' +
            'var response = HTTP.Post("https://api.example.com/items", "application/json", payload);\n' +
            'if (response.StatusCode == 200) { var body = response.Response[0]; }',
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
        maxArgs: 3,
        isConfirmed: true,
        description: 'Creates a new Marketing Cloud object via the SOAP API.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            { name: 'properties', description: 'Object properties to set', type: 'object' },
            {
                name: 'createOptions',
                description:
                    'Optional SOAP CreateOptions object (e.g. RequestType, QueuePriority).',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'WSProxyResult',
        returnDescription:
            'Object with Status, RequestID, and a Results array of per-item results.',
        syntax: '<WSProxyInstance>.createItem(objectType, properties[, createOptions])',
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
        maxArgs: 3,
        isConfirmed: true,
        description: 'Updates a single existing Marketing Cloud object via the SOAP API.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            { name: 'properties', description: 'Object properties to update', type: 'object' },
            {
                name: 'updateOptions',
                description: 'Optional SOAP UpdateOptions object (e.g. { SaveOptions: [...] })',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'WSProxyResult',
        returnDescription:
            'Object with Status, RequestID, and a single-entry Results array. The one Results entry carries StatusCode, StatusMessage, OrdinalID, ErrorCode, and an Object wrapper.',
        syntax: '<WSProxyInstance>.updateItem(objectType, properties[, updateOptions])',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var result = api.updateItem("DataExtensionObject", {\n' +
            '    CustomerKey: "MyDE",\n' +
            '    Keys: [{ Name: "Email", Value: "a@example.com" }],\n' +
            '    Properties: [{ Name: "Status", Value: "inactive" }]\n' +
            '});\n' +
            'if (result.Status === "OK") { Write("Updated"); }',
    },
    {
        name: 'deleteItem',
        isStatic: false,
        minArgs: 2,
        maxArgs: 3,
        isConfirmed: true,
        description: 'Deletes a Marketing Cloud object via the SOAP API.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            {
                name: 'properties',
                description: 'Object properties identifying the item to delete',
                type: 'object',
            },
            {
                name: 'deleteOptions',
                description:
                    'Optional SOAP DeleteOptions object (e.g. RequestType, QueuePriority).',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'WSProxyResult',
        returnDescription:
            'Object with Status, RequestID, and a Results array of per-item results (StatusCode, StatusMessage, ErrorCode). The top-level object has no StatusMessage.',
        syntax: '<WSProxyInstance>.deleteItem(objectType, properties[, deleteOptions])',
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
                description:
                    'Properties to set on the SOAP RetrieveOptions object. Set BatchSize (1..2500) here to force paged results; a value above 2500 is ignored and the default page size applies.',
                type: 'object',
                optional: true,
            },
            {
                name: 'requestProps',
                description:
                    'Additional request properties, e.g. QueryAllAccounts (boolean) and ContinueRequest (a RequestID string). Setting ContinueRequest to the RequestID from a prior paged retrieve fetches the next page — a retrieve-based alternative to getNextBatch.',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'WSProxyResult',
        returnDescription:
            'Object with Status, HasMoreRows, RequestID, and Results array. When a result set is paged, Status is "MoreDataAvailable" and HasMoreRows is true; the final page returns Status "OK" and HasMoreRows false.',
        syntax: '<WSProxyInstance>.retrieve(objectType, columns[, filter[, retrieveOptions[, requestProps]]])',
        officialDocsNote:
            'Runtime verified on a CloudPage: retrieve(objectType, columns, null, { BatchSize: 2 }, { QueryAllAccounts: false }) against a 6-row Data Extension returned a first page with Status "MoreDataAvailable", HasMoreRows true, a RequestID, and exactly 2 rows — the retrieveOptions.BatchSize argument pages cleanly without throwing. Continuation via the requestProps.ContinueRequest field works: setting props.ContinueRequest to the returned RequestID and calling retrieve again returned each subsequent page (3 pages of 2 rows, 6 total), with the RequestID held constant across the sequence and HasMoreRows flipping to false (Status "OK") on the final page. This is a retrieve-only paging alternative to getNextBatch. BatchSize caps at 2500; larger values are ignored.',
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
        isConfirmed: true,
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
        returnType: 'WSProxyResult',
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
        isConfirmed: true,
        officialDocsNote:
            'Runtime (CloudPage) proved the full paginated continuation: a natural retrieve of a Data Extension seeded with 2600 rows returned the first page with Status "MoreDataAvailable", HasMoreRows true, a RequestID, and exactly 2500 rows (the default page size); passing that objectType + RequestID to getNextBatch returned the next page with Status "OK", HasMoreRows false, and the remaining 100 rows, for a total of 2600 across two pages. Each Results row exposes a Properties array of { Name, Value } pairs. Pagination therefore happens naturally once a result set exceeds the 2500-row default page size. Calling getNextBatch with a completed/invalid RequestID returns Status "Error: The RequestID sent through ContinueRequest does not exist." The call maps to the SOAP ContinueRequest operation.',
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
                description:
                    'Action to perform, typically "Start". The verb is case-insensitive at runtime ("start" works identically to "Start").',
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
        returnType: 'WSProxyResult',
        returnDescription:
            'Object with Status (string, "OK" on success), StatusMessage (string, empty on success), RequestID (string) and Results (Array with a single entry for the acted-on item). The Results[0] element carries StatusCode, StatusMessage ("QueryDefinition perform called successfully"), OrdinalID, ErrorCode plus an Object (the acted-on API object) and a Task sub-object (StatusCode, StatusMessage, ID, TblAsyncID, InteractionObjectID).',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime (CloudPage) confirmed the (objectType, properties, action[, performOptions]) signature and the WSProxyResult return shape: Status/StatusMessage/RequestID plus a single-entry Results array. Against a freshly-created active QueryDefinition, both "Start" and lowercase "start" returned Status "OK" with Results[0].StatusMessage "QueryDefinition perform called successfully" — the action verb is case-insensitive, so the docs\' Enum(\'Start\') is not case-sensitive as the page previously claimed. The Results[0] element exposes StatusCode, StatusMessage, OrdinalID, ErrorCode, an Object wrapper and a Task sub-object (with InteractionObjectID); the official docs do not detail this per-item structure.',
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
                description:
                    'Action to perform, typically "Start". The verb is case-insensitive at runtime ("start" works identically to "Start").',
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
        returnType: 'WSProxyResult',
        returnDescription:
            'Object with Status (string, "OK" on success), StatusMessage (string, empty on success), RequestID (string) and Results (Array with one entry per input item). Each Results element carries StatusCode, StatusMessage, OrdinalID, ErrorCode plus an Object (the acted-on API object) and a Task sub-object (StatusCode, StatusMessage, InteractionObjectID, etc.).',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime (CloudPage) confirmed the (objectType, propertiesArray, action[, performOptions]) signature and the WSProxyResult return shape: Status/StatusMessage/RequestID plus a Results array with one entry per input item. Against a freshly-created active QueryDefinition, both "Start" and lowercase "start" returned Status "OK" with Results[0].StatusMessage "QueryDefinition perform called successfully" — the action verb is case-insensitive, so the docs\' Enum(\'Start\') is not case-sensitive as previously assumed. Each Results element exposes StatusCode, StatusMessage, OrdinalID, ErrorCode, an Object wrapper and a Task sub-object (with InteractionObjectID); the official docs do not detail this per-item structure.',
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
            'Returns structural metadata for one or more SOAP API object types, one ObjectDefinition per requested type.',
        params: [
            {
                name: 'objectType',
                description: 'Object type name, or an array of type names, to describe',
                type: 'string|string[]',
            },
        ],
        returnType: 'WSProxyResult',
        returnDescription:
            'Object with RequestID (string) and Results (Array). Each Results element is itself the ObjectDefinition — properties like ObjectType, Name, IsCreatable and the Properties field-definition array sit directly on Results[i], NOT under a nested Results[i].ObjectDefinition.',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs place field details at Results[0].ObjectDefinition.Properties, but at runtime each Results element is directly the ObjectDefinition (Results[0].Properties); there is no nested ObjectDefinition wrapper, and the return object exposes RequestID (not Status).',
        syntax: '<WSProxyInstance>.describe(objectType)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var result = api.describe("DataExtension");\n' +
            'Write(Stringify(result.Results[0].Properties));',
    },
    {
        name: 'execute',
        isStatic: false,
        minArgs: 2,
        maxArgs: 2,
        description:
            'Runs a SOAP Execute request (e.g. LogUnsubEvent), passing an array of Name/Value parameter objects and the request name.',
        params: [
            {
                name: 'parameters',
                description:
                    'Array of Name/Value parameter objects to include in the Execute call.',
                type: 'object[]',
            },
            {
                name: 'requestName',
                description: 'Name of the Execute request to run.',
                type: 'string',
                enum: ['LogUnsubEvent'],
            },
        ],
        returnType: 'WSProxyResult',
        returnDescription:
            'Object with Status (string), RequestID (string), and a Results array of per-item ExecuteResponse objects (StatusCode, StatusMessage, OrdinalID, Results, ErrorCode).',
        syntax: '<WSProxyInstance>.execute(parameters, requestName)',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var props = [\n' +
            '    { Name: "SubscriberKey", Value: "sample@sample.com" },\n' +
            '    { Name: "EmailAddress", Value: "sample@sample.com" },\n' +
            '    { Name: "JobID", Value: 0 },\n' +
            '    { Name: "ListID", Value: 0 },\n' +
            '    { Name: "BatchID", Value: 0 }\n' +
            '];\n' +
            'var result = api.execute(props, "LogUnsubEvent");\n' +
            'Write(result.Status);',
        isConfirmed: true,
    },
    {
        name: 'setClientId',
        isStatic: false,
        minArgs: 1,
        maxArgs: 1,
        description:
            'Sets a ClientId (impersonation) context on the WSProxy instance so subsequent operations run against another business unit. Pass an object with the MID under the "ID" key (and optionally "UserID"); the calling context must have access to the target BU.',
        params: [
            {
                name: 'options',
                description:
                    'Object with the target ClientId properties; at least the "ID" key (target BU MID) is expected, "UserID" is optional.',
                type: 'object',
            },
        ],
        returnType: 'null',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs document setClientId() as returning void, but at runtime it returns a genuine null (=== null), not undefined.',
        syntax: '<WSProxyInstance>.setClientId(options)',
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
        returnType: 'null',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs document resetClientIds() as returning void, but at runtime it returns a genuine null (=== null), not undefined.',
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
        maxArgs: 3,
        isConfirmed: true,
        description: 'Creates multiple Marketing Cloud objects in a single SOAP API call.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            {
                name: 'propertiesArray',
                description: 'Array of property objects to create',
                type: 'array',
            },
            {
                name: 'createOptions',
                description:
                    'Optional SOAP CreateOptions object (e.g. RequestType, QueuePriority).',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'WSProxyResult',
        returnDescription:
            'Object with Status (string, e.g. "OK"), RequestID (string GUID), and a Results array holding one entry per input object (each with StatusCode, StatusMessage, NewObjectID, Object, etc.).',
        syntax: '<WSProxyInstance>.createBatch(objectType, propertiesArray[, createOptions])',
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
        maxArgs: 3,
        isConfirmed: true,
        description: 'Updates multiple Marketing Cloud objects in a single SOAP API call.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            {
                name: 'propertiesArray',
                description: 'Array of property objects to update',
                type: 'array',
            },
            {
                name: 'updateOptions',
                description: 'Optional SOAP UpdateOptions object (e.g. { SaveOptions: [...] })',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'WSProxyResult',
        returnDescription:
            'Object with Status, RequestID, and a Results array (one entry per input item). Each Results entry carries StatusCode, StatusMessage, OrdinalID, ErrorCode, and an Object wrapper.',
        syntax: '<WSProxyInstance>.updateBatch(objectType, propertiesArray[, updateOptions])',
        example:
            'var api = new Script.Util.WSProxy();\n' +
            'var items = [\n' +
            '    { CustomerKey: "MyDE", Keys: [{ Name: "Email", Value: "a@example.com" }], Properties: [{ Name: "Status", Value: "active" }] }\n' +
            '];\n' +
            'var result = api.updateBatch("DataExtensionObject", items);\n' +
            'Write(result.Status);',
    },
    {
        name: 'deleteBatch',
        isStatic: false,
        minArgs: 2,
        maxArgs: 3,
        isConfirmed: true,
        description: 'Deletes multiple Marketing Cloud objects in a single SOAP API call.',
        params: [
            { name: 'objectType', description: 'SOAP API object type name', type: 'string' },
            {
                name: 'propertiesArray',
                description: 'Array of property objects identifying each object to delete',
                type: 'array',
            },
            {
                name: 'deleteOptions',
                description:
                    'Optional SOAP DeleteOptions object (e.g. RequestType, QueuePriority).',
                type: 'object',
                optional: true,
            },
        ],
        returnType: 'WSProxyResult',
        returnDescription:
            'Object with Status (string, e.g. "OK"), RequestID (string GUID), and a Results array holding one entry per input object (each with StatusCode, StatusMessage, ErrorCode, Object, etc.). There is no top-level StatusMessage.',
        syntax: '<WSProxyInstance>.deleteBatch(objectType, propertiesArray[, deleteOptions])',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): reads INBOUND request headers (e.g. `Host`, `User-Agent`) and ' +
            'returns their string value. It does NOT read back a header you set earlier with ' +
            '`HTTPHeader.SetValue(...)` — GetValue for a just-set custom header returns `null`. ' +
            'Treat GetValue and SetValue as operating on separate (inbound vs outbound) header collections.',
        description:
            'Retrieves the value of the specified INBOUND HTTP request header (e.g. Host, User-Agent). ' +
            'Returns `null` for headers that are not present on the request.',
        params: [{ name: 'name', description: 'Name of the HTTP header to read', type: 'string' }],
        returnType: 'string',
        syntax: 'HTTPHeader.GetValue(name)',
        example:
            'Platform.Load("core", "1");\n' +
            'var host = HTTPHeader.GetValue("Host");\n' +
            'Write(host);',
    },
    {
        name: 'SetValue',
        minArgs: 2,
        maxArgs: 2,
        isStatic: false,
        requiresCoreLoad: true,
        isConfirmed: true,
        description:
            'Sets the value of the specified OUTBOUND HTTP header. ' +
            'The host and content-length headers cannot be changed. ' +
            'Note: values set here are not readable via `HTTPHeader.GetValue`, which reads inbound headers.',
        params: [
            { name: 'name', description: 'Name of the header to set', type: 'string' },
            { name: 'value', description: 'Value to assign to the header', type: 'string' },
        ],
        returnType: 'void',
        syntax: 'HTTPHeader.SetValue(name, value)',
        example: 'Platform.Load("core", "1");\nHTTPHeader.SetValue("From", "aruiz@example.com");',
    },
    {
        name: 'Remove',
        minArgs: 1,
        maxArgs: 1,
        isStatic: false,
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): returns `undefined` (typeof "undefined"), NOT the `"OK"` string ' +
            'implied by some docs. Do not rely on the return value; call it for its side effect only.',
        description: 'Removes the specified entry from the HTTP header. Returns `undefined`.',
        params: [
            { name: 'headerName', description: 'Name of the header to remove', type: 'string' },
        ],
        returnType: 'void',
        syntax: 'HTTPHeader.Remove(headerName)',
        example:
            'Platform.Load("core", "1");\n' +
            'HTTPHeader.Remove("X-Custom-Header"); // no useful return value',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): when the variable was NEVER SET it ' +
            'returns `null` (typeof "object"), NOT an empty string. A variable explicitly set to "" returns ' +
            '`""`. The leading `@` is optional — GetValue("v") and GetValue("@v") return the same value.',
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
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the leading `@` is optional — ' +
            'SetValue("v", x) and SetValue("@v", x) both write the same AMPscript variable.',
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
            'Distinct from the bare-name `Write()``, which write to the rendered page output.',
        params: [
            {
                name: 'content',
                description: 'Content string to write to the response.',
                type: 'string',
            },
        ],
        returnType: 'void',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): writes directly to the HTTP response body.',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage GET, ?probeParam=hello): a present parameter returns its string value ' +
            '("hello"); an ABSENT parameter returns `null` (typeof "object"), NOT an empty string. ' +
            'Guard reads with a truthiness / `!= null` check.',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): for an ABSENT field it returns `null` (typeof "object"), NOT an empty ' +
            'string.',
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
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): on a GET request it returns `""` ' +
            '(empty string), not null. First call per request returns the body; subsequent calls return `""`.',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): for an ABSENT cookie it returns ' +
            '`null` (typeof "object"), NOT an empty string.',
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
        isConfirmed: false,
        notDefinedAtRuntime: true,
        officialDocsNote:
            'Officially documented to return the `Accept-Language` header value, but `GetUserLanguages()` as ' +
            'called is NOT DEFINED AT RUNTIME: the engine does not resolve this member — runtime probing shows ' +
            'it throws the generic `System.InvalidOperationException: "Unable to retrieve security descriptor ' +
            'for this frame."` at every arity tried (0/1/2 args), the error the SSJS engine raises for an ' +
            'unrecognized member name or an argument count the engine does not accept (NOT a security or ' +
            'frame restriction). The same `Accept-Language` header IS present and readable in the same run via ' +
            '`Platform.Request.GetRequestHeader("Accept-Language")`. Use ' +
            '`Platform.Request.GetRequestHeader("Accept-Language")` instead, which returns the same value ' +
            'this method is documented to expose.',
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
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): for an ABSENT header it returns ' +
            '`null` (typeof "object") — consistent with the official docs.',
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

// ── Core Library "Request Object Utility Functions" methods ──────────────────
// The bare-name Core `Request` object (available after Platform.Load("core","1"))
// exposes these zero-arg utility METHODS plus the single-argument value getters
// GetQueryStringParameter and GetFormField. This is a DIFFERENT, distinct object
// from Platform.Request (which uses PROPERTIES like RequestURL and CLR methods) —
// not an alias of it. For example `Request.URL()` is a real METHOD here whereas on
// Platform.Request the equivalent is the `RequestURL` PROPERTY.
// Runtime-verified on a published CloudPage: the six context
// methods invoke cleanly (URL() returns the full URL; Method() returns the HTTP verb;
// the rest return empty strings outside their populating context), and the two value
// getters return the query-string value for a present key (null for an absent key).
// Referenced by the generator via PLATFORM_NAMESPACE_MAP['Request'].
export const REQUEST_UTILITY_METHODS = [
    {
        name: 'URL',
        minArgs: 0,
        maxArgs: 0,
        requiresCoreLoad: true,
        description: 'Returns the full URL of the current page request.',
        params: [],
        returnType: 'string',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage GET): returns the full request URL as a string ' +
            '(e.g. `https://…pub.sfmc-content.com/hovt2pwtcq3`). This is a distinct Core object ' +
            'method, not an alias of `Platform.Request` — the equivalent there is the ' +
            '`RequestURL` PROPERTY, not a `URL()` method.',
        syntax: 'Request.URL()',
        example: 'var requestURL = Request.URL();\nWrite(requestURL);',
    },
    {
        name: 'PagePath',
        minArgs: 0,
        maxArgs: 0,
        requiresCoreLoad: true,
        description: 'Returns the path portion of the current page request.',
        params: [],
        returnType: 'string',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage GET): invokes cleanly and returns an empty string ' +
            '(`""`) outside its populating context. This is a distinct Core object method, ' +
            'not an alias of `Platform.Request`.',
        syntax: 'Request.PagePath()',
        example: 'var path = Request.PagePath();\nWrite(path);',
    },
    {
        name: 'Method',
        minArgs: 0,
        maxArgs: 0,
        requiresCoreLoad: true,
        description: 'Returns the HTTP method (GET, POST, etc.) of the current request.',
        params: [],
        returnType: 'string',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage GET): returns the HTTP verb as a string (e.g. `"GET"`). ' +
            'This is a distinct Core object method, not an alias of `Platform.Request` — the ' +
            'equivalent there is the `Method` PROPERTY.',
        syntax: 'Request.Method()',
        example: 'var method = Request.Method();\nWrite(method);',
    },
    {
        name: 'ApplicationID',
        minArgs: 0,
        maxArgs: 0,
        requiresCoreLoad: true,
        description: 'Returns the application ID associated with the current request.',
        params: [],
        returnType: 'string',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage GET): invokes cleanly and returns an empty string ' +
            '(`""`) outside its populating context. This is a distinct Core object method, ' +
            'not an alias of `Platform.Request`.',
        syntax: 'Request.ApplicationID()',
        example: 'var appId = Request.ApplicationID();\nWrite(appId);',
    },
    {
        name: 'PackageID',
        minArgs: 0,
        maxArgs: 0,
        requiresCoreLoad: true,
        description: 'Returns the package ID associated with the current request.',
        params: [],
        returnType: 'string',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage GET): invokes cleanly and returns an empty string ' +
            '(`""`) outside its populating context. This is a distinct Core object method, ' +
            'not an alias of `Platform.Request`.',
        syntax: 'Request.PackageID()',
        example: 'var packageId = Request.PackageID();\nWrite(packageId);',
    },
    {
        name: 'ApplicationBaseURL',
        minArgs: 0,
        maxArgs: 0,
        requiresCoreLoad: true,
        description: 'Returns the base URL of the application for the current request.',
        params: [],
        returnType: 'string',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified (CloudPage GET): invokes cleanly and returns an empty string ' +
            '(`""`) outside its populating context. This is a distinct Core object method, ' +
            'not an alias of `Platform.Request`.',
        syntax: 'Request.ApplicationBaseURL()',
        example: 'var baseUrl = Request.ApplicationBaseURL();\nWrite(baseUrl);',
    },
    {
        name: 'GetQueryStringParameter',
        minArgs: 1,
        maxArgs: 1,
        requiresCoreLoad: true,
        description:
            'Returns the value of a named URL query string parameter for the current page request, or null when the parameter is absent.',
        params: [
            {
                name: 'name',
                description: 'Key name of the query string parameter to read.',
                type: 'string',
            },
        ],
        returnType: 'string',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified on a published CloudPage GET (?probeParam=hello): Request.GetQueryStringParameter("probeParam") returned "hello" (typeof "string"); an absent key returned null (typeof "object"). Unlike the CLR-backed Platform.Request.GetQueryStringParameter, this bare-name Core method is a Jint function: calling it with zero arguments returns null and a surplus second argument is ignored (it does NOT throw the "Unable to retrieve security descriptor for this frame." arity error). This is a distinct Core object method, not an alias of Platform.Request.GetQueryStringParameter. Guard reads with a truthiness / != null check.',
        syntax: 'Request.GetQueryStringParameter(name)',
        example:
            'var sku = Request.GetQueryStringParameter("sku");\nif (sku) { Write("SKU: " + sku); }',
    },
    {
        name: 'GetFormField',
        minArgs: 1,
        maxArgs: 1,
        requiresCoreLoad: true,
        description:
            'Returns the value of a named form field submitted with the current request (including POST data), or null when the field is absent. Also reads GET query string values.',
        params: [
            {
                name: 'name',
                description: 'Name of the form field to read.',
                type: 'string',
            },
        ],
        returnType: 'string',
        isConfirmed: true,
        officialDocsNote:
            'Runtime-verified on a published CloudPage GET: Request.GetFormField("probeParam") returned null (typeof "object") because no form field was posted; an absent key also returned null. This bare-name Core method is a Jint function: calling it with zero arguments or a surplus second argument does NOT throw the "Unable to retrieve security descriptor for this frame." arity error (it returns null / ignores the extra argument), unlike the CLR-backed Platform.Request.GetFormField. Populated form values were not exercised in the GET probe; a POST request is needed to observe a non-null return. This is a distinct Core object method, not an alias of Platform.Request.GetFormField. Guard reads with a truthiness / != null check.',
        syntax: 'Request.GetFormField(name)',
        example: 'var email = Request.GetFormField("emailAddress");\nif (email) { Write(email); }',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): does NOT throw outside a send ' +
            'context — in a plain CloudPage it returns `""` (empty string, typeof "string") for any attribute ' +
            'because no recipient is bound. The bare-name `Recipient` alias is NOT available even after ' +
            'Platform.Load; use `Platform.Recipient.GetAttributeValue(...)` (or `Attribute.GetValue(...)` after load).',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified on a published CloudPage: after Platform.Load("Core", ...) the Attribute object exists and Attribute.GetValue(name) executes and returns a string — it is NOT unavailable in CloudPages. When no subscriber/attribute is in context (e.g. a plain CloudPage GET) it returns an empty string rather than throwing. In email/triggered-send/personalized contexts it returns the actual attribute value.',
        description:
            'Returns the value of the specified subscriber attribute or sendable data extension field for the current recipient. ' +
            'Preferred over Platform.Recipient.GetAttributeValue() — both methods are equivalent. ' +
            'Available in CloudPages after Platform.Load("Core", ...); returns an empty string when no recipient/attribute context is present.',
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
            'Platform.Load("Core", "1.1.1");\n' +
            'var email = Attribute.GetValue("EmailAddress");\n' +
            'Write(email);',
    },
];

export const attributeMethodNames = new Set(ATTRIBUTE_METHODS.map((m) => m.name.toLowerCase()));

// ── DateTime methods ─────────────────────────────────────────────────────────
// Short-form date-time conversion helpers on the DateTime namespace.
// Require Platform.Load("core", "1.1.5").

export const DATE_TIME_METHODS = [
    {
        name: 'SystemDateToLocalDate',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Converts a date-time value from Marketing Cloud system time (CST) to the local time of the account or user. Returns a Date object.',
        params: [
            {
                name: 'dateString',
                description: 'Date-time string in system time (CST)',
                type: 'string',
            },
        ],
        returnType: 'Date',
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the `DateTime.SystemDateToLocalDate` bare-name form behaves IDENTICALLY to ' +
            '`Platform.Function.SystemDateToLocalDate` (same value, same type). The official docs type the return as a ' +
            'string, but the runtime returns a genuine Date object: typeof "object", `Object.prototype.toString` reports ' +
            '"[object Date]", `.constructor === Date`, and `getFullYear()`/`getHours()`/`getTime()` all work (identical ' +
            'to `new Date()`). The only anomaly is that `instanceof Date` returns false, due to the engine-wide ' +
            '`instanceof`-on-builtins bug — detect via `.constructor === Date`, not `instanceof`. It coerces to an ' +
            'ISO-like string when written or stringified. SCOPE RULE: bare-name Core globals exist ONLY after ' +
            'Platform.Load("core", ...) has run — call the load first.',
        syntax: 'DateTime.SystemDateToLocalDate(dateString)',
        example:
            'Platform.Load("core", "1.1.5");\nvar localTime = DateTime.SystemDateToLocalDate(Platform.Function.Now());\nWrite(localTime);',
    },
    {
        name: 'LocalDateToSystemDate',
        minArgs: 1,
        maxArgs: 1,
        description:
            'Converts a date-time value from the local time of the account or user to Marketing Cloud system time (CST). Returns a Date object.',
        params: [
            {
                name: 'dateString',
                description: 'Date-time string in local account/user time',
                type: 'string',
            },
        ],
        returnType: 'Date',
        requiresCoreLoad: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): the `DateTime.LocalDateToSystemDate` bare-name form behaves IDENTICALLY to ' +
            '`Platform.Function.LocalDateToSystemDate` (same value, same type). The official docs type the return as a ' +
            'string, but the runtime returns a genuine Date object: typeof "object", `Object.prototype.toString` reports ' +
            '"[object Date]", `.constructor === Date`, and `getFullYear()`/`getHours()`/`getTime()` all work (identical ' +
            'to `new Date()`). The only anomaly is that `instanceof Date` returns false, due to the engine-wide ' +
            '`instanceof`-on-builtins bug — detect via `.constructor === Date`, not `instanceof`. It coerces to an ' +
            'ISO-like string when written or stringified. SCOPE RULE: bare-name Core globals exist ONLY after ' +
            'Platform.Load("core", ...) has run — call the load first.',
        syntax: 'DateTime.LocalDateToSystemDate(dateString)',
        example:
            'Platform.Load("core", "1.1.5");\nvar systemTime = DateTime.LocalDateToSystemDate("8/5/2025 12:34 PM");\nWrite(systemTime);',
    },
];

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
        deprecated: true,
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified (CloudPage): `ErrorUtil` (and its only member `ThrowWSProxyError`) is provided ' +
            'ONLY by `Platform.Load("Core", "1")`. Under any newer Core version ("1.1.1", "1.1.5", …) `ErrorUtil` ' +
            'is `undefined`, so this call throws a ReferenceError — it is effectively deprecated in Core > 1. ' +
            'A preceding `new Script.Util.WSProxy()` is NOT required to make ErrorUtil available (disproven at runtime). ' +
            'When it does throw on a real WSProxy error result, it throws a plain STRING (e.g. ' +
            '"Error: Data extension does not exist: …") — not an Error object — so the caught value has no ' +
            '`.message`/`.description` (both `undefined`); read the string itself via `String(ex)`. ' +
            'Recommended replacement (works on any Core version): inspect `result.Status` and ' +
            '`throw new Error(...)` (or handle inline) instead of calling ErrorUtil.ThrowWSProxyError.',
        description:
            'Inspects a WSProxy result object and throws when its `Status` property indicates an error. ' +
            'WSProxy methods never raise exceptions on SOAP-level errors — instead they return a result ' +
            'object whose `Status` field signals the outcome. ' +
            'DEPRECATED: only available under `Platform.Load("Core", "1")`; unavailable in newer Core versions. ' +
            'Prefer checking `result.Status` and throwing `new Error(...)` yourself.',
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
            '// Only works under Platform.Load("Core", "1"); prefer the result.Status check below.\n' +
            'Platform.Load("Core", "1");\n' +
            'var api = new Script.Util.WSProxy();\n' +
            'var customerKey = "0b744ffa-bab5-458d-9e7d-fb05a7873380";\n' +
            'try {\n' +
            '    var result = api.retrieve(\n' +
            '        "DataExtensionObject[" + customerKey + "]",\n' +
            '        ["FirstName", "LastName", "EmailAddress"]\n' +
            '    );\n' +
            '    // Preferred, version-independent replacement:\n' +
            '    if (String(result.Status).indexOf("Error") === 0) {\n' +
            '        throw new Error(String(result.Status));\n' +
            '    }\n' +
            '    // process successful results\n' +
            '} catch (ex) {\n' +
            '    Write(String(ex));\n' +
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
        isConfirmed: true,
    },
    {
        name: 'HttpRequest',
        minArgs: 1,
        maxArgs: 1,
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
        description:
            'Executes the HTTP request and returns a Script.Util.HttpResponse object. ' +
            'The response object has a `statusCode` property and a `content` property. ' +
            'Use String(resp.content) to convert the CLR content to a JavaScript string before parsing with Platform.Function.ParseJSON().',
        params: [],
        returnType: 'HttpResponseInstance',
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
        isConfirmed: true,
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
        isConfirmed: true,
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
        isConfirmed: true,
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

// ── Script.Util.HttpRequest writable instance properties ────────────────────
// Configurable properties on the object returned by `new Script.Util.HttpRequest(url)`.
// Source: ssjs.guide/http/script-util-httprequest.md (HttpRequestInstance Properties).
// These are writable (req.method = "POST"), so the generator emits them as plain
// (non-readonly) class members.

/**
 * Writable config properties on the object returned by `new Script.Util.HttpRequest(url)`.
 *
 * `isConfirmed` marks a property whose runtime type/behaviour was validated with a
 * live CloudPage test (see docs/joern/http-introspection-*). `differsFromOfficialDocs`
 * flags an entry that contradicts the official Salesforce docs; `officialDocsNote`
 * describes that discrepancy in one sentence for rendering on ssjs.guide.
 *
 * `valueConstraint` (optional) describes the allowed literal values for the property so
 * tooling (LSP diagnostics, eslint-plugin-sfmc) can flag invalid assignments. Shapes:
 * `{ enum: [...] }` — value must be one of the listed literals (case-sensitive strings);
 * `{ numeric: 'integer' | 'number', min?: number }` — value must be a number of that kind
 * (integer = whole number), optionally >= `min`. `enumLabels` (optional) maps each enum
 * value to a short human-readable meaning used in quick-fix titles (e.g. `0` -> "continue").
 *
 * @type {{name: string, type: string, description: string, isConfirmed?: boolean, differsFromOfficialDocs?: boolean, officialDocsNote?: string, valueConstraint?: {enum?: (string|number)[], enumLabels?: Object.<string, string>, numeric?: 'integer'|'number', min?: number}}[]}
 */
export const SCRIPT_UTIL_REQUEST_PROPERTIES = [
    {
        name: 'method',
        type: 'string',
        description: 'HTTP method (GET, POST, PUT, PATCH, DELETE).',
        isConfirmed: true,
        valueConstraint: { enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    },
    {
        name: 'contentType',
        type: 'string',
        description: 'Content-Type header for the request body, e.g. "application/json".',
        isConfirmed: true,
    },
    {
        name: 'encoding',
        type: 'string',
        description: 'Character encoding (default "UTF-8").',
        isConfirmed: true,
    },
    {
        name: 'timeout',
        type: 'number',
        description: 'Timeout in milliseconds (default 30000).',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Not listed as a configuration property in the official docs (which only mention that send() times out after 30 seconds), but the property exists and is applied at runtime.',
        valueConstraint: { numeric: 'integer', min: 0 },
    },
    {
        name: 'postData',
        type: 'string',
        description: 'Request body for POST/PUT/PATCH requests.',
        isConfirmed: true,
    },
    {
        name: 'emptyContentHandling',
        type: 'number',
        description:
            'What to do when the request returns no content: 0 = continue, 1 = stop, 2 = continue to next subscriber (email sends only).',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official docs type this as a boolean, but the runtime accepts only a numeric value (0/1/2) and rejects true/false — identical to Script.Util.HttpGet.',
        valueConstraint: {
            enum: [0, 1, 2],
            enumLabels: {
                0: 'continue',
                1: 'stop',
                2: 'continue to next subscriber - email sends only',
            },
        },
    },
    {
        name: 'retries',
        type: 'number',
        description: 'Number of times to retry the request before throwing (default 1).',
        isConfirmed: true,
        valueConstraint: { numeric: 'integer', min: 0 },
    },
    {
        name: 'continueOnError',
        type: 'boolean',
        description: 'If true, continues after a non-fatal error instead of throwing.',
        isConfirmed: true,
    },
];

// ── Script.Util.HttpGet writable instance properties ────────────────────────
// Configurable properties on the object returned by `new Script.Util.HttpGet(url)`.
// Source: ssjs.guide/http/script-util-httpget.md (HttpGetInstance Properties).
// HttpGet exposes a smaller property set than HttpRequest, and its
// `emptyContentHandling` is a numeric mode (0/1/2) rather than a boolean.

/** @type {{name: string, type: string, description: string, isConfirmed?: boolean, differsFromOfficialDocs?: boolean, officialDocsNote?: string, valueConstraint?: {enum?: (string|number)[], enumLabels?: Object.<string, string>, numeric?: 'integer'|'number', min?: number}}[]} */
export const SCRIPT_UTIL_HTTPGET_PROPERTIES = [
    {
        name: 'retries',
        type: 'number',
        description: 'Number of retry attempts on failure (default 1).',
        isConfirmed: true,
        valueConstraint: { numeric: 'integer', min: 0 },
    },
    {
        name: 'continueOnError',
        type: 'boolean',
        description: 'If true, does not throw on an HTTP error status.',
        isConfirmed: true,
    },
    {
        name: 'emptyContentHandling',
        type: 'number',
        description:
            'What to do when the GET returns no content: 0 = continue, 1 = stop, 2 = continue to next subscriber (email sends only).',
        isConfirmed: true,
        valueConstraint: {
            enum: [0, 1, 2],
            enumLabels: {
                0: 'continue',
                1: 'stop',
                2: 'continue to next subscriber - email sends only',
            },
        },
    },
    {
        name: 'timeout',
        type: 'number',
        description: 'Timeout in milliseconds (default 30000).',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Not listed in the official docs, but the property exists and is applied end-to-end at runtime (same behaviour as on Script.Util.HttpRequest).',
        valueConstraint: { numeric: 'integer', min: 0 },
    },
];

// ── Script.Util HTTP response instance properties ───────────────────────────
// Read-only properties on the object returned by `<HttpRequestInstance>.send()`.
// Identical for HttpRequest and HttpGet. Source: ssjs.guide HttpResponseInstance.

/** @type {{name: string, type: string, description: string, isConfirmed?: boolean, differsFromOfficialDocs?: boolean, officialDocsNote?: string}[]} */
export const SCRIPT_UTIL_RESPONSE_PROPERTIES = [
    {
        name: 'content',
        type: 'any',
        description: 'Response body as a CLR string — wrap with String() before use.',
        isConfirmed: true,
    },
    {
        name: 'contentType',
        type: 'string',
        description: 'Content type returned in the response.',
        isConfirmed: true,
    },
    {
        name: 'encoding',
        type: 'string',
        description: 'Encoding type returned in the response.',
        isConfirmed: true,
    },
    {
        name: 'headers',
        type: 'object',
        description:
            'Response headers as a CLR object. Direct access (headers["X"], .Get(), .Item(), String(headers[key])) throws "Use of CLR is not allowed". To read values, enumerate with for..in: each key is the string "Name, Value" (wrapped in [ ]) — strip the brackets and split on the first ", " to build a plain header map.',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'The official example reads a single header via headers["..."], but that access throws at runtime. Individual values are only readable by parsing the for..in enumeration keys (shaped "[Name, Value]"), not by indexing.',
    },
    {
        name: 'returnStatus',
        type: 'number',
        description:
            'Status value: 0 = OK, 1 = empty URL, 2 = call failed, 3 = succeeded with empty content.',
        isConfirmed: true,
    },
    { name: 'statusCode', type: 'number', description: 'HTTP status code.', isConfirmed: true },
];

// ── WSProxy result object shape ─────────────────────────────────────────────
// Shape of the object returned by the CRUD/retrieve/execute methods on a
// `new Script.Util.WSProxy()` instance. Source: ssjs.guide/wsproxy/*.md
// (Return Value sections are consistent across createItem, retrieve, execute, …).

/** @type {{name: string, type: string, optional?: boolean, description: string}[]} */
export const WSPROXY_RESULT_PROPERTIES = [
    {
        name: 'Status',
        type: 'string',
        description: 'Overall result status: "OK" or "Error".',
    },
    { name: 'RequestID', type: 'string', description: 'Server-assigned request identifier.' },
    {
        name: 'Results',
        type: 'WspResult[]',
        description: 'Array of per-object result entries (or retrieved rows for retrieve()).',
    },
    {
        name: 'HasMoreRows',
        type: 'boolean',
        optional: true,
        description:
            'For retrieve()/getNextBatch(): true when more rows exist — call getNextBatch() with RequestID.',
    },
    {
        name: 'StatusMessage',
        type: 'string',
        optional: true,
        description: 'Human-readable status message when present.',
    },
];

// ── WSProxy per-item result entry shape ─────────────────────────────────────
// Shape of each entry in the `Results` array returned by the CRUD/perform
// methods (createItem/createBatch/updateItem/updateBatch/deleteItem/deleteBatch/
// performItem/performBatch). Runtime-proven on live CloudPages. For retrieve()/
// getNextBatch(), `Results` instead holds retrieved rows, so entries are typed as
// `WspResult` loosely (extra row fields are permitted via the index signature).
// Emitted in the generated .d.ts as `interface WspResult`.

/** @type {{name: string, type: string, optional?: boolean, description: string}[]} */
export const WSP_RESULT_ENTRY_PROPERTIES = [
    {
        name: 'StatusCode',
        type: 'string',
        optional: true,
        description: 'Per-item status: "OK" or "Error".',
    },
    {
        name: 'StatusMessage',
        type: 'string',
        optional: true,
        description: 'Per-item human-readable status message.',
    },
    {
        name: 'OrdinalID',
        type: 'number',
        optional: true,
        description: 'Zero-based index of the input item this entry corresponds to.',
    },
    {
        name: 'ErrorCode',
        type: 'string',
        optional: true,
        description: 'Error code when the item failed; absent/empty on success.',
    },
    {
        name: 'NewID',
        type: 'number',
        optional: true,
        description: 'Server-assigned ID of a newly created object, when applicable.',
    },
    {
        name: 'Object',
        type: 'object',
        optional: true,
        description: 'Wrapper carrying the affected object as returned by the API.',
    },
    {
        name: 'Task',
        type: 'object',
        optional: true,
        description:
            'perform-only: async task descriptor (carries InteractionObjectID). Present for performItem()/performBatch().',
    },
];

// ── ECMAScript 3/5 built-in methods available in SSJS ───────────────────────
// Methods from native JavaScript prototypes that work in the SFMC legacy engine.
// Note: Array.prototype.indexOf, splice, and lastIndexOf exist but are broken;
// use the polyfills from POLYFILLABLE_METHODS for correct behaviour.

/**
 * ECMAScript built-in methods/properties confirmed to work in SFMC SSJS.
 *
 * `esVersion` records the ECMAScript edition that standardized the member
 * (3 = ES3, 5 = ES5). It is documentation-only metadata surfaced on ssjs.guide
 * and is NOT consumed for IntelliSense, validation, or any LSP/MCP/VSCE logic.
 *
 * `caveat` documents a confirmed SFMC-engine limitation for members that work in
 * common forms but fail (throw or return wrong results) in specific edge cases.
 * It is surfaced on hover/ssjs.guide so callers avoid the broken form. The member
 * stays in the allowlist because its primary documented usage works.
 *
 * @type {{name: string, owner: string, esVersion: 3 | 5, isStatic?: boolean, isProperty?: boolean, description: string, caveat?: string, params?: {name: string, description: string, type?: string, optional?: boolean}[], returnType?: string, syntax?: string, minArgs?: number, maxArgs?: number, example?: string}[]}
 */
export const ECMASCRIPT_BUILTINS = [
    // ── Array.prototype ──────────────────────────────────────────────────────
    {
        name: 'join',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
        description: 'Removes and returns the last element from an array.',
        params: [],
        returnType: 'any',
        syntax: 'Array.pop()',
        example: 'var arr = [1, 2, 3];\nvar last = arr.pop(); // 3',
    },
    {
        name: 'shift',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Removes and returns the first element from an array.',
        params: [],
        returnType: 'any',
        syntax: 'Array.shift()',
        example: 'var arr = [1, 2, 3];\nvar first = arr.shift(); // 1',
    },
    {
        name: 'unshift',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies arr.slice() with no arguments returns a shallow copy of the whole array. In the SFMC SSJS engine the no-argument form throws "Index was outside the bounds of the array."; pass an explicit start index (arr.slice(0)) instead. Positive and negative indices otherwise behave per spec.',
        esVersion: 3,
        description: 'Returns a shallow copy of a portion of an array.',
        caveat: 'The no-argument form arr.slice() throws in the SFMC engine. Always pass at least a start index, e.g. arr.slice(0), to copy the whole array.',
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies arr.sort() with no comparator sorts elements as strings. In the SFMC SSJS engine the no-argument form throws "Failed to compare two elements in the array."; always pass an explicit compare function. A supplied comparator otherwise sorts per spec.',
        esVersion: 3,
        description: 'Sorts the array in place and returns it. Default sort is lexicographic.',
        caveat: 'The no-argument form arr.sort() throws in the SFMC engine. Always pass an explicit compare function, e.g. arr.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; }).',
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
        isConfirmed: true,
        esVersion: 3,
        description: 'Reverses the elements of an array in place.',
        params: [],
        returnType: 'array',
        syntax: 'Array.reverse()',
        example: 'var arr = [1, 2, 3];\narr.reverse(); // [3, 2, 1]',
    },
    {
        name: 'length',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the number of elements in the array.',
        params: [],
        returnType: 'number',
        syntax: 'Array.length',
        example: 'var arr = [1, 2, 3];\nWrite(arr.length); // 3',
    },
    {
        name: 'toLocaleString',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns a string representing the array elements, joined by a locale-specific separator.',
        params: [],
        returnType: 'string',
        syntax: 'Array.toLocaleString()',
        example: 'var arr = [1, 2, 3];\nWrite(arr.toLocaleString()); // "1,2,3"',
    },
    // ── String.prototype ─────────────────────────────────────────────────────
    {
        name: 'charAt',
        owner: 'String.prototype',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies str.charAt(index) returns an empty string when index is out of range. In the SFMC Jint engine an out-of-range index returns the LAST character instead of "" (e.g. "abc".charAt(99) returns "c"). Guard the index against str.length before calling.',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the character at the specified index.',
        caveat: 'Out-of-range indices are broken in the SFMC engine: instead of the spec-mandated empty string "", str.charAt(i) for i >= str.length returns the LAST character of the string (e.g. "Hello".charAt(99) returns "o"). Guard the index against str.length before calling. Bracket access str[i] for an out-of-range index throws "Index was outside the bounds of the array" rather than returning undefined.',
        params: [{ name: 'index', description: 'Zero-based character index', type: 'number' }],
        returnType: 'string',
        syntax: 'String.charAt(index)',
        example: 'var str = "Hello";\nWrite(str.charAt(1)); // "e"',
    },
    {
        name: 'charCodeAt',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the UTF-16 code unit at the specified index.',
        params: [{ name: 'index', description: 'Zero-based character index', type: 'number' }],
        returnType: 'number',
        syntax: 'String.charCodeAt(index)',
        example: 'var str = "A";\nWrite(str.charCodeAt(0)); // 65',
    },
    {
        name: 'indexOf',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies str.match(regex) returns null when there is no match, and match objects carry an .index property. In the SFMC Jint engine a no-match returns an empty array [] (not null), and returned matches expose no .index. Test result.length rather than comparing against null.',
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies str.search(regex) returns -1 when there is no match. In the SFMC Jint engine a no-match returns 0 (not -1) and some real matches return the wrong index, so search is unreliable for locating substrings. Use indexOf or a match-based approach instead.',
        esVersion: 3,
        description: 'Searches for a match and returns the index of the first match, or -1.',
        caveat: 'String.search is unreliable in the SFMC engine: a no-match returns 0 instead of the spec-mandated -1, and some real matches return the wrong index (observed returning 0 or -1 where the match is elsewhere). Use String.match or RegExp.test to detect a match, or apply the search polyfill.',
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
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies str.split("") splits a string into an array of its individual characters. In the SFMC Jint engine the empty-separator form does NOT split into characters ("abc".split("") returns ["abc"]). Split on a real separator, or iterate with charAt for per-character access.',
        esVersion: 3,
        description: 'Splits a string into an array of substrings using a separator.',
        caveat: 'The empty-separator form str.split("") does NOT split into characters in the SFMC engine (it returns the whole string as a single element). To get characters, loop with charAt.',
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
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the string converted to lowercase.',
        params: [],
        returnType: 'string',
        syntax: 'String.toLowerCase()',
        example: 'var str = "Hello World";\nWrite(str.toLowerCase()); // "hello world"',
    },
    {
        name: 'toLocaleLowerCase',
        owner: 'String.prototype',
        esVersion: 3,
        description:
            'Returns the string converted to lowercase. Runtime-verified in SFMC; it behaves like toLowerCase() (locale mappings are not applied).',
        params: [],
        returnType: 'string',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        caveat: 'The locale argument is ignored — it behaves exactly like toLowerCase(). "ABC".toLocaleLowerCase() returns "abc" with no locale-specific casing.',
        officialDocsNote:
            'Runtime-verified: "ABC".toLocaleLowerCase() === "abc". The SFMC Jint engine applies no locale-specific mappings, so this is a plain toLowerCase() alias rather than the locale-aware method the spec describes.',
        syntax: 'String.toLocaleLowerCase()',
        example: 'var str = "AbC";\nWrite(str.toLocaleLowerCase()); // "abc"',
    },
    {
        name: 'toLocaleUpperCase',
        owner: 'String.prototype',
        esVersion: 3,
        description:
            'Returns the string converted to uppercase. Runtime-verified in SFMC; it behaves like toUpperCase() (locale mappings are not applied).',
        params: [],
        returnType: 'string',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        caveat: 'The locale argument is ignored — it behaves exactly like toUpperCase(). "abc".toLocaleUpperCase() returns "ABC" with no locale-specific casing.',
        officialDocsNote:
            'Runtime-verified: "abc".toLocaleUpperCase() === "ABC". The SFMC Jint engine applies no locale-specific mappings, so this is a plain toUpperCase() alias rather than the locale-aware method the spec describes.',
        syntax: 'String.toLocaleUpperCase()',
        example: 'var str = "abc";\nWrite(str.toLocaleUpperCase()); // "ABC"',
    },
    {
        name: 'toUpperCase',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the string converted to uppercase.',
        params: [],
        returnType: 'string',
        syntax: 'String.toUpperCase()',
        example: 'var str = "Hello World";\nWrite(str.toUpperCase()); // "HELLO WORLD"',
    },
    {
        name: 'concat',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 3,
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
        name: 'localeCompare',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Compares this string with another and returns a negative number if it sorts before, a positive number if it sorts after, or 0 if they are equivalent.',
        params: [
            { name: 'compareString', description: 'The string to compare against', type: 'string' },
        ],
        returnType: 'number',
        syntax: 'String.localeCompare(compareString)',
        example: "Write('a'.localeCompare('b')); // -1",
    },
    {
        name: 'length',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the absolute value of a number.',
        params: [{ name: 'x', description: 'A number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.abs(x)',
        example: 'Write(Math.abs(-5)); // 5',
    },
    {
        name: 'ceil',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Rounds a number up to the next integer.',
        params: [{ name: 'x', description: 'A number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.ceil(x)',
        example: 'Write(Math.ceil(4.1)); // 5',
    },
    {
        name: 'floor',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Rounds a number down to the nearest integer.',
        params: [{ name: 'x', description: 'A number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.floor(x)',
        example: 'Write(Math.floor(4.9)); // 4',
    },
    {
        name: 'max',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the largest of the supplied numbers.',
        caveat: 'The variadic form throws in the SFMC engine when passed 3+ arguments, and the no-argument Math.max() returns 0 instead of -Infinity. Compare two values at a time, e.g. Math.max(Math.max(a, b), c), or fold with a loop.',
        params: [{ name: 'values', description: 'Numbers to compare (variadic)', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.max(value1[, value2, ...])',
        example: 'Write(Math.max(1, 5)); // 5',
    },
    {
        name: 'min',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the smallest of the supplied numbers.',
        caveat: 'The variadic form throws in the SFMC engine when passed 3+ arguments, and the no-argument Math.min() returns 0 instead of +Infinity. Compare two values at a time, e.g. Math.min(Math.min(a, b), c), or fold with a loop.',
        params: [{ name: 'values', description: 'Numbers to compare (variadic)', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.min(value1[, value2, ...])',
        example: 'Write(Math.min(1, 5)); // 1',
    },
    {
        name: 'pow',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns a pseudo-random floating-point number in [0, 1).',
        params: [],
        returnType: 'number',
        syntax: 'Math.random()',
        example: 'var r = Math.random();\nWrite(Math.floor(r * 100)); // random 0–99',
    },
    {
        name: 'round',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Rounds a number to the nearest integer.',
        params: [{ name: 'x', description: 'A number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.round(x)',
        example: 'Write(Math.round(4.5)); // 5',
    },
    {
        name: 'sqrt',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the square root of a number.',
        params: [{ name: 'x', description: 'A non-negative number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.sqrt(x)',
        example: 'Write(Math.sqrt(16)); // 4',
    },
    {
        name: 'sin',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the sine of an angle given in radians.',
        params: [{ name: 'x', description: 'Angle in radians', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.sin(x)',
        example: 'Write(Math.sin(Math.PI / 2)); // 1',
    },
    {
        name: 'cos',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the cosine of an angle given in radians.',
        params: [{ name: 'x', description: 'Angle in radians', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.cos(x)',
        example: 'Write(Math.cos(0)); // 1',
    },
    {
        name: 'tan',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the tangent of an angle given in radians.',
        params: [{ name: 'x', description: 'Angle in radians', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.tan(x)',
        example: 'Write(Math.tan(Math.PI / 4)); // ~1',
    },
    {
        name: 'asin',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the arc sine (in radians) of a number in the range [-1, 1].',
        params: [{ name: 'x', description: 'A number between -1 and 1', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.asin(x)',
        example: 'Write(Math.asin(1)); // ~1.5708 (π/2)',
    },
    {
        name: 'acos',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the arc cosine (in radians) of a number in the range [-1, 1].',
        params: [{ name: 'x', description: 'A number between -1 and 1', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.acos(x)',
        example: 'Write(Math.acos(1)); // 0',
    },
    {
        name: 'atan',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the arc tangent (in radians) of a number.',
        params: [{ name: 'x', description: 'A number', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.atan(x)',
        example: 'Write(Math.atan(1)); // ~0.7854 (π/4)',
    },
    {
        name: 'atan2',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns e raised to the power of x (e^x).',
        params: [{ name: 'x', description: 'The exponent', type: 'number' }],
        returnType: 'number',
        syntax: 'Math.exp(x)',
        example: 'Write(Math.exp(1)); // ~2.71828 (e)',
    },
    {
        name: 'log',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
        description: "The ratio of a circle's circumference to its diameter (~3.14159).",
        params: [],
        returnType: 'number',
        syntax: 'Math.PI',
        example: 'var area = Math.PI * r * r;',
    },
    {
        name: 'E',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: "Euler's number, the base of the natural logarithm (~2.71828).",
        params: [],
        returnType: 'number',
        syntax: 'Math.E',
        example: 'Write(Math.E); // ~2.71828',
    },
    {
        name: 'LN2',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'The natural logarithm of 2 (~0.69315).',
        params: [],
        returnType: 'number',
        syntax: 'Math.LN2',
        example: 'Write(Math.LN2); // ~0.693',
    },
    {
        name: 'LN10',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'The natural logarithm of 10 (~2.30259).',
        params: [],
        returnType: 'number',
        syntax: 'Math.LN10',
        example: 'Write(Math.LN10); // ~2.303',
    },
    {
        name: 'LOG2E',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'The base-2 logarithm of e (~1.44270).',
        params: [],
        returnType: 'number',
        syntax: 'Math.LOG2E',
        example: 'Write(Math.LOG2E); // ~1.443',
    },
    {
        name: 'SQRT2',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
        description: 'The square root of 2 (~1.41421).',
        params: [],
        returnType: 'number',
        syntax: 'Math.SQRT2',
        example: 'Write(Math.SQRT2); // ~1.414',
    },
    {
        name: 'SQRT1_2',
        owner: 'Math',
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies toExponential() with no argument uses the minimal number of significand digits needed. In the SFMC Jint engine the no-argument form pads the significand with trailing zeros (e.g. (3.14159).toExponential() returns "3.1415900000000000e+0"). Always pass an explicit fractionDigits count.',
        esVersion: 3,
        description:
            'Returns a string representing the number in exponential notation. ' +
            'When fractionDigits is omitted the SFMC Jint engine pads the significand with trailing zeros ' +
            '(e.g. (3.14159).toExponential() → "3.1415900000000000e+0") instead of the minimal form standard JS produces. ' +
            'Always pass an explicit fractionDigits argument for predictable output.',
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
        isConfirmed: true,
        esVersion: 3,
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
    {
        name: 'toString',
        owner: 'Number.prototype',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies Number.prototype.toString(radix) accepts any radix from 2 to 36. In the SFMC Jint engine only radixes 2, 8, 10, and 16 work; any other base throws "Invalid Base." (e.g. (35).toString(36)). Fractional values are also truncated to their integer part before non-decimal conversion ((3.5).toString(2) returns "100", not "11.1").',
        esVersion: 3,
        description:
            'Returns a string representing the number. In the SFMC Jint engine the optional radix only supports 2, 8, 10, and 16 — any other base throws "Invalid Base." (standard JS supports 2–36). Fractional values are truncated to their integer part before non-decimal conversion.',
        params: [
            {
                name: 'radix',
                description:
                    'Base for the conversion. SFMC only accepts 2, 8, 10, or 16; other values throw "Invalid Base."',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'string',
        syntax: 'Number.toString([radix])',
        example:
            'Write((255).toString(16)); // "ff"\nWrite((255).toString(2)); // "11111111"\n// (35).toString(36) throws "Invalid Base." in SFMC',
    },
    {
        name: 'valueOf',
        owner: 'Number.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the primitive number value of a Number object.',
        params: [],
        returnType: 'number',
        syntax: 'Number.valueOf()',
        example: 'Write((42).valueOf()); // 42',
    },
    {
        name: 'toLocaleString',
        owner: 'Number.prototype',
        esVersion: 3,
        description:
            'Returns a string representation of the number. Runtime-verified in SFMC: the locale argument is ignored and no grouping separators are applied — it behaves like a plain toString(). Use Platform.Function.FormatNumber for real locale formatting.',
        caveat: 'The locale argument is ignored — (123456.789).toLocaleString("de-DE") returns "123456.789", not the grouped "123.456,789".',
        params: [
            { name: 'locales', description: 'Ignored in SFMC', type: 'string', optional: true },
            { name: 'options', description: 'Ignored in SFMC', type: 'object', optional: true },
        ],
        returnType: 'string',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: MDN specifies locale-aware formatting with grouping separators; the SFMC Jint engine ignores the locale/options arguments and returns the plain number string (no grouping).',
        syntax: 'Number.toLocaleString([locales[, options]])',
        example: 'Write((123456.789).toLocaleString("de-DE")); // "123456.789" (locale ignored)',
    },
    // ── Number static constants (ES3) — present but buggy in the SFMC Jint engine ──
    {
        name: 'MAX_VALUE',
        owner: 'Number',
        esVersion: 3,
        isStatic: true,
        isProperty: true,
        description:
            'The largest positive finite value representable by a Number. Runtime-verified present in SFMC (typeof number). The value is correct (~1.7976931348623157e308) but note the sibling constants MIN_VALUE and the INFINITY constants are broken in this engine.',
        params: [],
        returnType: 'number',
        isConfirmed: true,
        syntax: 'Number.MAX_VALUE',
        example: 'Write(Number.MAX_VALUE > 0); // true',
    },
    {
        name: 'MIN_VALUE',
        owner: 'Number',
        esVersion: 3,
        isStatic: true,
        isProperty: true,
        description:
            'Standard ES3 exposes the smallest positive representable Number (~5e-324). Runtime-verified present in SFMC (typeof number) but WRONG: the SFMC Jint engine returns the negative of MAX_VALUE (-1.7976931348623157e308) instead, so Number.MIN_VALUE > 0 is false. Use the literal 5e-324 if you need the true smallest positive value.',
        caveat: 'Broken in SFMC: Number.MIN_VALUE returns -MAX_VALUE (a large negative number), not the ES3 smallest-positive value 5e-324. Number.MIN_VALUE > 0 is false. Use the literal 5e-324.',
        params: [],
        returnType: 'number',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: MDN/ES3 define Number.MIN_VALUE as the smallest positive value (~5e-324); the SFMC Jint engine instead returns -Number.MAX_VALUE, so it is negative and MIN_VALUE > 0 evaluates to false.',
        syntax: 'Number.MIN_VALUE',
        example: 'Write(Number.MIN_VALUE > 0); // false (returns -MAX_VALUE in SFMC)',
    },
    {
        name: 'NaN',
        owner: 'Number',
        esVersion: 3,
        isStatic: true,
        isProperty: true,
        description:
            'The Not-a-Number value. Runtime-verified present in SFMC (typeof number); NaN !== NaN holds as expected. Note it stringifies as lowercase "nan" (not "NaN") in this engine.',
        caveat: 'Stringifies as lowercase "nan" in SFMC (String(Number.NaN) === "nan"), unlike the standard "NaN". The value still compares as not-equal to itself.',
        params: [],
        returnType: 'number',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: the value is present and behaves as NaN for comparisons, but String(Number.NaN) yields lowercase "nan" instead of the standard "NaN".',
        syntax: 'Number.NaN',
        example: 'Write(Number.NaN !== Number.NaN); // true',
    },
    {
        name: 'POSITIVE_INFINITY',
        owner: 'Number',
        esVersion: 3,
        isStatic: true,
        isProperty: true,
        description:
            'Standard ES3 exposes positive infinity. Runtime-verified present in SFMC (typeof number) but BROKEN: it stringifies as "-infinity" and Number.POSITIVE_INFINITY > 0 is false. The global Infinity is equally unreliable in this engine.',
        caveat: 'Broken in SFMC: Number.POSITIVE_INFINITY stringifies as "-infinity" and Number.POSITIVE_INFINITY > 0 is false (sign inverted). Avoid infinity constants; guard with explicit finite bounds instead.',
        params: [],
        returnType: 'number',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: MDN defines this as +Infinity; the SFMC Jint engine returns a value that stringifies as "-infinity" and for which > 0 is false (sign inverted). The global Infinity is likewise unreliable.',
        syntax: 'Number.POSITIVE_INFINITY',
        example: 'Write(Number.POSITIVE_INFINITY > 0); // false (sign inverted in SFMC)',
    },
    {
        name: 'NEGATIVE_INFINITY',
        owner: 'Number',
        esVersion: 3,
        isStatic: true,
        isProperty: true,
        description:
            'Standard ES3 exposes negative infinity. Runtime-verified present in SFMC (typeof number) but BROKEN: it stringifies as "infinity" and Number.NEGATIVE_INFINITY < 0 is false (sign inverted).',
        caveat: 'Broken in SFMC: Number.NEGATIVE_INFINITY stringifies as "infinity" and Number.NEGATIVE_INFINITY < 0 is false (sign inverted). Avoid infinity constants; guard with explicit finite bounds instead.',
        params: [],
        returnType: 'number',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: MDN defines this as -Infinity; the SFMC Jint engine returns a value that stringifies as "infinity" and for which < 0 is false (sign inverted).',
        syntax: 'Number.NEGATIVE_INFINITY',
        example: 'Write(Number.NEGATIVE_INFINITY < 0); // false (sign inverted in SFMC)',
    },
    // ── Object.prototype ─────────────────────────────────────────────────────
    {
        name: 'hasOwnProperty',
        owner: 'Object.prototype',
        isConfirmed: true,
        esVersion: 3,
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
    {
        name: 'toString',
        owner: 'Object.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns a string representation of the object. For a plain object it returns "[object Object]". ' +
            'Object.prototype.toString.call(value) is the standard type-tag test (e.g. "[object Array]").',
        params: [],
        returnType: 'string',
        syntax: 'Object.toString()',
        example:
            'var obj = {a: 1};\n' +
            'Write(obj.toString()); // "[object Object]"\n' +
            'Write(Object.prototype.toString.call([])); // "[object Array]"',
    },
    {
        name: 'valueOf',
        owner: 'Object.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns the primitive value of the object. For a plain object it returns the object itself.',
        params: [],
        returnType: 'object',
        syntax: 'Object.valueOf()',
        example: 'var obj = {a: 1};\nWrite(obj.valueOf() === obj); // true',
    },
    // ── Global functions ─────────────────────────────────────────────────────
    {
        name: 'parseInt',
        owner: 'Global',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies the global parseInt(str[, radix]) parses the leading numeric portion and ignores trailing non-numeric characters (parseInt("10px", 10) is 10). In the SFMC Jint engine a string with trailing non-numeric characters returns NaN (parseInt("10px", 10) is NaN). Radix parsing otherwise follows the spec. Strip non-digits before parsing.',
        esVersion: 3,
        description:
            'Parses a string and returns an integer in the specified radix (base). ' +
            'Leading whitespace is ignored. Returns NaN if no valid integer is found. ' +
            'Always specify a radix to avoid octal/hex ambiguity.',
        caveat: 'Unlike the spec, the SFMC engine returns NaN when the string has trailing non-numeric characters (e.g. parseInt("10px", 10) is NaN, not 10). Strip non-digits before parsing.',
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
            'Write(parseInt("abc", 10)); // NaN\n' +
            'Write(parseInt("10px", 10)); // NaN in SFMC (spec would give 10)',
    },
    {
        name: 'parseFloat',
        owner: 'Global',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies the global parseFloat(str) parses the leading numeric portion and ignores trailing non-numeric characters. In the SFMC Jint engine a string with trailing non-numeric characters returns NaN (parseFloat("1.5kg") is NaN), and results use 32-bit precision (parseFloat("3.14") is 3.14000010490417, so parseFloat("3.14") === 3.14 is false). Compare parsed floats with a tolerance, never with ===.',
        esVersion: 3,
        description:
            'Parses a string and returns a floating-point number. ' +
            'Stops parsing at the first character that is not part of a valid number. ' +
            'Returns NaN if no valid number is found.',
        caveat: 'Unlike the spec, the SFMC engine returns NaN when the string has trailing non-numeric characters (e.g. parseFloat("1.5kg") is NaN, not 1.5). Also note the returned value uses 32-bit float precision (parseFloat("3.14") === 3.14 is false); compare with a tolerance.',
        params: [{ name: 'string', description: 'The string to parse', type: 'string' }],
        returnType: 'number',
        syntax: 'parseFloat(string)',
        example:
            'Write(parseFloat("3.14")); // 3.14 (32-bit precision)\n' +
            'Write(parseFloat("abc")); // NaN\n' +
            'Write(parseFloat("1.5kg")); // NaN in SFMC (spec would give 1.5)',
    },
    {
        name: 'isNaN',
        owner: 'Global',
        isConfirmed: true,
        esVersion: 3,
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
        isConfirmed: true,
        esVersion: 3,
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
    {
        name: 'eval',
        owner: 'Global',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Parses a string of JavaScript source and executes it as a script, returning the completion ' +
            'value of the last evaluated expression (or undefined when there is nothing to complete). A ' +
            'non-string argument is returned unchanged. Runtime-verified to work in SFMC SSJS: direct eval ' +
            'sees the surrounding local scope, and bare-name Core globals loaded via Platform.Load are ' +
            'visible inside the evaluated string. Use sparingly — it runs arbitrary code and is a common ' +
            'injection risk; prefer Platform.Function.ParseJSON for parsing data.',
        params: [
            {
                name: 'script',
                description: 'A string of JavaScript source to evaluate',
                type: 'string',
            },
        ],
        returnType: 'any',
        syntax: 'eval(script)',
        example:
            'Write(eval("1 + 1")); // 2\n' +
            'var x = 5;\nWrite(eval("x + 10")); // 15\n' +
            'Platform.Load("core","1.1.5");\nWrite(eval("Stringify({a:1})")); // {"a":1}',
    },
    // ── Global URI functions ──────────────────────────────────────────────────
    // Runtime-verified on ssjs/MCDEV_Training_QA: present and callable, but the
    // Jint engine encodes like application/x-www-form-urlencoded (space -> +,
    // lowercase hex) rather than RFC 3986.
    {
        name: 'encodeURI',
        owner: 'Global',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Encodes a complete URI, leaving reserved characters (/ ? : @ & = + $ #) intact. ' +
            'Runtime-verified to work in SFMC SSJS, but the Jint engine encodes a space as "+" ' +
            '(not "%20") and emits lowercase hex escapes.',
        caveat:
            'Space is encoded as "+" instead of "%20", and percent-escapes use lowercase hex, ' +
            'unlike the ECMAScript spec.',
        params: [{ name: 'uri', description: 'The URI string to encode', type: 'string' }],
        returnType: 'string',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: MDN specifies encodeURI encodes a space as "%20" with uppercase hex; ' +
            'the SFMC Jint engine encodes a space as "+" and emits lowercase hex escapes.',
        syntax: 'encodeURI(uri)',
        example: 'Write(encodeURI("a b/c?d=1")); // "a+b/c?d=1" in SFMC (spec: "a%20b/c?d=1")',
    },
    {
        name: 'encodeURIComponent',
        owner: 'Global',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Encodes a URI component, escaping reserved characters as well. Runtime-verified to ' +
            'work in SFMC SSJS, but the Jint engine encodes a space as "+" (not "%20") and emits ' +
            'lowercase hex escapes (e.g. "/" becomes "%2f", not "%2F").',
        caveat: 'Space -> "+" and lowercase hex (e.g. "/" -> "%2f") instead of the spec\'s "%20" / "%2F".',
        params: [{ name: 'str', description: 'The component string to encode', type: 'string' }],
        returnType: 'string',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: MDN specifies a space encodes as "%20" with uppercase hex; the SFMC ' +
            'Jint engine encodes a space as "+" and emits lowercase hex (e.g. "/" -> "%2f").',
        syntax: 'encodeURIComponent(str)',
        example: 'Write(encodeURIComponent("a b/c")); // "a+b%2fc" in SFMC (spec: "a%20b%2Fc")',
    },
    {
        name: 'decodeURI',
        owner: 'Global',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Decodes a URI previously encoded by encodeURI, converting percent-escapes back to ' +
            'their characters while leaving reserved characters intact. Runtime-verified to work ' +
            'in SFMC SSJS.',
        params: [{ name: 'uri', description: 'The encoded URI string to decode', type: 'string' }],
        returnType: 'string',
        syntax: 'decodeURI(uri)',
        example: 'Write(decodeURI("a%20b/c")); // "a b/c"',
    },
    {
        name: 'decodeURIComponent',
        owner: 'Global',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Decodes a URI component previously encoded by encodeURIComponent, converting all ' +
            'percent-escapes back to characters. Runtime-verified to work in SFMC SSJS, but the ' +
            'Jint engine decodes a literal "+" to a space (form-urlencoded behaviour), unlike the spec.',
        caveat: 'A literal "+" is decoded to a space, unlike the ECMAScript spec (which leaves it).',
        params: [
            { name: 'str', description: 'The encoded component string to decode', type: 'string' },
        ],
        returnType: 'string',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: MDN specifies decodeURIComponent leaves a literal "+" unchanged; the ' +
            'SFMC Jint engine decodes "+" to a space, matching application/x-www-form-urlencoded.',
        syntax: 'decodeURIComponent(str)',
        example:
            'Write(decodeURIComponent("a%20b%2Fc")); // "a b/c"\n' +
            'Write(decodeURIComponent("+")); // " " in SFMC (spec: "+")',
    },
    // ── RegExp constructor ────────────────────────────────────────────────────
    // Emitted as `declare function RegExp(...)` so that `new RegExp(...)` and
    // `RegExp(...)` both pass TypeScript validation in .ssjs files.
    {
        name: 'RegExp',
        owner: 'Global',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Creates a regular expression object for pattern matching. ' +
            'Prefer the literal syntax (/pattern/flags) when the pattern is known at write time. ' +
            'Use the constructor when the pattern must be built dynamically at runtime.',
        params: [
            {
                name: 'pattern',
                description: 'Regular expression pattern string',
                type: 'string',
            },
            {
                name: 'flags',
                description: 'Optional flags: g (global), i (case-insensitive), m (multiline)',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'RegExp',
        syntax: 'new RegExp(pattern[, flags])',
        minArgs: 1,
        maxArgs: 2,
        example:
            'var fieldName = "email";\n' +
            'var re = new RegExp(fieldName + "=([^&]+)", "i");\n' +
            'var match = queryString.match(re);\n' +
            'if (match) { Write(match[1]); }',
    },
    // ── RegExp.prototype methods ──────────────────────────────────────────────
    {
        name: 'test',
        owner: 'RegExp',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Tests whether the string matches the pattern. ' +
            'Returns true if the pattern is found, false otherwise. ' +
            'When the g flag is set, successive calls advance lastIndex.',
        params: [
            {
                name: 'string',
                description: 'The string to test against the regular expression',
                type: 'string',
            },
        ],
        returnType: 'boolean',
        syntax: 'RegExp.test(string)',
        minArgs: 1,
        maxArgs: 1,
        example:
            'var emailRe = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n' +
            'if (emailRe.test(subscriberEmail)) {\n' +
            '    Write("Valid email");\n' +
            '}',
    },
    {
        name: 'exec',
        owner: 'RegExp',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies exec() returns an array whose capture groups occupy result[1], result[2], ... and, with the g flag, advances lastIndex so a while-loop can iterate all matches. In the SFMC Jint engine result[0] (full match), result.index and result.input work, but capture groups result[1]+ are always undefined, result.length is always 3 regardless of group count, and lastIndex never advances (the g-flag exec loop never terminates). Use String.match(/.../g) to collect matches and non-global String.match to read capture groups.',
        esVersion: 3,
        description:
            'Executes a search for a match in the string. ' +
            'Returns an array with the full match at index 0 and any capture groups at subsequent indices, ' +
            'or null if no match is found. ' +
            'The array also has index and input properties. ' +
            'When the g flag is set, successive calls advance lastIndex.',
        caveat: 'In the SFMC engine capture groups are broken: result[0] (the full match), result.index, and result.input work, but result[1], result[2], … are undefined. result.length is always 3 regardless of group count, so it cannot be used to count captures. Likewise the g-flag lastIndex does not advance between calls. Use the full match plus String.split/substring to extract sub-parts instead of capture groups.',
        params: [
            {
                name: 'string',
                description: 'The string to search',
                type: 'string',
            },
        ],
        returnType: 'array',
        syntax: 'RegExp.exec(string)',
        minArgs: 1,
        maxArgs: 1,
        example:
            'var re = /\\d{4}-\\d{2}-\\d{2}/;\n' +
            'var result = re.exec("Order placed on 2026-01-15");\n' +
            'if (result) {\n' +
            '    Write("Match: " + result[0]); // "2026-01-15" (capture groups result[1]+ are broken)\n' +
            '}',
    },
    // ── RegExp.prototype properties ───────────────────────────────────────────
    {
        name: 'source',
        owner: 'RegExp',
        isConfirmed: true,
        esVersion: 3,
        isProperty: true,
        description: 'The text of the pattern, excluding the enclosing slashes and any flags.',
        params: [],
        returnType: 'string',
        syntax: 'RegExp.source',
        example: 'var re = /hello/gi;\nWrite(re.source); // "hello"',
    },
    {
        name: 'global',
        owner: 'RegExp',
        isConfirmed: true,
        esVersion: 3,
        isProperty: true,
        description:
            'True if the g (global) flag was specified when creating the regular expression.',
        params: [],
        returnType: 'boolean',
        syntax: 'RegExp.global',
        example: 'var re = /hello/g;\nWrite(re.global); // true',
    },
    {
        name: 'lastIndex',
        owner: 'RegExp',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies lastIndex is updated by exec()/test() when the g (or y) flag is set, enabling stateful iteration. In the SFMC Jint engine lastIndex NEVER advances after exec()/test() with the g flag (stays 0), and setting it manually is ignored (the next exec still matches from the start). Use String.match(/.../g) to get all matches at once.',
        esVersion: 3,
        isProperty: true,
        description:
            'The index at which to start the next match. ' +
            'Only relevant when the g or y flag is set. ' +
            'Automatically updated by exec() and test().',
        caveat: 'In the SFMC engine lastIndex does NOT advance after exec()/test() with the g flag, so it cannot be used to iterate matches. Setting lastIndex manually is also ignored — the next exec() still matches from the start. Use String.match(/.../g) to get all matches at once instead.',
        params: [],
        returnType: 'number',
        syntax: 'RegExp.lastIndex',
        example:
            'var re = /\\d+/g;\n' +
            're.exec("abc 123 def 456");\n' +
            'Write(re.lastIndex); // does not advance in SFMC',
    },
    // ── Date.prototype ─────────────────────────────────────────────────────────
    {
        name: 'getFullYear',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the four-digit year of the date according to local time.',
        params: [],
        returnType: 'number',
        syntax: 'Date.getFullYear()',
        example: 'var d = new Date();\nWrite(d.getFullYear()); // e.g. 2026',
    },
    {
        name: 'getMonth',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns the month (0 = January … 11 = December) of the date according to local time.',
        params: [],
        returnType: 'number',
        syntax: 'Date.getMonth()',
        example: 'var d = new Date(2026, 5, 1);\nWrite(d.getMonth()); // 5 (June, 0-based)',
    },
    {
        name: 'getDate',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the day of the month (1–31) of the date according to local time.',
        params: [],
        returnType: 'number',
        syntax: 'Date.getDate()',
        example: 'var d = new Date(2026, 0, 15);\nWrite(d.getDate()); // 15',
    },
    {
        name: 'getHours',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the hour (0–23) of the date according to local time.',
        params: [],
        returnType: 'number',
        syntax: 'Date.getHours()',
        example: 'var d = new Date(2026, 0, 1, 13);\nWrite(d.getHours()); // 13',
    },
    {
        name: 'getTime',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns the numeric timestamp (milliseconds since 1970-01-01T00:00:00 UTC) for the date.',
        params: [],
        returnType: 'number',
        syntax: 'Date.getTime()',
        example: 'var d = new Date(2021, 0, 1);\nWrite(d.getTime()); // milliseconds since epoch',
    },
    {
        name: 'getTimezoneOffset',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns the difference, in minutes, between this date evaluated in UTC and in the host local time zone.',
        params: [],
        returnType: 'number',
        syntax: 'Date.getTimezoneOffset()',
        example: 'var d = new Date();\nWrite(d.getTimezoneOffset()); // minutes offset from UTC',
    },
    {
        name: 'getMinutes',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the minutes (0–59) of the date according to local time.',
        params: [],
        returnType: 'number',
        syntax: 'Date.getMinutes()',
        example: 'var d = new Date();\nWrite(d.getMinutes());',
    },
    {
        name: 'getSeconds',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the seconds (0–59) of the date according to local time.',
        params: [],
        returnType: 'number',
        syntax: 'Date.getSeconds()',
        example: 'var d = new Date();\nWrite(d.getSeconds());',
    },
    {
        name: 'getDay',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns the day of the week (0 = Sunday … 6 = Saturday) according to local time.',
        params: [],
        returnType: 'number',
        syntax: 'Date.getDay()',
        example: 'var d = new Date();\nWrite(d.getDay()); // 0–6',
    },
    {
        name: 'getMilliseconds',
        owner: 'Date.prototype',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies getMilliseconds() returns the exact milliseconds (0-999) of the Date. In the SFMC Jint engine it is frequently off by one: constructing a date with 123 ms reports 122, 555 reports 554, 666 reports 665. Some values (0, 111, 888, 999) are exact. Never rely on sub-second precision; round or avoid milliseconds.',
        esVersion: 3,
        description: 'Returns the milliseconds (0–999) of the date according to local time.',
        caveat: 'In the SFMC engine this is frequently off by one (e.g. a date constructed with 123 ms reports 122). Do not rely on millisecond precision; round or avoid sub-second comparisons.',
        params: [],
        returnType: 'number',
        syntax: 'Date.getMilliseconds()',
        example: 'var d = new Date();\nWrite(d.getMilliseconds()); // may be off by one in SFMC',
    },
    {
        name: 'toString',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns a human-readable string representing the date.',
        params: [],
        returnType: 'string',
        syntax: 'Date.toString()',
        example: 'var d = new Date(0);\nWrite(d.toString());',
    },
    {
        name: 'toDateString',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the date portion of the date as a human-readable string.',
        params: [],
        returnType: 'string',
        syntax: 'Date.toDateString()',
        example:
            'var d = new Date(0);\nWrite(d.toDateString()); // "Wed, 31 Dec 1969" (locale-dependent)',
    },
    {
        name: 'toUTCString',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the date as a string using the UTC time zone.',
        params: [],
        returnType: 'string',
        syntax: 'Date.toUTCString()',
        example: 'var d = new Date(0);\nWrite(d.toUTCString()); // "Thu, 01 Jan 1970 00:00:00 UTC"',
    },
    {
        name: 'valueOf',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns the primitive value of the date as the number of milliseconds since the Unix epoch.',
        params: [],
        returnType: 'number',
        syntax: 'Date.valueOf()',
        example: 'var d = new Date(0);\nWrite(d.valueOf()); // 0',
    },
    {
        name: 'getUTCFullYear',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the four-digit year of the date according to universal time (UTC).',
        params: [],
        returnType: 'number',
        syntax: 'Date.getUTCFullYear()',
        example: 'var d = new Date(0);\nWrite(d.getUTCFullYear()); // 1970',
    },
    {
        name: 'getUTCMonth',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns the month (0 = January … 11 = December) of the date according to universal time (UTC).',
        params: [],
        returnType: 'number',
        syntax: 'Date.getUTCMonth()',
        example: 'var d = new Date(0);\nWrite(d.getUTCMonth()); // 0',
    },
    {
        name: 'getUTCDate',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns the day of the month (1–31) of the date according to universal time (UTC).',
        params: [],
        returnType: 'number',
        syntax: 'Date.getUTCDate()',
        example: 'var d = new Date(0);\nWrite(d.getUTCDate()); // 1',
    },
    {
        name: 'getUTCDay',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns the day of the week (0 = Sunday … 6 = Saturday) according to universal time (UTC).',
        params: [],
        returnType: 'number',
        syntax: 'Date.getUTCDay()',
        example: 'var d = new Date(0);\nWrite(d.getUTCDay()); // 4 (Thursday)',
    },
    {
        name: 'getUTCHours',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the hour (0–23) of the date according to universal time (UTC).',
        params: [],
        returnType: 'number',
        syntax: 'Date.getUTCHours()',
        example: 'var d = new Date(0);\nWrite(d.getUTCHours()); // 0',
    },
    {
        name: 'getUTCMinutes',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the minutes (0–59) of the date according to universal time (UTC).',
        params: [],
        returnType: 'number',
        syntax: 'Date.getUTCMinutes()',
        example: 'var d = new Date(0);\nWrite(d.getUTCMinutes()); // 0',
    },
    {
        name: 'getUTCSeconds',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the seconds (0–59) of the date according to universal time (UTC).',
        params: [],
        returnType: 'number',
        syntax: 'Date.getUTCSeconds()',
        example: 'var d = new Date(0);\nWrite(d.getUTCSeconds()); // 0',
    },
    {
        name: 'getUTCMilliseconds',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns the milliseconds (0–999) of the date according to universal time (UTC).',
        params: [],
        returnType: 'number',
        syntax: 'Date.getUTCMilliseconds()',
        example: 'var d = new Date(0);\nWrite(d.getUTCMilliseconds()); // 0',
    },
    {
        name: 'toTimeString',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 3,
        description: 'Returns the time portion of the date as a human-readable string.',
        params: [],
        returnType: 'string',
        syntax: 'Date.toTimeString()',
        example: 'var d = new Date(0);\nWrite(d.toTimeString());',
    },
    {
        name: 'toLocaleDateString',
        owner: 'Date.prototype',
        esVersion: 3,
        description:
            'Returns the date portion as a string. Runtime-verified in SFMC: the locale argument is ignored and a fixed English-style format is returned (e.g. "Wed, 15 Jan 2020"). Use Platform.Function.FormatDate for locale-aware output.',
        caveat: 'The locale argument is ignored — output is a fixed English format like "Wed, 15 Jan 2020", not locale-specific.',
        params: [
            { name: 'locales', description: 'Ignored in SFMC', type: 'string', optional: true },
            { name: 'options', description: 'Ignored in SFMC', type: 'object', optional: true },
        ],
        returnType: 'string',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: MDN specifies locale-aware date formatting; the SFMC Jint engine ignores the locale/options arguments and returns a fixed English-style string (e.g. "Wed, 15 Jan 2020").',
        syntax: 'Date.toLocaleDateString([locales[, options]])',
        example:
            'var d = new Date(2020, 0, 15);\nWrite(d.toLocaleDateString()); // "Wed, 15 Jan 2020" (locale ignored)',
    },
    // ── Date statics ───────────────────────────────────────────────────────────
    {
        name: 'UTC',
        owner: 'Date',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies Date.UTC(year[, month...]) accepts a year-only call. In the SFMC Jint engine the year-only form Date.UTC(2026) returns a nonsense small number (observed -21597974) rather than a valid timestamp or NaN. Always pass at least year and month, e.g. Date.UTC(2026, 0, 1); with two or more components it returns the correct UTC timestamp.',
        esVersion: 3,
        isStatic: true,
        description:
            'Returns the number of milliseconds since the Unix epoch for the given UTC date components.',
        params: [
            { name: 'year', description: 'Full year', type: 'number' },
            { name: 'month', description: 'Month (0–11)', type: 'number', optional: true },
            { name: 'day', description: 'Day of the month (1–31)', type: 'number', optional: true },
            { name: 'hours', description: 'Hours (0–23)', type: 'number', optional: true },
            { name: 'minutes', description: 'Minutes (0–59)', type: 'number', optional: true },
            { name: 'seconds', description: 'Seconds (0–59)', type: 'number', optional: true },
            {
                name: 'milliseconds',
                description: 'Milliseconds (0–999)',
                type: 'number',
                optional: true,
            },
        ],
        returnType: 'number',
        caveat: 'Runtime-verified: with year + month (and beyond) it returns the correct UTC timestamp, but the year-only form Date.UTC(2026) returns a nonsense small number (observed -21597974) instead of treating the month as 0 — always pass at least year and month, e.g. Date.UTC(2026, 0, 1).',
        syntax: 'Date.UTC(year[, month[, day[, hours[, minutes[, seconds[, ms]]]]]])',
        example: 'Write(Date.UTC(1970, 0, 1)); // 0',
    },
    {
        name: 'parse',
        owner: 'Date',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies Date.parse(str) returns NaN for unparseable strings and treats date-only ISO forms as UTC. In the SFMC Jint engine invalid strings return 0 (the epoch), NEVER NaN, so isNaN() cannot detect a bad date; and date-only strings like "2026-06-18" parse as LOCAL midnight, not UTC. Validate input yourself before trusting the result.',
        esVersion: 3,
        isStatic: true,
        description:
            'Parses a date string and returns the numeric timestamp (milliseconds since the Unix epoch). In the SFMC engine an unparseable string returns 0 (the epoch), NOT NaN as the spec requires.',
        params: [
            {
                name: 'dateString',
                description: 'A date string (ISO 8601 is the most portable form)',
                type: 'string',
            },
        ],
        returnType: 'number',
        caveat: 'Runtime-verified: unlike the spec, an unparseable or invalid string (e.g. "garbage", "", "2021-13-45") returns 0 — the Unix epoch — instead of NaN, so isNaN() cannot detect a bad date and invalid input silently becomes 1970-01-01. Also, a date-only ISO string such as "2026-06-18" is parsed as LOCAL midnight, not UTC (contrary to the ES5+ spec). Validate input yourself; do not rely on NaN for error detection.',
        syntax: 'Date.parse(dateString)',
        example: "Write(Date.parse('2021-01-01T00:00:00Z')); // 1609459200000",
    },
    {
        name: 'now',
        owner: 'Date',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies Date.now() returns a Number (milliseconds since the Unix epoch). In the SFMC Jint engine it returns a Date OBJECT instead (typeof Date.now() is "object"). Numeric coercion (Date.now() + 0) recovers the epoch ms, but code expecting a plain number breaks. Prefer new Date().getTime() for a clean number.',
        esVersion: 5,
        isStatic: true,
        description:
            'Returns the current time. In the SFMC engine this returns a Date OBJECT, not a numeric timestamp as the spec requires — coerce it (+Date.now() or new Date().getTime()) to get epoch milliseconds.',
        params: [],
        returnType: 'object',
        caveat: 'Runtime-verified: unlike the spec (which returns a Number), Date.now() returns a Date object (typeof "object") that stringifies to a date-time string. Numeric coercion (Date.now() + 0, Date.now() * 1) yields the epoch milliseconds, but code expecting a number will break. Prefer new Date().getTime(), which returns a clean number.',
        syntax: 'Date.now()',
        example:
            'var ms = new Date().getTime(); // clean epoch milliseconds (Date.now() returns a Date object in SFMC)',
    },
    // ── Object statics ─────────────────────────────────────────────────────────
    {
        name: 'defineProperty',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        description:
            'Defines a new property on an object, or modifies an existing one, with the given descriptor.',
        params: [
            {
                name: 'obj',
                description: 'The object on which to define the property',
                type: 'object',
            },
            { name: 'prop', description: 'The name of the property to define', type: 'string' },
            {
                name: 'descriptor',
                description:
                    'Property descriptor (value, enumerable, writable, configurable, get, set)',
                type: 'object',
            },
        ],
        returnType: 'object',
        syntax: 'Object.defineProperty(obj, prop, descriptor)',
        example:
            'var o = {};\nObject.defineProperty(o, "x", { value: 42, enumerable: true });\nWrite(o.x); // 42',
    },
    {
        name: 'getPrototypeOf',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        description:
            'Returns the prototype (internal [[Prototype]]) of the specified object. Runtime-verified working in SFMC SSJS.',
        params: [
            {
                name: 'obj',
                description: 'The object whose prototype to return',
                type: 'object',
            },
        ],
        returnType: 'object',
        syntax: 'Object.getPrototypeOf(obj)',
        example: 'var proto = Object.getPrototypeOf({ a: 1 }); // returns the object prototype',
    },
    // ── Function.prototype ─────────────────────────────────────────────────────
    // call() and apply() are ES3 and confirmed working in SFMC SSJS (verified on a
    // CloudPage). bind() is ES5 and is NOT available — and Function.prototype is sealed,
    // so it cannot be installed. Use a standalone helper instead (see POLYFILLABLE_METHODS).
    // Runtime-verified extras: toString() returns "[object Function]" not source (differs);
    // .length THROWS a null-reference error, .name and .caller are undefined, and
    // fn.constructor === Function is false (all in KNOWN_UNSUPPORTED / differs-from-docs).
    // The `arguments` object and the Function() constructor DO work.
    {
        name: 'call',
        owner: 'Function.prototype',
        isConfirmed: true,
        esVersion: 3,
        minArgs: 1,
        description:
            'Calls the function with a given `this` value and arguments provided individually.',
        params: [
            {
                name: 'thisArg',
                description: 'The value to use as `this` when calling the function',
                type: 'any',
            },
            {
                name: 'arg',
                description: 'Argument passed to the function (repeat for multiple)',
                type: 'any',
                optional: true,
            },
        ],
        returnType: 'any',
        syntax: 'fn.call(thisArg[, arg1[, arg2[, ...]]])',
        example:
            'function greet(greeting) { return greeting + ", " + this.name; }\nvar r = greet.call({ name: "Sam" }, "Hi"); // "Hi, Sam"',
    },
    {
        name: 'apply',
        owner: 'Function.prototype',
        isConfirmed: true,
        esVersion: 3,
        minArgs: 1,
        description:
            'Calls the function with a given `this` value and arguments provided as an array.',
        params: [
            {
                name: 'thisArg',
                description: 'The value to use as `this` when calling the function',
                type: 'any',
            },
            {
                name: 'argsArray',
                description: 'Array of arguments to pass to the function',
                type: 'array',
                optional: true,
            },
        ],
        returnType: 'any',
        syntax: 'fn.apply(thisArg[, argsArray])',
        example: 'function sum(a, b) { return a + b; }\nvar r = sum.apply(null, [2, 3]); // 5',
    },
    {
        name: 'toString',
        owner: 'Function.prototype',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Returns a string representing the function. In the SFMC engine this returns the generic "[object Function]" tag, NOT the function source code the spec produces.',
        params: [],
        returnType: 'string',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: unlike standard JavaScript (which returns the function source), fn.toString() returns the generic "[object Function]" object tag in the SFMC Jint engine. String(fn) / ("" + fn) yield "function" instead. Do not rely on function source introspection.',
        syntax: 'fn.toString()',
        example:
            'function greet() {}\nWrite(greet.toString()); // "[object Function]" in SFMC (not the source)',
    },
    // ── Boolean constructor ───────────────────────────────────────────────────
    // Owner 'Boolean' maps to /ecmascript-builtins/boolean/. Member names are the
    // page's H2 anchor slugs so each entry deep-links to the matching heading.
    {
        name: 'boolean-coercion',
        owner: 'Boolean',
        isConfirmed: true,
        esVersion: 3,
        description:
            'Called as a plain function, Boolean(value) returns a primitive boolean reflecting the value truthiness. Works correctly in the SFMC engine.',
        params: [
            {
                name: 'value',
                description: 'The value to coerce to a boolean',
                type: 'any',
            },
        ],
        returnType: 'boolean',
        syntax: 'Boolean(value)',
        example: 'Write(Boolean(1)); // true\nWrite(Boolean("")); // false',
    },
    {
        name: 'boolean-boxed',
        owner: 'Boolean',
        isConfirmed: true,
        esVersion: 3,
        description:
            'new Boolean(value) creates a boxed Boolean object (typeof "object"). The boxed form works but is a footgun and its string form is capitalized in the SFMC engine — prefer Boolean(value) or !!value.',
        params: [
            {
                name: 'value',
                description: 'The value to box as a Boolean object',
                type: 'any',
            },
        ],
        returnType: 'object',
        differsFromOfficialDocs: true,
        officialDocsNote:
            'Runtime-verified: MDN specifies a boxed Boolean stringifies to lowercase "true"/"false"; the SFMC Jint engine capitalizes the first letter ("True"/"False").',
        syntax: 'new Boolean(value)',
        example: 'var b = new Boolean(true);\nWrite(String(b)); // "True" in SFMC (spec: "true")',
    },
    {
        name: 'boolean-prototype',
        owner: 'Boolean',
        isConfirmed: true,
        esVersion: 3,
        isProperty: true,
        description:
            'Boolean.prototype exists and exposes the toString and valueOf methods on boxed boolean instances.',
        params: [],
        returnType: 'object',
        syntax: 'Boolean.prototype',
        example: 'Write(typeof Boolean.prototype.toString); // "function"',
    },
    // ── Error and its native subtypes ─────────────────────────────────────────
    // Base Error (owner 'Error' → /ecmascript-builtins/error/) and the six present
    // subtypes (owner 'ErrorTypes' → /ecmascript-builtins/error-types/). Member
    // names are the pages' anchor slugs (e.g. TypeError → #typeerror).
    {
        name: 'Error',
        owner: 'Error',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies new Error(message) stores the argument in error.message. In the SFMC Jint engine a JS-constructed new Error("msg") does NOT expose the message via .message (reads back undefined); recover it with String(e) or ("" + e). The no-new form Error("msg") and engine-raised errors do carry a readable message. .name works ("Error"); .stack is unavailable.',
        esVersion: 3,
        description:
            'The base Error constructor works in SSJS. new Error(message) creates an error object with a message property that can be thrown and caught in try/catch.',
        params: [
            {
                name: 'message',
                description: 'A human-readable description of the error',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'new Error([message])',
        example:
            'try {\n    throw new Error("Something failed");\n} catch (e) {\n    Write(e.message); // "Something failed"\n}',
    },
    {
        name: 'EvalError',
        owner: 'ErrorTypes',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'typeof EvalError is function and new EvalError(...) constructs an object with a working .name, but like Error the .message from new EvalError("msg") reads back undefined (recover via String(e)).',
        esVersion: 3,
        description:
            'The EvalError subtype constructor is present in SSJS. It creates an error object you can throw and catch, though the engine itself rarely raises it.',
        params: [
            {
                name: 'message',
                description: 'A human-readable description of the error',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'new EvalError([message])',
        example: 'throw new EvalError("bad eval");',
    },
    {
        name: 'RangeError',
        owner: 'ErrorTypes',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'typeof RangeError is function and new RangeError(...) constructs an object with a working .name, but like Error the .message from new RangeError("msg") reads back undefined (recover via String(e)).',
        esVersion: 3,
        description:
            'The RangeError subtype constructor is present in SSJS. It signals that a value is outside the allowed range and can be thrown and caught.',
        params: [
            {
                name: 'message',
                description: 'A human-readable description of the error',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'new RangeError([message])',
        example: 'throw new RangeError("value out of range");',
    },
    {
        name: 'ReferenceError',
        owner: 'ErrorTypes',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'typeof ReferenceError is function and new ReferenceError(...) constructs an object with a working .name, but like Error the .message from new ReferenceError("msg") reads back undefined (recover via String(e)).',
        esVersion: 3,
        description:
            'The ReferenceError subtype constructor is present in SSJS. It signals a reference to an undeclared variable and can be thrown and caught.',
        params: [
            {
                name: 'message',
                description: 'A human-readable description of the error',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'new ReferenceError([message])',
        example: 'throw new ReferenceError("undeclared variable");',
    },
    {
        name: 'SyntaxError',
        owner: 'ErrorTypes',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'typeof SyntaxError is function and new SyntaxError(...) constructs an object with a working .name, but like Error the .message from new SyntaxError("msg") reads back undefined (recover via String(e)).',
        esVersion: 3,
        description:
            'The SyntaxError subtype constructor is present in SSJS. It signals a syntax problem and can be thrown and caught.',
        params: [
            {
                name: 'message',
                description: 'A human-readable description of the error',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'new SyntaxError([message])',
        example: 'throw new SyntaxError("invalid syntax");',
    },
    {
        name: 'TypeError',
        owner: 'ErrorTypes',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'typeof TypeError is function and new TypeError(...) constructs an object with a working .name, but like Error the .message from new TypeError("msg") reads back undefined (recover via String(e)).',
        esVersion: 3,
        description:
            'The TypeError subtype constructor is present in SSJS. It signals that a value is not of the expected type and can be thrown and caught.',
        params: [
            {
                name: 'message',
                description: 'A human-readable description of the error',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'new TypeError([message])',
        example: 'throw new TypeError("expected a string");',
    },
    {
        name: 'URIError',
        owner: 'ErrorTypes',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'typeof URIError is function and new URIError(...) constructs an object with a working .name, but like Error the .message from new URIError("msg") reads back undefined (recover via String(e)).',
        esVersion: 3,
        description:
            'The URIError subtype constructor is present in SSJS. It signals malformed URI handling and can be thrown and caught.',
        params: [
            {
                name: 'message',
                description: 'A human-readable description of the error',
                type: 'string',
                optional: true,
            },
        ],
        returnType: 'object',
        syntax: 'new URIError([message])',
        example: 'throw new URIError("malformed URI");',
    },
    // ── Global value properties (present/working) ─────────────────────────────
    // Owner 'GlobalValues' maps to /ecmascript-builtins/global-values/. Only the
    // present value `undefined` is added here; NaN/Infinity/globalThis are tracked
    // in KNOWN_UNSUPPORTED.
    {
        name: 'undefined',
        owner: 'GlobalValues',
        isConfirmed: true,
        esVersion: 3,
        isProperty: true,
        description:
            'The global undefined value is available in SSJS. It is the value of unassigned variables and missing object properties; compare with === undefined or typeof x === "undefined".',
        params: [],
        returnType: 'undefined',
        syntax: 'undefined',
        example: 'var x;\nWrite(x === undefined); // true',
    },
];

// ── Constructible ECMAScript built-ins ───────────────────────────────────────
// SFMC's Rhino-based engine exposes these as real constructor values: they can be
// called with `new` (e.g. `new Error("x")`, `new Date()`) and expose a `.prototype`
// that user code routinely polyfills (e.g. `String.prototype.startsWith = ...`).
//
// The generator emits, for each entry:
//   interface <name> { ...instanceMembers }            (the prototype/instance shape)
//   interface <name>Constructor { new(...): <iface>; (...): <callReturn>; statics; prototype }
//   declare var <name>: <name>Constructor;
//
// Instance methods/properties for these types are still authored in
// ECMASCRIPT_BUILTINS (owner `String.prototype`, `Date.prototype`, …); this list
// only declares the *value* + *constructor* surface, plus any extra instance
// members that are not represented as prototype methods (e.g. Error.message).
//
// `interfaceName` lets an entry reuse the generic interface name (e.g. Array uses
// `Array<T>`); when omitted, the interface is named after `name`.
export const CONSTRUCTIBLE_BUILTINS = [
    {
        name: 'Error',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'new Error("msg") constructs an object but (new Error(...)) instanceof Error is false (instanceof link broken) and .message reads back undefined (recover via String(e)). Detect caught errors by shape/String(e), not instanceof Error.',
        // No Error.prototype methods are catalogued; declare the instance shape here.
        instanceMembers: [
            { name: 'message', type: 'string' },
            { name: 'name', type: 'string' },
        ],
        construct: {
            params: [{ name: 'message', type: 'string', optional: true }],
            returns: '$iface',
        },
        call: { params: [{ name: 'message', type: 'string', optional: true }], returns: '$iface' },
        prototype: '$iface',
    },
    // Legacy Error subtypes (ES3). All are present and constructible in SFMC and share the
    // base Error behaviour (including the engine quirks: instance .message/.description are
    // undefined, `instanceof Error` returns false, and Stringify(err) yields ""). The three
    // newer error types (AggregateError ES2021, SuppressedError ES2026, non-standard
    // InternalError) are absent — see KNOWN_UNSUPPORTED.
    {
        name: 'EvalError',
        isConfirmed: true,
        instanceMembers: [
            { name: 'message', type: 'string' },
            { name: 'name', type: 'string' },
        ],
        construct: {
            params: [{ name: 'message', type: 'string', optional: true }],
            returns: '$iface',
        },
        call: { params: [{ name: 'message', type: 'string', optional: true }], returns: '$iface' },
        prototype: '$iface',
    },
    {
        name: 'RangeError',
        isConfirmed: true,
        instanceMembers: [
            { name: 'message', type: 'string' },
            { name: 'name', type: 'string' },
        ],
        construct: {
            params: [{ name: 'message', type: 'string', optional: true }],
            returns: '$iface',
        },
        call: { params: [{ name: 'message', type: 'string', optional: true }], returns: '$iface' },
        prototype: '$iface',
    },
    {
        name: 'ReferenceError',
        isConfirmed: true,
        instanceMembers: [
            { name: 'message', type: 'string' },
            { name: 'name', type: 'string' },
        ],
        construct: {
            params: [{ name: 'message', type: 'string', optional: true }],
            returns: '$iface',
        },
        call: { params: [{ name: 'message', type: 'string', optional: true }], returns: '$iface' },
        prototype: '$iface',
    },
    {
        name: 'SyntaxError',
        isConfirmed: true,
        instanceMembers: [
            { name: 'message', type: 'string' },
            { name: 'name', type: 'string' },
        ],
        construct: {
            params: [{ name: 'message', type: 'string', optional: true }],
            returns: '$iface',
        },
        call: { params: [{ name: 'message', type: 'string', optional: true }], returns: '$iface' },
        prototype: '$iface',
    },
    {
        name: 'TypeError',
        isConfirmed: true,
        instanceMembers: [
            { name: 'message', type: 'string' },
            { name: 'name', type: 'string' },
        ],
        construct: {
            params: [{ name: 'message', type: 'string', optional: true }],
            returns: '$iface',
        },
        call: { params: [{ name: 'message', type: 'string', optional: true }], returns: '$iface' },
        prototype: '$iface',
    },
    {
        name: 'URIError',
        isConfirmed: true,
        instanceMembers: [
            { name: 'message', type: 'string' },
            { name: 'name', type: 'string' },
        ],
        construct: {
            params: [{ name: 'message', type: 'string', optional: true }],
            returns: '$iface',
        },
        call: { params: [{ name: 'message', type: 'string', optional: true }], returns: '$iface' },
        prototype: '$iface',
    },
    {
        name: 'String',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'new String("hi") constructs a boxed object (typeof "object", coerces to "hi"), but reading .length on the boxed String THROWS "String". Use string primitives ("hi") rather than new String(...); primitive .length works.',
        // Instance members come from ECMASCRIPT_BUILTINS owner `String.prototype`.
        construct: { params: [{ name: 'value', type: 'any', optional: true }], returns: '$iface' },
        call: { params: [{ name: 'value', type: 'any', optional: true }], returns: 'string' },
        prototype: '$iface',
        statics: [
            {
                name: 'fromCharCode',
                params: [{ name: 'code', type: 'number' }],
                rest: 'number',
                returns: 'string',
            },
        ],
    },
    {
        name: 'Array',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN: new Array(n) with a single number pre-allocates length n; new Array() instanceof Array is true. In the SFMC Jint engine new Array(3).length is 1 (the number is treated as a single element, not a length), and (new Array()) instanceof Array is false. The literal [] and new Array(1,2,3) (multiple args) work correctly. Prefer array literals; never use new Array(n) for preallocation.',
        interfaceName: 'Array<T>',
        // Instance members come from ECMASCRIPT_BUILTINS owner `Array.prototype`.
        construct: {
            params: [{ name: 'arrayLength', type: 'number', optional: true }],
            returns: 'any[]',
        },
        call: {
            params: [{ name: 'arrayLength', type: 'number', optional: true }],
            returns: 'any[]',
        },
        prototype: 'any[]',
        // Array.isArray is NOT available in SFMC SSJS — it is a polyfillable static
        // (see POLYFILLABLE_METHODS). Do not declare it as a native static here.
    },
    {
        name: 'Number',
        isConfirmed: true,
        // Instance members come from ECMASCRIPT_BUILTINS owner `Number.prototype`.
        construct: { params: [{ name: 'value', type: 'any', optional: true }], returns: '$iface' },
        call: { params: [{ name: 'value', type: 'any', optional: true }], returns: 'number' },
        prototype: '$iface',
    },
    {
        name: 'Boolean',
        isConfirmed: true,
        // Runtime-verified on ssjs/MCDEV_Training_QA: Boolean(value) coercion returns a
        // primitive boolean correctly. The boxed `new Boolean()` object stringifies to a
        // CAPITALIZED "True"/"False" in the Jint engine (differs from spec) — prefer the
        // call form Boolean(value) or !!value. See ssjs.guide/ecmascript-builtins/boolean.
        construct: { params: [{ name: 'value', type: 'any', optional: true }], returns: '$iface' },
        call: { params: [{ name: 'value', type: 'any', optional: true }], returns: 'boolean' },
        prototype: '$iface',
    },
    {
        name: 'Object',
        isConfirmed: true,
        // Instance members come from ECMASCRIPT_BUILTINS owner `Object.prototype`.
        // Statics (e.g. Object.defineProperty) remain in the `declare namespace Object`.
        construct: { params: [{ name: 'value', type: 'any', optional: true }], returns: '$iface' },
        call: { params: [{ name: 'value', type: 'any', optional: true }], returns: 'object' },
        prototype: '$iface',
        // mergeNamespace: the generated `declare var Object` must coexist with the
        // existing `declare namespace Object` statics; the generator handles this.
    },
    {
        name: 'Date',
        isConfirmed: true,
        // Instance members come from ECMASCRIPT_BUILTINS owner `Date.prototype`.
        // Statics (e.g. Date.UTC) remain in the `declare namespace Date`.
        construct: {
            // new Date(); new Date(ms); new Date(dateString); new Date(y, m, d, ...)
            params: [
                { name: 'valueOrYear', type: 'any', optional: true },
                { name: 'month', type: 'number', optional: true },
                { name: 'day', type: 'number', optional: true },
                { name: 'hours', type: 'number', optional: true },
                { name: 'minutes', type: 'number', optional: true },
                { name: 'seconds', type: 'number', optional: true },
                { name: 'milliseconds', type: 'number', optional: true },
            ],
            returns: '$iface',
        },
        call: { params: [], returns: 'string' },
        prototype: '$iface',
    },
    {
        name: 'RegExp',
        isConfirmed: true,
        // Instance members (test, exec, source, global, …) come from
        // ECMASCRIPT_BUILTINS owner `RegExp`, emitted as `interface RegExp`.
        // SSJS supports `new RegExp(pattern[, flags])` for dynamic patterns, so it
        // must be constructible — not just callable like a plain global function.
        construct: {
            params: [
                { name: 'pattern', type: 'string' },
                { name: 'flags', type: 'string', optional: true },
            ],
            returns: '$iface',
        },
        call: {
            params: [
                { name: 'pattern', type: 'string' },
                { name: 'flags', type: 'string', optional: true },
            ],
            returns: '$iface',
        },
        prototype: '$iface',
    },
];

// ── Unsupported ES6+ syntax ──────────────────────────────────────────────────
// SFMC runs SSJS on a legacy ECMAScript 3/5 engine (Rhino-based).
// These features cause runtime errors and should be avoided.

export const UNSUPPORTED_SYNTAX = [
    {
        feature: 'ArrowFunctionExpression',
        isConfirmed: true,
        label: 'arrow functions',
        suggestion: 'Use a regular function expression instead.',
        nodeType: 'ArrowFunctionExpression',
    },
    {
        feature: 'LetDeclaration',
        isConfirmed: true,
        label: "'let' declarations",
        suggestion: "Use 'var' instead.",
        nodeType: 'VariableDeclaration',
        test: (node) => node.kind === 'let',
    },
    {
        feature: 'ConstDeclaration',
        isConfirmed: true,
        label: "'const' declarations",
        suggestion: "Use 'var' instead.",
        nodeType: 'VariableDeclaration',
        test: (node) => node.kind === 'const',
    },
    {
        feature: 'TemplateLiteral',
        isConfirmed: true,
        label: 'template literals',
        suggestion: 'Use string concatenation instead.',
        nodeType: 'TemplateLiteral',
    },
    {
        feature: 'ClassDeclaration',
        isConfirmed: true,
        label: 'class declarations',
        suggestion: 'Use constructor functions with prototypes instead.',
        nodeType: 'ClassDeclaration',
    },
    {
        feature: 'ClassExpression',
        isConfirmed: true,
        label: 'class expressions',
        suggestion: 'Use constructor functions with prototypes instead.',
        nodeType: 'ClassExpression',
    },
    {
        feature: 'ForOfStatement',
        isConfirmed: true,
        label: "'for...of' loops",
        suggestion: "Use a standard 'for' loop or 'for...in' instead.",
        nodeType: 'ForOfStatement',
    },
    {
        feature: 'SpreadElement',
        isConfirmed: true,
        label: 'spread syntax',
        suggestion: 'Use Array.prototype.concat or manual iteration instead.',
        nodeType: 'SpreadElement',
    },
    {
        feature: 'RestElement',
        isConfirmed: true,
        label: 'rest parameters',
        suggestion: "Use the 'arguments' object instead.",
        nodeType: 'RestElement',
    },
    {
        feature: 'ObjectDestructuring',
        isConfirmed: true,
        label: 'destructuring assignment',
        suggestion: 'Access object properties individually instead.',
        nodeType: 'ObjectPattern',
    },
    {
        feature: 'ArrayDestructuring',
        isConfirmed: true,
        label: 'destructuring assignment',
        suggestion: 'Access array elements by index instead.',
        nodeType: 'ArrayPattern',
    },
    {
        feature: 'DefaultParameter',
        isConfirmed: true,
        label: 'default parameter values',
        suggestion: 'Check for undefined inside the function body instead.',
        nodeType: 'AssignmentPattern',
    },
    {
        feature: 'AsyncFunction',
        isConfirmed: true,
        label: 'async functions',
        suggestion: 'SFMC SSJS does not support Promises or async/await.',
        nodeType: 'FunctionDeclaration',
        test: (node) => node.async === true,
    },
    {
        feature: 'AsyncFunctionExpression',
        isConfirmed: true,
        label: 'async functions',
        suggestion: 'SFMC SSJS does not support Promises or async/await.',
        nodeType: 'FunctionExpression',
        test: (node) => node.async === true,
    },
    {
        feature: 'AwaitExpression',
        isConfirmed: true,
        label: 'await expressions',
        suggestion: 'SFMC SSJS does not support Promises or async/await.',
        nodeType: 'AwaitExpression',
    },
    {
        feature: 'Generator',
        isConfirmed: true,
        label: 'generator functions',
        suggestion: 'Use regular iteration patterns instead.',
        nodeType: 'FunctionDeclaration',
        test: (node) => node.generator === true,
    },
    {
        feature: 'YieldExpression',
        isConfirmed: true,
        label: 'yield expressions',
        suggestion: 'Use regular iteration patterns instead.',
        nodeType: 'YieldExpression',
    },
    {
        feature: 'ImportDeclaration',
        isConfirmed: true,
        label: 'ES module imports',
        suggestion: 'SFMC SSJS does not support ES modules.',
        nodeType: 'ImportDeclaration',
    },
    {
        feature: 'ExportNamedDeclaration',
        isConfirmed: true,
        label: 'ES module exports',
        suggestion: 'SFMC SSJS does not support ES modules.',
        nodeType: 'ExportNamedDeclaration',
    },
    {
        feature: 'ExportDefaultDeclaration',
        isConfirmed: true,
        label: 'ES module exports',
        suggestion: 'SFMC SSJS does not support ES modules.',
        nodeType: 'ExportDefaultDeclaration',
    },
    {
        feature: 'OptionalChaining',
        isConfirmed: true,
        label: 'optional chaining (?.)',
        suggestion: 'Use explicit null checks instead.',
        nodeType: 'ChainExpression',
    },
    {
        feature: 'NullishCoalescing',
        isConfirmed: true,
        label: 'nullish coalescing (??)',
        suggestion: 'Use a ternary or logical OR (||) instead.',
        nodeType: 'LogicalExpression',
        test: (node) => node.operator === '??',
    },
    {
        feature: 'DirectObjectReturn',
        isConfirmed: true,
        label: 'direct object literal returns',
        suggestion: 'Assign the object to a variable first, then return the variable.',
        nodeType: 'ReturnStatement',
        test: (node) => node.argument && node.argument.type === 'ObjectExpression',
    },
    {
        feature: 'NewExpression',
        isConfirmed: true,
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
    {
        feature: 'BigIntLiteral',
        isConfirmed: true,
        label: 'BigInt literals (10n)',
        suggestion:
            'BigInt is unsupported in SFMC (ES2020). Remove the n suffix and use a Number, ' +
            'or keep large exact integers as strings.',
        nodeType: 'Literal',
        test: (node) => typeof node.bigint === 'string' || typeof node.value === 'bigint',
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
//
// `esVersion` records the ECMAScript edition that standardized the member
// (3 = ES3, 5 = ES5, 6 = ES6/ES2015+). It is documentation-only metadata
// surfaced on ssjs.guide and is NOT consumed by any LSP/MCP/VSCE/ESLint logic.
// Note: a member can be standardized in ES3 (e.g. Array.splice) yet still be
// broken in the SFMC engine, which is why ES3 appears here too.

/** @type {{method: string, owner: string, esVersion: 3 | 5 | 6, isStatic: boolean, category: 'unavailable' | 'broken', ambiguousWithString: boolean, description: string, polyfill: string}[]} */
export const POLYFILLABLE_METHODS = [
    {
        method: 'copyWithin',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.copyWithin is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.copyWithin (SFMC SSJS).\n' +
            ' * @param {number} targetIndex - index to copy the sequence to\n' +
            ' * @param {number} [startIndex] - index to start copying from\n' +
            ' * @param {number} [count] - number of elements to copy\n' +
            ' * @returns {Array} the modified array\n' +
            ' */\n' +
            'Array.prototype.copyWithin = Array.prototype.copyWithin || function (targetIndex, startIndex, count) {\n' +
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
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.entries is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.entries (SFMC SSJS).\n' +
            ' * @returns {object} an iterator of [index, value] pairs\n' +
            ' */\n' +
            'Array.prototype.entries = Array.prototype.entries || function () {\n' +
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
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.fill is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.fill (SFMC SSJS).\n' +
            ' * @param {*} value - value to fill the array with\n' +
            ' * @param {number} [startIndex] - index to start filling at (default 0)\n' +
            ' * @param {number} [endIndex] - index to stop filling at (default array length)\n' +
            ' * @returns {Array} the modified array\n' +
            ' */\n' +
            'Array.prototype.fill = Array.prototype.fill || function (value, startIndex, endIndex) {\n' +
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
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.filter is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.filter (SFMC SSJS).\n' +
            ' * @param {Function} predicate - test called with (element, index, array)\n' +
            ' * @returns {Array} a new array of elements that passed the test\n' +
            ' */\n' +
            'Array.prototype.filter = Array.prototype.filter || function (predicate) {\n' +
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
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.find is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.find (SFMC SSJS).\n' +
            ' * @param {Function} predicate - test called with (element, index, array)\n' +
            ' * @returns {*} the first matching element, or undefined\n' +
            ' */\n' +
            'Array.prototype.find = Array.prototype.find || function (predicate) {\n' +
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
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.findIndex is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.findIndex (SFMC SSJS).\n' +
            ' * @param {Function} predicate - test called with (element, index, array)\n' +
            ' * @returns {number} the index of the first match, or -1\n' +
            ' */\n' +
            'Array.prototype.findIndex = Array.prototype.findIndex || function (predicate) {\n' +
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
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.forEach is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.forEach (SFMC SSJS).\n' +
            ' * @param {Function} callback - called with (element, index, array)\n' +
            ' * @returns {void}\n' +
            ' */\n' +
            'Array.prototype.forEach = Array.prototype.forEach || function (callback) {\n' +
            "    if (typeof callback !== 'function') { return; }\n" +
            '    for (var i = 0; i < this.length; i++) {\n' +
            '        callback(this[i], i, this);\n' +
            '    }\n' +
            '};',
    },
    {
        method: 'includes',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.includes is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.includes (SFMC SSJS).\n' +
            ' * @param {*} searchValue - value to search for\n' +
            ' * @returns {boolean} true when the value is found\n' +
            ' */\n' +
            'Array.prototype.includes = Array.prototype.includes || function (searchValue) {\n' +
            '    for (var i = 0; i < this.length; i++) {\n' +
            '        if (this[i] === searchValue) { return true; }\n' +
            '    }\n' +
            '    return false;\n' +
            '};',
    },
    {
        method: 'indexOf',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: true,
        description: 'Array.prototype.indexOf is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.indexOf (SFMC SSJS).\n' +
            ' * @param {*} searchValue - value to search for\n' +
            ' * @param {number} [fromIndex] - index to start searching from (default 0)\n' +
            ' * @returns {number} the first matching index, or -1\n' +
            ' */\n' +
            'Array.prototype.indexOf = Array.prototype.indexOf || function (searchValue, fromIndex) {\n' +
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
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'broken',
        ambiguousWithString: true,
        description:
            'Array.prototype.lastIndexOf exists in SFMC SSJS but always returns -1. A polyfill is needed for correct results.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.lastIndexOf (SFMC SSJS).\n' +
            ' * @param {*} searchValue - value to search for\n' +
            ' * @param {number} [fromIndex] - index to start searching backwards from (default last index)\n' +
            ' * @returns {number} the last matching index, or -1\n' +
            ' */\n' +
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
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.map is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.map (SFMC SSJS).\n' +
            ' * @param {Function} callback - called with (element, index, array); its return value becomes the new element\n' +
            ' * @returns {Array} a new array of the callback results\n' +
            ' */\n' +
            'Array.prototype.map = Array.prototype.map || function (callback) {\n' +
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
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.reduce is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.reduce (SFMC SSJS).\n' +
            ' * @param {Function} callback - called with (accumulator, element, index, array)\n' +
            ' * @param {*} [initialValue] - initial accumulator value; defaults to the first element\n' +
            ' * @returns {*} the final accumulated value\n' +
            ' */\n' +
            'Array.prototype.reduce = Array.prototype.reduce || function (callback, initialValue) {\n' +
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
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.reduceRight is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.reduceRight (SFMC SSJS).\n' +
            ' * @param {Function} callback - called with (accumulator, element, index, array), iterating right to left\n' +
            ' * @param {*} [initialValue] - initial accumulator value; defaults to the last element\n' +
            ' * @returns {*} the final accumulated value\n' +
            ' */\n' +
            'Array.prototype.reduceRight = Array.prototype.reduceRight || function (callback, initialValue) {\n' +
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
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.some is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.some (SFMC SSJS).\n' +
            ' * @param {Function} predicate - test called with (element, index, array)\n' +
            ' * @returns {boolean} true when the predicate passes for any element\n' +
            ' */\n' +
            'Array.prototype.some = Array.prototype.some || function (predicate) {\n' +
            "    if (typeof predicate !== 'function') { return false; }\n" +
            '    for (var i = 0; i < this.length; i++) {\n' +
            '        if (predicate(this[i], i, this)) { return true; }\n' +
            '    }\n' +
            '    return false;\n' +
            '};',
    },
    {
        method: 'every',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.prototype.every is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.every (SFMC SSJS).\n' +
            ' * @param {Function} predicate - test called with (element, index, array)\n' +
            ' * @returns {boolean} true when the predicate passes for every element\n' +
            ' */\n' +
            'Array.prototype.every = Array.prototype.every || function (predicate) {\n' +
            "    if (typeof predicate !== 'function') { return true; }\n" +
            '    for (var i = 0; i < this.length; i++) {\n' +
            '        if (!predicate(this[i], i, this)) { return false; }\n' +
            '    }\n' +
            '    return true;\n' +
            '};',
    },
    {
        method: 'splice',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 3,
        isStatic: false,
        category: 'broken',
        ambiguousWithString: false,
        description:
            'Array.prototype.splice(start, deleteCount, item1, …, itemN) works in SFMC SSJS only for the two-argument delete form splice(start, deleteCount) (deleteCount may exceed the remaining length). The one-argument form splice(start) throws "Index was outside the bounds of the array." The insert form is also broken: as soon as a third argument (item1) is passed, the engine ignores start and deleteCount and just overwrites from the left with the items to insert. A polyfill is needed for the one-argument delete form and for any insert; it also accepts unlimited additional items. Verified on a CloudPage.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.prototype.splice (SFMC SSJS).\n' +
            ' * @param {number} start - index at which to start changing the array\n' +
            ' * @param {number} [deleteCount] - number of elements to remove (default: all from start)\n' +
            ' * @param {...*} [items] - elements to insert at start\n' +
            ' * @returns {Array} an array of the removed elements\n' +
            ' */\n' +
            'Array.prototype.splice = function (start, deleteCount) {\n' +
            '    var arr = this;\n' +
            '    var len = arr.length;\n' +
            '    start = start < 0 ? (len + start < 0 ? 0 : len + start) : (start > len ? len : start);\n' +
            '    var removeCount = arguments.length < 2 ? len - start : (deleteCount < 0 ? 0 : deleteCount);\n' +
            '    if (removeCount > len - start) { removeCount = len - start; }\n' +
            '    var endIndex = start + removeCount;\n' +
            '    var before = [];\n' +
            '    var removed = [];\n' +
            '    var after = [];\n' +
            '    for (var i = 0; i < len; i++) {\n' +
            '        if (i < start) { before.push(arr[i]); }\n' +
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
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'String.prototype.trim is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for String.prototype.trim (SFMC SSJS).\n' +
            ' * @returns {string} the string with leading and trailing whitespace removed\n' +
            ' */\n' +
            'String.prototype.trim = String.prototype.trim || function () {\n' +
            "    return this.replace(/^[\\s\\uFEFF\\xA0]+|[\\s\\uFEFF\\xA0]+$/g, '');\n" +
            '};',
    },
    {
        method: 'startsWith',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'String.prototype.startsWith is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for String.prototype.startsWith (SFMC SSJS).\n' +
            ' * @param {string} searchString - characters to search for at the start\n' +
            ' * @param {number} [position] - position to start searching from (default 0)\n' +
            ' * @returns {boolean} true when the string starts with searchString\n' +
            ' */\n' +
            'String.prototype.startsWith = String.prototype.startsWith || function (searchString, position) {\n' +
            '    position = position || 0;\n' +
            '    return this.indexOf(searchString, position) === position;\n' +
            '};',
    },
    {
        method: 'endsWith',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'String.prototype.endsWith is not available in SFMC SSJS.',
        // NOTE: the second parameter must NOT be named `length`. A function parameter named
        // `length` collides with the SSJS engine's internal length intrinsic and throws
        // "invalid length" at runtime (verified on a CloudPage). It is renamed to
        // `endPosition` here. An empty search string is short-circuited to `true` because
        // `substring(len, len)` does not reliably yield an empty string on this engine.
        polyfill:
            '/**\n' +
            ' * Polyfill for String.prototype.endsWith (SFMC SSJS).\n' +
            ' * @param {string} searchString - characters to search for at the end\n' +
            ' * @param {number} [endPosition] - position treated as the end of the string (default string length)\n' +
            ' * @returns {boolean} true when the string ends with searchString\n' +
            ' */\n' +
            'String.prototype.endsWith = String.prototype.endsWith || function (searchString, endPosition) {\n' +
            '    var str = String(this);\n' +
            '    var search = String(searchString);\n' +
            '    if (search.length === 0) { return true; }\n' +
            '    var strLen = str.length;\n' +
            '    var end = (endPosition === undefined || endPosition > strLen) ? strLen : Number(endPosition);\n' +
            '    if (end < 0) { end = 0; }\n' +
            '    var start = end - search.length;\n' +
            '    if (start < 0) { return false; }\n' +
            '    return str.substring(start, end) === search;\n' +
            '};',
    },
    {
        method: 'bind',
        owner: 'Function.prototype',
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description:
            'Function.prototype.bind is not available in SFMC SSJS, and Function.prototype is sealed so it cannot be installed on the prototype. Use the standalone bindFn helper instead: bindFn(fn, thisArg[, ...preArgs]) returns a new function with `this` and any leading arguments pre-bound. (call() and apply() are available natively.)',
        polyfill:
            '/**\n' +
            ' * Standalone replacement for the sealed Function.prototype bind method (SFMC SSJS).\n' +
            ' * @param {Function} fn - the function to bind\n' +
            ' * @param {*} thisArg - the value to use as `this` when calling fn\n' +
            ' * @param {...*} [preArgs] - arguments to prepend to every call\n' +
            ' * @returns {Function} a new function with `this` and leading arguments pre-bound\n' +
            ' */\n' +
            'function bindFn(fn, thisArg) {\n' +
            '    var preArgs = [];\n' +
            '    for (var i = 2; i < arguments.length; i++) { preArgs.push(arguments[i]); }\n' +
            '    return function () {\n' +
            '        var callArgs = [];\n' +
            '        for (var a = 0; a < preArgs.length; a++) { callArgs.push(preArgs[a]); }\n' +
            '        for (var b = 0; b < arguments.length; b++) { callArgs.push(arguments[b]); }\n' +
            '        return fn.apply(thisArg, callArgs);\n' +
            '    };\n' +
            '}',
    },
    {
        method: 'toISOString',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description:
            'Date.prototype.toISOString is not available in SFMC SSJS (typeof d.toISOString is undefined; calling it throws "Object expected: toISOString"). ' +
            'Date.prototype.toJSON is also absent because it depends on toISOString. Installing a working method on Date.prototype is unreliable here, ' +
            'so use the standalone toISOStringUTC helper instead: toISOStringUTC(date) builds the ISO 8601 UTC string from the working getUTC* getters.',
        polyfill:
            '/**\n' +
            ' * Standalone replacement for the missing Date.prototype.toISOString (SFMC SSJS).\n' +
            ' * @param {Date} d - the date to serialize\n' +
            ' * @returns {string} the date in ISO 8601 UTC form, e.g. "2026-06-18T00:00:00Z"\n' +
            ' */\n' +
            'function toISOStringUTC(d) {\n' +
            "    function pad(n) { return n < 10 ? '0' + n : '' + n; }\n" +
            "    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +\n" +
            "        'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';\n" +
            '}',
    },
    {
        method: 'isArray',
        owner: 'Array',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.isArray is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.isArray (SFMC SSJS).\n' +
            ' * @param {*} value - the value to test\n' +
            ' * @returns {boolean} true when the value is an Array\n' +
            ' */\n' +
            'Array.isArray = Array.isArray || function (value) {\n' +
            "    return Object.prototype.toString.call(value) === '[object Array]';\n" +
            '};',
    },
    {
        method: 'of',
        owner: 'Array',
        isConfirmed: true,
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        ambiguousWithString: false,
        description: 'Array.of is not available in SFMC SSJS.',
        polyfill:
            '/**\n' +
            ' * Polyfill for Array.of (SFMC SSJS).\n' +
            ' * @param {...*} [items] - elements to place in the new array\n' +
            ' * @returns {Array} a new array containing the arguments\n' +
            ' */\n' +
            'Array.of = Array.of || function () {\n' +
            '    var result = [];\n' +
            '    for (var i = 0; i < arguments.length; i++) {\n' +
            '        result.push(arguments[i]);\n' +
            '    }\n' +
            '    return result;\n' +
            '};',
    },
    {
        method: 'substr',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 3,
        isStatic: false,
        category: 'unavailable',
        ambiguousWithString: false,
        description:
            'String.prototype.substr is not available in SFMC SSJS (calling it throws). ' +
            'Use substring() or this polyfill that maps (start, length) onto substring().',
        polyfill:
            '/**\n' +
            ' * Polyfill for String.prototype.substr (SFMC SSJS).\n' +
            ' * @param {number} start - index to start extracting from (negative counts from the end)\n' +
            ' * @param {number} [length] - number of characters to extract (default: to the end)\n' +
            ' * @returns {string} the extracted substring\n' +
            ' */\n' +
            'String.prototype.substr = String.prototype.substr || function (start, length) {\n' +
            '    var len = this.length;\n' +
            '    var from = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);\n' +
            '    var to = length === undefined ? len : from + (length < 0 ? 0 : length);\n' +
            '    return this.substring(from, to);\n' +
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

// ── Known-unsupported ECMAScript members (no polyfill shipped) ───────────────
// Members empirically confirmed to be ABSENT or BROKEN in the SFMC SSJS engine
// via the ecmascript-confirm-*.cloudpage.ssjs probes, and NOT covered by
// POLYFILLABLE_METHODS. Consumers (sfmc-language-lsp validateSsjs, the ESLint
// plugin, the VS Code extension, and mcp-server-sfmc) use this list to warn when
// generated or authored SSJS references a member that will fail at runtime.
//
// `category`:
//   'unavailable' — the member does not exist (calling/reading it throws or is undefined)
//   'broken'      — the member exists but returns wrong results in all/most forms
// `hasPolyfill` — true ONLY when a verified polyfill source for this member
//   actually exists in POLYFILLABLE_METHODS (so consumers can offer an
//   "insert polyfill" quick-fix). false when there is no polyfill source —
//   the member is left to TypeScript's native diagnostics (and, for some,
//   a "replace with Platform.Function.*" suggestion). Do NOT set true merely
//   because a polyfill is theoretically feasible.
// `suggestion` — short guidance shown to the user.

/** @type {{member: string, owner: string, esVersion: 3 | 5 | 6, isStatic: boolean, isProperty?: boolean, category: 'unavailable' | 'broken', hasPolyfill: boolean, suggestion: string, replacement?: string}[]} */
export const KNOWN_UNSUPPORTED = [
    // ── Confirmed-missing / broken global identifiers ────────────────────────
    // Runtime-verified absent on ssjs/MCDEV_Training_QA (typeof === "undefined").
    {
        member: 'escape',
        owner: 'Global',
        esVersion: 3,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'The legacy escape() function is undefined in SFMC (calling it throws "Object expected"). Use encodeURIComponent() instead.',
    },
    {
        member: 'unescape',
        owner: 'Global',
        esVersion: 3,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'The legacy unescape() function is undefined in SFMC (calling it throws "Object expected"). Use decodeURIComponent() instead.',
    },
    {
        member: 'globalThis',
        owner: 'GlobalValues',
        esVersion: 2020,
        isStatic: false,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'globalThis is undefined in SFMC (ES2020). There is no standard global-object reference; top-level this is unusable. Reference specific globals (Platform, Variable, …) directly.',
    },
    {
        member: 'Symbol',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Symbol is undefined in SFMC (ES6). No unique-primitive type and no well-known symbols (Symbol.iterator), so there is no iterator protocol. Use namespaced string keys and classic index loops.',
    },
    {
        member: 'BigInt',
        owner: 'Global',
        esVersion: 2020,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'BigInt is undefined in SFMC (ES2020) and the 10n literal is a syntax error. All numbers are IEEE-754 doubles; keep large exact integers as strings.',
    },
    {
        member: 'Map',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Map is undefined in SFMC (ES6); new Map() throws "Unknown type: Map". Use a plain object as a string-keyed dictionary (obj[key] = value).',
    },
    {
        member: 'Set',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Set is undefined in SFMC (ES6); new Set() throws "Unknown type: Set". Use a plain object whose keys are the members (obj[member] = true).',
    },
    {
        member: 'WeakMap',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'WeakMap is undefined in SFMC (ES6); new WeakMap() throws "Unknown type: WeakMap". No weak-reference collections exist; use a plain object dictionary and delete keys manually.',
    },
    {
        member: 'WeakSet',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'WeakSet is undefined in SFMC (ES6); new WeakSet() throws "Unknown type: WeakSet". No weak-reference collections exist.',
    },
    {
        member: 'Promise',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Promise is undefined in SFMC (ES6); new Promise() throws "Unknown type: Promise". The engine runs synchronously with no event loop; all Platform/HTTP calls block and return values directly.',
    },
    {
        member: 'Iterator',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Iterator is undefined in SFMC (ES6). With no Symbol.iterator there is no iteration protocol; for…of, spread, and destructuring over iterables are unavailable. Use classic index loops.',
    },
    {
        member: 'Generator',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Generator is undefined in SFMC (ES6); function* / yield syntax is a parse error. Return a fully-materialised array instead of yielding lazily.',
    },
    {
        member: 'GeneratorFunction',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'GeneratorFunction is undefined in SFMC (ES6). Generator functions are not supported by the parser.',
    },
    {
        member: 'AsyncFunction',
        owner: 'Global',
        esVersion: 2017,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'AsyncFunction is undefined in SFMC (ES2017); async/await is unsupported. The engine is synchronous — model async work as ordinary blocking calls.',
    },
    {
        member: 'AsyncGenerator',
        owner: 'Global',
        esVersion: 2018,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'AsyncGenerator is undefined in SFMC (ES2018); async iteration is unsupported.',
    },
    {
        member: 'AsyncGeneratorFunction',
        owner: 'Global',
        esVersion: 2018,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'AsyncGeneratorFunction is undefined in SFMC (ES2018); async generator functions are unsupported.',
    },
    {
        member: 'AsyncIterator',
        owner: 'Global',
        esVersion: 2018,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'AsyncIterator is undefined in SFMC (ES2018); async iteration is unsupported.',
    },
    {
        member: 'Proxy',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Proxy is undefined in SFMC (ES6); new Proxy() throws "Unknown type: Proxy". There is no trap-based interception; wrap objects in explicit accessor functions.',
    },
    {
        member: 'Reflect',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Reflect is undefined in SFMC (ES6). Use ES5 equivalents: Reflect.has → k in o, Reflect.get → o[k], Reflect.set → o[k]=v, Reflect.deleteProperty → delete o[k], Reflect.ownKeys → Object.keys(o).',
    },
    {
        member: 'AggregateError',
        owner: 'Global',
        esVersion: 2021,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'AggregateError is undefined in SFMC (ES2021); new AggregateError() throws "Unknown type: AggregateError". Use the base Error constructor with a combined message.',
    },
    {
        member: 'SuppressedError',
        owner: 'Global',
        esVersion: 2026,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'SuppressedError is undefined in SFMC (ES2026); it does not exist in this engine. Use the base Error constructor.',
    },
    {
        member: 'InternalError',
        owner: 'Global',
        esVersion: 0,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'InternalError is a non-standard Mozilla-only error and is undefined in SFMC. Use the base Error constructor.',
    },
    // ── Typed arrays / binary buffers (ES6+) — runtime-verified absent ────────
    {
        member: 'ArrayBuffer',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'ArrayBuffer is undefined in SFMC (ES6). There is no raw byte-buffer type; use a plain Array for numeric lists or Base64 strings (Platform.Function.Base64Encode/Decode) for binary payloads.',
    },
    {
        member: 'SharedArrayBuffer',
        owner: 'Global',
        esVersion: 2017,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'SharedArrayBuffer is undefined in SFMC (ES2017). The engine is single-threaded and synchronous, so there is no shared memory.',
    },
    {
        member: 'DataView',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'DataView is undefined in SFMC (ES6). With no ArrayBuffer there is nothing to read/write; handle binary data as Base64 strings instead.',
    },
    {
        member: 'Atomics',
        owner: 'Global',
        esVersion: 2017,
        isStatic: false,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Atomics is undefined in SFMC (ES2017). Atomic operations require shared memory, which does not exist in this single-threaded engine.',
    },
    {
        member: 'Int8Array',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Int8Array is undefined in SFMC (ES6). Typed-array views are unavailable (no ArrayBuffer); use a plain Array of numbers and enforce ranges yourself.',
    },
    {
        member: 'Uint8Array',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Uint8Array is undefined in SFMC (ES6). Typed-array views are unavailable (no ArrayBuffer); use a plain Array of numbers and enforce ranges yourself.',
    },
    {
        member: 'Uint8ClampedArray',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Uint8ClampedArray is undefined in SFMC (ES6). Typed-array views are unavailable (no ArrayBuffer); use a plain Array and clamp values (0–255) yourself.',
    },
    {
        member: 'Int16Array',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Int16Array is undefined in SFMC (ES6). Typed-array views are unavailable (no ArrayBuffer); use a plain Array of numbers.',
    },
    {
        member: 'Uint16Array',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Uint16Array is undefined in SFMC (ES6). Typed-array views are unavailable (no ArrayBuffer); use a plain Array of numbers.',
    },
    {
        member: 'Int32Array',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Int32Array is undefined in SFMC (ES6). Typed-array views are unavailable (no ArrayBuffer); use a plain Array of numbers.',
    },
    {
        member: 'Uint32Array',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Uint32Array is undefined in SFMC (ES6). Typed-array views are unavailable (no ArrayBuffer); use a plain Array of numbers.',
    },
    {
        member: 'Float16Array',
        owner: 'Global',
        esVersion: 2025,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Float16Array is undefined in SFMC (ES2025). Typed-array views are unavailable (no ArrayBuffer); use a plain Array of numbers.',
    },
    {
        member: 'Float32Array',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Float32Array is undefined in SFMC (ES6). Typed-array views are unavailable (no ArrayBuffer); use a plain Array of numbers.',
    },
    {
        member: 'Float64Array',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Float64Array is undefined in SFMC (ES6). Typed-array views are unavailable (no ArrayBuffer); use a plain Array of numbers.',
    },
    {
        member: 'BigInt64Array',
        owner: 'Global',
        esVersion: 2020,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'BigInt64Array is undefined in SFMC (ES2020). Typed-array views are unavailable (no ArrayBuffer), and it also requires BigInt, which is likewise absent.',
    },
    {
        member: 'BigUint64Array',
        owner: 'Global',
        esVersion: 2020,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'BigUint64Array is undefined in SFMC (ES2020). Typed-array views are unavailable (no ArrayBuffer), and it also requires BigInt, which is likewise absent.',
    },
    // ── Memory management (ES2021) — runtime-verified absent ──────────────────
    {
        member: 'WeakRef',
        owner: 'Global',
        esVersion: 2021,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'WeakRef is undefined in SFMC (ES2021). There is no weak-reference mechanism; hold a normal variable, which is released when the request-scoped script ends.',
    },
    {
        member: 'FinalizationRegistry',
        owner: 'Global',
        esVersion: 2021,
        isStatic: false,
        isProperty: false,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'FinalizationRegistry is undefined in SFMC (ES2021). You cannot register garbage-collection callbacks; perform cleanup explicitly at the end of the script.',
    },
    // ── Internationalization (ES2015) — runtime-verified absent ───────────────
    {
        member: 'Intl',
        owner: 'Global',
        esVersion: 2015,
        isStatic: false,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Intl is undefined in SFMC (ES2015); none of its formatters (NumberFormat, DateTimeFormat, Collator, …) exist. The toLocale* methods also ignore locale arguments. Use Platform.Function.FormatNumber / FormatDate with a culture code for locale-aware formatting.',
    },
    {
        member: 'Infinity',
        owner: 'GlobalValues',
        esVersion: 3,
        isStatic: false,
        isProperty: true,
        category: 'broken',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'The Infinity global is broken in SFMC: its sign is inverted in comparisons and string coercion (Infinity > 0 is false, String(Infinity) is "-infinity"). Compare against a concrete numeric literal instead of Infinity/-Infinity.',
    },
    {
        member: 'NaN',
        owner: 'GlobalValues',
        esVersion: 3,
        isStatic: false,
        isProperty: true,
        category: 'broken',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'The NaN global compares correctly (NaN === NaN is false; isNaN(NaN) is true) but String(NaN) is the lowercase "nan" instead of "NaN".',
    },
    // ── Confirmed-missing properties/constants ───────────────────────────────
    {
        member: 'LOG10E',
        owner: 'Math',
        esVersion: 3,
        isStatic: true,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.LOG10E is undefined in SFMC. Use the literal 0.4342944819032518.',
    },
    {
        member: 'ignoreCase',
        owner: 'RegExp',
        isConfirmed: true,
        esVersion: 3,
        isStatic: false,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'RegExp.prototype.ignoreCase is undefined in SFMC. Track the i flag yourself when constructing the RegExp.',
    },
    {
        member: 'multiline',
        owner: 'RegExp',
        isConfirmed: true,
        esVersion: 3,
        isStatic: false,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'RegExp.prototype.multiline is undefined in SFMC. Track the m flag yourself when constructing the RegExp.',
    },
    {
        member: 'instanceof',
        owner: 'RegExp',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies re instanceof RegExp returns true for any RegExp object, including new RegExp(...). In the SFMC Jint engine it is ALWAYS false, even for new RegExp(...). Unlike Function (where instanceof works but .constructor is broken), for RegExp the reverse holds: re.constructor === RegExp correctly returns true. Use the constructor comparison to detect a RegExp.',
        esVersion: 3,
        isStatic: false,
        isProperty: false,
        category: 'broken',
        hasPolyfill: false,
        suggestion:
            'The instanceof operator against RegExp is broken in SFMC: `re instanceof RegExp` always returns false, even for objects created with `new RegExp(...)`. Use `re.constructor === RegExp` instead (that comparison works correctly).',
    },
    // ── Function.prototype members missing/broken in SFMC ────────────────────
    {
        member: 'length',
        owner: 'Function.prototype',
        isConfirmed: true,
        differsFromOfficialDocs: true,
        officialDocsNote:
            'MDN specifies fn.length returns the arity (number of declared parameters). In the SFMC Jint engine reading fn.length THROWS "Object reference not set to an instance of an object." and fn.hasOwnProperty("length") returns false. There is no way to read a function\'s declared parameter count at runtime.',
        esVersion: 3,
        isStatic: false,
        isProperty: true,
        category: 'broken',
        hasPolyfill: false,
        suggestion:
            'fn.length throws "Object reference not set to an instance of an object." in SFMC (does not return the declared argument count). hasOwnProperty("length") is false. Track expected arity yourself instead of reading fn.length.',
    },
    {
        member: 'name',
        owner: 'Function.prototype',
        isConfirmed: true,
        esVersion: 3,
        isStatic: false,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'fn.name is undefined in SFMC (it does not return the function name). Pass an explicit name string where you need it instead of reading fn.name.',
    },
    {
        member: 'caller',
        owner: 'Function.prototype',
        isConfirmed: true,
        esVersion: 3,
        isStatic: false,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'fn.caller is undefined in SFMC (the deprecated caller property is not exposed). Do not rely on caller-chain introspection.',
    },
    // ── Confirmed-missing Date members ───────────────────────────────────────
    {
        member: 'toJSON',
        owner: 'Date.prototype',
        isConfirmed: true,
        esVersion: 5,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Date.prototype.toJSON is unavailable in SFMC (it depends on the absent toISOString). Serialize dates with a manual ISO string built from the getUTC* methods.',
    },
    // ── JSON (entire object is undefined) ────────────────────────────────────
    {
        member: 'parse',
        owner: 'JSON',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'JSON is undefined in SFMC SSJS. Use Platform.Function.ParseJSON(string) instead of JSON.parse.',
        replacement: 'Platform.Function.ParseJSON',
    },
    {
        member: 'stringify',
        owner: 'JSON',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'JSON is undefined in SFMC SSJS. Use Platform.Function.Stringify(value) instead of JSON.stringify.',
        replacement: 'Platform.Function.Stringify',
    },
    // ── Object.prototype members that exist but are broken ───────────────────
    {
        member: 'isPrototypeOf',
        owner: 'Object.prototype',
        isConfirmed: true,
        esVersion: 3,
        isStatic: false,
        category: 'broken',
        hasPolyfill: false,
        suggestion:
            'Object.prototype.isPrototypeOf exists but HANGS the Jint engine when called (the CloudPage times out / never returns). Do not call it. Compare prototypes directly (e.g. obj.constructor === Ctor) or walk the prototype chain manually.',
    },
    {
        member: 'propertyIsEnumerable',
        owner: 'Object.prototype',
        isConfirmed: true,
        esVersion: 3,
        isStatic: false,
        category: 'broken',
        hasPolyfill: false,
        suggestion:
            'Object.prototype.propertyIsEnumerable exists but is broken: it returns false for own enumerable properties (should be true). Use hasOwnProperty for own-property checks instead.',
    },
    // ── Object statics (ES5/ES6) confirmed missing ───────────────────────────
    {
        member: 'keys',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion: 'Object.keys is unavailable in SFMC. Use a for...in loop with hasOwnProperty.',
    },
    {
        member: 'values',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.values is unavailable in SFMC. Collect values with a for...in loop and hasOwnProperty.',
    },
    {
        member: 'entries',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.entries is unavailable in SFMC. Build [key, value] pairs with a for...in loop and hasOwnProperty.',
    },
    {
        member: 'assign',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.assign is unavailable in SFMC. Copy properties with a for...in loop and hasOwnProperty.',
    },
    {
        member: 'create',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.create is unavailable in SFMC. Use a constructor function with a prototype instead.',
    },
    {
        member: 'freeze',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.freeze is unavailable in SFMC and immutability cannot be enforced; treat the object as read-only by convention.',
    },
    {
        member: 'getOwnPropertyNames',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.getOwnPropertyNames is unavailable in SFMC. Use a for...in loop with hasOwnProperty (enumerable own keys only).',
    },
    {
        member: 'defineProperties',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.defineProperties is unavailable in SFMC (only the singular Object.defineProperty works). Call Object.defineProperty once per property.',
    },
    {
        member: 'getOwnPropertyDescriptor',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.getOwnPropertyDescriptor is unavailable in SFMC. Read the property value directly and use hasOwnProperty to test ownership.',
    },
    {
        member: 'isFrozen',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.isFrozen is unavailable in SFMC (freeze itself is missing). There is no runtime immutability to test.',
    },
    {
        member: 'seal',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.seal is unavailable in SFMC. There is no way to prevent adding/removing properties at runtime.',
    },
    {
        member: 'isSealed',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion: 'Object.isSealed is unavailable in SFMC (seal itself is missing).',
    },
    {
        member: 'preventExtensions',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.preventExtensions is unavailable in SFMC. Objects remain extensible at runtime.',
    },
    {
        member: 'isExtensible',
        owner: 'Object',
        isConfirmed: true,
        esVersion: 5,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Object.isExtensible is unavailable in SFMC (preventExtensions itself is missing).',
    },
    // ── String ES6 members confirmed missing ─────────────────────────────────
    {
        member: 'trimStart',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion: String.raw`String.prototype.trimStart is unavailable in SFMC. Use a /^\s+/ replace.`,
    },
    {
        member: 'trimEnd',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion: String.raw`String.prototype.trimEnd is unavailable in SFMC. Use a /\s+$/ replace.`,
    },
    {
        member: 'padStart',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'String.prototype.padStart is unavailable in SFMC. Prepend pad characters in a loop.',
    },
    {
        member: 'padEnd',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'String.prototype.padEnd is unavailable in SFMC. Append pad characters in a loop.',
    },
    {
        member: 'repeat',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'String.prototype.repeat is unavailable in SFMC. Concatenate in a loop, or use Platform.Function.* helpers.',
    },
    {
        member: 'includes',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion: 'String.prototype.includes is unavailable in SFMC. Use indexOf(substr) !== -1.',
    },
    {
        member: 'codePointAt',
        owner: 'String.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'String.prototype.codePointAt is unavailable in SFMC. Use charCodeAt for BMP characters.',
    },
    // ── Array ES6 members confirmed missing ──────────────────────────────────
    {
        member: 'flat',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Array.prototype.flat is unavailable in SFMC. Concatenate nested arrays manually in a loop.',
    },
    {
        member: 'flatMap',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Array.prototype.flatMap is unavailable in SFMC. Build the result with a for loop and push.',
    },
    {
        member: 'findLast',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Array.prototype.findLast is unavailable in SFMC. Iterate from the end with a for loop.',
    },
    {
        member: 'at',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Array.prototype.at is unavailable in SFMC. Use arr[i] (and arr[arr.length + i] for negative i).',
    },
    {
        member: 'keys',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion: 'Array.prototype.keys is unavailable in SFMC. Use a standard index for loop.',
    },
    {
        member: 'values',
        owner: 'Array.prototype',
        isConfirmed: true,
        esVersion: 6,
        isStatic: false,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion: 'Array.prototype.values is unavailable in SFMC. Use a standard index for loop.',
    },
    {
        member: 'from',
        owner: 'Array',
        isConfirmed: true,
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        suggestion:
            'Array.from is unavailable in SFMC. Build the array with a for loop over the source.',
    },
    // ── Number statics (ES6) confirmed missing ───────────────────────────────
    {
        member: 'isInteger',
        owner: 'Number',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Number.isInteger is unavailable in SFMC. Use typeof n === "number" && Math.floor(n) === n.',
    },
    {
        member: 'isNaN',
        owner: 'Number',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Number.isNaN is unavailable in SFMC. Use the global isNaN(value).',
    },
    {
        member: 'isFinite',
        owner: 'Number',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Number.isFinite is unavailable in SFMC. Use the global isFinite(value).',
    },
    {
        member: 'parseInt',
        owner: 'Number',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Number.parseInt is unavailable in SFMC. Use the global parseInt(string, 10).',
    },
    {
        member: 'MAX_SAFE_INTEGER',
        owner: 'Number',
        esVersion: 6,
        isStatic: true,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Number.MAX_SAFE_INTEGER is undefined in SFMC. Use the literal 9007199254740991.',
    },
    {
        member: 'isSafeInteger',
        owner: 'Number',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Number.isSafeInteger is unavailable in SFMC. Compare Math.abs(n) against the literal 9007199254740991 after confirming n is an integer.',
    },
    {
        member: 'parseFloat',
        owner: 'Number',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Number.parseFloat is unavailable in SFMC. Use the global parseFloat(string).',
    },
    {
        member: 'MIN_SAFE_INTEGER',
        owner: 'Number',
        esVersion: 6,
        isStatic: true,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Number.MIN_SAFE_INTEGER is undefined in SFMC. Use the literal -9007199254740991.',
    },
    {
        member: 'EPSILON',
        owner: 'Number',
        esVersion: 6,
        isStatic: true,
        isProperty: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Number.EPSILON is undefined in SFMC. Use the literal 2.220446049250313e-16.',
    },
    // ── Math ES6 methods confirmed missing ───────────────────────────────────
    {
        member: 'trunc',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.trunc is unavailable in SFMC. Use x < 0 ? Math.ceil(x) : Math.floor(x).',
    },
    {
        member: 'sign',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.sign is unavailable in SFMC. Use x > 0 ? 1 : x < 0 ? -1 : 0.',
    },
    {
        member: 'cbrt',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.cbrt is unavailable in SFMC. Use Math.pow(x, 1 / 3) for non-negative x.',
    },
    {
        member: 'log2',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.log2 is unavailable in SFMC. Use Math.log(x) / Math.LN2.',
    },
    {
        member: 'log10',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.log10 is unavailable in SFMC. Use Math.log(x) / Math.LN10.',
    },
    {
        member: 'hypot',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.hypot is unavailable in SFMC. Use Math.sqrt(a * a + b * b).',
    },
    {
        member: 'expm1',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.expm1 is unavailable in SFMC. Use Math.exp(x) - 1.',
    },
    {
        member: 'log1p',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.log1p is unavailable in SFMC. Use Math.log(1 + x).',
    },
    {
        member: 'sinh',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.sinh is unavailable in SFMC. Use (Math.exp(x) - Math.exp(-x)) / 2.',
    },
    {
        member: 'cosh',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.cosh is unavailable in SFMC. Use (Math.exp(x) + Math.exp(-x)) / 2.',
    },
    {
        member: 'tanh',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Math.tanh is unavailable in SFMC. Use (Math.exp(2 * x) - 1) / (Math.exp(2 * x) + 1).',
    },
    {
        member: 'asinh',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.asinh is unavailable in SFMC. Use Math.log(x + Math.sqrt(x * x + 1)).',
    },
    {
        member: 'acosh',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.acosh is unavailable in SFMC. Use Math.log(x + Math.sqrt(x * x - 1)).',
    },
    {
        member: 'atanh',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion: 'Math.atanh is unavailable in SFMC. Use Math.log((1 + x) / (1 - x)) / 2.',
    },
    {
        member: 'clz32',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Math.clz32 is unavailable in SFMC. Count leading zero bits manually over a 32-bit unsigned value.',
    },
    {
        member: 'fround',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Math.fround is unavailable in SFMC. There is no ES3-safe equivalent; keep values as doubles.',
    },
    {
        member: 'imul',
        owner: 'Math',
        esVersion: 6,
        isStatic: true,
        category: 'unavailable',
        hasPolyfill: false,
        isConfirmed: true,
        suggestion:
            'Math.imul is unavailable in SFMC. Emulate 32-bit integer multiplication with bitwise operations if needed.',
    },
];

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
