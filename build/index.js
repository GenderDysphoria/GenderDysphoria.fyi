
process.env.BLUEBIRD_DEBUG = true;

const loadPublicFiles = require('./public');
const loadPostFiles = require('./posts');
const Cache = require('./cache');
const Promise = require('bluebird');
const fs = require('fs-extra');

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
    const pages = await primeTweets(PublicFiles.pages);
    const posts = await primeTweets(PostFiles.pages);


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
