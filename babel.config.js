
module.exports = exports = {
  plugins: [
    [ '@babel/plugin-proposal-class-properties', { loose: true } ],
    [ '@babel/plugin-proposal-private-property-in-object', { loose: true } ],
    [ '@babel/plugin-proposal-private-methods', { loose: true } ],
  ],
  presets: [
    [ '@babel/preset-env', {
      // useBuiltIns: 'usage',
    } ],
    'preact',
  ],
};
