/* MENU_ART: main-menu art for Last Bird Out (Quang Tri 1968). Artist Helper, 2026-10-14.
   Plain canvas 2D, no assets, no dependencies. Everything static is baked once into cached canvases;
   per frame it only blits layers and draws a few small animated sprites.
   API (all coords in CSS px of the target ctx; scale with ctx transform if you use DPR):
     MENU_ART.drawBackground(ctx,w,h,t)          dusk firebase / paddies / jungle, animated (t = seconds)
     MENU_ART.drawTitle(ctx,cx,y,width,t,text?)    stencil title + subtitle, centred at cx, top at y
     MENU_ART.drawButton(ctx,x,y,w,h,label,state)  ammo-crate button; state 'normal'|'hover'|'pressed'|'disabled'
     MENU_ART.drawPanel(ctx,x,y,w,h,title?)        sub-screen panel (canvas-and-plywood map case)
     MENU_ART.installCSS(opts?)                    one call: skins the DOM menu (#menu button.btn, .help, .credits, h1) with the same art
     MENU_ART.setPhoto(img,caption?)               optional archival photo background (cover-fit, slow drift, sepia grade, vignette, grain, typewriter caption).
                                                   Drawn art is used until img has decoded, and again if you pass null.
     MENU_ART.drawCaption(ctx,text,x,y,fs,'bl'|'tl') period caption strip (typewriter on manila)
     MENU_ART.clearCache()                         free all cached canvases (call on context loss)
   Never throws: every public call is wrapped; on any failure it draws a flat fallback. */
(function(){
'use strict';
var FONT='Impact,Haettenschweiler,"Oswald","Arial Narrow Bold","Arial Black",sans-serif';
var MONO='"Courier New",Courier,monospace';
var OUT='#1a1c12';
function mk(w,h){ w=Math.max(1,Math.ceil(w)); h=Math.max(1,Math.ceil(h)); var c;
  if(typeof document!=='undefined'){ c=document.createElement('canvas'); c.width=w; c.height=h } else c=new OffscreenCanvas(w,h); return c }
function rng(s){ s=(s>>>0)||1; return function(){ s^=s<<13; s>>>=0; s^=s>>17; s^=s<<5; s>>>=0; return s/4294967296 } }
function hash(n){ n=(n*374761393+668265263)>>>0; n=((n^(n>>>13))*1274126177)>>>0; return ((n^(n>>>16))>>>0)/4294967296 }
function lerp(a,b,k){ return a+(b-a)*k }
function clamp(v,a,b){ return v<a?a:v>b?b:v }
/* 1D value noise, octaves */
function vnoise(x,seed){ var i=Math.floor(x), f=x-i, a=hash(i*7+seed*131), b=hash((i+1)*7+seed*131); f=f*f*(3-2*f); return a+(b-a)*f }
function fbm(x,seed,oct){ var s=0,a=1,n=0; for(var o=0;o<(oct||4);o++){ s+=vnoise(x,seed+o*17)*a; n+=a; a*=.5; x*=2.03 } return s/n }

var C={}; // cache
function cached(key,w,h,fn){ var c=C[key]; if(c)return c; c=mk(w,h); try{ fn(c.getContext('2d'),c.width,c.height) }catch(e){ if(typeof console!=='undefined')console.warn('MENU_ART bake',key,e) } C[key]=c; return c }

/* ---------- reusable soft sprites ---------- */
function glow(col,r){ return cached('glow'+col+r,r*2,r*2,function(x){ var g=x.createRadialGradient(r,r,0,r,r,r); g.addColorStop(0,col); g.addColorStop(.25,col.replace(/[\d.]+\)$/,function(a){return (parseFloat(a)*.45)+')'})); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,r*2,r*2) }) }
function puff(k){ return cached('puff'+k,96,96,function(x){ var R=rng(91+k*13); for(var i=0;i<26;i++){ var a=R()*6.283, d=R()*24, px=48+Math.cos(a)*d, py=48+Math.sin(a)*d*.8, r=12+R()*18, v=Math.round(lerp(70,120,R()));
    var g=x.createRadialGradient(px-r*.3,py-r*.35,0,px,py,r); g.addColorStop(0,'rgba('+(v+28)+','+(v+20)+','+(v+18)+',.22)'); g.addColorStop(.6,'rgba('+v+','+(v-6)+','+(v-4)+',.12)'); g.addColorStop(1,'rgba('+v+','+v+','+v+',0)'); x.fillStyle=g; x.beginPath(); x.arc(px,py,r,0,6.283); x.fill() } }) }
function grain(){ return cached('grain',256,256,function(x){ var d=x.createImageData(256,256), R=rng(7); for(var i=0;i<d.data.length;i+=4){ var v=R()*255|0; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=R()<.5?14:0 } x.putImageData(d,0,0) }) }

/* ---------- background layers (baked per internal size) ---------- */
var HOR=.585; // horizon line (fraction of h)
function bakeSky(x,w,h){
  var g=x.createLinearGradient(0,0,0,h*HOR); g.addColorStop(0,'#141a2c'); g.addColorStop(.35,'#2c2c46'); g.addColorStop(.62,'#6a4050'); g.addColorStop(.84,'#c4683c'); g.addColorStop(1,'#efa458'); x.fillStyle=g; x.fillRect(0,0,w,h);
  var R=rng(3); x.fillStyle='rgba(230,230,255,.55)'; for(var i=0;i<90;i++){ var sy=R()*h*.3; x.globalAlpha=(1-sy/(h*.3))*.6*R(); x.fillRect(R()*w,sy,R()<.1?1.5:1,R()<.1?1.5:1) } x.globalAlpha=1;
  // sun glow low on the left (sun set behind the Annamites, light from top-left)
  var sg=x.createRadialGradient(w*.22,h*HOR,0,w*.22,h*HOR,w*.55); sg.addColorStop(0,'rgba(255,200,120,.55)'); sg.addColorStop(.4,'rgba(240,130,70,.18)'); sg.addColorStop(1,'rgba(240,120,60,0)'); x.fillStyle=sg; x.fillRect(0,0,w,h);
  // long stratus bands, lit from below-left
  for(var b=0;b<7;b++){ var cy=h*(.16+b*.055+R()*.03), th=h*(.012+R()*.02), x0=R()*w*.4-w*.2, len=w*(.5+R()*.7);
    for(var s=0;s<90;s++){ var px=x0+len*s/90, r=th*(1.6+fbm(s*.1,b*9)*3), py=cy+Math.sin(s*.2+b)*th*.4;
      var cg=x.createRadialGradient(px,py+r*.4,0,px,py,r*1.6), warm=clamp(1-Math.abs(px-w*.22)/(w*.9),0,1)*(.4+b*.1);
      cg.addColorStop(0,'rgba('+Math.round(lerp(70,250,warm))+','+Math.round(lerp(60,150,warm))+','+Math.round(lerp(80,90,warm))+',.10)'); cg.addColorStop(1,'rgba(40,36,60,0)'); x.fillStyle=cg; x.fillRect(px-r*2,py-r*2,r*4,r*4) }
  } }
