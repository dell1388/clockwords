// ui.js — DOM screens layered over the canvas: title, level cards, the boiler
// room between levels, and the end-of-run summary.

import { MATERIALS, SPECIAL_MATERIALS, LETTER_LEVELS, MAX_LEVEL, CHAMBERS, START_CHAMBERS,
  START_PAGES, MIN_BOILER, MAX_BOILER, FIRE_RPM, STOKE_COST, CAMPAIGN, getLevel } from './content.js';
import { dictSize } from './dict.js';
import { BADGES, earned } from './achievements.js';
import { sfx } from './audio.js';

const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

export function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  document.body.classList.toggle('modal', id !== 'none');
}

// A letter reads as its glyph, its level in dots, and its material as colour —
// never as a written label.
export function chip(letter, mat, level, extra = '') {
  const m = MATERIALS[mat];
  const dots = `<i>${'<s></s>'.repeat(level)}</i>`;
  return `<span class="chip ${extra}" title="level ${level} · ${m.name}"
    style="--body:${m.body};--edge:${m.edge};--ink:${m.ink};--glow:${m.glow};--dot:${m.dot}">
    <b>${letter.toUpperCase()}</b>${dots}</span>`;
}
const swatch = mat => {
  const m = MATERIALS[mat];
  return `<span class="swatch" style="--body:${m.body};--edge:${m.edge};--glow:${m.glow}"></span>`;
};

// ── title ──────────────────────────────────────────────────────────────────
export function renderTitle(progress, on) {
  const started = progress.reached > 1 || !!progress.checkpoints[1];
  const t = $('#title');
  t.innerHTML = `
    <div class="plate">
      <div class="crest">⚙</div>
      <h1>CLOCKWORDS</h1>
      <p class="sub">a defence of the lexicon &mdash; London, 18&mdash;</p>
      <p class="story">Something mechanical is in the workshop, and it is after the
      pages of your formula. The engine on your bench turns words into ammunition.
      Type quickly. Type well.</p>
      <div class="btns">
        ${started ? `<button id="b-cont" class="big">Continue &mdash; level ${Math.min(CAMPAIGN, progress.reached)}</button>` : ''}
        <button id="b-play" class="big">${started ? 'Start over' : 'Begin'}</button>
        <button id="b-levels">Levels</button>
        <button id="b-how">How to play</button>
      </div>
      <ul class="badges">${BADGES.map(b => {
        const got = !!earned()[b.id];
        return `<li class="${got ? 'got' : ''}"><span class="bp">${got ? '★' : '☆'} ${b.pts}</span>
          <span><b class="bn">${b.name}</b> — ${b.desc}</span></li>`;
      }).join('')}</ul>
      <p class="fine">${dictSize().toLocaleString()} words in the lexicon</p>
    </div>`;
  const wire = (id, fn) => { const n = $(id); if (n) n.onclick = () => { sfx.clank(); fn(); }; };
  wire('#b-play', on.newGame);
  wire('#b-cont', on.cont);
  wire('#b-levels', on.levels);
  wire('#b-how', on.how);
}

// ── level select ───────────────────────────────────────────────────────────
export function renderLevels(progress, onPick, onBack) {
  const t = $('#levels');
  const cards = [];
  for (let n = 1; n <= CAMPAIGN; n++) {
    const def = getLevel(n);
    const open = n <= progress.reached;
    const best = progress.best[n];
    cards.push(`
      <button class="lvl ${open ? '' : 'locked'} ${def.boss ? 'boss' : ''}" data-lvl="${n}"
        ${open ? '' : 'disabled'}>
        <span class="ln">${String(n).padStart(2, '0')}</span>
        <span class="lt">${open ? def.name : 'Sealed'}</span>
        <span class="lb">${best ? `best ${best.toLocaleString()}`
          : open ? (def.boss ? 'boss night' : 'not yet cleared') : '—'}</span>
      </button>`);
  }
  t.innerHTML = `
    <div class="plate wide">
      <p class="kicker">The campaign</p>
      <h2>Twenty Nights</h2>
      <p class="d">Every night you walk into is kept. Fail one and you start that night
      again, with the boiler exactly as you carried it in — never the whole campaign.</p>
      <div class="lvlgrid">${cards.join('')}</div>
      <div class="btns"><button id="b-back" class="big">Back</button></div>
    </div>`;
  t.querySelectorAll('[data-lvl]').forEach(n => n.onclick = () => { sfx.clank(); onPick(+n.dataset.lvl); });
  $('#b-back').onclick = () => { sfx.clank(); onBack(); };
}

