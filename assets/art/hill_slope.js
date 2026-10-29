/* Hill slope v2.6 (Concept Artist; AD locked, HAA passed). Data-only baseline: palette + panel path.
   ?hill26=0 -> previous state (no v2.6 hill-slope data). Flag read by exact key, anchored. */
(function(){
  var OFF = (typeof location !== 'undefined') && /(?:^\?|&)hill26=0(?:&|$)/.test(location.search);
  window.LCO_HILL_SLOPE = OFF ? null : { ver: '2.6', dir: 'assets/art/hill_slope_v2_6/', panel: 'assets/art/hill_slope_v2_6/ingame_panel_hill_slope_v2_6.png',
    map: 'khe_sanh_861a',
    /* tools/hill26_retint.py output: legend-only retint of existing terrain_v2 sprites (frames, layers, draw order unchanged) */
    retint: {"gGrass":{"a":"#2a381b","b":"#3f4a26","c":"#79864a","d":"#3d4a24","e":"#374622"},"eGrass":{"a":"#2a381b","b":"#3f4a26","c":"#79864a","d":"#3d4a24","e":"#243118"},"eGrassLip":{"a":"#243118"},"gGrassDry":{"a":"#88824a","b":"#959161","c":"#4a4729","d":"#364c1f","e":"#898653","f":"#86824e"},"eGrassDryLip":{"a":"#4a4729"},"gJungle":{"a":"#55422d","b":"#4c452d","c":"#2c361d","d":"#404a27","e":"#3a4523"},"eJungle":{"a":"#4c452d","b":"#404a27","c":"#2c361d","d":"#55422d","e":"#3a4523","f":"#212915"},"eJungleLip":{"a":"#212915"},"gDirt":{"a":"#ab7352","b":"#b2886b","c":"#ad724f","d":"#b1714c","e":"#633d2b"},"eDirt":{"a":"#b1714c","b":"#ab7352","c":"#ad724f","d":"#b2886b","e":"#633d2b","f":"#5c402b"},"eDirtLip":{"a":"#5c402b"}},
    palette: {"grass_v0":"#4d5a2f","grass_v1":"#4c592e","grass_v2":"#4c592e","grass_v3":"#4c592e","jungle_v0":"#3a3423","jungle_v1":"#3a3323","jungle_v2":"#3a3423","jungle_v3":"#3a3423","laterite_v0":"#9a6648","laterite_v1":"#986547","laterite_v2":"#986547","laterite_v3":"#986547","mud_v0":"#4a3c2a","mud_v1":"#493b2a","mud_v2":"#493b2a","mud_v3":"#4a3c2a","water_v0":"#6b6f5c","water_v1":"#6b6f5b","water_v2":"#6b6f5b","water_v3":"#6b6f5b","sand_v0":"#b8a479","sand_v1":"#b7a379","sand_v2":"#b7a379","sand_v3":"#b7a379","damp_grass":"#384222","damp_sand":"#887959","damp_laterite":"#714b35","dike_top":"#806e4c","dike_path":"#9c8864","dike_face":"#3c3224","dike_face_lit":"#4a3e2c","dike_wet_line":"#24221a","water_sky_edge":"#707a6e","water_deep":"#3e4a3c","ripe_base":"#827f4e","drained_base":"#827158","field_seedling":"#4d5b41","field_tiller":"#4e5d36","field_ripe":"#777448","field_drained":"#7c6d52","field_open":"#424e3f","field_ripe_lower":"#84814e","fade_t0.0":"#768072","fade_t0.1":"#727c6e","fade_t0.2":"#6f796b","fade_t0.3":"#6c7668","fade_t0.4":"#697365","fade_t0.5":"#545e50","fade_t0.6":"#4f594b","fade_t0.7":"#4a5547","fade_t0.8":"#455042","fade_t0.9":"#404c3e","fade_t1.0":"#3c483a","fade_lower_t0.00":"#768072","fade_lower_t0.25":"#6e786a","fade_lower_t0.50":"#4b5448","fade_lower_t0.75":"#404a3e","fade_lower_t1.00":"#364034","dike_grass_patch":"#465430","dike_mud_patch":"#4e4230","defoliated_mean":"#615946","burn_mean":"#3c3928","scrub_ground_mean":"#54512b","laterite_v2_mean":"#8f6146","trail":"#a27c5e","trail_runnel":"#76523c","grass_straw_sun":"#a09862","grass_straw_mid":"#848052","grass_straw_low":"#70704a","crater_rim":"#926548","crater_rim_lit":"#9d6f50","ejecta":"#92674b","ejecta_clod":"#644430","crater_wall":"#6d4b36","crater_shadow":"#432f22","crater_floor":"#533a2a","crater_water":"#404a3e","stump_top":"#5a4a34","stubble":"#362e22","ash":"#96928a","rendered_505028":"#505028","rendered_484820":"#484820","rendered_404020":"#404020","rendered_404820":"#404820","rendered_504828":"#504828","rendered_484828":"#484828","rendered_485020":"#485020","rendered_585028":"#585028","rendered_383818":"#383818","rendered_384018":"#384018","rendered_605830":"#605830","rendered_585830":"#585830","rendered_986848":"#986848","rendered_484020":"#484020","rendered_303018":"#303018","rendered_303818":"#303818","rendered_604028":"#604028","rendered_585828":"#585828","rendered_383820":"#383820","rendered_404018":"#404018","rendered_a07050":"#a07050","rendered_505828":"#505828","rendered_403820":"#403820","rendered_505030":"#505030"} };
  /* apply(mapId): on khe_sanh_861a swap in the retinted legends (same sprite names -> same layer + draw order); any other map
     restores the untouched originals. ?hill26=0: LCO_HILL_SLOPE is null, nothing is ever swapped. */
  var H = window.LCO_HILL_SLOPE; if (!H) return;
  var orig = null, on = false;
  /* terrain_v2.js stays byte-identical to 89dae0f (QA protect): its edge cache is private, so on first apply we swap in the same
     edgeCanvas body (public API only: MAP_TERRAIN2.tile/edgeMask/edgeLip + SHEET1.draw) with a cache we can drop on a legend swap. */
  var ecache = {}, hooked = false;
  function edgeHook() {
    var M = window.MAP_TERRAIN2, S = window.SHEET1; if (hooked || !M || !M.edgeCanvas || !S) return; hooked = true;
    var T = M.tile;
    function mkc(w, h) { if (typeof document !== 'undefined' && document.createElement) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; } return typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : null; }
    M.edgeCanvas = function (type, m, v, sc) {
      var key = type + '|' + m + '|' + v.join('') + '|' + sc; if (ecache[key] !== undefined) return ecache[key];
      var c = mkc(T * sc, T * sc); if (!c) return (ecache[key] = null);
      var x = c.getContext('2d'), h = T / 2 * sc, off = [[-h, -h], [h, -h], [-h, h], [h, h]], clip = [[0, 0], [h, 0], [0, h], [h, h]];
      x.imageSmoothingEnabled = false;
      for (var q = 0; q < 4; q++) { x.save(); x.beginPath(); x.rect(clip[q][0], clip[q][1], h, h); x.clip(); S.draw(x, type, 'v' + v[q], off[q][0], off[q][1], sc); x.restore(); }
      x.globalCompositeOperation = 'destination-in'; S.draw(x, M.edgeMask[type], 'm' + m, 0, 0, sc);
      x.globalCompositeOperation = 'source-over'; S.draw(x, M.edgeLip[type], 'm' + m, 0, 0, sc);
      return (ecache[key] = c);
    };
  }
  H.apply = function (mapId, S) {
    S = S || window.SHEET1; if (!S || !S.sprites) return false;
    if (!orig) { orig = {}; for (var n in H.retint) if (S.sprites[n]) orig[n] = S.sprites[n]; }
    var want = mapId === H.map; if (want === on) return on;
    var add = {};
    for (var k in orig) add[k] = want ? Object.assign({}, orig[k], { legend: Object.assign({}, orig[k].legend, H.retint[k]) }) : orig[k];
    S.add(add); on = want;
    edgeHook(); ecache = {};   /* composited edges were baked from the old legends */
    return on;
  };
  H.active = function () { return on; };
})();
