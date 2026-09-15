// ui.js — DOM screens layered over the canvas: title, level cards, the magazine
// room between levels, and the end-of-run summary.

import { MATERIALS, SPECIAL_MATERIALS, LETTER_LEVELS, MAX_LEVEL, CHAMBERS, START_CHAMBERS,
  effectScale, levelDamage,
  START_PAGES, MIN_BOILER, MAX_BOILER, STOKE_COST, BLANK_DMG, getLevel,
  rateText, rofCost, MAX_ROF } from './content.js';
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
      <div class="crest">★</div>
      <h1>WORD WAR 3</h1>
      <p class="sub">hold the line &mdash; one word at a time</p>
      <p class="story">An armoured column has broken through, and it is after the
      dossiers in your field safe. The breech on your gun turns words into ammunition.
      Type quickly. Type well.</p>
      <div class="btns">
        ${started ? `<button id="b-cont" class="big">Continue &mdash; wave ${progress.reached}</button>` : ''}
        <button id="b-play" class="big">${started ? 'Start over' : 'Begin'}</button>
        <button id="b-boiler">Armoury</button>
        <button id="b-test">Live fire</button>
        <button id="b-how">How to play</button>
        <button id="b-sound">Sound: ${isMuted() ? 'off' : 'on'}</button>
      </div>
      <ul class="badges">${BADGES.map(b => {
        const got = !!earned()[b.id];
        return `<li class="${got ? 'got' : ''}"><span class="bp">${got ? '★' : '☆'} ${b.pts}</span>
          <span><b class="bn">${b.name}</b> — ${b.desc}</span></li>`;
      }).join('')}</ul>
      <p class="fine">${dictSize().toLocaleString()} words in the field manual</p>
    </div>`;
  const wire = wireIn(t);
  wire('#b-play', on.newGame);
  wire('#b-cont', on.cont);
  wire('#b-boiler', on.boiler);
  wire('#b-test', on.test);
  wire('#b-how', on.how);
  wire('#b-sound', () => { setMuted(!isMuted()); on.sound && on.sound(); renderTitle(progress, on); });
}

export function renderHow(onBack) {
  const t = $('#howto');
  const levels = LETTER_LEVELS.slice(1).map(L => `
    <li>${chip(L.pool[0], 'iron', L.level)}
      <b>Level ${L.level}</b> — <span class="num">${L.dmg}</span> damage
      <br><span class="d">${L.pool.toUpperCase().split('').join(' ')}</span></li>`).join('');
  const mats = [MATERIALS.iron, ...SPECIAL_MATERIALS].map(m => `
    <li>${swatch(m.id)} <b>${m.name}</b>${m.base ? '' : ` <span class="cost">${m.cost}★</span>`}
    <br><span class="d">${m.desc}</span></li>`).join('');
  t.innerHTML = `
    <div class="plate wide">
      <h2>How to play</h2>
      <div class="cols">
        <div>
          <h3>The engine</h3>
          <p>Type any English word and press <kbd>Enter</kbd>. Every letter of the word is
          fired at the tanks, one after another. A word that is not in the field manual simply
          clears and tells you so — it costs you nothing but the typing.</p>
          <p>The magazine has <b>${CHAMBERS} chambers</b>, but every level starts with
          <b>${START_CHAMBERS === 1 ? 'only one unsealed' : `${START_CHAMBERS} unsealed`}</b>.
          A chamber unseals only when <b>a single word spends every chamber that is loaded</b> —
          the same full house that tags the word in the log. Draining them across several words
          does nothing. At the top of the next level they all bolt shut again.</p>
          <p>Stuck with a letter you cannot use? <b>Click the chamber</b> to tip it back into the bag
          and draw another. The magazine never loads the same letter into two chambers at once
          unless it has nothing else, and never fills more chambers than it has letters.</p>
          <p>If a character you type is sitting in an unsealed chamber, the chamber reads as
          drawn down the moment you type it, then fires and refills from the bag. Any character
          <i>not</i> in a chamber is a <b>blank</b> — a flat ${BLANK_DMG} damage that no bonus or
          penalty ever changes.</p>
          <p>The gun fires <b>one shell per letter</b>. Out of the box that is
          <b>one a second</b>, and intel buys it up to <b>ten a second</b> over ten upgrades
          in the armoury — which is the difference between a long word trickling out and a
          burst. It <b>leads</b> its target — works out where the tank will be — and the shell
          trims that lead gently in flight; it cannot turn sharply enough to circle back, so a
          shell that really misses is gone. It also counts what is already in the air, and holds
          the breech rather than spend a shell on something that is as good as dead.</p>
          <p>Length pays, and pays steeply: <b>twice the length is three times the damage,
          three times the length about six</b>. A word made <i>entirely</i> of chamber letters,
          with no blanks in it at all, does <b>double</b>. A word you have already used
          <i>on this level</i> does less each time you repeat it — every level starts the
          ledger again. Using every loaded chamber in one word is a <b>full house</b> — it unseals
          the next chamber. The <b>word of the day</b> doubles everything and explodes.</p>
          <h3>The tanks</h3>
          <p>Everything comes through the one arch still standing, and walks the route painted
          on the floor — across, down a lane, back across — to the <b>safe</b> in the corner
          opposite the cannon, takes a dossier of the formula and retraces the whole run to get
          out. Kill a carrier and the dossier goes back in the safe. Lose all ${START_PAGES} dossiers
          and the wave is over. Nothing ever comes near the cannon itself.</p>
          <h3>The firing range</h3>
          <p><b>Live fire</b> puts you in a range of standing hulks with every chamber open
          and nothing that can reach you. Type anything and the damage each word actually deals
          is listed as it lands — the place to find out what a material really does before you
          spend a wave on it.</p>
          <h3>Controls</h3>
          <p><kbd>A&ndash;Z</kbd> type &middot; <kbd>Enter</kbd> or <kbd>Space</kbd> fire &middot;
          <kbd>Backspace</kbd> delete &middot; <kbd>Delete</kbd> clears the rack &middot;
          <kbd>Esc</kbd> pauses. Every letter key belongs to the word, so the sound toggle is
          the speaker in the corner. Hold the <b>right mouse button</b> over the room to aim
          the cannon by hand; otherwise it picks its own target.</p>
          <h3>Score</h3>
          <p>Score is a tally, not a currency — it buys nothing, though your best on each
          wave is kept. You earn <b>half the damage a word deals plus the square of
          its length</b> for every word, <b>10 to 260</b> per tank depending on what it was, and
          <b>250 plus 100 per dossier still on the rack</b> for clearing the wave. So it rewards
          long, well-spent words and a clean defence, not just time on the floor.</p>
        </div>
        <div>
          <h3>Letter levels</h3>
          <p>Letters are graded the way Scrabble grades them, and the grade is drawn as dots
          under the glyph. The level is what sets the damage — a rare letter is worth a great
          many common ones.</p>
          <ul class="mats">${levels}</ul>

          <h3>Materials</h3>
          <p>Materials are read by <b>colour</b> alone. Tanks only ever drop plain Iron. The one
          way to make a material is to put <b>two level ${MAX_LEVEL} letters</b> in the crucible:
          they burn away and leave a material behind on a fresh level 1 letter, both chosen by
          the crucible.</p>
          <p>A material lends its effect to <b>every letter in the word it is fired with</b>,
          blanks included, and different materials <b>stack</b>: one Lazurite and one Thermite
          and the whole word freezes and burns. Each letter still does its own damage.</p>
          <p>Both the damage and the effect come from the <b>level of the letter carrying the
          material</b>. Here is every figure, before any word bonus — the top number is what one
          such letter hits for, the line under it is the effect it lends the whole word.</p>
          ${materialTable()}
          <p class="d">Damage shown is one letter at that level times the material's own
          multiplier. <b>Freeze</b> is how long a tank stands still, capped at 9 seconds.
          <b>Pierce</b> is how many tanks a shell passes through. <b>Splash</b> is the blast
          radius. <b>Arcs</b> is how many further tanks the charge jumps to, and over what
          distance. <b>Burn</b> is the total fire damage over 4 seconds, as a percentage of the
          hardest letter in the word. <b>Echo</b> is the damage the repeated volley does.</p>

          <h3>The armoury</h3>
          <p>The armoury is reachable without playing: the title screen, the level select
          and the card in front of every wave all open it.</p>
          <p><b>Everything new lands in storage</b> — letters the tanks drop, anything out of the
          foundry, anything you stoke. The magazine only ever holds what you put there. Set a
          <b>quota</b> per letter and it looks after itself: the number is drawn out of storage
          and anything above it is sent back down. A quota of <b>0</b> keeps a letter out of the
          magazine entirely.</p>
          <p><b>Fuse extras</b> sweeps up the plain Iron sitting in storage or over quota and
          pairs it off level by level in one pass. Letters carrying a material are never swept
          up — pairing one of those off is a decision you make yourself.</p>
          <p>Between waves the <b>foundry</b> takes any even number of letters of one level and
          works through them in pairs: each pair becomes one letter of the level above in the
          same material, or — for level ${MAX_LEVEL} pairs — a material on a fresh level 1
          letter. The foundry picks what comes out, not you. Scrap what you do not want for a
          piece of intel, and spend <b>${STOKE_COST} intel</b> to requisition one fresh level 1 letter.</p>
          <p><b>Intel ★</b> comes off wrecks and off every wave you clear. It buys a
          requisition, and it pays the <b>ordnance workshop</b>: rate of fire starts at
          <b>1 round a second</b> and ten upgrades take it to <b>10 a second</b>, which is
          what makes a long word land as a burst rather than a trickle.</p>
          <p>Wrecks give up a letter perhaps <b>one time in ten to one in three</b> depending
          on what you killed — the Colonel always drops.</p>
          <p>The magazine runs on between <b>${MIN_BOILER}</b> and <b>${MAX_BOILER}</b> letters.
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
      <div class="crest">${def.boss ? '☠' : '★'}</div>
      <p class="kicker">Level ${n}</p>
      <h2>${def.name}</h2>
      <p class="story">${def.flavour}</p>
      <div class="btns">
        <button id="b-back">Back</button>
        <button id="b-boiler">Armoury</button>
        <button id="b-go" class="big">Take the line</button>
      </div>
      <p class="fine">press Enter to begin, Esc for the menu &middot;
      the armoury is open until you do</p>
    </div>`;
  const wire = wireIn(t);
  wire('#b-go', onGo);
  wire('#b-boiler', onBoiler);
  wire('#b-back', onBack);
  return () => { sfx.clank(); onGo(); };
}

// ── magazine room ────────────────────────────────────────────────────────────
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

export function renderBoiler(game, { onNext, onChange, onMenu, onBack, onTest, standalone = false } = {}) {
  const s = $('#boiler');
  let selected = [];         // letter ids picked out of either rack
  let fLevel = 0, fMat = '';  // rack filters: 0 / '' mean everything
  let quotaView = false;

  // Whatever the tanks dropped this wave goes to storage. Nothing reaches the
  // magazine unless you put it there — or a quota draws it in.
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

    // every letter in the alphabet gets a row, so a quota can be set for one
    // you do not hold yet
    const held = {};
    for (const L of LETTER_LEVELS.slice(1)) {
      for (const ch of L.pool) held[ch] = { level: L.level, boiler: 0, store: 0 };
    }
    for (const l of [...bo.inventory, ...bo.store]) {
      const h = held[l.letter];
      if (!h) continue;
      if (bo.inBoiler(l.id)) h.boiler++; else h.store++;
    }
    const quotaGrid = Object.keys(held)
      .sort((a, b) => held[b].level - held[a].level || a.localeCompare(b))
      .map(ch => {
        const q = bo.quotaFor(ch), h = held[ch];
        const cls = [q === null ? '' : q === 0 ? 'set zero' : 'set',
          h.boiler + h.store ? '' : 'none'].join(' ');
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
      }).join('');

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
    const rof = game.upgrades.rof | 0;
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
            <h2>The Armoury</h2>
          </div>
          <div class="tally">
            <span class="big-num">★ ${game.secrets}</span><span class="d">intel</span>
          </div>
        </div>
        ${standalone
          ? `<p class="d recap">Set the magazine up however you like. The chambers bolt shut
             to one when the level starts, and unseal as you spend them.</p>`
          : `<p class="d recap">+${game.levelSecrets} intel · ${game.levelKills} tanks ·
             ${game.pages}/${START_PAGES} dossiers intact · the chambers bolt shut again at the next level</p>
             <p class="recovered"><span class="lbl">Recovered this wave &rarr; storage</span> ${recHtml}</p>`}

        ${filterBar}

        <div class="cols3">
          <section>
            <h3>Magazine ${gauge}
              <button class="tinytab ${quotaView ? '' : 'sel'}" data-view="letters">letters</button>
              <button class="tinytab ${quotaView ? 'sel' : ''}" data-view="quotas">quotas</button>
            </h3>
            ${quotaView
              ? `<p class="d">How many of each letter you want working. <b>∞</b> leaves a letter
                 alone; <b>0</b> keeps none of it in the magazine at all. Click the number to
                 switch between the two.</p>
                 <div class="qgrid" data-scroll="qgrid">${quotaGrid}</div>
                 ${bo.overQuota().length && bo.inventory.length <= MIN_BOILER
                   ? `<p class="d hot">The magazine is at its ${MIN_BOILER}-letter minimum, so the
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
            <button id="b-draw" class="small" ${canDraw ? '' : 'disabled'}>Move to magazine &uarr;</button>
          </section>

          <section>
            <h3>Foundry</h3>
            <p class="d">Feed it any <b>even</b> number of letters of one level and it works
            through them two at a time, in the order you picked them. Of each pair, the
            <b>first</b> letter's material comes out — except that a material paired with plain
            <b>Iron</b> just moves across at the <i>same</i> level.</p>
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
                   made — and the foundry chooses both.</p>
                   <div class="matrow">${SPECIAL_MATERIALS.map(m => swatch(m.id)).join('')}</div>
                   <button id="b-fuse" class="big">Fire the foundry</button>`
                : `<p class="d">${picked.length} × level ${pickedLevel} &rarr;
                   <b>${viable} × level ${pickedLevel + 1}</b> into storage,
                   in ${swatch(picked[0].mat)} <b>${MATERIALS[picked[0].mat].name}</b> —
                   whichever letter goes in <i>first</i> sets the material.
                   The foundry decides which letters come out.
                   ${viable < picked.length / 2
                     ? `<br>${picked.length / 2 - viable} pair(s) skipped — they would take the
                        magazine under ${MIN_BOILER}.` : ''}</p>
                   <button id="b-fuse" class="big">Combine</button>`)
              : `<p class="d">${combineStrands
                  ? `That would leave the magazine under ${MIN_BOILER} letters. Draw one back out
                     of storage, or requisition a new one, first.`
                  : !picked.length ? 'Pick a level above, or click letters directly.'
                    : !sameLevel ? 'Every letter must be the same level.'
                      : 'Load an even number — the foundry works in pairs.'}</p>`}
            <div class="benchrow">
              <button id="b-extras" class="small" ${bo.extraPairs() ? '' : 'disabled'}
                >Fuse ${bo.extraPairs()} extra pair${bo.extraPairs() === 1 ? '' : 's'}</button>
              <button id="b-stoke" class="small" ${game.secrets >= STOKE_COST ? '' : 'disabled'}
                >Requisition for ${STOKE_COST} ★</button>
              <button id="b-scrap" class="small" ${one && !scrapStrands ? '' : 'disabled'}
                >Scrap for 1 ★</button>
            </div>
            <p class="d fine">Fusing extras pairs off the <b>plain Iron</b> in storage and over
            quota, level by level — a letter carrying a material is left alone. Stoking buys one
            fresh level 1 Iron letter.</p>
          </section>
        </div>

        <section class="workshop">
          <h3>Ordnance workshop</h3>
          <div class="upgrades">
            <div class="upg">
              <div>
                <b>Rate of fire</b>
                <span class="d">how fast the shells leave the barrel, one per letter</span>
                <div class="pips">${Array.from({ length: MAX_ROF }, (_, i) =>
                  `<s class="${i < rof ? 'on' : ''}"></s>`).join('')}</div>
              </div>
              <div class="upgbuy">
                <span class="num">${rateText(rof)}${rof < MAX_ROF
                  ? ` &rarr; ${rateText(rof + 1)}` : ''}</span>
                ${rof >= MAX_ROF
                  ? '<span class="d">fully worked up</span>'
                  : `<button id="b-rof" class="small" ${game.secrets >= rofCost(rof) ? '' : 'disabled'}
                      >Upgrade &mdash; ${rofCost(rof)} ★</button>`}
              </div>
            </div>
          </div>
        </section>

        ${standalone ? '' : `<div class="afteraction">
          <section>
            <h3>The wave in figures</h3>
            ${statsBlock(game.summary())}
          </section>
          ${wordLogHtml(game)}
        </div>`}

        ${short ? `<p class="warn">The magazine needs ${short} more letter${short > 1 ? 's' : ''}
          before it will run.</p>` : ''}
        <div class="btns">
          <button id="${standalone ? 'b-back' : 'b-menu'}">${standalone ? 'Back' : 'Main menu'}</button>
          <button id="b-test">Live fire</button>
          <button id="b-next" class="big" ${short ? 'disabled' : ''}>To wave ${nextLevel} &rarr;</button>
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
      // storage first: those pairs never threaten the magazine minimum
      ofLevel.sort((a, b) => (bo.inBoiler(a.id) ? 1 : 0) - (bo.inBoiler(b.id) ? 1 : 0));
      const ids = ofLevel.map(l => l.id);
      if (ids.length % 2) ids.pop();                    // the foundry works in pairs
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
          desc: m.mat === 'iron' ? 'out of the foundry, into storage'
            : `${MATERIALS[m.mat].name}, out of the foundry into storage`, pts: m.level });
      } else if (made.length) {
        toast({ name: made.map(m => m.letter.toUpperCase()).join(' '),
          desc: `${made.length} out of the foundry, into storage`, pts: made.length });
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
          desc: `${made.length} out of the foundry, into storage`, pts: made.length });
      }
      draw();
    });
    on('#b-rof', () => {
      const cost = rofCost(game.upgrades.rof);
      if (game.upgrades.rof >= MAX_ROF || game.secrets < cost) return;
      game.secrets -= cost;
      game.upgrades.rof++;
      sfx.overload();
      toast({ name: `Rate of fire — ${rateText(game.upgrades.rof)}`,
        desc: `upgrade ${game.upgrades.rof} of ${MAX_ROF}` });
      onChange && onChange();
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
    on('#b-test', () => { sfx.clank(); onTest && onTest(); });
    if (onChange) onChange();
  }
  draw();
}

