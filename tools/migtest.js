/* migtest: rename save-key migration (lbo2_ -> lco_, lbo2demo_ -> lcodemo_) + Electron userData migration (steam/main.js).
   PORT=8831 node tools/migtest.js   (needs playwright-core; run from a dir where it resolves, e.g. NODE_PATH=/workspace/qa1/node_modules) */
const fs=require('fs'),os=require('os'),path=require('path'),Module=require('module');
const res={};let fail=0;const ok=(k,v)=>{res[k]=v;if(!v)fail++};
/* 1) Electron userData: stub 'electron' so main.js loads in plain node */
{ const orig=Module._load; Module._load=function(r,...a){ if(r==='electron')return {app:{whenReady:()=>({then(){}}),on(){},setName(){},setPath(){},getPath:()=>os.tmpdir()},BrowserWindow:function(){},ipcMain:{on(){}},Menu:{setApplicationMenu(){}}}; if(r==='./steam')return {}; return orig.call(this,r,...a) };
  const {migrateUserData}=require(path.join(__dirname,'..','steam','main.js')); Module._load=orig;
  const ad=fs.mkdtempSync(path.join(os.tmpdir(),'lcomig-')), old=path.join(ad,'Last Bird Out'), nw=path.join(ad,'Last Chopper Out');
  fs.mkdirSync(path.join(old,'Local Storage','leveldb'),{recursive:true}); fs.writeFileSync(path.join(old,'save.json'),'{"hi":9000}'); fs.writeFileSync(path.join(old,'Local Storage','leveldb','000003.log'),'LS');
  const r1=migrateUserData(ad,nw); ok('electron_copy',r1==='copied:Last Bird Out'&&fs.readFileSync(path.join(nw,'save.json'),'utf8')==='{"hi":9000}'&&fs.existsSync(path.join(nw,'Local Storage','leveldb','000003.log')));
  ok('electron_old_kept',fs.existsSync(path.join(old,'save.json')));
  fs.writeFileSync(path.join(nw,'save.json'),'{"hi":1}'); ok('electron_once',migrateUserData(ad,nw)==='already'&&fs.readFileSync(path.join(nw,'save.json'),'utf8')==='{"hi":1}');
  const ad2=fs.mkdtempSync(path.join(os.tmpdir(),'lcomig-')); ok('electron_fresh',migrateUserData(ad2,path.join(ad2,'Last Chopper Out'))==='none');
  fs.rmSync(ad,{recursive:true}); fs.rmSync(ad2,{recursive:true}) }
/* 2) browser localStorage */
(async()=>{ const {chromium}=require('playwright-core'); const b=await chromium.launch({channel:'chrome',args:['--no-sandbox']}); const c=await b.newContext({viewport:{width:1280,height:720}});
  await c.addInitScript(()=>{ if(!localStorage.getItem('lco_migrated')&&!localStorage.getItem('seeded')){ localStorage.setItem('seeded','1'); localStorage.setItem('lbo2_hiscore','9000'); localStorage.setItem('lbo2_ach',JSON.stringify({first_out:1})); localStorage.setItem('lbo2_tutAsk','1'); localStorage.setItem('lbo2demo_hiscore','1234'); localStorage.setItem('lbo2_loadout','"kit"') } });
  const pg=await c.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  const U='http://localhost:'+(process.env.PORT||8831)+'/?nobrief'; await pg.goto(U); await pg.waitForTimeout(2500);
  const a=await pg.evaluate(()=>({n:window.__lcoMig,hi:localStorage.getItem('lco_hiscore'),ach:localStorage.getItem('lco_ach'),demo:localStorage.getItem('lcodemo_hiscore'),old:localStorage.getItem('lbo2_hiscore'),gameHi:__ms.P3&&__ms.P3.hi?__ms.P3.hi():null,achRead:JSON.stringify(__ms.P3&&__ms.P3.got?__ms.P3.got():null),lo:localStorage.getItem('lco_loadout')}));
  res.first=a; ok('ls_copy',a.n===5&&a.hi==='9000'&&a.demo==='1234'&&a.lo==='"kit"'&&/first_out/.test(a.ach)); ok('ls_old_kept',a.old==='9000');
  await pg.evaluate(()=>{localStorage.setItem('lco_hiscore','12000');localStorage.setItem('lbo2_hiscore','1')}); await pg.reload(); await pg.waitForTimeout(2000);
  const r2=await pg.evaluate(()=>({n:window.__lcoMig,hi:localStorage.getItem('lco_hiscore')})); res.second=r2; ok('ls_once',r2.n===undefined&&r2.hi==='12000');
  const pg2=await c.newPage(); await pg2.goto(U.replace('nobrief','nobrief&nodemo')); await pg2.waitForTimeout(1500); ok('no_errors',errs.length===0); res.errs=errs;
  await b.close(); console.log(JSON.stringify(res)); console.log(fail?'MIGTEST FAIL '+fail:'MIGTEST PASS'); process.exit(fail?1:0) })();
