const glob = require('./lib/glob');
const { ROOT, KIND } = require('./resolve');
const { without } = require('lodash');
const Asset = require('./asset');
const Post = require('./post');
const Files = require('./files');

class PostFiles extends Files {
  _kindMap () {
    return {
      [KIND.PAGE]:  Post,
      [KIND.ASSET]: PostAsset,
    };
  }
}

module.exports = exports = async function loadPublicFiles () {
  return new PostFiles(await glob('posts/**/*', { cwd: ROOT, nodir: true }));
};

const POSTMATCH = /(\d{4}-\d\d-\d\d)\.\d{4}\.(\w+)/;

class PostAsset extends Asset {

  _dir (dir) {
    dir = dir.replace(POSTMATCH, '$2').split('/');
    dir = without(dir, 'posts', '_images');
    dir.unshift('p');
    return dir;
  }

}
