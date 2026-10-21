// quick load smoke: node tools/smoke8.js "<query>" ; prints page errors + probe
const {chromium}=require('playwright-core');(async()=>{const b=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('requestfailed',r=>errs.push('REQ '+r.url()));
await p.goto('http://127.0.0.1:8831/'+(process.argv[2]||'?nodemo'),{waitUntil:'domcontentloaded',timeout:120000});await p.waitForTimeout(8000);
const r=await p.evaluate(process.argv[3]||'1').catch(e=>'EVALERR '+e.message);console.log(JSON.stringify({errs,r}));await b.close()})();
