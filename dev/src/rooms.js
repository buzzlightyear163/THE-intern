/* =====================================================================
   Floor dioramas (192x108 each) and the elevator ride world.
   ===================================================================== */
const ROOMS = (() => {
'use strict';
const { clamp, mulberry, shade, mix, dith, canvas, ctx, ptext, textW, line, vgrad, paintSkyline, drawMoon, TOD, fmtUsd, getSprite, drawSprite, makeLook, Actor, drawPigeon, LADDER, INK } = IE;
const RW = 192, RH = 108, FLOOR_Y = 58;

function kit(g, ox = 0, oy = 0){
  const R = (x, y, w, h, c) => { if (!c || w <= 0 || h <= 0) return; g.fillStyle = c; g.fillRect(ox + x, oy + y, w, h); };
  const P = (x, y, c) => { if (!c) return; g.fillStyle = c; g.fillRect(ox + x, oy + y, 1, 1); };
  const D = (x, y, w, h, c, t) => { g.fillStyle = c; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (dith(x + i, y + j, t)) g.fillRect(ox + x + i, oy + y + j, 1, 1); };
  const T = (s, x, y, c, o) => ptext(g, s, ox + x, oy + y, c, o);
  const L = (x0, y0, x1, y1, c) => line(g, ox + x0, oy + y0, ox + x1, oy + y1, c);
  const ell = (cx, cy, rx, ry, c, t = 1) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const v = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (v <= 1 && (t >= 1 || dith(x, y, t * (1 - v * 0.6)))) P(x, y, c); } };
  const ring = (cx, cy, rx, ry, c, wdt = 0.18) => { for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) { const v = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2); if (Math.abs(v - 1) < wdt) P(x, y, c); } };
  return { g, ox, oy, R, P, D, T, L, ell, ring, windows: [] };
}

/* ---------- shared building blocks ---------- */
const VPX = 96, VPY = -50;
const FROWS = [58, 60, 63, 67, 72, 78, 85, 93, 102];
const projX = (bx, y) => VPX + (bx - VPX) * (y - VPY) / (107 - VPY);
const unprojX = (x, y) => VPX + (x - VPX) * (107 - VPY) / (y - VPY);
function rowIndex(y){ let i = 0; while (i < FROWS.length - 1 && y >= FROWS[i + 1]) i++; return i; }

