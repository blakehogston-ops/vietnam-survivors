/* mixcheck.js - RC5 net-level mix check (Sound Helper ruling Oct 20, 02:57: the player's weapon on top).
   Net level per clip = measure(file) + 20*log10(slot gain in audio/sample_player.js) + MIX.DB of the group's bus (index.html), no ducking, no distance.
   Methods: RMS = whole-clip RMS dBFS (the PASS metric for one-shots and loops); MMAX = ebur128 momentary max (reported); INT = integrated LUFS (music).
   PASS: every slot within +-1 dB of its group target (specials: -32..-29), group medians keep player > squad > enemy; music files about -14 LUFS integrated (+-1.5).
   Usage: node tools/mixcheck.js [--fix]   (--fix rewrites slot gains so each slot lands on its target) */
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'), A=path.join(root,'audio'), SP=path.join(A,'sample_player.js');
const w={}; new Function('window','module',fs.readFileSync(path.join(A,'samples/manifest.js'),'utf8'))(w,{}); const M=w.SAMPLE_MANIFEST;
let sp=fs.readFileSync(SP,'utf8'); const gainOf=k=>{ const m=sp.match(new RegExp('^\\s{4}'+k+':\\s*\\{[^}]*?gain:\\s*([\\d.]+)','m')); return m?+m[1]:1 };
const TARGET={player:-32,specials:-31,squad:-35,enemy:-37,radio:-31,voice:-31,foley:-38,hit:-40,ui:-40,sting:-32,ambience:-43}, HI={specials:-29}, LO={specials:-32}, GATED=Object.keys(TARGET);
const HTML=fs.readFileSync(path.join(root,'index.html'),'utf8'), DBm=HTML.match(/const MIX=\{DB:(\{[^}]*\})/), BUSDB=Function('return '+DBm[1])();
const BUS={player:'player',foley:'player',ui:'player',hit:'player',squad:'squad',enemy:'enemy',specials:'special',radio:'special',voice:'special',sting:'special',ambience:'amb'};
const busDb=g=>BUSDB[BUS[g]||'player']||0;
function meas(f){ const p=path.join(A,'samples/ogg',f+'.ogg'); if(!fs.existsSync(p))return null;
  const log=require('child_process').spawnSync('ffmpeg',['-hide_banner','-nostats','-i',p,'-af','apad=pad_dur=0.45,ebur128','-f','null','-']).stderr.toString();   /* pad short shots so the 400 ms momentary window sees the whole clip */
  let mm=-120; for(const m of log.matchAll(/M:\s*(-?[\d.]+)/g))mm=Math.max(mm,+m[1]); const I=(log.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/)||[])[1];
  const raw=require('child_process').spawnSync('ffmpeg',['-v','quiet','-i',p,'-f','f32le','-ac','1','-'],{maxBuffer:1<<28}).stdout; const a=new Float32Array(raw.buffer,raw.byteOffset,raw.length>>2); let s=0; for(const v of a)s+=v*v;
  return {mmax:mm, rms:10*Math.log10(s/Math.max(1,a.length)+1e-12), int:I===undefined?null:+I} }
const avg=x=>x.reduce((a,b)=>a+b,0)/x.length, med=x=>{ const s=[...x].sort((a,b)=>a-b), n=s.length; return n%2?s[n>>1]:(s[n/2-1]+s[n/2])/2 }, f1=v=>v===null||!isFinite(v)?'  -  ':v.toFixed(2).padStart(7);
const rows={}; for(const [k,v] of Object.entries(M.slots)){ const g=v.group; if(!g||!(v.files||[]).length)continue; const ms=v.files.map(meas).filter(Boolean); if(!ms.length)continue; const gn=20*Math.log10(gainOf(k))+busDb(g);
  (rows[g]||(rows[g]=[])).push({k,gain:gainOf(k),mmax:avg(ms.map(q=>q.mmax))+gn,rms:avg(ms.map(q=>q.rms))+gn,int:ms.every(q=>q.int!==null)?avg(ms.map(q=>q.int))+gn:null,loop:/loop/.test(k)}) }
