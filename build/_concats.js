const { ROOT } = require('./resolve');
const glob = require('./lib/glob');

module.exports = exports = glob.sync('public/*/_concat.js', { cwd: ROOT, nodir: true });