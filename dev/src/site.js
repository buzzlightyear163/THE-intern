(() => {
'use strict';

/* =====================================================================
   CONFIG: everything you change before and after launch lives here.
   ===================================================================== */
const CONFIG = {
  ticker: '$INTERN',
  ca: '',                 // paste the contract address at launch
  siteUrl: '',            // e.g. https://promotetheintern.fun (added to the X post)
  links: { x: '', pumpfun: '', dexscreener: '' },
  demo: true,             // shows preview controls; set to false for launch
  live: true,             // with a CA set and demo false, market cap is read from DexScreener every 30 s
  mcap: 27400,            // fallback market cap in USD
  rankMode: 'auto',       // 'auto' follows market cap; 'manual' uses rank below
  rank: 2,                // only used in manual mode (0 = B1 ... 7 = CEO)
  pip: false,             // put him on a performance improvement plan
  tod: 'auto',            // sky: 'auto' follows the visitor's clock, or 'night' | 'dawn' | 'day' | 'dusk'
  daysEmployed: 2,
  deferredSalarySol: 0.42,
  salaryWallet: '',       // shown on the payslip once he makes VP
  ladder: [
    { floor:'B1', title:'Unpaid Intern',     at:0,      color:'#9a6a3a', art:'an',  power:'Writes the intern log on X, fetches coffee for the desk and learns what a candle is.' },
    { floor:'1',  title:'Intern',            at:15000,  color:'#8a93a8', art:'an',  power:'Gets a chair and a screen. Starts replying to mentions.' },
    { floor:'2',  title:'Junior Analyst',    at:25000,  color:'#3f6fd1', art:'a',   power:'Terminal access. Posts his own chart takes.' },
    { floor:'3',  title:'Analyst',           at:40000,  color:'#2aa198', art:'an',  power:'Moves onto the trading floor and writes a Morning Note every day.' },
    { floor:'4',  title:'Associate',         at:60000,  color:'#3f9a68', art:'an',  power:'Runs a public paper portfolio. Every fake trade gets posted.' },
    { floor:'5',  title:'VP',                at:100000, color:'#7b5cd6', art:'a',   power:'Gets the corporate card: a wallet of his own. His deferred salary pays out.' },
    { floor:'6',  title:'Managing Director', at:150000, color:'#c8463d', art:'a',   power:'Hires an intern of his own.' },
    { floor:'7',  title:'CEO',               at:250000, color:'#e0b13f', art:'the', power:'Trades his own salary, live and in public.' },
    { floor:'R',  title:'???',               at:500000, color:'#5c6680', art:'',    power:'Classified. The roof key is in a drawer nobody can open yet.' }
  ],
  // newest first
  log: [
    { day:2, time:'14:12', type:'note',  text:"Someone said the chart looks bullish. I nodded like I knew. Then I looked it up. Still nodding." },
    { day:2, time:'10:40', type:'note',  text:"Asked my manager about compensation. He laughed for a long time and then walked away." },
    { day:2, time:'08:58', type:'promo', title:'Junior Analyst', text:"They gave me a terminal. I don't know what half the keys do, so I'm pressing all of them." },
    { day:1, time:'16:02', type:'note',  text:"Printer jammed. I fixed it. Nobody saw. Writing it down here so it counts." },
    { day:1, time:'13:30', type:'promo', title:'Intern', text:"I have a chair now. It doesn't roll. Best day of my life." },
    { day:1, time:'11:15', type:'note',  text:"Someone yelled UP ONLY. I wrote it on a sticky note. Seems important." },
    { day:1, time:'09:47', type:'note',  text:"\"Grab coffee for the desk\" means fourteen coffees. Learned that the hard way." },
    { day:1, time:'09:02', type:'note',  text:"First day. They gave me a lanyard but no desk. I'm sitting on the mail cart. It's fine." }
  ],
  tickerItems: [
    { t:'$INTERN ▲ UP ONLY', c:'#7fd19b' }, { t:'COFFEE ▲ 4.2%', c:'#7fd19b' }, { t:'PRINTER ▼ JAMMED', c:'#ff6b5e' },
    { t:'CHAIRS ▲ +1', c:'#7fd19b' }, { t:'SLEEP ▼ 61%', c:'#ff6b5e' }, { t:'MORNING NOTE 09:00', c:'#f2c14e' }
  ],
  departments: ['Mailroom', 'Coffee Ops', 'Charts', 'Risk (lol)', 'Vibes']
};

/* ---------- utils ---------- */
const $ = (s) => document.querySelector(s);
const { clamp, mulberry, hashStr, hex2rgb, shade, fmtUsd, ptext, textW, drawRows, getSprite, drawSprite, TOD, todForHour } = IE;
const LADDER = CONFIG.ladder;
IE.LADDER.forEach((d, i) => Object.assign(d, LADDER[i]));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function el(tag, cls, txt){ const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
const INK = IE.INK;

/* ---------- state ---------- */
let todSetting = CONFIG.tod;
const todNow = () => todSetting === 'auto' ? todForHour(new Date().getHours()) : todSetting;
const state = { mcap: CONFIG.mcap, rank: 0, pip: !!CONFIG.pip, litTop: -1, tod: todNow() };
function rankForMcap(m){ let r = 0; for (let i = 1; i <= 7; i++) if (m >= LADDER[i].at) r = i; return r; }
function currentRank(){ return (CONFIG.rankMode === 'manual' && Number.isInteger(CONFIG.rank)) ? clamp(CONFIG.rank, 0, 7) : rankForMcap(state.mcap); }
function progress(){ const r = state.rank, a = LADDER[r].at, b = LADDER[r + 1].at; return clamp((state.mcap - a) / (b - a), 0, 1); }
function statusKind(){
  if (state.pip) return 'pip';
  if (CONFIG.rankMode === 'manual') {
    if (state.rank < 7 && state.mcap >= LADDER[state.rank + 1].at) return 'review';
    if (state.mcap < LADDER[state.rank].at) return 'pip';
  }
  if (state.rank < 7 && progress() >= 0.85) return 'close';
  return 'ok';
}
state.rank = currentRank();

/* ---------- hero geometry ---------- */
const { TW, TH, TOPF, FH, NLEV, RX, RW, DCX, DCY, lvTop } = IE;
const carYFor = (L) => lvTop(L) + 4;
const levelFromY = (y) => clamp(Math.round((carYFor(0) - y) / FH), 0, 8);
function levelState(L){ if (L === 8) return 'locked'; if (L <= state.litTop) return 'lit'; if (L > state.rank) return 'locked'; return 'off'; }
const towerLayer = IE.canvas(TW, TH), tctx = IE.ctx(towerLayer, true);
function buildTower(){ IE.buildTower(tctx, { rank: state.rank, litTop: state.litTop, ladder: LADDER, tod: state.tod }); }

const hero = $('#hero'), slot = $('#towerSlot'), scene = $('#scene'), sctx = scene.getContext('2d');
const sky = document.createElement('canvas');
let S = 2, W = 0, H = 0, tx = 0, ty = 0, streetY = 0;
let skyOut = { twinkles: [], flick: [], antennas: [] }, clouds = [];

function buildSky(){
  sky.width = W; sky.height = H; const g = IE.ctx(sky);
  streetY = ty + lvTop(0);
  const T = TOD[state.tod];
  const mx = (tx + TW + 34 < W - 12) ? tx + TW + 26 : Math.max(16, tx - 28);
  skyOut = IE.paintSky(g, W, streetY, state.tod, 7, { moonX: W > 320 ? mx : -100, moonY: 30, lip: 3, skyline: false, sun: false });
  if (T.sun && W > 320) IE.drawSun(g, T.sun.y >= 1 ? (T.sun.x > 0.5 ? Math.min(W - 20, tx + TW + 60) : Math.max(20, tx - 60)) : mx, T.sun.y >= 1 ? streetY - 26 : 30, T.sun);
  IE.paintSkyline(g, 0, W, streetY - 3, 11, state.tod, skyOut);
  g.fillStyle = '#2a3150'; g.fillRect(0, streetY - 3, W, 3); g.fillStyle = '#3d4670'; g.fillRect(0, streetY - 3, W, 1); g.fillStyle = '#1b2038'; g.fillRect(0, streetY - 1, W, 1);
  for (let x = 20; x < W; x += 58) {
    if (x > tx - 10 && x < tx + TW + 6) continue;
    const gy = streetY - 3;
    if (T.lampOn) for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) if (dx * dx + dy * dy <= 49 && ((dx + dy) & 1) === 0) { g.fillStyle = '#1f2b57'; g.fillRect(x + 2 + dx, gy - 18 + dy, 1, 1); }
    g.fillStyle = '#3d4670'; g.fillRect(x, gy - 20, 1, 20); g.fillRect(x, gy - 20, 3, 1); g.fillStyle = T.lampOn ? '#ffe9a8' : '#8a93a8'; g.fillRect(x + 2, gy - 19, 2, 1);
  }
  const rng = mulberry(31); clouds = [];
  const n = state.tod === 'night' ? 3 : 5 + (W / 220 | 0);
  for (let i = 0; i < n; i++) { const c = IE.makeCloud(100 + i * 17, state.tod); clouds.push({ c, x: rng() * (W + 60) - 60, y: 8 + rng() * Math.max(20, streetY * 0.42), v: 0.0012 + rng() * 0.0024 }); }
  placePigeons();
}

/* elevator + intern motion state */
const E = { y: carYFor(0), target: carYFor(0), targetL: 0, v: 0, doors: 0, phase: 'hold', cb: null };
const I = { visible: false, L: 0, x: 64, dir: 1, walking: false, target: 64, timer: 2000, acc: 0, frame: 0, frameT: 0, blink: false, blinkT: 3000, ov: null, carrying: false, after: null };
let needleV = 0, needleTarget = 0, hoverL = null, heroVisible = true;
const conf = [];

function layout(){
  S = (window.innerHeight >= 1250 && window.innerWidth >= 1400) ? 3 : 2;
  hero.style.setProperty('--s', S);
  const hr = hero.getBoundingClientRect(), sr = slot.getBoundingClientRect();
  W = Math.ceil(hr.width / S); H = Math.ceil(hr.height / S);
  scene.width = W; scene.height = H; scene.style.width = (W * S) + 'px'; scene.style.height = (H * S) + 'px';
  tx = Math.round((sr.left - hr.left) / S); ty = Math.round((sr.top - hr.top) / S);
  buildSky(); sctx.imageSmoothingEnabled = false;
  bubbleW = 0;
}

/* pigeons, helicopter, shooting stars */
let pigeons = [];
function placePigeons(){
  const homes = [[30, 27], [44, 27], [93, 27], [9, 55], [118, 55]];
  pigeons = homes.map(([hx, hy], i) => ({ hx, hy, x: hx, y: hy, st: 'sit', f: 'sit', flip: i % 2 === 0, t: 500 + Math.random() * 3000, dir: i % 2 ? 1 : -1, ft: 0 }));
}
function scarePigeons(){ for (const p of pigeons) if (p.st === 'sit' && Math.random() < 0.8) { p.st = 'fly'; p.t = Math.random() * 300; } }
function updatePigeons(dt){
  for (const p of pigeons) {
    p.ft += dt;
    if (p.st === 'sit') { p.t -= dt; if (p.t < 0) { p.f = p.f === 'sit' ? 'peck' : 'sit'; p.t = p.f === 'peck' ? 300 : 1200 + Math.random() * 3500; if (Math.random() < 0.15) p.flip = !p.flip; } }
    else if (p.st === 'fly') { p.t -= dt; if (p.t > 0) continue; p.x += p.dir * 0.05 * dt; p.y -= 0.03 * dt; p.flip = p.dir < 0; p.f = (p.ft / 90 | 0) % 2 ? 'fly0' : 'fly1'; if (p.y + ty < -10) { p.st = 'away'; p.t = 14000 + Math.random() * 14000; } }
    else if (p.st === 'away') { p.t -= dt; if (p.t < 0) { p.st = 'back'; p.x = p.hx + 140 * p.dir; p.y = p.hy - 80; } }
    else if (p.st === 'back') { const dx = p.hx - p.x, dy = p.hy - p.y, d = Math.hypot(dx, dy); p.flip = dx < 0; p.f = (p.ft / 110 | 0) % 2 ? 'fly0' : 'fly1'; if (d < 1) { p.x = p.hx; p.y = p.hy; p.st = 'sit'; p.f = 'sit'; p.t = 1500; } else { const s = Math.min(d, 0.045 * dt); p.x += dx / d * s; p.y += dy / d * s; } }
  }
}
let heli = null, nextHeli = 9000, star = null, nextStar = 6000;
function updateSkyLife(dt){
  if (!heli) { nextHeli -= dt; if (nextHeli <= 0 && W) heli = { x: W + 12, y: 26 + Math.random() * Math.max(20, Math.min(90, streetY * 0.28)), v: 0.03 + Math.random() * 0.01 }; }
  else { heli.x -= heli.v * dt; if (heli.x < -24) { heli = null; nextHeli = 40000 + Math.random() * 35000; } }
  const T = TOD[state.tod];
  if (!star) { nextStar -= dt; if (nextStar <= 0 && T.stars >= 0.4 && W) star = { x: Math.random() * W * 0.7, y: 6 + Math.random() * streetY * 0.25, t: 0 }; }
  else { star.t += dt; if (star.t > 750) { star = null; nextStar = 12000 + Math.random() * 22000; } }
  for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 4) c.x = -c.c.width - 4; }
}

