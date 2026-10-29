/* rotor_wash.js v1.3.1 - VFX Artist, rc8.2 staging. CH-46 rotor-wash dust for the redone intro LZ landing (AD review of v1.0, Oct 28 2026).
 * Self-contained, no dependencies. Same style as he_fireball.js: cached textures, seeded layouts, LQ/LOWFX tiers, RFX.
 * Units = px at scale 1 for the CH-46 v4.1 sprite (9 px/m, men 32 px). Defaults: rotor hubs +-SPAN 45 px (10 m), rotor radius RR 69 px (7.62 m),
 * ground ellipse squash YS 0.67 (v4.1 disc b/a). Override per call with opts {span, rr, ys}.
 *   VFX_ROTORWASH.drawUnder(ctx, x, y, t, scale, heading, ground, opts) -> radial streaks, scoured ground, grass lay ring. AFTER terrain, BEFORE the CH-46 + Marines.
 *   VFX_ROTORWASH.drawOver (ctx, x, y, t, scale, heading, ground, opts) -> rolling lip, billows, idle haze, debris/grass bits. AFTER the CH-46 + Marines.
 *   v1.3 TAKEOFF (additive): pass opts.takeoff = s since spool-up start (t is then ignored). Idle -> spool -> liftoff 1.0 s -> climb fade, gone ~5 s.
 *   v1.3.1: from tk 1.6 s the wash blends to forward flight (ring pushed aft, plume trails, nose side thins, grass lays aft). opts.depart = departure heading (rad), default = heading arg.
 *   VFX_ROTORWASH.draw(...) = both.  VFX_ROTORWASH.intensity(t) -> 0..1 (drive shake/audio).  VFX_ROTORWASH.ground = fn(x,y) when ground is null.
 *   x,y = ground point midway between the two rotor hubs' ground points; heading = fuselage axis in radians (0 = nose right).
 *   t = seconds since touchdown (t<0 approach from -1.5 s). Timing unchanged from v1.0: peak 0-0.25 s, idle by ~3 s, steady loop after.
 *   ground: 'laterite'|'dirt'|'lz' -> warm red-brown (red-orange lean, no pink; HE stays grey-brown) | 'grass'|'elephant'|'scrub' -> pale khaki-green
 *           haze + flying grass bits + bent-blade lay ring | 'paddy'|'mud'|'wet'|'water'|'rice' -> dark spray at touchdown, no idle dust.
 * Tiers: LQ.t / LOWFX. Reduced motion (RFX): static idle pose, no burst/debris/ripple. Reduce Flashing: no flash, no additive blend, smooth alphas only.
 */
