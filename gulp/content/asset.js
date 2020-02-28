
const path = require('path');
const { pick } = require('lodash');
const actions = require('./actions');
const File = require('./file');
const { TYPE } = require('./resolve');
const getImageDimensions = require('./lib/dimensions');
const getVideoDimensions = require('get-video-dimensions');

const RESOLUTIONS = [ 2048, 1024, 768, 576, 300, 100 ];

module.exports = exports = class Asset extends File {

  constructor (filepath) {
    super(filepath);

    this.serializable.push(
      'dimensions',
      'sizes',
    );
  }

  load () {
    switch (this.type) {
    case TYPE.VIDEO: return this.loadVideo();
    case TYPE.IMAGE: return this.loadImage();
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
        const name = `${this.name}.${w}w${this.ext}`;
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

  webready () {
    const { type, name, sizes } = this;
    return {
      type,
      name,
      sizes: sizes.map((s) => pick(s, [ 'url', 'width', 'height' ])),
    };
  }

  tasks () {
    return this.sizes.map(({ output, width }) => ({
      input: this.input,
      output,
      format: this.preprocessed ? undefined : this.ext.slice(1),
      width:  this.preprocessed ? undefined : width,
      action: this.preprocessed ? actions.copy : actions.image,
    }));
  }

};
