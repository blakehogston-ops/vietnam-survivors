/* muzzle_flash.js - Artist Helper. Weapon-specific muzzle flashes, Quang Tri 1968. Export VFX_MUZZLE. Standalone (no SHEET1 needed).
 * Pixel-art flashes generated once per (type, variant, frame) as art-px grids, rotated on the grid into 32 headings (crisp, no smoothing),
 * then baked lazily to ONE canvas per (type,variant,frame,dir,integer scale) and cached. Nothing allocates canvases per frame.
 * Layers per shot: ground glow (additive) + shooter light flicker, flash sprite (1-3 frames), smoke puff, drifting haze, ejected brass,
 *   plus type extras (B40 back-blast + dust, M40/cannon ground dust ring).
 * VFX_MUZZLE.draw(ctx, weapon, x, y, angle, t, scale, opts) -> true while anything is still visible.
 *   x,y = muzzle point (screen px), angle = heading radians (0 = +x), t = seconds since the shot, scale = integer px per art px (default 1).
 *   opts (optional): {variant: 0..2 (default hashed from x,y), groundDy: art px from muzzle down to the shooter's feet (default 13),
 *                     brass: false to suppress, layer: 'all'|'under'|'over'}.  'under' = glow + brass + dust; 'over' = flash + smoke + haze.
 * Pool:  VFX_MUZZLE.spawn(weapon, x, y, angle, opts) -> entry (world coords) | null;  .update(dt);
 *        .drawAll(ctx, camX, camY, scale, layer)  draws every live shot (layer as above, default 'all');  .reset();  .count().
 * VFX_MUZZLE.light(weapon, t) -> 0..1 flicker intensity (use to brighten the shooter sprite / lighting pass if you have one).
 * VFX_MUZZLE.TYPES[type] = {frames, ms, life, glow, brass, ...};  VFX_MUZZLE.WEAPON[gameId] -> type;  VFX_MUZZLE.typeOf(id).
 * Smoke value floor #5a554c (never pure black). Pool size 160; oldest entry is recycled when full. */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2, DIRS = 32;
  // palette: 1 fringe .. 5 hot core
  var PAL = [null, 'rgba(196,74,34,0.55)', 'rgba(255,138,40,0.85)', '#ffc24a', '#ffe98a', '#fffbea'];
  var DULL = [null, 'rgba(120,96,70,0.55)', 'rgba(176,120,70,0.75)', '#d89a58', '#f0c27a', '#ffe0a0'];   // M79 thump
  // type table. len/half = cone length (art px) & half-angle; side = side-jet length; rays = birdcage prongs; back = back-blast length
  var TYPES = {
    m16:     { frames: 2, ms: [22, 20], core: 2.2, len: 4, half: 0.35, rays: [-1.0, 0, 1.0], rayLen: 7, glow: [20, 0.5], smoke: 2, haze: 1, brass: 'r', bsz: 1, light: 0.6 },
    ak:      { frames: 2, ms: [26, 22], core: 3.2, len: 15, half: 0.42, rag: 0.55, side: 4, glow: [28, 0.7], smoke: 3, haze: 2, brass: 'r', bsz: 1, light: 0.9 },
    short:   { frames: 1, ms: [26], core: 2.2, len: 6, half: 0.38, rag: 0.3, glow: [22, 0.5], smoke: 2, haze: 1, brass: 'r', bsz: 1, light: 0.5 },
    mg:      { frames: 2, ms: [20, 18], core: 2.8, len: 11, half: 0.34, rag: 0.45, side: 5, jitter: 0.45, glow: [26, 0.65], smoke: 2, haze: 2, brass: 'r', bsz: 1, link: 1, light: 0.8 },
    cal50:   { frames: 3, ms: [24, 22, 20], core: 3.8, len: 17, half: 0.22, side: 10, back: 4, rag: 0.35, glow: [38, 0.85], smoke: 4, haze: 3, brass: 'r', bsz: 2, link: 1, light: 1 },
    m79:     { frames: 2, ms: [34, 30], core: 3, len: 4, half: 0.7, dull: 1, glow: [16, 0.3], smoke: 5, haze: 2, brass: 0, light: 0.25 },
    shotgun: { frames: 2, ms: [26, 22], core: 2.8, len: 9, half: 0.72, rag: 0.5, sparks: 7, glow: [28, 0.65], smoke: 4, haze: 2, brass: 'h', bsz: 2, light: 0.8 },
    pistol:  { frames: 1, ms: [20], core: 1.6, len: 3, half: 0.4, glow: [14, 0.4], smoke: 1, haze: 1, brass: 'r', bsz: 1, light: 0.35 },
    b40:     { frames: 3, ms: [30, 28, 26], core: 3, len: 8, half: 0.5, rag: 0.4, back: 20, backHalf: 0.38, glow: [36, 0.8], smoke: 6, haze: 4, brass: 0, dust: 'back', light: 1 },
    sniper:  { frames: 3, ms: [24, 22, 20], core: 3.4, len: 14, half: 0.26, side: 6, rag: 0.3, glow: [30, 0.75], smoke: 3, haze: 2, brass: 'r', bsz: 1, dust: 'ring', light: 0.9 },
    cannon:  { frames: 3, ms: [34, 30, 28], core: 6, len: 24, half: 0.3, side: 13, rag: 0.4, glow: [60, 0.95], smoke: 8, haze: 5, brass: 0, dust: 'ring', light: 1 }
  };
  var WEAPON = {   // game ids (index.html ITEMS / enemy types / structures / heroes) -> type
    m16: 'm16', m16a1: 'm16', grease: 'pistol', m3: 'pistol', m1911: 'pistol', pistol: 'pistol', colt45: 'pistol', rat: 'pistol', knives: null,
    shotgun: 'shotgun', ithaca: 'shotgun', m1903: 'sniper', m40: 'sniper', sniper: 'sniper', m14: 'short', m1carbine: 'short', carbine: 'short',
    sks: 'short', m60: 'mg', rpd: 'mg', pkm: 'mg', m2: 'cal50', cal50: 'cal50', '50cal': 'cal50', m79: 'm79', m203: 'm79',
    ak: 'ak', ak47: 'ak', type56: 'ak', nva: 'ak', nvaNet: 'ak', officer: 'ak', boss: 'ak', sapper: 'ak', vc: 'short', vcHat: 'short', rpgt: 'ak',
    rpg: 'b40', b40: 'b40', b41: 'b40', rpd_gunner: 'mg', m48: 'cannon', m67: null, pt76: 'cannon', t54: 'cannon', howitzer: 'cannon', ontos: 'b40'
  };
  for (var k in TYPES) { var Z = TYPES[k]; ['core', 'len', 'side', 'rayLen', 'back'].forEach(function (p) { if (Z[p]) Z[p] = Math.round(Z[p] * 1.35 * 10) / 10; }); }
  for (var k in TYPES) { var T = TYPES[k], s = 0; for (var i = 0; i < T.ms.length; i++) s += T.ms[i]; T.flashT = s / 1000;
    T.life = Math.max(T.flashT, 0.12 + T.smoke * 0.09, T.haze ? 1.2 + T.haze * 0.25 : 0, T.brass ? 1.4 : 0, T.dust ? 1.1 : 0); }

  function rng(seed) { var a = seed >>> 0 || 1; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hstr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

  /* --- flash grid: Float field -> levels 0..5, origin at (R,R), aiming +x --- */
  var GRID = {};
  function grid(type, v, f) {
    var key = type + v + f; if (GRID[key]) return GRID[key];
    var T = TYPES[type], r = rng(hstr(key) ^ 0x9e37), R = Math.ceil(Math.max(T.len + T.core + 4, (T.back || 0) + (type === 'b40' ? 16 : 4), (T.side || 0) + 4, (T.rayLen || 0) + 3)), N = R * 2 + 1;
    var g = new Float32Array(N * N), decay = [1, 0.8, 0.55][f], vs = [1, 0.82, 1.15][v] * (T.jitter ? (1 - T.jitter * 0.5 + r() * T.jitter) : 1);
    var nz = new Float32Array(N * N); for (var i = 0; i < nz.length; i++) nz[i] = r();
    function add(x, y, val) { var ix = Math.round(x) + R, iy = Math.round(y) + R; if (ix < 0 || iy < 0 || ix >= N || iy >= N) return; var o = iy * N + ix; if (val > g[o]) g[o] = val; }
    function cone(len, half, dirA, x0, rag, power) {   // filled tapered cone with ragged edge
      len *= vs; for (var d = 0; d <= len; d += 0.5) { var w = Math.sin(Math.PI * Math.min(1, d / len * 0.85 + 0.1)) * Math.tan(half) * Math.min(d + 1.5, len * 0.55);
        for (var u = -w - 1; u <= w + 1; u += 0.5) { var x = x0 + Math.cos(dirA) * d - Math.sin(dirA) * u, y = Math.sin(dirA) * d + Math.cos(dirA) * u;
          var e = 1 - Math.abs(u) / (w + 1.2), along = 1 - d / (len + 1), n = nz[((Math.round(y) + R) * N + Math.round(x) + R) % nz.length] || 0;
          var val = power * Math.pow(Math.max(0, e), 0.6) * Math.pow(along, 0.55) * (1 - (rag || 0) * 0.55 * n); add(x, y, val * 6.0); } } }
    // core
    for (var y = -T.core - 1; y <= T.core + 1; y++) for (var x = -T.core - 1; x <= T.core + 1; x++) { var dd = Math.hypot(x - T.core * 0.4, y) / (T.core * vs * decay + 0.5);
      if (dd < 1.4) add(x + T.core * 0.4, y, (1.4 - dd) / 1.4 * 6.2 * (T.dull ? 0.8 : 1)); }
    if (T.len) cone(T.len * (f ? 1 + f * 0.15 : 1), T.half * (1 + f * 0.25), (r() - 0.5) * 0.1, 1, T.rag, decay);
    if (T.rays) for (var q = 0; q < T.rays.length; q++) { var a = T.rays[q] + (r() - 0.5) * 0.25 + (v === 2 ? 0.2 : 0), L = T.rayLen * vs * (q === 1 ? 0.7 : 1) * (0.8 + r() * 0.4);
      for (var d = 1; d <= L * (f ? 0.7 : 1); d += 0.5) add(1.5 + Math.cos(a) * d, Math.sin(a) * d, 5.4 * decay * (1 - d / (L + 1.5))); }
    if (T.side) for (var sgn = -1; sgn <= 1; sgn += 2) { var sl = T.side * (0.75 + r() * 0.5) * (v === 1 ? 0.6 : 1);
      if (type === 'mg' && v === 2) sl *= 0.3; cone(sl, 0.28, sgn * (type === 'cal50' || type === 'cannon' ? Math.PI / 2 : 1.15) , 1.2, 0.4, decay * 0.85); }
    if (T.back) cone(T.back, T.backHalf || 0.3, Math.PI + (r() - 0.5) * 0.08, type === 'b40' ? -12 : -1, 0.5, decay * (type === 'b40' ? 1.05 : 0.6));
    if (T.sparks) for (var sp = 0; sp < T.sparks; sp++) { var sa = (r() - 0.5) * T.half * 2.4, sd = T.len * (0.6 + r() * 0.8) * vs; add(Math.cos(sa) * sd, Math.sin(sa) * sd, f === 2 ? 1.5 : 3); }
    var out = new Uint8Array(N * N), th = [0, 0.7, 1.7, 2.7, 3.8, 4.9];
    for (var o = 0; o < N * N; o++) { var val = g[o] * (f === 2 ? 0.55 : 1), lv = 0; for (var l = 5; l >= 1; l--) if (val >= th[l]) { lv = l; break; } out[o] = lv; }
    if (f === 2) for (var o2 = 0; o2 < N * N; o2++) if (out[o2] && nz[o2] < 0.35) out[o2] = 0;   // dissipating frame breaks up
    return (GRID[key] = { R: R, N: N, px: out });
  }
  function rotGrid(G, dir) {   // nearest-neighbour rotation on the art grid, about the muzzle origin
    if (!dir) return G; var a = -dir / DIRS * TAU, c = Math.cos(a), s = Math.sin(a), N = G.N, R = G.R, out = new Uint8Array(N * N);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var dx = x - R, dy = y - R, sx = Math.round(c * dx - s * dy) + R, sy = Math.round(s * dx + c * dy) + R;
      if (sx >= 0 && sy >= 0 && sx < N && sy < N) out[y * N + x] = G.px[sy * N + sx]; }
    return { R: R, N: N, px: out };
  }
  var hasDoc = typeof document !== 'undefined';
  function mkCanvas(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); if (hasDoc) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; } return null; }
  var CACHE = {}, nCache = 0;
  function flashImg(type, v, f, dir, sc) {
    var key = type + '|' + v + '|' + f + '|' + dir + '|' + sc, c = CACHE[key]; if (c !== undefined) return c;
    if (nCache > 1800) { CACHE = {}; nCache = 0; }
    var G = rotGrid(grid(type, v, f), dir), cv = mkCanvas(G.N * sc, G.N * sc); if (!cv) return (CACHE[key] = null);
    var x = cv.getContext('2d'), P = TYPES[type].dull ? DULL : PAL;
    for (var i = 0; i < G.N * G.N; i++) { var l = G.px[i]; if (!l) continue; x.fillStyle = P[l]; x.fillRect((i % G.N) * sc, ((i / G.N) | 0) * sc, sc, sc); }
    nCache++; return (CACHE[key] = { cv: cv, R: G.R });
  }
  var GLOW = {};
  function glowImg(kind) {   // one 64px radial glow per tint, baked once
    if (GLOW[kind] !== undefined) return GLOW[kind]; var cv = mkCanvas(64, 64); if (!cv) return (GLOW[kind] = null);
    var x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32), col = kind === 'dull' ? '255,170,90' : '255,196,96';
    gr.addColorStop(0, 'rgba(' + col + ',1)'); gr.addColorStop(0.35, 'rgba(' + col + ',0.45)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return (GLOW[kind] = cv);
  }
  var PUFF = {};
  function puffImg(sc, shade) {   // dithered pixel smoke blob, r = 4 art px; 3 shades
    var key = sc + '|' + shade; if (PUFF[key] !== undefined) return PUFF[key]; var r = rng(77 + shade), cv = mkCanvas(9 * sc, 9 * sc); if (!cv) return (PUFF[key] = null);
    var x = cv.getContext('2d'), cols = [['#c9c3b6', '#a8a296', '#857f74'], ['#b5ad9c', '#958d7c', '#746c5e'], ['#a39c90', '#7f786d', '#5a554c']][shade];
    for (var y = 0; y < 9; y++) for (var xx = 0; xx < 9; xx++) { var d = Math.hypot(xx - 4, y - 4) + r() * 0.9; if (d > 4.4) continue;
      var lit = (xx + y < 7) ? 0 : (xx + y > 10 ? 2 : 1); x.fillStyle = cols[lit]; x.fillRect(xx * sc, y * sc, sc, sc); }
    return (PUFF[key] = cv);
  }
  function frameAt(T, t) { var acc = 0; for (var i = 0; i < T.frames; i++) { acc += T.ms[i] / 1000; if (t < acc) return i; } return -1; }
  function light(weapon, t) { var T = TYPES[typeOf(weapon)]; if (!T || t < 0) return 0; var k = t / (T.flashT + 0.03); return k >= 1 ? 0 : T.light * (1 - k) * (k < 0.4 ? 1 : 0.7 + 0.3 * Math.cos(t * 180)); }
  function typeOf(w) { return TYPES[w] ? w : (WEAPON[w] !== undefined ? WEAPON[w] : 'm16'); }

  function draw(ctx, weapon, x, y, angle, t, scale, opts) {
    var type = typeOf(weapon); if (!type) return false; var T = TYPES[type]; if (t < 0 || t > T.life) return t < 0;
    var sc = Math.max(1, Math.round(scale || 1)), o = opts || {}, layer = o.layer || 'all';
    var v = o.variant != null ? o.variant % 3 : ((Math.round(x) * 7 + Math.round(y) * 13) >>> 0) % 3, seed = o.seed != null ? o.seed : v * 977 + 13;
    var gdy = (o.groundDy != null ? o.groundDy : 13) * sc, gx = x, gy = y + gdy, ca = Math.cos(angle), sa = Math.sin(angle), r = rng(seed + 1);
    var under = layer !== 'over', over = layer !== 'under', prevS = ctx.imageSmoothingEnabled, prevA = ctx.globalAlpha, prevC = ctx.globalCompositeOperation;
    ctx.imageSmoothingEnabled = false;
    if (under) {
      var L = light(type, t); var G = glowImg(T.dull ? 'dull' : 'hot');
      if (L > 0 && G) { ctx.globalCompositeOperation = 'lighter';
        var gr = T.glow[0] * sc * (0.85 + 0.3 * r()); ctx.globalAlpha = Math.min(1, T.glow[1] * L);   // pool of light on the ground (squashed ellipse)
        ctx.drawImage(G, Math.round(gx + ca * 4 * sc - gr), Math.round(gy - gr * 0.45), Math.round(gr * 2), Math.round(gr * 0.9));
        ctx.globalAlpha = Math.min(1, T.glow[1] * L * 0.75); var sr = gr * 0.55;   // light flicker on the shooter / air around the muzzle
        ctx.drawImage(G, Math.round(x - sr - ca * 3 * sc), Math.round(y - sr), Math.round(sr * 2), Math.round(sr * 2));
        ctx.globalCompositeOperation = prevC; }
      if (T.dust) dust(ctx, T, type, x, y, gx, gy, ca, sa, t, sc, r);
      if (T.brass && o.brass !== false) brass(ctx, T, x, y, gy, ca, sa, t, sc, seed);
    }
    if (over) {
      var f = frameAt(T, t);
      if (f >= 0) { var dir = ((Math.round(angle / TAU * DIRS) % DIRS) + DIRS) % DIRS, im = flashImg(type, v, f, dir, sc);
        if (im) { ctx.globalAlpha = prevA; ctx.drawImage(im.cv, Math.round(x - im.R * sc), Math.round(y - im.R * sc)); } }
      smoke(ctx, T, type, x, y, ca, sa, t, sc, seed);
    }
    ctx.globalAlpha = prevA; ctx.globalCompositeOperation = prevC; ctx.imageSmoothingEnabled = prevS;
    return true;
  }
  function puff(ctx, px, py, size, alpha, shade, sc) { if (alpha <= 0.01) return; var p = puffImg(sc, shade); if (!p) return; var s = Math.max(1, Math.round(size)) * sc;   // size = integer multiple of 9 art px blob
    ctx.globalAlpha = alpha; var w = p.width * size; ctx.drawImage(p, Math.round(px - w / 2), Math.round(py - w / 2), Math.round(w), Math.round(w)); }
  function smoke(ctx, T, type, x, y, ca, sa, t, sc, seed) {
    var r = rng(seed + 7), back = type === 'b40';
    for (var i = 0; i < T.smoke; i++) {   // brief puff: shoots forward, slows, swells, fades (0.12..0.5 s)
      var life = 0.16 + T.smoke * 0.06 + r() * 0.12, k = t / life, sp = (8 + r() * 10) * (T.len > 12 ? 1.4 : 1), ang = (r() - 0.5) * 0.9;
      var dirx = back && i % 2 ? -ca : ca, diry = back && i % 2 ? -sa : sa; if (k >= 1 || t < 0.01) continue;
      var dd = sp * (1 - (1 - k) * (1 - k)) * sc * (back && i % 2 ? 1.8 : 1), px = x + (dirx * Math.cos(ang) - diry * Math.sin(ang)) * dd, py = y + (diry * Math.cos(ang) + dirx * Math.sin(ang)) * dd - k * 3 * sc;
      puff(ctx, px, py, (T.dull ? 0.8 : 0.5) + k * (0.6 + T.smoke * 0.06), (1 - k) * (T.dull ? 0.85 : 0.6), T.dull ? 0 : 1, sc); }
    for (var j = 0; j < T.haze; j++) {   // drifting haze: lingers, drifts up and downwind (+x, -y)
      var hl = 1.1 + T.haze * 0.25 + r() * 0.4, hk = (t - 0.04) / hl; if (hk <= 0 || hk >= 1) continue;
      var hx = x + ca * (4 + j * 3) * sc + hk * (10 + j * 4) * sc, hy = y + sa * 3 * sc - hk * (8 + r() * 6) * sc;
      puff(ctx, hx, hy, 1 + hk * (1.2 + T.haze * 0.2), 0.28 * Math.sin(Math.PI * Math.min(1, hk * 1.3)), 0, sc); }
  }
  function brass(ctx, T, x, y, gy, ca, sa, t, sc, seed) {   // ejected case: kicks out to the right of the heading, arcs, bounces, lies & fades
    var r = rng(seed + 3), n = T.brass === 'h' ? 1 : (T.link ? 2 : 1), d0 = T.brass === 'h' ? 0.35 : 0;
    for (var i = 0; i < n; i++) { var tt = t - d0 - i * 0.03; if (tt < 0) continue; var side = 1;   // right side
      var ex = -sa * side, ey = ca * side, vx = (ex * (34 + r() * 16) - ca * 10) * sc, vy0 = -60 * sc, gr = 260 * sc, land = 0.42 + r() * 0.08;
      var u = Math.min(tt, land), px = x - ca * 3 * sc + vx * u, z = Math.max(0, -vy0 * u - gr * u * u / 2 + (gy - y)) ;
      var py = gy - z + ey * 6 * sc * u / land; if (tt > land) { var bt = Math.min(0.12, tt - land); px += vx * 0.15 * bt; py -= Math.sin(bt / 0.12 * Math.PI) * 2 * sc; }
      var fade = tt > 1.0 ? Math.max(0, 1 - (tt - 1.0) / 0.4) : 1; if (fade <= 0) continue;
      ctx.globalAlpha = fade; var spin = ((tt * 30) | 0) & 1, bw = (T.bsz + (spin ? 0 : 1)) * sc, bh = (spin ? T.bsz + 1 : 1) * sc;
      ctx.fillStyle = T.brass === 'h' ? '#a8302a' : '#b8862e'; ctx.fillRect(Math.round(px), Math.round(py), bw, bh);
      ctx.fillStyle = T.brass === 'h' ? '#d8b048' : '#f2d27a'; ctx.fillRect(Math.round(px), Math.round(py), sc, sc);
      if (tt > land) { ctx.globalAlpha = fade * 0.35; ctx.fillStyle = '#1a1c12'; ctx.fillRect(Math.round(px), Math.round(py) + bh, bw, sc); } }
  }
  function dust(ctx, T, type, x, y, gx, gy, ca, sa, t, sc, r) {
    var n = type === 'cannon' ? 10 : type === 'b40' ? 7 : 6, life = type === 'cannon' ? 1.1 : 0.9; if (t > life) return;
    for (var i = 0; i < n; i++) { var k = t / (life * (0.7 + r() * 0.3)); if (k >= 1) continue;
      var a = type === 'b40' ? Math.atan2(-sa, -ca) + (r() - 0.5) * 1.0 : (i / n) * TAU + r() * 0.4, sp = (type === 'b40' ? 28 : type === 'cannon' ? 26 : 14) * (0.6 + r() * 0.6);
      var ox = type === 'b40' ? -ca * 10 * sc : ca * 6 * sc, dd = sp * (1 - (1 - k) * (1 - k)) * sc;
      var px = gx + ox + Math.cos(a) * dd, py = gy + (type === 'b40' ? -sa * 10 * sc : 0) + Math.sin(a) * dd * 0.45 - k * 4 * sc;
      puff(ctx, px, py, 0.6 + k * 1.1, (1 - k) * 0.55, 1, sc); }
  }

  /* --- pool --- */
  var POOL = [], MAX = 160, live = 0;
  for (var pi = 0; pi < MAX; pi++) POOL.push({ on: false, type: '', x: 0, y: 0, a: 0, t: 0, v: 0, seed: 0, gdy: 13, brass: true, life: 0, opts: { variant: 0, seed: 0, groundDy: 13, brass: true, layer: 'all' } });
  var spawnN = 0;
  function spawn(weapon, x, y, angle, opts) {
    var type = typeOf(weapon); if (!type) return null; var e = null, oldest = null;
    for (var i = 0; i < MAX; i++) { var p = POOL[i]; if (!p.on) { e = p; break; } if (!oldest || p.t > oldest.t) oldest = p; }
    if (!e) { e = oldest; live--; }
    spawnN = (spawnN + 1) >>> 0; var o = opts || {};
    e.on = true; e.type = type; e.x = x; e.y = y; e.a = angle || 0; e.t = 0; e.life = TYPES[type].life;
    e.v = o.variant != null ? o.variant % 3 : (Math.imul(spawnN, 2654435761) >>> 0) % 3; e.seed = (Math.imul(spawnN, 40503) + 17) >>> 0;
    e.gdy = o.groundDy != null ? o.groundDy : 13; e.brass = o.brass !== false; live++; return e;
  }
  function update(dt) { for (var i = 0; i < MAX; i++) { var p = POOL[i]; if (!p.on) continue; p.t += dt; if (p.t > p.life) { p.on = false; live--; } } }
  function drawAll(ctx, camX, camY, scale, layer) {
    var sc = Math.max(1, Math.round(scale || 1));
    for (var i = 0; i < MAX; i++) { var p = POOL[i]; if (!p.on) continue; var O = p.opts; O.variant = p.v; O.seed = p.seed; O.groundDy = p.gdy; O.brass = p.brass; O.layer = layer || 'all';
      draw(ctx, p.type, (p.x - (camX || 0)) * sc, (p.y - (camY || 0)) * sc, p.a, p.t, sc, O); }
  }
  function reset() { for (var i = 0; i < MAX; i++) POOL[i].on = false; live = 0; }
  var API = { TYPES: TYPES, WEAPON: WEAPON, typeOf: typeOf, draw: draw, spawn: spawn, update: update, drawAll: drawAll, reset: reset, light: light,
    count: function () { return live; }, frameAt: function (w, t) { return frameAt(TYPES[typeOf(w)], t); }, grid: grid, rotGrid: rotGrid, DIRS: DIRS, POOL_SIZE: MAX,
    cacheSize: function () { return nCache; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.VFX_MUZZLE = API;
})(typeof self !== 'undefined' ? self : this);
