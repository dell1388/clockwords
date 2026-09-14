// render.js — all drawing. Olive drab, gunmetal and worklight.

import { W, H, PLAY_H, MACHINE, MUZZLE, PIVOT, SAFE, DOORS, SEALED_DOORS, buildPath } from './game.js';
import { MATERIALS, CHAMBERS, START_PAGES, MAX_LEVEL } from './content.js';

const TAU = Math.PI * 2;
const SHOT_R = 13;          // one radius for every letter fired
const CHAMBER_R = 27;       // and one for every tank on the rack
const CHAMBER_GAP = 74;

// Where each tank sits, so a click can find it.
export function chamberAt(x, y) {
  const total = (CHAMBERS - 1) * CHAMBER_GAP + CHAMBER_R * 2;
  const cy = PLAY_H + 20 + CHAMBER_R;
  const first = (W - total) / 2 + CHAMBER_R;
  for (let i = 0; i < CHAMBERS; i++) {
    const cx = first + i * CHAMBER_GAP;
    if (Math.hypot(x - cx, y - cy) <= CHAMBER_R + 3) return i;
  }
  return -1;
}
let bg = null;

export function roundRect(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

export function makeBackground() {
  const c = document.createElement('canvas');
  c.width = W; c.height = PLAY_H;
  const x = c.getContext('2d');

  const wall = x.createLinearGradient(0, 0, 0, PLAY_H);
  wall.addColorStop(0, '#16190f');
  wall.addColorStop(0.33, '#2b3123');
  wall.addColorStop(0.35, '#3a4030');
  wall.addColorStop(1, '#6a6a4c');
  x.fillStyle = wall; x.fillRect(0, 0, W, PLAY_H);

  x.strokeStyle = 'rgba(0,0,0,0.28)'; x.lineWidth = 2;
  for (let i = 0; i <= 12; i++) {
    const px = i * (W / 12);
    x.beginPath(); x.moveTo(px, 0); x.lineTo(px, 158); x.stroke();
  }
  x.fillStyle = 'rgba(226,232,190,0.05)';
  x.fillRect(0, 150, W, 8);

  const hz = 158;
  x.save();
  x.beginPath(); x.rect(0, hz, W, PLAY_H - hz); x.clip();
  for (let i = -14; i <= 14; i++) {
    x.strokeStyle = 'rgba(30,20,12,0.35)'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(W / 2 + i * 26, hz); x.lineTo(W / 2 + i * 118, PLAY_H); x.stroke();
  }
  let step = 7;
  for (let y = hz; y < PLAY_H; y += step, step *= 1.22) {
    x.strokeStyle = 'rgba(20,12,6,0.3)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
  }
  x.restore();

  const pipe = (px, py, w, h) => {
    const gr = x.createLinearGradient(px, 0, px + w, 0);
    gr.addColorStop(0, '#22261d'); gr.addColorStop(0.35, '#7d8470');
    gr.addColorStop(0.6, '#555c48'); gr.addColorStop(1, '#171a13');
    x.fillStyle = gr; x.fillRect(px, py, w, h);
    x.fillStyle = 'rgba(0,0,0,0.25)';
    for (let k = py; k < py + h; k += 46) x.fillRect(px - 3, k, w + 6, 6);
  };
  pipe(38, 0, 16, 150); pipe(906, 0, 16, 150);
  const hgr = x.createLinearGradient(0, 96, 0, 109);
  hgr.addColorStop(0, '#22261d'); hgr.addColorStop(0.4, '#7d8470'); hgr.addColorStop(1, '#171a13');
  x.fillStyle = hgr; x.fillRect(0, 96, W, 13);

  for (const lx of [96, 480, 864]) {
    x.fillStyle = '#3a2c18'; x.fillRect(lx - 3, 108, 6, 16);
    const gr = x.createRadialGradient(lx, 130, 2, lx, 130, 74);
    gr.addColorStop(0, 'rgba(255,200,90,0.5)');
    gr.addColorStop(1, 'rgba(255,200,90,0)');
    x.fillStyle = gr; x.beginPath(); x.arc(lx, 130, 74, 0, TAU); x.fill();
    x.fillStyle = '#ffe9a8'; x.beginPath(); x.arc(lx, 130, 5, 0, TAU); x.fill();
  }

  const FLOOR = 158;

  // the two breaches that were filled in and sandbagged
  for (const d of SEALED_DOORS) {
    const w = 84, h = 68, px = d.x - w / 2, py = FLOOR - h;
    x.save();
    x.beginPath();
    x.moveTo(px, FLOOR); x.lineTo(px, py + w / 2);
    x.arc(d.x, py + w / 2, w / 2, Math.PI, 0); x.lineTo(px + w, FLOOR); x.closePath();
    x.fillStyle = '#4b4f38'; x.fill();
    x.strokeStyle = '#6b7050'; x.lineWidth = 3; x.stroke();
    x.clip();
    x.strokeStyle = 'rgba(24,28,16,0.5)'; x.lineWidth = 2;
    for (let r = 0; r < 7; r++) {
      const yy = py + 6 + r * 9.6;
      x.beginPath(); x.moveTo(px, yy); x.lineTo(px + w, yy); x.stroke();
      for (let c = 0; c < 4; c++) {
        const bx = px + ((r % 2) ? 10 : 0) + c * 22;
        x.beginPath(); x.moveTo(bx, yy); x.lineTo(bx, yy + 9.6); x.stroke();
      }
    }
    x.restore();
  }

  // the one breach still open — everything comes through here
  for (const d of DOORS) {
    const w = 84, h = 68, px = d.x - w / 2, py = FLOOR - h;
    x.save();
    x.beginPath();
    x.moveTo(px, FLOOR); x.lineTo(px, py + w / 2);
    x.arc(d.x, py + w / 2, w / 2, Math.PI, 0); x.lineTo(px + w, FLOOR); x.closePath();
    x.fillStyle = '#0d0906'; x.fill();
    x.strokeStyle = '#8a8f6a'; x.lineWidth = 4; x.stroke();
    x.clip();
    x.strokeStyle = 'rgba(150,160,110,0.45)'; x.lineWidth = 2;
    for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(px + i * 14, py); x.lineTo(px + i * 14, FLOOR); x.stroke(); }
    for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(px, py + i * 16); x.lineTo(px + w, py + i * 16); x.stroke(); }
    const gl = x.createLinearGradient(0, py, 0, FLOOR);
    gl.addColorStop(0, 'rgba(120,40,20,0)'); gl.addColorStop(1, 'rgba(160,60,25,0.30)');
    x.fillStyle = gl; x.fillRect(px, py, w, h);
    x.restore();
    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.beginPath(); x.ellipse(d.x, FLOOR + 5, w * 0.55, 7, 0, 0, TAU); x.fill();
  }

  drawTracks(x);

  // churned mud, so the floor is not a desert
  x.save();
  x.globalAlpha = 0.18;
  x.fillStyle = '#2f3323';
  x.beginPath(); x.moveTo(300, 250); x.lineTo(640, 250); x.lineTo(760, 412); x.lineTo(190, 412); x.closePath(); x.fill();
  x.strokeStyle = '#4a5136'; x.lineWidth = 3; x.stroke();
  x.globalAlpha = 0.18;
  x.beginPath(); x.moveTo(334, 270); x.lineTo(606, 270); x.lineTo(700, 392); x.lineTo(250, 392); x.closePath(); x.stroke();
  x.restore();

  // sandbag revetments at the edges
  x.fillStyle = 'rgba(16,11,6,0.72)';
  roundRect(x, -14, 238, 66, 62, 6); x.fill();
  roundRect(x, 900, 190, 112, 54, 6); x.fill();
  x.fillStyle = 'rgba(255,200,90,0.10)';
  x.fillRect(-8, 244, 52, 4); x.fillRect(906, 196, 84, 4);

  // a rack of ammunition crates high on the wall
  x.fillStyle = 'rgba(16,11,6,0.8)'; x.fillRect(660, 62, 210, 7);
  for (let i = 0; i < 7; i++) {
    const bx = 672 + i * 28, bh = 20 + (i % 3) * 9;
    x.fillStyle = ['rgba(110,120,80,0.55)', 'rgba(140,130,90,0.5)', 'rgba(90,100,90,0.55)'][i % 3];
    roundRect(x, bx, 62 - bh, 15, bh, 3); x.fill();
  }

  const v = x.createRadialGradient(W / 2, PLAY_H * 0.55, 120, W / 2, PLAY_H * 0.55, 620);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.6)');
  x.fillStyle = v; x.fillRect(0, 0, W, PLAY_H);

  bg = c;
}

