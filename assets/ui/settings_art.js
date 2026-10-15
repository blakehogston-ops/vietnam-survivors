/* SETTINGS_ART: period settings controls for Last Chopper Out (Quang Tri 1968). Artist Helper, 2026-10-15.
   Matches MENU_ART (OD panels, stencil type, #1a1c12 outline, light from top-left). Plain canvas 2D, no deps.
   Hardware look: guarded metal bat-handle switches, PRC-25 knurled dials, radio-bay panels, ammo-crate buttons.
   API (CSS px of target ctx; wrap with ctx transform for DPR). Every draw* returns hit rects (min 44×44):
     SETTINGS_ART.drawToggle(ctx,x,y,w,h,on,state,label)
       state: 'normal'|'hover'|'pressed'|'focus'|'disabled'
       → {hit, switch, label, lamp, on}
     SETTINGS_ART.drawSlider(ctx,x,y,w,h,value,state,label,opts?)
       value 0..1; opts: {showValue:true, min:0, max:100, unit:'', ticks:11}
       → {hit, track, knob, label, value, valueAt(px):0..1}
     SETTINGS_ART.drawSettingsPanel(ctx,x,y,w,h,title?)
       → {hit, content:{x,y,w,h}, title}
     SETTINGS_ART.drawButton(ctx,x,y,w,h,label,state)
       ammo-crate (delegates to MENU_ART.drawButton when loaded)
       → {hit}
     SETTINGS_ART.drawIconButton(ctx,x,y,size,icon,state,on?)
       icon: 'mute'|'unmute'|'pause'|'fullscreen'  (on=true for mute/fullscreen active)
       → {hit}
     SETTINGS_ART.layoutSettings(x,y,w, rows)
       rows: [{kind:'toggle',id,label,on},{kind:'slider',id,label,value},…]
       → per-row draw rects sized for ≥44 px hits (does not draw)
     SETTINGS_ART.MIN_HIT (=44), clearCache(), prewarm()
   Never throws: public calls are wrapped with flat fallbacks. */
