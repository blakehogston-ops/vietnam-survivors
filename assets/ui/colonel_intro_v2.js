/* INTRO_V2: redrawn Colonel briefing for Last Bird Out. Artist Helper, 2026-10-14.
   Drop-in for the scene art of the existing launch briefing (index.html drawBriefScene). It does NOT touch audio or timing:
   the game keeps BRIEF_LINES, BVOX (audio/brief_01..08.mp3) and its page logic; INTRO_V2 only draws the picture for the current page.
   API:
     INTRO_V2.drawScene(ctx,x,y,w,h,s)  s={page:0..7, t:seconds since page start (BR.t), clipT:BVOX.el() or t, talking:bool, ph:BR.ph}
                                        draws a 16:9 scene into the rect (letterboxed inside if the rect is not 16:9). Includes pins + labels on map pages.
     INTRO_V2.setStill(page,img,caption?)  optional archival photo for a page (any page; best on 2,4,6). Ignored until img is decoded. null clears.
     INTRO_V2.mouth(page,clipT)          0..1 mouth opening from the real recording's envelope (25 Hz), used internally.
     INTRO_V2.SCENES / INTRO_V2.CLIPS    scene list and recorded clip lengths (s), for reference only.
     INTRO_V2.prewarmAsync(cb?)          bake every scene in small slices (one per 16 ms tick, ~14 ticks) while the menu is up. Recommended.
     INTRO_V2.prewarm()                  same, all at once (blocking; fine on a loading screen).
     INTRO_V2.reset()                    call at startBrief so the first page does not cross-fade from an old frame.
   Never throws; on any error it falls back to a plain dark room so the briefing keeps running. */
