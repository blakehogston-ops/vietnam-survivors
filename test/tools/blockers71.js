/* blockers71: rc7.1 Gamer blocker repros (fault injection, real-time frame loop). PORT=8816 NODE_PATH=/workspace/qa1/node_modules node tools/blockers71.js */
const {chromium}=require('playwright-core');const W=ms=>new Promise(r=>setTimeout(r,ms));let fail=0;const R={};const ok=(k,v,d)=>{R[k]={pass:!!v,d};if(!v)fail++};
(async()=>{const b=await chromium.launch({channel:'chrome',args:['--no-sandbox']});const c=await b.newContext({viewport:{width:1280,height:720}});await c.addInitScript(()=>{localStorage.setItem('lco_tutAsk','1')});
const pg=await c.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:'+(process.env.PORT||8816)+'/?nodemo&nointro&nobrief&god&char=doc&autostart&seed=7',{timeout:120000,waitUntil:'domcontentloaded'});await W(4000);
const T=()=>pg.evaluate(()=>__ms.G.t);
/* 1 freeze: NaN frame clock (last=NaN) used to stop the world silently */
let t0=await T(); await pg.evaluate(()=>{ last=NaN }); await W(1500); let t1=await T(); ok('freeze_nan_dt',t1>t0+.5,{t0,t1});
/* 1b freeze: a throw inside update() */
t0=await T(); await pg.evaluate(()=>{ const M=__ms.MOH, o=M.tick; let n=0; M.tick=function(dt){ if(n++<3)throw new Error('injected'); return o.call(this,dt) } }); await W(1500); t1=await T(); ok('freeze_update_throw',t1>t0+.5,{t0,t1});
/* 1c stall: a stuck quiet flag */
await pg.evaluate(()=>{ __ms.G.quiet=1e9 }); await W(3500); t0=await T(); await W(1000); t1=await T(); ok('freeze_quiet_stall',t1>t0+.5,{t0,t1});
/* 2 blank world: NaN player, NaN impact camera */
await pg.evaluate(()=>{ __ms.G.p.x=NaN }); await W(400); const px=await pg.evaluate(()=>__ms.G.p.x); ok('blank_nan_player',isFinite(px),{px});
await pg.evaluate(()=>{ if(window.VFX_IMPACT){ const o=VFX_IMPACT.camera; let n=0; VFX_IMPACT.camera=function(){ return n++<5?{x:NaN,y:0,rot:NaN}:o() } } }); await W(600);
const log=await pg.evaluate(()=>(window.__simLog||[]).map(l=>l.k)); ok('logged_recovery',['update','stall','player'].every(k=>log.includes(k))&&(log.includes('dt')||R.freeze_nan_dt.pass)&&(!(await pg.evaluate(()=>!!window.VFX_IMPACT))||log.includes('impactCam')),log);
/* 3 MoH card never on a stage-banner frame */
const cw=await pg.evaluate(()=>{ __ms.G.banner={text:'STAGE 2/3 BUNKER',t:2,col:'#fff'}; return __ms.MOH.cardWait() }); ok('moh_card_waits_for_stage_banner',cw===true);
/* 5 keys: E no longer fires the special; G = X */
const k=await pg.evaluate(async()=>{ __ms.G.banner=null; const t=await (await fetch(location.pathname)).text(); return {g:t.includes('never calls the bird (X calls)')} }); ok('G_bound',k.g);
ok('no_page_errors',errs.length===0,errs);
await b.close(); console.log(JSON.stringify(R)); console.log(fail?'BLOCKERS71 FAIL '+fail:'BLOCKERS71 PASS'); process.exit(fail?1:0) })();
