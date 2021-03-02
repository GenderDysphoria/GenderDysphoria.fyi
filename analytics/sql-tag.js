
const namedParams = require('named-placeholders')();

function stripIndent (input) {
  if (Array.isArray(input)) return input.map(stripIndent).join('');
  const match = input.match(/^[^\S\n]*(?=\S)/gm);
  const indent = match && Math.min(...match.map((el) => el.length));
  if (indent) {
    const regexp = new RegExp(`^.{${indent}}`, 'gm');
    input = input.replace(regexp, '');
  }

  return input;
}

function isObject (input, strict = false) {
  if (!input) return false;
  if (typeof input !== 'object') return false;
  if (Array.isArray(input)) return false;
  if (!strict) return true;
  if (!(input instanceof Object)) return false;
  if (input.constructor !== Object.prototype.constructor) return false;
  return true;
}
const isNotUndefinedOrNull  = (input) => input !== null && typeof input !== 'undefined';
const valueOrEmpty = (input) => (isNotUndefinedOrNull(input) ? input : '');

function withData (data) {
  return function (...args) {
    const query = sql(...args);
    return namedParams(query, data);
  };
}

function sql (strings, ...values) {
  const input = strings.reduce((str, chunk, i) => (
    str + chunk + valueOrEmpty(values[i])
  ), '');
  return stripIndent(input);
}

module.exports = exports = (...args) => {
  if (args.length === 0 || (args.length === 1 && isObject(args[0]))) {
    return withData(args[0] || {});
  }
  if (Array.isArray(args[0])) return sql(...args);
  throw new TypeError('Unknown invocation of sql-tag');
};
