
const through = require('./through');
const log = require('fancy-log');
const { get } = require('lodash');

module.exports = exports = function debug (...targets) {
  return through(async (stream, file) => {
    var data;
    const { path, relative, base, basename, extname } = file;

    if (targets.length === 1 && Array.isArray(targets[0])) {
      targets = targets[0];
    }

    if (targets.length) {
      data = targets.reduce((result, target) => {
        if (target === 'contents') {
          result.contents = file.contents.toString();
          return result;
        }

        result[target] = get(file, target);
        return result;
      }, {});
    } else {
      data = { ...file, path, relative, base, basename, extname };
    }
    log(data);
    stream.push(file);
  });
};

