const { CloudWatchLogs } = require('aws-sdk');

// Split up ARN like "arn:aws:logs:eu-west-1:123456789012:log-group:example-group:*"
const [ ,,, region,,, logGroupName ] = process.env.CLOUDWATCH_LOGS_GROUP_ARN.split(':');

const cloudwatchlogs = new CloudWatchLogs({ region });


// Group array of hashes by defined key.
//
const groupBy = (array, key) => (
  array.reduce((object, item) => {
    const result = object;

    if (result[item[key]]) {
      result[item[key]].push(item);
    } else if (item[key]) {
      result[item[key]] = [ item ];
    }
    return result;
  }, {})
);

// Find log stream by prefix.
//
const findLogStream = async (logStreamNamePrefix) => {
  const params = { logGroupName, logStreamNamePrefix };

  const { logStreams } = await cloudwatchlogs.describeLogStreams(params).promise();

  if (logStreams.length > 1) {
    throw new Error(`Found '${logStreams.length}' matching CloudWatch Logs streams but expected only one.`);
  }

  return logStreams[0];
};

// Get log stream or creting it if not present yet.
//
// Name format:
//   2000-01-01
//
const describeLogStream = async (logStreamName) => {
  let logStream = await findLogStream(logStreamName);

  if (!logStream) {
    await cloudwatchlogs.createLogStream({ logGroupName, logStreamName }).promise();
    logStream = await findLogStream(logStreamName);
  }

  return logStream;
};

// Extend the original record with some additional fields
// and encapsule records into CloudWatch Logs event.
//
const buildlogEvents = (records) => (
  records.map((record) => {
    const payload = record;
    payload.name = 'logs:cloudfront';

    return {
      message: JSON.stringify(payload),
      timestamp: new Date(`${payload.date} ${payload.time} UTC`).getTime(),
    };
  }).sort((a, b) => a.timestamp - b.timestamp) // Events in a request must be chronological ordered
);

// Send the given documents to CloudWatch Logs group.
//
exports.putLogEvents = async (records) => {
  const groupedRecords = groupBy(records, 'date');

  const putLogEventsCalls = Object.keys(groupedRecords).map(async (key) => {
    const logStream = await describeLogStream(key);

    const params = {
      logEvents: buildlogEvents(groupedRecords[key]),
      logGroupName,
      logStreamName: logStream.logStreamName,
      sequenceToken: logStream.uploadSequenceToken,
    };

    return cloudwatchlogs.putLogEvents(params).promise();
  });

  return Promise.all(putLogEventsCalls);
};
