/* rc7 #5 (Hauptman): enemy mortar rounds aimed at Doc land on his OPEN side (away from the horde), INCOMING ring visible >= 1.8 s before impact,
   no rounds on the pad in the final phase. Compares ?mopen=0. Serves itself on port 0. */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']}); let fail=0; const errs=[]; const ok=(c,m,o)=>{ console.log((c?'PASS ':'FAIL ')+m,o?JSON.stringify(o):''); if(!c)fail++ };
 const run=async(q,seed)=>{ const pg=await br.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&char=doc&autostart&god&seed='+seed+q+(process.env.Q||'')); await pg.waitForTimeout(1200);
  const r=await pg.evaluate(()=>{ window.__simHold=true; const M=__ms,N2=M.N2,g=M.G,o={open:0,doc:0,dist:[],lead:[],padIn:0,padN:0};
    for(let i=0;i<60*70;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60) } window.BOTF.move=()=>[0,0];
    const p=g.p, spare=N2.spareDoc; N2.spareDoc=()=>false;
    for(let k=0;k<100;k++){ const ha=k*0.7;
      let c=0;
      const en=M.enemies||[]; for(const e of en){ if(e.dead)continue; const a=ha+(Math.random()-.5)*.8, rr=120+Math.random()*180; e.x=p.x+Math.cos(a)*rr; e.y=p.y+Math.sin(a)*rr; c++ }
      while(c<8){ const e=M.spawn('nva',p.x+Math.cos(ha)*200,p.y+Math.sin(ha)*200); if(!e)break; c++ }
      const before=N2.shells.length; N2.barrage(g); const S=N2.shells.slice(before);
      for(const q of S){ const L=.85*(q.d-(q.w||0)); o.lead.push(+L.toFixed(2)); if(!q.tp)continue; o.doc++; const dx=q.x-p.x, dy=q.y-p.y; if(dx*Math.cos(ha)+dy*Math.sin(ha)<0)o.open++; o.dist.push(Math.round(Math.hypot(dx,dy))) }
      N2.shells.length=0 }
    // pad rule: final phase, pad on Doc's open side
    const ex=g.ex, EX=M.EXc; const sv={ph:ex.ph,t:ex.t,pad:ex.pad}; ex.ph=5; ex.pad={x:p.x-120,y:p.y,r:EX.PAD_R};
    for(let k=0;k<30;k++){ N2.barrage(g); for(let i=0;i<300;i++){ for(const q of N2.shells)N2.padSafe(q) } for(const q of N2.shells){ o.padN++; if(Math.hypot(q.x-ex.pad.x,q.y-ex.pad.y)<EX.PAD_R+N2.BR)o.padIn++ } N2.shells.length=0 }
    ex.ph=sv.ph; ex.pad=sv.pad; N2.spareDoc=spare; o.minLead=Math.min(...o.lead); o.lead=undefined; o.medD=o.dist.sort((a,b)=>a-b)[o.dist.length>>1]; o.dist=undefined; return o });
  await pg.close(); return r };
 const tot=(q)=>({open:0,doc:0,padIn:0,padN:0,minLead:99,medD:[]});
 for(const [name,q] of [['ON',''],['OFF','&mopen=0']]){ const T=tot(); for(const s of [1,2,3]){ const r=await run(q,s); T.open+=r.open; T.doc+=r.doc; T.padIn+=r.padIn; T.padN+=r.padN; T.minLead=Math.min(T.minLead,r.minLead); T.medD.push(r.medD) }
  T.openPct=Math.round(100*T.open/Math.max(1,T.doc)); console.log(name,JSON.stringify(T));
  if(name==='ON'){ ok(T.doc>=40&&T.openPct>=90,'ON: rounds near Doc land on his open side (>=90%)',T); ok(T.minLead>=1.8,'ON: INCOMING ring visible >= 1.8 s before impact',{minLead:T.minLead}); ok(T.padIn===0,'ON: no rounds on the pad in the final phase',{padIn:T.padIn,padN:T.padN}) }
  else console.log('OFF baseline: openPct',T.openPct,'minLead',T.minLead) }
 ok(!errs.length,'no page errors',errs.slice(0,3)); await br.close(); srv.close(); console.log(fail?'MORTEST FAIL '+fail:'MORTEST PASS'); process.exit(fail?1:0) })();
