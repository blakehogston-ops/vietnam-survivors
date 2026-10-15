/* flame.js — Artist Helper: Quang Tri 1968 flame VFX (M2-2 flamethrower, M67A2 "Zippo" flame tank).
 * Thickened-fuel (napalm-style) stream: arcing rod of burning fuel -> breaks into rolling fireballs -> splash + pooled fire,
 * rolling orange-lit -> grey-black smoke (value floor #2f2a22 warm char, never pure black), heat shimmer, lingering burn patches, scorch decals.
 * Palette matches vfx/explosions.js (W H Y O F R r / S s m n). Pixel art: sprites built ONCE at first use (24 small canvases,
 * ~49 KB RGBA total), drawn with imageSmoothingEnabled=false. No per-frame canvases, no per-frame allocation.
 *
 * VFX_FLAME.drawFlame(ctx, {x0,y0,x1,y1,t,level,scale,kind,shimmer})  -> {x,y} impact point (reused object; copy if kept)
 *     x0,y0 nozzle, x1,y1 aim point (screen px; M2 ~260-320 px, Zippo ~480-600 px), t seconds (game clock), level 1-5,
 *     scale = size multiplier (default 1), kind 'm2'|'zippo', shimmer: default 'cheap' at level>=3 (warm wavering haze bands),
 *     false = off, 'real' = displaces slices of ctx.canvas onto itself (identity transform only; costly on software canvases).
 * Burning ground (pooled, 96 slots, no allocation after init):
 *     VFX_FLAME.spawnPatch(x,y,level,life?) -> slot or null     VFX_FLAME.updatePatches(dt)
 *     VFX_FLAME.drawPatches(ctx,t,'ground')  scorch + embers (draw with ground decals, under units)
 *     VFX_FLAME.drawPatches(ctx,t,'fire')    flames + smoke (draw over units)
 *     VFX_FLAME.emit(state, opts, dt)  convenience: while firing, drops patches at the impact point (state = any {} you keep per weapon)
 *     VFX_FLAME.drawBurnPatch(ctx,{x,y,age,level,life,t,layer})  stateless single patch.   VFX_FLAME.clearPatches()
 * Scorch decal: VFX_FLAME.drawScorch(ctx,x,y,size,alpha,variant)   (size = px width, default 64)
 * VFX_FLAME.stats() -> {sprites, bytes, poolSize, active}.  VFX_FLAME.LEVEL[1..5] = intensity table. */
