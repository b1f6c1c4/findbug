const readline = require('readline');
const fs = require('fs');
const Bottleneck = require('bottleneck');
const Combinatorics = require('js-combinatorics');
const logger = require('./logger')('parameter');

module.exports.parse = async ({ argFile, argsAsPars, args }) => {
  let res;
  if (argsAsPars) {
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
  logger.notice('Got # of parameters:', res.length);
  logger.trace('Parameters:', res);
  return res;
};

module.exports.runInvariant = async (argv, p, runner) => {
  logger.info('Use invariant strategy');
  const overall = (argv.one ? -1 : 0) + 2 ** p.length;
  logger.info('Total cases:', overall);
  const limiter = new Bottleneck({
    maxConcurrent: argv.maxProcs,
  });
  logger.info('Started enumeration');
  const cmb = Combinatorics.power(p);
  logger.info('Finished enumeration');
  const obj = { success: 0, fail: 0, error: 0 };
  cmb.forEach((ps) => {
    if (argv.one && !ps.length) return;
    limiter.schedule(async (pp) => {
      const res = await runner(pp);
      obj[res]++;
    }, ps, null);
  });
  await new Promise((resolve) => {
    const fun = () => {
      if (limiter.empty()) {
        resolve();
      } else {
        setTimeout(fun, 100);
      }
    };
    fun();
  });
  logger.notice('Total success:', obj.success);
  logger.notice('Total fail:', obj.fail);
  logger.notice('Total error:', obj.error);
};
