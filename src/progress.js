// progress.js — what survives a bad night: how far you have got, your best
// score on each level, and a checkpoint of the run as it stood when you walked
// into it. Failing a level costs you the level, never the campaign.

const KEY = 'clockwords.progress.v1';

const blank = () => ({ reached: 1, best: {}, checkpoints: {} });

export function load() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!p || typeof p !== 'object') return blank();
    return { ...blank(), ...p };
  } catch (_) { return blank(); }
}

function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (_) {} }

export function reset() { save(blank()); return blank(); }

export function checkpoint(level, snapshot) {
  const p = load();
  p.checkpoints[level] = snapshot;
  p.reached = Math.max(p.reached, level);
  save(p);
  return p;
}

export function cleared(level, score) {
  const p = load();
  p.best[level] = Math.max(p.best[level] || 0, score);
  p.reached = Math.max(p.reached, level + 1);
  save(p);
  return p;
}

export const checkpointFor = level => load().checkpoints[level] || null;
export const isUnlocked = level => level <= load().reached;
export const furthest = () => load().reached;
