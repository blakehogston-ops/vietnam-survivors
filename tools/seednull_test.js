#!/usr/bin/env node
/* rc8.2 seed_title_null: __lco.seed() is null on the title menu (incl. ?nodemo throwaway G) and in demo; equals the run seed and stays stable
   for the whole run (play/pause/levelup/over); the end-card seed text shows the same value. Node only, no browser. Exit 1 on any FAIL. */
const fs=require('fs'), path=require('path'); const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let fails=0; const T=(n,ok,x)=>{ console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+x:'')); if(!ok)fails++ };
const line=src.split('\n').find(l=>l.startsWith("Object.defineProperty(window.__lco,'seed'")); T('getter line found',!!line); if(!line)process.exit(1);
const seedFn=line.match(/value:(function\(\)\{[\s\S]*?\}),writable/)[1];
const tx=src.match(/seedTx='Seed '\+g\.seed/); T('end card shows "Seed "+g.seed',!!tx);
const ns=src.match(/function newSeed\(\)\{[^\n]*\n[^\n]*/)[0]; const sr=src.match(/function seedRun\(sd\)\{[^\n]*\}/)[0];
// sandbox: real newSeed/seedRun + the newGame seed lines + the shipped getter, driven through title -> run -> pause -> levelup -> over -> menu
function world(q){ const ls={}, localStorage={getItem:k=>ls[k]??null,setItem:(k,v)=>{ls[k]=String(v)}}, params=new URLSearchParams(q);
  const env={}; new Function('params','localStorage','env',`let RSEED=0,_rs=1,state='menu',G=null; ${sr}\n${ns}
    function newGame(demo){ let seed=0; if(!demo){ seed=newSeed(); seedRun(seed); try{ localStorage.setItem('lco_lastseed',String(seed)) }catch(e){} } G={demo,t:0}; G.seed=seed }
    const seed=${seedFn}; env.seed=seed; env.set=s=>{state=s}; env.newGame=newGame; env.G=()=>G;`)(params,localStorage,env); return env }
for(const q of ['?nodemo','','?seed=23&nodemo','?seed=23']){ const w=world(q), nod=/nodemo/.test(q);
  w.newGame(!nod);   /* load: line 8767 */
  T(`[${q}] title menu seed() === null`,w.seed()===null,String(w.seed()));
  w.set('menu'); w.newGame(false); w.set('play'); const run=w.G().seed;   /* startGame() */
  const vals=['play','paused','levelup','play','mohcard','sig','over'].map(s=>{ w.set(s); return [w.seed(),w.seed()] }).flat();
  T(`[${q}] in-run seed() == G.seed, stable across play/pause/levelup/over (${vals.length} reads)`,vals.every(v=>v===run)&&typeof run==='number',run);
  if(/seed=23/.test(q))T(`[${q}] ?seed=23 honoured`,run===23);
  w.set('over'); T(`[${q}] end card text matches seed()`,('Seed '+w.G().seed)===('Seed '+w.seed()));
  w.set('menu'); T(`[${q}] back on menu after run -> null`,w.seed()===null);
  w.newGame(false); w.set('play'); const run2=w.G().seed; T(`[${q}] next run gets its own seed (never repeats last unless ?seed)`,/seed=23/.test(q)?run2===23:run2!==run,run+'->'+run2) }
{ const w=world(''); w.newGame(true); w.set('play'); T('demo G (attract) -> null',w.seed()===null) }
T('getter is read-only (no setter, writable:false)',/writable:false,configurable:false/.test(line));
T('G.seed assigned only in newGame (resume restores the saved run seed via Object.assign)',(src.match(/\bG\.seed=(?!=)/g)||[]).length===1);
console.log(fails?`seednull_test: ${fails} FAIL`:'seednull_test: ALL PASS'); process.exit(fails?1:0)
