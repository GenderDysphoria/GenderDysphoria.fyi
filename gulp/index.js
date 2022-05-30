
const { series, watch, src, dest, parallel } = require('gulp');
const log = require('fancy-log');
const chalk = require('chalk');

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

const { offlineTask } = require('./offline');

exports.new = require('../build/new-post.js');

function copyProd () {
  return src('dist/**/*').pipe(dest('published'));
}

var TheServer = undefined;

/** **************************************************************************************************************** **/

exports.offline = offlineTask;
exports.dev  = series(devBuildTask);
exports.prod = series(prodBuildTask);
exports.publish = series(
  cleanTask,
  prodBuildTask,
  parallel(server, offlineTaskAutoStop),
  pushToProd,
  cleanTask.prodBackup,
  copyProd,
  cloudfront.prod,
);
exports.testpush = pushToProd.dryrun;

/** **************************************************************************************************************** **/

function watcher () {
  watch([
    'public/**/*.{md,hbs,html,js,json}',
    'posts/**/*.{md,hbs,html,js,json}',
    'templates/*.{md,hbs,html,js,json}',
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

async function offlineTaskSlow(callback) {
  // Give some time for the server to start
  const time = 2500;
  await new Promise(resolve => setTimeout(resolve, time));
  offlineTask();
  if (callback !== undefined) {
    callback();
  }
}

async function offlineTaskAutoStop(callback) {
  // replace this logic with manual spawning server in background process and killing it afterwards?

  // problem with request: connect ECONNREFUSED 127.0.0.1:8085
// (node:90782) UnhandledPromiseRejectionWarning: Error: connect ECONNREFUSED 127.0.0.1:8085
//     at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1159:16)
//     at TCPConnectWrap.callbackTrampoline (internal/async_hooks.js:130:17)
// (node:90782) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 1)
// (node:90782) [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
  var forever = require('forever');

  // Give some time for the server to start
  const time = 2500;
  await new Promise(resolve => setTimeout(resolve, time));
  offlineTask();

  if (TheServer !== undefined) {    
    log(TheServer.stop());
  }

  if (callback !== undefined) {
    callback();
  }
}

exports.offline2 = parallel(server, offlineTaskAutoStop);

function server (callback) {
  var forever = require('forever');
  TheServer = new forever.Monitor('server.js', {fork: true});
  TheServer.start();
  forever.startServer(TheServer);

  if (callback !== undefined) {
    callback();
  }
}

exports.watch = series(devBuildTask, watcher);
exports.uat = series(cleanTask, prodBuildTask, parallel(server, offlineTaskSlow));

/** **************************************************************************************************************** **/

exports.default = series(cleanTask.dev, devBuildTask, watcher);
