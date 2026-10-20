/* impact_feel.js - Artist Helper. Impact "feel" for Quang Tri 1968: screen shake, hit-stop, camera kick, persistent ground decals, debris.
 * Export VFX_IMPACT. Standalone; optional VFX_EXPLOSIONS (forRadius / TYPES shake values are matched, not required).
 * World coords in art px (same as the game); draw multiplies by an INTEGER scale. All images are pixel grids baked ONCE per (variant, scale)
 * and cached; nothing allocates canvases per frame. Pools: decals 320, debris 420, shakes 12, kicks 6 (oldest/weakest recycled).
 * Palette: debris outlined #1a1c12, light from top-left, ground darks floor #2a2418 (never pure black), brass #b08a3a/#e0c070.
 *
 * --- camera feel ---
 * SHAKE[key] = {amp (art px peak), freq (Hz), decay (s, exponential time constant), dur (s, hard stop), rot (rad peak), range (art px, distance
 *              falloff to 0), dir (0..1 how much shake is biased along the impact direction)}.  Keys = weapon ids, enemy weapons and explosion types.
 * VFX_IMPACT.sampleShake(key, t, seed, intensity) -> {x, y, rot}   stateless curve sampler (smooth value noise x exp decay), t = s since event.
 * VFX_IMPACT.shake(key, opts)   add a live shake. opts {x, y (event world pos), cx, cy (listener/camera world pos), intensity (default 1), angle}
 *                               distance falloff uses SHAKE[key].range; returns the entry or null if inaudible.
 * VFX_IMPACT.kick(angle, key, opts)  camera kick: spring-damped push of KICK[key].px along `angle` (use the shot heading + PI for recoil, or the
 *                               blast->camera direction for a shove). Critically damped, no wobble.
 * VFX_IMPACT.hitStop(key, opts)  request a freeze of HITSTOP[key] seconds (max of overlapping requests, never stacks). opts {kill:true} uses .kill.
 * VFX_IMPACT.timeScale() -> 0..1  multiply your game dt by this (0 during freeze, eased back over 40 ms). VFX_IMPACT.stepDt(dt) -> scaled dt.
 * VFX_IMPACT.camera() -> {x, y, rot}  combined shake + kick offset, x/y rounded to whole art px (apply before the world transform).
 * --- ground ---
 * VFX_IMPACT.decal(kind, x, y, opts)  kinds: crater_s crater_m crater_l crater_xl scorch scorch_napalm brass_556 brass_762 brass_50 link_762 hull_12g
 *                               opts {angle, life (s), variant 0..2}. Persistent (craters 180 s default), fades over the last 6 s.
 * VFX_IMPACT.brass(type, x, y, angle, opts)  ejected casing: flies, bounces, tumbles, then rests as a brass decal (pooled in debris).
 * VFX_IMPACT.debris(kind, x, y, n, power, opts)  kinds: dirt clod rock wood sandbag metal. Ballistic with z + ground shadow, bounce, settle;
 *                               settled chunks leave a small decal for a while. opts {angle, spread (rad, default 2PI), z}.
 * --- recipes ---
 * VFX_IMPACT.impact(key, x, y, opts)  one call: shake + kick + hit-stop + crater/scorch + debris from RECIPE[key] (explosion type or weapon id).
 *                               opts {cx, cy (camera), angle, kill, ground:'dirt'|'paddy'|'sand'|'road'}. key may be a radius (number) -> forRadius.
 * VFX_IMPACT.forRadius(rad) -> explosion type (delegates to VFX_EXPLOSIONS.forRadius when loaded).  .WEAPON[gameId] -> SHAKE key.
 * VFX_IMPACT.update(dt)  pass REAL dt (not scaled) so hit-stop can end.
 * VFX_IMPACT.drawAll(ctx, camX, camY, scale, layer)  layer 'ground' (decals; draw with ground fx under units) | 'debris' (airborne chunks +
 *                               shadows; draw over units) | 'all'.  VFX_IMPACT.reset(); .counts(); .POOLS; .imageCount(); .seed(n).
 */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;
  /* ---------------- data: shake curves ---------------- */
  // amp in art px (screen px = amp * scale). Explosion amps match explosions.js TYPES[].shake / shakeMs (decay ~ shakeMs / 2.2).
  var SHAKE = {
    // small arms: tiny, high frequency, very short; realism = the camera barely moves for your own rifle
    m16:      { amp: 0.35, freq: 32, decay: 0.035, dur: 0.08, rot: 0,      range: 0,   dir: 0.8 },
    grease:   { amp: 0.3,  freq: 26, decay: 0.035, dur: 0.08, rot: 0,      range: 0,   dir: 0.8 },
    pistol:   { amp: 0.25, freq: 30, decay: 0.03,  dur: 0.07, rot: 0,      range: 0,   dir: 0.8 },
    shotgun:  { amp: 1.1,  freq: 22, decay: 0.06,  dur: 0.16, rot: 0.002,  range: 0,   dir: 0.9 },
    m40:      { amp: 1.3,  freq: 20, decay: 0.07,  dur: 0.18, rot: 0.002,  range: 0,   dir: 0.9 },   // M40 sniper
    m60:      { amp: 0.5,  freq: 30, decay: 0.05,  dur: 0.1,  rot: 0,      range: 0,   dir: 0.7 },   // per shot; bursts sum but are capped
    m79:      { amp: 0.6,  freq: 18, decay: 0.05,  dur: 0.12, rot: 0,      range: 0,   dir: 0.9 },   // launch thunk (impact = 'grenade')
    flame:    { amp: 0.4,  freq: 9,  decay: 0.25,  dur: 0.5,  rot: 0,      range: 0,   dir: 0.3 },   // low rumble while firing, refresh each tick
    knives:   { amp: 0,    freq: 1,  decay: 0.01,  dur: 0,    rot: 0,      range: 0,   dir: 0 },
    huey:     { amp: 0.3,  freq: 28, decay: 0.04,  dur: 0.08, rot: 0,      range: 260, dir: 0 },     // door M60s, off-camera source
    gunboat:  { amp: 0.6,  freq: 24, decay: 0.05,  dur: 0.12, rot: 0,      range: 320, dir: 0 },     // PBR twin .50
    spooky:   { amp: 0.7,  freq: 34, decay: 0.12,  dur: 0.3,  rot: 0,      range: 360, dir: 0 },     // minigun buzz: refresh while firing
    strafe:   { amp: 2.2,  freq: 26, decay: 0.09,  dur: 0.25, rot: 0.003,  range: 300, dir: 0.4 },   // 20mm walking hits (per hit group)
    tank:     { amp: 3.5,  freq: 16, decay: 0.09,  dur: 0.3,  rot: 0.004,  range: 420, dir: 0.8 },   // M48 90mm firing
    howitzer: { amp: 1.2,  freq: 11, decay: 0.12,  dur: 0.3,  rot: 0,      range: 900, dir: 0 },     // distant gun report (impact = 'artillery')
    mortar:   { amp: 0.6,  freq: 14, decay: 0.06,  dur: 0.15, rot: 0,      range: 500, dir: 0 },     // tube thump (impact = 'mortar')
    // enemy weapons (on the player)
    ak:       { amp: 0,    freq: 1,  decay: 0.01,  dur: 0,    rot: 0,      range: 0,   dir: 0 },
    b40:      { amp: 1.4,  freq: 18, decay: 0.06,  dur: 0.15, rot: 0,      range: 260, dir: 0.5 },   // launch backblast nearby
    cannon:   { amp: 3,    freq: 15, decay: 0.09,  dur: 0.3,  rot: 0.004,  range: 420, dir: 0.6 },   // PT-76 / T-54
    // explosions (matching explosions.js amp/duration)
    grenade:  { amp: 4,  freq: 19, decay: 0.10, dur: 0.22, rot: 0.004, range: 300,  dir: 0.5 },
    claymore: { amp: 3,  freq: 21, decay: 0.09, dur: 0.2,  rot: 0.003, range: 260,  dir: 0.8 },
    mortar_x: { amp: 7,  freq: 15, decay: 0.13, dur: 0.3,  rot: 0.006, range: 420,  dir: 0.4 },
    artillery:{ amp: 10, freq: 12, decay: 0.17, dur: 0.37, rot: 0.008, range: 560,  dir: 0.35 },
    vehicle:  { amp: 11, freq: 11, decay: 0.18, dur: 0.4,  rot: 0.009, range: 560,  dir: 0.3 },
    napalm:   { amp: 5,  freq: 7,  decay: 0.25, dur: 0.6,  rot: 0.004, range: 480,  dir: 0.2 },   // soft heavy whoomph, low freq
    arclight: { amp: 16, freq: 8,  decay: 0.24, dur: 0.52, rot: 0.012, range: 1100, dir: 0.2 },   // per bomb; a string stacks to the cap
    boxmission:{amp: 16, freq: 8,  decay: 0.24, dur: 0.52, rot: 0.012, range: 1100, dir: 0.2 },
    rumble:   { amp: 2.5, freq: 5, decay: 1.2,  dur: 3.0,  rot: 0.002, range: 0,    dir: 0 }      // Arc Light ground roll under the string
  };
  SHAKE.m1903 = SHAKE.m40;   // alias: index.html item id is m1903 (the M40 sniper rifle)
  SHAKE.rumble_box = { amp: 3.5, freq: 4, decay: 2.5, dur: 7.0, rot: 0.003, range: 0, dir: 0 };   // long Arc Light box roll
  var MAXAMP = 18;      // summed shake hard cap (art px) - beyond this it reads as a broken camera, not a bomb
  var KICK = {          // camera kick px (art px), spring time constant s
    m16: { px: 0.5, k: 0.05 }, grease: { px: 0.4, k: 0.05 }, pistol: { px: 0.4, k: 0.05 }, m60: { px: 0.6, k: 0.06 }, shotgun: { px: 2, k: 0.08 },
    m40: { px: 2.5, k: 0.09 }, m79: { px: 1.2, k: 0.08 }, tank: { px: 3, k: 0.12 }, b40: { px: 1.5, k: 0.1 },
    grenade: { px: 1.5, k: 0.1 }, claymore: { px: 2, k: 0.1 }, mortar_x: { px: 2.5, k: 0.12 }, artillery: { px: 3.5, k: 0.14 }, vehicle: { px: 4, k: 0.15 },
    napalm: { px: 2, k: 0.2 }, arclight: { px: 5, k: 0.2 }
  };
  // hit-stop seconds: realistic = very short and only on big events; kill = when the player personally kills / gets the kill shot
  var HITSTOP = { m40: { t: 0, kill: 0.035 }, shotgun: { t: 0, kill: 0.025 }, tank: { t: 0.02, kill: 0.03 }, grenade: { t: 0, kill: 0.02 },
    claymore: { t: 0.02, kill: 0.03 }, mortar_x: { t: 0.02, kill: 0.03 }, artillery: { t: 0.03, kill: 0.04 }, vehicle: { t: 0.05, kill: 0.06 },
    napalm: { t: 0.02, kill: 0.02 }, arclight: { t: 0.045, kill: 0.045 }, player_hit: { t: 0.04, kill: 0 } };
  KICK.m1903 = KICK.m40; HITSTOP.m1903 = HITSTOP.m40;
  var HITSTOP_MAX = 0.08;
  var WEAPON = { m16: 'm16', m16a1: 'm16', grease: 'grease', m3: 'grease', m1911: 'pistol', pistol: 'pistol', shotgun: 'shotgun', ithaca: 'shotgun',
    m1903: 'm40', m40: 'm40', sniper: 'm40', m60: 'm60', squad: 'm16', company: 'm16', m79: 'm79', claymore: 'claymore', flame: 'flame',
    napalm: 'napalm', mortar: 'mortar', howitzer: 'howitzer', gunboat: 'gunboat', huey: 'huey', strafe: 'strafe', tank: 'tank', arclight: 'arclight',
    boxmission: 'boxmission', spooky: 'spooky', knives: 'knives', medevac: null,
    ak: 'ak', ak47: 'ak', sks: 'ak', rpd: 'ak', rpg: 'b40', b40: 'b40', b41: 'b40', pt76: 'cannon', t54: 'cannon', enemy_cannon: 'cannon' };
  // what lands on the ground per event
  var RECIPE = {
    grenade:   { crater: 'crater_s', scorch: 0,  erupt: 0.55, debris: [['dirt', 16, 160], ['clod', 4, 130], ['chunk', 1, 110]] },
    claymore:  { crater: 0, scorch: 'scorch', erupt: 0.35, debris: [['dirt', 14, 180], ['clod', 2, 150]], fan: 1.1 },
    mortar_x:  { crater: 'crater_m', scorch: 0, erupt: 0.8, debris: [['dirt', 24, 200], ['clod', 5, 170], ['rock', 3, 170], ['chunk', 1, 140]] },
    artillery: { crater: 'crater_l', scorch: 0, erupt: 1, debris: [['dirt', 44, 240], ['clod', 7, 210], ['rock', 4, 210], ['wood', 3, 190], ['chunk', 2, 170]] },
    vehicle:   { crater: 'crater_m', scorch: 'scorch', erupt: 0.7, debris: [['metal', 14, 230], ['dirt', 16, 180], ['rock', 3, 160], ['chunk', 1, 130]] },
    napalm:    { crater: 0, scorch: 'scorch_napalm', erupt: 0, fire: 5, debris: [['dirt', 4, 90]] },
    arclight:  { crater: 'crater_xl', scorch: 0, erupt: 1.5, debris: [['dirt', 46, 290], ['clod', 10, 260], ['rock', 6, 260], ['wood', 5, 240], ['chunk', 3, 210]] },
    strafe:    { crater: 0, scorch: 0, erupt: 0.2, debris: [['dirt', 6, 120]] }
  };
  RECIPE.arclight_box = { crater: 'crater_xl', scorch: 0, erupt: 1.1, debris: [['dirt', 14, 280], ['clod', 5, 250], ['chunk', 1, 200]] };
  RECIPE.boxmission = RECIPE.arclight; RECIPE.mortar = RECIPE.mortar_x; RECIPE.howitzer = RECIPE.artillery; RECIPE.tank = RECIPE.vehicle; RECIPE.b40 = RECIPE.grenade; RECIPE.m79 = RECIPE.grenade;
  var XMAP = { arclight_box: 'arclight', mortar: 'mortar_x', howitzer: 'artillery', m79: 'grenade', b40: 'grenade', boxmission: 'arclight' };  // impact() key -> explosion shake key

  /* ---------------- utils ---------------- */
  var seedV = 1234567;
  function rnd() { seedV = (seedV + 0x6D2B79F5) >>> 0; var t = Math.imul(seedV ^ (seedV >>> 15), 1 | seedV); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function rng(seed) { var a = seed >>> 0 || 1; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function canvas(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // 1D smooth value noise (deterministic per seed) for shake: -1..1
  function vnoise(seed, x) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(h1(seed, i), h1(seed, i + 1), u); }
  function h1(s, i) { var h = Math.imul((s ^ Math.imul(i, 0x27d4eb2d)) >>> 0, 0x165667b1); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return ((h >>> 0) / 4294967296) * 2 - 1; }
  function cl(v) { return v > 1 ? 1 : v < -1 ? -1 : v; }
  function darken(hex, k) { var n = parseInt(hex.slice(1), 16); return 'rgb(' + (((n >> 16) & 255) * k | 0) + ',' + (((n >> 8) & 255) * k | 0) + ',' + ((n & 255) * k | 0) + ')'; }
  function lerp(a, b, u) { return a + (b - a) * u; }

  /* ---------------- shake / kick / hit-stop ---------------- */
  function sampleShake(key, t, seed, intensity, angle) {
    var S = SHAKE[key]; if (!S || t < 0 || t > S.dur || !S.amp) return { x: 0, y: 0, rot: 0 };
    var env = Math.exp(-t / S.decay) * (1 - t / S.dur), a = S.amp * (intensity == null ? 1 : intensity) * env, ph = t * S.freq, s = seed | 0;
    var nx = cl(vnoise(s, ph) * 1.7), ny = cl(vnoise(s + 7919, ph) * 1.7), x = nx * a, y = ny * a;
    if (S.dir && angle != null) { var c = Math.cos(angle), sn = Math.sin(angle), along = (nx * c + ny * sn) * a, perp = (-nx * sn + ny * c) * a * (1 - S.dir);
      x = c * along - sn * perp; y = sn * along + c * perp; }
    return { x: x, y: y * 0.8, rot: vnoise(s + 104729, ph * 0.7) * S.rot * env * (intensity == null ? 1 : intensity) };
  }
  var SHM = 12, SH = []; for (var i = 0; i < SHM; i++) SH.push({ on: false, key: '', t: 0, seed: 0, k: 1, a: null });
  function shake(key, opts) {
    var S = SHAKE[key]; if (!S || !S.amp) return null; opts = opts || {}; var k = opts.intensity == null ? 1 : opts.intensity, ang = opts.angle;
    if (S.range && opts.x != null && opts.cx != null) { var dx = opts.cx - opts.x, dy = opts.cy - opts.y, d = Math.sqrt(dx * dx + dy * dy); k *= Math.max(0, 1 - d / S.range); k *= k > 0 ? 1 : 0; if (ang == null && d > 0.01) ang = Math.atan2(dy, dx); }
    if (k <= 0.02) return null;
    var slot = null, weakest = null, wv = 1e9;
    for (var j = 0; j < SHM; j++) { var e = SH[j]; if (!e.on) { slot = e; break; } var v = SHAKE[e.key].amp * e.k * Math.exp(-e.t / SHAKE[e.key].decay); if (v < wv) { wv = v; weakest = e; } }
    if (!slot) { if (wv > S.amp * k) return null; slot = weakest; }
    slot.on = true; slot.key = key; slot.t = 0; slot.seed = (rnd() * 1e9) | 0; slot.k = k; slot.a = ang == null ? null : ang; return slot;
  }
  var KM = 6, KK = []; for (var i2 = 0; i2 < KM; i2++) KK.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, k: 0.1 });
  function kick(angle, key, opts) {
    var K = KICK[key]; if (!K) return null; opts = opts || {}; var px = K.px * (opts.intensity == null ? 1 : opts.intensity), slot = KK[0];
    for (var j = 0; j < KM; j++) if (!KK[j].on) { slot = KK[j]; break; }
    // impulse: start at 0 with velocity so it pushes out, then critically-damped return (peak ~ px)
    slot.on = true; slot.x = 0; slot.y = 0; slot.k = K.k; var v = px * Math.E / K.k; slot.vx = Math.cos(angle) * v; slot.vy = Math.sin(angle) * v * 0.8; return slot;
  }
  var stopT = 0, stopEase = 0;
  function hitStop(key, opts) { var H = HITSTOP[key]; if (!H) return 0; var t = opts && opts.kill ? H.kill : H.t; if (t > 0) { stopT = Math.min(HITSTOP_MAX, Math.max(stopT, t)); stopEase = 0.04; } return t; }
  function timeScale() { return stopT > 0 ? 0 : stopEase > 0 ? 1 - stopEase / 0.04 : 1; }
  function camera() {
    var x = 0, y = 0, r = 0;
    for (var j = 0; j < SHM; j++) { var e = SH[j]; if (!e.on) continue; var s = sampleShake(e.key, e.t, e.seed, e.k, e.a); x += s.x; y += s.y; r += s.rot; }
    var m = Math.sqrt(x * x + y * y); if (m > MAXAMP) { x *= MAXAMP / m; y *= MAXAMP / m; }
    for (var q = 0; q < KM; q++) if (KK[q].on) { x += KK[q].x; y += KK[q].y; }
    var m2 = Math.sqrt(x * x + y * y); if (m2 > MAXAMP) { x *= MAXAMP / m2; y *= MAXAMP / m2; }   // shake + kick together never exceed the cap
    return { x: Math.round(x), y: Math.round(y), rot: Math.max(-0.02, Math.min(0.02, r)) };
  }

  /* ---------------- pixel grids -> baked images ---------------- */
  // palette indices: 0 empty
  var PAL = [null, '#2a2418', '#3a3022', '#4c3e2a', '#62503a', '#7a6648', '#8e7a58', '#1a1c12', '#b08a3a', '#e0c070', '#6a4a20', '#8a3a28', '#c05a40', '#5a5a52', '#82827a', '#3e2a16', '#6e4a26', '#a07040', '#4a4630', '#665e40', '#f6e6a8', '#2e2216', '#55432c', '#735c3c', '#93795a', '#a08a6a', '#b0623e', '#8e4a2e', '#6c3622', '#46241a', '#7a5a34', '#5c4226', '#3c2a18', '#26190f', '#d6dad8', '#b4b9b8', '#8c9291', '#62686a'];
  var DEC = {   // decal kinds -> [w, h] art px, builder
    crater_s: [18, 14], crater_m: [28, 22], crater_l: [42, 32], crater_xl: [104, 78], crater_xl7: [73, 55], crater_xl13: [135, 101], scorch: [34, 26], scorch_napalm: [72, 26],
    brass_556: [4, 2], brass_762: [5, 2], brass_50: [7, 3], link_762: [3, 2], hull_12g: [4, 2],
    bit_dirt: [3, 3], bit_clod: [5, 4], bit_rock: [5, 4], bit_wood: [8, 3], bit_metal: [6, 4], bit_sandbag: [5, 4], bit_chunk: [10, 8]
  };
  var GRIDS = {};
  function gridFor(kind, v) {
    var key = kind + ':' + v; if (GRIDS[key]) return GRIDS[key];
    var sz = DEC[kind], w = sz[0], h = sz[1], g = new Uint8Array(w * h), r = rng(0x51ed ^ (kind.length * 977) ^ (v * 7919) ^ kind.charCodeAt(0) * 131 ^ kind.charCodeAt(kind.length - 1) * 17);
    var cx = (w - 1) / 2, cy = (h - 1) / 2;
    function put(x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h) g[y * w + x] = c; }
    if (kind.indexOf('crater') === 0) {
      var R = w / 2, pit = 0.42, lip = 0.62;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var dx = (x - cx) / (w / 2), dy = (y - cy) / (h / 2), a = Math.atan2(dy, dx), wob = 1 + 0.16 * Math.sin(a * 3 + v * 2) + 0.1 * Math.sin(a * 7 + v) + (r() - 0.5) * 0.12, d = Math.sqrt(dx * dx + dy * dy) / wob;
        if (d < pit) { var lit = dx + dy; put(x, y, d < pit * 0.5 ? 1 : lit < -0.15 ? 1 : lit > 0.2 ? 3 : 2); }                    // pit: far wall (top-left) in shade, near wall lit
        else if (d < lip) { var l2 = dx + dy; put(x, y, l2 < -0.1 ? 6 : l2 > 0.25 ? 3 : 5); }                                      // thrown-up lip: top-left catches light
        else if (d < 1) { if (r() < (1 - d) * 1.6) put(x, y, r() < 0.5 ? 2 : r() < 0.6 ? 4 : 3); }                               // ejecta blanket, broken
      }
      for (var k = 0; k < w * 0.6; k++) { var aa = r() * TAU, dd = 0.7 + r() * 0.35; put(Math.round(cx + Math.cos(aa) * dd * w / 2), Math.round(cy + Math.sin(aa) * dd * h / 2), r() < 0.5 ? 15 : 4); }  // clods
    } else if (kind.indexOf('scorch') === 0) {
      var nap = kind === 'scorch_napalm';
      for (var y2 = 0; y2 < h; y2++) for (var x2 = 0; x2 < w; x2++) {
        var ex = (x2 - cx) / (w / 2), ey = (y2 - cy) / (h / 2), a2 = Math.atan2(ey, ex), wb = 1 + 0.2 * Math.sin(a2 * 5 + v) + (r() - 0.5) * 0.25, d2 = Math.sqrt(ex * ex + ey * ey) / wb;
        if (d2 < 0.45) put(x2, y2, r() < 0.12 ? 18 : 1); else if (d2 < 0.8) put(x2, y2, r() < (0.85 - d2) * 2.4 ? (r() < 0.3 ? 1 : 2) : (r() < 0.3 ? 18 : 0)); else if (d2 < 1 && r() < 0.18) put(x2, y2, 2);
      }
      if (nap) for (var k2 = 0; k2 < 18; k2++) put((r() * w) | 0, (cy + (r() - 0.5) * h * 0.5) | 0, 19);   // unburnt grey ash flecks
    } else if (kind.indexOf('brass') === 0) { for (var x3 = 0; x3 < w; x3++) for (var y3 = 0; y3 < h; y3++) put(x3, y3, y3 === 0 ? (x3 > 0 && x3 < w - 2 ? 20 : 9) : y3 === h - 1 && h > 2 ? 10 : 8);
      put(w - 1, 0, 10); put(w - 1, h - 1, 10); if (kind === 'brass_556' || kind === 'brass_762') put(0, h - 1, 9); }
    else if (kind === 'canister') {   // BLU-27 style finless aluminium tank: rounded nose, lit top row, dark belly, filler band
      for (var cxx = 0; cxx < w; cxx++) for (var cyy = 0; cyy < h; cyy++) { var endc = (cxx === 0 || cxx === w - 1) && (cyy === 0 || cyy === h - 1); if (endc) continue;
        var nose = cxx < 2 || cxx > w - 3, c = cyy === 0 ? 35 : cyy === 1 ? (nose ? 35 : 34) : cyy < h - 2 ? 36 : 37; put(cxx, cyy, c); }   // vet E3: bare unpainted aluminium, no bands/markings
      put(1, 0, 37); put(w - 2, 0, 37); put(1, h - 1, 37); put(w - 2, h - 1, 37); }
    else if (kind === 'link_762') { put(0, 0, 13); put(1, 0, 14); put(2, 1, 13); put(0, 1, 13); }
    else if (kind === 'hull_12g') { put(0, 0, 9); put(0, 1, 8); put(1, 0, 12); put(2, 0, 12); put(3, 0, 12); put(1, 1, 11); put(2, 1, 11); put(3, 1, 11); }
    else if (kind.indexOf('bit_') === 0) {
      var cols = { bit_dirt: [27, 28, 29, 33], bit_clod: [26, 27, 28, 29], bit_chunk: [26, 27, 32, 33], bit_rock: [26, 27, 28, 29], bit_wood: [17, 16, 10, 15], bit_metal: [30, 31, 32, 33], bit_sandbag: [19, 18, 22, 21] }[kind];
      var nh = 5, rad = []; for (var hk = 0; hk < nh; hk++) rad.push(0.62 + r() * 0.45);
      var wood = kind === 'bit_wood', metal = kind === 'bit_metal';
      for (var y4 = 0; y4 < h; y4++) for (var x4 = 0; x4 < w; x4++) { var ex4 = (x4 - cx) / (w / 2), ey4 = (y4 - cy) / (h / 2), a4 = Math.atan2(ey4, ex4), d4 = Math.sqrt(ex4 * ex4 + ey4 * ey4);
        var fi = ((a4 + Math.PI) / TAU) * nh, i0 = Math.floor(fi) % nh, rr4 = lerp(rad[i0], rad[(i0 + 1) % nh], fi - Math.floor(fi));   // lumpy outline
        if (wood) rr4 = Math.abs(ey4) < 0.75 ? 1.05 - (Math.abs(ex4) > 0.8 ? r() * 0.5 : 0) : 0;
        if (metal) rr4 *= 0.75 + r() * 0.4;
        if (d4 > rr4 + 0.05) continue;
        var lit = -(ex4 + ey4) * 0.7 + (1 - d4 / (rr4 + 0.05)) * 0.35 + (r() - 0.5) * 0.25;   // light from top-left + a bit of volume
        put(x4, y4, lit > 0.45 ? cols[0] : lit > 0.05 ? cols[1] : lit > -0.35 ? cols[2] : cols[3]); }
      put(Math.round(cx), Math.round(cy), cols[1]);
      if (wood) for (var gx = 1; gx < w - 1; gx += 2) put(gx, 1, cols[2]);   // grain
    }
    var o = { w: w, h: h, g: g }; GRIDS[key] = o; return o;
  }
  var IMG = {}, IMGN = 0;
  function img(kind, v, sc, outline) {     // baked once per (kind, variant, integer scale)
    var key = kind + v + '@' + sc + 'o' + (outline | 0); var c = IMG[key]; if (c) return c;
    var G = gridFor(kind, v), pad = outline ? 1 : 0, cv = canvas((G.w + pad * 2) * sc, (G.h + pad * 2) * sc), x = cv.getContext('2d');
    if (outline) { x.fillStyle = '#1a1c12'; for (var yy = 0; yy < G.h; yy++) for (var xx = 0; xx < G.w; xx++) if (G.g[yy * G.w + xx]) x.fillRect(xx * sc, yy * sc, (2 + 1) * sc, (2 + 1) * sc); }
    for (var y = 0; y < G.h; y++) for (var xq = 0; xq < G.w; xq++) { var p = G.g[y * G.w + xq]; if (!p) continue; x.fillStyle = outline === 2 ? darken(PAL[p], 0.68) : PAL[p]; x.fillRect((xq + pad) * sc, (y + pad) * sc, sc, sc); }
    IMG[key] = cv; IMGN++; return cv;
  }
  // rotated decals: snap rotation to 8 directions baked per scale (rotate the GRID, not the canvas -> stays crisp)
  function rotGrid(kind, v, dir) {
    var key = kind + ':' + v + 'r' + dir; if (GRIDS[key]) return GRIDS[key]; var G = gridFor(kind, v); if (!dir) return G;
    var a = dir * TAU / 8, c = Math.cos(a), s = Math.sin(a), R = Math.ceil(Math.sqrt(G.w * G.w + G.h * G.h) / 2) + 1, N = R * 2, g = new Uint8Array(N * N), cx = (G.w - 1) / 2, cy = (G.h - 1) / 2;
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var dx = x - R + 0.5, dy = y - R + 0.5, sx = Math.round(c * dx + s * dy + cx), sy = Math.round(-s * dx + c * dy + cy); if (sx >= 0 && sy >= 0 && sx < G.w && sy < G.h) g[y * N + x] = G.g[sy * G.w + sx]; }
    var o = { w: N, h: N, g: g }; GRIDS[key] = o; return o;
  }
  function imgR(kind, v, dir, sc, outline) {
    if (!dir) return img(kind, v, sc, outline); var k2 = kind + '~' + dir; if (!DEC[k2]) { var G = rotGrid(kind, v, dir); DEC[k2] = [G.w, G.h]; GRIDS[k2 + ':' + v] = G; }
    if (!GRIDS[k2 + ':' + v]) GRIDS[k2 + ':' + v] = rotGrid(kind, v, dir); return img(k2, v, sc, outline);
  }

  /* ---------------- soft baked decals: craters, scorch, napalm (canvas gradients, baked once per kind/variant/dir/scale) ---------------- */
  var SOFT = { crater_xl7: 1, crater_xl13: 1, crater_s: 1, crater_m: 1, crater_l: 1, crater_xl: 1, scorch: 1, scorch_napalm: 1 }, SIMG = {};
  DEC.scorch = [36, 30]; DEC.scorch_napalm = [96, 36]; DEC.scorch_teardrop = [150, 64]; SOFT.scorch_teardrop = 1; DEC.canister = [26, 8];
  function rg(x, cx0, cy0, r0, stops) { var g = x.createRadialGradient(cx0, cy0, 0, cx0, cy0, Math.max(0.01, r0)); for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]); return g; }
  function blob(x, cx0, cy0, rx, ry, stops) { x.save(); x.translate(cx0, cy0); x.scale(1, ry / rx); x.fillStyle = rg(x, 0, 0, rx, stops); x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill(); x.restore(); }
  function px(x, X, Y, c, sz) { x.fillStyle = c; x.fillRect(Math.round(X), Math.round(Y), sz, sz); }
  function grassEdge(x, r, cx0, cy0, rx, ry, sc, n) {   // singed / burnt blades around the char edge, pointing outward
    for (var i = 0; i < n; i++) { var a = r() * TAU, d = 0.78 + r() * 0.3, X = cx0 + Math.cos(a) * rx * d, Y = cy0 + Math.sin(a) * ry * d, L = (1.5 + r() * 2.5) * sc;
      x.strokeStyle = ['#5c4a26', '#7a6534', '#3e3120', '#8c7a44', '#2e2618'][(r() * 5) | 0]; x.globalAlpha = 0.55 + r() * 0.4; x.lineWidth = Math.max(1, sc * 0.8);
      x.beginPath(); x.moveTo(X, Y); x.lineTo(X + Math.cos(a + (r() - 0.5) * 0.8) * L, Y + Math.sin(a + (r() - 0.5) * 0.8) * L * 0.8 - L * 0.3); x.stroke(); } x.globalAlpha = 1; }
  function ash(x, r, cx0, cy0, rx, ry, sc, n) { for (var i = 0; i < n; i++) { var a = r() * TAU, d = Math.sqrt(r()) * 0.75; x.globalAlpha = 0.5 + r() * 0.5; px(x, cx0 + Math.cos(a) * rx * d, cy0 + Math.sin(a) * ry * d, ['#8f8a80', '#b4ae a2'.replace(' ', ''), '#6e6a62', '#c8c2b4'][(r() * 4) | 0], Math.max(1, sc * (r() < 0.2 ? 2 : 1) * 0.5 + 0.5 | 0)); } x.globalAlpha = 1; }
  function soft(kind, v, dir, sc) {
    var key = kind + v + 'd' + dir + '@' + sc; if (SIMG[key]) return SIMG[key];
    var sz = DEC[kind], w = sz[0] * sc, h = sz[1] * sc, tear = kind === 'scorch_teardrop', nap = kind === 'scorch_napalm' || tear, S = nap ? Math.ceil(Math.sqrt(w * w + h * h)) + 2 * sc : Math.max(w, h) + 4 * sc;
    var cv = canvas(S, S), x = cv.getContext('2d'), r = rng(0xc0ffee ^ (v * 7919) ^ kind.length * 131 ^ dir * 17), c0 = S / 2;
    if (kind.indexOf('crater') === 0) {
      var rx = w / 2, ry = h / 2, pr = 0.5;
      // thrown soil blanket: broken ring of fresh dark-brown earth, denser near the rim, plus clods
      for (var i = 0; i < 40; i++) { var a = r() * TAU, d = 0.55 + r() * 0.45; blob(x, c0 + Math.cos(a) * rx * d, c0 + Math.sin(a) * ry * d, rx * (0.12 + r() * 0.16), ry * (0.12 + r() * 0.16), [[0, 'rgba(128,58,34,0.55)'], [1, 'rgba(128,58,34,0)']]); }
      // rim cast shadow on the ground (light from top-left -> shadow falls bottom-right outside the lip)
      blob(x, c0 + rx * 0.08, c0 + ry * 0.1, rx * 0.72, ry * 0.72, [[0.55, 'rgba(26,20,13,0.7)'], [0.8, 'rgba(26,20,13,0.35)'], [1, 'rgba(26,20,13,0)']]);
      // raised lip of turned soil, lit top-left
      blob(x, c0, c0, rx * 0.66, ry * 0.66, [[0.55, 'rgba(160,74,42,0.95)'], [0.82, 'rgba(126,58,34,0.9)'], [1, 'rgba(100,46,28,0)']]);
      blob(x, c0 - rx * 0.12, c0 - ry * 0.14, rx * 0.5, ry * 0.42, [[0.6, 'rgba(196,104,62,0)'], [0.85, 'rgba(196,104,62,0.55)'], [1, 'rgba(196,104,62,0)']]);
      // pit: deep, the top-left inner wall is in the rim's shadow, bottom-right wall catches light
      blob(x, c0, c0, rx * pr, ry * pr, [[0, 'rgba(22,17,11,1)'], [0.6, 'rgba(40,31,21,1)'], [0.92, 'rgba(70,55,38,1)'], [1, 'rgba(70,55,38,0)']]);
      blob(x, c0 + rx * 0.12, c0 + ry * 0.12, rx * pr * 0.75, ry * pr * 0.7, [[0, 'rgba(16,12,8,0.95)'], [1, 'rgba(16,12,8,0)']]);
      x.save(); x.beginPath(); x.ellipse(c0, c0, rx * pr, ry * pr, 0, 0, TAU); x.clip();
      blob(x, c0 + rx * 0.42, c0 + ry * 0.4, rx * 0.32, ry * 0.26, [[0, 'rgba(112,90,62,0.7)'], [1, 'rgba(112,90,62,0)']]); x.restore();
      // pixel clods of thrown soil, each with a lit top-left pixel and a shadow pixel
      for (var k = 0; k < 18 + w / sc; k++) { var a2 = r() * TAU, d2 = 0.58 + r() * 0.55, X = c0 + Math.cos(a2) * rx * d2, Y = c0 + Math.sin(a2) * ry * d2, z = (r() < 0.25 ? 2 : 1) * sc;
        px(x, X + sc, Y + sc, 'rgba(20,16,10,0.6)', z); px(x, X, Y, ['#8e4a2e', '#a8583a', '#5c2e1c'][(r() * 3) | 0], z); if (z > sc) px(x, X, Y, '#c47048', sc); }
    } else if (!nap) {
      var rx3 = w / 2, ry3 = h / 2;
      for (var j = 0; j < 7; j++) { var a3 = r() * TAU, d3 = r() * 0.25; blob(x, c0 + Math.cos(a3) * rx3 * d3, c0 + Math.sin(a3) * ry3 * d3, rx3 * (0.7 + r() * 0.3), ry3 * (0.7 + r() * 0.3), [[0, 'rgba(18,14,10,0.6)'], [0.5, 'rgba(34,27,18,0.4)'], [0.8, 'rgba(58,46,28,0.18)'], [1, 'rgba(58,46,28,0)']]); }
      grassEdge(x, r, c0, c0, rx3, ry3, sc, 50); ash(x, r, c0, c0, rx3, ry3, sc, 26);
    } else {
      // napalm: long splash-shaped burn along +x (direction of the run), rotated at bake time
      x.translate(c0, c0); x.rotate(dir * TAU / 8); var L = w / 2, H = h / 2;
      if (tear) {   // broad teardrop: narrow at the canister's impact point (-x), swelling forward along the flight path, ragged splashed head
        for (var tq = 0; tq < 22; tq++) { var tu = tq / 21, tx = -L * 0.92 + tu * L * 1.7, tw = H * Math.pow(Math.sin(Math.PI * Math.min(1, tu * 0.78 + 0.08)), 0.8) * (0.85 + r() * 0.3);
          blob(x, tx, (r() - 0.5) * tw * 0.4, L * 0.16 + tw * 0.4, tw, [[0, 'rgba(14,10,7,0.66)'], [0.5, 'rgba(28,20,13,0.45)'], [0.85, 'rgba(60,34,20,0.16)'], [1, 'rgba(60,34,20,0)']]); }
        for (var tb = 0; tb < 14; tb++) { var ta = r() * TAU, tdd = 0.6 + r() * 0.4; blob(x, L * 0.25 + Math.cos(ta) * L * 0.5 * tdd, Math.sin(ta) * H * 0.85 * tdd, L * (0.05 + r() * 0.07), H * (0.12 + r() * 0.12), [[0, 'rgba(18,13,9,0.55)'], [1, 'rgba(18,13,9,0)']]); }
      }
      for (var q = 0; q < (tear ? 0 : 12); q++) { var u = -L * 0.85 + q / 11 * L * 1.6, wd = H * (0.55 + 0.45 * Math.sin(Math.PI * (q / 11) * 0.9 + 0.2)) * (0.8 + r() * 0.35);
        blob(x, u, (r() - 0.5) * H * 0.3, L * 0.22, wd, [[0, 'rgba(16,12,8,0.62)'], [0.55, 'rgba(30,24,16,0.42)'], [0.85, 'rgba(56,44,26,0.15)'], [1, 'rgba(56,44,26,0)']]); }
      // splash fingers thrown forward at the head of the burn + droplets
      for (var f = 0; f < (tear ? 16 : 9); f++) { var fa = (r() - 0.5) * 1.6, fl = L * (0.25 + r() * 0.35), X0 = L * 0.55, Y0 = (r() - 0.5) * H * 0.6;
        var lg = x.createLinearGradient(X0, Y0, X0 + Math.cos(fa) * fl, Y0 + Math.sin(fa) * fl); lg.addColorStop(0, 'rgba(18,14,10,0.55)'); lg.addColorStop(1, 'rgba(18,14,10,0)');
        x.strokeStyle = lg; x.lineCap = 'round'; x.lineWidth = (1 + r() * 2.5) * sc; x.beginPath(); x.moveTo(X0, Y0); x.lineTo(X0 + Math.cos(fa) * fl, Y0 + Math.sin(fa) * fl); x.stroke();
        x.globalAlpha = 0.6; px(x, X0 + Math.cos(fa) * fl * (1.1 + r() * 0.3), Y0 + Math.sin(fa) * fl * 1.2, '#1c160e', sc * (r() < 0.4 ? 2 : 1)); x.globalAlpha = 1; }
      grassEdge(x, r, 0, 0, L * 0.95, H * 0.95, sc, tear ? 120 : 70); ash(x, r, 0, 0, L * 0.9, H * 0.8, sc, tear ? 90 : 50);
      // charred vegetation stubs: short black stems with a lit ash tip, some still glowing
      for (var st = 0; st < (tear ? 44 : 26); st++) { var sx0 = (r() - 0.5) * L * 1.7, sy0 = (r() - 0.5) * H * 1.2, sh2 = (2 + r() * 3) * sc;
        x.globalAlpha = 0.9; x.fillStyle = '#120e0a'; x.fillRect(Math.round(sx0), Math.round(sy0 - sh2), sc, sh2); x.fillStyle = r() < 0.25 ? '#a04418' : '#4a4038'; x.fillRect(Math.round(sx0), Math.round(sy0 - sh2), sc, sc);
        x.fillStyle = 'rgba(10,8,6,0.4)'; x.fillRect(Math.round(sx0 + sc), Math.round(sy0), sc * 2, sc); } x.globalAlpha = 1;
    }
    SIMG[key] = cv; IMGN++; return cv;
  }
  // soft dust/smoke puff (dithered-free radial), bucketed radii so the cache stays tiny
  var PB = [2, 3, 5, 7, 10, 14, 19, 26], PSH = [[58, 30, 20], [128, 58, 34], [170, 92, 58], [70, 64, 58], [214, 96, 26], [255, 214, 150], [22, 18, 14], [112, 38, 16], [96, 82, 66], [178, 66, 18], [255, 233, 160], [255, 122, 26], [138, 42, 8], [255, 140, 40]];   // 10 hot core #ffe9a0, 11 napalm body #ff7a1a, 12 red-brown edge #8a2a08, 13 ground glow (additive)   // dark wet laterite, rust-red soil, red dust, smoke grey, fire orange, fire core, oily black   // dark soil, soil, dry dust, smoke grey
  function puffImg(b, shd, sc) { var key = 'p' + b + 's' + shd + '@' + sc; if (SIMG[key]) return SIMG[key]; var R0 = PB[b] * sc, cv = canvas(R0 * 2 + 2, R0 * 2 + 2), x = cv.getContext('2d'), C = PSH[shd], r = rng(b * 31 + shd * 7 + sc);
    for (var i = 0; i < 4; i++) blob(x, R0 + 1 + (r() - 0.5) * R0 * 0.5, R0 + 1 + (r() - 0.5) * R0 * 0.5, R0 * (0.55 + r() * 0.35), R0 * (0.55 + r() * 0.35), [[0, 'rgba(' + C + ',0.85)'], [0.6, 'rgba(' + C + ',0.5)'], [1, 'rgba(' + C + ',0)']]);
    blob(x, R0 + 1 - R0 * 0.2, R0 + 1 - R0 * 0.25, R0 * 0.45, R0 * 0.4, [[0, 'rgba(' + [C[0] + 40, C[1] + 36, C[2] + 30] + ',0.25)'], [1, 'rgba(' + C + ',0)']]);   // sun side
    SIMG[key] = cv; IMGN++; return cv; }
  /* napalm flame sheet textures (art pass): soft licking flame tongues + ground fire bed + oily smoke, baked once per frame/heat/scale.
     Napalm fire puffs keep their approved positions, timing and sizes; only their look changes (no more round hard dots). */
  var NT_W = 40, NT_H = 52, NT_FR = 8;
  function napNoise(seed) { var r = rng(seed), G = []; for (var i = 0; i < 289; i++) G.push(r()); return function (x, y) { var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var g = function (a, b) { return G[(((a % 17) + 17) % 17) * 17 + (((b % 17) + 17) % 17)]; }; return (g(xi, yi) * (1 - fx) + g(xi + 1, yi) * fx) * (1 - fy) + (g(xi, yi + 1) * (1 - fx) + g(xi + 1, yi + 1) * fx) * fy; }; }
  var NZ1 = null, NZ2 = null;
  function fbm(n, x, y) { return n(x, y) * 0.5 + n(x * 2.03, y * 2.03) * 0.3 + n(x * 4.1, y * 4.1) * 0.2; }
  // heat ramp: transparent -> dark red-brown -> deep red-orange -> orange -> yellow -> white-yellow core
  var RAMP = [[0.0, [60, 18, 8]], [0.22, [96, 26, 8]], [0.4, [168, 48, 12]], [0.56, [232, 106, 24]], [0.72, [255, 168, 56]], [0.86, [255, 226, 140]], [1.0, [255, 250, 228]]];
  function ramp(T) { for (var i = 1; i < RAMP.length; i++) if (T <= RAMP[i][0]) { var a = RAMP[i - 1], b = RAMP[i], k = (T - a[0]) / (b[0] - a[0]); return [a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k, a[1][2] + (b[1][2] - a[1][2]) * k]; } return RAMP[RAMP.length - 1][1]; }
  function sstep(a, b, v) { v = Math.max(0, Math.min(1, (v - a) / (b - a))); return v * v * (3 - 2 * v); }
  // soft turbulent flame patch: fbm noise scrolled upward per frame (rolling, licking tongues at the top edge), heat-ramped, soft alpha edges
  function napTongue(fr, heat, sc) { sc = 1; var key = 'nt' + fr + 'h' + heat;   // baked once at 1x (soft texture; scaled up smoothly at draw)
    if (SIMG[key]) return SIMG[key];
    var W = NT_W * sc, H = NT_H * sc, cv = canvas(W, H), x = cv.getContext('2d');
    if (!x.createImageData) { blob(x, W / 2, H * 0.6, W * 0.4, H * 0.35, [[0, 'rgba(255,170,60,0.9)'], [1, 'rgba(160,40,10,0)']]); SIMG[key] = cv; IMGN++; return cv; }
    if (!NZ1) { NZ1 = napNoise(1337); NZ2 = napNoise(4711); }
    var id = x.createImageData(W, H), d = id.data, ph = fr / NT_FR, hb = [0.86, 1.08, 1.25][heat], off = heat * 5.3;
    for (var py = 0; py < H; py++) for (var px = 0; px < W; px++) { var u = (px / W - 0.5) * 2, v = py / H, nx = px / sc * 0.16 + off, ny = py / sc * 0.13 + ph * 2.6;
      var n = fbm(NZ1, nx, ny), n2 = fbm(NZ2, nx * 0.7 + 3, ny * 0.8), up = Math.max(0, 0.66 - v);
      var uu = u + (n2 - 0.5) * 0.9 * (up + 0.1), vv = v - 0.66, el = vv < 0 ? vv / (0.66 + (n2 - 0.5) * 0.7) : vv / 0.3, rr = Math.sqrt(uu * uu * (1 + up * 3.2) + el * el);
      var fall = 1 - sstep(0.4, 1.0, rr), D = fall * (0.64 + (n - 0.5) * (1.1 + up * 1.4)); if (D <= 0.05) continue;
      var T = Math.min(1, D * hb * (0.72 + 0.5 * v)), al = sstep(0.06, 0.34, D) * (0.55 + 0.45 * sstep(0.1, 0.5, T)), c = ramp(T), o = (py * W + px) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = Math.round(255 * Math.min(1, al)); }
    x.putImageData(id, 0, 0); SIMG[key] = cv; IMGN++; return cv; }
  function napBed(v, sc) { sc = 1; var key = 'nb' + v; if (SIMG[key]) return SIMG[key];   // wide, low, soft ground fire bed: fills gaps so the sheet is continuous
    var W = 48 * sc, H = 20 * sc, cv = canvas(W, H), x = cv.getContext('2d'), r = rng(911 + v * 37 + sc), i;
    blob(x, W / 2, H * 0.55, W * 0.48, H * 0.42, [[0, 'rgba(206,74,16,0.85)'], [0.6, 'rgba(150,40,10,0.55)'], [1, 'rgba(90,22,8,0)']]);
    for (i = 0; i < 9; i++) blob(x, W * (0.15 + r() * 0.7), H * (0.4 + r() * 0.3), W * (0.06 + r() * 0.09), H * (0.14 + r() * 0.12), [[0, 'rgba(255,' + (150 + (r() * 60 | 0)) + ',60,0.75)'], [1, 'rgba(240,110,30,0)']]);
    for (i = 0; i < 5; i++) blob(x, W * (0.12 + r() * 0.76), H * (0.3 + r() * 0.5), W * (0.05 + r() * 0.06), H * (0.1 + r() * 0.1), [[0, 'rgba(70,20,8,0.6)'], [1, 'rgba(70,20,8,0)']]);
    SIMG[key] = cv; IMGN++; return cv; }
  function napSmoke(b, v, sc) { sc = 1; var key = 'ns' + b + 'v' + v; if (SIMG[key]) return SIMG[key];   // dense black oily smoke: soft turbulent billow, no hard round edge
    var R0 = PB[b] * sc, S2 = R0 * 2 + 2, cv = canvas(S2, S2), x = cv.getContext('2d');
    if (!x.createImageData) { blob(x, R0 + 1, R0 + 1, R0, R0, [[0, 'rgba(16,13,11,0.8)'], [1, 'rgba(16,13,11,0)']]); SIMG[key] = cv; IMGN++; return cv; }
    if (!NZ1) { NZ1 = napNoise(1337); NZ2 = napNoise(4711); }
    var id = x.createImageData(S2, S2), d = id.data, f = 2.6 / R0 * sc, o0 = v * 7.7 + b * 3.1;
    for (var py = 0; py < S2; py++) for (var px = 0; px < S2; px++) { var u = (px - R0 - 1) / R0, w = (py - R0 - 1) / R0, n = fbm(NZ1, px / sc * f * 1.5 + o0, py / sc * f * 1.5 + o0), rr = Math.sqrt(u * u + w * w) + (n - 0.5) * 0.55;
      var al = (1 - sstep(0.25, 1.0, rr)) * (0.55 + n * 0.6); if (al <= 0.01) continue; var lit = Math.max(0, -u - w) * 0.5 * (1 - rr), o = (py * S2 + px) * 4;
      d[o] = 14 + lit * 60; d[o + 1] = 12 + lit * 46; d[o + 2] = 10 + lit * 34; d[o + 3] = Math.round(255 * Math.min(0.92, al)); }
    x.putImageData(id, 0, 0); SIMG[key] = cv; IMGN++; return cv; }
  var NAP_FIRE = { 9: 1, 10: 2, 11: 1, 12: 0 };   // puff shade -> tongue heat (2 hot core, 1 body, 0 red-brown edge)
  function drawNapFire(ctx, SX, SY, sc) {   // bed pass then tongue pass, all napalm fire puffs
    var pu, k, al, i;
    ctx.imageSmoothingEnabled = true;
    for (i = 0; i < UM; i++) { pu = U[i]; if (!pu.on || pu.t < 0 || !pu.nap || NAP_FIRE[pu.shd] == null) continue; k = pu.t / pu.life;
      al = pu.a * Math.min(1, pu.t * 30) * Math.pow(1 - k, 0.8); var bim = napBed((i & 3), sc), bw = pu.r * 3.2 * sc, bh = pu.r * 1.3 * sc;
      ctx.globalAlpha = al * 0.8; ctx.drawImage(bim, SX(pu.x) - bw / 2, SY(pu.y) - bh * 0.6, bw, bh); }
    for (i = 0; i < UM; i++) { pu = U[i]; if (!pu.on || pu.t < 0 || !pu.nap || NAP_FIRE[pu.shd] == null) continue; k = pu.t / pu.life;
      al = pu.a * Math.min(1, pu.t * 30) * Math.pow(1 - k, 0.8); var heat = NAP_FIRE[pu.shd]; if (heat === 1 && k > 0.55) heat = 0;   // cools as it ages
      var fr = ((Math.floor(pu.t * 14 + pu.ph * 7) % NT_FR) + NT_FR) % NT_FR, tim = napTongue(fr, heat, sc), tw = pu.r * 2.4 * sc * (1 + 0.06 * Math.sin(pu.t * 11 + pu.ph)), th = pu.r * (2.7 + 0.5 * Math.min(1, pu.t * 2.5)) * sc * (1 + 0.08 * Math.sin(pu.t * 17 + pu.ph * 3));
      var bx = SX(pu.x), by = SY(pu.y - pu.z * 0.5) + th * 0.36;
      ctx.globalAlpha = Math.min(1, al * 1.05);
      if (pu.fl) { ctx.save(); ctx.translate(bx, 0); ctx.scale(-1, 1); ctx.drawImage(tim, -tw / 2, by - th, tw, th); ctx.restore(); } else ctx.drawImage(tim, bx - tw / 2, by - th, tw, th);
      if (heat === 2) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al * 0.18; ctx.drawImage(tim, bx - tw / 2, by - th, tw, th); ctx.globalCompositeOperation = 'source-over'; } }
    ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; }
  var FIRE_SHD = { 4: 1, 7: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1 };
  function bucket(r0) { for (var i = 0; i < PB.length; i++) if (r0 <= PB[i] * 1.2) return i; return PB.length - 1; }
  // tiny pixel flames for lingering napalm patches (3 frames)
  function flameImg(fr, sc) { var key = 'fl' + fr + '@' + sc; if (SIMG[key]) return SIMG[key]; var W = 7, H = 11, cv = canvas(W * sc, H * sc), x = cv.getContext('2d'), r = rng(99 + fr * 13);
    for (var y = 0; y < H; y++) for (var xx = 0; xx < W; xx++) { var e = Math.abs(xx - 3 + Math.sin(y * 0.9 + fr * 2) * 0.8) / (3.4 * (y + 2) / (H + 1)), hgt = 1 - y / H; if (e > 1 || r() < hgt * 0.35) continue;
      x.fillStyle = e < 0.35 && y > 4 ? '#fff0b0' : e < 0.6 && y > 2 ? '#ffc040' : e < 0.85 ? '#f07a1c' : '#b03a10'; x.fillRect(xx * sc, y * sc, sc, sc); }
    SIMG[key] = cv; IMGN++; return cv; }

  /* ---------------- eruption: column puffs + fine grit; lingering fire patches ---------------- */
  var UM = 260, U = []; for (var iu = 0; iu < UM; iu++) U.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, d: 0, life: 1, r: 2, gr: 1, shd: 0, a: 1 });
  var GM = 900, GR = []; for (var ig = 0; ig < GM; ig++) GR.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, d: 0, c: 0 });
  var FM = 72, FI = []; for (var iff = 0; iff < FM; iff++) FI.push({ on: false, x: 0, y: 0, t: 0, life: 0, s: 0, ph: 0 });
  var uRing = 0, gRing = 0, fRing = 0;
  function slotOf(A, M, ring) { for (var j = 0; j < M; j++) { var e = A[(ring + j) % M]; if (!e.on) return e; } return A[ring % M]; }
  function puff(x, y, z, vx, vy, vz, delay, life, r0, grow, shd, a) { var e = slotOf(U, UM, uRing); uRing = (uRing + 1) % UM; e.on = true; e.x = x; e.y = y; e.z = z; e.vx = vx; e.vy = vy; e.vz = vz; e.t = -delay; e.life = life; e.r = r0; e.gr = grow; e.shd = shd; e.a = a; e.nap = 0; return e; }
  function eruption(x, y, size, opts) {
    size = size || 1; opts = opts || {}; var mud = opts.ground === 'paddy', sq = Math.sqrt(size), bs = opts.burst || 1;   // bs: optional size of the first 0.2 s burst (column + base)
    // vertical column t = 0..0.2 s: dark wet soil at the root, lighter dust as it climbs
    var nc = Math.round(16 * size); for (var i = 0; i < nc; i++) { var dl = rnd() * 0.2;
      puff(x + (rnd() - 0.5) * 6 * sq, y + (rnd() - 0.5) * 4 * sq, 0, (rnd() - 0.5) * 30 * sq, (rnd() - 0.5) * 20 * sq, (300 + rnd() * 320) * sq * (1 - dl * 2.5), dl, 0.9 + rnd() * 0.9, (7 + rnd() * 5) * sq * bs, (10 + rnd() * 12) * sq, mud ? 0 : dl < 0.1 ? 0 : rnd() < 0.7 ? 8 : 1, 0.9); }
    // column base: wide, dense, dark soil puffs that dominate the first 0.15 s, then thin out fast
    for (var bp = 0; bp < Math.round(9 * size); bp++) { var ba = rnd() * TAU, bd = rnd() * 7 * sq;
      puff(x + Math.cos(ba) * bd, y + Math.sin(ba) * bd * 0.7, 0, Math.cos(ba) * 40 * sq, Math.sin(ba) * 28 * sq, (40 + rnd() * 140) * sq, rnd() * 0.06, 0.45 + rnd() * 0.45, (10 + rnd() * 6) * sq * bs, (16 + rnd() * 10) * sq, mud ? 0 : rnd() < 0.7 ? 0 : 1, 1); }
    // grey-brown smoke/dust cap that lingers
    var ncap = Math.round((4 + rnd() * 5) * size); for (var c = 0; c < ncap; c++) { var cr = (2.5 + Math.pow(rnd(), 1.6) * 8) * sq, lobe = rnd() < 0.35;   // clustered lobes, uneven sizes and launch times
      puff(x + (rnd() - 0.5) * (lobe ? 28 : 12) * sq, y + (rnd() - 0.5) * 8 * sq, (4 + rnd() * 14) * sq, (rnd() - 0.5) * 30, (rnd() - 0.5) * 14, (40 + rnd() * 190) * sq, 0.03 + Math.pow(rnd(), 1.5) * 0.4, 1.6 + rnd() * 2.6, cr, (4 + rnd() * 12) * sq, mud ? 0 : rnd() < 0.6 ? 8 : rnd() < 0.5 ? 2 : 0, 0.45 + rnd() * 0.4); }
    // ground-hugging dust skirt
    for (var k = 0; k < Math.round(12 * size); k++) { var a = rnd() * TAU, sp = (60 + rnd() * 90) * sq; puff(x, y, 0, Math.cos(a) * sp, Math.sin(a) * sp * 0.75, 4 + rnd() * 10, 0.03 + rnd() * 0.12, 1.4 + rnd() * 1.2, 3 * sq, 8 * sq, mud ? 1 : 2, 0.6); }
    // fine particulate
    var ng = Math.round(140 * size); for (var g = 0; g < ng; g++) { var e = slotOf(GR, GM, gRing); gRing = (gRing + 1) % GM; var ga = rnd() * TAU, gs = (30 + rnd() * 170) * sq;
      e.on = true; e.x = x + (rnd() - 0.5) * 4; e.y = y + (rnd() - 0.5) * 3; e.z = 1; e.vx = Math.cos(ga) * gs * (rnd() < 0.6 ? 0.35 : 1); e.vy = Math.sin(ga) * gs * 0.7 * (rnd() < 0.6 ? 0.35 : 1); e.vz = (140 + rnd() * 360) * sq; e.t = -rnd() * 0.12; e.c = (rnd() * 3) | 0; }
    return nc;
  }
  function fireline(x, y, angle, n, len) { var ca = Math.cos(angle || 0), sa = Math.sin(angle || 0); for (var i = 0; i < n; i++) { var e = slotOf(FI, FM, fRing); fRing = (fRing + 1) % FM; var u = (rnd() - 0.5) * (len || 70), l = (rnd() - 0.5) * 14;
      e.on = true; e.x = x + ca * u - sa * l; e.y = y + sa * u + ca * l; e.t = 0; e.life = 6 + rnd() * 8; e.s = 0; e.ph = rnd() * 10; e.sz = 1; } }

  /* ---------------- scheduled strikes: Arc Light box, napalm canisters ---------------- */
  var QM = 200, Q = []; for (var iq = 0; iq < QM; iq++) Q.push({ on: false, t: 0, key: '', x: 0, y: 0, o: null });
  // napalm flame sheet: a long rolling wall drawn as overlapping baked segments along the path (pooled; sprites cached per variant/scale)
  var SM = 6, SHT = []; for (var is = 0; is < SM; is++) SHT.push({ on: false, x: 0, y: 0, a: 0, L: 0, W: 0, t: 0, seed: 0 });
  function sheetImg(kind, v, sc) {   // kind 0 = body segment, 1 = leading edge (tongues thrown forward)
    var key = 'sh' + kind + 'v' + v + '@' + sc; if (SIMG[key]) return SIMG[key];
    var W = 44 * sc, H = 32 * sc, cv = canvas(W, H), x = cv.getContext('2d'), r = rng(777 + kind * 101 + v * 13), cx0 = W * 0.45, cy0 = H / 2;
    // turbulent outer envelope: many small lobes, orange -> deep orange edge
    for (var i = 0; i < 26; i++) { var a = r() * TAU, d = r() * 0.55, lx = cx0 + Math.cos(a) * W * 0.32 * d + (kind ? W * 0.12 * r() : 0), ly = cy0 + Math.sin(a) * H * 0.36 * d;
      blob(x, lx, ly, W * (0.1 + r() * 0.14), H * (0.12 + r() * 0.16), [[0, 'rgba(232,110,28,0.95)'], [0.6, 'rgba(200,78,20,0.8)'], [1, 'rgba(160,50,14,0)']]); }
    if (kind) for (var t = 0; t < 7; t++) { var ty = cy0 + (r() - 0.5) * H * 0.75, tl = W * (0.2 + r() * 0.25), tx = W * 0.6;   // forward tongues
      for (var k = 0; k < 6; k++) { var u = k / 5; blob(x, tx + u * tl, ty + Math.sin(u * 4 + t) * H * 0.05, W * 0.06 * (1 - u * 0.6), H * 0.07 * (1 - u * 0.6), [[0, 'rgba(240,124,34,0.9)'], [1, 'rgba(200,70,16,0)']]); } }
    x.globalCompositeOperation = 'destination-in'; blob(x, cx0 + (kind ? W * 0.06 : 0), cy0, W * 0.5, H * 0.5, [[0, 'rgba(0,0,0,1)'], [0.65, 'rgba(0,0,0,0.9)'], [1, 'rgba(0,0,0,0)']]); x.globalCompositeOperation = 'source-over';
    // dark red-brown cores / soot streaks inside the flame
    for (var c = 0; c < 6; c++) blob(x, cx0 + (r() - 0.5) * W * 0.4, cy0 + (r() - 0.5) * H * 0.35, W * (0.06 + r() * 0.07), H * (0.07 + r() * 0.08), [[0, 'rgba(96,30,12,0.85)'], [0.7, 'rgba(120,40,14,0.4)'], [1, 'rgba(120,40,14,0)']]);
    // a few small hot flecks
    for (var h = 0; h < 5; h++) blob(x, cx0 + (r() - 0.3) * W * 0.4, cy0 + (r() - 0.5) * H * 0.3, W * 0.03, H * 0.04, [[0, 'rgba(255,214,140,0.8)'], [1, 'rgba(255,170,60,0)']]);
    SIMG[key] = cv; IMGN++; return cv; }
  function flameSheet(x, y, a, L, W) { var e = slotOf(SHT, SM, 0); e.on = true; e.x = x; e.y = y; e.a = a || 0; e.L = L || 150; e.W = W || 60; e.t = 0; e.seed = (rnd() * 1000) | 0; return e; }
  var SHEET_T = 0.5, SHEET_LIFE = 2.4;
  function drawSheet(ctx, e, SX, SY, sc) {
    var t = e.t, front = Math.min(1, t / SHEET_T), fe = 1 - Math.pow(1 - front, 2), N = 11, ca = Math.cos(e.a), sa = Math.sin(e.a);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    for (var i = 0; i < N; i++) { var f = i / (N - 1); if (f > fe + 0.02) break;
      var age = t - f * SHEET_T * 0.8, die = Math.max(0, Math.min(1, (SHEET_LIFE - age - f * 0.4) / 0.8)); if (die <= 0) continue;
      var lead = f > fe - 0.14, wv = 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, f * 0.8 + 0.15)), ww = e.W * wv * (0.9 + 0.12 * Math.sin(t * 9 + i * 1.7)), ll = e.L / N * 5.2;
      var v = ((e.seed + i * 7 + Math.floor(t * 8 + i * 0.37)) % 4 + 4) % 4, im = sheetImg(lead ? 1 : 0, v, sc), wx = e.x + ca * f * e.L, wy = e.y + sa * f * e.L, rise = Math.min(6, age * 4);
      ctx.globalAlpha = die * (lead ? 1 : 0.95); ctx.save(); ctx.translate(SX(wx), SY(wy - rise)); ctx.rotate(e.a + Math.sin(t * 5 + i) * 0.06);
      var sw = ll * sc * (lead ? 1.15 : 1), sh = ww * sc * 1.25; ctx.drawImage(im, -sw * 0.45, -sh / 2, sw, sh); ctx.restore(); }
    ctx.restore(); }
  var BX = 0, BY = 0;   // base transform offset captured per drawAll
  var CM = 8, CN = []; for (var ic = 0; ic < CM; ic++) CN.push({ on: false, x: 0, y: 0, z: 0, a: 0, sp: 0, t: 0, T: 0, tx: 0, ty: 0, o: null });
  function queue(delay, key, x, y, o) { var e = slotOf(Q, QM, 0); e.on = true; e.t = delay; e.key = key; e.x = x; e.y = y; e.o = o || null; return e; }
  // B-52 cell box: rows of 500/750 lb bombs walk along the long (h) axis; craters overlap. w x h in art px (default 120 x 240 ~ "1 x 2 km" at game scale).
  // w = extent along the bomb run (angle, default 0 = +x), h = across. Default 480 x 260 art px (~screen-wide at 1x). Crater size varies
  // 0.7 / 1 / 1.3x, and a few stray misses land outside the box. Returns the number of bombs queued.
  function arclightBox(x, y, w, h, opts) {
    opts = opts || {}; w = w || 480; h = h || 260; var ang = opts.angle || 0, ca = Math.cos(ang), sa = Math.sin(ang), rows = Math.max(3, Math.round(w / 40)), cols = Math.max(2, Math.round(h / 44)), n = 0, dur = opts.duration || 3.6;
    var KS = ['crater_xl7', 'crater_xl', 'crater_xl', 'crater_xl13'];
    function drop(u, l, tt) { queue(tt, 'arclight_box', x + ca * u - sa * l, y + sa * u + ca * l, { cx: opts.cx, cy: opts.cy, ground: opts.ground, crater: KS[(rnd() * 4) | 0] }); n++; }
    for (var r0 = 0; r0 < rows; r0++) for (var c = 0; c < cols; c++) { if (n >= QM - 12) break; drop((r0 / (rows - 1) - 0.5) * w + (rnd() - 0.5) * 30, ((c + 0.5) / cols - 0.5) * h + (rnd() - 0.5) * 30, r0 / (rows - 1) * dur + rnd() * 0.12); }
    var ns = opts.strays == null ? 3 + ((rnd() * 3) | 0) : opts.strays;
    for (var sI = 0; sI < ns && n < QM; sI++) { var side = rnd(), su, sl;
      if (side < 0.6) { su = (rnd() - 0.5) * w; sl = (rnd() < 0.5 ? -1 : 1) * h * (0.6 + rnd() * 0.35); } else { su = (rnd() < 0.5 ? -1 : 1) * w * (0.56 + rnd() * 0.15); sl = (rnd() - 0.5) * h; }
      drop(su, sl, (su / w + 0.5) * dur + rnd() * 0.2); }
    shake('rumble_box', { intensity: opts.cx != null ? Math.max(0.35, 1 - Math.hypot(opts.cx - x, opts.cy - y) / 1600) : 1 });
    return n;
  }
  // napalm: canister tumbles in along `angle`, bursts at (x,y); fireball rolls forward along the flight path
  function napalmDrop(x, y, angle, opts) {
    opts = opts || {}; var a = angle || 0, e = slotOf(CN, CM, 0), T = opts.fall || 0.35, sp = opts.speed || 240;
    e.on = true; e.a = a; e.sp = sp; e.T = T; e.t = 0; e.tx = x; e.ty = y; e.x = x - Math.cos(a) * sp * T; e.y = y - Math.sin(a) * sp * T; e.z = opts.z || 40; e.o = opts; return e;
  }
  function napalmBurst(x, y, a, o) {
    var ca = Math.cos(a), sa = Math.sin(a), L = 240, WS = 1.5, sh = o && o.cx != null ? shake('napalm', { x: x, y: y, cx: o.cx, cy: o.cy }) : shake('napalm', {}); if (sh) hitStop('napalm', {});
    decal('scorch_teardrop', x + ca * L * 0.3, y + sa * L * 0.3, { angle: a }); decal('scorch_teardrop', x + ca * L * 0.68, y + sa * L * 0.68, { angle: a });
    // jr rev 3 (Art Director final): sheet 2x longer (240 px) and 1.5x wider along the flight line, hot #ffe9a0 spine, strong #8a2a08 edges,
    // one brief mild additive ground bloom (~0.1 s), ~120 puffs per canister (pool 260). Drawn above bamboo/canopy by the game (debris layer).
    // perf (rc8, optional): MED/LOW/Deck tier (window.LCO_QUALITY.t) keeps every 2nd puff (~60 per canister) at 1.2x radius so the sheet still reads filled; HIGH = all ~121
    var QT = (typeof window !== 'undefined' && window.LCO_QUALITY && window.LCO_QUALITY.t) || 'high', PK = 0, PCUT = QT !== 'high' && !(typeof location !== 'undefined' && /[?&]napcap=0\b/.test(location.search));
    var P = function (u, l, z, fwd, lat, vz, dl, life, r0, grow, shd, al) { if (PCUT) { if ((PK++ & 1) && PK > 1) return; r0 *= 1.2; } var pe = puff(x + ca * u - sa * l, y + sa * u + ca * l, z, ca * fwd - sa * lat, sa * fwd + ca * lat, vz, dl, life, r0, grow, shd, al); pe.nap = 1; pe.ph = rnd() * 6; pe.fl = rnd() < 0.5 ? 1 : 0; };
    var i, f, u, l, w, D = 0.36;   // D: time for the front to roll the length of the sheet
    P(L * 0.35, 0, 0, 0, 0, 0, 0, 0.12, 34, 10, 13, 0.22);   // brief ground bloom, isolated and mild
    for (i = 0; i < 34; i++) { f = Math.pow(rnd(), 0.85); u = f * L * 0.88; w = (8 + f * 22) * WS; l = (rnd() - 0.5) * 2 * w * (0.45 + rnd() * 0.5);   // orange body
      P(u, l, 2 + rnd() * 4, 30 + rnd() * 50, (rnd() - 0.5) * 16, 10 + rnd() * 20, f * D, 0.9 + rnd() * 0.7, 9 + rnd() * 6, 7 + rnd() * 6, 11, 0.7 + rnd() * 0.25); }
    for (i = 0; i < 20; i++) { f = rnd(); u = f * L * 0.92; w = (10 + f * 24) * WS; l = (rnd() < 0.5 ? -1 : 1) * w * (0.8 + rnd() * 0.3);   // strong red-brown edges
      P(u, l, 1 + rnd() * 3, 20 + rnd() * 30, l * 0.3, 6 + rnd() * 10, f * D + 0.03, 1.2 + rnd() * 0.9, 8 + rnd() * 5, 6 + rnd() * 4, 12, 0.8 + rnd() * 0.18); }
    for (i = 0; i < 14; i++) { f = (i + rnd()) / 14; u = f * L * 0.85; l = (rnd() - 0.5) * 8;   // hot spine along the flight line
      P(u, l, 4 + rnd() * 3, 40 + rnd() * 40, 0, 15 + rnd() * 15, f * D + rnd() * 0.04, 0.35 + rnd() * 0.35, 4 + rnd() * 3, 4, 10, 0.7 + rnd() * 0.3); }
    for (var tI = 0; tI < 6; tI++) { var tl = (rnd() - 0.5) * 70, reach = L * (0.95 + rnd() * 0.22), t0 = D * 0.6 + rnd() * 0.1;   // ragged rolling front
      for (i = 0; i < 4; i++) { f = i / 3; u = L * 0.8 + (reach - L * 0.8) * f; var tip = i === 3;
        P(u, tl + (rnd() - 0.5) * 6, 3 + f * 6 + (tip ? 4 : 0), 70 + f * 80 + rnd() * 30, (rnd() - 0.5) * 20, 20 + f * 30, t0 + f * 0.18, 0.55 + rnd() * 0.35 - f * 0.1, 7 - f * 3 + rnd() * 2, 5, tip ? 10 : i === 2 ? 9 : 11, 0.8 + rnd() * 0.2); } }
    for (i = 0; i < 6; i++) { f = (i + 0.5) / 6; P(f * L * 0.9, 0, 0, 20, 0, 0, f * D * 0.8, 1.8 + rnd() * 0.6, 20 + f * 6, 4, 13, 0.14 + rnd() * 0.05); }   // faint ~20 px glow
    for (i = 0; i < 30; i++) { f = rnd() * 0.8; u = f * L; l = (rnd() - 0.5) * (16 + f * 34) * WS;   // vet E2: thick black oily smoke column builds from ~0.4-0.6 s and dominates the sheet by 1.5-3 s
      P(u, l, 8 + rnd() * 10, 8 + rnd() * 16, (rnd() - 0.5) * 10, 30 + rnd() * 45, 0.4 + Math.pow(rnd(), 1.3) * 0.9, 3.6 + rnd() * 2.4, 10 + rnd() * 7, 13 + rnd() * 8, 6, 0.86 + rnd() * 0.12); }
    var np = 16 + ((rnd() * 6) | 0); for (var p2 = 0; p2 < np; p2++) { var fe = slotOf(FI, FM, fRing); fRing = (fRing + 1) % FM; var f3 = rnd(), w3 = (6 + f3 * 26) * WS, u3 = f3 * L * 0.95, l3 = (rnd() - 0.5) * 2 * w3 * 0.7;
      fe.on = true; fe.x = x + ca * u3 - sa * l3; fe.y = y + sa * u3 + ca * l3; fe.t = -rnd() * 0.6; fe.life = 8 + rnd() * 16; fe.s = rnd() * 0.4; fe.ph = rnd() * 10; fe.sz = rnd() < 0.3 ? 2 : rnd() < 0.6 ? 1.5 : 1; }
    debris('dirt', x, y, 4, 90);
  }

  /* ---------------- decals ---------------- */
  var DM = 320, D = []; for (var i3 = 0; i3 < DM; i3++) D.push({ on: false, kind: '', x: 0, y: 0, v: 0, dir: 0, t: 0, life: 0, pri: 0 });
  var LIFE = { scorch_teardrop: 150, crater_xl7: 240, crater_xl13: 240, crater_s: 120, crater_m: 150, crater_l: 180, crater_xl: 240, scorch: 90, scorch_napalm: 120, brass_556: 30, brass_762: 30, brass_50: 35, link_762: 30, hull_12g: 35 };
  var PRI = { scorch_teardrop: 4, crater_xl: 5, crater_xl7: 5, crater_xl13: 5, crater_l: 4, crater_m: 3, scorch_napalm: 3, crater_s: 2, scorch: 2 };
  var dRing = 0;
  function decal(kind, x, y, opts) {
    if (!DEC[kind]) return null; opts = opts || {}; var slot = null, oldest = null, ov = -1, pr = PRI[kind] || 0;
    for (var j = 0; j < DM; j++) { var e = D[(dRing + j) % DM]; if (!e.on) { slot = e; break; } var age = e.t / e.life - e.pri * 0.2; if (age > ov) { ov = age; oldest = e; } }
    if (!slot) slot = oldest; dRing = (dRing + 1) % DM;
    var ang = opts.angle == null ? rnd() * TAU : opts.angle;
    slot.on = true; slot.kind = kind; slot.x = Math.round(x); slot.y = Math.round(y); slot.v = opts.variant == null ? (rnd() * 3) | 0 : opts.variant; slot.t = 0;
    slot.dir = /^(scorch_napalm|scorch_teardrop|brass|link|hull|bit)/.test(kind) ? (((Math.round(ang / (TAU / 8)) % 8) + 8) % 8) : 0;   // craters stay axis-aligned (light direction)
    slot.life = opts.life || LIFE[kind] || 20; slot.pri = pr; return slot;
  }

  /* ---------------- debris (incl. brass in flight) ---------------- */
  var BM = 420, B = []; for (var i4 = 0; i4 < BM; i4++) B.push({ on: false, kind: '', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, rest: 0, v: 0, dir: 0, spin: 0, bounce: 0 });
  var DEB = {   // kind -> sprite, bounce, friction, settle decal life
    dirt: { s: 'bit_dirt', e: 0.15, f: 0.4, keep: 8 }, clod: { s: 'bit_clod', e: 0.25, f: 0.5, keep: 20 }, rock: { s: 'bit_rock', e: 0.4, f: 0.6, keep: 30 },
    wood: { s: 'bit_wood', e: 0.3, f: 0.5, keep: 30 }, metal: { s: 'bit_metal', e: 0.45, f: 0.7, keep: 40 }, sandbag: { s: 'bit_sandbag', e: 0.1, f: 0.3, keep: 25 }, chunk: { s: 'bit_chunk', e: 0.2, f: 0.4, keep: 45, heavy: 1 },
    brass_556: { s: 'brass_556', e: 0.45, f: 0.6, keep: 30, brass: 1 }, brass_762: { s: 'brass_762', e: 0.45, f: 0.6, keep: 30, brass: 1 }, brass_50: { s: 'brass_50', e: 0.4, f: 0.6, keep: 35, brass: 1 },
    link_762: { s: 'link_762', e: 0.3, f: 0.5, keep: 30, brass: 1 }, hull_12g: { s: 'hull_12g', e: 0.35, f: 0.5, keep: 35, brass: 1 }
  };
  var bRing = 0;
  function bslot() { for (var j = 0; j < BM; j++) { var e = B[(bRing + j) % BM]; if (!e.on) { bRing = (bRing + j + 1) % BM; return e; } } var o = B[bRing]; bRing = (bRing + 1) % BM; return o; }
  var GRAV = 520;   // art px/s^2 on z (chunks read heavy, not floaty)
  function debris(kind, x, y, n, power, opts) {
    var K = DEB[kind]; if (!K) return 0; opts = opts || {}; power = power || 160; var base = opts.angle || 0, spr = opts.spread == null ? TAU : opts.spread;
    for (var i = 0; i < (n | 0); i++) { var e = bslot(), a = base + (rnd() - 0.5) * spr, sp = power * (0.35 + rnd() * 0.75) * (K.heavy ? 0.55 : 1);
      e.on = true; e.kind = kind; e.x = x + (rnd() - 0.5) * 4; e.y = y + (rnd() - 0.5) * 3; e.z = opts.z || 1 + rnd() * 3; e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp * 0.75;
      e.vz = power * (0.6 + rnd() * 0.9) * (K.heavy ? 0.7 : 1) * (opts.z ? 1 : 1.25); e.t = 0; e.rest = 0; e.v = (rnd() * 2) | 0; e.dir = ((rnd() * 4) | 0) * 2; e.spin = (rnd() < 0.5 ? -1 : 1) * (8 + rnd() * 14); e.bounce = 0; }
    return n | 0;
  }
  var BRASS = { m16: 'brass_556', grease: 'brass_762', pistol: 'brass_762', m60: 'brass_762', m1903: 'brass_762', m40: 'brass_762', gunboat: 'brass_50', huey: 'brass_762', shotgun: 'hull_12g' };
  function brass(type, x, y, angle, opts) {    // type = brass kind or weapon id; ejects to the right of the heading
    var k = DEB[type] ? type : BRASS[type]; if (!k) return null; var e = bslot(), a = (angle || 0) + Math.PI / 2 + (rnd() - 0.5) * 0.6, sp = 40 + rnd() * 30;
    e.on = true; e.kind = k; e.x = x; e.y = y; e.z = (opts && opts.z) || 8; e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp * 0.75; e.vz = 50 + rnd() * 40; e.t = 0; e.rest = 0; e.v = 0; e.dir = (rnd() * 8) | 0; e.spin = 30 + rnd() * 20; e.bounce = 0;
    if (k === 'brass_762' && type === 'm60' && rnd() < 0.5) { var l = bslot(); for (var q in e) l[q] = e[q]; l.kind = 'link_762'; l.vx *= 0.7; l.vz *= 0.8; }
    return e;
  }

  /* ---------------- recipes ---------------- */
  function forRadius(rad) { if (root.VFX_EXPLOSIONS && root.VFX_EXPLOSIONS.forRadius) return root.VFX_EXPLOSIONS.forRadius(rad); return rad < 56 ? 'grenade' : rad < 80 ? 'mortar' : rad < 96 ? 'artillery' : rad < 130 ? 'vehicle' : 'arclight'; }
  function impact(key, x, y, opts) {
    if (typeof key === 'number') key = forRadius(key); if (key === 'mortar') key = 'mortar_x'; opts = opts || {};
    var sk = XMAP[key] || key, R = RECIPE[key] || RECIPE[sk]; if (!R && !SHAKE[sk]) return null;
    var cam = opts.cx != null ? { x: x, y: y, cx: opts.cx, cy: opts.cy, intensity: opts.intensity } : { intensity: opts.intensity };
    var s = shake(sk, cam);
    if (KICK[sk] && s) { var ka = opts.cx != null ? Math.atan2(opts.cy - y, opts.cx - x) : (opts.angle || rnd() * TAU); kick(ka, sk, { intensity: s.k }); }
    if (sk === 'arclight') shake('rumble', { intensity: s ? s.k : 0 });
    if (s && key !== 'arclight_box') hitStop(sk, { kill: opts.kill });   // a box of 30+ bombs must not chain freezes
    if (R) { var paddy = opts.ground === 'paddy', road = opts.ground === 'road';
      if (R.crater && !paddy) decal(opts.crater || R.crater, x, y); else if (R.crater && paddy) decal('scorch', x, y, { life: 20 });   // paddy water fills the hole: just a dark muddy stain
      if (R.scorch) decal(R.scorch, x, y, { angle: opts.angle });
      if (R.erupt) eruption(x, y, R.erupt * (paddy ? 0.7 : 1), { ground: opts.ground }); if (R.fire) fireline(x, y, opts.angle || 0, R.fire, 70);
      for (var i = 0; i < R.debris.length; i++) { var d = R.debris[i], kind = road && d[0] === 'clod' ? 'rock' : d[0];
        debris(kind, x, y, paddy ? Math.ceil(d[1] * 0.4) : d[1], d[2], R.fan ? { angle: opts.angle || 0, spread: R.fan } : null); } }
    return { shake: s, key: sk };
  }

  /* ---------------- update / draw ---------------- */
  function update(dt) {
    if (!(dt > 0)) return; if (dt > 0.1) dt = 0.1;
    if (stopT > 0) { stopT -= dt; } else if (stopEase > 0) stopEase = Math.max(0, stopEase - dt);
    var gdt = dt * timeScale();    // world motion freezes during hit-stop; camera shake keeps running (reads as impact, not a lag spike)
    for (var j = 0; j < SHM; j++) { var e = SH[j]; if (e.on && (e.t += dt) > SHAKE[e.key].dur) e.on = false; }
    for (var q = 0; q < KM; q++) { var k = KK[q]; if (!k.on) continue; var w = 1 / k.k; // critically damped spring to 0
      var ax = -w * w * k.x - 2 * w * k.vx, ay = -w * w * k.y - 2 * w * k.vy; k.vx += ax * dt; k.vy += ay * dt; k.x += k.vx * dt; k.y += k.vy * dt;
      if (Math.abs(k.x) + Math.abs(k.y) < 0.02 && Math.abs(k.vx) + Math.abs(k.vy) < 0.5) k.on = false; }
    for (var qi = 0; qi < QM; qi++) { var qe = Q[qi]; if (!qe.on) continue; qe.t -= dt; if (qe.t <= 0) { qe.on = false; impact(qe.key, qe.x, qe.y, qe.o || {}); } }
    for (var si = 0; si < SM; si++) { var se = SHT[si]; if (se.on && (se.t += gdt) > SHEET_LIFE + 1.2) se.on = false; }
    for (var ci = 0; ci < CM; ci++) { var cn = CN[ci]; if (!cn.on) continue; cn.t += gdt; var cf = Math.min(1, cn.t / cn.T); cn.x = cn.tx - Math.cos(cn.a) * cn.sp * cn.T * (1 - cf); cn.y = cn.ty - Math.sin(cn.a) * cn.sp * cn.T * (1 - cf);
      cn.z = (cn.o.z || 40) * (1 - cf * cf); if (cf >= 1) { cn.on = false; napalmBurst(cn.tx, cn.ty, cn.a, cn.o); } }
    for (var u = 0; u < UM; u++) { var pu = U[u]; if (!pu.on) continue; pu.t += gdt; if (pu.t < 0) continue; if (pu.t > pu.life) { pu.on = false; continue; }
      pu.vz -= 60 * gdt; pu.vz *= 1 - 2.2 * gdt; pu.vx *= 1 - 1.6 * gdt; pu.vy *= 1 - 1.6 * gdt; pu.x += (pu.vx + 4) * gdt; pu.y += (pu.vy - 1) * gdt; pu.z = Math.max(0, pu.z + pu.vz * gdt); pu.r += pu.gr * gdt * (1 - pu.t / pu.life); }
    for (var gq = 0; gq < GM; gq++) { var gp = GR[gq]; if (!gp.on) continue; gp.t += gdt; if (gp.t < 0) continue; gp.vz -= GRAV * gdt; gp.vx *= 1 - 0.8 * gdt; gp.vy *= 1 - 0.8 * gdt; gp.x += gp.vx * gdt; gp.y += gp.vy * gdt; gp.z += gp.vz * gdt; if (gp.z <= 0 || gp.t > 3) gp.on = false; }
    for (var fq = 0; fq < FM; fq++) { var fp = FI[fq]; if (!fp.on) continue; fp.t += gdt; if (fp.t < 0) continue; if (fp.t > fp.life) { fp.on = false; continue; } fp.s += gdt;
      if (fp.s > 0.45) { fp.s = 0; puff(fp.x + (rnd() - 0.5) * 3, fp.y, 6, (rnd() - 0.5) * 6, -2, 30 + rnd() * 20, 0, 2 + rnd() * 1.5, 2, 6, 3, 0.5 * Math.min(1, (fp.life - fp.t) / 2)); } }
    for (var d = 0; d < DM; d++) { var dc = D[d]; if (dc.on && (dc.t += dt) >= dc.life) dc.on = false; }
    for (var b = 0; b < BM; b++) { var p = B[b]; if (!p.on) continue; p.t += gdt; var K = DEB[p.kind];
      if (p.rest) { if ((p.rest += gdt) > 0.25) { decal(K.brass ? p.kind : DEB[p.kind].s, p.x, p.y, { angle: p.dir * TAU / 8, life: K.keep, variant: p.v }); p.on = false; } continue; }
      p.vz -= GRAV * gdt; p.x += p.vx * gdt; p.y += p.vy * gdt; p.z += p.vz * gdt;
      if (p.z <= 0) { p.z = 0; if (p.vz < -40 && p.bounce < 3) { p.vz = -p.vz * K.e; p.vx *= K.f; p.vy *= K.f; p.bounce++; } else { p.vz = 0; p.vx *= 0.3; p.vy *= 0.3; if (Math.abs(p.vx) + Math.abs(p.vy) < 6) p.rest = 0.001; } }
      if (p.t > 6) p.rest = 0.001; }
  }
  function drawAll(ctx, camX, camY, scale, layer) {
    var sc = Math.max(1, Math.round(scale || 1)), L = layer || 'all', cx = camX || 0, cy = camY || 0;
    var pA = ctx.globalAlpha, pC = ctx.globalCompositeOperation, pS = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'source-over';
    function SX(x) { return Math.round((x - cx) * sc); } function SY(y) { return Math.round((y - cy) * sc); }
    if (L !== 'debris') {   // ground decals: big & old first so fresh small stuff (brass) sits on top
      for (var pass = 5; pass >= 0; pass--) for (var d = 0; d < DM; d++) { var q = D[d]; if (!q.on || q.pri !== pass) continue;
        var im = SOFT[q.kind] ? soft(q.kind, q.v, (q.kind === 'scorch_napalm' || q.kind === 'scorch_teardrop') ? q.dir : 0, sc) : imgR(q.kind, q.v, q.dir, sc, false), fade = q.t > q.life - 6 ? Math.max(0, (q.life - q.t) / 6) : 1, fin = q.kind === 'scorch_teardrop' ? Math.min(1, q.t * 0.9) : Math.min(1, q.t * 8 + 0.3);
        ctx.globalAlpha = (q.kind.indexOf('scorch') === 0 ? 0.9 : 1) * fade * fin;
        if (SOFT[q.kind]) ctx.drawImage(im, SX(q.x) - (im.width >> 1), SY(q.y) - (im.height >> 1)); else ctx.drawImage(im, SX(q.x) - ((im.width / sc) >> 1) * sc, SY(q.y) - ((im.height / sc) >> 1) * sc); }
      // brass glint: a 1px highlight blinks on fresh casings (top-left light)
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff2b0';
      for (var g = 0; g < DM; g++) { var c2 = D[g]; if (!c2.on || c2.kind.indexOf('brass') !== 0 || c2.t > 6) continue; var gl = ((c2.t * 2.5 + c2.x * 0.37) % 2.2); if (gl < 0.16) { var GX = SX(c2.x) - sc, GY = SY(c2.y) - sc; ctx.globalAlpha = 1 - gl / 0.16; ctx.fillRect(GX, GY, sc, sc); ctx.globalAlpha *= 0.55; ctx.fillRect(GX - sc, GY, sc, sc); ctx.fillRect(GX + sc, GY, sc, sc); ctx.fillRect(GX, GY - sc, sc, sc); ctx.fillRect(GX, GY + sc, sc, sc); ctx.globalAlpha = 1; } }
    }
    if (L !== 'ground') {
      ctx.fillStyle = '#1a1c12';
      for (var s = 0; s < BM; s++) { var p = B[s]; if (!p.on || p.z < 0.5) continue; var sh = Math.max(1, Math.round((DEB[p.kind].brass ? 1 : 2) - p.z / 60)); ctx.globalAlpha = Math.max(0.15, 0.45 - p.z / 200); ctx.fillRect(SX(p.x) - sh * sc / 2 | 0, SY(p.y) | 0, sh * sc, Math.max(1, sh >> 1) * sc); }
      ctx.globalAlpha = 1;
      for (var f = 0; f < FM; f++) { var fp = FI[f]; if (!fp.on || fp.t < 0) continue; var fk = Math.min(1, (fp.life - fp.t) / 2.5, fp.t * 4), fim = flameImg(((fp.t * 9 + fp.ph) | 0) % 3, sc);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * fk; var gim = puffImg(3, 2, sc); ctx.drawImage(gim, SX(fp.x) - (gim.width >> 1), SY(fp.y) - (gim.height >> 1)); ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fk; var fsc = (fk < 0.6 ? 0.6 : 1) * (fp.sz || 1); ctx.drawImage(fim, SX(fp.x) - ((fim.width * fsc) >> 1), SY(fp.y) - Math.round(fim.height * fsc), Math.round(fim.width * fsc), Math.round(fim.height * fsc)); }
      for (var g2 = 0; g2 < GM; g2++) { var gp = GR[g2]; if (!gp.on || gp.t < 0) continue; ctx.globalAlpha = 1; ctx.fillStyle = gp.z < 8 ? '#2a2016' : ['#6c3622', '#5c4226', '#8e4a2e'][gp.c];
        var gsx = SX(gp.x), gsy = SY(gp.y - gp.z); ctx.fillRect(gsx, gsy, sc, sc); var gv = Math.abs(gp.vz) + Math.abs(gp.vx); if (gv > 200) { ctx.globalAlpha = 0.45; ctx.fillRect(gsx - Math.round(gp.vx * 0.012) * sc, gsy + Math.round(gp.vz * 0.012) * sc, sc, sc); } }
      ctx.globalAlpha = 1;
      for (var si2 = 0; si2 < SM; si2++) if (SHT[si2].on) drawSheet(ctx, SHT[si2], SX, SY, sc);
      for (var ci2 = 0; ci2 < CM; ci2++) { var cn2 = CN[ci2]; if (!cn2.on) continue; var cdir = ((Math.floor(cn2.t * 16) % 8) + 8) % 8, cim = imgR('canister', 0, cdir, sc, 1);
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#1a1c12'; ctx.fillRect(SX(cn2.x) - 8 * sc, SY(cn2.y), 16 * sc, 2 * sc); ctx.globalAlpha = 1; var CX = SX(cn2.x), CY = SY(cn2.y - cn2.z); ctx.drawImage(cim, CX - (cim.width >> 1), CY - (cim.height >> 1));
        if (cdir % 4 === 0) { ctx.fillStyle = '#fffbe8'; ctx.fillRect(CX - 3 * sc, CY - 3 * sc, 2 * sc, sc); ctx.globalAlpha = 0.6; ctx.fillRect(CX - 2 * sc, CY - 4 * sc, sc, 3 * sc); ctx.fillRect(CX - 4 * sc, CY - 3 * sc, 4 * sc, sc); ctx.globalAlpha = 1; } }   // sun glint when the flat side faces up
      for (var b = 0; b < BM; b++) { var e = B[b]; if (!e.on) continue; var K = DEB[e.kind], dir = K.brass ? ((e.dir + Math.floor(e.t * e.spin)) % 8 + 8) % 8 : ((e.dir + 2 * Math.floor(e.t * e.spin * 0.5)) % 8 + 8) % 8 & 6, im2 = imgR(K.s, e.v, e.rest ? e.dir : dir, sc, K.brass ? 0 : e.z < 5 ? 2 : 1);
        var ex = SX(e.x) - ((im2.width / sc) >> 1) * sc, ey = SY(e.y - e.z) - ((im2.height / sc) >> 1) * sc;
        if (!e.rest) { var svx = e.vx, svy = e.vy - e.vz, spd = Math.sqrt(svx * svx + svy * svy); if (spd > 150) { var st = Math.min(3, spd / 40) * 0.006;   // motion smear: trailing ghosts along screen velocity
          for (var gh = 2; gh >= 1; gh--) { ctx.globalAlpha = gh === 2 ? 0.18 : 0.38; ctx.drawImage(im2, ex - Math.round(svx * st * gh) * sc, ey - Math.round(svy * st * gh) * sc); } ctx.globalAlpha = 1; } }
        ctx.drawImage(im2, ex, ey); }
      drawNapFire(ctx, SX, SY, sc);
      for (var u = 0; u < UM; u++) { var pu = U[u]; if (!pu.on || pu.t < 0) continue; if (pu.nap && NAP_FIRE[pu.shd] != null) continue; var k = pu.t / pu.life, nsm = pu.nap && pu.shd === 6, pim = nsm ? napSmoke(bucket(pu.r), u & 3) : puffImg(bucket(pu.r), pu.shd, sc); ctx.imageSmoothingEnabled = nsm;
        ctx.globalAlpha = pu.a * Math.min(1, pu.t * (FIRE_SHD[pu.shd] ? 60 : nsm ? 4 : 12)) * Math.pow(1 - k, FIRE_SHD[pu.shd] ? 0.8 : nsm ? 0.55 : 1.4); /* vet E2: napalm black smoke holds its density (slow fade) */ var ps = pu.r / PB[bucket(pu.r)] * (nsm ? sc : 1), pw = Math.max(2, Math.round(pim.width * ps));
        if (pu.shd === 5 || pu.shd === 13) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(pim, SX(pu.x) - (pw >> 1), SY(pu.y - pu.z) - (pw >> 1), pw, pw); ctx.globalCompositeOperation = 'source-over'; }
        else ctx.drawImage(pim, SX(pu.x) - (pw >> 1), SY(pu.y - pu.z) - (pw >> 1), pw, pw); }
    }
    ctx.globalAlpha = pA; ctx.globalCompositeOperation = pC; ctx.imageSmoothingEnabled = pS;
  }
  function reset() { [SH, KK, D, B, U, GR, FI, Q, CN, SHT].forEach(function (a) { for (var i = 0; i < a.length; i++) a[i].on = false; }); stopT = 0; stopEase = 0; }
  function counts() { var c = function (a) { var n = 0; for (var i = 0; i < a.length; i++) if (a[i].on) n++; return n; }; return { shakes: c(SH), kicks: c(KK), decals: c(D), debris: c(B), puffs: c(U), grit: c(GR), fires: c(FI), queued: c(Q), canisters: c(CN), sheets: c(SHT), hitStop: Math.max(0, stopT) }; }
  var API = { SHAKE: SHAKE, KICK: KICK, HITSTOP: HITSTOP, RECIPE: RECIPE, WEAPON: WEAPON, MAXAMP: MAXAMP, sampleShake: sampleShake, shake: shake, kick: kick, hitStop: hitStop,
    timeScale: timeScale, stepDt: function (dt) { return dt * timeScale(); }, camera: camera, decal: decal, brass: brass, debris: debris, impact: impact, forRadius: forRadius,
    update: update, drawAll: drawAll, reset: reset, counts: counts, seed: function (n) { seedV = n >>> 0; }, POOLS: { shakes: SHM, kicks: KM, decals: DM, debris: BM, puffs: UM, grit: GM, fires: FM, queued: QM, canisters: CM, sheets: SM }, warmNapalm: function () { for (var f = 0; f < NT_FR; f++) for (var h = 0; h < 3; h++) napTongue(f, h); for (var v = 0; v < 4; v++) { napBed(v); for (var b = 0; b < PB.length; b++) napSmoke(b, v); } return IMGN; }, flameSheet: flameSheet, eruption: eruption, fireline: fireline, arclightBox: arclightBox, napalmDrop: napalmDrop,
    imageCount: function () { return IMGN; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.VFX_IMPACT = API;
})(typeof self !== 'undefined' ? self : this);
