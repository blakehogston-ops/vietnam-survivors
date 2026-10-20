/* rc7 #5-8 numbers: per seed sim to 5:00 with the bot - air cards offered per level-up, RTO alive at 5:00, lull cues, friendly-mortar shell distance to Doc. Serves itself on port 0. usage: node tools/feel58.js "&flags" */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'), Q=process.argv[2]||'';
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox']}); const out=[];
 for(const seed of [11,22,33,44,55,66,77,88]){ const pg=await br.newPage();
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&char=doc&autostart&seed='+seed+Q); await pg.waitForTimeout(1200);
  out.push(await pg.evaluate(()=>{ window.__simHold=true; const M=__ms,g=()=>M.G; let cues=0, lastB='';
    for(let i=0;i<60*300;i++){ if(M.stateX==='levelup')M.pick(0); if(M.stateX==='sig')M.step(0); M.step(1/60); const b=g().banner; if(b&&b.text&&b.text!==lastB&&/^LULL/.test(b.text))cues++; lastB=b&&b.text||''; if(M.stateX==="over"||M.stateX==="end"||g().t>=300)break }
    const AC={boxmission:1,spooky:1,arclight:1,strafe:1,napalm:1}, L=g().luLog||[]; const air=L.filter(c=>c.some(k=>AC[k])).length;
    return {t:Math.round(g().t),lu:L.length,air,rtoAlive:!g().rtoLost,cues,state:M.stateX} })); await pg.close() }
 const s=k=>out.reduce((a,o)=>a+(+o[k]),0); console.log(JSON.stringify(out)); console.log('SUM levelups',s('lu'),'withAir',s('air'),'rtoAlive',s('rtoAlive')+'/'+out.length,'lullCues',s('cues'));
 await br.close(); srv.close() })();
