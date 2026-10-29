/* rc8.2 hill v2.6 in-game proof: 861A capture with Doc + NVA on the retinted slope, and ground-only chunk dumps (TERR cache = ground+edges+fTint, no units) for docscore.
   node tools/hillshot.js <outdir> [map] [extra query] */
const {chromium}=require('playwright-core'),http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'), OUT=process.argv[2], MAP=process.argv[3]||'khe_sanh_861a', XQ=process.argv[4]||'';
const MIME={'.html':'text/html','.mp3':'audio/mpeg','.png':'image/png','.js':'text/javascript','.json':'application/json'};
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!f.startsWith(root)||!fs.existsSync(f)){r.statusCode=404;r.end();return} r.setHeader('content-type',MIME[path.extname(f)]||'application/octet-stream'); r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const B='http://127.0.0.1:'+srv.address().port+'/';
  const DXV=+(process.env.DX||0),DYV=+(process.env.DY||0); const br=await chromium.launch({channel:'chrome',args:['--no-sandbox']}); const pg=await br.newPage({viewport:{width:1280,height:800}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&autostart&map='+MAP+XQ); await pg.waitForTimeout(2500);
  for(let i=0;i<12&&await pg.evaluate(()=>__ms.stateX)!=='play';i++){ await pg.keyboard.press('Space'); await pg.waitForTimeout(150); await pg.keyboard.press('Space'); await pg.waitForTimeout(900) }
  const info=await pg.evaluate(()=>{ window.__simHold=true; const G=__ms.G, p=G.p||G.player||G.pl; return {state:__ms.stateX,mapId:G.mapId,active:!!(window.LCO_HILL_SLOPE&&LCO_HILL_SLOPE.active()),px:p&&p.x,py:p&&p.y} });
  console.log(JSON.stringify(info));
  const RT=256, cx0=Math.floor(info.px/RT), cy0=Math.floor(info.py/RT);
  for(let i=0;i<40;i++){ await pg.evaluate(()=>__ms.TERRm().budget(8)); await pg.waitForTimeout(50) }
  const chunks=await pg.evaluate(([cx0,cy0])=>{ const o=[]; for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){ __ms.TERRm().budget(4); const v=__ms.TERRm().get(cx0+dx,cy0+dy); if(v&&v[0])o.push(v[0].toDataURL()) } return o },[cx0,cy0]);
  fs.mkdirSync(OUT+'/gate',{recursive:true}); chunks.forEach((d,i)=>fs.writeFileSync(`${OUT}/gate/${MAP}${XQ?'_hill26off':''}_ground_${i}.png`,Buffer.from(d.split(',')[1],'base64')));
  if(MAP==='khe_sanh_861a'&&!XQ){ await pg.evaluate(([dx,dy])=>{ const G=__ms.G,p=G.p||G.player||G.pl; p.x+=dx; p.y+=dy; for(let i=0;i<3;i++)__ms.step(1/60); __ms.spawn('nva',p.x+60,p.y-10); const E=typeof __ms.enemies==='function'?__ms.enemies():__ms.enemies; const e=E&&E[E.length-1]; if(e){ e.x=p.x+56; e.y=p.y+4 } try{__ms.render()}catch(_){} return 1 },[DXV,DYV]); await pg.waitForTimeout(600);
    await pg.screenshot({path:OUT+'/ingame_doc_nva.png'}) }
  console.log('chunks',chunks.length,'errors',JSON.stringify(errs.slice(0,3))); await br.close(); srv.close() })();
