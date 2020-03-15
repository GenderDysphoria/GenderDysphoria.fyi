
module.exports = exports = function (md, options) {

  options = {
    fence: 'æææ',
    ...options,
  };

  function debug (...args) {
    if (options.debug) console.log(...args); // eslint-disable-line
  }

  const fenceLen = options.fence.length;
  // const fenceFirst = options.fence.charCodeAt(0);

  function scanAhead (state, line, pos) {
    const position = state.src.indexOf(options.fence, pos);
    if (position === -1) {
      // there are no html blocks in this entire file
      state.discreteHtmlScan = {
        present: false,
      };
      return false;
    }

    while (position > state.eMarks[line]) {
      line++;
    }

    state.discreteHtmlScan = {
      present: true,
      position,
      line,
    };

    return true;
  }

  md.block.ruler.before('fence', 'raw', (state, startLine, lastLine) => {
    let pos = state.bMarks[startLine] + state.tShift[startLine];
    let endOfLine = state.eMarks[startLine];

    // if we have yet to do a scan of this file, perform one.
    if (!state.discreteHtmlScan && !scanAhead(state, startLine, pos)) {
      debug('First scan, nothing found');
      return false;
    }

    if (!state.discreteHtmlScan.present) {
      debug('Have scanned, did not find');
      return false;
    }

    // add one to the line here in case there is a line break in a paragraph.
    if (state.discreteHtmlScan.line > startLine + 1) {
      debug('Have scanned, found, but after this line', { startLine, targetLine: state.discreteHtmlScan.line });
      return false;
    }

    if (startLine > state.discreteHtmlScan.line) {
      // we dun fucked up, rescan
      scanAhead(state, startLine, pos);
      debug('We somehow got ahead of ourselves', { startLine, line: state.discreteHtmlScan.line, lastLine, pos, endOfLine, tokens: state.tokens });
      throw new Error('markdown-it-discrete-html encountered a parsing error.');
    }

    // at this point we should be on a line that contains a fence mark
    debug({ l: 67, startLine, scan: state.discreteHtmlScan });

    let openIndex, closer, nextLine;
    openIndex = state.discreteHtmlScan.position;
    do {
      let token, closeIndex;
      const tokens = [];
      const preBlock = openIndex > pos && state.src.slice(pos, openIndex);
      debug({ l: 76, preBlock, startLine, lastLine });
      openIndex += fenceLen;
      pos = openIndex;

      if (preBlock && !!preBlock.trim()) {
        md.block.parse(preBlock, md, state.env, tokens);

        switch (tokens[tokens.length - 1].type) {
        case 'heading_close':
        case 'paragraph_close':
          closer = tokens.pop();
          // fallthrough
        default:
          state.tokens.push(...tokens);
        }
      }

      debug({ l: 93, tokens });

      // find terminating fence
      if (!scanAhead(state, startLine, pos)) {
        debug({ l: 97, remaining: state.src.slice(pos) });
        // console.error(state.src)
        throw new Error(`Could not find terminating "${options.fence}" for a raw html block.`);
      }

      closeIndex = state.discreteHtmlScan.position;
      nextLine = state.discreteHtmlScan.line;

      if (nextLine === startLine) nextLine++;
      endOfLine = state.eMarks[nextLine];

      const content = state.src.substring(openIndex, closeIndex);
      closeIndex += fenceLen;
      pos = closeIndex;

      if (content.trim()) {
        token = state.push(closer ? 'html_inline' : 'html_block', '', 0);
        token.map     = [ startLine, nextLine ];
        token.content = content;
        token.block = true;
        debug({ l: 115, tokens: [ token ], nextLine, pos, endOfLine: state.eMarks[nextLine], len: state.src.length, remaining: state.src.slice(pos) }); // eslint-disable-line
      }

      if (pos === endOfLine) {
        // we have ended this line, nothing more to do here.
        if (closer) {
          state.tokens.push(closer);
          debug({ l: 122, tokens: [ closer ] });
        }
        state.discreteHtmlScan = null;
        state.line = nextLine + 1;
        return true;
      }

      // still more left in this line, see if there is another block
      if (scanAhead(state, nextLine, pos)) {
        // we found another block, but it isn't on this line, so break out.
        if (state.discreteHtmlScan.line > nextLine) {
          if (closer) {
            state.tokens.push(closer);
            debug({ l: 135, tokens: [ closer ] });
          }
          state.line = nextLine + 1;
          return true;
        }

        // next block is on this line, grab everything between here and there
        openIndex = state.discreteHtmlScan.position;
      } else {
        // no more blocks on this line, grab everything between here and the end of the line
        openIndex = endOfLine;
      }
      debug({ l: 147, pos, openIndex, remaining: state.src.slice(pos) });

      const postBlock = state.src.slice(pos, openIndex);
      token = null;
      if (postBlock.trim()) {
        token          = state.push('inline', '', 0);
        token.content  = postBlock;
        token.map      = [ nextLine, nextLine ];
        token.children = [];
        tokens.push(token);
      }
      debug({ l: 158, tokens: [ token ], postBlock, pos, openIndex, closeIndex, endOfLine });

      pos = openIndex;
      startLine = nextLine + 1;
      endOfLine = state.eMarks[startLine];

      debug({ l: 164, pos, startLine, endOfLine, remaining: state.src.slice(pos), scan: state.discreteHtmlScan });
    } while (pos < endOfLine && state.discreteHtmlScan.present);

    if (closer) {
      state.tokens.push(closer);
      debug({ l: 169, tokens: [ closer ] });
    }

    openIndex += fenceLen;
    pos = openIndex;

    state.line = startLine;
    return true;
  });

};

