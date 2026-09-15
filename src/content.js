// content.js — materials, tank species and the campaign table.
// Numbers marked (canon) are taken from contemporary guides to the original
// Flash game; the rest is reconstructed to sit consistently around them.
// See docs/FIDELITY.md.

// ── letters ────────────────────────────────────────────────────────────────
// Letters are graded the way Scrabble grades them: the commonest letters are
// level 1, the rarest are level 5. A letter's level is drawn as dots under the
// glyph, and it is the level — not the material — that sets the damage.

export const LETTER_LEVELS = [
  null,
  { level: 1, dmg: 12,  pool: 'raise' },
  { level: 2, dmg: 36,  pool: 'nogtdl' },
  { level: 3, dmg: 90,  pool: 'cbupmh' },
  { level: 4, dmg: 210, pool: 'fkvyw' },
  { level: 5, dmg: 500, pool: 'zjxq' },
];
export const MAX_LEVEL = 5;

const LEVEL_OF = {};
for (let i = 1; i <= MAX_LEVEL; i++) for (const ch of LETTER_LEVELS[i].pool) LEVEL_OF[ch] = i;
export const levelOf = ch => LEVEL_OF[ch] || 1;
export const levelDamage = lvl => LETTER_LEVELS[lvl].dmg;

// A material on a rarer letter works harder, the way a rarer letter hits harder.
export const effectScale = lvl => 1 + (Math.max(1, lvl) - 1) * 0.4;   // 1.0 → 2.6

// ── materials ──────────────────────────────────────────────────────────────
// Only a level-5 letter is rare enough to hold anything but Iron. Materials
// are read by colour alone — the tanks are never labelled.

export const MATERIALS = {
  iron: {
    id: 'iron', name: 'Ball', mul: 1, cost: 0, base: true,
    body: '#6d6a63', edge: '#2b2a27', ink: '#e9e2d2', glow: '#9a958a', dot: '#efe7d4',
    desc: 'Plain steel shot. No special effect.',
  },
  thermite: {
    id: 'thermite', name: 'Incendiary', mul: 0.5, cost: 6, burn: { frac: 0.8, time: 4 },
    body: '#b8471f', edge: '#4a1607', ink: '#ffe6c2', glow: '#ff8a3c', dot: '#ffd9a8',
    desc: 'Sets armour burning for four seconds.',
  },
  amethyst: {
    id: 'amethyst', name: 'Sabot', mul: 0.7, cost: 8, pierce: 2,
    body: '#7a4bbd', edge: '#2d1750', ink: '#f0e2ff', glow: '#c08bff', dot: '#e8d4ff',
    desc: 'A dart that punches clean through two hulls.',
  },
  lazurite: {
    id: 'lazurite', name: 'Pulse', mul: 0.4, cost: 10, freeze: 4,
    body: '#2f63b5', edge: '#0d2148', ink: '#dcecff', glow: '#7fc4ff', dot: '#cfe6ff',
    desc: 'Kills the engines — nothing moves for four seconds.',
  },
  brass: {
    id: 'brass', name: 'High Explosive', mul: 0.9, cost: 12, splash: 68, armsIron: true,
    body: '#c08b2e', edge: '#4d3208', ink: '#fff3d0', glow: '#ffc857', dot: '#ffe6ab',
    desc: 'Bursts on impact and catches everything nearby.',
  },
  jade: {
    id: 'jade', name: 'Double Feed', mul: 0.8, cost: 15, echo: 0.7,
    body: '#2f8f6b', edge: '#0c3a2a', ink: '#dcfff0', glow: '#61e6b0', dot: '#b6f5da',
    desc: 'The autoloader runs the whole word again, at 70% damage.',
  },
  aetherium: {
    id: 'aetherium', name: 'Arc', mul: 1.2, cost: 20, chain: 3, chainRange: 140,
    body: '#d8d2c0', edge: '#5c5647', ink: '#3a3528', glow: '#fff6c9', dot: '#6a6252',
    desc: 'The charge jumps on to nearby armour — three hulls, more from a rarer shell.',
  },
};
export const SPECIAL_MATERIALS = Object.values(MATERIALS).filter(m => !m.base);

