
var { promisify } = require('util');
const glob = require('glob');
module.exports = exports = promisify(glob);
