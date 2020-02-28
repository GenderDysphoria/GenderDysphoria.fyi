'use strict';

var crypto = require('crypto');
var uuid = require('uuid').v4;

// based on code from http://stackoverflow.com/a/25690754/110189
function randomString (length, chars) {
  if (!chars) {
    throw new Error('Argument \'chars\' is undefined');
  }

  var charsLength = chars.length;
  if (charsLength > 256) {
    throw new Error('Length must be less than 256 characters');
  }

  var randomBytes = crypto.randomBytes(length);

  var result = new Array(length);

  var cursor = 0;
  for (var i = 0; i < length; i++) {
    cursor += randomBytes[i];
    result[i] = chars[cursor % charsLength];
  }

  return result.join('');
}

module.exports = exports = function (min, max) {
  if (Array.isArray(min)) return exports.from(min);
  if (typeof max === 'undefined') {
    if (min > 0) {
      max = min;
      min = 0;
    } else {
      max = 0;
    }
  }
  return Math.floor((Math.random() * (max - min + 1)) + min);
};

exports.alphanumeric = (length) => randomString(length, 'ABCDEFGHIJKLMNOPQRSTUWXYZ0123456789');
exports.alpha = (length) => randomString(length, 'ABCDEFGHIJKLMNOPQRSTUWXYZ');
exports.fromCharSet = randomString;
exports.from = (array) => array[exports(array.length - 1)];
exports.id = (length) => uuid().replace(/-/g, '').substr(0, length);