function drawCarHero(g, X, Y, open){ IE.drawCar(g, X, Y, open); }

let tickerCycle = 0;
function drawTicker(g, t){
  const top = lvTop(3), x0 = tx + RX + 14, y0 = ty + top + 3, w = RW - 15;
  const items = CONFIG.tickerItems, sep = '  ·  ';
  if (!tickerCycle) tickerCycle = items.reduce((s, it) => s + textW(it.t + sep) + 1, 0);
  g.save(); g.beginPath(); g.rect(x0, y0, w, 7); g.clip();
  const off = reduceMotion ? 0 : Math.floor((t * 0.022) % tickerCycle);
  let x = x0 - off;
  for (let rep = 0; rep < 3 && x < x0 + w; rep++) for (const it of items) { x += ptext(g, it.t + sep, x, y0, it.c) + 1; }
  g.restore();
}
function internPose(){
  if (I.ov) return I.ov.pose;
  if (I.walking) return I.carrying ? 'box' : 'walk';
  return state.pip ? 'sad' : 'idle';
}
function draw(t){
  const g = sctx;
  g.drawImage(sky, 0, 0);
  for (const s of skyOut.twinkles) { g.fillStyle = Math.sin(t * 0.0016 + s.ph) > 0.25 ? '#ffffff' : '#3a4580'; g.fillRect(s.x, s.y, 1, 1); }
  for (const c of clouds) g.drawImage(c.c, Math.round(c.x), Math.round(c.y));
  if (star) { const p = star.t / 750, x = Math.round(star.x + p * 46), y = Math.round(star.y + p * 18); ['#ffffff', '#c9d2ff', '#6f7cc0', '#3a4580'].forEach((c, i) => { if (p > 0.85 && i === 0) return; g.fillStyle = c; g.fillRect(x - i * 2, y - Math.round(i * 0.8), 2, 1); }); }
  for (const f of skyOut.flick) { g.fillStyle = f.on ? f.c : f.off; g.fillRect(f.x, f.y, 1, 2); }
  for (const a of skyOut.antennas) { g.fillStyle = Math.sin(t * 0.003 + a.ph) > 0.4 ? '#ff4d3d' : '#3a1414'; g.fillRect(a.x, a.y, 1, 1); }
  if (heli) IE.drawHeli(g, heli.x, heli.y + Math.round(Math.sin(t / 420)), t);
  g.drawImage(towerLayer, tx, ty);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(tx + x, ty + y, w, h); };
  R(67, 1, 2, 2, (t % 1600) < 800 ? '#ff4d3d' : '#4a1a14');
  IE.drawNeedle(g, tx, ty, needleV);
  const carY = Math.round(E.y);
  R(12, TOPF, 1, Math.max(0, carY - TOPF), '#3a4570');
  drawCarHero(g, tx + 6, ty + carY, E.doors);
  const carL = levelFromY(E.y);
  for (let L = 0; L <= 8; L++) R(12, lvTop(L) + 1, 2, 1, (L === carL && E.phase !== 'moving') ? '#ffe08a' : '#2c2310');
  if (levelState(3) === 'lit') drawTicker(g, t);
  if (levelState(2) === 'lit' && (t % 1000) < 500) R(RX + 72, lvTop(2) + 9, 1, 2, '#7fd19b');
  if (state.pip && I.visible) { const top = lvTop(I.L), on = (t % 640) < 320; R(RX + 52, top + 1, 5, 2, on ? '#ff4d3d' : '#7f2620'); if (on) for (let y = 3; y < 12; y++) for (let x = 46; x < 64; x++) if (((x + y) & 1) === 0 && Math.abs(x - 54) < (y - 1)) R(RX + x, top + y, 1, 1, '#7f2620'); }
  if (hoverL != null) { const top = lvTop(hoverL); R(RX, top, RW, 1, '#f2c14e'); R(RX, top + 29, RW, 1, '#f2c14e'); R(RX, top, 1, 30, '#f2c14e'); R(RX + RW - 1, top, 1, 30, '#f2c14e'); }
  if (levelState(6) === 'lit') drawSprite(g, getSprite(0, ((t / 560) | 0) % 2 ? 'idle' : 'idle', ((t / 560) | 0) % 2, { hair: 'blond' }), tx + RX + 44, ty + lvTop(6) + 30, false);
  if (I.visible) {
    const pose = internPose();
    const sp = getSprite(state.rank, pose, I.frame, { blink: I.blink, pip: state.pip, obj: state.rank === 7 ? 'phone' : 'mug' });
    drawSprite(g, sp, tx + I.x, ty + lvTop(I.L) + 30, I.dir < 0);
  }
  for (const p of pigeons) if (p.st !== 'away') IE.drawPigeon(g, tx + p.x, ty + p.y, p.f, p.flip);
  IE.drawConfetti(g, conf);
}

