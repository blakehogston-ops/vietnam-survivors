// rc8.1 pass3b proof: cleared-localStorage first run. PORT=... CH=... node shots.js
const {chromium}=require('playwright-core');(async()=>{ const P=process.env.PORT, O='/workspace/proof/rc81/pass3b/'; const b=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1920,height:1080}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); let fail=0; const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c)fail++};
await pg.goto(`http://127.0.0.1:${P}/index.html`); await pg.evaluate(()=>localStorage.clear());
await pg.goto(`http://127.0.0.1:${P}/index.html?nobrief=1&nointro=1&autostart=1&seed=7`); await pg.waitForTimeout(6000);
const st=await pg.evaluate(()=>({ls:localStorage.getItem('lco_teach'),cur:TEACH.cur&&TEACH.cur.id,log:TEACH.log,t:__ms.G.t,state:__ms.state}));
console.log(JSON.stringify(st)); ok(st.cur||(st.log&&st.log.length),'first run: onboarding prompt shows ('+(st.cur||JSON.stringify(st.log))+')');
await pg.screenshot({path:O+'01-first-run-teach.png'});
const hp=await pg.evaluate(()=>({hp:__ms.G.p.hp,max:__ms.G.p.maxHp,t:__ms.G.t})); console.log('hp',JSON.stringify(hp));
// level-up cards
await pg.evaluate(()=>{ const g=__ms.G; g.pending=1; __ms.openLevelUp() }); await pg.waitForTimeout(600); await pg.screenshot({path:O+'02-levelup-cards.png'});
const clip=await pg.evaluate(()=>[...document.querySelectorAll('#cards .card')].map(c=>{const r=c.getBoundingClientRect();return [Math.round(r.right),Math.round(r.bottom),c.scrollHeight>c.clientHeight+2]}));
ok(clip.every(c=>c[0]<=1920&&c[1]<=1080&&!c[2]),'cards fit, no clipping '+JSON.stringify(clip));
const tipVis=await pg.evaluate(()=>{const e=document.getElementById('tipBar');return !!(e&&e.classList.contains('show'))}); ok(!tipVis,'no tip toast over the cards');
await pg.waitForTimeout(400); await pg.keyboard.press('Enter'); await pg.waitForTimeout(300); ok(await pg.evaluate(()=>__ms.state)==='play','Enter picks the highlighted card');
// firebase site beacon + arrow
await pg.evaluate(()=>{ window.__simHold=true; const m=__ms; m.G.t=110; if(!m.lzS){ m.G.nextLz=0; for(let i=0;i<5;i++)m.step(1/60) } }); await pg.evaluate(()=>{ window.__simHold=false });
await pg.waitForTimeout(1500); await pg.screenshot({path:O+'03-firebase-arrow.png'});
await pg.evaluate(()=>{ const m=__ms; if(m.lzS){ m.G.p.x=m.lzS.x+120; m.G.p.y=m.lzS.y+60 } }); await pg.waitForTimeout(1200); await pg.screenshot({path:O+'04-firebase-beacon.png'});
// MoH card
await pg.evaluate(()=>{ const m=__ms; m.DBG.fbBuild(); }); await pg.waitForTimeout(500);
await pg.evaluate(()=>{ const m=__ms, f=m.fbS; if(f){ f.state='done'; f.prog=1 } m.MOH.next=0; m.MOH.fb=null; m.G.p.mv=false }); await pg.waitForTimeout(4000);
const mc=await pg.evaluate(()=>__ms.state); if(mc==='mohcard'){ await pg.screenshot({path:O+'05-moh-card.png'}); await pg.keyboard.press('Enter'); await pg.waitForTimeout(300); const L=await pg.evaluate(()=>__ms.G.mohLog.map(e=>e.ev)); ok(L.includes('stay')&&!L.includes('go'),'Enter on MoH card = STAY '+L.join(',')) } else console.log('INFO moh card not opened (state '+mc+')');
ok(!errs.length,'no page errors '+errs.slice(0,3).join(' | ')); console.log(fail?'SHOTS FAIL':'SHOTS PASS'); await b.close(); process.exit(fail?1:0) })();
