
const filter = require('gulp-filter');

module.exports = exports = function filter2 (pattern, options) {
  if (pattern instanceof RegExp) {
    return filter((file) => pattern.test(file.path), options);
  }

  return filter(pattern, options);
};

exports.not = function notfilter2 (pattern, options) {
  if (pattern instanceof RegExp) {
    return filter((file) => !pattern.test(file.path), options);
  }

  throw new Error('filter.not only takes regular expressions');
};
