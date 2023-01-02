const path = require('path');
const { groupBy, keyBy, filter, find, memoize } = require('lodash');
const { kind, KIND } = require('./resolve');
const File = require('./file');
const Asset = require('./asset');
const Page = require('./page');

module.exports = exports = class Files {

  constructor (paths, base = '') {
    this.KIND_MAP = this._kindMap();

    this.base = base;
    this.files = paths.map(this._parsePath.bind(this)).filter(Boolean);

    const {
      [KIND.PAGE]:  pages,
      [KIND.ASSET]: assets,
    } = groupBy(this.files, 'kind');

    this.pages  = pages || [];
    this.assets = assets || [];

    this._getTitlecard = memoize(() =>
      find(assets, { name: 'titlecard', dir: this.base })
    );

    this._getWebReady = memoize(() => assets && keyBy(assets.map((a) => a.webready), 'name'));

    this.for = memoize(this.for);
  }

  get all () {
    return this.files;
  }

  get titlecard () {
    const t = this._getTitlecard();
    return t && t.url;
  }

  get webready () {
    return this._getWebReady();
  }

  get tasks () {
    return this.files.map((a) => a.tasks()).flat(1);
  }

  for (dir) {
    dir = path.join(this.base, dir);
    const subset = filter(this.files, { dir });
    return new this.constructor(subset, dir);
  }

  _kindMap () {
    return {
      [KIND.PAGE]:  Page,
      [KIND.ASSET]: Asset,
      [KIND.OTHER]: File,
    };
  }

  _parsePath (filepath) {
    if (typeof filepath === 'object') return filepath;
    if (filepath.includes('#')) return false;
    const k = kind(filepath);
    const F = this.KIND_MAP[k];
    if (!F) return false;
    const f = new F(filepath);
    if (f.kind === KIND.PAGE && f.preprocessed) return false;
    return f;
  }
};
