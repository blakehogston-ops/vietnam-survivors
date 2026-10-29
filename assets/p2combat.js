/* Phase 2 combat prototype (proto/p2-combat, ?p2=1 only). Manual aim + fire, 4 weapon slots, only the held weapon fires,
   timed reloads required when empty, ammo pickups. Weapon specs per SIGNED brief /workspace/research/small-arms-1968-brief.md §0/§1
   (HAA+MHR Oct 28 2026). Reload times, spares, rates and pickup sizes are GAME VALUES. Never loaded with ?p2=0 / no ?p2. */
(function(){
const W=[ // mag: signed spec; res/rl/cd: game values
 {id:'m16',  nm:'M16A1',   mag:20, res:160, rl:2.2, cd:.09, auto:true,  spd:700, life:.85, col:'#fff3a0', snd:'m16', mags:'m16', spr:.05},
 {id:'m1911',nm:'M1911A1', mag:7,  res:21,  rl:1.6, cd:.22, auto:false, spd:620, life:.6,  col:'#ffe8a0', snd:'m16', mags:'m1911', spr:.04},
 {id:'m60',  nm:'M60',     mag:100,res:500, rl:6.5, cd:.11, auto:true,  spd:640, life:.7,  col:'#ffc860', snd:'m60', mags:'m60', spr:.09, tracer:5},
 {id:'m79',  nm:'M79 HE',  mag:1,  res:24,  rl:1.8, cd:.4,  auto:false, gl:true},
];
const P2=window.P2={on:true, W, g:null, sel:0, st:[], fireHeld:false, aim:0, mx:null, my:null, padAim:null, reload:null, sw:0, picks:[], log:{shots:{},reloads:0,dry:0,picked:0,blocked:0},
 reset(g){ this.g=g; this.sel=0; this.reload=null; this.sw=0; this.picks=[]; this.cd=0; this.st=W.map(w=>({mag:w.mag,res:w.res})); this.log={shots:{},reloads:0,dry:0,picked:0,blocked:0}; this.semiLatch=false },
 cur(){ return W[this.sel] },
 select(i){ if(i<0||i>=W.length||i===this.sel)return; this.sel=i; this.reload=null; this.sw=.4; this.semiLatch=true; try{Snd.play('ready')}catch(e){} },
 cycle(d){ this.select((this.sel+d+W.length)%W.length) },
 startReload(){ const w=this.cur(), s=this.st[this.sel]; if(this.reload||s.mag>=w.mag||s.res<=0)return false; this.reload={i:this.sel,t:w.rl,T:w.rl}; this.log.reloads++; try{ BARK&&rnd()<.3&&BARK.ev&&0 }catch(e){} return true },
 dmgOf(w){ const g=G, lv=id=>(g.w[id]&&g.w[id].lvl)||1; try{
   if(w.id==='m16')return ITEMS.m16.stats(lv('m16')).dmg; if(w.id==='m1911')return Math.max(4,Math.round(ITEMS.m16.stats(lv('m16')).dmg*.7));
   if(w.id==='m60')return ITEMS.m60.stats(lv('m60')).dmg; if(w.id==='m79'){ const s=ITEMS.m79.stats(lv('m79')); return s } }catch(e){} return 10 },
 aimAngle(){ const g=G,p=g.p; if(DBG.bot||this.botAim){ const t=nearestK(p.x,p.y,1,520)[0]; if(t)return Math.atan2(t.y-p.y,t.x-p.x); return this.aim }
   if(this.padAim!=null)return this.padAim; if(this.mx!=null){ const r=cv.getBoundingClientRect(); return Math.atan2(this.my-(r.top+r.height/2),this.mx-(r.left+r.width/2)) } return this.aim },
 shoot(){ const g=G,p=g.p,w=this.cur(),s=this.st[this.sel]; const a=this.aim;
   if(s.mag<=0){ this.log.dry++; this.cd=.25; try{Snd.play('ready')}catch(e){} if(s.res>0)this.startReload(); return false }
   s.mag--; this.log.shots[w.id]=(this.log.shots[w.id]|0)+1; CURW='p2'+w.id;
   if(w.gl){ const st=this.dmgOf(w), r=Math.min(340,Math.max(60,this.mx!=null&&!DBG.bot?340:(nearestK(p.x,p.y,1,340)[0]?Math.hypot(nearestK(p.x,p.y,1,340)[0].x-p.x,nearestK(p.x,p.y,1,340)[0].y-p.y):260)));
     grenades.push({wid:CURW,sx:p.x,sy:p.y,x:p.x,y:p.y,tx:p.x+Math.cos(a)*r,ty:p.y+Math.sin(a)*r,t:0,d:.7,dmg:st.dmg,rad:st.rad*(1+g.area)}); try{SAMP.m79(SAMP.tail())}catch(e){} }
   else { const d=this.dmgOf(w), b=a+(rnd()-.5)*w.spr; addBullet(p.x+Math.cos(b)*14,p.y-3+Math.sin(b)*14,b,w.spd,d,w.id==='m60'?2:1,w.life,3.2,w.tracer&&(this.log.shots[w.id]%w.tracer)?'#ffd890':w.col); try{Snd.play(w.snd)}catch(e){} try{MAGS.shot(p,w.mags,p.x,p.y)}catch(e){} g.muzzle=.06; g.mzW=w.id==='m1911'?'m16':w.id; }
   CURW=''; this.cd=w.cd; if(s.mag<=0&&s.res>0)this.startReload(); return true },
 tick(dt){ const g=G; if(!g||g.demo)return; if(this.g!==g)this.reset(g); this.pollPad();
   if(this.sw>0)this.sw-=dt; if(this.cd>0)this.cd-=dt;
   if(this.reload){ this.reload.t-=dt; if(this.reload.t<=0){ const w=W[this.reload.i], s=this.st[this.reload.i], n=Math.min(w.mag-s.mag,s.res); s.mag+=n; s.res-=n; this.reload=null } }
   this.aim=this.aimAngle();
   const bot=DBG.bot||this.botFire; if(bot){ const s=this.st[this.sel]; if(s.mag<=0&&s.res<=0){ const j=this.st.findIndex(x=>x.mag>0||x.res>0); if(j>=0)this.select(j) } }
   const want=bot?!!nearestK(g.p.x,g.p.y,1,520)[0]:this.fireHeld;
   if(!want)this.semiLatch=false;
   if(want&&this.sw<=0&&this.cd<=0){ if(this.reload){ this.log.blocked++; } else if(this.cur().auto||!this.semiLatch||bot){ this.shoot(); this.semiLatch=true } }
   // pickups
   const p=g.p; for(let i=this.picks.length-1;i>=0;i--){ const k=this.picks[i]; k.t-=dt; if(k.t<=0){this.picks.splice(i,1);continue} if(Math.hypot(k.x-p.x,k.y-p.y)<24){ this.give(k.k); this.picks.splice(i,1) } }
   this.hud() },
 give(k){ const S=this.st; if(k==='mag'){ S[0].res+=40; S[1].res+=7 } else if(k==='belt'){ S[2].res+=100 } else if(k==='m79'){ S[3].res+=3 } this.log.picked++; try{ addFloat&&0 }catch(e){} try{Snd.play('ready')}catch(e){} },
 drop(e){ const g=G; if(!g||g.demo||this.picks.length>24)return; const r=rnd(); if(r>.10)return; const k=r<.06?'mag':r<.085?'m79':'belt'; this.picks.push({x:e.x,y:e.y,k,t:25}) },
 spawnPickup(k,x,y){ this.picks.push({x,y,k,t:25}) },
 padKey(k){ if(state!=='play')return false; if(k==='RT')return true; if(k==='LB'){this.cycle(-1);return true} if(k==='RB'){this.cycle(1);return true} if(k==='L3'||k==='R3'){this.startReload();return true} return false },
 pollPad(){ let gp=null; try{ gp=[...(navigator.getGamepads?navigator.getGamepads():[])].find(x=>x&&x.connected) }catch(e){} if(!gp){ return } const ax=gp.axes[2]||0, ay=gp.axes[3]||0; this.padAim=Math.hypot(ax,ay)>.35?Math.atan2(ay,ax):this.padAim; const rt=gp.buttons[7]; this.padFire=!!(rt&&(rt.pressed||rt.value>.3)); this.fireHeld=this.mouseDown||this.padFire },
 hud(){ let el=this.el; if(!el){ el=this.el=document.createElement('div'); el.id='p2hud'; el.style.cssText='position:fixed;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:8px;z-index:40;font:bold 18px monospace;pointer-events:none'; document.body.appendChild(el);
     const oc=this.oc=document.createElement('canvas'); oc.id='p2ov'; oc.style.cssText='position:fixed;pointer-events:none;z-index:39'; document.body.appendChild(oc) }
   el.style.display=state==='play'?'flex':'none';
   el.innerHTML=W.map((w,i)=>{ const s=this.st[i], on=i===this.sel, rl=this.reload&&this.reload.i===i; return '<div data-p2slot="'+i+'" style="padding:4px 8px;border:2px solid '+(on?'#ffd54a':'#4a4a3a')+';background:rgba(10,14,8,.82);color:'+(s.mag===0?'#ff7a5a':'#e8dcc0')+'">'+(i+1)+' '+w.nm+' '+(rl?'RELOADING '+Math.max(0,this.reload.t).toFixed(1)+'s':s.mag+'/'+s.res)+'</div>' }).join('');
   // world overlay: pickups + aim line
   const oc=this.oc, r=cv.getBoundingClientRect(); if(oc.width!==Math.round(r.width)||oc.height!==Math.round(r.height)){ oc.width=Math.round(r.width); oc.height=Math.round(r.height) } oc.style.left=r.left+'px'; oc.style.top=r.top+'px'; oc.style.width=r.width+'px'; oc.style.height=r.height+'px';
   const c=oc.getContext('2d'); c.clearRect(0,0,oc.width,oc.height); if(state!=='play')return; const z=r.width/VW, p=G.p, cx=oc.width/2, cy=oc.height/2;
   for(const k of this.picks){ const x=cx+(k.x-p.x)*z, y=cy+(k.y-p.y)*z; c.fillStyle=k.k==='belt'?'#b8933e':k.k==='m79'?'#6a7a3a':'#3a4a2a'; c.strokeStyle='#ffe58a'; c.lineWidth=2; c.fillRect(x-7*z,y-5*z,14*z,10*z); c.strokeRect(x-7*z,y-5*z,14*z,10*z); c.fillStyle='#ffe58a'; c.font='bold '+Math.round(9*z)+'px monospace'; c.textAlign='center'; c.fillText(k.k==='mag'?'AMMO':k.k==='belt'?'BELT':'40MM',x,y-8*z) }
   c.strokeStyle='rgba(255,230,140,.55)'; c.lineWidth=2; const a=this.aim; c.beginPath(); c.arc(cx+Math.cos(a)*60*z,cy+Math.sin(a)*60*z-3*z,6*z,0,6.283); c.stroke() }
};
addEventListener('mousemove',e=>{ P2.mx=e.clientX; P2.my=e.clientY; P2.padAim=null },{passive:true});
addEventListener('mousedown',e=>{ if(e.button===0&&state==='play'&&!(e.target.closest&&e.target.closest('button,#levelup,select,input'))){ P2.mouseDown=true; P2.fireHeld=true } });
addEventListener('mouseup',e=>{ if(e.button===0){ P2.mouseDown=false; P2.fireHeld=!!P2.padFire } });
addEventListener('wheel',e=>{ if(state==='play')P2.cycle(e.deltaY>0?1:-1) },{passive:true});
addEventListener('keydown',e=>{ if(state!=='play'||e.repeat)return; const i={Digit1:0,Digit2:1,Digit3:2,Digit4:3}[e.code]; if(i!==undefined){ P2.select(i); return } if(e.code==='KeyR')P2.startReload() });
window.__lco=Object.assign(window.__lco||{},{p2:{ state:()=>({sel:P2.sel,wep:P2.cur().id,st:JSON.parse(JSON.stringify(P2.st)),reloading:P2.reload?{i:P2.reload.i,t:+P2.reload.t.toFixed(2)}:null,picks:P2.picks.length,log:JSON.parse(JSON.stringify(P2.log)),W:W.map(w=>({id:w.id,mag:w.mag,rl:w.rl}))}),
  select:i=>P2.select(i), reload:()=>P2.startReload(), hold:v=>{P2.fireHeld=!!v; P2.mouseDown=!!v}, setAmmo:(i,mag,res)=>{ const s=P2.st[i]; if(mag!=null)s.mag=mag; if(res!=null)s.res=res }, spawnPickup:(k,dx,dy)=>P2.spawnPickup(k,G.p.x+(dx||0),G.p.y+(dy||0)), botFire:v=>{P2.botFire=v;P2.botAim=v} }});
})();
