const path = require('path');
const Promise = require('bluebird');
const fs = require('fs-extra');
const { map, uniq } = require('lodash');
const { resolve, ROOT } = require('./resolve');
const { siteInfo }  = require(resolve('package.json'));
const log = require('fancy-log');


module.exports = exports = async function writePageContent (engines, pages, posts, prod) {
  const postIndex = index(posts, engines);
  await processPages(engines, [ ...posts, ...pages ], postIndex, prod);
  postIndex.latest = { ...pageJSON(postIndex.latest), content: postIndex.latest.content };
  return postIndex;
};

function index (posts, engines) {
  posts = posts.filter((p) => !p.draft);

  siblings(posts);

  // fill in post content
  posts.forEach((p) => { p.content = engines[p.type](p.source, pageState(p)); });

  const reducedPosts = posts.map(pageJSON);

  const authors = uniq(map(reducedPosts, 'author').flat()).sort((a, b) => (a.toUpperCase() > b.toUpperCase() ? 1 : -1));

  const tagMap = reducedPosts.reduce((o, p) => Object.assign(o, p.tags), {});
  const tags = Object.keys(tagMap).sort().reduce((result, tagslug) => {
    result[tagslug] = tagMap[tagslug];
    return result;
  }, {});

  return {
    posts: reducedPosts,
    authors,
    tags,
    latest: posts[0],
  };
}

function siblings (posts) {
  let first, prev, next, last;
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    first = i > 0 && posts[0];
    prev = posts[i - 1] || false;
    next = posts[i + 1] || false;
    last = i < posts.length - 1 && posts[posts.length - 1];

    post.siblings = {
      first: first && first.url,
      prev: prev && prev.url,
      next: next && next.url,
      last: last && last.url,
    };
  }
}

function pageState (page, posts) {
  return {
    ...page,
    meta: { ...page.meta, ...page },
    page: {
      domain: siteInfo.domain,
      title: page.meta.title
        ? (page.meta.title + (page.meta.subtitle ? ', ' + page.meta.subtitle : '') + ' :: ' + siteInfo.title)
        : siteInfo.title,
      description: page.meta.description || siteInfo.description,
    },
    site: siteInfo,
    local: {
      cwd: resolve(page.cwd),
      root: ROOT,
      basename: page.basename,
    },
    posts,
  };
}

function pageJSON (post) {
  return {
    id: post.id,
    url: post.url,
    fullurl: post.fullurl,
    json: '/' + post.json,
    title: post.meta.title,
    subtitle: post.meta.subtitle,
    description: post.meta.description,
    date: post.dateCreated,
    titlecard: post.titlecard,
    tags: post.meta.tags,
    author: post.meta.author,
    siblings: post.siblings,
  };
}

function processPages (engines, pages, posts, prod) {
  return Promise.map(pages, async (page) => {

    const state = pageState(page, posts);
    const json = pageJSON(page);

    try {
      var html = String(engines[page.engine](page.source, state));
    } catch (e) {
      throw new Error(`Error while processing page "${page.input}": ${e.message}`);
    }

    json.content = page.content;

    const output = resolve('dist', page.out);
    await fs.ensureDir(path.dirname(output));
    await Promise.all([
      fs.writeFile(output, Buffer.from(html)),
      page.json && fs.writeFile(resolve('dist', page.json), Buffer.from(
        prod ? JSON.stringify(json) : JSON.stringify(json, null, 2),
      )),
    ]);
  });
}