(function(){
'use strict';
var FONT='Impact,Haettenschweiler,"Oswald","Arial Narrow Bold","Arial Black",sans-serif';
var MONO='"Courier New",Courier,monospace';
var OUT='#1a1c12';
var MIN_HIT=44;
var C={};
function mk(w,h){ w=Math.max(1,Math.ceil(w)); h=Math.max(1,Math.ceil(h)); var c;
  if(typeof document!=='undefined'){ c=document.createElement('canvas'); c.width=w; c.height=h } else c=new OffscreenCanvas(w,h); return c }
function rng(s){ s=(s>>>0)||1; return function(){ s^=s<<13; s>>>=0; s^=s>>17; s^=s<<5; s>>>=0; return s/4294967296 } }
function lerp(a,b,k){ return a+(b-a)*k }
function clamp(v,a,b){ return v<a?a:v>b?b:v }
function cached(key,w,h,fn){ var c=C[key]; if(c)return c; c=mk(w,h); try{ fn(c.getContext('2d'),c.width,c.height) }catch(e){ if(typeof console!=='undefined')console.warn('SETTINGS_ART bake',key,e) } C[key]=c; return c }
function rect(x,y,w,h){ return {x:x,y:y,w:w,h:h} }
function expandHit(r){ var w=Math.max(MIN_HIT,r.w), h=Math.max(MIN_HIT,r.h);
  return rect(Math.round(r.x-(w-r.w)/2), Math.round(r.y-(h-r.h)/2), w, h) }

/* ---------- shared metal / OD fills ---------- */
function metalGrad(x,x0,y0,x1,y1,lit){ var g=x.createLinearGradient(x0,y0,x1,y1);
  g.addColorStop(0, lit?'#9a9c90':'#6a6c60'); g.addColorStop(.45,'#54564c'); g.addColorStop(1,'#2e302a'); return g }
function odGrad(x,x0,y0,x1,y1){ var g=x.createLinearGradient(x0,y0,x1,y1);
  g.addColorStop(0,'#3e4a2a'); g.addColorStop(1,'#1e2414'); return g }
function rivet(x,px,py,r){ x.fillStyle='#8a8c80'; x.beginPath(); x.arc(px,py,r,0,6.283); x.fill();
  x.fillStyle='rgba(255,255,230,.35)'; x.beginPath(); x.arc(px-r*.3,py-r*.3,r*.35,0,6.283); x.fill();
  x.strokeStyle=OUT; x.lineWidth=1; x.beginPath(); x.arc(px,py,r,0,6.283); x.stroke() }
function focusRing(ctx,x,y,w,h){ ctx.save(); ctx.strokeStyle='#ffd54a'; ctx.lineWidth=2; ctx.setLineDash([5,3]);
  ctx.strokeRect(x-3.5,y-3.5,w+7,h+7); ctx.setLineDash([]); ctx.restore() }
function stencilText(ctx,text,cx,cy,fs,col){ ctx.save(); ctx.font='bold '+fs+'px '+FONT; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillText(text,cx+1,cy+1); ctx.fillStyle=col||'#ebe0b0'; ctx.fillText(text,cx,cy); ctx.restore() }

/* ---------- settings panel: OD radio bay ---------- */
function bakePanel(w,h,title){ return cached('pnl'+w+'x'+h+'/'+title,w,h,function(x){
  var R=rng(w*5+h*3);
  x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(5,6,w-5,h-6);
  // outer aluminium frame
  x.fillStyle=metalGrad(x,0,0,w*.3,h*.2,1); x.fillRect(0,0,w-4,h-5);
  for(var i=0;i<40;i++){ x.fillStyle=R()<.5?'rgba(0,0,0,.08)':'rgba(255,255,220,.05)'; x.fillRect(R()*(w-4),R()*(h-5),2,2) }
  var fw=Math.max(10,Math.round(Math.min(w,h)*.04));
  // OD faceplate
  var ix=fw, iy=fw, iw=w-4-fw*2, ih=h-5-fw*2;
  x.fillStyle=odGrad(x,ix,iy,ix+iw,iy+ih); x.fillRect(ix,iy,iw,ih);
  // silk-screen wear + horizontal panel lines
  x.strokeStyle='rgba(0,0,0,.25)'; x.lineWidth=1;
  for(var yy=iy+8;yy<iy+ih-4;yy+=Math.max(10,ih/8)){ x.beginPath(); x.moveTo(ix+6,yy); x.lineTo(ix+iw-6,yy); x.stroke() }
  x.globalAlpha=.1; for(var n=0;n<iw*ih/50;n++){ x.fillStyle=R()<.5?'#000':'#fff'; x.fillRect(ix+R()*iw,iy+R()*ih,1,1) } x.globalAlpha=1;
  // corner rivets
  var rr=Math.max(2,fw*.22); [[fw*.55,fw*.55],[w-4-fw*.55,fw*.55],[fw*.55,h-5-fw*.55],[w-4-fw*.55,h-5-fw*.55]].forEach(function(p){ rivet(x,p[0],p[1],rr) });
  x.strokeStyle=OUT; x.lineWidth=2; x.strokeRect(1,1,w-6,h-7);
  x.strokeStyle='rgba(255,240,200,.18)'; x.lineWidth=1; x.beginPath(); x.moveTo(3,h-8); x.lineTo(3,3); x.lineTo(w-8,3); x.stroke();
  if(title){ var tfs=Math.max(11,Math.min(22,Math.round(w/(title.length*.75+8))));
    x.font='bold '+tfs+'px '+FONT; var tw=x.measureText(title.toUpperCase()).width+tfs*1.4, th=tfs*1.45, tx=(w-4-tw)/2;
    x.fillStyle='#c9bd8a'; x.fillRect(tx,fw*.4,tw,th); x.fillStyle='rgba(0,0,0,.3)'; x.fillRect(tx,fw*.4+th-2,tw,2);
    x.strokeStyle=OUT; x.lineWidth=1.5; x.strokeRect(tx+.5,fw*.4+.5,tw-1,th-1);
    x.fillStyle='#2a2418'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(title.toUpperCase(),(w-4)/2,fw*.4+th/2+1) }
}) }
function drawSettingsPanel(ctx,x,y,w,h,title){
  w=Math.max(120,Math.round(w)); h=Math.max(80,Math.round(h)); x=Math.round(x); y=Math.round(y);
  ctx.drawImage(bakePanel(w,h,title?String(title):''),x,y);
  var fw=Math.max(10,Math.round(Math.min(w,h)*.04));
  var tfs=title?Math.max(11,Math.min(22,Math.round(w/(String(title).length*.75+8)))):0;
  var top=fw+(title?Math.round(tfs*1.45+fw*.5):0)+6;
  return {hit:rect(x,y,w,h), content:rect(x+fw+8,y+top,Math.max(0,w-4-fw*2-16),Math.max(0,h-5-fw-top-8)), title:title||null};
}

/* ---------- bat-handle toggle with guard ---------- */
function bakeToggle(sw,sh,on,state){
  return cached('tog'+sw+'x'+sh+'/'+(on?1:0)+'/'+state,sw,sh,function(x){
    var hov=state==='hover', press=state==='pressed', dis=state==='disabled', foc=state==='focus';
    var R=rng(sw*11+sh*7+(on?3:0));
    // housing plate
    x.fillStyle=metalGrad(x,0,0,sw,sh,hov&&!dis); x.fillRect(0,0,sw,sh);
    x.fillStyle='rgba(0,0,0,.25)'; x.fillRect(2,sh-3,sw-4,2);
    for(var i=0;i<30;i++){ x.fillStyle=R()<.5?'rgba(0,0,0,.1)':'rgba(255,255,220,.06)'; x.fillRect(R()*sw,R()*sh,1,1) }
    x.strokeStyle=OUT; x.lineWidth=2; x.strokeRect(1,1,sw-2,sh-2);
    if(hov&&!dis){ x.strokeStyle='rgba(255,213,74,.7)'; x.lineWidth=2; x.strokeRect(2,2,sw-4,sh-4) }
    // recessed well
    var wx=sw*.18, wy=sh*.18, ww=sw*.42, wh=sh*.64;
    x.fillStyle='#1a1c14'; x.fillRect(wx,wy,ww,wh);
    x.strokeStyle='rgba(255,240,200,.12)'; x.strokeRect(wx+.5,wy+.5,ww-1,wh-1);
    // bat handle
    var cx=wx+ww/2, cy=on?(wy+wh*.28):(wy+wh*.72);
    if(press) cy+=1;
    x.save(); x.translate(cx,wy+wh/2); x.rotate(on?-0.55:0.55);
    var hw=Math.max(5,sw*.1), hl=wh*.55;
    var hg=x.createLinearGradient(-hw,-hl/2,hw,hl/2); hg.addColorStop(0,dis?'#7a7a70':'#d8d4c0'); hg.addColorStop(.5,'#9a9680'); hg.addColorStop(1,'#4a4838');
    x.fillStyle=hg; x.beginPath(); x.moveTo(-hw*.6,-hl/2); x.lineTo(hw*.6,-hl/2); x.lineTo(hw,hl/2); x.lineTo(-hw,hl/2); x.closePath(); x.fill();
    x.strokeStyle=OUT; x.lineWidth=1; x.stroke();
    // red tip (ON cue)
    x.fillStyle=on&&!dis?'#c42820':'#5a4038'; x.fillRect(-hw*.55,-hl/2,hw*1.1,hl*.22);
    x.restore();
    // pivot screw
    rivet(x,cx,wy+wh/2,Math.max(2,sw*.045));
    // hinged guard (open to the left, period aircraft style)
    x.fillStyle='rgba(60,62,54,.92)'; x.beginPath();
    x.moveTo(wx-2,wy-2); x.quadraticCurveTo(wx-sw*.22,wy+wh*.2,wx-sw*.18,wy+wh+2);
    x.lineTo(wx+4,wy+wh+2); x.lineTo(wx+4,wy-2); x.closePath(); x.fill();
    x.strokeStyle=OUT; x.lineWidth=1; x.stroke();
    rivet(x,wx+2,wy+2,Math.max(1.5,sw*.03));
    // indicator lamp
    var lx=sw*.78, ly=sh*.5, lr=Math.max(5,Math.min(sw,sh)*.14);
    x.fillStyle='#1a1a16'; x.beginPath(); x.arc(lx,ly,lr+2,0,6.283); x.fill();
    if(on&&!dis){ var lg=x.createRadialGradient(lx-lr*.3,ly-lr*.3,0,lx,ly,lr);
      lg.addColorStop(0,'#ffe08a'); lg.addColorStop(.45,'#e03828'); lg.addColorStop(1,'#5a1010'); x.fillStyle=lg }
    else { x.fillStyle='#2a2218' }
    x.beginPath(); x.arc(lx,ly,lr,0,6.283); x.fill();
    x.strokeStyle=OUT; x.lineWidth=1; x.beginPath(); x.arc(lx,ly,lr,0,6.283); x.stroke();
    if(on&&!dis){ x.fillStyle='rgba(255,220,120,.35)'; x.beginPath(); x.arc(lx-lr*.25,ly-lr*.3,lr*.35,0,6.283); x.fill() }
    // ON / OFF stencil under lamp
    var sfs=Math.max(7,Math.round(sh*.16)); x.font='bold '+sfs+'px '+MONO; x.textAlign='center'; x.textBaseline='middle';
    x.fillStyle=on&&!dis?'#ffb0a0':'#6a6a60'; x.fillText(on?'ON':'OFF',lx,ly+lr+sfs*.9);
    if(foc&&!dis){ x.strokeStyle='#ffd54a'; x.lineWidth=2; x.setLineDash([4,3]); x.strokeRect(2.5,2.5,sw-5,sh-5); x.setLineDash([]) }
    if(dis){ x.fillStyle='rgba(20,20,16,.4)'; x.fillRect(0,0,sw,sh) }
  });
}
function drawToggle(ctx,x,y,w,h,on,state,label){
  x=Math.round(x); y=Math.round(y);
  h=Math.max(MIN_HIT, Math.round(h||MIN_HIT));
  w=Math.max(160, Math.round(w||220));
  state=state||'normal'; on=!!on;
  var labelStr=label!=null?String(label).toUpperCase():'';
  var sw=Math.max(56, Math.min(88, Math.round(h*1.35)));
  var sh=Math.max(MIN_HIT-4, Math.min(h-4, Math.round(h*.9)));
  var pad=8;
  // label column
  var lfs=Math.max(12, Math.min(18, Math.round(h*.36)));
  ctx.save();
  // row plate (subtle)
  ctx.fillStyle='rgba(0,0,0,.28)'; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(90,100,70,.45)'; ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  if(labelStr){ ctx.font='bold '+lfs+'px '+FONT; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillText(labelStr,x+pad+1,y+h/2+1);
    ctx.fillStyle=state==='disabled'?'#7a7a70':'#ebe0b0'; ctx.fillText(labelStr,x+pad,y+h/2);
  }
  var lx=x+pad, lw=labelStr?(ctx.measureText(labelStr).width):0;
  var sx=Math.round(x+w-sw-pad), sy=Math.round(y+(h-sh)/2);
  ctx.drawImage(bakeToggle(sw,sh,on,state),sx,sy);
  if(state==='focus') focusRing(ctx,sx,sy,sw,sh);
  ctx.restore();
  var hit=rect(x,y,w,h);
  return {hit:hit, switch:rect(sx,sy,sw,sh), label:rect(lx,y,Math.max(lw,40),h), lamp:rect(sx+sw*.66,sy+sh*.28,sw*.28,sh*.44), on:on};
}

/* ---------- PRC-25 style volume slider ---------- */
function bakeKnob(d,state){ return cached('knob'+d+'/'+state,d,d,function(x){
  var hov=state==='hover'||state==='pressed'||state==='focus', press=state==='pressed', R=rng(d*13);
  var cx=d/2, cy=d/2+(press?1:0), r=d/2-1;
  x.fillStyle='rgba(0,0,0,.45)'; x.beginPath(); x.arc(cx+1,cy+2,r,0,6.283); x.fill();
  var g=x.createRadialGradient(cx-r*.35,cy-r*.4,0,cx,cy,r);
  g.addColorStop(0,hov?'#c4c2b0':'#a8a690'); g.addColorStop(.55,'#6a6858'); g.addColorStop(1,'#2e2c24');
  x.fillStyle=g; x.beginPath(); x.arc(cx,cy,r,0,6.283); x.fill();
  // knurl
  x.strokeStyle='rgba(20,18,12,.55)'; x.lineWidth=1;
  for(var i=0;i<16;i++){ var a=i/16*Math.PI*2; x.beginPath(); x.moveTo(cx+Math.cos(a)*r*.55,cy+Math.sin(a)*r*.55); x.lineTo(cx+Math.cos(a)*r*.95,cy+Math.sin(a)*r*.95); x.stroke() }
  // pointer mark (PRC-25 dial)
  x.strokeStyle='#1a1c12'; x.lineWidth=2; x.beginPath(); x.moveTo(cx,cy-r*.15); x.lineTo(cx,cy-r*.85); x.stroke();
  x.fillStyle='#e8c860'; x.beginPath(); x.arc(cx,cy-r*.72,Math.max(1.5,d*.06),0,6.283); x.fill();
  rivet(x,cx,cy,Math.max(2,d*.08));
  x.strokeStyle=OUT; x.lineWidth=1.5; x.beginPath(); x.arc(cx,cy,r,0,6.283); x.stroke();
  if(state==='focus'){ x.strokeStyle='#ffd54a'; x.lineWidth=2; x.setLineDash([3,2]); x.beginPath(); x.arc(cx,cy,r+2,0,6.283); x.stroke(); x.setLineDash([]) }
}) }
function drawSlider(ctx,x,y,w,h,value,state,label,opts){
  opts=opts||{}; x=Math.round(x); y=Math.round(y);
  h=Math.max(MIN_HIT, Math.round(h||MIN_HIT));
  w=Math.max(180, Math.round(w||260));
  value=clamp(+value||0,0,1); state=state||'normal';
  var dis=state==='disabled', labelStr=label!=null?String(label).toUpperCase():'';
  var showVal=opts.showValue!==false;
  var vmin=opts.min!=null?opts.min:0, vmax=opts.max!=null?opts.max:100;
  var ticks=opts.ticks!=null?opts.ticks:11;
  var pad=8, lfs=Math.max(11,Math.min(16,Math.round(h*.32)));
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.28)'; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(90,100,70,.45)'; ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  var labelW=0;
  if(labelStr){ ctx.font='bold '+lfs+'px '+FONT; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillText(labelStr,x+pad+1,y+h/2+1);
    ctx.fillStyle=dis?'#7a7a70':'#ebe0b0'; ctx.fillText(labelStr,x+pad,y+h/2);
    labelW=ctx.measureText(labelStr).width+10 }
  var valW=showVal?42:0;
  var trackX=x+pad+labelW, trackR=x+w-pad-valW, trackW=Math.max(60,trackR-trackX);
  var trackH=Math.max(8,Math.round(h*.16)), trackY=y+Math.round((h-trackH)/2);
  var kd=Math.max(28, Math.min(40, Math.round(h*.7)));
  // metal track well
  ctx.fillStyle='#141610'; ctx.fillRect(trackX,trackY,trackW,trackH);
  ctx.strokeStyle=OUT; ctx.lineWidth=1; ctx.strokeRect(trackX+.5,trackY+.5,trackW-1,trackH-1);
  // filled portion (olive → amber)
  var fillW=Math.round(trackW*value);
  if(fillW>0){ var fg=ctx.createLinearGradient(trackX,0,trackX+trackW,0);
    fg.addColorStop(0,'#4a6b2f'); fg.addColorStop(1,dis?'#6a6a40':'#c9a13a');
    ctx.fillStyle=fg; ctx.fillRect(trackX+1,trackY+1,Math.max(0,fillW-2),trackH-2) }
  // tick marks (radio dial)
  ctx.strokeStyle='rgba(232,200,96,.55)'; ctx.lineWidth=1;
  for(var t=0;t<ticks;t++){ var tx=trackX+trackW*(t/(ticks-1||1)); ctx.beginPath();
    ctx.moveTo(tx,trackY-4); ctx.lineTo(tx,trackY+(t%5===0?-8:-4)); ctx.stroke() }
  // knob
  var kx=trackX+fillW, ky=y+h/2;
  var knobState=dis?'disabled':state;
  ctx.drawImage(bakeKnob(kd,knobState), Math.round(kx-kd/2), Math.round(ky-kd/2));
  if(showVal){ var disp=Math.round(lerp(vmin,vmax,value));
    ctx.font='bold '+Math.max(11,lfs-1)+'px '+MONO; ctx.textAlign='right'; ctx.textBaseline='middle';
    ctx.fillStyle=dis?'#6a6a60':'#e8c860'; ctx.fillText(String(disp)+(opts.unit||''), x+w-pad, y+h/2) }
  if(state==='focus') focusRing(ctx,trackX-4,y+4,trackW+8,h-8);
  ctx.restore();
  var track=rect(trackX,trackY,trackW,trackH);
  var knob=rect(Math.round(kx-kd/2), Math.round(ky-kd/2), kd, kd);
  var hit=rect(x,y,w,h);
  function valueAt(px){ return clamp((px-trackX)/Math.max(1,trackW),0,1) }
  return {hit:hit, track:track, knob:knob, label:rect(x+pad,y,Math.max(labelW,40),h), value:value, valueAt:valueAt};
}

