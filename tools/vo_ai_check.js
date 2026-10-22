// AI VO check: every manifest file loads (no 404), radio lines only via radioLine (dry/), in-person only via play(), sinks fire, tier switch.
// Usage: PORT=8787 CH=<chrome> node tools/vo_ai_check.js   (exit 1 on FAIL)
const {chromium}=require('playwright-core');(async()=>{ const P=process.env.PORT||8787; const b=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']}); let fails=0;
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c)fails++ };
async function open(q){ const pg=await b.newPage(); const bad=[], got=[], errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  pg.on('response',r=>{ const u=r.url(); if(u.includes('/audio/vo_ai/')){ got.push(u); if(r.status()>=400)bad.push(r.status()+' '+u) } });
  pg.on('requestfailed',r=>{ if(r.url().includes('/audio/vo_ai/'))bad.push('failed '+r.url()) });
  await pg.goto(`http://localhost:${P}/?nodemo&nointro&nobrief&god&char=doc&autostart${q}`); await pg.waitForTimeout(1500); await pg.mouse.click(5,5);
  await pg.waitForFunction(()=>window.VOAI&&VOAI.stats().done,null,{timeout:60000}).catch(()=>{}); return {pg,bad,got,errs} }
{ const {pg,bad,got,errs}=await open('');
  const s=await pg.evaluate(()=>VOAI.stats()); const L=await pg.evaluate(()=>Object.values(VOAI.LINES).map(l=>[l.id,l.radio,l.friends,l.file]));
  ok(L.length===171,'171 lines in the table ('+L.length+')'); ok(s.tier==='friends','default tier friends'); ok(s.loaded===171&&!s.failed.length,'all 171 slots loaded (loaded '+s.loaded+', failed '+JSON.stringify(s.failed)+')');
  ok(!bad.length,'no 404 / failed VO requests '+JSON.stringify(bad.slice(0,5)));
  const radio=new Set(L.filter(x=>x[1]).map(x=>x[3])); const wetRadio=got.filter(u=>!u.includes('/dry/')&&[...radio].some(f=>u.endsWith('/'+f+'.ogg')||u.endsWith('/'+f+'.m4a')));
  const dryPerson=got.filter(u=>u.includes('/dry/')&&![...radio].some(f=>u.endsWith('/'+f+'.ogg')||u.endsWith('/'+f+'.m4a')));
  ok(!wetRadio.length,'radio lines fetched from dry/ only (baked radio takes never loaded) '+wetRadio.length); ok(!dryPerson.length,'in-person lines never from dry/ '+dryPerson.length);
  // instrument SamplePlayer: which path plays each VO slot
  const r=await pg.evaluate(async()=>{ const S=SamplePlayer, use={}; const wrap=k=>{ const f=S[k]; S[k]=function(sl,o){ if(typeof sl==='string'&&sl.startsWith('voai_'))(use[sl]||(use[sl]=new Set())).add(k); return f.apply(this,arguments) } }; wrap('play'); wrap('radioLine');
    const m=__ms; window.__simHold=true; const out={mis:[],cards:0};
    for(const L of Object.values(VOAI.LINES)){ if(!L.text)continue; const mm=VOAI.match(L.text); if(mm!==L)out.mis.push(L.id); const c={text:L.text,dur:1,t:0}; if(VOAI.card(c))out.cards++; VOAI.cardEnd(c) }
    // G22 splice
    const c={text:"Pad is marked. Confirm your signal with the bird, then get your Marines on that circle. Pad's off to the northwest, 34 meters.",dur:4,t:0}; VOAI.card(c); out.g22=c.text; out.g22log=VOAI.stats().log.slice(-3).map(x=>x[0]);
    // composite 'Doc ...  -  Bird: ...' cards (UNMATCHED_TRIAGE): Doc clip then Bird clip
    out.comp=[]; for(const t of ["Bird, Doc. Negative, that's not our smoke. Over.  -  Bird: Roger. Looking again. Over.","Bird, Doc. Roger green. Over.  -  Bird: Wilco. Setting down on your smoke. Over."]){ const c={text:t,dur:2,t:0}; VOAI.card(c); out.comp.push(VOAI.stats().log.slice(-2).map(x=>x[0]).join('>')); VOAI.cardEnd(c) }
    // real sinks: gunny card, radio banner, bark
    const before=VOAI.stats().fired; m.gunny("Smoke's out.",1.6,1,'GUNNY'); for(let i=0;i<5;i++)m.step(1/60);
    const g=m.G; g.banner=null; for(let i=0;i<60*4;i++){ if(m.stateX==='levelup'){m.pick(0);continue} m.step(1/60) } g.banner=null; g.rq=[{at:g.t,text:'Hellborne Two-One: "In hot"'}]; for(let i=0;i<3;i++)m.step(1/60);
    out.after=VOAI.stats().fired; out.bannerT=g.banner&&g.banner.t; window.__simHold=false;
    const u={}; for(const k in use)u[k]=[...use[k]]; out.use=u; out.plays=VOAI.stats().plays; return out });
  ok(!r.mis.length,'every captioned line maps to its own clip '+JSON.stringify(r.mis));
  const both=Object.entries(r.use).filter(([k,v])=>v.length>1), wrong=Object.entries(r.use).filter(([k,v])=>{ const id=L.find(x=>'voai_'+x[3]===k); return id&&(id[1]?v[0]!=='radioLine':v[0]!=='play') });
  ok(!both.length&&!wrong.length,'no double processing: radio slots only radioLine, in-person only play ('+Object.keys(r.use).length+' slots, both='+both.length+', wrong='+wrong.length+')');
  ok(r.g22==="Pad is marked. Confirm your signal with the bird, then get your Marines on that circle. Pad's off to the northwest, 30 meters."&&r.g22log.join()==='G12,G22-northwest,G22-30','G22: G12 then dir then dist (34 -> 30 m, caption rewritten) '+r.g22log);
  ok(r.comp[0].endsWith('D05')&&r.comp[1]==='D04>P07','composite cards split at "  -  Bird: ": '+r.comp.join(' | '));
  ok((r.after['G00']|0)>=2,'gunny card sink plays G00'); ok((r.after['P05']|0)>=1&&r.bannerT>=2,'radio banner sink plays P05, banner held for the clip ('+r.bannerT+')');
  ok(!errs.length,'no page errors '+errs.slice(0,2)); console.log('plays',JSON.stringify(r.plays)); await pg.close() }
{ const {pg,errs}=await open('&tier=public'); const s=await pg.evaluate(()=>VOAI.stats()); const k=await pg.evaluate(()=>[SamplePlayer.hasSample('voai_vo_ho_k01'),SamplePlayer.hasSample('voai_vo_ho_k02'),VOAI.byId('HO-K01')]);
  ok(s.tier==='public'&&s.loaded===169&&!k[0]&&!k[1]&&!k[2],'public tier: HO-K01/K02 not loaded, not playable (loaded '+s.loaded+')'); ok(!errs.length,'no page errors (public)'); await pg.close() }
{ const {pg}=await open('&vo=0'); const s=await pg.evaluate(()=>VOAI.stats()); ok(!s.on&&s.loaded===0,'?vo=0: nothing loaded'); await pg.close() }
console.log(fails?'VOAI FAIL '+fails:'VOAI PASS'); await b.close(); process.exit(fails?1:0) })();
