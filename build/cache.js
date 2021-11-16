const path = require('path');
const Promise = require('bluebird');
const fs = require('fs-extra');
const { memoize: memoizeSync } = require('lodash');
const memoizeAsync = require('memoizepromise');
const { resolve, readFile } = require('./resolve');
const { hasOwn, isFunction } = require('./lib/util');
const revHash = require('rev-hash');
const revPath = require('rev-path');

const CACHE = 'if-cache';
const MANIFEST = 'if-cache.json';
const REV_MANIFEST = 'rev-manifest.json';

module.exports = exports = class Manifest {

  constructor ({ time = true, inputRev = true, prod = false, writeCount = 100, writeInterval = 10000 }) {
    this.compareBy = { time, inputRev };
    this.manifest = {};
    this.rev = memoizeSync(revHash);
    this.stat = memoizeAsync((f) =>
      fs.stat(resolve(f))
        .catch(() => null)
        .then((stats) => (stats && Math.floor(stats.mtimeMs / 1000))),
    );
    this.revFile = memoizeAsync((f) =>
      readFile(f)
        .then(revHash)
        .catch(() => null),
    );

    this.isProd = prod;
    this.writeCounter = 0;
    this.lastWriteTime = 0;
    this.writeCountThreshold = writeCount;
    this.writeTimeThreshold = writeInterval;
    this.revManifest = {};
  }

  async load () {
    const [ manifest ] = await Promise.all([
      fs.readJson(resolve(MANIFEST)).catch(() => ({})),
      fs.ensureDir(resolve(CACHE)),
    ]);

    this.manifest = manifest;
  }

  hash ({ action, input, output, ...task }) {
    if (!isFunction(action)) {
      console.error({ action, input, output }); // eslint-disable-line
      throw new Error('Task action is not a task action (function).');
    }

    const name = action.name;
    const hash = [
      name,
      this.rev(input),
      this.rev(output),
    ];

    // if this is an image operation, include the format and width in the hash
    if (name === 'image') hash.splice(1, 0, task.width, task.format);

    return hash.filter(Boolean).join('.');
  }

  has (task) {
    const hash = this.hash(task);
    return hasOwn(this.manifest, hash);
  }

  async get (task) {
    if (task === undefined || task === null) {
      console.error(task);
      throw new Error('Task action is undefined or null.');
      return;
    }
    if (task.input === undefined || task.input === null) {
      console.error(task);
      throw new Error('Task action is missing input. (tip: remove `twitter-cache.json` and run `gulp` again)');
      return;
    }

    const hash = this.hash(task);
    const { input, output, cache: altCachePath } = task;
    const ext = path.extname(task.output);
    const local = !task.input.includes('://');
    var cached = path.join(CACHE, hash + ext);
    const result = {
      iTime: 0,
      iRev: null,
      oRev: null,
      ...this.manifest[hash],
      hash,
      action: task.action.name,
      input,
      output,
      duplicate: altCachePath,
      mode: 'new',
    };

    var acTime;
    if (altCachePath) {
      acTime = await this.stat(altCachePath);
    }

    const [ iTime, oTime, cTime, iRev ] = await Promise.all([
      local && this.stat(input),
      this.stat(output),
      this.stat(cached),
      local && this.compareBy.inputRev && this.revFile(input),
    ]);

    if (task.nocache) {
      result.iRev = iRev;
      result.mode = 'silent';
      return result;
    }

    if (local && !iTime) throw new Error('Input file does not exist: ' + input);

    if (!local && !cTime) {
      // This is a remote file and we don't have a cached copy, run it
      return result;
    } else if (local && !result.iTime) {
      // we've never seen this file before, build new
      return result;
    }

    result.outputExists = !!oTime;

    if (oTime) {
      // output exists, we can move on
      result.mode = 'skip';
      return result;
    }

    if (local && this.compareBy.time && iTime > result.iTime) {
      result.inputDiffers = true;
      result.iRev = iRev;
      result.mode = 'update';
      result.why = 'input-time';
      return result;
    }

    if (local && this.compareBy.inputRev && iRev !== result.iRev) {
      // either we aren't checking time, or the time has changed
      // check if the contents changed

      result.inputDiffers = true;
      result.iRev = iRev;
      result.mode = 'update';
      result.why = 'input-rev';
      return result;
    }

    if (!cTime || cTime < iTime) {
      // output does not exist in the cache or the cached file predates input, we need to remake.
      result.inputDiffers = true;
      result.oRev = null;
      result.mode = 'rebuild';
      result.why = 'cache-missing';
      return result;
    }

    result.mode = 'cached';

    if (acTime && acTime > cTime) {
      result.cache = await readFile(altCachePath);
    } else {
      result.cache = await readFile(cached);
      if (altCachePath && !acTime) {
        await fs.ensureDir(resolve(path.dirname(altCachePath)));
        await fs.writeFile(resolve(altCachePath), result.cache);
      }
    }

    return result;
  }

  async touch (task, lastSeen = new Date()) {

    if (task.nocache || !task.action.name) return null;

    const hash = this.hash(task);
    const { input, output, cache: altCachePath } = task;
    const local = !task.input.includes('://');

    const [ iTime, iRev ] = await Promise.all([
      local && this.stat(input),
      local && this.compareBy.inputRev && this.revFile(input),
    ]);

    const record = {
      ...this.manifest[hash],
      action: task.action.name,
      hash,
      input,
      iTime,
      iRev,
      output,
      oTime: Math.floor(lastSeen / 1000),
      lastSeen,
      duplicate: altCachePath,
    };

    if (record.revPath) this.revManifest[output] = record.revPath;
    this.manifest[hash] = record;
    await this.writeManifest();
    return { ...record };
  }

  async set (task, result, lastSeen = new Date()) {
    const hash = this.hash(task);
    const { input, output, cache: altCachePath } = task;
    const nocache = task.nocache || task.action.name === 'copy';
    const ext = path.extname(task.output);
    const local = !task.input.includes('://');
    const cached = path.join(CACHE, hash + ext);
    const oRev = revHash(result);

    if (result && altCachePath) {
      await fs.ensureDir(resolve(path.dirname(altCachePath)));
    }

    const [ iTime, iRev ] = await Promise.all([
      local && this.stat(input),
      local && this.compareBy.inputRev && this.revFile(input),
      result && !nocache && fs.writeFile(resolve(cached), result),
      result && altCachePath && fs.writeFile(resolve(altCachePath), result),
    ]);

    const record = {
      action: task.action.name,
      hash,
      input,
      iTime,
      iRev,
      output,
      oTime: Math.floor(lastSeen / 1000),
      oRev,
      lastSeen,
      duplicate: altCachePath,
      revPath: revPath(output, oRev),
    };

    this.revManifest[output] = record.revPath;
    if (!nocache) {
      this.manifest[hash] = record;
      await this.writeManifest();
    }
    return { ...record };
  }


  async writeManifest (force) {
    if (!force && this.isProd) return; // disable interim writes during prod builds.
    if (!force && ++this.writeCounter % this.writeCountThreshold) return;
    const now = Date.now();
    if (!force && now - this.lastWriteTime < this.writeTimeThreshold) return;
    this.lastWriteTime = now;
    await fs.writeFile(resolve(MANIFEST), JSON.stringify(this.manifest, null, 2));
  }


  async save () {
    const revManifest = this.isProd && await fs.readJson(resolve(REV_MANIFEST))
      .catch(() => ({}))
      .then((old) => ({ ...old, ...this.revManifest }));

    await Promise.all([
      revManifest && fs.writeFile(resolve(REV_MANIFEST), JSON.stringify(revManifest, null, 2)),
      this.writeManifest(true),
    ]);

    return { revManifest: revManifest || {}, manifest: this.manifest };
  }

};