/* ---------- button (ammo crate; prefer MENU_ART) ---------- */
function drawButtonLocal(ctx,x,y,w,h,label,state){
  w=Math.round(w); h=Math.round(h); x=Math.round(x); y=Math.round(y);
  state=state||'normal';
  var press=state==='pressed', hov=state==='hover', dis=state==='disabled';
  var b=cached('btn'+w+'x'+h+'/'+label+'/'+state,w+8,h+10,function(x2){
    var oy=press?3:0, R=rng(w*7+h*13+String(label).length);
    x2.fillStyle='rgba(0,0,0,.55)'; x2.fillRect(4,6,w,h); x2.translate(2,oy+1);
    var base=dis?[70,70,60]:hov?[118,110,62]:press?[78,74,40]:[98,92,50];
    var n=Math.max(2,Math.round(h/16)), ph=h/n;
    for(var i=0;i<n;i++){ var v=(R()-.5)*14, g=x2.createLinearGradient(0,i*ph,0,(i+1)*ph);
      g.addColorStop(0,'rgb('+(base[0]+v+14)+','+(base[1]+v+12)+','+(base[2]+v+6)+')');
      g.addColorStop(1,'rgb('+(base[0]+v-14)+','+(base[1]+v-14)+','+(base[2]+v-10)+')');
      x2.fillStyle=g; x2.fillRect(0,i*ph,w,ph);
      x2.fillStyle='rgba(18,16,8,.8)'; x2.fillRect(0,(i+1)*ph-1,w,1) }
    x2.strokeStyle=OUT; x2.lineWidth=2; x2.strokeRect(1,1,w-2,h-2);
    if(hov){ x2.strokeStyle='rgba(255,213,74,.85)'; x2.lineWidth=2; x2.strokeRect(-1,-1,w+2,h+2) }
    var fs=Math.round(Math.min(h*.5,w/(Math.max(4,String(label).length)*.62)));
    x2.font='bold '+fs+'px '+FONT; x2.textAlign='center'; x2.textBaseline='middle';
    x2.fillStyle=dis?'#8a8a7a':hov?'#fff4c8':'#ebe0b0';
    x2.fillText(String(label||'').toUpperCase(),w/2,h/2+fs*.04);
  });
  ctx.drawImage(b,x-2,y-1);
  if(state==='focus') focusRing(ctx,x,y,w,h);
  return {hit:expandHit(rect(x,y,w,h))};
}
function drawButton(ctx,x,y,w,h,label,state){
  w=Math.max(MIN_HIT*2, Math.round(w||200)); h=Math.max(MIN_HIT, Math.round(h||48));
  x=Math.round(x); y=Math.round(y); state=state||'normal';
  if(typeof MENU_ART!=='undefined'&&MENU_ART&&typeof MENU_ART.drawButton==='function'){
    try{ MENU_ART.drawButton(ctx,x,y,w,h,label,state==='focus'?'hover':state); if(state==='focus') focusRing(ctx,x,y,w,h); return {hit:expandHit(rect(x,y,w,h))} }catch(e){}
  }
  return drawButtonLocal(ctx,x,y,w,h,label,state);
}

