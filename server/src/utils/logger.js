'use strict';

const cfg = require('../config.js');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const cur = LEVELS[cfg.logLevel] === undefined ? 2 : LEVELS[cfg.logLevel];

function ts() {
  return new Date().toISOString();
}

function out(level, args) {
  if (LEVELS[level] > cur) return;
  const line = `[${ts()}] [${level.toUpperCase()}]`;
  if (level === 'error') console.error(line, ...args);
  else console.log(line, ...args);
}

module.exports = {
  error: (...a) => out('error', a),
  warn: (...a) => out('warn', a),
  info: (...a) => out('info', a),
  debug: (...a) => out('debug', a)
};
