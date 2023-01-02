
const { resolve } = require('./resolve');
const { rollup } = require('rollup');
const alias = require('@rollup/plugin-alias');
const commonjs = require('@rollup/plugin-commonjs');
const nodeResolve = require('@rollup/plugin-node-resolve').default;
const replace = require('@rollup/plugin-replace');
const babel = require('@rollup/plugin-babel');
const svg = require('rollup-plugin-react-svg');
const terser = require('@rollup/plugin-terser');

const plugins = [
  replace({
    preventAssignment: true,
    values: {
      'process.env.NODE_ENV': '"production"',
    },
  }),
  alias({
    entries: [
      { find: 'react', replacement: 'preact/compat' },
      { find: 'react-dom', replacement: 'preact/compat' },
      { find: 'svg', replacement: resolve('svg') },
      { find: 'utils', replacement: resolve('build/lib/util.js') },
    ],
  }),
  svg(),
  babel({
    exclude: 'node_modules/**',
    babelHelpers: 'bundled',
  }),
  nodeResolve({
    extensions: [ '.mjs', '.js', '.jsx', '.json' ],
  }),
  commonjs({
    include: 'node_modules/**',
  }),
];


module.exports = exports = async function (input, prod) {
  const inputOptions = {
    input,
    plugins,
  };

  const outputOptions = {
    format: 'iife',
    sourcemap: 'inline',
    plugins: prod
      ? [ terser({ output: { comments: false } }) ]
      : undefined,

  };

  const bundle = await rollup(inputOptions);
  const output = await bundle.generate(outputOptions);

  // console.log(output);
  return output.output[0].code;
};