function ridge(x,w,h,base,amp,seed,col,rim,scale){ x.beginPath(); x.moveTo(0,h); var pts=[]; for(var i=0;i<=w;i+=2){ var y=base-amp*(.35+.65*fbm(i/w*scale,seed,5))*(.75+.25*Math.sin(i/w*3.1+seed)); pts.push(y); x.lineTo(i,y) } x.lineTo(w,h); x.closePath(); x.fillStyle=col; x.fill();
  if(rim){ x.strokeStyle=rim; x.lineWidth=1.2; x.beginPath(); for(var j=0;j<pts.length;j++){ var px=j*2; x.globalAlpha=clamp(1-px/(w*.8),0,1); if(j)x.lineTo(px,pts[j]); else x.moveTo(px,pts[j]) } x.stroke(); x.globalAlpha=1 } }
function bakeFar(x,w,h){ var H=h*HOR;
  ridge(x,w,h,H+h*.01,h*.24,14,'#5a4560','rgba(255,190,140,.25)',2.6);
  var hz=x.createLinearGradient(0,H-h*.12,0,H); hz.addColorStop(0,'rgba(240,150,90,0)'); hz.addColorStop(1,'rgba(240,160,100,.35)'); x.fillStyle=hz; x.fillRect(0,H-h*.12,w,h*.12) }
function bakeMid(x,w,h){ var H=h*HOR;
  ridge(x,w,h,H+h*.02,h*.12,23,'#3a2e44','rgba(255,170,110,.35)',3.4);
  var hz=x.createLinearGradient(0,H-h*.05,0,H+h*.01); hz.addColorStop(0,'rgba(220,130,90,0)'); hz.addColorStop(1,'rgba(220,140,100,.28)'); x.fillStyle=hz; x.fillRect(0,H-h*.05,w,h*.06) }
function palm(x,px,py,s,R,col){ x.strokeStyle=col; x.fillStyle=col; x.lineWidth=Math.max(1,s*.06); x.beginPath(); var lean=(R()-.5)*s*.5; x.moveTo(px,py); x.quadraticCurveTo(px+lean*.3,py-s*.5,px+lean,py-s); x.stroke(); var tx=px+lean, ty=py-s;
  for(var f=0;f<7;f++){ var a=-Math.PI/2+(f-3)*.5+(R()-.5)*.2, L=s*(.45+R()*.2); x.lineWidth=Math.max(1,s*.035); x.beginPath(); x.moveTo(tx,ty); var ex=tx+Math.cos(a)*L, ey=ty+Math.sin(a)*L*.6+L*.35; x.quadraticCurveTo(tx+Math.cos(a)*L*.5,ty+Math.sin(a)*L*.5-L*.1,ex,ey); x.stroke();
    for(var k=1;k<8;k++){ var q=k/8, lx=lerp(tx,ex,q), ly=lerp(ty,ey,q)-Math.sin(q*3.14)*L*.12; x.lineWidth=1; x.beginPath(); x.moveTo(lx,ly); x.lineTo(lx+Math.cos(a+1.3)*L*.12,ly+L*.12); x.moveTo(lx,ly); x.lineTo(lx+Math.cos(a-1.3)*L*.12,ly+L*.1); x.stroke() } } }
function bakeTrees(x,w,h){ var H=h*HOR, R=rng(41);
  // dense canopy band: overlapping crowns, rim-lit from the left
  for(var pass=0;pass<2;pass++){ for(var i=-20;i<w+20;i+=R()*10+6){ var r=h*(.012+R()*.028)*(pass?1:1.25), cy=H+h*.012-r*.6-fbm(i/w*6,5)*h*.05*(pass?1:.6);
    var c=pass?'#161a1c':'#22202c'; x.fillStyle=c; x.beginPath(); x.arc(i,cy,r,0,6.283); x.fill();
    if(pass){ x.strokeStyle='rgba(255,170,100,'+(0.22*clamp(1-i/w,0,1)+.03)+')'; x.lineWidth=1; x.beginPath(); x.arc(i,cy,r-.5,Math.PI*1.05,Math.PI*1.55); x.stroke() } } }
  x.fillStyle='#161a1c'; x.fillRect(0,H+h*.004,w,h*.012);
  for(var p=0;p<16;p++){ palm(x,R()*w,H+h*.01,h*(.06+R()*.06),R,'#14181a') } }
