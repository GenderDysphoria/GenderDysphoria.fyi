const glob = require('./lib/glob');
const { groupBy, keyBy, filter, find, get, memoize } = require('lodash');
const { ROOT, kind, KIND } = require('./resolve');
const File = require('./file');
const Asset = require('./asset');
const Page = require('./page');
const Promise = require('bluebird');

const KIND_MAP = {
  [KIND.PAGE]:  Page,
  [KIND.ASSET]: Asset,
  [KIND.OTHER]: File,
};

module.exports = exports = async function loadPublicFiles () {
  const files = await Promise.map(glob('public/**/*', { cwd: ROOT, nodir: true }), (filepath) => {
    const k = kind(filepath);
    const F = KIND_MAP[k];
    const f = new F(filepath);
    if (f.kind === KIND.PAGE && f.preprocessed) return false;
    return f;
  }).filter(Boolean);

  const {
    [KIND.PAGE]:  pages,
    [KIND.ASSET]: assets,
  } = groupBy(files, 'kind');

  function within (dir) {
    const subset = filter(files, { dir });

    const getTitlecard = memoize(() =>
      get(find(files, { name: 'titlecard' }), [ 0, 'url' ]),
    );

    const {
      [KIND.PAGE]:  subpages,
      [KIND.ASSET]: subassets,
    } = groupBy(subset, 'kind');

    const webready = subassets && keyBy(subassets.map((a) => a.webready()), 'name');

    return {
      all: subset,
      get titlecard () { return getTitlecard; },
      get pages () {
        return subpages;
      },
      get assets () {
        return webready;
      },
    };
  }

  return {
    all: files,
    pages,
    assets,
    for: memoize(within),
    get tasks () {
      return files.map((a) => a.tasks()).flat(1);
    },
  };
};
