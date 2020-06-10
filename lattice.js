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

  async next() {
    await this.rlWrite('next');
    const start = await this.rlRead();
    if (!start) return null;
    await this.rlWrite('cancelled');
    const cancel = await this.rlReads();
    return {
      start,
      cancel,
    };
  }

  async report(elem, val) {
    if (val === true) await this.rlWrite('true');
    else if (val === false) await this.rlWrite('false');
    else await this.rlWrite('improbable');
    await this.rlWrite(elem); // .map((c) => c ? '1' : '0').join(''));
    const s = +await this.rlRead();
    return !!s;
  }

  async list(str, singular) {
    this[str] = [];
    await this.rlWrite(`list ${str}`);
    while (true) {
      const s = await this.rlRead();
      if (!s) break;
      this[str].push(s);
      logger.debug(`${singular || str}:`, s);
    }
  }

  async log() {
    await this.rlWrite('summary');
    this.summary = {};
    let v;
    v = this.summary.true = +await this.rlRead();
    logger.info('Number of true:', v);
    v = this.summary.suprema = +await this.rlRead();
    logger.info('Number of suprema:', v);
    v = this.summary.improbable = +await this.rlRead();
    logger.info('Number of improbable:', v);
    v = this.summary.infima = +await this.rlRead();
    logger.info('Number of infima:', v);
    v = this.summary.false = +await this.rlRead();
    logger.info('Number of false:', v);
    v = this.summary.running = +await this.rlRead();
    logger.info('Number of running:', v);

    await this.list('suprema', 'supremum');
    await this.list('infima', 'infimum');

    if (logger.getLevel() < 6) return;
    await this.list('true');
    await this.list('improbable');
    await this.list('false');
    await this.list('running');
  }
}

module.exports = Lattice;
