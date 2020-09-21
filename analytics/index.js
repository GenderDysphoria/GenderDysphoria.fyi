/* eslint no-console:0 */

const util = require('util');
const path = require('path');
const { URL } = require('url');
const CloudFrontParser = require('cloudfront-log-parser');
const parseUA = require('ua-parser-js');
const format = require('date-fns/format');
const split = require('split2');
var through = require('through2');

function url (input) {
  try {
    const { hash, host, hostname, href, origin, password, pathname, port, protocol, search, searchParams, username } = new URL(input); // eslint-disable-line max-len
    return { hash, host, hostname, href, origin, password, pathname, port, protocol, search, searchParams, username };
  } catch (e) {
    return null;
  }
}

function asyncthrough (...args) {
  const [ fn, donefn ] = args;

  args[0] = function (file, enc, next) {
    fn(this, file, enc).then(() => next(), (err) => { console.error(err, 'Error thrown'); next(err); });
  };

  if (donefn) {
    args[1] = function (next) {
      donefn(this).then(() => next(), (err) => { console.error(err, 'Error thrown'); next(err); });
    };
  }

  return through.obj(...args);
}

const parser = new CloudFrontParser({ format: 'web' });

process.stdin
  .pipe(parser)
  .pipe(asyncthrough(async (stream, row) => {
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

    stream.push(JSON.stringify({
      dts: `${row.date} ${row.time}`,
      url: url(row.cs_referer),
      referer: url(query.referer),
      client_start: format(new Date(sessionStart), 'yyyy-MM-dd HH:mm:ss'),
      client_end: sessionEnd ? format(new Date(sessionStart), 'yyyy-MM-dd HH:mm:ss') : null,
      duration,
      useragent,
      query,
      original: row,
    }, null, 2));
  }))
  .pipe(process.stdout)
;