function floorPlane(k, f){
  const { R, P, D } = k;
  R(0, FLOOR_Y, RW, RH - FLOOR_Y, f.c);
  const step = f.step || 24;
  for (let y = FLOOR_Y; y < RH; y++) {
    const ri = rowIndex(y);
    for (let x = 0; x < RW; x++) {
      const col = Math.floor((unprojX(x, y) + 960) / step);
      let c = null;
      if (f.type === 'checker') { if ((ri + col) & 1) c = f.c2; }
      else if (f.type === 'carpetTile') { if (((ri + col) & 1) && dith(x, y, 0.5)) c = f.c2; }
      else if (f.type === 'carpet') { if (dith(x, y, 0.18)) c = f.c2; if (f.c3 && ((x + (y - FLOOR_Y) * 2) % 14 === 0) && ((x - (y - FLOOR_Y) * 2) % 14 + 14) % 14 === 0) c = f.c3; }
      else if (f.type === 'concrete' || f.type === 'gravel') { const h = (x * 73856093 ^ y * 19349663) >>> 0; if (h % 9 === 0) c = f.c2; else if (f.type === 'gravel' && h % 13 === 1) c = f.c3; }
      else if (f.type === 'planks') { if (dith(x, y, 0.1) && (col & 1)) c = f.c2; }
      if (c) P(x, y, c);
    }
  }
  const seamV = (bx, c) => { for (let y = FLOOR_Y; y < RH; y++) { const x = Math.round(projX(bx, y)); if (x >= 0 && x < RW) P(x, y, c); } };
  if (f.type === 'checker' || f.type === 'carpetTile') {
    for (const y of FROWS) R(0, y, RW, 1, f.line);
    for (let bx = -960; bx <= 1152; bx += step) seamV(bx, f.line);
  }
  if (f.type === 'planks') {
    for (let bx = -960; bx <= 1152; bx += step) seamV(bx, f.line);
    const rng = mulberry(f.seed || 77);
    for (let i = 0; i < 70; i++) {
      const y = FLOOR_Y + 1 + (rng() * (RH - FLOOR_Y - 2) | 0), bx = -960 + Math.floor(rng() * 2112 / step) * step;
      const x0 = Math.round(projX(bx, y)) + 1, x1 = Math.round(projX(bx + step, y)) - 1;
      if (x1 > x0) R(clamp(x0, 0, RW), y, clamp(x1, 0, RW) - clamp(x0, 0, RW), 1, f.line);
    }
  }
  if (f.type === 'concrete') { R(0, 72, RW, 1, f.line); R(0, 93, RW, 1, f.line); seamV(0, f.line); seamV(192, f.line); }
  D(0, FLOOR_Y, RW, 3, shade(f.c, -0.3), 0.5);
}
function shell(k, o){
  const { R, D } = k;
  const ceil = o.ceil || '#161d38';
  R(0, 0, RW, 6, ceil); R(0, 5, RW, 1, shade(ceil, -0.4));
  R(0, 6, RW, 48, o.wall);
  if (o.stripes) for (let x = 3; x < RW; x += 6) R(x, 6, 1, 48, o.stripes);
  if (o.panels) for (let x = 0; x < RW; x += 16) { R(x, 9, 1, 45, shade(o.wall, -0.22)); R(x + 1, 9, 1, 45, shade(o.wall, 0.12)); }
  R(0, 6, RW, 1, shade(o.wall, -0.35)); R(0, 7, RW, 1, o.crown || shade(o.wall, 0.12));
  if (o.wain) { R(0, o.wainY, RW, 54 - o.wainY, o.wain); R(0, o.wainY, RW, 1, o.rail || shade(o.wain, 0.2)); R(0, o.wainY + 1, RW, 1, shade(o.wain, -0.22)); if (o.wainPanels) for (let x = 6; x < RW; x += 24) { R(x, o.wainY + 4, 18, 1, shade(o.wain, -0.18)); R(x, o.wainY + 4, 1, 50 - o.wainY - 6, shade(o.wain, -0.18)); R(x, 52, 18, 1, shade(o.wain, 0.14)); R(x + 17, o.wainY + 4, 1, 50 - o.wainY - 6, shade(o.wain, 0.14)); } }
  R(0, 54, RW, 4, o.base); R(0, 54, RW, 1, shade(o.base, 0.22)); R(0, 57, RW, 1, shade(o.base, -0.4));
  floorPlane(k, o.floor);
  D(0, 6, RW, 2, shade(o.wall, -0.4), 0.5);
}
function fluor(k, x, w, wall){
  const { R, D } = k;
  R(x, 3, w, 2, '#d9d3bd'); R(x + 1, 3, w - 2, 1, '#fffbe8'); R(x, 5, w, 1, '#8a8470');
  for (let y = 8; y < 26; y++) { const s = y - 8; D(x - s, y, w + 2 * s, 1, shade(wall, 0.1), 0.32 * (1 - s / 18)); }
}
function pendant(k, x, len, wall, o = {}){
  const { R, D } = k, sc = o.shade || '#2f3a5a', y = 6 + len;
  R(x, 6, 1, len, '#1a1428');
  if (o.bulb) { R(x - 2, y, 5, 1, '#3a3a46'); R(x - 2, y + 1, 1, 3, '#3a3a46'); R(x + 2, y + 1, 1, 3, '#3a3a46'); R(x - 1, y + 1, 3, 3, '#ffe9a8'); R(x, y + 2, 1, 1, '#fff8e0'); R(x - 2, y + 4, 5, 1, '#3a3a46'); }
  else { R(x - 2, y, 5, 1, sc); R(x - 3, y + 1, 7, 1, sc); R(x - 4, y + 2, 9, 1, shade(sc, -0.25)); R(x - 4, y + 2, 9, 1, sc); R(x - 3, y + 3, 7, 1, '#fff2c4'); }
  if (o.cone !== false) for (let yy = y + 4; yy < 54; yy++) { const half = Math.round(3 + (yy - y) * 0.42); D(x - half, yy, half * 2 + 1, 1, shade(wall, 0.12), 0.3); }
}
function pool(k, cx, cy, rx, ry, c, t = 0.4){ k.ell(cx, cy, rx, ry, c, t); }
function frameBox(k, x, y, w, h, frame, inner){ const { R } = k; R(x, y, w, h, frame); R(x, y, w, 1, shade(frame, 0.3)); R(x, y + h - 1, w, 1, shade(frame, -0.35)); R(x + 1, y + 1, w - 2, h - 2, inner); }
function deskBlock(k, x, top, w, topH, frontH, c){
  const { R } = k;
  R(x, top, w, topH, c.top); R(x, top, w, 1, shade(c.top, 0.2));
  R(x - 1, top + topH, w + 2, 2, c.edge || shade(c.top, -0.15));
  R(x, top + topH + 2, w, frontH, c.front); R(x, top + topH + 2, w, 1, shade(c.front, -0.3));
  if (c.trim) R(x, top + topH + 3, w, 1, c.trim);
  R(x, top + topH + 2 + frontH - 1, w, 1, shade(c.front, -0.35));
  if (c.panels) for (let px = x + 4; px < x + w - 8; px += c.panels) { R(px, top + topH + 5, c.panels - 4, frontH - 7, shade(c.front, 0.07)); R(px, top + topH + 5, c.panels - 4, 1, shade(c.front, -0.15)); if (c.knob) R(px + (c.panels >> 1) - 3, top + topH + 7, 2, 1, c.knob); }
}
function laptopBack(k, x, y, w = 18, logo = '#f2c14e'){
  const { R, P } = k, h = 9;
  R(x, y, w, h, '#4a5070'); R(x, y, w, 1, '#6b7291'); R(x, y, 1, h, '#5c6385'); R(x + w - 1, y, 1, h, '#3a3f5a');
  R(x - 1, y + h, w + 2, 1, '#2a2f45');
  const cx = x + (w >> 1); P(cx - 1, y + 3, logo); P(cx + 1, y + 3, logo); P(cx, y + 4, logo); P(cx, y + 5, logo);
}
function mug(k, x, y, c = '#fbf4e2'){ const { R, P } = k; R(x, y, 3, 4, c); R(x, y, 3, 1, shade(c, 0.1)); R(x + 3, y + 1, 1, 2, c); P(x + 1, y, '#5a3a28'); R(x, y + 4, 3, 1, shade(c, -0.3)); }
function papers(k, x, y, w = 8){ const { R } = k; R(x, y, w, 2, '#fbf4e2'); R(x + 1, y - 1, w - 1, 1, '#e9dcbf'); R(x, y + 2, w, 1, '#cdb994'); }
function plant(k, x, base, size, o = {}){
  const { R, P } = k, pot = o.pot || '#b5584a', leaf = o.leaf || '#3f9a68', leaf2 = o.leaf2 || '#7fd19b', rng = mulberry(o.seed || (x * 31 + base));
  const pw = Math.max(5, Math.round(size * 0.55)), ph = Math.max(4, Math.round(size * 0.42));
  const px = Math.round(x - pw / 2);
  if (o.type === 'snake') { for (let i = 0; i < 6; i++) { const lx = px + 1 + i * ((pw - 2) / 5) | 0, lh = Math.round(size * (0.7 + rng() * 0.6)); R(lx, base - ph - lh, 2, lh, i & 1 ? leaf : '#4c8f5c'); P(lx, base - ph - lh, leaf2); R(lx + 1, base - ph - lh + 2, 1, lh - 3, '#c9c47a'); } }
  else if (o.type === 'palm') { R(x, base - ph - size, 1, size, '#7a5a32'); for (let a = 0; a < 7; a++) { const ang = -Math.PI * (0.1 + a * 0.13), len = size * 0.6; for (let s = 0; s < len; s++) { const xx = Math.round(x + Math.cos(ang) * s * (a < 3.5 ? -1 : 1) * (a % 2 ? 1 : 0.9)), yy = Math.round(base - ph - size + Math.sin(-ang) * s * -0.4 + s * s * 0.03); P(xx, yy, s > len * 0.6 ? leaf2 : leaf); P(xx, yy + 1, leaf); } } }
  else if (o.type === 'dead') { R(x, base - ph - size * 0.6, 1, size * 0.6 | 0, '#6b4a2a'); P(x - 1, base - ph - size * 0.5 | 0, '#8a6a3a'); P(x + 1, base - ph - size * 0.35 | 0, '#8a6a3a'); P(x + 2, base - ph - size * 0.38 | 0, '#a3824f'); }
  else { const n = Math.round(size * 2.2); for (let i = 0; i < n; i++) { const a = rng() * Math.PI, r = rng() * size * 0.75, xx = Math.round(x + Math.cos(a) * r * (rng() < 0.5 ? -1 : 1) * 0.9), yy = Math.round(base - ph - 1 - Math.sin(a) * r); R(xx, yy, 2, 1, rng() < 0.35 ? leaf2 : leaf); P(xx, yy + 1, shade(leaf, -0.2)); } }
  R(px, base - ph, pw, ph, pot); R(px - 1, base - ph, pw + 2, 2, shade(pot, 0.15)); R(px, base - 1, pw, 1, shade(pot, -0.35)); R(px + 1, base - ph + 2, 1, ph - 3, shade(pot, 0.12));
}
function cardboard(k, x, y, w, h, o = {}){ const { R } = k, c = o.c || '#b07a45'; R(x, y, w, h, c); R(x, y, w, 1, shade(c, 0.22)); R(x + (w >> 1), y, 1, Math.min(h, 3), '#e8c995'); R(x, y + h - 1, w, 1, shade(c, -0.35)); R(x + w - 1, y, 1, h, shade(c, -0.2)); if (o.label) R(x + 2, y + 3, Math.min(5, w - 4), 2, '#fbf4e2'); }
function wallClock(k, cx, cy, r, face = '#f4ead5', rim = '#2a2f45'){ k.ell(cx, cy, r + 1, r + 1, rim); k.ell(cx, cy, r, r, face); for (let i = 0; i < 12; i += 3) { const a = i / 12 * Math.PI * 2; k.P(Math.round(cx + Math.cos(a) * (r - 1)), Math.round(cy + Math.sin(a) * (r - 1)), rim); } }
function clockHands(k, cx, cy, r, now){
  const m = now.getMinutes() + now.getSeconds() / 60, h = (now.getHours() % 12) + m / 60;
  const am = m / 60 * Math.PI * 2 - Math.PI / 2, ah = h / 12 * Math.PI * 2 - Math.PI / 2;
  k.L(cx, cy, cx + Math.round(Math.cos(am) * (r - 1)), cy + Math.round(Math.sin(am) * (r - 1)), '#1a1428');
  k.L(cx, cy, cx + Math.round(Math.cos(ah) * (r - 2.5)), cy + Math.round(Math.sin(ah) * (r - 2.5)), '#1a1428');
  k.P(cx, cy, '#c8463d');
}
/* city view inside a window; level 0..8 decides how far below the skyline sits */
function view(k, x, y, w, h, level, tod, seed, moon){
  const { g, ox, oy } = k, T = TOD[tod] || TOD.night;
  g.save(); g.beginPath(); g.rect(ox + x, oy + y, w, h); g.clip();
  vgrad(g, ox + x, oy + y, w, h, T.sky.slice(1));
  const rng = mulberry(seed);
  if (T.stars > 0) for (let i = 0; i < w * h / 70 * T.stars; i++) { g.fillStyle = rng() < 0.22 ? '#c9d2ff' : '#3a4580'; g.fillRect(ox + x + (rng() * w | 0), oy + y + (rng() * h * 0.55 | 0), 1, 1); }
  if (moon && T.moon) drawMoon(g, ox + x + moon[0], oy + y + moon[1]);
  const hz = [0.04, 0.1, 0.2, 0.28, 0.34, 0.44, 0.5, 0.6, 0.78][level];
  const hs = Math.max(0.12, (1 - hz) * h / 82);
  paintSkyline(g, ox + x - 6, w + 12, oy + y + h + 1, seed, tod, null, { heightScale: hs });
  if (level <= 1) { k.R(x, y + h - 3, w, 3, '#1a1a2a'); for (let i = 0; i < 3; i++) { const cx = x + 4 + (rng() * (w - 8) | 0); k.R(cx, y + h - 2, 2, 1, i & 1 ? '#ffe9a8' : '#ff6b5e'); } }
  g.restore();
}
function windowAt(k, rt, x, y, w, h, o){
  const draw = () => {
    const { R, D } = k;
    R(x - 2, y - 2, w + 4, h + 4, o.frame); R(x - 2, y - 2, w + 4, 1, shade(o.frame, 0.3)); R(x - 1, y - 1, w + 2, h + 2, shade(o.frame, -0.3));
    view(k, x, y, w, h, o.level, rt.tod, o.seed || (x * 7 + y), o.moon);
    for (const mx of (o.mull || [])) { R(x + mx, y, 2, h, o.frame); R(x + mx, y, 1, h, shade(o.frame, 0.25)); }
    for (const my of (o.trans || [])) R(x, y + my, w, 1, o.frame);
    for (let s = 0; s < 2; s++) { const sx = x + 4 + s * Math.round(w * 0.5); for (let j = 0; j < h; j++) { const xx = sx + Math.round(j * 0.6); if (xx < x + w - 1) D(xx, y + h - 1 - j, 2 + s, 1, '#c8d6ee', 0.18); } }
    if (o.blinds) { for (let j = 0; j < o.blinds; j += 2) { R(x, y + j, w, 1, '#e9dcbf'); R(x, y + j + 1, w, 1, '#cfc0a0'); } R(x, y + o.blinds, w, 1, '#8a7a5a'); }
    if (o.sill) { R(x - 3, y + h + 2, w + 6, 2, o.sill); R(x - 3, y + h + 2, w + 6, 1, shade(o.sill, 0.25)); }
  };
  k.windows.push({ draw, x, y, w, h }); draw();
}
function hangSign(k, at, label){
  const { R, T } = k, w = 62, x = 96 - w / 2;
  R(x + 8, 6, 1, 12, '#5c3f12'); R(x + w - 9, 6, 1, 12, '#5c3f12');
  R(x, 18, w, 22, '#120d1c'); R(x, 18, w, 1, '#f2c14e'); R(x, 39, w, 1, '#8a6220'); R(x, 18, 1, 22, '#c9952f'); R(x + w - 1, 18, 1, 22, '#8a6220');
  T(label || 'OPENS AT', 96, 21, '#a8792a', { align: 'center' });
  T(fmtUsd(at), 96, 30, '#f2c14e', { align: 'center' });
}

/* ---------- the nine floors ---------- */
const DEFS = [];

