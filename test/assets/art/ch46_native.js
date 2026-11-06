/* ch46_native.js - CH-46D native v1.2 (3D Render Artist, AD-cleared Oct 29 2026). Drawn NATIVE (1x 546x444, pivot 273,274.7; 2x for scale>1), no upscale.
 * Wraps SHEET1.drawSeaKnight (load AFTER ch46_v2.js). Falls back to the v4.1 path until a frame has decoded (and always headless / for wrecks).
 * States: flying/hover/landed -> _rotor ; rampDown -> _landed_r0..2 (rotors turning) or _lower1..8 while o.rampK<1 ; o.rotorsStopped -> closed frame.
 * Shadow is baked (sun top-left): no game shadow. Anchors (hubs, ramp tip, door, exit x4) come from meta.json. ?ch46native=0 disables. */
(function (root) { 'use strict'; var S = root.SHEET1; if (!S || !S.drawSeaKnight) return;
  var M = {"canvas":[546,444],"pivot":[273.0,274.7],"hubs":{"E":[[360.5,210.6],[161.9,202.0]],"SE":[[334.7,273.5],[194.5,153.9]],"S":[[273.0,268.9],[273.0,128.0]],"SW":[[211.3,251.6],[351.5,149.5]],"W":[[185.5,210.6],[384.1,202.0]],"NW":[[211.3,169.6],[351.5,254.1]],"N":[[273.0,152.6],[273.0,275.7]],"NE":[[334.7,169.6],[194.5,254.1]]},"ramp_open_tip":{"E":[115.1,272.9],"SE":[161.3,183.1],"S":[273.0,167.7],"SW":[384.7,198.6],"W":[430.9,272.9],"NW":[384.7,347.2],"N":[273.0,377.7],"NE":[161.3,347.2]},"door":{"E":[169.7,253.4],"SE":[200.1,199.2],"S":[273.0,185.0],"SW":[345.9,205.0],"W":[376.3,253.4],"NW":[345.9,302.2],"N":[273.0,322.2],"NE":[200.1,302.2]},"exit":{"E":[[102.4,279.0],[80.3,269.8],[58.6,279.0],[36.6,269.8]],"SE":[[147.4,181.3],[141.8,161.0],[116.3,156.3],[110.8,136.3]],"S":[[266.2,161.0],[279.8,146.5],[266.2,131.7],[279.8,117.2]],"SW":[[388.7,190.9],[414.2,187.2],[419.7,170.2],[444.9,166.5]],"W":[[443.6,269.8],[465.7,279.0],[487.4,269.8],[509.4,279.0]],"NW":[[398.6,351.5],[404.2,368.2],[429.7,371.8],[435.2,388.8]],"N":[[279.8,387.9],[266.2,402.4],[279.8,417.2],[266.2,431.7]],"NE":[[157.3,358.0],[131.8,361.7],[126.3,378.6],[101.1,382.3]]}}, H8 = ['E','SE','S','SW','W','NW','N','NE'], PX = M.pivot[0], PY = M.pivot[1];
  var N = S.ch46Native = { dir: 'assets/art/ch46_native_v1_2/', on: !(typeof location !== 'undefined' && /[?&]ch46native=0\b/.test(location.search)) && typeof Image !== 'undefined', meta: M, img: {} };
  function get(name, two) { var k = (two ? '2x/' : '1x/') + name; var im = N.img[k]; if (!im) { im = N.img[k] = new Image(); im.decoding = 'async'; im.src = N.dir + k + '.png'; } return (im.complete && im.naturalWidth > 0) ? im : null; }
  N.preload = function (hs) { (hs || H8).forEach(function (h) { ['_rotor','_landed_r0','_landed_r1','_landed_r2','_lower1','_lower2','_lower3','_lower4','_lower5','_lower6','_lower7','_lower8',''].forEach(function (s) { get('ch46_' + h + s, false); }); }); };
  N.ready = function (i) { return !!(N.on && get('ch46_' + H8[i] + '_rotor', false)); };
  var HZ = PY - (M.hubs.E[0][1] + M.hubs.E[1][1]) / 2;   /* rotor-hub height above the ground pivot, from the E frame (no length foreshortening there) */
  N.washPt = function (i) { var h = M.hubs[H8[i]]; return [(h[0][0] + h[1][0]) / 2 - PX, (h[0][1] + h[1][1]) / 2 + HZ - PY]; };   /* ground point midway between hubs, rel. pivot */
  function A(p, x, y, sc) { return [x + (p[0] - PX) * sc, y + (p[1] - PY) * sc]; }
  var prev = S.drawSeaKnight;
  S.drawSeaKnight = function (ctx, o) {
    var st = o.state || 'flying', dmg = o.damage | 0, sc = o.scale || 1, i = S.heading8(o.heading), t = o.t || 0, H = H8[i];
    if (!N.on || dmg === 2) return prev(ctx, o);
    var nm = o.rotorsStopped ? '' : st === 'rampDown' ? (o.rampK !== undefined && o.rampK < 1 ? '_lower' + Math.max(1, Math.min(8, Math.ceil(o.rampK * 8))) : '_landed_r' + (Math.floor(t * 18) % 3)) : '_rotor';
    var two = false, im = get('ch46_' + H + nm, two); if (!im) { im = get('ch46_' + H + '_rotor', two); if (!im) return prev(ctx, o); }
    var alt = o.alt !== undefined ? o.alt : (st === 'flying' ? 60 : st === 'hover' ? 14 : 0), by = o.y - alt;
    var wash = o.wash !== undefined ? o.wash : (alt <= 48); if (wash && S.sprites.washEvac) S.draw(ctx, 'washEvac', Math.floor(t * 10), o.x, o.y, 2.75 * sc);
    var w = M.canvas[0] * sc, h = M.canvas[1] * sc, sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = sc !== 1; if (o.hit) ctx.filter = 'brightness(2.2)';
    ctx.drawImage(im, Math.round(o.x - PX * sc), Math.round(by - PY * sc), Math.round(w), Math.round(h));   /* 1:1 at scale 1 */
    if (o.hit) ctx.filter = 'none'; ctx.imageSmoothingEnabled = sm;
    var hubs = M.hubs[H].map(function (p) { return A(p, o.x, by, sc); }), door = A(M.door[H], o.x, by, sc);
    return { muzzles: dmg === 2 ? [] : [door, door], hubs: hubs, ramp: A(M.ramp_open_tip[H], o.x, by, sc), cabin: door, exit: M.exit[H].map(function (p) { return A(p, o.x, by, sc); }), state: st, damage: dmg, scale: sc, native: true };
  };
  if (N.on) { N.preload(['NW', 'E']); setTimeout(function () { N.preload(); }, 4000); }   /* all headings shortly after boot, so gameplay never shows a v4.1 fallback frame */
})(typeof window !== 'undefined' ? window : this);
