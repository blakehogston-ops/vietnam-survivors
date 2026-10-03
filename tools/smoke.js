#!/usr/bin/env node
/* Quick headless regression (serves the repo over http, drives the installed Chrome via playwright-core).
 *   node smoke.js            -> syntax check, clean first load, bot play, character select (all 9), briefing skip, mute, error scan
 * Exit code 1 on any page/console error (except none are ignored). */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path'), {execSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'index.html'),'utf8'); const js=[...src.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'); fs.writeFileSync('/tmp/_smoke.js',js);
try{execSync('node --check /tmp/_smoke.js',{stdio:'pipe'}); console.log('node --check OK')}catch(e){console.log('SYNTAX FAIL',String(e.stderr)); process.exit(1)}
const MIME={'.html':'text/html','.mp3':'audio/mpeg','.png':'image/png','.js':'text/javascript'};
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!f.startsWith(root)||!fs.existsSync(f)){r.statusCode=404;r.end();return} r.setHeader('content-type',MIME[path.extname(f)]||'application/octet-stream'); r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
  const browser=await chromium.launch({channel:'chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']}); const errs=[], bad=[]; let fails=0; const T=(n,ok,x)=>{ console.log((ok?'PASS ':'FAIL ')+n+(x?' '+x:'')); if(!ok)fails++ };
  const mk=async(w,h,tag,ctxOpts)=>{ const c=await browser.newContext(Object.assign({viewport:{width:w,height:h}},ctxOpts||{})); const pg=await c.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(tag+' console: '+m.text().slice(0,160))}); pg.on('response',r=>{if(r.status()>=400)bad.push(tag+' '+r.status()+' '+r.url())}); return pg };
  // clean first load (fresh context = empty localStorage) -> menu
  { const pg=await mk(1280,800,'first-load'); await pg.goto(B+'index.html?nodemo&nobrief&nointro'); await pg.waitForTimeout(1200); T('clean first load reaches menu',await pg.evaluate(()=>__ms.stateX==='menu'));
    // character select: all 9, check name text not clipped
    await pg.evaluate(()=>__ms.openCharSel&&__ms.openCharSel()); await pg.waitForTimeout(300);
    const ids=await pg.evaluate(()=>Object.keys(__ms.CHD||{})); let clip=[];
    for(const id of ids){ await pg.evaluate(i=>__ms.selectChar(i),id); await pg.waitForTimeout(80); const r=await pg.evaluate(()=>{ const out=[]; document.querySelectorAll('#charsel *').forEach(e=>{ if(e.children.length===0&&e.textContent.trim()&&e.offsetParent&&(e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflow!=='visible'))out.push(e.textContent.trim().slice(0,30)) }); return out }); if(r.length)clip.push(id+':'+r.join('|')) }
    T('character select ('+ids.length+' chars) no clipped text',ids.length===9&&clip.length===0,clip.join(' ; ')); await pg.close() }
  // bot play
  { const pg=await mk(1280,800,'play'); await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&autostart'); await pg.waitForTimeout(1500);
    const r=await pg.evaluate(()=>{ window.__simHold=true; for(let i=0;i<60*150&&__ms.stateX==='play';i++)__ms.step(1/60); return {t:Math.round(__ms.G.t),st:__ms.stateX} }); T('bot plays 150 s of sim',r.st==='play'||r.t>=60,JSON.stringify(r)); await pg.close() }
  // briefing skip + mute
  { const pg=await mk(390,844,'brief',{hasTouch:true}); await pg.goto(B+'index.html?brief'); await pg.waitForTimeout(1000); await pg.mouse.click(195,400); await pg.waitForTimeout(1200); await pg.keyboard.press('KeyM'); await pg.keyboard.press('Space'); await pg.waitForTimeout(500); await pg.keyboard.press('KeyM'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(800); T('briefing skip -> menu',await pg.evaluate(()=>__ms.stateX==='menu')); await pg.close() }
  T('no page/console errors',errs.length===0,JSON.stringify(errs.slice(0,5))); T('no HTTP >= 400',bad.length===0,JSON.stringify(bad));
  await browser.close(); srv.close(); process.exit(fails?1:0) })();
