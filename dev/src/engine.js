/* =====================================================================
   INTERN pixel engine. Everything is drawn pixel by pixel on one grid:
   bitmap font, the intern and his coworkers, the sky, the tower.
   ===================================================================== */
const IE = (() => {
'use strict';

/* ---------- utils ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function mulberry(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s){ let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function hex2rgb(h){ const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgb2hex(r, g, b){ return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
function shade(h, amt){ const [r, g, b] = hex2rgb(h); const t = amt < 0 ? 0 : 255, p = Math.abs(amt); return rgb2hex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p); }
function mix(a, b, t){ const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function lum(h){ const [r, g, b] = hex2rgb(h); return 0.3 * r + 0.59 * g + 0.11 * b; }
function fmtUsd(n){
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return '$' + Math.round(n);
}
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const dith = (x, y, t) => t * 16 > BAYER[y & 3][x & 3] + 0.5;
function canvas(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctx(c, read){ const g = c.getContext('2d', read ? { willReadFrequently: true } : undefined); g.imageSmoothingEnabled = false; return g; }
const smooth = (t) => t * t * (3 - 2 * t);
const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ---------- 5x7 bitmap font ---------- */
const GL = {
  A:'.###.|#...#|#...#|#####|#...#|#...#|#...#', B:'####.|#...#|#...#|####.|#...#|#...#|####.', C:'.###.|#...#|#....|#....|#....|#...#|.###.',
  D:'####.|#...#|#...#|#...#|#...#|#...#|####.', E:'#####|#....|#....|####.|#....|#....|#####', F:'#####|#....|#....|####.|#....|#....|#....',
  G:'.###.|#...#|#....|#.###|#...#|#...#|.####', H:'#...#|#...#|#...#|#####|#...#|#...#|#...#', I:'###|.#.|.#.|.#.|.#.|.#.|###',
  J:'..###|...#.|...#.|...#.|...#.|#..#.|.##..', K:'#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L:'#....|#....|#....|#....|#....|#....|#####',
  M:'#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N:'#...#|#...#|##..#|#.#.#|#..##|#...#|#...#', O:'.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P:'####.|#...#|#...#|####.|#....|#....|#....', Q:'.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R:'####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S:'.####|#....|#....|.###.|....#|....#|####.', T:'#####|..#..|..#..|..#..|..#..|..#..|..#..', U:'#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V:'#...#|#...#|#...#|#...#|#...#|.#.#.|..#..', W:'#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.', X:'#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y:'#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z:'#####|....#|...#.|..#..|.#...|#....|#####',
  '0':'.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', '1':'.#.|##.|.#.|.#.|.#.|.#.|###', '2':'.###.|#...#|....#|...#.|..#..|.#...|#####',
  '3':'#####|...#.|..#..|...#.|....#|#...#|.###.', '4':'...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', '5':'#####|#....|####.|....#|....#|#...#|.###.',
  '6':'..##.|.#...|#....|####.|#...#|#...#|.###.', '7':'#####|....#|...#.|..#..|.#...|.#...|.#...', '8':'.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  '9':'.###.|#...#|#...#|.####|....#|...#.|.##..',
  ' ':'...|...|...|...|...|...|...', '.':'.|.|.|.|.|.|#', ',':'..|..|..|..|..|.#|#.', ':':'.|.|#|.|.|#|.', '!':'#|#|#|#|#|.|#',
  '?':'.###.|#...#|....#|...#.|..#..|.....|..#..', '$':'..#..|.####|#.#..|.###.|..#.#|####.|..#..', '-':'....|....|....|####|....|....|....',
  '/':'....#|...#.|...#.|..#..|.#...|.#...|#....', '#':'.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.', '&':'.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#',
  "'":'#|#|.|.|.|.|.', '"':'#.#|#.#|...|...|...|...|...', '>':'#...|.#..|..#.|...#|..#.|.#..|#...', '<':'...#|..#.|.#..|#...|.#..|..#.|...#', '_':'.....|.....|.....|.....|.....|.....|#####',
  '@':'.###.|#...#|#.###|#.#.#|#.###|#....|.###.', '(':'..#|.#.|#..|#..|#..|.#.|..#', ')':'#..|.#.|..#|..#|..#|.#.|#..', '+':'.....|..#..|..#..|#####|..#..|..#..|.....',
  '%':'##..#|##..#|...#.|..#..|.#...|#..##|#..##', '=':'....|....|####|....|####|....|....', '·':'.|.|.|#|.|.|.', '→':'.....|..#..|...#.|#####|...#.|..#..|.....',
  '★':'..#..|..#..|#####|.###.|.#.#.|#...#|.....', '▲':'.....|..#..|.###.|#####|.....|.....|.....', '▼':'.....|#####|.###.|..#..|.....|.....|.....'
};
const GLYPH = {}; for (const k in GL) GLYPH[k] = GL[k].split('|');
const glyph = (ch) => GLYPH[ch] || GLYPH['?'];
function textW(s, sc = 1){ let w = 0; for (const ch of String(s).toUpperCase()) w += (glyph(ch)[0].length + 1) * sc; return Math.max(0, w - sc); }
function ptext(g, s, x, y, c, o = {}){
  const sc = o.scale || 1; s = String(s).toUpperCase(); const w = textW(s, sc);
  let cx = o.align === 'center' ? Math.round(x - w / 2) : o.align === 'right' ? x - w : x;
  if (o.shadow) { ptext(g, s, x + sc, y + sc, o.shadow, Object.assign({}, o, { shadow: null })); }
  g.fillStyle = c;
  for (const ch of s) { const gl = glyph(ch); for (let r = 0; r < 7; r++) { const row = gl[r]; for (let k = 0; k < row.length; k++) if (row[k] === '#') g.fillRect(cx + k * sc, y + r * sc, sc, sc); } cx += (gl[0].length + 1) * sc; }
  return w;
}
const MINI = { B:'##.|#.#|##.|#.#|##.', R:'##.|#.#|##.|#.#|#.#', '0':'###|#.#|#.#|#.#|###', '1':'.#.|##.|.#.|.#.|###', '2':'###|..#|###|#..|###', '3':'###|..#|.##|..#|###', '4':'#.#|#.#|###|..#|..#', '5':'###|#..|###|..#|###', '6':'###|#..|###|#.#|###', '7':'###|..#|.#.|.#.|.#.', '8':'###|#.#|###|#.#|###', '9':'###|#.#|###|..#|###' };
function miniText(g, s, cx, y, c){ s = String(s); const w = s.length * 4 - 1; let x = Math.round(cx - w / 2); g.fillStyle = c; for (const ch of s) { const rows = (MINI[ch] || MINI['0']).split('|'); for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (rows[r][k] === '#') g.fillRect(x + k, y + r, 1, 1); x += 4; } }
function drawRows(g, rows, pal, ox, oy){ for (let y = 0; y < rows.length; y++) { const r = rows[y]; for (let x = 0; x < r.length; x++) { const c = pal[r[x]]; if (!c) continue; g.fillStyle = c; g.fillRect(ox + x, oy + y, 1, 1); } } }
function line(g, x0, y0, x1, y1, c){ x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; g.fillStyle = c; let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, err = dx + dy; for (let n = 0; n < 2000; n++) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } } }

/* ---------- default ladder (the site overrides it from CONFIG) ---------- */
const LADDER = [
  { floor:'B1', title:'Unpaid Intern',     at:0,      color:'#9a6a3a' },
  { floor:'1',  title:'Intern',            at:8000,   color:'#8a93a8' },
  { floor:'2',  title:'Junior Analyst',    at:12000,  color:'#3f6fd1' },
  { floor:'3',  title:'Analyst',           at:18000,  color:'#2aa198' },
  { floor:'4',  title:'Associate',         at:25000,  color:'#3f9a68' },
  { floor:'5',  title:'VP',                at:40000,  color:'#7b5cd6' },
  { floor:'6',  title:'Managing Director', at:60000,  color:'#c8463d' },
  { floor:'7',  title:'CEO',               at:100000, color:'#e0b13f' },
  { floor:'R',  title:'???',               at:250000, color:'#5c6680' }
];

