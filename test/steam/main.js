'use strict';
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const steam = require('./steam');

/* Rename (Last Bird Out -> Last Chopper Out): pin the userData folder to the new product name, and on first launch copy an
   old profile (save.json + Chromium Local Storage, which holds the game's localStorage keys) from any earlier app name.
   The old folder is never deleted. A marker file stops it from running twice. */
const APP_NAME = 'Last Chopper Out';
const OLD_NAMES = ['Last Bird Out', 'vietnam-survivors', 'last-bird-out'];
function migrateUserData(appData, newDir, log = () => {}) {
  const mark = path.join(newDir, '.lco_migrated');
  if (fs.existsSync(mark)) return 'already';
  let from = null;
  for (const n of OLD_NAMES) { const d = path.join(appData, n); if (d !== newDir && fs.existsSync(d) && fs.statSync(d).isDirectory()) { from = d; break; } }
  fs.mkdirSync(newDir, { recursive: true });
  let res = 'none';
  if (from) {
    for (const item of ['save.json', 'Local Storage']) {
      const src = path.join(from, item), dst = path.join(newDir, item);
      if (fs.existsSync(src) && !fs.existsSync(dst)) { fs.cpSync(src, dst, { recursive: true }); log('migrated ' + item + ' from ' + from); }
    }
    res = 'copied:' + path.basename(from);
  }
  fs.writeFileSync(mark, res + ' ' + new Date().toISOString());
  return res;
}
module.exports.migrateUserData = migrateUserData;
if (process.versions.electron) {
  app.setName(APP_NAME);
  const ud = path.join(app.getPath('appData'), APP_NAME);
  app.setPath('userData', ud);
  try { console.log('[migrate]', migrateUserData(app.getPath('appData'), ud, console.log)); } catch (e) { console.error('[migrate] failed', e.message); }
}

const TEST = process.env.VS_TEST === '1';
const STEAM_APP_ID = 480;                       // placeholder (Spacewar). Replace with your real App ID.
let win = null;

const saveFile = () => path.join(app.getPath('userData'), 'save.json');     // single JSON file: cloud-save friendly (Steam Auto-Cloud root=userData, pattern=save.json)
function readSave() {
  let local = null, cloud = null;
  try { local = JSON.parse(fs.readFileSync(saveFile(), 'utf8')); } catch (e) {}
  try { const t = steam.cloudRead('save.json'); if (t) cloud = JSON.parse(t); } catch (e) {}
  if (cloud && (!local || (cloud.savedAt || 0) > (local.savedAt || 0))) return cloud;
  return local;
}
function writeSave(o) {
  try {
    o.savedAt = Date.now();
    const text = JSON.stringify(o);
    fs.mkdirSync(path.dirname(saveFile()), { recursive: true });
    const tmp = saveFile() + '.tmp'; fs.writeFileSync(tmp, text); fs.renameSync(tmp, saveFile());   // atomic replace
    steam.cloudWrite('save.json', text);
  } catch (e) { console.error('save failed', e.message); }
}

function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 640, minHeight: 400, backgroundColor: '#07100a', title: require('./title.json').title,
    icon: path.join(__dirname, 'build', 'icon.png'), autoHideMenuBar: true, show: !TEST,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: !app.isPackaged, backgroundThrottling: false },
  });
  win.loadFile(path.join(__dirname, 'game', 'index.html'), TEST ? { query: { nobrief: '1' } } : undefined);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.type === 'keyDown' && input.key === 'Enter' && input.alt) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  return win;
}

ipcMain.on('save:load', (e) => { e.returnValue = readSave(); });
ipcMain.on('save:write', (e, o) => { if (o && typeof o === 'object') writeSave(o); });
ipcMain.on('fs:set', (e, b) => { if (win) win.setFullScreen(!!b); });
ipcMain.on('fs:get', (e) => { e.returnValue = win ? win.isFullScreen() : false; });
ipcMain.on('app:quit', () => app.quit());
ipcMain.on('steam:unlock', (e, name) => { if (typeof name === 'string' && /^ACH_[A-Z0-9_]+$/.test(name)) steam.unlock(name); });
ipcMain.on('steam:sync', (e, list) => { if (Array.isArray(list)) steam.sync(list.filter((x) => typeof x === 'string')); });
ipcMain.on('steam:status', (e) => { e.returnValue = { available: steam.available(), status: steam.getStatus() }; });

