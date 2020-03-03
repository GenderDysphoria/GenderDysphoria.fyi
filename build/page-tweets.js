const { chunk, uniq, difference } = require('lodash');
const fs = require('fs-extra');
const { resolve } = require('./resolve');
const log = require('fancy-log');
const tweetparse = require('./lib/tweetparse');
const Twitter = require('twitter-lite');


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
    if (!page.tweets || !page.tweets.length) continue;

    const missing = difference(page.tweets, tweetsPresent);
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
      if (twitterBackup[id]) {
        log('Pulled tweet from backup ' + id);
        twitterCache[id] = tweetparse(twitterBackup[id]);
        continue;
      }
      log.error('Could not find tweet ' + id);
    }
  }

  /* Apply Tweets to Pages **************************************************/

  const twitterMedia = [];

  function attachTweet (dict, tweetid) {
    const tweet = twitterCache[tweetid];
    if (!tweet) {
      log.error(`Tweet ${tweetid} is missing from the cache.`);
      return;
    }
    dict[tweetid] = tweet;
    twitterMedia.push( ...tweet.media );

    if (tweet.quoted_status_id_str) attachTweet(dict, tweet.quoted_status_id_str);
  }

  // now loop through pages and substitute the tweet data for the ids
  for (const page of pages) {
    if (!page.tweets || !page.tweets.length) continue;

    page.tweets = page.tweets.reduce((dict, tweetid) => {
      attachTweet(dict, tweetid);
      return dict;
    }, {});
  }

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
