/* rc6d: press H 6x at full HP with nobody to heal -> at most ONE 'FULL HEALTH'/'NO WOUNDED IN REACH' label (?medlbl=0 = old behaviour, for the before shot). Serves itself on port 0. */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'), OUT=process.env.OUT||'';
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({executablePath:process.env.CH||undefined,channel:process.env.CH?undefined:'chrome',args:['--no-sandbox']}); let fail=0;
 for(const [tag,q] of [['before','&medlbl=0'],['after','']]){ const pg=await br.newPage({viewport:{width:1280,height:720}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&notut&char=doc&autostart&god'+q); await pg.waitForTimeout(2500);
  await pg.evaluate(()=>{ const g=__ms.G; g.p.hp=g.p.maxHp; for(const m of __ms.coy){ m.hp=m.mhp||m.hp } });
  for(let i=0;i<6;i++){ await pg.keyboard.press('KeyH'); await pg.waitForTimeout(120) }
  const n=await pg.evaluate(()=>{ let n=0; try{ n=(window.__ftexts||[]).length }catch(e){} return n });
  const cnt=await pg.evaluate(()=>{ try{ return __ms.ftexts.filter(f=>f.s==='FULL HEALTH'||f.s==='NO WOUNDED IN REACH').length }catch(e){ return -1 } });
  if(OUT)await pg.screenshot({path:OUT+'/medlbl_'+tag+'.png',clip:{x:340,y:180,width:600,height:300}});
  const ok=tag==='before'?true:(cnt===1&&!errs.length); if(!ok)fail++; console.log((ok?'PASS ':'FAIL ')+tag+' labels on screen after 6 H presses: '+cnt,errs.slice(0,2)); await pg.close() }
 console.log(fail?'FAILED':'ALL PASS'); await br.close(); srv.close(); process.exit(fail?1:0) })();