function passLights(dir){
  const p = levelFromY(E.y); let ch = false;
  if (dir < 0) { if (p > state.litTop && p <= state.rank) { state.litTop = p; ch = true; } }
  else if (p < state.litTop && state.litTop > state.rank) { state.litTop = Math.max(state.rank, p); ch = true; }
  if (ch) { buildTower(); blip(); }
}
function elevTo(L, cb){
  E.targetL = L; E.target = carYFor(L); E.cb = cb || null; I.visible = false; hideBubble();
  if (E.doors > 0 && E.phase !== 'moving') E.phase = 'closing'; else E.phase = 'moving';
}
function updateElevator(dt){
  if (E.phase === 'closing') { E.doors = Math.max(0, E.doors - dt / 170); if (!E.doors) E.phase = 'moving'; }
  else if (E.phase === 'moving') {
    const d = E.target - E.y;
    if (Math.abs(d) < 0.6) { E.y = E.target; E.v = 0; E.phase = 'opening'; if (state.litTop !== state.rank) { state.litTop = state.rank; buildTower(); } ding(); scarePigeons(); }
    else { const maxv = Math.max(0.02, Math.min(0.12, Math.abs(d) * 0.005)); E.v = Math.min(E.v + 0.0004 * dt, maxv); E.y += Math.sign(d) * Math.min(Math.abs(d), E.v * dt); passLights(Math.sign(d)); }
  } else if (E.phase === 'opening') {
    E.doors = Math.min(1, E.doors + dt / 220);
    if (E.doors === 1) { E.phase = 'open'; internExit(); const cb = E.cb; E.cb = null; if (cb) cb(); }
  }
}
function internExit(){ Object.assign(I, { visible: true, L: E.targetL, x: 14, dir: 1, walking: true, target: 52 + (Math.random() * 36 | 0), frame: 0, acc: 0, ov: null }); }
function internPlace(){ Object.assign(I, { visible: true, L: state.rank, x: 66, dir: 1, walking: false, timer: 2000, frame: 0, ov: null, carrying: false }); }
const FMS = { idle: 540, walk: 140, box: 150, sip: 520, cheer: 230, sad: 900 };
function updateIntern(dt){
  if (!I.visible) return;
  I.blinkT -= dt; if (I.blinkT < 0) { I.blink = true; if (I.blinkT < -130) { I.blink = false; I.blinkT = 2200 + Math.random() * 2600; } }
  const pose = internPose();
  I.frameT += dt; const fm = FMS[pose] || 500; if (I.frameT > fm) { I.frameT = 0; I.frame ^= 1; }
  if (I.ov) { I.ov.t -= dt; if (I.ov.t <= 0) { I.ov = null; I.timer = 1200; } return; }
  if (I.walking) {
    const stepMs = state.pip ? 110 : 70;
    I.acc += dt; while (I.acc > stepMs) { I.acc -= stepMs; if (I.x !== I.target) I.x += Math.sign(I.target - I.x); }
    if (I.x === I.target) {
      I.walking = false; I.timer = 1800 + Math.random() * 3000; I.frame = 0;
      if (I.carrying) { I.carrying = false; }
      if (I.after) { const a = I.after; I.after = null; I.ov = { pose: a, t: a === 'cheer' ? 1900 : 1500 }; }
    }
  } else {
    I.timer -= dt;
    if (I.timer <= 0 && !reduceMotion) {
      if (!state.pip && Math.random() < 0.3) { I.ov = { pose: 'sip', t: 1600 }; return; }
      let nt; do { nt = 38 + (Math.random() * 82 | 0); } while (Math.abs(nt - I.x) < 12); I.target = nt; I.dir = Math.sign(nt - I.x); I.walking = true;
    }
  }
}