/* B1 · mailroom */
DEFS[0] = {
  shell: { ceil:'#1a2026', wall:'#56625f', wain:'#4a5553', wainY:36, rail:'#6b7875', base:'#2e3436', floor:{ type:'concrete', c:'#3a4043', c2:'#32383b', line:'#2a2f32' } },
  back(k, rt){
    const { R, P, D, T } = k, rng = mulberry(5);
    for (const [yy, c1, c2] of [[8, '#7d87a3', '#5c6680'], [11, '#9a6a48', '#6b4a32']]) { R(0, yy, RW, 2, c1); R(0, yy + 1, RW, 1, c2); }
    for (let x = 12; x < RW; x += 34) { R(x, 6, 2, 8, '#3a4152'); R(x - 1, 13, 4, 1, '#2a2f3a'); }
    k.ell(171, 12, 2, 2, '#c8463d'); P(171, 12, '#7f2620');
    R(0, 20, RW, 1, shade('#56625f', -0.1));
    pendant(k, 52, 12, '#56625f', { bulb: true }); pendant(k, 140, 10, '#56625f', { bulb: true });
    // pigeonholes
    R(7, 13, 78, 41, '#5a2f1e'); R(7, 13, 78, 2, '#9a5b3c'); R(7, 13, 78, 1, '#b87547'); R(7, 53, 78, 1, '#3e1f13');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      const cx = 10 + c * 9, cy = 16 + r * 9;
      R(cx, cy, 8, 8, '#24140d'); R(cx, cy, 8, 1, '#120a06');
      const v = rng();
      if (v < 0.55) { const n = 1 + (rng() * 3 | 0); for (let i = 0; i < n; i++) { const hh = 3 + (rng() * 3 | 0); R(cx + 1 + i * 2, cy + 8 - hh, 2, hh, rng() < 0.2 ? '#e9c8b5' : '#fbf4e2'); } if (rng() < 0.3) R(cx + 1, cy + 6, 6, 1, '#c8463d'); }
      else if (v < 0.7) { R(cx + 1, cy + 3, 6, 5, '#c9a26a'); R(cx + 1, cy + 3, 6, 1, '#dcb98a'); R(cx + 3, cy + 3, 1, 5, '#e8d4a8'); }
      P(cx + 3, cy + 8, '#c9952f'); P(cx + 4, cy + 8, '#c9952f');
    }
    for (let r = 1; r < 4; r++) R(9, 15 + r * 9, 74, 1, '#7a4128');
    // sign + list + clock
    R(96, 15, 56, 12, '#262b2e'); R(96, 15, 56, 1, '#4a5056'); R(96, 26, 56, 1, '#1a1e20');
    T('MAILROOM', 124, 18, '#f2c14e', { align: 'center' });
    R(98, 31, 20, 20, '#efe6cf'); R(98, 31, 20, 2, '#c8463d'); for (let y = 35; y < 50; y += 2) R(100, y, 8 + ((y * 7) % 9), 1, '#9a8c6c'); R(106, 30, 4, 2, '#d9c9a5');
    wallClock(k, 134, 39, 6);
    // shelving
    R(144, 28, 2, 26, '#5c6680'); R(186, 28, 2, 26, '#5c6680');
    for (const sy of [36, 45, 53]) { R(144, sy, 44, 2, '#8a93a8'); R(144, sy + 1, 44, 1, '#5c6680'); }
    cardboard(k, 147, 29, 12, 7, { label: true }); cardboard(k, 160, 31, 9, 5); cardboard(k, 171, 28, 14, 8, { label: true });
    cardboard(k, 146, 39, 16, 6); cardboard(k, 164, 40, 8, 5, { c:'#c49060' }); cardboard(k, 174, 38, 11, 7, { label: true });
    cardboard(k, 148, 48, 10, 5); cardboard(k, 161, 47, 13, 6, { label: true }); cardboard(k, 177, 49, 8, 4);
    pool(k, 52, 66, 30, 6, '#454c4f', 0.5); pool(k, 140, 66, 30, 6, '#454c4f', 0.5);
    R(0, 70, RW, 1, '#8a6a2a'); for (let x = 0; x < RW; x += 8) R(x, 70, 4, 1, '#c9952f');
  },
  layers: [
    { y: 76, draw(k){
      const { R } = k;
      deskBlock(k, 92, 62, 52, 4, 6, { top:'#9a5b3c', front:'#6e3b26' });
      R(94, 74, 2, 4, '#4a2418'); R(140, 74, 2, 4, '#4a2418');
      papers(k, 96, 61, 10); papers(k, 108, 60, 7); R(118, 61, 3, 2, '#c8463d');
      R(124, 60, 14, 2, '#c9a26a'); R(124, 62, 14, 1, '#8a6a3a'); for (const cx of [125, 128, 131, 134]) { R(cx, 57, 2, 3, '#fbf4e2'); R(cx, 57, 2, 1, '#9a5b3c'); }
    } },
    { y: 104, draw(k){
      const { R, P } = k;
      R(12, 84, 32, 16, '#4d5675'); R(12, 84, 32, 1, '#7d87a3'); R(14, 86, 28, 2, '#2b3150'); for (let x = 14; x < 42; x += 4) R(x, 89, 1, 10, '#5c6680');
      R(16, 80, 3, 5, '#fbf4e2'); R(20, 81, 4, 4, '#efe2c4'); R(26, 79, 3, 6, '#fbf4e2'); R(31, 81, 5, 4, '#c9a26a'); R(37, 80, 3, 5, '#fbf4e2');
      R(11, 99, 34, 2, '#8a93a8'); for (const wx of [13, 40]) { R(wx, 101, 3, 3, INK); P(wx + 1, 102, '#7d87a3'); }
      R(44, 82, 1, 10, '#8a93a8'); R(44, 82, 5, 1, '#8a93a8');
      cardboard(k, 160, 88, 22, 14, { label: true }); cardboard(k, 164, 78, 16, 10); cardboard(k, 168, 71, 10, 7, { c:'#c49060' });
    } }
  ],
  fxBack(k, t, rt){ clockHands(k, 134, 39, 6, rt.now()); if (((t / 97) | 0) % 53 === 0) { k.R(51, 19, 3, 3, '#c9b77a'); } },
  intern: [{ pose:'reach', obj:'letter', dur:2600, at:[40, 68] }, { walk:[118, 64] }, { pose:'type', dur:2800 }, { walk:[40, 68] }],
  crew: [
    { rank:1, seed:11, script:[{ pose:'reach', obj:'letter', dur:2400, at:[60, 67] }, { pose:'idle', dur:1200 }, { walk:[118, 64] }, { pose:'type', dur:2400 }, { walk:[60, 67] }] },
    { rank:0, seed:23, script:[{ walk:[150, 95], pose:'box', from:[56, 95] }, { pose:'idle', dur:1400 }, { walk:[60, 95], pose:'box' }, { pose:'idle', dur:1600 }] }
  ]
};

/* 1 · intern: the copy room */
DEFS[1] = {
  shell: { ceil:'#20263f', wall:'#cdb991', wain:'#b9a37a', wainY:34, rail:'#a08a60', base:'#7a6a50', floor:{ type:'carpetTile', c:'#71748a', c2:'#686b81', line:'#5f6278', step:30 } },
  back(k, rt){
    const { R, P, D, T } = k, rng = mulberry(9);
    fluor(k, 26, 40, '#cdb991'); fluor(k, 122, 40, '#cdb991');
    R(12, 9, 90, 10, '#fbf4e2'); R(12, 9, 90, 1, '#ffffff'); R(12, 18, 90, 1, '#d9c9a5'); R(14, 8, 3, 2, '#e8e0c8'); R(97, 8, 3, 2, '#e8e0c8');
    T('WELCOME INTERNS', 57, 11, '#c8463d', { align: 'center' });
    frameBox(k, 12, 22, 46, 26, '#8a5a32', '#c48a52'); D(13, 23, 44, 24, '#b07a45', 0.3);
    const notes = ['#f2e27a', '#f2a8b8', '#a8d0f2', '#fbf4e2', '#b8e0a8', '#f2e27a'];
    for (let i = 0; i < 7; i++) { const nx = 15 + (i % 4) * 10 + (rng() * 3 | 0), ny = 25 + (i / 4 | 0) * 11 + (rng() * 2 | 0); R(nx, ny, 7, 7, notes[i % notes.length]); R(nx, ny + 6, 7, 1, shade(notes[i % notes.length], -0.2)); R(nx + 1, ny + 2, 5, 1, '#9a8c6c'); R(nx + 1, ny + 4, 3, 1, '#9a8c6c'); P(nx + 3, ny, '#c8463d'); }
    windowAt(k, rt, 122, 14, 44, 26, { frame:'#8f7a55', level:1, mull:[21], blinds:7, sill:'#a8915f', seed:41 });
    plant(k, 158, 42, 8, { type:'dead', pot:'#8a6a4a' });
    R(106, 22, 10, 1, '#5c6680'); P(108, 23, '#5c6680'); P(113, 23, '#5c6680');
    R(106, 24, 6, 13, '#c9a77a'); R(106, 24, 6, 1, '#dcbf94'); R(105, 26, 1, 9, '#a3824f'); R(111, 26, 1, 10, '#a3824f'); R(112, 24, 4, 9, '#3f6fd1'); R(112, 24, 4, 1, '#6b8fe0');
    // copier
    R(62, 29, 38, 3, '#8a93a8'); R(62, 29, 38, 1, '#a3abc0');
    R(62, 32, 38, 4, '#e6eaf2'); R(62, 32, 38, 1, '#ffffff'); R(86, 33, 12, 2, '#3a4152'); P(88, 33, '#3f9a68');
    R(62, 36, 38, 24, '#c3cad8'); R(62, 36, 1, 24, '#d6dce8'); R(99, 36, 1, 24, '#9aa3b8');
    for (const yy of [44, 51]) { R(64, yy, 34, 1, '#9aa3b8'); R(78, yy + 2, 6, 1, '#7d87a3'); }
    R(62, 59, 38, 3, '#5c6680'); R(57, 39, 6, 2, '#8a93a8'); R(56, 41, 7, 1, '#5c6680');
    // water cooler
    R(172, 24, 12, 12, '#7fb8d8'); R(173, 24, 3, 12, '#b8e0f0'); R(172, 24, 12, 1, '#cfeaf5'); R(175, 22, 6, 2, '#5c8fb0');
    R(170, 36, 16, 25, '#e6eaf2'); R(170, 36, 16, 1, '#ffffff'); R(185, 36, 1, 25, '#b7bfd3'); R(174, 42, 2, 2, '#3f6fd1'); R(180, 42, 2, 2, '#c8463d'); R(173, 46, 10, 1, '#9aa3b8'); R(170, 60, 16, 2, '#9aa3b8');
    R(187, 30, 3, 12, '#cfd6e6'); R(187, 30, 3, 1, '#ffffff');
    pool(k, 46, 66, 34, 6, '#7a7d93', 0.45); pool(k, 142, 66, 34, 6, '#7a7d93', 0.45);
  },
  layers: [
    { y: 94, draw(k){
      const { R } = k;
      R(112, 72, 64, 3, '#c3cad8'); R(112, 72, 64, 1, '#e6eaf2'); R(111, 75, 66, 2, '#8a93a8');
      for (const lx of [116, 170]) { R(lx, 77, 2, 17, '#5c6680'); } k.L(117, 80, 171, 92, '#4d5675'); k.L(171, 80, 117, 92, '#4d5675');
      laptopBack(k, 128, 63, 18); mug(k, 152, 68); papers(k, 160, 70, 9); R(119, 70, 6, 2, '#f2e27a');
    } }
  ],
  fxBack(k, t, rt){
    const { R, P } = k, cyc = t % 2600, n = ((t / 2600) | 0) % 5;
    for (let i = 0; i < n; i++) R(57, 38 - i, 6, 1, i & 1 ? '#efe6cf' : '#fbf4e2');
    if (cyc < 420) { const x = Math.round(62 - (cyc / 420) * 5); R(x, 37 - n, 6, 1, '#ffffff'); }
    const jam = ((t / 9000) | 0) % 3 === 2;
    P(91, 33, jam && (t % 500) < 250 ? '#ff6b5e' : '#5a2a2a'); P(88, 33, jam ? '#2a4a3a' : '#7fd19b');
    const b = (t % 3200) / 3200; if (b < 0.6) { const by = Math.round(34 - b / 0.6 * 9); P(178, by, '#e6f6ff'); P(177, by + 1, '#cfeaf5'); }
    P(137, 67, (t % 2400) < 1600 ? '#f2c14e' : '#c9952f');
  },
  intern: [{ pose:'idle', dur:1800, at:[110, 66] }, { pose:'sip', obj:'mug', dur:1600 }, { walk:[137, 74] }, { pose:'type', dur:3200 }, { walk:[110, 66] }],
  crew: [
    { rank:1, seed:31, script:[{ pose:'idle', dur:2400, at:[110, 66] }, { pose:'sip', obj:'mug', dur:1400 }, { walk:[50, 70] }, { pose:'idle', dur:1500 }, { walk:[110, 66] }] },
    { rank:1, seed:44, script:[{ pose:'type', dur:3400, at:[146, 74] }, { pose:'idle', dur:1200 }] }
  ]
};

