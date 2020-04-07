
const { series, watch } = require('gulp');

/** **************************************************************************************************************** **/

var build = require('../build');

const devBuildTask  = build.everything();
const prodBuildTask = build.everything(true);
const pagesTask = build.pages();
exports.pages = () => pagesTask();

const scss    = exports.scss    = build.task('scss');
const favicon = exports.favicon = build.task('favicon');
const svg     = exports.svg     = build.task('svg');
const scripts = exports.scripts = build.task('scripts');

var cleanTask = require('./clean');
exports.clean = cleanTask;

const pushToProd = require('./publish');
exports.push = pushToProd;

const cloudfront = require('./cloudfront');
exports.cloudfront = cloudfront;

exports.new = require('../build/new-post.js');

/** **************************************************************************************************************** **/

exports.dev  = series(devBuildTask);
exports.prod = series(prodBuildTask);
exports.publish = series(
  cleanTask,
  prodBuildTask,
  pushToProd,
  cloudfront.prod,
);
exports.testpush = pushToProd.dryrun;

/** **************************************************************************************************************** **/

function watcher () {

  watch([
    'public/**/*.{md,hbs,html}',
    'posts/**/*.{md,hbs,html}',
    'templates/*.{md,hbs,html}',
  ], pagesTask);

  watch([
    'scss/*.scss',
  ], scss);

  watch([
    'js/*.{js,jsx}',
  ], scripts);

  watch([
    'svg/**/*.svg',
  ], svg);

  watch([
    'favicon.png',
  ], favicon);

  server();
}

function server () {
  var forever = require('forever');
  var srv = new forever.Monitor('server.js');
  srv.start();
  forever.startServer(srv);
}

exports.watch = series(devBuildTask, watcher);
exports.uat = series(cleanTask, prodBuildTask, server);

/** **************************************************************************************************************** **/

exports.default = series(cleanTask.dev, devBuildTask, watcher);