// The tanks all walk the one route, so the route is painted on the floor: a worn
// track, a dashed centre line, and chevrons pointing the way they come.
function drawTracks(x) {
  const path = buildPath(DOORS[0]);
  x.save();
  x.lineCap = 'round'; x.lineJoin = 'round';
  const trace = () => {
    x.beginPath();
    x.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) x.lineTo(path[i].x, path[i].y);
  };
  trace(); x.strokeStyle = 'rgba(18,12,6,0.30)'; x.lineWidth = 40; x.stroke();
  trace(); x.strokeStyle = 'rgba(226,232,190,0.075)'; x.lineWidth = 34; x.stroke();
  trace(); x.strokeStyle = 'rgba(226,232,190,0.10)'; x.lineWidth = 20; x.stroke();
  trace();
  x.setLineDash([9, 13]);
  x.strokeStyle = 'rgba(214,232,140,0.34)'; x.lineWidth = 2; x.stroke();
  x.setLineDash([]);

  // chevrons, evenly spaced along the whole run
  const STEP = 62;
  let carry = 26;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    for (let d = carry; d < len; d += STEP) {
      const cx = a.x + ux * d, cy = a.y + uy * d;
      x.save();
      x.translate(cx, cy);
      x.rotate(Math.atan2(uy, ux));
      x.strokeStyle = 'rgba(214,232,140,0.45)'; x.lineWidth = 2.6;
      x.beginPath();
      x.moveTo(-6, -6); x.lineTo(5, 0); x.lineTo(-6, 6);
      x.stroke();
      x.restore();
    }
    carry = STEP - ((len - carry) % STEP);
  }

  // marker posts at every turn
  x.fillStyle = 'rgba(200,214,130,0.45)';
  for (let i = 1; i < path.length - 1; i++) {
    x.beginPath(); x.arc(path[i].x, path[i].y, 4, 0, TAU); x.fill();
  }
  x.restore();
}

export function draw(ctx, g, t) {
  if (!bg) makeBackground();

  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * g.shake * 14, (Math.random() - 0.5) * g.shake * 14);
  ctx.drawImage(bg, 0, 0);
  drawDust(ctx, t);

  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, PLAY_H); ctx.clip();
  for (const p of g.particles) if (p.soft) drawParticle(ctx, p);
  const order = [...g.bugs].sort((a, b) => a.y - b.y);
  for (const b of order) drawBug(ctx, b, t);
  drawMachine(ctx, g, t);
  for (const p of g.pageDrops) { ctx.save(); ctx.translate(p.x, p.y); drawPage(ctx, 0, 0, 1, t); ctx.restore(); }
  drawSafe(ctx, g, t);
  for (const d of g.lootDrops) drawLoot(ctx, d, t);
  for (const sh of g.shots) drawShot(ctx, sh);
  for (const p of g.particles) if (!p.soft) drawParticle(ctx, p);
  for (const f of g.floaters) drawFloater(ctx, f);
  if (g.aim) drawReticle(ctx, g.aim, t);
  drawBossBar(ctx, g);
  if (g.sandbox) drawProving(ctx, g);
  drawOutro(ctx, g);
  ctx.restore();
  ctx.restore();

  drawHud(ctx, g, t);
}

function drawDust(ctx, t) {
  ctx.save();
  ctx.globalAlpha = 0.16; ctx.fillStyle = '#ffe6b8';
  for (let i = 0; i < 42; i++) {
    const px = (i * 137.5 + t * (8 + (i % 5) * 3)) % W;
    const py = (i * 91.3 + Math.sin(t * 0.4 + i) * 18 + t * 5) % PLAY_H;
    ctx.fillRect(px, py, 1.6, 1.6);
  }
  ctx.restore();
}

