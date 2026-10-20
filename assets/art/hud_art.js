/* HUD_ART: in-game HUD art for Last Chopper Out (Quang Tri 1968, USMC). Artist Guy, 2026-10-20.
   Matches MENU_ART / SETTINGS_ART: OD canvas, stencil type, #1a1c12 outline, light from top-left, dog-tag details.
   Plain canvas 2D, no assets, no deps. Static textures baked once into cached canvases.
   API (device px of target ctx, like the game's W/H; U = UI scale, the game's UI var; default 1). Every draw* returns rects.
     HUD_ART.layout(w,h,U?,safe?)                         safe={t,l,r,b} px. → {xp,health,ammo,kills,timer,objective,toasts,dmgRing,weapons} rects (does not draw)
     HUD_ART.drawXpBar(ctx,x,y,w,h,xp,need,lvl,U?)        full-width canvas strap + brass level dog tag → {hit,fill,tag}
     HUD_ART.drawHealth(ctx,x,y,w,h,hp,max,U?,opts?)      dog tag + OD bar, red under 30 %; opts {flash:0..1} → {hit,bar,tag}
     HUD_ART.drawAmmo(ctx,x,y,w,h,mag,magMax,reserve,U?,opts?)  ammo-can plate, round pips; opts {label:'M16A1',reloading:0..1} → {hit,count}
     HUD_ART.drawKills(ctx,x,y,kills,U?)                  stenciled tally 'BODY COUNT n' → {hit}
     HUD_ART.drawTimer(ctx,cx,y,sec,U?,opts?)             Dymo-style mission clock; opts {warn:bool} → {hit}
     HUD_ART.drawObjective(ctx,cx,y,maxW,text,U?,opts?)   manila order slip; opts {col,arrowAngle(rad, null=no arrow),sub,
                                                            smokeColor:'green'|..., showSmokeColor:bool, smokeRevealT:s, now:s} → {hit,arrow}
                                                          smoke colour is HIDDEN by default: with smokeColor and no sub, the line reads "SMOKE ON DOC'S BELT";
                                                          showSmokeColor=true shows "GREEN SMOKE ON DOC'S BELT"; or set smokeRevealT=now to reveal it for ~3 s (holds 2.4 s, fades 0.8 s)
     HUD_ART.drawDamageDir(ctx,w,h,hits,U?)               hits=[{a:rad (screen angle from player to source), k:1..0 life}] → arcs at ring
     HUD_ART.drawToasts(ctx,x,y,toasts,U?)                toasts=[{text?,kind:'med'|'ammo'|'xp'|'weapon'|'intel',t:age s,dur:s,variant?,amount?}] stacked down, right-aligned at x → [{hit}]
                                                          ammo with no text: '+20 RDS' (one magazine; amount overrides), variant:'bandoleer' → '+140 RDS BANDOLEER'
     drawHud state smoke fields: smokeColor, showSmokeColor, smokeRevealT (same clock as drawHud's t)
     HUD_ART.drawHud(ctx,w,h,s,t,U?,safe?)                convenience: draws everything from a state object (see hud_mock.html) → layout
     HUD_ART.clearCache()
   Never throws: public calls are wrapped. */
