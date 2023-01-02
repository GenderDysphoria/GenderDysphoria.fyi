const { sortBy, uniqBy } = require('lodash');
const { resolve } = require('./resolve');
const log = require('fancy-log');
const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const actions = require('./actions');

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
    const taskLog = [ status.mode, (status.why ? status.why : ''), status.action, status.input, status.output ];

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
        if (status.duplicate && await fs.pathExists(status.duplicate)) {
          try {
            result = await actions.copy({
              input: status.duplicate,
              output: 'dist/' + output,
            });
            log.info(...taskLog, `Task (${task.action.name}) failed for file ${output}, fell back to saved duplicate ${status.duplicate}`);
          } catch (err2) {
            log.error(...taskLog, `Task (${task.action.name}) failed for file ${output}, ${status.duplicate} could not be copied.\n\t${err.message}`);
            return false;
          }
        } else {
          log.error(`Task (${task.action.name}) failed for file ${output}.\n`, err);
          return false;
        }
      }

      status = await cache.set(task, result, lastSeen);
    }
    if (taskLog && LOG[taskLog[0]]) log.info(...taskLog);

    // if (cache.isProd && status.revPath) {
    //   await fs.writeFile(resolve('dist', status.revPath), result);
    // }

  }, { concurrency: 20 });

};
