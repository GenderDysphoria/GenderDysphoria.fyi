/**
 *
 * @twipped/utils
 *
 * Copyright (c) 2020, Jocelyn Badgley
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var fs = require('fs');
var stream = require('stream');
var util = require('util');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var stream__default = /* #__PURE__*/_interopDefaultLegacy(stream);

const pipeline = util.promisify(stream__default.default.pipeline);
const mkdir = (f, recursive = true) => fs.promises.mkdir(f, {
  recursive,
});
const exists = (f) => fs.promises.access(f).then(() => true, () => false);
const stat = (f) => fs.promises.stat(f).catch(() => null);
const linkStat = (f) => fs.promises.lstat(f).catch(() => null);
async function isWritable (file) {
  try {
    await fs.promises.access(file, fs.constants.F_OK | fs.constants.W_OK);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return await fs.promises.access(path.dirname(file), fs.constants.F_OK | fs.constants.W_OK).then(() => true, () => false);
    }

    return false;
  }
}
async function touch (file) {
  const stats = await linkStat(file);

  if (stats) {
    if (stats.isDirectory()) return; // nothing to do

    return await fs.promises.utimes(file, new Date(), new Date());
  }

  if (!(await exists(path.dirname(file)))) await mkdir(path.dirname(file));
  await fs.promises.writeFile(file, '');
}
async function remove (file) {
  const stats = await linkStat(file);
  if (!stats) return;
  if (stats.isDirectory()) {
    return fs.promises.rmdir(file, {
      recursive: true,
    });
  }
  return fs.promises.unlink(file);
}
async function writeJson (file, object, options) {
  const {
    replacer,
    spaces,
    ...ops
  } = {
    encoding: 'utf8',
    ...options,
  };
  await fs.promises.writeFile(file, `${JSON.stringify(object, replacer, spaces)}\n`, ops);
}
const writeJSON = writeJson;
async function readJson (file, options) {
  const {
    reviver,
    quiet,
    ...ops
  } = {
    encoding: 'utf8',
    ...options,
  };
  const content = await fs.promises.readFile(file, ops);

  try {
    return JSON.parse(stripBom(content), reviver);
  } catch (err) {
    if (!quiet) throw err;
    return undefined;
  }
}
const readJSON = readJson;

function stripBom (content) {
  if (Buffer.isBuffer(content)) {
    content = content.toString('utf8');
  }

  return content.replace(/^\uFEFF/, '');
}

exports.exists = exists;
exports.isWritable = isWritable;
exports.linkStat = linkStat;
exports.mkdir = mkdir;
exports.pipeline = pipeline;
exports.readJSON = readJSON;
exports.readJson = readJson;
exports.remove = remove;
exports.stat = stat;
exports.touch = touch;
exports.writeJSON = writeJSON;
exports.writeJson = writeJson;
