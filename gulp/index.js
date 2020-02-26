
const { series, parallel, watch } = require('gulp');

/** **************************************************************************************************************** **/

var content = require('./content');

const parse   = exports.parse   = content.task('parse');
const pages   = exports.pages   = content.task('pages');
exports.twitter = content.task('twitter');
exports.favicon = content.task('favicon');
exports.assets  = content.task('assets');

exports.content = series(parse, pages);

const everything = content.everything();
everything.prod  = content.everything(true);



const filesTask = require('./files');
exports.files = filesTask;
exports['files-prod'] = filesTask.prod;

var scssTask = require('./scss');
exports.scss = scssTask;

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
  scssTask.prod,
  jsTask.prod,
  filesTask.prod,
  everything.prod,
);

var devBuildTask = parallel(
  scssTask,
  jsTask,
  filesTask,
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
    'pages/**/*.{md,hbs,html}',
    'templates/*.{md,hbs,html}',
  ], series(exports.parse, exports.twitter, exports.pages));

  watch('page/**/*.{jpeg,jpg,png,gif}', series(exports.assets, exports.parse, exports.pages));

  watch('scss/*.scss', scssTask);
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

exports.watch = series(exports.parse, exports.pages, watcher);
exports.uat = series(cleanTask, prodBuildTask, server);

/** **************************************************************************************************************** **/

exports.default = series(cleanTask.dev, devBuildTask, watcher);
