const {chromium}=require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'); const MIME={'.html':'text/html','.js':'text/javascript','.png':'image/png','.json':'application/json','.ogg':'audio/ogg','.mp3':'audio/mpeg','.m4a':'audio/mp4','.css':'text/css','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.statusCode=404;r.end();return} r.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream'); fs.createReadStream(f).pipe(r) });
(async()=>{ await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const port=srv.address().port; if(port===8871)process.exit(2); const B='http://127.0.0.1:'+port+'/';
 const br=await chromium.launch({channel:'chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']}); let fails=0; const errs=[];
 const T=(n,ok,x)=>{ console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' :: '+JSON.stringify(x):'')); if(!ok)fails++ };
 const mk=async(tag)=>{ const c=await br.newContext({viewport:{width:1280,height:720}}); const pg=await c.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e.message)); return pg };
 // A default
 { const pg=await mk('default'); await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&autostart'); await pg.waitForTimeout(2000);
   const r=await pg.evaluate(()=>{ const out={on:window.LO.ON,dom:!!document.getElementById('loadout'),hud:!!document.getElementById('loHud'),wheel:!!document.getElementById('loWheel'),keys:(document.querySelector('.padKeys')||{}).textContent||'',st:__ms.stateX,lo:!!(__ms.G&&__ms.G.lo)}; const seen={}; for(let i=0;i<300;i++)for(const id of __ms.genChoices())seen[id]=1; out.small=Object.keys(seen).filter(k=>({m16:1,m60:1,m79:1,m1903:1,grease:1,knives:1,shotgun:1})[k]); return out });
   T('default: flag off, no loadout DOM/HUD/option, no G.lo',!r.on&&!r.dom&&!r.hud&&!r.wheel&&!r.lo,r);
   T('default: keysText unchanged (Y bunker, LB mute)',/Y bunker/.test(r.keys)&&!/swap/.test(r.keys),r.keys.slice(0,400));
   T('default: small-arm cards still offered',r.small.length>0,r.small); await pg.close() }
 // B screen
 { const pg=await mk('screen'); await pg.goto(B+'index.html?loadout=1&nodemo&nobrief&fieldReports=0'); await pg.waitForTimeout(1500);
   await pg.keyboard.press('Enter'); await pg.waitForTimeout(400); await pg.evaluate(()=>{ __ms.selectChar&&__ms.selectChar('doc') }); await pg.keyboard.press('Enter'); await pg.waitForTimeout(900);
   let r=await pg.evaluate(()=>({st:__ms.stateX,vis:getComputedStyle(document.getElementById('loadout')).display}));
   T('flag on: screen opens before the intro',r.st==='loadout'&&r.vis==='flex',r);
   const small=await pg.evaluate(()=>{ const bad=[]; document.querySelectorAll('#loadout *').forEach(e=>{ if([...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.offsetParent!==null){ const fs=parseFloat(getComputedStyle(e).fontSize); if(fs<18)bad.push(e.className+':'+fs) } }); return bad });
   T('screen text >= 18 px',small.length===0,small);
   const oc=await pg.evaluate(()=>{ const f=document.querySelector('#loadout .loSlot.f'); const cs=getComputedStyle(f); return {o:cs.outlineStyle,w:cs.outlineWidth,c:cs.outlineColor} });
   T('focused card has 4px outline',oc.o==='solid'&&oc.w==='4px',oc);
   await pg.waitForTimeout(2500); r=await pg.evaluate(()=>__ms.stateX); T('no timer: still on screen after 3 s',r==='loadout',r);
   await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); r=await pg.evaluate(()=>({ask:LO.asking(),st:__ms.stateX})); T('Esc asks to confirm',r.ask&&r.st==='loadout',r);
   await pg.keyboard.press('Enter'); await pg.waitForTimeout(100); r=await pg.evaluate(()=>({ask:LO.asking(),st:__ms.stateX})); T('Enter on default NO keeps the screen',!r.ask&&r.st==='loadout',r);
   const lk=await pg.evaluate(()=>document.querySelectorAll('#loadout .loOpt.lk .loLk').length); T('locked gear show lock + Unlocks after N',lk===3,lk);
   await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(80); await pg.keyboard.press('Space'); await pg.waitForTimeout(600);
   r=await pg.evaluate(()=>({st:__ms.stateX,lo:__ms.G.lo,sa:__ms.G.sidearm,last:localStorage.getItem('lco_loadout_last')})); T('Deploy -> intro with primary None, .45 selected',r.st!=='loadout'&&r.lo&&r.lo.prim==='none'&&r.lo.sel==='m1911'&&r.sa===true,r);
   await pg.close() }
 // C bots skip, swap, pool, HUD
 { const pg=await mk('play'); await pg.goto(B+'index.html?loadout=1&nodemo&nointro&nobrief&bot&autostart'); await pg.waitForTimeout(2000);
   let r=await pg.evaluate(()=>({st:__ms.stateX,lo:__ms.G.lo,w:Object.keys(__ms.G.w),shown:!!document.querySelector('#loadout.show')})); T('bot/?nointro skips the screen, Recommended loadout applied',r.st==='play'&&r.lo&&r.lo.prim==='m16'&&!r.shown,r);
   r=await pg.evaluate(()=>{ const seen={}; for(let i=0;i<300;i++)for(const id of __ms.genChoices())seen[id]=1; return Object.keys(seen).filter(k=>({m16:1,m60:1,m79:1,m1903:1,grease:1,knives:1,shotgun:1})[k]) }); T('no small-arm cards in the pool',r.length===0,r);
   await pg.keyboard.press('Digit2'); await pg.waitForTimeout(50); let a=await pg.evaluate(()=>[__ms.G.lo.sel,__ms.G.sidearm]);
   await pg.keyboard.press('Digit1'); await pg.waitForTimeout(50); let b=await pg.evaluate(()=>[__ms.G.lo.sel,__ms.G.sidearm]);
   T('1/2 swap M16A1/.45',a[0]==='m1911'&&a[1]&&b[0]==='m16'&&!b[1],{a,b});
   await pg.mouse.move(640,360); await pg.mouse.wheel(0,100); await pg.waitForTimeout(80); a=await pg.evaluate(()=>__ms.G.lo.sel);
   await pg.evaluate(()=>localStorage.setItem('lco_lo_wheel','0')); await pg.waitForTimeout(200); await pg.mouse.wheel(0,100); await pg.waitForTimeout(80); b=await pg.evaluate(()=>__ms.G.lo.sel);
   T('wheel swaps, and the option turns it off',a==='m1911'&&b==='m1911',{a,b});
   r=await pg.evaluate(()=>{ __ms.G.w.m60={lvl:1,cd:0,tick:0}; window.__simHold=true; for(let i=0;i<60*30&&__ms.stateX==='play';i++)__ms.step(1/60); const h=document.getElementById('loHud'); return {t:Math.round(__ms.G.t),h:h&&h.textContent,d:h&&getComputedStyle(h).display,opt:!!document.getElementById('loWheel')} });
   T('30 s sim with a stray M60 runs; HUD shows icon+text; wheel option exists',r.d==='flex'&&/\.45\s*M1911A1/.test(r.h)&&r.opt,r);
   r=await pg.evaluate(()=>{ const ok=window.LO.ON; return {v:JSON.parse(localStorage.getItem('lco_runsave')||'{}').v||null, tip:TEACH&&TEACH.txt?null:null} }); console.log('runsave v (if saved yet):',r.v);
   await pg.close() }
 T('no page errors',errs.length===0,errs.slice(0,5));
 await br.close(); srv.close(); console.log(fails?'FAILS '+fails:'ALL PASS'); process.exit(fails?1:0) })();
