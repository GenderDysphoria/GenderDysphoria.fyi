const { gunzip } = require('zlib');
const { promisify } = require('util');
const { S3 } = require('aws-sdk');
const { unescape } = require('querystring');

const gunzipAsync = promisify(gunzip);


// Parsing the line containing the version.
//
// Format:
//
//   #Version: 1.0
//
const parseVersion = (line) => {
  if (!line.startsWith('#Version:')) {
    throw new Error(`Invalid version line '${line}'`);
  } else {
    return line.match(/[\d.]+$/);
  }
};

// Parsing the line containinge the fields format and use kebab case.
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html#LogFileFormat
//
// Format:
// eslint-disable-next-line max-len
//   #Fields: date time x-edge-location sc-bytes c-ip cs-method cs(Host) cs-uri-stem sc-status cs(Referer) cs(User-Agent) cs-uri-query cs(Cookie) x-edge-result-type x-edge-request-id x-host-header cs-protocol cs-bytes time-taken x-forwarded-for ssl-protocol ssl-cipher x-edge-response-result-type cs-protocol-version fle-status fle-encrypted-fields
//
const parseFields = (line) => {
  if (!line.startsWith('#Fields:')) {
    throw new Error(`Invalid fields line '${line}'`);
  } else {
    return line.match(/[\w()-]+(\s|$)/g).map(field => (
      // Strip parentheses and remove unecessary abbreviations in field names
      field.replace(/\(([^)]+)\)/, '-$1').replace(/^(c-|cs-|sc-)/, '').trim().toLowerCase()
    ));
  }
};

// Unescape value twice (because fuck you that's why).
// https://forums.aws.amazon.com/thread.jspa?threadID=134017
//
const decode = value => unescape(unescape(value));

// Split up line and assign to corresponding field.
//
const parseLine = (line, fields) => {
  if (line.startsWith('#')) {
    throw new Error(`Invalid log line '${line}'`);
  } else {
    return line.split('\t').reduce((object, section, index) => {
      const result = object;
      if (section !== '-') result[fields[index]] = decode(section); // Skip missing fields
      return result;
    }, {});
  }
};

// Get log file from S3 and unzip it.
//
const getLogFile = async ({ bucket, key, region }) => {
  const s3 = new S3({ region });

  const zippedObject = await s3.getObject({ Bucket: bucket, Key: key }).promise();
  const logFile = await gunzipAsync(zippedObject.Body);
  return logFile.toString().trim();
};

// Parse log file and return a list of log events.
//
exports.parseLogFile = async ({ bucket, key, region }) => {
  const file = await getLogFile({ bucket, key, region });

  const lines = file.split('\n');

  // Shift first line which contains the version and parse it for validation
  parseVersion(lines.shift());
  // Shift next line containing fields format and parse it for validation
  const fields = parseFields(lines.shift());

  return lines.map(line => parseLine(line, fields));
};