function drawParticle(ctx, p) {
  ctx.save();
  if (p.arc) {
    ctx.globalAlpha = Math.max(0, p.t / 0.18);
    ctx.strokeStyle = p.c; ctx.lineWidth = 2.5; ctx.shadowColor = p.c; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo((p.x + p.x2) / 2 + (Math.random() - 0.5) * 26,
                         (p.y + p.y2) / 2 + (Math.random() - 0.5) * 26, p.x2, p.y2);
    ctx.stroke(); ctx.restore(); return;
  }
  if (p.ring) {
    const k = 1 - p.t / 0.34;
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.strokeStyle = p.c; ctx.lineWidth = 4 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.35 + k), 0, TAU); ctx.stroke();
    ctx.restore(); return;
  }
  ctx.globalAlpha = Math.min(1, p.t * (p.soft ? 1.2 : 3));
  ctx.fillStyle = p.c;
  if (p.gear) {
    ctx.translate(p.x, p.y); ctx.rotate(p.t * 9);
    ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
    ctx.fillRect(-p.r * 0.4, -p.r, p.r * 0.8, p.r * 2);
  } else {
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawFloater(ctx, f) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, f.t * 1.6);
  ctx.font = `${f.big ? 20 : 16}px 'Special Elite', 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(f.text, f.x, f.y);
  ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  ctx.restore();
}

function drawPage(ctx, px, py, alpha, t = 0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(px, py);
  ctx.rotate(Math.sin(t * 1.4) * 0.05);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-9, -13, 20, 28);
  ctx.fillStyle = '#d8c48a'; ctx.fillRect(-10, -14, 20, 28);
  ctx.strokeStyle = '#8a7a4c'; ctx.lineWidth = 1; ctx.strokeRect(-10, -14, 20, 28);
  ctx.strokeStyle = 'rgba(90,70,40,0.75)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(-7, -9 + i * 5.5); ctx.lineTo(6 - (i % 2) * 4, -9 + i * 5.5); ctx.stroke();
  }
  ctx.restore();
}

// A letter's level is read off the dots under its glyph, Scrabble-fashion.
export function drawDots(ctx, cx, cy, level, r, color) {
  const gap = r * 2.6;
  const x0 = cx - ((level - 1) * gap) / 2;
  ctx.fillStyle = color;
  for (let i = 0; i < level; i++) {
    ctx.beginPath(); ctx.arc(x0 + i * gap, cy, r, 0, TAU); ctx.fill();
  }
}

// ── the machine ────────────────────────────────────────────────────────────
function gear(ctx, cx, cy, r, teeth, rot, fill, stroke) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * TAU;
    const rr = i % 2 ? r : r * 1.24;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  ctx.restore();
}

// The field safe the codebooks live in, in the corner opposite the gun.
function drawSafe(ctx, g, t) {
  const { x, y } = SAFE;
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 34, 62, 14, 0, 0, TAU); ctx.fill();

  // the dossiers on a rack above the box
  for (let i = 0; i < START_PAGES; i++) {
    drawPage(ctx, -52 + i * 26, -66 - Math.abs(i - 2) * 3, i < g.pages ? 1 : 0.13, t + i * 0.4);
  }

  // plinth
  ctx.fillStyle = '#2b2419';
  roundRect(ctx, -58, 24, 116, 12, 3); ctx.fill();

  // iron body
  const body = ctx.createLinearGradient(-52, 0, 52, 0);
  body.addColorStop(0, '#26231d'); body.addColorStop(0.35, '#47433a');
  body.addColorStop(0.6, '#38342c'); body.addColorStop(1, '#1d1a15');
  ctx.fillStyle = body;
  roundRect(ctx, -52, -34, 104, 60, 7); ctx.fill();
  ctx.strokeStyle = '#15120e'; ctx.lineWidth = 3;
  roundRect(ctx, -52, -34, 104, 60, 7); ctx.stroke();

  // the door, inset
  ctx.strokeStyle = 'rgba(200,164,90,0.42)'; ctx.lineWidth = 2;
  roundRect(ctx, -44, -27, 88, 46, 5); ctx.stroke();
  ctx.fillStyle = 'rgba(226,232,200,0.35)';
  for (const rx of [-47, 47]) for (const ry of [-29, 21]) {
    ctx.beginPath(); ctx.arc(rx, ry, 2.2, 0, TAU); ctx.fill();
  }
  // hinges
  ctx.fillStyle = '#4c5540';
  roundRect(ctx, 40, -22, 7, 12, 2); ctx.fill();
  roundRect(ctx, 40, 6, 7, 12, 2); ctx.fill();

  // combination dial
  ctx.save();
  ctx.translate(-14, -4);
  ctx.fillStyle = '#1a170f'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
  const dial = ctx.createRadialGradient(-4, -5, 1, 0, 0, 14);
  dial.addColorStop(0, '#c9cfae'); dial.addColorStop(1, '#5d6650');
  ctx.fillStyle = dial; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#2a2110'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
    ctx.lineTo(Math.cos(a) * 11.5, Math.sin(a) * 11.5);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a2110'; ctx.lineWidth = 2.4;
  const na = -1.1 + Math.sin(t * 0.6) * 0.25;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(na) * 10, Math.sin(na) * 10); ctx.stroke();
  ctx.restore();

  // handle
  ctx.strokeStyle = '#9aa284'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(18, -12); ctx.lineTo(18, 10); ctx.stroke();
  ctx.beginPath(); ctx.arc(18, -1, 9, -Math.PI / 2, Math.PI / 2); ctx.stroke();

  // a work lamp over it, so the corner reads
  const gl = ctx.createRadialGradient(0, -20, 4, 0, -20, 96);
  gl.addColorStop(0, 'rgba(255,200,90,0.16)');
  gl.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(0, -20, 96, 0, TAU); ctx.fill();

  ctx.restore();
}

function drawMachine(ctx, g, t) {
  const { x, y } = MACHINE;
  const ang = g.cannonAngle ?? -Math.PI / 2;
  const rec = g.recoil * 9;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 30, 82, 17, 0, 0, TAU); ctx.fill();

  // barrel, mounted on a yoke above the magazine
  ctx.save();
  ctx.translate(0, PIVOT.y - MACHINE.y);
  ctx.rotate(ang + Math.PI / 2);
  ctx.translate(0, rec);
  const bar = ctx.createLinearGradient(-14, 0, 14, 0);
  bar.addColorStop(0, '#171a13'); bar.addColorStop(0.35, '#8d9478');
  bar.addColorStop(0.6, '#5d6650'); bar.addColorStop(1, '#14170f');
  ctx.fillStyle = bar;
  roundRect(ctx, -13, -82, 26, 88, 6); ctx.fill();
  // muzzle brake
  ctx.fillStyle = '#9aa284';
  roundRect(ctx, -18, -92, 36, 18, 4); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(-18, -88, 7, 9); ctx.fillRect(11, -88, 7, 9);
  // fume extractor
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, -15, -52, 30, 16, 5); ctx.fill();
  if (g.muzzleFlash > 0) {
    ctx.globalAlpha = g.muzzleFlash;
    const fg = ctx.createRadialGradient(0, -90, 2, 0, -90, 34);
    fg.addColorStop(0, '#fff4c9'); fg.addColorStop(0.4, 'rgba(255,180,70,0.8)');
    fg.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, -90, 34, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // magazine body
  const body = ctx.createLinearGradient(-70, 0, 70, 0);
  body.addColorStop(0, '#242a1c'); body.addColorStop(0.3, '#7b8564');
  body.addColorStop(0.55, '#586045'); body.addColorStop(1, '#1c2116');
  ctx.fillStyle = body;
  roundRect(ctx, -72, -18, 144, 52, 12); ctx.fill();
  ctx.strokeStyle = '#12150f'; ctx.lineWidth = 3;
  roundRect(ctx, -72, -18, 144, 52, 12); ctx.stroke();

  // road wheels under the emplacement
  ctx.fillStyle = '#20241c';
  roundRect(ctx, -70, 22, 140, 16, 7); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const wx = -54 + i * 27;
    ctx.fillStyle = '#7b8564';
    ctx.beginPath(); ctx.arc(wx, 30, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(wx, 30, 3.4, 0, TAU); ctx.fill();
  }

  // trunnion the barrel swings in
  ctx.fillStyle = '#4c5540';
  roundRect(ctx, -16, -30, 32, 20, 6); ctx.fill();
  ctx.strokeStyle = '#12150f'; ctx.lineWidth = 2;
  roundRect(ctx, -16, -30, 32, 20, 6); ctx.stroke();
  ctx.fillStyle = '#9aa284';
  ctx.beginPath(); ctx.arc(0, -20, 4, 0, TAU); ctx.fill();

  // pressure gauge
  ctx.save(); ctx.translate(0, -2);
  ctx.fillStyle = '#12150f'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
  ctx.fillStyle = '#dfe0cf'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
  const load = g.boiler ? g.boiler.loaded() / CHAMBERS : 1;
  const na = -Math.PI * 0.8 + load * Math.PI * 1.6;
  ctx.strokeStyle = '#a32b16'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(na) * 8, Math.sin(na) * 8); ctx.stroke();
  ctx.restore();

  // bolt heads
  ctx.fillStyle = 'rgba(226,232,200,0.5)';
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-62 + i * 15.5, -13, 1.8, 0, TAU); ctx.fill(); }

  // spades dug into the ground
  ctx.fillStyle = '#1d2117';
  roundRect(ctx, -64, 30, 22, 10, 3); ctx.fill();
  roundRect(ctx, 42, 30, 22, 10, 3); ctx.fill();

  ctx.restore();

  // exhaust haze off the engine deck
  if (Math.random() < 0.4) {
    g.particles.push({ x: x + (Math.random() - 0.5) * 50, y: y - 20, vx: (Math.random() - 0.5) * 14,
      vy: -26 - Math.random() * 20, t: 0.9, r: 4 + Math.random() * 5, c: 'rgba(190,196,176,0.34)', soft: true });
  }
}

// A beat over the battlefield before the panel comes up.
function drawOutro(ctx, g) {
  const o = g.outro;
  if (!o) return;
  const won = o.kind === 'won';
  const inK = Math.min(1, o.t / 0.4);
  const outK = Math.max(0, Math.min(1, (o.hold - o.t) / 0.45));
  const a = inK * outK;
  if (a <= 0) return;

  ctx.save();
  ctx.globalAlpha = 0.6 * a;
  ctx.fillStyle = '#0b0805';
  ctx.fillRect(0, 0, W, PLAY_H);

  const cx = W / 2, cy = PLAY_H * 0.44;
  const grow = 1 - Math.pow(1 - inK, 3);
  ctx.globalAlpha = a;
  ctx.translate(cx, cy);
  ctx.scale(0.88 + 0.12 * grow, 0.88 + 0.12 * grow);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  const glow = won ? '#ffc24b' : '#e2563a';
  const rule = won ? 'rgba(255,194,75,0.55)' : 'rgba(226,86,58,0.5)';
  const w = 270;
  ctx.strokeStyle = rule; ctx.lineWidth = 2;
  for (const dy of [-46, 46]) {
    ctx.beginPath(); ctx.moveTo(-w, dy); ctx.lineTo(-26, dy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(26, dy); ctx.lineTo(w, dy); ctx.stroke();
  }
  ctx.fillStyle = rule;
  for (const dy of [-46, 46]) { ctx.beginPath(); ctx.arc(0, dy, 4, 0, TAU); ctx.fill(); }

  ctx.font = "56px 'Black Ops One', Impact, sans-serif";
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(won ? 'LEVEL CLEARED' : 'LEVEL FAILED', 0, 0);
  ctx.shadowColor = glow; ctx.shadowBlur = 26;
  ctx.fillStyle = won ? '#ffe9a8' : '#ff8a6b';
  ctx.fillText(won ? 'LEVEL CLEARED' : 'LEVEL FAILED', 0, 0);
  ctx.shadowBlur = 0;

  ctx.font = "italic 19px 'Roboto Condensed', Arial, sans-serif";
  ctx.fillStyle = 'rgba(232,220,189,0.85)';
  ctx.fillText(won
    ? `${g.pages} of ${START_PAGES} dossiers still on the rack`
    : 'every dossier of the formula is gone', 0, 74);
  ctx.restore();
}

// The firing range: a running read-out of what each word actually did.
function drawProving(ctx, g) {
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(11,8,5,0.72)';
  roundRect(ctx, 12, 10, 250, 26, 6); ctx.fill();
  ctx.strokeStyle = '#59623a'; ctx.lineWidth = 2;
  roundRect(ctx, 12, 10, 250, 26, 6); ctx.stroke();
  ctx.fillStyle = '#ffc24b'; ctx.font = "14px 'Black Ops One', Impact, sans-serif";
  ctx.fillText('THE FIRING RANGE', 24, 28);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(214,222,186,0.5)'; ctx.font = "italic 12px 'Roboto Condensed', Arial, sans-serif";
  ctx.fillText('Esc to leave', 250, 28);
  ctx.textAlign = 'left';

  const log = (g.wordLog || []).slice(-9).reverse();
  if (!log.length) {
    ctx.fillStyle = 'rgba(214,222,186,0.45)';
    ctx.font = "italic 14px 'Roboto Condensed', Arial, sans-serif";
    ctx.fillText('type anything — the damage it does is listed here', 24, 56);
    ctx.restore();
    return;
  }
  const h = 20 * log.length + 34;
  ctx.fillStyle = 'rgba(11,8,5,0.72)';
  roundRect(ctx, 12, 44, 250, h, 6); ctx.fill();
  ctx.strokeStyle = '#55401f'; ctx.lineWidth = 1.5;
  roundRect(ctx, 12, 44, 250, h, 6); ctx.stroke();
  ctx.fillStyle = 'rgba(200,178,132,0.75)';
  ctx.font = "11px 'Black Ops One', Impact, sans-serif";
  ctx.fillText('WORD', 24, 62);
  ctx.textAlign = 'right';
  ctx.fillText('DEALT', 250, 62);

  log.forEach((e, i) => {
    const y = 82 + i * 20;
    ctx.textAlign = 'left';
    let x = 24;
    ctx.font = "13px 'Special Elite', 'Courier New', monospace";
    for (let k = 0; k < e.word.length && x < 190; k++) {
      const m = e.marks[k] ? MATERIALS[e.marks[k]] : null;
      ctx.fillStyle = m ? m.glow : 'rgba(214,218,182,0.45)';
      const ch = e.word[k].toUpperCase();
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + 0.5;
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = i === 0 ? '#ffc24b' : '#dee2c2';
    ctx.fillText(Math.round(e.dealt).toLocaleString(), 250, y);
  });
  ctx.restore();
}

function drawBossBar(ctx, g) {
  const boss = g.bugs.find(b => b.sp.boss);
  if (!boss) return;
  const w = 460, x0 = (W - w) / 2, y0 = 8;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  roundRect(ctx, x0 - 4, y0 - 4, w + 8, 24, 6); ctx.fill();
  ctx.strokeStyle = '#a8b060'; ctx.lineWidth = 2;
  roundRect(ctx, x0 - 4, y0 - 4, w + 8, 24, 6); ctx.stroke();
  const k = Math.max(0, boss.hp / boss.maxHp);
  const gr = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  gr.addColorStop(0, '#a5381f'); gr.addColorStop(1, '#e6a23c');
  ctx.fillStyle = gr; ctx.fillRect(x0, y0, w * k, 16);
  ctx.fillStyle = '#f2e6c8'; ctx.font = "13px 'Black Ops One', Impact, sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(boss.sp.name.toUpperCase(), W / 2, y0 + 8);
  ctx.restore();
}

function drawReticle(ctx, a, t) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(t * 0.8);
  ctx.strokeStyle = 'rgba(255,194,75,0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const ang = i * TAU / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 10, Math.sin(ang) * 10);
    ctx.lineTo(Math.cos(ang) * 22, Math.sin(ang) * 22);
    ctx.stroke();
  }
  ctx.restore();
}

// ── tanks ───────────────────────────────────────────────────────────────────
function drawBug(ctx, b, t) {
  const sp = b.sp;
  ctx.save();
  ctx.translate(b.x, b.y);

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(0, b.r * 0.8, b.r * 1.05, b.r * 0.42, 0, 0, TAU); ctx.fill();

  if (sp.flying) ctx.translate(0, (Math.sin(t * 9 + b.wob) * 4 - 7) * (b.depth || 1));
  ctx.rotate(b.tilt);

  const body = sp.body, trim = sp.trim;
  const r = b.r;

  // ── running gear ─────────────────────────────────────────────────────────
  if (sp.flying) {
    // a gunship: skids and a rotor instead of tracks
    ctx.strokeStyle = '#1b1f18'; ctx.lineWidth = Math.max(2, r * 0.16); ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.85, -r * 0.7); ctx.lineTo(side * r * 0.85, r * 0.8);
      ctx.stroke();
    }
  } else {
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#20241c';
      roundRect(ctx, side * r * 0.9 - r * 0.24, -r * 1.0, r * 0.48, r * 2.0, r * 0.2); ctx.fill();
      ctx.strokeStyle = '#12150f'; ctx.lineWidth = 1.6; ctx.stroke();
      // tread links, marching as it drives
      ctx.fillStyle = 'rgba(160,168,140,0.45)';
      const pitch = r * 0.34;
      const off = ((b.legPhase * r * 0.5) % pitch + pitch) % pitch;
      for (let k = -r * 1.0 + off; k < r * 0.94; k += pitch) {
        ctx.fillRect(side * r * 0.9 - r * 0.24, k, r * 0.48, r * 0.09);
      }
      // road wheels showing through
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      for (let k = -0.7; k <= 0.75; k += 0.48) {
        ctx.beginPath(); ctx.arc(side * r * 0.9, k * r, r * 0.16, 0, TAU); ctx.fill();
      }
    }
  }

  // ── hull ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.72);
  ctx.lineTo(-r * 0.34, -r * 1.02);          // glacis, sloped at the front
  ctx.lineTo(r * 0.34, -r * 1.02);
  ctx.lineTo(r * 0.62, -r * 0.72);
  ctx.lineTo(r * 0.62, r * 0.9);
  ctx.lineTo(-r * 0.62, r * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#12150f'; ctx.lineWidth = 2; ctx.stroke();
  const sheen = ctx.createLinearGradient(-r, 0, r, 0);
  sheen.addColorStop(0, 'rgba(255,255,230,0.20)');
  sheen.addColorStop(0.5, 'rgba(255,255,230,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = sheen; ctx.fill();

  // engine deck louvres at the back
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(1, r * 0.07);
  for (let i = 0; i < 3; i++) {
    const yy = r * 0.44 + i * r * 0.17;
    ctx.beginPath(); ctx.moveTo(-r * 0.44, yy); ctx.lineTo(r * 0.44, yy); ctx.stroke();
  }

  // applique armour on the heavies
  if (sp.id === 'beetle' || sp.id === 'box') {
    ctx.fillStyle = trim;
    roundRect(ctx, -r * 0.7, -r * 0.62, r * 1.4, r * 0.34, r * 0.08); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.4; ctx.stroke();
  }

  // ── turret ───────────────────────────────────────────────────────────────
  const tr = r * (sp.id === 'box' ? 0.56 : 0.44);
  const tg = ctx.createLinearGradient(-tr, 0, tr, 0);
  tg.addColorStop(0, body); tg.addColorStop(0.45, trim); tg.addColorStop(1, body);
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.ellipse(0, -r * 0.06, tr, tr * 1.1, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#12150f'; ctx.lineWidth = 2; ctx.stroke();

  // main gun, pointing the way it is going
  ctx.fillStyle = '#2b3026';
  roundRect(ctx, -r * 0.09, -r * 1.8, r * 0.18, r * 1.5, r * 0.04); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = trim;
  roundRect(ctx, -r * 0.15, -r * 1.86, r * 0.3, r * 0.16, r * 0.04); ctx.fill();
  // mantlet
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, -r * 0.26, -r * 0.62, r * 0.52, r * 0.22, r * 0.06); ctx.fill();
  if (sp.id === 'box') {                       // the Colonel carries two
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#2b3026';
      roundRect(ctx, side * r * 0.42 - r * 0.07, -r * 1.3, r * 0.14, r * 0.9, r * 0.04); ctx.fill();
    }
  }

  // hatch, aerial and a white star
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.arc(tr * 0.35, r * 0.1, Math.max(1.6, r * 0.13), 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(20,24,16,0.8)'; ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath(); ctx.moveTo(-tr * 0.5, r * 0.12);
  ctx.lineTo(-tr * 0.5 - r * 0.1, r * 0.12 + r * 0.55 + Math.sin(t * 6 + b.wob) * r * 0.1);
  ctx.stroke();
  if (r > 10) {
    ctx.fillStyle = 'rgba(235,238,215,0.75)';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? r * 0.07 : r * 0.17;
      ctx.lineTo(Math.cos(a) * rr, r * 0.6 + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  if (sp.flying) {
    // rotor disc
    ctx.save();
    ctx.globalAlpha = 0.45; ctx.strokeStyle = trim;
    ctx.lineWidth = Math.max(2, r * 0.16); ctx.lineCap = 'round';
    ctx.rotate(t * 22 + b.wob);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 1.5); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#20241c';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, TAU); ctx.fill();
  }

  if (sp.id === 'box') {
    // the slot it keeps the stolen dossiers in
    ctx.fillStyle = '#0c0a07';
    roundRect(ctx, -r * 0.4, r * 0.56, r * 0.8, r * 0.22, 3); ctx.fill();
    ctx.fillStyle = '#ff6a2e'; ctx.shadowColor = '#ff6a2e'; ctx.shadowBlur = 14;
    roundRect(ctx, -r * 0.34, r * 0.6, r * 0.68, r * 0.1, 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // the vision slit, lit red until the engine is dead
  ctx.fillStyle = b.freeze > 0 ? '#9fd8ff' : '#ff5a2e';
  ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
  roundRect(ctx, -r * 0.2, -r * 0.34, r * 0.4, Math.max(1.6, r * 0.11), r * 0.05); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.rotate(-b.tilt);

  if (b.carrying) drawPage(ctx, 0, -b.r - 14, 1, t);

  if (b.frost > 0.02) {
    ctx.globalAlpha = Math.min(0.34, b.frost * 0.4);
    ctx.fillStyle = '#8fd0ff';
    ctx.beginPath(); ctx.arc(0, 0, b.r * 1.25, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#dff2ff'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 + b.wob;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * b.r * 0.5, Math.sin(a) * b.r * 0.5);
      ctx.lineTo(Math.cos(a) * b.r * 1.3, Math.sin(a) * b.r * 1.3);
      ctx.stroke();
    }
  }

  if (b.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = b.flash * 0.32;
    ctx.fillStyle = '#fff0cf';
    ctx.beginPath(); ctx.arc(0, 0, b.r * 0.95, 0, TAU); ctx.fill();
    ctx.restore();
  }

  if (b.hp < b.maxHp) {
    const w = b.r * 2.2;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(-w / 2, -b.r - 10, w, 4);
    ctx.fillStyle = b.hp / b.maxHp > 0.4 ? '#8fd47a' : '#e06a3c';
    ctx.fillRect(-w / 2, -b.r - 10, w * Math.max(0, b.hp / b.maxHp), 4);
  }
  ctx.restore();
}

// ── projectiles ────────────────────────────────────────────────────────────
// A letter rising out of a wreck, on its way to your storage.
function drawLoot(ctx, d, t) {
  const k = d.t / d.hold;
  const a = k < 0.12 ? k / 0.12 : k > 0.75 ? (1 - k) / 0.25 : 1;
  const r = SHOT_R + 2 + d.level;
  ctx.save();
  ctx.globalAlpha = Math.max(0, a);
  ctx.translate(d.x, d.y);
  ctx.rotate(Math.sin(t * 3 + d.spin) * 0.12);

  const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, r * (2.2 + d.level * 0.22));
  halo.addColorStop(0, 'rgba(255,246,201,0.5)');
  halo.addColorStop(1, 'rgba(255,194,75,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(0, 0, r * (2.2 + d.level * 0.22), 0, TAU); ctx.fill();

  ctx.shadowColor = '#ffc24b'; ctx.shadowBlur = 16;
  ctx.fillStyle = MATERIALS.iron.body;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  const sh = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r);
  sh.addColorStop(0, 'rgba(255,255,255,0.4)');
  sh.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = sh;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();

  ctx.fillStyle = MATERIALS.iron.ink;
  ctx.font = `${Math.round(r * 1.15)}px 'Special Elite', 'Courier New', monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(d.letter.toUpperCase(), 0, -r * 0.18);
  drawDots(ctx, 0, r * 0.55, d.level, 1.7, MATERIALS.iron.dot);
  ctx.restore();
}

