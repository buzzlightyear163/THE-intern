/* X kit + trailer renderer. Everything is drawn at art resolution; export.py scales up with nearest neighbour. */
const KIT = (() => {
'use strict';
const { canvas, ctx, ptext, textW, mulberry, shade, dith, getSprite, drawSprite, TOD, paintSky, paintSkyline, buildTower, drawNeedle, drawPigeon, drawHeli, fmtUsd, LADDER, spawnConfetti, stepConfetti, drawConfetti, vgrad, clamp, easeInOut } = IE;
const FIXED_NOW = () => new Date(2026, 9, 9, 9, 0, 0);
const SHORT = [
  'DAY 1 · NO DESK · NO SALARY', 'NEW: A CHAIR AND A SCREEN', 'NEW: TERMINAL ACCESS', 'NEW: THE MORNING NOTE',
  'NEW: A PAPER PORTFOLIO', 'NEW: A WALLET · SALARY PAID OUT', 'NEW: AN INTERN OF HIS OWN', 'NEW: HE TRADES HIS SALARY'
];
const out = (c) => c.toDataURL('image/png');

function starfield(g, w, h, seed){ vgrad(g, 0, 0, w, h, TOD.night.sky); const r = mulberry(seed); for (let i = 0; i < w * h / 180; i++) { g.fillStyle = r() < 0.2 ? '#c9d2ff' : '#3a4580'; g.fillRect(r() * w | 0, r() * h * 0.75 | 0, 1, 1); } }
function towerCanvas(rank){ const c = canvas(IE.TW, IE.TH), g = ctx(c, true); buildTower(g, { rank, litTop: rank, ladder: LADDER, tod: 'night' }); return c; }
function brassFrame(g, x, y, w, h){ g.fillStyle = '#5c3f12'; g.fillRect(x - 3, y - 3, w + 6, h + 6); g.fillStyle = '#c9952f'; g.fillRect(x - 2, y - 2, w + 4, h + 4); g.fillStyle = '#f2c14e'; g.fillRect(x - 2, y - 2, w + 4, 1); g.fillStyle = '#8a6220'; g.fillRect(x - 1, y - 1, w + 2, h + 2); }

/* profile picture: the intern under an art deco elevator arch */
function pfp(){
  const N = 32, c = canvas(N, N), g = ctx(c);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const d = Math.hypot(x - 15.5, y - 13) / 22; g.fillStyle = d < 0.45 ? (dith(x, y, (0.45 - d) * 2) ? '#22336a' : '#1a2850') : d < 0.8 ? (dith(x, y, (0.8 - d) * 2) ? '#1a2850' : '#111a3a') : '#0b1229'; g.fillRect(x, y, 1, 1); }
  const cx = 15.5, cy = 13, r = 11;
  for (let a = 0; a < 18; a++) { const ang = Math.PI + a / 17 * Math.PI; for (let s = 3; s < r - 1; s++) { const x = Math.round(cx + Math.cos(ang) * s), y = Math.round(cy + Math.sin(ang) * s); if (a % 2 === 0) { g.fillStyle = '#3a2c18'; g.fillRect(x, y, 1, 1); } } }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const inArch = (y <= cy ? Math.hypot(x - cx, y - cy) : Math.abs(x - cx));
    if (inArch > r - 0.5 && inArch <= r + 0.7) { g.fillStyle = '#c9952f'; g.fillRect(x, y, 1, 1); }
    else if (inArch > r + 0.7 && inArch <= r + 1.7) { g.fillStyle = '#5c3f12'; g.fillRect(x, y, 1, 1); }
  }
  g.fillStyle = '#f2c14e'; g.fillRect(15, 1, 2, 1);
  drawSprite(g, getSprite(1, 'idle', 0, { lanyard: '#3f6fd1', noProp: true }), 16, 37, false);
  return out(c);
}

