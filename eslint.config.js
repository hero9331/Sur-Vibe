const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  {
    // 5강 코드 품질: 함수 하나가 너무 복잡하거나 깊어지면 경고해요. 경고가 나면 작은 함수로 나눠요.
    rules: {
      complexity: ['warn', 10],
      'max-depth': ['warn', 3],
      'max-params': ['warn', 4],
    },
  },
  {
    files: ['src/**/*.js', 'test/**/*.js', 'eval/**/*.js', 'eslint.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.browser, bootstrap: 'readonly' } },
  },
];
