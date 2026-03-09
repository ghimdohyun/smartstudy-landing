// Use platform-native DOMException (available since Node 18)
// This stub replaces the deprecated `node-domexception` package.
"use strict";
module.exports = globalThis.DOMException ??
  class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name ?? "Error";
    }
  };
