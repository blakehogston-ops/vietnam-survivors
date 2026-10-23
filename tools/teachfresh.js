/* rc8.1 Lead Playtester #1: fresh profile (localStorage cleared) + the real menu flow (START PATROL / DEPLOY / Enter through briefing + intro, no skip flags)
   must show the onboarding Move tip within 3 s of play starting (TEACH.cur=move or TEACH.log has move). Serves itself on port 0. usage: CH=... node tools/teachfresh.js */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(process.env.ROOT||path.join(__dirname,'..'));
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({executablePath:process.env.CH||undefined,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']}); let fail=0; const errs=[];
 const pg=await br.newPage({viewport:{width:1600,height:900}}); pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(B+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(3000);
 let inPlay=false;
 for(let i=0;i<60&&!inPlay;i++){ const st=await pg.evaluate(()=>window.__ms&&__ms.state); if(st==='play'&&await pg.evaluate(()=>__ms.G&&__ms.G.t>0.05)){ inPlay=true; break }
  let clicked=false; for(const lab of ['START PATROL','DEPLOY','BEGIN','CONTINUE','START']){ const l=pg.getByText(lab,{exact:false}); try{ if(await l.count()&&await l.first().isVisible()&&i%2===0){ await l.first().click({timeout:1500}); clicked=true; break } }catch(e){} }
  if(!clicked)await pg.keyboard.press('Enter'); await pg.waitForTimeout(1000) }
 if(!inPlay){ console.log('FAIL never reached play'); fail++ }
 else { let seen=null; for(let k=0;k<30;k++){ const r=await pg.evaluate(()=>({b:__ms.G.banner&&[__ms.G.banner.text,__ms.G.banner.t],m:__ms.exMsg&&(__ms.exMsg.text||1),t:__ms.G.t,cur:TEACH.cur&&TEACH.cur.id,log:TEACH.log.map(x=>x[0]),q:TEACH.q.slice(),blk:TEACH.block()})); if(r.cur==='move'||r.log.includes('move')){ seen=r; break } if(r.t>3.2){ seen={miss:r}; break } await pg.waitForTimeout(100) }
  const ok=seen&&!seen.miss; console.log((ok?'PASS':'FAIL')+' Move tip within 3 s of play on a fresh profile',JSON.stringify(seen)); if(!ok)fail++ }
 if(errs.length){ console.log('FAIL page errors',errs.slice(0,3)); fail++ }
 await br.close(); srv.close(); console.log(fail?'TEACHFRESH FAIL':'TEACHFRESH PASS'); process.exit(fail?1:0) })();
