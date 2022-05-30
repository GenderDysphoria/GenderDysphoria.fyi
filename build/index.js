
process.env.BLUEBIRD_DEBUG = true;

const loadPublicFiles = require('./public');
const loadPostFiles = require('./posts');
const Cache = require('./cache');
const Promise = require('bluebird');
const fs = require('fs-extra');
const { sortBy } = require('lodash');

const getEngines = require('./engines');
const primeTweets = require('./page-tweets');
const i18nTweets = require('./page-tweets').i18n;
const pageWriter = require('./page-writer');
const pageConcatinator = require('./page-concatinator');
const evaluate = require('./evaluate');
const { resolve } = require('./resolve');

const favicon = require('./favicon');
const scss    = require('./scss');
const svg     = require('./svg');
const scripts = require('./scripts');
const concats = require('./_concats');

function writeIndex (destination, files, compressed) {
  files = files.map((p) => !p.draft && (p.toJson ? p.toJson() : p));
  return fs.writeFile(resolve(destination), compressed ? JSON.stringify(files) : JSON.stringify(files, null, 2));
}

exports.everything = function (prod = false) {
  async function fn () {

    // load a directory scan of the public and post folders
    const [ PublicFiles, PostFiles ] = await Promise.all([
      loadPublicFiles(),
      loadPostFiles(),
    ]);

    // load data for all the files in that folder
    await Promise.map(PublicFiles.assets, (p) => p.load());
    await Promise.map(PublicFiles.pages, (p) => p.load(PublicFiles));

    await Promise.map(PostFiles.assets, (p) => p.load());
    await Promise.map(PostFiles.pages, (p) => p.load(PostFiles));


    // prime tweet data for all pages
    let pages = await primeTweets(PublicFiles.pages.filter((p) => !p.meta.ignore));
    pages = pages.filter(Boolean);

    let posts = await primeTweets(PostFiles.pages.filter((p) => !p.meta.ignore));
    posts = posts.filter(Boolean);
    posts = sortBy(posts, 'date');
    posts.reverse();

    // Process i18n for tweets
    await i18nTweets();

    const assets = [ ...PostFiles.assets, ...PublicFiles.assets ];

    const [ tasks ] = await Promise.all([
      await Promise.all([
        PublicFiles.tasks,
        PostFiles.tasks,
        scss(prod),
        scripts(prod),
        svg(prod),
        favicon(prod),
      ]),
      fs.ensureDir(resolve('dist')),
      writeIndex('pages.json',  pages),
      writeIndex('posts.json', posts),
      writeIndex('assets.json', assets),
    ]);

    const cache = new Cache({ prod });
    await cache.load();
    await evaluate(tasks.flat(), cache);
    const { revManifest } = await cache.save();

    for (const cset of concats) {
      const cpage = pageConcatinator(pages, cset.output, cset.sources, cset.meta);
      pages.push(cpage);
    }

    const engines = await getEngines(prod);
    const postIndex = await pageWriter(prod, engines, pages, posts);
    postIndex.rev = revManifest;
    await fs.writeFile(resolve('dist/tweets/index.json'), prod ? JSON.stringify(postIndex) : JSON.stringify(postIndex, null, 2));
  }

  fn.displayName = prod ? 'buildForProd' : 'build';
  return fn;
};

exports.pages = function () {
  async function fn () {
    const prod = false;
    // load a directory scan of the public and post folders
    const [ PublicFiles, PostFiles ] = await Promise.all([
      loadPublicFiles(),
      loadPostFiles(),
    ]);

    // load data for all the files in that folder
    await Promise.map(PublicFiles.assets, (p) => p.load());
    await Promise.map(PublicFiles.pages, (p) => p.load(PublicFiles));

    await Promise.map(PostFiles.assets, (p) => p.load());
    await Promise.map(PostFiles.pages, (p) => p.load(PostFiles));

    // prime tweet data for all pages
    const pages = await primeTweets(PublicFiles.pages.filter((p) => !p.meta.ignore));

    for (const cset of concats) {
      const cpage = pageConcatinator(pages, cset.output, cset.sources, cset.meta);
      pages.push(cpage);
    }

    let posts = await primeTweets(PostFiles.pages.filter((p) => !p.meta.ignore));
    posts = sortBy(posts, 'date');
    posts.reverse();

    const engines = await getEngines(prod);
    const postIndex = await pageWriter(prod, engines, pages, posts);
    await fs.writeFile(resolve('dist/tweets/index.json'), prod ? JSON.stringify(postIndex) : JSON.stringify(postIndex, null, 2));
  }

  fn.displayName = 'buildPages';
  return fn;
};

let twitterProcessing = false;

exports.twitter = function () {
  async function fn () {
    if (twitterProcessing) {
      return;
    }

    twitterProcessing = true;
    try {
      await i18nTweets();
    } catch (exception_var) {
      twitterProcessing = false;
      throw exception_var;
    }
    twitterProcessing = false;
  }

  fn.displayName = 'buildTwitter';
  return fn;
};

exports.task = function (action, prod = false) {
  const fn = async () => {
    const tasks = await {
      scss,
      favicon,
      svg,
      scripts,
    }[action](prod);

    if (!tasks.length) return;

    await fs.ensureDir(resolve('dist'));
    const cache = new Cache({ prod });
    await cache.load();
    await evaluate(tasks, cache);
    await evaluate(tasks.flat(), cache);
    await cache.save();
  };

  fn.displayName = prod ? action + 'ForProd' : action;
  return fn;
};
