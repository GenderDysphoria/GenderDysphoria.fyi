
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
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
  SVG:  '.svg',
  MP4:  '.mp4',
  M4V:  '.m4v',
  MD:   '.md',
  HBS:  '.hbs',
  HTML: '.html',
  XML:  '.xml',
  CSS:  '.css',
  SCSS: '.scss',
  JS:   '.js',
  JSX:  '.jsx',
};

const {
  JPG,
  JPEG,
  PNG,
  GIF,
  SVG,
  MP4,
  M4V,
  MD,
  HBS,
  HTML,
  XML,
  CSS,
  SCSS,
  JS,
  JSX,
} = EXT;

const NORMALIZE_EXT = {
  [JPG]:  JPEG,
  [M4V]:  MP4,
  [HBS]:  HTML,
  [JSX]:  JS,
};

const normalizedExt = exports.normalizedExt = (ext) => {
  if (ext[0] !== '.') ext = '.' + ext.split('.').pop();
  return NORMALIZE_EXT[ext] || ext;
};

const isVideo      = exports.isVideo       = is(MP4, M4V);
const isImage      = exports.isImage       = is(JPG, JPEG, PNG, GIF, SVG);
const isHandybars  = exports.isHandybars   = is(XML, HBS, HTML);
const isMarkdown   = exports.isMarkdown    = is(MD);
const isPage       = exports.isPage        = is(isHandybars, isMarkdown);
const isAsset      = exports.isAsset       = is(isImage, isVideo);
const isArtifact   = exports.isArtifact    = is(CSS, SCSS, JS, JSX);
exports.isCleanUrl = is(HBS, MD);



const TYPE = exports.TYPE = {
  IMAGE:      'TYPE_IMAGE',
  VIDEO:      'TYPE_VIDEO',
  HANDYBARS:  'TYPE_HANDYBARS',
  MARKDOWN:   'TYPE_MARKDOWN',
  SCRIPT:     'TYPE_SCRIPT',
  STYLE:      'TYPE_STYLE',
  OTHER:      'TYPE_OTHER',
};

exports.type = dictMatch({
  [TYPE.IMAGE]:      isImage,
  [TYPE.HANDYBARS]:  isHandybars,
  [TYPE.MARKDOWN]:   isMarkdown,
  [TYPE.VIDEO]:      isVideo,
  [TYPE.SCRIPT]:     is(JS, JSX),
  [TYPE.STYLE]:      is(SCSS, CSS),
}, TYPE.OTHER);



const KIND = exports.KIND = {
  PAGE:     'KIND_PAGE',
  POST:     'KIND_POST',
  ASSET:    'KIND_ASSET',
  ARTIFACT: 'KIND_ARTIFACT',
  OTHER:    'KIND_OTHER',
};

exports.kind = dictMatch({
  [KIND.ASSET]:    isAsset,
  [KIND.PAGE]:     isPage,
  [KIND.ARTIFACT]: isArtifact,
}, KIND.OTHER);



exports.ENGINE = {
  HTML:    'ENGINE_HTML',
  PAGE:    'ENGINE_PAGE',
  POST:    'ENGINE_POST',
  OTHER:   'ENGINE_OTHER',
};

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

exports.resolveDir = function resolveDir (...args) {
  return path.dirname(exports.resolve(...args));
};

exports.relative = function relative (fpath) {
  return path.relative(ROOT, fpath);
};

exports.ROOT = ROOT;
