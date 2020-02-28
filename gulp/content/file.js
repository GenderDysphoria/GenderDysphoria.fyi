
const path = require('path');
const { pick } = require('lodash');
const {
  normalizedExt,
  kind,
  type,
} = require('./resolve');
const actions = require('./actions');


module.exports = exports = class File {

  constructor (filepath) {
    if (filepath && typeof filepath === 'object') {
      // we've been passed a json object, treat as serialized Page
      Object.assign(this, filepath);
      return this;
    }

    const file = path.parse(filepath);
    let { base: basename, name } = file;

    this.preprocessed = false;
    if (name[0] === '_') {
      this.preprocessed = true;
      file.name = name = name.slice(1);
      file.basename = basename = basename.slice(1);
    }

    // remove the public root and any _images segment from the dir
    const dir = this._dir(file.dir);

    this.kind     = kind(filepath);
    this.type     = type(filepath);
    this.cwd      = file.dir;
    this.ext      = this.preprocessed ? file.ext : normalizedExt(file.ext);
    this.input    = filepath;                    // public/file.ext
    this.base     = path.join(...dir);           // '', 'folder', 'folder/subfolder'
    this.dir      = path.join('/', ...dir);      // /, /folder, /folder/subfolder
    this.name     = name;                        // index, fileA, fileB
    this.basename = basename;                    // index.ext, fileA.ext, fileB.ext
    this.ext      = file.ext;

    this.out = path.join(this.base, `${this.name}${this.ext}`);
    this.url = path.join(this.dir,  `${this.name}${this.ext}`);

    this.serializable = [
      'kind',
      'type',
      'cwd',
      'ext',
      'input',
      'base',
      'dir',
      'name',
      'basename',
      'ext',
      'out',
      'url',
    ];
  }

  _dir (dir) {
    dir = dir.split('/');
    if (dir[0] === 'public') dir.shift();
    const i = dir.indexOf('_images');
    if (i > -1) dir.splice(i, 1);
    return dir;
  }

  load () {}

  tasks () {
    return [ {
      input: this.input,
      output: this.out,
      action: actions.copy,
      nocache: true,
    } ];
  }

  toJson () {
    return pick(this, this.serializable);
  }

};
