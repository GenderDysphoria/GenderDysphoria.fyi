const path = require('path');
const glob = require('../lib/glob');
const { chunk, uniq, difference } = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const log = require('fancy-log');
const tweetparse = require('../lib/tweetparse');
const getEngines = require('./renderers');
const Twitter = require('twitter-lite');
const frontmatter = require('front-matter');
const createFileLoader = require('./files');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '../..');

exports.parse = async function parsePageContent () {
  const [ files, twitter, twitterBackup, twitterCache, { siteInfo } ] = await Promise.all([
    glob('pages/**/*.{md,hbs,html,xml}', { cwd: ROOT }),
    fs.readJson(resolve('twitter-config.json')).catch(() => null)
      .then(getTwitterClient),
    fs.readJson(resolve('twitter-backup.json')).catch(() => {}),
    fs.readJson(resolve('twitter-cache.json')).catch(() => {}),
    fs.readJson(resolve('package.json')).catch(() => ({})),
  ]);
  const loadFiles = createFileLoader();

  const tweetsNeeded = [];

  let pages = await Promise.map(files, async (filepath) => {
    const { dir, name, ext } = path.parse(filepath);
    const basename = path.basename(filepath);

    // this is an include, skip it.
    if (name[0] === '_') return;

    const cwd = resolve(dir);
    const input = resolve(filepath);
    const outDir = path.join('dist', dir.slice(6));
    const siteDir = `/${dir.slice(6)}`;

    // if cwd === ROOT then we're in the bottom directory and there is no base
    const base = path.relative(cwd, ROOT) && path.basename(dir);

    /* Load Page Content **************************************************/
    const [ raw, { ctime, mtime }, { images, titlecard } ] = await Promise.all([
      fs.readFile(input).catch(() => null),
      stat(input),
      loadFiles(cwd, siteDir),
    ]);

    // empty file
    if (!raw) return;

    try {
      var { attributes: meta, body } = frontmatter(raw.toString('utf8'));
    } catch (e) {
      log.error('Error while parsing frontmatter for ' + filepath, e);
      return;
    }

    // page is marked to be ignored, skip it.
    if (meta.ignore) return;

    meta.path = filepath;
    meta.cwd = cwd;
    meta.base = base;
    meta.outDir = outDir;
    meta.input = input;
    meta.source = body;
    meta.dateCreated = meta.date && new Date(meta.date) || ctime;
    meta.dateModified = mtime;
    meta.siteDir = siteDir;
    meta.name = name;
    meta.ext = ext;
    meta.titlecard = titlecard;
    meta.images = images;

    var flags = new Set(meta.classes || []);
    var isIndexPage = meta.isIndex = (name === 'index');
    var isRootPage = meta.isRoot = (siteDir === '/');
    var isCleanUrl = meta.isCleanUrl = [ '.hbs', '.md' ].includes(ext);

    if ([ '.hbs', '.html', '.xml' ].includes(ext)) {
      meta.engine = 'hbs';
    } else if (ext === '.md') {
      meta.engine = 'md';
    } else {
      meta.engine = 'raw';
    }

    flags.add(titlecard ? 'has-titlecard' : 'no-titlecard');
    flags.add(meta.title ? 'has-title' : 'no-title');
    flags.add(meta.subtitle ? 'has-subtitle' : 'no-subtitle');
    flags.add(meta.description ? 'has-descrip' : 'no-descrip');

    let slug, output, jsonOutput;
    if (isRootPage) {
      if (isCleanUrl) {
        slug = '';
        output = resolve(outDir, name, 'index.html');
        jsonOutput = resolve(outDir, name + '.json');
      } else {
        slug = '';
        output = resolve(outDir, basename);
        jsonOutput = resolve(outDir, basename + '.json');
      }
    } else if (isCleanUrl) {
      slug = name;
      if (isIndexPage) {
        output = resolve(outDir, 'index.html');
      } else {
        output = resolve(outDir, name, 'index.html');
      }
      jsonOutput = resolve(outDir, name + '.json');
    } else {
      slug = base;
      output = resolve(outDir, basename);
      jsonOutput = resolve(outDir, basename + '.json');
    }
    meta.slug = slug;
    meta.output = output;
    meta.json = jsonOutput;

    const url = new URL(siteInfo.siteUrl);
    if ([ '.hbs', '.md' ].includes(ext)) {
      url.pathname = path.join(siteDir, slug);
    } else if (isIndexPage) {
      url.pathname = siteDir;
    } else {
      url.pathname = path.join(siteDir, path.basename(filepath));
    }
    meta.url = url.pathname;
    meta.fullurl = url.toString();


    /* Process Tweets **************************************************/

    const tweets = [];

    if (meta.tweet) {
      meta.tweet = [ meta.tweet ].flat(1).map(parseTweetId);
      tweets.push(...meta.tweet);
    }

    if (meta.tweets) {
      meta.tweets = meta.tweets.map(parseTweetId);
      tweets.push(...meta.tweets);
    }

    for (const id of tweets) {
      if (!twitterCache[id]) {
        tweetsNeeded.push(id);
      }
    }

    meta.tweets = tweets;

    flags.add(tweets.length ? 'has-tweets' : 'no-tweets');

    /* Process Flags **************************************************/

    meta.classes = Array.from(flags);
    meta.flags = meta.classes.reduce((res, item) => {
      var camelCased = item.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      res[camelCased] = true;
      return res;
    }, {});

    return meta;
  });

  pages = pages.filter(Boolean);

  /* Load Missing Tweets **************************************************/

  if (tweetsNeeded.length) {
    log('Fetching tweets: ' + tweetsNeeded.join(', '));
    const arriving = await Promise.all(chunk(uniq(tweetsNeeded), 99).map(twitter));

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
    fs.writeFile(path.join(ROOT, 'pages.json'),          JSON.stringify(pages,  null, 2)),
    fs.writeFile(path.join(ROOT, 'twitter-media.json'),  JSON.stringify(twitterMedia,  null, 2)),
    fs.writeFile(path.join(ROOT, 'twitter-cache.json'),  JSON.stringify(twitterCache,  null, 2)),
    fs.writeFile(path.join(ROOT, 'twitter-backup.json'), JSON.stringify(twitterBackup, null, 2)),
  ]);

  return pages;
};

