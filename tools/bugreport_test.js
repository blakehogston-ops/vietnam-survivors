#!/usr/bin/env node
/* Headless test for the ?bugreport=1 reporter. node tools/bugreport_test.js (take a browser slot first: /workspace/builds/job1-slots/slot.sh) */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'); const MIME={'.html':'text/html','.mp3':'audio/mpeg','.png':'image/png','.js':'text/javascript'};
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!f.startsWith(root)||!fs.existsSync(f)){r.statusCode=404;r.end();return} r.setHeader('content-type',MIME[path.extname(f)]||'application/octet-stream'); r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/'; let fails=0; const errs=[];
  const T=(n,ok,x)=>{ console.log((ok?'PASS ':'FAIL ')+n+(x?' '+x:'')); if(!ok)fails++ };
  const browser=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
  const LIS=`(()=>{ window.__L=[]; const a=EventTarget.prototype.addEventListener; EventTarget.prototype.addEventListener=function(t,f,o){ try{ window.__L.push(t+':'+String(new Error().stack).includes('bugreport.js')) }catch(e){} return a.call(this,t,f,o) } })()`;
  const mk=async(q,init)=>{ const c=await browser.newContext({viewport:{width:1280,height:800}}); if(init)await c.addInitScript(init); const pg=await c.newPage(); pg.on('pageerror',e=>errs.push(e.message)); await pg.goto(B+'index.html?'+q); await pg.waitForTimeout(1500); return pg };
  // 1 flag off: no DOM, no script, no listeners from the reporter
  { const pg=await mk('nodemo&nointro&nobrief&bot&autostart&bugreport=0',LIS); const r=await pg.evaluate(()=>({dom:!!document.getElementById('bugrep')||!!document.getElementById('btnBug'),api:!!window.__bugrep,scr:[...document.scripts].some(s=>/bugreport\.js/.test(s.src)),lis:__L.filter(x=>x.endsWith(':true')).length}));
    T('flag off: no DOM, no script, no listeners',!r.dom&&!r.api&&!r.scr&&r.lis===0,JSON.stringify(r)); await pg.close() }
  { const pg=await mk('nodemo&nointro&nobrief&bot&autostart&bugreportx=1'); T('loose key ?bugreportx=1 does not enable',await pg.evaluate(()=>!window.__bugrep)); await pg.close() }
  const KEY='SEKRET-k3y-9f2a';
  const pg=await mk('nodemo&nointro&nobrief&bot&autostart&bugreport=1');
  await pg.evaluate(k=>{ localStorage.setItem('lco_bug_cfg',JSON.stringify({key:k})); localStorage.removeItem('lco_bugq'); console.log('hello from /home/blake/lco/index.html key='+k); console.warn('C:\\Users\\Blake\\AppData\\x\\bugreport.js:12') },KEY);
  T('reporter loaded, pause item present',await pg.evaluate(()=>!!window.__bugrep&&!!document.getElementById('btnBug')));
  T('in play before F8',await pg.evaluate(()=>__ms.stateX==='play'));
  await pg.keyboard.press('F8'); await pg.waitForTimeout(200);
  T('F8 opens reporter and pauses',await pg.evaluate(()=>__bugrep.isOpen()&&__ms.stateX==='paused'&&document.getElementById('bugrep').classList.contains('show')));
  const a11y=await pg.evaluate(()=>{ const t=document.getElementById('bugrepN'); return {fs:parseFloat(getComputedStyle(t).fontSize),max:t.maxLength} }); T('a11y: text >= 18px, maxlength 1000',a11y.fs>=18&&a11y.max===1000,JSON.stringify(a11y));
  await pg.focus('#bugrepN'); await pg.keyboard.type('Doc stuck on the ramp'); T('counter shows live count',await pg.evaluate(()=>document.getElementById('bugrepC').textContent==='21/1000'));
  await pg.keyboard.press('Escape'); T('Esc on non-empty asks to discard',await pg.evaluate(()=>__bugrep.isOpen()&&!document.getElementById('bugrepAsk').hidden)); await pg.click('#bugrepDN');
  T('consent boxes start unticked',await pg.evaluate(()=>['bugIncL','bugIncS','bugIncY'].every(i=>!document.getElementById(i).checked)));
  await pg.click('#bugIncS'); T('screenshot preview + Remove shown',await pg.evaluate(()=>!document.getElementById('bugPrev').hidden&&document.getElementById('bugPrevI').src.startsWith('data:image/jpeg')));
  await pg.click('#bugIncL'); await pg.click('#bugIncY');
  await pg.click('.tg input[value=stuck]'); await pg.evaluate(()=>{ window.__fetchN=0; const f=window.fetch; window.fetch=function(u,o){ if(o&&o.method==='POST')window.__fetchN++; return f.apply(this,arguments) } });
  await pg.click('#bugrepS'); await pg.waitForTimeout(500);
  const r=await pg.evaluate(()=>({q:__bugrep.queue(),msg:document.getElementById('bugrepM').hidden?null:document.getElementById('bugrepM').textContent,fetchN:__fetchN}));
  const p=r.q[0]||{}; const json=JSON.stringify(r.q);
  T('no endpoint -> queued in lco_bugq, no fetch',r.q.length===1&&r.fetchN===0,'n='+r.q.length);
  T('persistent confirmation shown',!!r.msg&&/saved/.test(r.msg));
  const keys=['v','ts','build','platform','mission','map','seed','difficulty','char','loadout','tags','note','log','shot'];
  T('payload shape v1',p.v===1&&keys.every(k=>k in p)&&p.build&&'sha' in p.build&&['win','mac','web'].includes(p.platform)&&typeof p.seed==='number'&&p.tags[0]==='stuck'&&p.note==='Doc stuck on the ramp',JSON.stringify(keys.filter(k=>!(k in p))));
  T('mission/difficulty from read-only getters',p.mission===(await pg.evaluate(()=>__lcoBug.mission()))&&/ · Extraction$/.test(p.mission||'')&&p.difficulty==='Normal',JSON.stringify({m:p.mission,d:p.difficulty}));
  { const ro=await pg.evaluate(()=>{ const k=Object.keys(localStorage).sort().join(); __lcoBug.mission(); __lcoBug.difficulty(); return k===Object.keys(localStorage).sort().join() }); T('getters write no saved state',ro) }
  { const p2=await mk('nodemo&nointro&nobrief&bot&autostart&bugreport=1&diff=hard&map=cam_lo_river'); const r2=await p2.evaluate(()=>({m:__lcoBug.mission(),d:__lcoBug.difficulty(),b:__bugrep.build('x',[],{})})); T('?diff=hard&map=cam_lo_river -> Hard, cam_lo_river · Extraction',r2.d==='Hard'&&r2.m==='cam_lo_river · Extraction'&&r2.b.difficulty==='Hard'&&r2.b.mission===r2.m,JSON.stringify({m:r2.m,d:r2.d})); await p2.close() }
  T('shot is 640px JPEG data URL',await pg.evaluate(s=>new Promise(res=>{ if(!s||!s.startsWith('data:image/jpeg'))return res(false); const i=new Image(); i.onload=()=>res(i.width===640); i.onerror=()=>res(false); i.src=s }),p.shot));
  const sz=json.length; T('payload size < 300 KB',sz<300000,(sz/1024).toFixed(1)+' KB'); T('log <= 200 lines',Array.isArray(p.log)&&p.log.length<=200);
  T('paths scrubbed / no user names',!/blake|Users|home\//i.test(JSON.stringify(p.log))&&p.log.some(l=>/index\.html/.test(l)),JSON.stringify(p.log.filter(l=>/index|bugreport/.test(l))));
  T('sender key never in payload / log / queue',!json.includes(KEY)&&!(await pg.evaluate(()=>JSON.stringify(__bugrep.log()))).includes(KEY));
  await pg.click('#bugrepOK'); T('dismiss closes and resumes',await pg.evaluate(()=>!__bugrep.isOpen()&&__ms.stateX==='play'));
  { const nc=await pg.evaluate(async()=>{ const L=localStorage; L.removeItem('lco_bugq'); const b=__bugrep.build('x',[],{}); return {log:b.log,shot:b.shot,plat:b.platform,steam:'steamId' in b||'steam' in b} });
    T('no consent -> no logs / shot / system info, no Steam ID field',nc.log===null&&nc.shot===null&&nc.plat===null&&!nc.steam,JSON.stringify(nc)) }
  { const d=await pg.evaluate(k=>['https://discord.com/api/webhooks/1/x','https://ptb.discordapp.com/api/webhooks/1/x'].map(u=>{ localStorage.setItem('lco_bug_cfg',JSON.stringify({url:u,key:k})); return __bugrep.cfg().url }),KEY);
    T('Discord webhook URLs rejected',d.every(x=>x===false),JSON.stringify(d)) }
  { const sc=await pg.evaluate(()=>[__bugrep.scrub('C:\\Users\\Blake Smith\\AppData\\Roaming\\Last Chopper Out\\x.log'),__bugrep.scrub('/Users/blake/Library/a'),__bugrep.scrub('/home/blake/lco/index.html:12')]);
    T('scrub: C:\\Users, AppData, /Users, /home',sc.every(x=>!/blake|Users|AppData|home/i.test(x)),JSON.stringify(sc)) }
  // offline with a configured endpoint: still queued, no throw
  await pg.context().setOffline(true); await pg.evaluate(k=>localStorage.setItem('lco_bug_cfg',JSON.stringify({url:'https://example.invalid/hook',key:k})),KEY);
  const off=await pg.evaluate(async()=>{ __bugrep.open(); try{ return {r:await __bugrep.send(),n:__bugrep.queue().length} }catch(e){ return {err:String(e)} } });
  T('offline send queues, never throws',off.r==='queued'&&off.n===1,JSON.stringify(off)); await pg.evaluate(()=>__bugrep.close());
  await pg.evaluate(()=>{ const a=[]; for(let i=0;i<25;i++)a.push({v:1,i,shot:null}); localStorage.setItem('lco_bugq',JSON.stringify(a)) }); await pg.evaluate(()=>{ __bugrep.open(); }); await pg.evaluate(()=>__bugrep.send()); 
  T('queue capped at 20, oldest dropped',await pg.evaluate(()=>{ const q=__bugrep.queue(); return q.length===20&&q[0].i===6 }));
  await pg.evaluate(()=>__bugrep.close());
  // pad: Start tap pauses (on release), Select+Start held 0.5 s opens; never opens from a tap
  await pg.evaluate(()=>{ DBG.pad.connect(); DBG.pad.press('ST',100) }); await pg.waitForTimeout(400);
  const tap=await pg.evaluate(()=>({st:__ms.stateX,open:__bugrep.isOpen()})); T('pad Start tap pauses, does not open reporter',tap.st==='paused'&&!tap.open,JSON.stringify(tap));
  await pg.evaluate(()=>{ DBG.pad.press('ST',100) }); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ DBG.pad.press('SE',800); DBG.pad.press('ST',800) }); await pg.waitForTimeout(300); const early=await pg.evaluate(()=>__bugrep.isOpen()); await pg.waitForTimeout(700);
  const ch=await pg.evaluate(()=>({open:__bugrep.isOpen(),st:__ms.stateX,fs:!!document.fullscreenElement})); T('pad chord held 0.5 s opens (not before), no fullscreen toggle',!early&&ch.open&&ch.st==='paused'&&!ch.fs,JSON.stringify(ch));
  await pg.evaluate(()=>__bugrep.close());
  // pause-menu toggle turns it off
  await pg.evaluate(()=>{ __lcoBug.pause(); const c=document.getElementById('bugOn'); c.checked=false; c.dispatchEvent(new Event('change')) }); await pg.keyboard.press('F8');
  T('pause-menu toggle disables reporter',await pg.evaluate(()=>!__bugrep.isOpen()&&document.getElementById('btnBug').hidden));
  { const src=fs.readFileSync(path.join(root,'steam/main.js'),'utf8'); const fn=src.match(/^function redactPath[^\n]*$/m); const rp=fn&&new Function(fn[0]+';return redactPath')();
    const ok=rp&&!/blake/i.test(rp('C:\\Users\\Blake\\AppData\\Roaming\\Last Bird Out'))&&!/blake/i.test(rp('/Users/blake/Library/Application Support/Last Bird Out'))&&/'migrated:' \+ path\.basename\(d\)/.test(src)&&/redactPath\(NEW_DIR\)/.test(src);
    T('steam/main.js [migrate] + userData lines redact the user path',!!ok) }
  console.log('SAMPLE '+JSON.stringify(Object.assign({},p,{shot:p.shot?p.shot.slice(0,40)+'…('+p.shot.length+' chars)':null,log:p.log.slice(-3)}),null,1));
  T('no page errors',errs.length===0,JSON.stringify(errs.slice(0,3)));
  await browser.close(); srv.close(); process.exit(fails?1:0) })();
