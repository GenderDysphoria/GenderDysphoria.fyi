
process.env.BLUEBIRD_DEBUG = true;

const loadPublicFiles = require('./public');
const loadPostFiles = require('./posts');
const Cache = require('./cache');
const Promise = require('bluebird');
const fs = require('fs-extra');
const { sortBy } = require('lodash');

const primeTweets = require('./page-tweets');
const pageWriter = require('./page-writer');
const evaluate = require('./evaluate');
const { resolve } = require('./resolve');

const favicon = require('./favicon');
const scss    = require('./scss');
const svg     = require('./svg');
const scripts = require('./scripts');


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
    const pages = await primeTweets(PublicFiles.pages.filter((p) => !p.meta.ignore));

    let posts = await primeTweets(PostFiles.pages.filter((p) => !p.meta.ignore));
    posts = sortBy(posts, 'date');
    posts.reverse();

    // compile all tasks to be completed
    const tasks = await Promise.all([
      PublicFiles.tasks,
      PostFiles.tasks,
      scss(prod),
      scripts(prod),
      svg(prod),
      favicon(prod),
    ]);

    await fs.writeFile(resolve('pages.json'), JSON.stringify(pages.map((p) => p.toJson()),  null, 2));
    await fs.writeFile(resolve('posts.json'), JSON.stringify(posts.map((p) => p.toJson()),  null, 2));

    await fs.ensureDir(resolve('dist'));
    const cache = new Cache({ prod });
    await cache.load();
    await evaluate(tasks.flat(), cache);
    await cache.save();

    await pageWriter(pages, posts, prod);
  }

  fn.displayName = prod ? 'buildForProd' : 'build';
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
