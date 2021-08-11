
const languages = {
  en: require('./en'),
  es: require('./es'),
};

module.exports = exports = function (lang, key, ...args) {
  var entry = languages[lang] && languages[lang][key];
  if (!entry) entry = languages.en[key];
  if (typeof entry === 'function') return entry(...args);
  return entry || key;
};
