const { src } = require('gulp');
const awspublish  = require('gulp-awspublish');
const awsrouter   = require('gulp-awspublish-router');
const parallelize = require('concurrent-transform');
// const cloudfront  = require('gulp-cloudfront-invalidate-aws-publish');
const debug       = require('./lib/debug');

// const path = require('path');
// const ROOT = path.dirname(__dirname);
const DEST = 'dist';

var credentials = require('../aws.json');

const routes = {
  'p\\/.*\\.(?:jpeg|jpg|png|gif)$': {
    cacheTime: 86400, // one day on client
    sharedCacheTime: 2592000, // 30 days on server
  },

  '^(?:index|tags|drafts)\\.html$': {
    cacheTime: 60, // one minute on client
    sharedCacheTime: 60, // one minute on server
  },

  '^(?:sitemap|atom)\\.xml$': {
    cacheTime: 3600, // one hour on client
    sharedCacheTime: 86400, // one day on server
  },

  '^404\\.html$': {
    cacheTime: 2592000, // 30 days on server
    sharedCacheTime: 2592000, // 30 days on server
  },

  '\\.html$': {
    cacheTime: 3600, // 1 hour on client
    sharedCacheTime: 3600, // 1 hour on server
  },

  '\\.(?:js|css)$': {
    cacheTime: 604800, // one week on client
    sharedCacheTime: 2592000, // one month on server
  },

  // pass-through for anything that wasn't matched by routes above, to be uploaded with default options
  '^.+$': '$&',
};

module.exports = exports = function s3deploy () {
  var publisher = awspublish.create(credentials);

  return src(`${DEST}/**/*`)
    .pipe(awsrouter({
      cache: {
        gzip: true,
        cacheTime: 1800, // 30 minutes on client
        sharedCacheTime: 86400, // one day on server
      },

      routes,
    }))
    .pipe(parallelize(publisher.publish(), 10))
    .pipe(publisher.sync())
    .pipe(publisher.cache())
    .pipe(awspublish.reporter({
      states: [ 'create', 'update', 'delete' ],
    }));
};

exports.dryrun = function s3DryRun () {
  return src(`${DEST}/**/*`)
    .pipe(awsrouter({
      cache: {
        gzip: true,
        cacheTime: 1800, // 30 minutes on client
        sharedCacheTime: 86400, // one day on server
      },

      routes,
    }))
    .pipe(debug('s3'))
  ;
};
