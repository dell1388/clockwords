// boiler.js — the letter economy: inventory, the bag the magazine draws from,
// the chambers (which unseal one at a time), combining, and turning a typed
// word into shots.

import {
  MATERIALS, SPECIAL_MATERIALS, BLANK_DMG, CHAMBERS, START_CHAMBERS, MIN_WORD,
  MIN_BOILER, MAX_BOILER, LENGTH_POWER, LETTER_LEVELS, MAX_LEVEL, levelOf, levelDamage, effectScale,
} from './content.js';

let nextId = 1;
export const makeLetter = (letter, mat = 'iron', level = null) =>
  ({ id: nextId++, letter, mat, level: level || levelOf(letter) });

export class Boiler {
  constructor(inventory = [], store = [], open = START_CHAMBERS, quotas = {}) {
    this.inventory = inventory;
    this.store = store;
    this.quotas = quotas;          // letter -> how many you want in the magazine; 0 = no cap
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
  // magazine load a second copy of a letter you already have.
  //
  // Chambers refill straight after every word. A new one only unseals when a
  // single word spends every chamber that was loaded — the same full house that
  // earns a full house.
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
  // letters in the magazine; the bag recycles when it runs out.
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
  // How many of a letter you want working. Three states: no quota at all
  // (null — leave it alone), zero (keep none of it in the magazine), or a number.
  // A quota is a target, not just a cap: it draws copies out of storage to
  // reach the number and sends anything above it back down.
  quotaFor(ch) {
    const q = this.quotas[ch];
    return q === undefined ? null : q;
  }
  hasQuota(ch) { return this.quotas[ch] !== undefined; }
  countIn(ch) { return this.inventory.filter(l => l.letter === ch).length; }

  setQuota(ch, n) {
    if (n === null) delete this.quotas[ch];
    else this.quotas[ch] = Math.max(0, Math.min(MAX_BOILER, n));
    return this.applyQuotas();
  }
  clearQuotas() { this.quotas = {}; }

  applyQuotas() {
    let drawn = 0;
    for (const ch of Object.keys(this.quotas)) {
      while (this.countIn(ch) < this.quotas[ch] && !this.full()) {
        const l = this.store.find(x => x.letter === ch);
        if (!l || !this.toBoiler(l.id)) break;
        drawn++;
      }
    }
    return { drawn, moved: this.tidy() };
  }

  // Magazine letters beyond their quota, plainest first — a letter carrying a
  // material is the one you meant to keep.
  overQuota() {
    const byLetter = {};
    for (const l of this.inventory) (byLetter[l.letter] = byLetter[l.letter] || []).push(l);
    const out = [];
    for (const ch of Object.keys(byLetter)) {
      const q = this.quotaFor(ch), list = byLetter[ch];
      if (q === null || list.length <= q) continue;
      list.sort((a, b) => (a.mat === 'iron' ? 1 : 0) - (b.mat === 'iron' ? 1 : 0));
      out.push(...list.slice(q));
    }
    return out;
  }

  // Is there room for another of this letter under its quota?
  roomFor(ch) {
    const q = this.quotaFor(ch);
    return q === null || this.countIn(ch) < q;
  }

  // Pull something wanted out of storage so an unwanted letter can leave
  // without dropping the magazine under its minimum.
  backfill(exclude) {
    const l = this.store.find(x => x.letter !== exclude && this.roomFor(x.letter));
    return l ? this.toBoiler(l.id) : false;
  }

  // Move the excess out, never below the minimum the magazine needs to run —
  // swapping in a replacement first when it is already at the line.
  tidy() {
    let moved = 0;
    for (const l of this.overQuota()) {
      if (this.inventory.length <= MIN_BOILER && !this.backfill(l.letter)) break;
      if (this.toStore(l.id)) moved++;
    }
    return moved;
  }

  // Would taking these letters out leave the magazine unable to run? Nothing that
  // strands it is ever allowed. Fusions always return to storage, so anything
  // pulled out of the magazine is pulled out for good.
  wouldStrand(ids) {
    const out = ids.filter(id => this.inBoiler(id)).length;
    return this.inventory.length - out < MIN_BOILER;
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
  // Anything new — loot, a fusion, a stoked letter — lands in storage. You
  // decide what actually goes into the boiler.
  deposit(letter, mat = 'iron', level = null) {
    const l = makeLetter(letter, mat, level);
    this.store.push(l);
    return { where: 'store', letter: l };
  }
  stow(letter, mat = 'iron', level = null) { return this.deposit(letter, mat, level); }
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
  // Either way the foundry, not you, decides which letter comes out.
  canCombine(a, b) {
    return !!a && !!b && a.id !== b.id && a.level === b.level;
  }

  combine(a, b) {
    if (!this.canCombine(a, b)) return null;
    const pick = arr => arr[(Math.random() * arr.length) | 0];
    const aIron = a.mat === 'iron', bIron = b.mat === 'iron';
    let level, letter, mat;

    if (aIron !== bIron) {
      // One plain, one not: the material moves across to a fresh letter of the
      // same level. Iron is not a material to trade away, so nothing goes up.
      level = a.level;
      mat = aIron ? b.mat : a.mat;
      letter = pick(LETTER_LEVELS[level].pool);
    } else if (a.level >= MAX_LEVEL) {
      // Two of a kind at the top of the rack burn away and leave a material.
      level = 1;
      letter = pick(LETTER_LEVELS[1].pool);
      mat = pick(SPECIAL_MATERIALS).id;
    } else {
      level = a.level + 1;
      letter = pick(LETTER_LEVELS[level].pool);
      mat = a.mat;                 // whichever you loaded first sets the material
    }

    this.discard(a.id); this.discard(b.id);
    return this.deposit(letter, mat, level).letter;   // out of the foundry, into storage
  }

  // Everything you are not using — storage, plus whatever sits over quota.
  extras() {
    const seen = new Set();
    return [...this.store, ...this.overQuota()].filter(l => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });
  }

  // Only plain Iron is ever fused in bulk. A letter carrying a material took
  // work to make, and pairing it off is a decision, not a tidy-up.
  fusableExtras() {
    return this.extras().filter(l => l.mat === 'iron' && l.level < MAX_LEVEL);
  }

  fuseExtras() {
    const byLevel = {};
    for (const l of this.fusableExtras()) {
      (byLevel[l.level] = byLevel[l.level] || []).push(l);
    }
    const made = [];
    for (const lv of Object.keys(byLevel)) {
      const list = byLevel[lv];
      for (let i = 0; i + 1 < list.length; i += 2) {
        if (this.strandsMany([list[i], list[i + 1]])) continue;
        const r = this.combine(list[i], list[i + 1]);
        if (r) made.push(r);
      }
    }
    return made;
  }

  // How many pairs a Fuse extras would actually make, for the button.
  extraPairs() {
    const byLevel = {};
    for (const l of this.fusableExtras()) byLevel[l.level] = (byLevel[l.level] || 0) + 1;
    return Object.values(byLevel).reduce((n, c) => n + (c >> 1), 0);
  }

  // Any even number of letters of one level can go in at once — the foundry
  // just works through them two at a time.
  canCombineMany(list) {
    if (!list || list.length < 2 || list.length % 2) return false;
    const lvl = list[0].level;
    return list.every(l => l.level === lvl);
  }

  strandsMany(list) { return this.wouldStrand(list.map(l => l.id)); }

  // Pairs that would take the magazine under its minimum are skipped rather than
  // spoiling the whole batch.
  viablePairs(list) {
    if (!this.canCombineMany(list)) return 0;
    let out = list.filter(l => this.inBoiler(l.id)).length;
    let n = 0;
    for (let i = 0; i + 1 < list.length; i += 2) {
      const cost = (this.inBoiler(list[i].id) ? 1 : 0) + (this.inBoiler(list[i + 1].id) ? 1 : 0);
      if (this.inventory.length - cost < MIN_BOILER) continue;
      n++;
    }
    void out;
    return n;
  }

  combineMany(list) {
    if (!this.canCombineMany(list)) return [];
    const made = [];
    for (let i = 0; i + 1 < list.length; i += 2) {
      if (this.strandsMany([list[i], list[i + 1]])) continue;
      const r = this.combine(list[i], list[i + 1]);
      if (r) made.push(r);
    }
    return made;
  }

  // Secrets keep the magazine topped up when the tanks have not been generous.
  stoke() {
    const pool = LETTER_LEVELS[1].pool;
    return this.deposit(pool[(Math.random() * pool.length) | 0], 'iron', 1);
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
    const jade = picks.filter(p => p.l && MATERIALS[p.l.mat].echo).length;
    const brass = picks.some(p => p.l && p.l.mat === 'brass');

    // Length pays superlinearly: twice the length is three times the damage,
    // three times the length six times, measured from a three-letter word.
    let mult = Math.pow(len / MIN_WORD, LENGTH_POWER);
    // A word with no blanks in it at all — every letter out of a chamber.
    const pure = taken.size === len && len > 0;
    if (pure) mult *= 2;
    if (wotd) mult *= 2;                                         // word of the day
    const penalty = repeats > 0 ? Math.max(0.2, Math.pow(0.5, repeats)) : 1;
    mult *= penalty;

    const loaded = this.loaded();
    const overload = loaded > 0 && taken.size === loaded && loaded >= this.open;

    // Every material in the word lends its effect to every letter in it, blanks
    // included, and different materials stack.
    // The best letter carrying each material sets how hard that effect works.
    const best = {};
    for (const p of picks) {
      if (!p.l || MATERIALS[p.l.mat].base) continue;
      best[p.l.mat] = Math.max(best[p.l.mat] || 0, p.l.level);
    }
    const present = new Set(Object.keys(best));
    const spread = { freeze: 0, pierce: 0, splash: 0, chain: 0, chainRange: 0, burn: null };
    for (const id of present) {
      const m = MATERIALS[id], lvl = best[id], e = effectScale(lvl);
      if (m.freeze) spread.freeze = Math.max(spread.freeze, Math.min(9, m.freeze * e));
      if (m.pierce) spread.pierce = Math.max(spread.pierce, m.pierce + lvl - 1);
      if (m.splash) spread.splash = Math.max(spread.splash, m.splash * (0.75 + 0.25 * e));
      if (m.chain) {
        spread.chain = Math.max(spread.chain, m.chain + Math.round((lvl - 1) * 1.5));
        spread.chainRange = Math.max(spread.chainRange, m.chainRange * (0.7 + 0.3 * e));
      }
      if (m.burn) {
        const frac = m.burn.frac * e;
        if (!spread.burn || frac > spread.burn.frac) spread.burn = { frac, time: m.burn.time };
      }
    }
    if (wotd) spread.splash = Math.max(spread.splash, 70);
    // Jade on a rarer letter echoes closer to full strength.
    const echoFrac = jade
      ? Math.min(1, MATERIALS.jade.echo + (Math.max(1, best.jade || 1) - 1) * 0.075)
      : 0;

    const shots = picks.map((p, i) => {
      const l = p.l;
      const m = l ? MATERIALS[l.mat] : null;
      const dmg = l ? Math.max(1, Math.round(levelDamage(l.level) * m.mul * mult)) : BLANK_DMG;
      return {
        ch: chars[i], mat: l ? l.mat : null, level: l ? l.level : 0, dmg,
        pierce: spread.pierce,
        freeze: spread.freeze,
        splash: spread.splash,
        chain: spread.chain,
        chainRange: spread.chainRange,
        burn: null,
      };
    });

    // A burn is worth the same wherever it is carried, so it is sized off the
    // hardest letter in the word rather than the one it rides on.
    if (spread.burn) {
      const ref = shots.reduce((n, sh) => Math.max(n, sh.dmg), 0);
      const dps = (ref * spread.burn.frac) / spread.burn.time;
      for (const sh of shots) sh.burn = { dps, time: spread.burn.time };
    }

    // Jade sends the whole word down the barrel again, once per Jade letter,
    // at a fraction of its damage.
    const volleys = [...shots];
    for (let k = 0; k < jade; k++) {
      for (const sh of shots) {
        volleys.push({ ...sh, dmg: Math.max(1, Math.round(sh.dmg * echoFrac)),
          burn: sh.burn ? { ...sh.burn, dps: sh.burn.dps * echoFrac } : null,
          echo: true });
      }
    }

    return { shots: volleys, slots: [...taken], mult, penalty, overload, jade, brass, wotd, pure,
             effects: [...present].filter(id => !MATERIALS[id].base) };
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
  // magazine draws another. It does nothing towards unsealing.
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

// The magazine you start with: fifteen plain Iron letters off the common rack —
// the least it will run on.
export function startingInventory() {
  return 'raisenogtdlrasi'.split('').map(ch => makeLetter(ch));
}