/* ---------- top-bar icon buttons (mute / pause / fullscreen) ---------- */
function bakeIcon(size,icon,state,on){ return cached('ico'+size+'/'+icon+'/'+state+'/'+(on?1:0),size,size,function(x){
  var hov=state==='hover', press=state==='pressed', dis=state==='disabled', foc=state==='focus';
  var s=size, pad=Math.max(2,s*.06);
  x.fillStyle=metalGrad(x,0,0,s,s,hov&&!dis); x.fillRect(0,0,s,s);
  x.fillStyle=odGrad(x,pad,pad,s-pad,s-pad); x.fillRect(pad,pad,s-pad*2,s-pad*2);
  x.strokeStyle=OUT; x.lineWidth=2; x.strokeRect(1,1,s-2,s-2);
  if(hov&&!dis){ x.strokeStyle='rgba(255,213,74,.8)'; x.strokeRect(3,3,s-6,s-6) }
  var cx=s/2, cy=s/2+(press?1:0), col=dis?'#7a7a70':(on?'#ffb0a0':'#ebe0b0');
  x.fillStyle=col; x.strokeStyle=col; x.lineWidth=Math.max(2,s*.06); x.lineJoin='round'; x.lineCap='round';
  if(icon==='mute'||icon==='unmute'){ // speaker
    var onMute=icon==='mute'||on;
    x.beginPath(); x.moveTo(cx-s*.18,cy-s*.12); x.lineTo(cx-s*.02,cy-s*.12); x.lineTo(cx+s*.14,cy-s*.28); x.lineTo(cx+s*.14,cy+s*.28); x.lineTo(cx-s*.02,cy+s*.12); x.lineTo(cx-s*.18,cy+s*.12); x.closePath(); x.fill();
    if(onMute){ x.beginPath(); x.moveTo(cx+s*.2,cy-s*.18); x.lineTo(cx+s*.34,cy+s*.18); x.moveTo(cx+s*.34,cy-s*.18); x.lineTo(cx+s*.2,cy+s*.18); x.stroke() }
    else { x.beginPath(); x.arc(cx+s*.16,cy,s*.12,-.7,.7); x.stroke(); x.beginPath(); x.arc(cx+s*.16,cy,s*.22,-.7,.7); x.stroke() }
  } else if(icon==='pause'){ x.fillRect(cx-s*.16,cy-s*.2,s*.1,s*.4); x.fillRect(cx+s*.06,cy-s*.2,s*.1,s*.4) }
  else if(icon==='fullscreen'){ var a=s*.16; x.beginPath();
    x.moveTo(cx-a,cy-a*.2); x.lineTo(cx-a,cy-a); x.lineTo(cx-a*.2,cy-a);
    x.moveTo(cx+a*.2,cy-a); x.lineTo(cx+a,cy-a); x.lineTo(cx+a,cy-a*.2);
    x.moveTo(cx+a,cy+a*.2); x.lineTo(cx+a,cy+a); x.lineTo(cx+a*.2,cy+a);
    x.moveTo(cx-a*.2,cy+a); x.lineTo(cx-a,cy+a); x.lineTo(cx-a,cy+a*.2); x.stroke() }
  if(foc&&!dis){ x.strokeStyle='#ffd54a'; x.lineWidth=2; x.setLineDash([3,2]); x.strokeRect(2.5,2.5,s-5,s-5); x.setLineDash([]) }
  if(dis){ x.fillStyle='rgba(20,20,16,.4)'; x.fillRect(0,0,s,s) }
}) }
function drawIconButton(ctx,x,y,size,icon,state,on){
  size=Math.max(MIN_HIT, Math.round(size||MIN_HIT)); x=Math.round(x); y=Math.round(y);
  state=state||'normal'; icon=String(icon||'pause');
  ctx.drawImage(bakeIcon(size,icon,state,!!on),x,y);
  return {hit:rect(x,y,size,size)};
}

