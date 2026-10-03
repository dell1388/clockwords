// wordcraft.js — what the gun reads in a word beyond the letters it spends.
//
// Two things. How rare the word is, which multiplies everything; and what
// shape it has, which does something particular. Both are read off the typed
// string alone, so a player can learn to see them without a dictionary.
//
// The frequency data is the top 30,000 English words by frequency (Google Web
// Trillion Word Corpus, by way of arstgit/high-frequency-vocabulary), filtered
// to the 20,972 of them that ENABLE1 also holds, kept in frequency order.
// Everything ENABLE1 holds and that list does not is rare by definition, which
// covers 150,000 words for free.

let RANK = null;                       // word -> position in the frequency list

export function loadFrequency(text) {
  RANK = new Map();
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const w = lines[i].trim();
    if (w) RANK.set(w, RANK.size);
  }
  return RANK.size;
}
export const freqSize = () => (RANK ? RANK.size : 0);

// Five tiers. The cuts are by rank in the filtered list, so they move with the
// list rather than with absolute counts.
export const TIERS = [
  { tier: 1, upTo: 1500,     mul: 0.6, name: 'Common',    tell: 'barely worth firing' },
  { tier: 2, upTo: 6000,     mul: 1.0, name: 'Plain',     tell: 'the baseline' },
  { tier: 3, upTo: 12000,    mul: 1.8, name: 'Uncommon',  tell: 'a good word' },
  { tier: 4, upTo: Infinity, mul: 3.0, name: 'Rare',      tell: 'you had to reach' },
  { tier: 5, upTo: null,     mul: 5.0, name: 'Obscure',   tell: 'you know things' },
];

// A word nobody has fired before is worth more the first time, so reaching for
// an unfamiliar word pays even when the reach turns out to be a common one.
export const DISCOVERY_BONUS = 1.35;

export function tierOf(word) {
  const w = (word || '').toLowerCase();
  if (!w) return TIERS[1];
  if (!RANK) return TIERS[1];                   // no list loaded: everything is plain
  const r = RANK.get(w);
  if (r === undefined) return TIERS[4];         // not in the top 30,000 at all
  for (const t of TIERS) if (r < t.upTo) return t;
  return TIERS[3];
}

// ── the shape of a word ────────────────────────────────────────────────────
// Each trick is visible in the letters themselves. None of them needs to know
// what a word means, and none needs a list.

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const sorted = w => w.split('').sort().join('');

export const TRICKS = {
  palindrome: { name: 'Palindrome', note: 'shells pierce the whole line', colour: '#9be8ff' },
  doubles:    { name: 'Double',     note: 'each doubled pair ricochets', colour: '#ffc24b' },
  alliterate: { name: 'Alliterate', note: 'carries the last word’s material', colour: '#61e6b0' },
  anagram:    { name: 'Anagram',    note: 'refunds the letters it spent', colour: '#c8a2ff' },
  ladder:     { name: 'Ladder',     note: 'one letter off the last word — no repeat decay', colour: '#9be8ff' },
  cluster:    { name: 'Cluster',    note: 'four consonants — ignores armour', colour: '#ff9a6b' },
};

// How many doubled pairs the word holds: BALLOON is two (LL, OO), ASSESS two.
function doubledPairs(w) {
  let n = 0;
  for (let i = 1; i < w.length; i++) if (w[i] === w[i - 1]) { n++; i++; }
  return n;
}

function longestConsonantRun(w) {
  let best = 0, run = 0;
  for (const ch of w) {
    if (VOWELS.has(ch) || ch === 'y') run = 0; else run++;
    if (run > best) best = run;
  }
  return best;
}

function oneLetterApart(a, b) {
  if (!a || a.length !== b.length || a === b) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return diff === 1;
}

// Everything the shape of this word earns, given the word fired before it.
export function readShape(word, prev = '') {
  const w = (word || '').toLowerCase();
  const p = (prev || '').toLowerCase();
  const found = [];
  if (w.length >= 3 && w === [...w].reverse().join('')) found.push('palindrome');
  const pairs = doubledPairs(w);
  if (pairs > 0) found.push('doubles');
  if (p && w[0] === p[0]) found.push('alliterate');
  if (p && w !== p && w.length === p.length && sorted(w) === sorted(p)) found.push('anagram');
  if (oneLetterApart(p, w)) found.push('ladder');
  if (longestConsonantRun(w) >= 4) found.push('cluster');
  return { tricks: found, pairs };
}

// The whole read on one word: what it is worth and what it does.
// `seen` is the set of words already fired in this run, for the discovery bonus.
export function readWord(word, { prev = '', seen = null } = {}) {
  const w = (word || '').toLowerCase();
  const t = tierOf(w);
  const { tricks, pairs } = readShape(w, prev);
  const fresh = !!seen && !seen.has(w);
  const mult = t.mul * (fresh ? DISCOVERY_BONUS : 1);
  return {
    word: w,
    tier: t.tier, tierName: t.name, tierMul: t.mul,
    fresh, mult,
    tricks, pairs,
    piercing: tricks.includes('palindrome'),
    ricochet: tricks.includes('doubles') ? pairs : 0,
    carries: tricks.includes('alliterate'),
    refunds: tricks.includes('anagram'),
    noDecay: tricks.includes('ladder'),
    armourPiercing: tricks.includes('cluster'),
  };
}