function bakePaddy(x,w,h){ var H=h*HOR, B=h*.83;
  // water reflects the sky, darker and bluer
  var g=x.createLinearGradient(0,H,0,B); g.addColorStop(0,'#d08a5a'); g.addColorStop(.25,'#8a5a58'); g.addColorStop(.7,'#3e3448'); g.addColorStop(1,'#20202c'); x.fillStyle=g; x.fillRect(0,H+h*.012,w,B-H);
  var sg=x.createRadialGradient(w*.22,H+h*.02,0,w*.22,H+h*.02,w*.4); sg.addColorStop(0,'rgba(255,200,130,.5)'); sg.addColorStop(1,'rgba(255,170,110,0)'); x.fillStyle=sg; x.fillRect(0,H,w,B-H);
  // treeline reflection
  x.save(); x.globalAlpha=.35; x.fillStyle='#1c1a24'; x.fillRect(0,H+h*.012,w,h*.018); x.restore();
  // dikes: perspective converging toward a vanishing point; paddy rows of young rice
  var vx=w*.58, R=rng(77);
  function yAt(k){ return H+h*.014+(B-H)*Math.pow(k,1.9) }
  for(var r=1;r<10;r++){ var y=yAt(r/10), th=Math.max(1,h*.0022*r/3), x0=-w*.1;
    while(x0<w){ var seg=w*(.12+R()*.3), y0=y+(R()-.5)*h*.002*r, y1=y0+(R()-.5)*h*.0015*r;
      x.strokeStyle='#262420'; x.lineWidth=th*1.4; x.beginPath(); x.moveTo(x0,y0); x.quadraticCurveTo(x0+seg/2,(y0+y1)/2+(R()-.5)*th*2,x0+seg,y1); x.stroke();
      x.strokeStyle='rgba(255,180,120,.16)'; x.lineWidth=Math.max(1,th*.4); x.beginPath(); x.moveTo(x0,y0-th*.5); x.quadraticCurveTo(x0+seg/2,(y0+y1)/2-th*.5,x0+seg,y1-th*.5); x.stroke();
      if(R()<.6){ var yb=yAt(Math.min(1,(r+1)/10)); x.strokeStyle='#24221f'; x.lineWidth=Math.max(1,th); var dx=x0+seg; x.beginPath(); x.moveTo(dx,y1); x.lineTo(dx+(dx-vx)*.15,yb); x.stroke() }
      x0+=seg+w*.004 } }
  for(var pp=0;pp<40;pp++){ var pk=R(), py=yAt(pk), pw=w*(.05+R()*.15)*(.3+pk), phh=h*.006*(1+pk*6); x.fillStyle='rgba('+Math.round(50+R()*30)+','+Math.round(70+R()*40)+',40,'+(.12+R()*.18)+')'; x.fillRect(R()*w,py,pw,phh) }
  for(var row=0;row<60;row++){ var k=R(), y2=yAt(k), cell=Math.floor((R()*16)), sc=.4+k*2.2;
    if(cell%3===0)continue;
    x.strokeStyle='rgba('+Math.round(lerp(40,70,R()))+','+Math.round(lerp(60,90,R()))+',40,.75)'; x.lineWidth=1;
    for(var t=0;t<26;t++){ var px=R()*w; x.beginPath(); x.moveTo(px,y2); x.lineTo(px-sc,y2-sc*2.4); x.moveTo(px,y2); x.lineTo(px+sc*.8,y2-sc*2.1); x.stroke() } }
  // near bank: grass and brush
  var bg=x.createLinearGradient(0,B-h*.03,0,h); bg.addColorStop(0,'#1e2218'); bg.addColorStop(1,'#0e100c'); x.fillStyle=bg; x.fillRect(0,B-h*.01,w,h-B+h*.01);
  for(var gI=0;gI<900;gI++){ var gx=R()*w, gy=B-h*.012+R()*h*.06, gl=h*(.01+R()*.03); x.strokeStyle=R()<.3?'rgba(200,140,80,.25)':'rgba(30,36,22,.9)'; x.lineWidth=1; x.beginPath(); x.moveTo(gx,gy); x.quadraticCurveTo(gx+(R()-.5)*gl*.6,gy-gl*.6,gx+(R()-.3)*gl*.7,gy-gl); x.stroke() } }