/* ---------- the intern: one 16x26 body, eight outfits, many poses ---------- */
const INK = '#1a1428', SKIN = '#f3c6a2', SKIN2 = '#d99d7c', SHIRT = '#f3efe6', SHIRT2 = '#cfc6b6', BLUESHIRT = '#dfe8f5', BLUESHIRT2 = '#b7c3d8';
const SPR_W = 26, SPR_H = 30, SPR_OX = 5, SPR_OY = 3;
const BASE = [
  '................', '....OO.OOO.O....', '...OhHOHHHOhO...', '..OHHHHHHHHHHO..', '..OHhHHHHHhHHO..', '..OHHHHHHHHHHO..',
  '..OHHSHSSSHSHO..', '..OHSSSSSSSSHO..', '..OSSESSSSESSO..', '..OSSESSSSESSO..', '..OsSSSSSSSSsO..', '...OSSSMMSSSO...',
  '....OOSSSSOO....', '...OOccNNccOO...', '..OAWWLKKLWWAO..', '.OAaOWLKKLWOaAO.', '.OAaOWBBBBWOaAO.', '.OAaOWBbbBWOaAO.',
  '.OAaOWBBBBWOaAO.', '.OSSOWWWWWWOSSO.', '.OSSOPPPPPPOSSO.', '..OOOPPPPPPOOO..', '....OPPOOPPO....', '....OPPOOPPO....',
  '...OFFFOOFFFO...', '....OOO..OOO....'
];
const WALK2 = { 23:'....OPPOOFFFO...', 24:'...OFFFOOOOO....', 25:'....OOO.........' };
const HAIR = {
  neat: { 1:'................', 2:'...OOOOOOOOOO...', 3:'..OHhhhhhhHHHO..', 6:'..OHHSSSSSSHHO..' },
  buzz: { 1:'................', 2:'...OOOOOOOOOO...', 3:'..OHHHHHHHHHHO..', 4:'..OHhHHHHHhHHO..', 6:'..OSSSSSSSSSSO..', 7:'..OSSSSSSSSSSO..' },
  bun:  { 0:'......OOOO......', 1:'.....OHhHHO.....', 2:'...OOOHHHHOOO...' },
  long: { 8:'..OHSESSSSESHO..', 9:'..OHSESSSSESHO..', 10:'..OHSSSSSSSSHO..', 11:'..OHSSSMMSSSHO..', 12:'..OHOOSSSSOOHO..', 13:'..OOOccNNccOOO..' }
};
const OUTFITS = [
  { A:'#c9a77a', a:'#a3824f', W:'#c9a77a', c:SHIRT, K:SHIRT, N:SKIN, prop:'tray' },
  { A:SHIRT, a:SHIRT2, W:SHIRT, c:SHIRT, K:SHIRT, N:SKIN, prop:'mug' },
  { A:SHIRT, a:SHIRT2, W:SHIRT, c:SHIRT, K:SHIRT, N:SKIN, prop:'tablet', headset:true },
  { A:BLUESHIRT, a:BLUESHIRT2, W:BLUESHIRT, c:BLUESHIRT, K:'#2b3a67', N:SKIN, prop:'papers' },
  { A:SHIRT, a:SHIRT2, W:SHIRT, c:SHIRT, K:'#7f2a3a', N:'#7f2a3a', prop:'clipboard', rolled:true, pencil:true },
  { A:BLUESHIRT, a:BLUESHIRT2, W:'#2c3d6e', c:BLUESHIRT, K:'#2c3d6e', N:BLUESHIRT, prop:'card' },
  { A:'#26345e', a:'#1b2546', W:'#26345e', c:SHIRT, K:'#c8463d', N:'#c8463d', prop:'briefcase' },
  { A:'#2a2a33', a:'#1c1c24', W:'#2a2a33', c:SHIRT, K:'#f2c14e', N:'#f2c14e', prop:'phone', hair:'neat' }
];
const PROPS = {
  tray:      { x:7,  y:16, rows:['..uu.uu.', '..vv.vv.', 'OOOOOOOO', 'tttttttt'] },
  mug:       { x:12, y:17, rows:['OOOO..', 'OuuOO.', 'OuuO.O', 'OuuOO.', 'OOOO..'] },
  tablet:    { x:11, y:16, rows:['OOOOO', 'OdGdO', 'OGdGO', 'OdddO', 'OOOOO'] },
  papers:    { x:11, y:15, rows:['OOOOO', 'OuuuO', 'OyyuO', 'OuuuO', 'OyuuO', 'OOOOO'] },
  clipboard: { x:11, y:15, rows:['.OYO.', 'OwwwO', 'OuuuO', 'OuyuO', 'OuuuO', 'OwwwO', '.OOO.'] },
  card:      { x:12, y:15, rows:['..u.', 'OOOO', 'OYYO', 'OYzO', 'OOOO'] },
  briefcase: { x:12, y:18, rows:['.OxO.', 'OOOOO', 'OwwwO', 'OwYwO', 'OwwwO', 'OOOOO'] },
  phone:     { x:12, y:17, rows:['OOO', 'OGO', 'OdO', 'OOO'] }
};
const PAL_X = { u:'#fbf4e2', v:'#9a5b3c', t:'#c9a26a', T:'#a8794a', d:'#173f2c', G:'#7fd19b', l:'#2f7a52', y:'#9aa5c7', w:'#7a4128', Y:'#f2c14e', z:'#c9952f', x:'#4a2418', n:'#1d1d2a', q:'#dfe6f2', r:'#e0533f', k:'#2a2f45' };
const HS = '#2b2b3a';
const HEADSET = [[3,3],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,3],[2,4],[13,4],[2,5],[13,5],[1,6],[2,6],[1,7],[2,7],[1,8],[2,8],[2,9],[3,10],[4,11]];

const mirror = (pts) => pts.map(([x, y, c]) => [15 - x, y, c]);
function eraseArm(rows, side){
  for (let y = 15; y <= 20; y++) { const r = rows[y]; if (side === 'L') { r[0] = r[1] = r[2] = r[3] = '.'; r[4] = 'O'; } else { r[12] = r[13] = r[14] = r[15] = '.'; r[11] = 'O'; } }
  const r21 = rows[21]; if (side === 'L') { r21[2] = r21[3] = '.'; } else { r21[12] = r21[13] = '.'; }
}
const TYPE_L = [[1,15,'O'],[2,15,'A'],[3,15,'a'],[1,16,'O'],[2,16,'A'],[3,16,'a'],[1,17,'O'],[2,17,'A'],[3,17,'A'],[2,18,'O'],[3,18,'A'],[4,18,'A'],[5,18,'A'],[6,18,'S'],[7,18,'S'],[3,19,'O'],[4,19,'O'],[5,19,'O'],[6,19,'O'],[7,19,'O']];
const TYPE_PTS = TYPE_L.concat(mirror(TYPE_L));
const CHEER_L = [[-2,4,'O'],[-1,4,'O'],[0,4,'O'],[-3,5,'O'],[-2,5,'S'],[-1,5,'S'],[0,5,'O'],[-3,6,'O'],[-2,6,'S'],[-1,6,'S'],[0,6,'O'],[-2,7,'O'],[-1,7,'A'],[0,7,'a'],[1,7,'O'],[-2,8,'O'],[-1,8,'A'],[0,8,'a'],[1,8,'O'],[-1,9,'O'],[0,9,'A'],[1,9,'a'],[2,9,'O'],[-1,10,'O'],[0,10,'A'],[1,10,'a'],[2,10,'O'],[0,11,'O'],[1,11,'A'],[2,11,'a'],[3,11,'O'],[0,12,'O'],[1,12,'A'],[2,12,'A'],[3,12,'O'],[1,13,'O'],[2,13,'A'],[3,13,'A'],[4,13,'O']];
const CHEER_PTS = CHEER_L.concat(mirror(CHEER_L));
const POINT_R = [[13,13,'O'],[14,13,'O'],[15,13,'O'],[16,13,'O'],[17,13,'O'],[18,13,'O'],[12,14,'A'],[13,14,'A'],[14,14,'A'],[15,14,'A'],[16,14,'A'],[17,14,'S'],[18,14,'S'],[19,14,'O'],[12,15,'a'],[13,15,'a'],[14,15,'a'],[15,15,'a'],[16,15,'O'],[17,15,'S'],[18,15,'O'],[12,16,'O'],[13,16,'O'],[14,16,'O'],[15,16,'O'],[17,16,'O']];
function sipPts(obj, frame){
  if (obj === 'phone') return [[13,7,'O'],[14,7,'O'],[15,7,'O'],[13,8,'O'],[14,8,'n'],[15,8,'O'],[13,9,'O'],[14,9,'n'],[15,9,'O'],[13,10,'O'],[14,10,'n'],[15,10,'O'],[13,11,'S'],[14,11,'S'],[15,11,'O'],[12,12,'O'],[13,12,'S'],[14,12,'O'],[12,13,'O'],[13,13,'A'],[14,13,'O'],[12,14,'A'],[13,14,'a'],[14,14,'O'],[11,15,'O'],[12,15,'A'],[13,15,'O'],[11,16,'O'],[12,16,'O']].concat(frame ? [[16,8,'G']] : [[16,9,'G']]);
  const p = [[11,9,'O'],[12,9,'O'],[13,9,'O'],[14,9,'O'],[11,10,'O'],[12,10,'u'],[13,10,'u'],[14,10,'O'],[15,10,'O'],[11,11,'O'],[12,11,'u'],[13,11,'u'],[14,11,'O'],[15,11,'O'],[11,12,'O'],[12,12,'S'],[13,12,'S'],[14,12,'O'],[12,13,'O'],[13,13,'A'],[14,13,'O'],[12,14,'A'],[13,14,'a'],[14,14,'O'],[11,15,'O'],[12,15,'A'],[13,15,'O'],[11,16,'O'],[12,16,'O']];
  return p.concat(frame ? [[13,8,'q'],[12,7,'q'],[13,5,'q']] : [[12,8,'q'],[13,7,'q'],[12,6,'q']]);
}
function reachPts(obj, frame){
  const X1 = obj === 'card' ? 'Y' : 'u', X2 = obj === 'card' ? 'z' : 'y', d = frame ? 1 : 0;
  const p = [[13,0,'O'],[14,0,'O'],[15,0,'O'],[16,0,'O'],[13,1,'O'],[14,1,X1],[15,1,X1],[16,1,'O'],[13,2,'O'],[14,2,X1],[15,2,X2],[16,2,'O'],[13,3,'O'],[14,3,'S'],[15,3,'S'],[16,3,'O']];
  for (let y = 4; y <= 12; y++) p.push([13,y,'O'],[14,y,'A'],[15,y,'a'],[16,y,'O']);
  p.push([12,13,'O'],[13,13,'A'],[14,13,'A'],[15,13,'O'],[12,14,'A'],[13,14,'A'],[14,14,'O']);
  return p.map(([x, y, c]) => [x, y < 13 ? y + d : y, c]);
}
const BOX_PTS = (() => {
  const p = [];
  for (let x = 2; x <= 13; x++) p.push([x,15,'O'], [x,21,'O']);
  for (let x = 3; x <= 12; x++) { p.push([x,16,'t'], [x,17,'t'], [x,18, x >= 6 && x <= 9 ? 'T' : 't'], [x,19,'t'], [x,20,'T']); }
  p.push([2,16,'O'],[13,16,'O'],[1,17,'O'],[2,17,'S'],[13,17,'S'],[14,17,'O'],[1,18,'O'],[2,18,'S'],[13,18,'S'],[14,18,'O'],[2,19,'O'],[13,19,'O'],[2,20,'O'],[13,20,'O']);
  p.push([9,11,'G'],[8,12,'l'],[9,12,'G'],[10,12,'l'],[7,13,'G'],[8,13,'l'],[9,13,'G'],[10,13,'l'],[11,13,'G'],[6,14,'l'],[7,14,'G'],[8,14,'l'],[9,14,'l'],[10,14,'G'],[11,14,'l']);
  return p;
})();