(function(){
'use strict';
var OUT='#1a1c12', IW=960, IH=540, MONO='"Courier New",Courier,monospace', FONT='Impact,Haettenschweiler,"Oswald","Arial Narrow Bold","Arial Black",sans-serif';
var ENV=["3998988523445568754310000000000026953422366455333654322121111000000000000000029973444455557720443135664201444444300", "1784139999987630699984102278777664310027999777667656655555545544443110145543444111332233201211145433200355432343322222100000000000000001297663227666666664000000000226554455332677787862000000000000046878875444100000000034444444444442000000000000006997766899853686765542100000000037997777889986666654444200000000057644445555413543335332100033344433332321", "18999777788887874377620188777544332100000000014555667777537999556889877788788776643044669976555543338787654332221366543120000000000000000268740699852103599998877312100000027899799842887521121100000489878988633788521013445889987886322210000001245455554433332221000", "264466644896532398740455665222999986542000010134247667996886665444210000000000000069978889789888999787410000000014664376753146656666666642256666686555432000000001356778766753167632456646644202444313444311221244433111234544432000345445531100", "276311379999972000100036422478999972001000000000004743332138999776655567655413667865410000000124656666657889779898877528987666665324666555555555311666545566776656666530000000000000001333444333455632145641354554445432211000", "28766541299999731127764412699987643221345445677667530000000114653111899887753115554444115666314445312433126555545533334555432100", "17766679865664159999887622787776655666564016667762000000000000577877765555554248677667766555544666888878776541000002455555444787666654565555543213666357666554433320000000000158999999962100002455654333222110000000000000012996057777987987666666741034444443235555655521000356422321", "09966786642144555678887875100000114776314999799989977898971248866542000000001222376413432165444322100"];
var CLIPS=[4.68,14.16,10.56,9.672,8.928,5.16,11.184,4.104];
var SCENES=[
 {id:'cocWide', line:1, desc:'Wide: sandbagged COC bunker, Col. Mercer beside the I Corps map board, flags, lantern'},
 {id:'mapIcorps', line:2, desc:'Map close-up: I Corps under acetate; grease-pencil rings walk Khe Sanh > Quang Tri > Hue > Da Nang', pins:[1,2,3,4]},
 {id:'trail', line:3, desc:'Cutaway (film frame): NVA column on a jungle trail at night under canopy, moonlight', still:true},
 {id:'colMed', line:4, desc:'Medium close-up: Col. Mercer, map board soft behind'},
 {id:'rainPaddy', line:5, desc:'Cutaway (film frame): Marines wading a paddy dike in monsoon rain', still:true},
 {id:'colClose', line:6, desc:'Close-up: Col. Mercer, US and Marine Corps flags behind'},
 {id:'lzDawn', line:7, desc:'Cutaway (film frame): fire team at a paddy LZ at dawn, Hueys inbound, arty smoke on the ridge', still:true, pins:[4,2]},
 {id:'colFinal', line:8, desc:'Close-up push-in: Col. Mercer, "Semper Fi", lantern light'}];
function mk(w,h){ var c=document.createElement('canvas'); c.width=Math.max(1,Math.ceil(w)); c.height=Math.max(1,Math.ceil(h)); return c }
function rng(s){ s=(s>>>0)||1; return function(){ s^=s<<13; s>>>=0; s^=s>>17; s^=s<<5; s>>>=0; return s/4294967296 } }
function hash(n){ n=(n*374761393+668265263)>>>0; n=((n^(n>>>13))*1274126177)>>>0; return ((n^(n>>>16))>>>0)/4294967296 }
function lerp(a,b,k){ return a+(b-a)*k } function clamp(v,a,b){ return v<a?a:v>b?b:v }
function ease(k){ k=clamp(k,0,1); return k*k*(3-2*k) }
var C={}; function cached(key,w,h,fn){ var c=C[key]; if(c)return c; c=mk(w,h); try{ fn(c.getContext('2d'),c.width,c.height) }catch(e){ console.warn('INTRO_V2 bake',key,e) } C[key]=c; return c }
function rad(x,cx,cy,r,stops){ var g=x.createRadialGradient(cx,cy,0,cx,cy,r); stops.forEach(function(s){ g.addColorStop(s[0],s[1]) }); return g }
function lin(x,x0,y0,x1,y1,stops){ var g=x.createLinearGradient(x0,y0,x1,y1); stops.forEach(function(s){ g.addColorStop(s[0],s[1]) }); return g }
function grain(){ return cached('grain',256,256,function(x){ var d=x.createImageData(256,256), R=rng(9); for(var i=0;i<d.data.length;i+=4){ var v=R()*255|0; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=R()<.55?18:0 } x.putImageData(d,0,0) }) }
function glow(col,r){ return cached('g'+col+r,r*2,r*2,function(x){ x.fillStyle=rad(x,r,r,r,[[0,col],[.3,col.replace(/[\d.]+\)$/,'0.35)')],[1,'rgba(0,0,0,0)']]); x.fillRect(0,0,r*2,r*2) }) }
function puff(k){ return cached('puff'+k,96,96,function(x){ var R=rng(91+k*13); for(var i=0;i<24;i++){ var a=R()*6.283,d=R()*24,px=48+Math.cos(a)*d,py=48+Math.sin(a)*d*.8,r=12+R()*18,v=Math.round(lerp(80,130,R())); x.fillStyle=rad(x,px,py,r,[[0,'rgba('+v+','+v+','+(v-4)+',.2)'],[1,'rgba('+v+','+v+','+v+',0)']]); x.beginPath(); x.arc(px,py,r,0,6.283); x.fill() } }) }

/* ================= COLONEL (painted, 400x520 portrait space; head centre ~ (200,170)) ================= */
var SK={hi:'#dcb296',mid:'#b8896c',lo:'#7e5842',dk:'#56392a',lip:'#8e5a4c'};
function bakeBody(x){ // OG-107 cotton sateen utility shirt, OD undershirt, collar eagles, USMC/EGA stencil on the left pocket
  x.save();
  // neck
  x.fillStyle=lin(x,170,0,236,0,[[0,SK.mid],[.5,SK.mid],[1,SK.lo]]); x.beginPath(); x.moveTo(156,216); x.lineTo(246,216); x.lineTo(252,300); x.lineTo(150,300); x.fill();
  x.fillStyle='rgba(60,30,20,.45)'; x.beginPath(); x.moveTo(166,228); x.quadraticCurveTo(200,262,238,226); x.lineTo(240,250); x.quadraticCurveTo(200,282,164,250); x.fill();
  // OD undershirt V
  x.fillStyle='#3e4428'; x.beginPath(); x.moveTo(158,282); x.quadraticCurveTo(200,300,244,282); x.lineTo(226,340); x.lineTo(176,340); x.fill();
  // shirt torso
  var sh=lin(x,20,260,380,520,[[0,'#7a8050'],[.45,'#5c6438'],[1,'#383e22']]); x.fillStyle=sh;
  x.beginPath(); x.moveTo(0,520); x.lineTo(6,380); x.quadraticCurveTo(14,318,74,296); x.lineTo(160,270); x.lineTo(200,360); x.lineTo(240,270); x.lineTo(326,296); x.quadraticCurveTo(388,318,396,380); x.lineTo(400,520); x.closePath(); x.fill();
  // collar points (open camp collar)
  x.fillStyle=lin(x,120,260,200,360,[[0,'#8a9060'],[1,'#5a6236']]);
  x.beginPath(); x.moveTo(160,262); x.lineTo(118,300); x.lineTo(150,350); x.lineTo(200,364); x.lineTo(178,300); x.closePath(); x.fill();
  x.fillStyle=lin(x,280,260,200,360,[[0,'#565e34'],[1,'#3c4224']]);
  x.beginPath(); x.moveTo(240,262); x.lineTo(284,300); x.lineTo(252,350); x.lineTo(200,364); x.lineTo(222,300); x.closePath(); x.fill();
  x.strokeStyle=OUT; x.lineWidth=2; [[160,262,118,300,150,350,200,364,178,300],[240,262,284,300,252,350,200,364,222,300]].forEach(function(p){ x.beginPath(); x.moveTo(p[0],p[1]); for(var i=2;i<p.length;i+=2)x.lineTo(p[i],p[i+1]); x.closePath(); x.stroke() });
  // colonel's eagles, both collar points (silver, eagle head to the wearer's front)
  function eagle(cx,cy,flip,lit){ x.save(); x.translate(cx,cy); x.scale(flip*1.25,1.25); x.rotate(-.35);
    x.fillStyle=lit?'#e8e8e0':'#a8a8a0'; x.beginPath(); x.moveTo(-15,-2); x.quadraticCurveTo(-8,-12,0,-6); x.quadraticCurveTo(8,-12,15,-2); x.lineTo(9,0); x.lineTo(4,8); x.lineTo(0,5); x.lineTo(-4,8); x.lineTo(-9,0); x.closePath(); x.fill();
    x.fillStyle=lit?'#ffffff':'#c8c8c0'; x.beginPath(); x.arc(5,-8,2.6,0,6.283); x.fill(); x.fillStyle='#6a6a64'; x.fillRect(-3,-3,6,6); x.strokeStyle='#4a4a44'; x.lineWidth=1; for(var k=-12;k<=12;k+=3){ x.beginPath(); x.moveTo(k,-4+Math.abs(k)*.15); x.lineTo(k*.8,1); x.stroke() } x.restore() }
  eagle(148,322,1,true); eagle(252,322,-1,false);
  // placket + buttons
  x.strokeStyle='rgba(20,24,10,.6)'; x.lineWidth=2; x.beginPath(); x.moveTo(200,364); x.lineTo(204,520); x.stroke();
  x.fillStyle='#2a2c1c'; for(var b=0;b<3;b++){ x.beginPath(); x.arc(212,400+b*48,4,0,6.283); x.fill() }
  // patch pockets with flaps
  function pocket(px,py,lit){ x.fillStyle=lit?'rgba(140,146,96,.35)':'rgba(30,34,18,.35)'; x.fillRect(px,py,86,96); x.strokeStyle='rgba(20,24,10,.7)'; x.lineWidth=2; x.strokeRect(px,py,86,96);
    x.fillStyle=lit?'#7a8050':'#454c2a'; x.beginPath(); x.moveTo(px-3,py-4); x.lineTo(px+89,py-4); x.lineTo(px+89,py+26); x.lineTo(px+43,py+32); x.lineTo(px-3,py+26); x.closePath(); x.fill(); x.stroke();
    x.fillStyle='#2a2c1c'; x.beginPath(); x.arc(px+43,py+22,4,0,6.283); x.fill(); x.strokeStyle='rgba(220,220,170,.12)'; x.setLineDash([3,3]); x.strokeRect(px+4,py+30,78,62); x.setLineDash([]) }
  pocket(250,402,false); pocket(64,402,true);
  // USMC + EGA stencil on the left breast pocket (wearer's left = viewer's right)
  x.fillStyle='rgba(16,18,10,.82)'; x.save(); x.translate(293,458); x.beginPath(); x.arc(0,-8,11,0,6.283); x.fill(); x.fillStyle='#5a6236'; x.beginPath(); x.arc(0,-8,7,0,6.283); x.fill(); x.fillStyle='rgba(16,18,10,.82)'; x.fillRect(-1.5,-22,3,26); x.fillRect(-9,0,18,3); x.beginPath(); x.moveTo(-10,-20); x.quadraticCurveTo(0,-30,10,-20); x.lineTo(0,-24); x.fill();
  x.font='bold 15px '+FONT; x.textAlign='center'; x.fillText('USMC',0,24); x.restore();
  // folds and seams
  x.strokeStyle='rgba(20,24,10,.35)'; x.lineWidth=3; [[90,300,120,380],[330,310,300,390],[40,420,70,520],[360,430,340,520],[150,370,170,430],[250,370,236,440]].forEach(function(f){ x.beginPath(); x.moveTo(f[0],f[1]); x.quadraticCurveTo((f[0]+f[2])/2+10,(f[1]+f[3])/2,f[2],f[3]); x.stroke() });
  x.strokeStyle='rgba(200,200,150,.14)'; x.lineWidth=2; [[80,310,110,370],[30,400,58,470]].forEach(function(f){ x.beginPath(); x.moveTo(f[0],f[1]); x.lineTo(f[2],f[3]); x.stroke() });
  // shoulder seams
  x.strokeStyle='rgba(20,24,10,.55)'; x.lineWidth=2; x.beginPath(); x.moveTo(74,296); x.quadraticCurveTo(52,380,60,520); x.moveTo(326,296); x.quadraticCurveTo(348,380,340,520); x.stroke();
  // outline
  x.strokeStyle=OUT; x.lineWidth=3; x.beginPath(); x.moveTo(0,520); x.lineTo(6,380); x.quadraticCurveTo(14,318,74,296); x.lineTo(160,270); x.moveTo(240,270); x.lineTo(326,296); x.quadraticCurveTo(388,318,396,380); x.lineTo(400,520); x.stroke();
  x.restore() }
function headPath(x){ x.beginPath(); x.moveTo(132,120); x.bezierCurveTo(128,60,170,36,202,36); x.bezierCurveTo(240,36,274,62,270,124); x.bezierCurveTo(272,170,264,212,240,238); x.bezierCurveTo(226,254,212,262,200,262); x.bezierCurveTo(186,262,170,254,158,238); x.bezierCurveTo(138,212,130,170,132,120); x.closePath() }
function bakeHead(x,mouth,blink){ x.save();
  // ears
  [[134,150,-1],[268,150,1]].forEach(function(e){ x.fillStyle=e[2]<0?SK.mid:SK.lo; x.beginPath(); x.ellipse(e[0],e[1],13,24,e[2]*.15,0,6.283); x.fill(); x.strokeStyle=OUT; x.lineWidth=2; x.stroke(); x.strokeStyle='rgba(80,40,25,.6)'; x.beginPath(); x.ellipse(e[0]+e[2]*-2,e[1],6,14,0,-1.5,1.5); x.stroke() });
  // skull/face base: light from top-left
  headPath(x); x.fillStyle=rad(x,172,110,190,[[0,SK.hi],[.45,SK.mid],[.85,SK.lo],[1,SK.dk]]); x.fill();
  x.save(); headPath(x); x.clip();
  // core shadow down the right side, cheek planes
  x.fillStyle=lin(x,200,0,276,0,[[0,'rgba(80,40,25,0)'],[.6,'rgba(80,40,25,.35)'],[1,'rgba(60,30,20,.6)']]); x.fillRect(150,30,140,240);
  x.fillStyle='rgba(255,220,190,.18)'; x.beginPath(); x.ellipse(170,170,20,28,-.2,0,6.283); x.fill();
  // beard shadow / jowls (late-40s colonel)
  x.fillStyle='rgba(70,60,60,.16)'; x.beginPath(); x.moveTo(150,190); x.quadraticCurveTo(200,286,252,190); x.quadraticCurveTo(250,240,200,262); x.quadraticCurveTo(152,240,150,190); x.fill();
  // hair: grey high-and-tight. Sides clipped to stubble, flat short top
  x.fillStyle='rgba(120,116,110,.55)'; x.beginPath(); x.moveTo(128,140); x.bezierCurveTo(128,60,168,32,202,32); x.bezierCurveTo(240,32,276,60,274,140); x.lineTo(262,136); x.bezierCurveTo(262,90,236,64,202,64); x.bezierCurveTo(168,64,142,90,140,136); x.fill();
  var R=rng(4); for(var i=0;i<500;i++){ var hx=140+R()*124, hy=30+R()*44+(Math.abs(hx-202)/62)*20; x.fillStyle=R()<.5?'rgba(200,198,190,.5)':'rgba(70,68,64,.5)'; x.fillRect(hx,hy,1.5,2.5) }
  x.fillStyle=lin(x,150,30,250,80,[[0,'#cfccc4'],[.5,'#9a9790'],[1,'#5e5c58']]); x.beginPath(); x.moveTo(146,82); x.bezierCurveTo(154,40,184,30,202,30); x.bezierCurveTo(226,30,252,42,258,82); x.bezierCurveTo(236,68,170,68,146,82); x.fill();
  // forehead lines
  x.strokeStyle='rgba(110,60,40,.35)'; x.lineWidth=1.5; for(var l=0;l<3;l++){ x.beginPath(); x.moveTo(168,94+l*8); x.quadraticCurveTo(202,88+l*8,236,94+l*8); x.stroke() }
  x.restore();
  // brow ridge + brows (heavy, grey-brown)
  x.fillStyle='rgba(90,50,35,.35)'; x.beginPath(); x.ellipse(176,136,24,9,0,0,6.283); x.ellipse(228,136,24,9,0,0,6.283); x.fill();
  x.strokeStyle='#5a5450'; x.lineCap='round'; x.lineWidth=7; x.beginPath(); x.moveTo(154,126); x.quadraticCurveTo(174,116,194,124); x.moveTo(210,124); x.quadraticCurveTo(232,116,250,126); x.stroke();
  x.strokeStyle='rgba(200,196,190,.5)'; x.lineWidth=2; x.beginPath(); x.moveTo(158,123); x.quadraticCurveTo(174,116,190,121); x.stroke();
  // eye sockets
  x.fillStyle='rgba(70,35,22,.35)'; x.beginPath(); x.ellipse(176,146,20,11,0,0,6.283); x.ellipse(228,146,20,11,0,0,6.283); x.fill();
  [[176,146],[228,146]].forEach(function(e,i){
    if(blink){ x.strokeStyle='#3a2216'; x.lineWidth=3; x.beginPath(); x.moveTo(e[0]-13,e[1]); x.quadraticCurveTo(e[0],e[1]+5,e[0]+13,e[1]); x.stroke(); return }
    x.fillStyle=i?'#c8bcb0':'#ebe2d6'; x.beginPath(); x.moveTo(e[0]-13,e[1]); x.quadraticCurveTo(e[0],e[1]-8,e[0]+13,e[1]); x.quadraticCurveTo(e[0],e[1]+6,e[0]-13,e[1]); x.fill();
    x.fillStyle='#4e6672'; x.beginPath(); x.arc(e[0]+1,e[1]-.5,5.2,0,6.283); x.fill(); x.fillStyle='#141414'; x.beginPath(); x.arc(e[0]+1,e[1]-.5,2.4,0,6.283); x.fill();
    x.fillStyle='#fff'; x.fillRect(e[0]-1.5,e[1]-3.5,2,2);
    x.strokeStyle='#2a1810'; x.lineWidth=2.5; x.beginPath(); x.moveTo(e[0]-14,e[1]+1); x.quadraticCurveTo(e[0],e[1]-10,e[0]+14,e[1]); x.stroke();
    x.strokeStyle='rgba(90,50,35,.5)'; x.lineWidth=1.2; x.beginPath(); x.moveTo(e[0]-11,e[1]+6); x.quadraticCurveTo(e[0],e[1]+10,e[0]+11,e[1]+5); x.stroke() });
  // crow's feet
  x.strokeStyle='rgba(100,55,38,.45)'; x.lineWidth=1.2; [[152,146,-1],[252,146,1]].forEach(function(c){ for(var k=-1;k<=1;k++){ x.beginPath(); x.moveTo(c[0],c[1]+k*4); x.lineTo(c[0]+c[2]*9,c[1]+k*7); x.stroke() } });
  // nose: bridge highlight, right-side shadow, nostrils
  x.fillStyle='rgba(255,226,196,.35)'; x.beginPath(); x.moveTo(198,140); x.lineTo(204,140); x.lineTo(206,184); x.lineTo(196,184); x.fill();
  x.fillStyle='rgba(80,40,25,.42)'; x.beginPath(); x.moveTo(208,142); x.quadraticCurveTo(222,170,222,192); x.quadraticCurveTo(212,198,206,194); x.lineTo(206,150); x.fill();
  x.fillStyle=SK.mid; x.beginPath(); x.ellipse(201,190,15,10,0,0,6.283); x.fill(); x.fillStyle='rgba(255,220,190,.35)'; x.beginPath(); x.ellipse(196,186,6,4,0,0,6.283); x.fill();
  x.fillStyle='#4a2418'; x.beginPath(); x.ellipse(193,197,4,2.4,.3,0,6.283); x.ellipse(210,197,4,2.4,-.3,0,6.283); x.fill();
  // nasolabial folds
  x.strokeStyle='rgba(90,48,32,.5)'; x.lineWidth=2; x.beginPath(); x.moveTo(186,196); x.quadraticCurveTo(170,212,174,232); x.moveTo(218,196); x.quadraticCurveTo(234,212,230,232); x.stroke();
  // mouth (0 closed, 1 slight, 2 open, 3 wide)
  var my=222, ow=[0,4,9,14][mouth], mw=[22,21,19,18][mouth];
  x.fillStyle='rgba(120,70,55,.35)'; x.beginPath(); x.ellipse(202,my+ow*.5+10,mw*.7,4,0,0,6.283); x.fill(); // under-lip shadow
  if(mouth===0){ x.strokeStyle='#4a2418'; x.lineWidth=3; x.beginPath(); x.moveTo(202-mw,my+1); x.quadraticCurveTo(202,my-2,202+mw,my+1); x.stroke(); x.strokeStyle=SK.lip; x.lineWidth=2; x.beginPath(); x.moveTo(202-mw*.7,my+5); x.quadraticCurveTo(202,my+8,202+mw*.7,my+5); x.stroke() }
  else { x.fillStyle='#2a0e0a'; x.beginPath(); x.moveTo(202-mw,my); x.quadraticCurveTo(202,my-3-ow*.15,202+mw,my); x.quadraticCurveTo(202,my+ow*1.15,202-mw,my); x.fill();
    if(mouth>=2){ x.fillStyle='#d8d0c0'; x.beginPath(); x.moveTo(202-mw*.7,my-1); x.quadraticCurveTo(202,my-3,202+mw*.7,my-1); x.lineTo(202+mw*.6,my+2.5); x.quadraticCurveTo(202,my+1,202-mw*.6,my+2.5); x.fill() }
    if(mouth>=3){ x.fillStyle='#8a3a30'; x.beginPath(); x.ellipse(202,my+ow*.75,mw*.45,3,0,0,6.283); x.fill() }
    x.strokeStyle=SK.lip; x.lineWidth=3; x.beginPath(); x.moveTo(202-mw,my); x.quadraticCurveTo(202,my+ow*1.25+3,202+mw,my); x.stroke();
    x.strokeStyle='#4a2418'; x.lineWidth=2; x.beginPath(); x.moveTo(202-mw,my); x.quadraticCurveTo(202,my-3-ow*.15,202+mw,my); x.stroke() }
  // chin cleft + jaw outline
  x.strokeStyle='rgba(90,48,32,.35)'; x.lineWidth=1.5; x.beginPath(); x.moveTo(202,248); x.lineTo(202,256); x.stroke();
  headPath(x); x.strokeStyle=OUT; x.lineWidth=3; x.stroke();
  x.restore() }
function colonelParts(){ if(C.colOK)return C.col; var p={body:cached('cbody',400,520,bakeBody),heads:[]}; for(var m=0;m<4;m++){ p.heads.push([cached('ch'+m+'0',400,300,function(x){ bakeHead(x,m,false) }),cached('ch'+m+'1',400,300,function(x){ bakeHead(x,m,true) })]) } C.col=p; C.colOK=1; return p }
function mouthLevel(page,ct){ var e=ENV[page]; if(!e||ct<0)return 0; var f=ct*25, i=Math.floor(f); if(i>=e.length-1)return 0; var a=(e.charCodeAt(i)-48)/9, b=(e.charCodeAt(i+1)-48)/9; return lerp(a,b,f-i) }
/* draw colonel: x,y = top-left of the 400x520 portrait space, sc = scale */
function drawColonel(c,x,y,sc,S){ var P=colonelParts(), t=S.t, m=0;
  var lvl=S.useEnv?mouthLevel(S.page,S.clipT):(S.talking?(.5+.5*Math.sin(t*15))*(.6+.4*Math.sin(t*3.7)):0);
  if(S.talking||S.useEnv){ m=lvl>.62?3:lvl>.38?2:lvl>.14?1:0 }
  var bl=((t+S.page*1.7)%4.3)<.13?1:0, bob=Math.sin(t*1.1)*2.2+(m?lvl*1.5:0), tilt=Math.sin(t*.7)*.012+(m?Math.sin(t*2.3)*.01:0), breath=Math.sin(t*1.6)*1.4;
  c.save(); c.translate(x,y); c.scale(sc,sc);
  c.drawImage(P.body,0,breath*.4);
  c.save(); c.translate(200,250+bob*.3); c.rotate(tilt); c.translate(-200,-250); c.translate(200,0); c.scale(1.13,1.03); c.translate(-200,0); c.drawImage(P.heads[m][bl],0,bob-6); c.restore();
  c.restore() }

/* ================= ROOM: sandbagged COC bunker ================= */
function sandbag(x,px,py,bw,bh,lit){ x.fillStyle=rad(x,px-bw*.2,py-bh*.3,bw*.7,[[0,'rgba(170,150,100,'+lit+')'],[.6,'rgba(110,96,62,'+lit+')'],[1,'rgba(58,50,32,'+lit+')']]); x.beginPath(); x.ellipse(px,py,bw/2,bh/2,0,0,6.283); x.fill(); x.strokeStyle=OUT; x.lineWidth=1.5; x.stroke(); x.strokeStyle='rgba(40,34,20,.5)'; x.lineWidth=1; x.beginPath(); x.moveTo(px+bw*.32,py-bh*.38); x.quadraticCurveTo(px+bw*.36,py,px+bw*.3,py+bh*.38); x.stroke() }
function flag(x,px,py,w,h,us){ // hanging flag with folds
  var R=rng(us?3:5); x.save(); x.translate(px,py);
  if(us){ for(var i=0;i<13;i++){ x.fillStyle=i%2?'#e8e4d8':'#9a2030'; x.fillRect(0,i*h/13,w,h/13+.5) } x.fillStyle='#2a2e5a'; x.fillRect(0,0,w*.42,h*7/13); x.fillStyle='#e8e4d8'; for(var r=0;r<9;r++)for(var k=0;k<(r%2?5:6);k++){ x.fillRect((r%2?w*.07:w*.035)+k*w*.07,h*.035+r*h*.058,1.6,1.6) } }
  else { x.fillStyle='#9a1a28'; x.fillRect(0,0,w,h); x.fillStyle='#d8b040'; x.save(); x.translate(w/2,h*.46); x.beginPath(); x.arc(0,0,h*.16,0,6.283); x.fill(); x.fillStyle='#9a1a28'; x.beginPath(); x.arc(0,0,h*.11,0,6.283); x.fill(); x.fillStyle='#d8b040'; x.fillRect(-1.5,-h*.25,3,h*.42); x.fillRect(-h*.12,h*.12,h*.24,3); x.beginPath(); x.moveTo(-h*.16,-h*.2); x.quadraticCurveTo(0,-h*.34,h*.16,-h*.2); x.lineTo(0,-h*.25); x.fill(); x.restore();
    x.font='bold '+Math.round(h*.075)+'px '+MONO; x.textAlign='center'; x.fillText('UNITED STATES MARINE CORPS',w/2,h*.86) }
  // folds: vertical shading bands
  for(var f=0;f<w;f+=w/7){ x.fillStyle=lin(x,f,0,f+w/7,0,[[0,'rgba(0,0,0,.28)'],[.5,'rgba(255,255,255,.08)'],[1,'rgba(0,0,0,.28)']]); x.fillRect(f,0,w/7,h) }
  x.fillStyle='#c8a040'; for(var g=0;g<h;g+=3)x.fillRect(w,g,3,2); x.strokeStyle=OUT; x.lineWidth=1.5; x.strokeRect(0,0,w,h);
  x.restore() }
/* I Corps map: lon 105.9..109.3, lat 14.4..17.5 */
var GEO={coast:[[17.5,106.45],[17.25,106.85],[17.05,107.05],[16.9,107.18],[16.72,107.35],[16.56,107.64],[16.4,107.85],[16.25,108.05],[16.2,108.15],[16.08,108.24],[15.95,108.32],[15.88,108.4],[15.57,108.6],[15.4,108.78],[15.15,108.88],[14.9,108.98],[14.6,109.05],[14.4,109.1]],
  laos:[[17.5,105.95],[17.1,106.35],[16.85,106.45],[16.6,106.55],[16.35,106.85],[16.15,107.15],[15.85,107.4],[15.6,107.5],[15.35,107.6],[15.0,107.7],[14.6,107.65],[14.4,107.6]],
  dmz:[[17.03,106.35],[17.02,106.7],[17.0,107.06]], rt9:[[16.82,107.1],[16.74,106.95],[16.68,106.8],[16.63,106.73],[16.62,106.6]],
  rt1:[[17.2,106.95],[16.82,107.1],[16.75,107.19],[16.46,107.59],[16.2,108.1],[16.05,108.2],[15.57,108.48],[15.12,108.8],[14.5,108.95]],
  provs:[[16.55,106.5,16.85,107.45],[16.15,107.0,16.35,107.95],[15.45,107.5,15.75,108.7],[15.05,107.65,15.15,108.85]],
  pins:{1:[16.65,106.73,'KHE SANH'],2:[16.75,107.19,'QUANG TRI'],3:[16.46,107.59,'HUE'],4:[16.05,108.2,'DA NANG'],0:[17.4,106.2,'HANOI \u2191'],5:[14.45,107.75,'IA DRANG \u2193'],6:[14.42,108.6,'SAIGON \u2193']},
  towns:[[16.82,107.1,'Dong Ha'],[16.9,107.0,'Con Thien'],[16.12,107.75,'Phu Bai'],[15.4,108.7,'Chu Lai'],[15.12,108.8,'Quang Ngai'],[15.88,108.33,'Hoi An'],[16.7,106.6,'Lang Vei']]};
function geo(lat,lon,w,h){ return [ (lon-105.9)/3.4*w, (17.5-lat)/3.1*h ] }
function bakeMap(x,w,h){ var R=rng(12);
  x.fillStyle=lin(x,0,0,w,h,[[0,'#e2d6a8'],[1,'#c4b480']]); x.fillRect(0,0,w,h);
  for(var i=0;i<w*h/30;i++){ x.fillStyle=R()<.5?'rgba(120,100,50,.06)':'rgba(255,255,240,.06)'; x.fillRect(R()*w,R()*h,2,2) }
  function poly(pts,close){ x.beginPath(); pts.forEach(function(p,i){ var q=geo(p[0],p[1],w,h); i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]) }); if(close)x.closePath() }
  // sea
  x.beginPath(); GEO.coast.forEach(function(p,i){ var q=geo(p[0],p[1],w,h); i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]) }); x.lineTo(w,h); x.lineTo(w,0); x.closePath(); x.fillStyle='#9cb8b4'; x.fill();
  x.strokeStyle='rgba(60,90,100,.35)'; x.lineWidth=1; for(var k=1;k<5;k++){ x.save(); x.translate(k*6,k*2); poly(GEO.coast); x.stroke(); x.restore() }
  // Laos (grey)
  x.beginPath(); GEO.laos.forEach(function(p,i){ var q=geo(p[0],p[1],w,h); i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]) }); x.lineTo(0,h); x.lineTo(0,0); x.closePath(); x.fillStyle='rgba(150,140,120,.45)'; x.fill();
  // highland relief: hachures + green tint west of the coastal plain
  for(var j=0;j<2600;j++){ var la=14.4+R()*3.1, lo=106.3+R()*2.2, q=geo(la,lo,w,h), coastLon=108.0-(la-14.4)*.3; if(lo>coastLon-.35)continue; x.strokeStyle='rgba(110,90,50,'+(.15+R()*.2)+')'; x.lineWidth=1; x.beginPath(); x.moveTo(q[0],q[1]); x.lineTo(q[0]+3,q[1]+2); x.stroke() }
  x.fillStyle='rgba(110,140,70,.18)'; x.fillRect(0,0,w,h);
  // grid
  x.strokeStyle='rgba(40,60,100,.25)'; x.lineWidth=1; for(var gx=0;gx<w;gx+=w/12){ x.beginPath(); x.moveTo(gx,0); x.lineTo(gx,h); x.stroke() } for(var gy=0;gy<h;gy+=h/11){ x.beginPath(); x.moveTo(0,gy); x.lineTo(w,gy); x.stroke() }
  // coast + border ink
  x.strokeStyle='#33463e'; x.lineWidth=2; poly(GEO.coast); x.stroke(); x.setLineDash([8,3,2,3]); x.strokeStyle='#5a3a2a'; poly(GEO.laos); x.stroke(); x.setLineDash([]);
  x.strokeStyle='rgba(90,40,30,.45)'; x.setLineDash([4,4]); GEO.provs.forEach(function(p){ var a=geo(p[0],p[1],w,h), b=geo(p[2],p[3],w,h); x.beginPath(); x.moveTo(a[0],a[1]); x.lineTo(b[0],b[1]); x.stroke() }); x.setLineDash([]);
  // roads
  x.strokeStyle='#8a2a20'; x.lineWidth=2; poly(GEO.rt1); x.stroke(); poly(GEO.rt9); x.stroke();
  // DMZ band
  x.strokeStyle='rgba(200,40,30,.75)'; x.lineWidth=7; x.globalAlpha=.4; poly(GEO.dmz); x.stroke(); x.globalAlpha=1; x.lineWidth=1.5; poly(GEO.dmz); x.stroke();
  x.fillStyle='#2a2418'; x.font='bold 13px '+MONO; x.textAlign='left';
  var q=geo(17.12,106.5,w,h); x.fillText('DMZ \u00b7 BEN HAI',q[0],q[1]);
  q=geo(16.0,106.1,w,h); x.fillText('L A O S',q[0],q[1]); q=geo(15.8,108.9,w,h); x.fillText('SOUTH CHINA SEA',q[0]-10,q[1]+30);
  x.font='11px '+MONO; GEO.towns.forEach(function(tn){ var p=geo(tn[0],tn[1],w,h); x.fillStyle='#2a2418'; x.fillRect(p[0]-2,p[1]-2,4,4); x.fillText(tn[2],p[0]+5,p[1]+4) });
  q=geo(16.3,108.5,w,h); x.fillStyle='rgba(42,36,24,.8)'; x.font='bold 12px '+MONO; x.fillText('RTE 1',q[0]-40,q[1]-70); q=geo(16.78,106.85,w,h); x.fillText('RTE 9',q[0],q[1]-6);
  // title block
  x.fillStyle='rgba(240,232,200,.9)'; x.fillRect(w-230,h-74,214,60); x.strokeStyle='#2a2418'; x.lineWidth=1.5; x.strokeRect(w-230,h-74,214,60);
  x.fillStyle='#2a2418'; x.font='bold 13px '+MONO; x.fillText('I CORPS TACTICAL ZONE',w-222,h-54); x.font='11px '+MONO; x.fillText('SERIES L7014  1:250,000',w-222,h-38); x.fillText('III MAF  \u00b7  1968',w-222,h-23);
  // grease-pencil unit symbols (blue friendly boxes, red enemy)
  [[16.68,106.75],[16.8,107.05],[16.45,107.62],[16.06,108.18],[15.42,108.68]].forEach(function(p){ var a=geo(p[0],p[1],w,h); x.strokeStyle='rgba(30,60,160,.75)'; x.lineWidth=2; x.strokeRect(a[0]-13,a[1]-26,22,14); x.beginPath(); x.moveTo(a[0]-13,a[1]-26); x.lineTo(a[0]+9,a[1]-12); x.moveTo(a[0]+9,a[1]-26); x.lineTo(a[0]-13,a[1]-12); x.stroke() });
  x.strokeStyle='rgba(190,30,20,.7)'; x.lineWidth=2.5; [[16.95,106.6],[16.5,106.75],[16.35,107.3]].forEach(function(p){ var a=geo(p[0],p[1],w,h); x.beginPath(); x.moveTo(a[0]-10,a[1]); x.lineTo(a[0],a[1]-12); x.lineTo(a[0]+10,a[1]); x.lineTo(a[0],a[1]+12); x.closePath(); x.stroke() });
  x.strokeStyle='rgba(190,30,20,.55)'; x.lineWidth=3; x.beginPath(); var s0=geo(17.2,106.2,w,h), s1=geo(16.75,106.65,w,h); x.moveTo(s0[0],s0[1]); x.quadraticCurveTo(s0[0]+10,s1[1]-20,s1[0],s1[1]); x.stroke(); x.beginPath(); x.moveTo(s1[0],s1[1]); x.lineTo(s1[0]-14,s1[1]-4); x.moveTo(s1[0],s1[1]); x.lineTo(s1[0]-4,s1[1]-14); x.stroke();
  // acetate sheen, taped corners
  x.fillStyle=lin(x,0,0,w,h,[[0,'rgba(255,255,255,.12)'],[.35,'rgba(255,255,255,0)'],[.55,'rgba(255,255,255,.07)'],[.6,'rgba(255,255,255,0)']]); x.fillRect(0,0,w,h);
  x.fillStyle='rgba(200,190,150,.75)'; [[0,0,.6],[w,0,-.6],[0,h,-.6],[w,h,.6]].forEach(function(p){ x.save(); x.translate(p[0],p[1]); x.rotate(p[2]); x.fillRect(-26,-8,52,16); x.restore() });
  x.strokeStyle=OUT; x.lineWidth=3; x.strokeRect(1.5,1.5,w-3,h-3) }
