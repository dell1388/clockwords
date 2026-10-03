// Tests for the seeded stream a run is generated from. The property that
// matters: the same seed is the same run, today and next year.
//
//   node test/rng.test.mjs

import { rng, seedToString, stringToSeed, dailySeed, randomSeed } from '../src/rng.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; return; }
  fail++;
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
};
const eq = (name, got, want) => ok(name, got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const series = (seed, n = 40) => { const r = rng(seed); return Array.from({ length: n }, () => r.float()); };

// ── determinism ────────────────────────────────────────────────────────────
eq('the same seed gives the same stream',
  JSON.stringify(series(12345)), JSON.stringify(series(12345)));
ok('different seeds diverge', JSON.stringify(series(1)) !== JSON.stringify(series(2)));
ok('a zero seed still works', series(0).every(v => v >= 0 && v < 1));

// a frozen sample, so a change to the generator is caught rather than shrugged
// at: these five numbers must not move without a deliberate decision
const frozen = series(42, 5).map(v => v.toFixed(6));
eq('the stream is frozen', frozen.join(','),
  ['0.002644', '0.660312', '0.110957', '0.849377', '0.875439'].join(','));

// ── distribution, roughly ──────────────────────────────────────────────────
const many = series(7, 20000);
ok('floats stay in range', many.every(v => v >= 0 && v < 1));
const mean = many.reduce((a, c) => a + c, 0) / many.length;
ok('the mean is near a half', Math.abs(mean - 0.5) < 0.02, `mean ${mean.toFixed(4)}`);
const buckets = new Array(10).fill(0);
for (const v of many) buckets[Math.floor(v * 10)]++;
ok('every tenth is visited', buckets.every(b => b > many.length / 20), JSON.stringify(buckets));

// ── the helpers ────────────────────────────────────────────────────────────
const r = rng(99);
const ints = Array.from({ length: 500 }, () => r.int(3, 7));
ok('int stays within bounds', ints.every(v => v >= 3 && v <= 7));
ok('int reaches both ends', ints.includes(3) && ints.includes(7));

const arr = ['a', 'b', 'c', 'd', 'e'];
ok('pick returns a member', Array.from({ length: 50 }, () => r.pick(arr)).every(v => arr.includes(v)));
eq('some returns the right count', r.some(arr, 3).length, 3);
ok('some does not repeat', new Set(r.some(arr, 5)).size === 5);
eq('shuffle keeps every member', r.shuffle(arr).sort().join(''), 'abcde');
ok('shuffle leaves the original alone', arr.join('') === 'abcde');

const picks = Array.from({ length: 4000 }, () => r.weighted([['rare', 1], ['common', 9]]));
const rareShare = picks.filter(p => p === 'rare').length / picks.length;
ok('weighted respects its weights', Math.abs(rareShare - 0.1) < 0.03, `rare ${rareShare.toFixed(3)}`);
ok('weighted never returns undefined', picks.every(p => p === 'rare' || p === 'common'));

// forking: one part of a run drawing an extra number must not shift the rest
const a1 = rng(5), a2 = rng(5);
const branchA = a1.fork(); a1.float(); a1.float();
const branchB = a2.fork();
eq('a fork is independent of its parent', branchA.float(), branchB.float());

// ── seeds people can say out loud ──────────────────────────────────────────
eq('a seed survives the round trip', stringToSeed(seedToString(123456)), 123456);
ok('seed strings are five characters', seedToString(randomSeed()).length === 5);
ok('seed strings are unambiguous', !/[AEIOU01]/.test(seedToString(randomSeed())));
eq('seed strings are case-insensitive',
  stringToSeed(seedToString(777).toLowerCase()), stringToSeed(seedToString(777)));

// ── the daily front ────────────────────────────────────────────────────────
const d = new Date(Date.UTC(2026, 9, 3, 11, 30));
eq('the daily seed depends only on the date',
  dailySeed(d), dailySeed(new Date(Date.UTC(2026, 9, 3, 23, 59))));
ok('a different day is a different run', dailySeed(d) !== dailySeed(new Date(Date.UTC(2026, 9, 4))));
eq('the same day gives the same route',
  JSON.stringify(series(dailySeed(d), 10)), JSON.stringify(series(dailySeed(d), 10)));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
