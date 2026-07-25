import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'assets/**', 'public/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions,
      },
    },
    rules: {
      'no-undef': 'off',
      'no-eval': 'error',
      'no-new-func': 'error',
      // Sanitization intentionally matches disallowed ASCII control ranges.
      'no-control-regex': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      // Async generator mocks may intentionally complete without yielding.
      'require-yield': 'off',
    },
  },
  {
    files: ['tests/e2e/extension-fixtures.ts'],
    rules: {
      // Playwright requires object destructuring even for dependency-free fixtures.
      'no-empty-pattern': 'off',
    },
  },
);
