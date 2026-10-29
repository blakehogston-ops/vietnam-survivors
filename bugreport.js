/* rc8.2 in-game bug reporter (Blake builds only). Loaded ONLY when ?bugreport=1 (exact key, see index.html loader).
   Never sends automatically. Endpoint URL + sender key come only from local config (localStorage lco_bug_cfg
   = {"url":"https://...","key":"..."} or vsHost.bugConfig()); nothing is hardcoded. Until both are set, reports queue locally. */
(function(){ 'use strict';
const BUGREPORT_ENDPOINT=null;            /* never hardcode: real URL lives in lco_bug_cfg / vsHost config */
const QK='lco_bugq', QMAX=20, NMAX=1000, LOGN=200;
const PRESETS=['crash','stuck','visual','audio','controls'];
const LS={ get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:v }catch(e){ return d } }, set(k,v){ try{ localStorage.setItem(k,v); return true }catch(e){ return false } } };
const H=()=>window.__lcoBug||null, ST=()=>{ try{ return H().state() }catch(e){ return '' } }, GG=()=>{ try{ return H().G() }catch(e){ return null } };
const HO=()=>window.vsHost||window.lcoHost||null;
function cfg(){ let c={}; try{ c=JSON.parse(LS.get('lco_bug_cfg','{}'))||{} }catch(e){} try{ const h=HO(); if(h&&typeof h.bugConfig==='function'){ const x=h.bugConfig(); if(x&&typeof x==='object')c=Object.assign({},c,x) } }catch(e){}
  let url=(typeof c.url==='string'&&/^https:\/\//i.test(c.url))?c.url:(BUGREPORT_ENDPOINT||null); if(url&&/^https:\/\/([^\/]*\.)?(discord(app)?\.com)(?=[\/:?#]|$)/i.test(url))url=null;   /* legal: no Discord webhooks */ const key=typeof c.key==='string'&&c.key?c.key:null; return {url,key} }
/* ---- scrubbing: repo-relative paths, no user names, never the sender key ---- */
function scrub(s){ s=String(s==null?'':s); try{ const k=cfg().key; if(k)s=s.split(k).join('[key]') }catch(e){}
  s=s.replace(/(?:file|https?):\/\/[^\s'")]*?\/((?:index\.html|bugreport\.js|assets|audio|tools|steam|js)[^\s'")]*)/gi,'$1');
  s=s.replace(/[A-Za-z]:\\Users\\[^\\\n'"]+(?:\\AppData\\[^\\\n'"]+)?/gi,'~').replace(/%(?:USERPROFILE|APPDATA|LOCALAPPDATA)%/gi,'~').replace(/\/(?:Users|home)\/[^\/\n'"]+/g,'~').replace(/(?:[A-Za-z]:)?(?:[\\\/][^\s\\\/'"()]+)+[\\\/](index\.html|bugreport\.js)/g,'$1');
  return s.slice(0,500) }
/* ---- log ring buffer ---- */
const LOG=[]; function push(lv,args){ try{ const t=[].map.call(args,a=>{ try{ return a instanceof Error?(a.message+' '+(a.stack||'')):typeof a==='object'?JSON.stringify(a):String(a) }catch(e){ return '[obj]' } }).join(' '); LOG.push(lv+' '+scrub(t)); if(LOG.length>LOGN)LOG.splice(0,LOG.length-LOGN) }catch(e){} }
['log','warn','error'].forEach(lv=>{ const o=console[lv]; console[lv]=function(){ push(lv,arguments); return o.apply(console,arguments) } });
addEventListener('error',e=>push('onerror',[e.message+' @'+(e.filename||'')+':'+(e.lineno||0)]));
addEventListener('unhandledrejection',e=>push('rejection',[e.reason&&e.reason.message||e.reason]));
/* ---- binds (LO.BIND style, remappable through lco_binds.bugreport) ---- */
const BIND={ key:'F8', pad:['SE','ST'], hold:.5 };
try{ const b=JSON.parse(LS.get('lco_binds','{}')||'{}').bugreport; if(b){ if(typeof b.key==='string')BIND.key=b.key; if(Array.isArray(b.pad)&&b.pad.length)BIND.pad=b.pad.slice(0,2); else if(typeof b.pad==='string')BIND.pad=[b.pad] } }catch(e){}
{ const h=+LS.get('lco_bug_hold','0.5'); if(h>=.3&&h<=2)BIND.hold=h }
const off=()=>LS.get('lco_bug_off','0')==='1';
function padName(k){ try{ return H().PAD.pn(k).split(' ').pop() }catch(e){ return k } }
function padText(){ return 'hold '+BIND.pad.map(padName).join(' + ')+' '+BIND.hold+' s' }
function keyText(){ return BIND.key.replace(/^Key/,'') }
/* ---- payload ---- */
function plat(){ const u=navigator.userAgent||'', h=HO(); if(!h&&!/electron/i.test(u))return 'web'; return /Mac/i.test(navigator.platform||u)?'mac':/Win/i.test(navigator.platform||u)?'win':'web' }
function loadout(g){ try{ const L=g&&g.lo; if(L&&typeof L==='object')return {primary:L.primary||null,throwable:L.throwable||null,gear:L.gear||null}; if(g&&g.loadout)return {primary:String(g.loadout),throwable:null,gear:null} }catch(e){} return null }
function shot(){ try{ const c=document.getElementById('c'); if(!c||!c.width)return null; const w=640, h=Math.max(1,Math.round(c.height*w/c.width)), o=document.createElement('canvas'); o.width=w; o.height=h; o.getContext('2d').drawImage(c,0,0,w,h); return o.toDataURL('image/jpeg',.6) }catch(e){ return null } }
function build(note,tags,inc){ inc=inc||{}; let g=null; try{ const x=GG(); g=(x&&!x.demo)?x:null }catch(e){} let hb=null; try{ const h=HO(); hb=h&&h.build?(typeof h.build==='function'?h.build():h.build):null }catch(e){}
  let seed=null; try{ seed=window.__lco&&__lco.seed?__lco.seed():null }catch(e){}
  let sha=null; try{ sha=H().build }catch(e){}
  return { v:1, ts:new Date().toISOString(), build:{sha,host:inc.sys&&hb!=null?scrub(hb):null}, platform:inc.sys?plat():null,
    mission:g&&(g.mission||g.missionId)||null, map:(window.__lco&&__lco.mapId)||(g&&g.mapId)||null, seed, difficulty:g&&(g.diff||g.difficulty)||null, char:g&&g.char||null,
    loadout:loadout(g), tags:tags||[], note:scrub(note).slice(0,NMAX), log:inc.logs?LOG.slice(-LOGN):null, shot:inc.shot?(inc.shotData!==undefined?inc.shotData:shot()):null } }   /* v1 never carries a Steam ID or any account id */
/* ---- queue + send (never throws) ---- */
function q(){ try{ const a=JSON.parse(LS.get(QK,'[]')); return Array.isArray(a)?a:[] }catch(e){ return [] } }
function qSave(a){ while(a.length>QMAX)a.shift(); let s=JSON.stringify(a); while(!LS.set(QK,s)&&a.length>1){ a.shift(); s=JSON.stringify(a) }   /* quota: drop oldest, then shots */ if(!LS.set(QK,s)){ a.forEach(r=>r.shot=null); LS.set(QK,JSON.stringify(a)) }
  try{ const h=HO(); if(h&&typeof h.saveFile==='function')h.saveFile('lco_bugq.json',JSON.stringify(a)) }catch(e){} }
function enqueue(p){ const a=q(); a.push(p); qSave(a) }
async function post(p){ const c=cfg(); if(!c.url||!c.key||(typeof navigator!=='undefined'&&navigator.onLine===false))return false;
  try{ const r=await fetch(c.url,{method:'POST',headers:{'content-type':'application/json','x-lco-key':c.key},body:JSON.stringify(p)}); return !!(r&&r.ok) }catch(e){ return false } }
async function send(p){ try{ if(await post(p))return 'sent' }catch(e){} try{ enqueue(p) }catch(e){} return 'queued' }
async function retry(){ try{ const a=q(); if(!a.length)return 0; const left=[]; for(const p of a){ let ok=false; try{ ok=await post(p) }catch(e){} if(!ok)left.push(p) } qSave(left); return a.length-left.length }catch(e){ return 0 } }
/* ---- UI ---- */
let UI=null, opened=false, wasPlay=false;
function css(){ const s=document.createElement('style'); s.textContent=`#bugrep{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;font:18px/1.4 system-ui,sans-serif;color:#f4f4f4}
#bugrep.show{display:flex}#bugrep .bx{background:#14170f;border:2px solid #c9c9a8;padding:18px;width:min(640px,92vw)}#bugrep h3{margin:0 0 8px;font-size:22px}
#bugrep textarea{width:100%;box-sizing:border-box;height:8em;font:18px/1.4 system-ui,sans-serif;background:#000;color:#fff;border:2px solid #9a9a80}
#bugrep button,#bugrep label{font-size:18px}#bugrep button{background:#e8e2b8;color:#111;border:2px solid #e8e2b8;padding:6px 16px;margin:8px 8px 0 0}
#bugrep :focus-visible,#bugrep .pf{outline:4px solid #ffd84a;outline-offset:2px}#bugrep .ct{float:right}#bugrep .msg{margin-top:8px;padding:8px;border:2px solid #9be37a}#bugrep .msg.err{border-color:#ff9a8a}
#bugrep .tg label{margin-right:14px;display:inline-block}`; document.head.appendChild(s) }
function mk(){ css(); const d=document.createElement('div'); d.id='bugrep'; d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-labelledby','bugrepT');
  d.innerHTML=`<div class="bx"><h3 id="bugrepT">REPORT A BUG</h3><div class="tg">${PRESETS.map(p=>`<label><input type="checkbox" value="${p}"> ${p}</label>`).join('')}</div>
<div class="inc">Include (your choice, this report only): <label><input type="checkbox" id="bugIncL"> logs</label> <label><input type="checkbox" id="bugIncS"> screenshot</label> <label><input type="checkbox" id="bugIncY"> system info</label></div><div id="bugPrev" hidden><img id="bugPrevI" alt="Screenshot preview" style="width:240px;border:1px solid #9a9a80"> <button type="button" id="bugPrevX">Remove screenshot</button></div>
<label for="bugrepN">What happened? <span class="ct" id="bugrepC" aria-live="polite">0/${NMAX}</span></label><textarea id="bugrepN" maxlength="${NMAX}"></textarea>
<div class="row"><button type="button" id="bugrepS">Send</button><button type="button" id="bugrepX">Cancel</button></div><div id="bugrepAsk" hidden>Discard this report? <button type="button" id="bugrepDY">Discard</button><button type="button" id="bugrepDN">Keep editing</button></div>
<div id="bugrepM" class="msg" hidden role="status"><span></span> <button type="button" id="bugrepOK">OK</button></div><div id="bugrepH" style="margin-top:6px"></div></div>`;
  document.body.appendChild(d); const $$=id=>d.querySelector('#'+id), ta=$$('bugrepN');
  ta.addEventListener('beforeinput',e=>{ if(e.inputType&&e.inputType.startsWith('insert')&&ta.value.length>=NMAX)e.preventDefault() });
  ta.addEventListener('input',()=>{ $$('bugrepC').textContent=ta.value.length+'/'+NMAX });
  $$('bugrepS').onclick=doSend; $$('bugrepX').onclick=cancel; $$('bugrepDY').onclick=()=>close(); $$('bugrepDN').onclick=()=>{ $$('bugrepAsk').hidden=true; ta.focus() }; $$('bugrepOK').onclick=()=>close();
  $$('bugIncS').onchange=()=>{ const on=$$('bugIncS').checked; $$('bugPrev').hidden=!on||!UI.shot; if(on&&UI.shot)$$('bugPrevI').src=UI.shot };
  $$('bugPrevX').onclick=()=>{ UI.shot=null; $$('bugIncS').checked=false; $$('bugPrev').hidden=true; $$('bugIncS').focus() };
  UI={d,$$,ta}; return UI }
function items(){ return [...UI.d.querySelectorAll('input,textarea,button')].filter(e=>e.offsetParent!==null&&!e.closest('[hidden]')) }
function open(){ if(off()||opened)return false; try{ if(!UI)mk() }catch(e){ return false } wasPlay=ST()==='play'; try{ if(wasPlay)H().pause() }catch(e){}
  opened=true; UI.ta.value=''; UI.$$('bugrepC').textContent='0/'+NMAX; UI.d.querySelectorAll('.tg input,.inc input').forEach(i=>i.checked=false); UI.shot=shot(); UI.$$('bugPrev').hidden=true; UI.$$('bugrepAsk').hidden=true; UI.$$('bugrepM').hidden=true;
  UI.$$('bugrepH').textContent='Keyboard: Tab / Enter · Esc cancel'+(isPad()?' · Pad: D-pad move, '+padName('A')+' select, '+padName('B')+' cancel':''); UI.d.classList.add('show'); setTimeout(()=>{ try{ (isPad()?UI.d.querySelector('.tg input'):UI.ta).focus() }catch(e){} },0); return true }
function isPad(){ try{ return !!H().PAD.on }catch(e){ return false } }
function cancel(){ if(!UI)return; if(!UI.$$('bugrepM').hidden){ close(); return } if(UI.ta.value.trim()&&UI.$$('bugrepAsk').hidden){ UI.$$('bugrepAsk').hidden=false; UI.$$('bugrepDN').focus(); return } if(!UI.$$('bugrepAsk').hidden){ UI.$$('bugrepAsk').hidden=true; UI.ta.focus(); return } close() }
function close(){ if(!UI)return; UI.d.classList.remove('show'); opened=false; try{ if(wasPlay&&ST()==='paused')H().resume() }catch(e){} wasPlay=false }
async function doSend(){ const tags=[...UI.d.querySelectorAll('.tg input:checked')].map(i=>i.value); const p=build(UI.ta.value,tags,{logs:UI.$$('bugIncL').checked,sys:UI.$$('bugIncY').checked,shot:UI.$$('bugIncS').checked&&!!UI.shot,shotData:UI.shot}); let r='queued'; try{ r=await send(p) }catch(e){}
  const m=UI.$$('bugrepM'); m.className='msg'+(r==='sent'?'':' err'); m.querySelector('span').textContent=r==='sent'?'Report sent. Thank you.':'Could not send now: the report is saved on this machine and will be sent on the next launch.'; m.hidden=false; UI.$$('bugrepOK').focus(); return r }
/* keyboard: capture phase so nothing in the game sees keys while the box is up */
addEventListener('keydown',e=>{ if(opened){ e.stopImmediatePropagation(); if(e.code==='Escape'){ e.preventDefault(); cancel() } return }
  if(e.code===BIND.key&&!e.repeat&&!off()){ const st=ST(); if(st==='play'||st==='paused'){ e.preventDefault(); e.stopImmediatePropagation(); open() } } },true);
['keyup','keypress'].forEach(t=>addEventListener(t,e=>{ if(opened)e.stopImmediatePropagation() },true));
/* pad: chord (default Select/Back + Start) or one remapped button, deliberate HOLD only. With the flag on, Select/Start fire on RELEASE
   if released before the hold time, so the chord never also toggles fullscreen / pause and a Start tap never opens the reporter. */
let holdT=0, chordUsed=false; const pend={};
function wrapPad(){ const PAD=H()&&H().PAD; if(!PAD||PAD.__bug)return; PAD.__bug=1; const act=PAD.act.bind(PAD);
  PAD.act=function(k,dx,dy){ if(opened){ padUI(k,dx,dy); return } if(!off()&&k&&BIND.pad.includes(k)){ pend[k]=1; return } return act(k,dx,dy) };
  const fr=()=>{ requestAnimationFrame(fr); try{ const g=PAD.pick(); if(!g)return; const dn=k=>{ const b=g.buttons[PAD.BTN[k]]; return !!(b&&(b.pressed||b.value>.5)) };
    const all=BIND.pad.every(dn); if(all&&!chordUsed){ if(!holdT)holdT=performance.now(); else if(performance.now()-holdT>=BIND.hold*1000){ chordUsed=true; const st=ST(); if(st==='play'||st==='paused')open() } } else if(!all)holdT=0;
    for(const k of Object.keys(pend)){ if(!dn(k)){ delete pend[k]; if(!chordUsed&&!opened)act(k) } }
    if(!BIND.pad.some(dn))chordUsed=false }catch(e){} }; requestAnimationFrame(fr) }
function padUI(k,dx,dy){ const it=items(); let i=it.indexOf(document.activeElement); if(!k&&(dx||dy)){ i=Math.max(0,Math.min(it.length-1,(i<0?0:i)+(dy||dx))); it[i]&&it[i].focus(); return }
  if(k==='A'){ const el=document.activeElement; if(el&&el.type==='checkbox')el.checked=!el.checked; else if(el&&el.tagName==='BUTTON')el.click(); return } if(k==='B')cancel() }
/* pause menu: Report a bug item, reporter on/off toggle, pad hold time */
function pauseUI(){ const P=document.getElementById('pause'); if(!P||P.querySelector('#btnBug'))return; const b=document.createElement('button'); b.type='button'; b.className='btn alt'; b.id='btnBug';
  const lab=()=>{ b.textContent='Report a bug ['+keyText()+' · '+padText()+']' }; lab(); b.onclick=()=>open(); const q=P.querySelector('#btnQuit'); (q&&q.nextSibling)?P.insertBefore(b,q.nextSibling):P.appendChild(b);
  const t=document.createElement('label'); t.className='goresw bugSw'; t.innerHTML='<span>BUG REPORTER</span><input type="checkbox" id="bugOn"><i></i><b id="bugOnT"></b>'; const c=t.querySelector('input'); const sy=()=>{ c.checked=!off(); t.querySelector('b').textContent=off()?'OFF':'ON'; b.hidden=off() }; c.onchange=()=>{ LS.set('lco_bug_off',c.checked?'0':'1'); sy() }; sy(); b.after(t);
  const h=document.createElement('label'); h.className='goresw bugHold'; h.innerHTML='<span>BUG PAD HOLD</span><select id="bugHold">'+[.5,1,1.5,2].map(v=>`<option value="${v}"${v===BIND.hold?' selected':''}>${v} s</option>`).join('')+'</select>'; h.querySelector('select').onchange=e=>{ BIND.hold=+e.target.value; LS.set('lco_bug_hold',String(BIND.hold)); lab() }; t.after(h);
  setInterval(()=>{ try{ lab() }catch(e){} },1000) }   /* live binding / DualSense glyphs */
function init(){ try{ pauseUI() }catch(e){} try{ wrapPad() }catch(e){} setTimeout(()=>{ retry().catch(()=>{}) },3000) }
if(document.readyState==='loading')addEventListener('DOMContentLoaded',init); else init();
window.__bugrep={ open, close, cancel, send:()=>doSend(), build, queue:q, retry, cfg:()=>{ const c=cfg(); return {url:!!c.url,key:!!c.key} }, scrub, log:()=>LOG.slice(), BIND, isOpen:()=>opened };
})();
