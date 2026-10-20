// rc8 proof: drawBurnDeath on flame kills, gore ON vs OFF
const {chromium}=require('playwright-core'); const OUT='/workspace/proof/rc8/burn/';
(async()=>{ const br=await chromium.launch({executablePath:'/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']}); const out={};
 for(const gore of [1,0]){ const pg=await br.newPage({viewport:{width:1280,height:720}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(g=>{ try{ localStorage.setItem('lco_gore',g?'1':'0') }catch(e){} },gore);
  await pg.goto('http://127.0.0.1:8831/?nodemo&nointro&nobrief&bot&char=doc&autostart&moh=0&seed=1002&lowfx=0',{waitUntil:'domcontentloaded',timeout:120000}); await pg.waitForTimeout(6000);
  const r=await pg.evaluate(()=>{ const m=__ms, g=m.G, EN=()=>typeof m.enemies==='function'?m.enemies():m.enemies; window.__simHold=true; m.DBG.god=true; for(let i=0;i<60;i++)m.step(1/30); for(const e of EN())e.dead=true;
   const P=g.p, ty=['nva','vc','sapper','rpg']; ty.forEach((t,i)=>m.spawnEnemy(t,P.x-90+i*60,P.y-70)); const es=EN().filter(e=>!e.dead&&e.hp>0).slice(-4);
   m.setDmgSrc(3); for(const e of es)m.hurtEnemy(e,99999,1,0); m.setDmgSrc(0); for(let i=0;i<15;i++)m.step(1/30); m.render&&m.render(); return {n:es.length,dy:(m.dying||[]).length,kinds:(typeof m.dying==='function'?m.dying():m.dying||[]).map(d=>d.kind)} });
  await (await pg.$('canvas')).screenshot({path:OUT+'burn_gore'+(gore?'on':'off')+'_0.5s.png'});
  await pg.evaluate(()=>{ const m=__ms; for(let i=0;i<30;i++)m.step(1/30); m.render&&m.render() }); await (await pg.$('canvas')).screenshot({path:OUT+'burn_gore'+(gore?'on':'off')+'_1.5s.png'});
  out['gore'+gore]={r,errs}; await pg.close() }
 console.log(JSON.stringify(out)); await br.close() })();