const AD_LEVEL=new Set(['sting_boss']);   /* rc8.1: Audio Director's by-ear level (bc0600c, 0.35); reported, not gated */
let fail=0; const meds={}; const fix=process.argv.includes('--fix');
for(const g of Object.keys(rows).sort()){ const R=rows[g], mdM=med(R.map(r=>r.mmax)), mdR=med(R.map(r=>r.rms)); meds[g]=mdR; const T=TARGET[g], lo=LO[g]!==undefined?LO[g]:T-1, hi=HI[g]!==undefined?HI[g]:T+1;
  console.log(`\n== ${g}  (n=${R.length}, bus ${BUS[g]||'player'} ${busDb(g)} dB)  median net RMS ${mdR.toFixed(2)} · median net MMAX ${mdM.toFixed(2)} · target ${T===undefined?'-':T+' ['+lo+'..'+hi+']'}`);
  console.log('  slot                      gain     RMS   dTGT     MMAX');
  for(const r of R.sort((a,b)=>a.rms-b.rms)){ const d=T===undefined?0:r.rms-T, bad=T!==undefined&&!AD_LEVEL.has(r.k)&&(r.rms<lo-.005||r.rms>hi+.005); if(bad)fail++;
    console.log(`  ${(bad?'!':' ')+r.k.padEnd(24)} ${r.gain.toFixed(3)} ${f1(r.rms)} ${f1(d)} ${f1(r.mmax)}`);
    if(fix&&T!==undefined&&Math.abs(d)>.25&&(r.rms<lo+.25||r.rms>hi-.25||Math.abs(d)>.9)){ const ng=+(r.gain*Math.pow(10,-d/20)).toFixed(4); sp=sp.replace(new RegExp('(^\\s{4}'+r.k+':\\s*\\{[^}]*?gain:\\s*)[\\d.]+','m'),'$1'+ng) } } }
const ALLOW=new Set(['pistol22_suppressed']); let warn=0; console.log('\n== momentary-max report (warning only, Sound Helper Oct 20 03:45): clips > 4 dB from their group median MMAX');
for(const g of Object.keys(rows)){ const md=med(rows[g].map(r=>r.mmax)); for(const r of rows[g]){ const d=r.mmax-md; if(Math.abs(d)>4&&!ALLOW.has(r.k)){ warn++; console.log(`  WARN ${g.padEnd(9)} ${r.k.padEnd(24)} MMAX ${r.mmax.toFixed(2)} (${d>0?'+':''}${d.toFixed(2)} vs median ${md.toFixed(2)})`) } } }
console.log(warn?`  ${warn} warning(s)`:'  none'); console.log('  allowlist: '+[...ALLOW].join(', '));
{ const NG=new Set(['knife_throw','shotgun_rack','pistol22_suppressed','bolt_rifle_bolt']), G=(rows.player||[]).filter(r=>!NG.has(r.k)), md=med(G.map(r=>r.mmax)), off=G.filter(r=>Math.abs(r.mmax-md)>3);
  console.log(`\n== unsuppressed player guns (n=${G.length}): MMAX spread ${Math.min(...G.map(r=>r.mmax)).toFixed(2)} .. ${Math.max(...G.map(r=>r.mmax)).toFixed(2)}, median ${md.toFixed(2)}; outside ±3 dB: ${off.length?off.map(r=>r.k+' '+(r.mmax-md).toFixed(1)).join(', '):'none'}`) }
if(!(meds.player>meds.squad&&meds.squad>meds.enemy)){ console.log('\nFAIL group order (want player > squad > enemy)'); fail++ }
console.log(`\nGAPS (median net RMS): player-squad ${(meds.player-meds.squad).toFixed(2)} dB (want ~3) · player-enemy ${(meds.player-meds.enemy).toFixed(2)} dB (want ~5)`);
if(M.music&&M.music.tracks){ console.log('\n== music (integrated LUFS, target about -14)'); for(const [k,t] of Object.entries(M.music.tracks)){ const p=path.join(A,'music',t.file+'.ogg'); if(!fs.existsSync(p))continue; const log=require('child_process').spawnSync('ffmpeg',['-hide_banner','-nostats','-i',p,'-af','ebur128','-f','null','-']).stderr.toString(); const I=(log.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/)||[])[1]; const v=I===undefined?null:+I+20*Math.log10(t.gain||1), bad=v!==null&&Math.abs(v+14)>1.5; if(bad)fail++; console.log('  '+(bad?'!':' ')+k.padEnd(16)+' '+f1(v)) } }
if(fix){ fs.writeFileSync(SP,sp); console.log('\n--fix: gains rewritten in audio/sample_player.js; re-run without --fix to verify') }
console.log(fail?`\nFAIL: ${fail} problem(s)`:'\nPASS: every group within ±1 dB of its net target (after slot gain + bus), player > squad > enemy'); process.exit(fail?1:0);
