
const argv = require('minimist')(process.argv.slice(2));
const format = require('date-fns/format');
const parse = require('date-fns/parse');
const random = require('./lib/random');
const path = require('path');
const fs = require('fs-extra');
const log = require('fancy-log');
const template = require('./_template');

const ROOT = path.dirname(__dirname);

module.exports = exports = async function newPost () {
  var date = argv.date ? parse(argv.date, 'yyyy-MM-dd', new Date()) : new Date();

  if (!date.getHours()) {
    const now = new Date();
    date.setHours(now.getHours());
    date.setMinutes(now.getMinutes());
  }

  // console.log(date);return;
  var id = random.id().substr(-6).toUpperCase();
  var fname = format(date, 'yyyy-MM-dd.HHmm.') + id;

  var target = path.join(ROOT, 'posts', fname);

  await fs.ensureDir(target);

  var contents = template({ id, date });

  await fs.writeFile(path.join(target, 'index.md'), contents);

  log('Created new post at posts/' + fname);
};
