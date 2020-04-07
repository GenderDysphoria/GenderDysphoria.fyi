
const path = require('path');
const { without } = require('lodash');
const { resolve, isCleanUrl, TYPE, ENGINE } = require('./resolve');
const Page = require('./page');
const slugify = require('./lib/slugify');
const pkg  = require(resolve('package.json'));

const POSTMATCH = /(\d{4}-\d\d-\d\d)\.\d{4}\.(\w+)/;

function arrayify (input) {
  if (!input) return [];
  if (!Array.isArray(input)) return [ input ];
  return input;
}

module.exports = exports = class Post extends Page {

  _engine () {
    switch (this.type) {
    case TYPE.HANDLEBARS:
      return TYPE.HANDLEBARS;
    case TYPE.MARKDOWN:
      return ENGINE.POST;
    default:
      return ENGINE.OTHER;
    }
  }

  _dir (dir) {
    // if the file name matches the POSTMATCH pattern, then this needs to be /p/ file
    const match = this.name.match(POSTMATCH);

    if (match) {
      return [ 'tweets', match[2] ];
    }

    dir = dir.replace(POSTMATCH, '$2').split('/');
    dir = without(dir, 'posts', '_images');
    dir.unshift('tweets');
    return dir;
  }

  _out () {
    var isIndexPage = (this.name === 'index' || this.name.match(POSTMATCH));
    var isClean = isCleanUrl(this.ext);

    if (isClean && isIndexPage) {
      this.out     = path.join(this.base, 'index.html');
      this.json    = path.join(this.base, 'index.json');
      this.url     = this.dir;
    } else if (isClean) {
      this.out     = path.join(this.base, this.name, 'index.html');
      this.json    = path.join(this.base, this.name + '.json');
      this.url     = path.join(this.dir, this.name);
    } else if (isIndexPage) {
      this.out     = path.join(this.base, 'index.html');
      this.json    = path.join(this.base, this.name + '.json');
      this.url     = this.dir;
    } else {
      this.out     = path.join(this.base, this.basename);
      this.json    = path.join(this.base, this.basename + '.json');
      this.url     = path.join(this.dir, this.basename);
    }

    const url = new URL(pkg.siteInfo.siteUrl);
    url.pathname = this.url;
    this.fullurl = url.href;
  }

  _parse (...args) {
    super._parse(...args);

    this.id = this.meta.id;

    if (!this.titlecard) this.titlecard = '/tweets/titlecard.png';

    this.meta.tags = (this.meta.tags || []).reduce((result, tag) => {
      result[slugify(tag)] = tag;
      return result;
    }, {});

    this.meta.author = this.meta.author && arrayify(this.meta.author) || [];

    this.classes.push('post');
  }

};

