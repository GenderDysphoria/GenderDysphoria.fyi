const slugs = require('slugify');

module.exports = exports = function slugify (s) {
  return slugs(s, { remove: /[*+~.,()'"!?:@/\\]/g }).toLowerCase();
};
