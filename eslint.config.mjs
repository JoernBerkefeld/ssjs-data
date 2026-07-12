import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';
import js from '@eslint/js';

/** Flat ESLint config — aligned with `.cursor/rules/new-subproject-setup.mdc` (JSDoc rules relaxed for large catalogs). */
export default [
    {
        ignores: ['**/node_modules/**', '**/dist/**', '**/out/**', '**/coverage/**'],
    },
    js.configs.recommended,
    eslintPluginPrettierRecommended,
    jsdoc.configs['flat/recommended'],
    eslintPluginUnicorn.configs['recommended'],
    {
        languageOptions: {
            globals: {
                ...globals.nodeBuiltin,
                Atomics: 'readonly',
                SharedArrayBuffer: 'readonly',
            },
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        settings: {
            jsdoc: {
                mode: 'typescript',
                preferredTypes: {
                    array: 'Array',
                    'array.<>': '[]',
                    'Array.<>': '[]',
                    'array<>': '[]',
                    'Array<>': '[]',
                    Object: 'object',
                    'object.<>': 'Object.<>',
                    'object<>': 'Object.<>',
                    'Object<>': 'Object.<>',
                    set: 'Set',
                    'set.<>': 'Set.<>',
                    'set<>': 'Set.<>',
                    'Set<>': 'Set.<>',
                    promise: 'Promise',
                    'promise.<>': 'Promise.<>',
                    'promise<>': 'Promise.<>',
                    'Promise<>': 'Promise.<>',
                },
            },
        },
        rules: {
            'logical-assignment-operators': ['error', 'always'],
            // Kept off: the exported catalog uses `null` for fields like
            // `ampscriptEquivalent` (null = SSJS-only, no AMP equivalent). This is a
            // hard contract with sfmc-language-lsp / mcp-server-sfmc conversion maps
            // (see mcp-conversion-rules-sync.mdc) — switching to `undefined` would
            // change the exported data shape and break those consumers.
            'unicorn/no-null': 'off',
            // Kept off: re-enabling forces purely-cosmetic renames of abbreviated
            // identifiers (dir→directory, params→parameters, fn→function_, …) across
            // the generator scripts with no runtime/contract benefit.
            'unicorn/name-replacements': 'off',
            'arrow-body-style': ['error', 'as-needed'],
            curly: 'error',
            'no-console': 'warn',
            'jsdoc/check-line-alignment': 2,
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param-type': 'off',
            'jsdoc/tag-lines': ['warn', 'any', { startLines: 1 }],
            'jsdoc/no-undefined-types': 'off',
            'jsdoc/valid-types': 'off',
            'spaced-comment': [
                'warn',
                'always',
                {
                    block: {
                        exceptions: ['*'],
                        balanced: true,
                    },
                },
            ],
        },
    },
    {
        files: ['**/*.{js,mjs,cjs}'],
        rules: {
            'no-var': 'error',
            'prefer-const': 'error',
            'prettier/prettier': 'warn',
            'prefer-arrow-callback': 'warn',
        },
    },
];