/* X header: skyline, the crown and the headline */
function banner(){
  const w = 375, h = 125, c = canvas(w, h), g = ctx(c, true);
  const sk = paintSky(g, w, h, 'night', 12, { moonX: 344, moonY: 22, skyline: false });
  paintSkyline(g, 0, w, h, 14, 'night', null, { heightScale: 0.85 });
  const tw = towerCanvas(0); g.drawImage(tw, 214, 8);
  drawNeedle(g, 214, 8, 0.6);
  for (const [px, py, f] of [[244, 35, 'sit'], [258, 35, 'peck'], [306, 35, 'sit']]) drawPigeon(g, px, py, f, px > 300);
  drawHeli(g, 150, 22, 0);
  ptext(g, '$INTERN', 22, 26, '#f2c14e');
  ptext(g, 'PROMOTE THE', 22, 40, '#f4ead5', { scale: 2, shadow: '#05070f' });
  ptext(g, 'INTERN.', 22, 60, '#f2c14e', { scale: 3, shadow: '#05070f' });
  ptext(g, 'AN AI AGENT WITH A CAREER', 22, 89, '#aab4d6');
  return out(c);
}

/* link preview: headline left, the mailroom right */
function og(){
  const w = 400, h = 210, c = canvas(w, h), g = ctx(c, true);
  paintSky(g, w, h, 'night', 21, { moonX: 176, moonY: 26, skyline: false });
  paintSkyline(g, 0, w, h, 22, 'night', null, { heightScale: 0.7 });
  ptext(g, '$INTERN · AN AI AGENT', 20, 40, '#f2c14e');
  ptext(g, 'PROMOTE THE', 20, 56, '#f4ead5', { scale: 2, shadow: '#05070f' });
  ptext(g, 'INTERN.', 20, 76, '#f2c14e', { scale: 3, shadow: '#05070f' });
  ['HE STARTS IN THE MAILROOM.', 'EVERY MARKET CAP', 'MILESTONE PROMOTES HIM.'].forEach((s, i) => ptext(g, s, 20, 110 + i * 11, '#c9d0ea'));
  g.fillStyle = '#05070f'; g.fillRect(20, 152, 92, 17); g.fillStyle = '#f2c14e'; g.fillRect(21, 153, 90, 15); g.fillStyle = '#ffe08a'; g.fillRect(21, 153, 90, 1); g.fillStyle = '#a8792a'; g.fillRect(21, 167, 90, 1);
  ptext(g, 'PROMOTE HIM →', 66, 157, '#1a1428', { align: 'center' });
  const room = new ROOMS.RoomRT(0, 'current', { tod: 'night', rng: mulberry(4), now: FIXED_NOW });
  for (let i = 0; i < 20; i++) room.update(50);
  brassFrame(g, 196, 40, 192, 108); room.draw(g, 196, 40, 3000);
  g.fillStyle = '#120d1c'; g.fillRect(232, 156, 120, 13); g.fillStyle = '#c9952f'; g.fillRect(232, 156, 120, 1);
  ptext(g, 'FLOOR B1 · UNPAID INTERN', 292, 159, '#f2c14e', { align: 'center' });
  return out(c);
}