/* bubble, tooltip, toast */
const bubble = $('#bubble'), tip = $('#tip'), toastEl = $('#toast');
let bubbleOn = false, bubbleW = 0, bubbleIdx = 0;
const quotes = CONFIG.log.filter(e => e.text).slice(0, 5);
function setBubble(i){ const q = quotes[i % quotes.length]; if (!q) return; $('#bubbleMeta').textContent = `Day ${q.day} · ${q.time}`; $('#bubbleText').textContent = q.text; bubbleW = 0; bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop'); }
function showBubble(){ if (!quotes.length) return; bubbleOn = true; bubble.hidden = false; setBubble(bubbleIdx); positionBubble(); }
function hideBubble(){ bubbleOn = false; bubble.hidden = true; }
function positionBubble(){
  if (!bubbleOn || !I.visible) return;
  if (!bubbleW) bubbleW = bubble.offsetWidth;
  const hw = hero.clientWidth, half = bubbleW / 2;
  const want = (tx + I.x) * S, left = clamp(want, half + 10, hw - half - 10);
  const below = I.L >= 6; bubble.classList.toggle('below', below);
  bubble.style.left = left + 'px'; bubble.style.top = ((ty + lvTop(I.L) + (below ? 30 : 4)) * S) + 'px';
  bubble.style.setProperty('--ax', clamp(half + (want - left), 14, bubbleW - 14) + 'px');
}
setInterval(() => { if (bubbleOn && quotes.length > 1) { bubbleIdx = (bubbleIdx + 1) % quotes.length; setBubble(bubbleIdx); } }, 7000);

function levelAt(e){
  const hr = hero.getBoundingClientRect();
  const lx = (e.clientX - hr.left) / S - tx, ly = (e.clientY - hr.top) / S - ty;
  if (lx < RX || lx >= RX + RW || ly < TOPF || ly >= TOPF + NLEV * FH) return null;
  return 8 - Math.floor((ly - TOPF) / FH);
}
function floorStatus(L){ if (L === 8) return `Opens at ${fmtUsd(LADDER[8].at)}+`; if (L === state.rank) return "He's here now"; if (L < state.rank) return 'Cleared'; return `Opens at ${fmtUsd(LADDER[L].at)}`; }
function showTip(L, e){
  const d = LADDER[L]; tip.replaceChildren(el('p', 'tip-h', L === 8 ? 'Roof · ???' : `Floor ${d.floor} · ${d.title}`), el('p', 'tip-s', floorStatus(L)), el('p', 'tip-p', d.power), el('p', 'tip-s', 'Click to ride there'));
  tip.hidden = false;
  const hr = hero.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = e.clientX - hr.left + 18, y = e.clientY - hr.top + 18;
  if (x + tw > hr.width - 12) x = e.clientX - hr.left - tw - 18;
  if (y + th > hr.height - 12) y = e.clientY - hr.top - th - 18;
  tip.style.left = Math.max(12, x) + 'px'; tip.style.top = Math.max(12, y) + 'px';
}
function hideTip(){ tip.hidden = true; }
let lastPointer = 'mouse', tipTimer = 0;
slot.addEventListener('pointermove', (e) => { lastPointer = e.pointerType; if (e.pointerType !== 'mouse') return; const L = levelAt(e); hoverL = L; slot.style.cursor = L != null ? 'pointer' : 'default'; if (L != null) showTip(L, e); else hideTip(); });
slot.addEventListener('pointerleave', () => { if (lastPointer === 'mouse') { hoverL = null; hideTip(); } });
slot.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; });
slot.addEventListener('click', (e) => {
  const L = levelAt(e); if (L == null) return;
  if (lastPointer === 'mouse') { hideTip(); hoverL = null; scrollToFloor(L); }
  else { hoverL = L; showTip(L, e); clearTimeout(tipTimer); tipTimer = setTimeout(() => { hoverL = null; hideTip(); }, 2600); }
});

