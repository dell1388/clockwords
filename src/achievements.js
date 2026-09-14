// achievements.js — three of them, carrying the names the original's Kongregate
// badges carried.

const KEY = 'clockwords.badges.v1';

export const BADGES = [
  { id: 'hurt',  name: 'Words Will Never Hurt Me', pts: 5,
    desc: 'Survive the first wave with every dossier of the formula intact.' },
  { id: 'sesqui', name: 'Sesquipedalian', pts: 15,
    desc: 'Fire a single word of twelve letters or more.' },
  { id: 'box',   name: 'Professor Dillingham and the Diabolical Box', pts: 30,
    desc: 'Destroy the Box.' },
];

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; }
}
function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) {} }

export const earned = () => read();
export const has = id => !!read()[id];

let onEarn = null;
export function onBadge(fn) { onEarn = fn; }

export function award(id) {
  const o = read();
  if (o[id]) return false;
  o[id] = Date.now();
  write(o);
  const b = BADGES.find(x => x.id === id);
  if (b && onEarn) onEarn(b);
  return true;
}

export function checkWord(word) {
  if (word.length >= 12) award('sesqui');
}
export function checkLevelClear(game) {
  if (game.levelNo === 1 && game.lost === 0) award('hurt');
}
export function checkKill(species) {
  if (species.boss) award('box');
}
