
const languages = {};

module.exports = exports = function (lang, key, ...args) {
  if (!languages[lang]) {
    languages[lang] = require('../public/' + lang + '/_strings');
  }

  var entry = languages[lang][key];
  if (!entry) entry = languages.en[key];
  if (typeof entry === 'function') return entry(...args);
  return entry || key;
};
