import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    '.next/**',
    '.open-next/**',
    '.worktrees/**',
    '.wrangler/**',
    'node_modules/**',
    'playwright-report/**',
    'test-results/**',
  ]),
  {
    rules: {
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
