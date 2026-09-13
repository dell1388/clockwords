// ui.js — DOM screens layered over the canvas: title, level cards, the boiler
// room between levels, and the end-of-run summary.

import { MATERIALS, SPECIAL_MATERIALS, LETTER_LEVELS, MAX_LEVEL, CHAMBERS, START_CHAMBERS, START_PAGES, getLevel } from './content.js';
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
  return `<span class="chip ${extra}" style="--body:${m.body};--edge:${m.edge};--ink:${m.ink};--glow:${m.glow};--dot:${m.dot}">
    <b>${letter.toUpperCase()}</b>${dots}</span>`;
}
const swatch = mat => {
  const m = MATERIALS[mat];
  return `<span class="swatch" style="--body:${m.body};--edge:${m.edge};--glow:${m.glow}"></span>`;
};

// ── title ──────────────────────────────────────────────────────────────────
export function renderTitle(hasSave, onPlay, onContinue, onHow) {
  const s = $('#title');
  s.innerHTML = `
    <div class="plate">
      <div class="crest">⚙</div>
      <h1>CLOCKWORDS</h1>
      <p class="sub">a defence of the lexicon &mdash; London, 18&mdash;</p>
      <p class="story">Something mechanical is in the workshop, and it is after the
      pages of your formula. The engine on your bench turns words into ammunition.
      Type quickly. Type well.</p>
      <div class="btns">
        ${hasSave ? '<button id="b-cont" class="big">Continue</button>' : ''}
        <button id="b-play" class="big">${hasSave ? 'New game' : 'Begin'}</button>
        <button id="b-how">How to play</button>
      </div>
      <ul class="badges">${BADGES.map(b => {
        const got = !!earned()[b.id];
        return `<li class="${got ? 'got' : ''}"><span class="bp">${got ? '★' : '☆'} ${b.pts}</span>
          <span><b class="bn">${b.name}</b> — ${b.desc}</span></li>`;
      }).join('')}</ul>
      <p class="fine">${dictSize().toLocaleString()} words in the lexicon</p>
    </div>`;
  $('#b-play').onclick = () => { sfx.clank(); onPlay(); };
  if (hasSave) $('#b-cont').onclick = () => { sfx.clank(); onContinue(); };
  $('#b-how').onclick = () => { sfx.clank(); onHow(); };
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
          <p>The boiler has <b>${CHAMBERS} chambers</b>, but it starts with
          <b>${START_CHAMBERS === 1 ? 'only one unsealed' : `${START_CHAMBERS} unsealed`}</b>.
          Spend everything the unsealed chambers hold and the next one opens, so the engine
          widens as you use it.</p>
          <p>If a character you type is sitting in an unsealed chamber, that chamber fires
          and then empties and refills from the bag. Any character <i>not</i> in a chamber is
          a <b>blank</b>, worth 1 damage.</p>
          <p>Longer words hit harder. A word you have already used does less each time you
          repeat it. Use every loaded chamber in one word for a <b>boiler overload</b>. The
          <b>word of the day</b> doubles everything and explodes.</p>
          <h3>The bugs</h3>
          <p>They come through the grates and sweep the room — across, down a lane, back
          across — until they reach the machine, take a page of the formula and retrace the
          whole route to get out. Kill a carrier and the page comes home. Lose all
          ${START_PAGES} pages and the night is over.</p>
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
          <p>Materials are read by <b>colour</b> alone. Bugs only ever drop plain Iron; a
          letter has to reach <b>level ${MAX_LEVEL}</b> before it is rare enough to be refitted
          with anything else.</p>
          <ul class="mats">${mats}</ul>
          <h3>The boiler room</h3>
          <p>Between levels: <b>combine</b> two letters of the same level into one letter of
          the level above, in the same material and of your choosing — or spend
          <b>secrets</b> to refit a level-${MAX_LEVEL} letter, or scrap what you do not want.</p>
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
export function renderBoiler(game, onNext) {
  const s = $('#boiler');
  let selected = [];         // letter ids picked out of the boiler
  let pickLetter = null, pickMat = null;

  // Whatever the bugs dropped tonight goes into the boiler now.
  const recovered = game.pending.slice();
  for (const loot of game.pending) game.boiler.add(loot.letter, 'iron', loot.level);
  game.pending = [];

  function draw() {
    const inv = game.boiler.inventory;
    const byLevel = [...inv].sort((a, b) => b.level - a.level || a.letter.localeCompare(b.letter));
    const invHtml = byLevel.map(l =>
      `<button class="chipbtn ${selected.includes(l.id) ? 'sel' : ''}" data-id="${l.id}">
        ${chip(l.letter, l.mat, l.level)}</button>`).join('')
      || '<p class="d">Your boiler is empty.</p>';

    const a = inv.find(l => l.id === selected[0]);
    const b = inv.find(l => l.id === selected[1]);
    const canCombine = game.boiler.canCombine(a, b);
    const nextLevel = a ? a.level + 1 : 0;
    const outLetters = canCombine ? LETTER_LEVELS[nextLevel].pool.split('').map(ch =>
      `<button class="letbtn ${pickLetter === ch ? 'sel' : ''}" data-clet="${ch}">${ch.toUpperCase()}</button>`).join('') : '';

    const one = selected.length === 1 ? a : null;
    const canRefit = game.boiler.canRefit(one);
    const matHtml = canRefit ? SPECIAL_MATERIALS.map(m => {
      const afford = game.secrets >= m.cost && one.mat !== m.id;
      return `<button class="matbtn ${pickMat === m.id ? 'sel' : ''} ${afford ? '' : 'off'}" data-rmat="${m.id}">
        ${swatch(m.id)}<b>${m.name}</b><span class="cost">${m.cost}⚙</span>
        <span class="d">${m.desc}</span></button>`;
    }).join('') : '';

    const recHtml = recovered.length
      ? recovered.map(r => chip(r.letter, 'iron', r.level)).join(' ')
      : '<span class="d">Nothing fell tonight.</span>';

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
          ${game.pages}/${START_PAGES} pages intact · ${game.boiler.open}/${CHAMBERS} chambers unsealed</p>
        <p class="recovered"><span class="lbl">Recovered tonight</span> ${recHtml}</p>

        <div class="cols3">
          <section>
            <h3>Your boiler <span class="d">&middot; ${inv.length} letters</span></h3>
            <p class="d">Dots are the level. Colour is the material. Pick two of the same
            level to combine, or one on its own to refit or scrap.</p>
            <div class="inv">${invHtml}</div>
            <button id="b-scrap" class="small" ${one ? '' : 'disabled'}>Scrap for 1 ⚙</button>
          </section>

          <section>
            <h3>Combine</h3>
            <div class="slots">
              <div class="slot">${a ? chip(a.letter, a.mat, a.level) : '<span class="d">slot</span>'}</div>
              <span class="plus">+</span>
              <div class="slot">${b ? chip(b.letter, b.mat, b.level) : '<span class="d">slot</span>'}</div>
            </div>
            ${canCombine ? `<p class="d">Two level ${a.level} letters make one level
              ${nextLevel}. Choose which letter you get.</p>
              <div class="letrow">${outLetters}</div>
              <button id="b-fuse" class="big" ${pickLetter ? '' : 'disabled'}>Combine</button>`
              : `<p class="d">${selected.length < 2 ? 'Select two letters of the same level.'
                  : a && b && a.level >= MAX_LEVEL ? `Level ${MAX_LEVEL} is the top of the rack — refit it instead.`
                  : 'Both letters must be the same level.'}</p>`}
          </section>

          <section>
            <h3>Refit</h3>
            ${one ? (canRefit
              ? `<p class="d">${one.letter.toUpperCase()} is rare enough to hold a material.</p>
                 <div class="matlist">${matHtml}</div>
                 <button id="b-refit" class="big" ${pickMat && game.secrets >= MATERIALS[pickMat].cost
                   && one.mat !== pickMat ? '' : 'disabled'}>Refit</button>`
              : `<p class="d">Only a level ${MAX_LEVEL} letter can be refitted.
                 ${one.letter.toUpperCase()} is level ${one.level} — combine it up first.</p>`)
              : '<p class="d">Select a single letter.</p>'}
          </section>
        </div>

        <div class="btns"><button id="b-next" class="big">To level ${game.levelNo + 1} &rarr;</button></div>
      </div>`;

    s.querySelectorAll('[data-id]').forEach(n => n.onclick = () => {
      const id = +n.dataset.id;
      if (selected.includes(id)) selected = selected.filter(x => x !== id);
      else { selected.push(id); if (selected.length > 2) selected.shift(); }
      pickLetter = null; pickMat = null;
      sfx.key(); draw();
    });
    s.querySelectorAll('[data-clet]').forEach(n => n.onclick = () => { pickLetter = n.dataset.clet; sfx.key(); draw(); });
    s.querySelectorAll('[data-rmat]').forEach(n => n.onclick = () => { pickMat = n.dataset.rmat; sfx.key(); draw(); });

    const scrap = $('#b-scrap');
    if (scrap) scrap.onclick = () => {
      game.boiler.remove(one.id); game.secrets += 1; selected = []; sfx.clank(); draw();
    };
    const fuse = $('#b-fuse');
    if (fuse) fuse.onclick = () => {
      game.boiler.combine(a, b, pickLetter);
      selected = []; pickLetter = null; sfx.overload(); draw();
    };
    const refit = $('#b-refit');
    if (refit) refit.onclick = () => {
      game.secrets -= MATERIALS[pickMat].cost;
      game.boiler.refit(one.id, pickMat);
      pickMat = null; sfx.steam(); draw();
    };
    $('#b-next').onclick = () => { sfx.clank(); onNext(); };
  }
  draw();
}

// ── end of run ─────────────────────────────────────────────────────────────
export function renderOver(game, onRetry, onTitle) {
  const s = $('#gameover');
  s.innerHTML = `
    <div class="plate">
      <div class="crest sad">☠</div>
      <h2>The formula is gone</h2>
      <p class="story">All ${START_PAGES} pages were carried off into the dark.
      London will have to wait for its genius.</p>
      <ul class="stats">
        <li><span>Level reached</span><b>${game.levelNo}</b></li>
        <li><span>Score</span><b>${game.score.toLocaleString()}</b></li>
        <li><span>Bugs destroyed</span><b>${game.stats.kills}</b></li>
        <li><span>Words fired</span><b>${game.stats.words}</b></li>
        <li><span>Damage dealt</span><b>${Math.round(game.stats.damage).toLocaleString()}</b></li>
        <li><span>Best word</span><b>${game.stats.best || '—'} (${game.stats.bestDmg})</b></li>
        <li><span>Longest word</span><b>${game.stats.longest || '—'}</b></li>
      </ul>
      <div class="btns">
        <button id="b-retry" class="big">Try again</button>
        <button id="b-title">Title screen</button>
      </div>
    </div>`;
  $('#b-retry').onclick = () => { sfx.clank(); onRetry(); };
  $('#b-title').onclick = () => { sfx.clank(); onTitle(); };
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
