const glob = require('./lib/glob');
const { ROOT } = require('./resolve');

const Files = require('./files');

module.exports = exports = async function loadPublicFiles () {
  return new Files(await glob('public/**/*', { cwd: ROOT, nodir: true }));
};
