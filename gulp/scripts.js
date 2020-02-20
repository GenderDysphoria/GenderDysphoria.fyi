
const path          = require('path');
const { src, dest } = require('gulp');
const minify        = require('gulp-minify');
const rev           = require('gulp-rev');
const concat        = require('gulp-concat');
const merge         = require('merge-stream');
const asyncthrough  = require('./lib/through');


const ROOT = path.dirname(__dirname);
const DEST = 'dist/js';

module.exports = exports = function sourceJS () {

  return merge(
    src([ 'js/*.js', 'js/_*.js' ]),
    src([
      require.resolve('jquery'),
      require.resolve('magnific-popup'),
      require.resolve('popper.js/dist/umd/popper.js'),
      require.resolve('bootstrap/js/dist/util.js'),
      require.resolve('bootstrap/js/dist/dropdown.js'),
      'js/_*.js',
    ]).pipe(concat('global.js')),
  ).pipe(dest(DEST));
};

exports.prod = function sourceJSForProd () {
  return exports()
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
