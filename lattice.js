const { MaxPriorityQueue } = require('@datastructures-js/priority-queue');

class LatticeElem {
  constructor(value) {
    // this.v[0][0] is LSB
    if (typeof value === 'bigint') {
      this.N = value;
      this.T = 0n;
      this.v = new BigUint64Array((N + 63) / 64);
    } else if (typeof value === 'number') {
      this.N = BigInt(value);
      this.T = 0n;
      this.v = new BigUint64Array((N + 63) / 64);
    } else if (typeof value === 'string') {
      this.N = BigInt(str.length);
      this.v = new BigUint64Array((str.length + 63) / 64);
      let i;
      for (i = 0n; i < l.N / 64n; i++) {
        this.v[i] = BigInt('0b' + value.substr(Number(-64n * i), 64));
      }
      if (l.N % 64n) {
        this.v[i] = BigInt('0b' + value.substr(Number(i)));
      }
      this.T = this.updateT();
    } else if (value instanceof LatticeElem) {
      this.N = value.N;
      this.v = new BigUint64Array(value.v);
    } else {
      throw new Error('Type not supported');
    }
  }

  updateT() {
    this.T = this.v.reduce((a, b) => {
      b -= ((b >> 1n) & 0x5555555555555555n);
      b = (b & 0x3333333333333333n) + (b >> 2n & 0x3333333333333333n);
      return a + ((b + (b >> 4n)) & 0xf0f0f0f0f0f0f0fn) * 0x101010101010101n >> 56n;
    }, 0n);
  }

  clone() {
    return new LatticeElem(this);
  }

  toString() {
    const s = this.v.reduce((a, b) => {
      const ss = b.toString(2);
      return a + '0'.repeat(64 - ss.length) + ss;
    }, '');
    if (this.N % 64n)
      return s.substr(Number(64n - this.N % 64n));
    return s;
  }

  pick(p) {
    const res = [];
    for (let i = 0n; i < this.N; i++) {
      if ((this.v[i / 64n] >>> (i % 64n)) & 1n) {
        res.push(p[i]);
      }
    }
    return res;
  }

  static top(N) {
    let l = LatticeElem.top[N];
    if (l) return l;
    l = new LatticeElem(N);
    l.v.fill(0xffffffffffffffffn);
    if (l.N % 64n)
      l.v[l.N / 64n] &= (1n << BigInt(l.N % 64n)) - 1n;
    l.T = l.N;
    return LatticeElem.top[N] = l;
  }

  static bottom(N) {
    let l = LatticeElem.bottom[N];
    if (l) return l;
    l = new LatticeElem(N);
    return LatticeElem.bottom[N] = l;
  }

  veeEq(b) {
    this.v.forEach((v, i) => { this.v[i] |= b.v[i]; });
    this.updateT();
    return this;
  }

  wedgeEq(b) {
    this.v.forEach((v, i) => { this.v[i] &= b.v[i]; });
    this.updateT();
    return this;
  }

  equals(b) {
    return this.v.every((v, i) => this.v[i] == b.v[i]);
  }

  covers(b) {
    return this.v.every((v, i) => (this.v[i] & b.v[i]) == b.v[i]);
  }

  covered(b) {
    return this.v.every((v, i) => (this.v[i] & b.v[i]) == a.v[i]);
  }

  *ups() {
    for (let i = 0n; i < this.N; i++) {
      if (!((this.v[i / 64n] >>> (i % 64n)) & 1n)) {
        const l = new Lattice(this);
        l.v[i / 64n] |= 1n << (i % 64n);
        yield return l;
      }
    }
  }

  *downs() {
    for (let i = 0n; i < this.N; i++) {
      if ((this.v[i / 64n] >>> (i % 64n)) & 1n) {
        const l = new Lattice(this);
        l.v[i / 64n] &= ~(1n << (i % 64n));
        yield return l;
      }
    }
  }
}

class LatticeBiSet {
  constructor(N) {
    this.N = BigInt(N);
    this.Ts = [];
    this.Fs = [];
  }

  Tq(el) {
    return this.Ts.some(el.covers);
  }

  Fq(el) {
    return this.Fs.some(el.covered);
  }

  addT(el) {
    if (Tq(el)) return;
    if (Fq(el)) throw new Error('Assumption violation');
    this.Ts.push(el);
  }

  addF(el) {
    if (Fq(el)) return;
    if (Tq(el)) throw new Error('Assumption violation');
    this.Fs.push(el);
  }

  Fups() {
    const b = [];
  }
}

module.exports = LatticeElem;
