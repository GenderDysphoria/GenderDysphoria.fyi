
var { promisify } = require('util');
var { extname } = require('path');
var svgDim = promisify(require('svg-dimensions').get);
var imgDim = promisify(require('image-size'));

module.exports = exports = async (fpath) => {
  if (extname(fpath) === '.svg') return svgDim(fpath);
  return imgDim(fpath);
};
