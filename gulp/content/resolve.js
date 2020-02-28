
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const fs = require('fs-extra');
const { is: _is, re } = require('../lib/util');

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
} = EXT;

exports.RE = {
  JPG:  re(/.jpg$/),
  JPEG: re(/.jpeg$/),
  PNG:  re(/.png$/),
  GIF:  re(/.gif$/),
  MP4:  re(/.mp4$/),
  M4V:  re(/.m4v$/),
  MD:   re(/.md$/),
  HBS:  re(/.hbs$/),
  HTML: re(/.html$/),
  XML:  re(/.xml$/),
};

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
exports.isCleanUrl = is(HBS, HTML, MD);



const TYPE = exports.TYPE = {
  IMAGE:      'IMAGE',
  VIDEO:      'VIDEO',
  HANDLEBARS: 'HANDLEBARS',
  MARKDOWN:   'MARKDOWN',
  OTHER:      'OTHER',
};

exports.type = dictMatch({
  [TYPE.IMAGE]:      isImage,
  [TYPE.HANDLEBARS]: isHandlebars,
  [TYPE.MARKDOWN]:   isMarkdown,
  [TYPE.VIDEO]:      isVideo,
}, TYPE.OTHER);



const KIND = exports.KIND = {
  PAGE:  'PAGE',
  ASSET: 'ASSET',
  OTHER: 'OTHER',
};

exports.kind = dictMatch({
  [KIND.ASSET]: isAsset,
  [KIND.PAGE]:  isPage,
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
    throw new Error(err.trace);
  });
};

exports.resolve = function resolve (...args) {
  args = args.filter(Boolean);
  let fpath = args.shift();
  if (!fpath) return ROOT;
  if (fpath[0] === '/') throw new Error('Did you mean to resolve this? ' + fpath);
  // if (fpath[0] === '/') fpath = fpath.slice(1);
  return path.resolve(ROOT, fpath, ...args);
};

exports.relative = function relative (fpath) {
  return path.relative(ROOT, fpath);
};

exports.ROOT = ROOT;
