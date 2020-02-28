
const loadPublicFiles = require('./public');
const Cache = require('./cache');
const Promise = require('bluebird');
const fs = require('fs-extra');

const primeTweets = require('./page-tweets');
const pageWriter = require('./page-writer');
const evaluate = require('./evaluate');
const { resolve } = require('./resolve');

const favicon = require('./favicon');
const svg     = require('./svg');

exports.everything = function (prod = false) {
  const fn = async () => {

    // load a directory scan of the public folder
    const PublicFiles = await loadPublicFiles();

    // load data for all the files in that folder
    await Promise.map(PublicFiles.all, (p) => p.load(PublicFiles));

    // prime tweet data for all pages
    const pages = await primeTweets(PublicFiles.pages);

    // compile all tasks to be completed
    const tasks = await Promise.all([
      PublicFiles.tasks,
      svg(prod),
      favicon(prod),
    ]);

    async function crankTasks () {
      if (!tasks.length) return;
      const cache = new Cache({ prod });
      await cache.load();
      await evaluate(tasks.flat(), cache);
      await cache.save();
    }

    await Promise.all([
      fs.writeFile(resolve('pages.json'), JSON.stringify(pages.map((p) => p.toJson()),  null, 2)),
      pageWriter(pages, prod),
      crankTasks(),
    ]);
  };

  const ret = () => fn().catch((err) => { console.log(err.trace || err); throw err; });
  ret.displayName = prod ? 'generateEverythingForProd' : 'generateEverything';
  return ret;
};