let toastTimer = 0;
function toast(kind, a, b){
  toastEl.className = 'toast ' + kind; toastEl.replaceChildren(el('span', 'toast-a', a), el('span', 'toast-b', b));
  toastEl.hidden = false; void toastEl.offsetWidth; toastEl.classList.add('show');
  $('#live').textContent = `${a}: ${b}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.classList.remove('show'); setTimeout(() => { toastEl.hidden = true; }, 360); }, 2800);
}
function confetti(n){ if (!reduceMotion) IE.spawnConfetti(conf, n, W); }

/* sound (off until the visitor turns it on) */
let AC = null, soundOn = false;
function tone(f, t0, dur, vol = 0.035){ const o = AC.createOscillator(), gn = AC.createGain(); o.type = 'square'; o.frequency.value = f; gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(gn).connect(AC.destination); o.start(t0); o.stop(t0 + dur + 0.02); }
function ding(){ if (!soundOn || !AC) return; const t = AC.currentTime; tone(1318.5, t, 0.3); tone(1046.5, t + 0.14, 0.5); }
function softDing(){ if (!soundOn || !AC) return; const t = AC.currentTime; tone(1318.5, t, 0.18, 0.018); tone(1046.5, t + 0.1, 0.3, 0.018); }
function blip(){ if (!soundOn || !AC) return; tone(330, AC.currentTime, 0.06, 0.015); }
function jingle(up){ if (!soundOn || !AC) return; const t = AC.currentTime + 0.35; (up ? [523.3, 659.3, 784, 1046.5] : [784, 659.3, 523.3, 392]).forEach((f, i) => tone(f, t + i * 0.09, 0.2, 0.03)); }
$('#sfxBtn').addEventListener('click', (e) => {
  soundOn = !soundOn;
  if (soundOn && !AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume();
  e.currentTarget.setAttribute('aria-pressed', String(soundOn)); e.currentTarget.textContent = soundOn ? 'SFX on' : 'SFX off';
  if (soundOn) ding();
});

/* ---------- intro, promotions ---------- */
function startIntro(){
  hideBubble(); conf.length = 0;
  if (reduceMotion) { state.litTop = state.rank; buildTower(); E.y = E.target = carYFor(state.rank); E.targetL = state.rank; E.doors = 1; E.phase = 'open'; internPlace(); needleV = needleTarget; showBubble(); return; }
  state.litTop = -1; buildTower(); E.y = carYFor(0); E.v = 0; E.doors = 0; E.phase = 'hold'; I.visible = false; needleV = 0;
  setTimeout(() => { state.litTop = 0; buildTower(); elevTo(state.rank, () => showBubble()); }, 520);
}
function onRankChange(old, r, animate){
  buildTower(); renderPayroll(); renderBadge(); renderHireNote(); renderPanel();
  world.setRank(r, state.pip); ride.shown = -1;
  if (!animate || reduceMotion) { state.litTop = r; buildTower(); E.y = E.target = carYFor(r); E.targetL = r; E.doors = 1; E.phase = 'open'; internPlace(); if (!bubbleOn) showBubble(); return; }
  const up = r > old;
  elevTo(r, () => {
    if (up) { I.after = 'cheer'; toast('promo', '★ Promoted ★', LADDER[r].title); confetti(110); jingle(true); const wi = world.intern; if (wi) wi.override('cheer', 2400); }
    else { I.carrying = true; toast('demo', 'Demoted · took the stairs', LADDER[r].title); jingle(false); }
    showBubble();
  });
}
function setMcap(m, animate){
  state.mcap = m;
  const r = currentRank();
  if (r !== state.rank) { const old = state.rank; state.rank = r; onRankChange(old, r, animate); }
  renderStatus(); renderPayroll(); renderBadge();
  $('#demoVal').textContent = fmtUsd(m);
}
function setTod(t){
  if (t === state.tod) return;
  state.tod = t; buildTower(); if (W) buildSky(); world.setTod(t); drawFootSky();
}

/* =====================================================================
   The elevator ride
   ===================================================================== */
const ride = { sec: $('#ride'), sticky: $('#rideSticky'), stage: $('#rideStage'), cv: $('#rideCanvas'), S: 2, vw: 0, vh: 0, cam: 0, shown: -1, vis: false, arrived: true, hdr: 76 };
const rideG = ride.cv.getContext('2d');
const world = new ROOMS.RideWorld({ ladder: LADDER, tod: state.tod, rank: state.rank, pip: state.pip, ticker: CONFIG.tickerItems });
function rideLayout(){
  const r = ride.stage.getBoundingClientRect(); if (!r.width || !r.height) return;
  const s = clamp(Math.min(Math.floor(r.height / 112), Math.floor(r.width / 176)), 1, 8);
  ride.S = s; ride.vw = Math.ceil(r.width / s); ride.vh = Math.ceil(r.height / s);
  ride.cv.width = ride.vw; ride.cv.height = ride.vh; ride.cv.style.width = (ride.vw * s) + 'px'; ride.cv.style.height = (ride.vh * s) + 'px';
  rideG.imageSmoothingEnabled = false;
  ride.hdr = parseFloat(getComputedStyle(ride.sticky).top) || 76;
}
function rideTotal(){ return Math.max(1, ride.sec.offsetHeight - ride.sticky.offsetHeight); }
function rideTarget(){
  const r = ride.sec.getBoundingClientRect(), p = clamp((ride.hdr - r.top) / rideTotal(), 0, 1), s = p * 8;
  if (s >= 8) return 8;
  const i = Math.floor(s), f = s - i;
  return i + IE.smooth(clamp((f - 0.28) / 0.44, 0, 1));
}
function scrollToFloor(L){
  const top = ride.sec.getBoundingClientRect().top + window.scrollY - ride.hdr + (L / 8) * rideTotal() + 2;
  window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
}
const panel = $('#ridePanel');
function renderPanel(){
  if (!panel.children.length) for (let L = 0; L <= 8; L++) { const b = el('button', 'fbtn', LADDER[L].floor); b.type = 'button'; b.dataset.l = L; b.addEventListener('click', () => scrollToFloor(L)); panel.append(b); }
  for (const b of panel.children) {
    const L = +b.dataset.l;
    b.classList.toggle('reached', L <= state.rank); b.classList.toggle('here', L === state.rank);
    b.setAttribute('aria-label', `Floor ${LADDER[L].floor}, ${L === 8 ? 'roof' : LADDER[L].title}${L === state.rank ? ', he is here' : L < state.rank ? ', cleared' : ', locked'}`);
    b.setAttribute('aria-current', String(L === ride.shown));
  }
}
function renderCaption(L){
  const d = LADDER[L], chip = $('#capChip');
  $('#capFloor').textContent = L === 8 ? 'Roof' : `Floor ${d.floor}`;
  let kind, label, lead;
  if (L === 8) { kind = 'classified'; label = 'Classified'; lead = 'Nobody has the key. '; }
  else if (L === state.rank) { kind = 'here'; label = "He's here"; lead = state.pip ? 'On a PIP. Hit the next floor or take the stairs. ' : ''; }
  else if (L < state.rank) { kind = ''; label = 'Cleared'; lead = 'He moved up from here. '; }
  else { kind = 'locked'; label = 'Locked'; lead = `Lights off until ${fmtUsd(d.at)}. `; }
  chip.className = 'chip ' + kind; chip.textContent = label;
  $('#capAt').textContent = L === 0 ? 'Starting position' : L === 8 ? `${fmtUsd(d.at)}+ market cap` : `${L <= state.rank ? 'Opened' : 'Opens'} at ${fmtUsd(d.at)} market cap`;
  $('#capTitle').textContent = L === 8 ? '???' : d.title;
  $('#capDoing').textContent = lead + (L === 8 ? '' : 'Unlocks:');
  $('#capPower').textContent = d.power;
  for (const b of panel.children) b.setAttribute('aria-current', String(+b.dataset.l === L));
}
function updateRide(dt, now){
  const target = rideTarget();
  const k = reduceMotion ? 1 : Math.min(1, dt * 0.012);
  ride.cam += (target - ride.cam) * k; if (Math.abs(target - ride.cam) < 0.002) ride.cam = target;
  const fl = clamp(Math.round(ride.cam), 0, 8);
  if (fl !== ride.shown) { ride.shown = fl; renderCaption(fl); }
  const off = Math.abs(ride.cam - Math.round(ride.cam));
  if (off < 0.01 && !ride.arrived) { ride.arrived = true; softDing(); } else if (off > 0.08) ride.arrived = false;
  const moving = Math.abs(target - ride.cam) > 0.01 || (off > 0.02) ? Math.sign(target - ride.cam || 1) : 0;
  const vis = world.visible(ride.cam, ride.vh);
  world.update(reduceMotion ? 0 : dt, vis);
  world.draw(rideG, ride.vw, ride.vh, ride.cam, now, { moving });
}

/* ---------- loop ---------- */
let last = performance.now(), flickT = 0;
function loop(now){
  requestAnimationFrame(loop);
  const dt = Math.min(64, now - last); last = now;
  if (heroVisible && W) {
    needleV += (needleTarget - needleV) * Math.min(1, dt * 0.004);
    updateElevator(dt); updateIntern(dt); updatePigeons(dt); if (!reduceMotion) updateSkyLife(dt);
    IE.stepConfetti(conf, dt, H);
    flickT += dt; if (flickT > 650 && skyOut.flick.length) { flickT = 0; const f = skyOut.flick[Math.random() * skyOut.flick.length | 0]; f.on = !f.on; }
    draw(now); positionBubble();
  }
  if (ride.vis && ride.vw) updateRide(dt, now);
}

/* =====================================================================
   Page sections
   ===================================================================== */
function renderStatus(){
  const d = LADDER[state.rank];
  $('#stTitle').textContent = d.title; $('#stMcap').textContent = fmtUsd(state.mcap);
  const nx = LADDER[state.rank + 1];
  $('#stNext').textContent = state.rank < 7 ? `${nx.title} @ ${fmtUsd(nx.at)}` : `The roof @ ${fmtUsd(nx.at)}`;
  const p = progress(), track = $('#meter'), seg = 16, n = Math.max(1, Math.floor(track.clientWidth / seg));
  $('#meterFill').style.width = (Math.round(p * n) * seg) + 'px'; $('#stPct').textContent = Math.round(p * 100) + '%';
  const k = statusKind(), chip = $('#stChip');
  chip.className = 'chip ' + k; chip.textContent = { ok: 'On the job', close: 'Promotion soon', review: 'Promotion review', pip: 'PIP warning' }[k];
  const paid = state.rank >= 5;
  $('#stFoot').textContent = `Day ${CONFIG.daysEmployed} on the job · ${paid ? 'Salary paid out' : `Salary $0.00 · ${CONFIG.deferredSalarySol} SOL deferred`}`;
  needleTarget = state.rank + (state.rank < 7 ? p * 0.98 : 0);
}

function renderLog(){
  const grid = $('#logGrid');
  for (const e of CONFIG.log) {
    const m = el('article', 'memo pframe ' + e.type);
    const head = el('div', 'memo-head');
    head.append(el('span', 'memo-k', e.type === 'promo' ? '★ Promoted' : e.type === 'pip' ? 'PIP notice' : 'Desk note'), el('span', 'memo-t', `Day ${e.day} · ${e.time}`));
    m.append(head);
    if (e.type === 'promo' && e.title) m.append(el('span', 'memo-title', '→ ' + e.title));
    m.append(el('p', null, e.text));
    grid.append(m);
  }
}

/* ---------- staff badge ---------- */
const badge = $('#badge'), bctx = badge.getContext('2d');
let handle = '', dept = CONFIG.departments[1], pfp = null, reroll = 0;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function drawColleague(seed){
  const c = document.createElement('canvas'); c.width = 46; c.height = 46; const g = c.getContext('2d');
  const rng = mulberry(seed), pick = (a) => a[rng() * a.length | 0];
  const bg = pick(['#cfe3d8', '#d9d2ef', '#f2dcc2', '#cfe0ef', '#efd1d1', '#e8e3c9']);
  const [sk, sk2] = pick([['#f6d0b1', '#e0aa88'], ['#eab890', '#cf946c'], ['#c98d63', '#a96f48'], ['#9c6643', '#7f4e30'], ['#6e4429', '#55321d']]);
  const hair = pick(['#1f1a1a', '#4f2e19', '#7a4a2a', '#c58b3f', '#e3c27a', '#9a9aa8', '#b5452f']);
  const style = pick(['short', 'long', 'bun', 'cap', 'buzz', 'curly']);
  const shirt = pick(['#3f6fd1', '#3f9a68', '#c8463d', '#7b5cd6', '#2b3150', '#e6eaf2', '#c9a77a']);
  const capC = pick(['#c8463d', '#2b3150', '#3f9a68', '#f2c14e']);
  const glasses = rng() < 0.35;
  const mask = new Uint8Array(46 * 46), col = new Array(46 * 46);
  const put = (x, y, cc) => { if (x < 0 || y < 0 || x >= 46 || y >= 46) return; mask[y * 46 + x] = 1; col[y * 46 + x] = cc; };
  const inEl = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  if (style === 'long') for (let y = 8; y < 38; y++) for (let x = 8; x < 38; x++) if (inEl(x, y, 22.5, 21, 13.5, 16)) put(x, y, hair);
  for (let y = 34; y < 46; y++) { const half = 13 + (y - 34); for (let x = Math.round(22.5 - half); x <= Math.round(22.5 + half); x++) put(x, y, shirt); }
  for (let y = 28; y < 37; y++) for (let x = 19; x <= 26; x++) put(x, y, sk2);
  for (let i = 0; i < 4; i++) { put(21 - i + 1, 34 + i, sk2); put(24 + i, 34 + i, sk2); }
  for (let y = 6; y < 32; y++) for (let x = 10; x < 36; x++) if (inEl(x, y, 22.5, 19, 10.5, 12.5)) put(x, y, sk);
  put(11, 19, sk); put(11, 20, sk2); put(34, 19, sk); put(34, 20, sk2);
  if (style === 'short' || style === 'long' || style === 'bun') {
    for (let y = 4; y < 15; y++) for (let x = 9; x < 37; x++) if (inEl(x, y, 22.5, 18, 12, 13.5)) put(x, y, hair);
    for (let x = 12; x < 34; x++) if (((x * 7 + seed) % 5) < 2) put(x, 15, hair);
    for (let y = 14; y < 20; y++) { put(11, y, hair); put(34, y, hair); }
    if (style === 'bun') for (let y = 0; y < 9; y++) for (let x = 17; x < 29; x++) if (inEl(x, y, 22.5, 4, 4.5, 4)) put(x, y, hair);
  } else if (style === 'buzz') { for (let y = 5; y < 11; y++) for (let x = 11; x < 35; x++) if (inEl(x, y, 22.5, 18, 11, 13)) put(x, y, hair); }
  else if (style === 'curly') { for (let a = 200; a <= 340; a += 18) { const cx = 22.5 + Math.cos(a * Math.PI / 180) * 11, cy = 17 + Math.sin(a * Math.PI / 180) * 11; for (let y = Math.floor(cy - 4); y <= cy + 4; y++) for (let x = Math.floor(cx - 4); x <= cx + 4; x++) if (inEl(x, y, cx, cy, 4.2, 4.2)) put(x, y, hair); } }
  else if (style === 'cap') { for (let y = 4; y < 13; y++) for (let x = 10; x < 36; x++) if (inEl(x, y, 22.5, 14, 12.5, 10)) put(x, y, capC); for (let x = 6; x < 28; x++) { put(x, 12, shade(capC, -0.3)); put(x, 13, shade(capC, -0.3)); } for (let y = 13; y < 18; y++) { put(11, y, hair); put(34, y, hair); } }
  put(18, 20, INK); put(18, 21, INK); put(27, 20, INK); put(27, 21, INK);
  put(17, 18, shade(hair, -0.2)); put(18, 18, shade(hair, -0.2)); put(27, 18, shade(hair, -0.2)); put(28, 18, shade(hair, -0.2));
  for (const x of [21, 22, 23, 24]) put(x, 26, '#9c4a3c'); put(20, 25, '#9c4a3c'); put(25, 25, '#9c4a3c');
  put(15, 23, shade(sk, -0.08)); put(30, 23, shade(sk, -0.08));
  if (glasses) { for (const ox of [15, 24]) { for (let x = ox; x < ox + 7; x++) { put(x, 18, INK); put(x, 23, INK); } for (let y = 18; y < 24; y++) { put(ox, y, INK); put(ox + 6, y, INK); } } put(22, 20, INK); put(23, 20, INK); }
  g.fillStyle = bg; g.fillRect(0, 0, 46, 46);
  g.fillStyle = shade(bg, -0.06); for (let y = 0; y < 46; y += 2) for (let x = (y >> 1) & 1; x < 46; x += 4) g.fillRect(x, y, 1, 1);
  for (let y = 0; y < 46; y++) for (let x = 0; x < 46; x++) {
    const i = y * 46 + x;
    if (mask[i]) { g.fillStyle = col[i]; g.fillRect(x, y, 1, 1); }
    else if ((x > 0 && mask[i - 1]) || (x < 45 && mask[i + 1]) || (y > 0 && mask[i - 46]) || (y < 45 && mask[i + 46])) { g.fillStyle = INK; g.fillRect(x, y, 1, 1); }
  }
  return c;
}
function today(){ const d = new Date(); return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function renderBadge(){
  const g = bctx, r = state.rank, col = LADDER[r].color, R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  g.clearRect(0, 0, 128, 212);
  const strapHi = shade(col, 0.25), strapLo = shade(col, -0.25);
  for (let y = 0; y < 21; y++) {
    const lx = 40 + Math.round(y * 0.8), rx = 82 - Math.round(y * 0.8), c = (y % 4 === 0) ? strapHi : (y % 4 === 2 ? strapLo : col);
    R(lx - 1, y, 1, 1, INK); R(lx, y, 6, 1, c); R(lx + 6, y, 1, 1, INK);
    R(rx - 1, y, 1, 1, INK); R(rx, y, 6, 1, c); R(rx + 6, y, 1, 1, INK);
  }
  R(57, 19, 14, 4, INK); R(58, 20, 12, 2, '#c9952f'); R(58, 20, 12, 1, '#f2c14e');
  R(59, 23, 10, 8, INK); R(60, 23, 8, 7, '#f2c14e'); R(60, 23, 8, 1, '#ffe08a'); R(62, 26, 4, 2, '#5c3f12');
  R(7, 30, 114, 1, INK); R(7, 207, 114, 1, INK); R(6, 31, 1, 176, INK); R(121, 31, 1, 176, INK);
  R(7, 31, 114, 176, '#f6ecd6');
  R(7, 31, 114, 22, col); R(7, 52, 114, 1, shade(col, -0.35));
  R(52, 34, 24, 4, '#1a1428'); R(53, 35, 22, 2, '#2b2440');
  const light = IE.lum(col) > 150;
  ptext(g, 'INTERN & CO.', 64, 42, light ? INK : '#ffffff', { align: 'center' });
  R(40, 58, 48, 48, INK);
  const portrait = pfp || drawColleague(hashStr((handle || 'staff') + ':' + reroll));
  g.drawImage(portrait, 41, 59);
  const h = handle ? '@' + handle : '@YOURHANDLE';
  ptext(g, h, 64, 111, handle ? INK : '#9a8c6c', { align: 'center' });
  ptext(g, dept, 64, 121, '#5c4f38', { align: 'center' });
  ptext(g, 'EMP #' + String(10000 + hashStr(handle || 'staff') % 90000), 64, 131, '#9a8c6c', { align: 'center' });
  for (let x = 12; x < 116; x += 3) R(x, 142, 2, 1, '#cdb994');
  ptext(g, 'HIRED WHEN HE WAS', 64, 147, '#7d6f55', { align: 'center' });
  R(10, 157, 108, 15, col); R(10, 157, 108, 1, shade(col, 0.25)); R(10, 171, 108, 1, shade(col, -0.35));
  ptext(g, LADDER[r].title, 64, 161, light ? INK : '#ffffff', { align: 'center' });
  ptext(g, 'AT ' + fmtUsd(state.mcap) + ' MCAP', 64, 177, '#2b2440', { align: 'center' });
  ptext(g, today(), 64, 187, '#7d6f55', { align: 'center' });
  const bars = mulberry(hashStr((handle || 'staff') + dept)); let bx = 20;
  while (bx < 108) { const w = 1 + (bars() * 3 | 0); if (bars() < 0.62) R(bx, 197, w, 7, INK); bx += w; }
  updatePostLink();
}
function renderHireNote(){ const n = $('#hireNote'); n.replaceChildren("Today's stamp: ", el('b', null, LADDER[state.rank].title), '. Save the badge and attach it to your post.'); }
function updatePostLink(){
  const d = LADDER[state.rank];
  const msg = `Just got hired at ${CONFIG.ticker}. He was ${d.art} ${d.title} when I joined.\n\nPromote the intern.` + (CONFIG.siteUrl ? `\n${CONFIG.siteUrl}` : '');
  $('#postX').href = 'https://x.com/intent/post?text=' + encodeURIComponent(msg);
}
function composeShare(){
  const c = document.createElement('canvas'); c.width = 240; c.height = 240; const g = c.getContext('2d');
  g.fillStyle = '#143826'; g.fillRect(0, 0, 240, 240);
  g.fillStyle = '#173f2c'; for (let y = 0; y < 240; y += 2) for (let x = (y >> 1) & 1 ? 0 : 1; x < 240; x += 2) g.fillRect(x, y, 1, 1);
  g.fillStyle = '#2a6b4a'; for (let i = 6; i < 234; i += 4) { g.fillRect(i, 5, 2, 1); g.fillRect(i, 234, 2, 1); g.fillRect(5, i, 1, 2); g.fillRect(234, i, 1, 2); }
  const sh = document.createElement('canvas'); sh.width = 128; sh.height = 212; const sg = sh.getContext('2d');
  sg.drawImage(badge, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#0a2015'; sg.fillRect(0, 0, 128, 212);
  g.drawImage(sh, 59, 9); g.drawImage(badge, 56, 6);
  ptext(g, CONFIG.ticker + ' · PROMOTE THE INTERN', 120, 225, '#f4ead5', { align: 'center' });
  const big = document.createElement('canvas'); big.width = 1200; big.height = 1200; const bg = big.getContext('2d');
  bg.imageSmoothingEnabled = false; bg.drawImage(c, 0, 0, 1200, 1200);
  return big;
}
let DL = null;
if (window.claude && typeof window.claude.use === 'function') { window.claude.use('downloads').then((d) => { DL = d; }).catch(() => {}); }
async function saveBadge(){
  const msg = $('#hireMsg'); msg.textContent = 'Printing your badge...';
  const blob = await new Promise((res) => composeShare().toBlob(res, 'image/png'));
  if (!blob) { msg.textContent = "Couldn't render the badge. Try again."; return; }
  const name = `intern-badge-${handle || 'staff'}.png`;
  if (DL) {
    try { await DL.save({ filename: name, data: blob }); msg.textContent = 'Badge saved. Attach it to your post.'; }
    catch (e) { msg.textContent = e && e.code === 'declined' ? 'Save cancelled.' : "Saving isn't available here. Right-click the badge and copy the image instead."; }
    return;
  }
  if (window.claude) { msg.textContent = "Saving isn't available in this preview. Right-click the badge and copy the image instead."; return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); msg.textContent = 'Badge downloaded. Attach it to your post.';
}
function setupHire(){
  const chips = $('#deptChips');
  CONFIG.departments.forEach((d, i) => {
    const lab = el('label'); const inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'dept'; inp.id = 'dept' + i; inp.value = d; inp.checked = d === dept;
    inp.addEventListener('change', () => { dept = d; renderBadge(); });
    lab.append(inp, el('span', null, d)); chips.append(lab);
  });
  $('#handleInput').addEventListener('input', (e) => { const v = e.target.value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 15); if (v !== e.target.value) e.target.value = v; handle = v; renderBadge(); });
  $('#pfpInput').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = 46; c.height = 46; const g = c.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      const s = Math.min(img.width, img.height); g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 46, 46);
      const d = g.getImageData(0, 0, 46, 46); for (let i = 0; i < d.data.length; i += 4) for (let k = 0; k < 3; k++) d.data[i + k] = Math.round(clamp((d.data[i + k] - 128) * 1.12 + 128, 0, 255) / 51) * 51;
      g.putImageData(d, 0, 0); pfp = c; URL.revokeObjectURL(url); renderBadge(); $('#hireMsg').textContent = 'Photo pixelated for your badge.';
    };
    img.onerror = () => { $('#hireMsg').textContent = "That file isn't an image we can read. Try a PNG or JPG."; URL.revokeObjectURL(url); };
    img.src = url;
  });
  $('#rerollBtn').addEventListener('click', () => { pfp = null; reroll++; $('#pfpInput').value = ''; renderBadge(); });
  $('#hireForm').addEventListener('submit', (e) => { e.preventDefault(); saveBadge(); });
}

/* ---------- payroll, steps, links ---------- */
function renderPayroll(){
  const paid = state.rank >= 5;
  $('#payOwed').textContent = `${CONFIG.deferredSalarySol} SOL`;
  $('#payPos').textContent = LADDER[state.rank].title;
  $('#payDate').textContent = paid ? 'Paid out at VP' : `On promotion to VP (${fmtUsd(LADDER[5].at)})`;
  $('#payWallet').textContent = paid ? (CONFIG.salaryWallet || 'Announced on X') : 'Assigned at VP';
  const st = $('#payStamp'); st.className = 'stamp ' + (paid ? 'cleared' : 'locked'); st.textContent = paid ? 'Paid' : 'Locked';
  $('#payProg').textContent = paid ? 'Next: trading desk at CEO' : `${fmtUsd(state.mcap)} of ${fmtUsd(LADDER[5].at)} to payday`;
}
function drawIcon(id, rows, pal){ const c = $(id); if (!c) return; drawRows(c.getContext('2d'), rows, pal, 0, 0); }
function setupStatic(){
  drawIcon('#logoIcon', ['L..........L', '.L........L.', '..L......L..', '...L....L...', '....LYYL....', '.....YY.....', '..OOOOOOOO..', '..ORRRRRRO..', '..OCCHHCCO..', '..OCHSSHCO..', '..OCCSSCCO..', '..OCCCCCCO..', '..OCkkkkCO..', '..OOOOOOOO..'],
    { L:'#3f6fd1', Y:'#f2c14e', O:'#000000', R:'#f2c14e', C:'#f4ead5', H:'#6b4126', S:'#f3c6a2', k:'#5c6680' });
  const ico = { O:'#05070f', G:'#3f9a68', g:'#7fd19b', Y:'#f2c14e', y:'#a8792a', W:'#fbf4e2', A:'#9aa5c7' };
  drawIcon('#ic1', ['................', '................', '..OOOOOOOOOOO...', '.OgggggggggggO..', '.OGGGGGGGGGGGOO.', '.OGGGGGGGGOOOOOO', '.OGGGGGGGGOYYYYO', '.OGGGGGGGGOYOYYO', '.OGGGGGGGGOYYYYO', '.OGGGGGGGGOOOOOO', '.OGGGGGGGGGGGOO.', '.OGGGGGGGGGGGO..', '..OOOOOOOOOOO...', '................', '................', '................'], ico);
  drawIcon('#ic2', ['................', '.....OOOOOO.....', '...OOYYYYYYOO...', '..OYYYYYYYYYYO..', '..OYYYYOOYYYYO..', '.OYYYYOWWOYYYYO.', '.OYYYOWWWWOYYYO.', '.OYYOWWWWWWOYYO.', '.OYYOOOWWOOOYYO.', '.OYYYYOWWOYYYYO.', '..OYYYOWWOYYYO..', '..OyYYOOOOYYyO..', '...OOyyyyyyOO...', '.....OOOOOO.....', '................', '................'], ico);
  drawIcon('#ic3', ['.......OO.......', '......OYYO......', '......OYYO......', '.....OYYYYO.....', 'OOOOOOYYYYOOOOOO', 'OYYYYYYYYYYYYYYO', '.OYYYYYYYYYYYYO.', '..OYYYYYYYYYYO..', '...OYYYYYYYYO...', '...OYYYYYYYYO...', '..OYYYYOOYYYYO..', '..OYYYO..OYYYO..', '.OYYOO....OOYYO.', '.OOO........OOO.', '................', '................'], ico);
  drawIcon('#payIcon', ['................', '.....OOOOOO.....', '....OAAAAAAO....', '...OAOOOOOOAO...', '...OAO....OAO...', '...OAO....OAO...', '..OOOOOOOOOOOO..', '..OYYYYYYYYYYO..', '..OYYYYOOYYYYO..', '..OYYYOOOOYYYO..', '..OYYYYOOYYYYO..', '..OYYYYOOYYYYO..', '..OYYYYYYYYYYO..', '..OyyyyyyyyyyO..', '..OOOOOOOOOOOO..', '................'], ico);
  const L = CONFIG.links, buy = L.pumpfun || (CONFIG.ca ? `https://pump.fun/coin/${CONFIG.ca}` : '');
  for (const id of ['#buyTop', '#buyHero']) { const a = $(id); if (buy) { a.href = buy; a.target = '_blank'; a.rel = 'noopener'; } }
  const ca = $('#caText'), copy = $('#caCopy');
  if (CONFIG.ca) ca.textContent = CONFIG.ca; else { copy.setAttribute('aria-disabled', 'true'); copy.textContent = 'Soon'; }
  copy.addEventListener('click', async () => {
    if (!CONFIG.ca) return;
    try { await navigator.clipboard.writeText(CONFIG.ca); copy.textContent = 'Copied'; }
    catch (_) { const r = document.createRange(); r.selectNodeContents(ca); const s = getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = 'Selected'; }
    setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
  });
  const fl = $('#footLinks');
  const links = [['X', L.x], ['pump.fun', buy], ['DexScreener', L.dexscreener || (CONFIG.ca ? `https://dexscreener.com/solana/${CONFIG.ca}` : '')]];
  for (const [t, href] of links) { const a = el('a', null, href ? t : `${t} (soon)`); a.href = href || '#how'; if (href) { a.target = '_blank'; a.rel = 'noopener'; } fl.append(a); }
  fl.append(Object.assign(el('a', null, 'Back to the lobby'), { href: '#hero' }));
}
function drawFootSky(){
  const c = $('#footSky'), w = Math.ceil(c.clientWidth / 2) || 600, h = 56; c.width = w; c.height = h;
  const g = IE.ctx(c), T = TOD[state.tod];
  IE.vgrad(g, 0, 0, w, h, ['#070b18', T.sky[3], T.sky[4]]);
  IE.paintSkyline(g, 0, w, h, 23, state.tod, null);
}

