/* rc7 hudmobile: busy-moment screenshots. Bot fight to T s (default 215 = pad pre-marked, fire teams, INCOMING), then render.
   usage: node tools/hudshot.js OUTDIR TAG "&flags"  -> OUTDIR/{TAG}_{390x844,360x780,desktop}.png ; MOMENTS env = comma list of T */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'), OUT=process.argv[2]||'/tmp/hud', TAG=process.argv[3]||'x', Q=process.argv[4]||'', TS=(process.env.MOMENTS||'215').split(',').map(Number);
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/'; fs.mkdirSync(OUT,{recursive:true}); const br=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']}); const info={};
 const V=[['390x844',{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['360x780',{viewport:{width:360,height:780},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['desktop',{viewport:{width:1280,height:720}}]];
 for(const [vn,opt] of V)for(const T of TS){ const pg=await br.newPage(opt); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&char=doc&autostart&god&seed=7'+Q); await pg.waitForTimeout(1500);
  info[vn+'_'+T]=await pg.evaluate(T=>{ window.__simHold=true; window.DRES.tick=()=>{}; const M=__ms; for(let i=0;i<60*T;i++){ if(M.stateX==='levelup')M.pick(0); if(M.stateX==='sig')M.step(0); M.step(1/60) }
    const g=M.G, p=g.p; g.p.hp=Math.min(g.p.hp,g.p.maxHp*.2);
    /* identical busy moment for before/after: INCOMING rounds, 6 floating labels (3 duplicates), a banner, a Gunny line, an achievement toast */
    M.N2.shells.push({x:p.x+90,y:p.y+40,t:1.5,d:4,w:.5,cal:82},{x:p.x-70,y:p.y+90,t:1.5,d:4.3,w:.5,cal:82});
    M.gunny("They're pulling back! Reload, redistribute ammo, get the wounded to Doc!",6,2); g.banner={text:'LULL · REARM · TREAT WOUNDED',t:2.4,col:'#9fe07a'};
    try{ M.P3.toast({name:'Boots on the Ground',desc:'Hold for one minute after insertion.'}) }catch(e){}
    for(let i=0;i<10;i++)M.step(1/60);
    const F=M.ftexts; F.push({x:p.x,y:p.y-20,t:.1,s:'+12 HP',c:'#8cf08c'},{x:p.x+20,y:p.y-30,t:.2,s:'+12 HP',c:'#8cf08c'},{x:p.x-25,y:p.y-26,t:.3,s:'+12 HP',c:'#8cf08c'},{x:p.x+40,y:p.y-8,t:.1,s:'NO WOUNDED IN REACH',c:'#cfcfb0'},{x:p.x-40,y:p.y+10,t:.2,s:'STRIKE READY',c:'#d8cf9a'},{x:p.x+10,y:p.y+30,t:.4,s:'FIRE MISSION · 3',c:'#ffe58a'});
    M.render();
    return {st:M.stateX,t:+g.t.toFixed(1),ft:(M.ftexts||[]).length,drawn:window.HUDM&&HUDM.nft,fts:(M.ftexts||[]).map(q=>q.s+"@"+q.t.toFixed(2)).join("|"),hm:window.HUDM?HUDM.on:null} },T); info[vn+'_'+T].errs=errs.length;
  await pg.waitForTimeout(700); await pg.evaluate(()=>__ms.render()); await pg.screenshot({path:path.join(OUT,`${TAG}_${vn}${TS.length>1?'_'+T:''}.png`)}); await pg.close() }
 console.log(JSON.stringify(info)); await br.close(); srv.close() })();
