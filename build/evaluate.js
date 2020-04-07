const { sortBy, uniqBy } = require('lodash');
const { resolve } = require('./resolve');
const log = require('fancy-log');
const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');

const LOG = {
  new:     true,
  update:  true,
  skip:    true,
  rebuild: true,
  cached:  false,
  copy:    false,
  silent:  false,
};

module.exports = exports = async function process (tasks, cache) {
  const lastSeen = new Date();

  tasks = uniqBy(tasks, 'output');
  tasks = sortBy(tasks, [ 'input', 'output' ]);

  await Promise.map(tasks, async (task) => {
    let result;
    let status = await cache.get(task);
    const { input, output } = task;
    const taskLog = [ status.mode, (status.why ? status.why : ''), status.input, status.output ];
    if (status.mode === 'skip') {
      await cache.touch(task, lastSeen);
      if (taskLog && LOG[taskLog[0]]) log.info(...taskLog);
      return status;
    }

    if (status.mode === 'cached') {
      result = status.cache;
      await fs.ensureDir(path.dirname(resolve('dist', output)));
      await fs.writeFile(resolve('dist', output), result);
      await cache.touch(task, lastSeen);
    } else {
      try {
        result = await task.action({
          ...task,
          input,
          output: 'dist/' + output,
        });
      } catch (err) {
        log.error(`Task (${task.action.name}) failed for file ${output}.\n`, err);
        return false;
      }

      status = await cache.set(task, result, lastSeen);
    }
    if (taskLog && LOG[taskLog[0]]) log.info(...taskLog);

    if (cache.isProd) {
      await fs.writeFile(resolve('dist', status.revPath), result);
    }

  }, { concurrency: 20 });

};
