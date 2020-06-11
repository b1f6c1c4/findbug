const readline = require('readline');
const fs = require('fs');
const Bottleneck = require('bottleneck');
const Combinatorics = require('js-combinatorics');
const parameter = require('./parameter');
const program = require('./program');
const Lattice = require('./lattice');
const logger = require('./logger')('controller');

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
      const hash = parameter.hash(argv, n.start);
      logger.info('Starting new execution:', n.start);
      runner(n.start, hash, running[n.start] = {}, queue);
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

const picks = (pars, val) => (c) => pars.filter((v, i) => c[i] === val);

const flow = (reverse) => async (argv, pars) => {
  logger.info('Use lattice strategy');
  const pick = picks(pars, '1');
  const lattice = await makeLattice(argv, pars.length);

  const counter = {};
  const lcounter = [];
  const startTime = +new Date();
  await run(argv, lattice, async (cfg, hash, exec, queue) => {
    exec.token = {};
    const ps = pick(cfg);
    exec.promise = program.execute(argv, ps, hash, exec.token);
    const res = await exec.promise;
    if (!lcounter[ps.length]) {
      lcounter[ps.length] = {};
    }
    counter[res] = (counter[res] || 0) + 1;
    lcounter[ps.length][res] = (lcounter[ps.length][res] || 0) + 1;
    switch (res) {
      case 'cancel':
        logger.debug('Dropping cancellation report of #', hash);
        break;
      case 'success':
      case 'fail':
        const r = !!((res === 'success') ^ reverse);
        logger.debug(`Will report ${r} for #`, hash);
        queue.push({ cfg, result: r });
        break;
      case 'disaster':
      case 'error':
        logger.debug('Will report improbable for #', hash);
        queue.push({ cfg, result: null });
        break;
    }
  });
  const endTime = +new Date();

  if (argv.sup) {
    lattice.suprema.forEach((c) => {
      logger.info('Found supremum:', c);
      logger.notice('Found supremum:', {
        hash: parameter.hash(argv, c),
        p: pick(c),
      });
    });
  }
  if (argv.inf) {
    lattice.infima.forEach((c) => {
      logger.info('Found infimum:', c);
      logger.notice('Found infimum:', {
        hash: parameter.hash(argv, c),
        p: pick(c),
      });
    });
  }

  logger.notice('Summary of execution:', counter);
  logger.info('Summary of execution by level:', lcounter);

  logger.info('All steps completed, drafting report');
  const report = {
    version: process.env.npm_package_version,
    versions: process.versions,
    argv,
    pars,
    startTime,
    endTime,
    duration: endTime - startTime,
    counter,
    lcounter,
    summary: lattice.summary,
    suprema: lattice.suprema.map(pick),
    infima: lattice.infima.map(pick),
  };
  logger.trace('Report:', report);
  return report;
};

module.exports.covariant = flow(false);
module.exports.contravariant = flow(true);

module.exports.invariant = async (argv, pars) => {
  logger.info('Use brute-force strategy');
  const limiter = new Bottleneck({
    maxConcurrent: argv.maxProcs,
  });
  const pick = picks(pars, true);

  const startTime = +new Date();
  logger.info('Started enumeration');
  await new Promise((resolve) => { setTimeout(resolve, 10); });
  const cmb = Combinatorics.baseN([false, true], pars.length);
  logger.info('Finished enumeration');

  const counter = {};
  const lcounter = [];
  const results = {};
  const promises = [];
  cmb.forEach((acfg) => {
    const ps = pick(acfg);
    if (argv.one && !ps.length) return;
    promises.push(limiter.schedule(async () => {
      const cfg = acfg.map((v) => v ? '1' : '0').join('');
      const res = await program.execute(argv, ps, parameter.hash(argv, cfg));
      if (!results[res]) {
        counter[res] = 0;
        results[res] = [];
      }
      counter[res]++;
      if (!lcounter[ps.length]) {
        lcounter[ps.length] = {};
      }
      lcounter[ps.length][res] = (lcounter[ps.length][res] || 0) + 1;
      results[res].push({ hash, p: ps });
    }, null));
  });
  await Promise.all(promises);
  const endTime = +new Date();

  logger.notice('Summary of execution:', counter);
  logger.info('Summary of execution by level:', lcounter);

  logger.info('All steps completed, drafting report');
  const report = {
    version: process.env.npm_package_version,
    versions: process.versions,
    argv,
    pars,
    startTime,
    endTime,
    duration: endTime - startTime,
    counter,
    lcounter,
    ...results,
  };
  logger.trace('Report:', report);
  return report;
};
