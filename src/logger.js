const { addColors, createLogger, format, transports } = require('winston');
const chalk = require('chalk');
const stringify = require('json-stringify-safe');

const lvls = {
  levels: {
    fatal: 0,
    error: 1,
    warning: 2,
    notice: 3,
    info: 4,
    debug: 5,
    trace: 6,
  },
  colors: {
    fatal: 'underline dim red',
    error: 'bold red',
    warning: 'bold yellow',
    notice: 'brightMagenta',
    info: 'brightGreen',
    debug: 'dim cyan',
    trace: 'gray',
  },
};

addColors(lvls);

const fmt = (color) => (info) => {
  let msg = color
    ? chalk`{gray ${info.timestamp}} [${info.label}] ${info.level}: ${info.message}`
    : `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
  if (info.data === undefined) {
    return msg;
  }
  info.data.forEach((d, i) => {
    if (d instanceof Error) {
      msg = `${msg} ${d.stack}`;
    } else {
      const data = stringify(d, null, 2);
      if (data && data.includes('\n')) {
        msg = `${msg}\n${data}`;
      } else if (i) {
        msg = `${msg} / ${data}`;
      } else {
        msg = `${msg} ${data}`;
      }
    }
  });
  return msg;
};

const tc = new transports.Console({
  level: 'notice',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss' }),
    format.colorize({ all: true }),
    format.printf(fmt(true)),
  ),
});
let tf = [];

const logger = createLogger({
  level: 'trace',
  levels: lvls.levels,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.sssZZ' }),
    format.errors({ stack: true }),
    format.printf(fmt(false)),
  ),
  transports: [tc],
});

let gsLevel = 'notice';
let gLevel = lvls.levels[gsLevel];

module.exports = (lbl) => {
  const regularize = (k) => (msg, ...data) => {
    let message = msg;
    if (message === undefined) {
      message = 'undefined';
    }
    logger.log({
      level: k,
      label: lbl || 'default',
      message,
      data,
    });
  };
  const customApi = { };
  customApi.getLevel = () => gLevel;
  customApi.setLevel = (level) => {
    if (level === null) {
      gLevel = -1;
      tc.level = gsLevel = 'fatal';
      tf.forEach((t) => { t.level = 'fatal'; });
      tc.silent = true;
    } else {
      gLevel = lvls.levels[level];
      tc.level = gsLevel = level;
      tf.forEach((t) => { t.level = level; });
      tc.silent = false;
    }
  };
  customApi.useLogFile = (filename) => {
    const t = new transports.File({
      level: gsLevel,
      filename,
    });
    tf.push(t);
    logger.add(t);
  };
  Object.keys(lvls.levels).forEach((level) => {
    customApi[level] = regularize(level);
  });
  return customApi;
};
