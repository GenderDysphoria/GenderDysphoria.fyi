/* eslint-disable no-console, no-process-exit, n/no-process-exit */
/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */

const argv = require('minimist')(process.argv.slice(2));
const thread = require('./build/twitter-thread');

const [ tweet ] = argv._;
thread(tweet).then(
  ([ embeds, dependencies ]) => {
    console.log(dependencies.map((id) => `\n - '${id}'`).join(''));
    console.log(`
{!{
{{import '~/tweet' ids=[${embeds.map((id) => `\n  '${id}'`).join('')}
] tweets=meta.tweets className="oneblock card span2 left" }}
}!}
`);
    process.exit(0);
  }, (err) => {
    console.error(err);
    process.exit(1);
  }
);
