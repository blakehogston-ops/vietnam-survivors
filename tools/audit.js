const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({channel:'chrome',args:['--no-sandbox']}); const pg=await br.newPage({viewport:{width:1280,height:800}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&autostart&give=napalm:4,strafe:4,arclight:6,tank:3,company:2,medevac:2'); await pg.waitForTimeout(1500);
 const at=[40,75,110,150,190,240]; let t0=0;
 for(const t of at){ await pg.evaluate(T=>{ window.__simHold=true; const M=__ms; while(M.G.t<T&&M.stateX!=='over'){ if(M.stateX==='levelup')M.pick(0); else if(M.stateX==='sig')M.answer(true); M.step(1/60) } window.__simHold=false },t); await pg.waitForTimeout(400); await pg.screenshot({path:'/workspace/lco-audit/fix_'+t+'s.png'}) }
 console.log(errs.slice(0,3)); await br.close(); srv.close() })();
