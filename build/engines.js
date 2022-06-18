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

const glossary = require('./glossary');
const assert = require('assert');

const dateFNS = require('date-fns');
const dateFNSLocales = require('date-fns/locale');
const str2locale = {
  'en': dateFNSLocales.enUS,
  'zh': dateFNSLocales.zhCN,
  'de': dateFNSLocales.de,
  'fr': dateFNSLocales.fr,
  'hu': dateFNSLocales.hu,
  'pl': dateFNSLocales.pl,
  'pt': dateFNSLocales.pt,
  'es': dateFNSLocales.es
};

// Process translation links (so /en/what-is-gender maps to /pt/que-e-gênero)
const translationLinksRaw = require('../translation-links.json');
const translationLinksMap = {};
for (const group of translationLinksRaw) {
  for (const [lang, url] of Object.entries(group)) {
    if (url in translationLinksMap) {
      console.log("URL '"+url+"' appears repeatedly on translation-links.json");
      process.exit(1);
    } else {
      translationLinksMap[url] = group;
    }
  }
}

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
        ariaHidden: true,
      }),
      slugify: slugify,
    })
    .use(glossary.markdownit_plugin)
    .use(require('./lib/markdown-raw-html'), { debug: false }),

  preview: markdownIt({
    html: false,
    linkify: false,
    typographer: true,
  })
    .use(require('./lib/markdown-token-filter')),
};

