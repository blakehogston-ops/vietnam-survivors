/* flame_shared.js - Artist Helper, rc8. ONE shared fire renderer = the approved napalm-sheet look (Blake / Art Director, Oct 20):
 * soft fbm-noise flame textures with licking tongues, heat ramp white-yellow core -> orange -> dark red-brown, 8 rolling flicker frames,
 * soft ground fire bed, dense black oily smoke, soft additive embers. No hard round blobs, no polka dots. Muzzle flashes are NOT touched.
 * Load AFTER vfx/flame.js (game: assets/art/vfx_flame.js). It extends the existing window.VFX_FLAME in place (same object, same API) and
 * re-routes its fire drawing: drawFlame (M2 and flame-boat streams) -> drawStream, drawBurnPatch / drawPatches (burn patches, burn deaths) -> drawFire.
 * Scorch decals and the patch pool stay in flame.js.
 *
 * VFX_FLAME.drawFire(ctx, {x, y, w, h, intensity 0..1, t, wind (px/s, +x leans right), seed, smoke 0..1|false, embers 0..1, z})
 *     one call = one whole fire (glow, bed, tongues, smoke, embers). x,y = screen px at the base of the flames; w,h = screen px.
 * VFX_FLAME.drawStream(ctx, {x0,y0,x1,y1,t,level 1..5,scale,kind})  kind 'm2' = man-pack, anything else = heavy boat/tank flame gun  -> {x,y} impact (reused object). Same args as drawFlame.
 * VFX_FLAME.drawEmbers(ctx, {x, y, w, h, t, n, seed, alpha})   soft rising sparks (additive).
 * VFX_FLAME.drawSmoke(ctx, x, y, size, alpha, variant)  one soft oily-black smoke puff (for emitters that keep their own smoke particles).
 * VFX_FLAME.warm()  bake every texture now (~40 ms once; otherwise lazily on first use).  VFX_FLAME.caps() current tier caps.
 * VFX_FLAME.sharedStats() -> {textures, bytes, tier, drawn (tongue blits last frame)}
 * Tier: window.LQ.t ('low'|'med'|'high', perf patch rc8) else window.LOWFX -> 'low', else 'high'. LOW keeps the approved LOW caps:
 *   per fire <= 4 tongues / 2 smoke / 3 embers, stream <= 12 segments; global budget 160 tongue blits per frame (med 320, high 640).
 * Glow: uses Performance Engineer's cached glow sprite window.SGSPR('f', colour, a0, mid) when present (rc8 perf patch), else its own.
 * Textures are baked once at 1x (soft, scaled smoothly); ~40 canvases, ~0.25 MB. */
