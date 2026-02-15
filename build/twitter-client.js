const fs = require('fs-extra');
const { resolve } = require('./resolve');
const { uniq, difference } = require('lodash');
const Twitter = require('twitter-lite');
const log = require('fancy-log');
const tweetparse = require('./lib/tweetparse');
const { hasOwn } = require('./lib/util');

module.exports = exports = async function () {
  const tc = new TwitterClient();
  await tc.initialize();
  return tc;
};


class TwitterClient {

  async initialize () {
    const [ lookup, backup, cache ] = await Promise.all([
      fs.readJson(resolve('twitter-config.json')).catch(() => null)
        .then(makeFetcher),
      fs.readJson(resolve('twitter-backup.json')).catch(() => ({})),
      fs.readJson(resolve('twitter-cache.json')).catch(() => ({})),
    ]);

    this._lookup = lookup;
    this._backupData = backup;
    this._cache = cache;
    this._presentTweets = Object.keys(cache);
  }

  async write () {
    return Promise.all([
      fs.writeFile(resolve('twitter-cache.json'),  JSON.stringify(this._cache,  null, 2)),
      fs.writeFile(resolve('twitter-backup.json'), JSON.stringify(this._backupData, null, 2)),
    ]);
  }

  async get (tweetids) {
    if (!Array.isArray(tweetids)) tweetids = [ tweetids ];

    tweetids = uniq(tweetids.map(parseTweetId));

    let tweetsNeeded = this._missing(tweetids).filter(Boolean);

    while (tweetsNeeded.length) {
      // log('Fetching tweets: ' + tweetsNeeded.join(', '));
      // const arriving = await Promise.all(chunk(tweetsNeeded, 99).map(this._lookup));
      const arriving = [];
      const tweetsRequested = tweetsNeeded;
      tweetsNeeded = [];
      const loaded = [];
      for (const tweet of arriving.flat(1)) {
        if (tweet.quoted_status_id_str && !this._cache[tweet.quoted_status_id_str]) {
          tweetsNeeded.push(tweet.quoted_status_id_str);
        }

        this._backupData[tweet.id_str] = tweet;
        this._cache[tweet.id_str] = tweetparse(tweet);
        loaded.push(tweet.id_str);
      }

      const absent = difference(tweetsRequested, loaded);
      for (const id of absent) {
        if (!id) continue;
        if (!hasOwn(this._backupData, id)) {
          log.error('Could not find tweet ' + id);
          continue;
        }
        const tweet = this._backupData[id];

        if (tweet) {
          log('Pulled tweet from backup ' + id);
          this._cache[id] = tweetparse(this._backupData[id]);
        } else {
          this._cache[id] = false;
        }
      }
    }

    return tweetids.map((id) => this._cache[id] || null);
  }

  _missing (tweetids) {
    return difference(tweetids, this._presentTweets);
  }
}


function makeFetcher (config) {
  if (!config) return () => [];
  const client = new Twitter(config);
  return (tweetids) => client
    .get('statuses/lookup', { id: tweetids.join(','), tweet_mode: 'extended' })
    // .then((r) => { console.log({r}); return r; })
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
