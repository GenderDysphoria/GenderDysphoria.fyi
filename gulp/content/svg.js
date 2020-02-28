const glob = require('./lib/glob');
const { ROOT } = require('./resolve');
const actions = require('./actions');

module.exports = exports = async function svgIcons () {
  const files = await glob('svg/**/*.svg', { cwd: ROOT });

  const tasks = files.map((f) => ({
    input: f,
    output: 'images/' + f,
    action: actions.copy,
    nocache: true,
  }));

  return tasks;
};
