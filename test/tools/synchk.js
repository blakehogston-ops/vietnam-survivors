// syntax-check inline <script> blocks of index.html (stdin)
const s=require('fs').readFileSync(0,'utf8');const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m,i=0,bad=0;
while((m=re.exec(s))){i++;try{new Function(m[1])}catch(e){bad++;console.log('script',i,e.message)}}console.log(bad?'FAIL':'ok',i);process.exit(bad?1:0)
