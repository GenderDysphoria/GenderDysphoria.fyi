const { chunk, uniq, uniqBy, difference } = require('lodash');
const fs = require('fs-extra');
const { resolve } = require('./resolve');
const log = require('fancy-log');
const tweetparse = require('./lib/tweetparse');
const Twitter = require('twitter-lite');
const { hasOwn } = require('./lib/util');
var twemoji = require('twemoji' );

function tweetText2Html(tweet_text) {
  let answer = tweet_text.split(/(\r\n|\n\r|\r|\n)+/)
      .map((s) => s.trim() && '<p>' + s + '</p>')
      .filter(Boolean)
      .join('');
  answer = twemoji.parse(answer);
  return answer;
}

function applyI18N(original_tweet, twitter_i18n) {
  const id = original_tweet.id_str;
  // Make a shallow copy
  let tweet = Object.assign({}, original_tweet);

  // Do we have a trnslation for this tweet?
  if (twitter_i18n[id] === undefined) {
    // If not, delete any translation fields just in case
    delete tweet.html_i18n;
    delete tweet.full_text_i18n;
  } else {
    // If yes, add the translations
    const originalLang = tweet["lang"] || "x-original";
    tweet.full_text_i18n = twitter_i18n[id].full_text_i18n;
    if (originalLang in tweet.full_text_i18n && tweet.full_text_i18n[originalLang] != tweet.full_text) {
      log.warn("Original text not matching for tweet "+id, { expected: tweet.full_text, got: tweet.full_text_i18n[originalLang]});
    } else {
      tweet.full_text_i18n[originalLang] = tweet.full_text;
    }
  }

  // Return the tweet with the translations
  return tweet;
}

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

exports.i18n = async function() {
  const [ twitterBackup, twitterCache, twitterI18N ] = await Promise.all([
    fs.readJson(resolve('twitter-backup.json')),
    fs.readJson(resolve('twitter-cache.json')).catch(() => ({})),
    fs.readJson(resolve('twitter-i18n.json')),
  ]);

  const twitterCacheBkp  = JSON.stringify(twitterCache,  null, 2);

  // Make sure no translation is forgotten
  for (const id in twitterI18N) {
    if (id in twitterBackup) {
      twitterCache[id] = applyI18N(twitterBackup[id], twitterI18N);
      twitterCache[id] = tweetparse(twitterCache[id]);
    }
  }

  const twitterCacheJson  = JSON.stringify(twitterCache,  null, 2);
  if (twitterCacheBkp != twitterCacheJson) {
    await fs.writeFile(resolve('twitter-cache.json'),  twitterCacheJson);
  }
}
