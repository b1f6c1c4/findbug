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

const tc = new transports.Console({
  level: 'notice',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss' }),
    format.colorize({ all: true }),
    format.printf((info) => {
      const msg = chalk`{gray ${info.timestamp}} [${info.label}] ${info.level}: ${info.message}`;
      if (info.data === undefined) {
        return msg;
      }
      if (info.data instanceof Error) {
        return `${msg} ${info.data.stack}`;
      }
      const data = stringify(info.data, null, 2);
      if (data.includes('\n')) {
        return `${msg}\n${data}`;
      }
      return `${msg} ${data}`;
    }),
  ),
});

const logger = createLogger({
  level: 'trace',
  levels: lvls.levels,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.sssZZ' }),
    format.errors({ stack: true }),
    format.printf((info) => {
      const msg = `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
      if (info.data === undefined) {
        return msg;
      }
      if (info.data instanceof Error) {
        return `${msg} ${info.data.stack}`;
      }
      const data = stringify(info.data, null, 2);
      if (data.includes('\n')) {
        return `${msg}\n${data}`;
      }
      return `${msg} ${data}`;
    }),
  ),
  transports: [tc],
});

module.exports = (lbl) => {
  const regularize = (k) => (msg, data, extra) => {
    let message = msg;
    if (message === undefined) {
      message = 'undefined';
    }
    logger.log({
      level: k,
      label: lbl || 'default',
      message,
      data,
      extra,
    });
  };
  const customApi = {};
  customApi.setLevel = (level) => {
    if (level === null) {
      tc.level = 'fatal';
      tc.silent = true;
    } else {
      tc.level = level;
      tc.silent = false;
    }
  };
  customApi.useLogFile = (filename) => {
    logger.add(new transports.File({
      level: 'trace',
      filename,
    }));
  };
  Object.keys(lvls.levels).forEach((level) => {
    customApi[level] = regularize(level);
  });
  return customApi;
};
