
const argv = require('minimist')(process.argv.slice(2));
const format = require('date-fns/format');
const parse = require('date-fns/parse');
const random = require('./lib/random');
const path = require('path');
const fs = require('fs-extra');
const log = require('fancy-log');
const template = require('./_post-template');
const { resolve } = require('./resolve');

module.exports = exports = async function newPost () {
  var date = argv.date ? parse(argv.date, 'yyyy-MM-dd', new Date()) : new Date();

  if (!date.getHours()) {
    const now = new Date();
    date.setHours(now.getHours());
    date.setMinutes(now.getMinutes());
  }

  // console.log(date);return;
  var id = random.id().substr(-10).toUpperCase();
  var fname = format(date, 'yyyy-MM-dd.HHmm.') + id;

  var target = resolve('posts', fname);
  var contents = template({ id, date });

  if (argv.folder === undefined) {
    target += '.md';
  } else {
    await fs.ensureDir(target);
    target += path.join(target, 'index.md');
  }

  await fs.writeFile(target, contents);

  log('Created new post at ' + target);
};
