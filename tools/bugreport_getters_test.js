#!/usr/bin/env node
/* rc8.2 bug-reporter getters, Node-only (no browser; style of seednull_test.js).
   A) window.__lcoBug read-only getters from index.html (mission, difficulty, build, state, G) with stubbed G / state / EXQ / __lco.
   B) bugreport.js read-only API (__bugrep.build payload, cfg, queue, scrub, BIND) in a stub window: normal values, edge states
      (menu G=null, demo, before run, no __lcoBug, throwing getters/localStorage, corrupt saves) and payload shape/types.
   Exit 1 on any FAIL. "BUG" lines = real defects found (reported, not fixed here); they do not change the exit code. */
const fs=require('fs'), path=require('path'), {execSync}=require('child_process'); const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'index.html'),'utf8'), brSrc=fs.readFileSync(path.join(root,'bugreport.js'),'utf8');
let fails=0, n=0; const bugs=[]; const T=(nm,ok,x)=>{ n++; console.log((ok?'PASS ':'FAIL ')+nm+(x!==undefined?' :: '+JSON.stringify(x):'')); if(!ok)fails++ };
const BUG=(nm,x)=>{ bugs.push(nm); console.log('BUG  '+nm+(x!==undefined?' :: '+JSON.stringify(x):'')) };
// ---------- A) __lcoBug from index.html
const line=src.split('\n').find(l=>/^if\((QAOK&&|window\.LCO_TIER!=='public'&&)?new URLSearchParams\(location\.search\)\.get\('bugreport'\)==='1'\)window\.__lcoBug=/.test(l));
T('__lcoBug loader line found',!!line); if(!line)process.exit(1);
const stmt=line.slice(0,line.indexOf('};')+2);
T('__lcoBug gated on exact ?bugreport=1',/get\('bugreport'\)==='1'/.test(stmt));
function lcoBug({qs='?bugreport=1',g=null,st='menu',exq=null,lco=undefined,qaok=true,tier='test'}={}){ const window={LCO_TIER:tier}; if(lco!==undefined)window.__lco=lco;
  new Function('window','location','G','state','EXQ','BUILD','PAD','pauseGame','resumeGame','QAOK',stmt)(window,{search:qs},g,st,exq,{id:'abc1234'},{on:false,pn:k=>k},()=>{},()=>{},qaok); return window.__lcoBug }
