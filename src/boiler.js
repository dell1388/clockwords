// boiler.js — the letter economy: inventory, the bag the boiler draws from,
// the chambers (which unseal one at a time), combining, and turning a typed
// word into shots.

import {
  MATERIALS, BLANK_DMG, CHAMBERS, START_CHAMBERS,
  LETTER_LEVELS, MAX_LEVEL, levelOf, levelDamage,
} from './content.js';

let nextId = 1;
export const makeLetter = (letter, mat = 'iron', level = null) =>
  ({ id: nextId++, letter, mat, level: level || levelOf(letter) });

export class Boiler {
  constructor(inventory = [], open = START_CHAMBERS) {
    this.inventory = inventory;
    this.open = Math.max(1, Math.min(CHAMBERS, open));
    this.spentSinceUnlock = 0;
    this.bag = [];
    this.chambers = new Array(CHAMBERS).fill(null);
    this.reshuffle();
    this.refill();
  }

  reshuffle() {
    const inChamber = new Set(this.chambers.filter(Boolean).map(l => l.id));
    this.bag = this.inventory.filter(l => !inChamber.has(l.id));
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  // Only the unsealed chambers are fed; the bag recycles when it runs out.
  refill() {
    for (let i = 0; i < CHAMBERS; i++) {
      if (i >= this.open) { this.chambers[i] = null; continue; }
      if (this.chambers[i]) continue;
      if (!this.bag.length) this.reshuffle();
      if (!this.bag.length) break;              // inventory smaller than the open count
      this.chambers[i] = this.bag.pop();
    }
  }

  loaded() { return this.chambers.filter(Boolean).length; }
  sealed() { return CHAMBERS - this.open; }

  add(letter, mat = 'iron', level = null) {
    const l = makeLetter(letter, mat, level);
    this.inventory.push(l);
    this.bag.push(l);
    this.refill();
    return l;
  }

  remove(id) {
    this.inventory = this.inventory.filter(l => l.id !== id);
    this.bag = this.bag.filter(l => l.id !== id);
    const i = this.chambers.findIndex(c => c && c.id === id);
    if (i >= 0) this.chambers[i] = null;
    this.refill();
  }

  // Two letters of the same level fuse into one letter of the level above,
  // in the same material. You choose which letter of that level you get.
  canCombine(a, b) {
    return !!a && !!b && a.id !== b.id && a.level === b.level && a.level < MAX_LEVEL;
  }

  combine(a, b, letter) {
    if (!this.canCombine(a, b)) return null;
    const level = a.level + 1;
    if (!LETTER_LEVELS[level].pool.includes(letter)) return null;
    const mat = a.mat !== 'iron' ? a.mat : b.mat;
    this.remove(a.id); this.remove(b.id);
    return this.add(letter, mat, level);
  }

  // A letter has to reach level 5 before it is rare enough to hold a material.
  canRefit(l) { return !!l && l.level >= MAX_LEVEL; }

  refit(id, mat) {
    const l = this.inventory.find(x => x.id === id);
    if (!l || !this.canRefit(l) || !MATERIALS[mat]) return false;
    l.mat = mat;
    return true;
  }

  /**
   * Work out what a word actually fires.
   * Every character becomes one projectile. If an unsealed chamber holds that
   * character the chamber fires — damage from the letter's level, effect from
   * its material — and then empties. Any other character is a blank worth 1.
   */
  resolve(word, { repeats = 0, wotd = false } = {}) {
    const chars = word.toLowerCase().split('');
    const taken = new Set();
    const picks = chars.map(ch => {
      for (let i = 0; i < this.open; i++) {
        const c = this.chambers[i];
        if (c && c.letter === ch && !taken.has(i)) { taken.add(i); return { slot: i, l: c }; }
      }
      return { slot: -1, l: null };
    });

    const len = chars.length;
    const jade = picks.filter(p => p.l && MATERIALS[p.l.mat].lengthBonus).length;
    const brass = picks.some(p => p.l && p.l.mat === 'brass');

    let mult = 1 + Math.max(0, len - 4) * 0.15;                  // longer word bonus
    mult = Math.min(mult, 4);
    for (let i = 0; i < jade; i++) mult += MATERIALS.jade.lengthBonus * len;
    if (wotd) mult *= 2;                                         // word of the day
    const penalty = repeats > 0 ? Math.max(0.2, Math.pow(0.5, repeats)) : 1;
    mult *= penalty;

    const loaded = this.loaded();
    const overload = loaded > 0 && taken.size === loaded && loaded >= this.open;

    const shots = picks.map((p, i) => {
      const l = p.l;
      const m = l ? MATERIALS[l.mat] : null;
      const base = l ? levelDamage(l.level) * m.mul : BLANK_DMG;
      const dmg = Math.max(1, Math.round(base * mult));
      const shot = {
        ch: chars[i], mat: l ? l.mat : null, level: l ? l.level : 0, dmg,
        pierce: m && m.pierce ? m.pierce : 0,
        freeze: m && m.freeze ? m.freeze : 0,
        burn: m && m.burn ? { dps: (dmg * m.burn.frac) / m.burn.time, time: m.burn.time } : null,
        splash: m && m.splash ? m.splash : 0,
        chain: m && m.chain ? m.chain : 0,
        chainRange: m && m.chainRange ? m.chainRange : 0,
      };
      // Brass arms every Iron letter in the same word. (canon)
      if (brass && l && l.mat === 'iron') shot.splash = MATERIALS.brass.splash * 0.8;
      if (wotd) shot.splash = Math.max(shot.splash, 70);
      return shot;
    });

    return { shots, slots: [...taken], mult, penalty, overload, jade, brass, wotd };
  }

  // Called once the word has been committed to the cannon. Spending everything
  // the open chambers held unseals the next one.
  spend(slots) {
    for (const i of slots) this.chambers[i] = null;
    this.spentSinceUnlock += slots.length;
    let unsealed = 0;
    while (this.spentSinceUnlock >= this.open && this.open < CHAMBERS) {
      this.spentSinceUnlock -= this.open;
      this.open++;
      unsealed++;
    }
    this.refill();
    return unsealed;
  }

  serialize() {
    return { open: this.open, letters: this.inventory.map(l => `${l.letter}:${l.mat}:${l.level}`) };
  }

  static deserialize(data) {
    const d = Array.isArray(data) ? { open: START_CHAMBERS, letters: data } : (data || {});
    const letters = (d.letters || []).map(s => {
      const [letter, mat, lvl] = s.split(':');
      return makeLetter(letter, MATERIALS[mat] ? mat : 'iron', +lvl || undefined);
    });
    return new Boiler(letters, d.open || START_CHAMBERS);
  }
}

// The boiler you start with: ten plain Iron letters off the common rack.
export function startingInventory() {
  return ['e', 'a', 'r', 's', 't', 'o', 'i', 'n', 'l', 'd'].map(ch => makeLetter(ch));
}
