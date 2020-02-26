
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const fs = require('fs-extra');

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
  if (fpath[0] === '/') fpath = fpath.slice(1);
  return path.resolve(ROOT, fpath, ...args);
};

exports.relative = function relative (fpath) {
  return path.relative(ROOT, fpath);
};

exports.ROOT = ROOT;
