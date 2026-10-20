// rc8 AD proof: firebase ground v2 + ENEMY PULLING BACK held while a dialogue is open
const {chromium}=require('playwright-core'); const OUT='/workspace/proof/rc8/firebase/';
(async()=>{ const br=await chromium.launch({executablePath:'/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
 const pg=await br.newPage({viewport:{width:1280,height:720}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://127.0.0.1:8831/?nodemo&nointro&nobrief&bot&char=doc&autostart&moh=0&seed=1002',{waitUntil:'domcontentloaded',timeout:120000}); await pg.waitForTimeout(6000);
 await pg.evaluate(()=>{ const m=__ms; window.__simHold=true; m.DBG.god=true; const st=s=>{ for(let i=0;i<s*30;i++){ m.step(1/30); for(const e of m.enemies)e.dead=true } };
   st(3); m.spawnLz(); m.beginFirebase(); const f=m.fbS; st(1); f.state='building'; f.prog=1; f.crateOk=true; st(4); const S=m.strs.filter(s=>!s.dead), cx=S.reduce((a,s)=>a+s.x,0)/Math.max(1,S.length), cy=S.reduce((a,s)=>a+s.y,0)/Math.max(1,S.length); const p=m.G.p; p.x=cx; p.y=cy; st(9); p.x=cx; p.y=cy; st(.2); m.G.banner=null; m.G.pullT=0; m.render&&m.render() });
 const c=await pg.$('canvas'); await c.screenshot({path:OUT+'after_base_v3.png'});
 const r=await pg.evaluate(()=>{ const m=__ms, g=m.G; g.pullT=20; g.pullTxt='ENEMY PULLING BACK · 0:20 TO GET READY'; m.gunny&&m.gunny("Doc, Gunny. Dig in, they'll be back.",6,1); g.banner={text:'INCOMING!',t:3,col:'#ff6a4a'}; for(let i=0;i<10;i++)m.step(1/30); m.render&&m.render(); return {dlg:typeof m.obDlgOpen==='function'?m.obDlgOpen():'n/a'} });
 await c.screenshot({path:OUT+'banner_dialog_open_rc8.png'});
 await pg.evaluate(()=>{ const m=__ms; for(let i=0;i<30*8;i++)m.step(1/30); m.G.pullT=Math.max(m.G.pullT,10); m.render&&m.render() });
 await c.screenshot({path:OUT+'banner_after_dialog_rc8.png'});
 console.log(JSON.stringify({errs,r})); await br.close() })();
