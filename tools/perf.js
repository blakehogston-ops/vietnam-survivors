/* rc7: frame time. Sim 150 s with the bot (busy mid-run), then time update(1/60)+render() for 600 frames. Desktop 1280x720 and mobile LOW
   (844x390 DPR2, touch, ?lowfx=1). Reports mean / p95 ms of render and of update. usage: CH=... node tools/perf.js [extra-query] */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'), Q=process.argv[2]||'';
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({executablePath:process.env.CH||undefined,channel:process.env.CH?undefined:'chrome',args:['--no-sandbox']}); const out={};
 for(const [k,ctxo,lq] of [['desktop',{viewport:{width:1280,height:720}},''],['mobileLOW',{viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2},'&lowfx=1']]){
  const ctx=await br.newContext(ctxo), pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&notut&bot&char=doc&autostart&god&seed=7'+lq+Q); await pg.waitForTimeout(1500);
  out[k]=await pg.evaluate(()=>{ window.__simHold=true; const M=__ms; for(let i=0;i<60*150;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60) }
    const R=[],U=[]; for(let i=0;i<600;i++){ if(M.stateX==='levelup')M.pick(0); const a=performance.now(); M.step(1/60); const b=performance.now(); M.render(); const c=performance.now(); U.push(b-a); R.push(c-b) }
    const st=A=>{ const s=A.slice().sort((x,y)=>x-y); return {mean:+(A.reduce((x,y)=>x+y,0)/A.length).toFixed(2),p95:+s[Math.floor(s.length*.95)].toFixed(2)} };
    return {render:st(R),update:st(U),enemies:M.units().e.length} }); out[k].errs=errs.length; await ctx.close() }
 console.log(JSON.stringify(out)); await br.close(); srv.close() })();
