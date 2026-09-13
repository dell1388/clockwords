// content.js — materials, bug species and the campaign table.
// Numbers marked (canon) are taken from contemporary guides to the original
// Flash game; the rest is reconstructed to sit consistently around them.
// See docs/FIDELITY.md.

export const MATERIALS = {
  iron: {
    id: 'iron', name: 'Iron', tier: 1, dmg: 25, cost: 1,
    body: '#6d6a63', edge: '#2b2a27', ink: '#e9e2d2', glow: '#9a958a',
    desc: '25 damage. No special effect. The honest workhorse of the boiler.',
  },
  thermite: {
    id: 'thermite', name: 'Thermite', tier: 2, dmg: 10, cost: 3,
    burn: { dps: 5, time: 4 },
    body: '#b8471f', edge: '#4a1607', ink: '#ffe6c2', glow: '#ff8a3c',
    desc: 'Sets bugs alight: 20 damage over 4 seconds.',
  },
  amethyst: {
    id: 'amethyst', name: 'Amethyst', tier: 2, dmg: 15, cost: 4,
    pierce: 2,
    body: '#7a4bbd', edge: '#2d1750', ink: '#f0e2ff', glow: '#c08bff',
    desc: '15 damage. Passes through up to 2 targets.',
  },
  brass: {
    id: 'brass', name: 'Brass', tier: 3, dmg: 30, cost: 6,
    armsIron: true, splash: 62,
    body: '#c08b2e', edge: '#4d3208', ink: '#fff3d0', glow: '#ffc857',
    desc: 'Splash damage — and every Iron letter in the same word detonates too.',
  },
  lazurite: {
    id: 'lazurite', name: 'Lazurite', tier: 3, dmg: 12, cost: 5,
    freeze: 4,
    body: '#2f63b5', edge: '#0d2148', ink: '#dcecff', glow: '#7fc4ff',
    desc: 'Freezes bugs, stopping all movement for 4 seconds.',
  },
  jade: {
    id: 'jade', name: 'Jade', tier: 4, dmg: 28, cost: 8,
    lengthBonus: 0.05,
    body: '#2f8f6b', edge: '#0c3a2a', ink: '#dcfff0', glow: '#61e6b0',
    desc: 'Every letter in the word hits harder — +5% per letter of the word.',
  },
  aetherium: {
    id: 'aetherium', name: 'Aetherium', tier: 5, dmg: 90, cost: 12,
    chain: 3, chainRange: 130,
    body: '#d8d2c0', edge: '#5c5647', ink: '#3a3528', glow: '#fff6c9',
    desc: '90 damage, and the charge arcs to 3 nearby bugs.',
  },
};

export const TIERS = [[], ['iron'], ['thermite', 'amethyst'], ['brass', 'lazurite'], ['jade'], ['aetherium']];
export const MAX_TIER = 5;

// A letter that is NOT loaded in a chamber is a blank and deals 1 damage. (canon)
export const BLANK_DMG = 1;
export const CHAMBERS = 8;          // the boiler feeds eight chambers (canon)
export const MIN_WORD = 3;
export const START_PAGES = 5;

export const SPECIES = {
  spider: {
    id: 'spider', name: 'Clockwork Spider', hp: 30, speed: 17, r: 13,
    legs: 8, gait: 'crawl', bounty: 1, secret: 0.10, drop: 0.16,
    body: '#8a7a5c', trim: '#d8c489',
  },
  roach: {
    id: 'roach', name: 'Brass Roach', hp: 22, speed: 28, r: 11,
    legs: 6, gait: 'scurry', bounty: 1, secret: 0.10, drop: 0.14,
    body: '#9c6a2c', trim: '#f0b451',
  },
  tick: {
    id: 'tick', name: 'Gear Tick', hp: 10, speed: 22, r: 8,
    legs: 6, gait: 'scurry', bounty: 0, secret: 0.04, drop: 0.05,
    body: '#6f6152', trim: '#c3b191',
  },
  beetle: {
    id: 'beetle', name: 'Ironclad Beetle', hp: 130, speed: 11, r: 19,
    legs: 6, gait: 'lumber', armor: 0.5, bounty: 3, secret: 0.35, drop: 0.34,
    body: '#4d5259', trim: '#98a3ad',
  },
  moth: {
    id: 'moth', name: 'Cinder Moth', hp: 40, speed: 34, r: 13,
    legs: 6, gait: 'flit', flying: true, bounty: 2, secret: 0.22, drop: 0.24,
    body: '#7b4a63', trim: '#e3b7d0',
  },
  centipede: {
    id: 'centipede', name: 'Copper Centipede', hp: 95, speed: 20, r: 14,
    legs: 12, gait: 'crawl', splitOnDeath: ['tick', 'tick'], bounty: 3,
    secret: 0.30, drop: 0.30, body: '#a4552b', trim: '#efa070',
  },
  weaver: {
    id: 'weaver', name: 'Steam Weaver', hp: 70, speed: 16, r: 15,
    legs: 8, gait: 'crawl', heals: { rate: 9, range: 120 }, bounty: 3,
    secret: 0.32, drop: 0.30, body: '#5d6b4a', trim: '#b9cf92',
  },
  box: {
    id: 'box', name: 'The Diabolical Box', hp: 2600, speed: 7, r: 46,
    legs: 8, gait: 'lumber', armor: 0.25, boss: true, spawns: 'tick',
    bounty: 25, secret: 6, drop: 1, body: '#3f3a33', trim: '#d8ab4c',
  },
};

