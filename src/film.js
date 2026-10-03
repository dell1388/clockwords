// film.js — the vintage war-film pass.
//
// Everything on the battlefield is drawn to an offscreen frame; this takes
// that frame and runs it through a projector: olive-graded stock, exposure
// flicker, gate weave, grain, dust and the odd scratch, with a vignette and
// burned-in corners. The HUD is drawn after it and stays clean, because a
// chamber you cannot read is not atmosphere, it is a bug.

const TILES = 6;                 // grain frames, cycled so the noise never repeats visibly
let grain = null, dust = null;

function buildGrain(w, h) {
  grain = [];
  for (let k = 0; k < TILES; k++) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    const img = x.createImageData(256, 256);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 26 + Math.random() * 42;
    }
    x.putImageData(img, 0, 0);
    grain.push(c);
  }
  // a few hairs and specks that live on the gate for a frame or two
  dust = [];
  for (let i = 0; i < 90; i++) {
    dust.push({ x: Math.random() * w, y: Math.random() * h,
      r: 0.6 + Math.random() * 1.8, hair: Math.random() < 0.18,
      len: 6 + Math.random() * 26, a: Math.random() * Math.PI });
  }
}

// One scene-sized scratch, running down the frame for a little while.
let scratch = null;
function stepScratch(w, dt) {
  if (scratch) {
    scratch.t -= dt;
    scratch.x += scratch.drift * dt;
    if (scratch.t <= 0) scratch = null;
  } else if (Math.random() < dt * 0.9) {
    scratch = { x: Math.random() * w, t: 0.08 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 40, w: 0.6 + Math.random() * 1.4,
      a: 0.05 + Math.random() * 0.14 };
  }
}

// The projector's own unsteadiness: a slow weave, an occasional jump.
let jump = 0;
export function gateOffset(t, dt) {
  jump = Math.max(0, jump - dt * 6);
  if (Math.random() < dt * 0.25) jump = 1;
  return {
    x: Math.sin(t * 7.3) * 0.5 + Math.sin(t * 2.1) * 0.35,
    y: Math.cos(t * 5.9) * 0.45 + jump * (2 + Math.random() * 5),
  };
}

// Exposure: old stock breathes. A muzzle flash lifts it hard, then it settles.
export function exposure(t, flash = 0) {
  const base = 1 + Math.sin(t * 23.7) * 0.015 + Math.sin(t * 3.1) * 0.02;
  return base + flash * 0.5;
}

// Draw the finished scene through the projector onto the visible context.
export function project(ctx, scene, t, dt, { flash = 0, w, h, grade = true } = {}) {
  if (!grain) buildGrain(w, h);
  stepScratch(w, dt);
  const g = gateOffset(t, dt);
  const ex = exposure(t, flash);

  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();

  // the stock itself: desaturated, warm, contrasty, a touch over-exposed
  ctx.filter = grade
    ? `grayscale(0.48) sepia(0.26) contrast(${(1.26 * ex).toFixed(3)}) brightness(${(0.98 * ex).toFixed(3)}) saturate(1.15)`
    : 'none';
  ctx.drawImage(scene, g.x, g.y);
  ctx.filter = 'none';

  // halation: the bright parts bleed into the emulsion
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.11 + flash * 0.34;
  ctx.filter = 'blur(9px) brightness(1.3)';
  ctx.drawImage(scene, g.x, g.y);
  ctx.filter = 'none';
  ctx.restore();

  // grain
  const tile = grain[(Math.floor(t * 24) % TILES + TILES) % TILES];
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  const ox = Math.random() * 256, oy = Math.random() * 256;
  for (let x = -256; x < w + 256; x += 256) {
    for (let y = -256; y < h + 256; y += 256) ctx.drawImage(tile, x - ox, y - oy);
  }
  ctx.restore();

  // dust and hairs on the gate — a fraction of them each frame
  ctx.save();
  const seed = Math.floor(t * 24);
  for (let i = 0; i < dust.length; i++) {
    if ((i + seed) % 17) continue;
    const d = dust[i];
    ctx.globalAlpha = 0.10 + Math.random() * 0.2;
    ctx.fillStyle = Math.random() < 0.6 ? '#120f09' : '#efe7cf';
    if (d.hair) {
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.quadraticCurveTo(d.x + Math.cos(d.a) * d.len * 0.6, d.y + Math.sin(d.a) * d.len * 0.4,
        d.x + Math.cos(d.a) * d.len, d.y + Math.sin(d.a) * d.len);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  if (scratch) {
    ctx.save();
    ctx.globalAlpha = scratch.a;
    ctx.fillStyle = '#f6efd8';
    ctx.fillRect(scratch.x, 0, scratch.w, h);
    ctx.globalAlpha = scratch.a * 0.5;
    ctx.fillStyle = '#17120a';
    ctx.fillRect(scratch.x + scratch.w, 0, 0.7, h);
    ctx.restore();
  }

  // vignette and burned corners
  const v = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.3, w / 2, h * 0.5, w * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(8,6,3,0.6)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);

  ctx.restore();
}

// ── the leader: a countdown academy leader before a wave ───────────────────
export function drawLeader(ctx, k, n, w, h) {
  // k runs 1 -> 0 across one second of the count; n is the number showing
  ctx.save();
  ctx.fillStyle = '#0d0b07'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.42;

  ctx.strokeStyle = 'rgba(228,220,196,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();

  // the sweep hand
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2 + (1 - k) * Math.PI * 2);
  ctx.fillStyle = 'rgba(228,220,196,0.22)';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, 0, Math.PI / 2); ctx.closePath(); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#e8e0c4';
  ctx.font = `${Math.round(r * 1.1)}px 'Black Ops One', Impact, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(n), cx, cy + r * 0.04);
  ctx.restore();
}
