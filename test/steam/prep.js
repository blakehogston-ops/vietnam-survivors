'use strict';
// rc8.2 #25: build-from-repo. Copies the game runtime files from the repo root (..) into steam/game (allowlist), drops DO-NOT-SHIP and dev files,
// and stamps package.json lcoStamp from the game's BUILD.id so the packaged app shows the real build. Usage: node prep.js [srcDir]
const fs = require('fs'), path = require('path');
const src = path.resolve(process.argv[2] || path.join(__dirname, '..')), dst = path.join(__dirname, 'game');
const ALLOW = ['index.html', 'assets', 'audio', 'fonts',   // rc8.2 #29: fonts/BeVietnamPro/*.ttf + OFL.txt
  'favicon.ico', 'favicon.png', 'apple-touch-icon.png', 'THIRD_PARTY_ASSETS.txt'];
const DENY_DIR = /^(tools|qa|qa_.*|proof|test|tests|__tests__|spec|node_modules|\.git|ref|steam|playtest.*|shots?|candidates|_rejected_audit|electron-mac-ref|notes)$/i;
const DENY_FILE = /(\.map$|rtsmoke|playwright|\.spec\.js$|\.test\.js$|^\.DS_Store$|_preview\.|menu_asian|DO[-_ ]?NOT[-_ ]?SHIP)/i;
const skipped = [];
const filter = (s) => { const b = path.basename(s); const st = fs.statSync(s); const bad = st.isDirectory() ? DENY_DIR.test(b) : DENY_FILE.test(b); if (bad) skipped.push(path.relative(src, s)); return !bad; };
if (fs.existsSync(dst)) fs.renameSync(dst, dst + '.prev-' + Date.now());   // never delete: old copy kept beside (gitignored)
fs.mkdirSync(dst);
for (const f of ALLOW) if (fs.existsSync(path.join(src, f))) fs.cpSync(path.join(src, f), path.join(dst, f), { recursive: true, filter });
// rc8.2: build ID = git short HEAD of the source repo + ET time (BUILD.id in index.html is hand-set and goes stale); BUILD.id only if git is unavailable.
const pkgF = path.join(__dirname, 'package.json'), pkg = JSON.parse(fs.readFileSync(pkgF, 'utf8'));
const etNow = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/New_York', hour12: false }).slice(0, 16) + ' ET';
let stampSrc, sha = null;
try { sha = require('child_process').execFileSync('git', ['-C', src, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; } catch (e) {}
if (sha) { pkg.lcoStamp = sha + ' (' + etNow() + ')'; stampSrc = 'git HEAD'; }
else {
  const m = fs.readFileSync(path.join(dst, 'index.html'), 'utf8').match(/const BUILD=\{id:'([0-9a-f]+)',date:'([^']*)',tag:'([^']*)'/);
  pkg.lcoStamp = m ? ((m[3] ? m[3] + ' ' : '') + m[1]) + ' (' + m[2] + ')' : 'unknown'; stampSrc = m ? 'BUILD.id fallback (git unavailable)' : 'none (git unavailable, no BUILD.id)';
}
fs.writeFileSync(pkgF, JSON.stringify(pkg, null, 2) + '\n');
// rc8.2: rewrite the in-game BUILD label in the packaged copy (game/index.html only, never the repo) so it always matches the package stamp.
if (sha) {
  const ih = path.join(dst, 'index.html'), txt = fs.readFileSync(ih, 'utf8'), re = /const BUILD=\{id:'[0-9a-f]+',date:'[^']*'/;
  if (re.test(txt)) { fs.writeFileSync(ih, txt.replace(re, "const BUILD={id:'" + sha + "',date:'" + etNow() + "'")); console.log('[prep] game/index.html BUILD label ->', sha); }
  else console.log('[prep] WARNING: BUILD label not found in game/index.html; label left as is');
}
console.log('[prep] stamp source:', stampSrc);
fs.writeFileSync(path.join(dst, 'RC_SOURCE.txt'), src + '\n' + pkg.lcoStamp + '\n' + new Date().toISOString() + '\n');
console.log('[prep] game <-', src, '| stamp', pkg.lcoStamp, '| skipped:', skipped.join(', ') || 'none');
