
const path = require('path');
const { pick } = require('lodash');
const actions = require('./actions');
const File = require('./file');
const { TYPE } = require('./resolve');
const getImageDimensions = require('./lib/dimensions');
const getVideoDimensions = require('get-video-dimensions');

const WIDTHS = [ 2048, 1024, 768, 576, 300, 100 ];

module.exports = exports = class Asset extends File {

  constructor (filepath) {
    super(filepath);

    this.serializable.push(
      'dimensions',
      'sizes'
    );
  }

  load () {
    switch (this.type) {
    case TYPE.VIDEO: return this.loadVideo();
    case TYPE.IMAGE: return this.loadImage();
    default:
      return this.loadOther();
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

    this.sizes = [ {
      url: this.url,
      width,
      height,
    } ];

    if (this.preprocessed || this.ext === '.svg') {
      this._tasks = [ {
        output: this.out,
        input: this.input,
        action: actions.copy,
        nocache: true,
      } ];
      return;
    }

    this._tasks = [
      {
        output: this.out,
        input: this.input,
        width,
        height,
        format: 'jpeg',
        action: actions.image,
      },
    ];

    for (const w of WIDTHS) {
      if (w > width) continue;
      const name = `${this.name}.${w}w${this.ext}`;
      this.sizes.push({
        url:    path.join(this.dir,  name),
        width:  w,
        height: Math.ceil((w / width) * height),
      });
      this._tasks.push({
        output: path.join(this.base, name),
        input: this.input,
        width: w,
        format: 'jpeg',
        fill: 'contain',
        quality: 85,
        action: actions.image,
      });
    }

    this.sizes.reverse();

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
      url:    path.join(this.dir,  this.basename),
      width,
      height,
    } ];

    this._tasks = [
      {
        output: this.out,
        input: this.input,
        action: actions.copy,
        nocache: true,
      },
    ];

    return this;
  }

  get webready () {
    const { type, name, url, sizes } = this;
    return {
      type,
      name,
      url,
      sizes: sizes.map((s) => pick(s, [ 'url', 'width', 'height' ])),
    };
  }

  tasks () {
    return this._tasks;
  }

};
