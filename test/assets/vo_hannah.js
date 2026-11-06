/* rc8.4 Hanoi Hannah VO (Blake approved accent Nov 6 2026; EP: wire into rc8.4). Fictionalized character, original designed voice
   (ElevenLabs eleven_v3, VbSVL9caq4bk56kor5Vs) - not an imitation of Trinh Thi Ngo or any real broadcast. Source: sound_pack/hanoi_hannah/ogg (LINES.md).
   Files are the processed broadcast versions: plain SamplePlayer.play() on the 'special' bus, NEVER radioLine() (would double the radio FX).
   HANLINES[i] -> vo_hannah_0(i+1). Public tier. ?vo=0 turns it off (game falls back to the synth 'tune'). */
(function(){ 'use strict';
var DUR=[10.0,8.88,7.28,6.8], ON=!/[?&]vo=0\b/.test(location.search), st={req:0,done:0,loaded:0,failed:[],plays:0};
function S(){ return window.SamplePlayer||null }
function slot(i){ return 'vohan_'+(i+1) }
function load(){ var P=S(); if(!P||!P.slots||!P.load)return false; var sl={};
  for(var i=0;i<4;i++){ P.slots[slot(i)]={cat:'voice',prio:6,gain:1.0}; sl[slot(i)]={batch:3,files:['vo_hannah_0'+(i+1)]} }
  var p=P.load({base:'audio/vo_hannah/',formats:['ogg','m4a'],slots:sl}); if(!p)return false; st.req=1;
  p.then(function(r){ if(r.error){ st.req=0; return } st.loaded=r.loaded.length; st.failed=(r.failed||[]).concat(r.missing||[]); st.done=1 },function(){ st.req=0 });
  return true }
var lt=setInterval(function(){ if(!ON||st.done){ clearInterval(lt); return } try{ if(!st.req)load() }catch(e){} },400);   /* SamplePlayer.load resolves {error} until SAMP.init(): retry */
function ready(i){ var P=S(); return ON&&P&&P.hasSample&&P.hasSample(slot(i)) }
/* play line i; returns on-screen seconds (clip + 0.6 s tail for drawHannah's fade) or 0 if no clip (caller keeps the synth tune) */
function play(i){ i=i|0; if(!ready(i))return 0; var h=null; try{ h=S().play(slot(i),{vol:1,bus:'special',vary:false}) }catch(e){ h=null }
  if(!h)return 0; st.plays++; var d=(h.end!=null&&h.start!=null)?(h.end-h.start):DUR[i]; return d+.6 }
window.VOHAN={play:play,ready:ready,st:st,DUR:DUR};
})();
