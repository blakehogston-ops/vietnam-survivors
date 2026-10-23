/* Build stamp + cache-buster.  Usage:  node tools/stamp.js [--tag lco-rc2] && git commit -am "Build stamp" && git tag lco-rc2
   A commit cannot contain its own hash, so BUILD.id is the CODE commit (HEAD when this runs) and the tag sits on the stamp commit
   right after it; the menu shows "BUILD <tag> · <code hash> · <date>", and `git rev-parse <tag>^` == BUILD.id (check with --verify <tag>).
   RC1 shipped with e80a6a5 = lco-rc1^ for this reason (and the old stamp list missed newer art files, which kept stale ?v= values). */
const {execSync}=require('child_process'), fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..'), f=path.join(root,'index.html'), A=process.argv, sh=c=>execSync(c,{cwd:root}).toString().trim();
let s=fs.readFileSync(f,'utf8');
if(A.includes('--verify')){ const t=A[A.indexOf('--verify')+1], want=sh('git rev-parse --short '+t+'^'), m=s.match(/const BUILD=\{id:'([^']*)'.*?tag:'([^']*)'/);
  const ok=m&&m[1]===want&&m[2]===t; console.log(ok?'OK':'MISMATCH','tag',t,'stamp',m&&m[1],m&&m[2],'expected',want); process.exit(ok?0:1) }
/* rc8.1 Lead Playtester #2: --check [file] [sha]: FAIL unless BUILD.id == sha (default: git HEAD, or HEAD^ when HEAD is a stamp commit). The freeze gate uses
   --file <frozen index.html> --id <sha> to stamp its frozen copy from the frozen commit, then --check to fail on a mismatch. */
const ARG=k=>A.includes(k)?A[A.indexOf(k)+1]:null;
if(A.includes('--check')){ const fp=ARG('--file')||f, t=fs.readFileSync(fp,'utf8'), m=t.match(/const BUILD=\{id:'([^']*)',date:'([^']*)'/); let want=ARG('--id');
  if(!want){ const subj=sh('git log -1 --format=%s'); want=sh('git rev-parse --short '+(/^(Build )?stamp/i.test(subj)?'HEAD^':'HEAD')) }
  const ok=!!m&&!!want&&(m[1].startsWith(want)||want.startsWith(m[1])); console.log((ok?'STAMP OK':'STAMP MISMATCH')+' file '+fp+' BUILD.id '+(m&&m[1])+' date '+(m&&m[2])+' expected '+want); process.exit(ok?0:1) }
if(ARG('--file')){ const fp=ARG('--file'), id=ARG('--id'); if(!id){ console.error('--file needs --id <sha>'); process.exit(2) } let t=fs.readFileSync(fp,'utf8'); const tag0=(t.match(/const BUILD=\{[^}]*tag:'([^']*)'/)||[])[1]||'', tg=ARG('--tag')||tag0;
  const d=new Date().toLocaleString('sv-SE',{timeZone:'America/New_York',hour12:false}).slice(0,16);
  t=t.replace(/const BUILD=\{id:'[^']*',date:'[^']*'(,tag:'[^']*')?\}/,`const BUILD={id:'${id}',date:'${d} ET',tag:'${tg}'}`); fs.writeFileSync(fp,t); console.log('stamped file',fp,id,tg,d,'ET'); process.exit(0) }
if(sh('git status --porcelain --untracked-files=no index.html assets audio'))console.warn('WARNING: uncommitted changes; the stamped hash will not match the shipped code');
const id=sh('git rev-parse --short HEAD'), tag=A.includes('--tag')?A[A.indexOf('--tag')+1]:'';
const d=new Date().toLocaleString('sv-SE',{timeZone:'America/New_York',hour12:false}).slice(0,16);
s=s.replace(/const BUILD=\{id:'[^']*',date:'[^']*'(,tag:'[^']*')?\}/,`const BUILD={id:'${id}',date:'${d} ET',tag:'${tag}'}`);
s=s.replace(/((?:assets|audio)\/[\w\/.-]+\.(?:js|png|ogg|m4a)|apple-touch-icon\.png)\?v=[A-Za-z0-9]+/g,`$1?v=${id}`);   /* every versioned asset, not a hand list */
fs.writeFileSync(f,s); console.log('stamped',id,tag,d,'ET');
