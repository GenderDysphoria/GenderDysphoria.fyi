
module.exports = exports = {
  plugins: [
    [ '@babel/plugin-proposal-class-properties', { loose: true } ],
  ],
  presets: [
    [ '@babel/preset-env', {
      // useBuiltIns: 'usage',
    } ],
    'preact',
  ],
};
