/* rc8.1 virtual-pad test: pad X calls the bird from 5:00 on the pickup pad, then pad X pops smoke; RB tap = patch Marine, RB hold 0.6 s = HOLD F engineers; pad-mode labels name the pad button. Usage: CH=<chrome> node tools/padcall.js (own server, exit 1 on FAIL) */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']}); let fail=0; const errs=[];
 const ok=(c,m,o)=>{ console.log((c?'PASS ':'FAIL ')+m,o!==undefined?JSON.stringify(o):''); if(!c)fail++ };
 for(const seed of [1,2]){ const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&char=doc&autostart&god&seed='+seed); await pg.waitForTimeout(1500);
  await pg.evaluate(()=>{ window.__simHold=true; DBG.pad.connect(); });
  await pg.waitForTimeout(200);
  const pre=await pg.evaluate(()=>{ const M=__ms, N2=M.N2; const run=(n,f)=>{ for(let i=0;i<n;i++){ if(M.stateX==='levelup')M.pick(0); if(M.stateX==='mohcard'){ try{M.MOH.choose(false)}catch(e){} } if(M.stateX==='sig')M.step(0); M.step(1/30); if(f)f(); if(M.stateX==='over')break } };
    let guard=0; while(M.G.t<302&&guard++<20000)run(30); const ex=M.G.ex; const P=()=>{ if(ex.pre){ M.G.p.x=ex.pre.x; M.G.p.y=ex.pre.y } }; P(); run(15,P);
    return {t:+M.G.t.toFixed(1),ph:ex.ph,pre:!!ex.pre,canCall:N2.canCall(M.G),atPad:N2.atPad(M.G),st:M.stateX,keys:document.querySelector('.padKeys').textContent} });
  ok(pre.ph===0&&pre.atPad&&pre.st==='play','seed '+seed+' at 5:02 on the pad, not yet called',pre);
  ok(/call the bird \/ pop smoke/.test(pre.keys)&&/enter\/leave bunker/.test(pre.keys)&&/hold RB call engineers/.test(pre.keys)&&!/\bPB\b/.test(pre.keys),'keysText plain words',pre.keys);
  const lab=await pg.evaluate(()=>{ __ms.step(1/30); const b=document.getElementById('n2x'); return b&&b.textContent });
  ok(!lab||/\(X\)/.test(lab),'pad call button names pad X',lab);
  await pg.evaluate(()=>DBG.pad.press('X',120)); await pg.waitForTimeout(400);
  const c=await pg.evaluate(()=>{ const M=__ms; M.step(1/30); return {ph:M.G.ex.ph,call:M.N2.log&&M.N2.log.call} });
  ok(c.ph>=1,'seed '+seed+' pad X called the bird',c);
  const s=await pg.evaluate(()=>{ const M=__ms, N2=M.N2, ex=()=>M.G.ex; let n=0, w=null; const fix=()=>{ const e=ex(), z=e.lz||e.pad||e.pre; if(z){ M.G.p.x=z.x; M.G.p.y=z.y } };
    while(n++<30*240){ if(M.stateX==='levelup')M.pick(0); if(M.stateX==='mohcard'){ try{M.MOH.choose(false)}catch(e){} } if(M.stateX==='sig')M.step(0); w=N2.smokeWait&&N2.smokeWait(); if(w==='on')break; M.step(1/30); fix(); if(M.stateX==='over')break }
    return {t:+M.G.t.toFixed(1),ph:ex().ph,w,col:ex().smokeCol||null,st:M.stateX} });
  ok(s.w==='on','seed '+seed+' bird asks for smoke, Doc on the pad',s);
  await pg.evaluate(()=>DBG.pad.press('X',100)); await pg.waitForTimeout(300);
  const s2=await pg.evaluate(()=>{ const M=__ms; return {w:M.N2.smokeWait(),col:M.G.ex.smokeCol||null,ph:M.G.ex.ph} });
  ok(s2.w!=='on','seed '+seed+' pad X popped smoke',{before:s,after:s2});
  const rb=await pg.evaluate(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); const m0=DBG.pad.info().medTap; DBG.pad.press('RB',150); await w(400); const tap=DBG.pad.info();
    DBG.pad.press('RB',1100); await w(300); const early=DBG.pad.info(); await w(500); const held=DBG.pad.info(); await w(600); const after=DBG.pad.info();
    return {tapMed:tap.medTap-m0,early:early.rbHold,held:held.rbHold,heldFb:held.fbHeld,afterMed:after.medTap-m0,afterHold:after.rbHold,txt:(document.body.innerText.match(/HOLD \S+ TO CALL ENGINEERS/)||[''])[0]} });
  ok(rb.tapMed===1&&!rb.early&&rb.held&&rb.heldFb&&rb.afterMed===1&&!rb.afterHold,'seed '+seed+' RB tap = patch Marine, RB hold 0.6 s = engineer hold (no med)',rb);
  if(seed===1)await pg.screenshot({path:'/workspace/proof/rc81/pass3b/07-pad-smoke.png'}); await pg.close() }
 ok(!errs.length,'no page errors',errs); await br.close(); srv.close(); console.log(fail?'PADCALL FAIL':'PADCALL PASS'); process.exit(fail?1:0) })();
