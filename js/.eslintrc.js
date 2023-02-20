
module.exports = exports = {
  extends: '@twipped/eslint-config/browser',
  env: { es6: true, jquery: true },
  rules: {
    'indent': [ 2, 2, {
      'MemberExpression': 1,
    } ],
    'prefer-arrow-callback': 0,
    'object-shorthand': 0,
    'n/no-unsupported-features/node-builtins': 0,
  },
  overrides: [
    {
      files: '$*.jsx',
      extends: '@twipped/eslint-config/react',
      rules: {
        'react/jsx-indent': [ 2, 2, { checkAttributes: true } ],
        'react/no-unknown-property': [ 2, { ignore: [ 'class' ] } ],
        'n/no-unpublished-import': 0,
        'n/no-missing-import': [ 'error', {
          'allowModules': [ 'svg', 'react' ],
        } ],
      },
    },
  ],
};
