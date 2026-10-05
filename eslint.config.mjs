import nextPlugin from '@next/eslint-plugin-next';
import hooks from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// Preserve the existing hook and Next.js lint checks while migrating off next lint.
export default [{
  files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { '@next/next': nextPlugin, 'react-hooks': hooks, react, 'jsx-a11y': jsxA11y },
  settings: { react: { version: 'detect' } },
  rules: {
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
    ...jsxA11y.configs.recommended.rules,
    // Named scroll regions must be focusable so keyboard users can pan drawings.
    'jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['region', 'tabpanel'] }],
    'react/prop-types': 'off', // Component props are checked by TypeScript.
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs['core-web-vitals'].rules,
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
}];
