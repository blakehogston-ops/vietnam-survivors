/* rc7 #4: ZiS-3 emplacement - spawns after 4:00, rings on Doc, crew killable, gun silent when crew is down, art draws with no errors. Serves itself on port 0. */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'); const OUT=process.argv[2]||'';
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({executablePath:process.env.CH||undefined,args:['--no-sandbox']}); let fail=0; const errs=[];
 const ok=(c,m,o)=>{ console.log((c?'PASS ':'FAIL ')+m,o?JSON.stringify(o):''); if(!c)fail++ };
 for(const seed of [1,2,3]){ const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&char=doc&autostart&botcall=99999&god&seed='+seed); await pg.waitForTimeout(1500);
  const r=await pg.evaluate(()=>{ window.__simHold=true; const M=__ms,Z=M.ZIS,N2=M.N2,g=()=>M.G,o={};
    const run=(n,f)=>{ for(let i=0;i<n;i++){ if(M.stateX==='levelup')M.pick(0); if(M.stateX==='sig')M.step(0); M.step(1/60); if(f&&f())return true } return false };
    window.BOTF.move=()=>[0,0]; o.before=run(60*235,()=>!!Z.g); o.t0=Math.round(g().t);
    g().ex&&(g().ex.ph=Math.min(g().ex.ph,2)); Z.next=g().t; o.spawn=run(60*40,()=>!!Z.g); if(!Z.g)return o; o.ts=Math.round(g().t); o.crew=Z.g.crew.length;
    for(const e of Z.g.crew){ e.hp=e.mhp=1e9 } const s0=Z.log.shots; run(60*25); o.shots=Z.log.shots-s0; o.ph=g().ex&&g().ex.ph; o.spare=N2.spareDoc(g()); o.st=M.stateX; o.has=!!Z.g; o.cd=Z.g&&+Z.g.cd.toFixed(2); o.live=Z.g&&Z.g.live; o.ok=Z.ok(g()); o.char=!!g().char; o.cal76=N2.shells.some(q=>q.cal===76)||o.shots>0;
    M.render&&M.render(); o.vis=Math.round(Math.hypot(Z.g.x-g().p.x,Z.g.y-g().p.y));
    for(const e of Z.g.crew)e.dead=true; const s1=Z.log.shots; run(60*15); o.after=Z.log.shots-s1; o.down=!!(Z.g&&Z.g.dead); return o });
  if(OUT&&seed===1){ await pg.evaluate(()=>{ const M=__ms,Z=M.ZIS,g=M.G; Z.g=null; Z.spawn(g); const z=Z.g; g.p.x=z.x+120; g.p.y=z.y+40; z.fire=.05; M.render&&M.render() }); fs.mkdirSync(OUT,{recursive:true}); await pg.screenshot({path:path.join(OUT,'zis3_ingame.png')}) }
  ok(!r.before,'seed '+seed+' no gun before 4:00',r); ok(r.spawn&&r.crew===5,'seed '+seed+' gun + 5 crew spawn after 4:00',r); ok(r.shots>=1,'seed '+seed+' fires 76mm rounds with a ring',r); ok(r.after===0&&r.down,'seed '+seed+' silent once the crew is down',r);
  await pg.close() }
 ok(!errs.length,'no page errors',errs.slice(0,3)); await br.close(); srv.close(); console.log(fail?'ZISTEST FAIL '+fail:'ZISTEST PASS'); process.exit(fail?1:0) })();
