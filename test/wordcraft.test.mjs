// Tests for the pure half of the game: what a word is worth and what shape it
// has. No browser, no canvas — run with:  node test/wordcraft.test.mjs
//
// These guard the part most likely to go quietly wrong: a frequency list that
// loads but tiers everything the same, or a trick that stops firing because a
// helper changed.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  loadFrequency, freqSize, tierOf, readShape, readWord, TIERS, DISCOVERY_BONUS,
} from '../src/wordcraft.js';
import { softCap, MULT_KNEE, OVERKILL_CARRY } from '../src/content.js';

const here = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; return; }
  fail++;
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
};
const eq = (name, got, want) => ok(name, got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// ── the frequency list ─────────────────────────────────────────────────────
const n = loadFrequency(readFileSync(join(here, '..', 'assets', 'freq20k.txt'), 'utf8'));
ok('frequency list loads', n > 15000, `only ${n} words`);
eq('freqSize agrees', freqSize(), n);

// ── tiers ──────────────────────────────────────────────────────────────────
// The exact cuts may move; the ORDER must not. A common word is never rarer
// than an uncommon one.
const tier = w => tierOf(w).tier;
ok('the → tier 1', tier('the') === 1, `got ${tier('the')}`);
ok('common words are tier 1–2', ['and', 'for', 'with', 'make'].every(w => tier(w) <= 2));
ok('ordinary words are tier 2–3', ['stone', 'train', 'retain'].every(w => tier(w) >= 2 && tier(w) <= 3));
ok('obscure words are tier 5', ['quixotic', 'aasvogel', 'truculent'].every(w => tier(w) === 5));
ok('rarity is ordered', tier('the') < tier('stone') && tier('stone') <= tier('strengths')
  && tier('strengths') < tier('quixotic'));
ok('every tier has a multiplier', TIERS.every(t => t.mul > 0));
ok('multipliers climb with tier', TIERS.every((t, i) => i === 0 || t.mul > TIERS[i - 1].mul));

// ── structure tricks ───────────────────────────────────────────────────────
const tricks = (w, prev = '') => readShape(w, prev).tricks;
ok('palindrome', tricks('rotator').includes('palindrome'));
ok('not a palindrome', !tricks('rotators').includes('palindrome'));
ok('two-letter words are not palindromes', !tricks('aa').includes('palindrome'));
ok('doubled letters', tricks('balloon').includes('doubles'));
eq('balloon has two pairs', readShape('balloon').pairs, 2);
eq('assess counts pairs once each', readShape('assess').pairs, 2);
eq('a triple is one pair', readShape('aaa').pairs, 1);
ok('no doubles in train', !tricks('train').includes('doubles'));
ok('alliteration', tricks('salvo', 'siege').includes('alliterate'));
ok('no alliteration across different letters', !tricks('train', 'siege').includes('alliterate'));
ok('anagram', tricks('silent', 'listen').includes('anagram'));
ok('the same word is not an anagram of itself', !tricks('listen', 'listen').includes('anagram'));
ok('ladder', tricks('store', 'stone').includes('ladder'));
ok('two letters apart is not a ladder', !tricks('stork', 'stone').includes('ladder'));
ok('different lengths are not a ladder', !tricks('stones', 'stone').includes('ladder'));
ok('consonant cluster', tricks('strengths').includes('cluster'));
ok('no cluster in retain', !tricks('retain').includes('cluster'));
ok('y does not extend a cluster', !tricks('rhythm').includes('cluster'));

// ── the whole read ─────────────────────────────────────────────────────────
const seen = new Set(['stone']);
const fresh = readWord('train', { seen });
const stale = readWord('stone', { seen });
ok('a new word carries the discovery bonus', Math.abs(fresh.mult - fresh.tierMul * DISCOVERY_BONUS) < 1e-9);
ok('a word already fired does not', Math.abs(stale.mult - stale.tierMul) < 1e-9);
ok('flags follow the tricks', readWord('rotator').piercing && readWord('balloon').ricochet === 2
  && readWord('strengths').armourPiercing);
ok('an empty word does not throw', !!readWord(''));
ok('a word with no list entry still reads', readWord('zzzzzz').tier === 5);

// ── the multiplier curve ───────────────────────────────────────────────────
eq('small multipliers pass through', softCap(2.3), 2.3);
eq('the knee passes through', softCap(MULT_KNEE), MULT_KNEE);
ok('past the knee is pulled back', softCap(24) < 24 && softCap(24) > MULT_KNEE);
ok('the curve still climbs', softCap(40) > softCap(24));
ok('overkill carries at a loss', OVERKILL_CARRY > 0 && OVERKILL_CARRY < 1);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
