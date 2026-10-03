// rng.js — the one source of chance a run is allowed to use.
//
// A run's route, its drafts and its enemies all come out of a seed, so the
// same seed is the same run: that is what makes the daily front possible and
// a run shareable as a short string. Math.random() stays for cosmetics —
// sparks, smoke, film grain — where nobody can tell and nobody should care.

const UINT = 4294967296;

// xorshift32: small, fast, and good enough for picking nodes off a table.
export function rng(seed = 1) {
  let s = (seed >>> 0) || 0x9e3779b9;
  const next = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s;
  };
  const api = {
    // a float in [0,1)
    float: () => next() / UINT,
    // an integer in [lo, hi]
    int: (lo, hi) => lo + (next() % (hi - lo + 1)),
    // a float in [lo, hi)
    range: (lo, hi) => lo + (next() / UINT) * (hi - lo),
    // true with probability p
    chance: p => next() / UINT < p,
    // one item
    pick: arr => arr[next() % arr.length],
    // one item from [[item, weight], …] — weights need not sum to anything
    weighted: entries => {
      let total = 0;
      for (const [, w] of entries) total += w;
      let r = (next() / UINT) * total;
      for (const [item, w] of entries) { r -= w; if (r <= 0) return item; }
      return entries[entries.length - 1][0];
    },
    // some items, no repeats, in pick order
    some: (arr, n) => {
      const pool = [...arr], out = [];
      while (out.length < n && pool.length) out.push(pool.splice(next() % pool.length, 1)[0]);
      return out;
    },
    // a copy in a shuffled order, leaving the original alone
    shuffle: arr => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = next() % (i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    // a fresh stream, derived from this one — so one part of a run drawing an
    // extra number cannot shift what every later part gets
    fork: () => rng(next()),
    state: () => s,
  };
  return api;
}

// ── seeds people can say out loud ──────────────────────────────────────────
// A run is shared as its seed, so a seed should be readable: five characters,
// no vowels to accidentally spell anything, no 0/O or 1/I to mistype.
const ALPHABET = '23456789BCDFGHJKLMNPQRSTVWXYZ';

export function seedToString(seed) {
  let s = (seed >>> 0), out = '';
  for (let i = 0; i < 5; i++) { out = ALPHABET[s % ALPHABET.length] + out; s = Math.floor(s / ALPHABET.length); }
  return out;
}

export function stringToSeed(str) {
  let s = 0;
  for (const ch of String(str).toUpperCase()) {
    const i = ALPHABET.indexOf(ch);
    if (i >= 0) s = (s * ALPHABET.length + i) >>> 0;
  }
  return s >>> 0;
}

// The daily front: one run a day, the same one for everybody, from the UTC
// date alone so no server has to hand it out.
export function dailySeed(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  let s = (day * 2654435761) >>> 0;
  s ^= s << 13; s >>>= 0;
  s ^= s >>> 17;
  s ^= s << 5; s >>>= 0;
  return s >>> 0;
}

export const randomSeed = () => (Math.random() * UINT) >>> 0;
