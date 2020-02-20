
const path = require('path');
const fs = require('fs-extra');
const { chunk, uniq, keyBy, difference, omit } = require('lodash');
const log = require('fancy-log');
const glob = require('./lib/glob');
const getDimensions = require('./lib/dimensions');
const memoize = require('memoizepromise');
const { URL } = require('url');
const { minify: htmlMinify } = require('html-minifier-terser');

const { src, dest } = require('gulp');
const frontmatter = require('gulp-front-matter');
const collect     = require('gulp-collect');

const asyncthrough = require('./lib/through');

const ROOT = path.dirname(__dirname);
const DEST = 'dist';

const { siteInfo } = require('../package.json');

const markdown = require('markdown-it');
const striptags = require('string-strip-html');
const tweetparse = require('./lib/tweetparse');

const slugs = require('slugify');
const slugify = (s) => slugs(s, { remove: /[*+~.,()'"!?:@/\\]/g }).toLowerCase();

const handlebars = require('handlebars');
const HandlebarsKit = require('hbs-kit');
HandlebarsKit.load(handlebars);

const md     = markdown({
  html: true,
  linkify: true,
  typographer: true,
}).enable('image')
  .use(require('markdown-it-anchor'), {
    permalink: true,
    permalinkClass: 'header-link',
    permalinkSymbol: '<img src="/images/svg/paragraph.svg">',
    slugify,
  })
  .use(require('./lib/markdown-raw-html'))
;

const mdPreview = markdown({
  html: false,
  linkify: false,
  typographer: true,
})
  .use(require('./lib/markdown-token-filter'))
;

let twitterClient;
const Twitter = require('twitter-lite');
try {
  twitterClient = new Twitter(require('../twitter.json'));
} catch (e) {
  twitterClient = null;
}

function twitter (tweetids) {
  if (!twitterClient) return [];
  return twitterClient.get('statuses/lookup', { id: tweetids.join(','), tweet_mode: 'extended' })
    .catch((e) => { log.error(e); return []; });
}


async function reloadLayouts () {
  const layouts = {
    layout:    'templates/layout.hbs.html',
  };

  let pending = Object.entries(layouts)
    .map(async ([ name, file ]) =>
      [ name, (await fs.readFile(path.resolve(ROOT, file))).toString('utf8') ],
    );

  pending = await Promise.all(pending);

  pending.forEach(([ name, file ]) => handlebars.registerPartial(name, handlebars.compile(file)));

  const injections = {};
  handlebars.registerHelper('inject', function (tpath, ...args) {
    const { hash } = args.pop();
    const context = handlebars.createFrame(args[0] || this);
    Object.assign(context, hash || {});

    if (tpath[0] === '/') tpath = path.join(this.local.root, tpath);
    else if (tpath[0] === '~') tpath = path.join(this.local.root, 'templates', tpath.slice(2));
    else tpath = path.resolve(this.local.cwd, tpath);
    tpath += '.hbs';

    if (!injections[tpath]) {
      if (!fs.existsSync(tpath)) {
        log.error('Template does not exist for injection ' + path.relative(ROOT, tpath));
        return '';
      }

      try {
        injections[tpath] = handlebars.compile(fs.readFileSync(tpath).toString('utf8'));
      } catch (e) {
        log.error('Could not load injection template ' + path.relative(ROOT, tpath), e);
        return '';
      }
    }

    try {
      return new handlebars.SafeString(injections[tpath](context));
    } catch (e) {
      log.error('Could not execute injection template ' + path.relative(ROOT, tpath), e);
      return '';
    }
  });

  handlebars.registerHelper('icon', function (name, ...args) {
    const { hash } = args.pop();
    const tpath = path.join(this.local.root, 'svg', name + '.svg');

    if (!injections[tpath]) {
      if (!fs.existsSync(tpath)) {
        log.error('Template does not exist for injection ' + path.relative(ROOT, tpath));
        return '';
      }

      try {
        const svg = fs.readFileSync(tpath).toString('utf8');
        injections[tpath] = handlebars.compile(`<span class="svg-icon" {{#if size}}style="width:{{size}}px;height:{{size}}px"{{/if}}>${svg}</span>`);
      } catch (e) {
        log.error('Could not load injection template ' + path.relative(ROOT, tpath), e);
        return '';
      }
    }

    try {
      return new handlebars.SafeString(injections[tpath]({ size: hash && hash.size }));
    } catch (e) {
      log.error('Could not execute injection template ' + path.relative(ROOT, tpath), e);
      return '';
    }
  });

  handlebars.registerHelper('markdown', function (...args) {
    const { fn } = args.pop();
    let original;

    if (fn) {
      original = fn(this);

      const match = original.match(/^[^\S\n]*(?=\S)/gm);
      const indent = match && Math.min(...match.map((el) => el.length));

      if (indent) {
        const regexp = new RegExp(`^.{${indent}}`, 'gm');
        original = original.replace(regexp, '');
      }

    } else {
      let tpath = args.shift();
      if (!tpath) throw new Error('No content was provided for the Markdown helper');
      if (tpath[0] === '/') tpath = path.join(this.local.root, tpath);
      else tpath = path.resolve(this.local.cwd, tpath);
      tpath += '.md';

      if (!injections[tpath]) {
        if (!fs.existsSync(tpath)) {
          log.error('Markdown does not exist for injection ' + path.relative(ROOT, tpath));
          return '';
        }

        try {
          original = fs.readFileSync(tpath).toString('utf8');
          injections[tpath] = original;
        } catch (e) {
          log.error('Could not load markdown file ' + path.relative(ROOT, tpath), e);
          return '';
        }
      }
    }

    original = md.render(original);

    return new handlebars.SafeString(original);
  });
}

exports.loadLayout = async function loadLayout () {
  await reloadLayouts();
  handlebars.registerHelper('rev', (url) => {
    if (!url) return '';
    if (url[0] === '/') url = url.substr(1);
    return '/' + url;
  });
  handlebars.registerHelper('prod', function (options) {
    if (!options.inverse) return false;
    return options.inverse(this);
  });
};

exports.loadLayout.prod = async function loadLayoutForProd () {
  const manifest = await fs.readJson(path.join(ROOT, 'rev-manifest.json')).catch(() => {}).then((r) => r || {});

  await reloadLayouts();

  handlebars.registerHelper('rev', (url) => {
    if (!url) return '';
    if (url[0] === '/') url = url.substr(1);
    if (manifest[url]) return '/' + manifest[url];
    return '/' + url;
  });
  handlebars.registerHelper('prod', function (options) {
    if (!options.fn) return true;
    return options.fn(this);
  });
};

exports.pages = function buildPages ({ minify }) {
  var postTemplate = handlebars.compile(String(fs.readFileSync(path.join(ROOT, '/templates/post.hbs.html'))));
  const minifyConfig = {
    conservativeCollapse: true,
    collapseWhitespace: true,
    minifyCSS: true,
    removeComments: true,
    removeRedundantAttributes: true,
  };

  return src([ 'pages/**/*.{md,html,xml}', '!pages/**/_*.{md,html}' ])
    .pipe(frontmatter({
      property: 'meta',
    }))
    .pipe(parseMeta())
    .pipe(parseTweets())
    .pipe(asyncthrough(async (stream, file) => {
      const cwd = path.dirname(file.path);
      let original = file.contents.toString('utf8').trim();

      var data = {
        ...file.meta,
        meta: file.meta,
        page: {
          domain: siteInfo.domain,
          title: file.meta.title
            ? (file.meta.title + (file.meta.subtitle ? ', ' + file.meta.subtitle : '') + ' :: ' + siteInfo.title)
            : siteInfo.title,
        },
        local: {
          cwd,
          root: ROOT,
          basename: file.basename,
        },
      };

      if ([ '.html', '.md' ].includes(file.extname)) {
        const datajs = file.clone();
        datajs.contents = Buffer.from(JSON.stringify(omit(file.meta, [ 'destination' ]), null, 2));
        datajs.basename = path.basename(file.path, file.extname) + '.json';
        stream.push(datajs);
      }

      if ([ '.html', '.xml' ].includes(file.extname)) {
        // is a handlebars template
        try {
          const template = handlebars.compile(original);
          let html = template(data);
          if (minify) {
            html = htmlMinify(html, minifyConfig);
          }
          file.contents = Buffer.from(html);
          stream.push(file);
        } catch (err) {
          log.error('Encountered a crash while compiling ' + file.path, err);
        }
        return;
      }

      original = original.replace(/\{!\{([\s\S]*?)\}!\}/mg, (match, contents) => {
        try {
          const result = handlebars.compile(contents)(data);
          return '|||' + result + '|||';
        } catch (e) {
          log.error(e);
          return '';
        }
      });

      if (file.extname === '.md') {

        let contents, preview;
        try {
          contents = md.render(original.replace(/<!--[[\]]-->/g, '')).trim();
          data.contents = contents;

          preview = striptags(original
            .replace(/<!--\[[\s\S]*?\]-->/g, '')
            .replace(/|||[\s\S]*?|||/gi, ''),
          ).trim();
          if (preview.length > 1000) preview = preview.slice(0, 1000) + '…';
          preview = preview ? mdPreview.render(preview) : '';

          data.preview = preview;
        } catch (e) {
          log.error(`Error while rendering ${file.path}`, e);
          contents = preview = '';
        }

        if (preview) {
          file.flags.add('has-preview');
          if (preview.length < 400) file.flags.add('short-preview');
        } else {
          file.flags.add('no-preview');
        }

        const classes = Array.from(file.flags);
        const flags = classes.reduce((res, item) => {
          var camelCased = item.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          res[camelCased] = true;
          return res;
        }, {});

        data.classes = data.meta.classes = classes;
        data.flags = data.meta.flags = flags;

        file.path = file.meta.destination;

        // is a markdown file
        try {
          let html = postTemplate(data);
          if (minify) {
            html = htmlMinify(html, minifyConfig);
          }
          file.contents = Buffer.from(html);
          stream.push(file);
        } catch (err) {
          log.error(`Error while rendering html for ${file.path}`, err);
        }

        return;
      }

    }))
    .pipe(dest(DEST));
};

exports.pages.prod = function buildPagesProd () { return exports.pages({ minify: true }); };

/** **************************************************************************************************************** **/


function parseMeta () {
  const getFileData = memoize(async (cwd, siteCwd) => {
    const imageFiles = (await glob('{*,_images/*}.{jpeg,jpg,png,gif,mp4}', { cwd }));

    const images = (await Promise.all(imageFiles.map(async (imgpath) => {

      const ext = path.extname(imgpath);
      let basename = path.basename(imgpath, ext);

      if (basename === 'titlecard') return;

      if (ext === '.mp4') {
        return {
          name: basename,
          type: 'movie',
          full: path.join(siteCwd, `${basename}${ext}`),
        };
      }

      const dimensions = await getDimensions(path.resolve(cwd, imgpath));
      const { width, height } = dimensions;
      dimensions.ratioH = Math.round((height / width) * 100);
      dimensions.ratioW = Math.round((width / height) * 100);
      if (dimensions.ratioH > 100) {
        dimensions.orientation = 'tall';
      } else if (dimensions.ratioH === 100) {
        dimensions.orientation = 'square';
      } else {
        dimensions.orientation = 'wide';
      }

      if (basename[0] === '_') {
        basename = basename.slice(1);
      }

      const filetype = {
        '.jpeg': 'jpeg',
        '.jpg':  'jpeg',
        '.png':  'png',
        '.gif':  'gif',
      }[ext];

      const sizes = [
        {
          url: path.join(siteCwd, `${basename}.${filetype}`),
          width: dimensions.width,
          height: dimensions.height,
        },
      ];

      for (const w of [ 2048, 1024, 768, 576, 300, 100 ]) {
        if (w > dimensions.width) continue;
        sizes.push({
          url: path.join(siteCwd, `${basename}.${w}w.${filetype}`),
          width: w,
          height: Math.ceil((w / dimensions.width) * dimensions.height),
        });
      }

      sizes.reverse();

      return {
        name: basename,
        type: 'image',
        sizes,
      };
    }))).filter(Boolean);

    const titlecard = (await glob('titlecard.{jpeg,jpg,png,gif}', { cwd }))[0];

    return {
      images: keyBy(images, 'name'),
      titlecard: titlecard ? path.join(siteCwd, titlecard) : false,
    };
  });


  return asyncthrough(async (stream, file) => {
    if (!file || (file.meta && file.meta.ignore)) return;

    if (!file.meta) file.meta = {};

    // if metadata has a date value, us it.
    // otherwise use creation date
    var date = new Date(file.meta.date);
    if (!date) date = file.stat.ctime;
    file.meta.data = date;

    var cwd = path.dirname(file.path);
    var siteCwd = file.meta.cwd = '/' + path.relative(path.join(ROOT, 'pages'), cwd);
    var base = file.meta.base = path.basename(file.path, file.extname);

    var flags = file.flags = new Set(file.meta.classes || []);
    var isIndexPage = file.meta.isIndex = (base === 'index');
    var isRootPage = file.meta.isRoot = (file.meta.cwd === '/');

    if (isRootPage && isIndexPage) {
      file.meta.slug = '';
      file.meta.destination = path.join(path.dirname(file.path), 'index.html');
    } else if (isRootPage || !isIndexPage) {
      file.meta.slug = base;
      file.meta.destination = path.join(path.dirname(file.path), base, 'index.html');
    } else if (!isRootPage && isIndexPage) {
      file.meta.slug = '';
      file.meta.destination = path.join(path.dirname(file.path), 'index.html');
    } else {
      file.meta.slug = path.basename(cwd);
      file.meta.destination = path.join(path.dirname(file.path), 'index.html');
    }

    const url = new URL(siteInfo.rss.site_url);
    file.meta.url = url.pathname = path.join(siteCwd, file.meta.slug);
    file.meta.fullurl = url.toString();
    // file.meta.originalpath = path.relative(file.cwd, file.path);

    const { images, titlecard } = await getFileData(cwd, siteCwd);

    file.meta.images = images;
    file.meta.titlecard = titlecard;

    flags.add(titlecard ? 'has-titlecard' : 'no-titlecard');

    if (file.meta['no-title']) {
      flags.add('hide-title');
    } else if (file.meta.title || file.meta.description) {
      flags.add('show-title');
    } else {
      flags.add('hide-title');
    }

    flags.add(file.meta.title ? 'has-title' : 'no-title');
    flags.add(file.meta.subtitle ? 'has-subtitle' : 'no-subtitle');
    flags.add(file.meta.description ? 'has-descrip' : 'no-descrip');

    stream.push(file);
  });
}

function parseTweets () {
  const tweeturl = /https?:\/\/twitter\.com\/(?:#!\/)?(?:\w+)\/status(?:es)?\/(\d+)/i;
  const tweetidcheck = /^\d+$/;
  function parseTweetId (tweetid) {
    // we can't trust an id that isn't a string
    if (typeof tweetid !== 'string') return false;

    const match = tweetid.match(tweeturl);
    if (match) return match[1];
    if (tweetid.match(tweetidcheck)) return tweetid;
    return false;
  }

  return collect.list(async (files) => {
    const twitterBackup = (await fs.readJson(path.join(ROOT, 'twitter-backup.json')).catch(() => {})) || {};
    const twitterCache = (await fs.readJson(path.join(ROOT, 'twitter-cache.json')).catch(() => {})) || {};
    const needed = [];

    // first loop through all posts and gather + validate all tweet ids
    for (const file of files) {
      if (!file.meta.tweets && !file.meta.tweet) continue;

      const tweets = [];

      if (file.meta.tweet) {
        file.meta.tweet = [ file.meta.tweet ].flat(1).map(parseTweetId);
        tweets.push(...file.meta.tweet);
      }

      if (file.meta.tweets) {
        file.meta.tweets = file.meta.tweets.map(parseTweetId);
        tweets.push(...file.meta.tweets);
      }

      for (const id of tweets) {
        if (!twitterCache[id]) {
          needed.push(id);
        }
      }

      file.meta.tweets = tweets;
    }

    // if we have tweets we need to add to the cache, do so
    if (needed.length) {
      log('Fetching tweets: ' + needed.join(', '));
      const arriving = await Promise.all(chunk(uniq(needed), 99).map(twitter));

      const loaded = [];
      for (const tweet of arriving.flat(1)) {
        if (!twitterBackup[tweet.id_str]) twitterBackup[tweet.id_str] = tweet;
        twitterCache[tweet.id_str] = tweetparse(tweet);
        loaded.push(tweet.id_str);
      }

      const absent = difference(needed, loaded);
      for (const id of absent) {
        if (twitterBackup[id]) {
          log('Pulled tweet from backup ' + id);
          twitterCache[id] = tweetparse(twitterBackup[id]);
          continue;
        }
        log.error('Could not find tweet ' + id);
      }
    }

    const media = [];

    // now loop through posts and substitute the tweet data for the ids
    for (const file of files) {
      if (!file.meta.tweets) continue;

      file.meta.tweets = file.meta.tweets.reduce((dict, tweetid) => {
        const tweet = twitterCache[tweetid];
        if (!tweet) log.error(`Tweet ${tweetid} is missing from the cache.`);
        dict[tweetid] = tweet;
        media.push( ...tweet.media );
        return dict;
      }, {});

    }

    await fs.writeFile(path.join(ROOT, 'twitter-media.json'), JSON.stringify(media, null, 2));
    await fs.writeFile(path.join(ROOT, 'twitter-cache.json'), JSON.stringify(twitterCache, null, 2));
    await fs.writeFile(path.join(ROOT, 'twitter-backup.json'), JSON.stringify(twitterBackup, null, 2));

    return files;
  });
}

/** **************************************************************************************************************** **/
