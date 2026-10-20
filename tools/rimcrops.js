/* rc7 #1 v2/v3: 3x crops centred on a Marine and an NVA soldier, day and night (inside flare light), rim on / off. Serves itself on port 0. */
const {chromium}=require('playwright-core'), http=require('http'), fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'), OUT=process.argv[2]||'/tmp/rimcrops';
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)){r.statusCode=404;r.end();return} r.end(fs.readFileSync(f)) });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const B='http://localhost:'+srv.address().port+'/'; fs.mkdirSync(OUT,{recursive:true});
 const br=await chromium.launch({executablePath:process.env.CH||undefined,channel:process.env.CH?undefined:'chrome',args:['--no-sandbox']}); const log=[];
 for(const [sc,tq] of [['day',''],['night','&tod=21']])for(const [rv,rq] of [['off','&unitrim=0'],['on','']]){
  const pg=await br.newPage({viewport:{width:1280,height:720}}); await pg.goto(B+'index.html?nodemo&nointro&nobrief&notut&bot&char=doc&autostart&god&seed=7'+tq+rq); await pg.waitForTimeout(1500);
  const pos=await pg.evaluate(night=>{ window.__simHold=true; const M=__ms; for(let i=0;i<60*70;i++){ if(M.stateX==='levelup')M.pick(0); M.step(1/60) }
    const g=M.G, p=g.p; if(night&&window.VFX_ATMO){ VFX_ATMO.addFlare(p.x+40,p.y-60,'arty155'); for(let i=0;i<60*4;i++)M.step(1/60) }
    { const e=M.spawn&&M.spawn('nva',p.x+110,p.y+30); if(e){ e.spd=0; e.hp=e.mhp=1e9; e.rc=1 } M.step(1/60) }   /* v3: a held NVA in frame (and in the flare at night) so both NVA crops always exist */
    M.render(); const z=window.MZW?MZW.z:1, cv=document.querySelector('canvas'), r=cv.getBoundingClientRect(), k=r.width/cv.width;
    const scr=u=>[r.left+(cv.width/2+(u.x-p.x)*z*(cv.width/r.width))*k, r.top+(cv.height/2+(u.y-p.y)*z*(cv.height/r.height))*k];
    const on=u=>{ const s=scr(u); return s[0]>60&&s[0]<1220&&s[1]>60&&s[1]<660 };
    const U=M.units(), mar=U.m.find(m=>m.hp>0&&!m.hid&&m.coy&&on(m)&&Math.hypot(m.x-p.x,m.y-p.y)>30), nva=U.e.find(e=>e.rc&&on(e))||U.e.find(e=>e.hp>0&&!e.tank&&(e.type==='nva'||e.type==='officer')&&on(e))||U.e.find(e=>e.hp>0&&!e.tank&&on(e));
    return {mar:mar&&scr(mar), nva:nva&&scr(nva), litM:mar&&window.RIMX&&RIMX.lit(mar.x,mar.y), litN:nva&&window.RIMX&&RIMX.lit(nva.x,nva.y), nvaType:nva&&nva.type} },sc==='night');
  for(const k of ['mar','nva']){ const c=pos[k]; if(!c){ log.push(sc+' '+rv+' '+k+': none on screen'); continue } const x=Math.max(0,Math.min(1280-140,c[0]-70)), y=Math.max(0,Math.min(720-100,c[1]-55));
    const f=path.join(OUT,`${sc}_${k==='mar'?'marine':'nva'}_rim${rv}.png`); await pg.screenshot({path:f,clip:{x,y,width:140,height:100}}); log.push(f+(sc==='night'?' lit='+(k==='mar'?pos.litM:pos.litN):'')) }
  await pg.close() }
 console.log(log.join('\n')); await br.close(); srv.close() })();
