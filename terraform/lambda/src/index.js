const { parseLogFile } = require('./cloudfront');
const { putLogEvents } = require('./cloudwatch-logs');

// Lambda handler.
//
exports.handler = async (event) => {
  if (event.Records.length !== 1) {
    throw new Error(`Wrong length of events.Records, expected: '1', got: '${event.Records.length}'`);
  } else {
    const params = {
      bucket: event.Records[0].s3.bucket.name,
      key: decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' ')),
      region: event.Records[0].awsRegion,
    };

    return putLogEvents(await parseLogFile(params));
  }
};