/* 2 · junior analyst */
DEFS[2] = {
  shell: { ceil:'#1f2640', wall:'#c2b08c', wain:'#a8966f', wainY:38, base:'#6e5c40', wainPanels:true, floor:{ type:'carpet', c:'#3d4e7c', c2:'#364673', c3:'#4a5c8c' } },
  back(k, rt){
    const { R, P, D, T } = k;
    fluor(k, 30, 36, '#c2b08c'); fluor(k, 128, 36, '#c2b08c');
    frameBox(k, 18, 12, 48, 28, '#2b3150', '#08140e'); R(40, 40, 4, 3, '#2b3150'); R(36, 43, 12, 1, '#3a4152');
    frameBox(k, 72, 14, 26, 24, '#2a1d0f', '#13301f');
    T('UP', 85, 17, '#7fd19b', { align: 'center' }); T('ONLY', 85, 27, '#f4ead5', { align: 'center' });
    R(77, 18, 1, 5, '#7fd19b'); P(76, 19, '#7fd19b'); P(78, 19, '#7fd19b');
    windowAt(k, rt, 106, 11, 78, 34, { frame:'#8f7a55', level:2, mull:[25, 51], sill:'#a8915f', seed:52 });
    R(98, 42, 1, 1, '#f2e27a');
    pool(k, 48, 66, 32, 6, '#45578a', 0.45); pool(k, 146, 66, 32, 6, '#45578a', 0.45);
  },
  layers: [
    { y: 92, draw(k){
      const { R, P } = k;
      deskBlock(k, 40, 70, 84, 5, 13, { top:'#b87547', front:'#7a4128', panels:28, knob:'#c9952f' });
      laptopBack(k, 70, 61, 20);
      R(110, 58, 9, 3, '#2f7a52'); R(109, 61, 11, 1, '#1f5a3a'); R(113, 62, 1, 7, '#c9952f'); R(110, 69, 7, 1, '#c9952f'); R(111, 61, 7, 1, '#fff2c4');
      mug(k, 52, 66, '#c8463d'); papers(k, 96, 68, 9);
      R(44, 66, 5, 4, '#b5584a'); R(45, 63, 1, 3, '#3f9a68'); R(47, 62, 1, 4, '#7fd19b'); P(43, 64, '#3f9a68');
    } },
    { y: 102, draw(k){ plant(k, 170, 102, 22, { pot:'#b5584a', seed:7 }); } }
  ],
  fxBack(k, t, rt){ screenChart(k, 19, 13, 46, 26, t, 21, 'line'); k.P(80, 65, (t % 2600) < 1800 ? '#f2c14e' : '#c9952f'); },
  intern: [{ pose:'type', dur:3200, at:[80, 72] }, { pose:'idle', dur:1500 }, { walk:[144, 63] }, { pose:'idle', dur:2400 }, { walk:[80, 72] }, { pose:'type', dur:2600 }],
  crew: [
    { rank:2, seed:61, script:[{ pose:'type', dur:3600, at:[84, 72] }, { pose:'sip', obj:'mug', dur:1400 }] },
    { rank:2, seed:62, script:[{ pose:'idle', dur:2600, at:[150, 63] }, { pose:'sip', obj:'phone', dur:2400 }] }
  ]
};

/* 3 · analyst: the trading floor */
DEFS[3] = {
  shell: { ceil:'#141c2c', wall:'#2f5446', wain:'#284a3c', wainY:46, base:'#1a2a22', floor:{ type:'carpetTile', c:'#24322c', c2:'#202d27', line:'#1b2621', step:24 } },
  back(k, rt){
    const { R } = k;
    R(5, 9, 182, 11, '#05090a'); R(5, 9, 182, 1, '#c9952f'); R(5, 19, 182, 1, '#8a6220'); R(4, 9, 1, 11, '#8a6220'); R(187, 9, 1, 11, '#8a6220');
    for (const sx of [12, 72, 134]) frameBox(k, sx, 23, 46, 22, '#1a1f2e', '#06100b');
    for (const sx of [33, 93, 155]) R(sx, 45, 4, 2, '#1a1f2e');
    pendant(k, 40, 2, '#2f5446', { shade:'#c9952f', cone:false }); pendant(k, 152, 2, '#2f5446', { shade:'#c9952f', cone:false });
  },
  layers: [
    { y: 96, draw(k){
      const { R, P } = k;
      deskBlock(k, 6, 76, 180, 4, 13, { top:'#6a4430', front:'#3c271b', trim:'#8a6220', panels:30, knob:'#c9952f' });
      for (const dx of [50, 98, 146]) { R(dx, 63, 2, 13, '#4f7486'); R(dx, 63, 2, 1, '#8fb8c8'); }
      for (const lx of [18, 64, 112, 158]) laptopBack(k, lx, 67, 18);
      for (const px of [40, 88, 136]) { R(px, 73, 6, 3, '#1a1f2e'); R(px + 1, 72, 4, 1, '#2b3150'); }
      for (const mx of [10, 180]) mug(k, mx, 72); papers(k, 128, 74, 7);
    } }
  ],
  fxBack(k, t, rt){
    ticker(k, 6, 11, 180, t, rt.ticker);
    screenChart(k, 13, 24, 44, 20, t, 31, 'candles');
    screenChart(k, 73, 24, 44, 20, t, 32, 'line');
    screenChart(k, 135, 24, 44, 20, t, 33, 'heat');
  },
  fxFront(k, t){ for (const [px, ph] of [[42, 0], [90, 1], [138, 2]]) if (((t / 700) + ph) % 5 < 1) k.P(px + 4, 73, '#ff6b5e'); for (const lx of [18, 64, 112, 158]) k.P(lx + 9, 70, (t % 2600) < 1800 ? '#f2c14e' : '#c9952f'); },
  intern: [{ pose:'type', dur:3000, at:[73, 78] }, { pose:'idle', dur:1600 }, { pose:'type', dur:2400 }, { pose:'sip', obj:'mug', dur:1400 }],
  internSlot: 1,
  crew: [
    { rank:3, seed:71, script:[{ pose:'type', dur:2600, at:[27, 78] }, { pose:'cheer', dur:900 }, { pose:'type', dur:3400 }, { pose:'sip', obj:'phone', dur:2200 }] },
    { rank:3, seed:72, script:[{ pose:'type', dur:3000, at:[73, 78] }, { pose:'sip', obj:'mug', dur:1500 }] },
    { rank:3, seed:73, script:[{ pose:'sip', obj:'phone', dur:2600, at:[121, 78] }, { pose:'type', dur:3000 }] },
    { rank:3, seed:74, script:[{ pose:'type', dur:3400, at:[167, 78] }, { pose:'idle', dur:1200 }, { pose:'cheer', dur:800 }, { pose:'type', dur:2000 }] }
  ],
  crewAlways: true
};