exports.write = async function writePageContent ({ prod }) {
  const [ pages, { siteInfo }, engines ] = await Promise.all([
    fs.readJson(resolve('pages.json')),
    fs.readJson(resolve('package.json')),
    getEngines(prod),
  ]);

  await Promise.map(pages, async (page) => {
    var data = {
      ...page,
      meta: page,
      page: {
        domain: siteInfo.domain,
        title: page.title
          ? (page.title + (page.subtitle ? ', ' + page.subtitle : '') + ' :: ' + siteInfo.title)
          : siteInfo.title,
      },
      local: {
        cwd: page.cwd,
        root: ROOT,
        basename: path.basename(page.input),
      },
      pages,
    };

    const html = engines[page.engine](data.source, data).toString();
    const json = page.json && {
      url: page.fullurl,
      title: page.title,
      subtitle: page.subtitle,
      description: page.description,
      tweets: page.tweets,
      images: page.images,
      dateCreated: page.dateCreated,
      dateModified: page.dateModified,
      titlecard: page.titlecard,
    };

    await fs.ensureDir(path.dirname(page.output));
    await Promise.all([
      fs.writeFile(page.output, Buffer.from(html)),
      json && fs.writeFile(page.json, Buffer.from(prod ? JSON.stringify(json) : JSON.stringify(json, null, 2))),
    ]);
  });
};

exports.write.prod = function writePageContentForProduction () { return exports.write({ prod: true }); };


/* Utility Functions **************************************************/

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

function resolve (fpath, ...args) {
  if (fpath[0] === '/') fpath = fpath.slice(1);
  return path.resolve(ROOT, fpath, ...args);
}

function getTwitterClient (config) {
  if (!config) return () => [];
  const client = new Twitter(config);
  return (tweetids) => client
    .get('statuses/lookup', { id: tweetids.join(','), tweet_mode: 'extended' })
    .catch((e) => { log.error(e); return []; });
}

const stat = (f) => fs.stat(f).catch(() => undefined);
