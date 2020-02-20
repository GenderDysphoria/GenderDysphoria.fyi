
const { series, parallel, watch } = require('gulp');

/** **************************************************************************************************************** **/

var { loadLayout, pages } = require('./contents');
var contentTask = series( loadLayout, pages );
exports.pages = series( loadLayout, pages );
exports.content = contentTask;

var images = require('./imgflow');
exports.twimages = images.twitter;
exports.images = images;
exports['images-prod'] = images.prod;
exports['twimages-prod'] = images.twitter.prod;
exports.favicon = images.favicon;

const filesTask = require('./files');
exports.files = filesTask;
exports['files-prod'] = filesTask.prod;

var scssTask = require('./scss');
exports.scss = scssTask;

var jsTask = require('./scripts');
exports.js = jsTask;

var jsRollupTask = require('./rollup');
exports.jsr = jsRollupTask;


var cleanTask = require('./clean');
exports.clean = cleanTask;

const pushToProd = require('./publish');
exports.push = pushToProd;

const cloudfront = require('./cloudfront');
exports.cloudfront = cloudfront;

/** **************************************************************************************************************** **/

exports.new = require('./new');

var buildTask = series(
  images.prod,
  images.favicon.prod,
  scssTask.prod,
  jsTask.prod,
  filesTask.prod,
  loadLayout.prod,
  pages.prod,
  images.twitter.prod,
);

var devBuildTask = series(
  parallel(
    images,
    images.favicon,
    scssTask,
    jsTask,
    filesTask,
  ),
  loadLayout,
  pages,
  images.twitter,
);

exports.dev = devBuildTask;
exports.prod = buildTask;
exports.publish = series(
  cleanTask,
  buildTask,
  pushToProd,
  cloudfront.prod,
);
exports.testpush = pushToProd.dryrun;

/** **************************************************************************************************************** **/

function watcher () {

  watch([
    'pages/**/*.{md,hbs,html}',
    'templates/*.{md,hbs,html}',
  ], series(contentTask, images.twitter));

  watch('page/**/*.{jpeg,jpg,png,gif}', images);

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

exports.watch = series(contentTask, watcher);
exports.uat = series(cleanTask, buildTask, server);

/** **************************************************************************************************************** **/

exports.default = series(cleanTask.dev, devBuildTask, watcher);