const SKIN_TONES = [['#f6d0b1', '#e0aa88'], ['#eab890', '#cf946c'], ['#c98d63', '#a96f48'], ['#9c6643', '#7f4e30'], ['#6e4429', '#55321d']];
const HAIRS = ['#2a1d18', '#4f2e19', '#6b4126', '#c58b3f', '#1d1d26', '#8a8a96', '#a8452f', '#e3c27a'];
const SHIRTS = ['#f3efe6', '#dfe8f5', '#e8d6d6', '#d6e8dc', '#c9cfdc', '#2b3150', '#3d4f7d', '#6b3a4a'];
const TIES = ['#c8463d', '#2b3a67', '#3f9a68', '#7b5cd6', '#c9952f', null, null];
const PANTS = ['#2b3150', '#3a3a46', '#4a3f35', '#1f2433'];
function makeLook(seed){
  const r = mulberry(seed), pick = (a) => a[r() * a.length | 0];
  const [S, s] = pick(SKIN_TONES), H = pick(HAIRS), sh = pick(SHIRTS), tie = pick(TIES);
  const dark = lum(sh) < 110;
  return { S, s, H, h: shade(H, 0.25), style: pick(['messy', 'neat', 'long', 'bun', 'buzz', 'neat', 'long']),
    A: sh, a: shade(sh, -0.14), W: sh, c: dark ? '#f3efe6' : sh, K: tie || sh, N: tie || (dark ? '#f3efe6' : S), P: pick(PANTS), M: '#b5584a' };
}

const spriteCache = new Map();
function getSprite(rank, pose = 'idle', frame = 0, o = {}){
  const lk = o.look;
  const key = [rank, pose, frame, o.blink ? 1 : 0, o.pip ? 1 : 0, o.hair || '', o.sil || '', o.obj || '', lk ? lk.key || (lk.key = JSON.stringify(lk)) : '', o.noProp ? 1 : 0, o.lanyard || ''].join('|');
  const hit = spriteCache.get(key); if (hit) return hit;
  const of = OUTFITS[clamp(rank, 0, 7)];
  const rows = BASE.map((r) => r.split(''));
  const style = (lk && lk.style) || of.hair || 'messy';
  if (HAIR[style]) for (const k in HAIR[style]) rows[k] = HAIR[style][k].split('');
  if (of.rolled && !lk) { for (const y of [17, 18]) rows[y] = rows[y].map((ch) => ch === 'A' ? 'S' : ch === 'a' ? 's' : ch); }
  const walking = pose === 'walk' || pose === 'box';
  if (walking && frame) for (const k in WALK2) rows[k] = WALK2[k].split('');
  let over = [];
  let prop = (pose === 'idle' || pose === 'walk') && !o.noProp ? of.prop : null;
  if (o.blink && pose !== 'sad') rows[8] = rows[8].map((ch) => ch === 'E' ? 'S' : ch);
  switch (pose) {
    case 'type': eraseArm(rows, 'L'); eraseArm(rows, 'R'); over = TYPE_PTS.concat(frame ? [[9,17,'S']] : [[6,17,'S']]); break;
    case 'sip': eraseArm(rows, 'R'); over = sipPts(o.obj || 'mug', frame); break;
    case 'reach': eraseArm(rows, 'R'); over = reachPts(o.obj || 'letter', frame); break;
    case 'point': eraseArm(rows, 'R'); over = POINT_R.concat(frame ? [[19,14,'S'],[20,14,'O'],[19,13,'O'],[19,15,'O']] : []); break;
    case 'cheer': eraseArm(rows, 'L'); eraseArm(rows, 'R'); over = CHEER_PTS; break;
    case 'box': eraseArm(rows, 'L'); eraseArm(rows, 'R'); over = BOX_PTS; break;
    case 'sad': rows[8] = rows[8].map((ch) => ch === 'E' ? 'S' : ch); rows[12][6] = 'M'; rows[12][9] = 'M'; if (frame) rows[9] = rows[9].map((ch) => ch === 'E' ? 'S' : ch); break;
  }
  const bob = ((pose === 'idle' || walking) && frame) ? 1 : 0;
  const jump = (pose === 'cheer' && frame) ? -2 : 0;
  const blond = o.hair === 'blond';
  const pal = Object.assign({}, PAL_X, {
    O:INK, E:INK, H: blond ? '#d9a94e' : '#6b4126', h: blond ? '#f0cf7e' : '#8f5a35', S:SKIN, s:SKIN2, M:'#b5584a',
    c:of.c, N:of.N, A:of.A, a:of.a, W:of.W, L:o.lanyard || LADDER[clamp(rank, 0, 7)].color, K:of.K, B:'#fbf4e2', b:'#2b3a67', P:'#2b3150', F:'#3b2516'
  });
  if (lk) Object.assign(pal, { S:lk.S, s:lk.s, H:lk.H, h:lk.h, A:lk.A, a:lk.a, W:lk.W, c:lk.c, K:lk.K, N:lk.N, P:lk.P });
  const cv = canvas(SPR_W, SPR_H), g = ctx(cv);
  const px = (x, y, ch) => { const c = pal[ch]; if (!c) return; let yy = y; if (bob && y <= 21) yy += 1; g.fillStyle = c; g.fillRect(SPR_OX + x, SPR_OY + jump + yy, 1, 1); };
  for (let y = 0; y < 26; y++) { if (bob && y === 22) continue; const r = rows[y]; for (let x = 0; x < 16; x++) px(x, y, r[x]); }
  for (const [x, y, ch] of over) px(x, y, ch);
  if (of.headset && !lk && pose !== 'cheer') { for (const [x, y] of HEADSET) { g.fillStyle = HS; g.fillRect(SPR_OX + x, SPR_OY + jump + y + bob, 1, 1); } g.fillStyle = '#e0533f'; g.fillRect(SPR_OX + 5, SPR_OY + jump + 11 + bob, 1, 1); }
  if (of.pencil && !lk) { px(13, 5, 'Y'); px(14, 4, 'Y'); g.fillStyle = '#e88d8d'; g.fillRect(SPR_OX + 15, SPR_OY + jump + 3 + bob, 1, 1); }
  if (o.pip) { g.fillStyle = '#cfeaf5'; g.fillRect(SPR_OX + 14, SPR_OY + 5 + bob, 1, 1); g.fillStyle = '#9ed0e6'; g.fillRect(SPR_OX + 14, SPR_OY + 6 + bob, 1, 1); g.fillStyle = '#5c8fb0'; g.fillRect(SPR_OX + 14, SPR_OY + 7 + bob, 1, 1); }
  if (prop) { const p = PROPS[prop]; for (let y = 0; y < p.rows.length; y++) for (let x = 0; x < p.rows[y].length; x++) { const ch = p.rows[y][x]; const c = pal[ch]; if (!c) continue; g.fillStyle = c; g.fillRect(SPR_OX + p.x + x, SPR_OY + p.y + y + bob, 1, 1); } }
  if (o.sil) { const d = g.getImageData(0, 0, SPR_W, SPR_H); const [r, gg, b] = hex2rgb(o.sil); for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 3]) { d.data[i] = r; d.data[i + 1] = gg; d.data[i + 2] = b; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }
  spriteCache.set(key, cv); return cv;
}
/* x is the body's centre column, footY the row under his shoes */
function drawSprite(g, spr, x, footY, flip){
  const dx = Math.round(x) - 8 - SPR_OX, dy = Math.round(footY) - 26 - SPR_OY;
  if (flip) { g.save(); g.translate(dx + SPR_W, dy); g.scale(-1, 1); g.drawImage(spr, 0, 0); g.restore(); } else g.drawImage(spr, dx, dy);
}

