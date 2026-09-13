// boiler.js — the letter economy: inventory, the bag the boiler draws from,
// the chambers (which unseal one at a time), combining, and turning a typed
// word into shots.

import {
  MATERIALS, SPECIAL_MATERIALS, BLANK_DMG, CHAMBERS, START_CHAMBERS,
  MIN_BOILER, MAX_BOILER, LETTER_LEVELS, MAX_LEVEL, levelOf, levelDamage,
} from './content.js';

let nextId = 1;
export const makeLetter = (letter, mat = 'iron', level = null) =>
  ({ id: nextId++, letter, mat, level: level || levelOf(letter) });

export class Boiler {
  constructor(inventory = [], store = [], open = START_CHAMBERS) {
    this.inventory = inventory;
    this.store = store;
    this.open = Math.max(1, Math.min(CHAMBERS, open));
    this.usedSinceUnlock = new Set();
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

  // Pull one letter from the bag, preferring a character that is not already
  // sitting in a chamber. Only when the bag has nothing else to offer does the
  // boiler load a second copy of a letter you already have.
  draw() {
    if (!this.bag.length) this.reshuffle();
    if (!this.bag.length) return null;
    const loadedChars = new Set(this.chambers.filter(Boolean).map(c => c.letter));
    for (let k = this.bag.length - 1; k >= 0; k--) {
      if (!loadedChars.has(this.bag[k].letter)) return this.bag.splice(k, 1)[0];
    }
    return this.bag.pop();
  }

  // Only the unsealed chambers are fed, and never more of them than there are
  // letters in the boiler. The bag recycles when it runs out.
  refill() {
    const room = Math.min(this.open, this.inventory.length);
    for (let i = 0; i < CHAMBERS; i++) {
      if (i >= room) { this.chambers[i] = null; continue; }
      if (this.chambers[i]) continue;
      const l = this.draw();
      if (!l) break;
      this.chambers[i] = l;
    }
  }

  loaded() { return this.chambers.filter(Boolean).length; }
  sealed() { return CHAMBERS - this.open; }
  full() { return this.inventory.length >= MAX_BOILER; }
  short() { return Math.max(0, MIN_BOILER - this.inventory.length); }

  // Would taking these letters out (and putting `returning` back) leave the
  // boiler unable to run? Nothing that strands it is ever allowed.
  wouldStrand(ids, returning = 0) {
    const out = ids.filter(id => this.inBoiler(id)).length;
    return this.inventory.length - out + returning < MIN_BOILER;
  }

  // Where the crucible's output lands, worked out before anything is consumed.
  combineLandsInBoiler(a, b) {
    const out = [a, b].filter(l => this.inBoiler(l.id)).length;
    return out > 0 && this.inventory.length - out < MAX_BOILER;
  }

  // Every level starts with the chambers bolted shut again; you earn them back
  // by spending what the open ones hold.
  reseal() {
    this.open = START_CHAMBERS;
    this.usedSinceUnlock.clear();
    this.chambers.fill(null);
    this.reshuffle();
    this.refill();
  }

  find(id) {
    return this.inventory.find(l => l.id === id) || this.store.find(l => l.id === id) || null;
  }
  inBoiler(id) { return this.inventory.some(l => l.id === id); }

  // Letters can be parked in storage and drawn back out between levels.
  toStore(id) {
    const l = this.inventory.find(x => x.id === id);
    if (!l) return false;
    this.remove(id);
    this.store.push(l);
    return true;
  }
  toBoiler(id) {
    if (this.full()) return false;
    const i = this.store.findIndex(x => x.id === id);
    if (i < 0) return false;
    const [l] = this.store.splice(i, 1);
    this.inventory.push(l);
    this.bag.push(l);
    this.refill();
    return true;
  }
  // Where a new letter lands: the boiler while there is room, storage after.
  stow(letter, mat = 'iron', level = null) {
    if (!this.full()) return { where: 'boiler', letter: this.add(letter, mat, level) };
    const l = makeLetter(letter, mat, level);
    this.store.push(l);
    return { where: 'store', letter: l };
  }
  discard(id) {
    const i = this.store.findIndex(x => x.id === id);
    if (i >= 0) { this.store.splice(i, 1); return true; }
    if (this.inBoiler(id)) { this.remove(id); return true; }
    return false;
  }

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

  // Two letters of the same level go into the crucible. Below the top of the
  // rack they come out one level higher, in the same material. Two level-5
  // letters burn away entirely and leave a material behind, seeded on a fresh
  // level-1 letter — which is the only way a material is ever made.
  // Either way the crucible, not you, decides which letter comes out.
  canCombine(a, b) {
    return !!a && !!b && a.id !== b.id && a.level === b.level;
  }

  combine(a, b) {
    if (!this.canCombine(a, b)) return null;
    const pick = arr => arr[(Math.random() * arr.length) | 0];
    let level, letter, mat;
    if (a.level >= MAX_LEVEL) {
      level = 1;
      letter = pick(LETTER_LEVELS[1].pool);
      mat = pick(SPECIAL_MATERIALS).id;
    } else {
      level = a.level + 1;
      letter = pick(LETTER_LEVELS[level].pool);
      mat = a.mat !== 'iron' ? a.mat : b.mat;
    }
    const toBoiler = this.inBoiler(a.id) || this.inBoiler(b.id);
    this.discard(a.id); this.discard(b.id);
    return toBoiler && !this.full()
      ? this.add(letter, mat, level)
      : this.stow(letter, mat, level).letter;
  }

  // Secrets keep the boiler topped up when the bugs have not been generous.
  stoke() {
    const pool = LETTER_LEVELS[1].pool;
    return this.stow(pool[(Math.random() * pool.length) | 0], 'iron', 1);
  }

  // Which chambers the word in the rack would spend, so the tanks can read as
  // empty the moment you type the letter.
  preview(word) {
    const taken = new Set();
    for (const ch of word.toLowerCase()) {
      for (let i = 0; i < this.open; i++) {
        const c = this.chambers[i];
        if (c && c.letter === ch && !taken.has(i)) { taken.add(i); break; }
      }
    }
    return taken;
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
      const dmg = l ? Math.max(1, Math.round(levelDamage(l.level) * m.mul * mult)) : BLANK_DMG;
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

  // Called once the word has been committed to the cannon. A chamber unseals
  // only when every chamber currently open has been drained since the last one
  // opened — never more than one at a time, and never on a partial sweep.
  spend(slots) {
    for (const i of slots) {
      this.chambers[i] = null;
      this.usedSinceUnlock.add(i);
    }
    let unsealed = 0;
    if (this.open < CHAMBERS && this.inventory.length > this.open) {
      let all = true;
      for (let i = 0; i < this.open; i++) if (!this.usedSinceUnlock.has(i)) { all = false; break; }
      if (all) { this.open++; this.usedSinceUnlock.clear(); unsealed = 1; }
    }
    this.refill();
    return unsealed;
  }

  serialize() {
    const pack = l => `${l.letter}:${l.mat}:${l.level}`;
    return { open: this.open, letters: this.inventory.map(pack), store: this.store.map(pack) };
  }

  static deserialize(data) {
    const d = Array.isArray(data) ? { letters: data } : (data || {});
    const un = arr => (arr || []).map(s => {
      const [letter, mat, lvl] = s.split(':');
      return makeLetter(letter, MATERIALS[mat] ? mat : 'iron', +lvl || undefined);
    });
    return new Boiler(un(d.letters), un(d.store), d.open || START_CHAMBERS);
  }
}

// The boiler you start with: fifteen plain Iron letters off the common rack —
// the least it will run on.
export function startingInventory() {
  return 'etaoinshrdletao'.split('').map(ch => makeLetter(ch));
}
