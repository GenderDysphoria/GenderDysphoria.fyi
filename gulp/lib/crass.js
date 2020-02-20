
const through = require('./through');
const crass = require('crass');
const PluginError = require('plugin-error');

module.exports = exports = function (options) {
  options = {
    pretty: false,
    o1: true,
    ...options,
  };

  return through(async (stream, file) => {
    if (file.isNull()) {
      stream.push(file);
      return;
    }

    try {
      var parsed = crass.parse(file.contents.toString());
      parsed = parsed.optimize({ O1: !!options.o1 });
      if (options.pretty) parsed = parsed.pretty();

      file.contents = Buffer.from(parsed.toString());
    } catch (err) {
      this.emit('error', new PluginError('gulp-crass', err));
    }

    stream.push(file);
  });
};
