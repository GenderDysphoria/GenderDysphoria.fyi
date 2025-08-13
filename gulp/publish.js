const { src } = require('gulp');
const awspublish  = require('gulp-awspublish');
const awsrouter   = require('gulp-awspublish-router');
const parallelize = require('concurrent-transform');

var credentials;
try {
  credentials = require('../aws.json'); // eslint-disable-line import/no-unresolved
} catch (e) {
  credentials = null;
}

const routes = {
  'p\\/.*\\.(?:jpeg|jpg|png|gif)$': {
    cacheTime: 86400, // one day on client
    sharedCacheTime: 2592000, // 30 days on server
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
  if (!credentials) {
    console.error('Cannot publish without AWS credentials present.'); // eslint-disable-line
    return false;
  }
  var publisher = awspublish.create(credentials);

  return src('dist/**/*')
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
