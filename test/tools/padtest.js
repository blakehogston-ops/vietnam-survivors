/* rc6b blockers 1+2: call button disabled off the pad / enabled on it for BOTH calls (first call from 3:30, short-final smoke),
   and Doc walks to the pad from several start spots (straight steering, Marines packed in his way). Serves itself on port 0. */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({executablePath:process.env.CH||undefined,channel:process.env.CH?undefined:'chrome',args:['--no-sandbox']}); let fail=0; const errs=[];
 const ok=(c,m,o)=>{ console.log((c?'PASS ':'FAIL ')+m,o?JSON.stringify(o):''); if(!c)fail++ };
 for(const seed of [1,2,3]){ const pg=await br.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&char=doc&autostart&botcall=99999&god&seed='+seed); await pg.waitForTimeout(1500);
  const r=await pg.evaluate(()=>{ window.__simHold=true; const M=__ms, N2=M.N2, o={}; const g=()=>M.G, b=()=>document.getElementById('n2x');
    const run=(n,f)=>{ for(let i=0;i<n;i++){ if(M.stateX==='levelup')M.pick(0); if(M.stateX==='sig')M.step(0); M.step(1/60); if(f&&f())return true } return false };
    window.BOTF.move=()=>[0,0]; run(60*400,()=>g().t>=N2.XMIN+2);
    const ex=g().ex, P=ex.pre; o.pre=!!P; if(!P)return o;
    const at=(x,y)=>{ g().p.x=x; g().p.y=y; M.step(1/60); const e=b(); return {dis:!!(e&&e.disabled), txt:e&&e.textContent, vis:e&&e.style.display} };
    o.off1=at(P.x+260,P.y); o.pressOff1=N2.press(); o.calledOff=!!ex.padPlan;
    o.on1=at(P.x,P.y); o.pressOn1=N2.press(); o.calledOn=!!ex.padPlan; o.padSame=ex.pad&&Math.hypot(ex.pad.x-P.x,ex.pad.y-P.y)<1;
    // second call: short-final smoke wait
    window.BOTF.move=null; const got=run(60*200,()=>ex.ph===4&&ex.call&&ex.call.st==='wait'); o.wait=got;
    if(got){ window.BOTF.move=()=>[0,0]; const L=ex.pad; o.off2=at(L.x+260,L.y); o.on2=at(L.x,L.y) }
    return o });
  ok(r.pre,'seed '+seed+' pad pre-marked at 3:30');
  ok(r.off1&&r.off1.dis&&/GET TO THE PAD/.test(r.off1.txt)&&r.pressOff1===false&&!r.calledOff,'seed '+seed+' first call DISABLED off the pad (button + X/tap)',r.off1);
  ok(r.on1&&!r.on1.dis&&/CALL (THE )?BIRD/.test(r.on1.txt)&&r.pressOn1===true&&r.calledOn&&r.padSame,'seed '+seed+' first call ENABLED on the pad, bird uses that pad',r.on1);
  ok(r.wait&&r.off2&&r.off2.dis&&/GET TO THE PAD/.test(r.off2.txt),'seed '+seed+' smoke call DISABLED off the pad',r.off2);
  ok(r.wait&&r.on2&&!r.on2.dis&&/ON THE PAD/.test(r.on2.txt),'seed '+seed+' smoke call ENABLED on the pad',r.on2);
  await pg.close() }
 // walk test
 for(const seed of [1,2,3,4,5]){ const pg=await br.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&char=doc&autostart&botcall=99999&god&seed='+seed); await pg.waitForTimeout(1500);
  const r=await pg.evaluate(()=>{ window.__simHold=true; const M=__ms,N2=M.N2,g=()=>M.G; const run=(n,f)=>{ for(let i=0;i<n;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60); if(f&&f())return i } return -1 };
    window.BOTF.move=()=>[0,0]; run(60*400,()=>g().t>=N2.XMIN+1); const out=[];
    for(let k=0;k<5;k++){ const ex=g().ex; ex.pre=null; M.step(1/60); const P=ex.pre; if(!P){ out.push({k,err:'no pad'}); continue }
      const mates=M.coy.filter(m=>m.hp>0).slice(0,6); const dx=P.x-g().p.x, dy=P.y-g().p.y, d=Math.hypot(dx,dy);
      window.BOTF.move=()=>{ const p=g().p, T=g().ex.pre||P, ax=T.x-p.x, ay=T.y-p.y, l=Math.hypot(ax,ay)||1; mates.forEach((m,i)=>{ m.x=p.x+ax/l*(14+i*6); m.y=p.y+ay/l*(14+i*6)+(i%2?8:-8) }); return l<10?[0,0]:[ax/l,ay/l] };
      const f=run(60*15,()=>N2.atPad(g())); out.push({k,d:Math.round(d),s:f<0?null:+(f/60).toFixed(1)});
      { window.BOTF.move=()=>[0,0]; const a=k*1.25+.4; g().p.x=P.x+Math.cos(a)*650; g().p.y=P.y+Math.sin(a)*650; run(60*3); const Q=ex.pre; window.BOTF.move=()=>{ const p=g().p, T=g().ex.pre||Q, ax=T.x-p.x, ay=T.y-p.y, l=Math.hypot(ax,ay)||1; return l<10?[0,0]:[ax/l,ay/l] }; const f2=Q?run(60*20,()=>{ return N2.atPad(g()) }):-1; out.push({k,far:1,repick:Q!==P,s:f2<0?null:+(f2/60).toFixed(1)}) }
      window.BOTF.move=()=>[0,0]; const a=k*1.3; g().p.x+=Math.cos(a)*700; g().p.y+=Math.sin(a)*700; for(let q=0;q<40&&!M.canWadeX?.(g().p.x,g().p.y);q++)break; M.step(1/60) }
    return out });
  ok(r.every(q=>q.s!==null),'seed '+seed+' Doc reaches the pad from 5 spots (Marines packed on his line)',r); await pg.close() }
 ok(!errs.length,'no page errors',errs.slice(0,3)); console.log(fail?'FAILED '+fail:'ALL PASS'); await br.close(); srv.close(); process.exit(fail?1:0) })();
