// audio.js — everything is synthesised; no sample files to ship.
let ctx = null, master = null, muted = false;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlock() { try { ac(); } catch (_) {} }
export function setMuted(v) { muted = v; if (master) master.gain.value = v ? 0 : 0.55; }
export function isMuted() { return muted; }

function env(node, t, a, d, peak = 1) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  node.connect(g); g.connect(master);
  return g;
}

function tone(freq, t, a, d, type = 'square', peak = 0.3, slideTo = null) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + a + d);
  env(o, t, a, d, peak);
  o.start(t); o.stop(t + a + d + 0.02);
}

let noiseBuf = null;
function getNoise() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf; s.loop = true;
  return s;
}

function noise(t, dur, filterFreq, peak = 0.3, type = 'bandpass', q = 1) {
  const s = getNoise();
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq; f.Q.value = q;
  s.connect(f);
  env(f, t, 0.005, dur, peak);
  s.start(t); s.stop(t + dur + 0.05);
}

// A gun report: a hard transient, the crack of the muzzle blast, and a low
// thump that rolls away after it. Everything martial in here is built from it.
function report(t, { crack = 1700, body = 300, dur = 0.22, peak = 0.3, q = 1.1 } = {}) {
  noise(t, 0.035, crack * 1.6, peak * 0.85, 'highpass', 0.7);     // the transient
  noise(t + 0.004, dur * 0.4, crack, peak, 'bandpass', q);        // the crack
  noise(t + 0.02, dur, body, peak * 0.7, 'lowpass');              // the roll
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(body * 0.9, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(28, body * 0.14), t + dur * 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

// A sound that throws would otherwise just go quiet, which is hard to notice.
const guard = fn => (...a) => {
  if (muted) return;
  try { ac(); fn(...a); } catch (e) { console.error('sfx failed:', e); }
};

export const sfx = {
  key: guard(() => {                                  // typewriter clack
    const t = ctx.currentTime;
    noise(t, 0.035, 2400 + Math.random() * 900, 0.22, 'bandpass', 3);
    tone(180 + Math.random() * 40, t, 0.002, 0.03, 'square', 0.06);
  }),
  back: guard(() => { const t = ctx.currentTime; noise(t, 0.04, 900, 0.18, 'bandpass', 2); }),
  bad: guard(() => {
    const t = ctx.currentTime;
    tone(150, t, 0.01, 0.16, 'sawtooth', 0.18, 90);
    noise(t, 0.14, 320, 0.12, 'lowpass');
  }),
  // one gun report per letter, pitched a little by what is in the shell
  fire: guard((pitch = 1) => {
    const t = ctx.currentTime;
    report(t, { crack: 1700 * pitch, body: 300 * pitch, dur: 0.26, peak: 0.3 });
  }),
  // a shell striking plate: a hard metallic clang, and a ricochet off it
  hit: guard(() => {
    const t = ctx.currentTime;
    noise(t, 0.04, 3600, 0.15, 'bandpass', 6);
    tone(1150, t, 0.001, 0.05, 'square', 0.07, 700);
    tone(430, t + 0.005, 0.002, 0.09, 'triangle', 0.09, 210);
  }),
  // a high-explosive burst: the crack, then a long low boom rolling off the walls
  boom: guard(() => {
    const t = ctx.currentTime;
    report(t, { crack: 1100, body: 200, dur: 0.5, peak: 0.34, q: 0.7 });
    noise(t + 0.05, 0.75, 180, 0.34, 'lowpass');
    tone(64, t + 0.02, 0.01, 0.7, 'sawtooth', 0.22, 28);
  }),
  freeze: guard(() => {
    const t = ctx.currentTime;
    tone(1400, t, 0.01, 0.3, 'sine', 0.14, 520);
    tone(2100, t + 0.03, 0.01, 0.25, 'sine', 0.09, 900);
  }),
  burn: guard(() => { const t = ctx.currentTime; noise(t, 0.5, 1100, 0.12, 'bandpass', 0.8); }),
  // a hull kill: the plate lets go, then the ammunition inside it
  die: guard(() => {
    const t = ctx.currentTime;
    const s2 = getNoise();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(1800, t);
    f.frequency.exponentialRampToValueAtTime(180, t + 0.2);
    s2.connect(f);
    env(f, t, 0.008, 0.2, 0.34);
    s2.start(t); s2.stop(t + 0.26);
    tone(150, t, 0.005, 0.22, 'sawtooth', 0.16, 40);
    noise(t + 0.03, 0.14, 1600, 0.12, 'bandpass', 1.6);   // torn steel
    report(t + 0.07, { crack: 900, body: 150, dur: 0.55, peak: 0.28, q: 0.6 });  // the cook-off
  }),

  // the word has been used already this wave
  buzz: guard(() => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), m = ctx.createOscillator(), md = ctx.createGain();
    o.type = 'square'; o.frequency.value = 104;
    m.type = 'square'; m.frequency.value = 32;
    md.gain.value = 40;
    m.connect(md); md.connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 700;
    o.connect(f);
    env(f, t, 0.01, 0.2, 0.085);
    o.start(t); o.stop(t + 0.24); m.start(t); m.stop(t + 0.24);
  }),

  // a letter lifting out of the wreck — brighter and busier the rarer it is
  sparkle: guard((level = 1) => {
    const t = ctx.currentTime;
    const n = 3 + level;
    for (let i = 0; i < n; i++) {
      const f = 900 + i * 260 + level * 140 + Math.random() * 200;
      tone(f, t + i * 0.045, 0.004, 0.16 + level * 0.02, 'sine', 0.055 + level * 0.006);
    }
    noise(t, 0.12 + level * 0.02, 5200, 0.05 + level * 0.008, 'highpass', 0.8);
  }),

  // a fresh word that actually spent the magazine — a radio ack
  ding: guard(() => {
    const t = ctx.currentTime;
    tone(1046, t, 0.004, 0.09, 'square', 0.07);
    tone(1568, t + 0.075, 0.004, 0.13, 'square', 0.06);
    noise(t, 0.05, 4200, 0.02, 'highpass', 0.8);
  }),
  // the alarm: something has the dossier and is running
  steal: guard(() => {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) tone(760, t + i * 0.16, 0.02, 0.11, 'square', 0.12, 540);
  }),
  // a klaxon over the position: the line is gone
  lost: guard(() => {
    const t = ctx.currentTime;
    [330, 247, 165].forEach((f, i) => tone(f, t + i * 0.24, 0.03, 0.4, 'sawtooth', 0.2, f * 0.78));
    noise(t + 0.5, 0.8, 200, 0.16, 'lowpass');
  }),
  // a bugle call over the position
  win: guard(() => {
    const t = ctx.currentTime;
    [392, 523, 659, 784, 659, 784].forEach((f, i) =>
      tone(f, t + i * 0.13, 0.012, 0.26, 'sawtooth', 0.13));
  }),
  // a breech block running back: the chamber opens
  steam: guard(() => { const t = ctx.currentTime; noise(t, 0.22, 1400, 0.16, 'bandpass', 1.4); tone(240, t, 0.004, 0.14, 'square', 0.09, 120); }),
  // metal on metal: a breech, a hatch, a button
  clank: guard(() => {
    const t = ctx.currentTime;
    tone(150, t, 0.002, 0.14, 'square', 0.12, 80);
    noise(t, 0.07, 1300, 0.16, 'bandpass', 3);
  }),
  // a ripple of guns going off down the line
  overload: guard(() => {
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      report(t + i * 0.075, { crack: 1500 + i * 220, body: 260, dur: 0.3, peak: 0.2 });
    }
  }),
  // something very heavy coming up the road
  boss: guard(() => {
    const t = ctx.currentTime;
    tone(52, t, 0.05, 1.4, 'sawtooth', 0.3, 34);
    noise(t, 1.4, 220, 0.3, 'lowpass');
    report(t + 0.25, { crack: 800, body: 130, dur: 0.7, peak: 0.26, q: 0.6 });
  }),
};
