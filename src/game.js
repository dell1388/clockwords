// game.js — the simulation. Pure state + update(); drawing lives in render.js.

import { SPECIES, MATERIALS, getLevel, START_PAGES, MIN_WORD, rollLoot, FIRE_RPM, CHAMBERS } from './content.js';
import { Boiler, startingInventory } from './boiler.js';
import { isWord, wordOfTheDay } from './dict.js';
import { sfx } from './audio.js';
import * as badges from './achievements.js';

export const W = 960, H = 640;
export const PLAY_H = 470;
export const MACHINE = { x: 152, y: 418 };
// The formula lives in a strongbox in the far corner, as far from the muzzle as
// the room allows — so nothing ever has to walk into the cannon's face.
export const SAFE = { x: 828, y: 420 };
export const FLOOR_Y = 418;
export const MUZZLE = { x: 152, y: 318 };
export const PIVOT = { x: 152, y: 394 };

// The barrel is on a trunnion above the boiler: it can dip a little below level
// to reach something almost on top of the machine, but no further.
const MAX_DIP = 0.35;
export const clampAim = a => {
  const n = Math.atan2(Math.sin(a), Math.cos(a));
  if (n > MAX_DIP && n <= Math.PI / 2) return MAX_DIP;
  if (n > Math.PI / 2 && n < Math.PI - MAX_DIP) return Math.PI - MAX_DIP;
  return n;
};

// Where to point so a shell at SHOT_SPEED meets a target that keeps moving.
// Solve |p + v t| = SHOT_SPEED t for the earliest positive t.
export function leadAngle(from, target) {
  const px = target.x - from.x, py = target.y - from.y;
  const vx = target.vx || 0, vy = target.vy || 0;
  const a = vx * vx + vy * vy - SHOT_SPEED * SHOT_SPEED;
  const b = 2 * (px * vx + py * vy);
  const c = px * px + py * py;
  let t = 0;
  if (Math.abs(a) < 1e-6) {
    if (Math.abs(b) > 1e-6) t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const rt = Math.sqrt(disc);
      const t1 = (-b + rt) / (2 * a), t2 = (-b - rt) / (2 * a);
      const good = [t1, t2].filter(x => x > 0);
      if (good.length) t = Math.min(...good);
    }
  }
  if (!(t > 0) || t > 3) t = 0;                 // no solution: just point at it
  // Never lead past the corner the bug is about to turn — over-leading through
  // a waypoint is what actually makes shells miss.
  if (t > 0 && target.path && target.path[target.wi]) {
    const wp = target.path[target.wi];
    const legT = Math.hypot(wp.x - target.x, wp.y - target.y) / (Math.hypot(vx, vy) || 1e6);
    t = Math.min(t, legT + 0.15);
  }
  return Math.atan2(py + vy * t, px + vx * t);
}
export const HORIZON = 158;
// One way in. The other two arches were bricked up years ago.
export const DOORS = [{ x: 812, y: 168 }];
export const SEALED_DOORS = [{ x: 200, y: 168 }, { x: 506, y: 168 }];

// Things further up the room are further away.
export const depthAt = y => 0.5 + 0.5 * Math.max(0, Math.min(1, (y - HORIZON) / (FLOOR_Y - HORIZON)));
// The bugs do not walk straight at you. They sweep the room: across, down a
// lane, back across, down again — and the same way in reverse on the way out.
// Where the proving dummies stand.
export const SANDBOX_MARKS = [
  { x: 330, y: 214 }, { x: 560, y: 214 }, { x: 790, y: 214 },
  { x: 420, y: 316 }, { x: 650, y: 316 }, { x: 860, y: 316 },
];

// Four sweeps of the floor. The lowest one stops well short of the cannon's
// corner: nothing should ever be overhead, where the firing solution gets
// twitchy and the barrel swings wild.
export const LANES = [
  { y: 196, x0: 92, x1: 868 },
  { y: 246, x0: 92, x1: 868 },
  { y: 296, x0: 210, x1: 868 },
  { y: 346, x0: 350, x1: 868 },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function buildPath(door) {
  const wps = [{ x: door.x, y: door.y }];
  // Start whichever way leaves the last lane finishing on the safe's side, so
  // nothing ever walks away from the strongbox and back again.
  const endRight = SAFE.x > W / 2;
  const lastFlip = (LANES.length % 2 === 1);
  let dir = (lastFlip === endRight) ? 1 : -1;
  for (const ln of LANES) {
    const prev = wps[wps.length - 1];
    wps.push({ x: clamp(prev.x, ln.x0, ln.x1), y: ln.y });
    wps.push({ x: dir > 0 ? ln.x1 : ln.x0, y: ln.y });
    dir = -dir;
  }
  wps.push({ x: SAFE.x - 44, y: SAFE.y - 28 });
  return wps;
}

const FIRE_GAP = 60 / FIRE_RPM;   // one shell per letter, 200 rounds a minute
const SHOT_SPEED = 1900;
const TURN_RATE = 5.5;            // rad/s — enough to correct a lead, far too slow to circle
const TRACK_CONE = Math.PI / 3;   // and it only corrects towards something in front of it
const WP_RADIUS = 13;

const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);


