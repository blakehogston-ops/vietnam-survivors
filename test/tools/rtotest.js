const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({channel:'chrome',args:['--no-sandbox']}); const pg=await br.newPage({viewport:{width:1280,height:800}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&autostart&give=napalm:3,strafe:2,arclight:2'); await pg.waitForTimeout(1500);
 const r=await pg.evaluate(()=>{ window.__simHold=true; const M=__ms, out={}; let maxD=0, samples=0, rtoAt=null;
  for(let i=0;i<60*200&&M.stateX!=='over';i++){ if(M.stateX!=='play'){ if(M.stateX==='levelup')M.pick(0); else if(M.stateX==='sig')M.answer(true); } M.step(1/60); const g=M.G, r=M.coy.find(m=>m.rto&&m.hp>0);
    if(r&&rtoAt===null)rtoAt=Math.round(g.t); if(g.rtoLost&&out.rtoDiedT===undefined)out.rtoDiedT=Math.round(g.t); if(r&&r.state==='ok'&&g.t-rtoAt>5){ const d=Math.hypot(r.x-g.p.x,r.y-g.p.y); maxD=Math.max(maxD,d); samples++; if(d<60)out.near=(out.near|0)+1 } }
  const g=M.G; out.t=Math.round(g.t); out.state=M.stateX; out.rtoAt=rtoAt; out.calls=g.rtoCalls|0; out.maxDist=Math.round(maxD); out.nearPct=Math.round(100*(out.near|0)/samples); out.coy=M.coy.length; out.w=Object.keys(g.w);
  out.aim=[g.aim,g.fa]; out.medInv=g.medInv|0; out.medDrops=g.med&&g.med.drops; out.medpicked=g.med&&g.med.picked;
  // med use
  g.medInv=2; g.p.hp=g.p.maxHp*.4; M.setState('play'); const h0=g.p.hp; document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyH'})); out.selfHeal=Math.round(g.p.hp-h0);
  const r2=M.coy.find(m=>m.rto&&m.hp>0); if(r2){ r2.x=g.p.x+20;r2.y=g.p.y; r2.hp=r2.mhp*.3; const a=r2.hp; document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyQ'})); out.mateHeal=Math.round(r2.hp-a);
    r2.hp=0; for(let i=0;i<5;i++)M.step(1/60); out.lost=!!g.rtoLost; out.banner=g.banner&&g.banner.text; const c0=g.rtoCalls|0; g.w.napalm.cd=0; for(let i=0;i<600;i++)M.step(1/60); out.callsAfterLoss=(g.rtoCalls|0)-c0; out.rtos=M.coy.filter(m=>m.rto).map(m=>[m.nm,Math.round(m.hp)]) }
  out.medLeft=g.medInv; return out });
 console.log(JSON.stringify(r,null,1)); console.log('errors',errs.slice(0,5)); await pg.screenshot({path:'/tmp/rto.png'}); await br.close(); srv.close() })();