/* promotion cards: 320x180, one per floor, plus PIP and demotion */
function card(L, kind = 'promo'){
  const w = 320, h = 180, c = canvas(w, h), g = ctx(c, true);
  starfield(g, w, h, 30 + L);
  paintSkyline(g, 0, w, h, 40 + L, 'night', null, { heightScale: 0.8 });
  const room = new ROOMS.RoomRT(L, 'current', { tod: 'night', rng: mulberry(7 + L), now: FIXED_NOW, pip: kind === 'pip' });
  for (let i = 0; i < 12; i++) room.update(60);
  const it = room.intern;
  const step = ROOMS.DEFS[L].intern.find((s) => s.at) || {};
  if (step.at) { it.x = step.at[0]; it.y = step.at[1]; }
  if (kind === 'promo') { it.override('cheer', 99999); it.frame = 0; it.flip = false; }
  if (kind === 'pip') { it.override('sad', 99999); it.frame = 0; }
  if (kind === 'demoted') { it.override('box', 99999); it.frame = 1; it.x = 92; it.y = 92; it.flip = false; }
  const X = 64, Y = 40;
  brassFrame(g, X, Y, 192, 108);
  room.draw(g, X, Y, 3600);
  if (kind === 'promo') {
    const conf = [], rng = mulberry(90 + L); spawnConfetti(conf, 70, 192, rng, -100); for (let i = 0; i < 30; i++) stepConfetti(conf, 60, 108);
    g.save(); g.beginPath(); g.rect(X, Y, 192, 108); g.clip(); drawConfetti(g, conf, X, Y); g.restore();
  }
  const red = kind !== 'promo';
  const head = kind === 'pip' ? 'PIP NOTICE' : kind === 'demoted' ? 'DEMOTED' : L === 0 ? '★ HIRED ★' : '★ PROMOTED ★';
  const title = kind === 'pip' ? 'ON A PIP' : kind === 'demoted' ? 'TOOK THE STAIRS' : LADDER[L].title;
  ptext(g, head, 160, 8, red ? '#ff6b5e' : '#f2c14e', { align: 'center' });
  ptext(g, title, 160, 19, '#f4ead5', { align: 'center', scale: 2, shadow: '#05070f' });
  const foot1 = kind === 'pip' ? `GET HIM BACK ABOVE ${fmtUsd(LADDER[L].at)}` : kind === 'demoted' ? "HE'LL BE BACK UPSTAIRS" : (L === 0 ? 'FLOOR B1' : `FLOOR ${LADDER[L].floor} · UNLOCKED AT ${fmtUsd(LADDER[L].at)}`);
  const foot2 = kind === 'promo' ? SHORT[L] : 'PROMOTE THE INTERN';
  g.fillStyle = '#070b18'; g.fillRect(0, 153, w, 27); g.fillStyle = '#c9952f'; g.fillRect(0, 153, w, 1);
  ptext(g, foot1, 160, 158, red ? '#ff8a7a' : '#f2c14e', { align: 'center' });
  ptext(g, foot2, 160, 169, '#f4ead5', { align: 'center' });
  ptext(g, '$INTERN', 314, 169, '#5c6680', { align: 'right' });
  return out(c);
}