export function renderHow(onBack) {
  const t = $('#howto');
  const levels = LETTER_LEVELS.slice(1).map(L => `
    <li>${chip(L.pool[0], 'iron', L.level)}
      <b>Level ${L.level}</b> — <span class="num">${L.dmg}</span> damage
      <br><span class="d">${L.pool.toUpperCase().split('').join(' ')}</span></li>`).join('');
  const mats = [MATERIALS.iron, ...SPECIAL_MATERIALS].map(m => `
    <li>${swatch(m.id)} <b>${m.name}</b>${m.base ? '' : ` <span class="cost">${m.cost}⚙</span>`}
    <br><span class="d">${m.desc}</span></li>`).join('');
  t.innerHTML = `
    <div class="plate wide">
      <h2>How to play</h2>
      <div class="cols">
        <div>
          <h3>The engine</h3>
          <p>Type any English word and press <kbd>Enter</kbd>. Every letter of the word is
          fired at the bugs, one after another. A word that is not in the lexicon simply
          clears and tells you so — it costs you nothing but the typing.</p>
          <p>The boiler has <b>${CHAMBERS} chambers</b>, but every level starts with
          <b>${START_CHAMBERS === 1 ? 'only one unsealed' : `${START_CHAMBERS} unsealed`}</b>.
          Fire <i>every letter that was loaded when the last chamber opened</i> and exactly one
          more unseals. Letters that refill in the meantime do not count towards it, so you
          really do have to clear the board. At the top of the next level they all bolt shut
          again.</p>
          <p>The boiler never loads the same letter into two chambers at once unless it has
          nothing else left to load, and it never fills more chambers than it has letters.</p>
          <p>If a character you type is sitting in an unsealed chamber, the chamber reads as
          drawn down the moment you type it, then fires and refills from the bag. Any character
          <i>not</i> in a chamber is a <b>blank</b> — a flat 3 damage that no bonus or penalty
          ever changes.</p>
          <p>The cannon fires <b>one shell per letter, one every 0.2 seconds</b> (${FIRE_RPM} rounds
          a minute), and every shell finds a target: if its mark dies in flight the charge picks
          the next one. With nothing in the room the breech simply holds.</p>
          <p>Longer words hit harder. A word you have already used does less each time you
          repeat it. Use every loaded chamber in one word for a <b>boiler overload</b>. The
          <b>word of the day</b> doubles everything and explodes.</p>
          <h3>The bugs</h3>
          <p>Everything comes through the one arch still standing, and walks the route painted
          on the floor — across, down a lane, back across — until it reaches the machine, takes
          a page of the formula and retraces the whole run to get out. Kill a carrier and the
          page comes home. Lose all ${START_PAGES} pages and the night is over.</p>
          <h3>Controls</h3>
          <p><kbd>A&ndash;Z</kbd> type &middot; <kbd>Enter</kbd> or <kbd>Space</kbd> fire &middot;
          <kbd>Backspace</kbd> delete &middot; <kbd>Esc</kbd> clears the rack, and clears again
          to pause. Every letter key belongs to the word, so the sound toggle is the gear in
          the corner. Hold the <b>right mouse button</b> over the room to aim the cannon by
          hand; otherwise it picks its own target.</p>
        </div>
        <div>
          <h3>Letter levels</h3>
          <p>Letters are graded the way Scrabble grades them, and the grade is drawn as dots
          under the glyph. The level is what sets the damage — a rare letter is worth many
          common ones.</p>
          <ul class="mats">${levels}</ul>
          <h3>Materials</h3>
          <p>Materials are read by <b>colour</b> alone. Bugs only ever drop plain Iron. The one
          way to make a material is to put <b>two level ${MAX_LEVEL} letters</b> in the crucible:
          they burn away and leave a material behind on a fresh level 1 letter, both chosen by
          the crucible. Level that letter up and it keeps its material.</p>
          <ul class="mats">${mats}</ul>
          <h3>The boiler room</h3>
          <p>Between levels the <b>crucible</b> takes any even number of letters of one level and
          works through them in pairs: each pair becomes one letter of the level above in the
          same material, or — for level ${MAX_LEVEL} pairs — a material on a fresh level 1
          letter. The crucible picks what comes out, not you. Scrap what you do not want for a
          secret, and spend <b>${STOKE_COST} secrets</b> to stoke one fresh level 1 letter.</p>
          <p>The boiler runs on between <b>${MIN_BOILER}</b> and <b>${MAX_BOILER}</b> letters.
          Anything else lives in <b>storage</b>, out of the mix, until you draw it back.</p>
        </div>
      </div>
      <div class="btns"><button id="b-back" class="big">Back</button></div>
    </div>`;
  $('#b-back').onclick = () => { sfx.clank(); onBack(); };
}