function mapCanvas(){ return cached('map',860,780,bakeMap) }
function pinXY(k,w,h){ var p=GEO.pins[k]; if(!p)return null; var q=geo(p[0],p[1],w,h); return [clamp(q[0],18,w-18),clamp(q[1],18,h-18),p[2]] }
function bakeRoom(x,w,h){ var R=rng(21);
  // back wall: sandbags
  x.fillStyle='#2a2418'; x.fillRect(0,0,w,h);
  var bw=64,bh=30; for(var r=0;r<Math.ceil(h/(bh*.8))+1;r++){ var y=r*bh*.8, off=(r%2)*bw*.5; for(var px=-off;px<w+bw;px+=bw*.97){ var lit=clamp(1-Math.hypot(px-w*.45,y-h*.25)/(w*.75),.25,1); sandbag(x,px,y,bw,bh,lit) } }
  // timber posts and header beam
  function post(px){ x.fillStyle=lin(x,px,0,px+34,0,[[0,'#6a4a2a'],[.4,'#4e3420'],[1,'#2a1c10']]); x.fillRect(px,0,34,h); x.strokeStyle=OUT; x.lineWidth=2; x.strokeRect(px,0,34,h); for(var g=0;g<14;g++){ x.strokeStyle='rgba(20,12,4,.35)'; x.beginPath(); var gx=px+4+R()*26; x.moveTo(gx,0); x.lineTo(gx+R()*3-1.5,h); x.stroke() } }
  post(24); post(w-60);
  x.fillStyle=lin(x,0,0,0,40,[[0,'#5a3e22'],[1,'#2a1c10']]); x.fillRect(0,0,w,40); x.strokeStyle=OUT; x.strokeRect(0,0,w,40);
  // PSP / plank ceiling shadow
  x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(0,40,w,10);
  // floor: duckboards
  var fy=h*.86; x.fillStyle='#2e2416'; x.fillRect(0,fy,w,h-fy); for(var p=0;p<w;p+=28){ x.fillStyle=p%56?'#3a2c1a':'#34281a'; x.fillRect(p,fy+4,24,h-fy); }
  // overall dim + warm key from the lantern (upper left)
  x.fillStyle=rad(x,w*.32,h*.16,w*.85,[[0,'rgba(255,200,120,.18)'],[.5,'rgba(0,0,0,.2)'],[1,'rgba(0,0,0,.7)']]); x.fillRect(0,0,w,h) }