/* an actor walks through a little script of poses */
const FRAME_MS = { idle:540, walk:140, box:150, type:170, sip:520, reach:620, point:700, cheer:230, sad:900 };
class Actor {
  constructor(o){
    Object.assign(this, { x:0, y:90, rank:0, look:null, flip:false, script:[{ pose:'idle', dur:3000 }], i:0, t:0, pose:'idle', frame:0, ft:0, blink:false, bt:1500, speed:0.03, obj:null, hair:null, pip:false, lanyard:null, still:false }, o);
    this.rng = o.rng || Math.random; this.bt = 800 + this.rng() * 3000; this.ft = this.rng() * 400;
    if (o.startAt != null) this.i = o.startAt % this.script.length;
    this.enter(true);
  }
  enter(first){
    const s = this.script[this.i];
    this.obj = s.obj || null;
    if (s.walk) { this.tx = s.walk[0]; this.ty = s.walk[1]; this.pose = s.pose || 'walk'; this.walking = true; if (first && s.from) { this.x = s.from[0]; this.y = s.from[1]; } }
    else { this.walking = false; this.pose = s.pose || 'idle'; this.t = (s.dur || 2000) * (0.85 + this.rng() * 0.3); if (s.flip != null) this.flip = s.flip; if (s.at) { this.x = s.at[0]; this.y = s.at[1]; } }
  }
  next(){ this.i = (this.i + 1) % this.script.length; this.enter(); }
  override(pose, dur, obj){ this.ov = { pose, t: dur, obj: obj || null }; this.frame = 0; }
  update(dt){
    if (this.still) return;
    this.bt -= dt; if (this.bt < 0) { this.blink = true; if (this.bt < -130) { this.blink = false; this.bt = 2000 + this.rng() * 3000; } }
    const pose = this.ov ? this.ov.pose : this.pose;
    this.ft += dt; const fm = FRAME_MS[pose] || 500; while (this.ft > fm) { this.ft -= fm; this.frame ^= 1; }
    if (this.ov) { this.ov.t -= dt; if (this.ov.t <= 0) this.ov = null; return; }
    if (this.walking) {
      const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy), step = this.speed * dt;
      if (Math.abs(dx) > 0.5) this.flip = dx < 0;
      if (d <= step) { this.x = this.tx; this.y = this.ty; this.next(); } else { this.x += dx / d * step; this.y += dy / d * step; }
    } else { this.t -= dt; if (this.t <= 0) this.next(); }
  }
  sprite(){
    const pose = this.ov ? this.ov.pose : this.pose, obj = this.ov ? this.ov.obj : this.obj;
    return getSprite(this.rank, pose, this.frame, { blink: this.blink, look: this.look, obj, pip: this.pip, hair: this.hair, noProp: this.noProp, lanyard: this.lanyard });
  }
  draw(g, ox, oy){ drawSprite(g, this.sprite(), ox + this.x, oy + this.y, this.flip); }
}

/* ---------- time of day ---------- */
const TOD = {
  night: { sky:['#04070f', '#070b1a', '#0a1024', '#0d1630', '#121d3d', '#18264b'], stars:1, moon:true, sun:null, far:'#0d1530', near:'#121c3c', edge:'#1a2650', win:0.16, winOff:'#1a2650', warm:['#ffd27a', '#e6a94a', '#f7e3a6'], cloud:['#0f1733', '#152044'], view:['#0a1024', '#121d3d'], ground:'#08070f', lampOn:true },
  dawn:  { sky:['#0b1230', '#1a2350', '#35376b', '#6a4f80', '#c27a86', '#f2b48f'], stars:0.2, moon:false, sun:{ c:'#ffe1b0', glow:['#f6c39a', '#e89a8a'], r:9, x:0.8, y:1.0 }, far:'#26254a', near:'#2b2b55', edge:'#3d3b6e', win:0.06, winOff:'#33335f', warm:['#ffd27a', '#f7e3a6', '#e6a94a'], cloud:['#7a5a86', '#d39494'], view:['#6a4f80', '#f2b48f'], ground:'#100d1a', lampOn:true },
  day:   { sky:['#10204a', '#173062', '#21427a', '#2f5a96', '#4677b2', '#79a6d6'], stars:0, moon:false, sun:{ c:'#fff4cf', glow:['#cfe0f2', '#a8c6e8'], r:6, x:0.86, y:0.2 }, far:'#2a3f72', near:'#30477e', edge:'#41598f', win:0.0, winOff:'#3b558c', glint:'#8fb4e0', warm:['#ffd27a'], cloud:['#a9c3e6', '#e2ecf8'], view:['#4677b2', '#a8c6e8'], ground:'#141526', lampOn:false },
  dusk:  { sky:['#0a0e26', '#181a44', '#36214f', '#672c56', '#b2475b', '#ee8a5b'], stars:0.4, moon:false, sun:{ c:'#ffbf75', glow:['#f08a5d', '#c95a5a'], r:10, x:0.12, y:1.0 }, far:'#21183e', near:'#291d4a', edge:'#3d2c62', win:0.24, winOff:'#2f2452', warm:['#ffd27a', '#e6a94a', '#f7e3a6'], cloud:['#4a2650', '#a24a62'], view:['#672c56', '#ee8a5b'], ground:'#0e0a18', lampOn:true }
};
function todForHour(h){ if (h >= 20 || h < 5) return 'night'; if (h < 8) return 'dawn'; if (h < 17) return 'day'; return 'dusk'; }

/* dithered vertical gradient through any number of stops */
function vgrad(g, x, y, w, h, stops){
  if (h <= 0 || w <= 0) return;
  const n = stops.length - 1, img = g.createImageData(w, h), d = img.data, cs = stops.map(hex2rgb);
  for (let j = 0; j < h; j++) {
    const t = h === 1 ? 0 : j / (h - 1) * n, k = Math.min(n - 1, Math.floor(t)), f = t - k;
    for (let i = 0; i < w; i++) { const c = (n > 0 && dith(x + i, y + j, f)) ? cs[k + 1] : cs[Math.max(0, k)]; const p = (j * w + i) * 4; d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255; }
  }
  const tmp = canvas(w, h); tmp.getContext('2d').putImageData(img, 0, 0); g.drawImage(tmp, x, y);
}

