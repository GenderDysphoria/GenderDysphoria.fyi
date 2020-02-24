const path = require('path');
const { sortBy } = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const log = require('fancy-log');
const actions = require('./actions');
const revHash = require('rev-hash');
const revPath = require('rev-path');

const CWD = path.resolve(__dirname, '../..');
const PAGES = path.join(CWD, 'pages');
const SOURCE = path.resolve(PAGES, '**/*.{jpeg,jpg,png,gif,mp4}');
const MANIFEST_PATH = path.resolve(CWD, 'if-manifest.json');
const REV_MANIFEST_PATH = path.resolve(CWD, 'rev-manifest.json');
const MEDIA_INDEX = path.resolve(CWD, 'twitter-media.json');
const CACHE = 'if-cache';

const LOG = {
  new:     true,
  update:  true,
  skip:    true,
  rebuild: true,
  cached:  false,
  copy:    false,
};

exports.changed = async function changed (manifest, tasks) {
  const statMap = new Map();
  async function stat (f) {
    if (statMap.has(f)) return statMap.get(f);

    const p = fs.stat(path.resolve(CWD, f))
      .catch(() => null)
      .then((stats) => (stats && Math.floor(stats.mtimeMs / 1000)));

    statMap.set(f, p);
    return p;
  }

  return Promise.filter(tasks, async (task) => {

    const local = task.input.slice(0, 4) !== 'http';
    const hash = task.action.name + '.' + revHash(task.input) + '|' + revHash(task.output);
    const cachePath = path.join(CACHE, `${hash}${path.extname(task.output)}`);
    const [ inTime, outTime, cachedTime ] = await Promise.all([
      local && stat(path.resolve(CWD, task.input)),
      stat(path.resolve(CWD, 'dist', task.output)),
      stat(path.resolve(CWD, cachePath)),
    ]);

    task.manifest = manifest[hash];
    task.hash = hash;
    task.cache = cachePath;

    // how did this happen?
    if (local && !inTime) {
      log.error('Input file could not be found?', task.input);
      return false;
    }

    // never seen this file before
    if (!task.manifest) {
      task.apply = {
        hash,
        input: task.input,
        output: task.output,
        mtime: inTime,
      };
      task.log = [ 'new', task.input, task.output, hash ];
      return true;
    }

    // file modification time does not match last read, rebuild
    if (local && inTime > task.manifest.mtime) {
      task.log = [ 'update', task.input, task.output ];
      task.apply = {
        mtime: inTime,
      };
      return true;
    }

    task.apply = {
      mtime: local ? inTime : Math.floor(Date.now() / 1000),
    };

    // target file exists, nothing to do
    if (outTime) {
      return false;
      // task.log = [ 'skip', task.input, task.output, inTime, task.manifest.mtime ];
      // task.action = null;
      // return true;
    }

    // file exists in the cache, change the task to a copy action
    if (cachedTime) {
      task.log = [ 'cached', task.input, task.output ];
      task.action = actions.copy;
      task.input = cachePath;
      return true;
    }

    // task is a file copy
    if (task.action === actions.copy) {
      task.log = [ 'copy', task.input, task.output ];
      return true;
    }

    // file does not exist in cache, build it
    task.log = [ 'rebuild', task.input, task.output ];
    return true;
  });
};


exports.execute = async function execute (manifest, tasks, rev) {
  const lastSeen = Math.floor(Date.now() / 1000);
  const revManifest = {};

  let writeCounter = 0;
  let lastWriteTime = 0;
  async function writeManifest (force) {
    if (!force && rev) return; // disable interim writes during prod builds.
    if (!force && ++writeCounter % 100) return;
    const now = Date.now();
    if (!force && now - lastWriteTime < 10000) return;
    lastWriteTime = now;
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  }

  await Promise.map(sortBy(tasks, [ 'input', 'output' ]), async (task) => {
    const output = path.resolve(CWD, 'dist', task.output);

    const result = task.action && await task.action({ ...task, output });
    const apply = task.apply || {};
    if (task.log && LOG[task.log[0]]) log.info(...task.log);
    apply.lastSeen = lastSeen;
    apply.lastSeenHuman = new Date();

    if (!result) log('Nothing happened?', task);

    const rhash = result && revHash(result);
    const hashedPath = revPath(task.output, rhash);
    apply.revHash = rhash;
    apply.revPath = hashedPath;

    if (rev && rhash) {
      const rOutPath = task.output;
      const rNewPath = hashedPath;

      revManifest[rOutPath] = rNewPath;

      await fs.copy(output, path.resolve(CWD, 'dist', hashedPath));
    }

    manifest[task.hash] = { ...manifest[task.hash], ...apply };
    await writeManifest();

  }, { concurrency: rev ? 20 : 10 });

  // filter unseen files from history
  // manifest = omitBy(manifest, (m) => m.lastSeen !== lastSeen);

  await writeManifest(true);

  if (rev) {
    let originalManifest = {};
    try {
      if (await fs.exists(REV_MANIFEST_PATH)) {
        originalManifest = JSON.parse(await fs.readFile(REV_MANIFEST_PATH));
      }
    } catch (e) {
      // do nothing
    }

    Object.assign(originalManifest, revManifest);

    await fs.writeFile(REV_MANIFEST_PATH, JSON.stringify(originalManifest, null, 2));
  }
};