// A letter that is NOT loaded in a chamber is a blank: a small, flat amount of
// damage that no bonus or penalty ever touches.
export const BLANK_DMG = 5;
export const CHAMBERS = 8;          // the magazine feeds eight chambers (canon)
export const START_CHAMBERS = 1;    // sealed back down to one at the top of every level
export const MIN_WORD = 3;
// Word length pays superlinearly: log2(3), so twice the length is three times
// the damage and three times the length is six.
export const LENGTH_POWER = 1.61;
export const START_PAGES = 5;      // codebooks in the field safe
export const MIN_BOILER = 15;       // the magazine will not run on less
export const MAX_BOILER = 50;       // and will not hold more
// The gun starts slow and is bought up with intel: ten upgrades, one round a
// second at the bottom and ten a second at the top.
export const FIRE_RATES = [1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10];   // rounds a second, one step per upgrade
export const MAX_ROF = FIRE_RATES.length - 1;
export const rofCost = lvl => 6 + lvl * 6;                   // 6, 12 … 60 — 330 all told
export const fireRate = lvl => FIRE_RATES[Math.max(0, Math.min(MAX_ROF, lvl | 0))];
export const rateText = lvl => `${fireRate(lvl)}/s`;

// Only about a third of a wreck leaves a letter behind. The Colonel is the one
// exception: it always drops.
export const DROP_SCALE = 0.3;
export const dropChance = sp => (sp.boss ? sp.drop : sp.drop * DROP_SCALE);
export const STOKE_COST = 3;        // intel for one fresh level-1 Iron letter
export const HANDMADE = 10;         // ten written waves, then it generates forever

// ── loot ───────────────────────────────────────────────────────────────────
// Common letters fall constantly on the early waves; the rare ones only start
// showing up once you are deep enough for the tanks to be carrying them.
export function rollLoot(nightNo, bugTier = 1) {
  const n = nightNo, t = bugTier;
  const w = [
    0,
    100,
    18 + n * 5 + t * 6,
    4 + n * 3.4 + t * 5,
    0.8 + n * 2.0 + t * 4,
    0.15 + n * 0.95 + t * 2.4,
  ];
  let total = 0;
  for (let i = 1; i <= MAX_LEVEL; i++) total += w[i];
  let r = Math.random() * total;
  let lvl = 1;
  for (let i = 1; i <= MAX_LEVEL; i++) { r -= w[i]; if (r <= 0) { lvl = i; break; } }
  const pool = LETTER_LEVELS[lvl].pool;
  return { letter: pool[(Math.random() * pool.length) | 0], level: lvl };
}

export const SPECIES = {
  spider: {
    id: 'spider', name: 'Light Tank', hp: 30, speed: 96, r: 13,
    legs: 8, gait: 'crawl', bounty: 1, secret: 0.10, drop: 0.16,
    body: '#5a6242', trim: '#97a271',
  },
  roach: {
    id: 'roach', name: 'Scout Car', hp: 22, speed: 154, r: 11,
    legs: 6, gait: 'scurry', bounty: 1, secret: 0.10, drop: 0.14,
    body: '#6d6b3c', trim: '#b9b467',
  },
  tick: {
    id: 'tick', name: 'Sapper Drone', hp: 10, speed: 130, r: 8,
    legs: 6, gait: 'scurry', bounty: 0, secret: 0.04, drop: 0.05,
    body: '#54584b', trim: '#9aa08c',
  },
  beetle: {
    id: 'beetle', name: 'Heavy Tank', hp: 130, speed: 61, r: 19,
    legs: 6, gait: 'lumber', armor: 0.5, bounty: 3, secret: 0.35, drop: 0.34,
    body: '#454b50', trim: '#8d99a3',
  },
  moth: {
    id: 'moth', name: 'Gunship', hp: 40, speed: 191, r: 13,
    legs: 6, gait: 'flit', flying: true, bounty: 2, secret: 0.22, drop: 0.24,
    body: '#4b5a5e', trim: '#9dc0c6',
  },
  centipede: {
    id: 'centipede', name: 'Troop Column', hp: 95, speed: 113, r: 14,
    legs: 12, gait: 'crawl', splitOnDeath: ['tick', 'tick'], bounty: 3,
    secret: 0.30, drop: 0.30, body: '#6b5a38', trim: '#c2a969',
  },
  weaver: {
    id: 'weaver', name: 'Repair Rig', hp: 70, speed: 90, r: 15,
    legs: 8, gait: 'crawl', heals: { rate: 9, range: 120 }, bounty: 3,
    secret: 0.32, drop: 0.30, body: '#3f5b46', trim: '#82c095',
  },
  dummy: {
    id: 'dummy', name: 'Range Target', hp: 5000, speed: 0, r: 22,
    legs: 6, gait: 'lumber', bounty: 0, secret: 0, drop: 0,
    body: '#5e6154', trim: '#c2c4b0',
  },
  box: {
    id: 'box', name: 'The Iron Colonel', hp: 2600, speed: 34, r: 46,
    legs: 8, gait: 'lumber', armor: 0.25, boss: true, spawns: 'tick',
    bounty: 25, secret: 6, drop: 1, body: '#33362f', trim: '#c2a03e',
  },
};

