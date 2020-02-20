const path = require('path');
const fs = require('fs-extra');
const gm = require('gm');
const Promise = require('bluebird');
const fetch = require('make-fetch-happen');
const ico = require('png-to-ico');

const CWD = path.resolve(__dirname, '../..');

const actions = {
  async copy ({ input, output }) {
    await fs.copy(input, output);
    return fs.readFile(input);
  },

  async transcode ({ input, output, cache }) {
    const result = await actions.image({
      input,
      output,
      format: 'jpeg',
    });
    await fs.writeFile(cache, result);
    return result;
  },

  async fetch ({ input, output, cache }) {
    const res = await fetch(input);
    const body = await res.buffer();
    await fs.writeFile(output, body);
    await fs.writeFile(cache, body);
    return body;
  },

  async image (options) {
    const input = path.resolve(CWD, options.input);
    const output = path.resolve(CWD, options.output);
    const contents = await fs.readFile(input);
    let gmfile = gm(contents, input);

    const size = await Promise.fromCallback((cb) => gmfile.size(cb));

    if (options.height || options.width) {

      // if upscale is not requested, restrict size
      if (!options.upscale) {
        if (!isNaN(options.width)) {
          options.width  = Math.min(options.width, size.width);
        }
        if (!isNaN(options.height)) {
          options.height = Math.min(options.height, size.height);
        }
      }

      // if one dimension is not set - we fill it proportionally
      if (!options.height) {
        if (options.crop) {
          options.height = size.height;
        } else {
          options.height = Math.ceil((options.width / size.width) * size.height);
        }
      }
      if (!options.width) {
        if (options.crop) {
          options.width = size.width;
        } else {
          options.width = Math.ceil((options.height / size.height) * size.width);
        }
      }

      if (options.fill === 'crop') {
        if (size.height < options.height || size.width < options.width) {
          gmfile = gmfile
            .geometry(options.width, options.height, '^')
            .borderColor(options.bgColor || '#FFFFFF')
            .border(options.width, options.height)
            .gravity(options.gravity)
            .crop(options.width, options.height);
        } else {
          gmfile = gmfile
            .geometry(options.width, options.height, '^')
            .gravity(options.gravity)
            .crop(options.width, options.height);
        }
      } else if (options.fill === 'cover') {
        gmfile = gmfile
          .geometry(options.width, options.height, '^');
      } else if (options.fill === 'box') {
        gmfile = gmfile
          .geometry(options.width, options.height)
          .borderColor(options.bgColor || '#FFFFFF')
          .border(options.width, options.height)
          .gravity(options.gravity)
          .crop(options.width, options.height);
      } else if (options.fill === 'contain') {
        gmfile = gmfile
          .geometry(options.width, options.height);
      } else {
        gmfile = gmfile
          .geometry(options.width, options.height, '!');
      }

    } else if (options.percentage) {
      gmfile = gmfile
        .geometry(options.percentage, null, '%');
    }

    if (options.format) {
      gmfile = gmfile
        .setFormat(options.format === 'ico' ? 'png' : options.format);
    }

    if (options.quality) {
      gmfile = gmfile.quality(Math.floor(options.quality));
    } else {
      gmfile = gmfile.quality(Math.floor(95));
    }


    if (options.samplingFactor) {
      gmfile = gmfile
        .samplingFactor(options.samplingFactor[0], options.samplingFactor[1]);
    }

    if (options.sharpen) {
      options.sharpen = (typeof options.sharpen === 'string') ?  options.sharpen : '1.5x1+0.7+0.02';
      gmfile = gmfile.unsharp(options.sharpen);
    }

    if (options.flatten) {
      gmfile = gmfile.flatten();
    }

    if (options.interlace) {
      gmfile = gmfile.interlace('Line');
    }

    if (options.background) {
      gmfile = gmfile.background(options.background);
    }

    if (options.noProfile) {
      gmfile = gmfile.noProfile();
    }

    await fs.ensureDir(path.dirname(output));
    let result = await Promise.fromCallback((cb) => gmfile.toBuffer(cb));
    if (options.format === 'ico') result = await ico(result);
    await fs.writeFile(output, result);
    if (options.cache) await fs.writeFile(options.cache, result);

    return result;
  },
};

module.exports = exports = actions;