/* ---------- trailer: a fixed-step simulation, one call per frame ---------- */
const TW_ = 320, TH_ = 180, FPS = 30, DT = 1000 / FPS;
const KEYS = [
  { t: 0,     cam: 0 }, { t: 3000,  cam: 0 }, { t: 5400,  cam: 3 }, { t: 8400, cam: 3 }, { t: 10000, cam: 5 },
  { t: 12400, cam: 5 }, { t: 14000, cam: 7 }, { t: 16600, cam: 7 }, { t: 17800, cam: 8 }, { t: 19800, cam: 8 }
];
const CAPS = [[300, 2800, 'HE STARTS IN THE MAILROOM.'], [3000, 5400, 'EVERY MILESTONE GETS HIM PROMOTED.'], [8400, 12400, 'AT $40K HE GETS A WALLET.'], [12400, 16600, 'AT $100K HE TRADES.'], [16600, 19800, 'AND THE ROOF?']];
const BANNERS = [[5600, 8200, 3], [14200, 16400, 7]];
const END = 20200, TOTAL = 23400;
let T = null;
function camAt(t){
  for (let i = 0; i < KEYS.length - 1; i++) { const a = KEYS[i], b = KEYS[i + 1]; if (t >= a.t && t <= b.t) { if (a.cam === b.cam) return a.cam; return a.cam + (b.cam - a.cam) * easeInOut((t - a.t) / (b.t - a.t)); } }
  return KEYS[KEYS.length - 1].cam;
}
function mcapAt(cam){ const i = Math.floor(clamp(cam, 0, 7)), f = cam - i; const a = i === 0 ? 6200 : LADDER[i].at, b = LADDER[Math.min(8, i + 1)].at; return a + (b - a) * f; }
function trailerStart(){
  const c = canvas(TW_, TH_), g = ctx(c, true);
  const world = new ROOMS.RideWorld({ ladder: LADDER, tod: 'night', rank: 0, rng: mulberry(2026), now: FIXED_NOW });
  const end = canvas(TW_, TH_), ge = ctx(end, true);
  starfield(ge, TW_, TH_, 77); paintSkyline(ge, 0, TW_, TH_, 78, 'night', null, { heightScale: 0.32 }); ge.fillStyle = '#05070f'; ge.fillRect(0, TH_ - 8, TW_, 8);
  T = { c, g, world, t: 0, frame: 0, rank: 0, conf: [], rng: mulberry(9), end, tower: towerCanvas(7), cheered: {} };
  return { frames: Math.ceil(TOTAL / DT) };
}
function trailerFrame(){
  const { g, world } = T, t = T.t;
  const cam = camAt(t);
  const reach = Math.floor(cam + 0.02);
  if (reach > T.rank && reach <= 7) { T.rank = reach; world.setRank(reach); }
  const atFloor = Math.abs(cam - Math.round(cam)) < 0.001;
  for (const [s, e, L] of BANNERS) if (t >= s && !T.cheered[L]) { T.cheered[L] = true; const it = world.intern; if (it) it.override('cheer', L === 7 ? 1300 : 2200); spawnConfetti(T.conf, 90, TW_, T.rng, -60); }
  if ((t >= 8400 && t < 8400 + DT) || (t >= 16600 && t < 16600 + DT)) T.conf.length = 0;
  world.update(DT);
  stepConfetti(T.conf, DT, TH_);
  let doors = 0;
  const seg = KEYS.find((k, i) => i < KEYS.length - 1 && t >= k.t && t < KEYS[i + 1].t);
  if (atFloor && seg) { const i = KEYS.indexOf(seg), nxt = KEYS[i + 1]; const into = t - seg.t, left = nxt.t - t; doors = clamp(Math.min(into / 300, left / 300), 0, 1); if (nxt.cam === seg.cam && i === 0) doors = clamp(Math.min(1, left / 300), 0, 1); }
  if (t < END) {
    g.fillStyle = '#000'; g.fillRect(0, 0, TW_, TH_);
    world.draw(g, TW_, TH_, cam, t, { doors, moving: atFloor ? 0 : 1 });
    drawConfetti(g, T.conf);
    // HUD
    const fl = LADDER[clamp(Math.round(cam), 0, 8)].floor;
    g.fillStyle = '#120d1c'; g.fillRect(8, 8, 38, 13); g.fillStyle = '#c9952f'; g.fillRect(8, 8, 38, 1); g.fillRect(8, 20, 38, 1);
    ptext(g, (atFloor ? '' : '▲ ') + (fl === 'R' ? 'ROOF' : fl), 27, 11, '#ff9a3c', { align: 'center' });
    const mc = cam >= 8 ? '???' : fmtUsd(mcapAt(cam));
    const mw = textW('MCAP ' + mc) + 10;
    g.fillStyle = '#120d1c'; g.fillRect(TW_ - 8 - mw, 8, mw, 13); g.fillStyle = '#c9952f'; g.fillRect(TW_ - 8 - mw, 8, mw, 1); g.fillRect(TW_ - 8 - mw, 20, mw, 1);
    ptext(g, 'MCAP ' + mc, TW_ - 13, 11, '#7fd19b', { align: 'right' });
    for (const [s, e, L] of BANNERS) if (t >= s && t < e) {
      const k = clamp((t - s) / 200, 0, 1), y = Math.round(-30 + 38 * k);
      const title = LADDER[L].title, bw = Math.max(textW(title, 2), textW('★ PROMOTED ★')) + 20;
      g.fillStyle = '#1a1428'; g.fillRect(160 - bw / 2 - 1, y - 1, bw + 2, 30); g.fillStyle = '#f2c14e'; g.fillRect(160 - bw / 2, y, bw, 28); g.fillStyle = '#ffe08a'; g.fillRect(160 - bw / 2, y, bw, 1); g.fillStyle = '#a8792a'; g.fillRect(160 - bw / 2, y + 27, bw, 1);
      ptext(g, '★ PROMOTED ★', 160, y + 4, '#5c3f12', { align: 'center' });
      ptext(g, title, 160, y + 13, '#1a1428', { align: 'center', scale: 2 });
    }
    for (const [s, e, txt] of CAPS) if (t >= s && t < e) {
      const k = clamp((t - s) / 250, 0, 1);
      g.fillStyle = '#070b18'; g.fillRect(0, TH_ - 22, TW_, 22); g.fillStyle = '#c9952f'; g.fillRect(0, TH_ - 22, TW_, 1);
      ptext(g, txt.slice(0, Math.ceil(txt.length * Math.min(1, k * 2.2))), 160, TH_ - 14, '#f4ead5', { align: 'center' });
    }
    if (t < 500) fade(g, 1 - t / 500);
    if (t > END - 400) fade(g, (t - (END - 400)) / 400);
  } else {
    const te = t - END;
    g.drawImage(T.end, 0, 0);
    g.drawImage(T.tower, 0, 0, IE.TW, 72, 92, 6, IE.TW, 72);
    drawNeedle(g, 92, 6, clamp(te / 1600, 0, 1) * 7);
    ptext(g, 'PROMOTE THE', 160, 92, '#f4ead5', { align: 'center', scale: 2, shadow: '#05070f' });
    ptext(g, 'INTERN.', 160, 110, '#f2c14e', { align: 'center', scale: 3, shadow: '#05070f' });
    ptext(g, '$INTERN · AN AI AGENT WITH A CAREER', 160, 138, '#aab4d6', { align: 'center', shadow: '#05070f' });
    ptext(g, 'LIVE ON PUMP.FUN', 160, 151, '#7fd19b', { align: 'center', shadow: '#05070f' });
    if (te < 400) fade(g, 1 - te / 400);
  }
  T.t += DT; T.frame++;
  return out(T.c);
}
function fade(g, a, col = '#000'){ if (a <= 0) return; const steps = Math.round(clamp(a, 0, 1) * 16); g.fillStyle = col; for (let y = 0; y < TH_; y++) for (let x = 0; x < TW_; x++) if (IE.BAYER[y & 3][x & 3] < steps) g.fillRect(x, y, 1, 1); }

