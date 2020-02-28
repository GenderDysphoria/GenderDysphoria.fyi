
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const fs = require('fs-extra');
const { is: _is } = require('./lib/util');

function is (...args) {
  const fn = _is(...args);
  const ret = (ext) => fn(normalizedExt(ext));
  ret.matching = args;
  return ret;
}

function dictMatch (dict, def) {
  const arr = Object.entries(dict);

  return (tok) => {
    for (const [ key, fn ] of arr) {
      // console.log({ key, tok, r: fn(tok), matching: fn.matching })
      if (fn(tok)) return key;
    }
    return def;
  };
}

const EXT = exports.EXT = {
  JPG:  '.jpg',
  JPEG: '.jpeg',
  PNG:  '.png',
  GIF:  '.gif',
  MP4:  '.mp4',
  M4V:  '.m4v',
  MD:   '.md',
  HBS:  '.hbs',
  HTML: '.html',
  XML:  '.xml',
  CSS:  '.css',
  SCSS: '.scss',
  JS:   '.js',
};

const {
  JPG,
  JPEG,
  PNG,
  GIF,
  MP4,
  M4V,
  MD,
  HBS,
  HTML,
  XML,
  CSS,
  SCSS,
  JS,
} = EXT;

const NORMALIZE_EXT = {
  [JPG]:  JPEG,
  [M4V]:  MP4,
  [HBS]:  HTML,
};

const normalizedExt = exports.normalizedExt = (ext) => {
  if (ext[0] !== '.') ext = '.' + ext.split('.').pop();
  return NORMALIZE_EXT[ext] || ext;
};

const isVideo      = exports.isVideo       = is(MP4, M4V);
const isImage      = exports.isImage       = is(JPG, JPEG, PNG, GIF);
const isHandlebars = exports.isHandlebars  = is(XML, HBS, HTML);
const isMarkdown   = exports.isMarkdown    = is(MD);
const isPage       = exports.isPage        = is(isHandlebars, isMarkdown);
const isAsset      = exports.isAsset       = is(isImage, isVideo);
const isArtifact   = exports.isArtifact    = is(CSS, SCSS, JS);
exports.isCleanUrl = is(HBS, MD);



const TYPE = exports.TYPE = {
  IMAGE:      'IMAGE',
  VIDEO:      'VIDEO',
  HANDLEBARS: 'HANDLEBARS',
  MARKDOWN:   'MARKDOWN',
  SCRIPT:     'SCRIPT',
  STYLE:      'STYLE',
  OTHER:      'OTHER',
};

exports.type = dictMatch({
  [TYPE.IMAGE]:      isImage,
  [TYPE.HANDLEBARS]: isHandlebars,
  [TYPE.MARKDOWN]:   isMarkdown,
  [TYPE.VIDEO]:      isVideo,
  [TYPE.SCRIPT]:     is(JS),
  [TYPE.STYLE]:      is(SCSS, CSS),
}, TYPE.OTHER);



const KIND = exports.KIND = {
  PAGE:     'PAGE',
  ASSET:    'ASSET',
  ARTIFACT: 'ARTIFACT',
  OTHER:    'OTHER',
};

exports.kind = dictMatch({
  [KIND.ASSET]:    isAsset,
  [KIND.PAGE]:     isPage,
  [KIND.ARTIFACT]: isArtifact,
}, KIND.OTHER);



const ENGINE = exports.ENGINE = {
  HANDLEBARS: 'HANDLEBARS',
  MARKDOWN:   'MARKDOWN',
  COPY:       'COPY',
};

exports.engine = dictMatch({
  [ENGINE.HANDLEBARS]: is(XML, HBS, HTML),
  [ENGINE.MARKDOWN]:   is(MD),
}, ENGINE.COPY);



exports.readFile = function readFile (fpath) {
  fpath = exports.resolve(fpath);
  return fs.readFile(fpath).catch((err) => {
    throw new Error(err.message);
  });
};

exports.resolve = function resolve (...args) {
  args = args.filter(Boolean);
  const fpath = args.shift();
  if (!fpath) return ROOT;
  return path.resolve(ROOT, fpath, ...args);
};

exports.relative = function relative (fpath) {
  return path.relative(ROOT, fpath);
};

exports.ROOT = ROOT;
