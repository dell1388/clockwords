// main.js — bootstrap, the loop, input and the screen state machine.

import { Game, W, H, PLAY_H } from './game.js';
import { Boiler, startingInventory } from './boiler.js';
import { CAMPAIGN, rollLoot } from './content.js';
import * as progress from './progress.js';
import { loadDictionary, dictSize } from './dict.js';
import { draw, makeBackground } from './render.js';
import * as ui from './ui.js';
import { sfx, unlock, setMuted, isMuted } from './audio.js';
import { onBadge } from './achievements.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

const kb = document.getElementById('kb');
const touch = matchMedia('(hover: none)').matches || 'ontouchstart' in window;
if (touch) document.body.classList.add('touch');

let game = null, state = 'loading', last = 0, clock = 0, introGo = null;

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
  stats: g.stats, used: [...g.usedWords.entries()], pending: g.pending,
});

function gameFrom(snap, levelNo) {
  const g = snap
    ? new Game({
        boiler: Boiler.deserialize(snap.boiler), secrets: snap.secrets, score: snap.score,
        stats: snap.stats, usedWords: new Map(snap.used || []), pending: snap.pending || [],
      })
    : new Game({ boiler: new Boiler(startingInventory()) });
  g.levelNo = levelNo;
  return g;
}

// Someone jumping straight to a late night should not arrive with a beginner's
// boiler, so one is built for them out of that night's loot table.
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
    cont: () => enterLevel(Math.min(CAMPAIGN, progress.furthest())),
    levels: toLevels,
    how: () => { state = 'howto'; ui.show('howto'); ui.renderHow(toTitle); },
  });
}

function toLevels(back = toTitle) {
  state = 'levels';
  ui.show('levels');
  ui.renderLevels(progress.load(), enterLevel, back);
}

function newGame() {
  progress.reset();
  game = gameFrom(null, 1);
  toIntro(1);
}

// Start a level from its checkpoint — the run exactly as it was when you first
// walked in — building one if this night has never been entered.
function enterLevel(n) {
  const snap = progress.checkpointFor(n) || (n === 1 ? null : outfitFor(n));
  game = gameFrom(snap, n);
  progress.checkpoint(n, snapshot(game));
  toIntro(n);
}

function toIntro(n) {
  state = 'intro';
  ui.show('intro');
  introGo = ui.renderIntro(n, () => beginLevel(n));
}

function beginLevel(n) {
  game.levelNo = n;
  progress.checkpoint(n, snapshot(game));
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
  const stash = () => { if (next <= CAMPAIGN) progress.checkpoint(next, snapshot(game)); };
  stash();
  ui.renderBoiler(game, () => {
    if (next > CAMPAIGN) return toWin();
    game.levelNo = next;
    stash();
    toIntro(next);
  }, stash, () => { stash(); toTitle(); });
}

function toWin() {
  state = 'over';
  ui.show('gameover');
  ui.renderWin(game, { levels: () => toLevels(toTitle), title: toTitle });
}

function toOver() {
  state = 'over';
  ui.show('gameover');
  ui.renderOver(game, {
    retry: () => enterLevel(game.levelNo),
    levels: () => toLevels(toTitle),
    title: toTitle,
  });
}

function togglePause() {
  if (state === 'play') {
    state = 'pause'; ui.show('pause');
    ui.renderPause(() => { state = 'play'; ui.show('none'); }, toTitle);
  } else if (state === 'pause') { state = 'play'; ui.show('none'); }
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
  if (state === 'intro' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); introGo && introGo(); return; }
  if (state === 'levels' && e.key === 'Escape') { toTitle(); return; }
  if (state !== 'play') {
    if (e.key === 'Escape' && state === 'pause') togglePause();
    return;
  }
  if (e.key === 'Escape') { if (game.typed) { game.clear(); kb.value = ''; } else togglePause(); e.preventDefault(); return; }
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
  if (e.button === 2 || e.shiftKey) { const p = pointer(e); if (p.y < PLAY_H) game.aim = p; }
});
canvas.addEventListener('pointermove', e => {
  if (state === 'play' && game.aim) { const p = pointer(e); game.aim = { x: p.x, y: Math.min(p.y, PLAY_H) }; }
});
window.addEventListener('pointerup', () => { if (game) game.aim = null; });

const muteBtn = document.getElementById('mute');
function syncMute() { muteBtn.textContent = isMuted() ? '🔇' : '⚙'; muteBtn.title = isMuted() ? 'Sound off' : 'Sound on'; }
muteBtn.onclick = () => { unlock(); setMuted(!isMuted()); syncMute(); };

// exposed for debugging and for the automated smoke tests
window.CLOCKWORDS = { get game() { return game; }, get state() { return state; } };

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
