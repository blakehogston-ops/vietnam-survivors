/* rc8.1 EP memory trims (no game logic): when a run is in play, drop the colonel intro's baked canvases
   (INTRO_V2 cache, ~7 Mpx; they are re-baked lazily if the briefing is replayed). */
(function(){ var LCOR=(typeof window!=='undefined'&&window.__lcoR)||window;   /* rc9.1: game namespace (window on QA, private on public) */ let freed=false;
  setInterval(()=>{ const h=LCOR.__RSH; if(!h)return; const st=h.state();
    if(st==='play'&&!freed&&LCOR.INTRO_V2&&LCOR.INTRO_V2.clearCache){ try{ LCOR.INTRO_V2.clearCache(); freed=true; LCOR.__mtFreed=(LCOR.__mtFreed|0)+1 }catch(e){} }
    else if(st==='menu'||st==='brief'||st==='over')freed=false },2000);
})();
