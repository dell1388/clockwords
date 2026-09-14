// main.js — bootstrap, the loop, input and the screen state machine.

import { Game, W, H, PLAY_H } from './game.js';
import { Boiler, startingInventory } from './boiler.js';
import { rollLoot } from './content.js';
import * as progress from './progress.js';
import { loadDictionary, dictSize } from './dict.js';
import { draw, makeBackground, chamberAt } from './render.js';
import * as ui from './ui.js';
import { sfx, unlock, setMuted, isMuted } from './audio.js';
import { onBadge } from './achievements.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

const kb = document.getElementById('kb');
const touch = matchMedia('(hover: none)').matches || 'ontouchstart' in window;
if (touch) document.body.classList.add('touch');

let game = null, state = 'loading', last = 0, clock = 0, introGo = null, howBack = null, provingBack = null;

onBadge(b => { ui.toast(b); sfx.win(); });

function fit() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  const wrap = document.getElementById('wrap');
  const sc = Math.min(window.innerWidth / W, window.innerHeight / H);
  wrap.style.transform = `scale(${sc})`;
  wrap.style.left = ((window.innerWidth - W * sc) / 2) + 'px';
  wrap.style.top = ((window.innerHeight - H * sc) / 2) + 'px';
}
window.addEventListener('resize', fit);

// ── the run, and what survives a bad night ─────────────────────────────────
const snapshot = g => ({
  boiler: g.boiler.serialize(), secrets: g.secrets, score: g.score,
  stats: g.stats, pending: g.pending,
});

function gameFrom(snap, levelNo) {
  const g = snap
    ? new Game({
        boiler: Boiler.deserialize(snap.boiler), secrets: snap.secrets, score: snap.score,
        stats: snap.stats, pending: snap.pending || [],
      })
    : new Game({ boiler: new Boiler(startingInventory()) });
  g.levelNo = levelNo;
  return g;
}

// Only reachable from a save that records progress but no boiler (an old or
// hand-edited one): build something plausible rather than a beginner's rack.
function outfitFor(level) {
  const b = new Boiler(startingInventory());
  for (let i = 0; i < Math.min(28, (level - 1) * 2); i++) {
    const loot = rollLoot(Math.max(1, level - 1), 2);
    b.stow(loot.letter, 'iron', loot.level);
  }
  return snapshot(new Game({ boiler: b, secrets: 4 + level * 2, levelNo: level }));
}

// ── flow ───────────────────────────────────────────────────────────────────
function toTitle() {
  state = 'title';
  ui.show('title');
  ui.renderTitle(progress.load(), {
    newGame,
    cont: () => enterLevel(progress.furthest()),
    boiler: () => toWorkshop(progress.furthest(), toTitle),
    test: () => toProving(toTitle),
    how: () => { state = 'howto'; ui.show('howto'); howBack = ui.renderHow(toTitle); },
    sound: syncMute,
  });
}

function newGame() {
  progress.reset();
  game = gameFrom(null, 1);
  toIntro(1);
}

// Whichever night you pick, you walk in with the run's boiler. It is not tied
// to the level, so replaying an early one does not hand back an early loadout.
function enterLevel(n) {
  game = gameFrom(progress.loadout() || (n === 1 ? null : outfitFor(n)), n);
  toIntro(n);
}

function toIntro(n) {
  state = 'intro';
  ui.show('intro');
  introGo = ui.renderIntro(n, {
    onGo: () => beginLevel(n),
    onBoiler: () => toWorkshop(n, () => toIntro(n)),
    onBack: () => toTitle(),
  });
}

// A room of standing targets: type anything, read the damage off.
function toProving(back = toTitle) {
  game = gameFrom(progress.loadout(), Math.max(1, progress.furthest()));
  game.startSandbox();
  provingBack = back;
  state = 'play';
  ui.show('none');
  kb.value = '';
  if (touch) focusKb(); else canvas.focus();
}

// The boiler room as a screen in its own right, reachable from the title, the
// level select, or the card in front of a night.
function toWorkshop(n, back = toTitle) {
  game = gameFrom(progress.loadout() || (n === 1 ? null : outfitFor(n)), n);
  state = 'boiler';
  ui.show('boiler');
  const stash = () => progress.setLoadout(snapshot(game));
  ui.renderBoiler(game, {
    standalone: true,
    onNext: () => { stash(); beginLevel(n); },
    onChange: stash,
    onBack: () => { stash(); back(); },
    onTest: () => { stash(); toProving(() => toWorkshop(n, back)); },
  });
}

function beginLevel(n) {
  game.levelNo = n;
  game.startLevel(n);
  state = 'play';
  ui.show('none');
  kb.value = '';
  if (touch) focusKb(); else canvas.focus();
}

function toBoiler() {
  progress.cleared(game.levelNo, game.score);
  const next = game.levelNo + 1;
  state = 'boiler';
  ui.show('boiler');
  const stash = () => progress.setLoadout(snapshot(game));
  stash();
  ui.renderBoiler(game, {
    onNext: () => {
      game.levelNo = next;
      stash();
      toIntro(next);
    },
    onChange: stash,
    onMenu: () => { stash(); toTitle(); },
    onTest: () => { stash(); toProving(toBoiler); },
  });
}