function markdown (mode, inline, input, data, hbs, glossaries) {
  assert(glossaries !== undefined);
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

  // Add glossary tooptips and ruby annotations
  const lang = data.page.lang;
  data.glossary = glossaries.by_lang(lang);

  try {
    if (inline) {
      return input ? markdownEngines[mode].renderInline(input, data) : '';  
    } else {
      return input ? markdownEngines[mode].render(input, data) : '';
    }
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

// BUG: for some reason, the glossaries are reloaded but don't show any effect.
// Some assignment is probably making a copy rather than a reference.
module.exports = exports = async function (prod) {
  const glossaries = glossary.load_default();
  const revManifest = prod && await fs.readJson(resolve('rev-manifest.json')).catch(() => {}).then((r) => r || {});
  const injectables = new Injectables(prod, revManifest, glossaries);

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
    [TYPE.MARKDOWN]:   (source, data) => markdown('full', false, source, data, hbs, glossaries),
    [TYPE.OTHER]:      (source) => source,

    [ENGINE.PAGE]:     (source, data) => templates.page({ ...data, contents: markdown('full', false, source, data, hbs, glossaries) }),
    [ENGINE.POST]:     (source, data) => templates.post({ ...data, contents: markdown('full', false, source, data, hbs, glossaries) }),
    [ENGINE.HTML]:     (source) => source,
    [ENGINE.OTHER]:    (source) => source,

    preview: (source, data) => markdown('preview', false, source, data, hbs, glossaries),
  };

  return result;
};

class Injectables {

  constructor (prod, revManifest, glossaries) {
    this.prod = prod;
    this.revManifest = revManifest;
    this.injections = {};
    this.languages = {};
    this.glossaries = glossaries;
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
      import:    this.import(),
      md:        this.md(),
      markdown:  this.markdown(),
      icon:      this.icon(),
      coalesce:  this.coalesce(),
      prod:      this.production(),
      rev:       this.rev(),
      lang:      this.lang(),
      lang2:     this.lang2(),
      date:      this.date(),
      gloss:     this.gloss(),
      nogloss:   this.nogloss(),
      tojson:    this.tojson(),
      translink: this.translink(),
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
      const { fn, env, resolve: rval } = args.pop();
      const local = rval('@root.this.local');
      let contents;

      if (fn) {
        contents = stripIndent(fn(data.root));
      } else {
        let tpath = args.shift();
        tpath = self._parsePath(tpath, local, 'md');

        contents = self._template(tpath);
      }

      contents = markdown('full', false, contents, env['@root'].this, () => { throw new Error('You went too deep!'); }, self.glossaries);

      return { value: contents };
    };
  }

  md () {
    const self = this;
    return function (...args) {
      const { env } = args.pop();

      const inline = args[0];
      let contents = args[1];

      if (contents instanceof Array) {
        contents = contents.join('\n\n');
      }

      contents = markdown('full', inline, contents, env['@root'].this, () => { throw new Error('You went too deep!'); }, self.glossaries);

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

  // Usage {{lang 'MY-STRING'}}
  lang () {
    return function (key, ...args) {
      const { resolve: rval } = args.pop();
      const lang = (rval('@root.this.page.lang')||'').split('-')[0];
      return i18n(lang, key, ...args);
    };
  }

  // Usage {{lang2 other-lang 'MY-STRING'}}
  lang2 () {
    return function (lang, key, ...args) {
      const { resolve: rval } = args.pop();
      return i18n(lang, key, ...args);
    };
  }

  // Find the translation links for the current page from the file translation-links.json
  //
  // If a single argument is present, a single string will be returned, otherwise an
  // object with links for all languages will be returned
  // 
  // Usage: {{translink new-lang fallback-url}}
  translink () {
    return function (...raw_args) {
      let { resolve: rval, arguments: args } = raw_args.pop();
      args.push(undefined, undefined);
      const lang = args[0];
      let fallback = args[1];
      const page_url = rval('@root.this.url').trim();

      let ans = translationLinksMap[page_url] || {};
      if (lang !== undefined) {
        ans = ans[lang];
      }

      if (fallback === undefined) {
        fallback = `/${lang}`;
      }

      if (ans === undefined) {
        ans = fallback;
      }

      return ans;
    };
  }

  // Given a list of arguments, returns the firt that isn't undefined
  coalesce () {
    return function (...raw_args) {
      const { arguments: args } = raw_args.pop();
      for (let arg in args) {
        if (args[arg] !== undefined) {
          return args[arg];
        }
      }
      return undefined;
    };
  }

  // Multi tool for printing dates
  // 
  // {{date}} -> prints current date
  // {{date datestr}} -> prints date in datestr
  // {{date datestr datefmt}} -> prints date in datestr in format datefmt
  // {{date datestr datefmt lang}} -> prints date in datestr in format datefmt according to conventions for language lang 
  // 
  // Datestr can be the string "now", `undefined`, and anything parsable by `new Date()`.
  // 
  // If lang is not specified, it will be extracted from the page metadata. If that is not available, English will be assumed.
  // In case of errors, the date will be returned as an ISO string if possible and its raw datestr input otherwise.
  // Datefmt format is available at https://date-fns.org/v2.25.0/docs/format
  // 
  // Common formats:
  // - "h:mm aa - EEE, LLL do, yyyy"  = 12 hour clock, e.g. '1:28 PM - Sat, Feb 15th, 2020' (en) or '1:28 PM - sam., 15/févr./2020' (fr)
  // - "hh:mm - EEE, LLL do, yyyy"    = 24 hour clock, e.g. '13:28 - Sat, Feb 15th, 2020' (en) or '13:28 - sam., 15/févr./2020' (fr)
  // - "yyyy-MM-dd'T'HH:mm:ss.SSSXXX" or "iso" = ISO 8601 format, e.g. '2020-02-15T13:28:02.000Z'
  date () {
    return function (...args) {
      let extra = args.pop();
      let datestr, dateobj, datefmt, lang;

      const { resolve: rval } = extra;
      const filename = rval('@value.input');
      lang = (rval('@root.this.page.lang') || 'en').split('-')[0];

      switch (args.length) {
      case 0:
        datestr = "now";
        break;
      case 1:
        datestr = args[0];
        break;
      case 2:
        datestr = args[0];
        datefmt = args[1];
        break;
      case 3:
        datestr = args[0];
        datefmt = args[1];
        lang = args[2];
        break;
      default:
        throw new Exception('wrong number of arguments for {{date}}, got '+args.length+' maximum is 3');
      }

      if (datestr === "now" || datestr === undefined) {
        dateobj = new Date();
      } else {
        dateobj = new Date(datestr);
      }

      if (!dateFNS.isValid(dateobj)) {
        console.trace('Invalid input for date: ', { datestr, filename, args, extra });
        return datestr.toString();
      }

      if (datefmt == "iso") {
        return dateobj.toISOString();
      }

      if (lang === undefined) {
        return dateobj.toISOString();
      }

      const locale = str2locale[lang];
      if (locale === undefined) {
        console.warn('Locale not found: '+lang);
      }

      if (datefmt === undefined || locale === undefined) {
        const options = {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
          timeZoneName: 'short',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        };
        try {
          return dateobj.toLocaleString(lang, options);
        } catch (error) {
          console.trace('Something went horribly wrong while formating dates.', { error, filename, args, extra });
          return dateobj.toISOString();
        }
      }

      try {
        return dateFNS.format(dateobj, datefmt, {locale: locale});
      } catch (error) {
        console.trace('Something went horribly wrong while formating dates.', { error, filename, args, extra });
        return dateobj.toISOString();
      }
    };
  }

  // Provides glossary related functionalities
  // 
  // {{gloss flag [lang]}} - Returns the list of entries used in a language sorted lexicographically.
  //     (flag is a boolean indicating the inclusion of variants)
  // {{gloss term [lang]}} - Returns the corresponding entry for the queried term 
  //     (see glossary.js:40-48 for the object structure)
  // 
  // The [lang] parameter is optional
  gloss() {
    const self = this;
    return function (...args) {
      const { resolve: rval } = args.pop();
      const filename = rval('@value.input');
      let term = args[0];
      const lang = args[1] || rval('@root.this.page.lang');

      // Just some ease of use in case the argument was of the wrong type
      if (term instanceof glossary.Entry) {
        term = term.key;
      }

      // Check if we have the glossary loaded
      if (self.glossaries === undefined || self.glossaries.by_lang(lang) == undefined) {
        log.error(`No glossary for language '${lang}' (file ${filename})`);
        return undefined;
      }

      const lgloss = self.glossaries.by_lang(lang);
      if (term === false) {
        // Return only the main terms
        return lgloss.entries_sorted;
      } else if (term === true) {
        // Return the main terms and the variants
        return lgloss.words_sorted;
      } else if (typeof term === 'string') {
        // Return a specific entry
        const ans = lgloss.getEntryObj(term);
        if (ans === undefined) {
          log.error(`No term '${term}' for language '${lang}' (file ${filename})`)
        }
        return ans;
      } else {
        log.error(`Invalid type: ${term}`)
        return undefined;
      }
    };
  }

  // Prevents a word from being "auto glossarized" by turning it into a sequence of hex escape codes.
  nogloss() {
    return function (word) {
      var result = '';
      for (let i=0; i < word.length; i++) {
        let hex = word.charCodeAt(i).toString(16);
        result += `&#x${hex};`;
      }
      return result;
    };
  }

  // Converts a value to JSON. This is intended for debugging only
  tojson() {
    return function (thing) {
      return JSON.stringify(thing);
    }
  }

}
