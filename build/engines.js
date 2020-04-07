
const path = require('path');

const fs = require('fs-extra');
const log = require('fancy-log');
const { resolve, readFile, ENGINE, TYPE } = require('./resolve');

const Handlebars = require('handlebars');
const HandlebarsKit = require('hbs-kit');
HandlebarsKit.load(Handlebars);

const slugify = require('./lib/slugify');
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
    .use(require('./lib/markdown-raw-html'), { debug: false }),

  preview: markdownIt({
    html: false,
    linkify: false,
    typographer: true,
  })
    .use(require('./lib/markdown-token-filter')),
};

function markdown (mode, input, env) {

  if (mode === 'preview') {
    input = striptags(input
      .replace(/<!--\[[\s\S]*?\]-->/g, '')
      .replace(/æææ[\s\S]*?æææ/gi, '')
      .replace(/\{!\{([\s\S]*?)\}!\}/mg, ''),
    ).trim();
    if (input.length > 1000) input = input.slice(0, 1000) + '…';

  } else {

    input = input.replace(/\{!\{([\s\S]*?)\}!\}/mg, (match, contents) => {
      try {
        const result = Handlebars.compile(contents)(env);
        return 'æææ' + result + 'æææ';
      } catch (e) {
        log.error(e);
        return '';
      }
    });

    input = input.replace(/<!--[[\]]-->/g, '');
  }

  try {
    return input ? markdownEngines[mode].render(input, env) : '';
  } catch (e) {
    log(input);
    throw e;
  }
}

function handlebars (input, env) {
  const template = Handlebars.compile(input);
  return template(env);
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

const HANDLEBARS_PARTIALS = {
  layout:    'templates/layout.hbs',
  list:      'templates/list.hbs',
  page:      'templates/page.hbs',
  post:      'templates/post.hbs',
};

module.exports = exports = async function (prod) {
  const templates = {};
  for (const [ name, file ] of Object.entries(HANDLEBARS_PARTIALS)) {
    try {
      const contents = await readFile(file);
      const template = Handlebars.compile(contents.toString('utf8'));
      templates[name] = template;
      Handlebars.registerPartial(name, template);
    } catch (e) {
      log.error('Could not execute load partial ' + file, e);
    }
  }

  const revManifest = prod && await fs.readJson(resolve('rev-manifest.json')).catch(() => {}).then((r) => r || {});

  const helpers = new Injectables(prod, revManifest);
  Handlebars.registerHelper('import', helpers.import());
  Handlebars.registerHelper('markdown', helpers.markdown());
  Handlebars.registerHelper('icon', helpers.icon());
  Handlebars.registerHelper('prod', helpers.production());
  Handlebars.registerHelper('rev', helpers.rev());

  const result = {
    [TYPE.HANDLEBARS]: handlebars,
    [TYPE.MARKDOWN]:   (source, env) => markdown('full', source, env),
    [TYPE.OTHER]:      (source) => source,

    [ENGINE.LIST]:     (source, env) => templates.list({ ...env, contents: markdown('full', source, env) }),
    [ENGINE.PAGE]:     (source, env) => templates.page({ ...env, contents: markdown('full', source, env) }),
    [ENGINE.POST]:     (source, env) => templates.post({ ...env, contents: markdown('full', source, env) }),
    [ENGINE.HTML]:     (source) => source,
    [ENGINE.OTHER]:    (source) => source,

    preview: (source, env) => markdown('preview', source, env),
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
        contents = stripIndent(fn(data.root));
      } else {
        let tpath = args.shift();
        tpath = self._parsePath(tpath, data.root.local, 'md');

        contents = self._template(tpath);
      }

      contents = markdown('full', contents, data);

      return new Handlebars.SafeString(contents);
    };
  }

  import () {
    const self = this;
    return function (tpath, ...args) {
      const { hash, data } = args.pop();
      const value = args.shift() || this;
      const frame = Handlebars.createFrame(data);
      const context = (typeof value === 'object')
        ? { ...value, ...(hash || {}), _parent: this }
        : value;

      tpath = self._parsePath(tpath, data.root.local, 'hbs');

      try {
        const contents = self._template(tpath, Handlebars.compile)(context, { data: frame });
        return new Handlebars.SafeString(contents);
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
          Handlebars.compile(`<span class="svg-icon" {{#if size}}style="width:{{size}}px;height:{{size}}px"{{/if}}>${s}</span>`),
        )({ size: hash && hash.size });

        return new Handlebars.SafeString(contents);
      } catch (e) {
        log.error('Could not execute import template ' + tpath, e);
        return '';
      }
    };
  }

}
