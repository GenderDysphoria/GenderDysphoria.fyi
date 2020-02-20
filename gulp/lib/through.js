
const log = require('fancy-log');
var through = require('through2');

module.exports = exports = function asyncthrough (...args) {
  const [ fn, donefn ] = args;

  args[0] = function (file, enc, next) {
    fn(this, file, enc).then(() => next(), (err) => { log.error(err, 'Error thrown'); next(err); });
  };

  if (donefn) {
    args[1] = function (next) {
      donefn(this).then(() => next(), (err) => { log.error(err, 'Error thrown'); next(err); });
    };
  }

  return through.obj(...args);
};
