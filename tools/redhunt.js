const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/';
 const br=await chromium.launch({channel:'chrome',args:['--no-sandbox']}); const pg=await br.newPage({viewport:{width:1280,height:800}});
 await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&autostart&give=m60:4,shotgun:3,napalm:3,arclight:4,tank:2'); await pg.waitForTimeout(1500);
 let found=0;
 for(let k=0;k<200&&found<3;k++){ const r=await pg.evaluate(()=>{ window.__simHold=true; const M=__ms; for(let i=0;i<30;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60) } M.render&&M.render(); const c=document.querySelector('canvas'); const x=c.getContext('2d'); const W=c.width,H=c.height, d=x.getImageData(0,0,W,H).data; let best=null;
   for(let y=Math.floor(H*.06);y<H*.9;y+=3)for(let X=0;X<W;X+=3){ let n=0; for(let yy=0;yy<10;yy++)for(let xx=0;xx<10;xx++){ const i=((y+yy)*W+X+xx)*4; if(d[i]>190&&d[i+1]<80&&d[i+2]<80)n++ } if(n>=85){best=[X,y,W,H];break} if(best)break }
   return best });
  if(r){ found++; await pg.screenshot({path:'/tmp/red_'+found+'.png'}); console.log('red block at',JSON.stringify(r)) } }
 await br.close(); srv.close() })();
