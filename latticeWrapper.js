const cp = require('child_process');
const path = require('path');
const readline = require('readline');
const logger = require('./logger')('lattice');

class LatticeBase {
  async next(sup, inf) {
    for (let i = 0; i < 2; i++) {
      let dir;
      if (sup && !inf)
        dir = 'd';
      else if (inf && !sup)
        dir = 'u';
      else
        dir = (this.nextUD ^= true) ? 'u' : 'd';
      const start = await this.nextImpl(dir);
      if (start) {
        const cancel = await this.cancelled();
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

  async log() {
    await this.summaryImpl();
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
    await this.listImpl(logger.debug, 'suprema', 'supremum');
    await this.listImpl(logger.debug, 'infima', 'infimum');

    if (logger.getLevel() < 6) return;
    await this.listImpl(logger.trace, 'true');
    await this.listImpl(logger.trace, 'improbable');
    await this.listImpl(logger.trace, 'false');
    await this.listImpl(logger.trace, 'running');
  }
}

class LatticeWasm extends LatticeBase {
  constructor() {
    super();
    logger.debug('Loading lattice wasm from:', path.join(__dirname, 'lattice.wasm.js'));
    this.Module = require('./lattice.wasm')().then((prog) => {
      logger.debug('Lattice wasm loaded successfully');
      return prog;
    }).catch((e) => {
      logger.error('Cannot load lattice wasm:', e);
    });
  }

  static toArray(vec) {
    const res = [];
    for (let i = 0; i < vec.size(); i++) {
      const s = vec.get(i);
      logger.trace('Read vector from lattice:', s);
      res.push(s);
    }
    logger.trace('Finished read vector from lattice');
    return res;
  }

  quit() { }

  async nextImpl(dir) {
    const prog = await this.Module;
    logger.trace('Calling lattice:', `next_${dir}`);
    const res = await prog[`next_${dir}`]();
    logger.trace('Result from lattice:', res);
    return res;
  }

  async cancelled() {
    const prog = await this.Module;
    logger.trace('Calling lattice:', 'cancelled');
    const res = LatticeWasm.toArray(await prog.cancelled());
    logger.trace('Result from lattice:', res);
    return res;
  }

  async report(elem, val) {
    const prog = await this.Module;
    if (val === true) {
      logger.trace('Calling lattice:', 'mark_true');
      logger.trace('Parameter of which:', elem);
      const res = prog.mark_true(elem);
      logger.trace('Result from lattice:', res);
      return res;
    }
    if (val === false) {
      logger.trace('Calling lattice:', 'mark_true');
      logger.trace('Parameter of which:', elem);
      const res = prog.mark_false(elem);
      logger.trace('Result from lattice:', res);
      return res;
    }
    logger.trace('Calling lattice:', 'mark_improbable');
    logger.trace('Parameter of which:', elem);
    const res = prog.mark_improbable(elem);
    logger.trace('Result from lattice:', res);
    return res;
  }

  async finalize() {
    const prog = await this.Module;
    logger.trace('Calling lattice:', 'finalize');
    await prog.finalize();
    logger.trace('Result from lattice:', null);
  }

  async listImpl(f, str, singular) {
    const prog = await this.Module;
    logger.trace('Calling lattice:', `list_${str}`);
    LatticeWasm.toArray(await prog[`list_${str}`]()).forEach((s) => {
      f(`${singular || str}:`, s);
    });
  }

  async summaryImpl() {
    const prog = await this.Module;
    logger.trace('Calling lattice:', 'summary');
    const [
      t,
      suprema,
      improbable,
      infima,
      f,
      running,
      bestHierU,
      bestHierD,
    ] = LatticeWasm.toArray(await prog.summary());
    this.summary = {
      true: t,
      suprema,
      improbable,
      infima,
      false: f,
      running,
      bestHierU,
      bestHierD,
    };
  }
}

class LatticeBinary extends LatticeBase {
  constructor(N) {
    super();
    const pa = process.env.FINDBUG_LATTICE_BINARY || path.join(__dirname, 'lattice', 'cmake-build-debug', 'lattice');
    logger.debug('Spawning lattice binary from:', pa);
    this.prog = cp.spawn(pa, [N], {
      stdio: ['pipe', 'pipe', 'inherit'],
      detached: false,
      windowsHide: true,
    });
    logger.debug('Lattice binary spawned successfully');
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

  async nextImpl(dir) {
    await this.rlWrite(`next ${dir}`);
    return this.rlRead();
  }

  async cancelled() {
    await this.rlWrite('cancelled');
    return this.rlReads();
  }

  async report(elem, val) {
    if (val === true) await this.rlWrite('true');
    else if (val === false) await this.rlWrite('false');
    else await this.rlWrite('improbable');
    await this.rlWrite(elem);
    const s = +await this.rlRead();
    return !!s;
  }

  async finalize() {
    await this.rlWrite('finalize');
    await this.rlRead();
  }

  async listImpl(f, str, singular) {
    this[str] = [];
    await this.rlWrite(`list ${str}`);
    while (true) {
      const s = await this.rlRead();
      if (!s) break;
      this[str].push(s);
      f(`${singular || str}:`, s);
    }
  }

  async summaryImpl() {
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
  }
}

module.exports = process.env.FINDBUG_LATTICE_USE_BINARY ? LatticeBinary : LatticeWasm;
