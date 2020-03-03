
const path = require('path');

const fs = require('fs-extra');
const log = require('fancy-log');
const { minify } = require('html-minifier-terser');
const { resolve, readFile, ENGINE } = require('./resolve');

const handlebars = require('handlebars');
const HandlebarsKit = require('hbs-kit');
HandlebarsKit.load(handlebars);

const slugs = require('slugify');
const slugify = (s) => slugs(s, { remove: /[*+~.,()'"!?:@/\\]/g }).toLowerCase();
const striptags = require('string-strip-html');

const markdownIt = require('markdown-it');



const markdownEngines = {
  full: markdownIt({
    html: true,
    linkify: true,
    typographer: true,
  })
    .enable('image')
    .use(require('markdown-it-anchor'), {
      permalink: true,
      permalinkClass: 'header-link',
      permalinkSymbol: '<img src="/images/svg/paragraph.svg">',
      slugify,
    })
    .use(require('./lib/markdown-raw-html')),

  preview: markdownIt({
    html: false,
    linkify: false,
    typographer: true,
  })
    .use(require('./lib/markdown-token-filter')),
};

function markdown (mode, input, env) {
  input = input.replace(/\{!\{([\s\S]*?)\}!\}/mg, (match, contents) => {
    try {
      const result = handlebars.compile(contents)(env);
      return '|||' + result + '|||';
    } catch (e) {
      log.error(e);
      return '';
    }
  });

  if (mode === 'preview') {
    input = striptags(input
      .replace(/<!--\[[\s\S]*?\]-->/g, '')
      .replace(/|||[\s\S]*?|||/gi, ''),
    ).trim();
    if (input.length > 1000) input = input.slice(0, 1000) + '…';
    input = input ? markdownEngines[mode].render(input) : '';
  } else {
    input = input.replace(/<!--[[\]]-->/g, '');
  }

  return input ? markdownEngines[mode].render(input, env) : '';
}

function stripIndent (input) {
  const match = input.match(/^[^\S\n]*(?=\S)/gm);
  const indent = match && Math.min(...match.map((el) => el.length));

  if (indent) {
    const regexp = new RegExp(`^.{${indent}}`, 'gm');
    input = input.replace(regexp, '');
  }

  return input;
}

const MINIFY_CONFIG = {
  conservativeCollapse: true,
  collapseWhitespace: true,
  minifyCSS: true,
  removeComments: true,
  removeRedundantAttributes: true,
};

const HANDLEBARS_PARTIALS = {
  layout:    'templates/layout.hbs',
};

module.exports = exports = async function (prod) {
  for (const [ name, file ] of Object.entries(HANDLEBARS_PARTIALS)) {
    try {
      const contents = await readFile(file);
      const template = handlebars.compile(contents.toString('utf8'));
      handlebars.registerPartial(name, template);
    } catch (e) {
      log.error('Could not execute load partial ' + file, e);
    }
  }

  const pageTemplateRaw = await readFile('templates/page.hbs');
  if (!pageTemplateRaw) throw new Error('Post template was empty?');
  try {
    var pageTemplate = handlebars.compile(pageTemplateRaw.toString('utf8'));
  } catch (e) {
    log.error('Crash while loading page template', e);
  }

  const revManifest = prod && await fs.readJson(resolve('rev-manifest.json')).catch(() => {}).then((r) => r || {});

  const helpers = new Injectables(prod, revManifest);
  handlebars.registerHelper('import', helpers.import());
  handlebars.registerHelper('markdown', helpers.markdown());
  handlebars.registerHelper('icon', helpers.icon());
  handlebars.registerHelper('prod', helpers.production());
  handlebars.registerHelper('rev', helpers.rev());

  const shrink = (input) => (prod ? minify(input, MINIFY_CONFIG) : input);

  const result = {
    [ENGINE.HANDLEBARS]: (source, env) => {
      const template = handlebars.compile(source);
      return shrink(template(env));
    },
    [ENGINE.MARKDOWN]: (source, env) => shrink(pageTemplate({ ...env, contents: markdown('full', source, env) })),
    [ENGINE.OTHER]: (source) => shrink(source),
    MARKDOWN_CONTENT: (source, env) => markdown('full', source, env),
    MARKDOWN_PREVIEW: (source, env) => markdown('preview', source, env),
  };

  return result;
};

class Injectables {

  constructor (prod, revManifest) {
    this.prod = prod;
    this.revManifest = revManifest;
    this.injections = {};
  }

  _parsePath (tpath, local, type) {
    if (tpath[0] === '/') tpath = resolve(tpath.slice(1));
    else if (tpath[0] === '~') tpath = resolve('templates', tpath.slice(2));
    else tpath = path.resolve(local.cwd, tpath);
    if (type && !tpath.endsWith(type)) tpath += '.' + type;
    return tpath;
  }

  _template (tpath, make) {
    if (!tpath) throw new Error('Received an empty template path: ' + tpath);
    if (this.injections[tpath]) return this.injections[tpath];

    if (!fs.existsSync(tpath)) {
      throw new Error('Injectable does not exist: ' + tpath);
    }

    let contents;
    try {
      contents = fs.readFileSync(tpath).toString('utf8');
      if (make) contents = make(contents);
      this.injections[tpath] = contents;
      return contents;
    } catch (e) {
      log.error(e, 'An error occured while loading the injectable: ' + tpath);
    }

    return '';
  }

  rev () {
    const self = this;
    return function (url) {
      if (!url) return '';
      if (url[0] === '/') url = url.substr(1);
      if (self.prod && self.revManifest[url]) return '/' + self.revManifest[url];
      return '/' + url;
    };
  }

  production () {
    const self = this;
    return function (options) {
      if (!options.fn) return self.prod;
      return self.prod ? options.fn(this) : options.inverse(this);
    };
  }

  markdown () {
    const self = this;
    return function (...args) {
      const { fn, data } = args.pop();
      let contents;

      if (fn) {
        contents = stripIndent(fn(data));
      } else {
        let tpath = args.shift();
        tpath = self._parsePath(tpath, data.root.local, 'md');

        contents = self._template(tpath);
      }

      contents = markdown('full', contents, data);

      return new handlebars.SafeString(contents);
    };
  }

  import () {
    const self = this;
    return function (tpath, ...args) {
      const { hash, data } = args.pop();
      const value = args.shift();
      const context = handlebars.createFrame(value || data);
      Object.assign(context, hash || {});

      tpath = self._parsePath(tpath, data.root.local, 'hbs');

      try {
        const contents = self._template(tpath, handlebars.compile)(context);
        return new handlebars.SafeString(contents);
      } catch (e) {
        log.error('Could not execute import template ' + tpath, e);
        return '';
      }
    };
  }

  icon () {
    const self = this;
    return function (name, ...args) {
      const { hash, data } = args.pop();
      const tpath = path.join(data.root.local.root, 'svg', name + '.svg');

      try {
        const contents = self._template(tpath, (s) =>
          handlebars.compile(`<span class="svg-icon" {{#if size}}style="width:{{size}}px;height:{{size}}px"{{/if}}>${s}</span>`),
        )({ size: hash && hash.size });

        return new handlebars.SafeString(contents);
      } catch (e) {
        log.error('Could not execute import template ' + tpath, e);
        return '';
      }
    };
  }

}
