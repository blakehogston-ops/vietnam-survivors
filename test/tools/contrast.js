/* rc7 #1: unit-vs-ground contrast, deterministic. Ground = a real frame with every unit moved off (day / dusk / night grade).
   Each live unit sprite (Marine via SHEET1.draw, enemy sprite canvas) is composited at 60 ground spots: with ?unitrim=0 the bare sprite,
   otherwise sprite + the cached RIM outline exactly as the game draws it. Contrast = WCAG ratio of the silhouette EDGE (outer 1 px of
   the drawn figure) vs the ground band 2-4 px outside it. Night/dusk: sprite colours scaled by the measured ground grade (the atmosphere
   multiplies units and ground alike). usage: CH=... node tools/contrast.js [extra-query] [outdir] */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'), Q=process.argv[2]||'', OUT=process.argv[3]||'';
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({executablePath:process.env.CH||undefined,channel:process.env.CH?undefined:'chrome',args:['--no-sandbox']}); const res={}; let gday=null;
 for(const [sc,tq] of [['day',''],['dusk','&tod=18.5'],['night','&tod=21']]){ const pg=await br.newPage({viewport:{width:1280,height:720}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&notut&bot&char=doc&autostart&god&seed=7'+tq+Q); await pg.waitForTimeout(1500);
  const r=await pg.evaluate(gday=>{ window.__simHold=true; const M=__ms; for(let i=0;i<60*75;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60) }
    const cv=document.querySelector('canvas'), c=cv.getContext('2d'), W=cv.width, H=cv.height, U=M.units();
    const all=U.e.concat(U.m), sv=all.map(u=>u.x); all.forEach(u=>u.x+=1e5); M.render(); const g=c.getImageData(0,0,W,H).data; all.forEach((u,i)=>u.x=sv[i]);
    const lin=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}, Lp=(r,gg,b)=>.2126*lin(r)+.7152*lin(gg)+.0722*lin(b);
    let gs=0; for(let k=0;k<W*H;k+=97)gs+=Lp(g[k*4],g[k*4+1],g[k*4+2]); const gl=gs/Math.ceil(W*H/97), grade=gday?Math.min(1,Math.sqrt(gl/gday)):1;
    const R=window.RIMX, S=window.SHEET1, sprites=[]; const mk=(w,h)=>{ const t=document.createElement('canvas'); t.width=w; t.height=h; return t };
    for(const e of U.e.filter(e=>e.spr&&!e.tank).slice(0,12)){ const s=e.spr[0][0][0]; const t=mk(s.width+8,s.height+8), x=t.getContext('2d'); if(R.ON){ x.globalAlpha=R.alpha(); x.drawImage(R.can(s),2,2); x.globalAlpha=1 } x.drawImage(s,4,4); sprites.push(t) }
    if(S&&S.draw)for(const m of U.m.filter(m=>m.role).slice(0,12)){ const t=mk(160,160), x=t.getContext('2d'); x.imageSmoothingEnabled=false; R.wrap(); R.on=R.ON; const keep=R.ctxRef(); R.ctxRef(x); try{ S.draw(x,(S.MARINE_ROLE&&S.MARINE_ROLE[m.role])||'marineRifle',0,80,136,1.5,false,false) }catch(e){} R.ctxRef(keep); R.on=false; sprites.push(t) }
    const out=[]; let seed=3; const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647);
    for(const t of sprites){ const d=t.getContext('2d').getImageData(0,0,t.width,t.height).data, w=t.width, h=t.height; const A=k=>d[k*4+3];
      for(let s=0;s<60;s++){ const ox=Math.floor(rnd()*(W-w)), oy=Math.floor(rnd()*(H-h)); let se=0,ne=0,sb=0,nb=0;
        for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){ const k=y*w+x, a=A(k)/255, G=((oy+y)*W+ox+x)*4;
          if(a>.05){ let edge=A(k-1)<13||A(k+1)<13||A(k-w)<13||A(k+w)<13; if(edge){ const cr=(d[k*4]*grade)*a+g[G]*(1-a), cg=(d[k*4+1]*grade)*a+g[G+1]*(1-a), cb=(d[k*4+2]*grade)*a+g[G+2]*(1-a); se+=Lp(cr,cg,cb); ne++ } }
          else { let near=false; for(let q=2;q<=4&&!near;q++){ if((x+q<w&&A(k+q)>13)||(x-q>=0&&A(k-q)>13)||(y+q<h&&A(k+q*w)>13)||(y-q>=0&&A(k-q*w)>13))near=true } if(near){ sb+=Lp(g[G],g[G+1],g[G+2]); nb++ } } }
        if(ne&&nb){ const a=se/ne, b=sb/nb; out.push((Math.max(a,b)+.05)/(Math.min(a,b)+.05)) } } }
    out.sort((a,b)=>a-b); return {sprites:sprites.length,samples:out.length,median:+out[out.length>>1].toFixed(2),p25:+out[Math.floor(out.length*.25)].toFixed(2),grade:+grade.toFixed(2),gl} },gday);
  if(sc==='day')gday=r.gl; delete r.gl;
  if(OUT){ fs.mkdirSync(OUT,{recursive:true}); await pg.screenshot({path:path.join(OUT,sc+'.png')}) }
  res[sc]=Object.assign(r,{errs:errs.length}); await pg.close() }
 console.log(JSON.stringify(res)); await br.close(); srv.close() })();
