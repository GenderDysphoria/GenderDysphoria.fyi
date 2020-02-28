
const { series, parallel, watch } = require('gulp');

/** **************************************************************************************************************** **/

var content = require('./content');

const everything = content.everything();
everything.prod  = content.everything(true);

exports.go = series(everything);

var jsTask = require('./scripts');
exports.js = jsTask;

var cleanTask = require('./clean');
exports.clean = cleanTask;

const pushToProd = require('./publish');
exports.push = pushToProd;

const cloudfront = require('./cloudfront');
exports.cloudfront = cloudfront;

/** **************************************************************************************************************** **/

var prodBuildTask = parallel(
  jsTask.prod,
  everything.prod,
);

var devBuildTask = parallel(
  jsTask,
  everything,
);

exports.dev  = devBuildTask;
exports.prod = prodBuildTask;
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
  ], everything);

  watch('js/*.js', jsTask);

  var forever = require('forever');
  var srv = new forever.Monitor('server.js');
  srv.start();
  forever.startServer(srv);
}

function server () {

  var forever = require('forever');
  var srv = new forever.Monitor('server.js');
  srv.start();
  forever.startServer(srv);

}

exports.watch = series(everything, watcher);
exports.uat = series(cleanTask, prodBuildTask, server);

/** **************************************************************************************************************** **/

exports.default = series(cleanTask.dev, devBuildTask, watcher);
