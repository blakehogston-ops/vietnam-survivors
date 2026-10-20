#!/usr/bin/env node
/* Relative perf gate (Lead's ruling, rc8): candidate vs rc7 baseline measured back-to-back on THIS box.
 PASS iff for each gated scenario: median p50 <= base p50 + MARGIN and median p95 <= base p95 + MARGIN (default 7 ms).
 usage: NODE_PATH=... node tools/perfgate-rel.js --base=<rc7 tree> [--cand=<tree, default this repo>] [--rounds=3] [--only=strike] [--prof=desktop] [--q=&flags] [--margin=7]
 The baseline tree needs the one-line window.__perf hook (tools/perfgate.js assumes it). Absolute 16.7 ms check is for real-GPU hardware (pre-Steam). */
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path');
const A=process.argv.slice(2),V=(k,d)=>{const a=A.find(a=>a.startsWith('--'+k+'='));return a?a.split('=').slice(1).join('='):d};
const base=V('base'),cand=V('cand',path.resolve(__dirname,'..')),R=+V('rounds',3),only=V('only','strike'),prof=V('prof','desktop'),q=V('q',''),bq=V('bq',''),M=+V('margin',7);
if(!base){console.error('need --base=<rc7 tree>');process.exit(2)}
const run1=(root,qq)=>JSON.parse(execFileSync('node',[path.join(__dirname,'perfgate.js'),'--only='+only,'--prof='+prof,'--frames=300','--q='+qq,'--out=/tmp/perfgate-rel'],{env:Object.assign({},process.env,{ROOT:root}),stdio:['ignore','pipe','ignore'],maxBuffer:1e8}).toString().trim().split('\n').pop());
const run=(root,qq)=>{for(let k=0;;k++){try{return run1(root,qq)}catch(e){if(k>=2)throw e;console.error('retry after perfgate failure')}}};
const med=a=>{a=a.slice().sort((x,y)=>x-y);const m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2};
const S={base:{},cand:{}},load=[];
for(let r=0;r<R;r++)for(const [k,root,qq] of [['base',base,bq],['cand',cand,q]]){load.push(+fs.readFileSync('/proc/loadavg','utf8').split(' ')[0]);const o=run(root,qq);for(const s in o){(S[k][s]=S[k][s]||{p50:[],p95:[]});S[k][s].p50.push(o[s].frame.p50);S[k][s].p95.push(o[s].frame.p95)}}
let pass=true;const rows=[];
for(const s in S.cand){const b=S.base[s],c=S.cand[s],bp50=med(b.p50),bp95=med(b.p95),cp50=med(c.p50),cp95=med(c.p95),ok=cp50<=bp50+M&&cp95<=bp95+M;pass=pass&&ok;
 rows.push({scenario:s,base_p50:+bp50.toFixed(1),base_p95:+bp95.toFixed(1),cand_p50:+cp50.toFixed(1),cand_p95:+cp95.toFixed(1),d_p50:+(cp50-bp50).toFixed(1),d_p95:+(cp95-bp95).toFixed(1),result:ok?'PASS':'FAIL',runs:{base:b,cand:c}})}
console.log(JSON.stringify({gate:'relative +'+M+' ms vs rc7',q,rounds:R,load:{min:Math.min(...load),max:Math.max(...load)},pass,rows}));
rows.forEach(r=>console.error(`${r.scenario.padEnd(15)} rc7 ${r.base_p50}/${r.base_p95}  cand ${r.cand_p50}/${r.cand_p95}  d ${r.d_p50}/${r.d_p95}  ${r.result}`));
console.error('GATE',pass?'PASS':'FAIL');process.exit(pass?0:1);
