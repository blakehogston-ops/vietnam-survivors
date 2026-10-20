// rc8 HUD lane proof: force INCOMING + banner + KIA + Gunny card + commander, screenshot at 1280x720 and 390x844
const {chromium}=require('playwright-core');const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({executablePath:'/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
for(const [w,h,m] of [[1280,720,0],[390,844,1]]){const c=await b.newContext({viewport:{width:w,height:h},isMobile:!!m,hasTouch:!!m});await c.addInitScript(()=>{localStorage.setItem('lco_tutAsk','1')});const pg=await c.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:'+(process.env.PORT||8831)+'/?nodemo&nointro&nobrief&god&char=doc&autostart&seed=7',{timeout:180000,waitUntil:'domcontentloaded'});await W(6000);
await pg.evaluate(()=>{const m=__ms,g=m.G;m.gunny('Doc, Gunny. Firebase site\'s marked. Get there and call up the engineers.',30,1);try{const e=m.spawn('boss',g.p.x+300,g.p.y);if(e){e.boss=true;g.boss=e}}catch(e){};g.pullT=20;g.pullTxt='ENEMY PULLING BACK · 0:20 TO GET READY'});
await W(800);await pg.evaluate(()=>{__ms.G.banner={text:'COMMANDER SPOTTED · GET CLEAR',t:3,col:'#ff6a4a'};});await W(700);await pg.screenshot({path:'/workspace/proof/rc8/hud/lanes_'+w+'x'+h+'.png'});console.log(w,h,JSON.stringify(errs));await c.close()}
await b.close()})();
