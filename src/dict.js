// dict.js — the lexicon. ENABLE1 (public domain), filtered to 3-24 letters,
// which is the same no-proper-nouns body of words the original leaned on.

let WORDS = null;

const FALLBACK = `the and for you are with that have this from they will been
gear steam brass cog piston valve boiler lever rivet copper iron jade amethyst
lazurite thermite aetherium spider roach beetle moth tick weaver formula secret
quartz jazzy zephyr quixotic oxide exile vex zeal quill quiver`.split(/\s+/);

export async function loadDictionary(onProgress) {
  const urls = ['assets/enable1.txt', './assets/enable1.txt'];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
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
      onProgress && onProgress(1);
      return WORDS.size;
    } catch (_) { /* try the next url */ }
  }
  WORDS = new Set(FALLBACK);
  onProgress && onProgress(1);
  return WORDS.size;
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