export class Game {
  constructor(opts = {}) {
    this.boiler = opts.boiler || new Boiler(startingInventory());
    this.secrets = opts.secrets ?? 0;
    this.pending = opts.pending || [];            // letters recovered this night
    this.score = opts.score ?? 0;
    this.levelNo = opts.levelNo || 1;
    this.usedWords = opts.usedWords || new Map();
    this.stats = opts.stats || { kills: 0, words: 0, damage: 0, best: '', bestDmg: 0, longest: '' };
    this.wotd = wordOfTheDay();
    this.reset();
  }

  reset() {
    this.bugs = [];
    this.shots = [];
    this.particles = [];
    this.floaters = [];
    this.pageDrops = [];
    this.lootDrops = [];
    this.respawns = [];
    this.fireQueue = [];
    this.fireTimer = 0;
    this.typed = '';
    this.message = null;
    this.pages = START_PAGES;
    this.lost = 0;
    this.time = 0;
    this.shake = 0;
    this.aim = null;              // {x,y} when the player aims by hand
    this.over = false;
    this.won = false;
    this.muzzleFlash = 0;
    this.recoil = 0;
    this.rackFlash = 0;
    this.cannonAngle = -Math.PI / 2;
    this.holding = false;
    this.outro = null;
    this.sandbox = false;
    this.wordLog = [];
    this.levelSecrets = 0;
    this.levelKills = 0;
    this.spawns = this.spawns || [];
    this.spawnIdx = 0;
    this.level = this.level || null;
    this.scale = this.scale || 1;
  }

  // A room full of standing targets, so a word can be tried out and read off.
  startSandbox() {
    this.reset();
    this.sandbox = true;
    this.level = { name: 'The Proving Floor', flavour: 'Nothing here can reach you.' };
    this.scale = 1;
    this.spawns = [];
    this.spawnIdx = 0;
    this.wordLog = [];
    this.usedWords = new Map();
    this.levelStartScore = this.score;
    this.boiler.open = CHAMBERS;
    this.boiler.chambers.fill(null);
    this.boiler.reshuffle();
    this.boiler.reload();
    for (const a of SANDBOX_MARKS) this.spawnDummy(a);
  }

  spawnDummy(anchor) {
    const sp = SPECIES.dummy;
    this.bugs.push({
      sp, x: anchor.x, y: anchor.y, anchor, dummy: true,
      hp: sp.hp, maxHp: sp.hp, r: sp.r, door: DOORS[0],
      speed: 0, armor: 0, phase: 'in', carrying: false,
      path: [{ x: anchor.x, y: anchor.y }], wi: 0, step: 1,
      freeze: 0, burn: null, wob: Math.random() * 6.28, legPhase: 0,
      flash: 0, tilt: 0, spawnT: 1, vx: 0, vy: 0,
    });
  }

  startLevel(n) {
    this.reset();
    this.levelNo = n;
    const def = getLevel(n);
    this.level = def;
    this.scale = def.scale || 1;
    // Nights are long. Each wave in the table is stretched out, and the next one
    // starts before the last has finished, so the pressure never really lifts.
    const stretch = Math.min(4, 2.6 + (n - 1) * 0.13);
    this.spawns = [];
    let clock = 1;
    for (const w of def.waves) {
      const boss = SPECIES[w.type] && SPECIES[w.type].boss;
      const count = boss ? w.n : Math.min(20, Math.max(1, Math.round(w.n * stretch)));
      for (let i = 0; i < count; i++) {
        this.spawns.push({ t: clock + i * w.gap, type: w.type, door: w.door });
      }
      clock += count * w.gap * 0.8;
    }
    this.spawns.sort((a, b) => a.t - b.t);
    this.spawnIdx = 0;
    this.wordLog = [];
    this.usedWords = new Map();   // the repeat penalty is per level, not per run
    this.levelStartScore = this.score;
    this.boiler.reseal();
  }

