// dict.js — the lexicon. ENABLE1 (public domain), filtered to 3-24 letters,
// which is the same no-proper-nouns body of words the original leaned on.

import { loadFrequency } from './wordcraft.js';

let WORDS = null;

const FALLBACK = `the and for you are with that have this from they will been
gear steam brass cog piston valve boiler lever rivet copper iron jade amethyst
lazurite thermite aetherium spider roach beetle moth tick weaver formula secret
quartz jazzy zephyr quixotic oxide exile vex zeal quill quiver`.split(/\s+/);

// Nothing here may hang. A fetch that never settles used to leave the loading
// screen up forever with no way to tell what had gone wrong. An abort signal
// is not enough on its own — a request that is never answered at all cannot
// always be aborted — so the whole attempt races a deadline and the game goes
// on without it.
const TIMEOUT = 9000;          // one attempt
const BUDGET = 12000;          // all attempts together: past this the game starts regardless

function withDeadline(promise, ms, what) {
  let t;
  return Promise.race([
    promise.finally(() => clearTimeout(t)),
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${what} timed out after ${ms / 1000}s`)), ms); }),
  ]);
}

function fetchWithDeadline(url, ms = TIMEOUT) {
  if (typeof AbortController !== 'function') return withDeadline(fetch(url), ms, url);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return withDeadline(fetch(url, { signal: ac.signal }).finally(() => clearTimeout(t)), ms + 500, url);
}

export const loadProblems = [];

export async function loadDictionary(onProgress) {
  const urls = ['assets/enable1.txt', './assets/enable1.txt'];
  const deadline = Date.now() + BUDGET;
  for (const url of urls) {
    const left = deadline - Date.now();
    if (left < 500) { loadProblems.push('out of time waiting for the lexicon'); break; }
    try {
      const size = await withDeadline(readList(url, onProgress), Math.min(TIMEOUT, left), url);
      if (size) return size;
    } catch (e) {
      loadProblems.push(`${url}: ${(e && e.message) || e}`);
    }
  }
  // The lexicon is gone, but the game still has to start: a tiny word list is
  // a crippled game, a frozen loading screen is no game at all.
  WORDS = new Set(FALLBACK);
  onProgress && onProgress(1);
  return WORDS.size;
}

async function readList(url, onProgress) {
  const res = await fetchWithDeadline(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = +(res.headers.get('content-length') || 0);
  let text;
  if (res.body && total) {
    const reader = res.body.getReader();
    const chunks = []; let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      onProgress && onProgress(Math.min(1, got / total));
    }
    text = new TextDecoder().decode(concat(chunks, got));
  } else {
    text = await res.text();
  }
  WORDS = new Set(text.split('\n').filter(Boolean));
  await loadRanks();
  onProgress && onProgress(1);
  return WORDS.size;
}

// The frequency list rides alongside the lexicon: it is what tells a rare word
// from a common one. Missing, the game still runs — every word reads as plain.
async function loadRanks() {
  for (const url of ['assets/freq20k.txt', './assets/freq20k.txt']) {
    try {
      const res = await fetchWithDeadline(url, 8000);
      if (!res.ok) continue;
      return loadFrequency(await withDeadline(res.text(), 8000, url));
    } catch (e) {
      loadProblems.push(`${url}: ${(e && e.message) || e}`);
    }
  }
  return 0;
}

function concat(chunks, len) {
  const out = new Uint8Array(len); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

export function isWord(w) {
  return !!WORDS && WORDS.has(w.toLowerCase());
}

export function dictSize() { return WORDS ? WORDS.size : 0; }

// A deterministic "word of the day": every letter in it is doubled, and the
// word lands as an explosion. Same word for everyone, all day.
export function wordOfTheDay(date = new Date()) {
  if (!WORDS) return 'clockwork';
  const pool = [];
  for (const w of WORDS) if (w.length >= 5 && w.length <= 9) pool.push(w);
  pool.sort();
  const key = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  // xorshift so consecutive days are not neighbours in the sorted list
  let x = (key * 2654435761) >>> 0;
  x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0;
  return pool[x % pool.length] || 'clockwork';
}