function drawShot(ctx, s) {
  const m = s.shot.mat ? MATERIALS[s.shot.mat] : null;
  const lvl = s.shot.level || 0;
  const rad = SHOT_R;                     // every letter is the same size
  ctx.save();
  for (let i = 0; i < s.trail.length; i++) {
    const p = s.trail[i];
    ctx.globalAlpha = (i / s.trail.length) * 0.4;
    ctx.fillStyle = m ? m.glow : '#cdbf9f';
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 + i * 0.55, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.translate(s.x, s.y);
  ctx.rotate(Math.sin(s.rot) * 0.16);

  if (m) {
    ctx.shadowColor = m.glow; ctx.shadowBlur = 16;
    ctx.fillStyle = m.body;
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    const sh = ctx.createRadialGradient(-rad * 0.35, -rad * 0.4, 1, 0, 0, rad);
    sh.addColorStop(0, 'rgba(255,255,255,0.35)');
    sh.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = sh;
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fill();
    ctx.strokeStyle = m.edge; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.stroke();
    ctx.fillStyle = m.ink;
    ctx.font = "15px 'Special Elite', 'Courier New', monospace";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.shot.ch.toUpperCase(), 0, -3);
    drawDots(ctx, 0, 8, lvl, 1.5, m.dot);
  } else {
    ctx.fillStyle = '#b9ac8d';
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3c4630'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#1a2015';
    ctx.font = "14px 'Special Elite', 'Courier New', monospace";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.shot.ch.toUpperCase(), 0, 0);
  }
  ctx.restore();
}