// ── Campaign ────────────────────────────────────────────────────────────────
// Each level: { name, flavour, waves:[{ at, type, n, gap, door }] }
const W = (at, type, n = 1, gap = 1.1, door = -1) => ({ at, type, n, gap, door });

export const LEVELS = [
  { name: 'Contact', flavour: 'Tracks on the approach road. Load the gun.',
    waves: [W(1.0, 'spider', 2, 2.6, 1), W(9, 'spider', 3, 2.2, 0), W(20, 'spider', 3, 1.8, 2)] },
  { name: 'Fast Movers', flavour: 'Scout cars. Quick, thin-skinned, and rude about it.',
    waves: [W(1, 'spider', 3, 2.0, 1), W(9, 'roach', 3, 1.5, 0), W(18, 'roach', 3, 1.4, 2), W(27, 'spider', 4, 1.4, 1)] },
  { name: 'Armour', flavour: 'Plate halves what a shell can do. Bring weight.',
    waves: [W(1, 'roach', 4, 1.3, 2), W(10, 'beetle', 1, 1, 1), W(18, 'spider', 4, 1.2, 0), W(28, 'beetle', 2, 5, 1)] },
  { name: 'Air Support', flavour: 'They fly. Your gun does not care.',
    waves: [W(1, 'moth', 3, 1.8, 0), W(11, 'roach', 4, 1.2, 2), W(20, 'moth', 4, 1.4, 1), W(31, 'spider', 5, 1.1, 2)] },
  { name: 'Swarm', flavour: 'Drones. Small, numerous, and very quick about it.',
    waves: [W(1, 'tick', 6, 0.7, 1), W(10, 'tick', 8, 0.6, 0), W(20, 'roach', 5, 1.0, 2), W(30, 'tick', 10, 0.5, 1)] },
  { name: 'The Column', flavour: 'Break it and it comes apart into smaller problems.',
    waves: [W(1, 'centipede', 2, 4, 1), W(12, 'roach', 5, 1.1, 0), W(22, 'centipede', 3, 3.5, 2), W(36, 'beetle', 2, 4, 1)] },
  { name: 'Field Repair', flavour: 'The rigs weld back what you break. Break them first.',
    waves: [W(1, 'weaver', 1, 1, 1), W(8, 'beetle', 2, 3, 0), W(18, 'weaver', 2, 4, 2), W(30, 'moth', 5, 1.1, 1)] },
  { name: 'Full Push', flavour: 'Everything they have, all at once.',
    waves: [W(1, 'spider', 5, 1.0, 0), W(3, 'roach', 5, 1.0, 2), W(14, 'tick', 10, 0.5, 1), W(26, 'beetle', 3, 3, 0), W(38, 'moth', 6, 1.0, 2)] },
  { name: 'The Breach', flavour: 'Whatever is sending them is getting bolder.',
    waves: [W(1, 'centipede', 3, 3, 1), W(14, 'weaver', 2, 3, 0), W(24, 'beetle', 3, 2.5, 2), W(38, 'moth', 6, 0.9, 1), W(50, 'roach', 8, 0.7, 0)] },
  { name: 'The Iron Colonel', flavour: 'It has come for the codebooks itself.', boss: true,
    waves: [W(1, 'tick', 8, 0.6, 0), W(6, 'box', 1, 1, 1), W(20, 'roach', 6, 1.0, 2), W(38, 'beetle', 3, 2.5, 0), W(54, 'tick', 10, 0.5, 2)] },
];

// Past the written waves the curve takes over and keeps going indefinitely.
const LATE = ['spider', 'roach', 'tick', 'beetle', 'moth', 'centipede', 'weaver'];
export function proceduralLevel(n) {                       // n is 1-based
  const k = n - LEVELS.length;                             // 1,2,3...
  const boss = k % 10 === 0;
  const waves = [];
  const bands = 4 + Math.min(2, Math.floor(k / 5));
  for (let i = 0; i < bands; i++) {
    const type = LATE[(i * 3 + k) % LATE.length];
    const n2 = Math.min(12, 3 + Math.floor(k / 2) + (type === 'tick' ? 6 : 0));
    waves.push(W(1 + i * 11, type, n2, Math.max(0.45, 1.4 - k * 0.05), i % 3));
  }
  if (boss) waves.push(W(8, 'box', 1, 1, 1));
  return {
    name: boss ? `The Colonel Returns (${k / 10 + 1})` : `Wave ${n}`,
    flavour: boss ? 'Rebuilt, up-armoured, and angrier.' : 'They keep coming.',
    waves, boss, scale: 1 + k * 0.18,
  };
}

export function getLevel(n) {
  return n <= LEVELS.length ? LEVELS[n - 1] : proceduralLevel(n);
}
