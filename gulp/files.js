
const path          = require('path');
const { src, dest } = require('gulp');
const rev           = require('gulp-rev');
const asyncthrough  = require('./lib/through');
const changed       = require('gulp-changed');
const merge         = require('merge-stream');

const ROOT = path.dirname(__dirname);
const DEST = 'dist';

module.exports = exports = function fileCopy () {
  const pageFiles = src([ 'pages/**/*', '!pages/**/*.{md,hbs,xml,html,jpeg,jpg,png,gif,mp4}' ])
    .pipe(changed(DEST))
    .pipe(dest(DEST))
  ;

  const svgs = src('svg/**/*.svg')
    // .pipe(changed(DEST))
    .pipe(dest(path.join(DEST, 'images/svg')))
    .pipe(asyncthrough(async (stream, file) => {
      file.base = path.resolve(file.base, '../..');
      stream.push(file);
    }))
  ;

  return merge(pageFiles, svgs);
};

exports.prod = function fileCopyForProd () {
  return exports()
    .pipe(rev())
    .pipe(dest(DEST))
    .pipe(asyncthrough(async (stream, file) => {
      // Change rev's original base path back to the public root so that it uses the full
      // path as the original file name key in the manifest
      var base = path.resolve(ROOT, DEST);
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
