
const { series, watch, src, dest } = require('gulp');
const log = require('fancy-log');
const chalk = require('chalk');

/** **************************************************************************************************************** **/

var build = require('../build');

const devBuildTask  = build.everything();
const prodBuildTask = build.everything(true);
const pagesTask = build.pages();
const twitterTask = build.twitter();
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

/** **************************************************************************************************************** **/

exports.offline_quick = offlineTask;
exports.offline_full = offline_full;
exports.dev  = series(devBuildTask);
exports.prod = series(prodBuildTask);
exports.publish = series(
  cleanTask,
  prodBuildTask,
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
    'twitter-i18n.json',
  ], series(twitterTask, pagesTask));

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

// This thing is buggy as hell and barely works
async function offline_full(callback) {
  const { spawn } = require('child_process');
  log(process.execPath);
  const srv_proc = spawn(process.execPath, ['./server.js']);
  srv_proc.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  srv_proc.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  // Run the main task
  offlineTask();

  await new Promise(resolve => setTimeout(resolve, 500));

  // Finish
  srv_proc.kill('SIGTERM');
  if (callback !== undefined) {
    callback();
  }
}

function server (callback) {
  var forever = require('forever');
  var srv = new forever.Monitor('server.js', {fork: true});
  srv.start();
  forever.startServer(srv);

  if (callback !== undefined) {
    callback();
  }
}

exports.watch = series(devBuildTask, watcher);
exports.uat = series(cleanTask, prodBuildTask, server);

/** **************************************************************************************************************** **/

exports.default = series(cleanTask.dev, devBuildTask, watcher);