// ── Campaign ────────────────────────────────────────────────────────────────
// Each level: { name, flavour, waves:[{ at, type, n, gap, door }] }
const W = (at, type, n = 1, gap = 1.1, door = -1) => ({ at, type, n, gap, door });

export const LEVELS = [
  { name: 'A Noise in the Workshop', flavour: 'Something is scratching at the floorboards.',
    waves: [W(1.0, 'spider', 2, 2.6, 1), W(9, 'spider', 3, 2.2, 0), W(20, 'spider', 3, 1.8, 2)] },
  { name: 'They Come in Threes', flavour: 'Roaches. Faster, and no manners at all.',
    waves: [W(1, 'spider', 3, 2.0, 1), W(9, 'roach', 3, 1.5, 0), W(18, 'roach', 3, 1.4, 2), W(27, 'spider', 4, 1.4, 1)] },
  { name: 'Ironclad', flavour: 'Armour halves what your letters can do. Bring weight.',
    waves: [W(1, 'roach', 4, 1.3, 2), W(10, 'beetle', 1, 1, 1), W(18, 'spider', 4, 1.2, 0), W(28, 'beetle', 2, 5, 1)] },
  { name: 'Moths to the Flame', flavour: 'They fly. Your letters do not care.',
    waves: [W(1, 'moth', 3, 1.8, 0), W(11, 'roach', 4, 1.2, 2), W(20, 'moth', 4, 1.4, 1), W(31, 'spider', 5, 1.1, 2)] },
  { name: 'Tick Tick Tick', flavour: 'Small, numerous, and very quick about it.',
    waves: [W(1, 'tick', 6, 0.7, 1), W(10, 'tick', 8, 0.6, 0), W(20, 'roach', 5, 1.0, 2), W(30, 'tick', 10, 0.5, 1)] },
  { name: 'The Long Copper Thing', flavour: 'Kill it and it comes apart into smaller problems.',
    waves: [W(1, 'centipede', 2, 4, 1), W(12, 'roach', 5, 1.1, 0), W(22, 'centipede', 3, 3.5, 2), W(36, 'beetle', 2, 4, 1)] },
  { name: 'Steam and Sinew', flavour: 'The weavers mend what you break. Break them first.',
    waves: [W(1, 'weaver', 1, 1, 1), W(8, 'beetle', 2, 3, 0), W(18, 'weaver', 2, 4, 2), W(30, 'moth', 5, 1.1, 1)] },
  { name: 'A Proper Infestation', flavour: 'Every door at once.',
    waves: [W(1, 'spider', 5, 1.0, 0), W(3, 'roach', 5, 1.0, 2), W(14, 'tick', 10, 0.5, 1), W(26, 'beetle', 3, 3, 0), W(38, 'moth', 6, 1.0, 2)] },
  { name: 'The Cellar Door', flavour: 'Whatever is sending them is getting bolder.',
    waves: [W(1, 'centipede', 3, 3, 1), W(14, 'weaver', 2, 3, 0), W(24, 'beetle', 3, 2.5, 2), W(38, 'moth', 6, 0.9, 1), W(50, 'roach', 8, 0.7, 0)] },
  { name: 'The Diabolical Box', flavour: 'It has come for the formula itself.', boss: true,
    waves: [W(1, 'tick', 8, 0.6, 0), W(6, 'box', 1, 1, 1), W(20, 'roach', 6, 1.0, 2), W(38, 'beetle', 3, 2.5, 0), W(54, 'tick', 10, 0.5, 2)] },
];

// Levels 11-20 are generated from the curve below so the campaign keeps going.
const LATE = ['spider', 'roach', 'tick', 'beetle', 'moth', 'centipede', 'weaver'];
export function proceduralLevel(n) {                       // n is 1-based
  const k = n - LEVELS.length;                             // 1,2,3...
  const boss = k % 10 === 0;
  const waves = [];
  const bands = 4 + Math.min(3, Math.floor(k / 4));
  for (let i = 0; i < bands; i++) {
    const type = LATE[(i * 3 + k) % LATE.length];
    const n2 = Math.min(12, 3 + Math.floor(k / 2) + (type === 'tick' ? 6 : 0));
    waves.push(W(1 + i * 11, type, n2, Math.max(0.45, 1.4 - k * 0.05), i % 3));
  }
  if (boss) waves.push(W(8, 'box', 1, 1, 1));
  return {
    name: boss ? `The Box Returns (${k / 10 + 1})` : `Night ${n}`,
    flavour: boss ? 'Rebuilt, and angrier.' : 'They keep coming.',
    waves, boss, scale: 1 + k * 0.22,
  };
}

export function getLevel(n) {
  return n <= LEVELS.length ? LEVELS[n - 1] : proceduralLevel(n);
}
