const path = require('path');
const { open: opensql } = require('sqlite');
const sqlite3 = require('sqlite3');
const sql = require('../sql-tag'); 

(async () => {
  // open the database
  const db = await opensql({
    filename: path.resolve(__dirname, '..', 'database.sqlite'),
    driver: sqlite3.Database,
  });

  await db.exec(sql`
    CREATE INDEX IF NOT EXISTS entries ON records (
      referrer_host
    );
  `);

  const rows = await db.all(sql`
    SELECT referrer_host, count(DISTINCT IFNULL(tid, ip)) as tids
    FROM records
    WHERE date(dts) > date('now', '-12 month')
    AND referrer_host != 'genderdysphoria.fyi'
    AND referrer_host != 'www.genderdysphoria.fyi'
    GROUP BY referrer_host
    ORDER BY tids DESC;
  `);

  const hosts = new Map();
  for (const {referrer_host, tids} of rows) {
    const host = matchHost(referrer_host);
    const row = hosts.get(host) || { referrer_host, count: 0 };
    const current = row.count || 0;
    hosts.set(host, { host, referrer_host: row.referrer_host, count: current + tids });
  }

  let results = Array.from(hosts.values(), ({ host, referrer_host, count }) => [referrer_host, count])
  results = results.sort((a,b) => b[1] - a[1]);
  results = results.slice(0, 100);

  // console.table(results);
  for (const [host, count] of results) {
    process.stdout.write(host.padEnd(38, ' ') + count + '\n');
  }

})().catch(console.error);

const MATCH = /^t\.co$|(?:[^.]+)(?=(?:\.com?)?\.[A-za-z]{2,}$)/;
function matchHost (input) {
  if (input === 'com.andrewshu.android.reddit') return 'reddit';
  if (input.startsWith('com.laurencedawson.reddit_sync')) return 'reddit';
  if (input === 'genderdysphoria-fyi.translate.goog') return 'google';
  if (input.endsWith('.messenger.com')) return 'facebook';
  if (input.startsWith('com.')) {
    input = input.split('.').reverse().join('.');
  }
  const [host] = input.match(MATCH) || [input];
  return host;
}