(function (root) {
  'use strict';
  if (root.VFX_ROTORWASH) return;
  var SPAN = 45, RR = 69, YS = 0.67, IDLE = 0.2, IDLE_A = 0.3;
  var GT = {
    lat:   { hi: '#b47e58', mid: '#93603f', lo: '#64402a', sc: '#a2704e', roll: '#9c6a4a', st: '#b8845e', bits: ['#6e4a32', '#8a5a3c', '#5a3c28', '#9a6a44'] },
    grass: { hi: '#9a9462', mid: '#7e7c4e', lo: '#565a36', sc: '#767a50', roll: '#848458', st: '#9c9668', bl: '#9a9c62', bd: '#323c1c', bits: ['#6e7a3a', '#8a8a4a', '#a09a5a', '#56622c'] },
    mud:   { hi: '#5a4c3c', mid: '#43382c', lo: '#2e2820', sc: '#3a3428', roll: '#4c5446', st: '#4a4034', bits: ['#2e2820', '#3a3428', '#43382c', '#2e2820'] }
  };
  var TIER = { high: { lip: 30, curl: 16, haze: 26, roll: 22, streak: 26, blades: 260, deb: 22, wave: 1 },
               med:  { lip: 22, curl: 10, haze: 16, roll: 14, streak: 16, blades: 170, deb: 12, wave: 1 },
               low:  { lip: 12, curl: 0,  haze: 8,  roll: 7,  streak: 8,  blades: 80,  deb: 6,  wave: 0 } };
  function gkey(g) { g = g || ''; return /paddy|mud|wet|water|river|rice/.test(g) ? 'mud' : /grass|elephant|scrub/.test(g) ? 'grass' : 'lat'; }
  function tier() { var L = root.LQ || root.LCO_QUALITY; if (L && (L.t === 'low' || L.t === 'med' || L.t === 'high')) return L.t; return root.LOWFX ? 'low' : 'high'; }
  function cv(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rnd(s) { s = (s | 0) || 1; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function rgba(h, a) { return 'rgba(' + hex(h) + ',' + a + ')'; }
  // --- textures (baked once) ---
  var TX = {};
  // haze: soft single-tone falloff (idle air, far edge)
  function haze(gk, v, tone) { var k = 'h' + gk + v + tone; if (TX[k]) return TX[k]; var c = cv(64, 64), x = c.getContext('2d'), r = rnd(311 + v * 47), col = GT[gk][tone];
    for (var i = 0; i < 6; i++) { var px = 32 + (r() - 0.5) * 22, py = 32 + (r() - 0.5) * 14, pr = 10 + r() * 12, gr = x.createRadialGradient(px, py, 0, px, py, pr);
      gr.addColorStop(0, rgba(col, 0.4)); gr.addColorStop(0.55, rgba(col, 0.18)); gr.addColorStop(1, rgba(col, 0)); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }
    return (TX[k] = c); }
  // billow: cauliflower cluster with DEFINED edges, lit from top-left (hi cap, mid body, lo underside) - the 0.3-0.8 s look
  function billow(gk, v) { var k = 'b' + gk + v; if (TX[k]) return TX[k]; var c = cv(96, 64), x = c.getContext('2d'), r = rnd(733 + v * 59), G = GT[gk], lobes = [], i, L;
    for (i = 0; i < 7; i++) lobes.push([22 + r() * 52, 26 + r() * 18 - (i % 3) * 3, 9 + r() * 9]);
    lobes.sort(function (a, b) { return a[1] - b[1]; });
    function pass(col, dx, dy, k2, edge) { for (i = 0; i < lobes.length; i++) { L = lobes[i]; var g = x.createRadialGradient(L[0] + dx, L[1] + dy, 0, L[0] + dx, L[1] + dy, L[2] * k2);
      g.addColorStop(0, rgba(col, 0.92)); g.addColorStop(edge, rgba(col, 0.85)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.beginPath(); x.arc(L[0] + dx, L[1] + dy, L[2] * k2, 0, 6.283); x.fill(); } }
    pass(G.lo, 2, 3, 1.0, 0.78); pass(G.mid, 0, 0, 0.92, 0.8); pass(G.hi, -2.5, -3, 0.6, 0.55);
    return (TX[k] = c); }
  // --- seeded layouts per tier ---
  var LY = {};
  function layout(tn) { if (LY[tn]) return LY[tn]; var T = TIER[tn], r = rnd(9001 + tn.length * 7), L = { lip: [], curl: [], haze: [], roll: [], streak: [], blades: [], deb: [] }, i;
    for (i = 0; i < T.lip; i++) L.lip.push({ a: (i + r() * 0.9) / T.lip * 6.283, d: 0.8 + r() * 0.26, z: 0.75 + r() * 0.5, v: (r() * 4) | 0, sp: (r() - 0.5) * 0.3 });
    for (i = 0; i < T.curl; i++) L.curl.push({ a: (i + r()) / T.curl * 6.283, z: 0.5 + r() * 0.35, v: (r() * 4) | 0 });
    for (i = 0; i < T.haze; i++) L.haze.push({ a: (i + r()) / T.haze * 6.283, d: 0.45 + r() * 0.5, z: 0.8 + r() * 0.6, v: (r() * 3) | 0 });
    for (i = 0; i < T.roll; i++) L.roll.push({ a: r() * 6.283, s: r() < 0.5 ? -1 : 1, ph: r(), sp: 0.22 + r() * 0.12, z: 0.7 + r() * 0.5, v: (r() * 3) | 0 });
    var rj = rnd(4242 + T.streak); for (i = 0; i < T.streak; i++) { var na = Math.ceil(T.streak / 2); L.streak.push({ k: i % 2 ? 1 : -1, a: ((i >> 1) + 0.5 + (rj() - 0.5) * 0.9) / na * 6.283, l: 0.6 + rj() * 1.0, w: 0.035 + rj() * 0.055, ph: rj() * 6.283 }); r(); r(); r(); r(); }
    for (i = 0; i < T.blades; i++) L.blades.push({ a: r() * 6.283, r: 0.85 + Math.pow(r(), 0.9) * 0.85, l: 10 + r() * 8, k: r(), cv: (r() - 0.5) * 0.6 });
    for (i = 0; i < T.deb; i++) L.deb.push({ a: r() * 6.283, t0: r() * 0.45, v: 120 + r() * 110, sz: 1.4 + r() * 1.8, rot: r() * 6.283, sp: (r() - 0.5) * 22, c: (r() * 4) | 0, blade: r() < 0.6 });
    return (LY[tn] = L); }
  function intensity(t) { if (t < 0) return Math.max(0, 1 + t / 1.5) * 0.75; if (t < 0.25) return 0.75 + t; return IDLE + (1 - IDLE) * Math.exp(-(t - 0.25) / 0.8); }
  // v1.3 takeoff: tk = s since rotor spool-up starts. Idle -> spool (0-1.0 s) -> liftoff at 1.0 s, peak to 1.6 s -> climb-out fade, gone ~5 s.
  var LIFTOFF = 1.0;
  function takeoffIntensity(tk) { if (tk <= 0) return IDLE; if (tk < LIFTOFF) { var u = tk / LIFTOFF; u = u * u * (3 - 2 * u); return IDLE + (0.85 - IDLE) * u; }
    if (tk < 1.6) return 0.85 + 0.15 * (tk - LIFTOFF) / 0.6; return Math.exp(-(tk - 1.6) / 0.9); }
  function takeoffAlt(tk) { return tk <= LIFTOFF ? 0 : Math.pow(tk - LIFTOFF, 1.6) * 9; } // m, for Lead's reference only
  function burst(t) { return Math.max(0, (intensity(t) - IDLE) / (1 - IDLE)); }
  // point at angle a and radius r (px) around the stadium hull of both rotor discs; heading-rotated, y squashed
  function wrap(d) { while (d > Math.PI) d -= 6.283185; while (d < -Math.PI) d += 6.283185; return d; }
  // v1.3.1 forward flight: P.fw 0..1, P.aft = aft angle in the heading-relative frame. Aft side is pushed out and drifts; nose side thins (P.fa).
  function hull(P, a, r) { P.fa = 1; if (P.fw > 0) { var dt = Math.cos(a - P.aft); P.fa = 1 - 0.85 * P.fw * Math.max(0, -dt) - 0.25 * P.fw * Math.max(0, -dt + 0.3);
      if (P.fa < 0) P.fa = 0; var push = P.fw * P.rr * (0.35 + 0.85 * Math.max(0, dt)) + P.fw * P.fw * P.rr * 0.9 + (P.drift || 0) * P.fw; r = r + P.fw * P.rr * 0.5 * Math.max(0, dt);
      var o0 = hull0(P, a, r); return [o0[0] + Math.cos(P.aft + P.hd) * push * P.s, o0[1] + Math.sin(P.aft + P.hd) * push * P.s * P.ys]; }
    return hull0(P, a, r); }
  function hull0(P, a, r) { var ca = Math.cos(a), sa = Math.sin(a), lx = ca * (r + P.span * Math.abs(ca)), ly = sa * r, ch = Math.cos(P.hd), sh = Math.sin(P.hd);
    return [P.x + (lx * ch - ly * sh) * P.s, P.y + (lx * sh + ly * ch) * P.s * P.ys]; }
  function hub(P, k) { return [P.x + Math.cos(P.hd) * P.span * k * P.s, P.y + Math.sin(P.hd) * P.span * k * P.s * P.ys]; }
  function setup(x, y, t, s, hd, g, o) { o = o || {}; if (g == null && root.VFX_ROTORWASH.ground) g = root.VFX_ROTORWASH.ground(x, y);
    var rm = !!root.RFX, tn = tier(), tt = rm ? 6 : t;
    var P = { x: x, y: y, s: s || 1, hd: hd || 0, span: o.span || SPAN, rr: o.rr || RR, ys: o.ys || YS, gk: gkey(g), rm: rm, t: tt, tn: tn, L: layout(tn), T: TIER[tn] };
    P.I = rm ? IDLE * 0.8 : intensity(tt); P.b = rm ? 0 : burst(tt); P.ex = tt < 0 ? 0 : 1 - Math.exp(-(tt + 0.12) / 0.5); P.G = GT[P.gk];
    P.ph = rm ? 0 : tt; P.k = 1; P.bk = 1; P.dbt = tt; P.fw = 0; P.fa = 1; P.aft = 0; P.drift = 0; P.crisp = Math.min(1, Math.max(0, (tt - 0.05) / 0.25)) * Math.max(0, 1 - Math.max(0, tt - 0.9) / 0.9);
    if (o.takeoff != null) { var tk = o.takeoff, I = takeoffIntensity(tk);   // additive option; landing path above is untouched when absent
      if (rm) { P.I = IDLE * 0.8; P.k = tk > 1.6 ? Math.max(0, 1 - (tk - 1.6) / 2) : 1; }      // RFX: static idle pose, just fades out on climb
      else { P.I = Math.max(I, IDLE); P.k = Math.min(1, I / IDLE); P.b = Math.max(0, (I - IDLE) / (1 - IDLE));
        P.ex = Math.min(1, 0.55 + 0.45 * P.b + 0.25 * Math.max(0, tk - LIFTOFF)); P.ph = 8 + tk; P.crisp = 0.7 * Math.min(1, P.b * 1.4);
        P.dbt = tk - 0.55; P.bk = tk > LIFTOFF ? Math.min(1, I / 0.6) : 1; }
      var u = Math.min(1, Math.max(0, (tk - 1.6) / 1.4)); P.fw = rm ? 0 : u * u * (3 - 2 * u);   // forward flight blend from 1.6 s
      P.aft = wrap((o.depart != null ? o.depart : P.hd) - P.hd + Math.PI); if (P.fw > 0) { P.bk = Math.max(P.bk, 0.6 * P.fw);
        var pl = P.fw * (tk < 2.4 ? 1 : Math.exp(-(tk - 2.4) / 1.3)); P.b = Math.max(P.b, 0.85 * pl); P.drift = Math.max(0, tk - 1.6) * P.rr * 0.35; P.k = Math.max(P.k, Math.min(1, pl * 1.5)); P.I = Math.max(P.I, IDLE);
        P.crisp = Math.max(0, P.crisp * (1 - P.fw)); }   // drifting plume lingers past the climb fade, soft (no crisp billows)
      P.t = tk < 0 ? 8 : 8 + tk; }
    return P; }

  function drawUnder(ctx, x, y, t, s, hd, g, o) { var P = setup(x, y, t, s, hd, g, o), G = P.G, i, c, k; if (P.I <= 0.01 || P.k <= 0.005) return; ctx.save();
    var dm = P.gk === 'mud' ? 0.5 : 1;
    // scoured ground under each rotor (strong at touchdown, faint at idle)
    for (k = -1; k <= 1; k += 2) { c = hub(P, k); var R = P.rr * 1.25 * P.s, rg = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], R);
      rg.addColorStop(0, rgba(G.sc, 0)); rg.addColorStop(0.6, rgba(G.sc, (((P.gk === 'grass' ? 0 : 0.03) + 0.22 * P.b) * dm * P.k).toFixed(3))); rg.addColorStop(1, rgba(G.sc, 0));
      ctx.fillStyle = rg; ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(1, P.ys); ctx.translate(-c[0], -c[1]); ctx.fillRect(c[0] - R, c[1] - R, R * 2, R * 2); ctx.restore(); }
    // radial streaks pushed outward from under each rotor (tapered wedges, gradient along length); idle = faint slow shimmer
    var st = P.L.streak; for (i = 0; i < st.length; i++) { var S = st[i]; c = hub(P, S.k); var len = P.rr * (0.55 + 0.75 * P.ex) * S.l, r0 = P.rr * 0.25;
      var sh = P.rm ? 0.5 : 0.5 + 0.5 * Math.sin(P.ph * 1.6 + S.ph), al = (0.42 * P.b + 0.05 * sh * (P.gk === 'lat' ? 1 : 0)) * dm * P.k; if (al < 0.01) continue;
      var sa0 = S.a + wrap(P.aft - S.a) * 0.8 * P.fw, ca = Math.cos(sa0 + P.hd), sa = Math.sin(sa0 + P.hd), px = -sa, py = ca, w0 = r0 * S.w * P.s, w1 = len * S.w * 1.6 * P.s;
      var ax = c[0] + ca * r0 * P.s, ay = c[1] + sa * r0 * P.s * P.ys, bx = c[0] + ca * len * P.s, by = c[1] + sa * len * P.s * P.ys;
      var lg = ctx.createLinearGradient(ax, ay, bx, by); lg.addColorStop(0, rgba(G.st, 0)); lg.addColorStop(0.35, rgba(G.st, al.toFixed(3))); lg.addColorStop(1, rgba(G.st, 0));
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(ax + px * w0, ay + py * w0 * P.ys); ctx.lineTo(bx + px * w1, by + py * w1 * P.ys); ctx.lineTo(bx - px * w1, by - py * w1 * P.ys); ctx.lineTo(ax - px * w0, ay - py * w0 * P.ys); ctx.closePath(); ctx.fill(); }
    // grass lay ring: bent blades leaning outward, curved; dark troughs + pale undersides (pale only in the burst); idle ripple runs outward
    if (P.gk === 'grass') { var bl = P.L.blades, wv = P.T.wave && !P.rm, lean = Math.min(1, 0.55 + P.b);
      ctx.lineCap = 'round';
      for (i = 0; i < bl.length; i++) { var B = bl[i], rr = P.rr * B.r; c = hull(P, B.a, rr);
        var ripple = wv ? Math.sin(B.r * 9 - P.ph * 2.4) : 0.3, pale = B.k < 0.55 * P.b;
        var al = pale ? (0.15 + 0.6 * P.b) : (0.55 + 0.25 * P.b) * (0.5 + 0.5 * ripple) * P.bk;
        var ba = B.a + wrap(P.aft - B.a) * P.fw, ca2 = Math.cos(ba), sa2 = Math.sin(ba), lx = ca2 * (1 + Math.abs(ca2) * 0.0), dx = lx, dy = sa2 * P.ys, ln = B.l * P.s * lean * (1 + 0.15 * ripple);
        var nx = -dy * B.cv * ln, ny = dx * B.cv * ln * P.ys;
        ctx.globalAlpha = P.k * P.fa * Math.min(0.85, al); ctx.strokeStyle = pale ? G.bl : G.bd; ctx.lineWidth = (pale ? 1.2 : 2) * P.s;
        ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.quadraticCurveTo(c[0] + dx * ln * 0.5 + nx, c[1] + dy * ln * 0.5 + ny, c[0] + dx * ln, c[1] + dy * ln); ctx.stroke(); }
      ctx.globalAlpha = 1; }
    ctx.restore(); }

  function drawOver(ctx, x, y, t, s, hd, g, o) { var P = setup(x, y, t, s, hd, g, o), G = P.G, gk = P.gk, i, c, r, sz, Q; if (P.I <= 0.01 || P.k <= 0.005) return; ctx.save();
    var dm = gk === 'mud' ? 0.5 : gk === 'grass' ? 0.55 : 1, rdm = gk === 'grass' ? 0.25 : gk === 'mud' ? 0 : 1, b = P.b, ex = P.ex;
    if (b > 0.01) {
      // far haze behind the lip
      for (i = 0; i < P.L.haze.length; i++) { Q = P.L.haze[i]; r = P.rr * (0.75 + (0.15 + 1.0 * ex) * Q.d); c = hull(P, Q.a, r); sz = (26 + 26 * ex) * Q.z * P.s;
        ctx.globalAlpha = P.k * P.fa * Math.min(1, b * 0.9 * dm); ctx.drawImage(haze(gk, Q.v, gk === 'grass' ? 'roll' : 'mid'), c[0] - sz, c[1] - sz * 0.6, sz * 2, sz * 1.2); }
      // rolling lip: dense band of defined billows at the outer edge (back row first so the front edge stays crisp)
      var lipR = P.rr * (0.95 + 1.0 * ex), crisp = P.crisp;
      var order = P.L.lip.slice().sort(function (p, q) { return Math.sin(p.a + P.hd) - Math.sin(q.a + P.hd); });
      for (i = 0; i < order.length; i++) { Q = order[i]; var a = Q.a + Q.sp * ex; r = lipR * Q.d * (1 + 0.035 * Math.sin(2 * a + 1.3) + 0.025 * Math.sin(5 * a + P.ph * 0.6 + Q.v)); c = hull(P, a, r); sz = (30 + 34 * ex) * Q.z * P.s;
        var al = b * dm * (0.45 + 0.35 * Q.z);
        ctx.globalAlpha = P.k * P.fa * Math.min(1, al * (1 - 0.6 * crisp)); ctx.drawImage(haze(gk, Q.v % 3, 'hi'), c[0] - sz * 1.2, c[1] - sz * 0.75, sz * 2.4, sz * 1.5);
        if (crisp > 0.02) { ctx.globalAlpha = P.k * P.fa * Math.min(1, al * crisp); ctx.drawImage(billow(gk, Q.v), c[0] - sz * 1.1, c[1] - sz * 0.85, sz * 2.2, sz * 1.45); } }
      // curl: lip rolling up and back - smaller billows just inside the lip, lifted a few px, lit cap
      for (i = 0; i < P.L.curl.length; i++) { Q = P.L.curl[i]; r = lipR * 0.86; c = hull(P, Q.a, r); sz = (18 + 20 * ex) * Q.z * P.s;
        ctx.globalAlpha = P.k * P.fa * Math.min(1, b * dm * 0.6); ctx.drawImage(haze(gk, Q.v % 3, 'hi'), c[0] - sz * 1.2, c[1] - sz * 0.7 - (3 + 4 * ex) * P.s, sz * 2.4, sz * 1.4); }
    }
    // idle air: thin haze puffs drifting outward with a slow ripple (this is the steady look)
    var rl = P.L.roll, idleA = (P.rm ? 0.8 : 1 + 5 * (P.I - IDLE)) * IDLE_A * rdm;
    if (idleA > 0.001) for (i = 0; i < rl.length; i++) { Q = rl[i]; var f = P.rm ? (Q.ph * 0.7 + 0.15) : ((P.ph * Q.sp + Q.ph) % 1 + 1) % 1;
      r = P.rr * (0.95 + 0.9 * f); c = hull(P, Q.a + f * 0.25 * Q.s, r); sz = (16 + 18 * f) * Q.z * P.s;
      var rip = P.rm ? 1 : 0.7 + 0.3 * Math.sin(P.ph * 1.3 + Q.a * 3), al2 = Math.sin(Math.PI * f) * 0.3 * idleA * rip; if (al2 < 0.005) continue;
      ctx.globalAlpha = P.k * P.fa * Math.min(0.9, al2); ctx.drawImage(haze(gk, Q.v, 'roll'), c[0] - sz, c[1] - sz * 0.6, sz * 2, sz * 1.2); }
    // debris / flying grass bits skidding outward at touchdown (none under RFX)
    if (!P.rm && P.dbt > 0 && P.dbt < 1.8) for (i = 0; i < P.L.deb.length; i++) { Q = P.L.deb[i]; var dt = P.dbt - Q.t0; if (dt <= 0 || dt > 1.3) continue;
      var d = P.rr * 0.85 + Q.v * (1 - Math.exp(-dt * 2.2)) / 2.2; c = hull(P, Q.a, d); var px = c[0], py = c[1] - Math.sin(Math.min(1, dt / 0.7) * Math.PI) * 7 * P.s;
      ctx.globalAlpha = P.k * P.fa * Math.min(1, (1.3 - dt) / 0.5) * (gk === 'mud' ? 0.6 : 0.95); ctx.fillStyle = G.bits[Q.c];
      ctx.save(); ctx.translate(px, py); ctx.rotate(Q.rot + Q.sp * dt);
      if (gk === 'grass' && Q.blade) ctx.fillRect(-Q.sz * 2.2 * P.s, -0.5 * P.s, Q.sz * 4.4 * P.s, 1.1 * P.s); else ctx.fillRect(-Q.sz * P.s, -Q.sz * 0.45 * P.s, Q.sz * 2 * P.s, Q.sz * 0.9 * P.s);
      ctx.restore(); }
    ctx.restore(); }

  root.VFX_ROTORWASH = { drawUnder: drawUnder, drawOver: drawOver, draw: function (ctx, x, y, t, s, hd, g, o) { drawUnder(ctx, x, y, t, s, hd, g, o); drawOver(ctx, x, y, t, s, hd, g, o); },
    intensity: intensity, takeoffIntensity: takeoffIntensity, takeoffAlt: takeoffAlt, LIFTOFF: LIFTOFF, IDLE: IDLE, SPAN: SPAN, RR: RR, YS: YS, TIER: TIER, GT: GT, ground: null, version: '1.3.1' };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.VFX_ROTORWASH;
})(typeof self !== 'undefined' ? self : this);
