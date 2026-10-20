/* vehicle_hits.js - Artist Helper. Vehicle impact + damage-state VFX, Quang Tri 1968. Export VFX_VEHICLE_HIT. Optional: VFX_EXPLOSIONS (booms).
 * World coords in art px (same as the game); draw multiplies by an integer scale. z = height above the ground point (helicopters: alt).
 * Everything is pooled (particles 1200, flashes 48, hull decals 64, emitters 32, fallers 6, booms 24; oldest recycled) and every image is
 * baked once per integer scale (glow, smoke puffs x3 shades, flame x3 frames, scorch x2). Smoke value floor #5a554c, never pure black.
 *
 * VFX_VEHICLE_HIT.hit(kind, target, x, y, angle, opts) -> {glance:bool}
 *   kind:  'heat'  B40/B41/LAW/106 HEAT on armour: jet flash, spall sparks spraying THROUGH (along angle), molten splash back, hull scorch decal
 *          'ap'    tank shell: hard white-orange flash + armour fragments; glancing variant (chance opts.glanceP, default .3, or opts.glance:true)
 *                  = ricochet spark streak + gouge, no fragments
 *          'small' rifle rounds on armour: spark pings, ~40% ricochet streak       'mg' MG/.50 on armour: denser pings + streaks
 *          'heli'  small arms on a helicopter: skin-debris puffs + sparks (pass opts.z = altitude)
 *          'heli_down' helicopter shot down: airburst (VFX_EXPLOSIONS 'vehicle' at altitude), 2-4 rotor blades flying, smoking/burning fall,
 *                  then big wreck explosion + a burning wreck emitter. opts: {z (alt, default 34), vx, vy (drift px/s), follow: obj with x,y,z
 *                  (e.g. the game's crash object) instead of the built-in fall, id (emitter id for the wreck), wreckLife (s, default 30; 0 = forever)}
 *          'boat'  splinters + water splash. opts.hull: 'fiberglass' (PBR, default) | 'wood' (sampan) | 'steel' (flame monitor / LCM: sparks)
 *          'he'    HE/mortar near-miss on a vehicle: frag spray + dust (no decal)
 *   target: the vehicle object (optional). Hull decals follow target.x/target.y (offset kept from the hit point); null = fixed decal.
 *   angle:  incoming round heading (radians, 0 = +x).   opts.z height of the hit point (default 6 armour, 34 helicopters), opts.big (x1.5).
 * VFX_VEHICLE_HIT.attachToVehicle(id, level, opts)  persistent damage state, level 0 = clear, 1 smoke (engine deck), 2 fire, 3 cook-off
 *   (ammo popping; opts.turretPop:true -> turret blown off once), 4 burning wreck. opts: {follow: obj with x,y(,z), x, y (if no follow),
 *   ex, ey (engine offset art px from x,y; default 0,-6 / heli 0,-4), ttl (auto-detach after s), heli:true (smoke trails behind a moving bird; level 2 = fire + spin trail)}
 *   Calling again with the same id changes the level (going up to 3 triggers the cook-off start). .detach(id). .level(id).
 * VFX_VEHICLE_HIT.update(dt)    VFX_VEHICLE_HIT.drawAll(ctx, camX, camY, scale, layer)  layer 'hull' (decals: draw right after the vehicle
 *   sprites) | 'fx' (everything else, above units) | 'all'.   .reset(), .counts(), .seed(n) (deterministic renders). */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;
  var seedV = 12345; function rnd() { seedV = (seedV + 0x6D2B79F5) >>> 0; var t = Math.imul(seedV ^ (seedV >>> 15), 1 | seedV); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function mk(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); if (typeof document !== 'undefined') { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; } return null; }
  function EXP() { return root.VFX_EXPLOSIONS || (typeof globalThis !== 'undefined' && globalThis.VFX_EXPLOSIONS) || null; }
  /* ---------- baked images ---------- */
  var IMG = {};
  function glow() { if (IMG.glow !== undefined) return IMG.glow; var c = mk(32, 32); if (!c) return (IMG.glow = null); var x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,252,230,1)'); g.addColorStop(0.3, 'rgba(255,200,100,0.7)'); g.addColorStop(1, 'rgba(255,110,30,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return (IMG.glow = c); }
  function blob(key, sc, n, cols, seed, edge) { var k = key + sc; if (IMG[k] !== undefined) return IMG[k]; var c = mk(n * sc, n * sc); if (!c) return (IMG[k] = null);
    var x = c.getContext('2d'), s = seed, r = function () { s = (s * 16807) % 2147483647; return s / 2147483647; }, h = (n - 1) / 2;
    for (var y = 0; y < n; y++) for (var i = 0; i < n; i++) { var d = Math.hypot(i - h, y - h) / h + r() * (edge || 0.25); if (d > 1.05) continue;
      x.fillStyle = cols[i + y < n * 0.7 ? 0 : i + y > n * 1.2 ? 2 : 1]; x.fillRect(i * sc, y * sc, sc, sc); } return (IMG[k] = c); }
  var SMK = [['#d4cec0', '#b1ab9d', '#8d877a'], ['#958e81', '#777064', '#5e584e'], ['#6e685e', '#625c52', '#5a554c']];
  function puff(sc, shade) { return blob('p' + shade, sc, 9, SMK[shade], 7 + shade * 13); }
  function scorch(sc, v) { return blob('s' + v, sc, 7 + v * 2, ['#3a3328', '#2e2a22', '#26231c'], 31 + v, 0.6); }
  function flame(sc, f) { var k = 'f' + f + sc; if (IMG[k] !== undefined) return IMG[k]; var W = 7, H = 11, c = mk(W * sc, H * sc); if (!c) return (IMG[k] = null);
    var x = c.getContext('2d'), s = 99 + f * 7, r = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (var y = 0; y < H; y++) for (var i = 0; i < W; i++) { var u = (i - 3) / 3.4, v = y / (H - 1), w = Math.sqrt(Math.max(0, v)) * (1 - 0.15 * v) + (r() - 0.5) * 0.35 - Math.sin(v * 5 + f * 2) * 0.12 * u;
      if (Math.abs(u) > w) continue; var hot = (1 - Math.abs(u) / (w + 0.01)) * v; x.fillStyle = hot > 0.55 ? '#fff2b0' : hot > 0.3 ? '#ffc23a' : hot > 0.12 ? '#ff7a1a' : 'rgba(200,52,22,0.85)';
      x.fillRect(i * sc, y * sc, sc, sc); } return (IMG[k] = c); }
  /* ---------- pools ---------- */
  function pool(n, f) { var a = []; for (var i = 0; i < n; i++) a.push(f()); return a; }
  var PM = 1200, P = pool(PM, function () { return { on: false, k: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, t: 0, life: 1, s: 1, s1: 1, rot: 0, vr: 0, c: 0, a: 1 }; }), pI = 0;
  var SPARK = 0, FRAG = 1, SMOKE = 2, FIRE = 3, DEBRIS = 4, DROP = 5, MOLTEN = 6, BLADE = 7, EMBER = 8, TURRET = 9;
  function part(k, x, y, z, vx, vy, vz, g, life, s, s1, c) { var p = P[pI]; for (var n = 0; n < PM && P[pI].on; n++) pI = (pI + 1) % PM; p = P[pI]; pI = (pI + 1) % PM;
    p.on = true; p.k = k; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.g = g; p.t = 0; p.life = life; p.s = s; p.s1 = s1 == null ? s : s1; p.c = c || 0; p.rot = rnd() * TAU; p.vr = (rnd() - 0.5) * 20; p.a = 1; return p; }
  var FM = 48, F = pool(FM, function () { return { on: false, x: 0, y: 0, z: 0, t: 0, life: 0.1, r: 10, a: 0, kind: 0 }; });
  function flash(x, y, z, r, life, a, kind) { var f = F[0]; for (var i = 0; i < FM; i++) { if (!F[i].on) { f = F[i]; break; } if (F[i].t > f.t) f = F[i]; }
    f.on = true; f.x = x; f.y = y; f.z = z; f.r = r; f.life = life; f.a = a; f.kind = kind; f.t = 0; }
  var DM = 64, D = pool(DM, function () { return { on: false, tg: null, dx: 0, dy: 0, x: 0, y: 0, t: 0, v: 0, life: 40 }; }), dI = 0;
  function decal(tg, x, y, v) { var d = D[dI]; dI = (dI + 1) % DM; d.on = true; d.tg = tg && typeof tg === 'object' ? tg : null; d.dx = d.tg ? x - d.tg.x : 0; d.dy = d.tg ? y - d.tg.y : 0; d.x = x; d.y = y; d.t = 0; d.v = v; d.life = 40; }
  var BM = 24, B = pool(BM, function () { return { on: false, kind: 'vehicle', x: 0, y: 0, z: 0, t: 0, sc: 1 }; });
  function boom(kind, x, y, z) { var b = B[0]; for (var i = 0; i < BM; i++) { if (!B[i].on) { b = B[i]; break; } if (B[i].t > b.t) b = B[i]; } b.on = true; b.kind = kind; b.x = x; b.y = y; b.z = z || 0; b.t = 0; }
  var EM = 32, E = pool(EM, function () { return { on: false, id: null, lv: 0, fol: null, x: 0, y: 0, ex: 0, ey: -6, heli: false, acc: [0, 0, 0, 0], pop: 0, tp: false, popped: false, t: 0, px: 0, py: 0, pz: 0 }; });
  var XM = 6, X = pool(XM, function () { return { on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, t: 0, dur: 1.1, z0: 34, fol: null, id: null, acc: 0, land: { x: 0, y: 0 } }; });

  /* ---------- hit recipes ---------- */
  function sparks(x, y, z, a, spread, n, sp, life, g) { for (var i = 0; i < n; i++) { var q = a + (rnd() - 0.5) * spread, v = sp * (0.5 + rnd() * 0.8);
    part(SPARK, x, y, z, Math.cos(q) * v, Math.sin(q) * v * 0.7, (rnd() * 0.9 + 0.1) * v * 0.6, g == null ? 220 : g, life * (0.6 + rnd() * 0.6), 1); } }
  function smokeP(x, y, z, n, shade, life, s0, s1, sp) { for (var i = 0; i < n; i++) part(SMOKE, x + (rnd() - 0.5) * 3, y + (rnd() - 0.5) * 2, z + rnd() * 2, (rnd() - 0.5) * (sp || 10), (rnd() - 0.5) * (sp || 10) * 0.5, 4 + rnd() * 8, 0, life * (0.7 + rnd() * 0.6), s0, s1, shade); }
  function hit(kind, tg, x, y, a, o) {
    o = o || {}; var big = o.big ? 1.5 : 1, z = o.z != null ? o.z : (kind === 'heli' ? 34 : 6), back = a + Math.PI, res = { glance: false };
    if (kind === 'heat') {
      flash(x, y, z, 22 * big, 0.12, a, 2);
      for (var j = 0; j < 3; j++) part(SPARK, x, y, z, Math.cos(a) * 420, Math.sin(a) * 300, 20, 0, 0.05 + j * 0.01, 2);   // the jet itself
      sparks(x, y, z, a, 1.2, 22 * big, 260, 0.35, 160);                         // spall spraying through
      for (var m = 0; m < 10 * big; m++) { var q = back + (rnd() - 0.5) * 2.2, v = 40 + rnd() * 60; part(MOLTEN, x, y, z, Math.cos(q) * v, Math.sin(q) * v * 0.7, 40 + rnd() * 50, 200, 0.6 + rnd() * 0.4, 1); }
      smokeP(x, y, z, 5, 1, 1.4, 0.4, 1.6, 18); decal(tg, x, y - z * 0.3, 1);
    } else if (kind === 'ap') {
      var gl = o.glance != null ? o.glance : rnd() < (o.glanceP != null ? o.glanceP : 0.3); res.glance = gl;
      if (gl) { var ra = a + (rnd() < 0.5 ? 1 : -1) * (0.35 + rnd() * 0.3); flash(x, y, z, 10 * big, 0.06, ra, 1);
        part(SPARK, x, y, z, Math.cos(ra) * 380, Math.sin(ra) * 280, 120, 60, 0.32, 3);   // ricochet streak (long, kind 3 = streak)
        sparks(x, y, z, ra, 0.8, 10, 200, 0.25); smokeP(x, y, z, 2, 0, 0.6, 0.3, 0.9); decal(tg, x, y - z * 0.3, 0);
      } else { flash(x, y, z, 18 * big, 0.09, a, 1);
        for (var f = 0; f < 12 * big; f++) { var fa = (rnd() < 0.6 ? back : a) + (rnd() - 0.5) * 2.4, fv = 60 + rnd() * 110; part(FRAG, x, y, z, Math.cos(fa) * fv, Math.sin(fa) * fv * 0.7, 30 + rnd() * 90, 260, 1.4, 1 + (rnd() < 0.3 ? 1 : 0)); }
        sparks(x, y, z, back, 2.8, 14, 220, 0.3); smokeP(x, y, z, 4, 1, 1.2, 0.4, 1.4, 16); decal(tg, x, y - z * 0.3, 1); }
    } else if (kind === 'small' || kind === 'mg') {
      var n = kind === 'mg' ? 4 : 2; flash(x, y, z, kind === 'mg' ? 5 : 4, 0.04, a, 0); sparks(x, y, z, back, 2.2, n + 1, 120, 0.12);
      if (rnd() < (kind === 'mg' ? 0.55 : 0.4)) { var r2 = a + (rnd() - 0.5) * 1.6; part(SPARK, x, y, z, Math.cos(r2) * 340, Math.sin(r2) * 250, 60 + rnd() * 80, 60, 0.2, 3); }
      if (rnd() < 0.3) smokeP(x, y, z, 1, 0, 0.4, 0.15, 0.4, 6);
    } else if (kind === 'heli') {
      flash(x, y, z, 4, 0.04, a, 0); sparks(x, y, z, back, 2.4, 3, 130, 0.14, 120);
      for (var d = 0; d < 4; d++) { var da = a + (rnd() - 0.5) * 2, dv = 30 + rnd() * 60; part(DEBRIS, x, y, z, Math.cos(da) * dv, Math.sin(da) * dv * 0.7, 10 + rnd() * 40, 120, 0.7 + rnd() * 0.5, 1, 1, rnd() < 0.6 ? 0 : 1); }
      smokeP(x, y, z, 2, 0, 0.5, 0.2, 0.6, 14);
    } else if (kind === 'heli_down') {
      var c = X[0]; for (var i = 0; i < XM; i++) if (!X[i].on) { c = X[i]; break; }
      c.on = true; c.x = x; c.y = y; c.z0 = c.z = o.z != null ? o.z : 34; c.vx = o.vx != null ? o.vx : Math.cos(a) * 60; c.vy = o.vy != null ? o.vy : Math.sin(a) * 40; c.t = 0; c.dur = o.dur || 1.1; c.fol = o.follow || null; c.id = o.id || ('down' + Math.floor(rnd() * 1e9)); c.acc = 0; c.wl = o.wreckLife != null ? o.wreckLife : 30;
      boom('vehicle', x, y, c.z); flash(x, y, c.z, 40, 0.15, 0, 2); sparks(x, y, c.z, 0, TAU, 20, 200, 0.5, 150);
      var nb = 2 + Math.floor(rnd() * 3); for (var b = 0; b < nb; b++) { var ba = rnd() * TAU, bv = 80 + rnd() * 70; var p = part(BLADE, x, y, c.z + 4, Math.cos(ba) * bv, Math.sin(ba) * bv * 0.7, 40 + rnd() * 60, 90, 2.2, 1); p.vr = (rnd() < 0.5 ? -1 : 1) * (14 + rnd() * 10); }
      for (var dd = 0; dd < 12; dd++) { var a3 = rnd() * TAU, v3 = 50 + rnd() * 90; part(DEBRIS, x, y, c.z, Math.cos(a3) * v3, Math.sin(a3) * v3 * 0.7, 20 + rnd() * 60, 140, 1.2, 1, 1, rnd() < 0.5 ? 0 : 2); }
    } else if (kind === 'boat') {
      var hull = o.hull || 'fiberglass', zz = o.z != null ? o.z : 2;
      if (hull === 'steel') { flash(x, y, zz, 6, 0.05, a, 0); sparks(x, y, zz, back, 2.4, 6, 150, 0.15); }
      else { flash(x, y, zz, 3, 0.03, a, 0); for (var s = 0; s < 9 * big; s++) { var sa = a + (rnd() - 0.5) * 2.6, sv = 40 + rnd() * 80;
        part(DEBRIS, x, y, zz, Math.cos(sa) * sv, Math.sin(sa) * sv * 0.7, 30 + rnd() * 60, 180, 0.9, 1, 1, hull === 'wood' ? 3 : 4); } }
      var wx = x + Math.cos(a) * 4, wy = y + Math.sin(a) * 3 + 4;   // splash just past the hull
      for (var w = 0; w < 14 * big; w++) { var wa = rnd() * TAU, wv = 10 + rnd() * 30; part(DROP, wx, wy, 0, Math.cos(wa) * wv, Math.sin(wa) * wv * 0.5, 60 + rnd() * 70, 260, 1, 1); }
      part(SMOKE, wx, wy, 2, 0, 0, 10, 0, 0.45, 0.4, 1.1, 0);
    } else if (kind === 'he') {
      flash(x, y, z, 14, 0.07, a, 1); for (var h = 0; h < 10; h++) { var ha = rnd() * TAU, hv = 60 + rnd() * 100; part(FRAG, x, y, z, Math.cos(ha) * hv, Math.sin(ha) * hv * 0.7, 40 + rnd() * 60, 260, 1.2, 1); }
      smokeP(x, y, 0, 6, 0, 1.2, 0.5, 1.8, 30);
    }
    return res;
  }
  /* ---------- damage-state emitters ---------- */
  function find(id) { for (var i = 0; i < EM; i++) if (E[i].on && E[i].id === id) return E[i]; return null; }
  function attachToVehicle(id, level, o) {
    o = o || {}; var e = find(id); if (!level) { if (e) e.on = false; return null; }
    if (!e) { e = E[0]; for (var i = 0; i < EM; i++) { if (!E[i].on) { e = E[i]; break; } if (E[i].lv < e.lv) e = E[i]; } e.on = true; e.id = id; e.lv = 0; e.ttl = 0; e.popped = false; e.t = 0; e.acc = [0, 0, 0, 0]; e.pop = 0.2; }
    if (o.follow !== undefined) e.fol = o.follow; if (o.x != null) { e.x = o.x; e.y = o.y; } e.heli = !!o.heli; e.ex = o.ex != null ? o.ex : 0; e.ey = o.ey != null ? o.ey : (e.heli ? -4 : -6);
    if (o.turretPop != null) e.tp = !!o.turretPop; if (o.ttl != null) e.ttl = o.ttl;
    var prev = e.lv; e.lv = Math.max(1, Math.min(4, level | 0));
    var px = (e.fol ? e.fol.x : e.x) + e.ex, py = (e.fol ? e.fol.y : e.y) + e.ey;
    if (e.lv >= 3 && prev < 3) { if (e.tp && !e.popped) { e.popped = true; boom('vehicle', px, py, 4); var tp = part(TURRET, px, py, 6, (rnd() - 0.5) * 50, (rnd() - 0.5) * 20, 160, 260, 3.5, 1); tp.vr = (rnd() < 0.5 ? -1 : 1) * 7; }
      else flash(px, py, 6, 24, 0.12, 0, 2); }
    return e;
  }
  function detach(id) { var e = find(id); if (e) e.on = false; }
  function emitE(e, dt) {
    var fx = e.fol ? e.fol.x : e.x, fy = e.fol ? e.fol.y : e.y, fz = e.fol && e.fol.z != null ? e.fol.z : (e.heli ? 34 : 0), x = fx + e.ex, y = fy + e.ey + (e.heli ? 0 : 0), z = fz, lv = e.lv; e.px = x; e.py = y; e.pz = z; e.vx = e.fol && e.fol.vx || 0;
    var rates = e.heli ? [[0.05, 0, 0], [0.025, 0.03, 0], [0.04, 0.06, 0], [0.06, 0.1, 0]][Math.min(3, lv - 1)] : [[0.07, 0, 0], [0.05, 0.05, 0], [0.04, 0.035, 0.2], [0.06, 0.09, 0.4]][lv - 1];
    e.acc[0] += dt; e.acc[1] += dt; e.acc[2] += dt;
    var sh = lv === 1 ? (e.heli ? 1 : 0) : 2;
    while (rates[0] && e.acc[0] >= rates[0]) { e.acc[0] -= rates[0]; part(SMOKE, x + (rnd() - 0.5) * 4, y + (rnd() - 0.5) * 2, z + 1, (rnd() - 0.5) * 6, (rnd() - 0.5) * 3, e.heli ? 2 : 10 + rnd() * 8, 0, (lv >= 3 ? 2.8 : 2.2) * (0.7 + rnd() * 0.5), 0.5, lv >= 3 ? 2.8 : 2.2, sh); }
    while (rates[1] && e.acc[1] >= rates[1]) { e.acc[1] -= rates[1]; part(FIRE, x + (rnd() - 0.5) * (lv >= 4 ? 10 : 5), y + (rnd() - 0.5) * 3, z, (rnd() - 0.5) * 4, 0, 14 + rnd() * 10, 0, 0.35 + rnd() * 0.25, lv >= 3 ? 1.4 : 1, 0.5);
      if (rnd() < 0.25) part(EMBER, x, y, z + 4, (rnd() - 0.5) * 20, (rnd() - 0.5) * 8, 30 + rnd() * 30, 30, 0.8 + rnd() * 0.6, 1); }
    if (lv === 3) { e.pop -= dt; if (e.pop <= 0) { e.pop = 0.12 + rnd() * 0.45; flash(x + (rnd() - 0.5) * 8, y, z + 4, 7 + rnd() * 6, 0.05, 0, 1); sparks(x, y, z + 4, -Math.PI / 2, TAU, 6 + Math.floor(rnd() * 6), 160, 0.4, 200); } }
    if (e.heli && lv >= 2) { e.acc[3] += dt; if (e.acc[3] > 0.03) { e.acc[3] = 0; part(SPARK, x, y, z, (rnd() - 0.5) * 30, (rnd() - 0.5) * 20, 10, 80, 0.2, 1); } }
  }
  /* ---------- update ---------- */
  function update(dt) {
    var Ex = EXP();
    for (var i = 0; i < PM; i++) { var p = P[i]; if (!p.on) continue; p.t += dt; if (p.t >= p.life) { p.on = false; continue; }
      if (p.k === SMOKE) { var dr = Math.exp(-dt * 1.6); p.vx = p.vx * dr + 6 * dt; p.vy *= dr; p.vz = p.vz * dr + 24 * dt; }
      else if (p.k === FIRE) { p.vz += 6 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.g * dt; p.rot += p.vr * dt;
      if (p.z < 0 && p.g) { if (p.k === DROP || p.k === SPARK || p.k === EMBER) { p.on = false; continue; }
        if (p.k === MOLTEN) { p.z = 0; p.vx = p.vy = p.vz = 0; p.g = 0; p.vr = 0; continue; }
        p.z = 0; p.vz = -p.vz * 0.3; p.vx *= 0.5; p.vy *= 0.5; p.vr *= 0.5; if (Math.abs(p.vz) < 15) { p.vz = 0; p.g = 0; p.vx = p.vy = 0; p.vr = 0; }
        if (p.k === TURRET) { boom('grenade', p.x, p.y, 0); smokeP(p.x, p.y, 0, 6, 0, 1.2, 0.5, 1.6, 30); } } }
    for (var f = 0; f < FM; f++) if (F[f].on && (F[f].t += dt) > F[f].life) F[f].on = false;
    for (var d = 0; d < DM; d++) { var q = D[d]; if (!q.on) continue; q.t += dt; if (q.t > q.life) q.on = false; else if (q.tg) { q.x = q.tg.x + q.dx; q.y = q.tg.y + q.dy; } }
    for (var b = 0; b < BM; b++) { var o = B[b]; if (!o.on) continue; o.t += dt; var tot = Ex && Ex.TYPES[o.kind] ? Ex.TYPES[o.kind].total / 1000 : 0.8; if (o.t > tot) o.on = false; }
    for (var e = 0; e < EM; e++) if (E[e].on) { E[e].t += dt; if (E[e].ttl && E[e].t > E[e].ttl) { E[e].on = false; continue; } emitE(E[e], dt); }
    for (var c = 0; c < XM; c++) { var x = X[c]; if (!x.on) continue; x.t += dt; var k = Math.min(1, x.t / x.dur);
      if (x.fol) { x.x = x.fol.x; x.y = x.fol.y; x.z = x.fol.z != null ? x.fol.z : x.z0 * (1 - k) * (1 - k); } else { x.x += x.vx * dt; x.y += x.vy * dt; x.z = x.z0 * (1 - k) * (1 - k); }
      x.acc += dt; while (x.acc > 0.02) { x.acc -= 0.02; part(SMOKE, x.x + (rnd() - 0.5) * 6, x.y, x.z, (rnd() - 0.5) * 8, (rnd() - 0.5) * 4, 2, 0, 1.8 + rnd(), 0.5, 2.2, 2);
        if (rnd() < 0.5) part(FIRE, x.x + (rnd() - 0.5) * 6, x.y, x.z, 0, 0, 6, 0, 0.25, 1.2, 0.5); }
      if (x.z <= 0.5 && x.t > 0.1) { x.on = false; boom('artillery', x.x, x.y, 0); flash(x.x, x.y, 2, 48, 0.2, 0, 2);
        for (var g = 0; g < 14; g++) { var ga = rnd() * TAU, gv = 60 + rnd() * 120; part(FRAG, x.x, x.y, 2, Math.cos(ga) * gv, Math.sin(ga) * gv * 0.7, 60 + rnd() * 80, 260, 1.6, 1 + (rnd() < 0.4 ? 1 : 0)); }
        decal(null, x.x, x.y, 2); attachToVehicle(x.id, 4, { follow: null, x: x.x, y: x.y, ey: -2, ttl: x.wl }); } }
  }
  /* ---------- draw ---------- */
  var DEB = ['#6f7a4a', '#c9c6b8', '#3a3d34', '#7a5a34', '#d8d6c8'];   // olive skin, bare alu, dark, wood, fibreglass
  function drawAll(ctx, camX, camY, scale, layer) {
    var sc = Math.max(1, Math.round(scale || 1)), L = layer || 'all', cx = camX || 0, cy = camY || 0;
    var pA = ctx.globalAlpha, pC = ctx.globalCompositeOperation, pS = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    function SX(x) { return Math.round((x - cx) * sc); } function SY(y, z) { return Math.round((y - (z || 0) - cy) * sc); }
    if (L !== 'fx') for (var d = 0; d < DM; d++) { var q = D[d]; if (!q.on) continue; var im = scorch(sc, Math.min(1, q.v)), fade = q.t > q.life - 5 ? (q.life - q.t) / 5 : 1; if (!im) break;
      ctx.globalAlpha = 0.8 * fade; var w = im.width * (q.v === 2 ? 2 : 1); ctx.drawImage(im, SX(q.x) - (w >> 1), SY(q.y) - (w >> 1), w, w);
      if (q.t < 1.2 && q.v) { ctx.globalAlpha = (1 - q.t / 1.2) * fade; ctx.fillStyle = '#ff8a2a'; ctx.fillRect(SX(q.x) - sc, SY(q.y) - sc, 2 * sc, 2 * sc); } }
    if (L === 'hull') { ctx.globalAlpha = pA; ctx.imageSmoothingEnabled = pS; return; }
    var Ex = EXP(); if (Ex) for (var b = 0; b < BM; b++) { var o = B[b]; if (o.on) { ctx.globalAlpha = pA; Ex.draw(ctx, o.kind, SX(o.x), SY(o.y, o.z), o.t, sc); } }
    // rc8 flame_shared: one drawFire per burning emitter (level 2 fire, 3 cook-off, 4 burning wreck) replaces the 7x11 pixel FIRE particles
    var SF = root.VFX_FLAME && root.VFX_FLAME.drawFire ? root.VFX_FLAME : null;
    if (SF) for (var ei = 0; ei < EM; ei++) { var em = E[ei]; if (!em.on || em.lv < 2 || em.px == null) continue; var fw = (em.lv >= 4 ? 24 : em.lv === 3 ? 20 : 14) * (em.heli ? 0.8 : 1);
      ctx.globalAlpha = pA; SF.drawFire(ctx, { x: SX(em.px), y: SY(em.py, em.pz) + sc, w: fw * sc, h: fw * (em.lv === 3 ? 1.5 : 1.25) * sc, intensity: em.lv === 2 ? 0.7 : em.lv === 3 ? 1 : 0.85, t: em.t, wind: -(em.vx || 0) * (em.heli ? 1 : 0.3), seed: ei * 131 + 7, smoke: false, embers: em.lv === 3 ? 1 : 0.5 }); }
    // smoke + fire first (behind sparks)
    for (var i = 0; i < PM; i++) { var p = P[i]; if (!p.on) continue; var k = p.t / p.life;
      if (p.k === SMOKE && SF && p.c === 2) { var ws = 9 * sc * (p.s + (p.s1 - p.s) * Math.sqrt(k)) * 1.9; SF.drawSmoke(ctx, SX(p.x), SY(p.y, p.z), ws, 0.26 * (1 - k * 0.9) * (k < 0.15 ? k / 0.15 : 1), i); continue; }   // fire smoke -> oily black (flame_shared)
      if (p.k === SMOKE) { var pi = puff(sc, p.c); if (!pi) continue; var w2 = Math.max(sc, Math.round(9 * sc * (p.s + (p.s1 - p.s) * Math.sqrt(k))));
        ctx.globalAlpha = (p.c === 2 ? 0.85 : 0.7) * (1 - k * 0.85) * (k < 0.1 ? k / 0.1 : 1); ctx.drawImage(pi, SX(p.x) - (w2 >> 1), SY(p.y, p.z) - (w2 >> 1), w2, w2); }
      else if (p.k === FIRE) { if (SF) continue; var fi = flame(sc, (i + ((p.t * 12) | 0)) % 3); if (!fi) continue; var fs = Math.max(0.4, p.s * (1 - k * 0.6)), fw = Math.round(fi.width * fs), fh = Math.round(fi.height * fs);
        ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3; ctx.drawImage(fi, SX(p.x) - (fw >> 1), SY(p.y, p.z) - fh, fw, fh); } }
    ctx.globalAlpha = pA;
    for (var j = 0; j < PM; j++) { var r = P[j]; if (!r.on || r.k === SMOKE || r.k === FIRE || (SF && r.k === EMBER)) continue; var kk = r.t / r.life, x0 = SX(r.x), y0 = SY(r.y, r.z);
      switch (r.k) {
        case SPARK: case MOLTEN: case EMBER: {
          var hotc = r.k === MOLTEN ? (kk < 0.3 ? '#ffe9a0' : kk < 0.6 ? '#ff9a2a' : '#b8401a') : r.k === EMBER ? (kk < 0.5 ? '#ffb040' : '#c8501c') : (kk < 0.35 ? '#fffbe0' : kk < 0.7 ? '#ffd050' : '#ff8a2a');
          var len = r.k === EMBER ? 0 : r.c === 3 ? 0.05 : r.c === 2 ? 0.035 : 0.022; if (r.k === MOLTEN && r.g === 0) len = 0;
          ctx.globalAlpha = r.k === MOLTEN && r.g === 0 ? Math.max(0, 1 - kk) : 1; ctx.fillStyle = hotc;
          var tx = -r.vx * len, ty = -(r.vy - r.vz) * len, steps = Math.max(1, Math.min(10, Math.round(Math.hypot(tx, ty) / 1.5)));
          for (var s = 0; s <= steps; s++) { if (s === 1) ctx.fillStyle = r.k === MOLTEN ? '#ff7a1a' : '#ffb03a'; if (s > steps * 0.6) ctx.globalAlpha = 0.55;
            ctx.fillRect(x0 + Math.round(tx * s / steps * sc), y0 + Math.round(ty * s / steps * sc), sc * (r.k === MOLTEN ? 2 : 1), sc); }
          ctx.globalAlpha = 1; break; }
        case FRAG: case DEBRIS: { var col = r.k === FRAG ? '#3c3a32' : DEB[r.c], sz = r.s * sc, flip = ((r.rot / 1.2) | 0) & 1;
          ctx.globalAlpha = kk > 0.8 ? (1 - kk) / 0.2 : 1; ctx.fillStyle = col; ctx.fillRect(x0, y0, flip ? sz * 2 : sz, flip ? sz : sz * 2);
          if (r.k === FRAG && kk < 0.25) { ctx.fillStyle = '#ffb050'; ctx.fillRect(x0, y0, sc, sc); } else if (r.k === FRAG) { ctx.fillStyle = '#6a665a'; ctx.fillRect(x0, y0, sc, sc); }
          if (r.z <= 0.5) { ctx.globalAlpha *= 0.4; ctx.fillStyle = '#1a1c12'; ctx.fillRect(x0, y0 + (flip ? sz : sz * 2), flip ? sz * 2 : sz, sc); } break; }
        case DROP: ctx.globalAlpha = 0.9; ctx.fillStyle = kk < 0.5 ? '#f2f8f8' : '#b8d4d8'; ctx.fillRect(x0, y0, sc, r.vz > 0 ? 2 * sc : sc); break;
        case BLADE: case TURRET: { ctx.save(); ctx.translate(x0, y0); ctx.rotate(Math.round(r.rot / (Math.PI / 16)) * (Math.PI / 16)); ctx.globalAlpha = kk > 0.85 ? (1 - kk) / 0.15 : 1;
          if (r.k === BLADE) { ctx.fillStyle = '#26281f'; ctx.fillRect(-11 * sc, -sc, 22 * sc, 2 * sc); ctx.fillStyle = '#e8e2c0'; ctx.fillRect(9 * sc, -sc, 2 * sc, 2 * sc); }
          else { ctx.fillStyle = '#1a1c12'; ctx.fillRect(-7 * sc, -5 * sc, 14 * sc, 10 * sc); ctx.fillStyle = '#4d5a34'; ctx.fillRect(-6 * sc, -4 * sc, 12 * sc, 8 * sc); ctx.fillStyle = '#2e3422'; ctx.fillRect(4 * sc, -sc, 12 * sc, 2 * sc); ctx.fillStyle = '#6b7848'; ctx.fillRect(-5 * sc, -4 * sc, 6 * sc, 2 * sc); }
          ctx.restore(); if (r.z > 1) { ctx.globalAlpha = 0.25; ctx.fillStyle = '#1a1c12'; ctx.fillRect(x0 - 6 * sc, SY(r.y), 12 * sc, sc); } break; } } }
    // flashes (additive glow + hard pixel star)
    var G = glow(); for (var f = 0; f < FM; f++) { var fl = F[f]; if (!fl.on) continue; var k2 = fl.t / fl.life, fx = SX(fl.x), fy = SY(fl.y, fl.z);
      if (G) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, 1 - k2); var gr = Math.round(fl.r * sc * (0.9 + k2 * 0.4)); ctx.drawImage(G, fx - gr, fy - gr, gr * 2, gr * 2); ctx.globalCompositeOperation = pC; }
      ctx.globalAlpha = 1; var core = Math.max(1, Math.round(fl.r * 0.18 * (1 - k2))), rays = fl.kind === 0 ? 4 : 8, rl = fl.r * (fl.kind === 0 ? 0.8 : 0.6) * (1 - k2 * 0.6);
      ctx.fillStyle = k2 < 0.5 ? '#ffffff' : '#ffe08a'; ctx.fillRect(fx - core * sc, fy - core * sc, core * 2 * sc, core * 2 * sc);
      for (var ry = 0; ry < rays; ry++) { var ra = ry / rays * TAU + (fl.kind === 0 ? 0.4 : 0), L2 = rl * (ry % 2 ? 0.55 : 1); for (var u = core; u < L2; u += 1) { ctx.fillStyle = u < L2 * 0.5 ? '#fff4c0' : '#ffb040';
        ctx.fillRect(fx + Math.round(Math.cos(ra) * u) * sc, fy + Math.round(Math.sin(ra) * u * 0.8) * sc, sc, sc); } }
      if (fl.kind === 2) { ctx.fillStyle = '#ffffff'; for (var u2 = 0; u2 < fl.r * 0.9; u2 += 1) ctx.fillRect(fx + Math.round(Math.cos(fl.a) * u2) * sc, fy + Math.round(Math.sin(fl.a) * u2 * 0.8) * sc, sc, sc); } }
    ctx.globalAlpha = pA; ctx.globalCompositeOperation = pC; ctx.imageSmoothingEnabled = pS;
  }
  function reset() { [P, F, D, B, E, X].forEach(function (a) { for (var i = 0; i < a.length; i++) a[i].on = false; }); }
  function counts() { var c = function (a) { var n = 0; for (var i = 0; i < a.length; i++) if (a[i].on) n++; return n; }; return { particles: c(P), flashes: c(F), decals: c(D), booms: c(B), emitters: c(E), fallers: c(X) }; }
  var API = { hit: hit, attachToVehicle: attachToVehicle, detach: detach, level: function (id) { var e = find(id); return e ? e.lv : 0; }, update: update, drawAll: drawAll, reset: reset, counts: counts,
    seed: function (n) { seedV = n >>> 0; }, POOLS: { particles: PM, flashes: FM, decals: DM, booms: BM, emitters: EM, fallers: XM }, imageCount: function () { var n = 0; for (var k in IMG) if (IMG[k]) n++; return n; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.VFX_VEHICLE_HIT = API;
})(typeof self !== 'undefined' ? self : this);
