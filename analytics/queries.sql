SELECT
    date(dts) as day,
    count(DISTINCT IFNULL(tid, ip)) as tids
FROM records
GROUP BY date(dts);

SELECT
    (duration / 60) as minutes,
    COUNT(IFNULL(tid,ip)) as total
FROM records
WHERE duration > 1 AND duration < (60 * 30)
GROUP BY duration / 60
HAVING total > 5;

SELECT referrer_host, count(DISTINCT IFNULL(tid, ip)) as tids, referrer
FROM records
GROUP BY referrer_host;

SELECT COUNT(IFNULL(tid,ip)) as total, referrer
FROM records
WHERE referrer_host LIKE '%reddit.com'
GROUP BY referrer