app.whenReady().then(() => {
  const st = steam.init(STEAM_APP_ID);
  console.log('[steam]', st);
  createWindow();
  if (TEST) runSmokeTest();
});
app.on('window-all-closed', () => app.quit());

/* ---------- headless smoke test (VS_TEST=1): launches the game, plays a few seconds, checks saves & console ---------- */
function runSmokeTest() {
  const problems = [];
  win.webContents.on('console-message', (e, level, msg) => { if (level >= 2) problems.push('console[' + level + ']: ' + msg); });
  win.webContents.on('render-process-gone', (e, d) => problems.push('renderer gone: ' + d.reason));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  win.webContents.once('did-finish-load', async () => {
    try {
      await wait(1200);
      const run = (js) => win.webContents.executeJavaScript(js);
      const r = {};
      r.host = await run('!!window.vsHost');
      r.steamAvailable = await run('window.vsHost.steam.available()');
      r.steamStatus = await run('window.vsHost.steam.status()');
      r.state0 = await run('__ms.state');
      await run("document.getElementById('btnStart').click()"); await wait(500);
      r.charsel = await run("document.getElementById('charsel').classList.contains('show')");
      await run("document.getElementById('btnCsGo').click()"); await wait(800);
      for (let i = 0; i < 15; i++) { if ((await run('__ms.state')) === 'play') break; await run("window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}))"); await wait(600); }
      await wait(1500);
      r.state1 = await run('__ms.state');
      await run("__ms.G.kills=0; __ms.ach('FIRST_BLOOD'); __ms.ach('HUEY_UNLOCK')");
      await run("__ms.SET.music=.5; __ms.SET.gore=false; __ms.SET.fullscreen=false; document.getElementById('btnPause').click()"); await wait(300);
      r.paused = await run('__ms.state');
      await run("document.getElementById('btnPSettings').click()"); await wait(200);
      r.settingsShown = await run("document.getElementById('settings').classList.contains('show')");
      await run("document.getElementById('btnSetFull').click()"); await wait(600);
      r.fullscreen = win.isFullScreen();
      await run("document.getElementById('btnSetFull').click()"); await wait(600);
      r.fullscreenOff = !win.isFullScreen();
      await run("document.getElementById('btnSetBack').click()"); await wait(200);
      await run("document.getElementById('btnResume').click()"); await wait(1500);
      r.state2 = await run('__ms.state');
      r.fps = await run('new Promise(res=>{const f0=__ms.perf.frames,t0=performance.now();setTimeout(()=>res((__ms.perf.frames-f0)/((performance.now()-t0)/1000)),2000)})');
      let saved = null; try { saved = JSON.parse(fs.readFileSync(saveFile(), 'utf8')); } catch (e) { problems.push('no save file: ' + e.message); }
      r.save = saved && { music: saved.settings && saved.settings.music, gore: saved.settings && saved.settings.gore, ach: saved.ach && Object.keys(saved.ach) };
      console.log('[smoke]', JSON.stringify(r));
      const ok = r.host && r.state0 === 'menu' && r.state1 === 'play' && r.paused === 'paused' && r.settingsShown && r.state2 === 'play' && r.save && r.save.gore === false && r.save.ach && r.save.ach.includes('FIRST_BLOOD');
      if (!ok) problems.push('assertions failed');
    } catch (e) { problems.push('exception: ' + e.message); }
    console.log('[smoke] problems:', JSON.stringify(problems));
    app.exit(problems.length ? 1 : 0);
  });
  setTimeout(() => { console.log('[smoke] timeout'); app.exit(2); }, 60000);
}
