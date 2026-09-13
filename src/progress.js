// progress.js — what carries across a run: how far you have got, your best
// score on each level, and one boiler. The boiler belongs to the run, not to
// any level: whichever night you walk into, you take the same one with you,
// and it only ever changes in the boiler room.

const KEY = 'clockwords.progress.v1';

const blank = () => ({ reached: 1, best: {}, loadout: null });

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return blank();
    const p = { ...blank(), ...raw };
    // Saves from when the boiler was checkpointed per level: keep the furthest
    // one as the run's loadout and drop the rest.
    if (!p.loadout && raw.checkpoints && typeof raw.checkpoints === 'object') {
      const levels = Object.keys(raw.checkpoints).map(Number).filter(n => !isNaN(n));
      if (levels.length) p.loadout = raw.checkpoints[Math.max(...levels)];
    }
    delete p.checkpoints;
    return p;
  } catch (_) { return blank(); }
}

function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (_) {} }

export function reset() { const p = blank(); save(p); return p; }

// The one loadout, written whenever the boiler room changes.
export function setLoadout(snapshot) {
  const p = load();
  p.loadout = snapshot;
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

export const loadout = () => load().loadout;
export const isUnlocked = level => level <= load().reached;
export const furthest = () => load().reached;
