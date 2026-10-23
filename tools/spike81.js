/* rc8.1 EP spike cap stress: RPG + NVA-officer melee together never exceed BAL81.SPIKE.CAP x max HP in any rolling BAL81.SPIKE.WIN s.
   Burst of 8 RPG hits + 20 officer contacts in 1.5 s at 5:10 (the Junior's 72->3 window), seed 4. usage: CH=... node tools/spike81.js */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(path.join(__dirname,'..'));
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const br=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']}); let fail=0;
 for(const seed of [4,1,2,3,5]){ const pg=await br.newPage(); await pg.goto('http://localhost:'+srv.address().port+'/index.html?nodemo&nointro&nobrief&notut&bot&char=doc&autostart&seed='+seed); await pg.waitForTimeout(1500);
  const r=await pg.evaluate(()=>{ window.__simHold=true; const M=__ms, G=()=>M.G; for(let i=0;i<60*20;i++){ if(M.stateX==='levelup'){M.pick(0);continue} M.step(1/60) }
   const g=G(); g.t=310; g.p.hp=g.p.maxHp; g.p.invul=0; const L=[]; const h0=()=>g.p.hp;
   for(let k=0;k<90;k++){ g.p.invul=0; const a=h0(); if(k%11===0)M.hurtPlayer(18,'RPG/B-40 rocket'); if(k%4===1)M.hurtPlayer(12,'NVA officer melee'); L.push([g.t,a-h0()]); g.t+=1/60 }
   let w=0; for(const x of L){ let u=0; for(const y of L)if(y[0]<=x[0]&&y[0]>x[0]-2)u+=y[1]; w=Math.max(w,u) } return {pct:+(100*w/g.p.maxHp).toFixed(1),max:g.p.maxHp,cap:.35} });
  const ok=r.pct<=r.cap*100+.5; if(!ok)fail++; console.log((ok?'PASS':'FAIL')+' seed '+seed+' worst 2 s RPG+officer burst '+r.pct+'% of '+r.max+' HP (cap '+r.cap*100+'%)'); await pg.close() }
 await br.close(); srv.close(); console.log(fail?'SPIKE81 FAIL':'SPIKE81 PASS'); process.exit(fail?1:0) })();