function roomCanvas(){ return cached('room',IW,IH,bakeRoom) }
function bakeDesk(x,w,h){ // field desk, EE-8 phone, PRC-25, coffee canteen cup, papers
  x.fillStyle=lin(x,0,0,0,h,[[0,'#5a4a2e'],[1,'#2a2214']]); x.fillRect(0,40,w,h-40); x.fillStyle='#6a5836'; x.fillRect(0,34,w,10); x.strokeStyle=OUT; x.lineWidth=2; x.strokeRect(1,34,w-2,h-35);
  // PRC-25
  x.fillStyle=lin(x,20,0,110,0,[[0,'#5e6640'],[1,'#3a4024']]); x.fillRect(20,-40,90,76); x.strokeRect(20,-40,90,76); x.fillStyle='#2a2c1c'; x.fillRect(30,-34,70,20); x.fillStyle='#c8c0a0'; x.font='bold 9px '+MONO; x.fillText('RT-505/PRC-25',32,-22); x.fillStyle='#1a1a14'; [44,70,92].forEach(function(k){ x.beginPath(); x.arc(k,-2,6,0,6.283); x.fill() }); x.strokeStyle='#1a1a14'; x.lineWidth=2; x.beginPath(); x.moveTo(100,-40); x.lineTo(112,-150); x.stroke();
  // handset on its cord
  x.fillStyle='#1e1e18'; x.fillRect(120,10,40,12); x.beginPath(); x.arc(122,16,9,0,6.283); x.arc(158,16,9,0,6.283); x.fill(); x.strokeStyle='#1e1e18'; x.lineWidth=2; x.beginPath(); for(var k=0;k<10;k++){ x.arc(112-k*3,22+k*1.5,3,0,6.283) } x.stroke();
  // EE-8 in leather case
  x.fillStyle=lin(x,190,0,260,0,[[0,'#7a5432'],[1,'#4a301a']]); x.fillRect(190,-14,70,50); x.strokeStyle=OUT; x.strokeRect(190,-14,70,50); x.fillStyle='#1a1a14'; x.fillRect(196,-26,58,10); x.beginPath(); x.arc(198,-21,7,0,6.283); x.arc(252,-21,7,0,6.283); x.fill();
  // papers + canteen cup
  x.save(); x.translate(300,20); x.rotate(-.06); x.fillStyle='#e0d8b8'; x.fillRect(0,0,110,22); x.fillStyle='rgba(40,40,40,.5)'; for(var l=0;l<4;l++)x.fillRect(8,5+l*4,80-l*9,1); x.restore();
  x.fillStyle='#6a7050'; x.fillRect(430,0,36,36); x.strokeStyle=OUT; x.strokeRect(430,0,36,36); x.fillStyle='#3a3020'; x.fillRect(434,2,28,5); x.strokeStyle='#4a5034'; x.lineWidth=4; x.beginPath(); x.moveTo(466,8); x.lineTo(486,8); x.stroke() }
