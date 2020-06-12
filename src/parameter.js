const readline = require('readline');
const path = require('path');
const fs = require('fs');
const Bottleneck = require('bottleneck');
const Combinatorics = require('js-combinatorics');
const logger = require('./logger')('parameter');

module.exports.parse = async ({ argFile, inPlace, args }) => {
  let res;
  if (inPlace) {
    logger.info('Using arguments as parameters');
    res = [...args];
    args.length = 0;
    logger.debug('argv.args was cleared:', args);
  } else {
    let input;
    if (!argFile) {
      logger.info('Reading parameters from stdin');
      input = process.stdin;
    } else {
      input = await new Promise((resolve, reject) => {
        logger.info('Reading parameters from file:', argFile);
        const s = fs.createReadStream(argFile);
        s.on('open', () => {
          logger.debug('File opened:', argFile);
          resolve(s);
        });
        s.on('error', reject);
      });
    }
    const rl = readline.createInterface({
      input,
    });
    res = await new Promise((resolve) => {
      const res = [];
      rl.on('line', (line) => {
        logger.trace('Line received:', line);
        res.push(line);
      });
      rl.on('close', () => {
        logger.debug('Line read finished');
        resolve(res);
      });
    });
  }
  logger.notice('Number of parameters:', res.length);
  logger.trace('Parameters:', res);
  return res;
};

module.exports.hash = (argv, cfg) => {
  const program = path.parse(argv.program).base;
  if (cfg.length <= 16 * 1)
    return `${program}-${cfg.length}-0b${cfg}`;
  if (cfg.length <= 16 * 2)
    return `${program}-${cfg.length}-0o${BigInt('0b'+cfg).toString(4)}`;
  if (cfg.length <= 16 * 3)
    return `${program}-${cfg.length}-0o${BigInt('0b'+cfg).toString(8)}`;
  if (cfg.length <= 16 * 4)
    return `${program}-${cfg.length}-0x${BigInt('0b'+cfg).toString(16)}`;
  return `${program}-${cfg.length}-0t` +
    cfg.match(/.{1,80}/g).map((c) => BigInt('0b'+c).toString(32)).join('');
};
