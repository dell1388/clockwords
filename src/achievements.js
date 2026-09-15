// achievements.js — three of them, the Clockwords badges under field names.

const KEY = 'clockwords.badges.v1';

export const BADGES = [
  { id: 'hurt',  name: 'Not A Scratch', pts: 5,
    desc: 'Clear the first wave with every dossier still in the safe.' },
  { id: 'sesqui', name: 'Sesquipedalian', pts: 15,
    desc: 'Fire a single word of twelve letters or more.' },
  { id: 'box',   name: 'The Colonel Is Dead', pts: 30,
    desc: 'Knock out the Iron Colonel.' },
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
