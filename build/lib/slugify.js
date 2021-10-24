const slugs = require('slugify');

module.exports = exports = function slugify (s) {
  const result = slugs(s, { remove: /[*+~.,()'"!?:@/\\]/g }).toLowerCase();
  return result;
};