function deskCanvas(){ return cached('desk',520,190,function(x,w,h){ x.translate(0,150); bakeDesk(x,w,40) }) }
function lantern(c,x,y,s,t){ var fl=.85+.08*Math.sin(t*13)+.07*Math.sin(t*5.3); c.save(); c.translate(x,y); c.scale(s,s);
  c.strokeStyle='#1a1a14'; c.lineWidth=2; c.beginPath(); c.moveTo(0,-80); c.lineTo(0,-30); c.stroke();
  c.fillStyle='#2a3a28'; c.beginPath(); c.moveTo(-20,-30); c.lineTo(20,-30); c.lineTo(14,-20); c.lineTo(-14,-20); c.fill(); c.fillStyle='rgba(255,236,190,'+(.75*fl)+')'; c.beginPath(); c.ellipse(0,0,14,20,0,0,6.283); c.fill(); c.fillStyle='#fff8e0'; c.beginPath(); c.ellipse(0,2,5,8,0,0,6.283); c.fill();
  c.fillStyle='#2a3a28'; c.fillRect(-16,20,32,14); c.restore();
  c.save(); c.globalCompositeOperation='lighter'; c.globalAlpha=.45*fl; var g=glow('rgba(255,190,110,1)',96); c.drawImage(g,x-260*s,y-260*s,520*s,520*s); c.restore() }

