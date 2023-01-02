
const { flatten } = require('lodash');

module.exports = exports = function (md) {
  md.core.ruler.push(
    'modify-token',
    (state) => {
      state.tokens = flatten(state.tokens.map(descend).filter(Boolean));
      return false;
    }
  );
};

function descend (token) {

  switch (token.type) {
  case 'link_open':
  case 'link_close':
  case 'html_block':
    return false;

  case 'heading_open':
    token.type = 'paragraph_open';
    token.tag = 'p';
    token.markup = '';
    return token;

  case 'heading_close':
    token.type = 'paragraph_close';
    token.tag = 'p';
    token.markup = '';
    return token;

  case 'image':
  case 'container':
    return token.children;

  default:

    if (token.children && token.children.length) {
      token.children = flatten(token.children.map(descend).filter(Boolean));
    }

    return token;
  }
}
