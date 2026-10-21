/* rc7 #4: jungle_v3 (?jungle=1) - chunk bake times, types present, no errors; screenshots near base, paddy, far edge, west hills. Serves itself on port 0. */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'); const OUT=process.argv[2]||''; const MOB=!!process.env.MOB;
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({executablePath:process.env.CH||undefined,args:['--no-sandbox']}); const errs=[]; let fail=0; const ok=(c,m,o)=>{ console.log((c?'PASS ':'FAIL ')+m,o?JSON.stringify(o):''); if(!c)fail++ };
 const pg=await br.newPage(MOB?{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}}); pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&char=doc&autostart&botcall=99999&god&seed=1&jungle=1'+(process.env.Q||'')); await pg.waitForTimeout(2000);
 const shots=[['near',null],['paddy','P'],['far',[3200,0]],['west',[-2200,300]]]; const res={};
 for(const [n,w] of shots){ const r=await pg.evaluate(w=>{ window.__simHold=true; const M=__ms,g=M.G; window.BOTF.move=()=>[0,0];
     if(Array.isArray(w)){ g.p.x=w[0]; g.p.y=w[1] } else if(w==='P'){ outer: for(let r=200;r<3000;r+=96)for(let a=0;a<6.28;a+=.3){ const x=g.p.x+Math.cos(a)*r,y=g.p.y+Math.sin(a)*r; if(M.JG.type(Math.floor(x/48),Math.floor(y/48))==='paddy'){ g.p.x=x; g.p.y=y; break outer } } }
     for(let i=0;i<90;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60); M.render() }
     const J=M.JG, ty={}; for(let tx=Math.floor((g.p.x-640)/48);tx<(g.p.x+640)/48;tx++)for(let tz=Math.floor((g.p.y-360)/48);tz<(g.p.y+360)/48;tz++){ const k=J.type(tx,tz); ty[k]=(ty[k]|0)+1 }
     const ms=J.ms.slice(); return {chunks:J.F.size,bakeMax:Math.round(Math.max(...ms,0)),bakeAvg:Math.round(ms.reduce((a,b)=>a+b,0)/Math.max(1,ms.length)),types:ty,cov:J.covered(g.p.x,g.p.y)} },w);
   res[n]=r; console.log(n,JSON.stringify(r)); if(OUT){ fs.mkdirSync(OUT,{recursive:true}); await pg.screenshot({path:path.join(OUT,'jungle_'+n+(MOB?'_mob':'')+'.png')}) } }
 ok(res.near.chunks>0,'chunks baked'); ok(!res.near.types.jungle&&!res.near.types.rubber&&!res.near.types.teak,'no canopy types near the base',res.near.types);
 ok((res.far.types.jungle|0)+(res.far.types.rubber|0)+(res.far.types.teak|0)>0,'canopy at the map edge',res.far.types);
 ok((res.west.types.jungle|0)+(res.west.types.rubber|0)+(res.west.types.teak|0)>0,'canopy in the western hills',res.west.types);
 ok(!errs.length,'no page errors',errs.slice(0,3)); await br.close(); srv.close(); console.log(fail?'JUNGLETEST FAIL '+fail:'JUNGLETEST PASS'); process.exit(fail?1:0) })();
