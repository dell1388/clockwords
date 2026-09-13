// main.js — bootstrap, the loop, input and the screen state machine.

import { Game, W, H, PLAY_H } from './game.js';
import { Boiler, startingInventory } from './boiler.js';
import { loadDictionary, dictSize } from './dict.js';
import { draw, makeBackground } from './render.js';
import * as ui from './ui.js';
import { sfx, unlock, setMuted, isMuted } from './audio.js';
import { onBadge } from './achievements.js';

const SAVE_KEY = 'clockwords.save.v1';
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

// ── persistence ────────────────────────────────────────────────────────────
function saveGame() {
  if (!game) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      levelNo: game.levelNo, secrets: game.secrets, discovered: game.discovered,
      score: game.score, inventory: game.boiler.serialize(), stats: game.stats,
      used: [...game.usedWords.entries()],
    }));
  } catch (_) {}
}
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (_) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (_) {} }

// ── flow ───────────────────────────────────────────────────────────────────
function toTitle() {
  state = 'title';
  ui.show('title');
  ui.renderTitle(!!loadSave(), newGame, continueGame, () => {
    state = 'howto'; ui.show('howto'); ui.renderHow(toTitle);
  });
}

function newGame() {
  clearSave();
  game = new Game({ boiler: new Boiler(startingInventory()) });
  toIntro(1);
}

function continueGame() {
  const s = loadSave();
  if (!s) return newGame();
  game = new Game({
    boiler: Boiler.deserialize(s.inventory),
    secrets: s.secrets, discovered: s.discovered || {}, score: s.score,
    levelNo: s.levelNo, stats: s.stats, usedWords: new Map(s.used || []),
  });
  toIntro(s.levelNo);
}

function toIntro(n) {
  state = 'intro';
  ui.show('intro');
  introGo = ui.renderIntro(n, () => startLevel(n));
}

function startLevel(n) {
  game.startLevel(n);
  state = 'play';
  ui.show('none');
  kb.value = '';
  if (touch) focusKb(); else canvas.focus();
}

function toBoiler() {
  state = 'boiler';
  saveGame();
  ui.show('boiler');
  ui.renderBoiler(game, () => { game.levelNo++; saveGame(); toIntro(game.levelNo); });
}

function toOver() {
  state = 'over';
  clearSave();
  ui.show('gameover');
  ui.renderOver(game, newGame, toTitle);
}

function togglePause() {
  if (state === 'play') { state = 'pause'; ui.show('pause'); ui.renderPause(() => { state = 'play'; ui.show('none'); }, toTitle); }
  else if (state === 'pause') { state = 'play'; ui.show('none'); }
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
    if (game.over) toOver();
    else if (game.won) toBoiler();
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
  game = new Game({ boiler: new Boiler(startingInventory()) });
  game.startLevel(1);
  requestAnimationFrame(frame);
  setTimeout(toTitle, 250);
})();
