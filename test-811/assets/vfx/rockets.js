/* rockets.js - Artist Helper. Projectiles in flight, Quang Tri 1968. Export VFX_ROCKETS. Optional: VFX_EXPLOSIONS (impact), VFX_MUZZLE (launch flash).
 * Types: b40  = B40 / RPG-2 (PG-2 80mm HEAT head, no sustainer: launch-charge flame only for ~60 ms, then a short smoky trail that thins out)
 *        b41  = B41 / RPG-7 (PG-7 head, rocket motor ignites ~11 m out: bright motor glow + denser trail)  [index.html eproj with e.rpg7]
 *        m79  = 40mm M406 round, lobbed: small olive/brass slug, ground shadow, faint spin glint, no trail
 * Sprites: pixel grids rotated on the art grid into 32 headings, baked lazily ONCE per (type, dir, integer scale); glow baked once. No per-frame canvases.
 * --- stateless pieces (for driving from the game's own eprojs / grenades) ---
 * VFX_ROCKETS.drawProjectile(ctx, type, x, y, angle, t, scale, z)   x,y = ground point (screen px), z = height in art px (drawn at y - z*scale,
 *        with a ground shadow at x,y), angle = flight heading, t = seconds since launch (drives wobble / motor / glint).
 * VFX_ROCKETS.emit(type, wx, wy, angle, dt, z, t)   add trail smoke behind a projectile (world coords) - call once per update; no-op for m79.
 * VFX_ROCKETS.impact(kind, wx, wy)   queue an explosion (kind = VFX_EXPLOSIONS type, default by projectile: b40/b41 'grenade', m79 'grenade').
 * --- self-driving pool ---
 * VFX_ROCKETS.spawnRocket(type, wx, wy, angle, speed, opts) -> entry.  opts: {tx, ty (impact point; else flies opts.range px), arc (art px apex, m79 default 34,
 *        rockets 0), onImpact(entry) (return false to suppress the default explosion), boom: VFX_EXPLOSIONS type}
 * VFX_ROCKETS.update(dt)   moves rockets, emits trails, ages smoke + booms.
 * VFX_ROCKETS.drawAll(ctx, camX, camY, scale, layer)   layer 'ground' (shadows + explosion scorch-free booms) | 'air' (trail + projectiles) | 'all'.
 * VFX_ROCKETS.reset(), .counts() -> {rockets, smoke, booms}.  Pools: 48 rockets, 700 smoke puffs, 24 booms (oldest recycled). Smoke value floor #5a554c. */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2, DIRS = 32;
  // art grids, nose pointing +x, origin = centre of mass ('o' column marks nothing; origin col given)
  var ART = {
    b40: { ox: 6, rows: [   // PG-2: fat olive HEAT cone + ogive, thin tail boom, 6 spring fins (seen as 2 + stub)
      "..ff...........",
      "...ff....kkkk..",
      "....bbbbkggggk.",
      "jjjjbbbbgGGggmk",
      "....bbbbkggggk.",
      "...ff....kkkk..",
      "..ff..........."],
      pal: { k: '#1a1c12', g: '#4f5e34', G: '#7e8f52', m: '#c9c39a', b: '#3a3f2a', f: '#2c2f22', j: '#6e6a5a' } },
    b41: { ox: 7, rows: [
      "...ff.............",
      "...fff....kkkk....",
      "....bbbbbkggggkk..",
      "jjjbbbbbbgGGgggmmk",
      "....bbbbbkggggkk..",
      "...fff....kkkk....",
      "...ff............."],
      pal: { k: '#1a1c12', g: '#46552f', G: '#77894c', m: '#a8a58a', b: '#34392a', f: '#2a2d20', j: '#55534a' } },
    m79: { ox: 2, rows: [
      ".kkk.",
      "kyggk",
      "kYGGg",
      "kyggk",
      ".kkk."],
      pal: { k: '#1a1c12', g: '#556036', G: '#8a9658', y: '#b08a3a', Y: '#e0c070' } }
  };
  var TYPES = {
    b40: { speed: 260, motor: 0, burn: 0.06, trail: 0.012, trailLife: 1.4, thin: 0.35, wob: 0.9, boom: 'grenade', shadow: 1 },
    b41: { speed: 300, motor: 1, burn: 0.07, ign: 0.06, trail: 0.014, trailLife: 2.0, thin: 0, wob: 0.6, boom: 'grenade', shadow: 1 },
    m79: { speed: 150, motor: 0, burn: 0, trail: 0, trailLife: 0, wob: 0, boom: 'grenade', arc: 34, shadow: 1 }
  };
  function rng(seed) { var a = seed >>> 0 || 1; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function mkCanvas(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); if (typeof document !== 'undefined') { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; } return null; }
  function rotated(type, dir) {   // returns {N,R,px:string[]} rotated about origin
    var A = ART[type], h = A.rows.length, w = A.rows[0].length, oy = (h - 1) / 2, R = Math.ceil(Math.max(A.ox, w - A.ox, oy) + 1), N = 2 * R + 1, out = [];
    var a = -dir / DIRS * TAU, c = Math.cos(a), s = Math.sin(a);
    for (var y = 0; y < N; y++) { var row = ''; for (var x = 0; x < N; x++) { var dx = x - R, dy = y - R, sx = Math.round(c * dx - s * dy + A.ox), sy = Math.round(s * dx + c * dy + oy);
      row += (sx >= 0 && sy >= 0 && sx < w && sy < h) ? A.rows[sy][sx] : '.'; } out.push(row); }
    return { N: N, R: R, px: out };
  }
  var CACHE = {}, nCache = 0;
  function sprite(type, dir, sc) {
    var key = type + dir + '|' + sc; if (CACHE[key] !== undefined) return CACHE[key];
    var G = rotated(type, dir), cv = mkCanvas(G.N * sc, G.N * sc); if (!cv) return (CACHE[key] = null);
    var x = cv.getContext('2d'), P = ART[type].pal;
    for (var y = 0; y < G.N; y++) for (var i = 0; i < G.N; i++) { var ch = G.px[y][i]; if (ch === '.') continue; x.fillStyle = P[ch]; x.fillRect(i * sc, y * sc, sc, sc); }
    nCache++; return (CACHE[key] = { cv: cv, R: G.R });
  }
  var GLOW = null;
  function glow() { if (GLOW !== null) return GLOW; var cv = mkCanvas(32, 32); if (!cv) return (GLOW = null); var x = cv.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.25, 'rgba(255,200,90,0.8)'); g.addColorStop(0.6, 'rgba(255,120,40,0.25)'); g.addColorStop(1, 'rgba(255,90,30,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32); return (GLOW = cv); }
  var PUFF = {};
  function puff(sc, shade) { var key = sc + '|' + shade; if (PUFF[key] !== undefined) return PUFF[key]; var r = rng(31 + shade), cv = mkCanvas(9 * sc, 9 * sc); if (!cv) return (PUFF[key] = null);
    var x = cv.getContext('2d'), C = [['#d8d2c4', '#b4ae9f', '#8e887b'], ['#a59e90', '#827b6e', '#5a554c']][shade];
    for (var y = 0; y < 9; y++) for (var i = 0; i < 9; i++) { var d = Math.hypot(i - 4, y - 4) + r() * 0.9; if (d > 4.4) continue; x.fillStyle = C[i + y < 7 ? 0 : i + y > 10 ? 2 : 1]; x.fillRect(i * sc, y * sc, sc, sc); }
    return (PUFF[key] = cv); }

  function wobble(T, t, seed) { return T.wob ? Math.sin(t * 26 + seed) * 0.06 * T.wob + Math.sin(t * 9.3 + seed * 2) * 0.04 * T.wob : 0; }
  function drawProjectile(ctx, type, x, y, angle, t, scale, z, seed) {
    var T = TYPES[type]; if (!T) return; var sc = Math.max(1, Math.round(scale || 1)), zz = (z || 0) * sc, sd = seed || 0;
    var a = angle + wobble(T, t, sd), lat = T.wob ? Math.sin(t * 17 + sd) * 0.8 * T.wob * sc : 0, px = x - Math.sin(angle) * lat, py = y - zz + Math.cos(angle) * lat;
    var pS = ctx.imageSmoothingEnabled, pA = ctx.globalAlpha, pC = ctx.globalCompositeOperation; ctx.imageSmoothingEnabled = false;
    if (T.shadow) { ctx.globalAlpha = 0.28; ctx.fillStyle = '#1a1c12'; var sw = (type === 'm79' ? 3 : 7) * sc; ctx.fillRect(Math.round(x - sw / 2), Math.round(y), sw, sc); ctx.globalAlpha = pA; }
    var ca = Math.cos(a), sa = Math.sin(a), G = glow(), tail = (type === 'm79' ? 2 : ART[type].ox + 1) * sc;
    // flame / motor at the tail
    var fl = 0; if (T.motor) fl = t < T.ign ? 0.5 : 0.85 + 0.15 * Math.sin(t * 90 + sd); else if (t < T.burn) fl = 1 - t / T.burn;
    if (fl > 0 && G) { ctx.globalCompositeOperation = 'lighter'; var gr = (T.motor ? 9 : 7) * sc * (0.8 + 0.4 * fl); ctx.globalAlpha = Math.min(1, fl);
      ctx.drawImage(G, Math.round(px - ca * tail - gr), Math.round(py - sa * tail - gr), Math.round(gr * 2), Math.round(gr * 2));
      ctx.globalCompositeOperation = pC; ctx.fillStyle = '#fff6d0';   // hot jet core, 3-5 art px
      var L = (T.motor ? 5 : 3) + ((t * 60) | 0) % 2; for (var i = 1; i <= L; i++) { ctx.globalAlpha = Math.min(1, fl) * (1 - i / (L + 1)); ctx.fillStyle = i < 2 ? '#fff6d0' : i < 4 ? '#ffc24a' : '#ff8a28';
        ctx.fillRect(Math.round(px - ca * (tail + i * sc) - sc / 2), Math.round(py - sa * (tail + i * sc) - sc / 2), sc, sc); } }
    ctx.globalAlpha = pA;
    var dir = ((Math.round(a / TAU * DIRS) % DIRS) + DIRS) % DIRS, im = sprite(type, dir, sc);
    if (im) ctx.drawImage(im.cv, Math.round(px - im.R * sc - sc / 2), Math.round(py - im.R * sc - sc / 2));
    if (type === 'm79' && ((t * 20) | 0) % 3 === 0) { ctx.fillStyle = '#fff3c0'; ctx.fillRect(Math.round(px - sc / 2), Math.round(py - 1.5 * sc), sc, sc); }   // spin glint
    ctx.imageSmoothingEnabled = pS; ctx.globalAlpha = pA; ctx.globalCompositeOperation = pC;
  }

  /* --- smoke pool --- */
  var SMAX = 700, SM = [], sLive = 0, sNext = 0;
  for (var i0 = 0; i0 < SMAX; i0++) SM.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s0: 0.3, s1: 1, a0: 0.5, shade: 0 });
  function addSmoke(x, y, vx, vy, life, s0, s1, a0, shade) {
    var p = null; for (var k = 0; k < SMAX; k++) { var c = SM[(sNext + k) % SMAX]; if (!c.on) { p = c; sNext = (sNext + k + 1) % SMAX; break; } }
    if (!p) { p = SM[sNext]; sNext = (sNext + 1) % SMAX; sLive--; }
    p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.t = 0; p.life = life; p.s0 = s0; p.s1 = s1; p.a0 = a0; p.shade = shade; sLive++; return p;
  }
  var acc = {}, er = rng(99);
  function emit(type, x, y, angle, dt, z, t, key) {
    var T = TYPES[type]; if (!T || !T.trail) return; var id = key || type; acc[id] = (acc[id] || 0) + dt;
    var ca = Math.cos(angle), sa = Math.sin(angle), tail = ART[type].ox + 1, yy = y - (z || 0), thin = T.thin ? Math.max(0.15, 1 - (t || 0) * T.thin * 2.2) : 1;
    var rate = T.trail / Math.max(0.2, thin);   // RPG-2: trail thins (fewer, smaller puffs) as the launch smoke runs out
    if ((t || 0) < 0.08) { for (var b = 0; b < 3; b++) addSmoke(x - ca * tail, yy - sa * tail, -ca * (20 + er() * 30) + (er() - 0.5) * 20, -sa * 30 + (er() - 0.5) * 20 - 6, 0.9 + er() * 0.5, 0.5, 1.6, 0.55, 1); }
    while (acc[id] >= rate) { acc[id] -= rate;
      addSmoke(x - ca * tail + (er() - 0.5) * 1.5, yy - sa * tail + (er() - 0.5) * 1.5, -ca * 6 + (er() - 0.5) * 6, -sa * 6 - 4 - er() * 4, T.trailLife * (0.7 + er() * 0.5) * (0.6 + 0.4 * thin),
        0.25 * (0.6 + 0.4 * thin), (T.motor ? 1.3 : 1.0) * (0.5 + 0.5 * thin), (T.motor ? 0.55 : 0.5) * (0.5 + 0.5 * thin), 0); }
  }
  /* --- booms --- */
  var BMAX = 24, BM = [];
  for (var i1 = 0; i1 < BMAX; i1++) BM.push({ on: false, kind: 'grenade', x: 0, y: 0, t: 0 });
  function impact(kind, x, y) { var b = BM[0]; for (var k = 0; k < BMAX; k++) { if (!BM[k].on) { b = BM[k]; break; } if (BM[k].t > b.t) b = BM[k]; } b.on = true; b.kind = kind || 'grenade'; b.x = x; b.y = y; b.t = 0; return b; }
  /* --- rocket pool --- */
  var RMAX = 48, RK = [], rSeed = 0;
  for (var i2 = 0; i2 < RMAX; i2++) RK.push({ on: false, type: 'b40', sx: 0, sy: 0, x: 0, y: 0, z: 0, tx: 0, ty: 0, a: 0, t: 0, d: 1, arc: 0, seed: 0, key: '', onImpact: null, boom: null });
  function spawnRocket(type, x, y, angle, speed, opts) {
    var T = TYPES[type]; if (!T) return null; var o = opts || {}, e = null; for (var k = 0; k < RMAX; k++) if (!RK[k].on) { e = RK[k]; break; } if (!e) e = RK[0];
    var sp = speed || T.speed, tx = o.tx, ty = o.ty; if (tx == null) { var rg = o.range || 320; tx = x + Math.cos(angle) * rg; ty = y + Math.sin(angle) * rg; }
    rSeed++; e.on = true; e.type = type; e.sx = e.x = x; e.sy = e.y = y; e.tx = tx; e.ty = ty; e.a = Math.atan2(ty - y, tx - x); e.t = 0; e.z = o.z0 || 0;
    e.d = Math.max(0.05, Math.hypot(tx - x, ty - y) / sp); e.arc = o.arc != null ? o.arc : (T.arc || 0); e.z0 = o.z0 || 0; e.seed = rSeed * 1.7; e.key = 'r' + rSeed; e.onImpact = o.onImpact || null; e.boom = o.boom || T.boom; return e;
  }
  function update(dt) {
    for (var k = 0; k < RMAX; k++) { var e = RK[k]; if (!e.on) continue; e.t += dt; var q = Math.min(1, e.t / e.d);
      e.x = e.sx + (e.tx - e.sx) * q; e.y = e.sy + (e.ty - e.sy) * q; e.z = e.z0 * (1 - q) + e.arc * Math.sin(Math.PI * q);
      emit(e.type, e.x, e.y, e.a, dt, e.z, e.t, e.key);
      if (q >= 1) { e.on = false; delete acc[e.key]; var go = e.onImpact ? e.onImpact(e) : true; if (go !== false) impact(e.boom, e.tx, e.ty); } }
    for (var j = 0; j < SMAX; j++) { var p = SM[j]; if (!p.on) continue; p.t += dt; if (p.t >= p.life) { p.on = false; sLive--; continue; }
      var dr = Math.exp(-dt * 2.2); p.vx = p.vx * dr + 7 * dt; p.vy = p.vy * dr - 3 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }   // drag + wind (+x) + slow rise
    var E = root.VFX_EXPLOSIONS || (typeof globalThis !== 'undefined' && globalThis.VFX_EXPLOSIONS); for (var b = 0; b < BMAX; b++) { var B = BM[b]; if (!B.on) continue; B.t += dt; var tot = E && E.TYPES[B.kind] ? E.TYPES[B.kind].total / 1000 : 0.7; if (B.t > tot) B.on = false; }
  }
  function drawAll(ctx, camX, camY, scale, layer) {
    var sc = Math.max(1, Math.round(scale || 1)), L = layer || 'all', cx = camX || 0, cy = camY || 0, pA = ctx.globalAlpha, pS = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    if (L !== 'air') { var E = root.VFX_EXPLOSIONS || (typeof globalThis !== 'undefined' && globalThis.VFX_EXPLOSIONS); if (E) for (var b = 0; b < BMAX; b++) { var B = BM[b]; if (B.on) E.draw(ctx, B.kind, (B.x - cx) * sc, (B.y - cy) * sc, B.t, sc); } }
    if (L !== 'ground') {
      for (var j = 0; j < SMAX; j++) { var p = SM[j]; if (!p.on) continue; var k = p.t / p.life, im = puff(sc, p.shade); if (!im) break;
        var s = (p.s0 + (p.s1 - p.s0) * Math.sqrt(k)), w = Math.max(sc, Math.round(9 * sc * s)); ctx.globalAlpha = p.a0 * (1 - k) * (k < 0.08 ? k / 0.08 : 1);
        ctx.drawImage(im, Math.round((p.x - cx) * sc - w / 2), Math.round((p.y - cy) * sc - w / 2), w, w); }
      ctx.globalAlpha = pA;
      for (var r = 0; r < RMAX; r++) { var e = RK[r]; if (!e.on) continue; var ang = e.a;
        if (e.arc) { var q = Math.min(1, e.t / e.d), dz = e.arc * Math.PI * Math.cos(Math.PI * q) / Math.max(1, Math.hypot(e.tx - e.sx, e.ty - e.sy)); ang = Math.atan2(Math.sin(e.a) - dz, Math.cos(e.a)); }
        drawProjectile(ctx, e.type, (e.x - cx) * sc, (e.y - cy) * sc, ang, e.t, sc, e.z, e.seed); } }
    ctx.globalAlpha = pA; ctx.imageSmoothingEnabled = pS;
  }
  function reset() { for (var k = 0; k < RMAX; k++) RK[k].on = false; for (var j = 0; j < SMAX; j++) SM[j].on = false; for (var b = 0; b < BMAX; b++) BM[b].on = false; sLive = 0; acc = {}; }
  function counts() { var r = 0, b = 0; for (var k = 0; k < RMAX; k++) if (RK[k].on) r++; for (var i = 0; i < BMAX; i++) if (BM[i].on) b++; return { rockets: r, smoke: sLive, booms: b }; }
  var API = { release: function (k) { delete acc[k]; }, TYPES: TYPES, ART: ART, drawProjectile: drawProjectile, emit: emit, impact: impact, spawnRocket: spawnRocket, update: update, drawAll: drawAll, reset: reset, counts: counts,
    cacheSize: function () { return nCache; }, POOLS: { rockets: RMAX, smoke: SMAX, booms: BMAX } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.VFX_ROCKETS = API;
})(typeof self !== 'undefined' ? self : this);