function toOver() {
  // Whatever fell tonight is yours, won or lost.
  if (game.pending.length) {
    for (const loot of game.pending) game.boiler.deposit(loot.letter, 'iron', loot.level);
    game.boiler.applyQuotas();
    game.pending = [];
    progress.setLoadout(snapshot(game));
  }
  state = 'over';
  ui.show('gameover');
  ui.renderOver(game, { retry: () => enterLevel(game.levelNo), title: toTitle });
}

function togglePause() {
  if (state === 'play') {
    state = 'pause';
    ui.show('pause');
    ui.renderPause(game, {
      resume: () => { state = 'play'; ui.show('none'); if (touch) focusKb(); else canvas.focus(); },
      restart: () => enterLevel(game.levelNo),
      title: toTitle,
    });
  } else if (state === 'pause') {
    state = 'play'; ui.show('none');
    if (touch) focusKb(); else canvas.focus();
  }
}

// ── input ──────────────────────────────────────────────────────────────────
// On a phone there is no physical keyboard, so a transparent field over the rack
// raises the soft one and mirrors straight into the word.
kb.addEventListener('input', () => {
  if (!game) return;
  const v = kb.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 28);
  if (v.length > game.typed.length) sfx.key();
  game.typed = v;
  kb.value = v;
});
kb.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); if (state === 'play') { game.submit(); kb.value = ''; } }
});
function focusKb() { if (touch && state === 'play') { try { kb.focus(); } catch (_) {} } }
canvas.addEventListener('touchstart', focusKb, { passive: true });

window.addEventListener('keydown', e => {
  unlock();
  if (e.target === kb) return;
  if (state === 'intro') {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); introGo && introGo(); return; }
    if (e.key === 'Escape') {
      e.preventDefault();
      const back = document.querySelector('#intro #b-back');
      if (back) back.click();
      return;
    }
  }
  if (state === 'boiler' && e.key === 'Escape') { e.preventDefault();
    const back = document.querySelector('#boiler #b-back'); if (back) back.click(); return; }
  if (state === 'howto' && (e.key === 'Escape' || e.key === 'Enter' || e.key === 'Backspace')) {
    e.preventDefault(); howBack ? howBack() : toTitle(); return;
  }
  if (state !== 'play') {
    if (e.key === 'Escape' && state === 'pause') togglePause();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    if (game.sandbox) { const back = provingBack || toTitle; provingBack = null; back(); }
    else togglePause();
    return;
  }
  if (e.key === 'Delete') { game.clear(); kb.value = ''; e.preventDefault(); return; }
  if (e.key === 'Enter') { game.submit(); kb.value = ''; e.preventDefault(); return; }
  if (e.key === 'Backspace') { game.backspace(); e.preventDefault(); return; }
  if (e.key === ' ') { game.submit(); kb.value = ''; e.preventDefault(); return; }
  if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) { game.type(e.key); e.preventDefault(); }
});

function pointer(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
}
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  unlock();
  if (state !== 'play') return;
  const p = pointer(e);
  if (e.button === 2 || e.shiftKey) { if (p.y < PLAY_H) game.aim = p; return; }
  if (p.y >= PLAY_H) {
    // a letter you cannot use goes back in the bag, and counts towards the reload
    const i = chamberAt(p.x, p.y);
    if (i >= 0) game.dumpChamber(i);
  }
});
canvas.addEventListener('pointermove', e => {
  if (state === 'play' && game.aim) { const p = pointer(e); game.aim = { x: p.x, y: Math.min(p.y, PLAY_H) }; }
});
window.addEventListener('pointerup', () => { if (game) game.aim = null; });

const muteBtn = document.getElementById('mute');
function syncMute() {
  muteBtn.textContent = isMuted() ? '🔇' : '🔊';
  muteBtn.title = isMuted() ? 'Sound off — click for sound' : 'Sound on — click to mute';
  muteBtn.setAttribute('aria-label', muteBtn.title);
}
muteBtn.onclick = () => { unlock(); setMuted(!isMuted()); syncMute(); };

// exposed for debugging and for the automated smoke tests
window.CLOCKWORDS = { get game() { return game; }, get state() { return state; }, sfx };

// ── loop ───────────────────────────────────────────────────────────────────
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0);
  last = ts;
  clock += dt;
  if (!game) return;
  if (state === 'play') {
    game.update(dt);
    if (game.outroDone()) {
      if (game.over) toOver();
      else if (game.won) toBoiler();
    }
  } else {
    game.decay(dt * 0.4);
  }
  draw(ctx, game, clock);
}

// ── go ─────────────────────────────────────────────────────────────────────
(async function boot() {
  fit();
  syncMute();
  ui.show('loading');
  ui.setLoading(0, 'Opening the lexicon…');
  // Wait for the period faces, but never let a slow font host hold up the game.
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch (_) {}
  const n = await loadDictionary(p => ui.setLoading(p, `Opening the lexicon… ${Math.round(p * 100)}%`));
  ui.setLoading(1, `${n.toLocaleString()} words ready`);
  makeBackground();
  game = gameFrom(null, 1);
  game.startLevel(1);
  requestAnimationFrame(frame);
  setTimeout(toTitle, 250);
})();
