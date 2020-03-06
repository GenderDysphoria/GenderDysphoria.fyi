
const path = require('path');
const { without } = require('lodash');
const { resolve, isCleanUrl } = require('./resolve');
const Page = require('./page');
const slugs = require('slugify');
const slugify = (s) => slugs(s, { remove: /[*+~.,()'"!?:@/\\]/g }).toLowerCase();
const pkg  = require(resolve('package.json'));

const postmatch = /(\d{4}-\d\d-\d\d)\.\d{4}\.(\w+)/;

module.exports = exports = class Post extends Page {

  _dir (dir) {
    // if the file name matches the postmatch pattern, then this needs to be /p/ file
    const match = this.name.match(postmatch);

    if (match) {
      return [ 'p', match[2] ];
    }

    dir = dir.replace(postmatch, '$2').split('/');
    dir = without(dir, 'posts', '_images');
    dir.unshift('p');
    return dir;
  }

  _out () {
    var isIndexPage = (this.name === 'index' || this.name.match(postmatch));
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

    this.meta.tags = (this.meta.tags || []).reduce((result, tag) => {
      result[slugify(tag)] = tag;
      return result;
    }, {});

    this.classes.push('post');
  }

};

