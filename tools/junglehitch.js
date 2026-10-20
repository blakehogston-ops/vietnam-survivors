/* rc7 jungle_v3_lite: in-browser frame cost + chunk hitch. Bot fight to 1:10, then Doc walks east at 260 px/s for 12 s into fresh chunks.
   Per frame times update(1/60) and render() (performance.now). Reports render mean/p95/max, frame max (= hitch), JUNGLE3.pending().
   Desktop 1280x720 and mobile LOW (844x390 DPR2 touch ?lowfx=1). usage: node tools/junglehitch.js "&jungle=1" */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'), Q=process.argv[2]||'';
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/'; const br=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']}); const out={};
 for(const [nm,opt,q2] of [['desktop',{viewport:{width:1280,height:720}},''],['mobileLOW',{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true},'&lowfx=1']]){
  const pg=await br.newPage(opt); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&char=doc&autostart&god&seed=3'+Q+q2); await pg.waitForTimeout(1500);
  out[nm]=await pg.evaluate(()=>{ window.__simHold=true; const M=__ms, J=window.JUNGLE3; for(let i=0;i<60*70;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60) }
    for(let i=0;i<120;i++){ M.step(1/60); M.render() }   /* settle the first screen */
    window.BOTF.move=()=>[1,0]; const R=[],F=[]; let pend=0;
    for(let i=0;i<60*12;i++){ if(M.stateX==='levelup')M.pick(0); const t0=performance.now(); M.step(1/60); M.G.p.x+=260/60*0; const t1=performance.now(); M.render(); const t2=performance.now(); R.push(t2-t1); F.push(t2-t0); if(J&&J.pending)pend=Math.max(pend,J.pending()) }
    const st=a=>{ const s=a.slice().sort((x,y)=>x-y); return {mean:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2),p95:+s[Math.floor(s.length*.95)].toFixed(1),max:+s[s.length-1].toFixed(1)} };
    return {render:st(R),frame:st(F),over33:F.filter(x=>x>33).length,pendMax:pend,chunks:M.JG.F.size,dist:Math.round(M.G.p.x)} }); out[nm].errs=errs.length; await pg.close() }
 console.log(JSON.stringify(out)); await br.close(); srv.close() })();