/* ---------- layout helper for a settings column ---------- */
function layoutSettings(x,y,w,rows){
  x=Math.round(x); y=Math.round(y); w=Math.max(200,Math.round(w||320));
  var out=[], cy=y, gap=10, rowH=MIN_HIT+4;
  (rows||[]).forEach(function(r,i){
    var kind=r.kind||'toggle';
    var rh=kind==='button'?Math.max(MIN_HIT,r.h||48):rowH;
    out.push({id:r.id||('row'+i), kind:kind, x:x, y:cy, w:w, h:rh, label:r.label, on:r.on, value:r.value, state:r.state||'normal'});
    cy+=rh+gap;
  });
  return {rows:out, height:cy-y-gap, width:w};
}

function safe(fn,fb){ return function(){ try{ return fn.apply(null,arguments) }catch(e){ if(!safe.w){ safe.w=1; if(typeof console!=='undefined')console.warn('SETTINGS_ART fallback',e) } try{ return fb&&fb.apply(null,arguments) }catch(e2){} } } }

var SETTINGS_ART={
  version:'2026-10-15', MIN_HIT:MIN_HIT,
  drawToggle:safe(drawToggle,function(ctx,x,y,w,h,on,state,label){ h=Math.max(MIN_HIT,h|0); w=Math.max(160,w|0);
    ctx.fillStyle=on?'#b3261e':'#4a4a46'; ctx.fillRect(x+w-70,y+10,52,h-20); ctx.fillStyle='#ebe0b0'; ctx.font='14px sans-serif'; ctx.fillText(String(label||''),x+8,y+h/2);
    return {hit:rect(x,y,w,h), switch:rect(x+w-70,y+10,52,h-20), label:rect(x,y,w-80,h), lamp:rect(x+w-30,y+h/2-8,16,16), on:!!on} }),
  drawSlider:safe(drawSlider,function(ctx,x,y,w,h,value){ h=Math.max(MIN_HIT,h|0); w=Math.max(180,w|0); value=clamp(+value||0,0,1);
    ctx.fillStyle='#333'; ctx.fillRect(x+80,y+h/2-4,w-120,8); ctx.fillStyle='#c9a13a'; ctx.fillRect(x+80,y+h/2-4,(w-120)*value,8);
    var track=rect(x+80,y+h/2-4,w-120,8); return {hit:rect(x,y,w,h), track:track, knob:rect(x+80+(w-120)*value-14,y+h/2-14,28,28), label:rect(x,y,70,h), value:value, valueAt:function(px){ return clamp((px-track.x)/track.w,0,1) }} }),
  drawSettingsPanel:safe(drawSettingsPanel,function(ctx,x,y,w,h){ ctx.fillStyle='rgba(20,28,16,.92)'; ctx.fillRect(x,y,w,h); return {hit:rect(x,y,w,h), content:rect(x+16,y+36,w-32,h-52), title:null} }),
  drawButton:safe(drawButton,function(ctx,x,y,w,h,label){ w=Math.max(88,w|0); h=Math.max(MIN_HIT,h|0); ctx.fillStyle='#4a6b2f'; ctx.fillRect(x,y,w,h); ctx.fillStyle='#f6f0cc'; ctx.fillText(String(label||''),x+12,y+h/2); return {hit:rect(x,y,w,h)} }),
  drawIconButton:safe(drawIconButton,function(ctx,x,y,size){ size=Math.max(MIN_HIT,size|0); ctx.fillStyle='#3a5a28'; ctx.fillRect(x,y,size,size); return {hit:rect(x,y,size,size)} }),
  layoutSettings:safe(layoutSettings,function(x,y,w,rows){ return {rows:[], height:0, width:w|0} }),
  prewarm:safe(function(){ bakeToggle(72,48,true,'normal'); bakeToggle(72,48,false,'hover'); bakeKnob(32,'normal'); bakePanel(360,280,'SETTINGS'); bakeIcon(44,'mute','normal',false); bakeIcon(44,'pause','normal',false) }),
  clearCache:function(){ C={} }
};
if(typeof window!=='undefined')window.SETTINGS_ART=SETTINGS_ART;
if(typeof module!=='undefined')module.exports=SETTINGS_ART;
})();
