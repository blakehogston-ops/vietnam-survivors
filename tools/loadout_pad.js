const {chromium}=require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=process.argv[2]||'/workspace/wt-rc82-loadout'; const MIME={'.html':'text/html','.js':'text/javascript','.png':'image/png','.json':'application/json'};
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.statusCode=404;r.end();return} r.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream'); fs.createReadStream(f).pipe(r) });
const FAKE=`(()=>{ const btn=()=>Array.from({length:17},()=>({pressed:false,value:0})); window.__gp={id:'Xbox Wireless Controller (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:btn(),timestamp:0};
  window.__press=(i,on)=>{ __gp.buttons[i]={pressed:on,value:on?1:0} }; Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__gp]}) })()`;
(async()=>{ await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const B='http://127.0.0.1:'+srv.address().port+'/';
 const br=await chromium.launch({channel:'chrome',args:['--no-sandbox']}); let fails=0; const errs=[]; const T=(n,ok,x)=>{ console.log((ok?'PASS ':'FAIL ')+n+' :: '+JSON.stringify(x)); if(!ok)fails++ };
 const run=async(q)=>{ const c=await br.newContext({viewport:{width:1280,height:720}}); await c.addInitScript(FAKE); const pg=await c.newPage(); pg.on('pageerror',e=>errs.push(e.message)); await pg.goto(B+'index.html?'+q); await pg.waitForTimeout(2000); return pg };
 const tap=async(pg,i,ms)=>{ await pg.evaluate(i=>__press(i,true),i); await pg.waitForTimeout(ms||120); await pg.evaluate(i=>__press(i,false),i); await pg.waitForTimeout(150) };
 { const pg=await run('loadout=1&nodemo&nointro&nobrief&bot&autostart');
   await tap(pg,3); const a=await pg.evaluate(()=>__ms.G.lo.sel);
   const m0=await pg.evaluate(()=>({b:__ms.G.inBunker||null})); await tap(pg,4,120); const short=await pg.evaluate(()=>window.LO.lbF);
   const pb0=await pg.evaluate(()=>JSON.stringify(window.__lco&&0)); 
   let tog=0; await pg.evaluate(()=>{ window.__pbN=0; const o=window.DBG_PB; }); 
   const r=await pg.evaluate(async()=>{ return {mute:(window.Snd||{}).muted} });
   T('pad Y swaps (M16A1 -> .45)',a==='m1911',a); T('pad LB tap does not trigger bunker',short===false,short);
   await pg.evaluate(()=>__press(4,true)); await pg.waitForTimeout(600); const hold=await pg.evaluate(()=>window.LO.lbF); await pg.evaluate(()=>__press(4,false)); await pg.waitForTimeout(150);
   T('pad LB hold 0.6 s triggers bunker toggle',hold===true,hold);
   const txt=await pg.evaluate(()=>(document.querySelector('.padKeys')||{}).textContent||''); T('pad keys text: hold LB bunker + Y swap',/hold LB bunker/.test(txt)&&/swap/.test(txt),txt);
   await pg.close() }
 { const pg=await run('nodemo&nointro&nobrief&bot&autostart'); const a0=await pg.evaluate(()=>window.__ms.G.w.m16?1:0); await tap(pg,3); const txt=await pg.evaluate(()=>(document.querySelector('.padKeys')||{}).textContent||'');
   T('default: pad keys text unchanged (Y bunker, no swap)',/Y bunker/.test(txt)&&!/swap/.test(txt),txt); await pg.close() }
 { const pg=await run('loadout=1&nodemo&nobrief&fieldReports=0'); await tap(pg,9); await tap(pg,9); await pg.waitForTimeout(600); let st=await pg.evaluate(()=>window.__ms.stateX);
   T('pad Start x2 from title reaches the loadout screen',st==='loadout',st);
   await pg.evaluate(()=>{__gp.axes[0]=1}); await pg.waitForTimeout(200); await pg.evaluate(()=>{__gp.axes[0]=0}); await pg.waitForTimeout(200); const fi=await pg.evaluate(()=>window.LO.fi); T('stick right moves focus',fi===1,fi);
   await tap(pg,1); const ask=await pg.evaluate(()=>window.LO.asking()); await tap(pg,1); const ask2=await pg.evaluate(()=>window.LO.asking()); T('B asks, B again = No',ask&&!ask2,{ask,ask2});
   await tap(pg,9); await pg.waitForTimeout(300); st=await pg.evaluate(()=>window.__ms.stateX); T('Start deploys',st!=='loadout',st);
   await pg.evaluate(()=>{ try{ window.__ms.skipIntro&&window.__ms.skipIntro(true) }catch(e){} }); await pg.close() }
 T('no page errors',!errs.length,errs.slice(0,4)); await br.close(); srv.close(); process.exit(fails?1:0) })();