/* 4 · associate */
DEFS[4] = {
  shell: { ceil:'#1c2238', wall:'#93a0b6', wain:'#808ca4', wainY:40, base:'#4a5372', floor:{ type:'carpetTile', c:'#4f5a7b', c2:'#4a5473', line:'#444e6c', step:28 } },
  back(k, rt){
    const { R, P, D, T, L } = k;
    fluor(k, 24, 44, '#93a0b6');
    frameBox(k, 10, 11, 72, 33, '#a3b0c8', '#eef1f5'); R(10, 44, 72, 2, '#7d87a3'); R(20, 43, 4, 1, '#c8463d'); R(26, 43, 4, 1, '#3f6fd1'); R(32, 43, 4, 1, '#3f9a68');
    T('PAPER PNL', 14, 14, '#2b3a67');
    const pts = [[14, 38], [22, 35], [30, 36], [38, 30], [46, 32], [54, 26], [62, 27], [70, 21], [78, 18]];
    for (let i = 0; i < pts.length - 1; i++) L(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], i >= pts.length - 3 ? '#3f9a68' : '#3f6fd1');
    T('+4.2%', 52, 33, '#3f9a68'); L(14, 40, 78, 40, '#9aa5c7'); L(14, 24, 14, 40, '#9aa5c7');
    wallClock(k, 89, 22, 5);
    R(96, 8, 92, 46, '#7c889f'); R(96, 8, 92, 2, '#a3b0c8');
    frameBox(k, 126, 14, 30, 16, '#2b3150', '#1d2a4a');
    deskBlock(k, 108, 38, 70, 3, 6, { top:'#c3cad8', front:'#8a93a8' });
    for (const hx of [116, 134, 158, 170]) { k.ell(hx, 33, 3, 3, ['#4f2e19', '#2a1d18', '#c58b3f', '#1d1d26'][hx % 4]); R(hx - 3, 35, 7, 3, ['#3d4f7d', '#f3efe6', '#6b3a4a', '#dfe8f5'][hx % 4]); }
    for (let y = 10; y < 54; y++) for (let x = 96; x < 188; x++) if (((x + y) % 23) < 6 && dith(x, y, 0.35)) P(x, y, '#d6e8f2');
    for (const mx of [96, 119, 142, 165, 187]) { R(mx, 8, 1, 46, '#a3b0c8'); }
    pool(k, 46, 66, 36, 6, '#59648a', 0.45);
  },
  layers: [
    { y: 96, draw(k){
      const { R } = k;
      R(122, 70, 52, 3, '#c3cad8'); R(122, 70, 52, 1, '#e6eaf2'); R(121, 73, 54, 2, '#8a93a8');
      R(146, 75, 4, 19, '#5c6680'); R(140, 94, 16, 2, '#4d5675');
      laptopBack(k, 138, 61, 18); mug(k, 160, 66);
    } },
    { y: 104, draw(k){ plant(k, 12, 104, 18, { type:'snake', pot:'#3a4152' }); } }
  ],
  fxBack(k, t, rt){
    clockHands(k, 89, 22, 5, rt.now());
    const a = (t / 1600) % (Math.PI * 2);
    k.ell(141, 22, 5, 5, '#3f6fd1'); for (let i = 0; i < 20; i++) { const ang = a + i * 0.08; k.P(Math.round(141 + Math.cos(ang) * 3), Math.round(22 + Math.sin(ang) * 3), '#7fd19b'); }
  },
  intern: [{ pose:'point', dur:2600, at:[92, 68], flip:true }, { pose:'idle', dur:1500 }, { walk:[148, 74] }, { pose:'type', dur:2600 }, { walk:[92, 68] }],
  crew: [
    { rank:4, seed:81, script:[{ pose:'type', dur:3000, at:[150, 74] }, { pose:'sip', obj:'mug', dur:1500 }] },
    { rank:4, seed:82, script:[{ pose:'point', dur:2800, at:[92, 68], flip:true }, { pose:'idle', dur:1600 }] }
  ]
};

/* 5 · VP: the glass office */
DEFS[5] = {
  shell: { ceil:'#151c38', wall:'#33467a', stripes:'#2d3f6f', wain:'#2b3c6a', wainY:42, rail:'#c9952f', base:'#1d2747', floor:{ type:'planks', c:'#5a2a20', c2:'#4e241b', line:'#41201a', step:14, seed:5 } },
  back(k, rt){
    const { R, P, D, T } = k;
    windowAt(k, rt, 92, 10, 92, 38, { frame:'#c9952f', level:5, mull:[30, 60], trans:[9], sill:'#8a6220', seed:55, moon:[70, 4] });
    frameBox(k, 14, 13, 30, 22, '#2a1d0f', '#c9952f'); R(16, 15, 26, 18, '#f4ead5');
    T('VP', 29, 17, '#5c3f12', { align: 'center' }); R(19, 27, 20, 1, '#9a8c6c'); R(21, 29, 16, 1, '#9a8c6c'); k.ell(37, 30, 2, 2, '#c8463d');
    plant(k, 8, 60, 20, { pot:'#2b3150', seed:3 });
    R(52, 30, 26, 26, '#3a4152'); R(52, 30, 26, 1, '#5c6680'); R(53, 32, 24, 22, '#2e3442'); R(53, 32, 24, 1, '#4a5162');
    k.ell(63, 42, 4, 4, '#8a93a8'); k.ell(63, 42, 2, 2, '#5c6680'); P(63, 38, '#e6eaf2'); R(70, 41, 4, 2, '#c9952f'); R(52, 55, 26, 2, '#1a1e28');
    pendant(k, 70, 4, '#33467a', { shade:'#c9952f' });
    for (let y = 70; y < 102; y++) { const s = (y - 70) * 0.4, x0 = Math.round(40 - s), x1 = Math.round(152 + s); R(x0, y, x1 - x0, 1, (y === 70 || y === 101) ? '#c9952f' : '#7f2620'); }
    for (let y = 73; y < 99; y += 3) { const s = (y - 70) * 0.4; for (let x = Math.round(44 - s); x < 148 + s; x += 6) P(x + (y % 6 ? 3 : 0), y, '#a8452f'); }
    for (let y = 71; y < 101; y++) { const s = (y - 70) * 0.4; P(Math.round(42 - s), y, '#c9952f'); P(Math.round(150 + s), y, '#c9952f'); }
  },
  layers: [
    { y: 94, draw(k){
      const { R, P, T } = k;
      R(116, 52, 18, 20, '#3a1f14'); R(116, 52, 18, 1, '#5a2f1e'); for (let y = 55; y < 70; y += 4) for (let x = 119; x < 132; x += 4) P(x, y, '#2a140d');
      deskBlock(k, 50, 70, 92, 6, 15, { top:'#9a5b3c', front:'#6e3b26', trim:'#c9952f', panels:30, knob:'#c9952f' });
      R(56, 59, 11, 3, '#2f7a52'); R(55, 62, 13, 1, '#1f5a3a'); R(61, 63, 1, 6, '#c9952f'); R(57, 69, 9, 1, '#c9952f'); R(57, 62, 9, 1, '#fff2c4');
      R(92, 61, 22, 10, '#c9952f'); R(92, 61, 22, 1, '#ffe08a'); R(92, 70, 22, 1, '#8a6220'); T('VP', 103, 63, '#2a1d0f', { align: 'center' });
      papers(k, 122, 67, 10); R(80, 68, 8, 1, '#f2c14e');
    } }
  ],
  fxBack(k, t, rt){ if (rt.tod !== 'day') for (let i = 0; i < 4; i++) { const ph = (t / 900 + i * 1.7) % 4; if (ph < 0.4) k.P(100 + i * 21, 40 - i * 3, '#ffe9a8'); } },
  fxFront(k, t, rt){
    for (const a of rt.actors) if ((a.ov ? a.ov.pose : a.pose) === 'reach') { const sx = Math.round(a.x + (a.flip ? -6 : 6)), sy = Math.round(a.y - 28); const ph = (t / 140 | 0) % 4; const c = ph < 2 ? '#fff4cf' : '#f2c14e'; k.P(sx, sy - 2 - ph, c); k.P(sx - 2 - (ph & 1), sy, c); k.P(sx + 3, sy + 1 + (ph & 1), c); }
  },
  intern: [{ pose:'reach', obj:'card', dur:2400, at:[84, 72] }, { pose:'idle', dur:1800 }, { walk:[148, 64] }, { pose:'idle', dur:2600 }, { pose:'sip', obj:'mug', dur:1600 }, { walk:[84, 72] }],
  crew: [
    { rank:5, seed:91, script:[{ pose:'idle', dur:3000, at:[84, 72] }, { pose:'sip', obj:'phone', dur:2200 }] },
    { rank:5, seed:92, script:[{ pose:'sip', obj:'mug', dur:2400, at:[160, 64] }, { pose:'idle', dur:2000 }] }
  ]
};