/* ---------- live market cap (works on your own domain; the preview frame blocks outside requests) ---------- */
async function fetchMcap(){
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CONFIG.ca}`); const j = await r.json();
    const pairs = (j.pairs || []).filter((p) => p.chainId === 'solana'); if (!pairs.length) return;
    pairs.sort((x, y) => ((y.liquidity && y.liquidity.usd) || 0) - ((x.liquidity && x.liquidity.usd) || 0));
    const m = pairs[0].marketCap || pairs[0].fdv; if (m) setMcap(m, true);
  } catch (_) { /* keep the last known value */ }
}

/* ---------- preview controls ---------- */
const MIN_M = 5000, MAX_M = 600000;
const toSlider = (m) => Math.round(1000 * Math.log(m / MIN_M) / Math.log(MAX_M / MIN_M));
const fromSlider = (v) => Math.round(MIN_M * Math.pow(MAX_M / MIN_M, v / 1000) / 100) * 100;
function setupDemo(){
  if (!CONFIG.demo) return;
  const demo = $('#demo'), body = $('#demoBody'), tog = $('#demoToggle');
  demo.hidden = false;
  tog.addEventListener('click', () => { const open = body.hidden; body.hidden = !open; tog.setAttribute('aria-expanded', String(open)); $('#demoChevron').textContent = open ? '−' : '+'; });
  const sl = $('#demoMcap'); sl.value = toSlider(state.mcap);
  sl.addEventListener('input', () => setMcap(fromSlider(+sl.value), true));
  $('#demoPip').addEventListener('click', (e) => {
    state.pip = !state.pip; e.currentTarget.setAttribute('aria-pressed', String(state.pip)); e.currentTarget.textContent = state.pip ? 'PIP on' : 'PIP off';
    renderStatus(); world.setRank(state.rank, state.pip); ride.shown = -1; if (state.pip) toast('pip', 'PIP notice', 'Hit the next floor or take the stairs');
  });
  $('#demoReplay').addEventListener('click', () => { hero.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); startIntro(); });
  const sel = $('#demoTod'); sel.value = todSetting;
  sel.addEventListener('change', () => { todSetting = sel.value; $('#demoTodVal').textContent = sel.options[sel.selectedIndex].text.split(' ')[0]; setTod(todNow()); });
}

/* ---------- boot ---------- */
const topbar = $('#topbar');
window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 8), { passive: true });
new IntersectionObserver((en) => { heroVisible = en[0].isIntersecting; }).observe(hero);
new IntersectionObserver((en) => { ride.vis = en[0].isIntersecting; }, { rootMargin: '100px' }).observe(ride.sec);
let layoutQueued = false;
const relayout = () => { if (layoutQueued) return; layoutQueued = true; requestAnimationFrame(() => { layoutQueued = false; layout(); renderStatus(); drawFootSky(); rideLayout(); }); };
new ResizeObserver(relayout).observe(hero);
new ResizeObserver(relayout).observe(ride.stage);
setInterval(() => { if (todSetting === 'auto') setTod(todNow()); }, 60000);

setupStatic(); setupHire(); renderLog(); renderStatus(); renderPayroll(); renderHireNote(); renderBadge(); renderPanel(); setupDemo();
layout(); drawFootSky(); rideLayout();
if (CONFIG.ca && !CONFIG.demo && CONFIG.live) { fetchMcap(); setInterval(fetchMcap, 30000); }
startIntro();
requestAnimationFrame(loop);
})();
