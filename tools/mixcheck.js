/* mixcheck.js - QA / Sound Helper loudness check for the sample mix (bus processing ignored).
   Per clip: level = measure(file) + 20*log10(slot gain in audio/sample_player.js); slot level = mean over its files.
   Methods reported: MMAX = ffmpeg ebur128 momentary max (LUFS, 400 ms) - the PASS metric for one-shots;
                     RMS  = whole-clip RMS dBFS (Sound Helper's group targets are on this scale);
                     INT  = ebur128 integrated LUFS (used for music / ambient loops only, target about -14 LUFS for music).
   PASS rule: every slot in the player / squad / enemy groups within +-1 dB of its group median on MMAX, and group medians keep the order squad > player > enemy.
   Usage: node tools/mixcheck.js [--fix]   (--fix rewrites those slot gains so each lands on its group MMAX median) */
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'), A=path.join(root,'audio'), SP=path.join(A,'sample_player.js');
const w={}; new Function('window','module',fs.readFileSync(path.join(A,'samples/manifest.js'),'utf8'))(w,{}); const M=w.SAMPLE_MANIFEST;
let sp=fs.readFileSync(SP,'utf8'); const gainOf=k=>{ const m=sp.match(new RegExp('^\\s{4}'+k+':\\s*\\{[^}]*?gain:\\s*([\\d.]+)','m')); return m?+m[1]:1 };
const TARGET={player:-35,squad:-30.5,enemy:-37.75,specials:-26,foley:-36,radio:-29,ambience:-41,ui:-40,hit:-41.5,sting:-30}, GATED=['player','squad','enemy'];
function meas(f){ const p=path.join(A,'samples/ogg',f+'.ogg'); if(!fs.existsSync(p))return null;
  const log=require('child_process').spawnSync('ffmpeg',['-hide_banner','-nostats','-i',p,'-af','apad=pad_dur=0.45,ebur128','-f','null','-']).stderr.toString();   /* pad short shots so the 400 ms momentary window sees the whole clip */
  let mm=-120; for(const m of log.matchAll(/M:\s*(-?[\d.]+)/g))mm=Math.max(mm,+m[1]); const I=(log.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/)||[])[1];
  const raw=require('child_process').spawnSync('ffmpeg',['-v','quiet','-i',p,'-f','f32le','-ac','1','-'],{maxBuffer:1<<28}).stdout; const a=new Float32Array(raw.buffer,raw.byteOffset,raw.length>>2); let s=0; for(const v of a)s+=v*v;
  return {mmax:mm, rms:10*Math.log10(s/Math.max(1,a.length)+1e-12), int:I===undefined?null:+I} }
const avg=x=>x.reduce((a,b)=>a+b,0)/x.length, med=x=>{ const s=[...x].sort((a,b)=>a-b), n=s.length; return n%2?s[n>>1]:(s[n/2-1]+s[n/2])/2 }, f1=v=>v===null||!isFinite(v)?'  -  ':v.toFixed(2).padStart(7);
const rows={}; for(const [k,v] of Object.entries(M.slots)){ const g=v.group; if(!g||!(v.files||[]).length)continue; const ms=v.files.map(meas).filter(Boolean); if(!ms.length)continue; const gn=20*Math.log10(gainOf(k));
  (rows[g]||(rows[g]=[])).push({k,gain:gainOf(k),mmax:avg(ms.map(q=>q.mmax))+gn,rms:avg(ms.map(q=>q.rms))+gn,int:ms.every(q=>q.int!==null)?avg(ms.map(q=>q.int))+gn:null,loop:/loop/.test(k)}) }
let fail=0; const meds={}; const fix=process.argv.includes('--fix');
for(const g of Object.keys(rows).sort()){ const R=rows[g], mdM=med(R.map(r=>r.mmax)), mdR=med(R.map(r=>r.rms)); meds[g]=mdM;
  console.log(`\n== ${g}  (n=${R.length})  median MMAX ${mdM.toFixed(2)} LUFS · median RMS ${mdR.toFixed(2)} dBFS · Sound Helper target ${TARGET[g]!==undefined?TARGET[g]+' (RMS)':'-'}${GATED.includes(g)?'  [GATED ±1 dB on MMAX]':''}`);
  console.log('  slot                      gain     MMAX    dMMAX     RMS   dTGT(RMS)   INT');
  for(const r of R.sort((a,b)=>a.mmax-b.mmax)){ const d=r.mmax-mdM, bad=GATED.includes(g)&&Math.abs(d)>1; if(bad)fail++;
    console.log(`  ${(bad?'!':' ')+r.k.padEnd(24)} ${r.gain.toFixed(3)} ${f1(r.mmax)} ${f1(d)} ${f1(r.rms)} ${f1(TARGET[g]!==undefined?r.rms-TARGET[g]:null)}   ${f1(r.loop?r.int:r.int)}`);
    if(fix&&GATED.includes(g)&&Math.abs(d)>.25){ const ng=+(r.gain*Math.pow(10,-d/20)).toFixed(3); sp=sp.replace(new RegExp('(^\\s{4}'+r.k+':\\s*\\{[^}]*?gain:\\s*)[\\d.]+','m'),'$1'+ng) } } }
if(meds.squad!==undefined&&meds.player!==undefined&&meds.enemy!==undefined&&!(meds.squad>meds.player&&meds.player>meds.enemy)){ console.log('\nFAIL group order (want squad > player > enemy)'); fail++ }
if(M.music&&M.music.tracks){ console.log('\n== music (integrated LUFS, target about -14)'); for(const [k,t] of Object.entries(M.music.tracks)){ const p=path.join(A,'music',t.file+'.ogg'); if(!fs.existsSync(p))continue; const log=require('child_process').spawnSync('ffmpeg',['-hide_banner','-nostats','-i',p,'-af','ebur128','-f','null','-']).stderr.toString(); const I=(log.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/)||[])[1]; console.log('  '+k.padEnd(16)+' '+f1(I===undefined?null:+I+20*Math.log10(t.gain||1))) } }
if(fix){ fs.writeFileSync(SP,sp); console.log('\n--fix: gains rewritten in audio/sample_player.js; re-run without --fix to verify') }
console.log(fail?`\nFAIL: ${fail} problem(s)`:'\nPASS: player / squad / enemy within ±1 dB of group median (momentary max), order kept'); process.exit(fail?1:0);
