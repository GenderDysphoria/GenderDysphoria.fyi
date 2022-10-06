const { ROOT } = require('./resolve');
const glob = require('./lib/glob');

const list = [];
const files =  glob.sync('public/*/_concat.json', { cwd: ROOT, nodir: true });
for (const file of files) {
    list.push(require('../'+file));
}

module.exports = exports = list;