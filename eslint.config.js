const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const globals = require('globals')

/*
  Flat config, replacing an .eslintrc.js that ESLint refused to load at all: it set
  '@typescript-eslint/no-namespace' to `{ allowDeclarations: true }`, and a rule's first
  element has to be a severity. Every project that inherited it - including the Next.js
  chat app's build - failed on that one line.
*/
module.exports = tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '**/lib/**',
      '**/.next/**',
      // these carry their own configuration
      'client/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // the config files themselves are CommonJS
    files: ['*.config.js', '.prettierrc.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['server/**/*.ts', 'types/**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': ['warn', { allowDeclarations: true }],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  }
)
