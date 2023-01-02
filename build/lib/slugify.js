module.exports = exports = function slugify (s) {
  const result = s.trim().replace(/[^\p{L}\p{N}]+/ug, '-').replace(/^-+/, '').replace(/-+$/, '').toLowerCase();
  return result;
};
