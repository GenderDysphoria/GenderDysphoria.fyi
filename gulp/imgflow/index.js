const path = require('path');
const { uniqBy } = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const actions = require('./actions');
const createAssetLoader = require('../content/files');


const ROOT = path.resolve(__dirname, '../..');
const CACHE = 'if-cache';

const { changed, execute } = require('./pipeline');

function resolve (...args) {
  args = args.filter(Boolean);
  let fpath = args.shift();
  if (!fpath) return ROOT;
  if (fpath[0] === '/') fpath = fpath.slice(1);
  return path.resolve(ROOT, fpath, ...args);
}

module.exports = exports = async function postImages ({ rev = false }) {

  const [ manifest, { tasks } ] = await Promise.all([
    fs.readJson(resolve('if-manifest.json')).catch(() => ({})),
    createAssetLoader(),
    fs.ensureDir(resolve(CACHE)),
  ]);

  const filtered = await changed(manifest, tasks);
  await execute(manifest, filtered, rev);
};

exports.prod = function imagesProd () { return exports({ rev: true }); };

exports.twitter = async function twitterImages ({ rev = false }) {
  const [ manifest, media ] = await Promise.all([
    fs.readJson(resolve('if-manifest.json')).catch(() => ({})),
    fs.readJson(resolve('twitter-media.json')).catch(() => ([])),
    fs.ensureDir(resolve(CACHE)),
  ]);

  const tasks = uniqBy(media, 'output').map((m) => ({ ...m, action: actions.fetch }));
  const filtered = await changed(manifest, tasks);
  await execute(manifest, filtered, rev);
};

exports.twitter.prod = function imagesProd () { return exports.twitter({ rev: true }); };


exports.favicon = async function favicon ({ rev = false }) {
  const input = resolve('favicon.png');
  const [ manifest ] = await Promise.all([
    fs.readJson(resolve('if-manifest.json')).catch(() => ({})),
    fs.ensureDir(resolve(CACHE)),
  ]);

  const tasks = [ 32, 57, 64, 76, 96, 114, 120, 128, 144, 152, 180, 192, 196, 228 ].map((width) => ({
    input,
    output: `favicon${width}.png`,
    format: 'png',
    width,
    action: actions.image,
  }));

  tasks.push({
    input,
    output: 'favicon.ico',
    format: 'ico',
    action: actions.image,
  });

  const filtered = await changed(manifest, tasks);
  await execute(manifest, filtered, rev);
};

exports.favicon.prod = function imagesProd () { return exports.favicon({ rev: true }); };

