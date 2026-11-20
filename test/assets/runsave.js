/* rc8.1 EP: resume after Chrome tab discard.
   While a run is live: snapshot to localStorage lco_runsave every 10 s and on visibilitychange->hidden.
   On load: if lco_navcause.disc was written by THIS load (<60 s old) and the snapshot is < 30 min old, show RESUME RUN on the title.
   Otherwise the snapshot is cleared. Cleared at run end (state over) and on quit (state menu). A resumed run never records a best (G.awarded). 
   Restores: G (time, timers, wave/surge/boss counters, player+squad HP/XP/level, weapons+passives = upgrades, extraction, seed, char),
   rc8.2 ?loadout=1: v:2 (G.lo = Doc's loadout, inside G). A v:1 snapshot resumed with the flag on is migrated by LO.migrate() (M16A1 if G.w.m16, else .45).
   firebase (lzS/fbS/fbC/engs/strs/chgs/fbH), squad, MoH (cur/q/fb/done/alertT). Not restored: live enemies/projectiles/particles (respawn from G timers). */
(function(){ var LCOR=(typeof window!=='undefined'&&window.__lcoR)||window;   /* rc9.1: game namespace (window on QA, private on public) */ const K='lco_runsave', MAXAGE=30*60e3, EVERY=10e3; let last=0, mine=false;
  const H=()=>LCOR.__RSH;
  function clean(o){ const seen=new WeakSet(); return JSON.stringify(o,function(k,v){ if(typeof v==='function')return undefined;
    if(v&&typeof v==='object'){ if(typeof HTMLElement!=='undefined'&&v instanceof HTMLElement)return undefined; if(typeof HTMLCanvasElement!=='undefined'&&(v instanceof HTMLCanvasElement||(typeof ImageBitmap!=='undefined'&&v instanceof ImageBitmap)))return undefined;
      if(typeof CanvasRenderingContext2D!=='undefined'&&v instanceof CanvasRenderingContext2D)return undefined; if(seen.has(v))return undefined; seen.add(v) } return v }) }
  function save(why){ const h=H(); if(!h||!h.live())return; try{ localStorage.setItem(K,clean({v:(LCOR.LO&&LCOR.LO.ON)?2:1,at:Date.now(),why,build:window.LCO_BUILD||'',s:h.get()})); last=Date.now(); mine=true; LCOR.__rsLast={why,at:last} }catch(e){ console.warn('[LCO] runsave failed',e&&e.message) } }
  function clear(){ try{ localStorage.removeItem(K) }catch(e){} mine=false }
  setInterval(()=>{ const h=H(); if(!h)return; if(h.live()){ if(Date.now()-last>=EVERY)save('tick') } else if(mine&&(h.state()==='over'||h.state()==='menu'))clear() },1000);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden)save('hidden') });
  function offer(){ let snap=null,nc=null; try{ snap=JSON.parse(localStorage.getItem(K)||'null'); nc=JSON.parse(localStorage.getItem('lco_navcause')||'null') }catch(e){}
    if(!snap)return; const fresh=nc&&nc.disc&&Date.now()-(nc.at||0)<60e3, young=Date.now()-snap.at<MAXAGE;
    if(!(fresh&&young&&snap.s&&snap.s.G)){ clear(); return }
    const menu=document.getElementById('menu'), st=document.getElementById('btnStart'); if(!menu||!st){ clear(); return }
    const b=document.createElement('button'); b.type='button'; b.className='btn'; b.id='btnResume'; const g=snap.s.G, m=Math.floor((g.t||0)/60), s=Math.floor((g.t||0)%60);
    b.textContent='RESUME RUN'; b.title='Chrome unloaded the tab to save memory. Resume at '+m+':'+String(s).padStart(2,'0')+' (does not count toward bests).';
    const sub=document.createElement('div'); sub.className='sub'; sub.id='resumeNote'; sub.style.cssText='font-size:18px;margin:4px 0 2px'; sub.textContent='Chrome unloaded the tab. Run at '+m+':'+String(s).padStart(2,'0')+', level '+((g.p&&g.p.lvl)||1)+'. Not counted toward bests.';
    menu.insertBefore(b,st); menu.insertBefore(sub,b);
    const gone=()=>{ b.remove(); sub.remove() };
    b.addEventListener('click',e=>{ e.preventDefault(); e.stopPropagation(); gone(); try{ H().put(snap.s); LCOR.__rsResumed={at:Date.now(),t:g.t}; console.info('[LCO] run resumed after discard at t='+Math.round(g.t)) }catch(err){ console.warn('[LCO] resume failed',err&&err.message) } clear() });
    st.addEventListener('click',()=>{ gone(); clear() },{once:true});
    LCOR.__rsOffer={t:g.t,lvl:g.p&&g.p.lvl,at:snap.at} }
  if(document.readyState==='complete')setTimeout(offer,0); else addEventListener('load',()=>setTimeout(offer,0));
  LCOR.__RS={save,clear,offer,K};
  /* rc9.1 public lockdown: on app:// (Steam/Electron) the wrapper's quit hook (steam/preload.js 'run:suspend') still calls window.__RSH.live() and
     window.__RS.save('host-quit'). Those two are the only game handles on app://: frozen, non-writable, no live refs, save() only writes the player's own
     lco_runsave snapshot (same as the 10 s tick). Never on ?lcotier=public over http (LCOR===window on QA tiers, where the full objects are on window). */
  if(LCOR!==window&&location.protocol==='app:'){ try{
    Object.defineProperty(window,'__RSH',{value:Object.freeze({live:function(){ const h=H(); return !!(h&&h.live()) }}),enumerable:true});
    Object.defineProperty(window,'__RS',{value:Object.freeze({save:function(){ save('host-quit') }}),enumerable:true}) }catch(e){} }
})();