/* ================= film-frame cutaways (drawn; replaced by archival stills when set) ================= */
function grunt(x,px,py,s,R,nva){ // silhouette rifleman, walking; nva: pith helmet + AK, else M1 helmet + M16 + pack
  x.save(); x.translate(px,py); x.scale(s,s); x.beginPath();
  x.ellipse(0,-58,6,7,0,0,6.283); x.moveTo(-8,-50); x.lineTo(8,-50); x.lineTo(10,-24); x.lineTo(-9,-24); x.closePath();
  var st=R()*.5; x.moveTo(-8,-26); x.lineTo(-12-st*8,0); x.lineTo(-6-st*8,0); x.lineTo(0,-20); x.lineTo(5+st*6,0); x.lineTo(11+st*6,0); x.lineTo(8,-26); x.closePath(); x.fill();
  if(nva){ x.beginPath(); x.ellipse(0,-63,11,4.5,0,0,6.283); x.fill(); x.beginPath(); x.ellipse(0,-63,7,6,0,Math.PI,0); x.fill(); x.save(); x.translate(4,-40); x.rotate(-.9); x.fillRect(-2,-22,3,34); x.fillRect(-4,-4,6,8); x.restore() }
  else { x.beginPath(); x.ellipse(0,-62,10,7,0,Math.PI,0); x.fill(); x.fillRect(-11,-62,22,2); x.fillRect(-14,-48,8,18); x.save(); x.translate(8,-40); x.rotate(-.5); x.fillRect(-1.5,-18,3,36); x.fillRect(-1,-24,2,8); x.restore() }
  x.restore() }
function bakeTrail(x,w,h){ var R=rng(33);
  x.fillStyle=lin(x,0,0,0,h,[[0,'#0c1418'],[.5,'#18262a'],[1,'#0a100c']]); x.fillRect(0,0,w,h);
  x.fillStyle=rad(x,w*.7,h*.15,w*.4,[[0,'rgba(170,200,210,.35)'],[1,'rgba(0,0,0,0)']]); x.fillRect(0,0,w,h);
  for(var l=0;l<3;l++){ x.fillStyle=['#14201e','#0e1614','#070b09'][l]; for(var i=0;i<60;i++){ var tx=R()*w, ty=R()*h*(.3+l*.15), r=20+R()*60; x.beginPath(); x.arc(tx,ty,r,0,6.283); x.fill() } for(var tr=0;tr<6;tr++){ var tx2=R()*w; x.fillRect(tx2,0,6+l*6,h) } }
  // trail
  x.fillStyle='#1e2a22'; x.beginPath(); x.moveTo(0,h*.78); x.quadraticCurveTo(w*.5,h*.66,w,h*.74); x.lineTo(w,h*.86); x.quadraticCurveTo(w*.5,h*.8,0,h*.92); x.fill();
  x.fillStyle='rgba(150,180,190,.12)'; x.beginPath(); x.moveTo(0,h*.8); x.quadraticCurveTo(w*.5,h*.68,w,h*.76); x.lineTo(w,h*.78); x.quadraticCurveTo(w*.5,h*.71,0,h*.83); x.fill();
  // foreground fronds
  x.fillStyle='#040605'; for(var f=0;f<14;f++){ var fx=R()<.5?R()*w*.2:w-R()*w*.2, fy=h*(.2+R()*.8); x.save(); x.translate(fx,fy); x.rotate(R()*6.28); x.beginPath(); x.ellipse(0,0,90,14,0,0,6.283); x.fill(); x.restore() } }
function bakeRain(x,w,h){ var R=rng(44);
  x.fillStyle=lin(x,0,0,0,h,[[0,'#6a7270'],[.45,'#8a908a'],[.52,'#4a5246'],[1,'#2a3026']]); x.fillRect(0,0,w,h);
  x.fillStyle='rgba(60,70,64,.7)'; x.beginPath(); x.moveTo(0,h*.47); for(var i=0;i<=w;i+=20)x.lineTo(i,h*.47-12-Math.sin(i*.01)*10-R()*10); x.lineTo(w,h*.5); x.lineTo(0,h*.5); x.fill();
  for(var r=0;r<7;r++){ var y=h*(.52+r*r*.012); x.fillStyle='rgba(40,46,36,.8)'; x.fillRect(0,y,w,2+r) }
  x.fillStyle='rgba(150,160,150,.18)'; for(var j=0;j<200;j++)x.fillRect(R()*w,h*(.53+R()*.47),20+R()*60,1);
  for(var t=0;t<500;t++){ var px=R()*w, py=h*(.5+R()*.5); x.strokeStyle='rgba(60,90,50,.6)'; x.beginPath(); x.moveTo(px,py); x.lineTo(px-2,py-6-R()*8); x.stroke() }
  // the dike they walk on
  x.fillStyle='#2a2a1e'; x.beginPath(); x.moveTo(0,h*.66); x.lineTo(w,h*.6); x.lineTo(w,h*.64); x.lineTo(0,h*.71); x.fill() }
function bakeDawn(x,w,h){ var R=rng(55);
  x.fillStyle=lin(x,0,0,0,h*.6,[[0,'#3a4a62'],[.6,'#c89a78'],[1,'#f0c890']]); x.fillRect(0,0,w,h);
  x.fillStyle='#4a4a58'; x.beginPath(); x.moveTo(0,h*.6); for(var i=0;i<=w;i+=10)x.lineTo(i,h*.5-Math.sin(i*.006+1)*h*.05-Math.sin(i*.02)*h*.015); x.lineTo(w,h*.6); x.fill();
  x.fillStyle='#22281e'; x.beginPath(); x.moveTo(0,h*.62); for(var j=0;j<=w;j+=6)x.lineTo(j,h*.59-R()*h*.02); x.lineTo(w,h*.63); x.fill();
  x.fillStyle=lin(x,0,h*.62,0,h,[[0,'#c8a080'],[.4,'#6a6050'],[1,'#22261c']]); x.fillRect(0,h*.62,w,h*.38);
  for(var r=0;r<8;r++){ var y=h*(.63+r*r*.006); x.fillStyle='rgba(30,32,22,.85)'; x.fillRect(0,y,w,1+r*.6) }
  for(var g=0;g<1200;g++){ var gx=R()*w, gy=h*(.8+R()*.2), gl=10+R()*30; x.strokeStyle='rgba(20,24,14,.9)'; x.beginPath(); x.moveTo(gx,gy); x.lineTo(gx+R()*8-4,gy-gl); x.stroke() } }
