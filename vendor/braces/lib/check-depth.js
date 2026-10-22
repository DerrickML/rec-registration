'use strict';

// Bound recursive walkers before they can exhaust the JavaScript call stack.
module.exports = depth => {
  if (depth > 128) {
    const error = new RangeError('braces nesting depth exceeds safety limit (128)');
    error.code = 'ERR_BRACES_MAX_DEPTH';
    throw error;
  }
};
