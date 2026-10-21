const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({channel:'chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 for(const q of ['','c4=alt']){ const errs=[],bad=[]; const pg=await br.newPage(); pg.on('pageerror',e=>errs.push(e.message)); pg.on('response',r=>{ if(r.status()>=400)bad.push(r.url()); if(/music_(menu_theme|menu_asian)\b/.test(r.url()))bad.push('REMOVED TRACK '+r.url()) });
  await pg.goto(B+'index.html?'+q); await pg.waitForTimeout(1500); await pg.mouse.click(300,300); await pg.waitForTimeout(12000);
  const o=await pg.evaluate(()=>{ const T=['menu_intro','menu_theme','combat','combat_2','combat_3','combat_4','combat_5','extraction','win','loss','briefing','menu']; return {has:T.filter(k=>{ try{return SamplePlayer.hasMusic(k)}catch(e){return false} }), cur:SamplePlayer.currentMusic&&SamplePlayer.currentMusic(), c4:SAMPLE_MANIFEST.music.tracks.combat_4.file, log:(__ms.MUSX&&__ms.MUSX.log||[]).slice(-3), sting:!!SamplePlayer.hasSample&&SamplePlayer.hasSample('rto_down_sting')} });
  console.log(q||'default',JSON.stringify(o),'errs',errs,'404',bad); await pg.close() }
 await br.close(); srv.close() })();
