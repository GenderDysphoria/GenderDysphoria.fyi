const path = require('path');
const glob = require('../lib/glob');
const { chunk, uniq, difference } = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const log = require('fancy-log');
const tweetparse = require('../lib/tweetparse');
const getEngines = require('./renderers');
const Twitter = require('twitter-lite');
const Page = require('./page');
const createAssetFinder = require('./assets');
const { resolve, ROOT } = require('./resolve');

exports.parse = async function parsePageContent (assetFinder) {
  const [ files, twitter, twitterBackup, twitterCache, Assets ] = await Promise.all([
    glob('pages/**/*.{md,hbs,html,xml}', { cwd: ROOT }),
    fs.readJson(resolve('twitter-config.json')).catch(() => null)
      .then(getTwitterClient),
    fs.readJson(resolve('twitter-backup.json')).catch(() => ({})),
    fs.readJson(resolve('twitter-cache.json')).catch(() => ({})),
    assetFinder || createAssetFinder(),
  ]);


  let tweetsNeeded = [];
  const tweetsPresent = Object.keys(twitterCache);

  let pages = await Promise.map(files, async (filepath) => {
    const page = new Page(filepath);
    if (!page.input) return;
    await page.load({ Assets });

    if (page.tweets.length) {
      const missing = difference(page.tweets, tweetsPresent);
      tweetsNeeded.push(...missing);
    }

    return page;
  });

  pages = pages.filter(Boolean);
  tweetsNeeded = uniq(tweetsNeeded);

  /* Load Missing Tweets **************************************************/

  if (tweetsNeeded.length) {
    log('Fetching tweets: ' + tweetsNeeded.join(', '));
    const arriving = await Promise.all(chunk(tweetsNeeded, 99).map(twitter));
    const loaded = [];
    for (const tweet of arriving.flat(1)) {
      if (!twitterBackup[tweet.id_str]) twitterBackup[tweet.id_str] = tweet;
      twitterCache[tweet.id_str] = tweetparse(tweet);
      loaded.push(tweet.id_str);
    }

    const absent = difference(tweetsNeeded, loaded);
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

  // now loop through pages and substitute the tweet data for the ids
  for (const page of pages) {
    if (!page.tweets || !page.tweets.length) continue;

    page.tweets = page.tweets.reduce((dict, tweetid) => {
      const tweet = twitterCache[tweetid];
      if (!tweet) {
        log.error(`Tweet ${tweetid} is missing from the cache.`);
        return dict;
      }
      dict[tweetid] = tweet;
      twitterMedia.push( ...tweet.media );
      return dict;
    }, {});

  }

  await Promise.all([
    fs.writeFile(resolve('pages.json'),          JSON.stringify(pages.map((p) => p.toJson()),  null, 2)),
    fs.writeFile(resolve('twitter-media.json'),  JSON.stringify(twitterMedia,  null, 2)),
    fs.writeFile(resolve('twitter-cache.json'),  JSON.stringify(twitterCache,  null, 2)),
    fs.writeFile(resolve('twitter-backup.json'), JSON.stringify(twitterBackup, null, 2)),
  ]);

  return pages;
};

exports.write = async function writePageContent (prod) {
  const [ pages, { siteInfo }, engines ] = await Promise.all([
    fs.readJson(resolve('pages.json')),
    fs.readJson(resolve('package.json')),
    getEngines(prod),
  ]);

  await Promise.map(pages, async (page) => {
    // page = new Page(page);

    var data = {
      ...page,
      meta: { ...page.meta, ...page },
      page: {
        domain: siteInfo.domain,
        title: page.meta.title
          ? (page.meta.title + (page.meta.subtitle ? ', ' + page.meta.subtitle : '') + ' :: ' + siteInfo.title)
          : siteInfo.title,
        description: page.meta.description || siteInfo.description,
      },
      site: siteInfo,
      local: {
        cwd: page.cwd,
        root: ROOT,
        basename: page.basename,
      },
      pages,
    };

    const html = String(engines[page.engine](data.source, data));
    const json = page.json && {
      url: page.fullurl,
      title: page.meta.title,
      subtitle: page.meta.subtitle,
      description: page.meta.description,
      tweets: page.tweets,
      images: page.images,
      dateCreated: page.dateCreated,
      dateModified: page.dateModified,
      titlecard: page.titlecard,
      preview: page.engine === 'md' && String(engines.preview(data.source, data)),
    };

    const output = resolve('dist', page.output);
    await fs.ensureDir(path.dirname(output));
    await Promise.all([
      fs.writeFile(output, Buffer.from(html)),
      json && fs.writeFile(resolve('dist', page.json), Buffer.from(
        prod ? JSON.stringify(json) : JSON.stringify(json, null, 2),
      )),
    ]);
  });
};


/* Utility Functions **************************************************/

function getTwitterClient (config) {
  if (!config) return () => [];
  const client = new Twitter(config);
  return (tweetids) => client
    .get('statuses/lookup', { id: tweetids.join(','), tweet_mode: 'extended' })
    .catch((e) => { log.error(e); return []; });
}
