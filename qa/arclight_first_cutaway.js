/* Targeted VM regression: actual controller + updateWeapons from the current index.html; no browser/QA baseline edits. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
let scripts=0; for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:'inline-'+(++scripts)});
const controller=html.slice(html.indexOf('let CUTON=true;'),html.indexOf('function frame(now){'));
const weapons=html.slice(html.indexOf('function updateWeapons(dt){'),html.indexOf('/* M67 flame tank'));
const us=html.indexOf('function update(dt){');
const update=html.slice(us,html.indexOf('\n  if(G&&G.lsT',us))+"throw new Error('simulation guard failed');}";
let checks=0;function ok(v,msg){assert.ok(v,msg);checks++;console.log('PASS '+msg)}
function setup({off=false,hold=false,cold=false}={}){
  let time=1000,plays=0,stops=0,radio=0,rumble=0,resolve;
  const listeners={},storage={},S={slots:{},hasSample:()=>true,
    load:()=>cold?new Promise(r=>{resolve=r}):Promise.resolve({loaded:['arclight_cutaway_30s_v4']}),
    play:(key,o)=>{assert.equal(key,'arclight_cutaway_30s_v4');assert.equal(o.vary,false);assert.equal(o.bus,'special');plays++;return {start:0,end:30,stop(){stops++}}},duckMusic(){},unduckMusic(){}};
  const box={console,Promise,performance:{now:()=>time},location:{search:''},document:{querySelectorAll:()=>[]},
    localStorage:{getItem:()=>off?'0':null,setItem:(k,v)=>{storage[k]=v}},
    setInterval:()=>1,clearInterval(){},clearInput(){},PAD:{pick:()=>null},RFX:false,
    SamplePlayer:S,__simHold:hold,state:'play',G:null,Snd:{play(){radio++},airPlay(){rumble++}},SAMP:{on:true,air(){rumble++;return true}},
    P2ON:false,LO_SMALL:{},FACEAIM:false,SPECW:{arclight:1,boxmission:1},AIRCALL:{arclight:1,boxmission:1},AIR_FX_MAX:10,
    RTO:{on:()=>false},RTO_T:null,CURW:'',TAU:Math.PI*2,rnd:()=>.5,cdRate:()=>1,enemyInView:()=>true,clump:()=>[100,200],refuelRun(){},annc(){},air:[],strikes:[],
    ITEMS:{arclight:{stats:()=>({n:12,rad:50,lat:10,cd:30})},boxmission:{stats:()=>({n:24,rad:50,lat:10,cd:30,lines:3})}},
    addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn)}};
  box.window=box;vm.createContext(box);vm.runInContext(controller+'\n'+weapons+'\n'+update,box);
  const C=box.Cutaway;
  function fresh(ids=['arclight']){box.state='play';box.air=[];box.G={t:20,p:{x:0,y:0,hp:100},w:Object.fromEntries(ids.map(id=>[id,{lvl:1,cd:0}])),ps:{},spec:{wall:1,musW0:1}}}
  fresh();return {box,C,listeners,storage,fresh,advance:n=>{time+=n;C.tick()},settle:async()=>{for(let i=0;i<8;i++)await Promise.resolve()},counts:()=>({plays,stops,radio,rumble}),resolve:()=>resolve({loaded:['arclight_cutaway_30s_v4']})};
}
(async()=>{
  ok(scripts===77,'all 77 inline scripts parse');
  const a=setup();a.box.updateWeapons(.016);
  ok(a.C.cur&&a.box.state==='cutaway'&&a.box.air.length===0,'first B-52 call pauses before any existing air effects spawn');
  ok(a.C.DEFS.arclight.durMs===30000&&a.C.DEFS.arclight.maxMs===30000&&a.C.MAX_MS===4000,'Arc Light allows 30000ms; default clamp remains 4000ms');
  await a.settle();ok(a.counts().plays===1&&a.C.cur.audio.ok,'full mix plays once on special bus without pitch variation');
  a.advance(3201);ok(a.C.cur&&a.box.air.length===0,'not cut off by old 3200ms debug duration');
  const g=a.box.G;a.box.update(.05);ok(g.t===20&&g.p.hp===100,'simulation update guard keeps game time and HP frozen during cutaway');
  a.advance(26798);ok(a.C.cur&&a.box.air.length===0,'no bombs/effects through 29.999 seconds');
  a.advance(1);ok(!a.C.cur&&a.box.state==='play'&&a.box.air.length===1,'natural full end resumes and invokes existing B-52 effect exactly once');
  ok(a.box.air[0].wid==='arclight'&&a.box.air[0].kind===3&&a.box.air[0].delay===2.6&&a.box.air[0].s.n===12,'deferred strike preserves weapon id, bomb count and original 2.6s effect delay');
  ok(a.counts().stops===1&&g.spec.wall===30001,'audio stopped cleanly and spec-op wall timer offsets full pause');
  a.box.G.w.arclight.cd=0;a.box.updateWeapons(.016);ok(a.box.air.length===2&&a.counts().plays===1&&!a.C.cur,'second base call fires instantly, no repeated sequence');
  a.box.G.w={boxmission:{lvl:1,cd:0}};a.box.updateWeapons(.016);
  ok(a.box.air.length===5&&a.counts().plays===1&&!a.C.cur&&Object.keys(g.cutSeen).join()==='arclight','Box Mission shares base seen-flag and spawns three existing runs immediately');
  const b=setup();b.fresh(['boxmission']);b.box.updateWeapons(.016);await b.settle();
  ok(b.C.cur&&b.box.air.length===0&&b.box.G.cutSeen.arclight===1,'Box Mission first also starts the same full paused cutaway');
  b.advance(251);for(const fn of b.listeners.keydown)fn({preventDefault(){},stopImmediatePropagation(){},repeat:false});b.advance(280);
  ok(!b.C.cur&&b.C.last.skipped&&b.C.last.skipSrc==='key'&&b.box.air.length===3&&b.counts().stops===1,'keyboard skip ends audio, resumes, spawns all three Box Mission runs');
  b.box.G.w={arclight:{lvl:1,cd:0}};b.box.updateWeapons(.016);ok(!b.C.cur&&b.box.air.length===4&&b.counts().plays===1,'base call after Box Mission skip does not replay');
  const c=setup({off:true});c.box.updateWeapons(.016);ok(!c.C.cur&&c.box.air.length===1&&c.counts().plays===0,'saved lco_cutaways=0 fires at once with no sequence');
  c.C.setEnabled(true);ok(c.storage.lco_cutaways==='1','menu/pause option persists through existing localStorage key');
  const d=setup({hold:true});d.box.updateWeapons(.016);ok(!d.C.cur&&d.box.air.length===1&&d.C.last.why==='simhold','__simHold harness bypass fires immediately without waiting for frames');
  const e=setup({cold:true});e.box.updateWeapons(.016);await e.settle();e.advance(5000);ok(e.C.cur.loading&&e.box.air.length===0,'cold audio load holds simulation and effect');
  e.resolve();await e.settle();e.advance(29999);ok(e.C.cur&&e.box.air.length===0,'cold load receives full 30 seconds after playback begins');e.advance(1);
  ok(e.box.air.length===1&&e.box.G.spec.wall===35001,'cold-load pause plus playback both offset spec-op wall clock');
  const f=setup({cold:true});f.box.updateWeapons(.016);await f.settle();f.advance(251);
  for(const fn of f.listeners.pointerdown)fn({cancelable:true,preventDefault(){},stopImmediatePropagation(){}});f.advance(280);f.resolve();await f.settle();
  ok(f.box.air.length===1&&f.counts().plays===0&&!f.C.cur,'tap skip during loading fires once and prevents late asynchronous audio');
  const h=setup();h.fresh(['arclight','boxmission']);h.box.updateWeapons(.016);await h.settle();ok(h.C.log.length===1&&h.box.G.w.boxmission.cd===0,'simultaneously ready base/evolution stop weapon iteration at first cutaway');
  h.advance(30000);h.box.updateWeapons(.016);ok(h.counts().plays===1&&h.box.air.length===4,'simultaneous readiness yields one sequence, then both original effects');
  ok(/if\(state==='cutaway'\)Cutaway.tick\(\)/.test(html)&&/if\(state==='cutaway'\)Cutaway.draw\(\)/.test(html),'real frame loop ticks and draws cutaway');
  ok(/if\(state==='cutaway'\)\{ this.mx=this.my=0;/.test(html),'gamepad gameplay input swallowed while cutaway owns skip');
  console.log(`RESULT ${checks} checks passed`);
})().catch(e=>{console.error(e);process.exitCode=1});
