/* rc8.2 slice 1 loadout (?loadout=1) headless checks: default path unchanged, screen + a11y, swap, pool, HUD, runsave v2. Run inside a slot.sh slot. */
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
   await pg.keyboard.press('ArrowUp'); await pg.waitForTimeout(80); await pg.keyboard.press('Space'); await pg.waitForTimeout(600);
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
 // D full primary pool (Blake Oct 29): none/M16A1/M14/M60/M79/Ithaca 37
 { const pg=await mk('pool'); await pg.goto(B+'index.html?loadout=1&nodemo&nointro&nobrief&bot&autostart'); await pg.waitForTimeout(1500);
   let r=await pg.evaluate(()=>{ const P=LO.SLOTS[0].opts.map(o=>o.id), T=LO.SLOTS[2].opts.find(o=>o.id==='smoke'); const txt=JSON.stringify(LO.SLOTS)+((document.getElementById('loHud')||{}).textContent||''); return {P,smoke:T.info,bad:/(corpsm[ae]n|doc)[^.]{0,30}carri\w*[^.]{0,20}(m16|m14|m60|m79|ithaca|shotgun|rifle|machine gun|launcher)|(m16|m14|m60|m79|ithaca|shotgun|rifle|machine gun|launcher)[^.]{0,30}carried by (doc|corpsm)/i.test(txt),r870:/870/.test(JSON.stringify(LO.SLOTS))} });
   T('primary pool is none/m16/m14/m60/m79/Ithaca 37',JSON.stringify(r.P)==='["none","m16","m14","m60","m79","shotgun"]',r.P);
   T('M18 smoke text: green/yellow/violet only, no red',/green/i.test(r.smoke)&&/yellow/i.test(r.smoke)&&/violet/i.test(r.smoke)&&!/red/i.test(r.smoke),r.smoke);
   T('no "corpsmen carried" claim, no 870',!r.bad&&!r.r870,r);
   await pg.close() }
 for(const [prim,fw,spd,nm] of [['none','m16',0,'M1911A1'],['m16','m16',0,'M16A1'],['m14','m16',0,'M14'],['m60','m60',-.15,'M60'],['m79','m79',0,'M79'],['shotgun','shotgun',0,'Ithaca 37']]){
   const pg=await mk('p-'+prim); await pg.goto(B+'index.html?loadout=1&nodemo&nobrief&fieldReports=0'); await pg.waitForTimeout(800);
   await pg.evaluate(p=>localStorage.setItem('lco_loadout_last',JSON.stringify({prim:p,side:'m1911',thr:'smoke',gear:'unit1'})),prim);
   await pg.goto(B+'index.html?loadout=1&nodemo&nointro&nobrief&bot&autostart'); await pg.waitForTimeout(1500);
   let r=await pg.evaluate(()=>{ const g=__ms.G, L=g.lo, ws=Object.keys(g.w).filter(k=>({m16:1,m60:1,m79:1,m1903:1,grease:1,knives:1,shotgun:1})[k]); return {prim:L.prim,sel:L.sel,fid:LO.fid(),ws,spd:g._loSpd||0,sa:g.sidearm,thr:L.thr} });
   T(prim+': applied, selected gun = '+fw+', move '+spd,r.prim===prim&&r.fid===fw&&Math.abs(r.spd-spd)<1e-9&&r.thr==='smoke'&&(prim==='none'?r.sa&&r.sel==='m1911':!r.sa&&r.sel===prim)&&r.ws.every(k=>k==='m16'||k===fw),r);
   r=await pg.evaluate(()=>{ for(let i=0;i<60*10&&__ms.stateX==='play';i++)__ms.step(1/60); const h=document.getElementById('loHud'); return {h:h&&h.textContent,t:Math.round(__ms.G.t)} });
   T(prim+': 10 s sim runs, HUD names '+nm,r.h&&r.h.includes(nm),r);
   if(prim!=='none'){ r=await pg.evaluate(()=>{ const g=__ms.G; __ms.stateX; LO.swap(); const a={sel:g.lo.sel,sa:g.sidearm,fid:LO.fid()}; g.t+=1; const b=LO.fid(); LO.swap(); return {a,b,back:g.lo.sel} });
     const exp=prim==='m60'?null:'m16'; T(prim+': swap to .45'+(prim==='m60'?' (M60 slower swap: nothing fires for 0.9 s)':''),r.a.sel==='m1911'&&r.a.sa&&r.a.fid===exp&&r.b==='m16'&&r.back===prim,r) }
   await pg.close() }
 { const pg=await mk('m14stats'); await pg.goto(B+'index.html?loadout=1&nodemo&nointro&nobrief&bot&autostart'); await pg.waitForTimeout(1200);
   const r=await pg.evaluate(()=>{ const s={dmg:16,cd:.55,shots:1,pierce:1}, m=LO.m14(s);   /* ITEMS.m16.stats(1) */ return {s,m} }); T('M14 = slower, harder, piercing on the M16 slot (reused ITEMS stats)',r.m.dmg>r.s.dmg&&r.m.cd>r.s.cd&&r.m.pierce>=2&&r.m.shots===1,r); await pg.close() }
 // E rc8.2 GDUX/HAA/EP follow-up: none = 0.85x treat (no move bonus, no stacking), M14 1.7x dmg, Extra Mags needs M16A1, strings
 { const pg=await mk('tune'); await pg.goto(B+'index.html?loadout=1&nodemo&nobrief&fieldReports=0'); await pg.waitForTimeout(800);
   await pg.evaluate(()=>{ localStorage.setItem('lco_missions_done','5'); localStorage.setItem('lco_loadout_last',JSON.stringify({prim:'none',side:'m1911',thr:'frag',gear:'mags'})) });
   await pg.goto(B+'index.html?loadout=1&nodemo&nointro&nobrief&bot&autostart'); await pg.waitForTimeout(1500);
   let r=await pg.evaluate(()=>{ const g=__ms.G; const s0=g.spdB; const m1=LO.treatMul(); LO.apply({prim:'none',thr:'frag',gear:'unit1'}); LO.apply({prim:'none',thr:'frag',gear:'unit1'}); const m2=LO.treatMul(); const s1=g.spdB;
     LO.apply({prim:'m60',thr:'frag',gear:'unit1'}); const m60=g._loSpd, tm60=LO.treatMul(); LO.apply({prim:'none',thr:'frag',gear:'unit1'});
     return {lo:g.lo.prim,gear0:null,m1,m2,s0,s1,lospd:g._loSpd,m60,tm60,noneSpd:LO.PRIM.none.spd||0} });
   T('none: treat 0.85x, applied twice still 0.85 (no stack)',r.m1===.85&&r.m2===.85,r);
   T('none: no move bonus (spdB unchanged, _loSpd 0)',r.s0===r.s1&&r.lospd===0&&r.noneSpd===0,r);
   T('M60 keeps -15% move, no treat bonus',Math.abs(r.m60+.15)<1e-9&&r.tm60===1,r);
   r=await pg.evaluate(()=>({gear:__ms.G.lo.gear})); T('saved none+mags falls back off Extra Mags',r.gear!=='mags',r);
   r=await pg.evaluate(()=>{ const s={dmg:16,cd:.55,shots:1,pierce:1}, m=LO.m14(s); return {dmg:m.dmg,cd:m.cd,shots:m.shots,pierce:m.pierce} });
   T('M14 dmg 1.7x, cd 1.9x, semi (1 shot), pierce 2',r.dmg===Math.round(16*1.7)&&Math.abs(r.cd-.55*1.9)<1e-9&&r.shots===1&&r.pierce===2,r);
   r=await pg.evaluate(()=>{ const P=LO.SLOTS[0].opts, txt=JSON.stringify(LO.SLOTS); return {none:P.find(o=>o.id==='none').info,m14:P.find(o=>o.id==='m14').info,only45:/(corpsm[ae]n|doc)[^.]{0,40}(carri\w*|had)[^.]{0,20}only[^.]{0,10}\.45|only (the )?\.45/i.test(txt)} });
   T('none text is exactly "Hands free for treating"',r.none==='Hands free for treating',r.none);
   T('M14 text has "Largely replaced by the M16 in Marine infantry during 1967."',r.m14.includes('Largely replaced by the M16 in Marine infantry during 1967.'),r.m14);
   T('no string claims corpsmen/Doc carried only a .45',!r.only45,r);
   await pg.close() }
 { const pg=await mk('mags'); await pg.goto(B+'index.html?loadout=1&nodemo&nobrief&fieldReports=0'); await pg.waitForTimeout(800);
   await pg.evaluate(()=>{ localStorage.setItem('lco_missions_done','5'); localStorage.removeItem('lco_loadout_last') }); await pg.reload(); await pg.waitForTimeout(1200);
   await pg.keyboard.press('Enter'); await pg.waitForTimeout(400); await pg.evaluate(()=>{ __ms.selectChar&&__ms.selectChar('doc') }); await pg.keyboard.press('Enter'); await pg.waitForTimeout(900);
   let r=await pg.evaluate(()=>{ const q=()=>document.querySelector('#loadout .loOpt[data-id="mags"]'); LO.pick.prim='m16'; LO.draw(); const a={lk:q().classList.contains('lk')}; LO.choose(LO.SLOTS[3],'mags'); LO.draw(); a.picked=LO.pick.gear;
     LO.pick.prim='m14'; LO.draw(); const e=q(), t=e.querySelector('.loLk'), cs=t&&getComputedStyle(t); const b={lk:e.classList.contains('lk'),gear:LO.pick.gear,txt:t&&t.textContent,fs:cs&&parseFloat(cs.fontSize),fg:cs&&cs.color,bg:getComputedStyle(e.closest('.loSlot')).backgroundColor};
     LO.choose(LO.SLOTS[3],'mags'); b.after=LO.pick.gear; LO.fi=3; for(let i=0;i<8;i++){ LO.cycle(1); if(LO.pick.gear==='mags')b.cyc=1 } return {a,b} });
   const lum=c=>{ const v=c.match(/\d+(\.\d+)?/g).slice(0,3).map(x=>{x/=255; return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)}); return .2126*v[0]+.7152*v[1]+.0722*v[2] }, cr=r.b.fg&&r.b.bg?(Math.max(lum(r.b.fg),lum(r.b.bg))+.05)/(Math.min(lum(r.b.fg),lum(r.b.bg))+.05):0;
   T('M16A1 primary: Extra Mags pickable',!r.a.lk&&r.a.picked==='mags',r.a);
   T('other primary: Extra Mags locked, unpicked, not choosable or cyclable',r.b.lk&&r.b.gear!=='mags'&&r.b.after!=='mags'&&!r.b.cyc,r.b);
   T('lock text "Needs M16A1", >= 18 px, >= 4.5:1',r.b.txt==='Needs M16A1'&&r.b.fs>=18&&cr>=4.5,{txt:r.b.txt,fs:r.b.fs,cr:+cr.toFixed(2)});
   await pg.close() }
 T('no page errors',errs.length===0,errs.slice(0,5));
 await br.close(); srv.close(); console.log(fails?'FAILS '+fails:'ALL PASS'); process.exit(fails?1:0) })();
