/* Build stamp + cache-buster.  Usage:  node tools/stamp.js [--tag lco-rc2] && git commit -am "Build stamp" && git tag lco-rc2
   A commit cannot contain its own hash, so BUILD.id is the CODE commit (HEAD when this runs) and the tag sits on the stamp commit
   right after it; the menu shows "BUILD <tag> · <code hash> · <date>", and `git rev-parse <tag>^` == BUILD.id (check with --verify <tag>).
   RC1 shipped with e80a6a5 = lco-rc1^ for this reason (and the old stamp list missed newer art files, which kept stale ?v= values). */
const {execSync}=require('child_process'), fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..'), f=path.join(root,'index.html'), A=process.argv, sh=c=>execSync(c,{cwd:root}).toString().trim();
let s=fs.readFileSync(f,'utf8');
if(A.includes('--verify')){ const t=A[A.indexOf('--verify')+1], want=sh('git rev-parse --short '+t+'^'), m=s.match(/const BUILD=\{id:'([^']*)'.*?tag:'([^']*)'/);
  const ok=m&&m[1]===want&&m[2]===t; console.log(ok?'OK':'MISMATCH','tag',t,'stamp',m&&m[1],m&&m[2],'expected',want); process.exit(ok?0:1) }
if(sh('git status --porcelain --untracked-files=no index.html assets audio'))console.warn('WARNING: uncommitted changes; the stamped hash will not match the shipped code');
const id=sh('git rev-parse --short HEAD'), tag=A.includes('--tag')?A[A.indexOf('--tag')+1]:'';
const d=new Date().toLocaleString('sv-SE',{timeZone:'America/New_York',hour12:false}).slice(0,16);
s=s.replace(/const BUILD=\{id:'[^']*',date:'[^']*'(,tag:'[^']*')?\}/,`const BUILD={id:'${id}',date:'${d} ET',tag:'${tag}'}`);
s=s.replace(/((?:assets|audio)\/[\w\/.-]+\.(?:js|png|ogg|m4a)|apple-touch-icon\.png)\?v=[A-Za-z0-9]+/g,`$1?v=${id}`);   /* every versioned asset, not a hand list */
fs.writeFileSync(f,s); console.log('stamped',id,tag,d,'ET');
