#!/usr/bin/env node
/* rc8.2 loadout icons v2.3.3 (?loicons=1), Node-only (no browser; style of loadout_getters_test.js). Checks: every icon path referenced exists and is a
   real PNG of the stated size; icon ids map 1:1 to loadout options (+ sidearm); labels incl. exactly 'Entrenching tool'; every #loadout/#loHud font
   >= 18 px; WCAG contrast >= 4.5:1 for every text colour against its actual background (alpha backgrounds composited over black AND white);
   flag off = no icon markup/CSS. Writes nothing. Exit 1 on any FAIL. */
const fs=require('fs'), path=require('path'); const root=path.join(__dirname,'..'), src=fs.readFileSync(path.join(root,'index.html'),'utf8');
let fails=0, n=0; const T=(nm,ok,x)=>{ n++; console.log((ok?'PASS ':'FAIL ')+nm+(x!==undefined?' :: '+JSON.stringify(x):'')); if(!ok)fails++ };
function grab(start){ const i=src.indexOf(start); if(i<0)return null; let d=0,j=i+start.length-1,q=null; for(;j<src.length;j++){ const c=src[j]; if(q){ if(c==='\\'){j++;continue} if(c===q)q=null; continue } if(c==="'"||c==='"'||c==='`'){q=c;continue} if(c==='{')d++; else if(c==='}'){ d--; if(!d)break } } return src.slice(i+start.length-1,j+1) }
const LOsrc=grab('const LO=window.LO={'); const icLines=src.split('\n').filter(l=>/^const (LO_ICONS|LO_ICON|loIcon)\b/.test(l)).join('\n'); const SM=(src.match(/const LO_SMALL=(\{[^}]*\});/)||[])[1];
T('LO, LO_ICON, loIcon found',!!LOsrc&&/LO_ICON=/.test(icLines)&&/loIcon=/.test(icLines));
function world(qs){ const window={}, env={}; new Function('location','localStorage','window','document','env',`${icLines}\nconst LO_ON=true, LO_SMALL=${SM}; let G=null,state='menu'; const LO=window.LO=${LOsrc}; env.LO=LO; env.ICON=LO_ICON; env.on=LO_ICONS; env.ic=loIcon; env.dir=LO_ICDIR;`)({search:qs},{getItem:()=>null,setItem(){}},window,{},env); return env }
const W=world('?loadout=1&loicons=1'), L=W.LO;
// ---- flag
T('?loicons=1 -> on; absent / =0 / loiconsx=1 -> off',W.on===true&&world('?loadout=1').on===false&&world('?loicons=0').on===false&&world('?loiconsx=1').on===false);
T('icon markup only behind LO_ICONS',(src.match(/class="loImg|class=\\"loImg/g)||[]).length===2&&src.split('\n').filter(l=>/loImg/.test(l)).every(l=>/LO_ICONS/.test(l)));
// ---- 1:1 ids <-> options
const optIds=L.SLOTS.flatMap(s=>s.opts.map(o=>o.id)), icIds=Object.keys(W.ICON);
T('every loadout option has an icon',optIds.every(id=>W.ICON[id]),optIds.filter(id=>!W.ICON[id]));
T('no icon without an option (1:1)',icIds.every(id=>optIds.includes(id))&&icIds.length===optIds.length,icIds.filter(id=>!optIds.includes(id)));
T('icon file names unique (no two options share an icon)',new Set(Object.values(W.ICON)).size===icIds.length);
T('every PRIM key has an icon (HUD chip)',Object.keys(L.PRIM).every(k=>W.ICON[k])&&!!W.ICON.m1911);
T('loIcon(unknown) -> null',W.ic('zzz',64)===null&&W.ic(undefined,32)===null);
// ---- files exist, PNG, size
const pngWH=f=>{ const b=fs.readFileSync(f); return b.slice(1,4).toString()==='PNG'?[b.readUInt32BE(16),b.readUInt32BE(20),b[25]]:null };
for(const id of icIds)for(const px of [64,32]){ const rel=W.ic(id,px), f=path.join(root,rel), ok=fs.existsSync(f), wh=ok&&pngWH(f);
  T(`${id} ${px}px: ${rel} exists, PNG ${px}x${px} RGBA`,ok&&wh&&wh[0]===px&&wh[1]===px&&wh[2]===6,wh) }
{ const used=new Set(icIds.flatMap(id=>[64,32].map(px=>path.basename(W.ic(id,px))))), dir=fs.readdirSync(path.join(root,W.dir));
  T('no unreferenced files in assets/ui/loadout_icons',dir.every(f=>used.has(f)),dir.filter(f=>!used.has(f))) }
T('sizes used in code are only 64 (screen) and 32 (HUD)',(src.match(/loIcon\([^)]*,(\d+)\)/g)||[]).every(m=>/,(64|32)\)$/.test(m)));
// ---- labels
const nm=id=>L.SLOTS.flatMap(s=>s.opts).find(o=>o.id===id).nm;
T("e-tool label is exactly 'Entrenching tool'",nm('etool')==='Entrenching tool',nm('etool'));
T('labels: M16A1, M14, M60, M79, Ithaca 37, M1911A1, M26 frag, M18 smoke, Unit One bag, Extra magazines, Extra canteen, None',
  JSON.stringify(['m16','m14','m60','m79','shotgun','m1911','frag','smoke','unit1','mags','canteen','none'].map(nm))==='["M16A1","M14","M60","M79","Ithaca 37","M1911A1","M26 frag","M18 smoke","Unit One bag","Extra magazines","Extra canteen","None"]');
