const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({channel:'chrome',args:['--no-sandbox']}); const pg=await br.newPage({viewport:{width:1280,height:800}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&autostart'); await pg.waitForTimeout(1500);
 const ok=await pg.evaluate(()=>{ window.__simHold=true; const M=__ms; for(let i=0;i<60*20;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60) } const g=M.G; M.callCompany(M.ITEMS.company.stats(2)); for(let i=0;i<60*3.2;i++)M.step(1/60); M.medpacks.push({x:g.p.x+40,y:g.p.y+10,life:30,pull:false,sp:0},{x:g.p.x-50,y:g.p.y+30,life:30,pull:false,sp:0}); window.__simHold=false; return !!SHEET1.drawSeaKnight&&!!SHEET1.drawDressing });
 await pg.waitForTimeout(300); await pg.screenshot({path:'/workspace/lco-audit/art_ch46_dressing.png'}); console.log(ok,errs.slice(0,3)); await br.close(); srv.close() })();
