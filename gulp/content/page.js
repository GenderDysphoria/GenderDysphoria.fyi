
const path = require('path');
const Promise = require('bluebird');
const fs = require('fs-extra');
const log = require('fancy-log');
const frontmatter = require('front-matter');
const { URL } = require('url');
const { pick, omit } = require('lodash');

const ROOT = path.resolve(__dirname, '../..');
const pkg  = require(resolve('package.json'));


/* Utility Functions **************************************************/

const MD = '.md';
const HBS = '.hbs';
const HTML = '.html';
const XML = '.xml';

const tweeturl = /https?:\/\/twitter\.com\/(?:#!\/)?(?:\w+)\/status(?:es)?\/(\d+)/i;
const tweetidcheck = /^\d+$/;
function parseTweetId (tweetid) {
  // we can't trust an id that isn't a string
  if (typeof tweetid !== 'string') return false;

  const match = tweetid.match(tweeturl);
  if (match) return match[1];
  if (tweetid.match(tweetidcheck)) return tweetid;
  return false;
}

function resolve (...args) {
  args = args.filter(Boolean);
  let fpath = args.shift();
  if (!fpath) return ROOT;
  if (fpath[0] === '/') fpath = fpath.slice(1);
  return path.resolve(ROOT, fpath, ...args);
}


module.exports = exports = class Page  {

  constructor (filepath) {
    if (filepath && typeof filepath === 'object') {
      // we've been passed a json object, treat as serialized Page
      Object.assign(this, filepath);
      return this;
    }

    const file = path.parse(filepath);
    const { base: basename, name, ext } = file;

    // this file is an include, skip it.
    if (name[0] === '_') return false;

    // this is not a page file
    if (![ MD, HBS, HTML, XML ].includes(ext)) return false;

    // remove the pages root and any _images segment from the dir
    const dir = file.dir.split('/');
    if (dir[0] === 'pages') dir.shift();
    const i = dir.indexOf('_images');
    if (i > -1) dir.splice(i, 1);

    this.input    = resolve(filepath);           // /local/path/to/pages/file.ext
    this.cwd      = resolve(file.dir);           // /local/path/to/pages/, pages/folder, pages/folder/subfolder
    this.base     = path.join(...dir);           // '', 'folder', 'folder/subfolder'
    this.dir      = path.join('/', ...dir);      // /, /folder, /folder/subfolder
    this.name     = name;                        // index, fileA, fileB
    this.basename = basename;                    // index.ext, fileA.ext, fileB.ext
    this.dest     = path.join('dist/', ...dir);  // dist/, dist/folder, dist/folder/subfolder
    this.ext      = file.ext;

    var isIndexPage = (name === 'index');
    var isCleanUrl = [ HBS, MD ].includes(ext);

    if (isCleanUrl && isIndexPage) {
      this.out  = path.join(this.dest, 'index.html');
      this.json = path.join(this.dest, 'index.json');
      this.url  = this.dir;
    } else if (isCleanUrl) {
      this.out  = path.join(this.dest, this.name, 'index.html');
      this.json = path.join(this.dest, this.name + '.json');
      this.url  = path.join(this.dir, this.name);
    } else if (isIndexPage) {
      this.out  = path.join(this.dest, 'index.html');
      this.json = path.join(this.dest, this.name + '.json');
      this.url  = this.dir;
    } else {
      this.out  = path.join(this.dest, this.basename);
      this.json = path.join(this.dest, this.basename + '.json');
      this.url  = path.join(this.dir, this.basename);
    }

    this.output = resolve(this.out);

    const url = new URL(pkg.siteInfo.siteUrl);
    url.pathname = this.url;
    this.fullurl = url.href;

    if ([ HBS, HTML, XML ].includes(ext)) {
      this.engine = 'hbs';
    } else if (ext === MD) {
      this.engine = 'md';
    } else {
      this.engine = 'raw';
    }

  }

  async load ({ Assets }) {
    const [ raw, { ctime, mtime } ] = await Promise.all([
      fs.readFile(this.input).catch(() => null),
      fs.stat(this.input).catch(() => {}),
    ]);

    const { titlecard, assets } = Assets.for(this.dir);

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
    this.meta = meta;
    this.images = assets;
    this.titlecard = titlecard;
    this.tweets = (meta.tweets || []).map(parseTweetId);
    this.dateCreated = meta.date && new Date(meta.date) || ctime;
    this.dateModified = mtime;

    this.classes = Array.from(new Set(meta.classes || []));
    this.flags = this.classes.reduce((res, item) => {
      var camelCased = item.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      res[camelCased] = true;
      return res;
    }, {});

    return this;
  }

  toJson () {
    const j = pick(this, [
      'input',
      'output',
      'json',
      'dateCreated',
      'dateModified',
      'cwd',
      'base',
      'dir',
      'name',
      'ext',
      'basename',
      'dest',
      'out',
      'url',
      'fullurl',
      'engine',
      'source',
      'images',
      'assets',
      'titlecard',
      'tweets',
      'classes',
      'flags',
    ]);

    j.meta = omit(this.meta, [ 'date', 'classes', 'tweets' ]);

    return j;
  }

};