// Exactly what a material does at each letter level, worked out with the same
// arithmetic the magazine uses, so the help can never drift from the game.
const num = n => (Math.abs(n - Math.round(n)) < 0.05 ? Math.round(n) : n.toFixed(1));

function materialAt(m, lvl) {
  const e = effectScale(lvl);
  const dmg = Math.round(levelDamage(lvl) * m.mul);
  let effect = '—';
  if (m.freeze) effect = `freeze ${num(Math.min(9, m.freeze * e))}s`;
  else if (m.pierce) effect = `pierce ${m.pierce + lvl - 1}`;
  else if (m.chain) effect = `${m.chain + Math.round((lvl - 1) * 1.5)} arcs · ${Math.round(m.chainRange * (0.7 + 0.3 * e))}px`;
  else if (m.splash) effect = `splash ${Math.round(m.splash * (0.75 + 0.25 * e))}px`;
  else if (m.burn) effect = `burn ${Math.round(m.burn.frac * e * 100)}%`;
  else if (m.echo) effect = `echo ${Math.round(Math.min(1, m.echo + (lvl - 1) * 0.075) * 100)}%`;
  return { dmg, effect };
}

function materialTable() {
  const head = LETTER_LEVELS.slice(1)
    .map(L => `<span class="mh">${'•'.repeat(L.level)}<i>${L.dmg}</i></span>`).join('');
  const rows = [MATERIALS.iron, ...SPECIAL_MATERIALS].map(m => {
    const cells = LETTER_LEVELS.slice(1).map(L => {
      const { dmg, effect } = materialAt(m, L.level);
      return `<span class="mc"><b>${dmg}</b><i>${effect}</i></span>`;
    }).join('');
    return `<div class="mrow"><span class="mn">${swatch(m.id)}${m.name}
      <i>×${m.mul.toFixed(1)}</i></span>${cells}</div>`;
  }).join('');
  return `<div class="mattable">
    <div class="mrow mhead"><span class="mn">Level &rarr;<i>base damage</i></span>${head}</div>
    ${rows}
  </div>`;
}

