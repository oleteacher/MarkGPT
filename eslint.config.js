import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: {
                ...globals.node,
                ...globals.browser,
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            strict: ['error', 'global'],
            'no-unused-vars': [
                'error',
                { args: 'none', ignoreRestSiblings: true },
            ],
            'no-console': 'warn',
            eqeqeq: ['error', 'always'],
            curly: 'error',
            quotes: ['error', 'single', { avoidEscape: true }],
            semi: ['error', 'always'],
            indent: ['error', 2],
            'no-var': 'error',
            'prefer-const': 'error',
            'no-debugger': 'error',
            'no-empty-function': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-empty-function': 'error',
        },
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
            'no-undef': 'off', // TypeScript handles this
        },
    },
    prettier,
];
