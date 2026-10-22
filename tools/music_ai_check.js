// music_ai_check.js - Jungle Dread AI score: every music file loads (no 404), each game state plays the right track, cues don't stack,
// level-up cue is short and ducks the music, ?music=old restores the old load list.  Usage: PORT=8795 CH=<chrome> node tools/music_ai_check.js
const {chromium}=require('playwright-core');(async()=>{ const P=process.env.PORT||8795; const b=await chromium.launch({executablePath:process.env.CH,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']}); let fails=0;
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c)fails++ };
async function open(q,noOgg){ const pg=await b.newPage(); if(noOgg)await pg.addInitScript(()=>{ const f=HTMLMediaElement.prototype.canPlayType; HTMLMediaElement.prototype.canPlayType=function(t){ return /ogg/.test(t)?'':f.call(this,t) } }); const bad=[], got=[], errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  pg.on('response',r=>{ const u=r.url(); if(/\/audio\/music(_ai)?\//.test(u)){ got.push(u.replace(/^.*\/audio\//,'').replace(/\?.*$/,'')); if(r.status()>=400)bad.push(r.status()+' '+u) } });
  pg.on('requestfailed',r=>{ if(/\/audio\/music/.test(r.url()))bad.push('failed '+r.url()) });
  await pg.goto(`http://localhost:${P}/?nodemo&nointro&nobrief${q}`); await pg.waitForTimeout(800); await pg.mouse.click(5,5); return {pg,bad,got,errs} }
const SND=()=>{ const s=SamplePlayer.musicState(); return s.cur };
{ const {pg,bad,got,errs}=await open('');
  await pg.waitForFunction(()=>['ai_menu','ai_full','ai_combat','ai_final','ai_over','win','scene_opening','ai_river','ai_credits'].every(k=>SamplePlayer.hasMusic(k)),null,{timeout:90000}).catch(()=>{});
  await pg.waitForTimeout(1500);
  const L=await pg.evaluate(()=>({on:MusicAI.on,has:['ai_menu','ai_full','ai_combat','ai_final','ai_over','win','scene_opening'].map(k=>k+':'+SamplePlayer.hasMusic(k)),cues:MusicAI.log.filter(x=>typeof x==='string')}));
  ok(L.on,'MusicAI on by default'); ok(L.has.every(x=>x.endsWith('true')),'all game music loaded '+L.has.join(' '));
  const ai=got.filter(u=>u.startsWith('music_ai/')), old=got.filter(u=>u.startsWith('music/'));
  ok(!bad.length,'no 404 / failed music requests '+JSON.stringify(bad)); ok(ai.length===10,'10 music_ai files fetched ('+ai.join(', ')+')');
  ok(old.every(u=>/music_win|music_valkyries_short/.test(u))&&old.some(u=>/music_valkyries_short/.test(u)),'old score only Hymn + Valkyries fetched: '+old.join(', '));
  ok(!L.cues.length,'cues decoded '+JSON.stringify(L.cues));
  ok(await pg.evaluate(()=>__ms.stateX)==='menu'&&await pg.evaluate(SND)==='ai_menu','menu -> ai_menu ('+await pg.evaluate(SND)+')');
  // start a run (no intro), exploration
  const r=await pg.evaluate(async()=>{ const m=__ms, out={}; const w=ms=>new Promise(r=>setTimeout(r,ms)); m.startGame(); window.__simHold=true; await w(2500); out.play=[m.stateX,SamplePlayer.musicState().cur];
    MusicAI.onWave(false,false); await w(2600); out.wave=SamplePlayer.musicState().cur; out.cues1=MusicAI.log.filter(x=>x.cue).map(x=>x.cue);
    // level-up while the wave cue still rings: must not stack
    m.setState('levelup'); MusicAI.tick('levelup',m.G); out.luSkip=MusicAI.log.slice(-1)[0];
    m.setState('play'); MusicAI.tick('play',m.G); await w(7000);
    m.setState('levelup'); MusicAI.lastLu=-1e9; MusicAI.tick('levelup',m.G); await w(400); out.lu=MusicAI.log.slice(-1)[0]; out.luDuck=+SamplePlayer.musicDuckDb().toFixed(1);
    MusicAI.tick('levelup',m.G); out.luOnce=MusicAI.log.filter(x=>x.cue==='levelup').length; m.setState('play'); MusicAI.tick('play',m.G); await w(2600); out.luAfter=+SamplePlayer.musicDuckDb().toFixed(1);
    MusicAI.onWave(true); await w(2600); out.brk=SamplePlayer.musicState().cur; MusicAI.exT=200; await w(2600); out.river=SamplePlayer.musicState().cur; MusicAI.exT=200; await w(2600); out.full2=SamplePlayer.musicState().cur;
    m.G.ex=m.G.ex||m.mkEx&&m.mkEx(); const ex=m.G.ex; if(ex){ ex.ph=4; await w(2600); out.fin=SamplePlayer.musicState().cur; ex.ph=5; MusicAI.tick('play',m.G); out.land=MusicAI.log.slice(-1)[0]; await w(300); out.landDuck=+SamplePlayer.musicDuckDb().toFixed(1); ex.ph=4 }
    out.errsLog=MusicAI.log.filter(x=>typeof x==='string');
    // loss / win
    ex.result='lost'; m.setState('over'); await w(2000); out.loss=SamplePlayer.musicState().cur; await w(7500); out.after=SamplePlayer.musicState().cur;
    ex.result='evac'; m.G.seed=(m.G.seed|0)+1; await w(1500); out.win=SamplePlayer.musicState().cur; MusicAI.winAt-=30; await w(2500); out.cred=SamplePlayer.musicState().cur;
    m.setState('menu'); await w(2500); out.menu2=SamplePlayer.musicState().cur; const d=document.querySelector('details.credits'); if(d){ d.open=true; await w(2500); out.credMenu=SamplePlayer.musicState().cur; d.open=false; await w(2500); out.menu3=SamplePlayer.musicState().cur }
    return out });
  console.log(JSON.stringify(r));
  ok(r.play[1]==='ai_full','gameplay / pre-wave -> ai_full ('+r.play+')'); ok(r.wave==='ai_combat','wave -> ai_combat ('+r.wave+')'); ok(r.cues1.includes('wave'),'wave start cue');
  ok(r.luSkip&&r.luSkip.skip==='levelup','level-up cue skipped while the wave cue rings (no stack) '+JSON.stringify(r.luSkip));
  ok(r.lu&&r.lu.cue==='levelup'&&r.lu.len<=2,'level-up cue short ('+(r.lu&&r.lu.len)+' s)'); ok(r.luDuck<=-5,'music ducked under level-up ('+r.luDuck+' dB)'); ok(r.luOnce===1,'one level-up cue per open'); ok(r.luAfter>-1,'duck released ('+r.luAfter+' dB)');
  ok(r.brk==='ai_full','wave break -> ai_full ('+r.brk+')'); ok(r.fin==='ai_final','extraction (bird inbound) -> ai_final ('+r.fin+')'); ok(r.land&&r.land.cue==='landing','extraction landing cue'); ok(r.landDuck<=-6.5,'music ducked -7 dB under the landing cue ('+r.landDuck+' dB)');
  ok(r.loss==='ai_over','loss -> cue_game_over ('+r.loss+')'); ok(r.after==='ai_menu','after game-over cue -> ai_menu ('+r.after+')'); ok(r.win==='win','win -> Marines Hymn unchanged ('+r.win+')'); ok(r.menu2==='ai_menu','back to menu -> ai_menu'); ok(r.river==='ai_river'&&r.full2==='ai_full','exploration alternates full -> river -> full ('+r.river+','+r.full2+')'); ok(r.cred==='ai_credits','after the win Hymn -> jungle_credits ('+r.cred+')'); ok(r.credMenu==='ai_credits'&&r.menu3==='ai_menu','credits panel on menu -> jungle_credits, closed -> ai_menu ('+r.credMenu+','+r.menu3+')');
  ok(!errs.length,'no page errors '+JSON.stringify(errs.slice(0,3))); await pg.close() }
// Valkyries opening scene untouched
{ const {pg,bad,errs}=await open('&autostart');
  await pg.waitForFunction(()=>SamplePlayer.hasMusic('scene_opening')&&SamplePlayer.hasMusic('ai_combat'),null,{timeout:90000}).catch(()=>{});
  const v=await pg.evaluate(async()=>{ SamplePlayer.musicEvent('opening_in'); await new Promise(r=>setTimeout(r,3000)); return SamplePlayer.musicState() });
  ok(v.scene==='opening'&&v.cur==='scene_opening','Valkyries opening scene plays and holds ('+v.scene+'/'+v.cur+')');
  const v2=await pg.evaluate(async()=>{ await new Promise(r=>setTimeout(r,10500)); return SamplePlayer.musicState() });
  ok(!v2.scene&&/^ai_(full|combat|river)$/.test(v2.cur),'12 s Valkyries clip hands off to the state track at its end ('+v2.scene+'/'+v2.cur+')'); ok(!errs.length&&!bad.length,'no errors/404 (opening)'); await pg.close() }
// ?music=old
{ const {pg,bad,got,errs}=await open('&music=old'); await pg.waitForTimeout(12000);
  const o=await pg.evaluate(()=>({on:MusicAI.on,cur:SamplePlayer.musicState().cur}));
  ok(!o.on&&!got.some(u=>u.startsWith('music_ai/')),'?music=old: AI score off, no music_ai fetched'); ok(got.some(u=>/music_menu/.test(u)),'?music=old: old menu loads ('+o.cur+')'); ok(!bad.length&&!errs.length,'no errors (?music=old)'); await pg.close() }
// format preference: ogg when the browser says it can; m4a only when canPlayType('audio/ogg; codecs=vorbis') is ''
{ const r1=await open(''); await r1.pg.waitForTimeout(12000); const o1=r1.got.filter(u=>u.startsWith('music_ai/')); ok(o1.length&&o1.every(u=>u.endsWith('.ogg')),'ogg-capable browser: music_ai fetched as ogg only ('+o1.length+')'); await r1.pg.close();
  const r2=await open('',true); await r2.pg.waitForTimeout(12000); const o2=r2.got.filter(u=>u.startsWith('music_ai/')); const f2=await r2.pg.evaluate(()=>({cue:MusicAI.fmt,has:SamplePlayer.hasMusic('ai_menu')}));
  ok(o2.length&&o2.every(u=>u.endsWith('.m4a')),'canPlayType ogg = \'\': music_ai fetched as m4a only ('+o2.length+', '+o2.filter(u=>!u.endsWith('.m4a')).join(',')+')'); ok(f2.has&&Object.values(f2.cue).every(x=>x==='m4a'),'m4a decodes (menu + cues '+JSON.stringify(f2.cue)+')'); ok(!r2.bad.length&&!r2.errs.length,'no errors (m4a path)'); await r2.pg.close() }
await b.close(); console.log(fails?`FAIL ${fails}`:'PASS music_ai_check'); process.exit(fails?1:0) })();