/* 6 · managing director: wood and fire */
DEFS[6] = {
  shell: { ceil:'#1a1210', wall:'#6c3a25', panels:true, wain:'#5a2f1e', wainY:40, rail:'#c9952f', base:'#2a140d', wainPanels:true, floor:{ type:'planks', c:'#4a2418', c2:'#42200f', line:'#361a10', step:12, seed:9 } },
  back(k, rt){
    const { R, P, D } = k, rng = mulberry(13);
    R(4, 9, 50, 47, '#2a140d'); R(4, 9, 50, 2, '#5a2f1e');
    for (const sy of [21, 32, 43, 54]) { R(5, sy, 48, 2, '#5a2f1e'); R(5, sy, 48, 1, '#7a4128'); }
    for (const sy of [21, 32, 43, 54]) { let x = 6; while (x < 51) { const w = 2 + (rng() * 2 | 0), h = 6 + (rng() * 4 | 0), c = ['#7f2620', '#2b3a67', '#2f7a52', '#c9952f', '#e6d8b8', '#5a2f6e', '#3a4152'][rng() * 7 | 0]; if (rng() < 0.08) { x += 3; continue; } R(x, sy - h, w, h, c); R(x, sy - h, w, 1, shade(c, 0.25)); if (h > 7) P(x, sy - h + 2, '#f2c14e'); x += w; } }
    k.ell(30, 26, 0, 0, '#000');
    frameBox(k, 80, 9, 36, 16, '#c9952f', '#3a6a8a');
    R(81, 10, 34, 6, '#6a9ac0'); R(81, 16, 34, 4, '#3f7a52'); R(81, 20, 34, 4, '#2f5a3a'); k.ell(106, 14, 2, 2, '#ffe9a8'); for (let x = 81; x < 115; x++) { const hgt = Math.round(3 + Math.sin(x * 0.3) * 2); R(x, 20 - hgt, 1, hgt, '#4c7a4a'); }
    R(70, 26, 56, 3, '#e6ddce'); R(70, 26, 56, 1, '#fffaf0'); R(70, 28, 56, 1, '#b9ae9e');
    R(74, 29, 48, 27, '#b9ae9e'); D(74, 29, 48, 27, '#cfc5b6', 0.2); R(74, 29, 1, 27, '#d8cfc0'); R(121, 29, 1, 27, '#8a7d6e');
    R(84, 36, 28, 20, '#140a08'); R(84, 36, 28, 1, '#2a140d'); R(86, 52, 24, 2, '#3a2a20');
    R(80, 22, 2, 4, '#c9952f'); R(114, 22, 2, 4, '#c9952f'); R(95, 22, 6, 4, '#2a1d0f'); P(97, 23, '#f4ead5');
    windowAt(k, rt, 162, 11, 22, 36, { frame:'#4a2418', level:6, trans:[12], seed:66 });
    R(156, 9, 6, 44, '#7f2620'); R(184, 9, 6, 44, '#7f2620'); D(156, 9, 6, 44, '#5a1a14', 0.4); D(184, 9, 6, 44, '#5a1a14', 0.4); R(154, 8, 38, 2, '#c9952f');
    R(60, 40, 1, 16, '#c9952f'); R(57, 55, 7, 2, '#8a6220'); k.ell(60, 36, 5, 5, '#2b5a8a'); for (let i = 0; i < 9; i++) P(57 + (i % 5), 33 + (i * 3 % 7), '#3f9a68'); k.ring(60, 36, 5.6, 5.6, '#c9952f', 0.12);
    for (let y = 70; y < 100; y++) { const s = (y - 70) * 0.35, x0 = Math.round(52 - s), x1 = Math.round(140 + s); R(x0, y, x1 - x0, 1, (y === 70 || y === 99) ? '#c9952f' : '#173f2c'); }
  },
  layers: [
    { y: 98, draw(k){
      const { R, P } = k;
      R(128, 70, 58, 13, '#5a1e14'); R(128, 70, 58, 1, '#7a3020'); for (let y = 73; y < 82; y += 4) for (let x = 132; x < 184; x += 5) P(x + (y % 8 ? 2 : 0), y, '#3e140d');
      R(124, 74, 8, 18, '#6e2a1c'); R(182, 74, 8, 18, '#6e2a1c'); R(124, 74, 8, 1, '#8a3a26'); R(182, 74, 8, 1, '#8a3a26');
      R(130, 82, 54, 6, '#6e2a1c'); R(130, 82, 54, 1, '#8a3a26'); R(126, 88, 62, 6, '#4a1810'); R(128, 94, 3, 3, '#2a140d'); R(183, 94, 3, 3, '#2a140d');
    } }
  ],
  fxBack(k, t, rt){
    const { R, P, D } = k;
    for (let x = 0; x < 24; x++) {
      const h = Math.max(2, Math.round(7 + Math.sin(t * 0.009 + x * 0.9) * 3 + Math.sin(t * 0.017 + x * 2.3) * 2));
      for (let y = 0; y < h; y++) { const f = y / h; P(86 + x, 52 - y, f > 0.75 ? '#e0533f' : f > 0.45 ? '#ff9a3c' : f > 0.2 ? '#ffd27a' : '#fff0c2'); }
    }
    R(88, 52, 20, 2, '#5a2a14'); P(92, 52, '#ff9a3c'); P(101, 53, '#ff9a3c');
    const fl = 0.18 + Math.sin(t * 0.011) * 0.05; D(78, 58, 40, 8, '#7a3a20', fl);
  },
  intern: [{ pose:'sip', obj:'mug', dur:2600, at:[134, 66] }, { pose:'idle', dur:2000 }, { walk:[70, 66] }, { pose:'idle', dur:1800 }, { walk:[134, 66] }],
  extra: [{ rank:0, hair:'blond', script:[{ walk:[40, 84], from:[20, 84] }, { pose:'idle', dur:1500 }, { walk:[118, 72] }, { pose:'idle', dur:2200 }, { walk:[40, 84] }] }],
  crew: [
    { rank:6, seed:101, script:[{ pose:'sip', obj:'mug', dur:3000, at:[132, 66] }, { pose:'idle', dur:2000 }] },
    { rank:6, seed:102, script:[{ pose:'idle', dur:2400, at:[66, 70] }, { pose:'sip', obj:'phone', dur:2600 }] }
  ]
};

/* 7 · CEO: the penthouse */
DEFS[7] = {
  shell: { ceil:'#0f1a16', wall:'#1f4a3a', base:'#0f241c', floor:{ type:'checker', c:'#1b2f29', c2:'#243b31', line:'#152620', step:22 } },
  back(k, rt){
    const { R, P, D } = k;
    windowAt(k, rt, 2, 9, 188, 43, { frame:'#c9952f', level:7, mull:[30, 61, 92, 123, 154], trans:[8], seed:77, moon:[150, 18] });
    R(0, 52, RW, 2, '#c9952f'); R(0, 53, RW, 1, '#8a6220');
    for (let x = 6; x < RW; x += 31) for (let y = 60; y < 104; y++) if (dith(x + (y >> 2), y, 0.18 * (1 - (y - 60) / 44))) P(x + ((y - 60) >> 3), y, '#3a5a4c');
    frameBox(k, 10, 18, 44, 28, '#1a1f2e', '#06100b'); R(30, 46, 4, 18, '#2a2f45'); R(24, 64, 16, 2, '#1a1f2e');
    R(160, 38, 28, 2, '#c9952f'); R(160, 52, 28, 2, '#c9952f'); R(160, 66, 28, 2, '#c9952f'); R(160, 38, 1, 30, '#8a6220'); R(187, 38, 1, 30, '#8a6220');
    for (const [bx, c] of [[163, '#3f9a68'], [168, '#7f2620'], [173, '#c9952f'], [178, '#e6eaf2']]) { R(bx, 44, 3, 8, c); R(bx + 1, 42, 1, 2, c); R(bx, 44, 1, 8, shade(c, 0.3)); }
    R(170, 58, 6, 4, '#f2c14e'); R(168, 56, 10, 2, '#f2c14e'); R(172, 62, 2, 2, '#c9952f'); R(170, 64, 6, 2, '#c9952f'); P(169, 57, '#fff4cf');
    plant(k, 148, 70, 20, { type:'palm', pot:'#c9952f' });
  },
  layers: [
    { y: 96, draw(k){
      const { R, P, T } = k;
      deskBlock(k, 62, 72, 88, 5, 16, { top:'#2a140d', front:'#3a1f14', trim:'#c9952f', panels:22, knob:'#f2c14e' });
      R(61, 72, 90, 1, '#c9952f');
      laptopBack(k, 96, 63, 20, '#f2c14e');
      R(70, 63, 20, 9, '#c9952f'); R(70, 63, 20, 1, '#ffe08a'); R(70, 71, 20, 1, '#8a6220'); T('CEO', 80, 64, '#2a1d0f', { align: 'center' });
      R(126, 68, 3, 4, '#f2c14e'); R(126, 67, 3, 1, '#ffe08a'); papers(k, 134, 70, 9);
    } }
  ],
  fxBack(k, t, rt){ screenChart(k, 11, 19, 42, 26, t, 41, 'candles'); },
  intern: [{ pose:'sip', obj:'phone', dur:3200, at:[106, 74] }, { pose:'cheer', dur:1000 }, { pose:'idle', dur:1800 }, { walk:[168, 70] }, { pose:'sip', obj:'phone', dur:2600 }, { walk:[106, 74] }],
  crew: []
};

/* R · the roof */
DEFS[8] = {
  roof: true,
  back(k, rt){
    const { R, P, D, T, g, ox, oy } = k, Tt = TOD[rt.tod] || TOD.night;
    vgrad(g, ox, oy, RW, 52, Tt.sky.slice(0, 5));
    const rng = mulberry(88);
    if (Tt.stars > 0) for (let i = 0; i < 70 * Tt.stars; i++) P(rng() * RW | 0, rng() * 40 | 0, rng() < 0.2 ? '#c9d2ff' : '#3a4580');
    if (Tt.moon) drawMoon(g, ox + 120, oy + 16);
    g.save(); g.beginPath(); g.rect(ox, oy, RW, 52); g.clip(); paintSkyline(g, ox - 4, RW + 8, oy + 52, 91, rt.tod, null, { heightScale: 0.22 }); g.restore();
    R(0, 44, RW, 14, '#3d3d60'); R(0, 44, RW, 2, '#c9952f'); R(0, 46, RW, 1, '#8a6220'); for (let x = 0; x < RW; x += 12) R(x, 47, 1, 11, '#34345a');
    floorPlane(k, { type:'gravel', c:'#2c2c3e', c2:'#36364c', c3:'#24243a' });
    R(144, 6, 22, 30, '#4a3424'); for (let y = 10; y < 36; y += 6) R(144, y, 22, 1, '#2a1d14'); R(142, 4, 26, 3, '#3a2a1e'); R(154, 0, 2, 4, '#3a2a1e');
    for (const lx of [146, 154, 162]) R(lx, 36, 2, 10, '#2a2f45'); k.L(146, 44, 162, 38, '#2a2f45');
    for (let y = 2; y < 58; y++) { R(178, y, 1, 1, '#4d5675'); R(182, y, 1, 1, '#4d5675'); if (y % 6 === 0) k.L(178, y, 182, y + 6, '#3a4570'); }
    R(6, 22, 48, 36, '#5a3a3a'); for (let y = 24; y < 58; y += 4) for (let x = 6 + (y % 8 ? 0 : 4); x < 54; x += 8) R(x, y, 1, 3, '#4a2e2e'); for (let y = 25; y < 58; y += 4) R(6, y, 48, 1, '#4a2e2e');
    R(4, 20, 52, 3, '#3d3d60'); R(4, 20, 52, 1, '#55557a');
    R(22, 34, 16, 24, '#4d5675'); R(22, 34, 16, 1, '#7d87a3'); R(29, 34, 1, 24, '#3a4152'); R(25, 44, 3, 4, '#c9952f'); R(26, 42, 1, 2, '#8a6220');
    R(14, 25, 32, 8, '#120d1c'); R(14, 25, 32, 1, '#c8463d'); T('LOCKED', 30, 26, '#e0533f', { align: 'center' });
    const cx = 112, cy = 84;
    k.ring(cx, cy, 42, 14, '#8a6220', 0.06); k.ring(cx, cy, 38, 12.5, '#5c4a2a', 0.05);
    R(cx - 10, cy - 6, 3, 12, '#8a6220'); R(cx + 7, cy - 6, 3, 12, '#8a6220'); R(cx - 7, cy - 1, 14, 2, '#8a6220');
  },
  layers: [
    { y: 102, draw(k){ const { R, T } = k; R(62, 86, 22, 16, '#7a5a32'); R(62, 86, 22, 1, '#9a7a4a'); R(62, 93, 22, 1, '#5a3a20'); R(62, 86, 1, 16, '#5a3a20'); R(83, 86, 1, 16, '#5a3a20'); k.L(62, 86, 83, 101, '#5a3a20'); T('???', 73, 90, '#f2c14e', { align: 'center' }); } },
    { y: 92, draw(k){ const { R } = k; R(160, 70, 28, 20, '#5c6680'); R(160, 70, 28, 1, '#8a93a8'); for (let x = 163; x < 186; x += 3) R(x, 73, 1, 13, '#3a4152'); R(162, 90, 4, 2, '#2a2f45'); R(182, 90, 4, 2, '#2a2f45'); } }
  ],
  fxBack(k, t, rt){
    const { P } = k;
    P(180, 1, (t % 1400) < 500 ? '#ff4d3d' : '#4a1a14');
    for (const [lx, ly] of [[72, 82], [152, 82], [112, 72], [112, 97]]) P(lx, ly, (t % 1800) < 900 ? '#7fd19b' : '#1f4a3a');
    for (let i = 0; i < 3; i++) { const px = 66 + i * 30, f = ((t / 600 + i * 1.3) | 0) % 3 === 0 ? 'peck' : 'sit'; drawPigeon(k.g, k.ox + px, k.oy + 39, f, i === 1); }
  }
};

