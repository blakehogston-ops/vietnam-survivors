const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({channel:'chrome',args:['--no-sandbox']}); const pg=await br.newPage({viewport:{width:1280,height:800}});
 await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&autostart&give=napalm:3'); await pg.waitForTimeout(1500);
 await pg.evaluate(()=>{ window.__simHold=true; const M=__ms; for(let i=0;i<60*70;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60) } const r=M.coy.find(m=>m.rto); if(r)r.callT=1.5; window.__simHold=false });
 await pg.waitForTimeout(1200); await pg.screenshot({path:'/tmp/shot3.png'}); await br.close(); srv.close() })();