// ── HUD ────────────────────────────────────────────────────────────────────
function drawHud(ctx, g, t) {
  const top = PLAY_H;
  const h = H - PLAY_H;

  const p = ctx.createLinearGradient(0, top, 0, H);
  p.addColorStop(0, '#2f3628'); p.addColorStop(0.12, '#454f31'); p.addColorStop(1, '#14170f');
  ctx.fillStyle = p; ctx.fillRect(0, top, W, h);
  ctx.fillStyle = '#a8b060'; ctx.fillRect(0, top, W, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, top + 4, W, 3);

  // chambers — circular tanks, every one the same size; colour is the only
  // mark of material and the dots are the level
  const n = CHAMBERS, gap = CHAMBER_GAP;
  const total = (n - 1) * gap + CHAMBER_R * 2;
  const cy = top + 20 + CHAMBER_R;
  const first = (W - total) / 2 + CHAMBER_R;
  const reserved = g.boiler.preview(g.typed || '');
  for (let i = 0; i < n; i++) {
    const cx = first + i * gap;
    const open = i < g.boiler.open;
    const letter = open ? g.boiler.chambers[i] : null;
    const spent = reserved.has(i);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // the tank itself
    ctx.fillStyle = open ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.72)';
    ctx.beginPath(); ctx.arc(cx, cy, CHAMBER_R, 0, TAU); ctx.fill();
    ctx.strokeStyle = open ? '#59623a' : '#333b25'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, CHAMBER_R, 0, TAU); ctx.stroke();

    if (!open) {
      ctx.strokeStyle = 'rgba(170,186,120,0.30)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 13, cy); ctx.lineTo(cx + 13, cy); ctx.stroke();
      ctx.fillStyle = 'rgba(170,186,120,0.35)';
      for (const a of [0, 1, 2, 3]) {
        const th = Math.PI / 4 + a * Math.PI / 2;
        ctx.beginPath(); ctx.arc(cx + Math.cos(th) * 17, cy + Math.sin(th) * 17, 2.2, 0, TAU); ctx.fill();
      }
    } else if (letter) {
      const m = MATERIALS[letter.mat];
      const r = CHAMBER_R - 5;
      if (spent) {
        // typed, not yet fired: the tank already reads as drawn down
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = m.glow; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 0.26;
      } else {
        ctx.shadowColor = m.glow; ctx.shadowBlur = 11;
        ctx.fillStyle = m.body;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        const sh = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 1, cx, cy, r);
        sh.addColorStop(0, 'rgba(255,255,255,0.3)');
        sh.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = sh;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = m.edge; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = spent ? m.glow : m.ink;
      ctx.font = "23px 'Special Elite', 'Courier New', monospace";
      ctx.fillText(letter.letter.toUpperCase(), cx, cy - 5);
      drawDots(ctx, cx, cy + 13, letter.level, 2.3, spent ? m.glow : m.dot);
      ctx.globalAlpha = 1;
      if (spent) { ctx.fillStyle = m.glow; ctx.beginPath(); ctx.arc(cx + 19, cy - 19, 3, 0, TAU); ctx.fill(); }
    } else {
      ctx.strokeStyle = 'rgba(170,186,120,0.22)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, CHAMBER_R - 8, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(226,232,190,0.18)';
      ctx.font = "10px 'Roboto Condensed', Arial, sans-serif";
      ctx.fillText('drawing', cx, cy);
    }
    ctx.restore();
  }

  // typed word rack
  const rx = (W - total) / 2, ry = cy + CHAMBER_R + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, rx, ry, total, 46, 8); ctx.fill();
  ctx.strokeStyle = g.rackFlash > 0 ? '#c95330' : '#59623a';
  ctx.lineWidth = 2 + g.rackFlash * 2;
  roundRect(ctx, rx, ry, total, 46, 8); ctx.stroke();

  ctx.textBaseline = 'middle';
  if (g.typed) {
    ctx.textAlign = 'left';
    let tx = rx + 16;
    ctx.font = "26px 'Special Elite', 'Courier New', monospace";
    const lit = new Set();
    for (const ch of g.typed) {
      let mat = null;
      for (let i = 0; i < g.boiler.open; i++) {
        const c = g.boiler.chambers[i];
        if (c && c.letter === ch && !lit.has(i)) { lit.add(i); mat = c.mat; break; }
      }
      const m = mat ? MATERIALS[mat] : null;
      const wch = ctx.measureText(ch.toUpperCase()).width;
      if (m) { ctx.fillStyle = m.glow; ctx.shadowColor = m.glow; ctx.shadowBlur = 10; }
      else { ctx.fillStyle = 'rgba(214,218,182,0.62)'; ctx.shadowBlur = 0; }
      ctx.fillText(ch.toUpperCase(), tx, ry + 21);
      ctx.shadowBlur = 0;
      if (m) {
        ctx.fillStyle = m.glow;
        ctx.fillRect(tx, ry + 37, wch, 2.5);
      }
      tx += wch + 1;
    }
    ctx.fillStyle = (t * 2) % 1 > 0.5 ? '#ffc24b' : 'transparent';
    ctx.fillRect(tx + 2, ry + 10, 12, 26);
  } else if (g.message) {
    ctx.fillStyle = '#e39a78'; ctx.font = "italic 17px 'Roboto Condensed', Arial, sans-serif"; ctx.textAlign = 'center';
    ctx.fillText(g.message.text, W / 2, ry + 23);
  } else if (!g.outro) {
    ctx.fillStyle = 'rgba(214,222,186,0.35)';
    ctx.font = "italic 16px 'Roboto Condensed', Arial, sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('type a word, then press Enter', W / 2, ry + 23);
  }

  // left readouts
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#dee2c2'; ctx.font = "17px 'Black Ops One', Impact, sans-serif";
  ctx.fillText(g.sandbox ? 'LIVE FIRE' : `WAVE ${g.levelNo}`, 16, top + 28);
  ctx.font = "italic 14px 'Roboto Condensed', Arial, sans-serif"; ctx.fillStyle = '#b4b894';
  ctx.fillText(g.level ? g.level.name : '', 16, top + 47);
  ctx.font = "14px 'Special Elite', 'Courier New', monospace"; ctx.fillStyle = '#ffc24b';
  ctx.fillText(`★ ${g.secrets} intel`, 16, top + 72);
  ctx.fillStyle = '#dee2c2'; ctx.font = "13px 'Special Elite', 'Courier New', monospace";
  ctx.fillText(`score ${g.score}`, 16, top + 92);
  ctx.fillStyle = '#d79a7a';
  ctx.fillText(`dossiers ${g.pages}/${START_PAGES}   lost ${g.lost}`, 16, top + 112);
  ctx.fillStyle = '#9ec0d8';
  ctx.fillText(g.boiler.open >= CHAMBERS
    ? `chambers ${CHAMBERS}/${CHAMBERS} — all open`
    : `chambers ${g.boiler.open}/${CHAMBERS} · all ${g.boiler.loadedCount()} in one word unseals`,
    16, top + 132);
  ctx.fillStyle = '#9fb6a0'; ctx.font = "italic 13px 'Roboto Condensed', Arial, sans-serif";
  ctx.fillText(`word of the day: ${g.wotd}`, 16, top + 152);

  // right readouts
  ctx.textAlign = 'right';
  const left = Math.max(0, g.spawns.length - g.spawnIdx) + g.bugs.length;
  ctx.fillStyle = '#dee2c2'; ctx.font = "17px 'Black Ops One', Impact, sans-serif";
  ctx.fillText(g.sandbox ? 'targets stand back up' : `${left} tanks remain`, W - 16, top + 28);
  ctx.font = "13px 'Special Elite', 'Courier New', monospace"; ctx.fillStyle = '#b4b894';
  ctx.fillText(`${g.stats.words} words · ${g.stats.kills} killed`, W - 16, top + 48);
  if (g.lastWord) {
    ctx.fillStyle = '#ffc24b';
    ctx.fillText(`"${g.lastWord.word}" ×${g.lastWord.res.mult.toFixed(2)} → ${g.lastWord.total}`, W - 16, top + 68);
  }
  // bottom strip: queued letters on the left, controls on the right
  ctx.textAlign = 'left'; ctx.font = "13px 'Special Elite', 'Courier New', monospace";
  if (g.fireQueue.length) {
    ctx.fillStyle = '#ffc24b';
    const q = g.fireQueue;
    ctx.fillText(`breech: ${q.length} · ` + q.slice(0, 8).map(s => s.ch.toUpperCase()).join(' ')
      + (q.length > 8 ? ' …' : ''), 220, top + 152);
  }
  ctx.textAlign = 'right';
  if (g.holding && g.fireQueue.length) {
    ctx.fillStyle = '#ffc24b'; ctx.font = "13px 'Black Ops One', Impact, sans-serif";
    ctx.fillText('BREECH HELD — nothing in the room to shoot', W - 16, top + 155);
  } else {
    ctx.fillStyle = 'rgba(214,222,186,0.4)'; ctx.font = "italic 13px 'Roboto Condensed', Arial, sans-serif";
    ctx.fillText('click a tank to swap its letter · right-mouse aims · Del clears · Esc pauses', W - 16, top + 155);
  }
}
