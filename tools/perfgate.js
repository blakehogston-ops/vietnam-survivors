#!/usr/bin/env node
/* perfgate: repeatable frame-time gate (builds on Lead's tools/perf.js @ b5385d7).
 usage: NODE_PATH=/workspace/perf/node_modules node tools/perfgate.js [--profile] [--trace] [--count] [--only=scen] [--q=extra] [--budget]
 Scenarios (seed 7, bot+god, sim 150 s then measure 360 frames):
   day     tod=12           night   tod=21
   strike  tod=21 + 3-plane napalm run near the player every 2.5 s (airstrike + fire, the reported worst case)
 Profiles: desktop 1280x720 DPR1 no throttle | mobile 844x390 DPR2 touch lowfx CPU x4 (CDP Emulation.setCPUThrottlingRate)
 Frame = step(1/60)+render()+1px getImageData (forces canvas raster flush, so GPU/raster cost is included).
 Output: JSON + table; avg/p95/p99 ms. --budget exits 1 if strike p95 > budget (desktop 16.7, mobile 33.3). */
const {chromium}=require('playwright-core'),http=require('http'),fs=require('fs'),path=require('path');
const A=process.argv.slice(2), F=k=>A.some(a=>a==='--'+k), V=k=>{const a=A.find(a=>a.startsWith('--'+k+'='));return a?a.split('=').slice(1).join('='):null};
const root=process.env.ROOT||path.resolve(__dirname,'..'), N=+(V('frames')||360);
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(root,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.statusCode=404;r.end();return}r.end(fs.readFileSync(f))});
const PROF={deck:{ctx:{viewport:{width:1280,height:800}},q:'',cpu:3,budget:16.7},desktop:{ctx:{viewport:{width:1280,height:720}},q:'',cpu:1,budget:16.7},
 mobile:{ctx:{viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2},q:'&lowfx=1',cpu:4,budget:33.3}};
