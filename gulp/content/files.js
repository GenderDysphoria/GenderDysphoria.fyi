const path = require('path');
const glob = require('../lib/glob');
const memoize = require('memoizepromise');
const getDimensions = require('../lib/dimensions');
const { keyBy } = require('lodash');

const RESOLUTIONS = [ 2048, 1024, 768, 576, 300, 100 ];

module.exports = exports = function () {
  return memoize(async (cwd, siteDir) => {
    const imageFiles = (await glob('{*,_images/*}.{jpeg,jpg,png,gif,mp4}', { cwd }));

    const images = (await Promise.all(imageFiles.map(async (imgpath) => {

      const ext = path.extname(imgpath);
      let basename = path.basename(imgpath, ext);

      if (basename === 'titlecard') return;

      if (ext === '.mp4') {
        return {
          name: basename,
          type: 'movie',
          full: path.join(siteDir, `${basename}${ext}`),
        };
      }

      const dimensions = await getDimensions(path.resolve(cwd, imgpath));
      const { width, height } = dimensions;
      dimensions.ratioH = Math.round((height / width) * 100);
      dimensions.ratioW = Math.round((width / height) * 100);
      if (dimensions.ratioH > 100) {
        dimensions.orientation = 'tall';
      } else if (dimensions.ratioH === 100) {
        dimensions.orientation = 'square';
      } else {
        dimensions.orientation = 'wide';
      }

      const filetype = {
        '.jpeg': 'jpeg',
        '.jpg':  'jpeg',
        '.png':  'png',
        '.gif':  'gif',
      }[ext];

      if (basename[0] === '_') {
        basename = basename.slice(1);
        return {
          name: basename,
          type: 'image',
          sizes: [
            {
              url: path.join(siteDir, `${basename}${ext}`),
              width: dimensions.width,
              height: dimensions.height,
            },
          ],
        };
      }

      const sizes = [
        {
          url: path.join(siteDir, `${basename}.${filetype}`),
          width: dimensions.width,
          height: dimensions.height,
        },
      ];

      for (const w of RESOLUTIONS) {
        if (w > dimensions.width) continue;
        sizes.push({
          url: path.join(siteDir, `${basename}.${w}w.${filetype}`),
          width: w,
          height: Math.ceil((w / dimensions.width) * dimensions.height),
        });
      }

      sizes.reverse();

      return {
        name: basename,
        type: 'image',
        sizes,
      };
    }))).filter(Boolean);

    const titlecard = (await glob('titlecard.{jpeg,jpg,png,gif}', { cwd }))[0];

    return {
      images: keyBy(images, 'name'),
      titlecard: titlecard ? path.join(siteDir, titlecard) : '/images/titlecard.png',
    };
  });
};
