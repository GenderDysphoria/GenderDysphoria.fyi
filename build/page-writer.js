const path = require('path');
const Promise = require('bluebird');
const fs = require('fs-extra');
const getEngines = require('./engines');
const { resolve, ROOT, ENGINE } = require('./resolve');
const { siteInfo }  = require(resolve('package.json'));

module.exports = exports = async function writePageContent (pages, posts, prod) {
  const engines = await getEngines(prod);
  const postIndex = await processPages(engines, posts, null, prod);
  await processPages(engines, pages, posts, prod);
  return postIndex;
};

function processPages (engines, pages, posts, prod) {
  return Promise.map(pages, async (page) => {
    // page = new Page(page);

    var data = {
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

    const json = {
      url: page.url,
      fullurl: page.fullurl,
      title: page.meta.title,
      subtitle: page.meta.subtitle,
      description: page.meta.description,
      date: page.dateCreated,
      titlecard: page.titlecard,
      tags: page.meta.tags,
      author: page.meta.author,
    };

    const html = String(engines[page.engine](data.source, data));
    if (page.engine === ENGINE.MARKDOWN) {
      json.preview = String(engines.MARKDOWN_PREVIEW(data.source, data));
      page.content = String(engines.MARKDOWN_CONTENT(data.source, data));
      json.content = page.content;
    }

    const output = resolve('dist', page.out);
    await fs.ensureDir(path.dirname(output));
    await Promise.all([
      fs.writeFile(output, Buffer.from(html)),
      page.json && fs.writeFile(resolve('dist', page.json), Buffer.from(
        prod ? JSON.stringify(json) : JSON.stringify(json, null, 2),
      )),
    ]);

    return !page.draft && {
      url: page.url,
      json: page.json,
      title: page.meta.title,
      subtitle: page.meta.subtitle,
      description: page.meta.description,
      date: page.dateCreated,
      tags: page.meta.tags,
      author: page.meta.author,
    };
  });
}
