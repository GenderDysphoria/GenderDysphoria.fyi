
const { series, watch } = require('gulp');

/** **************************************************************************************************************** **/

var build = require('../build');

const devBuildTask  = build.everything();
const prodBuildTask = build.everything(true);

var cleanTask = require('./clean');
exports.clean = cleanTask;

const pushToProd = require('./publish');
exports.push = pushToProd;

const cloudfront = require('./cloudfront');
exports.cloudfront = cloudfront;

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
    'public/**/*',
    'templates/*.{md,hbs,html}',
    'scss/*.scss',
    'js/*.js',
  ], devBuildTask);

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
