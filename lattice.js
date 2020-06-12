const cp = require('child_process');
const path = require('path');
const readline = require('readline');
const logger = require('./logger')('lattice');

class Lattice {
  constructor(N) {
    // TODO: don't use silly path
    const pa = path.join(__dirname, 'lattice', 'cmake-build-debug', 'lattice');
    logger.debug('Spawning lattice program at:', pa);
    this.prog = cp.spawn(pa, [N], {
      stdio: ['pipe', 'pipe', 'inherit'],
      detached: false,
      windowsHide: true,
    });
    this.prog.stdin.setEncoding('utf-8');
    this.rl = readline.createInterface({
      input: this.prog.stdout,
    });
    this.lines = [];
    this.rl.on('line', (line) => {
      this.lines.push(line);
      if (this.check) this.check();
    });
  }

  async rlWrite(s) {
    logger.trace('Write to lattice:', s);
    await this.prog.stdin.write(s + '\n');
  }

  rlRead() {
    return new Promise((resolve) => {
      this.check = () => {
        if (this.lines.length) {
          this.check = undefined;
          const s = this.lines.splice(0, 1)[0];
          logger.trace('Read from lattice:', s);
          resolve(s);
        }
      };
      this.check();
    });
  }

  async rlReads() {
    const res = [];
    while (true) {
      const s = await this.rlRead();
      if (s)
        res.push(s);
      else
        return res;
    }
  }

  quit() {
    this.prog.stdin.end();
  }

  async next(sup, inf) {
    for (let i = 0; i < 2; i++) {
      let dir;
      if (sup && !inf)
        dir = 'd';
      else if (inf && !sup)
        dir = 'u';
      else
        dir = (this.nextUD ^= true) ? 'u' : 'd';
      await this.rlWrite(`next ${dir}`);
      const start = await this.rlRead();
      if (start) {
        await this.rlWrite('cancelled');
        const cancel = await this.rlReads();
        return {
          start,
          cancel,
        };
      }
      if (sup ^ inf)
        break;
    }
    return null;
  }

  async report(elem, val) {
    if (val === true) await this.rlWrite('true');
    else if (val === false) await this.rlWrite('false');
    else await this.rlWrite('improbable');
    await this.rlWrite(elem); // .map((c) => c ? '1' : '0').join(''));
    const s = +await this.rlRead();
    return !!s;
  }

  async finalize() {
    await this.rlWrite('finalize');
    await this.rlRead();
  }

  async list(f, str, singular) {
    this[str] = [];
    await this.rlWrite(`list ${str}`);
    while (true) {
      const s = await this.rlRead();
      if (!s) break;
      this[str].push(s);
      f(`${singular || str}:`, s);
    }
  }

  async log() {
    await this.rlWrite('summary');
    this.summary = {
      true: +await this.rlRead(),
      suprema: +await this.rlRead(),
      improbable: +await this.rlRead(),
      infima: +await this.rlRead(),
      false: +await this.rlRead(),
      running: +await this.rlRead(),
      bestHierU: +await this.rlRead(),
      bestHierD: +await this.rlRead(),
    };
    logger.notice(
      'Number of T/S/U/I/F:',
      this.summary.true,
      this.summary.suprema,
      this.summary.improbable,
      this.summary.infima,
      this.summary.false,
    );
    logger.notice(
      'Number of best hier:',
      this.summary.bestHierU,
      this.summary.bestHierD,
    );

    logger.debug('Number of running executions:', this.summary.running);
    await this.list(logger.debug, 'suprema', 'supremum');
    await this.list(logger.debug, 'infima', 'infimum');

    if (logger.getLevel() < 6) return;
    await this.list(logger.trace, 'true');
    await this.list(logger.trace, 'improbable');
    await this.list(logger.trace, 'false');
    await this.list(logger.trace, 'running');
  }
}

module.exports = Lattice;
