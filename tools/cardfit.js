const {chromium}=require('playwright-core');(async()=>{ const b=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']}); let f=0;
for(const [w,h] of [[1280,720],[1366,768],[1920,1080]]){ const pg=await b.newPage({viewport:{width:w,height:h}}); await pg.goto(`http://127.0.0.1:${process.env.PORT}/index.html?nobrief=1&nointro=1&autostart=1&seed=7&god=1`); await pg.waitForTimeout(5000);
 for(const ids of [['tank','strafe','arclight'],['squad','company','medevac']]){ await pg.evaluate(ids=>{ const m=__ms; m.G.pending=1; m.openLevelUp(); try{ window.__ms.Q46 }catch(e){} },ids); await pg.waitForTimeout(300);
  await pg.evaluate(ids=>{ /* force specific cards */ const s=document.createElement('script'); s.textContent='choices.splice(0,3,'+ids.map(x=>JSON.stringify(x)).join(',')+'); renderCards()'; document.body.appendChild(s) },ids); await pg.waitForTimeout(300);
  const r=await pg.evaluate(()=>[...document.querySelectorAll('#cards .card')].map(c=>{const q=c.getBoundingClientRect();return [Math.round(q.left),Math.round(q.right),Math.round(q.top),Math.round(q.bottom),Math.round(q.height)]}));
  const okk=r.length===3&&r.every(q=>q[0]>=0&&q[1]<=w&&q[3]<=h)&&new Set(r.map(q=>q[4])).size===1; if(!okk)f++; console.log((okk?'PASS ':'FAIL ')+w+'x'+h+' '+ids.join('/')+' '+JSON.stringify(r));
  await pg.screenshot({path:`/workspace/proof/rc81/pass3b/06-cards-${w}x${h}-${ids[0]}.png`}); await pg.keyboard.press('Digit1'); await pg.waitForTimeout(300) } await pg.close() }
await b.close(); process.exit(f?1:0) })();
