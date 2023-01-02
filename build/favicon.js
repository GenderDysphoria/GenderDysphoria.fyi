
const fs = require('fs-extra');
const actions = require('./actions');
const { resolve } = require('./resolve');

function any (input) {
  for (const i of input) if (i) return i;
  return false;
}

const MATCHES = [
  'favicon.png',
  'favicon.gif',
  'favicon.jpeg',
  'favicon.jpg',
];

module.exports = exports = async function favicon () {

  const input = any(await Promise.all(
    MATCHES.map((f) =>
      fs.exists(resolve(f)).then((y) => y && f)
    )
  ));

  if (!input) return [];

  // input = resolve(input);
  const tasks = [ 32, 57, 64, 76, 96, 114, 120, 128, 144, 152, 180, 192, 196, 228 ].map((width) => ({
    input,
    output: `favicon${width}.png`,
    format: 'png',
    width,
    action: actions.image,
  }));

  tasks.push({
    input,
    output: 'favicon.ico',
    format: 'ico',
    action: actions.image,
  });

  return tasks;
};