(function (root) {
  'use strict';
  var C = { W:'#fffef2', H:'#fff2a0', Y:'#ffd54a', O:'#ff9b21', F:'#f0661a', R:'#c8301a', r:'#8a2a14',
            S:'#9a9286', s:'#766f63', m:'#5a544b', n:'#45403a', k:'#2f2a22', K:'#1a1c12', c:'#3a3126', e:'#4d3f2e' };
  var BAY = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  function hash(i) { i = (i ^ 61) ^ (i >>> 16); i = i + (i << 3); i = i ^ (i >>> 4); i = Math.imul(i, 0x27d4eb2d); i = i ^ (i >>> 15); return (i >>> 0) / 4294967296; }
  function rgb(h) { return [parseInt(h.substr(1,2),16), parseInt(h.substr(3,2),16), parseInt(h.substr(5,2),16)]; }
  var SPR = null, BYTES = 0, NSPR = 0;
  function mk(w, h, fn) {
    var cv = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : document.createElement('canvas');
    cv.width = w; cv.height = h; var g = cv.getContext('2d'), id = g.createImageData(w, h), d = id.data;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var r = fn(x, y, BAY[(y & 3) * 4 + (x & 3)] / 16 - 0.47); if (!r) continue;
      var p = (y * w + x) * 4, col = rgb(r[0]); d[p] = col[0]; d[p+1] = col[1]; d[p+2] = col[2]; d[p+3] = r[1] == null ? 255 : r[1];
    }
    g.putImageData(id, 0, 0); BYTES += w * h * 4; NSPR++; return cv;
  }
  function vn(seed, x, y, cell) { // value noise
    var gx = Math.floor(x / cell), gy = Math.floor(y / cell), fx = x / cell - gx, fy = y / cell - gy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    function g(a, b) { return hash(seed * 7919 + (a + 50) * 131 + (b + 50) * 9973); }
    return g(gx,gy)*(1-fx)*(1-fy) + g(gx+1,gy)*fx*(1-fy) + g(gx,gy+1)*(1-fx)*fy + g(gx+1,gy+1)*fx*fy;
  }
  var TIERS = [['W','W','H','Y'], ['W','H','Y','O'], ['H','Y','O','F'], ['Y','O','F','R'], ['O','F','R','r']];
  function build() {
    SPR = { fire: [], smoke: [], smokeLit: [], tongue: [], scorch: [], glow: null, ember: null };
    // fire blobs: 5 heat tiers x 2 shapes, 16x16, lit top-left, ragged noisy edge
    for (var t = 0; t < 5; t++) for (var v = 0; v < 2; v++) (function (t, v) {
      SPR.fire.push(mk(16, 16, function (x, y, b) {
        var dx = x - 7.5, dy = y - 7.5, d = Math.sqrt(dx*dx + dy*dy) / 7.5, nz = vn(t*3+v, x, y, 3);
        if (d > 0.72 + nz * 0.42 + b * 0.12) return null;
        var hl = d * 0.75 + (dx + dy) * 0.035 + (nz - 0.5) * 0.5 + b * 0.25;
        var i = hl < 0.25 ? 0 : hl < 0.5 ? 1 : hl < 0.72 ? 2 : 3; return [C[TIERS[t][i]]];
      }));
    })(t, v);
    // smoke puffs 24x24: dark (value floor n) and fire-lit underside; 3 shapes each
    for (v = 0; v < 3; v++) (function (v) {
      function puff(lit) { return mk(24, 24, function (x, y, b) {
        var dx = x - 11.5, dy = y - 11.5, d = Math.sqrt(dx*dx + dy*dy) / 11.5, nz = vn(20+v, x, y, 4), nz2 = vn(40+v, x, y, 2);
        if (d > 0.62 + nz * 0.5 + b * 0.15) return null;
        var hl = (dx + dy) / 23 + (nz2 - 0.5) * 0.6 + b * 0.3; // light top-left
        var ch = hl < -0.4 ? 's' : hl < -0.1 ? 'm' : hl < 0.25 ? 'n' : 'k';
        if (lit && dy > 2 + (nz2 - 0.5) * 6) ch = dy > 7 ? 'F' : (hl > 0.2 ? 'r' : 'O');
        return [C[ch], d > 0.85 ? 170 : 225];
      }); }
      SPR.smoke.push(puff(false)); SPR.smokeLit.push(puff(true));
    })(v);
    // ground flame tongues 10x20, 3 flicker frames
    for (v = 0; v < 3; v++) (function (v) {
      SPR.tongue.push(mk(10, 20, function (x, y, b) {
        var u = y / 19, half = (0.3 + 4.6 * Math.pow(u, 1.3)) * (0.8 + vn(60+v, x, y, 3) * 0.5);
        var cx = 4.5 + Math.sin(u * 5 + v * 2.1) * 1.6 * (1 - u);
        var dx = Math.abs(x - cx); if (dx > half + b) return null; if (u < 0.55 && vn(70+v, x, y, 2) > 0.62 + u * 0.5) return null;
        var k = dx / (half + 0.01) * 0.6 + (1 - u) * 0.7 + b * 0.3;
        return [C[k < 0.3 ? 'H' : k < 0.55 ? 'Y' : k < 0.8 ? 'O' : k < 1.0 ? 'F' : k < 1.15 ? 'R' : 'r']];
      }));
    })(v);
    // scorch decals 64x36 (ash centre, charred ring, singed edge) — value floor, never pure black
    for (v = 0; v < 3; v++) (function (v) {
      SPR.scorch.push(mk(64, 36, function (x, y, b) {
        var dx = (x - 31.5) / 31.5, dy = (y - 17.5) / 17.5, d = Math.sqrt(dx*dx + dy*dy), nz = vn(80+v, x, y, 5), nz2 = vn(90+v, x, y, 2);
        var e = d + (nz - 0.5) * 0.55 + b * 0.12; if (e > 0.95) return null;
        var ch = e > 0.8 ? 'e' : e > 0.55 ? 'c' : (nz2 > 0.72 ? 'm' : nz2 < 0.18 ? 'n' : 'k');
        return [C[ch], e > 0.8 ? 150 : 215];
      }));
    })(v);
    SPR.glow = mk(32, 32, function (x, y) { var dx = x - 15.5, dy = y - 15.5, d = Math.sqrt(dx*dx + dy*dy) / 16; if (d >= 1) return null;
      return ['#ff8a2a', Math.round(110 * (1 - d) * (1 - d))]; });
    SPR.ember = mk(3, 3, function (x, y) { return x === 1 && y === 1 ? [C.H] : (x === 1 || y === 1) ? [C.F, 200] : null; });
  }
  function S() { if (!SPR) build(); return SPR; }
  // ---- intensity per level: width, brightness (heat tier shift + glow), smoke density, splash
  var LEVEL = [null,
    { w: 0.70, hot: 0.0, glow: 0.55, smoke: 0.55, splash: 0.7, n: 0.80 },
    { w: 0.82, hot: 0.2, glow: 0.70, smoke: 0.70, splash: 0.85, n: 0.90 },
    { w: 0.95, hot: 0.4, glow: 0.85, smoke: 0.85, splash: 1.0, n: 1.00 },
    { w: 1.10, hot: 0.6, glow: 1.00, smoke: 1.00, splash: 1.15, n: 1.12 },
    { w: 1.28, hot: 0.85, glow: 1.20, smoke: 1.20, splash: 1.35, n: 1.25 }];
  var KIND = { m2: { thick: 9, n: 30, smoke: 22, arc: 0.16, flow: 2.4, splash: 7 },
               zippo: { thick: 15, n: 46, smoke: 36, arc: 0.10, flow: 1.7, splash: 11 } };
  var OUT = { x: 0, y: 0 };
  function blit(ctx, img, x, y, sz) { var s = Math.round(sz); if (s < 2) s = 2; ctx.drawImage(img, Math.round(x - s / 2), Math.round(y - s / 2), s, s); }
  function drawFlame(ctx, o) {
    var sp = S(), L = LEVEL[Math.max(1, Math.min(5, o.level | 0 || 1))], K = KIND[o.kind] || KIND.m2, sc = o.scale || 1, t = o.t || 0;
    var x0 = o.x0, y0 = o.y0, ex = o.x1 - x0, ey = o.y1 - y0, len = Math.sqrt(ex*ex + ey*ey) || 1, nx = -ey / len, ny = ex / len;
    var lift = len * K.arc, th = K.thick * L.w * sc, seed = ((x0 * 3 + y0 * 7) | 0) & 1023;
    var smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    // path: lifts in a ballistic arc (screen-up), wobbles more as the rod breaks up
    function px(u, w) { return x0 + ex * u + nx * w; }
    function py(u, w) { return y0 + ey * u + ny * w - lift * 4 * u * (1 - u) * (1 - 0.35 * u); }
    var shim = o.shimmer == null ? ((o.level | 0) >= 3 ? 'cheap' : false) : o.shimmer;
    if (shim === 'real' && ctx.canvas) { // true displacement: wobble thin slices of what is already drawn (GPU canvases only; ~8 ms in software)
      var cw = ctx.canvas.width, chh = ctx.canvas.height;
      for (var k = 0; k < 4; k++) { var u = 0.3 + k * 0.15, sx = px(u, 0) - 22 * sc, sy = py(u, 0) - (18 + k % 3 * 6) * sc - lift * 0.1, sw = 44 * sc, sh = 3 * sc;
        if (sx < 0 || sy < 0 || sx + sw > cw || sy + sh > chh) continue;
        ctx.drawImage(ctx.canvas, sx, sy, sw, sh, sx + Math.sin(t * 23 + k * 1.7) * 1.6 * sc, sy, sw, sh); }
    } else if (shim) { // cheap haze: faint warm wavering bands above the rod (no readback)
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffb060';
      for (var k2 = 0; k2 < 7; k2++) { var u2 = 0.25 + k2 * 0.1, hx2 = px(u2, 0) + Math.sin(t * 17 + k2 * 2.3) * 3 * sc, hy2 = py(u2, 0) - (16 + (k2 % 3) * 7 + Math.sin(t * 9 + k2) * 3) * sc;
        ctx.globalAlpha = 0.07 + 0.03 * Math.sin(t * 21 + k2); ctx.fillRect(Math.round(hx2 - 16 * sc), Math.round(hy2), Math.round(32 * sc), Math.max(1, Math.round(sc))); }
      ctx.restore();
    }
    var i, j, u, w, f, n;
    // ground glow under rod + splash
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, 0.5 * L.glow);
    for (i = 1; i <= 4; i++) { u = i / 4; blit(ctx, sp.glow, x0 + ex * u, y0 + ey * u, (40 + 50 * u) * sc * L.w * (K === KIND.zippo ? 1.4 : 1)); }
    ctx.globalAlpha = Math.min(1, 0.8 * L.glow); blit(ctx, sp.glow, o.x1, o.y1, 150 * sc * L.splash * (K === KIND.zippo ? 1.35 : 1));
    ctx.restore();
    // smoke: rises off the rod's back half and the splash, fire-lit underside while young, value floor n
    n = Math.round(K.smoke * L.smoke);
    for (j = 0; j < n; j++) {
      var h1 = hash(seed + j * 17), h2 = hash(seed + j * 31 + 5), p = (h1 + t * (0.32 + h2 * 0.15)) % 1;
      u = 0.38 + 0.62 * Math.pow(hash(seed + j * 53), 0.6);
      var bx = px(u, 0) + (h2 - 0.5) * th * 2, by = py(u, 0), rise = (70 + 130 * h2) * sc * (0.8 + L.smoke * 0.3) * p;
      var sz = (22 + 64 * p) * sc * (0.75 + 0.35 * L.w) * (K === KIND.zippo ? 1.25 : 1);
      ctx.globalAlpha = (p < 0.12 ? p / 0.12 : 1 - (p - 0.12) / 0.88) * (0.6 + 0.3 * L.smoke > 0.95 ? 0.95 : 0.6 + 0.3 * L.smoke);
      blit(ctx, (p < 0.42 ? sp.smokeLit : sp.smoke)[j % 3], bx + Math.sin(p * 4 + j) * 10 * sc + p * 18 * sc, by - rise - th, sz);
    }
    ctx.globalAlpha = 1;
    // rod: fuel blobs advect nozzle -> target. Tight hot core near the nozzle, swelling rolling fireballs downrange.
    n = Math.round(K.n * L.n);
    for (var pass = 0; pass < 2; pass++) for (i = 0; i < n; i++) {
      var hh = hash(seed + i * 97 + 3); u = (i / n + t * K.flow) % 1; if (u < 0.02) continue;
      w = Math.sin(i * 7.3 + t * 11) * th * 0.9 * u * u + (hh - 0.5) * th * 0.6 * u;
      var grow = 0.55 + 2.3 * Math.pow(u, 0.85);
      f = (u < 0.18 ? 1 : u < 0.45 ? 2 : u < 0.75 ? 3 : 4) - L.hot - (hh > 0.7 ? 1 : 0);
      if (pass === 0) { blit(ctx, sp.fire[Math.max(0, Math.min(4, Math.round(f + 1))) * 2 + (i & 1)], px(u, w) + 1, py(u, w) + 1, th * grow * 1.45); }
      else blit(ctx, sp.fire[Math.max(0, Math.min(4, Math.round(f))) * 2 + ((i >> 1) & 1)], px(u, w) - th * 0.12 * grow, py(u, w) - th * 0.15 * grow, th * grow);
    }
    // nozzle core: unbroken white-hot fuel rod for the first ~30 %
    for (i = 0; i < 9; i++) { u = 0.015 + i * 0.033; blit(ctx, sp.fire[(i < 4 ? 0 : 1) * 2 + (i & 1)], px(u, Math.sin(t * 30 + i) * 0.6 * sc), py(u, 0), th * (0.45 + i * 0.07)); }
    // splash: fuel slams the ground, bounces into a crown of fire + rolling ball
    n = Math.round(K.splash * L.splash);
    for (i = 0; i < n; i++) {
      var a = hash(seed + i * 13) * 6.283, ph = (hash(seed + i * 19) + t * 2.6) % 1, r = (12 + 34 * ph) * sc * L.splash * (K === KIND.zippo ? 1.3 : 1);
      var hx = o.x1 + Math.cos(a) * r * 1.3, hy = o.y1 + Math.sin(a) * r * 0.55 - Math.sin(ph * 3.14) * 22 * sc * L.splash;
      blit(ctx, sp.fire[Math.max(0, Math.min(4, Math.round(1 + ph * 3 - L.hot))) * 2 + (i & 1)], hx, hy, th * (1.8 + 1.2 * (1 - ph)));
    }
    for (i = 0; i < 5; i++) { var tf = sp.tongue[(i + ((t * 12) | 0)) % 3], tw = (13 + i % 2 * 5) * sc * L.splash * (K === KIND.zippo ? 1.3 : 1), tx = o.x1 + (i - 2) * tw * 0.75;
      ctx.drawImage(tf, Math.round(tx - tw / 2), Math.round(o.y1 - tw * 2 + 4 * sc), Math.round(tw), Math.round(tw * 2)); }
    blit(ctx, sp.fire[2 + (((t * 8) | 0) & 1)], o.x1, o.y1 - 8 * sc, th * 2.6 * L.splash);
    // embers thrown off
    for (i = 0; i < 10 * L.n; i++) { var e = (hash(seed + i * 41) + t * 1.3) % 1, eu = 0.3 + 0.7 * hash(seed + i * 43);
      ctx.drawImage(sp.ember, Math.round(px(eu, (hash(i) - 0.5) * 40 * sc)), Math.round(py(eu, 0) - e * 70 * sc), 3, 3); }
    ctx.imageSmoothingEnabled = smooth; OUT.x = o.x1; OUT.y = o.y1; return OUT;
  }
  // ---- burning ground patches (pool)
  var POOL = 96, P = []; for (var q = 0; q < POOL; q++) P.push({ on: false, x: 0, y: 0, age: 0, life: 0, level: 1, v: 0, burn: false });
  function spawnPatch(x, y, level, life) {
    var best = null, i; for (i = 0; i < POOL; i++) if (!P[i].on) { best = P[i]; break; }
    if (!best) { best = P[0]; for (i = 1; i < POOL; i++) if (P[i].age / P[i].life > best.age / best.life) best = P[i]; } // recycle oldest
    var L = Math.max(1, Math.min(5, level | 0 || 1));
    best.on = true; best.x = x; best.y = y; best.age = 0; best.level = L; best.life = life || (5 + 1.5 * L); best.v = (Math.random() * 3) | 0; return best;
  }
  function updatePatches(dt) { for (var i = 0; i < POOL; i++) { var p = P[i]; if (!p.on) continue; p.age += dt; if (p.age > p.life + 12) p.on = false; } }
  var TMP = { x: 0, y: 0, age: 0, level: 1, life: 0, t: 0, layer: 'fire', v: 0 };
  function drawPatches(ctx, t, layer) { for (var i = 0; i < POOL; i++) { var p = P[i]; if (!p.on) continue;
    TMP.x = p.x; TMP.y = p.y; TMP.age = p.age; TMP.level = p.level; TMP.life = p.life; TMP.t = t; TMP.layer = layer; TMP.v = p.v; TMP.seed = i * 7 + 1; drawBurnPatch(ctx, TMP); } }
  function drawBurnPatch(ctx, o) {
    var sp = S(), L = LEVEL[Math.max(1, Math.min(5, o.level | 0 || 1))], life = o.life || (5 + 1.5 * (o.level || 1)), age = o.age || 0, t = o.t || 0;
    var seed = o.seed || (((o.x * 13 + o.y * 7) | 0) & 1023), R = (14 + 6 * (o.level || 1)) * (o.scale || 1);
    var k = age < 0.3 ? age / 0.3 : age < life * 0.6 ? 1 : age < life ? 1 - (age - life * 0.6) / (life * 0.4) : 0; // fire intensity
    var smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; var i;
    if (o.layer === 'ground' || o.layer == null) {
      var sa = Math.min(1, age / 1.5) * (age > life + 6 ? Math.max(0, 1 - (age - life - 6) / 6) : 1);
      if (o.permanentScorch) sa = Math.min(1, age / 1.5);
      ctx.globalAlpha = 0.9 * sa; ctx.drawImage(sp.scorch[(o.v || 0) % 3], Math.round(o.x - R * 1.4), Math.round(o.y - R * 0.8), Math.round(R * 2.8), Math.round(R * 1.6));
      ctx.globalAlpha = 1; var em = age > life * 0.5 && age < life + 8; // smouldering embers after the fire dies
      if (em) for (i = 0; i < 6; i++) if (hash(seed + i + ((t * 3) | 0) * 5) > 0.35) ctx.drawImage(sp.ember, Math.round(o.x + (hash(seed + i * 3) - 0.5) * R * 2), Math.round(o.y + (hash(seed + i * 5) - 0.5) * R), 3, 3);
    }
    if ((o.layer === 'fire' || o.layer == null) && age < life + 8) {
      var smk = age < life ? 1 : 1 - (age - life) / 8, n = Math.round(5 * L.smoke * (0.4 + 0.6 * k) + 1);
      for (i = 0; i < n; i++) { var p = (hash(seed + i * 11) + t * 0.3) % 1;
        ctx.globalAlpha = (p < 0.15 ? p / 0.15 : 1 - p) * 0.75 * smk;
        blit(ctx, (k > 0.3 && p < 0.25 ? sp.smokeLit : sp.smoke)[(i + seed) % 3], o.x + (hash(seed + i) - 0.5) * R + p * 16, o.y - 8 - p * (50 + 30 * L.smoke), (10 + 30 * p) * (0.6 + 0.5 * k) * L.w); }
      ctx.globalAlpha = 1;
      if (k > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 * k * L.glow; blit(ctx, sp.glow, o.x, o.y - 4, R * 3.4); ctx.restore();
        for (i = 0; i < 2 + (o.level >> 1); i++) blit(ctx, sp.fire[(2 + (i & 1)) * 2 + ((i + ((t * 7) | 0)) & 1)], o.x + (hash(seed + i * 37) - 0.5) * R * 1.4, o.y - 3 - hash(seed + i * 41) * 4, R * (0.55 + 0.25 * hash(seed + i)) * (0.5 + 0.5 * k));
        n = Math.round((3 + 2 * (o.level || 1)) * (0.4 + 0.6 * k));
        for (i = 0; i < n; i++) { var hx = hash(seed + i * 23), hy = hash(seed + i * 29), fl = Math.sin(t * (9 + hx * 6) + i * 2) * 0.18;
          var tw = (7 + 11 * hy) * (0.55 + 0.45 * k) * L.w * (1 + fl) * (o.scale || 1), tx = o.x + (hx - 0.5) * R * 2, ty = o.y + (hy - 0.5) * R * 0.9;
          ctx.drawImage(sp.tongue[(i + ((t * 10 + hx * 3) | 0)) % 3], Math.round(tx - tw / 2), Math.round(ty - tw * 2), Math.round(tw), Math.round(tw * 2)); }
      }
    }
    ctx.imageSmoothingEnabled = smooth;
  }
  function emit(st, o, dt) { st.acc = (st.acc || 0) + dt; var every = o.kind === 'zippo' ? 0.16 : 0.24; var R = 26 * ((o.level || 1) * 0.15 + 0.6);
    while (st.acc >= every) { st.acc -= every; spawnPatch(o.x1 + (Math.random() - 0.5) * R * 2, o.y1 + (Math.random() - 0.5) * R, o.level, 0); } }
  function drawScorch(ctx, x, y, size, alpha, v) { var sp = S(), w = size || 64; ctx.globalAlpha = alpha == null ? 0.9 : alpha;
    ctx.drawImage(sp.scorch[(v || 0) % 3], Math.round(x - w / 2), Math.round(y - w * 0.28), Math.round(w), Math.round(w * 0.5625)); ctx.globalAlpha = 1; }
  function stats() { S(); var a = 0; for (var i = 0; i < POOL; i++) if (P[i].on) a++; return { sprites: NSPR, bytes: BYTES, poolSize: POOL, active: a }; }
  root.VFX_FLAME = { drawFlame: drawFlame, spawnPatch: spawnPatch, updatePatches: updatePatches, drawPatches: drawPatches, drawBurnPatch: drawBurnPatch,
    emit: emit, drawScorch: drawScorch, clearPatches: function () { for (var i = 0; i < POOL; i++) P[i].on = false; }, stats: stats, LEVEL: LEVEL, KIND: KIND, pool: P,
    warm: function () { S(); } };
})(typeof window !== 'undefined' ? window : this);
