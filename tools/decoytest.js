/* RC4 soft-lock test: force a decoy (?decoy=1), answer NO to it, then (mode a) YES to the real smoke or (mode b) NO to everything; the bird must land. */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/'; let fail=0;
 const br=await chromium.launch({channel:'chrome',args:['--no-sandbox']});
 for(const mode of ['yes-real','no-all']){ const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(B+'index.html?nodemo&nointro&nobrief&bot&god&char=doc&autostart&decoy=1'); await pg.waitForTimeout(2000);
  const o=await pg.evaluate(mode=>{ const m=__ms; window.__simHold=true; m.DBG.god=true; const L={asks:[],hud:[]}; let it=0, rejAt=null;
    while(it++<60*600){ const st=m.stateX; if(st==='over')break; if(st==='levelup'){ m.pick(0); continue }
      const ex=m.G.ex; if(ex&&ex.pad&&ex.ph>=3)m.BOTF.move=()=>{ const p=m.G.p,dx=ex.pad.x-p.x,dy=ex.pad.y-p.y,d=Math.hypot(dx,dy); return d<10?[0,0]:[dx/d,dy/d] };
      if(st==='sig'){ const c=ex.call; L.asks.push({t:+m.G.t.toFixed(1),look:c.look}); const yes=mode==='yes-real'&&c.look==='real'; if(c.look==='charlie'&&rejAt===null)rejAt=m.G.t; window.__ans(yes); if(L.asks.length>12)break; continue }
      m.step(1/60); if(ex&&ex.ph===4&&ex.call&&ex.call.st!=='ok'&&Math.floor(m.G.t*2)%10===0){ const h=document.body.innerText; }
      if(ex&&ex.ph>=5){ L.landed=+m.G.t.toFixed(1); break } }
    const ex=m.G.ex; L.rejAt=rejAt&&+rejAt.toFixed(1); L.ph=ex&&ex.ph; L.decoyAsked=L.asks.filter(a=>a.look==='charlie').length; return L },mode);
  const ok=o.landed&&o.decoyAsked===1&&o.rejAt!==null&&o.landed-o.rejAt<40; if(!ok)fail++;
  console.log(ok?'PASS':'FAIL',mode,JSON.stringify(o),'errors',errs); await pg.close() }
 await br.close(); srv.close(); process.exit(fail?1:0) })();
