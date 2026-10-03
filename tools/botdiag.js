#!/usr/bin/env node
/* Headless bot run for balance testing.
 *   cd tools && npm i playwright-core   (needs Chrome/Chromium)
 *   node botrun.js [--url file:///path/index.html] [--char doc] [--minutes 5,10,15] [--runs N] [--mission]
 * --mission plays each run to its end (evacuation, death, or Huey leaving empty; capped at 15 min) and prints the EXTRACTION summary:
 *   % of runs that reach the LZ (10:00), % that pop a signal, % that evacuate, how failures happened, and hold kills.
 * Plays the game at max speed (no rendering) with a "typical player" build policy and a kiting bot, then reports for each
 * checkpoint: survival, level, kills, average DPS, tank deaths, boss kill times, and the minute where progress stalls. */
const {chromium}=require('playwright-core');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>=0?process.argv[i+1]:d};
const URL=arg('url','file://'+require('path').resolve(__dirname,'..','index.html'));
const MISSION=process.argv.includes('--mission'), CHAR=arg('char','doc'), MINS=(MISSION&&!process.argv.includes('--minutes')?'':arg('minutes','5,10,15')).split(',').filter(Boolean).map(Number), RUNS=+arg('runs',1), LIMIT=+arg('limit',900);
const SUMMARY=[];
(async()=>{
  const browser=await chromium.launch({channel:'chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  for(let run=0;run<RUNS;run++){ const t00=Date.now();
    const pg=await browser.newPage({viewport:{width:1280,height:720}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    await pg.goto(URL+'?nodemo&nointro&nobrief&bot&char='+CHAR+'&autostart'); await pg.waitForTimeout(800);
    const report=await pg.evaluate(({MINS,MISSION,LIMIT})=>{
      const m=__ms,G0=()=>m.G; window.__simHold=true;
      const WPRI=['m16','m60','tank','m79','claymore','mortar','arclight','strafe','squad','howitzer','napalm','huey','flame','ranch','gunboat'];
      const PPRI={helmet:42,flak:44,regen:41,boots:36,magnet:30,radio:40,fm:34,demo:32,dustoff:46,kc135:49};
      m.BOTF.pick=ch=>{ const G=G0(); let best=0,bs=-1; ch.forEach((id,i)=>{ const it=m.ITEMS?m.ITEMS[id]:null; let sc=10;
          if(m.EVOS[id])sc=200; else if(G.w[id]){ sc=50+G.w[id].lvl } else if(WPRI.indexOf(id)>=0){ sc=(Object.keys(G.w).length<6?72:12)-WPRI.indexOf(id)*.6 } else if(PPRI[id])sc=PPRI[id]-(G.ps[id]|0)*3;
          if(id==='ration')sc=1; if(sc>bs){bs=sc;best=i} }); return best };
      m.BOTF.move=()=>{ const G=G0(),p=G.p; let x=0,y=0; const es=m.enemies;
        for(let i=0;i<es.length;i++){ const e=es[i]; if(e.dead)continue; const dx=p.x-e.x,dy=p.y-e.y,d2=dx*dx+dy*dy; if(d2<260*260){ const d=Math.sqrt(d2)+8; const w=1/(d*d)*(e.boss||e.tank?1.4:1); x+=dx/d*w*5200; y+=dy/d*w*5200 } }
        // grab gems (only when calm)
        let calm=Math.hypot(x,y)<.35; if(calm){ let bd=1e9,bg=null; for(const g of m.gems){ const dx=g.x-p.x,dy=g.y-p.y,d=dx*dx+dy*dy; if(d<bd&&d<420*420){bd=d;bg=g} } if(bg){ const d=Math.sqrt(bd)+1; x+=(bg.x-p.x)/d*.7; y+=(bg.y-p.y)/d*.7 } }
        // a typical player pops their character ability when hurt or swamped, and runs for the green heal drops when low
        if(G.char&&G.abCd<=0&&(p.hp<p.maxHp*.5||(es.length>180&&p.hp<p.maxHp*.8)))m.useAbility();
        if(p.hp<p.maxHp*.65){ let bd=1e18,bg=null; for(const g of m.gems){ if(g.t!==3)continue; const d=(g.x-p.x)**2+(g.y-p.y)**2; if(d<bd&&d<650*650){bd=d;bg=g} } if(bg){ const d=Math.sqrt(bd)+1; x+=(bg.x-p.x)/d*1.0; y+=(bg.y-p.y)/d*1.0 } }
        // dodge incoming rocket/shell blast circles (what any human does when the warning ring appears)
        for(const q of m.eprojs){ if(q.tdm&&q.trk)continue; const dx=p.x-q.tx,dy=p.y-q.ty,d=Math.hypot(dx,dy)+1,R=q.rad+34; if(d<R){ const w=2.6*(1-d/R)+.5; x+=dx/d*w; y+=dy/d*w; calm=false } }
        // EXTRACTION: fetch a dropped signal, hold the LZ after popping, then run for the Huey and stand in its ring
        const ex=G.ex;
        if(ex&&ex.ph<=1&&!G.sig.length&&m.sigs.length&&p.hp>40){ let bs=null,bd=1e18; for(const s of m.sigs){ const d=(s.x-p.x)**2+(s.y-p.y)**2; if(d<bd){bd=d;bs=s} } const d=Math.sqrt(bd)+1; x+=(bs.x-p.x)/d*1.3; y+=(bs.y-p.y)/d*1.3 }
        else if(ex&&ex.ph===3&&ex.lz){ const dx=ex.lz.x-p.x,dy=ex.lz.y-p.y,d=Math.hypot(dx,dy); if(d>70){ x+=dx/d*1.1; y+=dy/d*1.1 } }
        else if(ex&&ex.ph===4&&ex.huey){ const dx=ex.huey.x-p.x,dy=ex.huey.y-p.y,d=Math.hypot(dx,dy); if(d>22){ x=x*.25+dx/d*1.2; y=y*.25+dy/d*1.2 } else { return [0,0] } }
        // radio a firebase when an LZ appears and it's calm; stay near the base
        else if(m.lzS&&G.p.hp>45){ const dx=m.lzS.x-p.x,dy=m.lzS.y-p.y,d=Math.hypot(dx,dy); if(d>40){ x+=dx/d*.9; y+=dy/d*.9 } else { x=0;y=0; return [0,0] } }
        else if(m.fbS&&m.fbS.state!=='lost'&&calm){ const dx=m.fbS.x-p.x,dy=m.fbS.y-p.y,d=Math.hypot(dx,dy); if(d>110){ x+=dx/d*.8; y+=dy/d*.8 } }
        G.botTimer+=.016; x+=Math.cos(G.botTimer*.3)*.12; y+=Math.sin(G.botTimer*.27)*.12; const l=Math.hypot(x,y); if(l>1){x/=l;y/=l} return [x,y] };
      m.DBG.bot=true; m.DBG.god=false;
      const out=[], marks=MINS.map(v=>v*60); let mi=0, lastKills=0,lastDd=0,lastLvl=1; const per=[]; let minHp=999,t0=performance.now();
      const dt=1/60;
      let exLog=null;
      while((mi<marks.length||MISSION)&&m.state==='play'&&G0().t<LIMIT){
        const G=G0(); m.step(dt); minHp=Math.min(minHp,G.p.hp); (window.__hist=window.__hist||[]).push(G.p.hp); if(window.__hist.length>1200)window.__hist.shift(); if(G.p.hp<=0||m.state!=='play'){ const p=G.p; const near={}; for(const e of m.enemies){ if(Math.hypot(e.x-p.x,e.y-p.y)<60)near[e.type]=(near[e.type]||0)+1 } window.__death={t:Math.round(G.t),boss:G.boss&&!G.boss.dead?G.boss.name:null,near,eproj:m.eprojs.length,enemies:m.enemies.length,hp10:Math.round(window.__hist[Math.max(0,window.__hist.length-600)]),hp5:Math.round(window.__hist[Math.max(0,window.__hist.length-300)]),hp2:Math.round(window.__hist[Math.max(0,window.__hist.length-120)]),maxHp:p.maxHp,tanks:m.enemies.filter(e=>e.tank).length,rpgt:m.enemies.filter(e=>e.type==='rpgt').length} }
        if(Math.floor(G.t)%60===0&&G.t-Math.floor(G.t)<dt&&Math.floor(G.t)>0&&(per.length<Math.floor(G.t/60))){ per.push({min:per.length+1,lvl:G.p.lvl,kills:G.kills-lastKills,dps:Math.round(((G.dd||0)-lastDd)/60),hpMin:Math.round(minHp),enemies:m.enemies.length,fb:G.fbN}); lastKills=G.kills; lastDd=G.dd||0; minHp=999 }
        if(mi<marks.length&&G.t>=marks[mi]){ out.push({atMin:MINS[mi],alive:true,level:G.p.lvl,kills:G.kills,avgDps:Math.round((G.dd||0)/G.t),weapons:Object.keys(G.w).map(k=>k+G.w[k].lvl).join(' '),passives:Object.keys(G.ps).filter(k=>G.ps[k]).map(k=>k+G.ps[k]).join(' '),
            tankDeaths:(G.tlog||[]).map(q=>q.t+'s(age '+q.age+')'),bosses:(G.blog||[]).map(q=>({n:q.n,spawn:Math.round(q.t0),ttk:q.t1===null?null:+(q.t1-q.t0).toFixed(1)})),firebases:G.fbN,wallMs:Math.round(performance.now()-t0)}); mi++ }
      }
      if(mi<marks.length&&m.state!=='play'){ const G=G0(); out.push({atMin:MINS[mi],alive:false,diedAtSec:Math.round(G.t),level:G.p.lvl,kills:G.kills,avgDps:Math.round((G.dd||0)/Math.max(1,G.t)),weapons:Object.keys(G.w).map(k=>k+G.w[k].lvl).join(' '),bosses:(G.blog||[]).map(q=>({n:q.n,spawn:Math.round(q.t0),ttk:q.t1===null?null:+(q.t1-q.t0).toFixed(1)})),tankDeaths:(G.tlog||[]).map(q=>q.t+'s(age '+q.age+')')}) }
      // stall = minute with the lowest kills/lvl growth after minute 2, or lowest hp
      let stall=null; if(per.length>2){ const c=per.slice(2); stall=c.reduce((a,b)=>(b.dps<a.dps?b:a)); }
      { const G=G0(), e=G.ex; exLog={reached:e.reached,popped:e.popped,evac:e.evac,result:e.result||(m.state==='play'?'timeout':'?'),kind:e.kind,col:e.col,popAt:e.popped?Math.round(e.popAt):null,holdKills:e.holdKills,endT:Math.round(G.t),level:G.p.lvl,kills:G.kills,dropped:e.dropped,score:m.exScore(G)} }
      return {out,per,stall,exLog,death:window.__death};
    },{MINS,MISSION,LIMIT});
    console.log('=== run',run+1,'char',CHAR,'==='); for(const o of report.out)console.log(JSON.stringify(o));
    console.log('per-minute:'); for(const p of report.per)console.log(' ',JSON.stringify(p));
    if(report.death)console.log('DEATH',JSON.stringify(report.death)); if(report.exLog){ console.log('extraction:',JSON.stringify(report.exLog)); SUMMARY.push(report.exLog) }
    if(report.stall)console.log('weakest minute (lowest DPS after min 2):',JSON.stringify(report.stall));
    if(errs.length)console.log('PAGE ERRORS',errs.slice(0,5)); await pg.close();
  }
  await browser.close();
  if(SUMMARY.length){ const n=SUMMARY.length, c=f=>SUMMARY.filter(f).length, pc=k=>Math.round(k/n*100)+'% ('+k+'/'+n+')'; const by={}; SUMMARY.forEach(r=>by[r.result]=(by[r.result]||0)+1);
    console.log('=== EXTRACTION SUMMARY ('+n+' runs, char '+CHAR+') ===');
    console.log('reached LZ (10:00):',pc(c(r=>r.reached)),' target >= 70%');
    console.log('popped signal     :',pc(c(r=>r.popped)));
    console.log('evacuated         :',pc(c(r=>r.evac)),' target 40-50%');
    console.log('results           :',JSON.stringify(by));
    const hk=SUMMARY.filter(r=>r.popped).map(r=>r.holdKills); if(hk.length)console.log('avg hold kills    :',Math.round(hk.reduce((a,b)=>a+b,0)/hk.length)) }
})();
