'use strict';
const { app, BrowserWindow, ipcMain, Menu, protocol, net } = require('electron');
try{ require("electron").app.commandLine.appendSwitch("autoplay-policy","no-user-gesture-required") }catch(e){}
const { pathToFileURL } = require('url');
// audiofix: serve game/ from privileged app://game so fetch() works (file:// fetch fails in Electron)
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);
const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.wav':'audio/wav', '.m4a':'audio/mp4', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf', '.txt':'text/plain', '.wasm':'application/wasm', '.mp4':'video/mp4', '.webm':'video/webm' };
function serveGame() {
  const root = path.resolve(__dirname, 'game');
  protocol.handle('app', async (req) => {
    const u = new URL(req.url);
    if (u.host !== 'game') return new Response('not found', { status: 404 });
    let rel; try { rel = decodeURIComponent(u.pathname); } catch (e) { return new Response('bad', { status: 400 }); }
    const f = path.resolve(root, '.' + path.posix.normalize('/' + rel));
    if (f !== root && !f.startsWith(root + path.sep)) return new Response('forbidden', { status: 403 });
    try { if (!fs.statSync(f).isFile()) throw 0; } catch (e) { return new Response('not found', { status: 404 }); }
    const r = await net.fetch(pathToFileURL(f).toString());
    return new Response(r.body, { status: 200, headers: { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' } });
  });
}
// audiofix: localStorage is per-origin; copy lco_*/lbo2_* from the old file:// origin into lco_save_v2.json once (preload restores it into app://game)
let MIGRATING = false;
async function migrateFileOrigin() {
  const flag = path.join(NEW_DIR, 'appscheme_migrated.txt');
  if (fs.existsSync(flag) || !fs.existsSync(path.join(NEW_DIR, 'Local Storage'))) return 'skip';
  let res = 'none'; MIGRATING = true;
  try {
    const w = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    await w.loadURL('data:text/html,'); await w.loadFile(path.join(__dirname, 'game', 'index.html'), { query: { nobrief: '1', notut: '1' } }).catch(() => {});
    const old = await w.webContents.executeJavaScript('(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^(lco_|lbo2_)/.test(k))o[k]=localStorage.getItem(k)}return o})()');
    w.destroy();
    const n = Object.keys(old).length;
    if (n) { let cur = null; try { cur = JSON.parse(fs.readFileSync(saveFile(), 'utf8')); } catch (e) {}
      const keys = Object.assign({}, old, (cur && cur.keys) || {}); writeSave(keys); res = 'copied:' + n; }
  } catch (e) { res = 'failed:' + redactPath(e.message); }
  MIGRATING = false;
  try { fs.writeFileSync(flag, res + '\n' + new Date().toISOString()); } catch (e) {}
  return res;
}
const path = require('path');
const fs = require('fs');

/* ---- identity + save path (was 'vietnam-survivors' / 'Last Bird Out') ---- */
const APP_NAME = 'Last Chopper Out';
const LCO_TEST_WIN = process.argv.includes('--lco-test');   /* rc8.3: --lco-test labels the window 'LCO TEST' */
app.setName(APP_NAME);
const NEW_DIR = (process.env.LCO_TEST === '1' && process.env.LCO_USERDATA) ? path.resolve(process.env.LCO_USERDATA) : path.join(app.getPath('appData'), APP_NAME);   // rc8.2: tests get an isolated profile (stale lco_sq2 from a prior smoke replayed all 8 Marines)
app.setPath('userData', NEW_DIR);
/* rc8.3 crash log: renderer/GPU/child process exits are appended to userData/lco_crash.log (plus Chromium --enable-logging to userData/chrome_debug.log) */
const CRASH_LOG = () => path.join(NEW_DIR, 'lco_crash.log');
function crashLog(kind, d) { try { fs.mkdirSync(NEW_DIR, { recursive: true }); fs.appendFileSync(CRASH_LOG(), new Date().toISOString() + ' ' + kind + ' ' + JSON.stringify(d || {}) + '\n'); } catch (e) {} }
try { app.commandLine.appendSwitch('enable-logging', 'file'); app.commandLine.appendSwitch('log-file', path.join(NEW_DIR, 'chrome_debug.log')); } catch (e) {}
app.on('render-process-gone', (e, wc, d) => { crashLog('render-process-gone', { reason: d && d.reason, exitCode: d && d.exitCode, main: !!(win && wc === win.webContents), url: (() => { try { return wc.getURL().slice(0, 80); } catch (er) { return ''; } })() }); if (d && d.reason !== 'clean-exit' && win && !win.isDestroyed() && wc === win.webContents) { const n = (app.__rpgN = (app.__rpgN || 0) + 1); if (n <= 3) setTimeout(() => { try { crashLog('renderer-reload', { n }); win.webContents.reload(); } catch (er) { crashLog('renderer-reload-fail', { m: String(er) }); } }, 500); } });   /* rc8.3: reload the game instead of leaving a dead window (max 3) */
ipcMain.on('crash:log', (e, k, d) => crashLog('renderer-' + k, d));
app.on('web-contents-created', (e, wc) => { wc.on('unresponsive', () => crashLog('unresponsive', {})); wc.on('responsive', () => crashLog('responsive', {})); });
const OLD_DIRS = ['Last Bird Out', 'last-bird-out', 'LastBirdOut', 'vietnam-survivors'].map((d) => path.join(app.getPath('appData'), d));

/* bug-reporter legal fix: never log/expose the OS user name or home/AppData path (MIG reaches the renderer via steam:status) */
function redactPath(x) { return String(x == null ? '' : x).replace(/[A-Za-z]:\\Users\\[^\\\s]+(\\AppData\\[^\\\s]+)?/gi, '<user>').replace(/\/(?:Users|home)\/[^\/\s]+(\/Library\/Application Support|\/\.config)?/g, '<user>'); }
function migrate() {
  // first launch only: copy the old userData dir (Local Storage leveldb = lbo2_*/lco_* keys, save.json; rc8a copies lbo2_* -> lco_* itself) if the new one has no save data
  const has = (d) => fs.existsSync(path.join(d, 'Local Storage')) || fs.existsSync(path.join(d, 'lco_save_v2.json'));
  if (has(NEW_DIR)) return 'none-needed';
  for (const d of OLD_DIRS) {
    if (!fs.existsSync(d) || !has(d) && !fs.existsSync(path.join(d, 'save.json'))) continue;
    try {
      fs.mkdirSync(NEW_DIR, { recursive: true });
      for (const sub of ['Local Storage', 'save.json', 'lco_save_v2.json']) {
        const s = path.join(d, sub); if (fs.existsSync(s)) fs.cpSync(s, path.join(NEW_DIR, sub), { recursive: true });
      }
      fs.writeFileSync(path.join(NEW_DIR, 'migrated_from.txt'), d + '\n' + new Date().toISOString());
      return 'migrated:' + path.basename(d);
    } catch (e) { return 'migrate-failed:' + redactPath(e.message); }
  }
  return 'nothing-to-migrate';
}
const MIG = migrate();

const steam = require('./steam');
const MAP = require('./steam/lco_steam_config.json');
const TEST = process.env.LCO_TEST === '1';
/* Build tier (Legal Oct 28): 'public' (Steam/store: unlock-all OFF, Loc/vi VO files not packaged) | 'friends' | 'test' (Blake's standard build: unlock-all ON).
   Source: package.json "lcoTier" (written by electron-builder: public = package.json build config, friends/test = builder.friends.js extraMetadata).
   Unpackaged runs (electron .) default to 'test'; LCO_BUILD_TIER env overrides only when unpackaged or LCO_TEST=1. Unknown/missing in a packaged app -> 'public'. */
const TIERS = ['public', 'friends', 'test'];
const BUILD_TIER = (() => { let t = null; try { t = require('./package.json').lcoTier; } catch (e) {}
  const env = process.env.LCO_BUILD_TIER; if (env && (!app.isPackaged || TEST)) t = env;
  if (!t && !app.isPackaged) t = 'test'; return TIERS.includes(t) ? t : 'public'; })();
module.exports.BUILD_TIER = BUILD_TIER;
/* rc8.2 #25: App ID lives in steam/lco_app_id.json {"appId":"REPLACE_WITH_REAL_STEAM_APP_ID"} (BLAKE fills in). No 480 in shipping config.
   Non-numeric placeholder -> Steam is not initialised (game runs standalone, achievements kept locally). Dev/tests may set LCO_APPID (e.g. 480) when unpackaged or LCO_TEST=1. */
const STEAM_APP_ID = (() => { let id = null; try { id = require('./steam/lco_app_id.json').appId; } catch (e) {}
  if (process.env.LCO_APPID && (!app.isPackaged || TEST)) id = process.env.LCO_APPID;
  return /^[1-9][0-9]{0,9}$/.test(String(id)) ? +id : 0; })();
/* rc8.2 #37: build id shown in-app comes from package.json version + stamp (written at packaging), never a stale hard-coded string */
const PKG = (() => { try { return require('./package.json'); } catch (e) { return {}; } })();
const BUILD_INFO = { version: PKG.version || '0.0.0', stamp: PKG.lcoStamp || 'dev', tier: BUILD_TIER, electron: process.versions.electron };
/* rc8.2 #25: window mode. Default fullscreen on macOS and Steam Deck, windowed elsewhere. Overrides (highest first): --windowed / --fullscreen argv
   (Steam launch options), then the player's last choice in userData/window.json (saved on toggle). */
const WIN_PREF = () => path.join(NEW_DIR, 'window.json');
function wantFullscreen(deck) {
  const a = process.argv; if (a.includes('--windowed')) return false; if (a.includes('--fullscreen')) return true;
  try { const o = JSON.parse(fs.readFileSync(WIN_PREF(), 'utf8')); if (typeof o.fullscreen === 'boolean') return o.fullscreen; } catch (e) {}
  return process.platform === 'darwin' || !!deck; }
function saveWinPref(fsOn) { try { fs.mkdirSync(NEW_DIR, { recursive: true }); fs.writeFileSync(WIN_PREF(), JSON.stringify({ fullscreen: !!fsOn })); } catch (e) {} }
let win = null;

/* ---- save: lco_save_v2.json = { v:2, savedAt, keys:{ lco_*: string } } locally + Steam Remote Storage (rc8a: game keys are lco_*; rc8a has no single 'lco_save_v2' key) ---- */
const SAVE = MAP.cloud.file;
const saveFile = () => path.join(NEW_DIR, SAVE);
const parse = (t) => { try { const o = JSON.parse(t); return o && o.keys ? o : null; } catch (e) { return null; } };
function readSave() {
  let local = null, cloud = null;
  try { local = parse(fs.readFileSync(saveFile(), 'utf8')); } catch (e) {}
  cloud = parse(steam.cloudRead(SAVE));
  if (cloud && (!local || (cloud.savedAt || 0) > (local.savedAt || 0))) {
    if (local) try { fs.writeFileSync(saveFile() + '.local-backup-' + local.savedAt, JSON.stringify(local)); } catch (e) {}   // conflict-safe: never lose the losing copy
    cloud._fromCloudNewer = true; return cloud;
  }
  return local;
}
function writeSave(keys) {
  try {
    const o = { v: 2, savedAt: Date.now(), keys }, text = JSON.stringify(o);
    fs.mkdirSync(NEW_DIR, { recursive: true });
    const tmp = saveFile() + '.tmp'; fs.writeFileSync(tmp, text); fs.renameSync(tmp, saveFile());
    steam.cloudWrite(SAVE, text);
    checkDerived(keys);
  } catch (e) { console.error('save failed', e.message); }
}
/* ---- achievements ---- */
const unlocked = new Set();
function unlockApi(api) { if (unlocked.has(api)) return; unlocked.add(api); const ok = steam.unlock(api); if (TEST) console.log('[ach]', api, ok); }
function unlockGame(id) {
  const ev = MAP.squad2_marines.events[id]; if (ev) { unlockApi(ev); return; }   // rc8a squad2Check(): Marine truly unlocked/playable
  if (/^squad2_/i.test(id)) { if (TEST) console.log('[ach] ignored unknown squad2 event', id); return; }   // never guess an API name for unknown squad2 ids
  // rc8.2 #7: explicit map only (steam/lco_steam_config.json "map"); ids that are already ACH_* (ACH_HUEY_UNLOCK) pass through; unknown ids are logged, never guessed
  const api = MAP.map[id] || (/^ACH_[A-Z0-9_]+$/.test(id) ? id : null);
  if (!api) { if (TEST) console.log('[ach] ignored unmapped id', id); return; }
  unlockApi(api);
  for (const x of MAP.squad2[id] || []) unlockApi(x);
}
function checkDerived(keys) {   // re-sync from save (covers achievements earned while Steam was offline) + ribbons + hiscore loadout + squad2 events
  const K = MAP.cloud.derivedKeys || {}, get = (k) => keys[k] != null ? keys[k] : keys[k.replace(/^lco_/, 'lbo2_')];   // rc8a lco_*, legacy lbo2_*
  try { for (const id of Object.keys(JSON.parse(get(K.achievements || 'lco_ach') || '{}'))) unlockGame(id); } catch (e) {}
  try { if ((+JSON.parse(get(K.hiscore || 'lco_hiscore') || '0')) >= 8000) MAP.squad2._hiscore_8000.forEach(unlockApi); } catch (e) {}
  try { const ch = JSON.parse(get(K.chars || 'lco_chars') || '{}');
    for (const c of Object.values(ch)) { const r = c && c.rib; const ids = Array.isArray(r) ? r : (r && typeof r === 'object' ? Object.keys(r).filter((k) => r[k]) : []);
      for (const k of ids) if ((MAP.ribbons || {})[k]) unlockApi(MAP.ribbons[k]); /* rc8.2 EP: no ribbon achievements (map removed) */ } } catch (e) {}
  // lco_sq2 = the game's own record of squad2_unlock_<id> events it already sent (written only together with the event): replay so an unlock while Steam was down is not lost
  try { for (const k of Object.keys(JSON.parse(keys[K.squad2 || 'lco_sq2'] || '{}'))) { const ev = MAP.squad2_marines.events['squad2_unlock_' + k]; if (ev) unlockApi(ev); } } catch (e) {}
}

function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 640, minHeight: 400, backgroundColor: '#07100a', title: APP_NAME,
    autoHideMenuBar: true, show: !TEST, fullscreen: TEST ? false : wantFullscreen(steam.isDeck()), fullscreenable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, devTools: !app.isPackaged, backgroundThrottling: false, autoplayPolicy: "no-user-gesture-required" },
  });
  // Legal Oct 28: unlock-all only in friends/test builds. BUILD_TIER is the single setting (package.json "lcoTier", set at packaging).
  win.loadURL('app://game/index.html?tier=public&jungle=1&doconly=0&lcotier=' + BUILD_TIER + (BUILD_TIER !== 'public' ? '&all=1' : '') + (TEST ? '&nobrief=1&notut=1' : ''));
  if (LCO_TEST_WIN) { const T = '[LCO TEST] ' + APP_NAME + ' (test instance - safe to close)'; win.setTitle(T); win.on('page-title-updated', (e) => { e.preventDefault(); win.setTitle(T); }); win.webContents.on('did-finish-load', () => { try { win.webContents.executeJavaScript('document.title=' + JSON.stringify(T)); } catch (e) {} }); }   /* rc8.3 rule: test launches on Blake's PCs are labelled */
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) require('electron').shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && (i.key === 'F11' || (i.key === 'Enter' && i.alt) || (i.key.toLowerCase() === 'f' && i.control && i.meta))) { win.setFullScreen(!win.isFullScreen()); saveWinPref(win.isFullScreen()); e.preventDefault(); }
  });
  // rc8.2 #37: on close, ask the page to snapshot a live run (suspend) + flush the save, then close for real (1.5 s safety timeout)
  let closing = false;
  win.on('close', (e) => { if (closing || TEST && process.env.LCO_NO_SUSPEND === '1') { try { win.webContents.send('save:flush'); } catch (x) {} return; }
    e.preventDefault(); closing = true; const done = () => { try { win.close(); } catch (x) {} };
    ipcMain.once('run:suspended', done); setTimeout(done, 1500); try { win.webContents.send('run:suspend'); } catch (x) { done(); } });
}
ipcMain.on('cfg:cloud', (e) => { const c = MAP.cloud; e.returnValue = { syncKeyPattern: c.syncKeyPattern, legacyRestorePattern: c.legacyRestorePattern, excludeKeys: c.excludeKeys, includeKeys: c.includeKeys || [], derived: c.derivedKeys || {} }; });
ipcMain.on('save:load', (e) => { e.returnValue = readSave(); });
ipcMain.on('save:write', (e, keys) => { if (keys && typeof keys === 'object') writeSave(keys); });
ipcMain.on('steam:unlock', (e, id) => { if (typeof id === 'string' && /^[a-z0-9_]{1,40}$/i.test(id)) unlockGame(id); });
ipcMain.on('steam:status', (e) => { e.returnValue = { available: steam.available(), status: steam.getStatus(), deck: steam.isDeck(), migration: MIG }; });
ipcMain.on('fs:set', (e, b) => { if (win) { win.setFullScreen(!!b); saveWinPref(!!b); } });
ipcMain.on('build:info', (e) => { e.returnValue = BUILD_INFO; });
ipcMain.on('tier:get', (e) => { e.returnValue = BUILD_TIER; });
ipcMain.on('app:quit', () => app.quit());

app.whenReady().then(async () => {
  serveGame();
  console.log('[lco] file-origin migration', await migrateFileOrigin());
  console.log('[lco] userData', redactPath(NEW_DIR), 'migration', MIG, 'steam', STEAM_APP_ID ? steam.init(STEAM_APP_ID) : 'skipped: no App ID (steam/lco_app_id.json placeholder)');
  createWindow();
  if (TEST) { try { require('./smoke')(win, saveFile, unlocked); } catch (e) { console.error('[smoke] not packaged in this tier:', e.message); } }   // public packages exclude smoke.js
});
app.on('window-all-closed', () => { if (!MIGRATING) app.quit(); });
