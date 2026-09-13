// ui.js — DOM screens layered over the canvas: title, level cards, the boiler
// room between levels, and the end-of-run summary.

import { MATERIALS, TIERS, MAX_TIER, CHAMBERS, START_PAGES, getLevel } from './content.js';
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

export function chip(letter, mat, extra = '') {
  const m = MATERIALS[mat];
  return `<span class="chip ${extra}" style="--body:${m.body};--edge:${m.edge};--ink:${m.ink};--glow:${m.glow}">
    <b>${letter.toUpperCase()}</b><i>${m.name}</i></span>`;
}

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
  const s = $('#howto');
  const mats = Object.values(MATERIALS).map(m => `
    <li>${chip('a', m.id)} <b>${m.name}</b> <span class="tier">tier ${m.tier}</span>
    <span class="cost">${m.cost} secrets</span><br><span class="d">${m.desc}</span></li>`).join('');
  s.innerHTML = `
    <div class="plate wide">
      <h2>How to play</h2>
      <div class="cols">
        <div>
          <h3>The engine</h3>
          <p>Type any English word and press <kbd>Enter</kbd>. Every letter of the word is
          fired at the bugs, one after another.</p>
          <p>The boiler keeps <b>${CHAMBERS} chambers</b> loaded with your special letters.
          If a character you type is sitting in a chamber, that chamber fires &mdash; with its
          material's damage and effect &mdash; and then empties and refills.
          Any character <i>not</i> in a chamber is a <b>blank</b>, worth 1 damage.</p>
          <p>Longer words hit harder. A word you have already used this run does less each
          time you repeat it. Use every loaded chamber in one word for a <b>boiler
          overload</b>. The <b>word of the day</b> doubles everything and explodes.</p>
          <h3>The bugs</h3>
          <p>They come through the grates, cross the floor, take a page of your formula
          from the machine and run for the door. Kill a carrier and the page comes back.
          Lose all ${START_PAGES} pages and the night is over.</p>
          <h3>Controls</h3>
          <p><kbd>A&ndash;Z</kbd> type &middot; <kbd>Enter</kbd> or <kbd>Space</kbd> fire &middot;
          <kbd>Backspace</kbd> delete &middot; <kbd>Esc</kbd> clears the rack, and clears again to
          pause. Every letter key belongs to the word, so the sound toggle is the gear in the corner.
          Hold the <b>right mouse button</b> over the room to aim the cannon by hand;
          otherwise it picks its own target.</p>
        </div>
        <div>
          <h3>Materials</h3>
          <ul class="mats">${mats}</ul>
          <h3>The boiler room</h3>
          <p>Between levels you spend <b>secrets</b>. Bugs drop letters as they die; forge a
          dropped letter into any material you can afford, or <b>transmute</b> two letters of
          the same tier into one of the tier above.</p>
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
  let selected = [];         // letter ids picked for transmuting
  let forgeLetter = null, forgeMat = null;

  function draw() {
    const inv = game.boiler.inventory;
    const invHtml = inv.map(l => {
      const sel = selected.includes(l.id) ? 'sel' : '';
      return `<button class="chipbtn ${sel}" data-id="${l.id}">${chip(l.letter, l.mat)}</button>`;
    }).join('') || '<p class="d">Your boiler is empty.</p>';

    const a = inv.find(l => l.id === selected[0]);
    const b = inv.find(l => l.id === selected[1]);
    const can = game.boiler.canTransmute(a, b);
    const nextTier = a ? MATERIALS[a.mat].tier + 1 : 0;
    const outMats = can ? TIERS[nextTier].map(id => `
        <button class="matbtn ${forgeMat === id ? 'sel' : ''}" data-tmat="${id}">
          ${chip('?', id)}<span class="d">${MATERIALS[id].desc}</span></button>`).join('') : '';
    const outLetters = can ? [...new Set([a.letter, b.letter])].map(ch =>
      `<button class="letbtn ${forgeLetter === ch ? 'sel' : ''}" data-tlet="${ch}">${ch.toUpperCase()}</button>`).join('') : '';

    const discovered = Object.entries(game.discovered).filter(([, n]) => n > 0)
      .sort(([x], [y]) => x.localeCompare(y));
    const discHtml = discovered.map(([ch, n]) =>
      `<button class="letbtn ${forgeLetter === ch ? 'sel' : ''}" data-flet="${ch}">${ch.toUpperCase()}<sup>${n}</sup></button>`).join('')
      || '<p class="d">No letters recovered yet — kill more bugs.</p>';

    const shopHtml = Object.values(MATERIALS).map(m => {
      const afford = game.secrets >= m.cost;
      return `<button class="matbtn ${forgeMat === m.id ? 'sel' : ''} ${afford ? '' : 'off'}" data-fmat="${m.id}">
        ${chip('?', m.id)}<span class="cost">${m.cost}⚙</span><span class="d">${m.desc}</span></button>`;
    }).join('');

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
        <p class="d recap">+${game.levelSecrets} secrets · ${game.levelKills} bugs · ${game.pages}/${START_PAGES} pages intact</p>

        <div class="cols3">
          <section>
            <h3>Your boiler <span class="d">&middot; ${game.boiler.inventory.length} letters</span></h3>
            <p class="d">Pick two of the same tier to transmute, or one to scrap.</p>
            <div class="inv">${invHtml}</div>
            <button id="b-scrap" class="small" ${selected.length === 1 ? '' : 'disabled'}>Scrap selected</button>
          </section>

          <section>
            <h3>Transmute</h3>
            <div class="slots">
              <div class="slot">${a ? chip(a.letter, a.mat) : '<span class="d">slot</span>'}</div>
              <span class="plus">+</span>
              <div class="slot">${b ? chip(b.letter, b.mat) : '<span class="d">slot</span>'}</div>
            </div>
            ${can ? `<p class="d">Fuses into tier ${nextTier}. Choose the material and which letter it keeps.</p>
              <div class="matlist">${outMats}</div>
              <div class="letrow">${outLetters}</div>
              <button id="b-fuse" class="big" ${forgeMat && forgeLetter ? '' : 'disabled'}>Fuse</button>`
              : `<p class="d">${selected.length < 2 ? 'Select two letters.' :
                  a && b && MATERIALS[a.mat].tier === MAX_TIER ? 'Already at the highest tier.' :
                  'Both letters must be the same tier.'}</p>`}
          </section>

          <section>
            <h3>Forge</h3>
            <p class="d">Letters recovered from the bugs:</p>
            <div class="letrow">${discHtml}</div>
            <div class="matlist">${shopHtml}</div>
            <button id="b-forge" class="big" ${forgeLetter && forgeMat && game.discovered[forgeLetter] > 0
              && game.secrets >= MATERIALS[forgeMat].cost ? '' : 'disabled'}>Forge</button>
          </section>
        </div>

        <div class="btns"><button id="b-next" class="big">To level ${game.levelNo + 1} &rarr;</button></div>
      </div>`;

    s.querySelectorAll('[data-id]').forEach(n => n.onclick = () => {
      const id = +n.dataset.id;
      if (selected.includes(id)) selected = selected.filter(x => x !== id);
      else { selected.push(id); if (selected.length > 2) selected.shift(); }
      forgeMat = null; forgeLetter = null;
      sfx.key(); draw();
    });
    s.querySelectorAll('[data-tmat]').forEach(n => n.onclick = () => { forgeMat = n.dataset.tmat; sfx.key(); draw(); });
    s.querySelectorAll('[data-tlet]').forEach(n => n.onclick = () => { forgeLetter = n.dataset.tlet; sfx.key(); draw(); });
    s.querySelectorAll('[data-flet]').forEach(n => n.onclick = () => { forgeLetter = n.dataset.flet; sfx.key(); draw(); });
    s.querySelectorAll('[data-fmat]').forEach(n => n.onclick = () => { forgeMat = n.dataset.fmat; sfx.key(); draw(); });

    const scrap = $('#b-scrap');
    if (scrap) scrap.onclick = () => {
      game.boiler.remove(selected[0]); selected = []; sfx.clank(); draw();
    };
    const fuse = $('#b-fuse');
    if (fuse) fuse.onclick = () => {
      game.boiler.transmute(a, b, forgeMat, forgeLetter);
      selected = []; forgeMat = null; forgeLetter = null;
      sfx.overload(); draw();
    };
    const forge = $('#b-forge');
    if (forge) forge.onclick = () => {
      game.secrets -= MATERIALS[forgeMat].cost;
      game.discovered[forgeLetter]--;
      game.boiler.add(forgeLetter, forgeMat);
      forgeMat = null; forgeLetter = null;
      sfx.steam(); draw();
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
