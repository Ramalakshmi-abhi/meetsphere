import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const browserGlobals = {
    alert: 'readonly',
    Blob: 'readonly',
    clearTimeout: 'readonly',
    console: 'readonly',
    confirm: 'readonly',
    document: 'readonly',
    fetch: 'readonly',
    FormData: 'readonly',
    localStorage: 'readonly',
    navigator: 'readonly',
    setTimeout: 'readonly',
    URL: 'readonly',
    window: 'readonly',
};

export default [
    {
        ignores: ['dist/**', 'node_modules/**', 'eslint.config.js', 'vite.config.js'],
    },
    {
        files: ['src/**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: browserGlobals,
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        plugins: {
            react,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            ...reactRefresh.configs.vite.rules,
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^(React|_)' }],
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',
            'react-refresh/only-export-components': 'off',
        },
    },
];
