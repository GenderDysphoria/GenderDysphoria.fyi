/* eslint no-console:0 */

const path = require('path');
const { URL } = require('url');
const CloudFrontParser = require('cloudfront-log-parser');
const parseUA = require('ua-parser-js');
const format = require('date-fns/format');
const zlib = require('zlib');
const { pipeline } = require('./fs');
const { Readable, Transform, Writable } = require('stream');
const { open: opensql } = require('sqlite');
const sqlite3 = require('sqlite3');
const sql = require('./sql-tag');

let fs = require('fs');
fs = { ...fs, ...fs.promises };


function url (input) {
  try {
    const { hash, host, hostname, href, origin, password, pathname, port, protocol, search, searchParams, username } = new URL(input); // eslint-disable-line max-len
    return { hash, host, hostname, href, origin, password, pathname, port, protocol, search, searchParams, username };
  } catch (e) {
    return null;
  }
}

// function asyncthrough (...args) {
//   const [ fn, donefn ] = args;

//   args[0] = function (file, enc, next) {
//     fn(this, file, enc).then(() => next(), (err) => { console.error(err, 'Error thrown'); next(err); });
//   };

//   if (donefn) {
//     args[1] = function (next) {
//       donefn(this).then(() => next(), (err) => { console.error(err, 'Error thrown'); next(err); });
//     };
//   }

//   return through.obj(...args);
// }

const parser = new CloudFrontParser({ format: 'web' });


async function* loadFiles () {
  const dir = path.resolve(__dirname, 'RAW');
  for await (const f of await fs.opendir(dir)) {
    if (!f.isFile()) continue;
    const fpath = path.resolve(dir, f.name);
    const file = path.parse(fpath);
    if (file.ext !== '.gz') continue;
    // console.log(file);
    const filestream = fs.createReadStream(fpath).pipe(zlib.createGunzip());
    for await (const chunk of filestream) {
      yield chunk;
    }
  }
}

(async () => {
  // open the database
  const db = await opensql({
    filename: path.resolve(__dirname, 'database.sqlite'),
    driver: sqlite3.Database,
  });

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS records (
      dts INTEGER,
      ip TEXT,
      tid INTEGER,
      url TEXT,
      referrer TEXT,
      referrer_host TEXT,
      client_start INTEGER,
      client_end INTEGER,
      duration INTEGER,
      language TEXT,
      scrolled INTEGER,
      max_scroll INTEGER,
      page_height INTEGER,
      viewport_height INTEGER,
      browser TEXT,
      browser_version INTEGER,
      os TEXT,
      device_type TEXT,
      device TEXT
    )
  `);

  await db.exec(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS entries ON records (
      dts,
      ip,
      tid
    );
  `);

  const stmt = await db.prepare(sql`
    REPLACE INTO records VALUES (
      :dts,
      :ip,
      :tid,
      :url,
      :referrer,
      :referrer_host,
      :client_start,
      :client_end,
      :duration,
      :language,
      :scrolled,
      :max_scroll,
      :page_height,
      :viewport_height,
      :browser,
      :browser_version,
      :os,
      :device_type,
      :device
    );
  `);

  await pipeline(
    Readable.from(loadFiles()),
    parser,
    new Transform({
      readableObjectMode: true,
      writableObjectMode: true,
      transform (row, encoding, done) {
        // filter out OPTIONS calls
        if (row['cs-method'] === 'OPTIONS') return done();

        // I only care about the pixel hits, nothing else.
        if (row['cs-uri-stem'] !== '/i') return done();

        // this isn't an analytics event
        if (row['cs-referer'] === '-') return done();

        row = Object.fromEntries(Object.entries(row).map(([ k, v ]) => [ k.replace(/-/g, '_'), v ]));

        const query = (row.cs_uri_query === '-')
          ? {}
          : Object.fromEntries(new URLSearchParams(row.cs_uri_query))
        ;

        // we didn't get analytics data from this load, ignore it
        if (!query.start) return done();

        const useragent = parseUA(row.cs_user_agent);

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

        const { pathname } = url(row.cs_referer) || {};
        const { hostname: referrer_host, href: referrer } = url(query.referrer) || {};

        const result = {
          dts: `${row.date} ${row.time}`,
          ip: row.c_ip,
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
        };

        this.push(result);
        done();
      },
    }),
    new Writable({
      objectMode: true,
      // highWaterMark: 2,

      write (record, encoding, done) {
        (async () => {
          const params = Object.fromEntries(
            Object.entries(record).map(([ k, v ]) => [ ':' + k, v ]),
          );
          await stmt.run(params);
          process.stdout.write('.');
        })().then(() => done(), done);
      },
    }),
  );

  await db.close();

})().then(
  () => process.exit(),
  (err) => {
    console.error(err.stack);
    process.exit(1);
  },
);
