
const Page = require('./page');
const { resolveDir } = require('./resolve');

function isDate (input) { return input instanceof Date; }

function min (...collection) {
  if (isDate(collection[0])) return new Date(Math.min(...collection));
  return Math.min(...collection);
}

function max (...collection) {
  if (isDate(collection[0])) return new Date(Math.max(...collection));
  return Math.max(...collection);
}

module.exports = exports = function (pages, target, paths, meta) {
  const sources = {};
  for (const page of pages) {
    if (paths.includes(page.input)) sources[page.input] = page;
  }

  const result = new CombinedPage(target);
  result.cwd = resolveDir(target);
  result.source = '';
  result.meta = {};
  result.dateCreated = new Date();
  result.dateModified = new Date(1990, 12, 1);
  result.tweets = {};
  result.images = {};
  result.meta = meta;
  result.classes = Array.from(new Set(meta.classes || []));
  result.flags = result.classes.reduce((res, item) => {
    var camelCased = item.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    res[camelCased] = true;
    return res;
  }, {});

  for (const path of paths) {
    const p = sources[path];
    if (!p) throw new Error(`File not found during concatination: ${path}`);
    result.source += p.source;

    result.dateCreated = min(result.dateCreated, p.dateCreated);
    result.dateModified = max(result.dateModified, p.dateModified);
    Object.assign(result.images, p.images);
    Object.assign(result.tweets, p.tweets);
  }

  result.meta.date = result.dateCreated;

  return result;
};



class CombinedPage extends Page {

  async load () {
    // do nothing
  }

}