/* skyline of two layers; collect gathers lit windows and antennas for animation */
function paintSkyline(g, x0, w, baseY, seed, tod, out, opts = {}){
  const T = TOD[tod] || TOD.night, rng = mulberry(seed), hs = opts.heightScale || 1;
  let x = x0 - (rng() * 10 | 0);
  while (x < x0 + w) {
    const bw = 8 + (rng() * 18 | 0), bh = Math.round((24 + (rng() * 56 | 0)) * hs);
    g.fillStyle = T.far; g.fillRect(x, baseY - bh, bw, bh);
    if (rng() < 0.15) g.fillRect(x + (bw >> 1), baseY - bh - 6, 1, 6);
    for (let wy = baseY - bh + 3; wy < baseY - 2; wy += 4) for (let wx = x + 2; wx < x + bw - 1; wx += 3) if (rng() < 0.07) { if (rng() < T.win * 3) { g.fillStyle = rng() < 0.5 ? '#6b5530' : '#3a3e66'; g.fillRect(wx, wy, 1, 1); } }
    x += bw + (rng() * 3 | 0);
  }
  x = x0 - (rng() * 20 | 0);
  while (x < x0 + w) {
    const tall = rng() < 0.2, bw = 14 + (rng() * 22 | 0), bh = Math.round((tall ? 66 + (rng() * 46 | 0) : 16 + (rng() * 40 | 0)) * hs), by = baseY - bh;
    g.fillStyle = T.near; g.fillRect(x, by, bw, bh); g.fillStyle = T.edge; g.fillRect(x, by, 1, bh);
    if (tall) { g.fillStyle = T.near; g.fillRect(x + 3, by - 4, bw - 6, 4); g.fillRect(x + 6, by - 8, Math.max(2, bw - 12), 4); const ax = x + (bw >> 1); g.fillRect(ax, by - 16, 1, 8); if (out) out.antennas.push({ x: ax, y: by - 17, ph: rng() * 6 }); }
    for (let wy = by + 3; wy < baseY - 3; wy += 4) for (let wx = x + 3; wx < x + bw - 2; wx += 3) {
      const r = rng(); let c = null;
      if (r < T.win) c = T.warm[rng() * T.warm.length | 0]; else if (r < 0.5) c = T.winOff; else if (T.glint && r < 0.56) c = T.glint;
      if (c) { g.fillStyle = c; g.fillRect(wx, wy, 1, 2); if (out && T.win > 0 && c !== T.winOff && c !== T.glint && rng() < 0.12) out.flick.push({ x: wx, y: wy, on: true, c, off: T.winOff }); }
    }
    x += bw + (rng() * 4 | 0);
  }
}

/* full sky with stars, sun or moon and skyline down to groundY */
function paintSky(g, W, groundY, tod, seed, opts = {}){
  const T = TOD[tod] || TOD.night, out = { twinkles: [], flick: [], antennas: [] };
  vgrad(g, 0, 0, W, groundY, T.sky);
  if (opts.below !== false && groundY < g.canvas.height) {
    g.fillStyle = T.ground; g.fillRect(0, groundY, W, g.canvas.height - groundY);
  }
  const rng = mulberry(seed);
  if (T.stars > 0) {
    const n = Math.round(W * groundY / 240 * T.stars);
    for (let i = 0; i < n; i++) { const x = rng() * W | 0, y = rng() * groundY * 0.7 | 0, bright = rng() < 0.18; g.fillStyle = bright ? '#c9d2ff' : '#3a4580'; g.fillRect(x, y, 1, 1); if (bright && rng() < 0.5) out.twinkles.push({ x, y, ph: rng() * 6.28 }); }
    if (T.stars >= 1) for (let i = 0; i < Math.max(3, W / 110 | 0); i++) { const x = 2 + rng() * (W - 4) | 0, y = 2 + rng() * groundY * 0.45 | 0; g.fillStyle = '#6f7cc0'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); }
  }
  if (T.moon && opts.moon !== false) { const mx = opts.moonX != null ? opts.moonX : Math.round(W * 0.82), my = opts.moonY || 30; drawMoon(g, mx, my); }
  if (T.sun && opts.sun !== false) drawSun(g, Math.round(W * T.sun.x), Math.round(T.sun.y >= 1 ? groundY - 6 : groundY * T.sun.y), T.sun);
  if (opts.skyline !== false) paintSkyline(g, 0, W, groundY - (opts.lip || 0), seed + 4, tod, out, opts);
  return out;
}
function drawMoon(g, mx, my){
  for (let dy = -11; dy <= 11; dy++) for (let dx = -11; dx <= 11; dx++) { const r = Math.hypot(dx, dy); if (r > 8 && r <= 11 && ((dx + dy) & 1) === 0) { g.fillStyle = '#121b38'; g.fillRect(mx + dx, my + dy, 1, 1); } }
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) if (dx * dx + dy * dy <= 52) { g.fillStyle = (dx * dx + dy * dy > 38 && dx > 0) ? '#d8cba6' : '#f4ead5'; g.fillRect(mx + dx, my + dy, 1, 1); }
  g.fillStyle = '#ddd0ad'; g.fillRect(mx - 3, my - 2, 2, 2); g.fillRect(mx + 2, my + 2, 2, 1); g.fillRect(mx - 1, my + 4, 1, 1);
}
function drawSun(g, sx, sy, S){
  const r = S.r;
  for (let dy = -r - 9; dy <= r + 9; dy++) for (let dx = -r - 9; dx <= r + 9; dx++) {
    const d = Math.hypot(dx, dy), x = sx + dx, y = sy + dy;
    if (d <= r) { g.fillStyle = S.c; g.fillRect(x, y, 1, 1); }
    else if (d <= r + 4 && dith(x, y, 0.55)) { g.fillStyle = S.glow[0]; g.fillRect(x, y, 1, 1); }
    else if (d <= r + 9 && dith(x, y, 0.22)) { g.fillStyle = S.glow[1]; g.fillRect(x, y, 1, 1); }
  }
}

/* pixel clouds: a flat base with puffs on top, lit from above */
function makeCloud(seed, tod){
  const T = TOD[tod] || TOD.night, rng = mulberry(seed), w = 34 + (rng() * 30 | 0), h = 15 + (rng() * 6 | 0), base = h - 2;
  const c = canvas(w, h), g = ctx(c), n = 3 + (rng() * 3 | 0), puffs = [];
  for (let i = 0; i < n; i++) { const r = 3.5 + rng() * Math.min(7, h * 0.42); puffs.push({ x: 6 + (w - 12) * (i + 0.5) / n + (rng() - 0.5) * 4, y: base - r * 0.55, r }); }
  const big = puffs.reduce((a, p) => p.r > a.r ? p : a, puffs[0]); big.r += 2; big.y -= 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let inside = y <= base && y >= base - 3 && x >= 3 && x <= w - 4;
    let top = base - 3;
    for (const p of puffs) { const dx = x - p.x, dy = y - p.y; if (dx * dx + dy * dy <= p.r * p.r && y <= base) inside = true; const ty = p.y - Math.sqrt(Math.max(0, p.r * p.r - dx * dx)); if (Math.abs(dx) <= p.r) top = Math.min(top, ty); }
    if (!inside) continue;
    const depth = y - top;
    g.fillStyle = depth < 3 ? T.cloud[1] : depth < 5 ? (dith(x, y, 0.5) ? T.cloud[1] : T.cloud[0]) : T.cloud[0];
    if (y >= base - 1) g.fillStyle = shade(T.cloud[0], -0.12);
    g.fillRect(x, y, 1, 1);
  }
  return c;
}

/* tiny moving things */
const PIGEON = {
  sit:  ['.kk....', 'ykgk...', '.kgddk.', '..kggdk', '...k.k.'],
  peck: ['.......', '.kk....', 'ykgkdk.', '..kggdk', '...k.k.'],
  fly0: ['..k.k..', '.kdkdk.', 'ykgggk.', '..kkk..', '.......'],
  fly1: ['.......', 'ykgggk.', '.kdkdk.', '..k.k..', '.......']
};
const PIGEON_PAL = { k:'#2a2f45', g:'#9aa3b8', d:'#6b7591', y:'#e0a040' };
function drawPigeon(g, x, y, f, flip){
  const rows = PIGEON[f]; const W2 = rows[0].length;
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < W2; c++) { const ch = rows[r][flip ? W2 - 1 - c : c]; const col = PIGEON_PAL[ch]; if (!col) continue; g.fillStyle = col; g.fillRect(Math.round(x) + c, Math.round(y) + r, 1, 1); }
}
const HELI = {
  body: ['......k.........', '...kkkkkk.......', '..kwwkkkkkkkkkkk', '..kkkkkkkk....kk', '...k....k.......', '..kkkkkkkk......'],
  rotor0: '..kkkkkkkkkkkkk.', rotor1: '......kkkkk.....'
};
function drawHeli(g, x, y, t){
  x = Math.round(x); y = Math.round(y);
  const rot = ((t / 60) | 0) % 2 ? HELI.rotor1 : HELI.rotor0;
  for (let c = 0; c < 16; c++) if (rot[c] === 'k') { g.fillStyle = '#3a4570'; g.fillRect(x + c, y, 1, 1); }
  HELI.body.forEach((row, r) => { for (let c = 0; c < 16; c++) { const ch = row[c]; if (ch === '.') continue; g.fillStyle = ch === 'w' ? '#ffd27a' : '#0c1230'; g.fillRect(x + c, y + 1 + r, 1, 1); if (ch === 'k' && r === 1) { g.fillStyle = '#2a3870'; g.fillRect(x + c, y + 1 + r, 1, 1); } } });
  g.fillStyle = (t % 900) < 300 ? '#ff4d3d' : '#4a1a14'; g.fillRect(x + 15, y + 3, 1, 1);
  g.fillStyle = (t % 1300) < 200 ? '#ffffff' : '#0c1230'; g.fillRect(x + 6, y + 6, 1, 1);
}