/* ---------- chart, ticker helpers ---------- */
function screenChart(k, x, y, w, h, t, seed, style, label){
  const { R, P, L, T } = k;
  for (let gx = x + 6; gx < x + w; gx += 8) R(gx, y, 1, h, '#0f1f17');
  for (let gy = y + 4; gy < y + h; gy += 6) R(x, gy, w, 1, '#0f1f17');
  if (style === 'line') {
    const n = w - 2, rev = Math.floor(t / 90) % (n + 30), rng = mulberry(seed); let v = h * 0.75; const pts = [];
    for (let i = 0; i < n; i++) { v += (rng() - 0.42) * 2.2; v = clamp(v, 4, h - 2); pts.push(v); }
    const m = Math.min(n, rev);
    for (let i = 1; i < m; i++) L(x + 1 + i - 1, y + Math.round(pts[i - 1]), x + 1 + i, y + Math.round(pts[i]), '#7fd19b');
    if (m > 1 && (t % 600) < 400) P(x + m, y + Math.round(pts[m - 1]), '#ffffff');
  } else if (style === 'candles') {
    const off = Math.floor(t / 700);
    let base = h * 0.6;
    for (let i = 0; i < Math.floor((w - 2) / 3); i++) {
      const r1 = mulberry(seed * 1000 + i + off)(), r2 = mulberry(seed * 2000 + i + off)();
      const up = r1 < 0.62, body = 2 + (r2 * 5 | 0), mid = clamp(Math.round(base - i * 0.35 + Math.sin((i + off) * 0.7) * 3), 3, h - 4);
      const cx = x + 2 + i * 3, c = up ? '#7fd19b' : '#ff6b5e';
      R(cx, y + mid - body, 2, body, c); R(cx, y + mid - body - 2, 1, 2, c); R(cx + 1, y + mid, 1, 2, shade(c, -0.3));
    }
  } else if (style === 'heat') {
    const off = Math.floor(t / 1200);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) { const r = mulberry(seed * 77 + i * 13 + j * 7 + ((i + j + off) % 4 === 0 ? off : 0))(); R(x + 2 + i * 8, y + 3 + j * 6, 7, 5, r < 0.6 ? (r < 0.3 ? '#2f7a52' : '#3f9a68') : (r < 0.8 ? '#a8452f' : '#7f2620')); }
  }
  if (label) T(label, x + 2, y + 1, '#2f7a52');
}
const DEFAULT_TICKER = [{ t:'$INTERN ▲ UP ONLY', c:'#7fd19b' }, { t:'COFFEE ▲ 4.2%', c:'#7fd19b' }, { t:'PRINTER ▼ JAMMED', c:'#ff6b5e' }, { t:'CHAIRS ▲ +1', c:'#7fd19b' }, { t:'SLEEP ▼ 61%', c:'#ff6b5e' }, { t:'MORNING NOTE 09:00', c:'#f2c14e' }];
function ticker(k, x, y, w, t, items){
  items = items || DEFAULT_TICKER;
  const { g, ox, oy } = k, sep = '  ·  ';
  const cycle = items.reduce((s, it) => s + textW(it.t + sep) + 1, 0);
  g.save(); g.beginPath(); g.rect(ox + x, oy + y, w, 7); g.clip();
  let xx = ox + x - Math.floor((t * 0.022) % cycle);
  for (let rep = 0; rep < 4 && xx < ox + x + w; rep++) for (const it of items) xx += ptext(g, it.t + sep, xx, oy + y, it.c) + 1;
  g.restore();
}

/* ---------- caching and dark (after hours) versions ---------- */
function darken(c, tod){
  const g = c.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  const day = tod === 'day', m = day ? [0.42, 0.46, 0.56] : [0.2, 0.24, 0.36], add = day ? [10, 14, 32] : [6, 10, 26];
  for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; a[i] = a[i] * m[0] + add[0]; a[i + 1] = a[i + 1] * m[1] + add[1]; a[i + 2] = a[i + 2] * m[2] + add[2]; }
  g.putImageData(d, 0, 0);
}
const cache = new Map();
function getRoom(L, dark, tod, ladder){
  const key = L + '|' + (dark ? 1 : 0) + '|' + tod + '|' + (ladder && ladder[L] ? ladder[L].at : '');
  if (cache.has(key)) return cache.get(key);
  const def = DEFS[L], rt = { tod, now: () => new Date() };
  const back = canvas(RW, RH), gb = ctx(back, true), k = kit(gb);
  if (def.shell) shell(k, def.shell);
  def.back(k, rt);
  const layers = (def.layers || []).map((ly) => { const c = canvas(RW, RH), gl = ctx(c, true); ly.draw(kit(gl), rt); return { y: ly.y, c }; });
  if (dark && !def.roof) {
    darken(back, tod); for (const ly of layers) darken(ly.c, tod);
    for (const w of k.windows) w.draw();
    if (tod !== 'day') for (const w of k.windows) for (let y = FLOOR_Y; y < Math.min(RH, FLOOR_Y + 34); y++) { const s = (y - FLOOR_Y) * 0.55; k.D(Math.round(w.x + s), y, w.w, 1, '#24345f', 0.32 * (1 - (y - FLOOR_Y) / 34)); }
    hangSign(k, (ladder || LADDER)[L].at);
  }
  const room = { back, layers };
  cache.set(key, room); return room;
}
function clearCache(){ cache.clear(); }

/* ---------- a live room: cached art + actors + animated details ---------- */
class RoomRT {
  constructor(L, mode, o = {}){
    this.L = L; this.mode = mode; this.tod = o.tod || 'night'; this.ladder = o.ladder || LADDER; this.ticker = o.ticker; this.now = o.now || (() => new Date());
    this.rng = o.rng || Math.random;
    this.actors = [];
    const def = DEFS[L];
    if (mode === 'locked' || def.roof) return;
    const lan = this.ladder[L] ? this.ladder[L].color : null;
    if (mode === 'current') {
      if (def.crewAlways) def.crew.forEach((c, i) => { if (i !== def.internSlot) this.actors.push(new Actor({ rank: c.rank, look: makeLook(c.seed), script: c.script, rng: this.rng, noProp: true, lanyard: lan })); });
      this.intern = new Actor({ rank: L, script: def.intern, rng: this.rng, pip: !!o.pip });
      this.actors.push(this.intern);
      for (const e of (def.extra || [])) this.actors.push(new Actor({ rank: e.rank, hair: e.hair, script: e.script, rng: this.rng }));
    } else {
      def.crew.forEach((c) => this.actors.push(new Actor({ rank: c.rank, look: makeLook(c.seed), script: c.script, rng: this.rng, noProp: true, lanyard: lan })));
    }
  }
  get dark(){ return this.mode === 'locked'; }
  update(dt){ for (const a of this.actors) a.update(dt); }
  draw(g, ox, oy, t){
    const def = DEFS[this.L], room = getRoom(this.L, this.dark, this.tod, this.ladder);
    g.drawImage(room.back, ox, oy);
    const k = kit(g, ox, oy);
    if (def.fxBack && !this.dark) def.fxBack(k, t, this);
    if (def.roof && def.fxBack) def.fxBack(k, t, this);
    const items = room.layers.map((ly) => ({ y: ly.y, c: ly.c })).concat(this.actors.map((a) => ({ y: a.y, a })));
    items.sort((p, q) => p.y - q.y);
    for (const it of items) { if (it.c) g.drawImage(it.c, ox, oy); else it.a.draw(g, ox, oy); }
    if (def.fxFront && !this.dark) def.fxFront(k, t, this);
  }
}

