/* eslint no-console: 0 */

const { gunzip } = require('zlib');
const { promisify } = require('util');
const { S3 } = require('aws-sdk');
const { unescape } = require('querystring');
const parseUA = require('ua-parser-js');
const format = require('date-fns/format');
const { URL } = require('url');

const gunzipAsync = promisify(gunzip);

function url (input) {
  try {
    const { hash, host, hostname, href, origin, password, pathname, port, protocol, search, searchParams, username } = new URL(input); // eslint-disable-line max-len
    return { hash, host, hostname, href, origin, password, pathname, port, protocol, search, searchParams, username };
  } catch (e) {
    return null;
  }
}

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
    return line.match(/[\w()-]+(\s|$)/g).map((field) => (
      // Strip parentheses and remove unecessary abbreviations in field names
      field.replace(/\(([^)]+)\)/, '-$1').replace(/^(c-|cs-|sc-)/, '').trim().toLowerCase()
    ));
  }
};

// Unescape value twice (because fuck you that's why).
// https://forums.aws.amazon.com/thread.jspa?threadID=134017
//
const decode = (value) => unescape(unescape(value));

// Split up line and assign to corresponding field.
//
const parseLine = (line, fields) => {
  if (line.startsWith('#')) {
    throw new Error(`Invalid log line '${line}'`);
  } else {
    let row = line.split('\t').reduce((object, section, index) => {
      const result = object;
      if (section !== '-') result[fields[index]] = decode(section); // Skip missing fields
      return result;
    }, {});


    // filter out OPTIONS calls
    if (row.method === 'OPTIONS') return;

    // I only care about the pixel hits, nothing else.
    if (row['uri-stem'] !== '/i') return;

    // this isn't an analytics event
    if (!row.referer) return;

    row = Object.fromEntries(Object.entries(row).map(([ k, v ]) => [ k.replace(/-/g, '_'), v ]));

    const query = (row.uri_query)
      ? Object.fromEntries(new URLSearchParams(row.uri_query))
      : {}
    ;

    const useragent = parseUA(row.user_agent);

    const sessionStart = Number(query.start);
    const sessionEnd = query.end === 'null' ? 0 : Number(query.end);
    const duration = sessionEnd > sessionStart ? Math.floor((sessionEnd - sessionStart) / 1000) : null;

    let {
      language,
      viewed,
      max_scroll,
      page_height,
      viewport_height,
    } = query;

    max_scroll = parseInt(max_scroll, 10) || 0;
    page_height = parseInt(page_height, 10) || 0;
    viewport_height = parseInt(viewport_height, 10) || 0;

    const { pathname } = url(row.referer) || {};
    const { hostname: referrer_host, href: referrer } = url(query.referrer) || {};

    const result = {
      dts: `${row.date} ${row.time}`,
      ip: row.ip,
      tid: query.tid !== 'false' ? query.tid : null,
      url: pathname,
      referrer,
      referrer_host,
      client_start: format(new Date(sessionStart), 'yyyy-MM-dd HH:mm:ss'),
      client_end: sessionEnd ? format(new Date(sessionStart), 'yyyy-MM-dd HH:mm:ss') : null,
      duration,
      language,
      viewed,
      max_scroll,
      page_height,
      viewport_height,
      browser: useragent.browser.name,
      browser_version: useragent.browser.major,
      os: useragent.os.name + ' ' + useragent.os.version,
      device_type: useragent.device && useragent.device.type || null,
      device: useragent.device && useragent.device.vendor && useragent.device.vendor + ' ' + useragent.device.model || null,
      useragent,
      query,
      original: row,
    };

    return result;
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

  console.log(`Found ${lines.length} rows to parse`); // eslint-disable-line no-console
  const rows = lines.map((line) => parseLine(line, fields)).filter(Boolean);
  console.log(`Produced ${rows.length} results`);
  console.log('Sample', rows[0]);
  return rows;
};
