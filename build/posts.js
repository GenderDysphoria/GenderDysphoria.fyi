const glob = require('./lib/glob');
const { ROOT, KIND } = require('./resolve');
const File = require('./file');
const Asset = require('./post-asset');
const Post = require('./post');
const Files = require('./files');

class PostFiles extends Files {
  _kindMap () {
    return {
      [KIND.PAGE]:  Post,
      [KIND.ASSET]: Asset,
      [KIND.OTHER]: File,
    };
  }
}

module.exports = exports = async function loadPublicFiles () {
  return new PostFiles(await glob('posts/**/*', { cwd: ROOT, nodir: true }));
};