  // ── typing ───────────────────────────────────────────────────────────────
  type(ch) {
    if (this.over || this.won || this.outro) return;
    if (this.typed.length >= 28) return;
    this.typed += ch.toLowerCase();
    sfx.key();
  }

  backspace() { if (this.typed) { this.typed = this.typed.slice(0, -1); sfx.back(); } }

  // Tip a chamber back into the bag — it still counts towards the reload.
  dumpChamber(i) {
    if (this.over || this.won || this.outro) return;
    const c = this.boiler.chambers[i];
    if (!c) return;
    sfx.clank();
    if (this.boiler.dump(i)) { this.note('CHAMBER UNSEALED', '#9be8ff'); sfx.steam(); }
  }
  clear() { if (this.typed) { this.typed = ''; sfx.back(); } }

  submit() {
    const word = this.typed.toLowerCase();
    this.typed = '';
    if (this.over || this.won || this.outro) return;
    if (word.length < MIN_WORD) { this.reject(word, `${MIN_WORD} letters minimum`); return; }
    if (!isWord(word)) { this.reject(word, 'not in the lexicon'); return; }

    const repeats = this.usedWords.get(word) || 0;
    const wotd = word === this.wotd;
    const res = this.boiler.resolve(word, { repeats, wotd });
    const entry = {
      word, marks: res.shots.map(sh => sh.mat), planned: 0, dealt: 0,
      wotd, overload: res.overload, pure: res.pure, effects: res.effects, repeats, at: this.time,
    };
    const wid = this.wordLog.push(entry) - 1;
    for (const sh of res.shots) sh.wid = wid;
    const unsealed = this.boiler.spend(res.slots);
    if (unsealed) { this.note('CHAMBER UNSEALED', '#9be8ff'); sfx.steam(); }
    this.usedWords.set(word, repeats + 1);

    let total = 0;
    for (const s of res.shots) { this.fireQueue.push(s); total += s.dmg; }
    entry.planned = total;

    if (res.overload) {
      sfx.overload();
      this.note('BOILER OVERLOAD', '#ffd66b');
      for (let i = 0; i < 6; i++) {
        this.fireQueue.push({ ch: '*', mat: 'aetherium', dmg: Math.round(60 * res.mult), wid,
          pierce: 1, freeze: 0, burn: null, splash: 50, chain: 2, chainRange: 120 });
      }
    }
    if (res.pure) this.note('PURE WORD — DOUBLE', '#9be8ff');
    if (res.jade) this.note(res.jade > 1 ? `JADE ×${res.jade} — ECHO` : 'JADE — ECHO', '#61e6b0');
    if (wotd) { this.note('WORD OF THE DAY', '#9be8ff'); sfx.overload(); }
    if (repeats > 0) this.note(`repeated ×${repeats + 1} — ${Math.round(res.penalty * 100)}% power`, '#c8a27a');

    this.stats.words++;
    badges.checkWord(word);
    if (repeats > 0) sfx.buzz();
    else if (res.slots.length) sfx.ding();
    if (total > this.stats.bestDmg) { this.stats.bestDmg = total; this.stats.best = word; }
    if (word.length > (this.stats.longest || '').length) this.stats.longest = word;
    this.score += Math.round(total * 0.5 + word.length * word.length);
    this.lastWord = { word, res, total, at: this.time };
  }

  // A bad word costs nothing but the word: it clears and says so, and you can
  // start typing again in the same breath.
  reject(word, why) {
    sfx.bad();
    this.message = { text: word ? `${word} — ${why}` : why, t: 1.1, bad: true };
    this.rackFlash = 1;
  }

  note(text, color) { this.floaters.push({ text, color, x: W / 2, y: 400, vy: -26, t: 1.6, big: true }); }