for(const q of ['','?bugreport=0','?bugreport=true','?bugreportx=1','?xbugreport=1'])T(`__lcoBug absent for "${q||'(none)'}"`,lcoBug({qs:q})===undefined);
{ const B=lcoBug(); T('__lcoBug shape: functions + build string',['pause','resume','state','G','mission','difficulty'].every(k=>typeof B[k]==='function')&&typeof B.build==='string'&&B.build==='abc1234'&&!!B.PAD,Object.keys(B)) }
T('__lcoBug absent on public tier',lcoBug({tier:'public'})===undefined); T('__lcoBug present on friends tier (Electron preview)',!!lcoBug({tier:'friends',qaok:false}));
{ const g={demo:false,mapId:'m',char:'doc',lo:{prim:'m16'},p:{hp:5}}; const x=lcoBug({g}).G(); T('__lcoBug.G() is a copy, not live G',x!==g&&!('p' in x)&&x.lo!==g.lo&&x.lo.prim==='m16') }
const run=o=>Object.assign({demo:false,char:'doc',t:5},o||{});
T('mission(): menu G=null -> null',lcoBug().mission()===null);
T('mission(): demo -> null',lcoBug({g:run({demo:true})}).mission()===null);
T('mission(): run, no map -> "default · Extraction"',lcoBug({g:run()}).mission()==='default · Extraction');
T('mission(): G.mapId used',lcoBug({g:run({mapId:'cam_lo_river'})}).mission()==='cam_lo_river · Extraction');
T('mission(): __lco.mapId wins over G.mapId',lcoBug({g:run({mapId:'con_thien'}),lco:{mapId:'khe_sanh_861a'}}).mission()==='khe_sanh_861a · Extraction');
T('mission(): __lco without mapId falls back to G.mapId',lcoBug({g:run({mapId:'route_9_lowlands'}),lco:{}}).mission()==='route_9_lowlands · Extraction');
T('mission(): returns string in run',typeof lcoBug({g:run()}).mission()==='string');
for(const [e,l] of [[null,'Normal'],['easy','Easy'],['hard','Hard'],['normal','Normal'],['HARD','Normal'],['',"Normal"]])T(`difficulty(): EXQ=${JSON.stringify(e)} -> ${l}`,lcoBug({exq:e}).difficulty()===l);
T('difficulty(): defined on menu too (no G needed)',lcoBug({g:null,exq:'easy'}).difficulty()==='Easy');
{ const g=run(); const B=lcoBug({g,st:'play'}); const x=B.G(); T('state() passes through; G() is a read-only snapshot (rc8.4 EP: no live G)',B.state()==='play'&&x!==g&&x.char===g.char&&x.demo===false) }
T('__lcoBug has no setters (no saved state)',!/localStorage|\.set\w*\(/.test(stmt.replace(/setFullscreen/g,'')));
// ---------- B) bugreport.js in a stub window
function br({ls={},lcoBug:B=null,lco=undefined,host=null,throwLS=false,ua='Mozilla/5.0 (X11; Linux x86_64) Chrome/130'}={}){ const store=Object.assign({},ls);
  const localStorage={getItem:k=>{ if(throwLS)throw new Error('SecurityError'); return k in store?store[k]:null },setItem:(k,v)=>{ if(throwLS)throw new Error('SecurityError'); store[k]=String(v) },removeItem:k=>{delete store[k]}};
  const window={__lcoBug:B}; if(lco!==undefined)window.__lco=lco; if(host)window.vsHost=host;
  const document={readyState:'complete',getElementById:()=>null,createElement:()=>({getContext:()=>null}),head:{appendChild(){}},body:{appendChild(){}}};
  const con={log(){},warn(){},error(){}};
  new Function('window','localStorage','document','navigator','console','addEventListener','requestAnimationFrame','setTimeout','setInterval','fetch','__lco',brSrc)
    (window,localStorage,document,{userAgent:ua,platform:'Linux',onLine:true},con,()=>{},()=>{},()=>0,()=>0,async()=>({ok:false}),window.__lco);
  return {api:window.__bugrep,store,window} }
const HB=(o={})=>Object.assign({state:()=>'play',G:()=>null,PAD:{on:false,pn:k=>k},build:'abc1234',mission:()=>null,difficulty:()=>'Normal',pause(){},resume(){}},o);
{ const {api}=br(); T('__bugrep shape',['open','close','cancel','send','build','queue','retry','cfg','scrub','log','isOpen'].every(k=>typeof api[k]==='function')&&typeof api.BIND==='object',Object.keys(api)) }
const KEYS=['v','ts','build','platform','mission','map','seed','difficulty','char','loadout','tags','note','log','shot'];
// menu / before run
{ const {api}=br({lcoBug:HB({state:()=>'menu'}),lco:{seed:()=>null}}); const p=api.build('',[]);
  T('build(): payload keys exact (v1, no account ids)',JSON.stringify(Object.keys(p))===JSON.stringify(KEYS),Object.keys(p));
  T('build(): v=1, ts ISO string',p.v===1&&typeof p.ts==='string'&&!isNaN(Date.parse(p.ts)));
  T('build(): menu -> mission/difficulty/char/loadout/seed/map null',p.mission===null&&p.difficulty===null&&p.char===null&&p.loadout===null&&p.seed===null&&p.map===null,p);
  T('build(): build.sha from __lcoBug.build, host null without consent',p.build.sha==='abc1234'&&p.build.host===null);
  T('build(): no consent -> platform/log/shot null',p.platform===null&&p.log===null&&p.shot===null);
  T('build(): tags array, note string',Array.isArray(p.tags)&&typeof p.note==='string') }
// no __lcoBug at all (reporter loaded without the index hook)
{ const {api}=br(); const p=api.build('x',['crash']); T('build(): no __lcoBug -> sha null, no throw, tags kept',p.build.sha===null&&p.mission===null&&p.tags[0]==='crash') }
// demo
{ const g=run({demo:true,mapId:'con_thien'}); const {api}=br({lcoBug:HB({G:()=>g,mission:()=>'should-not-be-read',difficulty:()=>'Hard'})}); const p=api.build('',[]);
  T('build(): demo G -> mission/difficulty/char/loadout null',p.mission===null&&p.difficulty===null&&p.char===null&&p.loadout===null,p) }
// in run
{ const g=run({mapId:'cam_lo_river',loadout:'kit'}); const {api}=br({lcoBug:HB({G:()=>g,mission:()=>'cam_lo_river · Extraction',difficulty:()=>'Hard'}),lco:{seed:()=>23}});
  const p=api.build('it broke',['stuck','visual'],{sys:true});
  T('build(): run -> mission/difficulty/char/seed/map',p.mission==='cam_lo_river · Extraction'&&p.difficulty==='Hard'&&p.char==='doc'&&p.seed===23&&p.map==='cam_lo_river',p);
  T('build(): legacy g.loadout string -> {primary,throwable:null,gear:null}',JSON.stringify(p.loadout)==='{"primary":"kit","throwable":null,"gear":null}',p.loadout);
  T('build(): sys consent -> platform web (no host)',p.platform==='web');
  T('build(): types: seed number, mission/difficulty/char strings',typeof p.seed==='number'&&typeof p.mission==='string'&&typeof p.difficulty==='string'&&typeof p.char==='string') }
// __lco.mapId wins for map
{ const g=run({mapId:'con_thien'}); const {api}=br({lcoBug:HB({G:()=>g}),lco:{mapId:'khe_sanh_861a'}}); T('build(): __lco.mapId wins for map',api.build('',[]).map==='khe_sanh_861a') }
// throwing getters never throw out of build()
{ const g=run(); const boom=()=>{ throw new Error('x') }; const {api}=br({lcoBug:HB({G:()=>g,mission:boom,difficulty:boom}),lco:{seed:boom}}); let p, ok=true; try{ p=api.build('',[]) }catch(e){ ok=false }
  T('build(): throwing mission/difficulty/seed -> null, no throw',ok&&p.mission===null&&p.difficulty===null&&p.seed===null,p) }
{ const {api}=br({lcoBug:HB({G:()=>{ throw new Error('x') }})}); let ok=true; try{ api.build('',[]) }catch(e){ ok=false } T('build(): throwing G() -> no throw',ok) }
// empty-string getters coerced to null (HG uses f()||null)
{ const g=run(); const {api}=br({lcoBug:HB({G:()=>g,mission:()=>'',difficulty:()=>''})}); const p=api.build('',[]); T('build(): empty-string mission/difficulty -> null',p.mission===null&&p.difficulty===null) }
// note scrub + caps
{ const {api}=br({ls:{lco_bug_cfg:JSON.stringify({key:'SEKRET'})}}); const p=api.build('C:\\Users\\Blake\\x /home/blake/a SEKRET','',{}); 
  T('build(): note scrubbed (user paths, key)',!/Blake|blake|SEKRET/.test(p.note)&&/\[key\]/.test(p.note),p.note);
  T('build(): note capped at 500 (scrub) / never > 1000',api.build('x'.repeat(5000),[]).note.length===500) }
T('scrub(): null/undefined -> ""',br().api.scrub(null)===''&&br().api.scrub(undefined)==='');
T('scrub(): https url -> repo-relative',br().api.scrub('at https://example.com/lco/index.html:12')==='at index.html:12');
// cfg()
T('cfg(): nothing set -> {url:false,key:false}',JSON.stringify(br().api.cfg())==='{"url":false,"key":false}');
T('cfg(): http url rejected, https ok',br({ls:{lco_bug_cfg:'{"url":"http://x.test","key":"k"}'}}).api.cfg().url===false&&br({ls:{lco_bug_cfg:'{"url":"https://x.test","key":"k"}'}}).api.cfg().url===true);
T('cfg(): Discord webhook rejected',br({ls:{lco_bug_cfg:'{"url":"https://discord.com/api/webhooks/1","key":"k"}'}}).api.cfg().url===false&&br({ls:{lco_bug_cfg:'{"url":"https://ptb.discordapp.com/x","key":"k"}'}}).api.cfg().url===false);
T('cfg(): corrupt JSON -> false/false',JSON.stringify(br({ls:{lco_bug_cfg:'{bad'}}).api.cfg())==='{"url":false,"key":false}');
T('cfg(): host bugConfig merged',br({host:{bugConfig:()=>({url:'https://h.test',key:'z'})}}).api.cfg().url===true);
T('cfg(): never exposes the key value',!JSON.stringify(br({ls:{lco_bug_cfg:'{"url":"https://x.test","key":"SEKRET"}'}}).api.cfg()).includes('SEKRET'));
// queue()
T('queue(): empty -> []',Array.isArray(br().api.queue())&&br().api.queue().length===0);
T('queue(): corrupt / non-array -> []',br({ls:{lco_bugq:'{x'}}).api.queue().length===0&&br({ls:{lco_bugq:'{"a":1}'}}).api.queue().length===0);
T('queue(): stored array returned',br({ls:{lco_bugq:'[{"v":1},{"v":1}]'}}).api.queue().length===2);
// localStorage throws everywhere
{ let ok=true, r; try{ r=br({throwLS:true,lcoBug:HB()}); r.api.build('',[]); r.api.queue(); r.api.cfg() }catch(e){ ok=false } T('localStorage throwing -> loads, build/queue/cfg do not throw',ok) }
// BIND defaults + remap
T('BIND defaults F8, SE+ST, 0.5 s',(b=>b.key==='F8'&&b.pad.join()==='SE,ST'&&b.hold===.5)(br().api.BIND));
T('BIND remap from lco_binds.bugreport; hold clamp',(b=>b.key==='F9'&&b.pad.join()==='LB,RB'&&b.hold===.5)(br({ls:{lco_binds:'{"bugreport":{"key":"F9","pad":["LB","RB","X"]}}',lco_bug_hold:'9'}}).api.BIND));
// getters leave storage alone
{ const r=br({ls:{lco_bugq:'[]',lco_bug_cfg:'{}'},lcoBug:HB({G:()=>run()})}); const b=JSON.stringify(r.store); r.api.build('n',[]); r.api.queue(); r.api.cfg(); r.api.scrub('x'); T('build/queue/cfg/scrub do not write localStorage',JSON.stringify(r.store)===b) }
// ---------- cross-check vs the rc8.2/loadout shape (4a1cb84): G.lo = {prim, side, thr, gear, sel, v}
{ let lo=null; try{ const s=execSync('git show 4a1cb84:index.html',{cwd:root,stdio:['ignore','pipe','ignore'],maxBuffer:64<<20}).toString(); const m=s.match(/G\.lo=\{prim:p\.prim,side:'m1911',thr:[^,]+,gear:p\.gear/); lo=!!m }catch(e){}
  if(lo===null)console.log('SKIP loadout cross-check (4a1cb84 not in this repo)');
  else { T('rc8.2/loadout writes G.lo={prim,side,thr,gear,...}',lo);
    const g=run({lo:{prim:'m60',side:'m1911',thr:'smoke',gear:'etool',sel:'m60',v:2}}); const p=br({lcoBug:HB({G:()=>g})}).api.build('',[]);
    if(!(p.loadout&&p.loadout.primary==='m60'&&p.loadout.throwable==='smoke'&&p.loadout.gear==='etool'))
      BUG('bugreport.js loadout() reads G.lo.primary/.throwable but rc8.2/loadout stores G.lo.prim/.thr -> report shows primary:null, throwable:null once both are merged',p.loadout) } }
console.log(`bugreport_getters_test: ${fails?fails+'/'+n+' FAIL':'ALL PASS ('+n+')'}${bugs.length?'; '+bugs.length+' BUG found (reported, not fixed)':''}`); process.exit(fails?1:0)