const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// The wave in figures — the same block whether the wave was won or lost.
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
    ${secrets ? row('Secrets earned', `★ ${sum.secrets}`) : ''}
    ${row('Time on the floor', mmss(sum.time))}
  </ul>`;
}

// Every word of the wave, hardest hitter first.
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
          <p class="story">All ${START_PAGES} dossiers were carried off into the dark.
          Only this wave is lost — the line holds, and the ${game.lootKept
            ? `${game.lootKept} letter${game.lootKept === 1 ? '' : 's'} that fell this wave
               ${game.lootKept === 1 ? 'is' : 'are'} in storage`
            : 'boiler is as you carried it in'}.</p>
        </div>
      </div>
      <div class="afteraction">
        <section>
          <h3>The wave in figures</h3>
          ${statsBlock(game.summary(), { secrets: false })}
        </section>
        ${wordLogHtml(game)}
      </div>
      <div class="btns">
        <button id="b-retry" class="big">Fight wave ${game.levelNo} again</button>
        <button id="b-title">Main menu</button>
      </div>
    </div>`;
  const wire = wireIn(t);
  wire('#b-retry', on.retry); wire('#b-title', on.title);
}

export function renderPause(game, on) {
  const t = $('#pause');
  const sum = game.summary();
  t.innerHTML = `
    <div class="plate">
      <div class="crest">⏸</div>
      <p class="kicker">Level ${game.levelNo} — ${getLevel(game.levelNo).name}</p>
      <h2>Paused</h2>
      <ul class="stats">
        <li><span>Dossiers</span><b>${game.pages} intact · ${game.lost} lost</b></li>
        <li><span>Tanks destroyed</span><b>${sum.kills}</b></li>
        <li><span>Words fired</span><b>${sum.words}</b></li>
        <li><span>Damage dealt</span><b>${Math.round(sum.dealt).toLocaleString()}</b></li>
        <li><span>Letters recovered</span><b>${game.pending.length}</b></li>
      </ul>
      <div class="btns">
        <button id="b-res" class="big">Resume</button>
        <button id="b-restart">Restart wave</button>
        <button id="b-title">Main menu</button>
      </div>
      <p class="fine">Esc resumes &middot; letters you have found this wave are kept either way</p>
    </div>`;
  const wire = wireIn(t);
  wire('#b-res', on.resume);
  wire('#b-restart', on.restart);
  wire('#b-title', on.title);
}

export function setLoading(pct, msg) {
  const bar = $('#loadbar'), txt = $('#loadtxt');
  if (bar) bar.style.width = Math.round(pct * 100) + '%';
  if (txt && msg) txt.textContent = msg;
}

export function toast(b) {
  const box = document.getElementById('toasts');
  const n = el('div', 'toast',
    `<b>${b.name}</b><span>${b.desc}${b.pts == null ? '' : ` &middot; ${b.pts} points`}</span>`);
  box.appendChild(n);
  setTimeout(() => n.remove(), 5200);
}
