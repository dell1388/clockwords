// boiler.js — the letter economy: inventory, the bag the boiler draws from,
// the chambers (which unseal one at a time), combining, and turning a typed
// word into shots.

import {
  MATERIALS, SPECIAL_MATERIALS, BLANK_DMG, CHAMBERS, START_CHAMBERS, MIN_WORD,
  MIN_BOILER, MAX_BOILER, LENGTH_POWER, LETTER_LEVELS, MAX_LEVEL, levelOf, levelDamage,
} from './content.js';

let nextId = 1;
export const makeLetter = (letter, mat = 'iron', level = null) =>
  ({ id: nextId++, letter, mat, level: level || levelOf(letter) });

export class Boiler {
  constructor(inventory = [], store = [], open = START_CHAMBERS, quotas = {}) {
    this.inventory = inventory;
    this.store = store;
    this.quotas = quotas;          // letter -> how many you want in the boiler; 0 = no cap
    this.open = Math.max(1, Math.min(CHAMBERS, open));
    this.bag = [];
    this.chambers = new Array(CHAMBERS).fill(null);
    this.reshuffle();
    this.reload();
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
  //
  // Chambers refill straight after every word. A new one only unseals when a
  // single word spends every chamber that was loaded — the same full house that
  // earns a boiler overload.
  draw() {
    if (!this.bag.length) this.reshuffle();
    if (!this.bag.length) return null;
    const loadedChars = new Set(this.chambers.filter(Boolean).map(c => c.letter));
    for (let k = this.bag.length - 1; k >= 0; k--) {
      if (!loadedChars.has(this.bag[k].letter)) return this.bag.splice(k, 1)[0];
    }
    return this.bag.pop();
  }

  // Fill every open chamber from scratch. Never more of them than there are
  // letters in the boiler; the bag recycles when it runs out.
  reload() {
    const room = Math.min(this.open, this.inventory.length);
    for (let i = 0; i < CHAMBERS; i++) {
      if (i >= room) { this.chambers[i] = null; continue; }
      if (this.chambers[i]) continue;
      const l = this.draw();
      if (!l) break;
      this.chambers[i] = l;
    }
  }
  refill() { this.reload(); }              // boiler-room edits always reload

  loadedCount() { return this.chambers.slice(0, this.open).filter(Boolean).length; }
  rackEmpty() { return this.loadedCount() === 0; }

  loaded() { return this.chambers.filter(Boolean).length; }
  sealed() { return CHAMBERS - this.open; }
  full() { return this.inventory.length >= MAX_BOILER; }
  short() { return Math.max(0, MIN_BOILER - this.inventory.length); }

  // ── quotas ───────────────────────────────────────────────────────────────
  // Say how many of a letter you want working, and the rest looks after itself:
  // anything over the number goes to storage instead of diluting the bag.
  quotaFor(ch) { return this.quotas[ch] || 0; }
  countIn(ch) { return this.inventory.filter(l => l.letter === ch).length; }

  // A quota is a target, not just a cap: raising it draws copies back out of
  // storage, lowering it sends the excess down.
  setQuota(ch, n) {
    if (n > 0) this.quotas[ch] = n; else delete this.quotas[ch];
    let drawn = 0;
    while (n > 0 && this.countIn(ch) < n && !this.full()) {
      const l = this.store.find(x => x.letter === ch);
      if (!l || !this.toBoiler(l.id)) break;
      drawn++;
    }
    return { moved: this.tidy(), drawn };
  }
  clearQuotas() { this.quotas = {}; }

  // Boiler letters beyond their quota, plainest first — a letter carrying a
  // material is the one you meant to keep.
  overQuota() {
    const byLetter = {};
    for (const l of this.inventory) (byLetter[l.letter] = byLetter[l.letter] || []).push(l);
    const out = [];
    for (const ch of Object.keys(byLetter)) {
      const q = this.quotaFor(ch), list = byLetter[ch];
      if (!q || list.length <= q) continue;
      list.sort((a, b) => (a.mat === 'iron' ? 1 : 0) - (b.mat === 'iron' ? 1 : 0));
      out.push(...list.slice(q));
    }
    return out;
  }

  // Move the excess out, never below the minimum the boiler needs to run.
  tidy() {
    let moved = 0;
    for (const l of this.overQuota()) {
      if (this.inventory.length <= MIN_BOILER) break;
      if (this.toStore(l.id)) moved++;
    }
    return moved;
  }

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
    this.chambers.fill(null);
    this.reshuffle();
    this.reload();
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
  // Where a new letter lands: the boiler while there is room under its quota,
  // storage after.
  stow(letter, mat = 'iron', level = null) {
    const q = this.quotaFor(letter);
    const blocked = this.full() || (q > 0 && this.countIn(letter) >= q);
    if (!blocked) return { where: 'boiler', letter: this.add(letter, mat, level) };
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

  combine(a, b, { toStorage = false } = {}) {
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
    const toBoiler = !toStorage && (this.inBoiler(a.id) || this.inBoiler(b.id));
    this.discard(a.id); this.discard(b.id);
    return toBoiler && !this.full()
      ? this.add(letter, mat, level)
      : this.stow(letter, mat, level).letter;
  }

  // Everything you are not using — storage, plus whatever sits over quota —
  // paired off by level in one pass. Results go through stow, so they land
  // wherever your quotas say they should.
  extras() {
    const seen = new Set();
    return [...this.store, ...this.overQuota()].filter(l => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });
  }

  fuseExtras() {
    const byLevel = {};
    for (const l of this.extras()) {
      if (l.level >= MAX_LEVEL) continue;          // level 5 pairs make materials; keep that deliberate
      (byLevel[l.level] = byLevel[l.level] || []).push(l);
    }
    const made = [];
    for (const lv of Object.keys(byLevel)) {
      const list = byLevel[lv];
      for (let i = 0; i + 1 < list.length; i += 2) {
        if (this.strandsMany([list[i], list[i + 1]])) continue;
        const r = this.combine(list[i], list[i + 1], { toStorage: true });
        if (r) made.push(r);
      }
    }
    return made;
  }

  // How many pairs a Fuse extras would actually make, for the button.
  extraPairs() {
    const byLevel = {};
    for (const l of this.extras()) {
      if (l.level >= MAX_LEVEL) continue;
      byLevel[l.level] = (byLevel[l.level] || 0) + 1;
    }
    return Object.values(byLevel).reduce((n, c) => n + (c >> 1), 0);
  }

  // Any even number of letters of one level can go in at once — the crucible
  // just works through them two at a time.
  canCombineMany(list) {
    if (!list || list.length < 2 || list.length % 2) return false;
    const lvl = list[0].level;
    return list.every(l => l.level === lvl);
  }

  // Conservative: only a pair drawn entirely from the boiler is assumed to put
  // something back into it, so the minimum can never be undershot by surprise.
  strandsMany(list) {
    const out = list.filter(l => this.inBoiler(l.id)).length;
    let back = 0;
    for (let i = 0; i + 1 < list.length; i += 2) {
      if (this.inBoiler(list[i].id) && this.inBoiler(list[i + 1].id)) back++;
    }
    back = Math.min(back, Math.max(0, MAX_BOILER - (this.inventory.length - out)));
    return this.inventory.length - out + back < MIN_BOILER;
  }

  combineMany(list) {
    if (!this.canCombineMany(list)) return [];
    const made = [];
    for (let i = 0; i + 1 < list.length; i += 2) {
      const r = this.combine(list[i], list[i + 1]);
      if (r) made.push(r);
    }
    return made;
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

    // Length pays superlinearly: twice the length is three times the damage,
    // three times the length six times, measured from a three-letter word.
    let mult = Math.pow(len / MIN_WORD, LENGTH_POWER);
    for (let i = 0; i < jade; i++) mult += MATERIALS.jade.lengthBonus * len;
    // A word with no blanks in it at all — every letter out of a chamber.
    const pure = taken.size === len && len > 0;
    if (pure) mult *= 2;
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

    return { shots, slots: [...taken], mult, penalty, overload, jade, brass, wotd, pure };
  }

  // Called once the word has been committed to the cannon. One word has to spend
  // every loaded chamber — a full house — before another unseals. Draining them
  // across several words does not count.
  spend(slots) {
    const loaded = this.loadedCount();
    for (const i of slots) this.chambers[i] = null;
    const fullHouse = loaded > 0 && slots.length === loaded;
    let unsealed = 0;
    if (fullHouse && this.open < CHAMBERS && this.inventory.length > this.open) {
      this.open++;
      unsealed = 1;
    }
    this.reload();
    return unsealed;
  }

  // A letter you cannot use is not a dead end: tip it back into the bag and the
  // boiler draws another. It does nothing towards unsealing.
  dump(i) {
    const c = this.chambers[i];
    if (!c || i >= this.open) return 0;
    this.chambers[i] = null;
    this.bag.push(c);
    this.reload();
    return 0;
  }

  serialize() {
    const pack = l => `${l.letter}:${l.mat}:${l.level}`;
    return { open: this.open, letters: this.inventory.map(pack), store: this.store.map(pack),
             quotas: { ...this.quotas } };
  }

  static deserialize(data) {
    const d = Array.isArray(data) ? { letters: data } : (data || {});
    const un = arr => (arr || []).map(s => {
      const [letter, mat, lvl] = s.split(':');
      return makeLetter(letter, MATERIALS[mat] ? mat : 'iron', +lvl || undefined);
    });
    return new Boiler(un(d.letters), un(d.store), d.open || START_CHAMBERS, d.quotas || {});
  }
}

// The boiler you start with: fifteen plain Iron letters off the common rack —
// the least it will run on.
export function startingInventory() {
  return 'raisenogtdlrasi'.split('').map(ch => makeLetter(ch));
}
