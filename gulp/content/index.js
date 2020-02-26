
const createAssetFinder = require('./assets');
const Cache = require('./cache');

const evaluate = require('./evaluate');

const pages = require('./pages');

const twitter = require('./twitter');
const favicon = require('./favicon');
const assets = () => createAssetFinder().then(({ tasks }) => tasks);

exports.everything = function (prod = false) {
  const fn = async () => {

    const AssetFinder = await createAssetFinder();

    await pages.parse(AssetFinder);

    const tasks = await Promise.all([
      AssetFinder.tasks,
      twitter(prod),
      favicon(prod),
    ]);

    if (!tasks.length) return;

    const cache = new Cache({ prod });
    await cache.load();
    await evaluate(tasks.flat(), cache);
    await cache.save();

    await pages.write(prod);
  };

  const ret = () => fn().catch((err) => { console.log(err.trace || err); throw err; });
  ret.displayName = prod ? 'generateEverythingForProd' : 'generateEverything';
  return ret;
};

exports.task = function (action, prod = false) {
  let fn;

  if (action === 'parse') {
    fn = () => pages.parse();
  } else if (action === 'pages') {
    fn = () => pages.write(prod);
  } else {
    fn = async () => {
      const tasks = await {
        twitter,
        favicon,
        assets,
      }[action](prod);

      if (!tasks.length) return;

      const cache = new Cache({ prod });
      await cache.load();
      await evaluate(tasks, cache);
      await cache.save();
    };
  }

  const ret = () => fn().catch((err) => { console.log(err.trace || err); throw err; });
  ret.displayName = prod ? action + 'ForProd' : action;

  return ret;
};
