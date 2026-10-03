// bench.mjs — how long each wave actually takes, measured rather than guessed.
//
//   python3 -m http.server 8099 &
//   node tools/bench.mjs [firstWave] [lastWave]
//
// Plays each wave headless as a competent player would: a mixed vocabulary,
// a rate of fire a player would plausibly have bought by then, and a rack
// built the way the game builds one for a resumed save. Prints a table and
// writes docs/BALANCE.md.

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const FIRST = Number(process.argv[2] || 1);
const LAST = Number(process.argv[3] || 20);
const BASE = 'http://localhost:8099/';

// What a competent player types. A narrow list is not a fair model: the
// repeat penalty floors a word at a fifth of its damage after a few uses, so
// a bench cycling twenty words is fighting a long wave with nothing. This is
// 150 ordinary words sampled from the frequency band a person actually uses
// (ranks 1,500-14,000, five to nine letters), plus the trick words, so the
// measurement is of the game rather than of repeat decay.
const WORDS = [
  'rotator', 'balloon', 'listen', 'silent', 'stone', 'store', 'storm', 'strengths',
  'cistern', 'slander', 'harsh', 'cottage', 'pueblo', 'evolution', 'themes', 'vertical',
  'pointers', 'causes', 'horseback', 'remix', 'crystal', 'engineers', 'ninety', 'lambert',
  'shower', 'wrist', 'nurse', 'solicitor', 'efficient', 'charlie', 'shame', 'enabled',
  'prone', 'angel', 'enormous', 'seeing', 'moderate', 'emerged', 'jukebox', 'criticism',
  'shorts', 'threw', 'reactions', 'mayor', 'injured', 'kindly', 'inquiry', 'colleges',
  'meter', 'terrace', 'apology', 'misty', 'rounded', 'microbial', 'champs', 'eureka',
  'chandler', 'benchmark', 'acquire', 'wives', 'asset', 'asses', 'raspberry', 'barrow',
  'birthdays', 'preceded', 'patience', 'hunting', 'recorder', 'quilting', 'bathing',
  'recover', 'cruiser', 'rocky', 'postfix', 'presenter', 'rings', 'holds', 'semantics',
  'rainfall', 'encrypted', 'flawed', 'billboard', 'lunch', 'terrorism', 'robots', 'swell',
  'extensive', 'neither', 'spiral', 'liners', 'adviser', 'cairns', 'subsidies', 'profit',
  'invoke', 'panorama', 'spider', 'billy', 'evenly', 'financing', 'symphony', 'freshman',
  'engaged', 'dressing', 'tariffs', 'candid', 'raped', 'residence', 'annually',
  'fantasies', 'smoothly', 'smallest', 'spoke', 'repeating', 'varieties', 'bravo', 'puffy',
  'coherent', 'weights', 'drunk', 'pursuant', 'bench', 'anymore', 'organizer', 'postcards',
  'seconds', 'audition', 'updating', 'maximize', 'teenagers', 'attention', 'locked',
  'neglected', 'sensation', 'cosmic', 'poems', 'sludge', 'contracts', 'detained', 'codec',
  'baptism', 'prisons', 'mommy', 'lodging', 'aired', 'cannabis', 'exact', 'reveal',
  'newly', 'watts', 'tyres', 'cloth', 'whenever', 'invasive', 'coach', 'winners', 'peace',
  'riding', 'construed'
];

const rofFor = wave => Math.min(10, Math.floor(wave / 2));

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => localStorage.clear());
await page.goto(BASE);
await page.waitForFunction(() => document.querySelector('#title.on'), { timeout: 60000 });

const OUT = 'docs/BALANCE.md';

// Read back whatever an earlier chunk measured, so runs can be done in pieces.
function previous() {
  if (!existsSync(OUT)) return [];
  return readFileSync(OUT, 'utf8').split('\n')
    .filter(l => /^\| \d+ \|/.test(l))
    .map(l => l.split('|').map(s => s.trim()).filter(Boolean))
    .map(c => ({ wave: +c[0], rof: +c[1], result: c[2], seconds: parseInt(c[3], 10),
      words: +c[4], kills: +c[5], dossiers: c[6], damage: +c[7].replace(/,/g, '') }));
}

