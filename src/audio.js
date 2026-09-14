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
  // one small pop per letter out of the barrel
  fire: guard((pitch = 1) => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(760 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(170 * pitch, t + 0.055);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.09);
    noise(t, 0.022, 2600, 0.09, 'bandpass', 2.5);
  }),
  hit: guard(() => { const t = ctx.currentTime; noise(t, 0.05, 3200, 0.14, 'bandpass', 4); tone(820, t, 0.002, 0.04, 'triangle', 0.08); }),
  boom: guard(() => {
    const t = ctx.currentTime;
    noise(t, 0.42, 420, 0.42, 'lowpass');
    tone(90, t, 0.005, 0.35, 'sawtooth', 0.22, 40);
  }),
  freeze: guard(() => {
    const t = ctx.currentTime;
    tone(1400, t, 0.01, 0.3, 'sine', 0.14, 520);
    tone(2100, t + 0.03, 0.01, 0.25, 'sine', 0.09, 900);
  }),
  burn: guard(() => { const t = ctx.currentTime; noise(t, 0.5, 1100, 0.12, 'bandpass', 0.8); }),
  // a wet crunch: the shell goes, then whatever was inside it
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
    tone(190, t, 0.005, 0.16, 'triangle', 0.14, 48);
    noise(t + 0.04, 0.09, 520, 0.14, 'bandpass', 0.9);
  }),

  // the word has been used already tonight
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

  // a fresh word that actually spent the boiler
  ding: guard(() => {
    const t = ctx.currentTime;
    tone(1318, t, 0.006, 0.42, 'sine', 0.10);
    tone(1976, t + 0.008, 0.006, 0.30, 'sine', 0.055);
    tone(2637, t + 0.016, 0.005, 0.18, 'sine', 0.025);
  }),
  steal: guard(() => {
    const t = ctx.currentTime;
    tone(600, t, 0.01, 0.12, 'square', 0.16, 300);
    tone(400, t + 0.13, 0.01, 0.14, 'square', 0.16, 200);
  }),
  lost: guard(() => {
    const t = ctx.currentTime;
    [440, 330, 247].forEach((f, i) => tone(f, t + i * 0.14, 0.01, 0.22, 'sawtooth', 0.18));
  }),
  win: guard(() => {
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.01, 0.24, 'triangle', 0.16));
  }),
  steam: guard(() => { const t = ctx.currentTime; noise(t, 0.7, 2600, 0.10, 'highpass', 0.7); }),
  clank: guard(() => { const t = ctx.currentTime; tone(160, t, 0.003, 0.16, 'square', 0.12, 90); noise(t, 0.1, 700, 0.16, 'bandpass', 2); }),
  overload: guard(() => {
    const t = ctx.currentTime;
    [392, 523, 659, 784, 988].forEach((f, i) => tone(f, t + i * 0.05, 0.008, 0.2, 'square', 0.12));
    noise(t, 0.3, 3000, 0.14, 'highpass');
  }),
  boss: guard(() => {
    const t = ctx.currentTime;
    tone(70, t, 0.05, 1.1, 'sawtooth', 0.3, 45);
    noise(t, 1.2, 300, 0.3, 'lowpass');
  }),
};
