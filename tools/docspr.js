const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({channel:'chrome',args:['--no-sandbox']}); const pg=await br.newPage({viewport:{width:900,height:420}});
 await pg.goto(B+'index.html?nodemo&nointro&nobrief'); await pg.waitForTimeout(1500);
 const info=await pg.evaluate(()=>{ const c=document.createElement('canvas'); c.width=900;c.height=420; c.style.cssText='position:fixed;left:0;top:0;z-index:99999;background:#7a8a50;image-rendering:pixelated'; document.body.appendChild(c); const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  const S=SHEET1, nm=S.HERO_ID.doc, sp=S.sprites[nm]; let i=0; for(const f of ['idle','walk1','treat']){ try{ S.drawHero(x,'doc',f,100+i*250,380,8,false,false) }catch(e){ return 'err '+e.message } i++ } return nm+' '+Object.keys(sp||{}).join(',') });
 console.log(info); await pg.screenshot({path:'/tmp/docspr3.png'}); await br.close(); srv.close() })();
