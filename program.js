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
  logger.info('# of active parameters:', p.length);
  logger.trace('Active parameters:', p);
  let a = [...argv.args];
  logger.debug('# of fixed arguments:', a.length);
  if (argv.split) {
    logger.debug('Splitting parameters into arguments');
    p.forEach((pv) => { a.push(...pv.split(argv.splitBy)); }); // TODO: better split method
  } else if (argv.xargs) {
    logger.debug('Putting parameters into arguments');
    a.push(...p);
  } else {
    logger.debug('Will be putting parameters into stdin');
  }
  logger.info('# of total arguments:', a.length);
  logger.trace('List of arguments:', a);

  const fnout = path.join(argv.o, hash + '.out');
  const fnerr = path.join(argv.o, hash + '.err');
  const fnres = path.join(argv.o, hash + '.res');

  try {
    await fs.access(fnres, fs.constants.R_OK);
    logger.info('Cache file found for execution #', hash);
    const res = await fs.readFile(fnres, 'utf-8');
    logger.notice(`Result was >>${res}<< for (cached) execution #`, hash);
    return res;
  } catch {
    logger.debug('Cache file not found for execution #', hash);
  }

  logger.debug('Opening sink files for execution #', hash);
  const fout = await fs.open(fnout, 'w', 0o644);
  const ferr = await fs.open(fnerr, 'w', 0o644);

  logger.info('Spawning program for #', hash);
  const t = +new Date();
  let res;
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
          logger.warning('When cancelling, the program already exited with', prog.exitCode);
        }
        resolve('cancel');
      };

      const check = (force) => {
        token.cancel = () => { };
        if (force || prog.killed) {
          switch (argv.timeout) {
            case 'fail':
              logger.info('Program timeout (trigger failure) during #', hash);
              resolve('fail');
              break;
            case 'error':
              logger.warning('Program timeout (trigger error) during #', hash);
              resolve('error');
              break;
            default:
              logger.error('This should not happen', new Error());
              resolve('error');
              break;
          }
        } else {
          switch (prog.exitCode ? argv.nonZero : argv.zero) {
            case 'fail':
              logger.info(`Exit code ${prog.exitCode} (trigger failure) during #`, hash);
              resolve('fail');
              break;
            case 'error':
              logger.warning(`Exit code ${prog.exitCode} (trigger error) during #`, hash);
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
            logger.warning('Looks like the program has already exited with', prog.exitCode);
            return;
          }
          logger.notice('Sending SIGTERM to the timeout program');
          if (!prog.kill()) {
            logger.warning('SIGTERM did not work, will try SIGKILL later');
            setTimeout(() => {
              if (prog.exitCode === null) {
                logger.warning('Sending SIGKILL to the timeout program');
                if (!prog.kill('SIGKILL')) {
                  logger.error('Still not working, giveup; please kill yourself:', prog.pid);
                  check(true);
                }
              }
            }, 1000);
          }
        }, argv.timeLimit);
      }

      let stdoutGot;
      prog.stdout.on('data', (data) => {
        if (!stdoutGot) {
          switch (argv.stdout) {
            case 'fail':
              logger.info('Received data from stdout (trigger failure) during #', hash);
              resolve('fail');
              break;
            case 'error':
              logger.warning('Received data from stdout (trigger error) during #', hash);
              resolve('error');
              break;
            default:
              logger.debug('Received data from stdout (ignored) during #', hash);
              break;
          }
          stdoutGot = true;
        }
        fs.writeFile(fout, data).catch((e) => {
          logger.error('Cannot write to sink files', e);
        });
      });

      let stderrGot;
      prog.stderr.on('data', (data) => {
        if (!stderrGot) {
          switch (argv.stderr) {
            case 'fail':
              logger.info('Received data from stderr (trigger failure) during #', hash);
              resolve('fail');
              break;
            case 'error':
              logger.warning('Received data from stderr (trigger error) during #', hash);
              resolve('error');
              break;
            default:
              logger.debug('Received data from stderr (ignored) during #', hash);
              break;
          }
          stderrGot = true;
        }
        fs.writeFile(ferr, data).catch((e) => {
          logger.error('Cannot write to sink files', e);
        });
      });

      prog.on('error', (err) => {
        logger.error('Failed to start / kill the program:', err);
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
        logger.debug('Putting parameters into stdin');
        prog.stdin.setEncoding('utf-8');
        p.forEach((pv) => {
          logger.trace('Writing to stdin:', pv);
          prog.stdin.write(pv);
          prog.stdin.write('\n');
        });
      }
      logger.trace('Closing stdin');
      prog.stdin.end();
    });
    const dur = new Date() - t;

    logger.notice('Result for execution:', res, hash);
    if (res !== 'cancel') {
      logger.info('Time consumption:', timespan.getString(dur, 'ms'));
    }
  } catch (err) {
    logger.error('Unexpected error during #', hash);
    logger.error('During execution:', err);
    res = 'disaster';
  }
  logger.debug('Closing sink files for #', hash);
  await Promise.all([fout.close(), ferr.close()]);
  if (res === 'cancel' || res === 'disaster') {
    logger.debug('Remove sink and result files for #', hash);
    await Promise.all([
      fs.unlink(fnout).catch((e) => {
        logger.error('Cannnot remove sink file:', e);
      }),
      fs.unlink(fnerr).catch((e) => {
        logger.error('Cannnot remove sink file:', e);
      }),
    ]);
  } else {
    logger.debug('Write result file for #', hash);
    await fs.writeFile(fnres, res, {
      encoding: 'utf-8',
      mode: 0o644,
      flag: 'w',
    });
    logger.debug('Change sink and result file perms for #', hash);
    await Promise.all([
      fs.chmod(fnout, 0o444),
      fs.chmod(fnerr, 0o444),
      fs.chmod(fnres, 0o444),
    ]);
  }

  return res === 'disaster' ? 'error' : res;
};
