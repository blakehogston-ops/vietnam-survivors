const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({channel:'chrome',args:['--no-sandbox']}); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&autostart&give=company:2,medevac:2,howitzer:3,arclight:6'); await pg.waitForTimeout(1500);
 const r=await pg.evaluate(()=>{ window.__simHold=true; const M=__ms,o={}; for(let i=0;i<60*60;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60) }
  const g=M.G; o.squad=M.squad.map(m=>m.role); g.ps.dustoff=1; M.dustoffRevive(); M.callCompany(M.ITEMS.company.stats(2)); M.callMedevac(M.ITEMS.medevac.stats(2)); g.char="radio"; g.abCd=0; M.useAbility(); let near=0,n=0;
  for(let i=0;i<60*60;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60); const r=M.squad.concat(M.coy).find(m=>m.rto&&m.hp>0); if(r){o.role=r.role;o.sq=!r.coy;n++; if(Math.hypot(r.x-g.p.x,r.y-g.p.y)<60)near++} }
  o.near=n?Math.round(100*near/n):null; o.calls=g.rtoCalls|0; o.coyH=M.coyH.length; o.coy=M.coy.length; o.rq=(g.rq||[]).length; return o });
 console.log(JSON.stringify(r),errs.slice(0,3)); await br.close(); srv.close() })();