/* ---------- the ride: the building as a vertical strip ---------- */
const SHAFT = 26, WALL_R = 8, WORLD_W = SHAFT + RW + WALL_R, SLAB = 12, PITCH = RH + SLAB, CAR_W = 22, CAR_H = 42;
const roomTop = (L) => (8 - L) * PITCH;
class RideWorld {
  constructor(o = {}){ this.ladder = o.ladder || LADDER; this.tod = o.tod || 'night'; this.rank = o.rank || 0; this.pip = !!o.pip; this.ticker = o.ticker; this.rng = o.rng || Math.random; this.now = o.now; this.facade = null; this.build(); }
  modeFor(L){ if (L === 8) return 'roof'; if (L === this.rank) return 'current'; if (L < this.rank) return 'cleared'; return 'locked'; }
  build(){ this.rooms = []; for (let L = 0; L <= 8; L++) this.rooms.push(new RoomRT(L, this.modeFor(L), { tod: this.tod, ladder: this.ladder, ticker: this.ticker, rng: this.rng, pip: this.pip, now: this.now })); }
  setRank(r, pip){ if (r === this.rank && !!pip === this.pip) return; this.rank = r; this.pip = !!pip; this.build(); }
  setTod(t){ if (t === this.tod) return; this.tod = t; this.facade = null; this.build(); }
  get intern(){ const r = this.rooms[this.rank]; return r && r.intern; }
  update(dt, vis){ for (let L = 0; L <= 8; L++) if (!vis || vis.has(L)) this.rooms[L].update(dt); }
  visible(camFloor, vh){ const top = this.camTop(camFloor, vh), s = new Set(); for (let L = 0; L <= 8; L++) { const y = roomTop(L) - top; if (y < vh && y + PITCH > 0) s.add(L); } return s; }
  camTop(camFloor, vh){ return (8 - camFloor) * PITCH + RH / 2 - vh / 2; }
  facadeTile(){
    if (this.facade) return this.facade;
    const c = canvas(48, PITCH), g = ctx(c), T = TOD[this.tod] || TOD.night;
    g.fillStyle = '#141f45'; g.fillRect(0, 0, 48, PITCH); g.fillStyle = '#1b2852'; for (let x = 0; x < 48; x += 12) g.fillRect(x, 0, 1, PITCH);
    const rng = mulberry(19);
    for (let y = 10; y < PITCH - 10; y += 16) for (let x = 3; x < 48; x += 12) { g.fillStyle = '#0b1229'; g.fillRect(x, y, 7, 10); const lit = rng() < (T.win > 0 ? 0.35 : 0.08); g.fillStyle = lit ? (rng() < 0.5 ? '#e6a94a' : '#ffd27a') : '#1a2650'; g.fillRect(x + 1, y + 1, 5, 8); if (!lit) { g.fillStyle = '#25336a'; g.fillRect(x + 1, y + 1, 1, 8); } }
    g.fillStyle = '#c9952f'; g.fillRect(0, RH + 4, 48, 1); g.fillStyle = '#0e1633'; g.fillRect(0, RH + 5, 48, 7);
    this.facade = c; return c;
  }
  draw(g, vw, vh, camFloor, t, opts = {}){
    const top = this.camTop(camFloor, vh), x0 = vw >= WORLD_W + 4 ? Math.floor((vw - WORLD_W) / 2) : Math.round(vw / 2 - (SHAFT + RW / 2));
    const Tt = TOD[this.tod] || TOD.night;
    const skyEnd = clamp(Math.round(-top), 0, vh);
    if (skyEnd > 0) { vgrad(g, 0, 0, vw, skyEnd, Tt.sky.slice(0, 4)); }
    const tile = this.facadeTile();
    for (let wy = Math.floor(top / PITCH) * PITCH; wy < top + vh; wy += PITCH) {
      if (wy < 0 || wy >= 9 * PITCH) continue;
      for (let fx = x0 - 48; fx > -48; fx -= 48) g.drawImage(tile, fx, wy - top);
      for (let fx = x0 + WORLD_W; fx < vw; fx += 48) g.drawImage(tile, fx, wy - top);
    }
    const groundY = 9 * PITCH - top; if (groundY < vh) { g.fillStyle = Tt.ground || '#08070f'; g.fillRect(0, Math.max(0, groundY), vw, vh - Math.max(0, groundY)); g.fillStyle = '#141b36'; g.fillRect(x0, Math.max(0, groundY), WORLD_W, Math.min(6, vh)); }
    for (let L = 0; L <= 8; L++) {
      const ry = roomTop(L) - top; if (ry > vh || ry + PITCH < 0) continue;
      this.rooms[L].draw(g, x0 + SHAFT, Math.round(ry), t);
      const sy = Math.round(ry + RH);
      g.fillStyle = '#151d3e'; g.fillRect(x0, sy, WORLD_W, SLAB); g.fillStyle = '#c9952f'; g.fillRect(x0, sy, WORLD_W, 1); g.fillStyle = '#2a3866'; g.fillRect(x0, sy + 1, WORLD_W, 2); g.fillStyle = '#0e1633'; g.fillRect(x0, sy + SLAB - 2, WORLD_W, 2);
      for (let x = x0 + 4; x < x0 + WORLD_W - 4; x += 10) { g.fillStyle = '#1b2550'; g.fillRect(x, sy + 5, 6, 3); }
      g.fillStyle = '#22306a'; g.fillRect(x0 + SHAFT + RW, Math.round(ry), WALL_R, RH); g.fillStyle = '#3a4c8c'; g.fillRect(x0 + SHAFT + RW + 2, Math.round(ry), 1, RH); g.fillStyle = '#151d3e'; g.fillRect(x0 + SHAFT + RW, Math.round(ry), 1, RH);
      if (L === 8) { g.fillStyle = '#22306a'; g.fillRect(x0 + SHAFT + RW, Math.round(ry), WALL_R, 44); }
    }
    // shaft
    const shTop = Math.max(0, Math.round(roomTop(8) - top)), shBot = Math.min(vh, Math.round(9 * PITCH - top));
    if (shBot > shTop) {
      g.fillStyle = '#0b1229'; g.fillRect(x0, shTop, SHAFT, shBot - shTop);
      g.fillStyle = '#25336a'; g.fillRect(x0 + 2, shTop, 1, shBot - shTop); g.fillRect(x0 + SHAFT - 4, shTop, 1, shBot - shTop);
      g.fillStyle = '#1b2550'; g.fillRect(x0 + SHAFT - 2, shTop, 2, shBot - shTop);
      for (let L = 0; L <= 8; L++) { const ry = Math.round(roomTop(L) - top); if (ry > vh || ry + PITCH < 0) continue; g.fillStyle = '#151d3e'; g.fillRect(x0, ry + RH, SHAFT, SLAB); g.fillStyle = '#c9952f'; g.fillRect(x0, ry + RH, SHAFT, 1); ptext(g, this.ladder[L].floor, x0 + 5, ry + 6, L <= this.rank ? '#8a6220' : '#3a3420'); }
    }
    // car (camera rides with it)
    const cy = Math.round(vh / 2 + RH / 2 - CAR_H), cx = x0 + 2;
    const cableTop = Math.max(0, shTop);
    g.fillStyle = '#3a4570'; g.fillRect(cx + 9, cableTop, 1, Math.max(0, cy - cableTop)); g.fillRect(cx + 12, cableTop, 1, Math.max(0, cy - cableTop));
    const frac = Math.abs(camFloor - Math.round(camFloor)), open = opts.doors != null ? opts.doors : clamp(1 - frac * 7, 0, 1);
    drawRideCar(g, cx, cy, open, t, this.ladder[clamp(Math.round(camFloor), 0, 8)].floor, opts.moving);
    if (x0 > 0) { g.fillStyle = '#22306a'; g.fillRect(x0 - 2, 0, 2, vh); }
  }
}
function drawRideCar(g, X, Y, open, t, label, moving){
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(X + x, Y + y, w, h); };
  R(-1, -9, CAR_W + 2, 8, '#120d1c'); R(-1, -9, CAR_W + 2, 1, '#c9952f'); R(-1, -2, CAR_W + 2, 1, '#8a6220');
  ptext(g, label, X + CAR_W / 2, Y - 8, '#ff9a3c', { align: 'center' });
  if (moving) { g.fillStyle = '#ff9a3c'; const up = moving > 0; for (let i = 0; i < 3; i++) { const w = 1 + i * 2, yy = up ? Y - 7 + i : Y - 5 - i; g.fillRect(X + 3 - i, yy, w, 1); } }
  R(0, 0, CAR_W, CAR_H, '#8a6220'); R(1, 2, CAR_W - 2, CAR_H - 3, '#f7d991'); R(3, 2, CAR_W - 6, 1, '#fff2c4'); R(0, 0, CAR_W, 2, '#f2c14e');
  R(1, CAR_H - 6, CAR_W - 2, 5, '#c9952f'); R(1, CAR_H - 6, CAR_W - 2, 1, '#e8c070');
  R(CAR_W - 5, 14, 2, 8, '#8a6220'); for (let i = 0; i < 3; i++) R(CAR_W - 5, 15 + i * 2, 1, 1, i === 1 ? '#ff9a3c' : '#5c3f12');
  const half = (CAR_W - 2) / 2, sh = Math.round(open * (half - 1));
  if (sh < half) {
    R(1, 2, half - sh, CAR_H - 3, '#a8792a'); R(1 + half + sh, 2, half - sh, CAR_H - 3, '#a8792a');
    R(2, 4, 1, CAR_H - 7, '#c9952f'); if (half - sh > 2) R(2 + half + sh, 4, 1, CAR_H - 7, '#c9952f');
    R(half - sh, 2, 1, CAR_H - 3, '#5c3f12'); R(1 + half + sh, 2, 1, CAR_H - 3, '#5c3f12');
  }
  R(0, CAR_H - 1, CAR_W, 1, '#5c3f12');
}

return { RW, RH, DEFS, getRoom, clearCache, RoomRT, RideWorld, SHAFT, WORLD_W, PITCH, SLAB, roomTop, screenChart, ticker, DEFAULT_TICKER, kit };
})();
