const { chunk, uniq, uniqBy, difference } = require('lodash');
const fs = require('fs-extra');
const { resolve } = require('./resolve');
const log = require('fancy-log');
const tweetparse = require('./lib/tweetparse');
const Twitter = require('twitter-lite');
const { hasOwn } = require('./lib/util');


module.exports = exports = async function tweets (pages) {
  const [ twitter, twitterBackup, twitterCache ] = await Promise.all([
    fs.readJson(resolve('twitter-config.json')).catch(() => null)
      .then(getTwitterClient),
    fs.readJson(resolve('twitter-backup.json')).catch(() => ({})),
    fs.readJson(resolve('twitter-cache.json')).catch(() => ({})),
  ]);

  let tweetsNeeded = [];
  const tweetsPresent = Object.keys(twitterCache);

  for (const page of pages) {
    const tweetids = [ ...page.tweets ];
    if (!tweetids.length) continue;

    const missing = difference(uniq(tweetids), tweetsPresent);
    tweetsNeeded.push(...missing);
  }

  tweetsNeeded = uniq(tweetsNeeded);

  /* Load Missing Tweets **************************************************/

  while (tweetsNeeded.length) {
    log('Fetching tweets: ' + tweetsNeeded.join(', '));
    const arriving = await Promise.all(chunk(tweetsNeeded, 99).map(twitter));
    const tweetsRequested = tweetsNeeded;
    tweetsNeeded = [];
    const loaded = [];
    for (const tweet of arriving.flat(1)) {
      if (tweet.quoted_status_id_str && !twitterCache[tweet.quoted_status_id_str]) {
        tweetsNeeded.push(tweet.quoted_status_id_str);
      }
      // if (!twitterBackup[tweet.id_str]) twitterBackup[tweet.id_str] = tweet;
      twitterBackup[tweet.id_str] = tweet;
      twitterCache[tweet.id_str] = tweetparse(tweet);
      loaded.push(tweet.id_str);
    }

    const absent = difference(tweetsRequested, loaded);
    for (const id of absent) {
      if (!hasOwn(twitterBackup, id)) {
        log.error('Could not find tweet ' + id);
        continue;
      }
      const tweet = twitterBackup[id];

      if (tweet.quoted_status_id_str && !twitterCache[tweet.quoted_status_id_str]) {
        tweetsNeeded.push(tweet.quoted_status_id_str);
      }

      if (tweet) {
        log('Pulled tweet from backup ' + id);
        twitterCache[id] = tweetparse(twitterBackup[id]);
      } else {
        twitterCache[id] = false;
      }
    }
  }

  /* Apply Tweets to Pages **************************************************/

  var twitterMedia = [];

  function attachTweet (dict, tweetid) {
    if (!hasOwn(twitterCache, tweetid) && twitterBackup[tweetid]) {
      log.error(`Tweet ${tweetid} is missing from the cache but exists in backup? How did we get here?`);
      twitterCache[tweetid] = tweetparse(twitterBackup[tweetid]);
      return;
    }
    const tweet = twitterCache[tweetid];
    if (!tweet) return;
    dict[tweetid] = tweet;
    twitterMedia.push( ...tweet.media );

    if (tweet.quoted_status_id_str) attachTweet(dict, tweet.quoted_status_id_str);
  }

  // now loop through pages and substitute the tweet data for the ids
  for (const page of pages) {
    const tweetids = [ ...page.tweets ];
    if (!tweetids.length) continue;

    page.tweets = tweetids.reduce((dict, tweetid) => {
      attachTweet(dict, tweetid);
      return dict;
    }, {});
  }

  twitterMedia = uniqBy(twitterMedia, 'output');

  await Promise.all([
    fs.writeFile(resolve('twitter-media.json'),  JSON.stringify(twitterMedia,  null, 2)),
    fs.writeFile(resolve('twitter-cache.json'),  JSON.stringify(twitterCache,  null, 2)),
    fs.writeFile(resolve('twitter-backup.json'), JSON.stringify(twitterBackup, null, 2)),
  ]);

  return pages;
};

/* Utility Functions **************************************************/

function getTwitterClient (config) {
  if (!config) return () => [];
  const client = new Twitter(config);
  return (tweetids) => client
    .get('statuses/lookup', { id: tweetids.join(','), tweet_mode: 'extended' })
    .catch((e) => { log.error(e); return []; });
}

const tweeturl = /https?:\/\/twitter\.com\/(?:#!\/)?(?:\w+)\/status(?:es)?\/(\d+)/i;
const tweetidcheck = /^\d+$/;
function parseTweetId (tweetid) {
  // we can't trust an id that isn't a string
  if (typeof tweetid !== 'string') return false;

  const match = tweetid.match(tweeturl);
  if (match) return match[1];
  if (tweetid.match(tweetidcheck)) return tweetid;
  return false;
}

exports.parseTweetId = parseTweetId;

exports.attachTweets = function (tweetids, tweets) {
  function attachTweet (dict, tweetid) {
    const tweet = tweets[tweetid];
    if (!tweet) return;
    dict[tweetid] = tweet;

    if (tweet.quoted_status_id_str) attachTweet(dict, tweet.quoted_status_id_str);
  }

  return tweetids.reduce((dict, tweetid) => {
    attachTweet(dict, tweetid);
    return dict;
  }, {});
};