/* ---------- the tower (hero) ---------- */
const TW = 136, TOPF = 70, FH = 34, NLEV = 9, FOUND = 6, TH = TOPF + NLEV * FH + FOUND;
const RX = 24, RW = 108, DCX = 68, DCY = 50, DR = 34;
const lvTop = (L) => TOPF + (8 - L) * FH;
const SIL = [[11, 18, 41], [17, 27, 56], [26, 39, 79]];
const LOCK = ['.###.', '#...#', '#...#', '#####', '##.##', '##.##', '#####'];

function drawSmallRoom(g, L, top, tod){
  const T = TOD[tod] || TOD.night;
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(RX + x, top + y, w, h); };
  const P = (x, y, c) => R(x, y, 1, 1, c);
  const rng = mulberry(1000 + L * 97);
  const glow = (cx, y0, y1, spread, c) => { for (let y = y0; y <= y1; y++) { const half = Math.round(2 + spread * (y - y0) / Math.max(1, y1 - y0)); for (let x = cx - half; x <= cx + half; x++) { if (x < 0 || x >= RW) continue; if (((x + y) & 1) === 0) P(x, y, c); } } };
  const win = (x, y, w, h, frame) => {
    R(x - 1, y - 1, w + 2, h + 2, frame); R(x, y, w, h, T.view[0]); R(x, y + h - 3, w, 3, T.view[1]);
    let i = 0; while (i < w) { const bw = 2 + (rng() * 4 | 0), bh = 2 + (rng() * (h * 0.55) | 0), ww = Math.min(bw, w - i); R(x + i, y + h - bh, ww, bh, T.near); if (rng() < 0.7 && T.win > 0) P(x + i + (rng() * ww | 0), y + h - bh + 1 + (rng() * Math.max(1, bh - 2) | 0), '#ffd27a'); i += bw + (rng() < 0.3 ? 1 : 0); }
    if (T.moon) P(x + 1 + (rng() * (w - 2) | 0), y + 1 + (rng() * 2 | 0), '#cdd6ff');
    R(x + (w >> 1), y, 1, h, frame); R(x, y + (h >> 1), w, 1, frame);
  };
  const base = (wall, lower, lowerY, floor) => { R(0, 0, RW, 27, wall); if (lower) R(0, lowerY, RW, 27 - lowerY, lower); R(0, 0, RW, 1, shade(wall, -0.4)); R(0, 27, RW, 3, floor); R(0, 27, RW, 1, shade(floor, 0.14)); };
  const lamp = (cx, wall) => { R(cx - 3, 1, 7, 1, '#5c3f12'); R(cx - 2, 2, 5, 1, '#fff0c2'); glow(cx, 3, 26, 13, shade(wall, 0.12)); };
  const box = (x, y, w, h) => { R(x, y, w, h, '#b07a45'); R(x, y, w, 1, '#cf9a62'); R(x + (w >> 1), y, 1, h, '#e8c995'); R(x, y + h - 1, w, 1, '#7f532c'); };
  switch (L) {
    case 0:
      base('#4f5a58', '#45504e', 18, '#30363a'); for (let x = 0; x < RW; x += 9) R(x, 28, 1, 2, '#262b2e');
      R(0, 2, RW, 2, '#7d87a3'); R(0, 3, RW, 1, '#5c6680'); for (let x = 20; x < RW; x += 26) R(x, 1, 3, 4, '#4d5675');
      R(56, 4, 1, 4, INK); R(55, 8, 3, 2, '#ffe9a8'); glow(56, 10, 26, 15, '#5d6967');
      R(70, 6, 1, 21, '#4a2418'); R(100, 6, 1, 21, '#4a2418'); R(70, 12, 31, 1, '#9a5b3c'); R(70, 19, 31, 1, '#9a5b3c');
      box(72, 7, 8, 5); box(82, 8, 6, 4); box(90, 6, 8, 6); box(72, 14, 10, 5); box(86, 15, 9, 4); box(73, 22, 11, 5); box(88, 23, 9, 4);
      R(28, 16, 16, 1, '#5c6680'); R(28, 17, 16, 6, '#8a93a8'); for (let x = 30; x < 43; x += 3) for (let y = 18; y < 22; y += 2) P(x, y, '#6b7591');
      R(44, 12, 1, 11, '#5c6680'); R(43, 12, 3, 1, '#5c6680');
      R(30, 13, 4, 4, '#fbf4e2'); R(35, 14, 4, 3, '#e9dcbf'); R(39, 13, 3, 4, '#fbf4e2'); P(31, 14, '#c8463d');
      R(30, 23, 3, 3, INK); R(40, 23, 3, 3, INK); P(31, 24, '#7d87a3'); P(41, 24, '#7d87a3');
      break;
    case 1:
      base('#c6b18a', '#b29c73', 19, '#6c5e4c'); R(0, 19, RW, 1, '#9a835c');
      lamp(68, '#c6b18a'); win(50, 5, 14, 11, '#8f7a55');
      R(20, 18, 22, 2, '#8f7a55'); R(20, 18, 22, 1, '#a8915f'); R(21, 20, 1, 7, '#4d5675'); R(40, 20, 1, 7, '#4d5675');
      R(25, 9, 12, 9, '#2b3150'); R(26, 10, 10, 6, '#0f2a1e'); [[27,14],[28,13],[29,14],[30,12],[31,13],[32,11],[33,12],[34,10]].forEach(([x, y]) => P(x, y, '#7fd19b')); R(30, 16, 2, 2, '#2b3150');
      R(45, 11, 1, 16, '#5c6680'); R(45, 11, 5, 4, '#7d87a3'); R(45, 19, 8, 2, '#7d87a3'); R(52, 21, 1, 6, '#5c6680');
      R(70, 20, 20, 1, '#5c6680'); R(71, 21, 1, 6, '#5c6680'); R(88, 21, 1, 6, '#5c6680');
      R(70, 12, 20, 8, '#c3cad8'); R(70, 12, 20, 1, '#e6eaf2'); R(72, 16, 16, 1, '#4d5675'); R(73, 9, 12, 3, '#fbf4e2'); R(73, 9, 12, 1, '#ffffff'); P(87, 14, '#3f9a68'); R(74, 17, 10, 2, '#fbf4e2');
      R(96, 4, 6, 7, '#9ed0e6'); R(97, 4, 2, 7, '#cfeaf5'); R(95, 11, 8, 16, '#e6eaf2'); R(95, 11, 8, 1, '#ffffff'); P(97, 15, '#3f6fd1'); P(100, 15, '#c8463d'); R(95, 26, 8, 1, '#b7bfd3');
      break;
    case 2:
      base('#bba987', '#a6946e', 19, '#3a4b78'); R(0, 19, RW, 1, '#8f7d58'); for (let x = 2; x < RW; x += 6) P(x, 28, '#33426b');
      lamp(36, '#bba987'); win(24, 5, 15, 11, '#8f7a55');
      R(40, 11, 6, 8, '#3a3a5a'); R(41, 12, 4, 1, '#4d4d72'); R(39, 19, 9, 2, '#2b2b44'); R(43, 21, 1, 4, '#4d5675'); R(40, 25, 7, 1, '#4d5675'); P(40, 26, INK); P(46, 26, INK);
      R(52, 17, 38, 2, '#9a5b3c'); R(52, 17, 38, 1, '#b87547'); R(54, 19, 34, 8, '#7a4128'); R(56, 21, 14, 1, '#5a2f1e'); P(62, 23, '#c9952f'); R(72, 21, 14, 1, '#5a2f1e'); P(78, 23, '#c9952f');
      R(60, 6, 18, 10, '#2b3150'); R(61, 7, 16, 8, '#0b1a14'); [[62,13],[63,12],[64,13],[65,11],[66,12],[67,10],[68,11],[69,9],[70,10]].forEach(([x, y]) => P(x, y, '#7fd19b')); R(68, 16, 2, 1, '#2b3150'); R(56, 16, 10, 1, '#c3cad8');
      R(82, 15, 6, 2, '#c9952f'); R(84, 11, 1, 4, '#8a6220'); R(82, 9, 6, 2, '#3f9a68'); R(82, 11, 6, 1, '#fff0c2');
      R(98, 20, 7, 7, '#b5584a'); R(98, 20, 7, 1, '#cf6d5d'); R(100, 13, 3, 7, '#3f9a68'); R(98, 15, 2, 4, '#3f9a68'); R(103, 14, 2, 5, '#3f9a68'); P(101, 12, '#7fd19b'); P(98, 14, '#7fd19b'); P(104, 13, '#7fd19b');
      break;
    case 3:
      base('#2d5143', '#26463a', 19, '#1e2a25');
      R(0, 2, RW, 9, '#0b1410'); R(0, 2, RW, 1, '#c9952f'); R(0, 10, RW, 1, '#c9952f');
      for (const d of [12, 60]) {
        R(d, 19, 36, 2, '#5a3a28'); R(d, 19, 36, 1, '#7a5238'); R(d + 1, 21, 34, 6, '#3c271b');
        for (const m of [d + 3, d + 19]) { R(m, 11, 14, 8, '#2b3150'); R(m + 1, 12, 12, 6, '#0b1410'); for (let k = 0; k < 6; k++) { const hgt = 1 + (rng() * 5 | 0); R(m + 2 + k * 2, 18 - hgt, 1, hgt, rng() < 0.6 ? '#7fd19b' : '#ff6b5e'); } }
      }
      break;
    case 4:
      base('#8592a8', '#78859b', 19, '#4a5372'); R(0, 19, RW, 1, '#6b7891');
      lamp(40, '#8592a8'); win(64, 4, 16, 10, '#5c6680');
      R(28, 11, 3, 16, '#66759a'); R(28, 11, 3, 1, '#a3b0c8'); R(86, 11, 3, 16, '#66759a'); R(86, 11, 3, 1, '#a3b0c8');
      for (let y = 13; y < 26; y += 3) { P(29, y, '#5a688c'); P(87, y, '#5a688c'); }
      R(31, 18, 55, 2, '#c3cad8'); R(31, 18, 55, 1, '#e6eaf2'); R(33, 20, 1, 7, '#7d87a3'); R(83, 20, 1, 7, '#7d87a3');
      R(44, 8, 16, 10, '#2b3150'); R(45, 9, 14, 7, '#1d2a4a'); for (let y = 10; y < 16; y += 2) R(46, y, 12, 1, '#3d5288'); for (let x = 49; x < 58; x += 4) R(x, 9, 1, 7, '#3d5288');
      R(68, 15, 7, 3, '#fbf4e2'); R(68, 16, 7, 1, '#dcd3c0'); R(36, 15, 3, 3, '#c8463d'); P(39, 16, '#c8463d');
      R(95, 20, 7, 7, '#5c6680'); R(95, 20, 7, 1, '#7d87a3'); R(97, 13, 3, 7, '#3f9a68'); R(95, 15, 2, 4, '#3f9a68'); R(100, 14, 2, 5, '#3f9a68'); P(98, 12, '#7fd19b');
      break;
    case 5:
      base('#33467a', null, 0, '#56271f'); for (let x = 3; x < RW; x += 6) R(x, 1, 1, 26, '#2d3f6f');
      lamp(56, '#33467a'); win(76, 3, 20, 13, '#c9952f');
      R(30, 0, 2, 27, '#8fc4dc'); R(30, 0, 1, 27, '#cfeaf5'); R(29, 0, 4, 1, '#7d87a3'); R(29, 26, 4, 1, '#7d87a3');
      R(52, 8, 10, 10, '#3a1f14'); R(53, 9, 8, 1, '#5a2f1e'); P(55, 12, '#2a140d'); P(58, 12, '#2a140d'); P(55, 15, '#2a140d'); P(58, 15, '#2a140d');
      R(42, 18, 40, 2, '#9a5b3c'); R(42, 18, 40, 1, '#b87547'); R(44, 20, 36, 7, '#6e3b26'); R(44, 20, 36, 1, '#4a2418'); P(52, 23, '#f2c14e'); P(72, 23, '#f2c14e');
      R(68, 16, 7, 2, '#c9952f'); R(71, 13, 1, 3, '#8a6220'); R(67, 11, 9, 2, '#2f7a52'); R(66, 13, 11, 1, '#f2c14e'); R(68, 10, 7, 1, '#3f9a68');
      R(99, 6, 7, 8, '#c9952f'); R(100, 7, 5, 6, '#2b3a67'); P(102, 9, '#f2c14e');
      break;
    case 6:
      base('#6c3a25', null, 0, '#24315a'); for (let x = 0; x < RW; x += 12) { R(x, 3, 1, 24, '#552c1b'); R(x + 1, 3, 1, 24, '#84492f'); } R(0, 2, RW, 1, '#c9952f');
      R(103, 8, 1, 19, '#c9952f'); R(100, 5, 7, 3, '#e9dcbf'); R(100, 8, 7, 1, '#c9952f'); glow(103, 9, 26, 7, '#7d4630');
      win(56, 4, 38, 12, '#4a2418');
      R(14, 4, 16, 23, '#4a2418'); for (const s of [10, 16, 22]) R(15, s, 14, 1, '#7a4128');
      for (const s of [10, 16, 22, 27]) { let x = 15; while (x < 29) { const w = 1 + (rng() * 2 | 0), h = 3 + (rng() * 3 | 0); R(x, s - h, Math.min(w, 29 - x), h, ['#c8463d', '#3f6fd1', '#3f9a68', '#f2c14e', '#e6eaf2', '#7b5cd6'][rng() * 6 | 0]); x += w; } }
      R(76, 9, 9, 10, '#2a140d'); R(77, 10, 7, 1, '#4a2418');
      R(60, 19, 38, 2, '#8a4a2a'); R(60, 19, 38, 1, '#a85d36'); R(62, 21, 34, 6, '#4a2418'); R(62, 21, 34, 1, '#c9952f');
      break;
    case 7:
      base('#1f4a3a', '#1a3f31', 18, '#7a2620'); R(0, 2, RW, 1, '#c9952f'); R(0, 18, RW, 1, '#c9952f'); R(0, 27, RW, 1, '#a8792a');
      R(52, 1, 1, 2, '#c9952f'); R(48, 3, 9, 1, '#c9952f'); P(48, 4, '#fff0c2'); P(52, 4, '#fff0c2'); P(56, 4, '#fff0c2'); glow(52, 5, 26, 14, '#2a5a48');
      R(26, 5, 20, 11, '#c9952f'); R(27, 6, 18, 9, '#a8792a'); R(28, 7, 16, 7, '#13301f'); [[29,12],[31,11],[33,12],[35,10],[37,9],[39,10],[41,8],[43,7]].forEach(([x, y]) => P(x, y, '#7fd19b'));
      R(10, 25, 9, 2, '#c9952f'); R(14, 21, 1, 4, '#c9952f');
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (dx * dx + dy * dy <= 16) P(14 + dx, 16 + dy, ((dx * 3 + dy * 5 + 40) % 7) < 2 ? '#3f9a68' : '#3f6fd1');
      R(74, 6, 12, 12, '#2a140d'); R(75, 7, 10, 1, '#4a2418'); P(77, 10, '#4a2418'); P(80, 10, '#4a2418'); P(83, 10, '#4a2418'); P(78, 13, '#4a2418'); P(82, 13, '#4a2418');
      R(56, 18, 48, 2, '#9a5b3c'); R(56, 18, 48, 1, '#c9952f'); R(58, 20, 44, 7, '#4a2418'); R(58, 20, 44, 1, '#c9952f'); P(66, 23, '#f2c14e'); P(94, 23, '#f2c14e'); R(75, 22, 10, 3, '#c9952f');
      R(60, 14, 3, 4, '#f2c14e'); R(59, 14, 5, 1, '#f2c14e'); R(60, 17, 3, 1, '#c9952f');
      break;
    default:
      base('#2b2b46', null, 0, '#1e1e33');
      R(46, 6, 16, 21, '#3d3d60'); R(46, 6, 16, 1, '#55557a');
      for (let i = 0; i < 16; i++) { P(46 + i, Math.min(26, 8 + i), '#6b6b8f'); P(61 - i, Math.min(26, 8 + i), '#6b6b8f'); }
      R(52, 15, 4, 5, '#c9952f'); for (let x = 4; x < RW; x += 12) if (x < 40 || x > 66) R(x, 21, 7, 6, '#33335a');
  }
}
function silhouette(g, x, y, w, h){
  const d = g.getImageData(x, y, w, h), a = d.data;
  for (let i = 0; i < a.length; i += 4) { const l = 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]; const c = l < 60 ? SIL[0] : l < 120 ? SIL[1] : SIL[2]; a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; }
  g.putImageData(d, x, y);
}
/* opts: { rank, litTop, ladder, tod } */
function buildTower(g, opts){
  const ladder = opts.ladder || LADDER, rank = opts.rank, litTop = opts.litTop, tod = opts.tod || 'night';
  const levelState = (L) => { if (L === 8) return 'locked'; if (L <= litTop) return 'lit'; if (L > rank) return 'locked'; return 'off'; };
  g.clearRect(0, 0, TW, TH);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  R(22, 32, 92, 18, '#1c2852'); for (let x = 25; x < 112; x += 6) R(x, 34, 1, 16, '#2a3a72'); R(22, 32, 92, 1, '#c9952f'); R(22, 33, 92, 1, '#8a6220');
  R(10, 50, 116, 10, '#18234b'); R(10, 50, 116, 1, '#c9952f'); R(10, 59, 116, 1, '#0f1733');
  R(0, 60, TW, 10, '#141f45'); R(0, 60, TW, 1, '#f2c14e'); R(0, 61, TW, 1, '#8a6220'); for (let x = 4; x < TW - 4; x += 8) R(x, 63, 2, 6, '#20306a'); R(0, 69, TW, 1, '#0e1530');
  ptext(g, 'INTERN & CO.', DCX, 52, '#f2c14e', { align: 'center' });
  R(67, 3, 2, 13, '#c9952f'); R(67, 3, 1, 13, '#f2c14e'); R(66, 13, 4, 1, '#c9952f'); R(65, 14, 6, 2, '#8a6220');
  for (let y = DCY - DR; y <= DCY; y++) for (let x = DCX - DR; x <= DCX + DR; x++) {
    const d = Math.hypot(x - DCX, y - DCY); if (d > DR) continue;
    R(x, y, 1, 1, d > DR - 1 ? '#5c3f12' : d > DR - 2 ? '#f2c14e' : d > DR - 3 ? '#c9952f' : d > DR - 4 ? '#8a6220' : d > DR - 9 ? '#efe2c4' : '#f6eddb');
  }
  R(DCX - DR, DCY, DR * 2 + 1, 1, '#c9952f'); R(DCX - DR, DCY + 1, DR * 2 + 1, 1, '#8a6220');
  for (let i = 0; i <= 7; i++) {
    const th = (170 - i * 160 / 7) * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th);
    for (const rr of [DR - 7, DR - 6]) R(Math.round(DCX + rr * cs), Math.round(DCY - rr * sn), 1, 1, '#2a1d0f');
    if (i < 7) { const t2 = (170 - (i + 0.5) * 160 / 7) * Math.PI / 180; R(Math.round(DCX + (DR - 6) * Math.cos(t2)), Math.round(DCY - (DR - 6) * Math.sin(t2)), 1, 1, '#c4ae86'); }
    const col = i === rank ? '#c8463d' : i < rank ? '#2a1d0f' : '#b8a985';
    miniText(g, ladder[i].floor, DCX + 21 * cs, Math.round(DCY - 21 * sn - 2.5), col);
  }
  for (let L = 0; L <= 8; L++) {
    const top = lvTop(L), st = levelState(L);
    R(4, top, 18, 30, '#0b1229'); R(5, top, 1, 30, '#25336a'); R(20, top, 1, 30, '#25336a');
    drawSmallRoom(g, L, top, tod);
    if (st !== 'lit') silhouette(g, RX, top, RW, 30);
    R(22, top, 2, 30, '#0e1633'); R(22, top, 2, 4, '#2a3866');
    const lab = ladder[L].floor, pw = textW(lab) + 4, lit = st === 'lit';
    R(RX + 2, top + 3, pw, 9, lit ? '#c9952f' : '#2c2310'); R(RX + 2, top + 3, pw, 1, lit ? '#f2c14e' : '#3a2e14');
    ptext(g, lab, RX + 4, top + 4, lit ? '#2a1d0f' : '#7a5a22');
    if (st === 'locked') {
      if (L === 8) ptext(g, '???', RX + RW / 2, top + 8, '#a8792a', { align: 'center', scale: 2 });
      else { const t = fmtUsd(ladder[L].at), tot = 5 + 3 + textW(t); const x = Math.round(RX + RW / 2 - tot / 2); drawRows(g, LOCK, { '#': '#8a6220' }, x, top + 11); ptext(g, t, x + 8, top + 11, '#8a6220'); }
    }
    R(0, top + 30, TW, 1, '#c9952f'); R(0, top + 31, TW, 2, '#2a3866'); R(0, top + 33, TW, 1, '#151d3e');
  }
  R(0, TOPF, 4, NLEV * FH + FOUND, '#22306a'); R(1, TOPF, 1, NLEV * FH, '#3a4c8c'); R(3, TOPF, 1, NLEV * FH, '#151d3e');
  R(132, TOPF, 4, NLEV * FH + FOUND, '#22306a'); R(134, TOPF, 1, NLEV * FH, '#3a4c8c'); R(132, TOPF, 1, NLEV * FH, '#151d3e');
  R(0, TOPF + NLEV * FH, TW, FOUND, '#141b36'); R(0, TOPF + NLEV * FH, TW, 1, '#22306a');
}
function drawNeedle(g, x0, y0, v){
  const th = (170 - v * 160 / 7) * Math.PI / 180, cx = x0 + DCX, cy = y0 + DCY - 1;
  line(g, cx, cy, Math.round(cx - Math.cos(th) * 4), Math.round(cy + Math.sin(th) * 4), '#2a1d0f');
  line(g, cx, cy, Math.round(cx + Math.cos(th) * 15), Math.round(cy - Math.sin(th) * 15), '#c8463d');
  g.fillStyle = '#8a6220'; g.fillRect(cx - 1, cy - 1, 3, 3); g.fillStyle = '#f2c14e'; g.fillRect(cx, cy - 1, 1, 1);
}
/* small elevator car of the hero tower (14x26) */
function drawCar(g, X, Y, open){
  g.fillStyle = '#8a6220'; g.fillRect(X, Y, 14, 26);
  g.fillStyle = '#f7d991'; g.fillRect(X + 1, Y + 2, 12, 23);
  g.fillStyle = '#ffe9b0'; g.fillRect(X + 3, Y + 2, 8, 1);
  g.fillStyle = '#f2c14e'; g.fillRect(X, Y, 14, 2);
  const sh = Math.round(open * 6);
  if (sh < 6) { g.fillStyle = '#a8792a'; g.fillRect(X + 1, Y + 2, 6 - sh, 23); g.fillRect(X + 7 + sh, Y + 2, 6 - sh, 23); g.fillStyle = '#c9952f'; g.fillRect(X + 2, Y + 4, 1, 19); if (6 - sh > 1) g.fillRect(X + 8 + sh, Y + 4, 1, 19); g.fillStyle = '#5c3f12'; g.fillRect(X + 6 - sh, Y + 2, 1, 23); g.fillRect(X + 7 + sh, Y + 2, 1, 23); }
  g.fillStyle = '#5c3f12'; g.fillRect(X, Y + 25, 14, 1);
}

