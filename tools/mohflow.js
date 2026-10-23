// rc8.1 Pass 3 MoH flow test: trigger (built firebase only, radio line), objective (arrow target + distance), success/fail moment, return + reward shown, end-screen record.
// (rc8.1 LPT #5: toCard budget 10 s -> 15 s, the card now opens MOH_CARD_LAG s after the radio line)
// Usage: PORT=8787 CH=<chrome> node tools/mohflow.js   (exit 1 on any FAIL)
const {chromium}=require('playwright-core');(async()=>{ const P=process.env.PORT||8787; const b=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']}); let fails=0;
/* rc8.1: event-based waits (no fixed sleeps) so a loaded box cannot change the result: the sim starts only once the run is live, key presses wait for the MoH log to change */
const ready=async pg=>{ await pg.waitForFunction(()=>window.__ms&&__ms.G&&__ms.G.p&&(__ms.stateX==='play'||__ms.stateX==='levelup'),null,{timeout:120000,polling:50}); await pg.evaluate(()=>{ window.__simHold=true }) };
const press=async(pg,k)=>{ const n=await pg.evaluate(()=>__ms.G.mohLog.length+'|'+__ms.stateX); await pg.keyboard.press(k); await pg.waitForFunction(n=>(__ms.G.mohLog.length+'|'+__ms.stateX)!==n,n,{timeout:20000,polling:20}).catch(()=>{}) };
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c)fails++ };
async function run(q,seed,secs){ const pg=await b.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(`http://localhost:${P}/?nodemo&nointro&nobrief&bot&char=doc&autostart&seed=${seed}${q}`); await ready(pg);
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
ok(A.log.some(e=>e.ev==='reward'&&e.xp>0)&&A.banners.some(t=>/BACK INSIDE THE WIRE · \+\d+ XP · TRIBUTE: /.test(t)),'A reward shown on return');
ok(A.out.some(o=>/^completed$/.test(o.res)),'A end-screen record (completed)');
ok(!A.errs.length,'A no page errors '+A.errs.slice(0,2).join(' | '));
// B) forced fail: 1 s go timer (deterministic), mission expires with a clear fail moment
const B=await run('&build=done&moht=1&mohd=600',202,200);
ok(B.log.some(e=>e.ev==='expired'),'B fail moment (expired) logged');
ok(B.banners.some(t=>/MISSION FAILED/.test(t)),'B fail banner shown');
ok(B.out.some(o=>/not reached/.test(o.res)),'B end-screen record (failed)');
ok(B.radio.includes('Doc, this is Two-Six. Too late. Get back inside the wire. Out.'),'B expired radio line (HAA text)');
ok(B.radio.some(t=>t==='Firebase, Golf Two-Six. A squad is cut off and pinned down. Need someone out there. Over.'||/^Firebase, Golf Two-Six\. Marine down/.test(t)),'B call radio line (HAA text)');
ok(!B.errs.length,'B no page errors');
// C) no firebase built: no MoH call at all (no time fallback)
const C=await run('&botfb=0',303,240);
ok(C.gateBad===0&&(C.fbDoneT!=null||C.firstCallT==null),'C no call without a built firebase (fbDone '+C.fbDoneT+', firstCall '+C.firstCallT+')');
// D) card (non-bot): opens only when Doc is stopped; Enter and Esc = STAY; Y = GO. Screenshot to proof.
{ const pg=await b.newPage({viewport:{width:1920,height:1080}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(`http://localhost:${P}/?nodemo&nointro&nobrief&char=doc&autostart&god&build=done&mohd=300&seed=404`); await ready(pg);
 const step=(s,mv)=>pg.evaluate(([s,mv])=>{ const m=__ms; window.__simHold=true; m.keys.KeyD=!!mv; for(let i=0;i<s*60;i++){ if(m.stateX==='levelup'){ m.pick(0); continue } if(m.stateX==='mohcard')break; m.step(1/60) } m.keys.KeyD=false; const c=m.MOH.cur; return {st:m.stateX,pend:!!(c&&c.pend),cur:!!c,t:m.G.t} },[s,mv]);
 const waitPend=async()=>{ for(let i=0;i<40;i++){ const r=await step(1,true); if(r.pend||r.st==='mohcard')return r } return null };
 const toCard=async()=>{ for(let i=0;i<30;i++){ const r=await step(.5,false); if(r.st==='mohcard')return r } return null };
 const log=()=>pg.evaluate(()=>__ms.G.mohLog.map(e=>e.ev));
 let r=await waitPend(); ok(r&&r.pend&&r.st==='play','D call pending while Doc walks (card NOT open) '+JSON.stringify(r));
 r=await step(3,true); ok(r.st==='play'&&r.pend,'D still no card after 3 s more walking');
 r=await toCard(); ok(r&&r.st==='mohcard','D card opens once Doc stops');
 await pg.evaluate(()=>__ms.render()); await pg.screenshot({path:'/workspace/proof/rc81/pass3b/05-moh-card.png'});
 await press(pg,'Enter'); let L=await log(); ok(L.filter(x=>x==='stay').length===1&&!L.includes('go'),'D Enter = STAY '+L.join(','));
 await pg.evaluate(()=>{ __ms.MOH.next=0 }); await waitPend(); r=await toCard(); ok(r&&r.st==='mohcard','D second card opens');
 await press(pg,'Escape'); L=await log(); ok(L.filter(x=>x==='stay').length===2&&!L.includes('go'),'D Esc = STAY '+L.join(','));
 await pg.evaluate(()=>{ const M=__ms.MOH; M.q.push('ballard'); M.next=0 }); await waitPend(); r=await toCard(); ok(r&&r.st==='mohcard','D third card opens');
 await press(pg,'KeyY'); L=await log(); const st=await pg.evaluate(()=>__ms.stateX); ok(L.includes('go')&&st==='play','D Y = GO '+L.join(','));
 ok(!errs.length,'D no page errors '+errs.slice(0,2).join(' | ')); await pg.close() }
console.log(fails?'MOHFLOW FAIL '+fails:'MOHFLOW PASS'); await b.close(); process.exit(fails?1:0) })();