const SCEN={day:{q:'&tod=12',strike:0},night:{q:'&tod=21',strike:0},strike:{q:'&tod=21&napsafe=0',strike:1}};
const outDir=V('out')||'/workspace/perf/out'; fs.mkdirSync(outDir,{recursive:true});
(async()=>{await new Promise(r=>srv.listen(0,r));const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({executablePath:process.env.CH||'/usr/bin/google-chrome',args:['--no-sandbox','--enable-gpu-rasterization','--ignore-gpu-blocklist']});
 const res={}; let fail=0;
 for(const pk of (V('prof')||'desktop,mobile').split(',')){const P=PROF[pk];
  for(const sk of (V('only')||'day,night,strike').split(',')){const S=SCEN[sk];
   const ctx=await br.newContext(P.ctx),pg=await ctx.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));
   const cdp=await ctx.newCDPSession(pg);
   if(F('count'))await pg.addInitScript(()=>{const C=CanvasRenderingContext2D.prototype,cnt=window.__cc={};
     for(const m of ['fillRect','fill','stroke','arc','drawImage','fillText','strokeText','createRadialGradient','createLinearGradient','save','restore','beginPath','ellipse','putImageData','getImageData','clip','setTransform']){const o=C[m];if(!o)continue;C[m]=function(){cnt[m]=(cnt[m]||0)+1;return o.apply(this,arguments)}}
     for(const p of ['shadowBlur','filter','globalCompositeOperation','fillStyle']){const d=Object.getOwnPropertyDescriptor(C,p);Object.defineProperty(C,p,{get:d.get,set(v){if(p!=='shadowBlur'||v)cnt['set:'+p]=(cnt['set:'+p]||0)+1;d.set.call(this,v)},configurable:true})}});
   await pg.goto(B+'index.html?nodemo&nointro&nobrief&notut&bot&char=doc&autostart&god&seed=7'+P.q+S.q+(V('q')||''));await pg.waitForTimeout(1500);
   await pg.evaluate(()=>{window.__simHold=true;const M=__ms;for(let i=0;i<60*150;i++){if(M.stateX==='levelup')M.pick(0);M.step(1/60)}});
   if(P.cpu>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:P.cpu});
   if(F('profile')){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:200});await cdp.send('Profiler.start')}
   if(F('trace')&&sk==='strike')await br.startTracing(pg,{path:`${outDir}/trace-${pk}-${sk}.json`,categories:['devtools.timeline','v8','v8.gc','disabled-by-default-devtools.timeline','blink.gc']});
   await cdp.send('HeapProfiler.collectGarbage');
   const m0=(await cdp.send('Performance.enable'),await cdp.send('Performance.getMetrics')).metrics;
   const r=await pg.evaluate(([N,strike,SH])=>{const M=__ms,X=__perf,T=[],U=[],R=[],cc=window.__cc,ccs={},cv=document.querySelector('canvas'),c2=cv.getContext('2d');let pk=0,fk=0,h0=performance.memory?performance.memory.usedJSHeapSize:0,hmax=0,gcs=0,last=h0;
     if(/[?&]pgamt=1\b/.test(location.search)&&X.AMT&&X.fbBuild){ window.__pgFb=X.fbBuild(); for(let k=0;k<90;k++){if(M.stateX==='levelup')M.pick(0);M.step(1/60)} window.__pgAmt=X.AMT.V.length }   /* full stack: firebase marked built, Doc moved to it -> fb2 base + 3 amtracs (2 LVTP-5 + LVTH-6) on screen */
     { const m=location.search.match(/[?&]pgsmix=([\d.]+)/); if(m)window.__smixForce=+m[1] }
     const SHF=+((location.search.match(/[?&]pgshotf=(\d+)/)||[])[1]||100);
     const strikeRun=()=>{const p=X.G.p;const a=0.6,nx=-Math.sin(a),ny=Math.cos(a);for(let i=0;i<3;i++){const off=(i-1)*80;X.strikes.push({wid:X.CURW,cx:p.x+120+nx*off,cy:p.y+ny*off,a,len:360,t:-i*.25,delay:.3,drops:0,dropN:9,dmg:40,rad:70,fdmg:12,flife:6,sfx:true,jx:0,jy:0,show:false})}};
     for(let i=0;i<N;i++){if(M.stateX==='levelup')M.pick(0);if(strike&&i%150===0)strikeRun();
       if(cc&&i===N-1)for(const k in cc)cc[k]=0;
       const a=performance.now();M.step(1/60);const b=performance.now();M.render();const c=performance.now();c2.getImageData(0,0,1,1);const d=performance.now();if(SH&&strike&&i===SHF)window.__shot=cv.toDataURL('image/png');
       U.push(b-a);R.push(c-b);T.push(d-a);pk=Math.max(pk,X.parts.length);fk=Math.max(fk,X.fires.length);
       if(performance.memory){const h=performance.memory.usedJSHeapSize;if(h<last-2e5)gcs++;last=h;hmax=Math.max(hmax,h)}}
     if(cc)Object.assign(ccs,cc);
     const st=A=>{const s=A.slice().sort((x,y)=>x-y),q=f=>+s[Math.min(s.length-1,Math.floor(s.length*f))].toFixed(2);return{avg:+(A.reduce((x,y)=>x+y,0)/A.length).toFixed(2),p50:q(.5),p95:q(.95),p99:q(.99),max:q(1)}};
     return{frame:st(T),update:st(U),render:st(R),flush:st(T.map((t,i)=>t-U[i]-R[i])),peakParts:pk,peakFires:fk,enemies:M.units?M.units().e.length:null,heapMB:+(hmax/1e6).toFixed(1),heapDrops:gcs,amt:window.__pgAmt||0,fb:window.__pgFb||0,amtLive:(X.AMT?X.AMT.V.filter(v=>!v.dead).length:null),night:X.ATM.night(),tier:window.LCO_QUALITY?LCO_QUALITY.t:null,jlod:window.JUNGLE3?JUNGLE3.lod:null,jungle:!!(M.JG&&M.JG.ok&&M.JG.ok()),lowfx:M.LOWFX,canvas:cv.width+'x'+cv.height,calls1f:ccs}},[N,S.strike,!!V('shot')]);
   const m1=(await cdp.send('Performance.getMetrics')).metrics, mm=(a,k)=>(a.find(x=>x.name===k)||{}).value;
   r.gcTaskS=+((mm(m1,'TaskDuration')-mm(m0,'TaskDuration'))||0).toFixed(2);
   if(F('trace')&&sk==='strike'){await br.stopTracing();const tr=JSON.parse(fs.readFileSync(`${outDir}/trace-${pk}-${sk}.json`));const ev=(tr.traceEvents||tr).filter(e=>/^(MinorGC|MajorGC|V8.GC_SCAVENGER|V8.GC_MARK_COMPACTOR|ScavengeTask|V8.GCScavenger|V8.GCFinalizeMC)$/.test(e.name)&&e.dur);
     r.gc={n:ev.length,ms:+(ev.reduce((s,e)=>s+e.dur,0)/1000).toFixed(1),names:[...new Set(ev.map(e=>e.name))]}}
   if(F('profile')){const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(`${outDir}/cpu-${pk}-${sk}.cpuprofile`,JSON.stringify(profile));
     const self={},dt=profile.timeDeltas,idx={};profile.nodes.forEach(n=>idx[n.id]=n);let tot=0;profile.samples.forEach((id,i)=>{const n=idx[id],cf=n.callFrame,k=(cf.functionName||'(anon)')+':'+(cf.lineNumber+1)+':'+cf.columnNumber;self[k]=(self[k]||0)+dt[i];tot+=dt[i]});
     r.topSelf=Object.entries(self).sort((a,b)=>b[1]-a[1]).slice(0,25).map(([k,v])=>[k,+(v/1000/N).toFixed(2),+(100*v/tot).toFixed(1)])}
   if(V('shot')&&sk==='strike'){const u=await pg.evaluate(()=>window.__shot);if(u)fs.writeFileSync(V('shot')+'-'+pk+'.png',Buffer.from(u.split(',')[1],'base64'))}
   r.errs=errs.slice(0,3);res[pk+'/'+sk]=r;
   if(sk==='strike'&&r.frame.p95>P.budget)fail=1;
   console.error(`${(pk+'/'+sk).padEnd(15)} frame avg ${r.frame.avg} p95 ${r.frame.p95} p99 ${r.frame.p99} | upd ${r.update.avg} rnd ${r.render.avg} flush ${r.flush.avg} | parts ${r.peakParts} fires ${r.peakFires} night ${r.night} errs ${errs.length}`);
   await ctx.close()}}
 fs.writeFileSync(`${outDir}/perfgate-${Date.now()}.json`,JSON.stringify(res,null,1));console.log(JSON.stringify(res));
 await br.close();srv.close();process.exit(F('budget')?fail:0)})();
