/* eslint no-console:0 */

const AWS = require('aws-sdk');
const zlib = require('zlib');
const util = require('util');
const path = require('path');
const { URL } = require('url');
const s3 = new AWS.S3();
const { parse: parseLog } = require('cloudfront-log-parser');
const parseUA = require('ua-parser-js');
const format = require('date-fns/format');
const gunzip = util.promisify(zlib.gunzip);
const gzip = util.promisify(zlib.gzip);

function url (input) {
  const { hash, host, hostname, href, origin, password, pathname, port, protocol, search, searchParams, username } = new URL(input);
  return { hash, host, hostname, href, origin, password, pathname, port, protocol, search, searchParams, username };
}

exports.handler = async (event) => {
  // Read options from the event.
  console.log('Reading options from event:\n', JSON.stringify(event, null, 2));

  const Bucket = event.Records[0].s3.bucket.name;
  const inputKey    = event.Records[0].s3.object.key;

  const file = path.parse(inputKey);
  const outputKey = path.format({ ...file, dir: 'Converted', ext: '.json.gz' });

  const response = await s3.getObject({ Bucket, Key: inputKey }).promise();
  const input = (await gunzip(response.Body)).toString('utf8');

  const entries = parseLog(input, { format: 'web' });

  console.log(`Found ${entries.length} rows`);

  const results = entries.map((row) => {
    // filter out OPTIONS calls
    if (row['cs-method'] === 'OPTIONS') return null;

    // I only care about the pixel hits, nothing else.
    if (row['cs-uri-stem'] !== '/i') return null;

    // this isn't an analytics event
    if (row['cs-referer'] === '-') return null;

    row = Object.fromEntries(Object.entries(row).map(([ k, v ]) => [ k.replace(/-/g, '_'), v ]));

    const query = (row.cs_uri_query === '-')
      ? {}
      : Object.fromEntries(new URLSearchParams(row.cs_uri_query))
    ;

    // we didn't get analytics data from this load, ignore it
    if (!query.start) return null;

    const useragent = parseUA(row.cs_user_agent);

    const sessionStart = Number(query.start);
    const sessionEnd = query.end === 'null' ? 0 : Number(query.end);
    const duration = sessionEnd > sessionStart ? Math.floor((sessionEnd - sessionStart) / 1000) : null;

    return JSON.stringify({
      dts: `${row.date} ${row.time}`,
      url: url(row.cs_referer),
      referer: url(query.referer),
      client_start: format(new Date(sessionStart), 'yyyy-MM-dd HH:mm:ss'),
      client_end: sessionEnd ? format(new Date(sessionStart), 'yyyy-MM-dd HH:mm:ss') : null,
      duration,
      useragent,
      query,
      original: row,
    });
  }).filter(Boolean);

  if (!results.length) {
    console.log('No results to save');
    return;
  }

  console.log('Writing new file to ' + outputKey);

  await s3.putObject({
    Bucket,
    Key: outputKey,
    Body: await gzip(Buffer.from(results.join('\n'))),
    ContentType: 'application/gzip',
  }).promise();

};