// ── level card ─────────────────────────────────────────────────────────────
export function renderIntro(n, onGo) {
  const def = getLevel(n);
  const s = $('#intro');
  s.innerHTML = `
    <div class="plate">
      <div class="crest">${def.boss ? '☠' : '⚙'}</div>
      <p class="kicker">Level ${n}</p>
      <h2>${def.name}</h2>
      <p class="story">${def.flavour}</p>
      <div class="btns"><button id="b-go" class="big">Open the workshop</button></div>
      <p class="fine">press Enter</p>
    </div>`;
  const go = () => { sfx.clank(); onGo(); };
  $('#b-go').onclick = go;
  return go;
}

// ── boiler room ────────────────────────────────────────────────────────────
export function renderBoiler(game, onNext, onChange) {
  const s = $('#boiler');
  let selected = [];         // letter ids picked out of either rack

  // Whatever the bugs dropped tonight goes to the boiler, or to storage if the
  // boiler is already full.
  const recovered = game.pending.map(loot => {
    const r = game.boiler.stow(loot.letter, 'iron', loot.level);
    return { ...loot, where: r.where };
  });
  game.pending = [];

  function draw() {
    const bo = game.boiler;
    const sorted = arr => [...arr].sort((a, b) => b.level - a.level || a.letter.localeCompare(b.letter));
    const chips = arr => sorted(arr).map(l =>
      `<button class="chipbtn ${selected.includes(l.id) ? 'sel' : ''}" data-id="${l.id}">
        ${chip(l.letter, l.mat, l.level)}</button>`).join('');

    const picked = selected.map(id => bo.find(id)).filter(Boolean);
    const evenOk = bo.canCombineMany(picked);
    const combineStrands = evenOk && bo.strandsMany(picked);
    const canCombine = evenOk && !combineStrands;
    const pickedLevel = picked.length ? picked[0].level : 0;
    const sameLevel = picked.length > 0 && picked.every(l => l.level === pickedLevel);
    const one = picked.length === 1 ? picked[0] : null;
    const scrapStrands = !!one && bo.wouldStrand([one.id]);
    const all = [...bo.inventory, ...bo.store];
    const byLevel = {};
    for (const l of all) byLevel[l.level] = (byLevel[l.level] || 0) + 1;

    const fromBoiler = picked.filter(l => bo.inBoiler(l.id));
    const fromStore = picked.filter(l => !bo.inBoiler(l.id));
    const canStow = fromBoiler.length > 0 && bo.inventory.length - fromBoiler.length >= MIN_BOILER;
    const canDraw = fromStore.length > 0 && bo.inventory.length + fromStore.length <= MAX_BOILER;

    const SHOWN = 14;
    const recHtml = recovered.length
      ? recovered.slice(0, SHOWN)
          .map(r => chip(r.letter, 'iron', r.level, r.where === 'store' ? 'stowed' : '')).join(' ')
        + (recovered.length > SHOWN ? `<span class="d">and ${recovered.length - SHOWN} more</span>` : '')
      : '<span class="d">Nothing fell tonight.</span>';

    const short = bo.short();
    const gauge = `<span class="gauge ${bo.inventory.length >= MAX_BOILER ? 'full' : short ? 'low' : ''}">
      ${bo.inventory.length} / ${MAX_BOILER}</span>`;

    s.innerHTML = `
      <div class="plate wide boilerroom">
        <div class="brhead">
          <div>
            <p class="kicker">Level ${game.levelNo} cleared</p>
            <h2>The Boiler Room</h2>
          </div>
          <div class="tally">
            <span class="big-num">⚙ ${game.secrets}</span><span class="d">secrets</span>
          </div>
        </div>
        <p class="d recap">+${game.levelSecrets} secrets · ${game.levelKills} bugs ·
          ${game.pages}/${START_PAGES} pages intact · the chambers bolt shut again at the next level</p>
        <p class="recovered"><span class="lbl">Recovered tonight</span> ${recHtml}</p>

        <div class="cols3">
          <section>
            <h3>Boiler ${gauge}</h3>
            <p class="d">What the chambers draw from. It runs on no fewer than
            ${MIN_BOILER} letters and holds no more than ${MAX_BOILER}.</p>
            <div class="inv">${chips(bo.inventory) || '<p class="d">Empty.</p>'}</div>
            <button id="b-stow" class="small" ${canStow ? '' : 'disabled'}>Move to storage &darr;</button>
          </section>

          <section>
            <h3>Storage <span class="d">&middot; ${bo.store.length}</span></h3>
            <p class="d">Letters kept out of the mix. Nothing here is ever loaded
            into a chamber.</p>
            <div class="inv">${chips(bo.store) || '<p class="d">Empty.</p>'}</div>
            <button id="b-draw" class="small" ${canDraw ? '' : 'disabled'}>Move to boiler &uarr;</button>
          </section>

          <section>
            <h3>Crucible</h3>
            <p class="d">Feed it any <b>even</b> number of letters of one level and it works
            through them two at a time.</p>
            <div class="levelpicks">
              ${Object.keys(byLevel).sort().map(lv => `
                <button class="letbtn ${pickedLevel === +lv && sameLevel ? 'sel' : ''}"
                  data-all="${lv}">${'•'.repeat(+lv)} <sup>${byLevel[lv]}</sup></button>`).join('')}
              ${selected.length ? '<button class="letbtn" data-clear="1">clear</button>' : ''}
            </div>
            <div class="feed">${picked.length
              ? picked.map(l => chip(l.letter, l.mat, l.level)).join('')
              : '<span class="d">nothing loaded</span>'}</div>
            ${canCombine
              ? (pickedLevel >= MAX_LEVEL
                ? `<p class="d hot">${picked.length} level ${MAX_LEVEL} letters burn away and
                   leave <b>${picked.length / 2} material${picked.length > 2 ? 's' : ''}</b>
                   behind, each on a fresh level 1 letter. This is the only way a material is
                   ever made — and the crucible chooses both.</p>
                   <div class="matrow">${SPECIAL_MATERIALS.map(m => swatch(m.id)).join('')}</div>
                   <button id="b-fuse" class="big">Fire the crucible</button>`
                : `<p class="d">${picked.length} × level ${pickedLevel} &rarr;
                   <b>${picked.length / 2} × level ${pickedLevel + 1}</b>, same material.
                   The crucible decides which letters come out.</p>
                   <button id="b-fuse" class="big">Combine</button>`)
              : `<p class="d">${combineStrands
                  ? `That would leave the boiler under ${MIN_BOILER} letters. Draw one back out
                     of storage, or stoke a new one, first.`
                  : !picked.length ? 'Pick a level above, or click letters directly.'
                    : !sameLevel ? 'Every letter must be the same level.'
                      : 'Load an even number — the crucible works in pairs.'}</p>`}
            <div class="benchrow">
              <button id="b-stoke" class="small" ${game.secrets >= STOKE_COST ? '' : 'disabled'}
                >Stoke for ${STOKE_COST} ⚙</button>
              <button id="b-scrap" class="small" ${one && !scrapStrands ? '' : 'disabled'}
                >Scrap for 1 ⚙</button>
            </div>
            <p class="d fine">Stoking buys one fresh level 1 Iron letter.</p>
          </section>
        </div>

        ${short ? `<p class="warn">The boiler needs ${short} more letter${short > 1 ? 's' : ''}
          before it will run.</p>` : ''}
        <div class="btns">
          <button id="b-next" class="big" ${short ? 'disabled' : ''}>${game.levelNo >= CAMPAIGN ? "Finish" : `To level ${game.levelNo + 1}`} &rarr;</button>
        </div>
      </div>`;

    s.querySelectorAll('[data-id]').forEach(n => n.onclick = () => {
      const id = +n.dataset.id;
      if (selected.includes(id)) selected = selected.filter(x => x !== id);
      else selected.push(id);
      sfx.key(); draw();
    });

    s.querySelectorAll('[data-all]').forEach(n => n.onclick = () => {
      const lv = +n.dataset.all;
      const ids = all.filter(l => l.level === lv).map(l => l.id);
      if (ids.length % 2) ids.pop();                    // the crucible works in pairs
      selected = ids;
      sfx.key(); draw();
    });
    s.querySelectorAll('[data-clear]').forEach(n => n.onclick = () => { selected = []; sfx.key(); draw(); });

    const on = (id, fn) => { const n = $(id); if (n) n.onclick = fn; };
    on('#b-stow', () => { for (const l of fromBoiler) bo.toStore(l.id); selected = []; sfx.clank(); draw(); });
    on('#b-draw', () => { for (const l of fromStore) bo.toBoiler(l.id); selected = []; sfx.clank(); draw(); });
    on('#b-scrap', () => { if (scrapStrands) return; bo.discard(one.id); game.secrets += 1; selected = []; sfx.clank(); draw(); });
    on('#b-fuse', () => {
      if (!canCombine) return;
      const made = bo.combineMany(picked);
      selected = []; sfx.overload();
      if (made.length === 1) {
        const m = made[0];
        toast({ name: `${m.letter.toUpperCase()} — level ${m.level}`,
          desc: m.mat === 'iron' ? 'out of the crucible'
            : `out of the crucible in ${MATERIALS[m.mat].name}`, pts: m.level });
      } else if (made.length) {
        toast({ name: made.map(m => m.letter.toUpperCase()).join(' '),
          desc: `${made.length} out of the crucible`, pts: made.length });
      }
      draw();
    });
    on('#b-stoke', () => {
      if (game.secrets < STOKE_COST) return;
      game.secrets -= STOKE_COST;
      const r = bo.stoke();
      sfx.steam();
      toast({ name: `${r.letter.letter.toUpperCase()} — level 1`,
        desc: r.where === 'store' ? 'boiler full, sent to storage' : 'straight into the boiler', pts: 1 });
      draw();
    });
    on('#b-next', () => { if (!bo.short()) { sfx.clank(); onNext(); } });
    if (onChange) onChange();
  }
  draw();
}