T('icons are decorative (alt="") so the visible label stays the name',src.split('\n').filter(l=>/loImg/.test(l)&&/<img/.test(l)).every(l=>/alt=\\?"\\?"/.test(l)));
T('no label contains (rare) or Dustoff',optIds.every(id=>!/\(rare\)|dustoff/i.test(nm(id))));
// ---- font sizes in #loadout / #loHud CSS (the css() string)
const css=(src.match(/'#loadout\{position:fixed[\s\S]*?#loHud \.loImg[^']*'/)||[''])[0];
T('loadout css block found',css.length>500);
const fonts=[...css.matchAll(/(#lo[^{}]*)\{([^}]*)\}/g)].flatMap(([,sel,body])=>[...body.matchAll(/font(?:-size)?:\s*(?:bold\s+)?(\d+(?:\.\d+)?)px/g)].map(m=>[sel.trim(),+m[1]]));
T('every font in #loadout/#loHud >= 18px',fonts.length>10&&fonts.every(([,v])=>v>=18),fonts.filter(([,v])=>v<18));
T('icon rule sets no font (text untouched)',!/loImg[^{]*\{[^}]*font/.test(css));
// ---- contrast (WCAG 2.x relative luminance)
const hex=h=>{ h=h.replace('#',''); if(h.length===3)h=[...h].map(c=>c+c).join(''); return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)) };
const lin=c=>{ c/=255; return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4) }, Lum=rgb=>.2126*lin(rgb[0])+.7152*lin(rgb[1])+.0722*lin(rgb[2]);
const CR=(a,b)=>{ const x=Lum(a),y=Lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05) };
const over=(rgba,base)=>rgba.slice(0,3).map((c,i)=>c*rgba[3]+base[i]*(1-rgba[3]));
const rgbaOf=s=>{ const m=s.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/); return [+m[1],+m[2],+m[3],+m[4]] };
const pick=(re)=>{ const m=css.match(re); return m&&m[1] };
const C={screenBg:rgbaOf(pick(/#loadout\{[^}]*background:(rgba\([^)]*\))/)), slot:hex(pick(/\.loSlot\{[^}]*background:(#[0-9a-f]+)/i)), on:hex(pick(/\.loOpt\.on\{[^}]*background:(#[0-9a-f]+)/i)),
  ic:hex(pick(/#loadout \.loIc\{[^}]*background:(#[0-9a-f]+)/i)), hud:rgbaOf(pick(/#loHud\{[^}]*background:(rgba\([^)]*\))/)), ask:rgbaOf(pick(/\.loAsk\{[^}]*background:(rgba\([^)]*\))/)), askBox:hex(pick(/\.loAsk>div\{[^}]*background:(#[0-9a-f]+)/i)), btn:hex(pick(/\.loBtns button\{[^}]*background:(#[0-9a-f]+)/i))};
const fg={main:hex('#f6f0cc'),sub:hex('#e8e2c2'),lk:hex('#d8d2b4'),hl:hex('#ffe58a')};
const BLK=[0,0,0], WHT=[255,255,255];
const rows=[
 ['option name #f6f0cc on slot',fg.main,C.slot], ['option name on picked row',fg.main,C.on], ['slot heading #e8e2c2 on slot',fg.sub,C.slot], ['locked name #d8d2b4 on slot',fg.lk,C.slot],
 ['Unlocks-after #d8d2b4 on slot',fg.lk,C.slot], ['info text #e8e2c2 on slot',fg.sub,C.slot], ['tag / lock glyph on .loIc',fg.main,C.ic],
 ['title/sub on screen bg (over white)',fg.sub,over(C.screenBg,WHT)], ['title/sub on screen bg (over black)',fg.sub,over(C.screenBg,BLK)],
 ['button text on #4a6b2f',fg.main,C.btn], ['confirm box text',fg.main,C.askBox],
 ['HUD name on chip (over white game)',fg.main,over(C.hud,WHT)], ['HUD name on chip (over black game)',fg.main,over(C.hud,BLK)], ['HUD swap text #e8e2c2 (over white)',fg.sub,over(C.hud,WHT)],
 ['focus outline #ffe58a vs slot (non-text, >=3)',fg.hl,C.slot,3]];
const out=rows.map(([nm,a,b,min=4.5])=>{ const r=+CR(a,b).toFixed(2); T(`contrast ${nm}: ${r}:1 >= ${min}`,r>=min,b.map(Math.round)); return nm+'\t'+r }).join('\n');
if(process.argv.includes('--table'))console.log('CONTRAST\n'+out);
console.log(fails?`loadout_icons_test: ${fails}/${n} FAIL`:`loadout_icons_test: ALL PASS (${n})`); process.exit(fails?1:0)
