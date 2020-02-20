
const path          = require('path');
const { src, dest } = require('gulp');
const scss          = require('gulp-sass');
const rev           = require('gulp-rev');
const asyncthrough  = require('./lib/through');
const crass         = require('./lib/crass');
const concat        = require('gulp-concat');
const merge         = require('merge-stream');
const postcss       = require('gulp-postcss');
const autoprefixer  = require('autoprefixer');

// const minifyCSS     = require('gulp-minify-css');


const ROOT = path.dirname(__dirname);
const DEST = 'dist/css';

module.exports = exports = function buildScss () {

  const scssStream = src([ 'scss/*.scss', '!scss/_*.scss' ])
    .pipe(scss({
      includePaths: [ path.join(ROOT, 'node_modules') ],
    }));

  return merge(
    scssStream,
    src([
      require.resolve('magnific-popup/dist/magnific-popup.css'),
    ]),
  )
    .pipe(concat('style.css'))
    .pipe(postcss([
      autoprefixer(),
    ]))
    .pipe(dest(DEST));
};

exports.prod = function buildScssForProd () {
  return exports()
    .pipe(crass())
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