/* confetti that both the site and the trailer use */
function spawnConfetti(list, n, W, rng = Math.random, yTop = -70){
  const cols = ['#fbf4e2', '#f2c14e', '#ffffff', '#7fd19b', '#e6d8b8'];
  for (let i = 0; i < n; i++) list.push({ x: rng() * W, y: yTop * rng(), vy: 0.025 + rng() * 0.035, vx: (rng() - 0.5) * 0.02, ph: rng() * 6.28, c: cols[i % cols.length] });
}
function stepConfetti(list, dt, H){ for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.y += p.vy * dt; p.x += p.vx * dt + Math.sin(p.ph + p.y * 0.08) * 0.15; if (p.y > H) list.splice(i, 1); } }
function drawConfetti(g, list, ox = 0, oy = 0){ for (const p of list) { g.fillStyle = p.c; const flat = Math.sin(p.ph + p.y * 0.12) > 0; g.fillRect(Math.round(ox + p.x), Math.round(oy + p.y), flat ? 2 : 1, flat ? 1 : 2); } }

return {
  clamp, mulberry, hashStr, hex2rgb, rgb2hex, shade, mix, lum, fmtUsd, dith, canvas, ctx, smooth, easeInOut, BAYER,
  textW, ptext, miniText, drawRows, line, LADDER, INK,
  SPR_W, SPR_H, SPR_OX, SPR_OY, OUTFITS, getSprite, drawSprite, makeLook, Actor,
  TOD, todForHour, vgrad, paintSkyline, paintSky, drawMoon, drawSun, makeCloud, drawPigeon, drawHeli,
  TW, TH, TOPF, FH, NLEV, RX, RW, DCX, DCY, DR, lvTop, buildTower, drawNeedle, drawCar, silhouette,
  spawnConfetti, stepConfetti, drawConfetti
};
})();
