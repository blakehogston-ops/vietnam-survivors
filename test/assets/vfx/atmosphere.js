/* VFX_ATMO — lighting & atmosphere layer for Last Chopper Out (Quang Tri 1968).
   Artist Helper, 2026-10-20. Realistic grade, no cartoon colours. Pooled, cached, zero per-frame allocation.
   API: init(w,h) setTime(h|'dawn'|'day'|'dusk'|'night') setWeather({rain,haze}) addLight(x,y,r,color,intensity,ttl)
        addFlare(x,y,type) setFlareCadence(o) addPuddle(x,y,r) rippleAt(x,y) addDust(x,y,n) drawFlareShadows(ctx,camX,camY,zoom,units) update(dt) drawWorldOverlay(ctx,camX,camY,zoom) drawScreen(ctx) setLow(b) hookLowToggle() stats()
   Call order in render(): world … → ctx.setTransform(1,0,0,1,0,0) → drawWorldOverlay → drawScreen → HUD. */
(function(root){
'use strict';
const TAU=Math.PI*2, mk=(w,h)=>{const c=(typeof OffscreenCanvas!=='undefined')?new OffscreenCanvas(w,h):document.createElement('canvas'); c.width=w; c.height=h; return c};
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
let rs=1234567; const rnd=()=>((rs=(rs*1103515245+12345)&0x7fffffff)/0x7fffffff);
/* Time-of-day keys: mul = multiply tint, ov = overlay tint [r,g,b,a], dark = night darkness alpha, amb = darkness colour, haze, sat = desaturation alpha */
const KEYS=[
 {h:0,  mul:[112,124,166], ov:[20,30,70,.16],  dark:.62, amb:[6,10,24],  haze:.10, sat:.30},
 {h:4.5,mul:[126,136,172], ov:[20,30,70,.16],  dark:.46, amb:[8,12,26],  haze:.18, sat:.30},
 {h:6,  mul:[222,170,150],ov:[255,150,90,.14],dark:.12, amb:[30,18,24], haze:.55, sat:.18},   // dawn: rose-amber, heavy ground mist
 {h:8,  mul:[242,222,192],ov:[200,170,120,.10],dark:0,  amb:[0,0,0],    haze:.30, sat:.30},
 {h:13, mul:[240,212,182],ov:[196,172,124,.12],dark:0,  amb:[0,0,0],    haze:.22, sat:.34},   // day: dusty olive/tan, greens pulled down (no lime)
 {h:17, mul:[244,212,176],ov:[214,160,100,.11],dark:0,  amb:[0,0,0],    haze:.28, sat:.30},
 {h:18.6,mul:[232,186,160],ov:[230,120,70,.12],dark:.14,amb:[28,14,26], haze:.40, sat:.20},   // dusk: burnt orange into violet
 {h:20, mul:[132,136,176],ov:[30,36,80,.16], dark:.42, amb:[8,12,28],  haze:.20, sat:.28},
 {h:24, mul:[112,124,166], ov:[20,30,70,.16],  dark:.62, amb:[6,10,24],  haze:.10, sat:.30}];
/* monsoon target grade: low grey overcast, grey-green/brown, desaturated, darker */
const RAINK={mul:[160,160,146],ov:[105,108,100,.16],sat:.55};
const PHASE={dawn:6,day:12,dusk:18.6,night:23};
const PR={on:false,t:0,ctx:null,r:{}}; function PM(n){ if(!PR.on)return; PR.ctx.getImageData(0,0,1,1); const t=performance.now(); PR.r[n]=(PR.r[n]||0)+(t-PR.t); PR.t=t }
const S={w:0,h:0,low:false,hour:12,rain:0,haze:1,t:0,g:null,gk:'',
  L:[],nL:0, F:[],D:[],R:[],P:[],
  lm:null,lmx:null,ls:2, vig:null,grain:[],gp:[],sheen:null,mist:null,spr:{},flareSpr:null,chute:null,perf:{last:0,avg:0,n:0}};
/* atmo-1.2 (perf rc8): quality tiers. Q.ls light-map scale, Q.bloom additive light sprites, Q.lights max lights fed to the map, Q.grain film grain, Q.sat saturation/veil pass, Q.dust motes, Q.shadows max flare shadows */
const QT={high:{poolMax:160,ls:4,bloom:32,lights:160,grain:2,sat:true,dust:70,shadows:240,mistBands:3},med:{poolMax:160,ls:6,bloom:16,lights:80,grain:1,sat:true,dust:40,shadows:90,mistBands:2},low:{ls:6,bloom:10,lights:40,grain:0,sat:true,dust:20,shadows:40,mistBands:1,poolMax:160,blastGlow:true}};
let Q=QT.high, QN='high';
/* rc8 perf A (Lead-approved, AD-approved): while a strike is on screen, HIGH eases to the MED light budget. setStrikeMix(f), f 0..1 (game fades it over ~0.5 s).
   bloom/lights/shadows/dust are lerped (counts ramp, no pop); light-map scale + mist bands swap at f=.5 using a pre-built second light map (no re-init, no allocation per frame). */
const QH0=Object.assign({},QT.high); let SMIX=0;
function setStrikeMix(f){ f=f>0?(f<1?f:1):0; if(QN!=='high'){ if(SMIX){ SMIX=0; Object.assign(QT.high,QH0) } return api } if(f===SMIX)return api; SMIX=f;
  const H=QT.high, M=QT.med; for(const k of ['bloom','lights','shadows','dust'])H[k]=Math.round(QH0[k]+(M[k]-QH0[k])*f); H.mistBands=f>=.5?M.mistBands:QH0.mistBands;
  if(S.w){ const ls=Math.max(f>=.5?M.ls:QH0.ls,S.low?6:4); if(ls!==S.ls){ const C=S.lmC||(S.lmC={}); C[S.ls]={lm:S.lm,lmx:S.lmx};
    let e=C[ls]; if(!e||e.lm.width!==Math.ceil(S.w/ls)||e.lm.height!==Math.ceil(S.h/ls)){ const lm=mk(Math.ceil(S.w/ls),Math.ceil(S.h/ls)); e=C[ls]={lm,lmx:lm.getContext('2d')} }
    S.ls=ls; S.lm=e.lm; S.lmx=e.lmx } }
  return api }
const GL=[]; for(let i=0;i<12;i++)GL.push({on:false,x:0,y:0,a:0});   /* LOW blast glows (Art Director): one cached warm sprite per active blast */
function addBlastGlow(x,y,a){ if(!Q.blastGlow)return; for(const g of GL) if(!g.on){ g.on=true; g.x=x; g.y=y; g.a=a; return } }
const MAXL=160, MAXF=8, MAXD=70, MAXR=360, MAXP=140, MAXW=64, MAXU=60;
S.W=[]; S.U=[]; for(let i=0;i<MAXW;i++)S.W.push({on:false,x:0,y:0,r:0}); for(let i=0;i<MAXU;i++)S.U.push({on:false,x:0,y:0,t:0,life:0,s:0,vx:0,vy:0});
for(let i=0;i<MAXL;i++)S.L.push({x:0,y:0,r:0,c:'#fff',i:0,ttl:0,t0:0,on:false});
for(let i=0;i<MAXF;i++)S.F.push({on:false,x:0,y:0,cx:0,cy:0,vx:0,t:0,life:0,sw:0,amp:0,om:0,R:0,alt:0,trail:new Float32Array(48),tn:0,k:0,type:''});
for(let i=0;i<MAXD;i++)S.D.push({x:rnd(),y:rnd(),z:.4+rnd()*.6,ph:rnd()*TAU});
for(let i=0;i<MAXR;i++)S.R.push({x:rnd(),y:rnd(),l:.6+rnd()*.4,v:.8+rnd()*.4});
for(let i=0;i<MAXP;i++)S.P.push({x:0,y:0,t:1,on:false});

function grade(){ const H=((S.hour%24)+24)%24; let a=KEYS[0],b=KEYS[1];
  for(let i=0;i<KEYS.length-1;i++) if(H>=KEYS[i].h&&H<=KEYS[i+1].h){a=KEYS[i];b=KEYS[i+1];break}
  const t=(H-a.h)/Math.max(.001,b.h-a.h), m=a.mul.map((v,i)=>lerp(v,b.mul[i],t)), o=a.ov.map((v,i)=>lerp(v,b.ov[i],t));
  const r=S.rain; // monsoon: darker, cooler, flatter
  if(r>0){ const dk=lerp(a.dark,b.dark,t); for(let i=0;i<3;i++){ m[i]=lerp(m[i],RAINK.mul[i]*(1-dk*.5),r); o[i]=lerp(o[i],RAINK.ov[i],r*(1-dk)) } o[3]=lerp(o[3],RAINK.ov[3],r) }
  return {mul:m.map(v=>v|0),ov:o,dark:clamp(lerp(a.dark,b.dark,t)+.12*r*(lerp(a.dark,b.dark,t)>0?1:0),0,.8),amb:a.amb.map((v,i)=>lerp(v,b.amb[i],t)|0),
    haze:lerp(a.haze,b.haze,t)*S.haze*(1+.6*r),sat:lerp(lerp(a.sat,b.sat,t),RAINK.sat,r)}; }

/* single cached offscreen canvas holding the full grade (sky-to-ground falloff baked in); rebuilt only when quantised params change */
function buildGrade(){ const G=S.cur, m=G.mul, l=(m[0]*.3+m[1]*.59+m[2]*.11), k=G.sat*.3; S.mulCss=`rgb(${lerp(m[0],l,k)|0},${lerp(m[1],l,k)|0},${lerp(m[2],l,k)|0})`;
  { const v=S.rain>0?[112,112,104]:[150,136,108]; S.veilCss=`rgba(${v[0]},${v[1]},${v[2]},${(G.sat*.22).toFixed(3)})` }
  const key=(S.rain*10|0)+'|'+S.low; if(key!==S.gk){ S.gk=key; buildScreen() } }
/* screen composite (cached): vignette + wet sheen (rain) + film grain, 2 grain frames alternated with integer jitter */
function buildScreen(){ const w=S.w,h=S.h; S.scr=S.scr||[]; const n=Math.max(1,Math.min(S.low?1:2,Q.grain||1));
  for(let k=0;k<n;k++){ const c=S.scr[k]&&S.scr[k].width===w+64?S.scr[k]:(S.scr[k]=mk(w+64,h+64)), x=c.getContext('2d'); x.clearRect(0,0,c.width,c.height);
    if(!S.low&&Q.grain>0){ x.globalAlpha=.10; for(let yy=0;yy<c.height;yy+=128)for(let xx=0;xx<c.width;xx+=128)x.drawImage(S.grain[(k*2+((xx+yy)>>7))&3],xx,yy); x.globalAlpha=1 }
    if(S.rain>0){ x.fillStyle=`rgba(118,124,124,${(.10*S.rain).toFixed(3)})`; x.fillRect(0,0,c.width,c.height); x.globalAlpha=.7*S.rain; for(let yy=0;yy<c.height;yy+=256)for(let xx=0;xx<c.width;xx+=256)x.drawImage(S.sheen,xx,yy); x.globalAlpha=1 }
    x.drawImage(S.vig,32,32) } S.scr.length=n }
function init(w,h){ S.w=w|0; S.h=h|0; S.g=true; S.gk=''; S.scr=null; S.lmC=null; if(SMIX){ SMIX=0; Object.assign(QT.high,QH0) }
  S.ls=Math.max(Q.ls,S.low?6:4); S.lm=mk(Math.ceil(w/S.ls),Math.ceil(h/S.ls)); S.lmx=S.lm.getContext('2d');
  // vignette (cached, full size)
  S.vig=mk(w,h); { const x=S.vig.getContext('2d'), g=x.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.hypot(w,h)*.56);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.7,'rgba(8,10,6,.18)'); g.addColorStop(1,'rgba(4,6,3,.55)'); x.fillStyle=g; x.fillRect(0,0,w,h); }
  // film grain: 4 cached 128px tiles, matches menu archival look
  S.grain.length=0; S.gp.length=0;
  for(let k=0;k<4;k++){ const c=mk(128,128), x=c.getContext('2d'), id=x.createImageData(128,128), d=id.data;
    for(let i=0;i<d.length;i+=4){ const v=(rnd()*255)|0; d[i]=d[i+1]=d[i+2]=v<128?0:255; d[i+3]=(Math.abs(v-128)*.9)|0 } x.putImageData(id,0,0); S.grain.push(c) }
  // light sprite cache per colour, built lazily (64px radial)
  S.spr={};
  // mist band (soft, long, cached)
  S.mist=mk(512,64); { const x=S.mist.getContext('2d'); for(let i=0;i<26;i++){ const cx=rnd()*512, cy=24+rnd()*16, r=30+rnd()*50; for(const o of[0,-512,512]){ const g=x.createRadialGradient(cx+o,cy,0,cx+o,cy,r);
    g.addColorStop(0,'rgba(220,226,214,.20)'); g.addColorStop(1,'rgba(220,226,214,0)'); x.fillStyle=g; x.fillRect(0,0,512,64) } } }
  { const m2=mk(1024,128),x=m2.getContext('2d'); x.drawImage(S.mist,0,0,1024,128); S.mist2=m2 }
  // heat shimmer stripe (cached wavy bright band, scrolled)
  S.shim=mk(512,20); { const x=S.shim.getContext('2d'); x.strokeStyle='rgba(255,250,225,.10)'; for(let k=0;k<3;k++){ x.lineWidth=1+k; x.beginPath(); for(let i=0;i<=512;i+=4){ const y=10+Math.sin(i/512*TAU*6+k)*3*(1+k*.3); i?x.lineTo(i,y):x.moveTo(i,y) } x.stroke() } }
  // wet sheen (diagonal specular smears)
  S.sheen=mk(256,256); { const x=S.sheen.getContext('2d'); for(let i=0;i<22;i++){ const mud=i%3!==0; x.strokeStyle=mud?`rgba(128,64,38,${.05+rnd()*.06})`:`rgba(190,196,200,${.03+rnd()*.05})`; x.lineWidth=mud?4+rnd()*10:1+rnd()*3; x.lineCap='round'; x.beginPath(); const a=rnd()*256,b=rnd()*256; x.moveTo(a,b); x.lineTo(a+30+rnd()*70,b+6+rnd()*14); x.stroke() } }   // wet laterite: red-brown mud smears + cold grey specular
  // flare sprite + parachute (integer-scaled pixel art, scale 2)
  S.flareSpr=lightSpr('#ffffff'); S.dustSpr=(()=>{ const c=mk(32,32),x=c.getContext('2d'),g=x.createRadialGradient(16,16,0,16,16,16); g.addColorStop(0,'rgba(156,88,56,.55)'); g.addColorStop(.6,'rgba(150,92,62,.25)'); g.addColorStop(1,'rgba(150,92,62,0)'); x.fillStyle=g; x.fillRect(0,0,32,32); return c })(); S.chute=mk(14,10); { const x=S.chute.getContext('2d'); x.fillStyle='#c9c4b0'; x.beginPath(); x.arc(7,6,6,Math.PI,0); x.fill(); x.fillStyle='#8f8a78'; x.fillRect(1,6,12,1); x.strokeStyle='#777'; x.beginPath(); x.moveTo(1.5,6.5); x.lineTo(7,9.5); x.lineTo(12.5,6.5); x.stroke() }
  setTime(S.hour); return api; }

