const glob = require('./lib/glob');
const { ROOT, readFile, resolve } = require('./resolve');
const actions = require('./actions');
const File = require('./file');
const sass = require('sass');
const Promise = require('bluebird');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const crass = require('crass');


module.exports = exports = async function styles (prod) {
  const files = await Promise.map(glob('scss/*.scss', { cwd: ROOT, nodir: true }), async (filepath) => {
    const f = new Sass(filepath);
    if (f.preprocessed) return false;
    await f.load(prod);
    return f;
  }).filter(Boolean);

  const tasks = files.map((f) => f.tasks()).flat();

  return tasks;
};

class Sass extends File {

  _dir (dir) {
    dir = dir.split('/');
    if (dir[0] === 'scss') dir.shift();
    dir.unshift('css');
    return dir;
  }


  _out () {
    this.ext = '.css';
    super._out();
  }

  async load (prod) {
    let contents = (await readFile(this.input).catch(() => null)).toString('utf8');

    for (const [ match, fpath ] of contents.matchAll(/\|(.+?)\|/g)) {
      const insert = await readFile(fpath);
      contents = contents.replace(match, insert);
    }

    let { css } = await sass.compileStringAsync(contents, {
      loadPaths: [
        resolve(this.cwd),
        resolve('node_modules'),
      ],
      sourceMapEmbed: true,
      silenceDeprecations: [ 'mixed-decls', 'color-functions', 'global-builtin', 'import' ],
    });

    if (prod) {
      css = (await postcss([ autoprefixer ]).process(css, {
        from: this.input,
        to: this.out,
        map: { inline: true },
      })).css;

      var parsed = crass.parse(css);
      parsed = parsed.optimize({ O1: true });
      // if (options.pretty) parsed = parsed.pretty();
      css = Buffer.from(parsed.toString());
    }

    this.content = css;
  }

  tasks () {
    return [ {
      input: this.input,
      output: this.out,
      content: this.content,
      action: actions.write,
      nocache: true,
    } ];
  }

}
