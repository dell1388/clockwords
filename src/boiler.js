// boiler.js — the letter economy: inventory, the bag the boiler draws from,
// the eight chambers, transmutation, and turning a typed word into shots.

import { MATERIALS, TIERS, MAX_TIER, BLANK_DMG, CHAMBERS } from './content.js';

let nextId = 1;
export const makeLetter = (letter, mat) => ({ id: nextId++, letter, mat });

export class Boiler {
  constructor(inventory = []) {
    this.inventory = inventory;
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

  // The boiler feeds empty chambers one at a time; the bag recycles when spent.
  refill() {
    for (let i = 0; i < this.chambers.length; i++) {
      if (this.chambers[i]) continue;
      if (!this.bag.length) this.reshuffle();
      if (!this.bag.length) break;              // inventory smaller than 8
      this.chambers[i] = this.bag.pop();
    }
  }

  loaded() { return this.chambers.filter(Boolean).length; }

  add(letter, mat) {
    const l = makeLetter(letter, mat);
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

  // Two letters of the same tier fuse into one of the next tier up.
  canTransmute(a, b) {
    if (!a || !b || a.id === b.id) return false;
    const ta = MATERIALS[a.mat].tier, tb = MATERIALS[b.mat].tier;
    return ta === tb && ta < MAX_TIER;
  }

  transmute(a, b, mat, letter) {
    if (!this.canTransmute(a, b)) return null;
    this.remove(a.id); this.remove(b.id);
    return this.add(letter, mat);
  }

  /**
   * Work out what a word actually fires.
   * Every character becomes one projectile. If a chamber holds that character
   * the projectile takes the chamber's material and the chamber empties;
   * otherwise it is a blank worth 1 damage.
   */
  resolve(word, { repeats = 0, wotd = false } = {}) {
    const chars = word.toLowerCase().split('');
    const taken = new Set();
    const picks = chars.map(ch => {
      for (let i = 0; i < this.chambers.length; i++) {
        const c = this.chambers[i];
        if (c && c.letter === ch && !taken.has(i)) { taken.add(i); return { slot: i, mat: c.mat }; }
      }
      return { slot: -1, mat: null };
    });

    const len = chars.length;
    const jade = picks.filter(p => p.mat && MATERIALS[p.mat].lengthBonus).length;
    const brass = picks.some(p => p.mat === 'brass');

    let mult = 1 + Math.max(0, len - 4) * 0.15;                  // longer word bonus
    mult = Math.min(mult, 4);
    for (let i = 0; i < jade; i++) mult += MATERIALS.jade.lengthBonus * len;
    if (wotd) mult *= 2;                                         // word of the day
    const penalty = repeats > 0 ? Math.max(0.2, Math.pow(0.5, repeats)) : 1;
    mult *= penalty;

    const loaded = this.loaded();
    const overload = loaded > 0 && taken.size === loaded && loaded >= CHAMBERS;

    const shots = picks.map((p, i) => {
      const m = p.mat ? MATERIALS[p.mat] : null;
      const base = m ? m.dmg : BLANK_DMG;
      const shot = {
        ch: chars[i],
        mat: p.mat,
        dmg: Math.max(1, Math.round(base * mult)),
        pierce: m && m.pierce ? m.pierce : 0,
        freeze: m && m.freeze ? m.freeze : 0,
        burn: m && m.burn ? { ...m.burn } : null,
        splash: m && m.splash ? m.splash : 0,
        chain: m && m.chain ? m.chain : 0,
        chainRange: m && m.chainRange ? m.chainRange : 0,
      };
      // Brass arms every Iron letter in the same word. (canon)
      if (brass && p.mat === 'iron') shot.splash = MATERIALS.brass.splash * 0.8;
      if (wotd) { shot.splash = Math.max(shot.splash, 70); }
      return shot;
    });

    return { shots, slots: [...taken], mult, penalty, overload, jade, brass, wotd };
  }

  // Called after the word has actually been committed to the cannon.
  spend(slots) {
    for (const i of slots) this.chambers[i] = null;
    this.refill();
  }

  serialize() { return this.inventory.map(l => l.letter + ':' + l.mat); }
  static deserialize(arr) {
    return new Boiler((arr || []).map(s => {
      const [letter, mat] = s.split(':');
      return makeLetter(letter, MATERIALS[mat] ? mat : 'iron');
    }));
  }
}

// The boiler you start the game with: a handful of Iron on common letters.
export function startingInventory() {
  return ['e', 'a', 'r', 's', 't', 'o', 'i', 'n', 'l', 'd']
    .map(ch => makeLetter(ch, 'iron'));
}

export const tierMaterials = t => (TIERS[t] || []).map(id => MATERIALS[id]);
