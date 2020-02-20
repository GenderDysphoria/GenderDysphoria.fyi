
const through = require('./through');
const fs = require('fs-extra');
const log = require('fancy-log');
const parallelize = require('concurrent-transform');

module.exports = exports = function load () {
  return parallelize(through(async (stream, file) => {

    if (file.contents) {
      // file already has contents, ignore
      stream.push(file);
      return;
    }

    const exists = await fs.pathExists(file.path);
    // if (!exists) return;

    log('[loading]', file.path, exists);

    file.contents = await fs.readFile(file.path);

    stream.push(file);
  }), 20);
};