// ── end of run ─────────────────────────────────────────────────────────────
export function renderOver(game, on) {
  const t = $('#gameover');
  t.innerHTML = `
    <div class="plate">
      <div class="crest sad">☠</div>
      <p class="kicker">Level ${game.levelNo} — ${getLevel(game.levelNo).name}</p>
      <h2>The formula is gone</h2>
      <p class="story">All ${START_PAGES} pages were carried off into the dark.
      Only tonight is lost — the workshop stands, and the boiler is as you carried it in.</p>
      <ul class="stats">
        <li><span>Score</span><b>${game.score.toLocaleString()}</b></li>
        <li><span>Bugs destroyed</span><b>${game.stats.kills}</b></li>
        <li><span>Words fired</span><b>${game.stats.words}</b></li>
        <li><span>Damage dealt</span><b>${Math.round(game.stats.damage).toLocaleString()}</b></li>
        <li><span>Best word</span><b>${game.stats.best || '—'} (${game.stats.bestDmg})</b></li>
        <li><span>Longest word</span><b>${game.stats.longest || '—'}</b></li>
      </ul>
      <div class="btns">
        <button id="b-retry" class="big">Fight level ${game.levelNo} again</button>
        <button id="b-levels">Levels</button>
        <button id="b-title">Title screen</button>
      </div>
    </div>`;
  const wire = (id, fn) => { const n = $(id); if (n) n.onclick = () => { sfx.clank(); fn(); }; };
  wire('#b-retry', on.retry); wire('#b-levels', on.levels); wire('#b-title', on.title);
}