(function (root) {
  'use strict';
  var F = root.VFX_FLAME; if (!F) { F = root.VFX_FLAME = {}; }
  var TAU = Math.PI * 2;
  function cv(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); if (typeof document !== 'undefined') { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; } return null; }
  function rng(seed) { var a = seed >>> 0 || 1; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(i) { i = Math.imul((i | 0) ^ 61, 0x27d4eb2d); i ^= i >>> 15; i = Math.imul(i, 0x2c1b3c6d); i ^= i >>> 12; return (i >>> 0) / 4294967296; }
  function noise(seed) { var r = rng(seed), G = []; for (var i = 0; i < 289; i++) G.push(r()); return function (x, y) { var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var g = function (a, b) { return G[(((a % 17) + 17) % 17) * 17 + (((b % 17) + 17) % 17)]; }; return (g(xi, yi) * (1 - fx) + g(xi + 1, yi) * fx) * (1 - fy) + (g(xi, yi + 1) * (1 - fx) + g(xi + 1, yi + 1) * fx) * fy; }; }
  var N1 = null, N2 = null; function nz() { if (!N1) { N1 = noise(1337); N2 = noise(4711); } }
  function fbm(n, x, y) { return n(x, y) * 0.5 + n(x * 2.03, y * 2.03) * 0.3 + n(x * 4.1, y * 4.1) * 0.2; }
  function ss(a, b, v) { v = Math.max(0, Math.min(1, (v - a) / (b - a))); return v * v * (3 - 2 * v); }
  var RAMP = [[0.0, [60, 18, 8]], [0.22, [96, 26, 8]], [0.4, [168, 48, 12]], [0.56, [232, 106, 24]], [0.72, [255, 168, 56]], [0.86, [255, 226, 140]], [1.0, [255, 250, 228]]];
  function ramp(T) { for (var i = 1; i < RAMP.length; i++) if (T <= RAMP[i][0]) { var a = RAMP[i - 1], b = RAMP[i], k = (T - a[0]) / (b[0] - a[0]); return [a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k, a[1][2] + (b[1][2] - a[1][2]) * k]; } return RAMP[RAMP.length - 1][1]; }
  /* ---------- baked textures (1x, once) ---------- */
  var TX = {}, NTX = 0, BYTES = 0, FR = 8, TW = 40, TH = 52;
  function put(k, c) { TX[k] = c; if (c) { NTX++; BYTES += c.width * c.height * 4; } return c; }
  function tongue(fr, heat) { var k = 't' + fr + heat; if (TX[k] !== undefined) return TX[k]; var c = cv(TW, TH); if (!c) return put(k, null); var x = c.getContext('2d');
    if (!x.createImageData) return put(k, c); nz();
    var id = x.createImageData(TW, TH), d = id.data, ph = fr / FR, hb = [0.86, 1.08, 1.25][heat], off = heat * 5.3;
    for (var py = 0; py < TH; py++) for (var px = 0; px < TW; px++) { var u = (px / TW - 0.5) * 2, v = py / TH, nx = px * 0.16 + off, ny = py * 0.13 + ph * 2.6;
      var n = fbm(N1, nx, ny), n2 = fbm(N2, nx * 0.7 + 3, ny * 0.8), up = Math.max(0, 0.66 - v);
      var uu = u + (n2 - 0.5) * 0.9 * (up + 0.1), vv = v - 0.66, el = vv < 0 ? vv / (0.66 + (n2 - 0.5) * 0.7) : vv / 0.3, rr = Math.sqrt(uu * uu * (1 + up * 3.2) + el * el);
      var D = (1 - ss(0.4, 1.0, rr)) * (0.64 + (n - 0.5) * (1.1 + up * 1.4)); if (D <= 0.05) continue;
      var T = Math.min(1, D * hb * (0.72 + 0.5 * v)), al = ss(0.06, 0.34, D) * (0.55 + 0.45 * ss(0.1, 0.5, T)), col = ramp(T), o = (py * TW + px) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = Math.round(255 * Math.min(1, al)); }
    x.putImageData(id, 0, 0); return put(k, c); }
  function blob(x, cx, cy, rx, ry, st) { x.save(); x.translate(cx, cy); x.scale(1, ry / rx); var g = x.createRadialGradient(0, 0, 0, 0, 0, rx); for (var i = 0; i < st.length; i++) g.addColorStop(st[i][0], st[i][1]); x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill(); x.restore(); }
  function bed(v) { var k = 'b' + v; if (TX[k] !== undefined) return TX[k]; var W = 48, H = 20, c = cv(W, H); if (!c) return put(k, null); var x = c.getContext('2d'), r = rng(911 + v * 37), i;
    if (!x.createRadialGradient) return put(k, c);
    blob(x, W / 2, H * 0.55, W * 0.48, H * 0.42, [[0, 'rgba(206,74,16,0.85)'], [0.6, 'rgba(150,40,10,0.55)'], [1, 'rgba(90,22,8,0)']]);
    for (i = 0; i < 9; i++) blob(x, W * (0.15 + r() * 0.7), H * (0.4 + r() * 0.3), W * (0.06 + r() * 0.09), H * (0.14 + r() * 0.12), [[0, 'rgba(255,' + (150 + (r() * 60 | 0)) + ',60,0.75)'], [1, 'rgba(240,110,30,0)']]);
    for (i = 0; i < 5; i++) blob(x, W * (0.12 + r() * 0.76), H * (0.3 + r() * 0.5), W * (0.05 + r() * 0.06), H * (0.1 + r() * 0.1), [[0, 'rgba(70,20,8,0.6)'], [1, 'rgba(70,20,8,0)']]);
    return put(k, c); }
  function smoke(v) { var k = 's' + v; if (TX[k] !== undefined) return TX[k]; var R0 = 16, S2 = 34, c = cv(S2, S2); if (!c) return put(k, null); var x = c.getContext('2d');
    if (!x.createImageData) return put(k, c); nz();
    var id = x.createImageData(S2, S2), d = id.data, f = 2.6 / R0, o0 = v * 7.7 + 3.1;
    for (var py = 0; py < S2; py++) for (var px = 0; px < S2; px++) { var u = (px - R0 - 1) / R0, w = (py - R0 - 1) / R0, n = fbm(N1, px * f * 1.5 + o0, py * f * 1.5 + o0), rr = Math.sqrt(u * u + w * w) + (n - 0.5) * 0.55;
      var al = (1 - ss(0.25, 1.0, rr)) * (0.55 + n * 0.6); if (al <= 0.01) continue; var lit = Math.max(0, -u - w) * 0.5 * (1 - rr), o = (py * S2 + px) * 4;
      d[o] = 14 + lit * 60; d[o + 1] = 12 + lit * 46; d[o + 2] = 10 + lit * 34; d[o + 3] = Math.round(255 * Math.min(0.92, al)); }
    x.putImageData(id, 0, 0); return put(k, c); }
  function ember() { if (TX.e !== undefined) return TX.e; var c = cv(8, 8); if (!c) return put('e', null); var x = c.getContext('2d'); if (!x.createRadialGradient) return put('e', c);
    blob(x, 4, 4, 4, 4, [[0, 'rgba(255,244,200,1)'], [0.35, 'rgba(255,170,60,0.8)'], [1, 'rgba(200,60,10,0)']]); return put('e', c); }
  function glow() { if (typeof root.SGSPR === 'function') { try { return root.SGSPR('f', '#ff8a2a', 0.95, 0.2); } catch (e) {} }   // perf patch cached glow
    if (TX.g !== undefined) return TX.g; var c = cv(64, 64); if (!c) return put('g', null); var x = c.getContext('2d'); if (!x.createRadialGradient) return put('g', c);
    blob(x, 32, 32, 32, 32, [[0, 'rgba(255,170,70,0.55)'], [0.4, 'rgba(255,120,40,0.25)'], [1, 'rgba(255,90,20,0)']]); return put('g', c); }
  /* ---------- tier caps ---------- */
  var CAPS = { low: { t: 4, s: 2, e: 3, seg: 12, budget: 160 }, med: { t: 6, s: 4, e: 5, seg: 18, budget: 320 }, high: { t: 7, s: 5, e: 6, seg: 20, budget: 480 } };
  function tier() { var L = root.LQ; if (L && CAPS[L.t]) return L.t; return root.LOWFX ? 'low' : 'high'; }
  var drawn = 0, lastDrawn = 0, frameT = -1;
  function frame(t) { if (t !== frameT) { frameT = t; lastDrawn = drawn; drawn = 0; } }
  function blitT(ctx, im, x, y, w, h, flip) { if (!im) return; drawn++; if (flip) { ctx.save(); ctx.translate(x + w / 2, 0); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, y, w, h); ctx.restore(); } else ctx.drawImage(im, x, y, w, h); }
  /* ---------- drawFire: one whole fire ---------- */
  function drawFire(ctx, o) {
    var I = o.intensity == null ? 1 : Math.max(0, Math.min(1, o.intensity)); if (I <= 0.01) return;
    var C = CAPS[tier()], t = o.t || 0, seed = (o.seed | 0) & 4095, w = o.w || 24, h = o.h || w * 1.3, x = o.x, y = o.y - (o.z || 0), pa = ctx.globalAlpha, pc = ctx.globalCompositeOperation, ps = ctx.imageSmoothingEnabled;
    frame(t); var over = drawn > C.budget; ctx.imageSmoothingEnabled = true; var i, hh;
    var lean = Math.max(-0.6, Math.min(0.6, (o.wind || 0) / 120));
    // glow (additive, under everything)
    var G = glow(); if (G) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pa * 0.32 * I; var gr = Math.max(w, h) * 1.1; ctx.drawImage(G, x - gr, y - h * 0.4 - gr * 0.7, gr * 2, gr * 1.4); ctx.globalCompositeOperation = pc; }
    // smoke (behind flames): dense black oily, rising + drifting with wind
    var sm = o.smoke === false ? 0 : o.smoke == null ? 0.6 : o.smoke, ns = sm > 0 ? Math.max(1, Math.round(C.s * Math.min(1, sm + 0.2))) : 0;
    for (i = 0; i < ns && !over; i++) { hh = hash(seed * 31 + i * 7); var p = (hh + t * (0.28 + 0.1 * hash(seed + i))) % 1, sz = (w * 0.8 + h * 0.6) * (0.6 + p * 1.3);
      var sx = x + (hh - 0.5) * w * 0.6 + (lean * 60 + 8) * p * (h / 30), sy = y - h * (0.7 + p * 2.2);
      ctx.globalAlpha = pa * sm * (p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8) * 0.62; blitT(ctx, smoke(i % 3), sx - sz / 2, sy - sz / 2, sz, sz); }
    // ground bed
    var B = bed(seed & 1); ctx.globalAlpha = pa * 0.85 * I; blitT(ctx, B, x - w * 0.65, y - h * 0.14, w * 1.3, h * 0.3);
    // tongues: back row (cooler, taller) then front row (hot); flicker frames + height wobble, licking via texture noise
    var n = Math.max(1, Math.min(C.t, Math.round(w / Math.max(6, h * 0.42)) + 1)); if (over) n = Math.max(1, n >> 1);
    if (lean) { ctx.save(); ctx.transform(1, 0, -lean, 1, lean * y, 0); }
    for (var pass = 0; pass < 2; pass++) for (i = 0; i < n; i++) {
      var hs = hash(seed * 97 + i * 13 + pass * 7), f = n === 1 ? 0.5 : i / (n - 1), centre = 1 - Math.abs(f - 0.5) * 2;
      var th = 1.55 * h * (pass ? 0.62 + 0.38 * centre : 0.75 + 0.3 * hs) * (0.85 + 0.15 * Math.sin(t * (7 + hs * 5) + i * 2.1)) * (0.45 + 0.55 * Math.sqrt(I));
      var tw = Math.max(w / n * (pass ? 1.8 : 2.1), th * 0.62), tx = x + (f - 0.5) * w * (pass ? 0.78 : 0.9) + (hs - 0.5) * w * 0.1;
      var heat = I < 0.3 ? 0 : pass ? (centre > 0.35 && I > 0.55 ? 2 : 1) : (I > 0.6 && centre > 0.5 ? 1 : 0), fr = ((Math.floor(t * 14 + hs * 8) % FR) + FR) % FR;
      ctx.globalAlpha = pa * Math.min(1, (pass ? 1 : 0.85) * (0.4 + 0.6 * I)); blitT(ctx, tongue(fr, heat), tx - tw / 2, y + th * 0.2 - th, tw, th, hs > 0.5); }
    if (lean) ctx.restore();
    // embers
    var ne = o.embers == null ? 0.5 : o.embers; if (ne > 0 && !over) drawEmbers(ctx, { x: x, y: y - h * 0.5, w: w, h: h * 2.2, t: t, n: Math.round(C.e * ne * I + 0.5), seed: seed, alpha: pa });
    ctx.globalAlpha = pa; ctx.globalCompositeOperation = pc; ctx.imageSmoothingEnabled = ps;
  }
  function drawEmbers(ctx, o) { var E = ember(); if (!E) return; var C = CAPS[tier()], n = Math.min(o.n == null ? C.e : o.n, C.e * 2), t = o.t || 0, seed = (o.seed | 0) & 4095, pa = o.alpha == null ? ctx.globalAlpha : o.alpha, pc = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) { var hs = hash(seed * 53 + i * 17), p = (hs + t * (0.5 + hash(seed + i * 3) * 0.6)) % 1, s = 2 + hs * 2.5;
      ctx.globalAlpha = pa * (1 - p) * (0.6 + 0.4 * Math.sin(t * 20 + i)); drawn++;
      ctx.drawImage(E, o.x + (hs - 0.5) * o.w + Math.sin(t * 3 + i * 1.7) * 3 - s / 2, o.y - p * o.h - s / 2, s, s); }
    ctx.globalCompositeOperation = pc; ctx.globalAlpha = pa; }
  /* ---------- drawStream: thickened-fuel rod (M2 / flame tank / flame boat) ---------- */
  var LEVEL = F.LEVEL || [null, { w: 0.7, glow: 0.55, smoke: 0.55, splash: 0.7, n: 0.8 }, { w: 0.82, glow: 0.7, smoke: 0.7, splash: 0.85, n: 0.9 }, { w: 0.95, glow: 0.85, smoke: 0.85, splash: 1, n: 1 }, { w: 1.1, glow: 1, smoke: 1, splash: 1.15, n: 1.12 }, { w: 1.28, glow: 1.2, smoke: 1.2, splash: 1.35, n: 1.25 }];
  var KIND = { m2: { thick: 9, arc: 0.16, flow: 2.4, splash: 1 }, heavy: { thick: 15, arc: 0.10, flow: 1.7, splash: 1.3 } };
  var OUT = { x: 0, y: 0 };
  function drawStream(ctx, o) {
    var L = LEVEL[Math.max(1, Math.min(5, o.level | 0 || 1))], K = !o.kind || o.kind === 'm2' ? KIND.m2 : KIND.heavy, sc = o.scale || 1, t = o.t || 0, C = CAPS[tier()];
    var x0 = o.x0, y0 = o.y0, ex = o.x1 - x0, ey = o.y1 - y0, len = Math.sqrt(ex * ex + ey * ey) || 1, nx = -ey / len, ny = ex / len, lift = len * K.arc, th = K.thick * L.w * sc, seed = ((x0 * 3 + y0 * 7) | 0) & 1023;
    function px(u, w) { return x0 + ex * u + nx * w; } function py(u, w) { return y0 + ey * u + ny * w - lift * 4 * u * (1 - u) * (1 - 0.35 * u); }
    var pa = ctx.globalAlpha, pc = ctx.globalCompositeOperation, ps = ctx.imageSmoothingEnabled, i, u, w; frame(t); ctx.imageSmoothingEnabled = true;
    var G = glow(); if (G) { ctx.globalCompositeOperation = 'lighter'; for (i = 1; i <= 3; i++) { u = i / 3; var gr = (30 + 40 * u) * sc * L.w * (K === KIND.heavy ? 1.4 : 1); ctx.globalAlpha = pa * 0.22 * L.glow; ctx.drawImage(G, px(u, 0) - gr, py(u, 0) - gr * 0.6, gr * 2, gr * 1.2); } ctx.globalCompositeOperation = pc; }
    // smoke off the back half
    var ns = Math.round(C.s * 1.5 * L.smoke);
    for (i = 0; i < ns; i++) { var h1 = hash(seed + i * 17), p = (h1 + t * 0.35) % 1; u = 0.45 + 0.55 * hash(seed + i * 53); var sz = (18 + 50 * p) * sc * (K === KIND.heavy ? 1.25 : 1);
      ctx.globalAlpha = pa * (p < 0.12 ? p / 0.12 : 1 - (p - 0.12) / 0.88) * 0.85; blitT(ctx, smoke(i % 3), px(u, 0) + p * 18 * sc - sz / 2, py(u, 0) - th - (60 + 110 * h1) * sc * p - sz / 2, sz, sz); }
    // rod core: a continuous strip of burning fuel along the arc (bed texture rotated per span) so the rod never reads as separate scales
    var B0 = bed(0), M = Math.max(6, C.seg >> 1);
    if (B0) for (i = 0; i < M; i++) { var ua = i / M, ub = (i + 1) / M, ax = px(ua, 0), ay = py(ua, 0), bx = px(ub, 0), by = py(ub, 0), sl = Math.hypot(bx - ax, by - ay), uw = th * (0.8 + 1.6 * ua);
      ctx.save(); ctx.translate((ax + bx) / 2, (ay + by) / 2 - uw * 0.15); ctx.rotate(Math.atan2(by - ay, bx - ax)); ctx.globalAlpha = pa * 0.9; drawn++; ctx.drawImage(B0, -sl * 0.8, -uw / 2, sl * 1.6, uw); ctx.restore(); }
    // rod: rolling fire segments, hot near the nozzle, swelling + cooling downrange
    var n = Math.round(C.seg * L.n);
    for (i = 0; i < n; i++) { var hh = hash(seed + i * 97 + 3); u = (i / n + (hh - 0.5) * 0.45 / n + t * K.flow) % 1; if (u < 0.03) continue;   // rc8.1: per-segment phase jitter + varied size / aspect / flicker rate break the even spacing
      w = Math.sin(i * 7.3 + t * 11) * th * 0.8 * u * u + (hh - 0.5) * th * 0.5 * u; var g = (0.7 + 2.2 * Math.pow(u, 0.85)) * (0.6 + 0.8 * hash(seed + i * 29 + ((t * 3) | 0))), sw = th * g * (1.4 + 0.6 * hh), sh = sw * (0.9 + 0.7 * hash(seed + i * 61));
      var heat = u < 0.42 ? 2 : u < 0.78 ? 1 : 0, fr = ((Math.floor(t * (11 + hh * 6) + hh * 8 + i * 3) % FR) + FR) % FR;
      ctx.globalAlpha = pa * (u > 0.9 ? (1 - u) / 0.1 : 1); blitT(ctx, tongue(fr, heat), px(u, w) - sw / 2, py(u, w) - sh * 0.62, sw, sh, hh > 0.5); }
    // nozzle core
    for (i = 0; i < 4; i++) { u = 0.02 + i * 0.05; var cw = th * (0.7 + i * 0.25); ctx.globalAlpha = pa; blitT(ctx, tongue((i + ((t * 14) | 0)) % FR, 2), px(u, 0) - cw / 2, py(u, 0) - cw * 0.7, cw, cw * 1.1); }
    // splash: the fuel lands and burns
    ctx.globalAlpha = pa; drawFire(ctx, { x: o.x1, y: o.y1, w: 46 * sc * L.splash * K.splash, h: 40 * sc * L.splash * K.splash, intensity: 1, t: t, seed: seed, smoke: 0.5, embers: 1 });
    ctx.globalAlpha = pa; ctx.globalCompositeOperation = pc; ctx.imageSmoothingEnabled = ps; OUT.x = o.x1; OUT.y = o.y1; return OUT;
  }
  /* ---------- drawFireball: explosion burst (rc8.1). k = 0..1 through the burst; r = screen radius ---------- */
  function drawFireball(ctx, o) {
    var k = Math.max(0, Math.min(1, o.k || 0)); if (k >= 1) return; var C = CAPS[tier()], r = o.r || 30, x = o.x, y = o.y, t = o.t || 0, seed = (o.seed | 0) & 4095, pa = ctx.globalAlpha, pc = ctx.globalCompositeOperation, ps = ctx.imageSmoothingEnabled, i, hs;
    frame(t); ctx.imageSmoothingEnabled = true; var rise = r * 0.5 * k, grow = 0.55 + 0.6 * Math.sqrt(k), fade = k < 0.08 ? k / 0.08 : 1 - Math.pow(Math.max(0, k - 0.35) / 0.65, 1.4), ox = (o.smoke == null ? 1 : o.smoke);
    var G = glow(); if (G) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pa * 0.75 * (1 - k); var gr = r * (1.4 + k); ctx.drawImage(G, x - gr, y - rise - gr, gr * 2, gr * 2); ctx.globalCompositeOperation = pc; }
    // oily black smoke billows up out of the ball as it cools
    var ns = Math.round(C.s * 1.2 * ox); for (i = 0; i < ns && k > 0.18; i++) { hs = hash(seed * 31 + i * 7); var a = hs * 6.283, sk = (k - 0.18) / 0.82, sz = r * (0.9 + 0.9 * sk) * (0.7 + 0.5 * hash(seed + i));
      ctx.globalAlpha = pa * Math.min(1, sk * 3) * (1 - sk * 0.7) * 0.7; blitT(ctx, smoke(i % 3), x + Math.cos(a) * r * 0.45 * grow - sz / 2, y - rise - r * (0.2 + 0.9 * sk) * (0.6 + hs) - sz / 2, sz, sz); }
    // ball: a cluster of upright licking tongues filling the disc (no radial petals), hottest in the middle and early, cooling to orange / red-brown
    var n = C.t * 2, fr0 = (t * 14) | 0;
    for (i = 0; i < n; i++) { hs = hash(seed * 97 + i * 13); var h2 = hash(seed * 59 + i * 29), an = hs * 6.283, dd = Math.sqrt(h2) * r * grow * 0.72, tx = x + Math.cos(an) * dd, ty = y - rise + Math.sin(an) * dd * 0.6 + r * 0.25 * grow;
      var th = r * grow * (0.75 + 0.55 * hash(seed + i * 7)) * (1 - 0.35 * dd / (r * grow)) * (0.9 + 0.1 * Math.sin(t * 17 + i)), tw = th * (0.62 + 0.2 * h2), heat = dd < r * 0.38 && k < 0.45 ? 2 : k < 0.62 ? (dd < r * 0.6 ? 1 : 0) : 0;
      ctx.globalAlpha = pa * fade * (heat === 0 ? 0.85 : 1); blitT(ctx, tongue(((fr0 + i * 3) % FR + FR) % FR, heat), tx - tw / 2, ty - th, tw, th, h2 > 0.5); }
    // white-yellow hot core (additive) for the first part of the blast
    if (G && k < 0.5) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pa * (1 - k / 0.5) * 0.9; var cr2 = r * grow * 0.75; ctx.drawImage(G, x - cr2, y - rise - cr2 * 0.9, cr2 * 2, cr2 * 2); ctx.globalCompositeOperation = pc; }
    if (k < 0.6) drawEmbers(ctx, { x: x, y: y - rise, w: r * 2, h: r * 1.6, t: t, n: C.e, seed: seed, alpha: pa * (1 - k) });
    ctx.globalAlpha = pa; ctx.globalCompositeOperation = pc; ctx.imageSmoothingEnabled = ps;
  }
  /* ---------- burn patches (flame.js pool) ---------- */
  var oldPatch = F.drawBurnPatch, oldPool = F.pool;
  function drawBurnPatch(ctx, o) {
    var lvl = Math.max(1, Math.min(5, o.level | 0 || 1)), life = o.life || (5 + 1.5 * lvl), age = o.age || 0, t = o.t || 0, sc = o.scale || 1, seed = o.seed || (((o.x * 13 + o.y * 7) | 0) & 1023), R = (14 + 6 * lvl) * sc;
    var k = age < 0.3 ? age / 0.3 : age < life * 0.6 ? 1 : age < life ? 1 - (age - life * 0.6) / (life * 0.4) : 0;
    if (o.layer === 'ground' || o.layer == null) {
      if (F.drawScorch) { var sa = Math.min(1, age / 1.5) * (age > life + 6 && !o.permanentScorch ? Math.max(0, 1 - (age - life - 6) / 6) : 1); F.drawScorch(ctx, o.x, o.y + R * 0.05, R * 2.8, 0.9 * sa * ctx.globalAlpha, o.v || 0); }
      if (age > life * 0.5 && age < life + 8) drawEmbers(ctx, { x: o.x, y: o.y, w: R * 1.8, h: 10 * sc, t: t, n: 3, seed: seed, alpha: ctx.globalAlpha * 0.7 });
    }
    if ((o.layer === 'fire' || o.layer == null) && age < life + 8) {
      var smk = age < life ? 1 : 1 - (age - life) / 8;
      if (k > 0) drawFire(ctx, { x: o.x, y: o.y + 2 * sc, w: R * 1.9, h: R * (1.1 + 0.25 * lvl / 5) * (0.5 + 0.5 * k), intensity: Math.min(1, k * (0.65 + 0.07 * lvl)), t: t, seed: seed, smoke: 0.55 * smk, embers: 0.6 });
      else if (smk > 0) drawFire(ctx, { x: o.x, y: o.y, w: R * 1.4, h: R, intensity: 0.02, t: t, seed: seed, smoke: 0.45 * smk, embers: 0 });   // smoke only, after the flames die
    }
  }
  // smoke-only path (fire died, smoke lingers): intensity <= 0.03 with smoke draws the oily smoke column only
  var _df = drawFire; drawFire = function (ctx, o) { if ((o.intensity || 0) <= 0.03 && o.smoke) { var pa = ctx.globalAlpha, C = CAPS[tier()], t = o.t || 0, seed = (o.seed | 0) & 4095, w = o.w || 24, h = o.h || 30, ps = ctx.imageSmoothingEnabled; frame(t); ctx.imageSmoothingEnabled = true;
      for (var i = 0; i < C.s; i++) { var hh = hash(seed * 31 + i * 7), p = (hh + t * 0.3) % 1, sz = (w * 0.9 + h * 0.6) * (0.7 + p * 1.2); ctx.globalAlpha = pa * o.smoke * (p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75) * 0.5;
        blitT(ctx, smoke(i % 3), o.x + (hh - 0.5) * w * 0.5 + p * 12 - sz / 2, o.y - h * (0.4 + p * 2) - sz / 2, sz, sz); } ctx.globalAlpha = pa; ctx.imageSmoothingEnabled = ps; return; } return _df(ctx, o); };
  var TMP = { x: 0, y: 0, age: 0, level: 1, life: 0, t: 0, layer: 'fire', v: 0, seed: 0 };
  function drawPatches(ctx, t, layer) { var P = F.pool || []; for (var i = 0; i < P.length; i++) { var p = P[i]; if (!p.on) continue;
    TMP.x = p.x; TMP.y = p.y; TMP.age = p.age; TMP.level = p.level; TMP.life = p.life; TMP.t = t; TMP.layer = layer; TMP.v = p.v; TMP.seed = i * 7 + 1; drawBurnPatch(ctx, TMP); } }
  function warm() { for (var f = 0; f < FR; f++) for (var h = 0; h < 3; h++) tongue(f, h); bed(0); bed(1); for (var v = 0; v < 3; v++) smoke(v); ember(); glow(); return NTX; }
  var oldWarm = F.warm;
  F.drawFire = function (ctx, o) { return drawFire(ctx, o); }; F.drawStream = drawStream; F.drawEmbers = drawEmbers;
  F.drawFireball = drawFireball; F.drawFlame = drawStream; F.drawBurnPatch = drawBurnPatch; F.drawPatches = drawPatches;
  F.warm = function () { if (oldWarm) try { oldWarm(); } catch (e) {} return warm(); };
  F.drawSmoke = function (ctx, x, y, size, alpha, v) { var im = smoke((v | 0) % 3); if (!im) return; var pa = ctx.globalAlpha, ps = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true; ctx.globalAlpha = pa * (alpha == null ? 1 : alpha); drawn++; ctx.drawImage(im, x - size / 2, y - size / 2, size, size); ctx.globalAlpha = pa; ctx.imageSmoothingEnabled = ps; };
  F.caps = function () { return CAPS[tier()]; }; F.CAPS = CAPS; F.tier = tier; F.legacyDrawBurnPatch = oldPatch; F.SHARED = 'rc8.1';
  F.sharedStats = function () { return { textures: NTX, bytes: BYTES, tier: tier(), drawn: lastDrawn }; };
  if (typeof module !== 'undefined' && module.exports) module.exports = F;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : this));
