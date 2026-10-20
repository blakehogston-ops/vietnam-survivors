/* jungle_v3_lite.js — drop-in, faster JUNGLE3 (same public API as jungle_v3.js rev 3, same art, same Vet-approved content).
 * Last Chopper Out, Quang Tri 1968. Artist Helper's worker, Oct 20 2026. See map/JUNGLE_V3_LITE_NOTES.md.
 * What changed vs rev 3 (look is unchanged except where noted in the notes):
 *  - createField() returns at once; the bake runs as a resumable job in a ~2 ms/frame budget (auto-pumped from update), nearest chunk first.
 *    Until a chunk is built nothing is drawn for it (terrain_v2 shows), then it fades in over 0.35 s.
 *  - bake work cut ~3-6x: typeAt memoised per tile, paddy dike() memoised on a pixel grid (skipped where no paddy), colour parse cached.
 *  - plants are flattened into one cached canvas per 48 px strip per layer (2 sway states), so a chunk draws ~8 images instead of ~450;
 *    strips with parted grass fall back to per-plant draws so the bend animation is exact.
 *  - canopy: no view-sized buffer per chunk; only a chunk that a see-through hole touches is composited.
 * Export: JUNGLE3 (tile: 48). */
(function (root) {
  'use strict';
  var T = 48, OUT = '#1a1c12';
  var J = { tile: T, version: 3, lite: 1, ready: false };
  var PAL = {
    grass: ['#22381a', '#2f4a1c', '#3e5e22', '#56782a', '#6f9234', '#8fa848', '#a8a45a', '#c2b878'],
    culm: ['#33461a', '#4a6a24', '#6d8c34', '#93a84a', '#b7b866'],
    leaf: ['#22381a', '#2f4a1c', '#3e5e22', '#5f8a2c', '#7fa23c', '#9ab84e'],
    banana: ['#2c4818', '#3f6a22', '#56862c', '#73a23a', '#94bc4c', '#8a7a3a', '#6e5a2c'],
    nipa: ['#26401a', '#3a5c22', '#52782c', '#6c9236', '#8aa848', '#7a6a34'],
    rubber: ['#16261200', '#1c3014', '#273f18', '#34521e', '#456826', '#5a7e2e', '#729636'],
    teak: ['#0', '#24381a', '#33501f', '#476a28', '#5f8430', '#7a9c3a', '#98b24a'],
    dipt: ['#0', '#1a2c14', '#28401a', '#385820', '#4c7228', '#668c32', '#86a63e'],
    water: ['#46605f', '#5a7676', '#6d8a8a', '#86a09e', '#9fb4b0', '#c0d0cc'],
    dike: ['#4e3e24', '#6e5a34', '#8a7040', '#a88a52', '#9a5a32'],
    rice: ['#3e5e22', '#5f8a2c', '#86b03c', '#a6c24e'],
    bark: ['#2a2418', '#3e3424', '#5a4c34', '#786848', '#9a8a68']
  };
  // ---------- seeded helpers ----------
  function hsh(x, y, s) { var h = (x * 374761393 + y * 668265263 + (s | 0) * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function vnoise(x, y, s) { var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = hsh(xi, yi, s), b = hsh(xi + 1, yi, s), c = hsh(xi, yi + 1, s), d = hsh(xi + 1, yi + 1, s); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
  function fbm(x, y, s) { return vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15; }
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function dith(x, y) { return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }
  var RGBC = Object.create(null); function rgb(h) { var c = RGBC[h]; if (c) return c; var n = parseInt(h.slice(1, 7), 16); return (RGBC[h] = [n >> 16 & 255, n >> 8 & 255, n & 255]); }
  function mkc(w, h) { var c; if (typeof document !== 'undefined') { c = document.createElement('canvas'); c.width = w; c.height = h; } else if (typeof OffscreenCanvas !== 'undefined') c = new OffscreenCanvas(w, h); else throw new Error('JUNGLE3: no canvas'); return c; }
  // pixel raster -> canvas
  function Rast(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  Rast.prototype.set = function (x, y, col, a) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h || !col) return; var c = typeof col === 'string' ? rgb(col) : col, i = (y * this.w + x) * 4;
    var al = a === undefined ? 1 : a; if (al >= 1 || this.d[i + 3] === 0) { this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = Math.round(255 * al); }
    else { this.d[i] += (c[0] - this.d[i]) * al; this.d[i + 1] += (c[1] - this.d[i + 1]) * al; this.d[i + 2] += (c[2] - this.d[i + 2]) * al; this.d[i + 3] = Math.max(this.d[i + 3], 255 * al); } };
  Rast.prototype.a = function (x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.d[(y * this.w + x) * 4 + 3]; };
  Rast.prototype.outline = function (col, onlyEmpty) { var w = this.w, h = this.h, add = [], x, y; for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (!this.a(x, y) && (this.a(x - 1, y) > 128 || this.a(x + 1, y) > 128 || this.a(x, y - 1) > 128 || this.a(x, y + 1) > 128)) add.push(x, y);
    for (var i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], col); return this; };
  Rast.prototype.canvas = function () { var c = mkc(this.w, this.h), x = c.getContext('2d'), im = x.createImageData(this.w, this.h); im.data.set(this.d); x.putImageData(im, 0, 0); return c; };
  function ramp(p, v) { v = Math.max(0, Math.min(0.999, v)); return p[Math.floor(v * p.length)]; }

  // ---------- elephant grass tuft (Imperata / Saccharum) ----------
  // 7 bend levels (-3..3, units parting it) x 4 sway frames, split into back (under units) / front (over units).
  var GW = 34, GH = 46, GAX = 17, GAY = 42;
  var GV = 8;
  function grassBlades(v) { var r = rng(1000 + v * 77), bl = [], hs = 0.7 + (v % 4) * 0.17 + r() * 0.1, dry = v >= 4 ? 0.3 : 0.05 * (v % 4), lean0 = (r() - 0.5) * 10, n = 20 + Math.floor(r() * 10);
    for (var i = 0; i < n; i++) { var ang = r() * Math.PI * 2, rad = Math.sqrt(r()) * 1;
      bl.push({ rx: Math.cos(ang) * rad * (8 + r() * 4), ry: Math.sin(ang) * rad * 4, h: (10 + r() * 13) * hs, c: (r() - 0.5) * 16 + lean0, ph: r() * 6.28, tone: Math.min(1, r() * 0.8 + dry), dry: r() < 0.25 + dry, plume: r() < 0.12 + dry * 0.3 }); }
    bl.sort(function (a, b) { return a.ry - b.ry; }); return bl; }
  function drawBlade(R, b, lean, sway) { var x0 = GAX + b.rx, y0 = GAY + b.ry, h = b.h * (1 - Math.abs(lean) * 0.12), px = -99, py = -99;
    for (var s = 0; s <= h; s += 0.5) { var t = s / h, off = (b.c * 0.5 + lean * 6 + sway * 1.6 * Math.sin(b.ph)) * t * t, x = Math.round(x0 + off + (b.rx * 0.25) * t), y = Math.round(y0 - s + Math.abs(lean) * 5 * t * t);
      if (x === px && y === py) continue; px = x; py = y;
      var lv = 0.08 + t * 0.55 + b.tone * 0.22 + (dith(x, y) - 0.5) * 0.14; R.set(x, y, b.dry && t > 0.55 ? (t > 0.8 ? '#c8b880' : t > 0.68 ? '#ab9a5e' : '#8e8a4c') : t > 0.85 ? (b.tone > 0.5 ? '#a8a45a' : '#8fa848') : ramp(PAL.grass.slice(0, 6), lv));
      if (t < 0.45) R.set(x + 1, y, ramp(PAL.grass, lv - 0.22)); }
    if (b.plume) { var tx = x0 + (b.c * 0.5 + lean * 6) , ty = y0 - h; for (var k = 0; k < 6; k++) R.set(tx + (k & 1), ty - k * 0.6 + 1, k < 3 ? '#c2b878' : '#d8d0a4'); } }
  function grassFrame(v, lean, sway, part) { var R = new Rast(GW, GH), bl = grassBlades(v);
    for (var i = 0; i < bl.length; i++) { var front = bl[i].ry > 0.6; if ((part === 'front') !== front) continue; drawBlade(R, bl[i], lean, sway); }
    if (part === 'back') { for (var x = -8; x <= 8; x++) for (var y = -2; y <= 2; y++) if (x * x / 64 + y * y / 4 < 1) { if (!R.a(GAX + x, GAY + y + 1)) R.set(GAX + x, GAY + y + 1, '#1a2412', 0.35); } }
    return R.outline('#1f2e16').canvas(); }

  // ---------- bamboo clump (Bambusa) ----------
  var BW = 64, BH = 104, BAX = 32, BAY = 98, BSPLIT = 52; // rows >= BSPLIT drawn under units, crown rows above over units
  function bambooFrame(v, lean, sway) { var R = new Rast(BW, BH), r = rng(2000 + v * 31), n = 9 + Math.floor(r() * 4), culms = [], i, s;
    for (i = 0; i < n; i++) culms.push({ x: (r() - 0.5) * 16, y: (r() - 0.5) * 5, h: 70 + r() * 22, c: (r() - 0.5) * 60, ph: r() * 6.28, w: r() < 0.5 ? 2 : 3 });
    culms.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < culms.length; i++) { var cu = culms[i], seg = 9 + Math.floor(r() * 3), tipx = 0, tipy = 0;
      for (s = 0; s <= cu.h; s++) { var t = s / cu.h, off = (cu.c + lean * 10 + sway * 2.2 * Math.sin(cu.ph)) * t * t, x = Math.round(BAX + cu.x + off), y = Math.round(BAY + cu.y - s);
        var node = (s % seg) === 0 && s > 3;
        for (var k = 0; k < cu.w; k++) R.set(x + k, y, node ? PAL.culm[0] : PAL.culm[Math.min(4, 1 + (k === 0 ? 2 : k === 1 ? 1 : 0) + (t > 0.6 ? 1 : 0))]);
        if (node && s > cu.h * 0.45) { var lr = r(); if (lr < 0.5) for (var b = 0; b < 6; b++) R.set(x + (lr < 0.4 ? -b : cu.w + b), y - Math.round(b * 0.5), PAL.culm[1]); }
        tipx = x; tipy = y; }
      cu.tx = tipx; cu.ty = tipy; }
    // leaf sprays: narrow lanceolate leaves hanging from upper culms
    for (i = 0; i < culms.length; i++) { cu = culms[i]; var nl = 22 + Math.floor(r() * 10);
      for (var l = 0; l < nl; l++) { var tt = 0.6 + r() * 0.4, ly = BAY + cu.y - cu.h * tt, lx = BAX + cu.x + (cu.c + lean * 10) * tt * tt, ang = (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.7) + sway * 0.06, len = 5 + r() * 6, tone = r();
        var dir = r() < 0.5 ? -1 : 1, slope = 0.45 + r() * 0.6;
        for (var q = 0; q < len; q++) { var u = q / len, ex = lx + dir * q * (0.9 - u * 0.2), ey = ly + q * slope + q * q * 0.05, wdt = Math.sin(u * 3.14) * 1.6;
          R.set(ex, ey, ramp(PAL.leaf, 0.42 + tone * 0.45 - u * 0.08));
          if (wdt > 0.8) R.set(ex, ey + 1, ramp(PAL.leaf, 0.2 + tone * 0.3)); } } }
    for (var x = -14; x <= 14; x++) for (var y = -3; y <= 3; y++) if (x * x / 196 + y * y / 9 < 1 && !R.a(BAX + x, BAY + y + 2)) R.set(BAX + x, BAY + y + 2, '#1a2412', 0.38);
    var c = R.outline(OUT).canvas(); return { under: sub(c, 0, BSPLIT, BW, BH - BSPLIT), over: sub(c, 0, 0, BW, BSPLIT) }; }
  function sub(c, x, y, w, h) { var o = mkc(w, h); o.getContext('2d').drawImage(c, x, y, w, h, 0, 0, w, h); return o; }

  // ---------- banana (Musa) ----------
  var NW = 84, NH = 80, NAX = 42, NAY = 76;
  function bananaFrame(v, sway) { var R = new Rast(NW, NH), r = rng(3000 + v * 13), i, s2, q;
    var G = ['#2e4a1e', '#3e5e26', '#506f2e', '#64823a', '#7d9648'], D = ['#4a3a22', '#6a5430', '#866c3e', '#a08654', '#b49c6a'];
    var ox = NAX, oy = NAY - 28;
    // dead fronds hanging down the pseudostem (dry, brown, shredded)
    var nd = 2 + (r() * 2 | 0);
    for (i = 0; i < nd; i++) { var side = i & 1 ? 1 : -1, sx = ox + side * (2 + r() * 2), len = 16 + r() * 8;
      for (s2 = 0; s2 < len; s2++) { var t = s2 / len, x = sx + side * (Math.sin(t * 1.6) * 7), y = oy + 2 + s2 * 0.95, wd = 2.5 * (1 - t * 0.6);
        for (q = -wd; q <= wd; q += 0.5) if (hsh(Math.round(q * 2), s2 >> 1, i + 50) > 0.3) R.set(x + q, y + (q * side > 0 ? 1 : 0), ramp(D, 0.2 + (q < 0 ? 0.45 : 0.15) + hsh(s2, i, 3) * 0.3)); } }
    for (var y = 0; y < 28; y++) for (var k = -2; k <= 2; k++) R.set(ox + k, NAY - y, ramp(['#3e4a26', '#55623a', '#6e7a4a', '#808a58'], 0.3 + (k < 0 ? 0.4 : 0) - (k === 2 ? 0.3 : 0) + hsh(k, y >> 2, v) * 0.2));
    var nl = 6 + Math.floor(r() * 3);
    for (i = 0; i < nl; i++) { var ang = -Math.PI / 2 + (i / (nl - 1) - 0.5) * 3.6 + (r() - 0.5) * 0.4 + sway * 0.05, L = 22 + r() * 12, dead = r() < 0.22, half = dead ? 0 : r() < 0.5 ? 1 : 0, w = 5 + r() * 2.5;
      var ca = Math.cos(ang), sa = Math.sin(ang), Pal = dead ? D : G, segS = 2 + (r() * 2 | 0);
      for (s2 = 0; s2 < L; s2++) { var t = s2 / L, droop = t * t * (dead ? 22 : 14) - Math.sin(t * 3.14) * (dead ? 2 : 6), wd = w * Math.sin(Math.min(0.97, t * 0.85 + 0.12) * 3.14) * (t < 0.1 ? 0.3 : 1);
        for (q = -wd; q <= wd; q += 0.5) { var side2 = q < 0 ? 0 : 1, seg = Math.floor(s2 / segS);
          // wind tears: leaf shredded into strips along the lateral veins, ragged edges, one half sometimes shredded to the midrib
          var torn = Math.abs(q) > 1 && (hsh(seg, side2, i * 7 + v) < (half && side2 ? 0.55 : 0.25) && (s2 % segS) === 0);
          var rag = Math.abs(q) > wd - 1.2 - hsh(s2, side2, i + 9) * 2.5;
          if (torn || (rag && hsh(s2, side2 + 4, i) < 0.5)) continue;
          var gap = Math.abs(q) > 1.5 ? hsh(seg, side2 + 2, i + v * 3) * 2 : 0; // strips splay apart
          var x = ox + ca * s2 - sa * (q + Math.sign(q) * gap * t), yy = oy + sa * s2 * 0.75 + ca * q * 0.75 + droop + Math.abs(q) * t * 0.6;
          var lit = (q < 0 ? 0.62 : 0.32) + (1 - t) * 0.1 + (hsh(x | 0, yy | 0, 2) - 0.5) * 0.18;
          var brownEdge = !dead && Math.abs(q) > wd - 1.5 && hsh(s2, side2, i + 33) < 0.35;
          R.set(x, yy, Math.abs(q) < 0.6 ? (dead ? D[4] : '#9aa468') : brownEdge ? D[2] : ramp(Pal, lit)); } } }
    for (var x2 = -11; x2 <= 11; x2++) for (var y2 = -2; y2 <= 2; y2++) if (x2 * x2 / 121 + y2 * y2 / 4 < 1 && !R.a(NAX + x2, NAY + y2)) R.set(NAX + x2, NAY + y2, '#1a2412', 0.35);
    var c = R.outline(OUT).canvas(); return { under: sub(c, 0, 52, NW, NH - 52), over: sub(c, 0, 0, NW, 52) }; }

  // ---------- war damage: defoliated dead tree (grey, bare, snapped limbs) and shattered stump ----------
  var DW = 44, DH = 64, DAX = 22, DAY = 60, DSPLIT = 34;
  function deadTree(v) { var R = new Rast(DW, DH), r = rng(7000 + v * 23), G = ['#3a3834', '#55524a', '#706c62', '#8c877a', '#a8a294'], hgt = 34 + r() * 16, lean = (r() - 0.5) * 6, y, k;
    for (y = 0; y < hgt; y++) { var t = y / hgt, x = DAX + lean * t * t, wdt = t < 0.15 ? 3 : t < 0.6 ? 2 : 1;
      for (k = -wdt; k <= wdt; k++) R.set(x + k, DAY - y, ramp(G, 0.2 + (k < 0 ? 0.5 : 0.1) + hsh(k, y >> 1, v) * 0.25)); }
    if (r() < 0.5) for (k = 0; k < 4; k++) R.set(DAX + lean + (k & 1), DAY - hgt - k, G[3]); // snapped top
    var nb = 3 + (r() * 3 | 0);
    for (var b = 0; b < nb; b++) { var by = DAY - hgt * (0.45 + r() * 0.5), bx = DAX + lean * 0.5, dir = r() < 0.5 ? -1 : 1, len = 5 + r() * 9, up = 0.4 + r() * 0.6;
      for (var s2 = 0; s2 < len; s2++) { R.set(bx + dir * s2, by - s2 * up, G[s2 < 3 ? 2 : 3]); if (s2 === (len * 0.6 | 0)) for (var q = 1; q < 4; q++) R.set(bx + dir * (s2 + q * 0.4), by - s2 * up - q, G[3]); } }
    for (var x2 = -9; x2 <= 9; x2++) for (var y2 = -2; y2 <= 2; y2++) if (!R.a(DAX + x2 + 3, DAY + y2)) R.set(DAX + x2 + 3, DAY + y2, '#141410', 0.3);
    var c = R.outline(OUT).canvas(); return { under: sub(c, 0, DSPLIT, DW, DH - DSPLIT), over: sub(c, 0, 0, DW, DSPLIT) }; }
  function stumpSprite(v) { var R = new Rast(20, 20), r = rng(7500 + v * 29), h = 6 + r() * 6, w = 3 + (r() * 2 | 0), burnt = v & 1;
    var B = burnt ? ['#1e1c18', '#2e2a24', '#46403a', '#5e5850'] : PAL.bark;
    for (var y = 0; y < h; y++) for (var k = -w; k <= w; k++) R.set(10 + k, 17 - y, ramp(B, 0.25 + (k < 0 ? 0.4 : 0) + hsh(k, y, v) * 0.2));
    for (k = -w; k <= w; k++) { var sp = (hsh(k, 1, v + 3) * 5) | 0; for (var q = 0; q < sp; q++) R.set(10 + k, 17 - h - q, q > 2 ? '#c8b890' : burnt ? '#5a524a' : '#b09c70'); } // splinters, pale fresh wood
    for (k = 0; k < 6; k++) R.set(10 + (r() - 0.5) * 16, 16 + r() * 3, '#b09c70'); // wood chips
    for (var x2 = -6; x2 <= 6; x2++) if (!R.a(11 + x2, 18)) R.set(11 + x2, 18, '#141410', 0.3);
    return R.outline(OUT).canvas(); }

  // ---------- scrub bush (edge blending: lantana / shrub / saplings) ----------
  function scrubSprite(v) { var R = new Rast(30, 22), r = rng(6000 + v * 19), n = 5 + (r() * 4 | 0), P = v & 1 ? ['#2a3e1a', '#3a5222', '#4e682a', '#667e36', '#7e9040'] : ['#2e3e1c', '#425426', '#58682e', '#707a3a', '#8a8a4a'];
    for (var i = 0; i < n; i++) { var cx = 15 + (r() - 0.5) * 16, cy = 13 + (r() - 0.5) * 6, rr = 3 + r() * 4;
      for (var y = -rr; y <= rr; y++) for (var x = -rr; x <= rr; x++) { var e = Math.sqrt(x * x + y * y) / rr + vnoise((cx + x) * 0.8, (cy + y) * 0.8, v) * 0.5; if (e > 1.15) continue;
        R.set(cx + x, cy + y, ramp(P, 0.7 - (x + y) / (rr * 3) - e * 0.3 + (hsh(cx + x | 0, cy + y | 0, v) - 0.5) * 0.3)); } }
    for (var x2 = -9; x2 <= 9; x2++) for (var y2 = -2; y2 <= 2; y2++) if (!R.a(15 + x2 + 2, 19 + y2)) R.set(15 + x2 + 2, 19 + y2, '#1a2412', 0.3);
    return R.outline('#1f2a14').canvas(); }

  // ---------- nipa palm (Nypa fruticans, stemless, river/paddy edges) ----------
  var PW = 72, PH = 56, PAX = 36, PAY = 50;
  function nipaFrame(v, sway, part) { var R = new Rast(PW, PH), r = rng(4000 + v * 17), n = 9 + Math.floor(r() * 3);
    for (var i = 0; i < n; i++) { var ang = Math.PI + (i + r() * 0.6) / n * Math.PI + sway * 0.04, len = 22 + r() * 12, front = Math.abs(ang - 1.5 * Math.PI) > 1.1;
      if ((part === 'front') !== (i % 3 === 0)) continue;
      var ca = Math.cos(ang), sa = Math.sin(ang);
      for (var s = 0; s < len; s++) { var t = s / len, x = PAX + ca * s, y = PAY + sa * s * 0.85 + t * t * 9; R.set(x, y, PAL.nipa[5]);
        if (s > 3 && (s & 1)) for (var side = -1; side <= 1; side += 2) { var ll = (1 - t) * 6 + 2; for (var q = 1; q < ll; q++) R.set(x - sa * q * side * 0.8 + ca * q * 0.5, y + ca * q * side * 0.6 + q * 0.4, ramp(PAL.nipa.slice(0, 5), (side < 0 ? 0.6 : 0.35) + (1 - t) * 0.2)); } } }
    if (part === 'back') for (var x2 = -12; x2 <= 12; x2++) for (var y2 = -3; y2 <= 3; y2++) if (x2 * x2 / 144 + y2 * y2 / 9 < 1 && !R.a(PAX + x2, PAY + y2)) R.set(PAX + x2, PAY + y2, '#1a2412', 0.35);
    return R.outline(OUT).canvas(); }

  // ---------- tree trunks under the canopy (visible through the see-through hole) ----------
  function trunkSprite(kind, v) { var R = new Rast(40, 44), r = rng(5000 + v * 7 + kind.length * 101), cx = 20, base = 40, w = kind === 'dipt' ? 4 : kind === 'rubber' ? 2 : 3;
    for (var y = 0; y < 30; y++) for (var k = -w; k <= w; k++) R.set(cx + k, base - y, ramp(PAL.bark, 0.25 + (k < 0 ? 0.35 : 0) + (kind === 'rubber' ? 0.3 : 0) + (dith(k, y) - 0.5) * 0.25));
    if (kind === 'rubber') for (y = 6; y < 22; y += 2) R.set(cx + ((y >> 1) % 3) - 1, base - y, '#d8d4c0'); // tapping scars, latex
    if (kind === 'dipt') for (var b = 0; b < 4; b++) { var dx = [-1, 1, -0.4, 0.5][b], dy = [0.2, 0.3, 0.6, 0.55][b]; for (var s = 0; s < 12; s++) for (var q = 0; q < 2; q++) R.set(cx + dx * (4 + s), base - 8 + s * (0.7 + dy * 0.3) + q - s * 0.1, ramp(PAL.bark, 0.3 + q * 0.3)); }
    for (var x2 = -12; x2 <= 12; x2++) for (var y2 = -3; y2 <= 3; y2++) if (x2 * x2 / 144 + y2 * y2 / 9 < 1 && !R.a(cx + x2, base + y2)) R.set(cx + x2, base + y2, '#1a2412', 0.35);
    return R.outline(OUT).canvas(); }

  // ---------- canopy crowns (top-down) stamped into the field canopy raster ----------
  // rubber (Hevea, plantation rows near Khe Sanh/Quang Tri): small dense dark; teak (Tectona): broad light, big leaves;
  // dipterocarp (Dipterocarpus/Hopea): emergent, very large lumpy crowns.
  function stampCrown(R, S, cx, cy, kind, r) { var P = PAL[kind], rad = kind === 'dipt' ? 34 + r() * 14 : kind === 'teak' ? 22 + r() * 8 : 15 + r() * 6,
      nc = Math.round(rad * rad / (kind === 'teak' ? 60 : 45)), cl = [], i;
    for (i = 0; i < nc; i++) { var a = r() * 6.283, d = Math.sqrt(r()) * rad * 0.8; cl.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: (kind === 'teak' ? 7 : 6) + r() * (kind === 'dipt' ? 7 : 4) }); }
    cl.sort(function (a, b) { return (b.x + b.y) - (a.x + a.y); }); // lit clumps (top-left) drawn last, on top
    var sd = (r() * 1e6) | 0;
    for (i = 0; i < cl.length; i++) { var c = cl[i], x0 = Math.floor(c.x - c.r - 2), x1 = Math.ceil(c.x + c.r + 2), y0 = Math.floor(c.y - c.r - 2), y1 = Math.ceil(c.y + c.r + 2);
      for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) { var dx = x - c.x, dy = y - c.y, e = Math.sqrt(dx * dx + dy * dy) / c.r, leafy = vnoise(x * 0.7, y * 0.7, sd) * 0.4 + vnoise(x * 1.9, y * 1.9, sd + 3) * 0.35;
        if (e + leafy * 0.5 > 1.12) continue;
        var gx = (x - cx) / rad, gy = (y - cy) / rad, lit = 0.62 - (dx + dy) / (c.r * 2.6) - (gx + gy) * 0.18 - e * e * 0.28 + (leafy - 0.37) * 1.4 + (dith(x, y) - 0.5) * 0.18;
        if (kind === 'teak' && hsh(x >> 1, y >> 1, sd) < 0.08) lit -= 0.25; // big-leaf gaps
        R.set(x, y, P[Math.max(1, Math.min(P.length - 1, 1 + Math.floor(lit * (P.length - 1))))]);
        if (S) S.set(x + 7, y + 9, '#000', 0); } } }
  // bilinear lattice cache of a smooth 2-output function over a world rect (step px); exact at lattice points, <~0.3 px error between
  function Lat(fn, x0, y0, w, h, step) { var nx = Math.ceil(w / step) + 2, ny = Math.ceil(h / step) + 2, A = new Float64Array(nx * ny), B = new Float64Array(nx * ny);
    this.ny = ny; this.x0 = x0; this.y0 = y0; this.x1 = x0 + (nx - 1) * step; this.y1 = y0 + (ny - 1) * step; this.s = step; this.nx = nx; this.A = A; this.B = B; this.fn = fn; }
  Lat.prototype.fill = function* () { var nx = this.nx, i, j, q; for (j = 0; j < this.ny; j++) { for (i = 0; i < nx; i++) { q = this.fn(this.x0 + i * this.s, this.y0 + j * this.s); this.A[j * nx + i] = q[0]; this.B[j * nx + i] = q[1]; } if ((j & 7) === 7) yield 0; } };
  Lat.prototype.get = function (x, y, out) { if (x < this.x0 || y < this.y0 || x >= this.x1 || y >= this.y1) { var q = this.fn(x, y); out[0] = q[0]; out[1] = q[1]; return out; }
    var u = (x - this.x0) / this.s, v = (y - this.y0) / this.s, i = u | 0, j = v | 0, fu = u - i, fv = v - j, k = j * this.nx + i, n = this.nx, A = this.A, B = this.B;
    out[0] = (A[k] * (1 - fu) + A[k + 1] * fu) * (1 - fv) + (A[k + n] * (1 - fu) + A[k + n + 1] * fu) * fv;
    out[1] = (B[k] * (1 - fu) + B[k + 1] * fu) * (1 - fv) + (B[k + n] * (1 - fu) + B[k + n + 1] * fu) * fv; return out; };
  // ---------- caches (built incrementally by the job queue, or all at once by JUNGLE3.init()) ----------
  var C = { grass: [], bamboo: [], banana: [], nipa: [], trunk: {}, ring: [], hole: {} };
  var BENDS = [-3, -2, -1, 0, 1, 2, 3], SWAY = [0, 1, 0, -1];
  function* initGen() { var v, b, f;
    for (v = 0; v < GV; v++) { var gv = { back: [], front: [] }; for (b = 0; b < 7; b++) { gv.back[b] = []; gv.front[b] = []; for (f = 0; f < 4; f++) { gv.back[b][f] = grassFrame(v, BENDS[b] / 3, SWAY[f], 'back'); gv.front[b][f] = grassFrame(v, BENDS[b] / 3, SWAY[f], 'front'); } yield 0; } C.grass.push(gv); }
    for (v = 0; v < 2; v++) { var bv = []; for (b = 0; b < 7; b++) { bv[b] = []; for (f = 0; f < 4; f++) bv[b][f] = bambooFrame(v, BENDS[b] / 3 * 0.6, SWAY[f]); yield 0; } C.bamboo.push(bv); }
    for (v = 0; v < 4; v++) { C.banana.push([0, 1, 2, 3].map(function (f) { return bananaFrame(v, SWAY[f]); })); yield 0; }
    for (v = 0; v < 2; v++) { C.nipa.push({ back: [0, 1, 2, 3].map(function (f) { return nipaFrame(v, SWAY[f], 'back'); }), front: [0, 1, 2, 3].map(function (f) { return nipaFrame(v, SWAY[f], 'front'); }) }); yield 0; }
    ['rubber', 'teak', 'dipt'].forEach(function (k) { C.trunk[k] = [trunkSprite(k, 0), trunkSprite(k, 1)]; }); yield 0;
    C.scrub = [0, 1, 2, 3, 4, 5].map(scrubSprite); C.dead = [0, 1, 2, 3].map(deadTree); C.stump = [0, 1, 2, 3].map(stumpSprite); yield 0;
    for (var i = 0; i < 4; i++) { var R = new Rast(32, 16), rr = 5 + i * 3; for (var a = 0; a < 64; a++) { var an = a / 64 * 6.283; R.set(16 + Math.cos(an) * rr, 8 + Math.sin(an) * rr * 0.45, '#c0d0cc', 0.7 - i * 0.15); } C.ring.push(R.canvas()); }
    J.ready = true; }
  var initJob = null;
  function* needInit() { if (J.ready) return; if (!initJob) initJob = initGen(); while (!initJob.next().done) yield 0; }
  J.init = function () { if (J.ready) return J; var g = needInit(); while (!g.next().done); return J; };
  function holeSprite(rad) { if (C.hole[rad]) return C.hole[rad]; var s = rad * 2, R = new Rast(s, s);
    for (var y = 0; y < s; y++) for (var x = 0; x < s; x++) { var d = Math.sqrt((x - rad + 0.5) * (x - rad + 0.5) + (y - rad + 0.5) * (y - rad + 0.5)) / rad, a = d < 0.55 ? 1 : d > 1 ? 0 : 1 - (d - 0.55) / 0.45;
      if (a > dith(x >> 1, y >> 1)) R.set(x, y, '#000', a < 1 ? Math.min(1, 0.55 + a * 0.6) : 1); }
    return (C.hole[rad] = R.canvas()); }

  // ---------- job queue: every bake is a generator stepped inside a per-frame time budget ----------
  var now = (typeof performance !== 'undefined' && performance.now) ? function () { return performance.now(); } : function () { return Date.now(); };
  var Q = [], BAKED = [], lastPump = -1e9;
  J.budgetMs = 2;          // ms of bake work per frame (auto-pumped from the first Field.update of each frame)
  J.evictSec = 4;
  // jr mem: per-strip bakes are only needed where grass gets parted. A chunk with no unit within J.hotPx for J.stripCold s keeps only its
  // flattened layer (strips freed); when units come near again the strips are rebuilt (high priority) before they reach the grass. ?jstrips=1 keeps all.
  J.stripCold = (typeof location !== 'undefined' && /[?&]jstrips=1\b/.test(location.search)) ? 0 : 3; J.hotPx = 260;          // plant-layer caches of fields not drawn for this long are freed (rebuilt on demand)
  J.focus = null;          // {x,y}: queue builds nearest-first to this point (set automatically from update's player)
  J.pending = function () { return Q.length; };
  J.pump = function (ms) { var t0 = now(), lim = t0 + (ms === undefined ? J.budgetMs : ms); lastPump = t0;
    while (Q.length && now() < lim) { var bi = 0;
      if (J.focus && Q.length > 1) { var bd = 1e18; for (var i = 0; i < Q.length; i++) { var F = Q[i].f, dx = (F.tx0 + F.tx1 + 1) * T / 2 - J.focus.x, dy = (F.ty0 + F.ty1 + 1) * T / 2 - J.focus.y, d = dx * dx + dy * dy + (Q[i].pri || 0); if (d < bd) { bd = d; bi = i; } } }
      var jb = Q[bi]; while (now() < lim) { if (jb.g.next().done) { Q.splice(bi, 1); jb.f._job = null; break; } } }
    var tn = now(); for (var k = BAKED.length - 1; k >= 0; k--) { var G = BAKED[k]; if (tn - G._lastDraw > J.evictSec * 1000) { G._layers = null; G._layersQueued = false; BAKED.splice(k, 1); continue; }
      if (J.stripCold && G._layers && !G._stripsFreed && tn - (G._hotAt || 0) > J.stripCold * 1000 && G._layers[0].underC !== undefined) { for (var rr = 0; rr < G._layers.length; rr++) { G._layers[rr].under = null; G._layers[rr].over = null; } G._stripsFreed = true; } }
    return Q.length; };
  function autoPump() { var t = now(); if (t - lastPump > 7) J.pump(); if (J.chunkFlat) idleKick(); }
  // jr perf: most bake work runs in browser idle time after the frame (requestIdleCallback), only a small slice stays in-frame
  var idleOn = false; function idleKick() { if (idleOn || !Q.length || typeof requestIdleCallback === 'undefined') return; idleOn = true;
    requestIdleCallback(function (d) { idleOn = false; var ms = Math.min(8, d.timeRemaining() - 1); if (ms > 0.5) { var lp = lastPump; J.pump(ms); lastPump = lp; } if (Q.length) idleKick(); }, { timeout: 250 }); }
  if (J.chunkFlat) J.budgetMs = 1;
  function enqueue(F, g, pri) { var jb = { f: F, g: g, pri: pri || 0 }; Q.push(jb); return jb; }

  // ---------- field ----------
  // typeAt(tx,ty) -> 'paddy' | 'grass' | 'scrub' | 'hedgerow' | 'bamboo' | 'banana' | 'nipa' | 'sand' | 'defoliated' | 'damaged' | 'jungle' | 'rubber' | 'teak' | other
  J.createField = function (o) { var F = new Field(o); if (o.sync) { var g = F._job.g; while (!g.next().done); Q.splice(Q.indexOf(F._job), 1); F._job = null; F.fade = 1; } return F; };
  function memoType(o) { var ta = o.typeAt, M = 4, X0 = (o.tx0 | 0) - M, Y0 = (o.ty0 | 0) - M, W = (o.tx1 | 0) - X0 + M + 1, H = (o.ty1 | 0) - Y0 + M + 1, A = new Array(W * H), extra = new Map();
    return function (tx, ty) { var i = tx - X0, j = ty - Y0; if (i >= 0 && j >= 0 && i < W && j < H) { var k = j * W + i, v = A[k]; if (v === undefined) v = A[k] = ta(tx, ty); return v; }
      var key = tx + ',' + ty, w = extra.get(key); if (w === undefined) { w = ta(tx, ty); extra.set(key, w); } return w; }; }
  function Field(o) { this.o = o; this.tx0 = o.tx0 | 0; this.ty0 = o.ty0 | 0; this.tx1 = o.tx1 | 0; this.ty1 = o.ty1 | 0; this.typeAt = memoType(o); this.t = 0; this.holeR = o.holeRadius || 84; this.open = 0;
    this.canopyAlpha = o.canopyAlpha === undefined ? 1 : o.canopyAlpha; this.dikeEvery = o.dikeEvery || 3; this.reveal = []; this.ripples = []; this.plants = []; this.craters = []; this.paddy = null; this.canopy = null;
    this.ready = false; this.fade = 0; this._lastDraw = now(); this._hotAt = now(); this._layers = null; this._strips = null; this._buildMs = 0;
    this._job = enqueue(this, this._build()); }
  Field.prototype._build = function* () { var self = this, o = this.o, tx0 = this.tx0, ty0 = this.ty0, tx1 = this.tx1, ty1 = this.ty1, ta = this.typeAt, seed = o.seed || 1968, tx, ty;
    yield* needInit();
    var r = rng(seed), plants = this.plants;
    var isCan = function (x, y) { var k = ta(x, y); return k === 'jungle' || k === 'rubber' || k === 'teak'; };
    var wk = this.warpType = function (wx, wy) { var ox = (fbm(wx / 60, wy / 60, seed + 1) - 0.5) * 56, oy = (fbm(wx / 60, wy / 60, seed + 2) - 0.5) * 56;
      return ta(Math.floor((wx + ox) / T), Math.floor((wy + oy) / T)); };
    var r3 = rng(seed + 7), dmg = o.damage || 0, cr = this.craters;
    for (ty = ty0; ty <= ty1; ty++) for (tx = tx0; tx <= tx1; tx++) { var kk = ta(tx, ty), def = kk === 'defoliated' || kk === 'damaged', pc = def ? 1.1 : isCan(tx, ty) ? 0 : dmg * 0.5;
      while (r3() < pc) { cr.push({ x: tx * T + 8 + r3() * 32, y: ty * T + 8 + r3() * 32, r: 5 + r3() * (def ? 7 : 5) }); pc -= 0.6; } }
    yield* this.buildPaddy(r);
    var r2 = rng(seed + 5);
    for (ty = ty0; ty <= ty1; ty++) for (tx = tx0; tx <= tx1; tx++) if (isCan(tx, ty) && r2() < 0.35) plants.push({ k: 'trunk', x: tx * T + 8 + r2() * 32, y: ty * T + 14 + r2() * 30, kind: ta(tx, ty) === 'jungle' ? (r2() < 0.45 ? 'dipt' : 'teak') : ta(tx, ty), v: (r2() * 2) | 0 });
    var X0 = tx0 * T, Y0 = ty0 * T, X1 = (tx1 + 1) * T, Y1 = (ty1 + 1) * T, st = 11, gx, gy, x, y, k;
    for (gy = Y0; gy < Y1; gy += st) { yield 0; for (gx = X0; gx < X1; gx += st) { x = gx + r() * st; y = gy + r() * st; k = wk(x, y); var dens = fbm(x / 40, y / 40, seed + 3);
      if (this.inPaddy && this.inPaddy(x, y)) continue; if (k === 'paddy') k = 'grass';
      var edge = k !== wk(x + 30, y) || k !== wk(x, y + 30) || k !== wk(x - 30, y) || k !== wk(x, y - 30);
      var dfl = k === 'defoliated' || k === 'damaged';
      if (k === 'scrub') { if (r() < 0.5) plants.push({ k: 'scrub', x: x, y: y, v: (r() * 6) | 0 }); else if (r() < 0.12) plants.push({ k: 'grass', x: x, y: y, v: 4 + ((r() * 4) | 0), b: 3, bend: 0, ph: (r() * 4) | 0 }); }
      else if (k === 'hedgerow') { if (r() < 0.35) plants.push({ k: 'scrub', x: x, y: y, v: (r() * 6) | 0 }); }
      else if (k === 'sand') { if (r() < 0.05) plants.push({ k: 'grass', x: x, y: y, v: 4 + ((r() * 4) | 0), b: 3, bend: 0, ph: (r() * 4) | 0 }); }
      else if (dfl) { if (r() < 0.035) plants.push({ k: 'grass', x: x, y: y, v: 4 + ((r() * 4) | 0), b: 3, bend: 0, ph: (r() * 4) | 0 }); }
      if ((dfl ? 0.05 : (k === 'grass' || k === 'scrub') ? (o.damage || 0) * 0.03 : 0) > r()) plants.push({ k: 'stump', x: x, y: y, v: (r() * 4) | 0 });
      if (k === 'grass' && r() < 0.62 + dens * 0.5) plants.push({ k: 'grass', x: x, y: y, v: (dens > 0.55 ? 4 : 0) + ((r() * 4) | 0), b: 3, bend: 0, ph: (r() * 4) | 0 });
      else if ((k === 'bamboo' || k === 'banana') && r() < 0.3) plants.push({ k: 'grass', x: x, y: y, v: (r() * GV) | 0, b: 3, bend: 0, ph: (r() * 4) | 0 });
      if (edge && k !== 'paddy' && !isCan(Math.floor(x / T), Math.floor(y / T)) && r() < 0.16) plants.push({ k: 'scrub', x: x, y: y, v: (r() * 6) | 0 });
      if (edge && k === 'grass' && r() < 0.18) plants.push({ k: 'grass', x: x + r() * 6, y: y, v: 4 + ((r() * 4) | 0), b: 3, bend: 0, ph: (r() * 4) | 0 }); } }
    for (gy = Y0; gy < Y1; gy += 30) for (gx = X0; gx < X1; gx += 30) { x = gx + r() * 30; y = gy + r() * 30; k = wk(x, y); if (this.inPaddy && this.inPaddy(x, y)) continue;
      if (k === 'bamboo' && r() < 0.5 && ta(Math.floor(x / T), Math.floor(y / T)) !== 'hedgerow') plants.push({ k: 'bamboo', x: x, y: y, v: (r() * 2) | 0, b: 3, bend: 0, ph: (r() * 4) | 0 });
      if (k === 'banana' && r() < 0.75) plants.push({ k: 'banana', x: x, y: y, v: (r() * 4) | 0, ph: (r() * 4) | 0 });
      if (ta(Math.floor(x / T), Math.floor(y / T)) === 'hedgerow') { plants.push({ k: 'bamboo', x: x, y: y, v: (r() * 2) | 0, b: 3, bend: 0, ph: (r() * 4) | 0 }); if (r() < 0.5) plants.push({ k: 'bamboo', x: x + 8 + r() * 10, y: y + 4 + r() * 6, v: (r() * 2) | 0, b: 3, bend: 0, ph: (r() * 4) | 0 }); }
      if ((k === 'defoliated' || k === 'damaged') && r() < 0.32) plants.push({ k: 'dead', x: x, y: y, v: (r() * 4) | 0 });
      if (k === 'nipa' && r() < 0.8) plants.push({ k: 'nipa', x: x, y: y, v: (r() * 2) | 0, ph: (r() * 4) | 0 }); }
    plants.sort(function (a, b) { return a.y - b.y; });
    yield 0;
    yield* this.buildCanopy(isCan, seed);
    this._makeStrips();
    this.ready = true;
    if (o.preBakeLayers !== false) yield* this._bakeLayers(); };

  // ground bake: identical art to rev 3; dike() is memoised on a pixel grid (it was evaluated up to 6x per pixel), skipped entirely when no paddy is near
  Field.prototype.buildPaddy = function* (r) { var ta = this.typeAt, x0 = this.tx0 * T, y0 = this.ty0 * T, w = (this.tx1 - this.tx0 + 1) * T, h = (this.ty1 - this.ty0 + 1) * T, de = this.dikeEvery, wk = this.warpType, sd = (this.o.seed || 1968) + 17;
    var isP = function (tx, ty) { return ta(tx, ty) === 'paddy'; };
    var WAT = ['#3a3326', '#4a4232', '#5a503e', '#6a5f4a', '#7a6e58', '#8c8068'], SKY = ['#76786c', '#88897c', '#9c9c8e'];
    var GR = ['#2a3e1a', '#344a1e', '#3e5624', '#4c6428', '#5c7230', '#6e7e3a', '#86864a', '#9c9458'];
    var LIT = ['#3a3420', '#4a4228', '#5e5232', '#6e6a3a', '#4a5a28'], MUD = ['#3a3222', '#4a4030', '#5a4e3a'];
    var SAND = ['#a8a088', '#bcb49c', '#ccc6b0', '#dad4c2', '#e6e2d4'], ASH = ['#2e2c28', '#3e3b35', '#504c44', '#645e54', '#7a7468'];
    var EARTH = ['#4a3a24', '#664e30', '#7e623c', '#9a7a4c', '#8a5a34'];
    var base = new Rast(w, h), glint = [];
    // perf (rc8): pw/pwf/WL return one reused scratch pair instead of a fresh [x,y] per call (every caller copies q[0]/q[1] immediately: Lat.fill, Lat.get, dikeRaw, pwf user)
    var PWS = [0, 0], pw = function (wx, wy) { PWS[0] = wx + (vnoise(wx / 26, wy / 26, sd) - 0.5) * 12 + (vnoise(wx / 70, wy / 70, sd + 7) - 0.5) * 22; PWS[1] = wy + (vnoise(wx / 26, wy / 26, sd + 1) - 0.5) * 12 + (vnoise(wx / 70, wy / 70, sd + 8) - 0.5) * 22; return PWS; };
    var PL = null, PQ = [0, 0], PFQ = [0, 0], pwf = function (wx, wy) { return PL ? PL.get(wx, wy, PFQ) : pw(wx, wy); };
    var dikeRaw = function (wx, wy) { var q = PL ? PL.get(wx, wy, PQ) : pw(wx, wy), X = q[0], Y = q[1], tx = Math.floor(X / T), ty = Math.floor(Y / T); if (!isP(tx, ty)) return -1;
      var lx = X - tx * T, ly = Y - ty * T, Wd = 3.2 + vnoise(wx / 11, wy / 11, sd + 4) * 2.8;
      if ((lx < Wd && (!isP(tx - 1, ty) || tx % de === 0)) || (lx >= T - Wd && (!isP(tx + 1, ty) || (tx + 1) % de === 0)) ||
          (ly < Wd && (!isP(tx, ty - 1) || ty % de === 0)) || (ly >= T - Wd && (!isP(tx, ty + 1) || (ty + 1) % de === 0))) return 1;
      return 0; };
    var seedW = this.o.seed || 1968, WQ = [0, 0], WS = [0, 0], WL = new Lat(function (x, y) { WS[0] = (fbm(x / 60, y / 60, seedW + 1) - 0.5) * 56; WS[1] = (fbm(x / 60, y / 60, seedW + 2) - 0.5) * 56; return WS; }, x0 - 8, y0 - 8, w + 16, h + 16, 4); yield* WL.fill();
    var wkf = function (wx, wy) { var o2 = WL.get(wx, wy, WQ); return ta(Math.floor((wx + o2[0]) / T), Math.floor((wy + o2[1]) / T)); }; yield 0;
    var hasP = false, tx, ty; for (ty = this.ty0 - 1; ty <= this.ty1 + 1 && !hasP; ty++) for (tx = this.tx0 - 1; tx <= this.tx1 + 1; tx++) if (isP(tx, ty)) { hasP = true; break; }
    var GX0 = -4, GY0 = -4, GW2 = w + 9, GH2 = h + 9, DG = null, gi, gj;
    if (hasP) { PL = new Lat(pw, x0 + GX0 - 2, y0 + GY0 - 2, GW2 + 4, GH2 + 4, 2); yield* PL.fill(); DG = new Int8Array(GW2 * GH2); for (gj = 0; gj < GH2; gj++) { for (gi = 0; gi < GW2; gi++) DG[gj * GW2 + gi] = dikeRaw(x0 + gi + GX0, y0 + gj + GY0); if ((gj & 3) === 3) yield 0; } }
    var dike = function (wx, wy) { var i = wx - x0 - GX0, j = wy - y0 - GY0; if (i >= 0 && j >= 0 && i < GW2 && j < GH2 && i === (i | 0) && j === (j | 0)) return DG ? DG[j * GW2 + i] : -1; return dikeRaw(wx, wy); };
    var any = false;
    for (var y = 0; y < h; y++) { yield 0; for (var x = 0; x < w; x++) { var wx = x0 + x, wy = y0 + y, d = dike(wx, wy);
      if (d === 1) { var up = dike(wx, wy - 1) !== 1, dn = dike(wx, wy + 1) !== 1, lf = dike(wx - 1, wy) !== 1, rt = dike(wx + 1, wy) !== 1, n = hsh(wx, wy, 5), gp = fbm(wx / 7, wy / 7, sd + 6);
        base.set(x, y, dn || rt ? EARTH[0] : up || lf ? EARTH[3] : gp > 0.58 ? (n < 0.5 ? GR[4] : GR[5]) : gp > 0.5 ? GR[6] : n < 0.12 ? EARTH[4] : EARTH[1 + (n * 2 | 0)]); any = true; continue; }
      if (d === 0) { any = true; var q = pwf(wx, wy), bt = Math.floor(q[0] / T / de), bu = Math.floor(q[1] / T / de), pv = hsh(bt, bu, sd), pv2 = hsh(bt, bu, sd + 9);
        // water: silt + algae base varies per paddy, slow reflection of sky/cloud, wind-roughened patches
        var cl = fbm(wx / 58, wy / 34, sd + 11), rough = vnoise(wx / 12, wy / 5, sd + 12), lv = 0.18 + pv * 0.3 + cl * 0.35 + (rough - 0.5) * 0.15;
        var sh = 0; for (var k2 = 1; k2 <= 3; k2++) if (dike(wx - k2, wy - k2) === 1) { sh = 1; break; } // dike casts shadow down-right
        if (sh) lv -= 0.28;
        var col = WAT[Math.max(0, Math.min(5, Math.floor(lv * 6 + dith(x, y) - 0.5)))];
        if (!sh && cl > 0.8 - pv2 * 0.04 && dith(x, y) < (cl - 0.78) * 5) col = SKY[cl > 0.75 ? 2 : cl > 0.68 ? 1 : 0];
        if (dike(wx, wy + 2) === 1 && !sh) col = '#2e3222'; // reflection of the dike bank on the water
        base.set(x, y, col);
        // rice: rows every 5 px, clumps every 4 px; density/maturity per paddy (some freshly planted, some fallow)
        var dens = pv2 < 0.15 ? 0 : pv2 < 0.4 ? 0.55 : 0.9, rowx = pv < 0.5;
        var a1 = rowx ? wy : wx, a2 = rowx ? wx : wy, rr = ((Math.floor(q[rowx ? 1 : 0]) % 5) + 5) % 5, cc = (((a2 + (Math.floor(a1 / 5) & 1) * 2) % 4) + 4) % 4;
        if (dens && cc === 1 && hsh(a2 >> 2, a1 >> 2, sd + 3) < dens) { var tall = pv2 > 0.7;
          if (rr === 2) base.set(x, y, tall ? '#7a9a3a' : '#7a9636'); else if (rr === 1) base.set(x, y, tall ? '#a2b850' : '#98b046'); else if (rr === 0 && tall) base.set(x, y, '#a6b656');
          else if (rr === 3) base.set(x, y, '#2a3020'); }
        // stubble from the last harvest poking through (dense in fallow paddies, sparse between rows elsewhere)
        if (hsh(wx >> 1, wy >> 1, sd + 40) < (dens ? 0.025 : 0.12) && (wx & 1) === 0) { base.set(x, y, hsh(wx, wy, 41) < 0.5 ? '#a8985e' : '#8a7c4a'); }
        continue; }
      // floor outside paddies, picked from the warped biome map with a dithered fringe
      var jx = (hsh(wx, wy, 21) - 0.5) * 10, k = wkf(wx + jx, wy + jx * 0.7), f = fbm(wx / 14, wy / 9, sd + 13), nz = hsh(wx, wy, 22);
      if (k === 'paddy') k = 'grass';
      if (k === 'grass') base.set(x, y, GR[Math.max(0, Math.min(7, Math.floor((f * 0.8 + nz * 0.35) * 7.2 - 0.6)))]);
      else if (k === 'bamboo' || k === 'banana') base.set(x, y, nz < 0.3 ? GR[2 + (nz * 10 | 0) % 3] : LIT[Math.floor((f * 0.7 + nz * 0.3) * 4.99)]);
      else if (k === 'nipa') base.set(x, y, nz < 0.15 ? GR[3] : MUD[Math.floor((f * 0.6 + nz * 0.4) * 2.99)]);
      else if (k === 'scrub') base.set(x, y, nz < 0.25 ? EARTH[1 + (nz * 8 | 0) % 2] : GR[Math.max(0, Math.min(7, Math.floor((f * 0.8 + nz * 0.3) * 7 - 0.2)))]);
      else if (k === 'hedgerow') base.set(x, y, nz < 0.25 ? GR[2 + (nz * 10 | 0) % 3] : LIT[Math.floor((f * 0.7 + nz * 0.3) * 4.99)]);
      else if (k === 'sand') base.set(x, y, SAND[Math.max(0, Math.min(4, Math.floor((f * 0.7 + nz * 0.4) * 5 - 0.3)))]);
      else if (k === 'defoliated' || k === 'damaged') base.set(x, y, nz < 0.1 ? '#6e6248' : nz < 0.16 ? '#8a7a54' : ASH[Math.max(0, Math.min(4, Math.floor((f * 0.75 + nz * 0.35) * 5 - 0.4)))]); }
    }
    // shell craters: churned rim, ejecta, muddy water in the bowl
    for (var ci = 0; ci < this.craters.length; ci++) { yield 0; var C0 = this.craters[ci], cxp = C0.x - x0, cyp = C0.y - y0, rr0 = C0.r;
      for (var yy = -rr0 * 2; yy <= rr0 * 2; yy++) for (var xx = -rr0 * 2; xx <= rr0 * 2; xx++) { var dd = Math.sqrt(xx * xx + yy * yy * 1.3) / rr0 + (vnoise((cxp + xx) / 3, (cyp + yy) / 3, ci) - 0.5) * 0.35, X2 = cxp + xx, Y2 = cyp + yy, hn = hsh(X2, Y2, 77);
        if (dd < 0.62) base.set(X2, Y2, dd < 0.5 && hn < 0.04 ? '#8a8c80' : WAT[(xx + yy > 0 ? 2 : 0) + (hn < 0.4 ? 1 : 0)]);
        else if (dd < 0.82) base.set(X2, Y2, xx + yy < 0 ? EARTH[0] : '#2a241a');
        else if (dd < 1.15) base.set(X2, Y2, xx + yy < 0 ? (hn < 0.5 ? EARTH[3] : EARTH[2]) : (hn < 0.5 ? EARTH[2] : EARTH[1]));
        else if (dd < 1.9 && hn < 0.5 * (1.9 - dd)) base.set(X2, Y2, EARTH[1 + (hn * 6 | 0) % 3]); } }
    this.paddy = []; if (!any) { this.isPaddy = null; }
    for (var fr = 0; fr < 3; fr++) { yield 0; if (!DG && fr) { this.paddy.push(this.paddy[0]); continue; } var Rf = new Rast(w, h); Rf.d.set(base.d);
      for (var g = 0; g < w * h / 260; g++) { var gx = (hsh(g, fr, sd + 30) * w) | 0, gy = (hsh(g, fr, sd + 31) * h) | 0; if (dike(x0 + gx, y0 + gy) === 0 && dike(x0 + gx + 1, y0 + gy) === 0) { Rf.set(gx, gy, '#b4bca4', 0.8); Rf.set(gx + 1, gy, '#8a9478', 0.7); } }
      yield 0; this.paddy.push(Rf.canvas()); toBmp(this.paddy, this.paddy.length - 1); }
    this.isPaddy = any ? function (tx, ty) { return isP(tx, ty); } : null; this.inPaddy = function (wx, wy) { return dike(wx, wy) >= 0; };
  };
  // canopy: identical art to rev 3, sliced into resumable steps
  Field.prototype.buildCanopy = function* (isCan, seed) { var x0 = this.tx0 * T - T, y0 = this.ty0 * T - T, w = (this.tx1 - this.tx0 + 3) * T, h = (this.ty1 - this.ty0 + 3) * T, r = rng(seed + 99), any = false, tx, ty, ta = this.typeAt;
    var crowns = [];
    for (ty = this.ty0; ty <= this.ty1; ty++) for (tx = this.tx0; tx <= this.tx1; tx++) { if (!isCan(tx, ty)) continue; any = true; var k = ta(tx, ty);
      for (var i = 0; i < 2; i++) { var kind = k === 'rubber' ? 'rubber' : k === 'teak' ? 'teak' : (r() < 0.22 ? 'dipt' : r() < 0.5 ? 'teak' : 'rubber');
        var cx = k === 'rubber' ? tx * T + 12 + i * 24 : tx * T + 6 + r() * 36, cy = k === 'rubber' ? ty * T + 24 : ty * T + 6 + r() * 36; crowns.push([cx - x0, cy - y0, kind]); } }
    this.canopy = null; if (!any) return;
    var R = new Rast(w, h);
    crowns.sort(function (a, b) { return (a[2] === 'dipt') - (b[2] === 'dipt') || a[1] - b[1]; });
    for (var c = 0; c < crowns.length; c++) { stampCrown(R, null, crowns[c][0], crowns[c][1], crowns[c][2], r); yield 0; }
    var add = [], x, y; for (y = 0; y < h; y++) { for (x = 0; x < w; x++) if (!R.a(x, y) && (R.a(x - 1, y) > 128 || R.a(x + 1, y) > 128 || R.a(x, y - 1) > 128 || R.a(x, y + 1) > 128)) add.push(x, y); if ((y & 15) === 15) yield 0; }
    for (i = 0; i < add.length; i += 2) R.set(add[i], add[i + 1], OUT); yield 0;
    var out = new Rast(w, h);
    for (y = 0; y < h; y++) { for (x = 0; x < w; x++) { var i4 = (y * w + x) * 4; if (R.d[i4 + 3]) { out.d.set(R.d.subarray(i4, i4 + 4), i4); } else if (R.a(x - 8, y - 10) > 128) { out.d[i4] = 10; out.d[i4 + 1] = 18; out.d[i4 + 2] = 8; out.d[i4 + 3] = 110; } } if ((y & 15) === 15) yield 0; }
    var full = out.canvas(); yield 0; var cnp = []; this.cx0 = x0; this.cy0 = y0;
    if (w <= 512 && h <= 512) cnp.push({ x: 0, y: 0, c: full }); else for (y = 0; y < h; y += 512) for (x = 0; x < w; x += 512) cnp.push({ x: x, y: y, c: sub(full, x, y, Math.min(512, w - x), Math.min(512, h - y)) });
    for (var cb = 0; cb < cnp.length; cb++) toBmp(cnp[cb], 'c');
    this.canopy = cnp; };

  // ---------- plant layers: flattened per 48 px horizontal strip (exact y-order kept), 2 sway states ----------
  // rect of one plant sprite for a part (world px), or null if it draws nothing in that part
  function spr(p, part, f) { var c, X, Y; f = f & 3;
    if (p.k === 'grass') { c = C.grass[p.v][part === 'under' ? 'back' : 'front'][p.b][f]; X = p.x - GAX; Y = p.y - GAY; }
    else if (p.k === 'bamboo') { c = C.bamboo[p.v][p.b][f]; if (part === 'under') { c = c.under; X = p.x - BAX; Y = p.y - BAY + BSPLIT; } else { c = c.over; X = p.x - BAX; Y = p.y - BAY; } }
    else if (p.k === 'banana') { c = C.banana[p.v][f]; if (part === 'under') { c = c.under; X = p.x - NAX; Y = p.y - NAY + 52; } else { c = c.over; X = p.x - NAX; Y = p.y - NAY; } }
    else if (p.k === 'nipa') { c = C.nipa[p.v][part === 'under' ? 'back' : 'front'][f]; X = p.x - PAX; Y = p.y - PAY; }
    else if (p.k === 'dead') { c = C.dead[p.v]; if (part === 'under') { c = c.under; X = p.x - DAX; Y = p.y - DAY + DSPLIT; } else { c = c.over; X = p.x - DAX; Y = p.y - DAY; } }
    else if (part !== 'under') return null;
    else if (p.k === 'stump') { c = C.stump[p.v]; X = p.x - 10; Y = p.y - 18; }
    else if (p.k === 'scrub') { c = C.scrub[p.v]; X = p.x - 15; Y = p.y - 19; }
    else if (p.k === 'trunk') { c = C.trunk[p.kind][p.v]; X = p.x - 20; Y = p.y - 40; }
    else return null;
    return SPR.c = c, SPR.x = X, SPR.y = Y, SPR; }
  var SPR = { c: null, x: 0, y: 0 };
  var SH = 24; // strip height in world px (by plant anchor y); J.stripPx to tune before createField
  J.stripPx = SH;
  Field.prototype._makeStrips = function () { SH = this._sh = J.stripPx || 24; var P = this.plants, Y0 = this.ty0 * T, S = [], i;
    for (i = 0; i < P.length; i++) { var p = P[i], si = Math.floor((p.y - Y0) / SH); if (!S.length || S[S.length - 1].si !== si) S.push({ si: si, p: [], bent: 0, y0: Y0 + si * SH }); S[S.length - 1].p.push(p); }
    this._strips = S; };
  // bake one strip/part/state into a canvas trimmed to its sprites' bounds
  Field.prototype._bakeStrip = function (s, part, st) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i, q, b0;
    for (i = 0; i < s.p.length; i++) { var p = s.p[i]; b0 = p.b; if (p.b !== undefined) p.b = 3; q = spr(p, part, st + (p.ph || 0)); if (b0 !== undefined) p.b = b0; if (!q) continue;
      if (q.x < x0) x0 = q.x; if (q.y < y0) y0 = q.y; if (q.x + q.c.width > x1) x1 = q.x + q.c.width; if (q.y + q.c.height > y1) y1 = q.y + q.c.height; }
    if (x1 < x0) return null; x0 = Math.floor(x0); y0 = Math.floor(y0); var c = mkc(Math.ceil(x1) - x0 + 1, Math.ceil(y1) - y0 + 1), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    for (i = 0; i < s.p.length; i++) { p = s.p[i]; b0 = p.b; if (p.b !== undefined) p.b = 3; q = spr(p, part, st + (p.ph || 0)); if (b0 !== undefined) p.b = b0; if (q) g.drawImage(q.c, Math.round(q.x) - x0, Math.round(q.y) - y0); }
    return { c: c, x: x0, y: y0 }; };
  Field.prototype._bakeLayers = function* () { var S = this._strips, n = (this.o.swayFrames === 1 ? 1 : 2), L = [], i, st;
    for (st = 0; st < n; st++) { var row = { under: [], over: [] }; L.push(row); for (i = 0; i < S.length; i++) { row.under.push(this._bakeStrip(S[i], 'under', st)); yield 0; row.over.push(this._bakeStrip(S[i], 'over', st)); yield 0; } }
    var bytes = 0; L.forEach(function (rw) { ['under', 'over'].forEach(function (pt) { rw[pt].forEach(function (b) { if (b) bytes += b.c.width * b.c.height * 4; }); }); }); this.layerBytes = bytes;
    if (J.chunkFlat) for (st = 0; st < n; st++) { yield 0; L[st].underC = flat(L[st].under); toBmp(L[st].underC, 'c'); yield 0; L[st].overC = flat(L[st].over); toBmp(L[st].overC, 'c'); }
    this._layers = L; this._layersQueued = false; this._lastDraw = now(); BAKED.push(this); };
  Field.prototype._rebuildStrips = function* () { var S = this._strips, L = this._layers, i, st; if (!S || !L) { this._stripJob = null; return; }
    var rows = []; for (st = 0; st < L.length; st++) { var row = { under: [], over: [] }; rows.push(row); for (i = 0; i < S.length; i++) { row.under.push(this._bakeStrip(S[i], 'under', st)); row.over.push(this._bakeStrip(S[i], 'over', st)); if ((i & 3) === 3) yield 0; } }
    if (this._layers === L) { for (st = 0; st < L.length; st++) { L[st].under = rows[st].under; L[st].over = rows[st].over; } this._stripsFreed = false; } this._stripJob = null; };
  // jr perf: the strips of a part are also flattened into ONE canvas per chunk (same pixels, same order); used whenever no strip in the chunk is bent
  function flat(arr) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i, b; for (i = 0; i < arr.length; i++) { b = arr[i]; if (!b) continue; if (b.x < x0) x0 = b.x; if (b.y < y0) y0 = b.y; if (b.x + b.c.width > x1) x1 = b.x + b.c.width; if (b.y + b.c.height > y1) y1 = b.y + b.c.height; }
    if (x1 < x0) return null; var c = mkc(x1 - x0, y1 - y0), g = c.getContext('2d'); g.imageSmoothingEnabled = false; for (i = 0; i < arr.length; i++) { b = arr[i]; if (b) g.drawImage(b.c, b.x - x0, b.y - y0); } return { c: c, x: x0, y: y0 }; }
  // perf LOD (J.lod=1 at MED/LOW/Deck or after a watchdog downshift, set by the game from LQ.t): bent plants draw their baked pose (flat chunk canvas), i.e. no per-plant bend redraw near units. HIGH = full.
  J.lod = 0;
  J.stat = { flat: 0, strip: 0, plant: 0, nolayer: 0 };
  // jr perf: baked canvases are swapped for ImageBitmaps (immutable, pre-decoded: much cheaper to blit than a canvas source); same pixels
  J.useBitmap = J.chunkFlat && typeof createImageBitmap !== 'undefined' && !(typeof location !== 'undefined' && /[?&]jbmp=0\b/.test(location.search));
  function toBmp(o, k) { if (!J.useBitmap || !o || !o[k] || typeof o[k].getContext !== 'function') return; var c = o[k]; createImageBitmap(c).then(function (b) { if (o[k] === c) o[k] = b; }, function () {}); }
  // jr perf: all strips of a part flattened into ONE canvas per chunk (exact same pixels & order, strips never overlap units within a part)
  J.chunkFlat = !(typeof location !== 'undefined' && /[?&]jperf=0\b/.test(location.search));

  // per-frame: dt seconds, player {x,y} world px, units [{x,y}] (incl. enemies) -> grass/bamboo bend, ripples, canopy hole
  // lite: units are pre-filtered to this field's box, and only strips that have a unit in reach or still-springing plants are touched
  Field.prototype.update = function (dt, player, units) { this.t += dt || 0; if (player) { this.player = player; J.focus = player; } autoPump();
    if (this.ready && this.fade < 1) this.fade = Math.min(1, this.fade + (dt || 0.016) / 0.35);
    var X0 = this.tx0 * T - 40, X1 = (this.tx1 + 1) * T + 40, Y0 = this.ty0 * T - 40, Y1 = (this.ty1 + 1) * T + 40, us = [], j, u;
    var all = units || []; for (j = 0; j < all.length; j++) { u = all[j]; if (u.x > X0 && u.x < X1 && u.y > Y0 && u.y < Y1) us.push(u); }
    if (J.stripCold) { var H = J.hotPx, hot = false, hx0 = X0 - H, hx1 = X1 + H, hy0 = Y0 - H, hy1 = Y1 + H; for (j = 0; j < all.length && !hot; j++) { u = all[j]; if (u.x > hx0 && u.x < hx1 && u.y > hy0 && u.y < hy1) hot = true; }
      if (!hot && player && player.x > hx0 && player.x < hx1 && player.y > hy0 && player.y < hy1) hot = true;
      if (hot) { this._hotAt = now(); if (this._stripsFreed && !this._stripJob && this._layers) this._stripJob = enqueue(this, this._rebuildStrips(), -1e12); } }
    if (player && player.x > X0 && player.x < X1 && player.y > Y0 && player.y < Y1 && us.indexOf(player) < 0) us.push(player);
    var k = Math.min(1, (dt || 0.016) * 10), S = this._strips;
    if (S) for (var si = 0; si < S.length; si++) { var s = S[si], near = false;
      for (j = 0; j < us.length; j++) { var dy = us[j].y - s.y0; if (dy > -40 && dy < this._sh + 40) { near = true; break; } }
      if (!near && !s.bent) continue; var bent = 0;
      for (var i = 0; i < s.p.length; i++) { var p = s.p[i]; if (p.k !== 'grass' && p.k !== 'bamboo') continue; var tgt = 0, R = p.k === 'grass' ? 20 : 26;
        if (near) for (j = 0; j < us.length; j++) { u = us[j]; var dx = p.x - u.x, dyy = (p.y - u.y) * 1.6; if (Math.abs(dx) > R || Math.abs(dyy) > R) continue; var d = Math.sqrt(dx * dx + dyy * dyy); if (d < R) { var sv = (1 - d / R) * 3.6 * (dx >= 0 ? 1 : -1); if (Math.abs(sv) > Math.abs(tgt)) tgt = sv; } }
        if (!tgt && !p.bend) continue;
        p.bend += (tgt - p.bend) * (tgt ? k * 1.6 : k * 0.45); if (!tgt && Math.abs(p.bend) < 0.02) p.bend = 0; p.b = Math.max(0, Math.min(6, Math.round(p.bend) + 3)); if (p.b !== 3 || (p.bend && !J.chunkFlat)) bent++; }   // jr perf: a plant whose bend rounds to 3 draws exactly the baked pose, so it no longer forces the per-plant path
      s.bent = bent; }
    var under = player && this.coveredAt(player.x, player.y); this.open += ((under || this.o.alwaysHole ? 1 : 0) - this.open) * Math.min(1, (dt || 0.016) * 6);
    if (this.isPaddy) for (j = 0; j < us.length; j++) { u = us[j]; if (this.isPaddy(Math.floor(u.x / T), Math.floor(u.y / T)) && (u.moving !== false) && Math.random() < (dt || 0.016) * 3) this.ripples.push({ x: u.x, y: u.y, a: 0 }); }
    for (i = this.ripples.length - 1; i >= 0; i--) { this.ripples[i].a += dt || 0.016; if (this.ripples[i].a > 1.2) this.ripples.splice(i, 1); }
    if (this.ripples.length > 60) this.ripples.splice(0, this.ripples.length - 60); };
  Field.prototype.coveredAt = function (x, y) { if (!this.canopy) return false; var k = this.o.typeAt(Math.floor(x / T), Math.floor(y / T)); return k === 'jungle' || k === 'rubber' || k === 'teak'; };

  function S_(scale) { var s = Math.round(scale || 1); return s < 1 ? 1 : s; }
  function blit(ctx, c, wx, wy, sc, cx, cy) { J.stat.px_ground = (J.stat.px_ground || 0) + c.width * c.height / 1e6; ctx.drawImage(c, Math.round(wx * sc - cx), Math.round(wy * sc - cy), c.width * sc, c.height * sc); }
  function view(ctx) { return [ctx.canvas ? ctx.canvas.width : 4096, ctx.canvas ? ctx.canvas.height : 4096]; }
  Field.prototype._fadeOn = function (ctx) { var a0 = ctx.globalAlpha; if (this.fade < 1) ctx.globalAlpha = a0 * this.fade; return a0; };
  // LAYER 1: paddy water + dikes + wading ripples (placeholder until built: nothing, terrain_v2 shows through; fades in over 0.35 s)
  Field.prototype.drawGround = function (ctx, scale, camX, camY) { this._lastDraw = now(); if (!this.ready || !this.paddy || !this.paddy.length) return; var sc = S_(scale), cx = camX || 0, cy = camY || 0, p0 = ctx.imageSmoothingEnabled, a0 = this._fadeOn(ctx); ctx.imageSmoothingEnabled = false;
    blit(ctx, this.paddy[Math.floor(this.t * 3) % 3], this.tx0 * T, this.ty0 * T, sc, cx, cy);
    for (var i = 0; i < this.ripples.length; i++) { var rp = this.ripples[i], f = Math.min(3, Math.floor(rp.a / 0.3)); blit(ctx, C.ring[f], rp.x - 16, rp.y - 8, sc, cx, cy); }
    ctx.imageSmoothingEnabled = p0; ctx.globalAlpha = a0; };
  Field.prototype.drawUnder = function (ctx, scale, camX, camY) { this._draw(ctx, scale, camX, camY, 'under'); };
  Field.prototype.drawOver = function (ctx, scale, camX, camY) { this._draw(ctx, scale, camX, camY, 'over'); };
  // one drawImage per visible strip; strips with parted/springing plants are drawn plant-by-plant (full 7 bend levels)
  Field.prototype._draw = function (ctx, scale, camX, camY, part) { this._lastDraw = now(); if (!this.ready) return; var S = this._strips; if (!S || !S.length) return;
    var sc = S_(scale), cx = camX || 0, cy = camY || 0, vw = view(ctx), n = this.o.swayFrames === 1 ? 1 : 2, st = n === 1 ? 0 : Math.floor(this.t * 4) & 1, L = this._layers, p0 = ctx.imageSmoothingEnabled, a0 = this._fadeOn(ctx); ctx.imageSmoothingEnabled = false;
    if (!L && !this._layersQueued && !this._job) { this._layersQueued = true; enqueue(this, this._bakeLayers(), -1e12); }
    if (J.chunkFlat && L && L[st][part + 'C'] !== undefined) { var anyB = false; for (var q0 = 0; q0 < S.length; q0++) if (S[q0].bent && !J.lod) { anyB = true; break; }
      if (!anyB) { var F0 = L[st][part + 'C']; if (F0) { var FX = F0.x * sc - cx, FY = F0.y * sc - cy; if (!(FX > vw[0] || FY > vw[1] || FX + F0.c.width * sc < 0 || FY + F0.c.height * sc < 0)) J.stat.flat++, J.stat['px_' + part] = (J.stat['px_' + part] || 0) + F0.c.width * F0.c.height / 1e6, ctx.drawImage(F0.c, Math.round(FX), Math.round(FY), F0.c.width * sc, F0.c.height * sc); }
        ctx.imageSmoothingEnabled = p0; ctx.globalAlpha = a0; return; } }
    for (var i = 0; i < S.length; i++) { var s = S[i], Yt = (s.y0 - 110) * sc - cy, Yb = (s.y0 + this._sh + 50) * sc - cy; if (Yb < 0 || Yt > vw[1]) continue;
      var b = L && (!s.bent || J.lod) && L[st][part] ? L[st][part][i] : undefined;
      if (b === null) continue;
      if (J.chunkFlat && s.bent && !J.lod && L && L[st][part] && L[st][part][i] && this._bentDraw(ctx, s, L[st][part][i], part, st, sc, cx, cy, vw)) continue;
      if (b) { var X = b.x * sc - cx, Y = b.y * sc - cy; if (X > vw[0] || Y > vw[1] || X + b.c.width * sc < 0 || Y + b.c.height * sc < 0) continue; J.stat.strip++; J.stat['px_' + part] = (J.stat['px_' + part] || 0) + b.c.width * b.c.height / 1e6; ctx.drawImage(b.c, Math.round(X), Math.round(Y), b.c.width * sc, b.c.height * sc); continue; }
      if (!L) J.stat.nolayer++;
      for (var j = 0; j < s.p.length; j++) { var q = spr(s.p[j], part, st + (s.p[j].ph || 0)); if (!q) continue; var qx = q.x * sc - cx, qy = q.y * sc - cy; if (qx > vw[0] || qy > vw[1] || qx + q.c.width * sc < 0 || qy + q.c.height * sc < 0) continue; J.stat.plant++; J.stat['px_' + part] = (J.stat['px_' + part] || 0) + q.c.width * q.c.height / 1e6; ctx.drawImage(q.c, Math.round(qx), Math.round(qy), q.c.width * sc, q.c.height * sc); } }
    ctx.imageSmoothingEnabled = p0; ctx.globalAlpha = a0; };
  // jr perf: a bent strip = its baked canvas outside the x-span of the bent plants + only the plants that touch that span (cropped to it), in y order.
  // Every pixel comes from exactly the same y-ordered stack as the per-plant path, but ~6x fewer drawImage calls.
  Field.prototype._bentDraw = function (ctx, s, b, part, st, sc, cx, cy, vw) { var P = s.p, rx0 = 1e9, rx1 = -1e9, i, q, p;
    for (i = 0; i < P.length; i++) { p = P[i]; if (p.b === undefined || p.b === 3) continue; q = spr(p, part, st + (p.ph || 0)); if (!q) continue; var qx = Math.round(q.x); if (qx < rx0) rx0 = qx; if (qx + q.c.width > rx1) rx1 = qx + q.c.width; }
    var X = Math.round(b.x * sc - cx), Y = Math.round(b.y * sc - cy), W = b.c.width, H = b.c.height;
    if (X > vw[0] || Y > vw[1] || X + W * sc < 0 || Y + H * sc < 0) return true;
    if (rx1 < rx0) { J.stat.strip++; ctx.drawImage(b.c, X, Y, W * sc, H * sc); return true; }
    var a0 = Math.max(0, rx0 - b.x), a1 = Math.min(W, rx1 - b.x);
    if (a0 > 0) { J.stat.strip++; ctx.drawImage(b.c, 0, 0, a0, H, X, Y, a0 * sc, H * sc); }
    if (a1 < W) { J.stat.strip++; ctx.drawImage(b.c, a1, 0, W - a1, H, X + a1 * sc, Y, (W - a1) * sc, H * sc); }
    if (a1 <= a0) return true;
    for (i = 0; i < P.length; i++) { p = P[i]; q = spr(p, part, st + (p.ph || 0)); if (!q) continue; var ox = Math.round(q.x) - b.x, oy = Math.round(q.y) - b.y, w = q.c.width, h = q.c.height, c0 = Math.max(ox, a0), c1 = Math.min(ox + w, a1);
      if (c1 <= c0) continue; J.stat.plant++; ctx.drawImage(q.c, c0 - ox, 0, c1 - c0, h, X + c0 * sc, Y + oy * sc, (c1 - c0) * sc, h * sc); }
    return true; };
  // LAYER 4: canopy. Chunks with no see-through hole on them go straight to ctx; only a chunk under a hole is composited (in a chunk-sized scratch, not a view-sized buffer)
  var SCR = null;
  Field.prototype.drawCanopy = function (ctx, scale, camX, camY, extraReveal) { this._lastDraw = now(); if (!this.ready || !this.canopy) return; var sc = S_(scale), cx = camX || 0, cy = camY || 0, vw = view(ctx), i, hr = this.holeR;
    var pts = []; if (this.player && this.open > 0.02) pts.push([this.player.x, this.player.y - 10, this.open]);
    if (extraReveal) for (i = 0; i < extraReveal.length; i++) { var q = extraReveal[i]; pts.push([q.x, q.y - 10, q.a === undefined ? 1 : q.a]); }
    var a0 = ctx.globalAlpha, p0 = ctx.imageSmoothingEnabled; ctx.globalAlpha = a0 * this.canopyAlpha * Math.min(1, this.fade); ctx.imageSmoothingEnabled = false;
    for (i = 0; i < this.canopy.length; i++) { var ch = this.canopy[i], wx = this.cx0 + ch.x, wy = this.cy0 + ch.y, X = wx * sc - cx, Y = wy * sc - cy, cw = ch.c.width, chh = ch.c.height;
      if (X > vw[0] || Y > vw[1] || X + cw * sc < 0 || Y + chh * sc < 0) continue;
      var hit = []; for (var k = 0; k < pts.length; k++) { var P = pts[k]; if (P[0] + hr > wx && P[0] - hr < wx + cw && P[1] + hr > wy && P[1] - hr < wy + chh) hit.push(P); }
      if (!hit.length) { ctx.drawImage(ch.c, Math.round(X), Math.round(Y), cw * sc, chh * sc); continue; }
      if (!SCR || SCR.width < cw || SCR.height < chh) SCR = mkc(Math.max(cw, SCR ? SCR.width : 0), Math.max(chh, SCR ? SCR.height : 0));
      var g = SCR.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.imageSmoothingEnabled = false; g.clearRect(0, 0, cw, chh); g.drawImage(ch.c, 0, 0);
      var H = holeSprite(hr); g.globalCompositeOperation = 'destination-out';
      for (k = 0; k < hit.length; k++) { g.globalAlpha = Math.min(1, hit[k][2]); g.drawImage(H, Math.round(hit[k][0] - hr - wx), Math.round(hit[k][1] - hr - wy)); }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      ctx.drawImage(SCR, 0, 0, cw, chh, Math.round(X), Math.round(Y), cw * sc, chh * sc); }
    ctx.globalAlpha = a0; ctx.imageSmoothingEnabled = p0; };
  Field.prototype.draw = function (ctx, scale, camX, camY, drawUnits) { this.drawGround(ctx, scale, camX, camY); this.drawUnder(ctx, scale, camX, camY); if (drawUnits) drawUnits(); this.drawOver(ctx, scale, camX, camY); this.drawCanopy(ctx, scale, camX, camY); };
  J.Field = Field; J._cache = C;
  root.JUNGLE3 = J;
  if (typeof module !== 'undefined' && module.exports) module.exports = J;
})(typeof self !== 'undefined' ? self : this);