function sandbag(x,px,py,bw,bh,lit){ x.fillStyle='#2a2618'; x.beginPath(); x.ellipse(px,py,bw/2,bh/2,0,0,6.283); x.fill();
  var g=x.createLinearGradient(px-bw/2,py-bh/2,px+bw/3,py+bh/2); g.addColorStop(0,'rgba(255,175,105,'+(.45*lit)+')'); g.addColorStop(.45,'rgba(90,80,50,.25)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.beginPath(); x.ellipse(px,py,bw/2-1,bh/2-1,0,0,6.283); x.fill();
  x.strokeStyle=OUT; x.lineWidth=1; x.beginPath(); x.ellipse(px,py,bw/2,bh/2,0,0,6.283); x.stroke(); x.strokeStyle='rgba(20,18,10,.6)'; x.beginPath(); x.moveTo(px+bw*.3,py-bh*.4); x.lineTo(px+bw*.32,py+bh*.4); x.stroke() }
function bakeFore(x,w,h){ var R=rng(5), base=h*.9;
  // berm
  x.fillStyle='#14140e'; x.beginPath(); x.moveTo(0,h); x.lineTo(0,base-h*.02); for(var i=0;i<=w;i+=8)x.lineTo(i,base-h*.03-fbm(i/w*4,8)*h*.03); x.lineTo(w,h); x.fill();
  // sandbag wall left and right, 3 courses
  var bw=h*.055, bh=h*.026;
  function wall(x0,x1,yb,rows){ for(var r=0;r<rows;r++){ var y=yb-r*bh*.82, off=(r%2)*bw*.5; for(var px=x0+off;px<x1;px+=bw*.96){ sandbag(x,px,y,bw,bh,clamp(1-px/w,0.15,1)) } } }
  wall(-bw,w*.36,base-h*.02,3); wall(w*.7,w+bw,base-h*.025,2);
  // bunker with corrugated roof and firing slit (right)
  var bx=w*.74, by=base-h*.13, bW=w*.17, bH=h*.075; x.fillStyle='#1c1a12'; x.fillRect(bx,by,bW,bH); x.fillStyle='#0a0a08'; x.fillRect(bx+bW*.2,by+bH*.35,bW*.5,bH*.18);
  x.fillStyle='#262418'; x.beginPath(); x.moveTo(bx-bW*.05,by); x.lineTo(bx+bW*1.05,by-h*.006); x.lineTo(bx+bW*1.05,by+h*.012); x.lineTo(bx-bW*.05,by+h*.016); x.fill();
  for(var c=0;c<bW*1.1;c+=4){ x.fillStyle=c%8?'rgba(255,170,100,.16)':'rgba(0,0,0,.3)'; x.fillRect(bx-bW*.05+c,by-h*.004,2,h*.018) }
  for(var r2=0;r2<2;r2++)for(var px2=bx;px2<bx+bW;px2+=bw*.9)sandbag(x,px2,by-h*.008-r2*bh*.8,bw*.95,bh*.95,.5);
  // RC-292 antenna + flagpole
  x.strokeStyle='#121210'; x.lineWidth=2; x.beginPath(); x.moveTo(bx+bW*.85,by-h*.02); x.lineTo(bx+bW*.85,by-h*.27); x.stroke(); x.lineWidth=1;
  for(var a=0;a<3;a++){ x.beginPath(); x.moveTo(bx+bW*.85,by-h*.27); x.lineTo(bx+bW*.85+(a-1)*w*.03,by-h*.235); x.stroke() }
  x.strokeStyle='rgba(20,20,16,.6)'; x.beginPath(); x.moveTo(bx+bW*.85,by-h*.25); x.lineTo(bx+bW*1.15,base-h*.03); x.moveTo(bx+bW*.85,by-h*.25); x.lineTo(bx+bW*.55,by-h*.02); x.stroke();
  // M101A1 105mm howitzer in a sandbag parapet (left), barrel elevated toward the hills
  var hx=w*.2, hy=base-h*.05, s=h*.0017; x.save(); x.translate(hx,hy); x.scale(s,s); x.fillStyle='#121410';
  x.beginPath(); x.moveTo(-40,0); x.lineTo(40,0); x.lineTo(30,-14); x.lineTo(-30,-14); x.closePath(); x.fill(); // carriage
  x.beginPath(); x.arc(-26,4,14,0,6.283); x.arc(26,4,14,0,6.283); x.fill(); // wheels
  x.save(); x.translate(4,-22); x.rotate(-.42); x.fillRect(-18,-6,30,14); x.fillRect(10,-3.5,92,7); x.fillRect(96,-5,8,10); x.restore(); // cradle+tube
  x.beginPath(); x.moveTo(-6,-14); x.lineTo(-24,-46); x.lineTo(-10,-48); x.lineTo(14,-14); x.fill(); // shield
  x.beginPath(); x.moveTo(-30,-4); x.lineTo(-120,20); x.lineTo(-116,26); x.lineTo(-24,6); x.fill(); // trails
  x.strokeStyle='rgba(255,170,100,.35)'; x.lineWidth=2; x.beginPath(); x.moveTo(-24,-46); x.lineTo(-10,-48); x.stroke(); x.restore();
  // concertina wire along the berm: overlapping coils
  x.strokeStyle='rgba(40,40,36,.95)'; x.lineWidth=1;
  for(var cx=-10;cx<w+10;cx+=h*.02){ var cy=base+h*.035+Math.sin(cx*.01)*h*.004, cr=h*.028; x.beginPath(); x.ellipse(cx,cy-cr,cr*.55,cr,.25,0,6.283); x.stroke() }
  x.strokeStyle='rgba(255,190,130,.22)'; for(var cx2=-10;cx2<w*.5;cx2+=h*.02){ var cy2=base+h*.035+Math.sin(cx2*.01)*h*.004, cr2=h*.028; x.beginPath(); x.ellipse(cx2,cy2-cr2,cr2*.55,cr2,.25,Math.PI*1.1,Math.PI*1.5); x.stroke() }
  // engineer stakes
  x.fillStyle='#0e0e0c'; for(var sx=h*.04;sx<w;sx+=h*.16)x.fillRect(sx,base+h*.0,2,h*.045);
  // ammo crates + 55-gal drum (right foreground)
  x.fillStyle='#1a1c12'; x.fillRect(w*.58,base-h*.03,w*.06,h*.035); x.fillRect(w*.6,base-h*.055,w*.05,h*.027); x.strokeStyle='rgba(255,170,100,.25)'; x.strokeRect(w*.58+.5,base-h*.03+.5,w*.06,h*.035); x.strokeRect(w*.6+.5,base-h*.055+.5,w*.05,h*.027);
  x.fillStyle='#101210'; x.fillRect(w*.655,base-h*.05,h*.032,h*.055); x.fillStyle='rgba(200,170,60,.35)'; x.fillRect(w*.655,base-h*.032,h*.032,h*.004);
  // ground shade
  var gg=x.createLinearGradient(0,base-h*.04,0,h); gg.addColorStop(0,'rgba(0,0,0,0)'); gg.addColorStop(1,'rgba(0,0,0,.5)'); x.fillStyle=gg; x.fillRect(0,base-h*.04,w,h) }
function bakeVignette(x,w,h){ var g=x.createRadialGradient(w/2,h*.45,Math.min(w,h)*.25,w/2,h*.5,Math.max(w,h)*.75); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(4,4,8,.62)'); x.fillStyle=g; x.fillRect(0,0,w,h) }
/* CH-46D Sea Knight in side silhouette, facing left (nose left). 120 x 48 base units. */
function bakeCH46(x){ x.save(); x.scale(2,2); x.fillStyle='#16161a';
  x.beginPath(); x.moveTo(6,26); x.quadraticCurveTo(4,18,14,15); x.lineTo(24,13); x.lineTo(92,11); x.lineTo(104,4); x.lineTo(112,4); x.lineTo(110,14); x.lineTo(108,24); x.lineTo(96,30); x.lineTo(16,32); x.quadraticCurveTo(8,31,6,26); x.fill();
  x.fillRect(20,9,10,5); x.fillRect(96,1,10,5); x.fillRect(24,6,2,4); x.fillRect(100,0,2,2);
  x.fillRect(40,30,30,5); x.fillRect(46,35,2,5); x.fillRect(64,35,2,5); x.fillRect(22,32,2,6); // sponsons + gear
  x.beginPath(); x.arc(47,41,2.5,0,6.283); x.arc(65,41,2.5,0,6.283); x.arc(23,39,2,0,6.283); x.fill();
  x.fillStyle='rgba(255,170,100,.45)'; x.fillRect(16,14,76,1); x.fillStyle='rgba(120,150,170,.45)'; x.fillRect(10,17,7,5); x.restore() }
var Hcache={};
function layers(w,h){ var iw=Math.min(1600,Math.max(320,Math.round(w))), ih=Math.round(iw*h/w); if(ih>1000){ ih=1000; iw=Math.round(ih*w/h) }
  var k=iw+'x'+ih; if(Hcache.k===k)return Hcache; var pw=Math.round(iw*1.06);
  Hcache={k:k,iw:iw,ih:ih,pw:pw,
    sky:cached('sky'+k,pw,ih,bakeSky), far:cached('far'+k,pw,ih,bakeFar), mid:cached('mid'+k,pw,ih,bakeMid), trees:cached('trees'+k,pw,ih,bakeTrees),
    paddy:cached('paddy'+k,pw,ih,bakePaddy), fore:cached('fore'+k,pw,ih,bakeFore), vig:cached('vig'+k,iw,ih,bakeVignette)};
  return Hcache }
function heli(){ return cached('ch46',240,96,bakeCH46) }

var PHOTO=null;
function okImg(i){ return i&&((i.naturalWidth||i.videoWidth||i.width)>0)&&(i.complete!==false) }
function drawPhotoBg(ctx,w,h,t){ var img=PHOTO.img, iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, k=(Math.sin(t*.03)+1)/2, z=1.08+k*.06, s=Math.max(w/iw,h/ih)*z;
  ctx.save(); ctx.drawImage(img,(w-iw*s)/2+lerp(-.02,.02,k)*w,(h-ih*s)/2,iw*s,ih*s);
  ctx.globalCompositeOperation='multiply'; ctx.fillStyle='rgb(230,206,168)'; ctx.fillRect(0,0,w,h); ctx.globalCompositeOperation='source-over'; ctx.fillStyle='rgba(20,16,10,.25)'; ctx.fillRect(0,0,w,h);
  var g=ctx.createRadialGradient(w/2,h*.45,Math.min(w,h)*.25,w/2,h*.5,Math.max(w,h)*.75); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(4,4,8,.7)'); ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  var gn=grain(), gx=-(Math.floor(t*24)*97%256), gy=-(Math.floor(t*24)*61%256); ctx.globalAlpha=.7; for(var yy=gy;yy<h;yy+=256)for(var xx=gx;xx<w;xx+=256)ctx.drawImage(gn,xx,yy); ctx.globalAlpha=1;
  if(PHOTO.caption)drawCaption(ctx,PHOTO.caption,Math.round(w*.02),Math.round(h-h*.02),Math.max(10,Math.round(h*.018)),'bl');
  ctx.restore() }
/* period caption: typewritten on a strip of manila; anchor 'bl' bottom-left or 'tl' top-left */
function drawCaption(ctx,text,x,y,fs,anchor){ fs=fs||14; ctx.save(); ctx.font='bold '+fs+'px '+MONO; var w=ctx.measureText(text).width+fs*1.6, h=fs*1.8, top=anchor==='tl'?y:y-h;
  ctx.fillStyle='rgba(226,214,170,.9)'; ctx.fillRect(x,top,w,h); ctx.strokeStyle=OUT; ctx.lineWidth=1; ctx.strokeRect(x+.5,top+.5,w-1,h-1); ctx.fillStyle='#2a2418'; ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.fillText(text,x+fs*.8,top+h/2+1); ctx.restore() }
function drawBackground(ctx,w,h,t){ t=t||0; if(PHOTO&&okImg(PHOTO.img)){ drawPhotoBg(ctx,w,h,t); return } var L=layers(w,h), iw=L.iw, ih=L.ih, sx=w/iw, sy=h/ih, slack=L.pw-iw;
  ctx.save(); ctx.imageSmoothingEnabled=true; ctx.scale(sx,sy);
  var drift=Math.sin(t*.045)*.5+.5; // slow parallax pan
  function lay(img,depth){ ctx.drawImage(img,-slack*drift*depth,0) }
  lay(L.sky,.15);
  // illumination flares under parachutes (drawn in the sky, before the ridges)
  var H=ih*HOR;
  for(var f=0;f<3;f++){ var per=13+f*3, ph=(t+f*5.1)/per, cyc=Math.floor(ph), k=ph-cyc, fx=iw*(.35+hash(cyc*3+f)*.55), fy=lerp(H-ih*.36,H-ih*.04,k), sw=Math.sin(t*1.3+f)*iw*.004;
    var a=k<.06?k/.06:(k>.85?(1-k)/.15:1), fl=.85+.15*Math.sin(t*23+f*7)*Math.sin(t*7.3);
    ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=a*.55*fl; var gr=glow('rgba(255,236,190,1)',64); ctx.drawImage(gr,fx+sw-ih*.16,fy-ih*.16,ih*.32,ih*.32);
    ctx.globalAlpha=a*fl; var gs=glow('rgba(255,255,240,1)',16); ctx.drawImage(gs,fx+sw-ih*.012,fy-ih*.012,ih*.024,ih*.024); ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=a*.5; ctx.strokeStyle='rgba(190,180,170,.6)'; ctx.lineWidth=Math.max(1,ih*.003); ctx.beginPath(); ctx.moveTo(fx+sw,fy-ih*.006); for(var s=1;s<12;s++){ ctx.lineTo(fx+Math.sin(t*1.3+f-s*.25)*iw*.004+Math.sin(s*1.7+cyc)*ih*.004,fy-ih*.006-s*ih*.012) } ctx.stroke();
    ctx.fillStyle='rgba(30,28,30,.8)'; ctx.beginPath(); ctx.arc(fx+sw,fy-ih*.016,ih*.006,Math.PI,0); ctx.fill(); ctx.globalAlpha=1 }
  lay(L.far,.3);
  // artillery flashes behind the near ridge
  for(var q=0;q<4;q++){ var pq=3.7+q*1.3, cq=Math.floor((t+q*2.2)/pq), kq=((t+q*2.2)/pq)-cq; if(kq<.12&&hash(cq*5+q)>.35){ var ax=iw*(.08+hash(cq*11+q)*.84), aa=(1-kq/.12); aa*=aa; ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=aa*.7; var ag=glow('rgba(255,160,80,1)',64); ctx.drawImage(ag,ax-ih*.12,H-ih*.1,ih*.24,ih*.16); ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1 } }
  lay(L.mid,.45);
  // distant tracer streams (green NVA .51 cal arcing up, red M60 answering)
  for(var r=0;r<2;r++){ var pr=6+r*2.5, cr=Math.floor((t+r*3)/pr), kr=((t+r*3)/pr)-cr; if(kr<.35&&hash(cr*7+r)>.3){ var tx=iw*(.15+hash(cr*13+r)*.7), col=r?'rgba(255,90,60,':'rgba(120,255,140,';
      for(var d=0;d<6;d++){ var kk=kr/.35*1.6-d*.09; if(kk<0||kk>1)continue; var px=tx+(r?-1:1)*kk*iw*.08, py=H-ih*.01-Math.sin(kk*2.4)*ih*.09; ctx.fillStyle=col+(1-kk)*.9+')'; ctx.fillRect(px,py,Math.max(1,ih*.004),Math.max(1,ih*.002)) } } }
  // CH-46 crossing right to left, slow, on a 46 s loop
  var hp=(t%46)/46, hx=lerp(iw*1.12,-iw*.18,hp), hy=ih*(.33+Math.sin(t*.4)*.006), hs=ih*.0016;
  if(hp>0&&hp<1){ var hb=heli(); ctx.drawImage(hb,hx,hy,120*hs*2,48*hs*2);
    var rot=t*30; ctx.strokeStyle='rgba(22,22,26,.55)'; ctx.lineWidth=Math.max(1,ih*.0016);
    for(var rr=0;rr<2;rr++){ var rx=hx+(rr?101:25)*hs*2, ry=hy+(rr?1:7)*hs*2, R2=58*hs*2; ctx.fillStyle='rgba(22,22,26,.13)'; ctx.beginPath(); ctx.ellipse(rx,ry,R2,R2*.06,0,0,6.283); ctx.fill();
      for(var bl=0;bl<3;bl++){ var ba=rot*(rr?1:-1)+bl*2.094, bx2=Math.cos(ba)*R2; ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx+bx2,ry+Math.sin(ba)*R2*.06); ctx.stroke() } }
    if(Math.floor(t*1.6)%2===0){ ctx.globalCompositeOperation='lighter'; var rb=glow('rgba(255,60,40,1)',16); ctx.drawImage(rb,hx+60*hs*2-ih*.008,hy+11*hs*2-ih*.008,ih*.016,ih*.016); ctx.globalCompositeOperation='source-over' } }
  lay(L.trees,.6);
  // smoke columns from a burning ville in the treeline, drifting right
  for(var sc=0;sc<2;sc++){ var bx=iw*(sc?.78:.47), by=H+ih*.005;
    for(var p=0;p<14;p++){ var life=9, ag2=((t*.9+p*life/14+sc*3)%life)/life, px2=bx+ag2*ag2*iw*.12+Math.sin(ag2*5+p)*ih*.01, py2=by-ag2*ih*.26, sz=ih*(.03+ag2*.14);
      ctx.globalAlpha=Math.min(1,ag2*6)*(1-ag2)*.85; ctx.drawImage(puff(p%4),px2-sz/2,py2-sz/2,sz,sz) }
    ctx.globalAlpha=1; ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=.35+.15*Math.sin(t*9+sc*3)*Math.sin(t*3.1); ctx.drawImage(glow('rgba(255,120,40,1)',32),bx-ih*.03,by-ih*.03,ih*.06,ih*.045); ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1 }
  lay(L.paddy,.8);
  // shimmer on the paddy water + flare light on water
  ctx.globalCompositeOperation='lighter';
  for(var wv=0;wv<26;wv++){ var wy=H+ih*.02+hash(wv*3)*ih*.2, wx=(hash(wv*5)*iw+t*iw*.004*(1+hash(wv))) % iw, ww=ih*(.02+hash(wv*7)*.05); ctx.fillStyle='rgba(255,200,150,'+(.05+.06*Math.sin(t*1.7+wv))+')'; ctx.fillRect(wx,wy,ww,1) }
  ctx.globalCompositeOperation='source-over';
  // low ground mist drifting across the paddies
  for(var m=0;m<9;m++){ var mx=((m/9+t*.006*(1+m%3*.4))%1.2-.1)*iw, my=H+ih*(.03+(m%3)*.05), ms=ih*(.22+(m%2)*.08); ctx.globalAlpha=.22; ctx.drawImage(puff(m%4),mx-ms,my-ms*.18,ms*2,ms*.36) } ctx.globalAlpha=1;
  lay(L.fore,1);
  // embers rising past the firebase
  ctx.globalCompositeOperation='lighter';
  for(var e=0;e<14;e++){ var el=((t*.12+hash(e*9))%1), ex=iw*hash(e*17)+Math.sin(t*1.5+e)*ih*.02+el*iw*.05, ey=ih*(1-el*.6); ctx.fillStyle='rgba(255,'+(140+(e%3)*30)+',60,'+(1-el)*.7+')'; ctx.fillRect(ex,ey,Math.max(1,ih*.0022),Math.max(1,ih*.0022)) }
  ctx.globalCompositeOperation='source-over';
  ctx.drawImage(L.vig,0,0);
  // film grain, offset per frame
  var gn=grain(), gx=-(Math.floor(t*24)*97%256), gy=-(Math.floor(t*24)*61%256); ctx.globalAlpha=.6; for(var yy=gy;yy<ih;yy+=256)for(var xx=gx;xx<iw;xx+=256)ctx.drawImage(gn,xx,yy); ctx.globalAlpha=1;
  ctx.restore() }

/* ---------- title ---------- */
function bakeTitle(text,W){ var fs=Math.round(W/ (text.length*.52)), Hh=Math.round(fs*1.75);
  return cached('title'+text+W,W,Hh,function(x,w,h){ x.textAlign='center'; x.textBaseline='alphabetic'; x.font='bold '+fs+'px '+FONT; var tw=x.measureText(text).width; if(tw>w*.94){ fs=Math.floor(fs*w*.94/tw); x.font='bold '+fs+'px '+FONT }
    var by=fs*1.02;
    // letter mask, stencil bridges cut, weathering
    var m=mk(w,h), mx=m.getContext('2d'); mx.textAlign='center'; mx.font=x.font; mx.fillStyle='#fff'; mx.fillText(text,w/2,by);
    mx.globalCompositeOperation='destination-out'; var cw=mx.measureText(text).width, x0=w/2-cw/2, acc=0;
    for(var i=0;i<text.length;i++){ var ch=text[i], chw=mx.measureText(ch).width; if('ABDOPQR08'.indexOf(ch)>=0){ var bx=x0+acc+chw*.5; mx.fillRect(bx-fs*.025,by-fs*.95,fs*.05,fs*1.1) } acc+=chw }
    var R=rng(17); for(var s=0;s<520;s++){ var r=R()*R()*fs*.018+.4; mx.globalAlpha=.35+R()*.5; mx.beginPath(); mx.arc(R()*w,by-R()*fs*.8,r,0,6.283); mx.fill() }
    for(var s2=0;s2<40;s2++){ var yy=by-R()*fs*.75; mx.globalAlpha=.6; mx.fillRect(R()*w,yy,R()*fs*.25,1) } mx.globalAlpha=1;
    // drop shadow
    x.globalAlpha=.75; x.filter&&(x.filter='blur('+Math.round(fs*.04)+'px)'); x.drawImage(m,fs*.05,fs*.06); x.filter&&(x.filter='none'); x.globalAlpha=1;
    // dark outline (stencil spray halo)
    x.save(); for(var o=0;o<8;o++){ var a=o*.785; x.globalAlpha=.9; x.drawImage(m,Math.cos(a)*fs*.03,Math.sin(a)*fs*.03) } x.globalCompositeOperation='source-in'; x.fillStyle=OUT; x.fillRect(0,0,w,h); x.restore();
    // paint: worn khaki-yellow, lit from top-left
    var p=mk(w,h), px=p.getContext('2d'); var g=px.createLinearGradient(0,by-fs,fs*.4,by); g.addColorStop(0,'#f6ecb8'); g.addColorStop(.5,'#e2cf86'); g.addColorStop(1,'#a8904a'); px.fillStyle=g; px.fillRect(0,0,w,h);
    var R2=rng(29); for(var n=0;n<1600;n++){ px.fillStyle=R2()<.5?'rgba(90,70,30,.18)':'rgba(255,250,220,.12)'; px.fillRect(R2()*w,R2()*h,1+R2()*2,1) }
    px.globalCompositeOperation='destination-in'; px.drawImage(m,0,0); x.drawImage(p,0,0);
    // overspray / soft edge highlight
    x.globalCompositeOperation='lighter'; x.globalAlpha=.08; x.drawImage(m,-1,-1); x.globalCompositeOperation='source-over'; x.globalAlpha=1;
    // subtitle bar: QUANG TRI · 1968 between rules
    var sf=Math.max(10,Math.round(fs*.2)), sy=by+fs*.42; x.font='bold '+sf+'px '+MONO; x.fillStyle='#e8c860'; var st='QUANG TRI  \u00b7  I CORPS  \u00b7  1968', sw=x.measureText(st).width;
    x.fillStyle='rgba(0,0,0,.55)'; x.fillText(st,w/2+1,sy+1); x.fillStyle='#e8c860'; x.fillText(st,w/2,sy);
    x.fillStyle='rgba(232,200,96,.7)'; x.fillRect(w/2-sw/2-fs*.9,sy-sf*.38,fs*.7,Math.max(1,sf*.12)); x.fillRect(w/2+sw/2+fs*.2,sy-sf*.38,fs*.7,Math.max(1,sf*.12)) }) }
function drawTitle(ctx,cx,y,width,t,text){ text=String(text||MENU_ART.titleText).toUpperCase(); var W=Math.max(200,Math.min(2400,Math.round(width||600))); var b=bakeTitle(text,W);
  var a=1; if(t!=null&&t<1.2)a=clamp(t/1.2,0,1); ctx.save(); ctx.globalAlpha*=a; ctx.drawImage(b,cx-W/2,y); ctx.restore(); return b.height }

/* ---------- ammo-crate button ---------- */
function bakeButton(w,h,label,state){ return cached('btn'+w+'x'+h+label+state,w+8,h+10,function(x){
  var press=state==='pressed', hov=state==='hover', dis=state==='disabled', oy=press?3:0;
  // shadow
  x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(4,6,w,h); x.translate(2,oy+1);
  // planks
  var R=rng(w*7+h*13+label.length), base=dis?[70,70,60]:hov?[118,110,62]:press?[78,74,40]:[98,92,50];
  var n=Math.max(2,Math.round(h/16)), ph=h/n;
  for(var i=0;i<n;i++){ var v=(R()-.5)*14, g=x.createLinearGradient(0,i*ph,0,(i+1)*ph); g.addColorStop(0,'rgb('+(base[0]+v+14)+','+(base[1]+v+12)+','+(base[2]+v+6)+')'); g.addColorStop(1,'rgb('+(base[0]+v-14)+','+(base[1]+v-14)+','+(base[2]+v-10)+')'); x.fillStyle=g; x.fillRect(0,i*ph,w,ph);
    x.strokeStyle='rgba(30,26,12,.25)'; x.lineWidth=1; for(var gI=0;gI<6;gI++){ var gy=i*ph+R()*ph; x.beginPath(); x.moveTo(0,gy); x.bezierCurveTo(w*.3,gy+(R()-.5)*3,w*.7,gy+(R()-.5)*3,w,gy+(R()-.5)*2); x.stroke() }
    x.fillStyle='rgba(18,16,8,.8)'; x.fillRect(0,(i+1)*ph-1,w,1) }
  // end cleats + steel strap
  var cl=Math.min(w*.08,h*.55); x.fillStyle='rgba(0,0,0,.22)'; x.fillRect(0,0,cl,h); x.fillRect(w-cl,0,cl,h); x.fillStyle='rgba(255,240,200,.08)'; x.fillRect(1,1,cl-2,2); x.fillRect(w-cl+1,1,cl-2,2);
  x.fillStyle='#3a3a34'; x.fillRect(cl*.35,0,Math.max(2,cl*.18),h); x.fillRect(w-cl*.53,0,Math.max(2,cl*.18),h); x.fillStyle='#8a8a7a';
  for(var k=0;k<2;k++){ x.fillRect(cl*.35+.5,h*.2+k*h*.55,1.5,1.5); x.fillRect(w-cl*.53+.5,h*.2+k*h*.55,1.5,1.5) }
  // light from top-left, outline
  var lg=x.createLinearGradient(0,0,w*.4,h); lg.addColorStop(0,'rgba(255,240,200,'+(hov?.22:.12)+')'); lg.addColorStop(1,'rgba(0,0,0,.18)'); x.fillStyle=lg; x.fillRect(0,0,w,h);
  x.strokeStyle=OUT; x.lineWidth=2; x.strokeRect(1,1,w-2,h-2); x.strokeStyle='rgba(255,240,200,.18)'; x.lineWidth=1; x.beginPath(); x.moveTo(3,h-3); x.lineTo(3,3); x.lineTo(w-3,3); x.stroke();
  // stencilled label, slightly worn
  var fs=Math.round(Math.min(h*.5,w/(Math.max(4,label.length)*.62))); x.font='bold '+fs+'px '+FONT; x.textAlign='center'; x.textBaseline='middle';
  var lm=mk(w,h), lx=lm.getContext('2d'); lx.font=x.font; lx.textAlign='center'; lx.textBaseline='middle'; lx.fillStyle=dis?'#8a8a7a':hov?'#fff4c8':'#ebe0b0'; lx.fillText(label.toUpperCase(),w/2,h/2+fs*.04);
  lx.globalCompositeOperation='destination-out'; var R3=rng(label.length*31+3); for(var s=0;s<w*h/90;s++){ lx.globalAlpha=R3()*.7; lx.fillRect(R3()*w,R3()*h,1+R3()*1.5,1) }
  x.fillStyle='rgba(0,0,0,.45)'; x.globalAlpha=.6; x.drawImage(lm,1,1); x.globalAlpha=1; x.drawImage(lm,0,0);
  if(hov){ x.strokeStyle='rgba(255,213,74,.85)'; x.lineWidth=2; x.strokeRect(-1,-1,w+2,h+2) }
  if(press){ x.fillStyle='rgba(0,0,0,.18)'; x.fillRect(0,0,w,h) } }) }
function drawButton(ctx,x,y,w,h,label,state){ w=Math.round(w); h=Math.round(h); var b=bakeButton(w,h,String(label||''),state||'normal'); ctx.drawImage(b,Math.round(x)-2,Math.round(y)-1) }

/* ---------- panel: OD canvas map case with plywood frame, stitched edge, steel corners, title plate ---------- */
function bakePanel(w,h,title){ return cached('pnl'+w+'x'+h+title,w,h,function(x){ var R=rng(w*3+h);
  x.fillStyle='rgba(0,0,0,.5)'; x.fillRect(4,5,w-4,h-5);
  var fw=Math.max(8,Math.round(Math.min(w,h)*.035)); // plywood frame
  var pg=x.createLinearGradient(0,0,w,h); pg.addColorStop(0,'#7a6440'); pg.addColorStop(1,'#4a3a22'); x.fillStyle=pg; x.fillRect(0,0,w-4,h-5);
  for(var i=0;i<60;i++){ x.strokeStyle='rgba(40,28,12,'+(.1+R()*.15)+')'; x.beginPath(); var yy=R()*h; x.moveTo(0,yy); x.bezierCurveTo(w*.3,yy+R()*6-3,w*.6,yy+R()*6-3,w,yy+R()*4-2); x.stroke() }
  // canvas field
  var ix=fw, iy=fw, iw=w-4-fw*2, ih=h-5-fw*2; var cg=x.createLinearGradient(ix,iy,ix+iw*.5,iy+ih); cg.addColorStop(0,'#3e4a2a'); cg.addColorStop(1,'#232a18'); x.fillStyle=cg; x.fillRect(ix,iy,iw,ih);
  x.globalAlpha=.08; x.fillStyle='#000'; for(var yy2=iy;yy2<iy+ih;yy2+=2)x.fillRect(ix,yy2,iw,1); for(var xx=ix;xx<ix+iw;xx+=2)x.fillRect(xx,iy,1,ih); x.globalAlpha=1;
  for(var n=0;n<iw*ih/60;n++){ x.fillStyle=R()<.5?'rgba(0,0,0,.08)':'rgba(255,255,220,.04)'; x.fillRect(ix+R()*iw,iy+R()*ih,2,2) }
  // stitching
  x.strokeStyle='rgba(200,190,140,.45)'; x.setLineDash([5,4]); x.lineWidth=1; x.strokeRect(ix+5.5,iy+5.5,iw-11,ih-11); x.setLineDash([]);
  x.strokeStyle='rgba(0,0,0,.5)'; x.lineWidth=2; x.strokeRect(ix+1,iy+1,iw-2,ih-2);
  // steel corners with rivets
  var cs=fw*2.2; x.fillStyle='#54564c'; [[0,0],[w-4-cs,0],[0,h-5-cs],[w-4-cs,h-5-cs]].forEach(function(p){ x.fillRect(p[0],p[1],cs,cs); x.fillStyle='rgba(255,255,240,.25)'; x.fillRect(p[0],p[1],cs,1.5); x.fillRect(p[0],p[1],1.5,cs); x.fillStyle='#9a9c90'; x.beginPath(); x.arc(p[0]+cs*.5,p[1]+cs*.5,Math.max(1.5,cs*.12),0,6.283); x.fill(); x.fillStyle='#54564c' });
  x.strokeStyle=OUT; x.lineWidth=2; x.strokeRect(1,1,w-6,h-7);
  if(title){ var fs=Math.max(12,Math.min(28,Math.round(w/(title.length*.9+6)))); x.font='bold '+fs+'px '+FONT; var tw=x.measureText(title).width+fs*1.6, tx=(w-4-tw)/2, th=fs*1.5;
    x.fillStyle='#c9bd8a'; x.fillRect(tx,fw*.5,tw,th); x.fillStyle='rgba(0,0,0,.25)'; x.fillRect(tx,fw*.5+th-2,tw,2); x.strokeStyle=OUT; x.lineWidth=1.5; x.strokeRect(tx+.5,fw*.5+.5,tw-1,th-1);
    x.fillStyle='#2a2418'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(title.toUpperCase(),w/2-2,fw*.5+th/2+1) } }) }
function drawPanel(ctx,x,y,w,h,title){ w=Math.round(w); h=Math.round(h); ctx.drawImage(bakePanel(w,h,title?String(title):''),Math.round(x),Math.round(y)) }

/* ---------- DOM skin: one call styles the HTML menu with the same art (9-slice border-image, no layout change) ---------- */
function installCSS(opts){ opts=opts||{}; if(typeof document==='undefined')return false;
  var st=document.getElementById('menuArtCSS'); if(st)st.remove();
  function url(c){ try{ return 'url('+c.toDataURL('image/png')+')' }catch(e){ return 'none' } }
  var bn=bakeButton(240,56,'','normal'), bh=bakeButton(240,56,'','hover'), bp=bakeButton(240,56,'','pressed'), pn=bakePanel(320,200,'');
  var css=''+
  '#menu button.btn,#over button.btn,#pause button.btn{background:transparent;border-style:solid;border-width:14px 22px 16px 22px;border-image:'+url(bn)+' 14 24 18 24 fill stretch;box-shadow:none;border-radius:0;color:#ebe0b0;text-shadow:1px 1px 0 rgba(0,0,0,.6);transition:transform .06s}'+
  '#menu button.btn:hover,#menu button.btn:focus-visible,#over button.btn:hover,#pause button.btn:hover{border-image:'+url(bh)+' 14 24 18 24 fill stretch;color:#fff4c8;outline:none}'+
  '#menu button.btn:active,#over button.btn:active,#pause button.btn:active{border-image:'+url(bp)+' 14 24 18 24 fill stretch;transform:translateY(2px)}'+
  '#menu .help,#menu .credits .crbody{background:transparent;border-style:solid;border-width:16px;border-image:'+url(pn)+' 24 fill stretch;border-radius:0}';
  if(opts.title!==false){ var tb=bakeTitle(String(opts.text||MENU_ART.titleText).toUpperCase(),900); css+='#menu h1{color:transparent;text-shadow:none;background:'+url(tb)+' center/contain no-repeat;width:min(900px,92vw);aspect-ratio:'+tb.width+'/'+tb.height+';font-size:0;line-height:0}#menu .sub{display:none}' }
  st=document.createElement('style'); st.id='menuArtCSS'; st.textContent=css; document.head.appendChild(st); return true }

function safe(fn,fb){ return function(){ try{ return fn.apply(null,arguments) }catch(e){ if(!safe.w){ safe.w=1; if(typeof console!=='undefined')console.warn('MENU_ART fallback',e) } try{ return fb&&fb.apply(null,arguments) }catch(e2){} } } }
var MENU_ART={titleText:'LAST BIRD OUT', version:'2026-10-14',
  drawBackground:safe(drawBackground,function(ctx,w,h){ var g=ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,'#1b2238'); g.addColorStop(.6,'#c4683c'); g.addColorStop(.61,'#141a14'); g.addColorStop(1,'#0a0c08'); ctx.fillStyle=g; ctx.fillRect(0,0,w,h) }),
  drawTitle:safe(drawTitle,function(ctx,cx,y,w,t,text){ ctx.save(); ctx.font='bold '+Math.round((w||600)/9)+'px '+FONT; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillStyle='#e8dfae'; ctx.fillText(String(text||MENU_ART.titleText).toUpperCase(),cx,y); ctx.restore() }),
  drawButton:safe(drawButton,function(ctx,x,y,w,h,label){ ctx.fillStyle='#4a6b2f'; ctx.fillRect(x,y,w,h); ctx.fillStyle='#f6f0cc'; ctx.font='bold '+Math.round(h*.45)+'px '+FONT; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(label||'').toUpperCase(),x+w/2,y+h/2) }),
  drawPanel:safe(drawPanel,function(ctx,x,y,w,h){ ctx.fillStyle='rgba(20,28,16,.9)'; ctx.fillRect(x,y,w,h); ctx.strokeStyle='#6f8f44'; ctx.strokeRect(x+.5,y+.5,w-1,h-1) }),
  installCSS:safe(installCSS,function(){ return false }),
  setPhoto:function(img,caption){ PHOTO=img?{img:img,caption:caption||null}:null },
  drawCaption:safe(drawCaption),
  prewarm:safe(function(w,h){ layers(w,h); heli(); grain(); for(var i=0;i<4;i++)puff(i) }),
  clearCache:function(){ C={}; Hcache={} } };
if(typeof window!=='undefined')window.MENU_ART=MENU_ART; if(typeof module!=='undefined')module.exports=MENU_ART;
})();
