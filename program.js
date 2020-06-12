const path = require('path');
const fs0 = require('fs');
const cp = require('child_process');
const timespan = require('timespan-parser');
const logger = require('./logger')('program');

const fs = { ...fs0.promises, constants: fs0.constants };

module.exports.execute = async (argv, p, hash, token = {}) => {
  let cancelled = false;
  token.cancel = () => { cancelled = true };

  logger.notice('Preparing for execution #', hash);
  logger.info('# of active parameters:', p.length, hash);
  logger.trace('Active parameters:', hash, p);
  let a = [...argv.args];
  logger.debug('# of fixed arguments:', a.length, hash);
  if (argv.split) {
    logger.debug('Splitting parameters into arguments', hash);
    p.forEach((pv) => { a.push(...pv.split(argv.splitBy)); }); // TODO: better split method
  } else if (argv.xargs) {
    logger.debug('Putting parameters into arguments', hash);
    a.push(...p);
  } else {
    logger.debug('Will be putting parameters into stdin', hash);
  }
  logger.debug('# of total arguments:', a.length, hash);
  logger.trace('List of arguments:', hash, a);

  const fnout = argv.recordStdout && path.join(argv.output, hash + '.out');
  const fnerr = argv.recordStderr && path.join(argv.output, hash + '.err');
  const fnres = argv.cache && path.join(argv.output, hash + '.res');

  if (fnres) {
    try {
      await fs.access(fnres, fs.constants.R_OK);
      logger.info('Cache file found for execution #', hash);
      const res = await fs.readFile(fnres, 'utf-8');
      logger.notice('Result for (cached) execution:', res, hash);
      return res;
    } catch (e) {
      logger.debug('Cache file not found for execution #', hash, e);
    }
  }

  if (fnout || fnerr)
  logger.debug('Opening sink files for execution #', hash);
  const fout = fnout && await fs.open(fnout, 'w', 0o644);
  const ferr = fnerr && await fs.open(fnerr, 'w', 0o644);

  logger.info('Spawning program for #', hash);
  const t = +new Date();
  let res;
  let resolved = false;
  try {
    res = await new Promise((resolve) => {
      if (cancelled) {
        logger.warning('Cancelled before spawn for #', hash);
        resolve('cancel');
        return;
      }

      const prog = cp.spawn(argv.program, a, {
        cwd: argv.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
        windowsHide: true,
      });

      token.cancel = () => {
        cancelled = true;
        logger.info('Received cancellation request for #', hash);
        if (prog.exitCode !== null) {
          logger.warning('When cancelling, the program already exited with', prog.exitCode, hash);
        }
        resolve('cancel');
      };

      const check = (force) => {
        token.cancel = () => { };
        if (force || prog.killed) {
          switch (argv.timeout) {
            case 'fail':
              logger.info('Program timeout (-> failure) during #', hash);
              resolve('fail');
              break;
            case 'error':
              logger.warning('Program timeout (-> error) during #', hash);
              resolve('error');
              break;
            default:
              logger.error('This should not happen', hash, new Error());
              resolve('error');
              break;
          }
        } else {
          switch (prog.exitCode ? argv.nonZero : argv.zero) {
            case 'fail':
              logger.info(`Exit code ${prog.exitCode} (-> failure) during #`, hash);
              resolve('fail');
              break;
            case 'error':
              logger.warning(`Exit code ${prog.exitCode} (-> error) during #`, hash);
              resolve('error');
              break;
            default:
              logger.debug(`Exit code ${prog.exitCode} (ignored) during #`, hash);
              break;
          }
          resolve('success');
        }
      };

      let to;
      if (argv.timeLimit) {
        to = setTimeout(() => {
          if (prog.exitCode !== null) {
            logger.warning('Looks like the program has already exited with', prog.exitCode, hash);
            return;
          }
          logger.notice('Sending SIGTERM to the timeout program', hash);
          if (!prog.kill()) {
            logger.warning('SIGTERM did not work, will try SIGKILL later', hash);
            setTimeout(() => {
              if (prog.exitCode === null) {
                logger.warning('Sending SIGKILL to the timeout program', hash);
                if (!prog.kill('SIGKILL')) {
                  logger.error('Still not working, giveup; please kill yourself:', prog.pid, hash);
                  check(true);
                }
              }
            }, 1000);
          }
        }, argv.timeLimit);
      }

      let stdoutGot;
      prog.stdout.on('data', async (data) => {
        try {
          if (fnout && !resolved) {
            logger.trace('Pipe stdout data to sink file', hash);
            await fs.writeFile(fout, data);
          }
        } catch (e) {
          logger.warning('Cannot write to sink files', hash, e);
        }
        if (!stdoutGot) {
          switch (argv.stdout) {
            case 'fail':
              logger.info('Received data from stdout (-> failure) during #', hash);
              resolve('fail');
              break;
            case 'error':
              logger.warning('Received data from stdout (-> error) during #', hash);
              resolve('error');
              break;
            default:
              logger.debug('Received data from stdout (ignored) during #', hash);
              break;
          }
          stdoutGot = true;
        }
      });

      let stderrGot;
      prog.stderr.on('data', async (data) => {
        try {
          if (fnerr && !resolved) {
            logger.trace('Pipe stderr data to sink file', hash);
            await fs.writeFile(ferr, data);
          }
        } catch (e) {
          logger.warning('Cannot write to sink files', hash, e);
        }
        if (!stderrGot) {
          switch (argv.stderr) {
            case 'fail':
              logger.info('Received data from stderr (-> failure) during #', hash);
              resolve('fail');
              break;
            case 'error':
              logger.warning('Received data from stderr (-> error) during #', hash);
              resolve('error');
              break;
            default:
              logger.debug('Received data from stderr (ignored) during #', hash);
              break;
          }
          stderrGot = true;
        }
      });

      prog.on('error', (err) => {
        logger.error('Failed to start / kill the program:', hash, err);
        resolve('error');
      });

      prog.on('exit', () => {
        clearTimeout(to);
        if (prog.killed) {
          logger.info('Finished execution (killed) #', hash);
        } else {
          logger.info('Finished execution #', hash);
        }
        check();
      });

      if (!argv.xargs) {
        logger.debug('Putting parameters into stdin', hash);
        prog.stdin.setEncoding('utf-8');
        p.forEach((pv) => {
          logger.trace('Writing to stdin:', pv, hash);
          prog.stdin.write(pv);
          prog.stdin.write('\n');
        });
      }
      logger.trace('Closing stdin', hash);
      prog.stdin.end();
    });
    const dur = new Date() - t;
    resolved = true;

    logger.notice('Result for execution:', res, hash);
    if (res !== 'cancel') {
      logger.info('Time consumption:', timespan.getString(dur, 'ms'), hash);
    }
  } catch (err) {
    resolved = true;
    logger.error('Unexpected error during #', hash, err);
    res = 'disaster';
  }
  if (fnout || fnerr)
    logger.debug('Closing sink files for #', hash);
  await Promise.all([fnout && fout.close(), fnerr && ferr.close()]);
  if (res === 'cancel' || res === 'disaster') {
    if (fnout || fnerr)
      logger.debug('Remove sink and result files for #', hash);
    await Promise.all([
      fnout && fs.unlink(fnout).catch((e) => {
        logger.error('Cannnot remove sink file:', hash, e);
      }),
      fnerr && fs.unlink(fnerr).catch((e) => {
        logger.error('Cannnot remove sink file:', hash, e);
      }),
    ]);
  } else {
    if (fnres) {
      logger.debug('Write result file for #', hash);
      try {
        await fs.writeFile(fnres, res, {
          encoding: 'utf-8',
          mode: 0o644,
          flag: 'w',
        });
      } catch (e) {
        logger.warning('Cannot write result file (cache) for #', hash, e);
      }
    }
    if (fnout || fnerr)
      logger.debug('Change sink and result file perms for #', hash);
    else
      logger.debug('Change result file perms for #', hash);
    try {
      await Promise.all([
        fnout && fs.chmod(fnout, 0o444),
        fnerr && fs.chmod(fnerr, 0o444),
        fnres && fs.chmod(fnres, 0o444),
      ]);
    } catch (e) {
      logger.warning('Cannot chmod cache files for #', hash, e);
    }
  }

  return res;
};
