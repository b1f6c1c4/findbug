const { createLogger, format, transports } = require('winston');
const stringify = require('json-stringify-safe');

const levels = {
  debug: 0,
  info: 1,
  notice: 2,
  warning: 3,
  error: 4,
};

const logger = createLogger({
  level: 'notice',
  levels,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.sssZZ' }),
    format.errors({ stack: true }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.sssZZ' }),
        format.errors({ stack: true }),
        format.colorize(),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
      ),
    }),
  ],
});

const make = (level) => function (...args) {
  this.log({
    level,
    message: args.reduce((so, o) => {
      let s;
      if (o !== null && typeof o === 'object')
        s = stringify(o, null, 2);
      else
        s = '' + o;
      if (so === undefined)
        return s;
      return so + ' ' + s;
    }, undefined),
  });
};

module.exports = logger;
module.exports.useLogFile = (filename) => {
  logger.add(new transports.File({ filename }));
};
Object.keys(levels).forEach((level) => {
  module.exports[level] = make(level);
});