export function renderWin(game, on) {
  const t = $('#gameover');
  t.innerHTML = `
    <div class="plate">
      <div class="crest">★</div>
      <p class="kicker">Twenty nights</p>
      <h2>The formula holds</h2>
      <p class="story">The last of them went back through the arch and did not come out
      again. Whatever was sending them has run out of machines. London gets its genius
      after all.</p>
      <ul class="stats">
        <li><span>Final score</span><b>${game.score.toLocaleString()}</b></li>
        <li><span>Bugs destroyed</span><b>${game.stats.kills}</b></li>
        <li><span>Words fired</span><b>${game.stats.words}</b></li>
        <li><span>Damage dealt</span><b>${Math.round(game.stats.damage).toLocaleString()}</b></li>
        <li><span>Best word</span><b>${game.stats.best || '—'} (${game.stats.bestDmg})</b></li>
        <li><span>Longest word</span><b>${game.stats.longest || '—'}</b></li>
      </ul>
      <div class="btns">
        <button id="b-levels" class="big">Levels</button>
        <button id="b-title">Title screen</button>
      </div>
    </div>`;
  const wire = (id, fn) => { const n = $(id); if (n) n.onclick = () => { sfx.clank(); fn(); }; };
  wire('#b-levels', on.levels); wire('#b-title', on.title);
}

export function renderPause(onResume, onTitle) {
  const s = $('#pause');
  s.innerHTML = `
    <div class="plate">
      <div class="crest">⏸</div>
      <h2>Paused</h2>
      <div class="btns">
        <button id="b-res" class="big">Resume</button>
        <button id="b-quit">Abandon the night</button>
      </div>
    </div>`;
  $('#b-res').onclick = () => { sfx.clank(); onResume(); };
  $('#b-quit').onclick = () => { sfx.clank(); onTitle(); };
}

export function setLoading(pct, msg) {
  const bar = $('#loadbar'), txt = $('#loadtxt');
  if (bar) bar.style.width = Math.round(pct * 100) + '%';
  if (txt && msg) txt.textContent = msg;
}

export function toast(b) {
  const box = document.getElementById('toasts');
  const n = el('div', 'toast', `<b>${b.name}</b><span>${b.desc} &middot; ${b.pts} points</span>`);
  box.appendChild(n);
  setTimeout(() => n.remove(), 5200);
}
