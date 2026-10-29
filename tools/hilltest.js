/* rc8.2 hill slope v2.6 (861A retint) node test: rasterises every SHEET1 sprite frame (letter grid -> legend rgba) and checks
   1) con_thien / cam_lo_river / route_9_lowlands / no map: every sprite pixel-identical to stock
   2) khe_sanh_861a: ONLY gGrass/gGrassDry/gJungle/gDirt + their edges/lips change; paddy, dike, river, mud, kill, burnt, v2.2 lowland etc. identical
   3) ?hill26=0 on 861A: everything identical; 4) 861A -> other map restores stock exactly; 5) frames/sprite order (draw order) never change.
   Usage: node tools/hilltest.js */
const vm=require('vm'),fs=require('fs'),path=require('path'),crypto=require('crypto'),R=path.join(__dirname,'..');
function boot(search){ const c={location:{search}}; c.self=c; c.window=c; vm.createContext(c);
  vm.runInContext(fs.readFileSync(R+'/assets/art/sheet1.js','utf8').replace(/typeof module !== 'undefined' && module.exports/g,'false'),c);
  vm.runInContext(fs.readFileSync(R+'/assets/art/hill_slope.js','utf8'),c);
  vm.runInContext(fs.readFileSync(R+'/assets/art/terrain_v2.js','utf8').replace(/typeof module !== 'undefined' && module.exports/g,'false'),c); return c }
function px(S){ const o={}; for(const n of Object.keys(S.sprites)){ const s=S.sprites[n]; o[n]=crypto.createHash('sha1').update(JSON.stringify(s.frames.map(f=>f.map(r=>[...r].map(ch=>ch==='.'?'-':s.legend[ch]).join(','))))).digest('hex') } return o }
const RET=['gGrass','gGrassDry','gJungle','gDirt','eGrass','eGrassLip','eGrassDryLip','eJungle','eJungleLip','eDirt','eDirtLip'];
const LOW=['gPaddy','gPaddyMature','gPaddyDry','gPaddyBurnt','gRiver','gRiverS','gMud','eMud','eMudLip','cDike','cTrack','cPath','gKill','eKill','eKillLip','gTrampled','gGrassBurnt','eGrassBurntLip','fTint','paddy','tPaddy','tDike','tRiver','tBank'];
let fail=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c)fail++ };
const stock=px(boot('').SHEET1), order=JSON.stringify(Object.keys(boot('').SHEET1.sprites));
const diff=(a)=>Object.keys(stock).filter(k=>stock[k]!==a[k]);
for(const m of ['con_thien','cam_lo_river','route_9_lowlands',undefined]){ const c=boot(''); c.LCO_HILL_SLOPE.apply(m); ok(diff(px(c.SHEET1)).length===0,`${m||'no map (FR fallback)'}: all ${Object.keys(stock).length} sprites pixel-identical`) }
{ const c=boot(''); ok(c.LCO_HILL_SLOPE.apply('khe_sanh_861a')===true,'861A: retint active'); const d=diff(px(c.SHEET1));
  ok(d.length===RET.length&&RET.every(k=>d.includes(k)),'861A: changed sprites = exactly '+RET.join(',')+' (got '+d.join(',')+')');
  const low=LOW.filter(k=>k in stock); ok(low.every(k=>!d.includes(k)),`861A: lowland/paddy/dike/river/v2.2 sprites pixel-identical (${low.length}: ${low.join(',')})`);
  ok(JSON.stringify(Object.keys(c.SHEET1.sprites))===order,'861A: sprite set/order unchanged (no new layer)');
  ok(RET.every(k=>JSON.stringify(c.SHEET1.sprites[k].frames)===JSON.stringify(boot('').SHEET1.sprites[k].frames)),'861A: retinted sprites keep identical frames (legend-only)');
  c.LCO_HILL_SLOPE.apply('con_thien'); ok(diff(px(c.SHEET1)).length===0,'861A -> con_thien: stock restored exactly'); }
for(const q of ['?hill26=0','?map=khe_sanh_861a&hill26=0']){ const c=boot(q); ok(c.LCO_HILL_SLOPE===null,q+': LCO_HILL_SLOPE null'); ok(diff(px(c.SHEET1)).length===0,q+': all sprites identical to stock') }
for(const q of ['?hill26=00','?xhill26=0','?hill26=01']){ const c=boot(q); ok(c.LCO_HILL_SLOPE!==null,q+': not treated as hill26=0 (exact key, anchored)') }
console.log(fail?`${fail} FAILED`:'ALL PASS'); process.exit(fail?1:0)
