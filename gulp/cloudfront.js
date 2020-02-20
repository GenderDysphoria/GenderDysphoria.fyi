const log = require('fancy-log');
const aws = require('aws-sdk');
var credentials = require('../aws.json');
var Promise = require('bluebird');

async function invalidate (wait) {
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