  // ── simulation ───────────────────────────────────────────────────────────
  update(dt) {
    if (this.outro) this.outro.t += dt;
    if (this.over) { this.decay(dt); return; }
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 3.2);
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt * 6);
    this.recoil = Math.max(0, this.recoil - dt * 5);
    this.rackFlash = Math.max(0, this.rackFlash - dt * 3);
    if (this.message) { this.message.t -= dt; if (this.message.t <= 0) this.message = null; }

    this.spawnStep();
    this.aimStep(dt);
    this.fireStep(dt);
    this.bugStep(dt);
    this.shotStep(dt);
    this.dropStep(dt);
    this.lootStep(dt);
    if (this.sandbox) {
      for (const r of this.respawns) r.t -= dt;
      for (const r of this.respawns.filter(r => r.t <= 0)) this.spawnDummy(r.anchor);
      this.respawns = this.respawns.filter(r => r.t > 0);
    }
    this.decay(dt);

    if (!this.sandbox && !this.won && this.spawnIdx >= this.spawns.length
        && !this.bugs.length && !this.pageDrops.length) {
      this.won = true;
      this.fireQueue.length = 0;
      this.typed = '';
      this.outro = { kind: 'won', t: 0, hold: 2.4 };
      this.levelSecrets = 2 + Math.floor(this.levelNo / 2) + (this.level.boss ? 5 : 0) + this.pages;
      this.secrets += this.levelSecrets;
      this.score += 250 + this.pages * 100;
      this.levelTime = this.time;
      badges.checkLevelClear(this);
      sfx.win();
    }
  }

  decay(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.g || 0) * dt; p.vx *= 0.99; p.vy *= 0.99;
      p.t -= dt;
    }
    this.particles = this.particles.filter(p => p.t > 0);
    for (const f of this.floaters) { f.y += f.vy * dt; f.t -= dt; }
    this.floaters = this.floaters.filter(f => f.t > 0);
  }

  spawnStep() {
    while (this.spawnIdx < this.spawns.length && this.spawns[this.spawnIdx].t <= this.time) {
      const s = this.spawns[this.spawnIdx++];
      this.spawn(s.type, s.door);
    }
  }

  spawn(type, doorIdx) {
    const sp = SPECIES[type];
    const d = DOORS[Math.min(DOORS.length - 1, Math.max(0, doorIdx))] || DOORS[0];
    const hp = Math.round(sp.hp * this.scale);
    const bug = {
      sp, x: d.x + rand(-16, 16), y: d.y + rand(-4, 4),
      hp, maxHp: hp, r: sp.r, door: d,
      speed: sp.speed * (0.9 + Math.random() * 0.25),
      armor: sp.armor || 0, phase: 'in', carrying: false,
      path: buildPath(d), wi: 1, step: 1,
      freeze: 0, burn: null, wob: Math.random() * 6.28, legPhase: Math.random() * 6.28,
      flash: 0, tilt: 0, spawnT: 0,
    };
    this.bugs.push(bug);
    if (sp.boss) { sfx.boss(); this.shake = 1; }
    this.puff(bug.x, bug.y, 8, '#9d8f76');
  }

  bugStep(dt) {
    for (const b of this.bugs) {
      b.spawnT += dt;
      if (b.depth === undefined) { b.depth = b.sp.boss ? Math.max(0.82, depthAt(b.y)) : depthAt(b.y); b.r = b.sp.r * b.depth; }
      b.flash = Math.max(0, b.flash - dt * 5);
      if (b.freeze > 0) { b.freeze -= dt; }
      if (b.burn) {
        b.burn.t -= dt;
        this.credit(b.burn.wid, this.damage(b, b.burn.dps * dt, { silent: true, dot: true }));
        if (Math.random() < dt * 22) this.particles.push({
          x: b.x + rand(-b.r, b.r), y: b.y + rand(-b.r, b.r), vx: rand(-12, 12), vy: rand(-40, -14),
          t: rand(0.25, 0.6), r: rand(1.5, 3.4), c: Math.random() < 0.5 ? '#ff9b3d' : '#ffd98a',
        });
        if (b.burn.t <= 0) b.burn = null;
      }
      if (b.sp.heals) {
        b.healT = (b.healT || 0) + dt;
        if (b.healT > 1) {
          b.healT = 0;
          for (const o of this.bugs) {
            if (o !== b && dist(o, b) < b.sp.heals.range && o.hp < o.maxHp) {
              o.hp = Math.min(o.maxHp, o.hp + b.sp.heals.rate);
              this.particles.push({ x: o.x, y: o.y - 10, vx: rand(-8, 8), vy: -30, t: 0.5, r: 2.5, c: '#b9cf92' });
            }
          }
        }
      }
      if (b.sp.spawns) {
        b.spawnTimer = (b.spawnTimer || 0) + dt;
        if (b.spawnTimer > 4.5) {
          b.spawnTimer = 0;
          const sp = SPECIES[b.sp.spawns];
          const hp = Math.round(sp.hp * this.scale);
          this.bugs.push({ sp, x: b.x + rand(-20, 20), y: b.y + 18, hp, maxHp: hp, r: sp.r,
            door: b.door, speed: sp.speed, armor: 0, phase: b.phase, carrying: false,
            path: b.path, wi: b.wi, step: b.step,
            freeze: 0, burn: null, wob: Math.random() * 6.28, legPhase: 0, flash: 0, tilt: 0, spawnT: 0 });
          sfx.clank();
        }
      }

      if (b.dummy) { b.frost = Math.max(0, (b.frost || 0) - dt * 2); b.legPhase += dt * 0.6; continue; }
      if (b.freeze > 0) { b.frost = Math.min(1, (b.frost || 0) + dt * 4); continue; }
      b.frost = Math.max(0, (b.frost || 0) - dt * 2);

      const wp = b.path[b.wi];
      let dx = wp.x - b.x, dy = wp.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;

      b.wob += dt * (b.sp.gait === 'flit' ? 5.5 : b.sp.gait === 'scurry' ? 3.4 : 2.2);
      const sway = Math.sin(b.wob) * (b.sp.gait === 'flit' ? 26 : b.sp.gait === 'scurry' ? 11 : 6);
      const px = -dy, py = dx;
      const sp = b.speed * (b.carrying ? 1.2 : 1);
      // Aim off the steady travel down the lane. The wobble on top of it is
      // oscillation, not travel — leading on it only overshoots.
      b.vx = dx * sp; b.vy = dy * sp;
      b.x += (dx * sp + px * sway) * dt;
      b.y += (dy * sp + py * sway) * dt;
      b.tilt = Math.atan2(dy, dx) + Math.PI / 2;
      b.legPhase += dt * sp * 0.09;
      b.x = Math.max(14, Math.min(W - 14, b.x));
      b.depth = b.sp.boss ? Math.max(0.82, depthAt(b.y)) : depthAt(b.y);
      b.r = b.sp.r * b.depth;

      if (d < WP_RADIUS + b.r * 0.3) {
        b.wi += b.step;
        if (b.wi >= b.path.length) {                       // reached the safe
          b.wi = b.path.length - 1;
          b.step = -1;
          b.phase = 'out';
          if (this.pages > 0) {
            this.pages--;
            b.carrying = true;
            sfx.steal();
            this.shake = Math.max(this.shake, 0.5);
            this.floaters.push({ text: 'A page!', color: '#ff8f6b', x: b.x, y: b.y - 20, vy: -30, t: 1.4 });
          }
        } else if (b.wi < 0) {                             // back out through the door
          if (b.carrying) {
            this.lost++;
            sfx.lost();
            this.shake = 1;
            this.floaters.push({ text: 'PAGE LOST', color: '#ff5a3c', x: b.x, y: b.y + 10, vy: -20, t: 2, big: true });
            if (this.lost >= START_PAGES) this.gameOver();
          }
          b.dead = true;
        }
      }
    }
    this.bugs = this.bugs.filter(b => !b.dead);
  }

  // Shells already in the air are counted against a bug, so the cannon does not
  // keep firing at something that is on its way down.
  target() {
    if (this.aim) return null;
    let best = null, bestScore = -Infinity;
    for (const b of this.bugs) {
      if (b.spawnT < 0.15) continue;
      // prefer whatever is closest to stealing, then carriers on their way out
      const prog = b.carrying ? 10000 - b.wi * 10 : b.wi * 10 - dist(b, b.path[b.wi]) / 100;
      // Already dead, it just does not know yet: do not waste a shell on it.
      if (b.hp - (b.incoming || 0) <= 0) continue;
      if (prog > bestScore) { bestScore = prog; best = b; }
    }
    return best;
  }

  // The barrel tracks whatever it would shoot at, so it never sits pointing at
  // an empty corner of the room.
  aimStep(dt) {
    const t = this.target();
    let want;
    if (this.aim) want = Math.atan2(this.aim.y - PIVOT.y, this.aim.x - PIVOT.x);
    else if (t) want = leadAngle(PIVOT, t);
    else return;                     // nothing to point at: the barrel stays put
    want = clampAim(want);
    const cur = this.cannonAngle ?? want;
    let d = want - cur;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    this.cannonAngle = clampAim(cur + d * Math.min(1, dt * 9));
  }

  fireStep(dt) {
    this.fireTimer -= dt;
    if (!this.fireQueue.length) { this.fireTimer = Math.min(this.fireTimer, 0); return; }
    // Nothing worth spending a shell on: the breech holds.
    const tgt = this.aim ? this.nearest(this.aim) : this.target();
    if (!tgt) { this.holding = true; return; }
    this.holding = false;
    if (this.fireTimer > 0) return;

    const shot = this.fireQueue.shift();
    this.fireTimer = FIRE_GAP;
    const ang = clampAim(leadAngle(PIVOT, tgt));
    this.cannonAngle = ang;
    const reach = MUZZLE.y - PIVOT.y;            // barrel length, as a radius
    this.shots.push({
      x: PIVOT.x + Math.cos(ang) * -reach, y: PIVOT.y + Math.sin(ang) * -reach,
      vx: Math.cos(ang) * SHOT_SPEED, vy: Math.sin(ang) * SHOT_SPEED,
      shot, hit: new Set(), life: 3, spin: rand(-6, 6), rot: 0, trail: [], aimed: tgt,
    });
    tgt.incoming = (tgt.incoming || 0) + this.effective(shot, tgt);
    this.muzzleFlash = 1; this.recoil = 1;
    this.shake = Math.max(this.shake, shot.mat === 'aetherium' ? 0.35 : 0.12);
    sfx.fire(shot.mat ? 1.25 : 0.85);
  }

  // The closest bug inside the shell's forward cone, so it can never double back.
  aheadOf(s) {
    const cur = Math.atan2(s.vy, s.vx);
    let best = null, bd = Infinity;
    for (const b of this.bugs) {
      if (b.dead || b.hp - (b.incoming || 0) <= 0) continue;
      let diff = Math.atan2(b.y - s.y, b.x - s.x) - cur;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      if (Math.abs(diff) > TRACK_CONE) continue;
      const d = dist(b, s);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // What a shell is actually worth against this bug, armour included.
  effective(shot, b) { return shot.dmg * (1 - (b.armor || 0)); }

  nearest(p, except = null) {
    let best = null, bd = Infinity;
    for (const b of this.bugs) {
      if (b === except || b.dead) continue;
      const d = dist(b, p);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  shotStep(dt) {
    for (const s of this.shots) {
      s.life -= dt;
      // The cannon leads its mark; the shell then trims that lead very gently.
      // It cannot turn tightly enough to circle, only to correct — and it never
      // picks a new target, so a genuine miss stays a miss and flies off.
      // If its mark dies the shell may look for something else, but only ahead
      // of it and only once — it never turns around.
      if (s.aimed && (s.aimed.dead || !this.bugs.includes(s.aimed))) {
        this.release(s);
        s.aimed = this.aheadOf(s);
        s.released = false;
        if (s.aimed) s.aimed.incoming = (s.aimed.incoming || 0) + this.effective(s.shot, s.aimed);
      }
      const tgt = s.aimed;
      if (tgt && !tgt.dead && this.bugs.includes(tgt)) {
        const want = Math.atan2(tgt.y - s.y, tgt.x - s.x);
        const cur = Math.atan2(s.vy, s.vx);
        let diff = want - cur;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        if (Math.abs(diff) < TRACK_CONE) {
          const a = cur + Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, diff));
          s.vx = Math.cos(a) * SHOT_SPEED; s.vy = Math.sin(a) * SHOT_SPEED;
        }
      }
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 6) s.trail.shift();
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.rot += s.spin * dt;

      for (const b of this.bugs) {
        if (s.hit.has(b)) continue;
        if (dist(s, b) > b.r + 14) continue;
        this.impact(s, b);
        s.hit.add(b);
        if (s.hit.size > s.shot.pierce) s.done = true;
        break;
      }
      if (s.life <= 0 || s.x < -60 || s.x > W + 60 || s.y < -60 || s.y > PLAY_H + 60) s.done = true;
      if (s.done) this.release(s);
    }
    this.shots = this.shots.filter(s => !s.done);
  }

  // A shell no longer counts against its mark once it has landed or gone by.
  release(s) {
    if (s.released || !s.aimed) return;
    s.released = true;
    s.aimed.incoming = Math.max(0, (s.aimed.incoming || 0) - this.effective(s.shot, s.aimed));
  }

  impact(s, b) {
    this.release(s);
    const sh = s.shot;
    let dealt = this.damage(b, sh.dmg);
    sfx.hit();
    this.sparks(s.x, s.y, sh.mat ? MATERIALS[sh.mat].glow : '#d9cdb4');

    if (sh.freeze) {
      b.freeze = Math.max(b.freeze, sh.freeze);
      sfx.freeze();
      this.puff(b.x, b.y, 10, MATERIALS.lazurite.glow);
    }
    if (sh.burn) {
      b.burn = { t: sh.burn.time, dps: sh.burn.dps, wid: sh.wid };
      sfx.burn();
    }
    if (sh.splash) {
      sfx.boom();
      this.shake = Math.max(this.shake, 0.4);
      this.blast(s.x, s.y, sh.splash, sh.mat ? MATERIALS[sh.mat].glow : '#ffb457');
      for (const o of this.bugs) {
        if (o === b) continue;
        const d = dist(o, s);
        if (d < sh.splash) dealt += this.damage(o, sh.dmg * 0.6 * (1 - d / sh.splash));
      }
    }
    if (sh.chain) {
      let src = b, n = sh.chain;
      const done = new Set([b]);
      while (n-- > 0) {
        let near = null, nd = sh.chainRange;
        for (const o of this.bugs) {
          if (done.has(o)) continue;
          const d = dist(o, src);
          if (d < nd) { nd = d; near = o; }
        }
        if (!near) break;
        this.arc(src, near);
        dealt += this.damage(near, sh.dmg * 0.5);
        done.add(near); src = near;
      }
    }
    this.credit(sh.wid, dealt);
  }

  credit(wid, dealt) {
    const e = this.wordLog[wid];
    if (e) e.dealt += dealt;
  }

  damage(b, amount, opts = {}) {
    if (b.dead) return 0;
    const dealt = amount * (1 - (b.armor || 0));
    b.hp -= dealt;
    this.stats.damage += dealt;
    if (!opts.dot) { b.flash = 1; }
    if (!opts.silent && dealt >= 1) {
      this.floaters.push({ text: String(Math.round(dealt)), color: '#ffe9bd',
        x: b.x + rand(-6, 6), y: b.y - b.r - 4, vy: -34, t: 0.7 });
    }
    if (b.hp <= 0) this.kill(b);
    return dealt;
  }

  kill(b) {
    if (b.dead) return;
    b.dead = true;
    this.stats.kills++;
    this.levelKills++;
    this.score += (b.sp.bounty + 1) * 10;
    sfx.die();
    this.debris(b);
    if (b.carrying) {
      this.pageDrops.push({ x: b.x, y: b.y, t: 0, vx: rand(-20, 20), vy: -40 });
      this.floaters.push({ text: 'page recovered', color: '#9be88b', x: b.x, y: b.y - 16, vy: -28, t: 1.4 });
    }
    if (b.dummy) {
      this.respawns.push({ anchor: b.anchor, t: 1.1 });
      return;
    }
    if (b.sp.splitOnDeath) {
      for (const t of b.sp.splitOnDeath) {
        const sp = SPECIES[t];
        const hp = Math.round(sp.hp * this.scale);
        this.bugs.push({ sp, x: b.x + rand(-12, 12), y: b.y + rand(-8, 8), hp, maxHp: hp, r: sp.r,
          door: b.door, speed: sp.speed, armor: 0, phase: b.phase, carrying: false,
          path: b.path, wi: b.wi, step: b.step,
          freeze: 0, burn: null, wob: Math.random() * 6.28, legPhase: 0, flash: 0, tilt: 0, spawnT: 0 });
      }
    }
    if (Math.random() < (b.sp.secret >= 1 ? 1 : b.sp.secret)) {
      const n = b.sp.secret >= 1 ? b.sp.secret : 1;
      this.secrets += n;
      this.floaters.push({ text: `+${n} secret`, color: '#ffd66b', x: b.x, y: b.y - 26, vy: -30, t: 1.3 });
    }
    if (Math.random() < b.sp.drop) {
      const tier = b.sp.boss ? 4 : b.sp.hp > 80 ? 3 : b.sp.hp > 30 ? 2 : 1;
      const loot = rollLoot(this.levelNo, tier);
      this.pending.push(loot);
      // the letter lifts out of the wreck
      this.lootDrops.push({ ...loot, x: b.x, y: b.y, t: 0, hold: 1.7, spin: rand(-1, 1) });
      sfx.sparkle(loot.level);
      for (let i = 0; i < 5 + loot.level * 4; i++) {
        this.particles.push({
          x: b.x, y: b.y, vx: rand(-1, 1) * (30 + loot.level * 22),
          vy: rand(-1, 0.3) * (60 + loot.level * 30),
          t: rand(0.4, 0.5 + loot.level * 0.12), r: rand(1.2, 2.2 + loot.level * 0.3),
          c: ['#fff6c9', '#ffd66b', '#9be8ff'][i % 3], g: 90,
        });
      }
    }
    if (b.sp.boss) { this.shake = 1.2; sfx.boom(); this.blast(b.x, b.y, 160, '#ffc857'); }
    badges.checkKill(b.sp);
  }

  gameOver() {
    this.over = true;
    this.lootKept = this.pending.length;      // what fell tonight is yours regardless
    this.typed = '';
    this.fireQueue.length = 0;
    this.outro = { kind: 'lost', t: 0, hold: 2.8 };
    sfx.boom();
    this.shake = 1.4;
  }

  // The panel only comes up once the room has had a moment to settle.
  outroDone() { return !!this.outro && this.outro.t >= this.outro.hold; }

  lootStep(dt) {
    for (const d of this.lootDrops) {
      d.t += dt;
      d.y -= (34 - d.t * 12) * dt;
      if (Math.random() < dt * (8 + d.level * 6)) {
        this.particles.push({ x: d.x + rand(-11, 11), y: d.y + rand(-11, 11),
          vx: rand(-14, 14), vy: rand(-26, -6), t: rand(0.25, 0.55), r: rand(1, 2.1),
          c: Math.random() < 0.5 ? '#fff6c9' : '#ffd66b' });
      }
    }
    this.lootDrops = this.lootDrops.filter(d => d.t < d.hold);
  }

  dropStep(dt) {
    for (const p of this.pageDrops) {
      p.t += dt;
      if (p.t < 0.6) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; }
      else {
        const dx = SAFE.x - p.x, dy = (SAFE.y - 22) - p.y;
        const d = Math.hypot(dx, dy) || 1;
        p.x += (dx / d) * 260 * dt; p.y += (dy / d) * 260 * dt;
        if (d < 14) { p.done = true; this.pages++; sfx.clank(); }
      }
    }
    this.pageDrops = this.pageDrops.filter(p => !p.done);
  }

  // Everything the night came to, for the panel afterwards.
  summary() {
    const log = this.wordLog || [];
    let dealt = 0, lit = 0, blanks = 0, best = null, longest = null;
    for (const e of log) {
      dealt += e.dealt;
      for (const m of e.marks) (m ? lit++ : blanks++);
      if (!best || e.dealt > best.dealt) best = e;
      if (!longest || e.word.length > longest.word.length) longest = e;
    }
    return {
      level: this.levelNo,
      score: this.score - (this.levelStartScore || 0),
      kills: this.levelKills,
      words: log.length,
      dealt,
      lit, blanks,
      best, longest,
      pages: this.pages, lost: this.lost,
      secrets: this.levelSecrets,
      time: this.levelTime || this.time,
    };
  }

  // ── particle helpers ────────────────────────────────────────────────────
  sparks(x, y, c) {
    for (let i = 0; i < 7; i++) this.particles.push({
      x, y, vx: rand(-120, 120), vy: rand(-120, 120), t: rand(0.15, 0.4), r: rand(1, 2.6), c, g: 260,
    });
  }
  puff(x, y, n, c) {
    for (let i = 0; i < n; i++) this.particles.push({
      x, y, vx: rand(-40, 40), vy: rand(-50, 10), t: rand(0.3, 0.8), r: rand(3, 8), c, soft: true,
    });
  }
  blast(x, y, r, c) {
    this.particles.push({ x, y, vx: 0, vy: 0, t: 0.34, r, c, ring: true });
    for (let i = 0; i < 22; i++) this.particles.push({
      x, y, vx: rand(-1, 1) * r * 3, vy: rand(-1, 1) * r * 3, t: rand(0.2, 0.55), r: rand(2, 5), c, g: 180,
    });
  }
  debris(b) {
    for (let i = 0; i < 14; i++) this.particles.push({
      x: b.x, y: b.y, vx: rand(-160, 160), vy: rand(-190, 40), t: rand(0.4, 0.9),
      r: rand(1.5, 3.6), c: Math.random() < 0.5 ? b.sp.body : b.sp.trim, g: 420, gear: Math.random() < 0.4,
    });
    this.puff(b.x, b.y, 6, '#b9ac93');
  }
  arc(a, b) {
    this.particles.push({ arc: true, x: a.x, y: a.y, x2: b.x, y2: b.y, t: 0.18, c: '#fff6c9', r: 2 });
  }
}
