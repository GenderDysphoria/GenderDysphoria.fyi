
const path = require('path');

const fs = require('fs-extra');
const log = require('fancy-log');
const { resolve, readFile, ENGINE, TYPE } = require('./resolve');

const handybars = require('handybars');
const Kit = require('handybars/kit');

const slugify = require('./lib/slugify');
const { stripHtml } = require('string-strip-html');

const markdownIt = require('markdown-it');
const i18n = require('./lang');

const mAnchor = require('markdown-it-anchor');

const markdownEngines = {
  full: markdownIt({
    html: true,
    linkify: true,
    typographer: true,
  })
    .enable('image')
    .use(require('markdown-it-link-attributes'), {
      pattern: /^https?:/,
      attrs: {
        target: '_blank',
        rel: 'noopener',
      },
    })
    .use(mAnchor, {
      permalink: mAnchor.permalink.linkInsideHeader({
        class: 'header-link',
        symbol: '<img src="/images/svg/paragraph.svg">',
        renderHref: (input) => '#' + slugify(decodeURIComponent(input)),
        ariaHidden: true,
      }),
    })
    .use(require('./lib/markdown-raw-html'), { debug: false }),

  preview: markdownIt({
    html: false,
    linkify: false,
    typographer: true,
  })
    .use(require('./lib/markdown-token-filter')),
};

function markdown (mode, input, data, hbs) {

  if (mode === 'preview') {
    input = stripHtml(input
      .replace(/<!--\[[\s\S]*?\]-->/g, '')
      .replace(/æææ[\s\S]*?æææ/gi, '')
      .replace(/\{!\{([\s\S]*?)\}!\}/mg, ''),
    ).result.trim();
    if (input.length > 1000) input = input.slice(0, 1000) + '…';

  } else {

    input = input.replace(/\{!\{([\s\S]*?)\}!\}/mg, (match, contents) => {
      const result = hbs(contents, data);
      return 'æææ' + result + 'æææ';
    });

    input = input.replace(/<!--[[\]]-->/g, '');
  }

  try {
    return input ? markdownEngines[mode].render(input, data) : '';
  } catch (e) {
    log(input);
    throw e;
  }
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

const HANDYBARS_PARTIALS = {
  layout:    'templates/layout.hbs',
};

const HANDYBARS_TEMPLATES = {
  page:      'templates/page.hbs',
  post:      'templates/post.hbs',
};

module.exports = exports = async function (prod) {

  const revManifest = prod && await fs.readJson(resolve('rev-manifest.json')).catch(() => {}).then((r) => r || {});
  const injectables = new Injectables(prod, revManifest);

  const env = {  ...Kit, ...injectables.helpers() };

  for (const [ name, file ] of Object.entries(HANDYBARS_PARTIALS)) {
    try {
      const contents = await readFile(file);
      env[name] = handybars.partial(contents.toString('utf8'));
    } catch (e) {
      log.error('Could not load partial ' + file, e);
    }
  }

  const templates = {};
  for (const [ name, file ] of Object.entries(HANDYBARS_TEMPLATES)) {
    try {
      const contents = await readFile(file);
      templates[name] = handybars(contents.toString('utf8'), env);
    } catch (e) {
      log.error('Could not load template ' + file, e);
    }
  }

  const hbs = (source, data) => handybars(source, env)(data);

  const result = {
    [TYPE.HANDYBARS]:  hbs,
    [TYPE.MARKDOWN]:   (source, data) => markdown('full', source, data, hbs),
    [TYPE.OTHER]:      (source) => source,

    [ENGINE.PAGE]:     (source, data) => templates.page({ ...data, contents: markdown('full', source, data, hbs) }),
    [ENGINE.POST]:     (source, data) => templates.post({ ...data, contents: markdown('full', source, data, hbs) }),
    [ENGINE.HTML]:     (source) => source,
    [ENGINE.OTHER]:    (source) => source,

    preview: (source, data) => markdown('preview', source, data, hbs),
  };

  return result;
};

class Injectables {

  constructor (prod, revManifest) {
    this.prod = prod;
    this.revManifest = revManifest;
    this.injections = {};
    this.languages = {};
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

  helpers () {
    return {
      import:   this.import(),
      markdown: this.markdown(),
      icon:     this.icon(),
      prod:     this.production(),
      rev:      this.rev(),
      lang:     this.lang(),
    };
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
    return function ({ fn, inverse }) {
      if (!fn) return self.prod;
      return self.prod ? fn(this) : inverse && inverse(this);
    };
  }

  markdown () {
    const self = this;
    return function (...args) {
      const { fn, data, resolve: rval } = args.pop();
      const local = rval('@root.this.local');
      let contents;

      if (fn) {
        contents = stripIndent(fn(data.root));
      } else {
        let tpath = args.shift();
        tpath = self._parsePath(tpath, local, 'md');

        contents = self._template(tpath);
      }

      contents = markdown('full', contents, data, () => { throw new Error('You went too deep!'); });

      return { value: contents };
    };
  }

  import () {
    const self = this;
    return function (tpath, ...args) {
      const { hash, env, resolve: rval } = args.pop();
      const value = args.shift() || this;
      const frame = handybars.makeContext(value, env, { hash });
      const local = rval('@root.this.local');

      tpath = self._parsePath(tpath, local, 'hbs');

      try {
        const contents = self._template(tpath, handybars.parse).evaluate(value, frame);
        return handybars.safe(contents);
      } catch (e) {
        log.error('Could not execute import template ' + tpath, e);
        return '';
      }
    };
  }

  icon () {
    const self = this;
    return function (name, ...args) {
      const { hash, env, resolve: rval } = args.pop();
      const local = rval('@root.this.local');
      const tpath = path.join(local.root, 'svg', name + '.svg');
      if (hash.size && String(hash.size).match(/^\d+$/)) {
        hash.size = hash.size + 'px';
      }
      const frame = handybars.makeContext(hash, env);
      try {
        const contents = self._template(tpath, (s) =>
          handybars(`<span class="svg-icon" style="{{#if this.size}}width:{{this.size}};height:{{this.size}};{{/if}}{{this.style}}">${s}</span>`),
        )(frame);

        return handybars.safe(contents);
      } catch (e) {
        log.error('Could not execute import template ' + tpath, e);
        return '';
      }
    };
  }

  lang () {
    return function (key, ...args) {
      const { resolve: rval } = args.pop();
      const lang = rval('@root.this.page.lang').split('-')[0];
      return i18n(lang, key, ...args);
    };
  }

}