function huey(c,x,y,s,t,dir){ c.save(); c.translate(x,y); c.scale(s*dir,s); c.fillStyle='#1c1e1a';
  c.beginPath(); c.moveTo(-40,0); c.quadraticCurveTo(-44,-14,-26,-16); c.lineTo(14,-16); c.lineTo(20,-8); c.lineTo(70,-10); c.lineTo(80,-24); c.lineTo(86,-24); c.lineTo(82,-4); c.lineTo(20,2); c.lineTo(10,8); c.lineTo(-30,8); c.closePath(); c.fill();
  c.fillRect(-8,-22,8,6); c.fillRect(-32,12,52,2); c.fillRect(-26,8,2,5); c.fillRect(10,8,2,5);
  c.strokeStyle='rgba(28,30,26,.6)'; c.lineWidth=1.5; var a=t*25; c.beginPath(); c.moveTo(-4,-23); c.lineTo(-4+Math.cos(a)*70,-23+Math.sin(a)*3); c.moveTo(-4,-23); c.lineTo(-4-Math.cos(a)*70,-23-Math.sin(a)*3); c.stroke();
  c.fillStyle='rgba(28,30,26,.12)'; c.beginPath(); c.ellipse(-4,-23,70,3,0,0,6.283); c.fill(); c.restore() }
function filmFrame(c,t,caption,kb){ // vignette, grain, gate weave, scratches, caption strip
  c.drawImage(cached('ovFilm',IW,IH,function(x){ x.fillStyle=rad(x,IW/2,IH/2,IW*.62,[[0,'rgba(0,0,0,0)'],[.7,'rgba(0,0,0,.15)'],[1,'rgba(0,0,0,.75)']]); x.fillRect(0,0,IW,IH) }),0,0);
  var fr=Math.floor(t*18); if(hash(fr)>.6){ c.fillStyle='rgba(255,255,240,'+(.05+hash(fr*3)*.08)+')'; c.fillRect(hash(fr*7)*IW,0,1.2,IH) }
  if(hash(fr*5)>.92){ c.fillStyle='rgba(255,250,230,.06)'; c.fillRect(0,0,IW,IH) }
  if(caption)captionStrip(c,caption,t) }
function captionStrip(c,txt,t){ var a=clamp((t-.4)/.6,0,1); if(a<=0)return; c.save(); c.globalAlpha=a; c.font='bold 17px '+MONO; var w=c.measureText(txt).width+28;
  c.fillStyle='rgba(226,214,170,.92)'; c.fillRect(26,26,w,30); c.fillStyle='rgba(0,0,0,.25)'; c.fillRect(26,54,w,2); c.strokeStyle=OUT; c.lineWidth=1.5; c.strokeRect(26.5,26.5,w-1,29);
  c.fillStyle='#2a2418'; c.textBaseline='middle'; c.textAlign='left'; var n=Math.floor(clamp((t-.4)*30,0,txt.length)); c.fillText(txt.slice(0,n),40,42); c.restore() }

/* ================= stills (archival photos) ================= */
var STILLS={};
function okImg(i){ return i&&((i.naturalWidth||i.videoWidth||i.width)>0)&&(i.complete!==false) }
function drawStill(c,img,t,dur){ var iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, k=clamp(t/Math.max(3,dur),0,1), z=1.06+k*.08, s=Math.max(IW/iw,IH/ih)*z, dx=(IW-iw*s)/2+lerp(-14,14,k), dy=(IH-ih*s)/2+lerp(8,-8,k);
  c.save(); c.drawImage(img,dx,dy,iw*s,ih*s); c.globalCompositeOperation='multiply'; c.fillStyle='rgba(225,205,170,1)'; c.fillRect(0,0,IW,IH); c.globalCompositeOperation='source-over'; c.fillStyle='rgba(30,24,14,.12)'; c.fillRect(0,0,IW,IH); c.restore() }

