
const fs = require('fs-extra');
const actions = require('./actions');
const { uniqBy } = require('lodash');
const { resolve } = require('./resolve');

module.exports = exports = async function twitter () {
  const media = await fs.readJson(resolve('twitter-media.json')).catch(() => ([]));
  const tasks = uniqBy(media, 'input')
    .map((m) => ({ ...m, action: actions.fetch, output: m.output }));

  return tasks;
};