/* ---------- promo: the beat-synced 32 s cut for X (timeline in promo.json, shared with the soundtrack) ---------- */
let P = null;
function promoStart(cfg){
  const c = canvas(TW_, TH_), g = ctx(c, true);
  const world = new ROOMS.RideWorld({ ladder: LADDER, tod: 'night', rank: 0, rng: mulberry(2027), now: FIXED_NOW });
  const end = canvas(TW_, TH_), ge = ctx(end, true);
  starfield(ge, TW_, TH_, 77); paintSkyline(ge, 0, TW_, TH_, 78, 'night', null, { heightScale: 0.32 }); ge.fillStyle = '#05070f'; ge.fillRect(0, TH_ - 8, TW_, 8);
  P = { cfg, c, g, world, t: 0, rank: 0, conf: [], rng: mulberry(11), end, tower: towerCanvas(7), done: {} };
  return { frames: Math.ceil(cfg.total / DT) };
}
function pCam(t){
  const K = P.cfg.keys;
  for (let i = 0; i < K.length - 1; i++) { const [ta, a] = K[i], [tb, b] = K[i + 1]; if (t >= ta && t <= tb) return a === b ? a : a + (b - a) * easeInOut((t - ta) / (tb - ta)); }
  return K[K.length - 1][1];
}
function pMcap(cam){ const i = Math.floor(clamp(cam, 0, 7)), f = cam - i; const a = i === 0 ? 4300 : LADDER[i].at, b = LADDER[Math.min(8, i + 1)].at; return a + (b - a) * f; }
/* "he wants to be a trader": a thought bubble with a green chart over his head */
function dream(g, te){
  const it = P.world.intern; if (!it || !P.world.view) return;
  if (!P.dreamFix) { P.dreamFix = true; it.override('idle', P.cfg.dream[1] - P.cfg.dream[0]); }
  const hx = P.world.view.x + Math.round(it.x), hy = TH_ / 2 - 54 + Math.round(it.y) - 27;
  const ink = '#1a1428', paper = '#fbf4e2';
  const dot = (x, y, r) => { g.fillStyle = ink; g.fillRect(x - r - 1, y - r, 2 * r + 2, 2 * r); g.fillRect(x - r, y - r - 1, 2 * r, 2 * r + 2); g.fillStyle = paper; g.fillRect(x - r, y - r, 2 * r, 2 * r); };
  if (te > 60) dot(hx + 5, hy - 2, 1);
  if (te > 160) dot(hx + 9, hy - 7, 2);
  if (te < 280) return;
  const bw = 46, bh = 26, bx = clamp(hx + 6, 4, TW_ - bw - 4), by = hy - 12 - bh;
  g.fillStyle = ink; g.fillRect(bx - 1, by, bw + 2, bh); g.fillRect(bx, by - 1, bw, bh + 2);
  g.fillStyle = paper; g.fillRect(bx, by, bw, bh);
  g.fillStyle = '#e6dcc4'; g.fillRect(bx + 2, by + bh - 4, bw - 4, 1);
  const show = clamp((te - 280) / 900, 0, 1), n = 8, vals = [3, 5, 4, 8, 7, 11, 13, 17];
  for (let i = 0; i < Math.ceil(n * show); i++) {
    const x = bx + 5 + i * 5, top = by + bh - 6 - vals[i], h = 4 + (i % 3);
    g.fillStyle = '#2f7a4a'; g.fillRect(x + 1, top - 2, 1, h + 4);
    g.fillStyle = '#3fbf6a'; g.fillRect(x, top, 3, h);
  }
  if (show >= 1 && (te % 600) < 400) ptext(g, '$', bx + bw - 7, by + 2, '#3fbf6a');
}
function hudBox(g, x, w){ g.fillStyle = '#120d1c'; g.fillRect(x, 8, w, 13); g.fillStyle = '#c9952f'; g.fillRect(x, 8, w, 1); g.fillRect(x, 20, w, 1); }
function promoFrame(){
  const { g, world, cfg } = P, t = P.t;
  const cam = pCam(t), reach = Math.floor(cam + 0.02);
  if (reach > P.rank && reach <= 7) { P.rank = reach; world.setRank(reach); }
  const atFloor = Math.abs(cam - Math.round(cam)) < 0.001;
  for (const [s, L] of cfg.arrivals) if (t >= s && !P.done[L]) {
    P.done[L] = true; P.conf.length = 0;
    const it = world.intern; if (it) it.override('cheer', 1500);
    spawnConfetti(P.conf, L === 7 ? 140 : L === 1 ? 110 : 70, TW_, P.rng, -60);
  }
  world.update(DT); stepConfetti(P.conf, DT, TH_);
  let doors = 0;
  const K = cfg.keys, i = K.findIndex((k, j) => j < K.length - 1 && t >= k[0] && t < K[j + 1][0]);
  if (atFloor && i >= 0) { const into = t - K[i][0], left = K[i + 1][0] - t; doors = clamp(Math.min(i === 0 ? 1 : into / 260, left / 260), 0, 1); }
  if (t < cfg.end) {
    g.fillStyle = '#000'; g.fillRect(0, 0, TW_, TH_);
    world.draw(g, TW_, TH_, cam, t, { doors, moving: atFloor ? 0 : 1 });
    if (cfg.dream && t >= cfg.dream[0] && t < cfg.dream[1]) dream(g, t - cfg.dream[0]);
    drawConfetti(g, P.conf);
    const fl = LADDER[clamp(Math.round(cam), 0, 8)].floor;
    hudBox(g, 8, 38); ptext(g, (atFloor ? '' : '▲ ') + (fl === 'R' ? 'ROOF' : fl), 27, 11, '#ff9a3c', { align: 'center' });
    const mc = cam >= 7.98 ? '???' : fmtUsd(pMcap(cam)), mw = textW('MCAP ' + mc) + 10;
    hudBox(g, TW_ - 8 - mw, mw); ptext(g, 'MCAP ' + mc, TW_ - 13, 11, '#7fd19b', { align: 'right' });
    for (const [s, L, dur] of cfg.arrivals) if (t >= s && t < s + dur) {
      const k = clamp((t - s) / 180, 0, 1), y = Math.round(-30 + 58 * easeInOut(k));
      const title = LADDER[L].title, bw = Math.max(textW(title, 2), textW('★ PROMOTED ★')) + 22;
      g.fillStyle = '#1a1428'; g.fillRect(160 - bw / 2 - 1, y - 1, bw + 2, 30); g.fillStyle = '#f2c14e'; g.fillRect(160 - bw / 2, y, bw, 28); g.fillStyle = '#ffe08a'; g.fillRect(160 - bw / 2, y, bw, 1); g.fillStyle = '#a8792a'; g.fillRect(160 - bw / 2, y + 27, bw, 1);
      ptext(g, '★ PROMOTED ★', 160, y + 4, '#5c3f12', { align: 'center' });
      ptext(g, title, 160, y + 13, '#1a1428', { align: 'center', scale: 2 });
    }
    for (const [s, e, txt] of cfg.caps) if (t >= s && t < e) {
      const k = clamp((t - s) / 260, 0, 1);
      g.fillStyle = '#070b18'; g.fillRect(0, TH_ - 22, TW_, 22); g.fillStyle = '#c9952f'; g.fillRect(0, TH_ - 22, TW_, 1);
      ptext(g, txt.slice(0, Math.ceil(txt.length * Math.min(1, k * 2))), 160, TH_ - 14, '#f4ead5', { align: 'center' });
    }
    for (const [s, L] of cfg.arrivals) if (t >= s && t < s + 130) fade(g, (L === 7 || L === 1 ? 0.55 : 0.3) * (1 - (t - s) / 130), '#fff6d8');
    if (t > cfg.end - 300) fade(g, (t - (cfg.end - 300)) / 300);
  } else {
    const te = t - cfg.end;
    g.drawImage(P.end, 0, 0);
    g.drawImage(P.tower, 0, 0, IE.TW, 72, 92, 6, IE.TW, 72);
    drawNeedle(g, 92, 6, clamp(te / 1400, 0, 1) * 7);
    if (te < 2200) { const k = te / 2200; g.fillStyle = '#ffe08a'; for (let j = 0; j < 14; j++) { const a = j / 14 * Math.PI * 2 + te * 0.0007; const r = 30 + 60 * k; const x = 160 + Math.cos(a) * r, y = 40 + Math.sin(a) * r * 0.5; if (y < 76) g.fillRect(Math.round(x), Math.round(y), 1, 1); } }
    ptext(g, 'PROMOTE THE', 160, 88, '#f4ead5', { align: 'center', scale: 2, shadow: '#05070f' });
    ptext(g, 'INTERN.', 160, 106, '#f2c14e', { align: 'center', scale: 3, shadow: '#05070f' });
    ptext(g, '$INTERN · AN AI AGENT WITH A CAREER', 160, 135, '#aab4d6', { align: 'center', shadow: '#05070f' });
    const on = te > 900;
    if (on) { const w = textW('LIVE ON PUMP.FUN') + 22; g.fillStyle = '#0d2a1a'; g.fillRect(160 - w / 2, 147, w, 13); g.fillStyle = '#7fd19b'; g.fillRect(160 - w / 2, 147, w, 1); g.fillRect(160 - w / 2, 159, w, 1); g.fillStyle = (te % 1000) < 600 ? '#4ade80' : '#1d6b3a'; g.fillRect(160 - w / 2 + 6, 151, 4, 4); ptext(g, 'LIVE ON PUMP.FUN', 160 + 4, 150, '#7fd19b', { align: 'center' }); }
    if (te < 130) fade(g, 0.6 * (1 - te / 130), '#fff6d8');
    if (t > cfg.total - 500) fade(g, (t - (cfg.total - 500)) / 500);
  }
  P.t += DT;
  return out(P.c);
}

return { pfp, banner, og, card, trailerStart, trailerFrame, promoStart, promoFrame };
})();
