const glob = require('../lib/glob');
const { keyBy, filter, get, set, memoize } = require('lodash');
const { relative, ROOT } = require('./resolve');
const Asset = require('./asset');

module.exports = exports = async function createAssetFinder () {
  const files = await glob('pages/**/*.{jpeg,jpg,png,gif,mp4}', { cwd: ROOT });
  const map = {};
  const assets = (await Promise.all(files.map(async (filepath) => {
    const asset = new Asset(relative(filepath));
    await asset.load();
    set(map, [ ...asset.base.split('/'), asset.name ], asset);
    return asset;
  }))).filter(Boolean);

  Object.freeze(map);

  function within (dir) {
    const subset = filter(assets, { dir });
    return {
      get titlecard () {
        return get(filter(subset, { name: 'titlecard' }), [ 0, 'url' ]);
      },
      get assets () {
        return keyBy(subset.map((a) => a.webready()), 'name');
      },
      get all () {
        return [ ...subset ];
      },
    };
  }

  return {
    map,
    for: memoize(within),
    get tasks () {
      return assets.map((a) => a.tasks()).flat(1);
    },
    get all () {
      return [ ...assets ];
    },
  };
};

exports.Asset = Asset;
