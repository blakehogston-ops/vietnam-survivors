#!/usr/bin/env node
/* Headless bot run for balance testing.
 *   cd tools && npm i playwright-core   (needs Chrome/Chromium)
 *   node botrun.js [--url file:///path/index.html] [--char doc] [--minutes 5,10,15] [--seed N]
 * Plays the game at max speed (no rendering) with a "typical player" build policy and a kiting bot, then reports for each
 * checkpoint: survival, level, kills, average DPS, tank deaths, boss kill times, and the minute where progress stalls. */
const {chromium}=require('playwright-core');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>=0?process.argv[i+1]:d};
const URL=arg('url','file://'+require('path').resolve(__dirname,'..','index.html'));
const CHAR=arg('char','doc'), MINS=arg('minutes','5,10,15').split(',').map(Number), RUNS=+arg('runs',1);
(async()=>{
  const browser=await chromium.launch({channel:'chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  for(let run=0;run<RUNS;run++){
    const pg=await browser.newPage({viewport:{width:1280,height:720}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    await pg.goto(URL+'?nodemo&nointro&nobrief&bot&char='+CHAR+'&autostart'); await pg.waitForTimeout(800);
    const report=await pg.evaluate((MINS)=>{
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
        // radio a firebase when an LZ appears and it's calm; stay near the base
        if(m.lzS&&G.p.hp>45){ const dx=m.lzS.x-p.x,dy=m.lzS.y-p.y,d=Math.hypot(dx,dy); if(d>40){ x+=dx/d*.9; y+=dy/d*.9 } else { x=0;y=0; return [0,0] } }
        else if(m.fbS&&m.fbS.state!=='lost'&&calm){ const dx=m.fbS.x-p.x,dy=m.fbS.y-p.y,d=Math.hypot(dx,dy); if(d>110){ x+=dx/d*.8; y+=dy/d*.8 } }
        G.botTimer+=.016; x+=Math.cos(G.botTimer*.3)*.12; y+=Math.sin(G.botTimer*.27)*.12; const l=Math.hypot(x,y); if(l>1){x/=l;y/=l} return [x,y] };
      m.DBG.bot=true; m.DBG.god=false;
      const out=[], marks=MINS.map(v=>v*60); let mi=0, lastKills=0,lastDd=0,lastLvl=1; const per=[]; let minHp=999,t0=performance.now();
      const dt=1/60;
      while(mi<marks.length&&m.state==='play'){
        const G=G0(); m.step(dt); minHp=Math.min(minHp,G.p.hp);
        if(Math.floor(G.t)%60===0&&G.t-Math.floor(G.t)<dt&&Math.floor(G.t)>0&&(per.length<Math.floor(G.t/60))){ per.push({min:per.length+1,lvl:G.p.lvl,kills:G.kills-lastKills,dps:Math.round(((G.dd||0)-lastDd)/60),hpMin:Math.round(minHp),enemies:m.enemies.length,fb:G.fbN}); lastKills=G.kills; lastDd=G.dd||0; minHp=999 }
        if(G.t>=marks[mi]){ out.push({atMin:MINS[mi],alive:true,level:G.p.lvl,kills:G.kills,avgDps:Math.round((G.dd||0)/G.t),weapons:Object.keys(G.w).map(k=>k+G.w[k].lvl).join(' '),passives:Object.keys(G.ps).filter(k=>G.ps[k]).map(k=>k+G.ps[k]).join(' '),
            tankDeaths:(G.tlog||[]).map(q=>q.t+'s(age '+q.age+')'),bosses:(G.blog||[]).map(q=>({n:q.n,spawn:Math.round(q.t0),ttk:q.t1===null?null:+(q.t1-q.t0).toFixed(1)})),firebases:G.fbN,wallMs:Math.round(performance.now()-t0)}); mi++ }
      }
      if(mi<marks.length){ const G=G0(); out.push({atMin:MINS[mi],alive:false,diedAtSec:Math.round(G.t),level:G.p.lvl,kills:G.kills,avgDps:Math.round((G.dd||0)/Math.max(1,G.t)),weapons:Object.keys(G.w).map(k=>k+G.w[k].lvl).join(' '),bosses:(G.blog||[]).map(q=>({n:q.n,spawn:Math.round(q.t0),ttk:q.t1===null?null:+(q.t1-q.t0).toFixed(1)})),tankDeaths:(G.tlog||[]).map(q=>q.t+'s(age '+q.age+')')}) }
      // stall = minute with the lowest kills/lvl growth after minute 2, or lowest hp
      let stall=null; if(per.length>2){ const c=per.slice(2); stall=c.reduce((a,b)=>(b.dps<a.dps?b:a)); }
      return {out,per,stall};
    },MINS);
    console.log('=== run',run+1,'char',CHAR,'==='); for(const o of report.out)console.log(JSON.stringify(o));
    console.log('per-minute:'); for(const p of report.per)console.log(' ',JSON.stringify(p));
    if(report.stall)console.log('weakest minute (lowest DPS after min 2):',JSON.stringify(report.stall));
    if(errs.length)console.log('PAGE ERRORS',errs.slice(0,5)); await pg.close();
  }
  await browser.close();
})();
