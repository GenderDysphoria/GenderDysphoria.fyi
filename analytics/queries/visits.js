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

  const rows = await db.all(sql`
    SELECT
        date(dts) as day,
        count(DISTINCT IFNULL(tid, ip)) as tids
    FROM records
    WHERE date(dts) > date('now', '-12 month')
    GROUP BY date(dts);
  `);

  // console.table(results);
  for (const { day, tids } of rows) {
    process.stdout.write(day + '\t' + tids + '\n');
  }

})().catch(console.error);
