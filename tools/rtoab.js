/* rc7 #6 A/B (Hauptman): RTO protection to ~5:00. Per seed: bot run with the normal fight PLUS forced exposure - from 1:00 the RTO takes an
   extra rifle hit (D dmg through hurtMember, all the game's own multipliers) every 0.5 s. Records whether / when the RTO is lost before 5:00.
   Same seeds with ?rtop=0 (B). usage: N=20 D=8 node tools/rtoab.js. Serves itself on port 0. */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'), N=+process.env.N||20, D=+process.env.D||8, NAT=!!process.env.NAT;
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/'; const br=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']});
 const res={A:[],B:[]};
 for(let s=1;s<=N;s++)for(const [arm,q] of [['A',''],['B','&rtop=0']]){ const pg=await br.newPage(); await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&char=doc&autostart&seed='+(1000+s)+q); await pg.waitForTimeout(900);
  res[arm].push(await pg.evaluate(([D,NAT])=>{ window.__simHold=true; const M=__ms,g=()=>M.G; let acc=0;
    for(let i=0;i<60*300;i++){ if(M.stateX==='levelup')M.pick(0); if(M.stateX==='sig')M.step(0); M.step(1/60); if(M.stateX==='over'||M.stateX==='end')break; if(g().rtoLost)return {lost:+g().t.toFixed(0)};
      if(!NAT&&g().t>=60){ acc+=1/60; if(acc>=.5){ acc=0; const r=(M.coy||[]).find(m=>m.rto&&m.hp>0&&m.state==='ok'&&!m.hid); if(r)M.hurtMember(r,D) } } }
    return {lost:g().rtoLost?+g().t.toFixed(0):null,end:M.stateX,t:+g().t.toFixed(0)} },[D,NAT])); await pg.close() }
 const surv=a=>a.filter(o=>o.lost===null).length, over=a=>a.filter(o=>o.end==="over").length, med=a=>{ const l=a.filter(o=>o.lost!==null).map(o=>o.lost).sort((x,y)=>x-y); return l.length?l[l.length>>1]:null };
 console.log(JSON.stringify(res)); console.log(`RTOAB N=${N} D=${D}${NAT?" natural":""}: ON RTO not lost ${surv(res.A)}/${N} (Doc died first in ${over(res.A)}; median loss t ${med(res.A)}) | OFF ?rtop=0 ${surv(res.B)}/${N} (Doc died first in ${over(res.B)}; median loss t ${med(res.B)})`);
 await br.close(); srv.close() })();