function writeTable(rows) {
  const all = [...previous().filter(p => !rows.some(r => r.wave === p.wave)), ...rows]
    .sort((a, b2) => a.wave - b2.wave);
  const md = `# Measured wave times

Produced by \`node tools/bench.mjs [first] [last]\`, playing each wave headless
with a mixed vocabulary and the rate of fire a player would plausibly have
bought by then. Runs can be done in chunks; each wave is written as it
finishes. Re-run after any change to damage, hull or wave tables.

Last run: ${new Date().toISOString().slice(0, 10)}

| Wave | Rate of fire | Result | Time | Words | Kills | Dossiers | Damage |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
${all.map(r => `| ${r.wave} | ${r.rof} | ${r.result} | ${r.seconds}s | ${r.words} | ${r.kills} | ${typeof r.dossiers === 'string' ? r.dossiers : r.dossiers + '/5'} | ${Number(r.damage).toLocaleString()} |`).join('\n')}

Target: no wave under 30s or over 4 minutes at a competent pace, and no wave
lost before the Colonel at wave 10.

The bench types instantly and never hesitates, so these are **floor times**: a
human reading the rack, hunting for a word and mistyping it will take longer
and lose more dossiers. Read the table for the shape of the curve — where it
jumps, where it sags — rather than as what a person will experience.
`;
  writeFileSync(OUT, md);
}

const rows = [];
for (let wave = FIRST; wave <= LAST; wave++) {
  const setup = await page.evaluate(([w, rof]) => window.CLOCKWORDS.dev.startWave(w, rof),
    [wave, rofFor(wave)]);
  const t0 = Date.now();
  let i = 0, typed = 0;
  const used = new Map();           // the bench avoids its own repeats, as a player would
  for (;;) {
    const st = await page.evaluate(() => {
      const g = window.CLOCKWORDS.game;
      return { won: g.won, over: g.over, queue: g.fireQueue.length, pages: g.pages,
        kills: g.stats.kills, dmg: Math.round(g.stats.damage),
        chambers: g.boiler.chambers.filter(Boolean).map(c => c.letter) };
    });
    if (st.won || st.over || Date.now() - t0 > 300000) {
      rows.push({ wave, rof: setup.rof, seconds: Math.round((Date.now() - t0) / 1000),
        result: st.won ? 'cleared' : st.over ? 'LOST' : 'TIMEOUT',
        words: typed, kills: st.kills, dossiers: st.pages, damage: st.dmg });
      break;
    }
    if (st.queue < 3) {
      // Pick the way a player does: glance at the open chambers and take the
      // word that uses most of them, out of a handful of candidates. Not
      // optimal play — a sample of twenty, not the whole vocabulary.
      const sample = Array.from({ length: 20 }, () => WORDS[(i += 7) % WORDS.length]);
      const best = sample.map(w => {
        const pool = [...st.chambers];
        let hits = 0;
        for (const ch of w) { const k = pool.indexOf(ch); if (k >= 0) { pool.splice(k, 1); hits++; } }
        return { w, score: hits * 2 + w.length * 0.3 - (used.get(w) || 0) * 3 };
      }).sort((a2, b2) => b2.score - a2.score)[0].w;
      used.set(best, (used.get(best) || 0) + 1);
      await page.keyboard.type(best);
      await page.keyboard.press('Enter');
      typed++;
    }
    await page.waitForTimeout(220);
  }
  const r = rows.at(-1);
  console.log(`wave ${String(wave).padStart(2)}  ${r.result.padEnd(7)} ${String(r.seconds).padStart(3)}s  `
    + `${String(r.words).padStart(3)} words  ${String(r.kills).padStart(3)} kills  ${r.dossiers}/5 dossiers`);
  // back to the title for the next wave
  await page.evaluate(() => { const b = document.querySelector('#gameover #b-menu, #gameover #b-retry, #boiler #b-menu'); if (b) b.click(); });
  await page.waitForTimeout(300);
  writeTable(rows);                 // after every wave, so a cut-short run still counts
}
await browser.close();
if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 3));
console.log('wrote', OUT);
