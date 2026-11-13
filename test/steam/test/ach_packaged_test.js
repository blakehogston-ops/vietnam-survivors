'use strict';
// rc8.2 #7: proves every game achievement maps to an ACH_* name and fires through the PACKAGED wrapper (steam.js stub, no Steam account).
// Usage: node test/ach_packaged_test.js [path/to/packaged/binary]   (default dist/linux-unpacked/last-chopper-out). Needs xvfb-run. Not shipped (test/** excluded).
const cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const BIN = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist/linux-unpacked/last-chopper-out'));
const CFG = require('../steam/lco_steam_config.json'), PORT = 9351 + Math.floor(Math.random() * 40);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function launch(env) {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'lco-achtest-ud-'));
  const p = cp.spawn('xvfb-run', ['-a', '-s', '-screen 0 1280x800x24', BIN, '--no-sandbox', '--disable-gpu', '--remote-debugging-port=' + PORT],
    { detached: true, env: Object.assign({}, process.env, { LCO_TEST: '1', LCO_USERDATA: ud }, env), stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; p.stdout.on('data', (d) => out += d); p.stderr.on('data', (d) => out += d);
  let ws = null;
  for (let i = 0; i < 60 && !ws; i++) { await wait(1000); try { const L = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json(); const t = L.find((x) => x.type === 'page' && /app:\/\/game/.test(x.url)); if (t) ws = t.webSocketDebuggerUrl; } catch (e) {} }
  if (!ws) throw new Error('no CDP page; log:\n' + out.slice(-2000));
  const s = new WebSocket(ws); await new Promise((r) => s.onopen = r); let id = 0; const pend = {};
  s.onmessage = (m) => { const d = JSON.parse(m.data); if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
  const ev = (expr) => new Promise((r) => { const i = ++id; pend[i] = (d) => r(d.result && d.result.result ? d.result.result.value : d); s.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } })); });
  for (let i = 0; i < 40; i++) { if (await ev("typeof ACH!=='undefined'&&typeof P3!=='undefined'&&!!document.getElementById('btnStart')")) break; await wait(500); }
  return { p, ev, ud, out: () => out, close: () => { try { s.close(); } catch (e) {} try { process.kill(-p.pid); } catch (e) { p.kill('SIGTERM'); } } };
}
(async () => {
  // A) Steam present (stub): every game achievement through the game's own P3.unlock path + squad2 events + vsHost route
  const log = path.join(os.tmpdir(), 'lco-achtest-' + process.pid + '.log'); fs.writeFileSync(log, '');
  const A = await launch({ LCO_APPID: '480', LCO_STEAM_STUB: log });
  // the game's ACH table lives inside its IIFE (no global), so read the ids from the packaged game/index.html; P3.steam(id) sends a.id verbatim (live-confirmed on :8813: 'boots')
  const html = fs.readFileSync(path.join(__dirname, '..', 'game', 'index.html'), 'utf8'), blk = html.slice(html.indexOf('const ACH=['), html.indexOf('}];', html.indexOf('const ACH=[')));
  const ids = [...blk.matchAll(/\{id:'([^']+)'/g)].map((m) => m[1]);
  ok(Array.isArray(ids) && ids.length > 0, 'game ACH table read from packaged app: ' + (ids && ids.length) + ' achievements');
  const host = await A.ev('JSON.stringify({sw:typeof window.steamworks.achievement.activate,vh:typeof (window.vsHost&&vsHost.steam.unlock),b:window.vsHost&&vsHost.build})');
  console.log('      host', host); ok(/"sw":"function"/.test(host) && /"vh":"function"/.test(host), 'bridges window.steamworks + vsHost.steam.unlock exposed');
  ok(/lcoStamp|stamp/.test(host) && !/"stamp":"dev"/.test(host), 'vsHost.build carries the packaged stamp (not "dev")');
  const half = ids.slice(0, Math.ceil(ids.length / 2)), rest = ids.slice(half.length);
  // path 1: live bridge, exactly what the game's P3.steam(id) calls
  await A.ev(`(${JSON.stringify(half)}).forEach(i=>window.steamworks.achievement.activate(i));1`);
  // path 2: offline re-sync: ids only in the local lco_ach fallback -> main.js checkDerived() on the next save write
  await A.ev(`(()=>{const m=JSON.parse(localStorage.getItem('lco_ach')||'{}');(${JSON.stringify(rest)}).forEach(i=>m[i]=Date.now());localStorage.setItem('lco_ach',JSON.stringify(m));return 1})()`);
  await wait(6500);
  const marines = Object.keys(CFG.squad2_marines.events);
  await A.ev(`(${JSON.stringify(marines)}).forEach((e,i)=>i%2?window.steamworks.achievement.activate(e):vsHost.steam.unlock(e));window.steamworks.achievement.activate('bogus_id');1`);
  await wait(1500);
  const got = new Set(fs.readFileSync(log, 'utf8').split('\n').filter(Boolean));
  const want = ids.map((i) => CFG.map[i]);
  ok(want.every(Boolean), 'all ' + ids.length + ' game ids have an ACH_* map entry' + (want.every(Boolean) ? '' : ' (missing: ' + ids.filter((i) => !CFG.map[i]).join(',') + ')'));
  const missed = want.filter((a) => a && !got.has(a)); ok(!missed.length, ids.length + '/' + ids.length + ' game achievements reached the Steam stub' + (missed.length ? ' (missed ' + missed.join(',') + ')' : ''));
  const m2 = Object.values(CFG.squad2_marines.events).filter((a) => !got.has(a)); ok(!m2.length, '8/8 squad2 Marine events reached Steam (via both bridges)' + (m2.length ? ' missed ' + m2 : ''));
  const lo = ['ACH_SQUAD2_LOADOUT_KIT', 'ACH_SQUAD2_LOADOUT_POINT', 'ACH_SQUAD2_LOADOUT_GUN'].filter((a) => !got.has(a)); ok(!lo.length, 'derived loadout achievements fired (kit/point/gun)' + (lo.length ? ' missed ' + lo : ''));
  ok([...got].every((a) => /^ACH_[A-Z0-9_]+$/.test(a)), 'only ACH_* names sent to Steam (' + got.size + ' unique), unknown "bogus_id" dropped');
  const n = await A.ev("Object.keys(JSON.parse(localStorage.getItem('lco_ach')||'{}')).length"); ok(n >= rest.length, 'local lco_ach fallback re-synced to Steam (' + rest.length + ' ids came only from lco_ach)');
  A.close(); await wait(1500);
  // B) no Steam (shipping placeholder App ID): game still boots and keeps achievements locally
  const B = await launch({});
  const st = await B.ev("JSON.stringify(window.lcoHost.steam())"); console.log('      status', st);
  ok(/"available":false/.test(st), 'placeholder App ID -> Steam not initialised, no crash');
  ok(await B.ev("typeof window.steamworks.achievement.activate('boots')") === 'boolean', 'no-Steam: bridge call is a safe no-op');
  const pl = await B.ev("(document.getElementById('btnStart').click(),new Promise(r=>setTimeout(()=>r(getComputedStyle(document.getElementById('menu')).display),2500)))"); ok(pl === 'none', 'no-Steam: Start leaves the menu (game playable), menu display=' + pl);
  // rc8.2 #29: Be Vietnam Pro packaged + loaded
  const vf = await B.ev(`(async()=>{const r=await Promise.all(['fonts/BeVietnamPro/BeVietnamPro-Regular.ttf','fonts/BeVietnamPro/BeVietnamPro-Bold.ttf','fonts/BeVietnamPro/OFL.txt'].map(u=>fetch(u).then(x=>x.status).catch(()=>0)));
    await document.fonts.load('400 16px "Be Vietnam Pro"','Đồng chí ơ ắ ố ệ'); await document.fonts.load('700 16px "Be Vietnam Pro"','Đồng chí ơ ắ ố ệ');
    const faces=[...document.fonts].filter(f=>/Be Vietnam Pro/.test(f.family)).map(f=>f.weight+':'+f.status);
    return JSON.stringify({http:r,faces,c400:document.fonts.check('400 16px "Be Vietnam Pro"','ồơắốệ'),c700:document.fonts.check('700 16px "Be Vietnam Pro"','ồơắốệ'),flag:window.LCO_VIFONT===undefined?'undef':JSON.stringify(window.LCO_VIFONT)})})()`);
  console.log('      vifont', vf); const V = JSON.parse(vf);
  ok(V.http.every((x) => x === 200) && V.c400 && V.c700 && V.faces.filter((f) => /loaded/.test(f)).length >= 2, 'Be Vietnam Pro 400+700 + OFL.txt served from the package and loaded');
  B.close();
  console.log(fails ? 'RESULT FAIL (' + fails + ')' : 'RESULT PASS'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('ERROR', e.message); process.exit(2); });
