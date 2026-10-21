// MoH decision card proof: game paused while open (G.t frozen, go-timer 0), GO resumes. Synthetic call without a firebase ends as baseLost right after GO (expected).
const {chromium}=require('playwright-core');const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({executablePath:'/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});const c=await b.newContext({viewport:{width:1280,height:720}});await c.addInitScript(()=>{localStorage.setItem('lco_tutAsk','1')});const pg=await c.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8831/?nodemo&nointro&nobrief&god&char=doc&autostart&seed=7',{timeout:180000,waitUntil:'domcontentloaded'});await W(6000);
const r=await pg.evaluate(()=>{const M=__ms.MOH,g=__ms.G;M.cur={k:'taylor',x:g.p.x+600,y:g.p.y,t:0,h:0,ph:'go',life:40,dist:840};M.open();return {st:document.getElementById('mohCard').className,t0:g.t}});
await W(2500);const r2=await pg.evaluate(()=>({t:__ms.G.t,ct:__ms.MOH.cur.t,vis:getComputedStyle(document.getElementById('mohCard')).display}));
await pg.screenshot({path:'/workspace/proof/rc7.1/moh/01_card_paused.png'});
await pg.keyboard.press('Enter');await W(2500);const r3=await pg.evaluate(()=>({t:__ms.G.t,ct:__ms.MOH.cur&&__ms.MOH.cur.t,log:(__ms.G.mohLog||[]).map(l=>l.ev),vis:getComputedStyle(document.getElementById('mohCard')).display}));
await pg.screenshot({path:'/workspace/proof/rc7.1/moh/02_after_go_timer_running.png'});
const out={open:r,paused_after_2_5s:r2,after_go_2_5s:r3,pass:r2.t===r.t0&&r2.ct===0&&r3.t>r.t0&&r3.log.includes('go'),errs};require('fs').writeFileSync('/workspace/proof/rc7.1/moh/result.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out));await b.close()})();
