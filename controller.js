const readline = require('readline');
const fs = require('fs');
const Bottleneck = require('bottleneck');
const Combinatorics = require('js-combinatorics');
const program = require('./program');
const Lattice = require('./lattice');
const logger = require('./logger')('controller');

/*
module.exports.runInvariant = async (argv, p, runner) => {
  logger.info('Use invariant strategy');
  const overall = (argv.one ? -1 : 0) + 2 ** p.length;
  logger.info('Total search space:', overall);

  const limiter = new Bottleneck({
    maxConcurrent: argv.maxProcs,
  });

  const impl = (dir) => async () => {
    // The starting place
    let N = dir ? (argv.one ? 1 : 0) : p.length;
  };

  const pros = [];
  if (argv.sup) {
    logger.info('Searching upwards');
    pros.push(invariantImpl(true));
  }
  if (argv.inf) {
    logger.info('Searching downwards');
    pros.push(invariantImpl(false));
  }
  await Promise.all(pros);

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
};
*/

const makeLattice = async (argv, N) => {
  logger.debug('Creating lattice');
  const lattice = new Lattice(N);
  if (argv.inf) {
    logger.debug('Register the top of the lattice as true');
    await lattice.report('1'.repeat(N), true);
  }
  if (argv.sup) {
    if (!argv.one) {
      logger.debug('Register the bottom of the lattice as false');
      await lattice.report('0'.repeat(N), false);
    } else {
      logger.debug('Register the bottom of the lattice (at least one parameter) as false');
      for (let i = 0; i < N; i++)
        await lattice.report('0'.repeat(i) + '1' + '0'.repeat(N - i - 1), false);
    }
  } else if (!argv.one) {
    logger.debug('Register the bottom of the lattice as improbable');
    await lattice.report('0'.repeat(N), null);
  }
  return lattice;
};

const run = async (argv, lattice, runner) => {
  const running = {};
  const queue = [];
  await lattice.log();
  const check = async () => {
    if (queue.length)
      logger.debug('Checking reports');
    while (queue.length) {
      const { cfg, result } = queue.splice(0, 1)[0];
      logger.info(`Reporting ${result} to #`, cfg);
      delete running[cfg];
      if (!await lattice.report(cfg, result)) {
        logger.error('Assumption violation found, ignoring the result of #', cfg);
        logger.notice('Execution result of that was:', result);
      } else {
        logger.debug('Report accepted by lattice regarding #', cfg);
      }
    }
  };
  do {
    await check();
    if (Object.keys(running).length < argv.maxProcs) {
      logger.info('Asking for the next moves:', Object.keys(running).length, argv.maxProcs);
    } else {
      logger.debug('No more execution slots:', argv.maxProcs);
      logger.debug('Waiting for an execution to finish');
      await Promise.race(Object.values(running).map((r) => r.promise));
    }
    while (Object.keys(running).length < argv.maxProcs) {
      await check();
      logger.debug('Calling lattice.next()');
      const n = await lattice.next();
      if (!n) {
        logger.debug('No more suggestions, waiting for existing executions to finish');
        break;
      }
      if (n.cancel.length) {
        logger.info('Cancelling # trival executions:', n.cancel.length);
        n.cancel.forEach((c) => {
          const r = running[c];
          if (r && r.token && r.token.cancel) {
            r.token.cancel();
            delete running[c];
          } else {
            logger.warning('Execution already quitted:', c);
          }
        });
      }
      logger.info('Starting new execution:', n.start);
      runner(n.start, running[n.start] = {}, queue);
    }

    await lattice.log();
    if (!argv.exhaust) {
      if (lattice.summary.suprema || lattice.summary.infima) {
        logger.info('Supremum / Infimum found, stop running');
        break;
      }
    }
  } while (Object.keys(running).length);
  logger.info('No more running executions, start post-processing');

  if (argv.sup) {
    if (lattice.summary.suprema) {
      logger.notice('Number of found suprema:', lattice.summary.suprema);
    } else {
      logger.warning('No supremum found');
    }
  }
  if (argv.inf) {
    if (lattice.summary.infima) {
      logger.notice('Number of found infima:', lattice.summary.infima);
    } else {
      logger.warning('No infimum found');
    }
  }
};

const flow = (reverse) => async (argv, pars) => {
  const pick = (c) => pars.filter((v, i) => c[i] === '1');
  const lattice = await makeLattice(argv, pars.length);
  await run(argv, lattice, async (cfg, exec, queue) => {
    exec.token = {};
    exec.promise = program.execute(argv, pick(cfg), cfg, exec.token);
    const result = await exec.promise;
    switch (result) {
      case 'cancel':
        logger.debug('Dropping cancellation report of #', cfg);
        break;
      case 'success':
      case 'fail':
        const r = !!((result === 'success') ^ reverse);
        logger.debug(`Will report ${r} for #`, cfg);
        queue.push({ cfg, result: r });
        break;
      case 'error':
        logger.debug('Will report improbable for #', cfg);
        queue.push({ cfg, result: null });
        break;
    }
  });
  if (argv.sup) {
    lattice.suprema.forEach((c) => {
      logger.info('Found supremum:', c);
      logger.notice('Found supremum:', pick(c));
    });
  }
  if (argv.inf) {
    lattice.infima.forEach((c) => {
      logger.info('Found infimum:', c);
      logger.notice('Found infimum:', pick(c));
    });
  }
  logger.info('All steps completed');
};

module.exports.covariant = flow(false);
module.exports.contravariant = flow(true);
