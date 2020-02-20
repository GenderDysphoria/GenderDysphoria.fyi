
const path          = require('path');
const { src, dest } = require('gulp');
const rollup = require('gulp-better-rollup');
const { string }  = require('rollup-plugin-string');
const resolveNodeModules = require('rollup-plugin-node-resolve');
const commonJs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');
// const alias = require('rollup-plugin-alias');

const minify        = require('gulp-minify');
const rev           = require('gulp-rev');
const asyncthrough  = require('./lib/through');


const ROOT = path.dirname(__dirname);
const DEST = 'dist/js';

function rollupPipe () {
  return src('js-rollup/*.js')
    .pipe(rollup({
      // There is no `input` option as rollup integrates into the gulp pipeline
      plugins: [
        string({
          include: '**/*.html',
        }),
        resolveNodeModules(),
        commonJs(),
        json(),
      ],
      external: [ 'jquery', 'lodash', 'underscore' ],
    }, {
      // Rollups `sourcemap` option is unsupported. Use `gulp-sourcemaps` plugin instead
      format: 'iife',
      globals: {
        jquery: '$',
        lodash: '_',
        backbone: 'Backbone',
        underscore: '_',
      },
    }));
};

module.exports = exports = function rollupJS () {
  return rollupPipe()
    .pipe(dest(DEST));
};

exports.prod = function rollupJSForProd () {
  return rollupPipe()
    .pipe(minify({
      ext: { min: '.js' },
      noSource: true,
    }))
    .pipe(dest(DEST))
    .pipe(rev())
    .pipe(dest(DEST))
    .pipe(asyncthrough(async (stream, file) => {
      // Change rev's original base path back to the public root so that it uses the full
      // path as the original file name key in the manifest
      var base = path.resolve(ROOT, 'dist');
      file.revOrigBase = base;
      file.base = base;

      stream.push(file);
    }))
    .pipe(rev.manifest({
      merge: true, // Merge with the existing manifest if one exists
    }))
    .pipe(dest('.'))
  ;
};
