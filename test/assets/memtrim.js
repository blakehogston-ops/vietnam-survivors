/* rc8.1 EP memory trims (no game logic): when a run is in play, drop the colonel intro's baked canvases
   (INTRO_V2 cache, ~7 Mpx; they are re-baked lazily if the briefing is replayed). */
(function(){ let freed=false;
  setInterval(()=>{ const h=window.__RSH; if(!h)return; const st=h.state();
    if(st==='play'&&!freed&&window.INTRO_V2&&INTRO_V2.clearCache){ try{ INTRO_V2.clearCache(); freed=true; window.__mtFreed=(window.__mtFreed|0)+1 }catch(e){} }
    else if(st==='menu'||st==='brief'||st==='over')freed=false },2000);
})();
