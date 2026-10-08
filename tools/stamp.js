/* Build stamp + cache-buster. Run AFTER committing code:  node tools/stamp.js && git commit -am "Build stamp" && git push
   Writes the short hash of HEAD and the date/time (America/New_York) into index.html: BUILD constant (shown bottom-left on the main menu and
   pause screen) and the ?v= query on favicon links; audio and the service photo use the same value at runtime (AV). */
const {execSync}=require('child_process'), fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..'), f=path.join(root,'index.html');
const id=execSync('git rev-parse --short HEAD',{cwd:root}).toString().trim();
const d=new Date().toLocaleString('sv-SE',{timeZone:'America/New_York',hour12:false}).slice(0,16);
let s=fs.readFileSync(f,'utf8');
s=s.replace(/const BUILD=\{id:'[^']*',date:'[^']*'\}/,`const BUILD={id:'${id}',date:'${d} ET'}`);
s=s.replace(/(apple-touch-icon\.png|sheet1\.js|huey\.js|huey_hivis\.js|doc_hivis\.js|marines_tall\.js|sample_player\.js|manifest\.js)\?v=[A-Za-z0-9]+/g,`$1?v=${id}`);
fs.writeFileSync(f,s); console.log('stamped',id,d,'ET');
