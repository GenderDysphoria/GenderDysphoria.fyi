const log = require('fancy-log');
const aws = require('aws-sdk');
var Promise = require('bluebird');

var credentials;
try {
  credentials = require('../aws.json'); // eslint-disable-line import/no-unresolved
} catch (e) {
  credentials = null;
}

async function invalidate (wait) {
  if (!credentials) {
    console.error('Cannot access cloudfront without AWS credentials present.'); // eslint-disable-line
    return false;
  }

  var cloudfront = new aws.CloudFront();
  cloudfront.config.update({ credentials });

  var poll = async function (id) {
    const res = await cloudfront.getInvalidation({
      DistributionId: credentials.distribution,
      Id: id,
    }).promise();

    if (res.Invalidation.Status === 'Completed') {
      return;
    }

    return Promise.delay(5000).then(() => poll(id));
  };

  const { Invalidation } = await cloudfront.createInvalidation({
    DistributionId: credentials.distribution,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: {
        Quantity: 1,
        Items: [ '/*' ],
      },
    },
  }).promise();

  const id = Invalidation.Id;

  log('Invalidation created, waiting for it to complete.', id);

  if (wait) await poll(id);
}

module.exports = exports = function invalidateCloudfrontAndWait () {
  return invalidate(true);
};

exports.prod = function invalidateCloudfront () {
  return invalidate(false);
};

