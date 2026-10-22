// tools/night_smoke.js (rc8.1 QA night): bot calls the bird at game clock CALL (default 420 s = night), steers to the pad like bot5, and records
// smoke-wait start, auto-pop time (EX.POP_HOLD 0.4 s after Doc is on the pad) and the result. SHOT=<png> stops at the smoke request and screenshots it (use Q=&god).
// usage: PORT=8765 CH=<chrome> SEEDS=1071,1362,1556 [CALL=420] [Q=&god] [SHOT=/path.png] node tools/night_smoke.js
const {chromium}=require('playwright-core'); const P=process.env.PORT||8765, CALL=+(process.env.CALL||420), Q=process.env.Q||'';
const SEEDS=(process.env.SEEDS||'1071,1362,1556').split(',');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']}); let bad=0;
 for(const seed of SEEDS){ const pg=await b.newPage({viewport:{width:1280,height:720}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(`http://localhost:${P}/?nodemo&nointro&nobrief&bot&char=doc&autostart&seed=${seed}&botcall=${CALL}${Q}`);
  await pg.waitForFunction(()=>window.__ms&&__ms.G&&__ms.G.p&&__ms.stateX==='play',null,{timeout:120000,polling:50});
  const o=await pg.evaluate(([CALL,SHOT])=>{ const m=__ms; window.__simHold=true; const r={waitT:null,popT:null,res:null,shot:false};
   for(let i=0;i<60*(CALL+200);i++){ const st=m.stateX||m.state; if(st==='over')break;
    if(st==='sig'){ const ex=m.G.ex; window.__ans(ex.call&&ex.call.st==='ask'?ex.call.look==='real':(ex.at==='real'&&ex.idCol===ex.sig.col)); continue }
    if(st==='levelup'&&m.pick){ m.pick(0); continue }
    const ex=m.G.ex; m.BOTF.move=(ex&&ex.pad&&ex.ph>=3&&!ex.evac)?()=>{ const p=m.G.p,dx=ex.pad.x-p.x,dy=ex.pad.y-p.y,d=Math.hypot(dx,dy); return d<14?[0,0]:[dx/d,dy/d] }:null;
    if(SHOT&&ex&&ex.call&&ex.call.st==='wait'){ m.BOTF.move=()=>[1,0] }   /* off the pad so the prompt shows */
    m.step(1/60); const c=ex&&ex.call;
    if(c&&c.st==='wait'&&r.waitT==null){ r.waitT=+m.G.t.toFixed(2); if(SHOT){ for(let j=0;j<20;j++)m.step(1/60); m.render(); r.shot=true; break } }
    if(ex&&ex.popped&&r.popT==null&&r.waitT!=null)r.popT=+m.G.t.toFixed(2);
    if(ex&&ex.evac)break }
   const rl=(DBG.runLog()||[]).slice(-1)[0]||{}; r.res=rl.result||(m.G.ex&&m.G.ex.evac?'evac':m.stateX); r.t=+m.G.t.toFixed(1); return r },[CALL,!!process.env.SHOT]);
  if(o.shot)await pg.screenshot({path:process.env.SHOT.replace('.png','_'+seed+'.png')});
  const okr=o.shot||(o.waitT!=null&&o.popT!=null&&o.popT-o.waitT<=6); if(!okr)bad++;
  console.log('NSMOKE seed '+seed+' '+(okr?'OK':'BAD')+' '+JSON.stringify(o)+(errs.length?' ERR '+errs[0].slice(0,80):'')); await pg.close() }
 console.log(bad?'NIGHT_SMOKE FAIL '+bad:'NIGHT_SMOKE PASS'); await b.close(); process.exit(bad?1:0) })();
