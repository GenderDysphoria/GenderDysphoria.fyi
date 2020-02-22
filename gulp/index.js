
const { series, parallel, watch } = require('gulp');

/** **************************************************************************************************************** **/

var content = require('./content');
exports.parse = content.parse;
exports.pages = content.write;
exports.content = series(content.parse, content.write);

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

var prodBuildTask = series(
  images.prod,
  images.favicon.prod,
  scssTask.prod,
  jsTask.prod,
  filesTask.prod,
  content.parse,
  images.twitter.prod,
  content.write.prod,
);

var devBuildTask = series(
  parallel(
    images,
    images.favicon,
    scssTask,
    jsTask,
    filesTask,
    content.parse,
  ),
  content.write,
  images.twitter,
);

exports.dev = devBuildTask;
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
  ], series(content.parse, images.twitter, content.write));

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

exports.watch = series(series(content.parse, images.twitter, content.write), watcher);
exports.uat = series(cleanTask, prodBuildTask, server);

/** **************************************************************************************************************** **/

exports.default = series(cleanTask.dev, devBuildTask, watcher);
