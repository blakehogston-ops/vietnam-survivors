#!/usr/bin/env node
/* Firebase early-build stress test. Starts a run (?t=START), lets the bot radio a firebase, then keeps N extra siege enemies
 * (type vc) around the site during the first --until seconds of the call-in and reports build progress / engineers.
 *   node fbstress.js [--n 120] [--until 45] [--runs 4] [--start 480] [--god] [--url file:///.../index.html]
 * PASS = progress >= 25% at age 40 s (sandbag ring up) and >= 1 engineer alive at age 40 s, in every run. */
const {chromium}=require('playwright-core');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>=0?process.argv[i+1]:d};
const URL=arg('url','file://'+require('path').resolve(__dirname,'..','index.html')), N=+arg('n',120), UNTIL=+arg('until',45), RUNS=+arg('runs',4), START=+arg('start',480), SEED=process.argv.includes('--god');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  let fails=0;
  for(let run=0;run<RUNS;run++){
    const pg=await browser.newPage({viewport:{width:1280,height:720}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
    await pg.goto(URL+'?nodemo&nointro&nobrief&bot&autostart&char=doc&t='+START+(SEED?'&god':'')); await pg.waitForTimeout(800);
    const r=await pg.evaluate(({N,UNTIL})=>{
      const m=__ms,G0=()=>m.G; window.__simHold=true; const dt=1/60;
            let rows=[],last=-9,at40=null; for(let i=0;i<300;i++)m.step(dt); if(!m.lzS&&!m.fbS)m.spawnLz(); if(!m.fbS)m.beginFirebase();
      for(let i=0;i<60*400&&m.state==='play';i++){
        m.step(dt); const f=m.fbS; if(!f||f.state==='inbound')continue;
        if(f.age<UNTIL&&f.age-last>=3){ last=f.age; const have=m.enemies.filter(e=>!e.dead&&e.siege).length; for(let k=have;k<N;k++){ const a=Math.random()*6.283, d=140+Math.random()*160; const e=m.spawnEnemy('vc',f.x+Math.cos(a)*d,f.y+Math.sin(a)*d,true); if(e)e.siege=true } }
        if(Math.abs(f.age%5)<dt&&f.age>1){ rows.push([+f.age.toFixed(0),f.state,+f.prog.toFixed(3),m.engs.length,m.enemies.length,Math.round(G0().p.hp)]) }
        if(at40===null&&f.age>=40)at40={prog:+f.prog.toFixed(3),engs:m.engs.length,state:f.state,structs:m.strs.length};
        if(f.age>=100||f.state==='done'&&f.age>UNTIL+20)break;
      }
      const f=m.fbS; return {rows,at40,end:f?{age:+f.age.toFixed(1),state:f.state,prog:+f.prog.toFixed(3),log:f.log}:null};
    },{N,UNTIL});
    const ok=r.at40&&r.at40.prog>=.25&&r.at40.engs>=1; if(!ok)fails++;
    console.log('run',run+1,ok?'PASS':'FAIL','at40',JSON.stringify(r.at40),'end',JSON.stringify(r.end&&{age:r.end.age,state:r.end.state,prog:r.end.prog,sand:r.end.log.sandbagsAt,turret:r.end.log.turretAt,done:r.end.log.doneAt,lost:r.end.log.lostAt}));
    console.log('   [age,state,prog,engs,enemies,hp]',JSON.stringify(r.rows.slice(0,14)));
    if(errs.length)console.log('   ERRORS',errs.slice(0,3)); await pg.close();
  }
  await browser.close(); console.log(fails?('STRESS FAIL '+fails+'/'+RUNS):'STRESS PASS'); process.exit(fails?1:0);
})();
