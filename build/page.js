
const path = require('path');
const Promise = require('bluebird');
const fs = require('fs-extra');
const log = require('fancy-log');
const File = require('./file');
const actions = require('./actions');
const { URL } = require('url');
const { resolve, readFile, isCleanUrl, TYPE, ENGINE } = require('./resolve');
const { isObject, isString } = require('./lib/util');
const { parseTweetId } = require('./page-tweets');

const pkg  = require(resolve('package.json'));
const frontmatter = require('front-matter');

module.exports = exports = class Page extends File {

  constructor (filepath) {
    super(filepath);

    this.serializable.push(
      'fullurl',
      'engine',
      'source',
      'meta',
      'images',
      'titlecard',
      'tweets',
      'dateCreated',
      'dateModified',
      'classes',
      'flags',
      'siblings',
    );

    this.engine = this._engine();
  }

  _engine () {
    switch (this.type) {
    case TYPE.HANDYBARS:
      return TYPE.HANDYBARS;
    case TYPE.MARKDOWN:
      return ENGINE.PAGE;
    default:
      return ENGINE.OTHER;
    }
  }

  _out () {
    var isIndexPage = (this.name === 'index');
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

  async load (PublicFiles) {
    const [ raw, { ctime, mtime } ] = await Promise.all([
      readFile(this.input).catch(() => null),
      fs.stat(this.input).catch(() => ({})),
    ]);

    // empty file
    if (!raw || !ctime) {
      log.error('Could not load page: ' + this.filepath);
      return false;
    }

    try {
      var { attributes: meta, body } = frontmatter(raw.toString('utf8'));
    } catch (e) {
      log.error('Error while parsing frontmatter for ' + this.filepath, e);
      return false;
    }

    this.source = body;
    this.meta = meta || {};
    this.dateCreated = meta.date && new Date(meta.date) || ctime;
    this.dateModified = mtime;

    this._parse(PublicFiles);

    return this;
  }

  _parse (PublicFiles) {
    const { titlecard, webready } = this.files = PublicFiles.for(this.dir);
    this.ignore = this.meta.ignore;
    this.draft = this.meta.draft;
    this.lang = this.lang || this.meta.lang || "en";
    this.siblings = this.meta.siblings;
    this.images = webready;
    this.titlecard = titlecard;
    if (this.meta.tweets && isString(this.meta.tweets)) this.meta.tweets = this.meta.tweets.split(/\s/).filter(Boolean);
    this.tweets = (this.meta.tweets || []).map(parseTweetId);

    this.classes = Array.from(new Set(this.meta.classes || []));
    this.flags = this.classes.reduce((res, item) => {
      var camelCased = item.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      res[camelCased] = true;
      return res;
    }, {});
  }

  tasks () {
    const tasks = [];
    if (isObject(this.tweets)) {
      tasks.push(...(
        Object.values(this.tweets)
          .map((t) => t.media)
          .flat()
          .map((m) => ({ ...m, action: actions.fetch, output: m.output }))
      ));
    }
    if (this._tasks) tasks.push(...this._tasks);
    return tasks;
  }

};
