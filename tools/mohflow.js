// rc8.1 Pass 3 MoH flow test: trigger (built firebase only, radio line), objective (arrow target + distance), success/fail moment, return + reward shown, end-screen record.
// Usage: PORT=8787 CH=<chrome> node tools/mohflow.js   (exit 1 on any FAIL)
const {chromium}=require('playwright-core');(async()=>{ const P=process.env.PORT||8787; const b=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']}); let fails=0;
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c)fails++ };
async function run(q,seed,secs){ const pg=await b.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(`http://localhost:${P}/?nodemo&nointro&nobrief&bot&char=doc&autostart&seed=${seed}${q}`); await pg.waitForTimeout(1200);
 const o=await pg.evaluate((secs)=>{ const m=__ms; window.__simHold=true; const M=m.MOH; const r={gateBad:0,radio:[],banners:[],fbDoneT:null,firstCallT:null,distOk:true,retTarget:true};
  for(let i=0;i<60*secs;i++){ if(m.stateX==='levelup'){ m.pick(0); continue } if(m.stateX==='over')break; m.step(1/60); const g=m.G, f=m.fbS;
   if(f&&f.state==='done'&&r.fbDoneT==null)r.fbDoneT=g.t; const c=M.cur;
   if(c&&!(f&&f.state==='done'))r.gateBad++; if(c&&r.firstCallT==null)r.firstCallT=g.t;
   if(c&&!isFinite(Math.hypot(c.x-g.p.x,c.y-g.p.y)))r.distOk=false;
   if(c&&c.ph==='ret'&&!f)r.retTarget=false;
   const x=m.exMsg; if(x&&x.who==='GOLF TWO-SIX'&&!r.radio.includes(x.text))r.radio.push(x.text);
   const bn=g.banner; if(bn&&bn.text&&!r.banners.includes(bn.text)&&/MISSION FAILED|THEY ARE SAFE|BACK INSIDE THE WIRE/.test(bn.text))r.banners.push(bn.text) }
  r.log=m.G.mohLog||[]; r.out=m.G.mohOut||[]; r.honor=m.G.honor||[]; return r },secs); o.errs=errs; await pg.close(); return o }
// A) natural: built firebase, mission completed and rewarded on return
const A=await run('&build=done&mohd=300',101,300);
ok(A.gateBad===0,'A trigger: no MoH call before the firebase is built (bad frames '+A.gateBad+')');
ok(A.firstCallT!=null&&A.fbDoneT!=null&&A.firstCallT>=A.fbDoneT,'A trigger: first call '+A.firstCallT+' after build '+A.fbDoneT);
ok(A.radio.length>=1,'A radio call heard: '+(A.radio[0]||'none').slice(0,60));
ok(A.distOk,'A objective distance finite');
ok(A.log.some(e=>e.ev==='done'),'A success moment (done) logged');
ok(A.banners.some(t=>/THEY ARE SAFE/.test(t)),'A success banner shown');
ok(A.retTarget,'A return target = firebase');
ok(A.log.some(e=>e.ev==='reward'&&e.xp>0)&&A.banners.some(t=>/BACK INSIDE THE WIRE · \+\d+ XP/.test(t)),'A reward shown on return');
ok(A.out.some(o=>/completed/.test(o.res)),'A end-screen record (completed)');
ok(!A.errs.length,'A no page errors '+A.errs.slice(0,2).join(' | '));
// B) forced fail: 5 s go timer, mission expires with a clear fail moment
const B=await run('&build=done&moht=5&mohd=600',202,200);
ok(B.log.some(e=>e.ev==='expired'),'B fail moment (expired) logged');
ok(B.banners.some(t=>/MISSION FAILED/.test(t)),'B fail banner shown');
ok(B.out.some(o=>/not reached/.test(o.res)),'B end-screen record (failed)');
ok(!B.errs.length,'B no page errors');
// C) no firebase built: no MoH call at all (no time fallback)
const C=await run('&botfb=0',303,240);
ok(C.gateBad===0&&(C.fbDoneT!=null||C.firstCallT==null),'C no call without a built firebase (fbDone '+C.fbDoneT+', firstCall '+C.firstCallT+')');
console.log(fails?'MOHFLOW FAIL '+fails:'MOHFLOW PASS'); await b.close(); process.exit(fails?1:0) })();
