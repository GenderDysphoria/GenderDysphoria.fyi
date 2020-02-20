const through = require('./through');
const sortBy = require('lodash/sortBy');

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = exports = function (iteratees) {
  var files = [];

  return through(
    async (stream, file) => {
      if (file.isNull()) return;

      files.push(file);
    },
    async (stream) => {
      const queue = sortBy(files, iteratees);
      files = null;

      for (const file of queue) {
        stream.push(file);
        await sleep(100);
      }
    }
  );
};
