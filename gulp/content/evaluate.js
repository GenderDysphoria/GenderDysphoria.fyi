const { sortBy } = require('lodash');
const { resolve } = require('./resolve');
const log = require('fancy-log');
const Promise = require('bluebird');
const fs = require('fs-extra');

const LOG = {
  new:     true,
  update:  true,
  skip:    true,
  rebuild: true,
  cached:  false,
  copy:    false,
};

module.exports = exports = async function process (tasks, cache) {
  const lastSeen = new Date();

  await Promise.map(sortBy(tasks, [ 'input', 'output' ]), async (task) => {
    let result;
    let status = await cache.get(task);
    const { input, output } = task;
    const taskLog = [ status.mode, status.input, status.output ];
    if (status.mode === 'skip') {
      await cache.touch(task, lastSeen);
      if (taskLog && LOG[taskLog[0]]) log.info(...taskLog);
      return status;
    }

    if (status.mode === 'cached') {
      result = status.cache;
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
      fs.writeFile(resolve('dist', status.revPath), result);
    }

  }, { concurrency: 1 });

};
