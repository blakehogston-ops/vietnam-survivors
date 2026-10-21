const {chromium}=require('playwright-core');
const CH=process.env.CH, SEEDS=(process.env.SEEDS||'').split(',').filter(Boolean), N=SEEDS.length||+(process.argv[2]||10), Q=process.argv[3]||'';
(async()=>{ const br=await chromium.launch({executablePath:CH,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const res=[];
 for(let r=0;r<N;r++){ const ctx=await br.newContext({viewport:{width:1280,height:720}}); const pg=await ctx.newPage();
  const cdp=await ctx.newCDPSession(pg); await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await pg.goto('http://127.0.0.1:8831/?nodemo&nointro&nobrief&bot&char=doc&autostart'+Q+(SEEDS[r]?'&seed='+SEEDS[r]:'')); await pg.waitForTimeout(1500);
  const o=await pg.evaluate(()=>{ const m=__ms, BOTFB=/[?&]botfb=1/.test(location.search); window.__simHold=true; if(!location.search.includes('god'))m.DBG.god=false; const dt=1/60; const L={mono:true,men:[],lv:[],sig:0,wrongs:0,states:{},firstLv:null};
    let prev=99, lastS=-1, it=0, pHp=m.G.p.hp, pD={}; L.death=null;
    while(it++<60*1000){ const st=m.stateX||m.state; L.states[st]=(L.states[st]||0)+1;
      if(st==='over')break;
      if(st==='sig'){ L.sig++; const ex=m.G.ex; let yes; if(ex.call&&ex.call.st==='ask')yes=ex.call.look==='real'; else yes=(ex.at==='real'&&ex.idCol===ex.sig.col); window.__ans(yes); continue }
      if(st==='levelup'){ if(!L.firstLv){ L.firstLv={t:+m.G.t.toFixed(1),choices:(m.choices||m.G.choices||null)} } }
      if(st!=='play'&&st!=='levelup'){ if(!L.stuck)L.stuck={st,t:m.G.t}; }
      { const ex=m.G.ex; if(ex&&ex.pad&&ex.ph>=3&&!ex.evac){ m.BOTF.move=()=>{ const p=m.G.p,dx=ex.pad.x-p.x,dy=ex.pad.y-p.y,d=Math.hypot(dx,dy); return d<14?[0,0]:[dx/d,dy/d] }; L.padBot=L.padBot||+m.G.t.toFixed(0) } else if(BOTFB&&m.lzS&&!m.fbS&&(!ex||ex.ph<3)){ const z=m.lzS; m.BOTF.move=()=>{ const p=m.G.p,dx=z.x-p.x,dy=z.y-p.y,d=Math.hypot(dx,dy); return d<20?[0,0]:[dx/d,dy/d] } } else m.BOTF.move=null; if(m.fbS&&m.fbS.state==='done'&&!L.fbDone)L.fbDone=+m.G.t.toFixed(0) }
      m.step(dt);
      { const g=m.G, hp=g.p.hp, D=g.dmgBy||{}; if(hp<pHp){ let k='?',mx=0; for(const s in D){ const inc=D[s]-(pD[s]||0); if(inc>mx){mx=inc;k=s} } const ex=g.ex; L.death={t:+g.t.toFixed(1),cause:k,tickDmg:+(pHp-Math.max(0,hp)).toFixed(1),hpBefore:+pHp.toFixed(1),maxHp:g.p.maxHp,onPad:!!(ex&&ex.pad&&Math.hypot(g.p.x-ex.pad.x,g.p.y-ex.pad.y)<60),exPh:ex&&ex.ph} } pHp=hp; pD=Object.assign({},D) }
      const t=Math.floor(m.G.t); if(t!==lastS){ lastS=t; const rl=window.__rl(); const n=rl.marinesLeft; if(n>prev)L.mono=false; if(t===0||L.men.length===0)L.start=n; prev=n; if(t%30===0)L.men.push([t,n]) }
      if(m.G.t>1000)break; }
    const rl=DBG.runLog(); L.rl=rl[rl.length-1]; L.title=document.getElementById('overTitle').textContent; L.card=document.getElementById('over')?document.getElementById('over').innerText.slice(0,1500):''; L.gotOn=(m.G.ex.gotOn||[]).slice(); L.fbStats=window.__fbStats||null; L.amt=m.AMT?{n:m.AMT.V.length,dead:m.AMT.V.filter(v=>v.dead).length,log:m.AMT.log.length}:null; L.kia=(m.G.kiaL||[]).slice(); L.loaded=(m.G.ex.loaded||[]).slice(); L.stats=document.getElementById('stats').innerText; L.state=m.stateX||m.state; if(!/DOWN/.test(L.title))L.death=null; return L });
  o.errs=errs.slice(0,5); res.push(o); console.log('RUN',r+1,JSON.stringify(o)); await ctx.close(); }
 await br.close(); })();
