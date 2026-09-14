// ui.js — DOM screens layered over the canvas: title, level cards, the boiler
// room between levels, and the end-of-run summary.

import { MATERIALS, SPECIAL_MATERIALS, LETTER_LEVELS, MAX_LEVEL, CHAMBERS, START_CHAMBERS,
  START_PAGES, MIN_BOILER, MAX_BOILER, FIRE_RPM, STOKE_COST, CAMPAIGN, BLANK_DMG, getLevel } from './content.js';
import { dictSize } from './dict.js';
import { BADGES, earned } from './achievements.js';
import { sfx, isMuted, setMuted } from './audio.js';

const $ = sel => document.querySelector(sel);
// Screens share button ids (#b-back, #b-next, #b-title...), and every screen's
// markup stays in the document while hidden — so always look inside the screen
// being wired, never across the whole page.
const wireIn = root => (sel, fn) => {
  const n = root.querySelector(sel);
  if (n) n.onclick = () => { sfx.clank(); fn(); };
  return n;
};
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
  const started = progress.reached > 1 || !!progress.loadout;
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
        <button id="b-boiler">Boiler room</button>
        <button id="b-how">How to play</button>
        <button id="b-sound">Sound: ${isMuted() ? 'off' : 'on'}</button>
      </div>
      <ul class="badges">${BADGES.map(b => {
        const got = !!earned()[b.id];
        return `<li class="${got ? 'got' : ''}"><span class="bp">${got ? '★' : '☆'} ${b.pts}</span>
          <span><b class="bn">${b.name}</b> — ${b.desc}</span></li>`;
      }).join('')}</ul>
      <p class="fine">${dictSize().toLocaleString()} words in the lexicon</p>
    </div>`;
  const wire = wireIn(t);
  wire('#b-play', on.newGame);
  wire('#b-cont', on.cont);
  wire('#b-levels', on.levels);
  wire('#b-boiler', on.boiler);
  wire('#b-how', on.how);
  wire('#b-sound', () => { setMuted(!isMuted()); on.sound && on.sound(); renderTitle(progress, on); });
}

// ── level select ───────────────────────────────────────────────────────────
export function renderLevels(progress, onPick, onBack, onBoiler) {
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
      <p class="d">One boiler carries the whole run: whichever night you pick, you take the
      same letters in, and they only ever change in the boiler room. Fail a night and you
      start that night again — never the whole campaign.</p>
      <div class="lvlgrid">${cards.join('')}</div>
      <div class="btns">
        <button id="b-back" class="big">Back</button>
        <button id="b-boiler">Boiler room</button>
      </div>
    </div>`;
  t.querySelectorAll('[data-lvl]').forEach(n => n.onclick = () => { sfx.clank(); onPick(+n.dataset.lvl); });
  const wire = wireIn(t);
  wire('#b-back', onBack);
  wire('#b-boiler', onBoiler);
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
          A chamber unseals only when <b>a single word spends every chamber that is loaded</b> —
          the same full house that earns a boiler overload. Draining them across several words
          does nothing. At the top of the next level they all bolt shut again.</p>
          <p>Stuck with a letter you cannot use? <b>Click the tank</b> to tip it back into the bag
          and draw another. The boiler never loads the same letter into two chambers at once
          unless it has nothing else, and never fills more chambers than it has letters.</p>
          <p>If a character you type is sitting in an unsealed chamber, the chamber reads as
          drawn down the moment you type it, then fires and refills from the bag. Any character
          <i>not</i> in a chamber is a <b>blank</b> — a flat ${BLANK_DMG} damage that no bonus or
          penalty ever changes.</p>
          <p>The cannon fires <b>one shell per letter, one every 0.2 seconds</b> (${FIRE_RPM} rounds
          a minute). It <b>leads</b> its target — works out where the bug will be — and the shell
          trims that lead gently in flight; it cannot turn sharply enough to circle back, so a
          shell that really misses is gone. It also counts what is already in the air, and holds
          the breech rather than spend a shell on something that is as good as dead.</p>
          <p>Length pays, and pays steeply: <b>twice the length is three times the damage,
          three times the length about six</b>. A word made <i>entirely</i> of chamber letters,
          with no blanks in it at all, does <b>double</b>. A word you have already used
          <i>on this level</i> does less each time you repeat it — every level starts the
          ledger again. Use every loaded chamber in one word for a <b>boiler overload</b>. The
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
          <p>A material lends its effect to <b>every letter in the word it is fired with</b>,
          blanks included, and different materials <b>stack</b>: one Lazurite and one Thermite
          and the whole word freezes and burns. Each letter still does its own damage.</p>
          <p>The <b>level of the letter carrying it</b> sets how hard the effect works, the way
          it sets damage. Lazurite on a level 1 letter freezes for 4 seconds; on a level
          ${MAX_LEVEL} letter, 9. Amethyst pierces 2 targets, or 6. Jade echoes at 70%, or full
          strength.</p>
          <ul class="mats">${mats}</ul>
          <h3>The boiler room</h3>
          <p>The boiler room is reachable without playing: the title screen, the level select
          and the card in front of every night all open it.</p>
          <p><b>Everything new lands in storage</b> — letters the bugs drop, anything out of the
          crucible, anything you stoke. The boiler only ever holds what you put there. Set a
          <b>quota</b> per letter and it looks after itself: the number is drawn out of storage
          and anything above it is sent back down. A quota of <b>0</b> keeps a letter out of the
          boiler entirely.</p>
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
      <p class="fine">press Esc or Enter to go back</p>
    </div>`;
  wireIn(t)('#b-back', onBack);
  return onBack;
}

// ── level card ─────────────────────────────────────────────────────────────
export function renderIntro(n, { onGo, onBoiler, onBack }) {
  const def = getLevel(n);
  const t = $('#intro');
  t.innerHTML = `
    <div class="plate">
      <div class="crest">${def.boss ? '☠' : '⚙'}</div>
      <p class="kicker">Level ${n}</p>
      <h2>${def.name}</h2>
      <p class="story">${def.flavour}</p>
      <div class="btns">
        <button id="b-back">Back</button>
        <button id="b-boiler">Boiler room</button>
        <button id="b-go" class="big">Open the workshop</button>
      </div>
      <p class="fine">press Enter to begin, Esc to step back &middot;
      the boiler room is open until you do</p>
    </div>`;
  const wire = wireIn(t);
  wire('#b-go', onGo);
  wire('#b-boiler', onBoiler);
  wire('#b-back', onBack);
  return () => { sfx.clank(); onGo(); };
}

// ── boiler room ────────────────────────────────────────────────────────────
// A word as it was actually fired: chamber letters lit in their material,
// blanks left grey.
function firedWord(entry) {
  return entry.marks.map((m, i) => {
    const ch = (entry.word[i] || '').toUpperCase();
    if (!m) return `<span class="blk">${ch}</span>`;
    const M = MATERIALS[m];
    return `<span class="lit" style="--glow:${M.glow}">${ch}</span>`;
  }).join('');
}

export function renderBoiler(game, { onNext, onChange, onMenu, onBack, standalone = false } = {}) {
  const s = $('#boiler');
  let selected = [];         // letter ids picked out of either rack
  let fLevel = 0, fMat = '';  // rack filters: 0 / '' mean everything
  let quotaView = false;

  // Whatever the bugs dropped tonight goes to storage. Nothing reaches the
  // boiler unless you put it there — or a quota draws it in.
  const recovered = game.pending.map(loot => {
    game.boiler.deposit(loot.letter, 'iron', loot.level);
    return loot;
  });
  game.pending = [];
  if (recovered.length) game.boiler.applyQuotas();
  const nextLevel = standalone ? game.levelNo : game.levelNo + 1;

  function draw() {
    const bo = game.boiler;
    const sorted = arr => [...arr].sort((a, b) => b.level - a.level || a.letter.localeCompare(b.letter));
    const shown = arr => arr.filter(l => (!fLevel || l.level === fLevel) && (!fMat || l.mat === fMat));
    const chips = arr => {
      if (!arr.length) return '<p class="d">Empty.</p>';
      const vis = sorted(shown(arr));
      if (!vis.length) return '<p class="d">Nothing matches the filter.</p>';
      return vis.map(l =>
        `<button class="chipbtn ${selected.includes(l.id) ? 'sel' : ''}" data-id="${l.id}">
          ${chip(l.letter, l.mat, l.level)}</button>`).join('');
    };

    // one row per letter you hold anywhere, for the quota view
    const held = {};
    for (const l of [...bo.inventory, ...bo.store]) {
      const h = held[l.letter] = held[l.letter] || { level: l.level, boiler: 0, store: 0 };
      if (bo.inBoiler(l.id)) h.boiler++; else h.store++;
    }
    const quotaGrid = Object.keys(held)
      .sort((a, b) => held[b].level - held[a].level || a.localeCompare(b))
      .map(ch => {
        const q = bo.quotaFor(ch), h = held[ch];
        const cls = q === null ? '' : q === 0 ? 'set zero' : 'set';
        return `<div class="qcell ${cls}">
          ${chip(ch, 'iron', h.level)}
          <span class="qn">${h.boiler}${h.store ? `<i>+${h.store}</i>` : ''}</span>
          <span class="qstep">
            <button data-q="${ch}" data-d="-1" ${q === 0 ? 'disabled' : ''}
              title="fewer">&minus;</button>
            <button class="qval" data-qtoggle="${ch}"
              title="${q === null ? 'click for a quota of none' : 'click to drop the quota'}"
              >${q === null ? '∞' : q}</button>
            <button data-q="${ch}" data-d="1" title="more">+</button>
          </span>
        </div>`;
      }).join('') || '<p class="d">No letters yet.</p>';

    const mats = [...new Set([...bo.inventory, ...bo.store].map(l => l.mat))];
    const filterBar = `<div class="filters">
      <span class="flbl">Show</span>
      <button class="fbtn ${!fLevel && !fMat ? 'sel' : ''}" data-fclear="1">all</button>
      ${LETTER_LEVELS.slice(1).map(L => `<button class="fbtn ${fLevel === L.level ? 'sel' : ''}"
        data-flevel="${L.level}">${'•'.repeat(L.level)}</button>`).join('')}
      ${mats.map(m => `<button class="fbtn sw ${fMat === m ? 'sel' : ''}" data-fmat="${m}"
        title="${MATERIALS[m].name}">${swatch(m)}</button>`).join('')}
    </div>`;

    const picked = selected.map(id => bo.find(id)).filter(Boolean);
    const evenOk = bo.canCombineMany(picked);
    const viable = evenOk ? bo.viablePairs(picked) : 0;
    const combineStrands = evenOk && viable === 0;
    const canCombine = evenOk && viable > 0;
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

    // a redraw must not throw away where you were looking
    const scrolls = { screen: s.scrollTop };
    s.querySelectorAll('[data-scroll]').forEach(n => { scrolls[n.dataset.scroll] = n.scrollTop; });

    s.innerHTML = `
      <div class="plate wide boilerroom">
        <div class="brhead">
          <div>
            <p class="kicker">${standalone
              ? `Before level ${game.levelNo} — ${getLevel(game.levelNo).name}`
              : `Level ${game.levelNo} cleared`}</p>
            <h2>The Boiler Room</h2>
          </div>
          <div class="tally">
            <span class="big-num">⚙ ${game.secrets}</span><span class="d">secrets</span>
          </div>
        </div>
        ${standalone
          ? `<p class="d recap">Set the boiler up however you like. The chambers bolt shut
             to one when the level starts, and unseal as you spend them.</p>`
          : `<p class="d recap">+${game.levelSecrets} secrets · ${game.levelKills} bugs ·
             ${game.pages}/${START_PAGES} pages intact · the chambers bolt shut again at the next level</p>
             <p class="recovered"><span class="lbl">Recovered tonight &rarr; storage</span> ${recHtml}</p>`}

        ${filterBar}

        <div class="cols3">
          <section>
            <h3>Boiler ${gauge}
              <button class="tinytab ${quotaView ? '' : 'sel'}" data-view="letters">letters</button>
              <button class="tinytab ${quotaView ? 'sel' : ''}" data-view="quotas">quotas</button>
            </h3>
            ${quotaView
              ? `<p class="d">How many of each letter you want working. <b>∞</b> leaves a letter
                 alone; <b>0</b> keeps none of it in the boiler at all. Click the number to
                 switch between the two.</p>
                 <div class="qgrid" data-scroll="qgrid">${quotaGrid}</div>
                 ${bo.overQuota().length && bo.inventory.length <= MIN_BOILER
                   ? `<p class="d hot">The boiler is at its ${MIN_BOILER}-letter minimum, so the
                      last few cannot leave until you draw something else in.</p>` : ''}
                 <div class="benchrow">
                   <button id="b-tidy" class="small" ${bo.overQuota().length ? '' : 'disabled'}
                     >Tidy ${bo.overQuota().length} over quota</button>
                   <button id="b-noq" class="small" ${Object.keys(bo.quotas).length ? '' : 'disabled'}
                     >Clear all quotas</button>
                 </div>`
              : `<p class="d">What the chambers draw from. It runs on no fewer than
                 ${MIN_BOILER} letters and holds no more than ${MAX_BOILER}.</p>
                 <div class="inv" data-scroll="inv-boiler">${chips(bo.inventory)}</div>
                 <div class="benchrow">
                   <button id="b-stow" class="small" ${canStow ? '' : 'disabled'}>Move to storage &darr;</button>
                   <button id="b-tidy" class="small" ${bo.overQuota().length ? '' : 'disabled'}
                     >Tidy ${bo.overQuota().length}</button>
                 </div>`}
          </section>

          <section>
            <h3>Storage <span class="d">&middot; ${bo.store.length}</span></h3>
            <p class="d">Letters kept out of the mix. Nothing here is ever loaded
            into a chamber.</p>
            <div class="inv" data-scroll="inv-store">${chips(bo.store)}</div>
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
            <div class="feed" data-scroll="feed">${picked.length
              ? picked.map(l => chip(l.letter, l.mat, l.level)).join('')
              : '<span class="d">nothing loaded</span>'}</div>
            ${canCombine
              ? (pickedLevel >= MAX_LEVEL
                ? `<p class="d hot">${picked.length} level ${MAX_LEVEL} letters burn away and
                   leave <b>${viable} material${viable === 1 ? '' : 's'}</b> behind in storage,
                   each on a fresh level 1 letter. This is the only way a material is ever
                   made — and the crucible chooses both.</p>
                   <div class="matrow">${SPECIAL_MATERIALS.map(m => swatch(m.id)).join('')}</div>
                   <button id="b-fuse" class="big">Fire the crucible</button>`
                : `<p class="d">${picked.length} × level ${pickedLevel} &rarr;
                   <b>${viable} × level ${pickedLevel + 1}</b> into storage, same material.
                   The crucible decides which letters come out.
                   ${viable < picked.length / 2
                     ? `<br>${picked.length / 2 - viable} pair(s) skipped — they would take the
                        boiler under ${MIN_BOILER}.` : ''}</p>
                   <button id="b-fuse" class="big">Combine</button>`)
              : `<p class="d">${combineStrands
                  ? `That would leave the boiler under ${MIN_BOILER} letters. Draw one back out
                     of storage, or stoke a new one, first.`
                  : !picked.length ? 'Pick a level above, or click letters directly.'
                    : !sameLevel ? 'Every letter must be the same level.'
                      : 'Load an even number — the crucible works in pairs.'}</p>`}
            <div class="benchrow">
              <button id="b-extras" class="small" ${bo.extraPairs() ? '' : 'disabled'}
                >Fuse ${bo.extraPairs()} extra pair${bo.extraPairs() === 1 ? '' : 's'}</button>
              <button id="b-stoke" class="small" ${game.secrets >= STOKE_COST ? '' : 'disabled'}
                >Stoke for ${STOKE_COST} ⚙</button>
              <button id="b-scrap" class="small" ${one && !scrapStrands ? '' : 'disabled'}
                >Scrap for 1 ⚙</button>
            </div>
            <p class="d fine">Fusing extras pairs off everything in storage and over quota,
            level by level. Stoking buys one fresh level 1 Iron letter.</p>
          </section>
        </div>

        ${standalone ? '' : `<div class="afteraction">
          <section>
            <h3>The night in figures</h3>
            ${statsBlock(game.summary())}
          </section>
          ${wordLogHtml(game)}
        </div>`}

        ${short ? `<p class="warn">The boiler needs ${short} more letter${short > 1 ? 's' : ''}
          before it will run.</p>` : ''}
        <div class="btns">
          <button id="${standalone ? 'b-back' : 'b-menu'}">${standalone ? 'Back' : 'Main menu'}</button>
          <button id="b-next" class="big" ${short ? 'disabled' : ''}>${!standalone && game.levelNo >= CAMPAIGN ? "Finish" : `To level ${nextLevel}`} &rarr;</button>
        </div>
      </div>`;

    s.querySelectorAll('[data-id]').forEach(n => n.onclick = () => {
      const id = +n.dataset.id;
      if (selected.includes(id)) selected = selected.filter(x => x !== id);
      else selected.push(id);
      sfx.key(); draw();
    });

    s.querySelectorAll('[data-scroll]').forEach(n => {
      const v = scrolls[n.dataset.scroll];
      if (v) n.scrollTop = v;
    });
    s.scrollTop = scrolls.screen;

    s.querySelectorAll('[data-view]').forEach(n => n.onclick = () => {
      quotaView = n.dataset.view === 'quotas'; sfx.key(); draw();
    });
    s.querySelectorAll('[data-fclear]').forEach(n => n.onclick = () => { fLevel = 0; fMat = ''; sfx.key(); draw(); });
    s.querySelectorAll('[data-flevel]').forEach(n => n.onclick = () => {
      const lv = +n.dataset.flevel; fLevel = fLevel === lv ? 0 : lv; sfx.key(); draw();
    });
    s.querySelectorAll('[data-fmat]').forEach(n => n.onclick = () => {
      const m = n.dataset.fmat; fMat = fMat === m ? '' : m; sfx.key(); draw();
    });
    s.querySelectorAll('[data-q]').forEach(n => n.onclick = () => {
      const ch = n.dataset.q, d = +n.dataset.d;
      const now = bo.quotaFor(ch);
      // no quota steps into 0 going down and 1 going up
      bo.setQuota(ch, now === null ? (d < 0 ? 0 : 1) : Math.max(0, now + d));
      selected = []; sfx.key(); draw();
    });
    s.querySelectorAll('[data-qtoggle]').forEach(n => n.onclick = () => {
      const ch = n.dataset.qtoggle;
      bo.setQuota(ch, bo.quotaFor(ch) === null ? 0 : null);
      selected = []; sfx.key(); draw();
    });

    s.querySelectorAll('[data-all]').forEach(n => n.onclick = () => {
      const lv = +n.dataset.all;
      const ofLevel = all.filter(l => l.level === lv);
      // storage first: those pairs never threaten the boiler minimum
      ofLevel.sort((a, b) => (bo.inBoiler(a.id) ? 1 : 0) - (bo.inBoiler(b.id) ? 1 : 0));
      const ids = ofLevel.map(l => l.id);
      if (ids.length % 2) ids.pop();                    // the crucible works in pairs
      selected = ids;
      sfx.key(); draw();
    });
    s.querySelectorAll('[data-clear]').forEach(n => n.onclick = () => { selected = []; sfx.key(); draw(); });

    const on = (id, fn) => { const n = s.querySelector(id); if (n) n.onclick = fn; };
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
          desc: m.mat === 'iron' ? 'out of the crucible, into storage'
            : `${MATERIALS[m.mat].name}, out of the crucible into storage`, pts: m.level });
      } else if (made.length) {
        toast({ name: made.map(m => m.letter.toUpperCase()).join(' '),
          desc: `${made.length} out of the crucible, into storage`, pts: made.length });
      }
      draw();
    });
    on('#b-tidy', () => { const n = bo.tidy(); if (n) sfx.clank(); selected = []; draw(); });
    on('#b-noq', () => { bo.clearQuotas(); sfx.clank(); draw(); });
    on('#b-extras', () => {
      const made = bo.fuseExtras();
      selected = [];
      if (made.length) {
        sfx.overload();
        toast({ name: made.slice(0, 12).map(m => m.letter.toUpperCase()).join(' '),
          desc: `${made.length} out of the crucible, into storage`, pts: made.length });
      }
      draw();
    });
    on('#b-stoke', () => {
      if (game.secrets < STOKE_COST) return;
      game.secrets -= STOKE_COST;
      const r = bo.stoke();
      sfx.steam();
      toast({ name: `${r.letter.letter.toUpperCase()} — level 1`,
        desc: 'into storage', pts: 1 });
      draw();
    });
    on('#b-next', () => { if (!bo.short()) { sfx.clank(); onNext(); } });
    on('#b-menu', () => { sfx.clank(); onMenu && onMenu(); });
    on('#b-back', () => { sfx.clank(); onBack && onBack(); });
    if (onChange) onChange();
  }
  draw();
}

const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// The night in figures — the same block whether the night was won or lost.
export function statsBlock(sum, { secrets = true } = {}) {
  const row = (label, value) => `<li><span>${label}</span><b>${value}</b></li>`;
  const best = sum.best ? `${sum.best.word} (${Math.round(sum.best.dealt).toLocaleString()})` : '—';
  return `<ul class="stats">
    ${row('Score this level', sum.score.toLocaleString())}
    ${row('Bugs destroyed', sum.kills)}
    ${row('Words fired', sum.words)}
    ${row('Damage dealt', Math.round(sum.dealt).toLocaleString())}
    ${row('Letters fired', `${sum.lit} from chambers · ${sum.blanks} blank`)}
    ${row('Hardest word', best)}
    ${row('Longest word', sum.longest ? sum.longest.word : '—')}
    ${row('Pages', `${sum.pages} intact · ${sum.lost} lost`)}
    ${secrets ? row('Secrets earned', `⚙ ${sum.secrets}`) : ''}
    ${row('Time on the floor', mmss(sum.time))}
  </ul>`;
}

// Every word of the night, hardest hitter first.
function wordLogHtml(game) {
  const log = [...(game.wordLog || [])].sort((a, b) => b.dealt - a.dealt);
  const total = log.reduce((n, e) => n + e.dealt, 0);
  if (!log.length) {
    return `<section class="wordlog"><h3>The night's work</h3>
      <p class="d">Not a single word fired.</p></section>`;
  }

  const rows = log.map((e, i) => {
    const tags = [
      e.pure ? '<b class="tag pure">pure</b>' : '',
      e.wotd ? '<b class="tag wotd">word of the day</b>' : '',
      e.overload ? '<b class="tag over">overload</b>' : '',
      e.repeats ? `<b class="tag rep">repeat ×${e.repeats + 1}</b>` : '',
      (e.effects || []).map(id => `<span class="tagsw" title="${MATERIALS[id].name}"
        style="--body:${MATERIALS[id].body};--edge:${MATERIALS[id].edge};--glow:${MATERIALS[id].glow}"></span>`).join(''),
    ].join('');
    return `<li>
      <span class="rk">${i + 1}</span>
      <span class="wd">${firedWord(e)}${tags}</span>
      <span class="dmg">${Math.round(e.dealt).toLocaleString()}</span>
    </li>`;
  }).join('');
  return `<section class="wordlog">
    <h3>The night's work
      <span class="d">&middot; ${log.length} word${log.length > 1 ? 's' : ''}
      &middot; ${Math.round(total).toLocaleString()} damage</span></h3>
    <ol class="wl">${rows}</ol>
  </section>`;
}

// ── end of run ─────────────────────────────────────────────────────────────
export function renderOver(game, on) {
  const t = $('#gameover');
  t.innerHTML = `
    <div class="plate wide">
      <div class="overhead">
        <div class="crest sad">☠</div>
        <div>
          <p class="kicker">Level ${game.levelNo} — ${getLevel(game.levelNo).name}</p>
          <h2>The formula is gone</h2>
          <p class="story">All ${START_PAGES} pages were carried off into the dark.
          Only tonight is lost — the workshop stands, and the boiler is as you carried it in.</p>
        </div>
      </div>
      <div class="afteraction">
        <section>
          <h3>The night in figures</h3>
          ${statsBlock(game.summary(), { secrets: false })}
        </section>
        ${wordLogHtml(game)}
      </div>
      <div class="btns">
        <button id="b-retry" class="big">Fight level ${game.levelNo} again</button>
        <button id="b-levels">Levels</button>
        <button id="b-title">Title screen</button>
      </div>
    </div>`;
  const wire = wireIn(t);
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
  const wire = wireIn(t);
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
  const wire = wireIn(s);
  wire('#b-res', onResume);
  wire('#b-quit', onTitle);
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