function lightSpr(col){ if(S.spr[col])return S.spr[col]; const c=mk(64,64), x=c.getContext('2d'), g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,col); g.addColorStop(.25,col); g.addColorStop(1,'rgba(0,0,0,0)'); x.globalAlpha=1; x.fillStyle=g; x.fillRect(0,0,64,64);
  // fade alpha with radius (keep colour at core)
  x.globalCompositeOperation='destination-in'; const g2=x.createRadialGradient(32,32,0,32,32,32); g2.addColorStop(0,'rgba(0,0,0,1)'); g2.addColorStop(.35,'rgba(0,0,0,.6)'); g2.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g2; x.fillRect(0,0,64,64);
  return S.spr[col]=c; }

function holeSpr(){ if(S._hole)return S._hole; const c=mk(64,64), x=c.getContext('2d'), g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(.3,'rgba(0,0,0,.92)'); g.addColorStop(.65,'rgba(0,0,0,.45)'); g.addColorStop(.9,'rgba(0,0,0,.08)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,64,64); return S._hole=c }
function setTime(v){ S.hour=typeof v==='string'?(PHASE[v]??12):+v; S.cur=grade(); if(S.g)buildGrade(); return api }
function setWeather(o){ if(o){ if(o.rain!=null)S.rain=clamp(+o.rain,0,1); if(o.haze!=null)S.haze=clamp(+o.haze,0,2) } S.cur=grade(); if(S.g)buildGrade(); return api }
const FLARE_COL='#f8f7ea';   /* harsh magnesium white, faint yellow, never orange */
const PRESET={muzzle:['#ffd27a',70,1,.06],fire:['#ff8a3a',140,.85,0],explosion:['#ffb35a',260,1,.5],napalm:['#ff7a2a',320,1,0],flare:[FLARE_COL,800,1,0],rpg:['#ffc070',110,1,.12]};
function addLight(x,y,radius,color,intensity,ttl){ if(typeof radius==='string'){ const p=PRESET[radius]||PRESET.fire; return addLight(x,y,p[1]*(color||1),p[0],p[2],intensity!=null?intensity:p[3]) }
  if(ttl>0&&color!==FLARE_COL){ for(let i=0;i<MAXL;i++){ const l=S.L[i]; if(l.on&&l.ttl>0&&l.c===(color||'#ffc070')&&Math.abs(l.x-x)<90&&Math.abs(l.y-y)<90){ l.i=Math.min(1.15,Math.max(l.i,intensity==null?1:intensity)+.1); if(ttl>l.ttl){ l.ttl=ttl; l.t0=Math.max(l.t0,ttl) } return l } } }   /* rc8 AD: nearby strike pools merge (no flat orange sheet over the base) */
  if(S.nOn>=Q.lights&&color!==FLARE_COL)return null; S.nOn=(S.nOn|0)+1;
  let L=null, oldest=null; for(let i=0;i<MAXL;i++){ const l=S.L[i]; if(!l.on){L=l;break} if(!oldest||l.ttl<oldest.ttl)oldest=l } L=L||oldest;
  L.on=true; L.x=x; L.y=y; L.r=radius||80; L.c=color||'#ffc070'; L.i=intensity==null?1:intensity; L.ttl=ttl==null?0:ttl; L.t0=L.ttl; return L; }
/* flare types: burn time (s), light radius (world px), start altitude (px, for shadow length) */
const FLARE={mortar81:{life:60,R:700,alt:260},arty155:{life:120,R:900,alt:340},mk24:{life:180,R:1200,alt:420}};
function addFlare(x,y,type){ const T=FLARE[type]||FLARE.mortar81; for(const f of S.F) if(!f.on){ f.on=true; f.type=FLARE[type]?type:'mortar81'; f.cx=x; f.cy=y-30; f.x=x; f.y=y; f.vx=6+rnd()*4; f.t=0; f.life=T.life*(.92+rnd()*.16); f.R=T.R; f.alt=T.alt;
  f.sw=rnd()*TAU; f.amp=.22+rnd()*.12; f.om=1.7+rnd()*.4; f.tn=0; f.k=0; return f } return null }
/* optional auto-cadence: a new flare over the view after each dark gap. setFlareCadence({on,type,gap:[min,max]}) */
const CAD={on:false,type:'mortar81',gap:[8,20],next:0};
function setFlareCadence(o){ Object.assign(CAD,o||{}); if(CAD.on&&!(CAD.next>0))CAD.next=CAD.gap[0]; return api }
function addPuddle(x,y,r){ for(const p of S.W) if(!p.on){ p.on=true; p.x=x; p.y=y; p.r=r||24; return p } return null }
function clearPuddles(){ for(const p of S.W)p.on=false }
function rippleAt(x,y){ for(const p of S.P) if(!p.on){ p.on=true; p.t=0; p.x=x; p.y=y; return p } return null }
function addDust(x,y,amount){ const n=Math.max(1,Math.round((amount||1))); for(let k=0;k<n;k++) for(const u of S.U) if(!u.on){ u.on=true; u.x=x+(rnd()-.5)*10; u.y=y+(rnd()-.5)*6; u.t=0; u.life=2.2+rnd()*1.6; u.s=10+rnd()*8; u.vx=8+rnd()*10; u.vy=-3-rnd()*4; break } }
function setLow(b){ b=!!b; if(b===S.low)return; S.low=b; if(S.w)init(S.w,S.h) }
function hookLowToggle(){ if(typeof document==='undefined')return; const els=document.querySelectorAll('.lowChk'); els.forEach(c=>c.addEventListener('change',()=>setLow(c.checked))); if(els[0])setLow(els[0].checked) }

function update(dt){ dt=Math.min(.1,dt||0); S.t+=dt;
  for(const l of S.L) if(l.on&&l.t0>0){ l.ttl-=dt; if(l.ttl<=0)l.on=false }
  let live=0;
  for(const f of S.F) if(f.on){ f.t+=dt; if(f.t>f.life){f.on=false;continue} live++;
    f.cx+=f.vx*dt; f.cy+=(f.type==='mk24'?7:9)*dt;                        // chute drifts downwind and sinks slowly
    const th=f.amp*Math.sin(f.t*f.om+f.sw); f.x=f.cx+Math.sin(th)*30; f.y=f.cy+Math.cos(th)*30;   // pendulum under the canopy (30 px shroud)
    f.th=th; const rem=f.life-f.t; f.k=f.t<1.2?f.t/1.2:rem<5?(rnd()<rem/5*.9?(.25+.75*rem/5)*(.5+rnd()*.5):0):(.94+.06*Math.sin(f.t*31)*Math.sin(f.t*13));   // ignite, steady magnesium burn, sputter out
    if((f.t*6|0)!==f._tk){ f._tk=f.t*6|0; const n=f.tn%24; f.trail[n*2]=f.x; f.trail[n*2+1]=f.y; f.tn++ } }
  if(CAD.on){ if(live)CAD.next=CAD.gap[0]+rnd()*(CAD.gap[1]-CAD.gap[0]); else if((CAD.next-=dt)<=0){ addFlare(SPC.x+S.w/SPC.z*(.25+rnd()*.5),SPC.y+S.h/SPC.z*(.1+rnd()*.3),CAD.type); } }
  for(const u of S.U) if(u.on){ u.t+=dt; if(u.t>u.life){u.on=false;continue} u.x+=u.vx*dt; u.y+=u.vy*dt; u.vx*=1-dt*.4 }
  if(S.rain>0){ const rate=S.rain*(S.low?20:50)*dt; for(const p of S.W) if(p.on){ let q=rate*p.r*p.r/900; while(q>0){ if(rnd()<q){ const a=rnd()*TAU, d=Math.sqrt(rnd())*p.r*.85; rippleAt(p.x+Math.cos(a)*d,p.y+Math.sin(a)*d*.55) } q-=1 } } }
  const n=(S.low?.35:1)*S.rain*MAXR|0;
  for(let i=0;i<n;i++){ const r=S.R[i]; r.y+=dt*1.9*r.v; r.x+=dt*.45*r.v; if(r.y>1){ r.y-=1; r.x=rnd(); if(rnd()<.2)splash() } if(r.x>1)r.x-=1 }
  for(const p of S.P) if(p.on){ p.t+=dt*2.2; if(p.t>=1)p.on=false }
}
let SPC={x:0,y:0,z:1}; function splash(){ for(const p of S.P) if(!p.on){ p.on=true; p.t=0; p.x=SPC.x+rnd()*S.w/SPC.z; p.y=SPC.y+rnd()*S.h/SPC.z; return } }

/* World overlay: haze/mist, dust, splashes, flares, colour grade, night light map. Expects identity transform; camX/camY = world top-left of view (game's camX/camY), zoom = game zoom. */
function drawWorldOverlay(ctx,camX,camY,zoom){ const t0=performance.now(); zoom=zoom||1; const w=S.w,h=S.h,G=S.cur,low=S.low; let nb=0; SPC.x=camX; SPC.y=camY; SPC.z=zoom;
  const sx=x=>(x-camX)*zoom, sy=y=>(y-camY)*zoom;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.imageSmoothingEnabled=true; if(PR.on){PR.ctx=ctx;ctx.getImageData(0,0,1,1);PR.t=performance.now()}
  // flares register their light every frame (moving light)
  for(const f of S.F) if(f.on&&f.k>0){ const R=f.R*(.8+.2*Math.min(1,f.k*1.3)); addLight(f.x,f.y+f.alt*.15,R,FLARE_COL,f.k,0) }
  // 1) ground haze bands (world-anchored, parallax drift)
  if(G.haze>.02){ ctx.globalAlpha=clamp(G.haze,0,1); const bands=Math.min(low?2:3,Q.mistBands), mw=1024, mh=128;
    for(let b=0;b<bands;b++){ const wy=Math.floor((camY+b*h/zoom/bands)/220)*220+60+b*37, y=sy(wy+Math.sin(S.t*.1+b)*8)|0; if(y<-mh||y>h)continue;
      const off=(((-(camX*zoom)*(.9+b*.05)+S.t*(6+b*3))%mw)+mw)%mw|0; for(let x=off-mw;x<w;x+=mw) ctx.drawImage(S.mist2,x,y) }
    ctx.globalAlpha=1 }
  PM('haze');
  // 2) heat shimmer by day (cheap: few horizontal strips self-offset)
  if(!low&&G.dark<.05&&S.rain<.3&&S.hour>9&&S.hour<16){ ctx.globalCompositeOperation='screen'; ctx.globalAlpha=.8; for(let i=0;i<3;i++){ const y=(h*.5+i*h*.16+Math.sin(S.t*.4+i)*8)|0, off=-((S.t*(9+i*4)+camX*zoom*.2)%512+512)%512|0; for(let x=off;x<w;x+=512) ctx.drawImage(S.shim,x,y) } ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over' }
  PM('shimmer');
  // 3) dust motes (dry weather), drift with slight parallax
  if(S.rain<.2){ ctx.fillStyle=G.dark>.3?'rgba(200,210,230,.35)':'rgba(240,226,180,.45)'; const n=Math.min(low?25:MAXD,Q.dust), tw=w+40, th=h+40;
    for(let i=0;i<n;i++){ const d=S.D[i], X=((d.x*tw-camX*zoom*d.z*.3+S.t*8*d.z+Math.sin(S.t*.5+d.ph)*6)%tw+tw)%tw-20, Y=((d.y*th-camY*zoom*d.z*.3+Math.sin(S.t*.37+d.ph)*10)%th+th)%th-20; ctx.fillRect(X|0,Y|0,d.z>.8?2:1,d.z>.8?2:1) } }
  PM('dust');
  // 3b) standing water (craters, paddies, trenches): dark grey-brown pools with a cold sky sheen; ripple when raining
  { let any=false; for(const p of S.W) if(p.on){any=true;break}
    if(any){ ctx.fillStyle=`rgba(46,48,44,${(.32+.2*S.rain).toFixed(3)})`; ctx.beginPath(); for(const p of S.W) if(p.on){ const X=sx(p.x),Y=sy(p.y),r=p.r*zoom; if(X+r<0||X-r>w||Y+r<0||Y-r>h)continue; ctx.moveTo(X+r,Y); ctx.ellipse(X,Y,r,r*.55,0,0,TAU) } ctx.fill();
      ctx.strokeStyle=`rgba(170,178,180,${(.10+.12*S.rain).toFixed(3)})`; ctx.lineWidth=1; ctx.beginPath(); for(const p of S.W) if(p.on){ const X=sx(p.x),Y=sy(p.y),r=p.r*zoom; ctx.moveTo(X-r*.6,Y-r*.2); ctx.ellipse(X,Y,r*.7,r*.3,0,Math.PI*1.1,Math.PI*1.7) } ctx.stroke() } }
  // 3c) red laterite dust puffs (roads, vehicles): grow, drift downwind, fade
  for(const u of S.U) if(u.on){ const k=u.t/u.life, X=sx(u.x), Y=sy(u.y), s2=(u.s*(1+k*2.5))*zoom; if(X+s2<0||X-s2>w||Y+s2<0||Y-s2>h)continue; ctx.globalAlpha=(1-k)*(k<.15?k/.15:1)*(1-S.rain*.8); ctx.drawImage(S.dustSpr,X-s2|0,Y-s2*.7|0,s2*2|0,s2*1.4|0) }
  ctx.globalAlpha=1;
  // 4) rain splash ripples (one path)
  if(S.rain>0){ ctx.strokeStyle='rgba(176,184,188,.45)'; ctx.lineWidth=1; ctx.beginPath(); for(const p of S.P) if(p.on){ const X=sx(p.x),Y=sy(p.y),r=1+p.t*5*zoom; ctx.moveTo(X+r,Y); ctx.ellipse(X,Y,r,r*.4,0,0,TAU) } ctx.stroke() }
  PM('splash');
  // 5) flare sprites, parachutes and smoke trails
  for(const f of S.F) if(f.on){ const X=sx(f.x),Y=sy(f.y), CX=sx(f.cx),CY=sy(f.cy);
    // thin smoke trail hanging above the flare (older points higher and fanning downwind)
    const m=Math.min(f.tn,24); if(m>1){ ctx.strokeStyle='rgba(205,205,198,.30)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(X,Y); for(let j=0;j<m;j++){ const n=(f.tn-1-j)%24; ctx.lineTo(sx(f.trail[n*2])+j*.6*zoom,sy(f.trail[n*2+1])) } ctx.stroke() }
    // canopy tilts with the swing, shrouds to the flare
    ctx.save(); ctx.translate(CX,CY); ctx.rotate(-f.th*.4); ctx.drawImage(S.chute,-14,-14,28,20); ctx.restore();
    ctx.strokeStyle='rgba(150,150,140,.8)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(CX-11,CY); ctx.lineTo(X,Y); ctx.moveTo(CX+11,CY); ctx.lineTo(X,Y); ctx.stroke();
    if(f.k>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=f.k; ctx.drawImage(S.flareSpr,X-20,Y-20,40,40); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; ctx.fillStyle='#fffff6'; ctx.fillRect(X-2|0,Y-2|0,4,4) }
    else { ctx.fillStyle='#3a3530'; ctx.fillRect(X-1|0,Y-1|0,3,3) } }
  PM('flares');
  // 6) colour grade: multiply (cached canvas) + overlay tint + slight desaturation
  ctx.globalCompositeOperation='multiply'; ctx.fillStyle=S.mulCss; ctx.fillRect(0,0,w,h);
  if(Q.sat&&S.hq&&!low&&G.sat>.05){ ctx.globalCompositeOperation='saturation'; ctx.globalAlpha=clamp(G.sat,0,1)*.55; ctx.fillStyle='#7f7f7f'; ctx.fillRect(0,0,w,h); ctx.globalAlpha=1 }
  if(Q.sat&&!S.hq&&G.sat>.05){ ctx.globalCompositeOperation='source-over'; ctx.fillStyle=S.veilCss; ctx.fillRect(0,0,w,h) }
  ctx.globalCompositeOperation='overlay'; const o=G.ov; ctx.fillStyle=`rgba(${o[0]|0},${o[1]|0},${o[2]|0},${o[3].toFixed(3)})`; ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation='source-over';
  PM('overlay');
  // 7) night light map: darkness with light holes (half/quarter res), then additive colour bloom
  const ls=S.ls, lx=S.lmx, lw=S.lm.width, lh=S.lm.height;
  if(G.dark>.01){ lx.globalCompositeOperation='source-over'; lx.clearRect(0,0,lw,lh); const a=G.amb; lx.fillStyle=`rgba(${a[0]},${a[1]},${a[2]},${G.dark.toFixed(3)})`; lx.fillRect(0,0,lw,lh);
    lx.globalCompositeOperation='destination-out'; const blk=holeSpr();
    for(const l of S.L) if(l.on){ const k=l.t0>0?l.ttl/l.t0:1; if(l.i*k<.02)continue; const R=Math.min(l.r,l.c===FLARE_COL?1e9:Q.poolMax)*zoom/ls*2; const X=sx(l.x)/ls, Y=sy(l.y)/ls; if(X+R<0||Y+R<0||X-R>lw||Y-R>lh)continue; lx.globalAlpha=clamp(l.i*k,0,1); lx.drawImage(blk,X-R/2,Y-R/2,R,R) }
    lx.globalAlpha=1; lx.globalCompositeOperation='source-over'; ctx.drawImage(S.lm,0,0,w,h) }
  PM('lightmap');
  // additive warm bloom of every light (day: subtle, night: strong)
  ctx.globalCompositeOperation='lighter'; const bk=.18+G.dark*.55;
  for(const l of S.L) if(l.on){ const k=l.t0>0?l.ttl/l.t0:1, fl=l.c===FLARE_COL; if(l.i*k*bk<.01)continue; const R=(fl?l.r*1.3:Math.min(l.r,240,Q.poolMax)*.9)*zoom, X=sx(l.x), Y=sy(l.y); if(X+R<0||Y+R<0||X-R>w||Y-R>h)continue; if(++nb>Math.min(low?12:32,Q.bloom))break; ctx.globalAlpha=clamp(l.i*k*bk*(fl?.55:1),0,1); ctx.drawImage(lightSpr(l.c),X-R/2,Y-R/2,R,R) }
  if(Q.blastGlow){ const sp=lightSpr(PRESET.explosion[0]), D=320*zoom; for(const g of GL) if(g.on){ g.on=false; const X=sx(g.x),Y=sy(g.y); if(X+D<0||Y+D<0||X-D>w||Y-D>h)continue; ctx.globalAlpha=clamp(g.a,0,1); ctx.drawImage(sp,X-D/2,Y-D/2,D,D) } }   /* 160 px radius, HIGH explosion palette, re-registered per frame */
  ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
  PM('bloom');
  // persistent (ttl 0) lights must be re-registered each frame by the game; clear them now
  let on=0; for(const l of S.L){ if(l.on&&l.t0===0)l.on=false; else if(l.on)on++ } S.nOn=on;
  ctx.restore(); S._w=performance.now()-t0; }

/* Screen pass: rain streaks, wet sheen, vignette, grain. Draw after drawWorldOverlay, before HUD. */
function drawScreen(ctx){ const t0=performance.now(), w=S.w,h=S.h,low=S.low; ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  if(S.rain>0){ const n=(low?.35:1)*S.rain*MAXR|0; ctx.strokeStyle=`rgba(168,176,182,${(.16+.22*S.rain).toFixed(3)})`; ctx.lineWidth=1; ctx.beginPath();
    for(let i=0;i<n;i++){ const r=S.R[i], X=r.x*w|0, Y=r.y*h|0, L=(10+14*r.l)*S.rain+6; ctx.moveTo(X,Y); ctx.lineTo(X-L*.24,Y-L) } ctx.stroke();
  }
  PM('rain');
  { const k=(S.t*12|0)%S.scr.length, j=((S.t*24|0)*37)%32; ctx.drawImage(S.scr[k],-32+(low?0:j-16)+16,-32+(low?0:((j*7)%32)-16)+16) }
  PM('grain');
  ctx.restore(); const ms=S._w+(performance.now()-t0); S.perf.last=ms; S.perf.avg=S.perf.avg*.95+ms*.05; S.perf.n++; }

/* Flare shadows. flareShadow(x,y) -> {dx,dy,len,ang,a} from the strongest/nearest burning flare, or null.
   drawFlareShadows(ctx,camX,camY,zoom,units): units = [{x,y,h?,w?}] (world feet position, sprite height/width px).
   Draw it right after the world sprites and BEFORE drawWorldOverlay. One fill per flare; elongated ellipses that swing with the pendulum. */
function flareShadow(x,y){ let best=null,bv=0; for(const f of S.F) if(f.on&&f.k>0){ const gx=f.x, gy=f.y+f.alt*.15, d2=(gx-x)**2+(gy-y)**2; if(d2>f.R*f.R)continue; const v=f.k*(1-Math.sqrt(d2)/f.R); if(v>bv){bv=v;best=f} } if(!best)return null;
  const f=best, gx=f.x, gy=f.y+f.alt*.15, dx=x-gx, dy=y-gy, d=Math.hypot(dx,dy)||1, alt=Math.max(60,f.alt*(1-f.t/f.life*.7));
  const len=Math.min(2.2,d/alt*1.6+.6); return {dx:dx/d, dy:dy/d, len, ang:Math.atan2(dy,dx), a:clamp(.18+bv*.5,0,.42)} }   /* rc7.1 (Junior Play Tester, 7:55 night): was up to 9x unit height = long dark streaks over units; capped at 2.2x, lighter */
/* atmo-1.2 STREAK FIX (night 'dark streaks' ~7:55). Root cause: each unit's flare shadow was a hard ellipse only ~2.4 px wide
   ((u.w||8)*.5*.6) but up to 2.2x unit height long, drawn one fill per unit at alpha up to .42 in near-black. Crowds of 70-240 units under a
   swinging flare gave dozens of hairline black rays that stacked where units overlap (alpha accumulates per fill) and crawled with the pendulum.
   Fix (rebased on Art Director-approved rc7.1 cap: length <=2.2x, alpha .18-.42, unchanged): shadow width follows the body (>= 45% of sprite width, min 3 px) and ALL shadows of
   a frame go into ONE path filled once (overlaps no longer darken), so a crowd reads as one soft pool, never as streaks. Also cheaper: 1 fill/frame. */
function drawFlareShadows(ctx,camX,camY,zoom,units){ if(!units||!units.length)return; zoom=zoom||1; let any=false; for(const f of S.F) if(f.on&&f.k>0){any=true;break} if(!any)return;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); const max=Math.min(S.low?60:240,Q.shadows), w=S.w,h=S.h; let a=0,n=0; ctx.beginPath();
  for(let i=0;i<units.length&&n<max;i++){ const u=units[i], X=(u.x-camX)*zoom, Y=(u.y-camY)*zoom; if(X<-120||Y<-120||X>w+120||Y>h+120)continue; const s=flareShadow(u.x,u.y); if(!s)continue;
    const len=s.len, H=(u.h||16)*zoom, L=H*len, W=Math.max(3,(u.w||10)*zoom*.45), ang=Math.atan2(s.dy*.6,s.dx), cx=X+s.dx*L*.45, cy=Y+s.dy*L*.45*.6;
    ctx.moveTo(cx+Math.cos(ang)*(L*.5+W*.3),cy+Math.sin(ang)*(L*.5+W*.3)); ctx.ellipse(cx,cy,L*.5+W*.3,W*.5,ang,0,TAU); a+=s.a; n++ }
  if(n){ ctx.globalAlpha=clamp(a/n,.18,.42); ctx.fillStyle='#07090c'; ctx.fill() }
  ctx.restore() }
function setQuality(t){ t=QT[t]?t:'high'; if(t===QN)return api; QN=t; Q=QT[t]; if(S.w){ const w=S.w,h=S.h; init(w,h) } return api }
const api={addBlastGlow,setQuality,setStrikeMix,get strikeMix(){return SMIX},get quality(){return QN},QT,init,setTime,setWeather,addLight,addFlare,setFlareCadence,addPuddle,clearPuddles,rippleAt,addDust,update,drawWorldOverlay,drawScreen,drawFlareShadows,setLow,hookLowToggle,flareShadow,FLARE,
  stats:()=>({lights:S.L.filter(l=>l.on).length,flares:S.F.filter(f=>f.on).length,rain:S.rain,low:S.low,hour:S.hour,ms:S.perf.last,avgMs:S.perf.avg}),
  _F:()=>S.F, setHQ:(b)=>{S.hq=!!b; return api},
  profile:(on)=>{PR.on=!!on; const r=PR.r; PR.r={}; return r},
  get low(){return S.low}, PRESET, version:'atmo-1.2'};
root.VFX_ATMO=api;
})(typeof window!=='undefined'?window:globalThis);
