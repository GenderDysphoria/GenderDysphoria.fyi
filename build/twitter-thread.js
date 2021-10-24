
const twitterClient = require('./twitter-client');

module.exports = exports = async function loadThread (tweetid) {
  const tc = await twitterClient();

  async function quoteds (tweet) {
    if (!tweet.quoted_status_id_str) return [];
    const [ qt ] = await tc.get(tweet.quoted_status_id_str);
    if (!qt) return [];
    return [ qt.id_str, ...(await quoteds(qt)) ];
  }

  const embeds = [];
  const dependencies = [];
  let id = tweetid;
  do {
    const [ tweet ] = await tc.get(id);
    if (!tweet) break;
    embeds.unshift(tweet.id_str);
    dependencies.unshift(tweet.id_str);

    if (tweet.quoted_status_id_str) {
      const qts = await quoteds(tweet);
      if (qts.length) dependencies.unshift(...qts);
    }

    id = tweet.in_reply_to_status_id_str;
  } while (id);

  await tc.write();

  return [ embeds, dependencies ];
};
