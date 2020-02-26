
const { pick } = require('lodash');
const actions = require('./actions');

const path = require('path');
const getImageDimensions = require('../lib/dimensions');
const getVideoDimensions = require('get-video-dimensions');

const JPG  = '.jpg';
const JPEG = '.jpeg';
const PNG  = '.png';
const GIF  = '.gif';
const MP4  = '.mp4';
const M4V  = '.m4v';

const FILETYPE = {
  [JPG]:  'jpeg',
  [JPEG]: 'jpeg',
  [PNG]:  'png',
  [GIF]:  'gif',
  [MP4]:  'mp4',
  [M4V]:  'mp4',
};

const RESOLUTIONS = [ 2048, 1024, 768, 576, 300, 100 ];

module.exports = exports = class Asset {

  constructor (filepath) {
    const file = path.parse(filepath);
    let { base: basename, name } = file;

    this.preprocessed = false;
    if (name[0] === '_') {
      this.preprocessed = true;
      file.name = name = name.slice(1);
      file.basename = basename = basename.slice(1);
    }

    this.type = FILETYPE[file.ext] || file.ext.slice(1);
    if ([ JPG, JPEG, PNG, GIF ].includes(file.ext)) {
      this.kind = 'image';
    } else if ([ MP4, M4V ].includes(file.ext)) {
      this.kind = 'video';
    } else {
      this.kind = 'raw';
    }

    // remove the pages root and any _images segment from the dir
    const dir = file.dir.split('/');
    if (dir[0] === 'pages') dir.shift();
    const i = dir.indexOf('_images');
    if (i > -1) dir.splice(i, 1);

    this.input    = filepath;                    // pages/file.ext
    this.base     = path.join(...dir);           // '', 'folder', 'folder/subfolder'
    this.dir      = path.join('/', ...dir);      // /, /folder, /folder/subfolder
    this.name     = name;                        // index, fileA, fileB
    this.basename = basename;                    // index.ext, fileA.ext, fileB.ext
    this.ext      = file.ext;

    this.out = path.join(this.base, `${this.name}${this.preprocessed ? this.ext : '.' + this.type}`);
    this.url = path.join(this.dir,  `${this.name}${this.preprocessed ? this.ext : '.' + this.type}`);
  }

  load () {
    switch (this.kind) {
    case 'video': return this.loadVideo();
    case 'image': return this.loadImage();
    default:
    }
  }

  async loadImage () {

    const { width, height } = await getImageDimensions(this.input);

    const ratioH = Math.round((height / width) * 100);
    const ratioW = Math.round((width / height) * 100);
    let orientation = 'wide';
    if (ratioH > 100) {
      orientation = 'tall';
    } else if (ratioH === 100) {
      orientation = 'square';
    }

    this.dimensions = {
      width,
      height,
      ratioH,
      ratioW,
      orientation,
    };

    if (this.preprocessed) {
      this.sizes = [ {
        output: this.out,
        url: this.url,
        width,
        height,
      } ];
    } else {
      this.sizes = [
        {
          output: this.out,
          url: this.url,
          width,
          height,
        },
      ];

      for (const w of RESOLUTIONS) {
        if (w > width) continue;
        const name = `${this.name}.${w}w.${this.type}`;
        this.sizes.push({
          output: path.join(this.base, name),
          url:    path.join(this.dir,  name),
          width: w,
          height: Math.ceil((w / width) * height),
        });
      }

      this.sizes.reverse();
    }

    return this;
  }

  async loadVideo () {
    const { width, height } = await getVideoDimensions(this.input);

    const ratioH = Math.round((height / width) * 100);
    const ratioW = Math.round((width / height) * 100);
    let orientation = 'wide';
    if (ratioH > 100) {
      orientation = 'tall';
    } else if (ratioH === 100) {
      orientation = 'square';
    }

    this.dimensions = {
      width,
      height,
      ratioH,
      ratioW,
      orientation,
    };

    this.sizes = [ {
      output: path.join(this.base, this.basename),
      url:    path.join(this.dir,  this.basename),
      width,
      height,
    } ];

    return this;
  }

  toJson () {
    return pick(this, [
      'preprocessed',
      'type',
      'kind',
      'input',
      'base',
      'dir',
      'name',
      'basename',
      'ext',
      'dimensions',
    ]);
  }

  webready () {
    const { kind, name } = this;
    return {
      kind,
      name,
      sizes: this.sizes.map((s) => pick(s, [ 'url', 'width', 'height' ])),
    };
  }

  tasks () {
    return this.sizes.map(({ output, width }) => ({
      input: this.input,
      output,
      format: this.preprocessed ? undefined : this.type,
      width:  this.preprocessed ? undefined : width,
      action: this.preprocessed ? actions.copy : actions.image,
    }));
  }

};

exports.JPG         = JPG;
exports.JPEG        = JPEG;
exports.PNG         = PNG;
exports.GIF         = GIF;
exports.MP4         = MP4;
exports.M4V         = M4V;
exports.FILETYPE    = FILETYPE;
exports.RESOLUTIONS = RESOLUTIONS;