/* ================= scenes ================= */
var CAP={2:'NVA ON THE TRAIL  \u00b7  1968',4:'MONSOON  \u00b7  QUANG TRI PROVINCE',6:'LZ  \u00b7  DAWN'};
function scene(c,S){ var p=S.page, t=S.t, sc=SCENES[p]||SCENES[0], still=STILLS[p];
  if(still&&okImg(still.img)){ drawStill(c,still.img,t,CLIPS[p]||8); filmFrame(c,t,still.caption||CAP[p]||''); return }
  if(sc.id==='cocWide'||S.ph===0){ var push=S.ph===0?0:ease(t/6)*.04; c.save(); c.translate(IW/2,IH*.4); c.scale(1+push,1+push); c.translate(-IW/2,-IH*.4);
    c.drawImage(cached('wide',IW,IH,function(x){ x.drawImage(roomCanvas(),0,0);
      flag(x,640,62,120,76,true); x.fillStyle='#3a2a16'; x.fillRect(636,52,4,190); flag(x,790,62,120,76,false); x.fillStyle='#3a2a16'; x.fillRect(786,52,4,190); x.fillStyle='#c8a040'; x.beginPath(); x.arc(638,50,5,0,6.283); x.arc(788,50,5,0,6.283); x.fill();
      x.fillStyle='#3a2a16'; x.fillRect(68,58,452,398); x.drawImage(mapCanvas(),80,70,428,374) }),0,0);
    lantern(c,430,64,.8,t);
    drawColonel(c,548,182,.72,{t:t,page:p,clipT:S.clipT,talking:S.talking,useEnv:S.useEnv});
    // pointer to the map
    var pins=[1,2,3,4], pk=pins[Math.floor(t*.55)%4], pq=pinXY(pk,428,374), ex=80+pq[0], ey=70+pq[1]; c.strokeStyle='#8a6a3a'; c.lineWidth=3; c.beginPath(); c.moveTo(590,420); c.lineTo(ex+10,ey+10); c.stroke();
    c.restore(); return }
  if(sc.id==='mapIcorps'){ var m2=mapCanvas(), k=ease(t/Math.max(4,CLIPS[1])), zs=lerp(1.0,1.18,k), mw=860*zs*.86, mh=780*zs*.86, mx=IW/2-mw*lerp(.42,.5,k), my=IH*.45-mh*lerp(.35,.42,k);
    c.fillStyle='#2a1c10'; c.fillRect(0,0,IW,IH); c.drawImage(m2,mx,my,mw,mh);
    var pins2=sc.pins, pi=Math.floor(t*.55)%pins2.length;
    pins2.forEach(function(k2,i){ var q=pinXY(k2,860,780), px=mx+q[0]*mw/860, py=my+q[1]*mh/780, on=i===pi, rr=on?18+Math.sin(t*6)*2:12;
      c.strokeStyle=on?'rgba(200,30,20,.9)':'rgba(200,30,20,.45)'; c.lineWidth=on?4:2.5; c.beginPath(); c.ellipse(px,py,rr*1.3,rr,-.2,0,6.0); c.stroke();
      c.fillStyle='#c82020'; c.beginPath(); c.arc(px,py,5,0,6.283); c.fill(); c.fillStyle='rgba(0,0,0,.4)'; c.fillRect(px-1,py+5,2,8);
      if(on){ c.font='bold 22px '+MONO; c.lineWidth=5; c.strokeStyle='rgba(20,16,8,.85)'; c.textAlign='left'; c.strokeText(q[2],px+24,py-14); c.fillStyle='#fff6d8'; c.fillText(q[2],px+24,py-14) } });
    // pointer stick coming in from the right edge
    var q2=pinXY(pins2[pi],860,780), tx=mx+q2[0]*mw/860, ty=my+q2[1]*mh/780; S._ptr=S._ptr||{}; c.strokeStyle='#7a5a30'; c.lineWidth=7; c.beginPath(); c.moveTo(IW+20,IH*.75); c.lineTo(tx+14,ty+14); c.stroke(); c.strokeStyle='rgba(255,220,160,.3)'; c.lineWidth=2; c.beginPath(); c.moveTo(IW+20,IH*.75-3); c.lineTo(tx+14,ty+11); c.stroke();
    c.drawImage(cached('ovMap',IW,IH,function(x){ x.fillStyle=rad(x,IW*.3,IH*.2,IW*.9,[[0,'rgba(255,200,120,.12)'],[.6,'rgba(0,0,0,.1)'],[1,'rgba(0,0,0,.6)']]); x.fillRect(0,0,IW,IH) }),0,0); return }
  if(sc.id==='trail'){ var bg=cached('trail',IW+80,IH,bakeTrail); c.drawImage(bg,-t*4,0);
    var R=rng(7); c.fillStyle='#030504'; for(var i=0;i<9;i++){ var gx=((i*120+t*38)%(IW+240))-120, gy=IH*.76-gx*.03+Math.sin(t*6+i)*1.5; grunt(c,gx,gy+(i%2)*6,1.25+(i%3)*.05,R,true) }
    // moonlight rim
    c.globalCompositeOperation='screen'; c.fillStyle='rgba(60,84,96,.35)'; c.fillRect(0,0,IW,IH); c.globalCompositeOperation='source-over';
    filmFrame(c,t,CAP[2]); return }
  if(sc.id==='rainPaddy'){ var bg2=cached('rain',IW+60,IH,bakeRain); c.drawImage(bg2,-t*3,0); var R2=rng(9);
    c.fillStyle='#1a1e16'; for(var j=0;j<6;j++){ var gx2=((j*150+t*22)%(IW+300))-150, gy2=IH*.68-gx2*.06; grunt(c,gx2,gy2,1.6,R2,false) }
    c.strokeStyle='rgba(200,210,205,.35)'; c.lineWidth=1.2; for(var d=0;d<240;d++){ var rx=(hash(d*3)*IW+t*120)%IW, ry=(hash(d*7)*IH+t*900+d*13)%IH; c.beginPath(); c.moveTo(rx,ry); c.lineTo(rx-5,ry+22); c.stroke() }
    c.fillStyle='rgba(150,160,155,.12)'; c.fillRect(0,0,IW,IH); filmFrame(c,t,CAP[4]); return }
  if(sc.id==='lzDawn'){ var bg3=cached('dawn',IW+60,IH,bakeDawn); c.drawImage(bg3,-t*2,0);
    for(var s=0;s<8;s++){ var a=((t*.1+s/8)%1), sx=IW*.75+a*80, sy=IH*.52-a*140, sz=40+a*160; c.globalAlpha=(1-a)*.5; c.drawImage(puff(s%4),sx-sz/2,sy-sz/2,sz,sz) } c.globalAlpha=1;
    var k3=t/Math.max(4,CLIPS[6]); huey(c,lerp(IW*1.1,IW*.55,ease(k3)),IH*.3+Math.sin(t)*3,1.3,t,-1); huey(c,lerp(IW*1.3,IW*.72,ease(k3*.9)),IH*.22,1.0,t+.3,-1); huey(c,lerp(IW*1.5,IW*.9,ease(k3*.85)),IH*.27,.8,t+.6,-1);
    var R3=rng(12); c.fillStyle='#0c0e0a'; for(var g2=0;g2<4;g2++)grunt(c,IW*(.12+g2*.09),IH*.94+(g2%2)*6,2.2,R3,false);
    c.fillStyle='rgba(255,210,150,.08)'; c.fillRect(0,0,IW,IH); filmFrame(c,t,CAP[6]); return }
  // colonel close / medium shots
  var med=sc.id==='colMed', fin=sc.id==='colFinal', ks=ease(t/Math.max(3,CLIPS[p]||6));
  var bgm=cached('colbg'+(med?1:0),IW,IH,function(x,w,h){ x.drawImage(roomCanvas(),0,0);
    if(med){ x.filter='blur(5px)'; x.drawImage(mapCanvas(),60,60,500,450); x.filter='none' } else { x.filter='blur(4px)'; flag(x,120,40,280,180,true); flag(x,560,40,280,180,false); x.filter='none' }
    x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(0,0,w,h) });
  c.drawImage(bgm,0,0);
  lantern(c,med?150:870,96,.7,t);
  var csc=med?.9:(fin?lerp(1.1,1.22,ks):1.12), cxp=med?520:IW/2-200*csc, cyp=med?40:lerp(30,18,ks)-(fin?ks*20:0);
  drawColonel(c,cxp,cyp,csc,{t:t,page:p,clipT:S.clipT,talking:S.talking,useEnv:S.useEnv});
  c.drawImage(cached('ovCol',IW,IH,function(x){ x.fillStyle=rad(x,IW*.35,IH*.1,IW*.8,[[0,'rgba(255,200,120,.10)'],[.6,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.5)']]); x.fillRect(0,0,IW,IH) }),0,0) }

/* ================= compositor ================= */
var buf=null, prev=null, lastPage=-1, fadeT=0, lastNow=0;
function drawScene(ctx,x,y,w,h,S){ S=S||{}; var page=clamp((S.page|0),0,7), t=+S.t||0;
  if(!buf){ buf=mk(IW,IH); prev=mk(IW,IH) }
  var b=buf.getContext('2d');
  var now=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
  if(page!==lastPage){ if(lastPage>=0){ prev.getContext('2d').drawImage(buf,0,0); fadeT=.55 } lastPage=page }
  var dt=lastNow?clamp(now-lastNow,0,.1):0; lastNow=now; if(fadeT>0)fadeT=Math.max(0,fadeT-dt);
  var st={page:page,t:t,ph:S.ph,talking:!!S.talking,clipT:S.clipT!=null?S.clipT:t,useEnv:S.talking&&S.useEnv!==false&&S.clipT!=null};
  b.save(); try{ scene(b,st) }catch(e){ if(!drawScene.w){ drawScene.w=1; console.warn('INTRO_V2 scene fallback',e) } b.fillStyle='#1c160e'; b.fillRect(0,0,IW,IH) } b.restore();
  // grain
  var gn=grain(), gx=-(Math.floor(now*24)*97%256), gy=-(Math.floor(now*24)*61%256); b.globalAlpha=.55; for(var yy=gy;yy<IH;yy+=256)for(var xx=gx;xx<IW;xx+=256)b.drawImage(gn,xx,yy); b.globalAlpha=1;
  if(fadeT>0){ b.globalAlpha=fadeT/.55; b.drawImage(prev,0,0); b.globalAlpha=1 }
  // fit 16:9 into rect
  var s=Math.min(w/IW,h/IH), dw=IW*s, dh=IH*s, ox=x+(w-dw)/2, oy=y+(h-dh)/2;
  ctx.save(); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.drawImage(buf,ox,oy,dw,dh); ctx.restore() }
function safe(fn){ return function(){ try{ return fn.apply(null,arguments) }catch(e){ console.warn('INTRO_V2',e) } } }
var INTRO_V2={version:'2026-10-14',W:IW,H:IH,SCENES:SCENES,CLIPS:CLIPS,
  drawScene:function(ctx,x,y,w,h,S){ try{ drawScene(ctx,x,y,w,h,S) }catch(e){ try{ ctx.fillStyle='#1c160e'; ctx.fillRect(x,y,w,h) }catch(e2){} } },
  setStill:safe(function(page,img,caption){ if(img==null){ delete STILLS[page]; return } STILLS[page]={img:img,caption:caption||null} }),
  mouth:function(p,ct){ try{ return mouthLevel(p,ct) }catch(e){ return 0 } },
  prewarm:safe(function(){ colonelParts(); roomCanvas(); mapCanvas(); grain(); for(var i=0;i<4;i++)puff(i); var cv=mk(IW,IH), x=cv.getContext('2d'); for(var p=0;p<8;p++)drawScene(x,0,0,IW,IH,{page:p,t:0}); lastPage=-1; fadeT=0 }),
  prewarmAsync:function(done){ var cv=mk(IW,IH), x=cv.getContext('2d'), q=[colonelParts,roomCanvas,mapCanvas,grain,function(){ for(var i=0;i<4;i++)puff(i) }];
    for(var p=0;p<8;p++)(function(p){ q.push(function(){ drawScene(x,0,0,IW,IH,{page:p,t:0}); x.getImageData(0,0,1,1) }) })(p);
    q.push(function(){ lastPage=-1; fadeT=0 }); var step=function(){ var f=q.shift(); try{ f&&f() }catch(e){} if(q.length)setTimeout(step,16); else if(done)try{done()}catch(e){} }; setTimeout(step,0) },
  reset:function(){ lastPage=-1; fadeT=0; lastNow=0 },
  clearCache:function(){ C={}; buf=null; prev=null; lastPage=-1 } };
if(typeof window!=='undefined')window.INTRO_V2=INTRO_V2;
})();