(function(){
'use strict';
var FONT='Impact,Haettenschweiler,"Oswald","Arial Narrow Bold","Arial Black",sans-serif';
var MONO='"Courier New",Courier,monospace';
var OUT='#1a1c12', OD='#4b5320', OD_D='#2f3517', OD_L='#6b7340', CREAM='#f2ead0', BRASS='#c9a13a', RED='#c4261c', AMBER='#ffcf5a', GREEN='#8fd16a';
function mk(w,h){ w=Math.max(1,Math.ceil(w)); h=Math.max(1,Math.ceil(h)); var c;
  if(typeof document!=='undefined'&&document.createElement){ c=document.createElement('canvas'); c.width=w; c.height=h } else if(typeof OffscreenCanvas!=='undefined') c=new OffscreenCanvas(w,h); else c=MK(w,h); return c }
var MK=null; // node-canvas hook: HUD_ART._setMaker(fn)
function rng(s){ s=(s>>>0)||1; return function(){ s^=s<<13; s>>>=0; s^=s>>17; s^=s<<5; s>>>=0; return s/4294967296 } }
function clamp(v,a,b){ return v<a?a:v>b?b:v }
function R(x,y,w,h){ return {x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h)} }
var C={};
function cached(key,w,h,fn){ var c=C[key]; if(c)return c; c=mk(w,h); try{ fn(c.getContext('2d'),c.width,c.height) }catch(e){} C[key]=c; return c }
function rr(x,X,Y,w,h,r){ x.beginPath(); x.moveTo(X+r,Y); x.lineTo(X+w-r,Y); x.quadraticCurveTo(X+w,Y,X+w,Y+r); x.lineTo(X+w,Y+h-r); x.quadraticCurveTo(X+w,Y+h,X+w-r,Y+h); x.lineTo(X+r,Y+h); x.quadraticCurveTo(X,Y+h,X,Y+h-r); x.lineTo(X,Y+r); x.quadraticCurveTo(X,Y,X+r,Y); x.closePath() }

/* canvas weave texture tile */
function weave(base){ return cached('weave'+base,128,128,function(x,w,h){ x.fillStyle=base; x.fillRect(0,0,w,h); var r=rng(11);
  for(var y=0;y<h;y+=2){ x.fillStyle='rgba(255,255,230,'+(.03+r()*.04)+')'; x.fillRect(0,y,w,1) }
  for(var i=0;i<w;i+=2){ x.fillStyle='rgba(0,0,0,'+(.04+r()*.05)+')'; x.fillRect(i,0,1,h) }
  for(var k=0;k<40;k++){ x.fillStyle='rgba(30,22,10,'+(r()*.12)+')'; x.beginPath(); x.arc(r()*w,r()*h,2+r()*9,0,6.283); x.fill() } }) }
function pat(ctx,base){ try{ return ctx.createPattern(weave(base),'repeat') }catch(e){ return base } }
/* canvas plate: OD webbing with stitched edge */
function plate(ctx,x,y,w,h,U,base,alpha){ ctx.save(); ctx.globalAlpha=alpha==null?.94:alpha;
  ctx.fillStyle='rgba(0,0,0,.45)'; rr(ctx,x+2*U,y+3*U,w,h,3*U); ctx.fill();
  ctx.fillStyle=OUT; rr(ctx,x-1.5*U,y-1.5*U,w+3*U,h+3*U,4*U); ctx.fill();
  ctx.fillStyle=pat(ctx,base||OD_D); rr(ctx,x,y,w,h,3*U); ctx.fill();
  var g=ctx.createLinearGradient(x,y,x,y+h); g.addColorStop(0,'rgba(255,255,220,.14)'); g.addColorStop(.5,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.28)'); ctx.fillStyle=g; rr(ctx,x,y,w,h,3*U); ctx.fill();
  ctx.globalAlpha=1; ctx.setLineDash([3*U,2.5*U]); ctx.strokeStyle='rgba(210,200,150,.38)'; ctx.lineWidth=Math.max(1,U); rr(ctx,x+3*U,y+3*U,w-6*U,h-6*U,2*U); ctx.stroke(); ctx.setLineDash([]); ctx.restore() }
function stencil(ctx,text,x,y,fs,col,align,base){ ctx.save(); ctx.font=fs+'px '+FONT; ctx.textAlign=align||'left'; ctx.textBaseline=base||'alphabetic';
  ctx.lineJoin='round'; ctx.lineWidth=Math.max(2,fs*.18); ctx.strokeStyle='rgba(8,9,5,.92)'; ctx.strokeText(text,x,y); ctx.fillStyle=col; ctx.fillText(text,x,y);
  /* stencil bridges: thin vertical breaks */
  ctx.globalCompositeOperation='source-atop'; ctx.restore() }
function mono(ctx,text,x,y,fs,col,align){ ctx.save(); ctx.font='bold '+fs+'px '+MONO; ctx.textAlign=align||'left'; ctx.lineJoin='round'; ctx.lineWidth=Math.max(2,fs*.22); ctx.strokeStyle='rgba(0,0,0,.85)'; ctx.strokeText(text,x,y); ctx.fillStyle=col; ctx.fillText(text,x,y); ctx.restore() }
/* steel dog tag (M1967 rounded rect with notch) */
function dogtag(ctx,x,y,w,h,U,metal,lines,big){ ctx.save(); var r=h*.32;
  ctx.fillStyle='rgba(0,0,0,.5)'; rr(ctx,x+2*U,y+2*U,w,h,r); ctx.fill();
  var g=ctx.createLinearGradient(x,y,x+w*.6,y+h); if(metal==='brass'){ g.addColorStop(0,'#f2d58a'); g.addColorStop(.45,'#c9a13a'); g.addColorStop(1,'#7a5c1c') } else { g.addColorStop(0,'#e9ece8'); g.addColorStop(.45,'#a9aeaa'); g.addColorStop(1,'#5f6460') }
  ctx.fillStyle=g; rr(ctx,x,y,w,h,r); ctx.fill(); ctx.strokeStyle=OUT; ctx.lineWidth=1.5*U; ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=U; rr(ctx,x+2*U,y+2*U,w-4*U,h-4*U,r*.8); ctx.stroke();
  // chain hole + notch
  ctx.fillStyle=OUT; ctx.beginPath(); ctx.arc(x+h*.28,y+h/2,Math.max(1.6*U,h*.09),0,6.283); ctx.fill();
  ctx.fillStyle='rgba(20,20,16,.6)'; ctx.beginPath(); ctx.arc(x+w-1,y+h*.5,h*.1,0,6.283); ctx.fill();
  // embossed text
  ctx.textAlign='left'; ctx.textBaseline='middle'; var n=lines.length, tx=x+h*.5;
  for(var i=0;i<n;i++){ var fs=(i===0&&big)?big:Math.max(7,h*(n>1?.26:.5)); ctx.font='bold '+fs+'px '+MONO; var ty=y+h*(n===1?.53:(.3+.42*i/(n-1)));
    ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillText(lines[i],tx+.8,ty+.8); ctx.fillStyle='#1c1d18'; ctx.fillText(lines[i],tx,ty) }
  ctx.restore() }
function chain(ctx,x0,y0,x1,y1,U){ ctx.save(); var d=Math.hypot(x1-x0,y1-y0), n=Math.max(2,Math.floor(d/(3.2*U))); for(var i=0;i<=n;i++){ var k=i/n, x=x0+(x1-x0)*k, y=y0+(y1-y0)*k+Math.sin(k*Math.PI)*3*U;
  ctx.fillStyle=i%2?'#8a8f88':'#c9ccc6'; ctx.beginPath(); ctx.arc(x,y,1.3*U,0,6.283); ctx.fill() } ctx.restore() }
/* segmented bar: dark well, fill, cross-hatch tape segments */
function bar(ctx,x,y,w,h,k,col,U,segs){ ctx.save(); ctx.fillStyle='#0e100a'; ctx.fillRect(x,y,w,h); ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fillRect(x,y+h-1,w,1);
  var fw=w*clamp(k,0,1); if(fw>0){ var g=ctx.createLinearGradient(x,y,x,y+h); g.addColorStop(0,lighten(col)); g.addColorStop(.45,col); g.addColorStop(1,darken(col)); ctx.fillStyle=g; ctx.fillRect(x,y,fw,h);
    ctx.fillStyle='rgba(255,255,240,.22)'; ctx.fillRect(x,y,fw,Math.max(1,h*.22)) }
  if(segs){ ctx.fillStyle='rgba(0,0,0,.55)'; for(var i=1;i<segs;i++)ctx.fillRect(Math.round(x+w*i/segs),y,Math.max(1,U),h) }
  ctx.strokeStyle=OUT; ctx.lineWidth=Math.max(1.5,1.5*U); ctx.strokeRect(x,y,w,h); ctx.restore() }
function hx(c){ c=c.replace('#',''); return [parseInt(c.substr(0,2),16),parseInt(c.substr(2,2),16),parseInt(c.substr(4,2),16)] }
function lighten(c){ var a=hx(c); return 'rgb('+a.map(function(v){return Math.min(255,Math.round(v+(255-v)*.35))}).join(',')+')' }
function darken(c){ var a=hx(c); return 'rgb('+a.map(function(v){return Math.round(v*.55)}).join(',')+')' }
function fmt(s){ s=Math.max(0,Math.floor(s)); var m=Math.floor(s/60), r=s%60; return (m<10?'0':'')+m+':'+(r<10?'0':'')+r }

/* ---------- layout ---------- */
function layout(w,h,U,safe){ U=U||1; safe=safe||{}; var t=safe.t||0,l=safe.l||0,r=safe.r||0,b=safe.b||0;
  var xpH=22*U, hw=Math.min(250*U,w*.36);
  return { xp:R(0,t,w,xpH), health:R(12*U+l,t+xpH+10*U,hw,40*U), kills:R(12*U+l,t+xpH+56*U,hw*.7,24*U),
    ammo:R(w-r-12*U-200*U,h-b-12*U-64*U,200*U,64*U), timer:R(w/2-64*U,t+xpH+8*U,128*U,38*U),
    objective:R(w/2-Math.min(520*U,w*.62)/2,t+xpH+52*U,Math.min(520*U,w*.62),40*U),
    toasts:R(w-r-12*U-260*U,t+xpH+10*U,260*U,200*U), weapons:R(12*U+l,h-b-56*U,Math.min(w*.5,420*U),46*U),
    dmgRing:{cx:Math.round(w/2),cy:Math.round(h/2),r:Math.round(Math.min(w,h)*.36)} } }

/* ---------- XP strap ---------- */
function drawXpBar(ctx,x,y,w,h,xp,need,lvl,U){ U=U||1; var k=need>0?xp/need:0; ctx.save();
  ctx.fillStyle=pat(ctx,'#3d4422'); ctx.fillRect(x,y,w,h); ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(x,y+h-2*U,w,2*U);
  var pad=3*U, tagW=74*U, bx=x+pad, bw=w-pad*2, by=y+pad, bh=h-pad*2;
  bar(ctx,bx,by,bw,bh,k,'#d9b54a',U,20);
  // grommets
  ctx.fillStyle='#8f8a6a'; for(var i=0;i<2;i++){ var gx=i?x+w-8*U:x+8*U; ctx.beginPath(); ctx.arc(gx,y+h/2,3*U,0,6.283); ctx.fill(); ctx.fillStyle=OUT; ctx.beginPath(); ctx.arc(gx,y+h/2,1.4*U,0,6.283); ctx.fill(); ctx.fillStyle='#8f8a6a' }
  var tx=x+16*U, ty=y+1*U, th=h-2*U; dogtag(ctx,tx,ty,tagW,th,U,'brass',['LVL '+lvl],Math.round(13*U));
  mono(ctx,Math.floor(xp)+' / '+need+' XP',x+w-18*U,by+bh-4*U,Math.round(12*U),CREAM,'right');
  ctx.restore(); return {hit:R(x,y,w,h),fill:R(bx,by,bw*clamp(k,0,1),bh),tag:R(tx,ty,tagW,th)} }

/* ---------- health ---------- */
function drawHealth(ctx,x,y,w,h,hp,max,U,opts){ U=U||1; opts=opts||{}; var k=max>0?clamp(hp/max,0,1):0, low=k<.3;
  plate(ctx,x,y,w,h,U);
  var tw=h*1.25, th=h*.72, tx=x+6*U, ty=y+(h-th)/2;
  chain(ctx,tx+th*.28,ty+th/2,tx+tw+8*U,y+h/2,U);
  dogtag(ctx,tx,ty,tw,th,U,'steel',['HP'],Math.round(th*.5));
  var bx=tx+tw+10*U, bw=x+w-bx-8*U, bh=h*.5, by=y+(h-bh)/2;
  bar(ctx,bx,by,bw,bh,k,low?RED:'#5f8f2e',U,10);
  if(opts.flash){ ctx.fillStyle='rgba(255,240,220,'+(.6*opts.flash)+')'; ctx.fillRect(bx,by,bw*k,bh) }
  stencil(ctx,Math.ceil(Math.max(0,hp))+' / '+max,bx+bw/2,by+bh*.78,Math.round(bh*.8),low?'#ffd9cc':CREAM,'center');
  ctx.restore&&0; return {hit:R(x,y,w,h),bar:R(bx,by,bw,bh),tag:R(tx,ty,tw,th)} }

/* ---------- ammo ---------- */
function drawAmmo(ctx,x,y,w,h,mag,magMax,reserve,U,opts){ U=U||1; opts=opts||{}; var empty=mag<=0, low=mag<=magMax*.25;
  plate(ctx,x,y,w,h,U,'#3f4620');
  // ammo-can stencil block
  ctx.save(); ctx.fillStyle='rgba(240,230,190,.85)'; ctx.font=Math.round(9*U)+'px '+MONO; ctx.textAlign='left';
  ctx.fillText('CTG 5.56MM BALL M193',x+8*U,y+13*U); ctx.restore();
  stencil(ctx,opts.label||'M16A1',x+8*U,y+h-9*U,Math.round(17*U),'#e8dfb8','left');
  var col=empty?RED:low?AMBER:CREAM;
  ctx.save(); ctx.font=Math.round(34*U)+'px '+FONT; var cw=ctx.measureText(String(mag)).width; ctx.restore();
  stencil(ctx,String(mag),x+w-62*U,y+h-12*U,Math.round(34*U),col,'right');
  stencil(ctx,'/ '+reserve,x+w-10*U,y+h-12*U,Math.round(17*U),'#bfb690','right');
  // round pips
  var n=Math.min(magMax,30), pw=(w-16*U)/n; for(var i=0;i<n;i++){ var on=i<mag*n/magMax; ctx.fillStyle=on?'#d9b54a':'#1a1c12'; ctx.fillRect(x+8*U+i*pw,y+17*U,Math.max(1,pw-1.2*U),6*U); if(on){ ctx.fillStyle='#7a5c1c'; ctx.fillRect(x+8*U+i*pw,y+21*U,Math.max(1,pw-1.2*U),2*U) } }
  if(opts.reloading){ ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(x+4*U,y+h/2-9*U,w-8*U,18*U); bar(ctx,x+8*U,y+h/2-3*U,(w-16*U),6*U,opts.reloading,AMBER,U,0); stencil(ctx,'RELOADING',x+w/2,y+h/2-4*U,Math.round(13*U),AMBER,'center') }
  return {hit:R(x,y,w,h),count:R(x+w-62*U-cw,y+h-44*U,cw,34*U)} }

function drawKills(ctx,x,y,kills,U){ U=U||1; var t='BODY COUNT '+kills; ctx.save(); ctx.font=Math.round(16*U)+'px '+FONT; var w=ctx.measureText(t).width+44*U; ctx.restore();
  plate(ctx,x,y,w,24*U,U,'#2a2e18',.85);
  // tally strokes
  ctx.save(); ctx.strokeStyle=CREAM; ctx.lineWidth=1.6*U; for(var i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(x+8*U+i*5*U,y+6*U); ctx.lineTo(x+8*U+i*5*U,y+18*U); ctx.stroke() } ctx.beginPath(); ctx.moveTo(x+5*U,y+16*U); ctx.lineTo(x+26*U,y+8*U); ctx.stroke(); ctx.restore();
  stencil(ctx,t,x+34*U,y+18.5*U,Math.round(16*U),'#f0e6a8','left'); return {hit:R(x,y,w,24*U)} }

/* ---------- timer: Dymo tape on OD plate ---------- */
function drawTimer(ctx,cx,y,sec,U,opts){ U=U||1; opts=opts||{}; var t=fmt(sec), w=128*U, h=38*U, x=cx-w/2;
  plate(ctx,x,y,w,h,U,'#262a16');
  ctx.save(); var tp=opts.warn?'#7a1a14':'#14161a'; ctx.fillStyle=tp; rr(ctx,x+10*U,y+6*U,w-20*U,h-12*U,2*U); ctx.fill();
  ctx.font='bold '+Math.round(24*U)+'px '+MONO; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillText(t,cx+1,y+h/2+2*U); ctx.fillStyle=opts.warn?'#ffe0d0':'#f4f1e6'; ctx.fillText(t,cx,y+h/2+1*U); ctx.restore();
  return {hit:R(x,y,w,h)} }

/* ---------- objective slip ---------- */
function smokeK(o){ if(o.showSmokeColor)return 1; if(o.smokeRevealT==null||o.now==null)return 0; var d=o.now-o.smokeRevealT; return d<0?0:d<2.4?1:d<3.2?1-(d-2.4)/.8:0 }
function drawObjective(ctx,cx,y,maxW,text,U,opts){ U=U||1; opts=opts||{}; var sk=0, subC=null; if(opts.smokeColor&&!opts.sub){ opts.sub="SMOKE ON DOC'S BELT"; sk=smokeK(opts); subC=String(opts.smokeColor).toUpperCase()+" SMOKE ON DOC'S BELT"; if(sk>0)opts.sub=subC } var fs=Math.round(14*U); ctx.save(); ctx.font='bold '+fs+'px '+MONO;
  var aw=opts.arrowAngle!=null?24*U:0, tw=Math.min(maxW-30*U-aw,ctx.measureText(text).width), w=tw+aw+64*U, h=(opts.sub?44:30)*U, x=cx-w/2; ctx.restore();
  ctx.save(); ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(x+2*U,y+3*U,w,h);
  var g=ctx.createLinearGradient(x,y,x,y+h); g.addColorStop(0,'#e3d6a8'); g.addColorStop(1,'#c4b37c'); ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
  ctx.fillStyle=pat(ctx,'#d6c896'); ctx.globalAlpha=.35; ctx.fillRect(x,y,w,h); ctx.globalAlpha=1; ctx.strokeStyle=OUT; ctx.lineWidth=1.5*U; ctx.strokeRect(x,y,w,h);
  // OBJ red stamp tab
  ctx.fillStyle='#7d1a12'; ctx.fillRect(x,y,40*U,h); ctx.font=Math.round(13*U)+'px '+FONT; ctx.fillStyle='#f6e8d0'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('OBJ',x+20*U,y+h/2);
  // tape
  ctx.fillStyle='rgba(240,236,210,.55)'; ctx.save(); ctx.translate(x+w-10*U,y+2*U); ctx.rotate(.5); ctx.fillRect(-12*U,-5*U,24*U,10*U); ctx.restore();
  ctx.font='bold '+fs+'px '+MONO; ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.fillStyle=opts.col||'#1c1a10';
  var tyy=opts.sub?y+19*U:y+h/2+fs*.36; ctx.fillText(text,x+50*U,tyy,tw);
  if(opts.sub){ ctx.font='bold '+Math.round(11*U)+'px '+MONO; if(subC&&sk<1){ ctx.globalAlpha=1-sk; ctx.fillStyle='#5a4a2a'; ctx.fillText("SMOKE ON DOC'S BELT",x+50*U,y+36*U,tw); ctx.globalAlpha=sk }
    if(!subC||sk>0){ ctx.fillStyle=subC?'#7d1a12':'#5a4a2a'; ctx.fillText(subC||opts.sub,x+50*U,y+36*U,tw) } ctx.globalAlpha=1 }
  var ar=null; if(opts.arrowAngle!=null){ var ax=x+50*U+tw+14*U, ay=y+h/2; ctx.translate(ax,ay); ctx.rotate(opts.arrowAngle); ctx.fillStyle='#7d1a12'; ctx.strokeStyle=OUT; ctx.lineWidth=1.5*U;
    ctx.beginPath(); ctx.moveTo(10*U,0); ctx.lineTo(1*U,-7*U); ctx.lineTo(1*U,-2.5*U); ctx.lineTo(-8*U,-2.5*U); ctx.lineTo(-8*U,2.5*U); ctx.lineTo(1*U,2.5*U); ctx.lineTo(1*U,7*U); ctx.closePath(); ctx.fill(); ctx.stroke(); ar=R(ax-11*U,ay-11*U,22*U,22*U) }
  ctx.restore(); return {hit:R(x,y,w,h),arrow:ar} }

/* ---------- damage direction: blood-red chevron arcs at a ring around centre ---------- */
function drawDamageDir(ctx,w,h,hits,U){ U=U||1; var cx=w/2, cy=h/2, r=Math.min(w,h)*.36; ctx.save();
  (hits||[]).forEach(function(q){ var k=clamp(q.k==null?1:q.k,0,1); if(k<=0)return; var a=q.a, sp=.32;
    ctx.globalAlpha=Math.min(1,k*1.3);
    var g=ctx.createRadialGradient(cx,cy,r-26*U,cx,cy,r+22*U); g.addColorStop(0,'rgba(120,0,0,0)'); g.addColorStop(.5,'rgba(200,24,16,.95)'); g.addColorStop(1,'rgba(90,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r+22*U,a-sp,a+sp); ctx.arc(cx,cy,r-26*U,a+sp,a-sp,true); ctx.closePath(); ctx.fill();
    ctx.lineWidth=9*U; ctx.strokeStyle='rgba(10,0,0,.85)'; ctx.beginPath(); ctx.arc(cx,cy,r,a-sp*.8,a+sp*.8); ctx.stroke();
    ctx.lineWidth=5*U; ctx.strokeStyle='#ff3a24'; ctx.beginPath(); ctx.arc(cx,cy,r,a-sp*.8,a+sp*.8); ctx.stroke();
    // chevron pointing outward to the source
    ctx.save(); ctx.translate(cx+Math.cos(a)*(r+10*U),cy+Math.sin(a)*(r+10*U)); ctx.rotate(a); ctx.fillStyle='#ff4a30'; ctx.strokeStyle='#120000'; ctx.lineWidth=2*U;
    ctx.beginPath(); ctx.moveTo(18*U,0); ctx.lineTo(-6*U,-15*U); ctx.lineTo(0,0); ctx.lineTo(-6*U,15*U); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore() });
  ctx.restore(); return {cx:cx,cy:cy,r:r} }

/* ---------- pickup toasts ---------- */
var KIND={med:{c:'#c8b47a',ic:'dressing',lab:'MEDICAL'},ammo:{c:'#c9a13a',ic:'round',lab:'AMMO'},xp:{c:'#d9b54a',ic:'star',lab:'XP'},weapon:{c:'#8fd16a',ic:'rifle',lab:'WEAPON'},intel:{c:'#9fc3e8',ic:'doc',lab:'INTEL'}};
function icon(ctx,ic,x,y,s,col){ ctx.save(); ctx.translate(x,y); ctx.fillStyle=col; ctx.strokeStyle=OUT; ctx.lineWidth=1.5;
  if(ic==='dressing'){ /* OD field-dressing pack: wrapped OD pouch, tan tie tape, stencil text lines */
    ctx.fillStyle='#4b5320'; ctx.fillRect(-s*.5,-s*.36,s,s*.72); ctx.strokeRect(-s*.5,-s*.36,s,s*.72);
    ctx.fillStyle='rgba(255,255,220,.18)'; ctx.fillRect(-s*.5,-s*.36,s,s*.12);
    ctx.fillStyle='#c8b47a'; ctx.fillRect(-s*.08,-s*.36,s*.16,s*.72);
    ctx.fillStyle='#d9cfa6'; ctx.fillRect(-s*.42,-s*.12,s*.26,s*.05); ctx.fillRect(-s*.42,s*.02,s*.22,s*.05); ctx.fillRect(s*.16,-s*.12,s*.26,s*.05); ctx.fillRect(s*.16,s*.02,s*.2,s*.05) }
  else if(ic==='round'){ for(var i=-1;i<=1;i++){ ctx.fillStyle='#c9a13a'; ctx.fillRect(i*s*.3-s*.1,-s*.15,s*.2,s*.6); ctx.fillStyle='#8a6a2a'; ctx.beginPath(); ctx.moveTo(i*s*.3-s*.1,-s*.15); ctx.lineTo(i*s*.3,-s*.48); ctx.lineTo(i*s*.3+s*.1,-s*.15); ctx.fill() } }
  else if(ic==='star'){ ctx.beginPath(); for(var k=0;k<10;k++){ var rr2=k%2?s*.22:s*.5, an=-Math.PI/2+k*Math.PI/5; ctx.lineTo(Math.cos(an)*rr2,Math.sin(an)*rr2) } ctx.closePath(); ctx.fill(); ctx.stroke() }
  else if(ic==='rifle'){ /* high-contrast: pale gunmetal + tan stock, black keyline */ ctx.fillStyle='#000'; ctx.fillRect(-s*.66,-s*.16,s*1.28,s*.3); ctx.fillRect(-s*.16,0,s*.24,s*.44); ctx.fillRect(s*.12,-s*.3,s*.26,s*.2);
    ctx.fillStyle='#d8dcd4'; ctx.fillRect(-s*.32,-s*.09,s*.9,s*.16); ctx.fillRect(-s*.1,s*.04,s*.12,s*.34); ctx.fillRect(s*.16,-s*.25,s*.18,s*.14);
    ctx.fillStyle='#d9b878'; ctx.fillRect(-s*.62,-s*.11,s*.32,s*.22); ctx.fillStyle=col; ctx.fillRect(-s*.32,-s*.09,s*.9,s*.04) }
  else { ctx.fillStyle='#e3d6a8'; ctx.fillRect(-s*.38,-s*.48,s*.76,s*.96); ctx.fillStyle='#5a4a2a'; for(var j=0;j<4;j++)ctx.fillRect(-s*.26,-s*.3+j*s*.18,s*.52,s*.06); ctx.fillStyle='#7d1a12'; ctx.fillRect(-s*.38,-s*.48,s*.76,s*.14) }
  ctx.restore() }
function toastText(q){ if(q.text)return q.text; if(q.kind==='ammo'){ if(q.variant==='bandoleer')return '+'+(q.amount||140)+' RDS BANDOLEER'; return '+'+(q.amount||20)+' RDS' } return '' }
function drawToasts(ctx,x,y,toasts,U){ U=U||1; var out=[], yy=y, h=38*U; (toasts||[]).forEach(function(q0){ var q={}; for(var kk in q0)q[kk]=q0[kk]; q.text=toastText(q0); var K=KIND[q.kind]||KIND.xp, dur=q.dur||2.4, t=q.t||0;
    var a=clamp(Math.min(t/.15,(dur-t)/.35),0,1), sl=(1-clamp(t/.18,0,1))*40*U; if(a<=0)return;
    ctx.save(); ctx.font='bold '+Math.round(14*U)+'px '+MONO; var tw=ctx.measureText(q.text).width, w=tw+52*U, bx=x-w+sl; ctx.restore();
    ctx.save(); ctx.globalAlpha=a; plate(ctx,bx,yy,w,h,U,'#2c3118',1);
    ctx.fillStyle=K.c; ctx.fillRect(bx,yy,5*U,h);
    icon(ctx,K.ic,bx+22*U,yy+h/2,18*U,K.c);
    ctx.font=Math.round(11*U)+'px '+FONT; ctx.fillStyle=K.c; ctx.textAlign='left'; ctx.fillText(K.lab,bx+38*U,yy+16*U);
    mono(ctx,q.text,bx+38*U,yy+h-6*U,Math.round(14*U),CREAM,'left'); ctx.restore();
    out.push({hit:R(bx,yy,w,h)}); yy+=h+6*U }); return out }

/* ---------- convenience ---------- */
function drawHud(ctx,w,h,s,t,U,safe){ U=U||1; s=s||{}; var L=layout(w,h,U,safe);
  if(s.hits)drawDamageDir(ctx,w,h,s.hits,U);
  drawXpBar(ctx,L.xp.x,L.xp.y,L.xp.w,L.xp.h,s.xp||0,s.need||1,s.lvl||1,U);
  drawHealth(ctx,L.health.x,L.health.y,L.health.w,L.health.h,s.hp==null?100:s.hp,s.maxHp||100,U,{flash:s.hpFlash});
  drawKills(ctx,L.kills.x,L.kills.y,s.kills||0,U);
  drawTimer(ctx,w/2,L.timer.y,s.time||0,U,{warn:s.timeWarn});
  if(s.objective)drawObjective(ctx,w/2,L.objective.y,L.objective.w,s.objective,U,{arrowAngle:s.objArrow,sub:s.objSub,smokeColor:s.smokeColor,showSmokeColor:s.showSmokeColor,smokeRevealT:s.smokeRevealT,now:t});
  if(s.mag!=null)drawAmmo(ctx,L.ammo.x,L.ammo.y,L.ammo.w,L.ammo.h,s.mag,s.magMax||20,s.reserve||0,U,{label:s.weapon,reloading:s.reloading});
  if(s.toasts)drawToasts(ctx,L.toasts.x+L.toasts.w,L.toasts.y,s.toasts,U);
  return L }

function safe(fn,name){ return function(){ try{ return fn.apply(null,arguments) }catch(e){ if(typeof console!=='undefined')console.warn('HUD_ART.'+name,e); return {hit:R(0,0,0,0)} } } }
var HUD_ART={ layout:safe(layout,'layout'), drawXpBar:safe(drawXpBar,'xp'), drawHealth:safe(drawHealth,'hp'), drawAmmo:safe(drawAmmo,'ammo'), drawKills:safe(drawKills,'kills'),
  drawTimer:safe(drawTimer,'timer'), drawObjective:safe(drawObjective,'obj'), drawDamageDir:safe(drawDamageDir,'dmg'), drawToasts:safe(drawToasts,'toasts'), drawHud:safe(drawHud,'hud'),
  fmt:fmt, clearCache:function(){ C={} }, _setMaker:function(f){ MK=f } };
if(typeof window!=='undefined')window.HUD_ART=HUD_ART;
if(typeof module!=='undefined')module.exports=HUD_ART;
})();
