'use strict';
/* Bridge: exposes window.steamworks (the game's existing P3.steam() hook and rc8a squad2Check() call steamworks.achievement.activate(id))
   and syncs the game's lco_* localStorage keys with the main-process save (lco_save_v2.json, Steam Cloud).
   rc8a: keys were renamed lbo2_* -> lco_* (the game copies them once itself); there is no single 'lco_save_v2' key in rc8a. */
const { contextBridge, ipcRenderer, webFrame } = require('electron');
// public tier (rc8.1 465581c+): set before game scripts run
contextBridge.exposeInMainWorld('LCO_BUILD_TIER', 'public'); try { webFrame.executeJavaScript("window.LCO_BUILD_TIER='public'"); } catch (e) {}
const CFG = ipcRenderer.sendSync('cfg:cloud');   // steam/lco_steam_config.json -> cloud
const PFX = new RegExp(CFG.syncKeyPattern), LEG = CFG.legacyRestorePattern ? new RegExp(CFG.legacyRestorePattern) : null;
const INC = new Set(CFG.includeKeys || []), EXC = new Set(CFG.excludeKeys || []), D = CFG.derived || {};
const want = (k) => (PFX.test(k) || INC.has(k)) && !EXC.has(k);
function snapshot() { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (want(k)) o[k] = localStorage.getItem(k); } } catch (e) {} return o; }
// older wrapper saves (rc7/rc7.1) hold lbo2_* keys: convert to the rc8a lco_* names (same mapping as the game's own migration)
function normalize(keys) { const o = {}; for (const k in keys) if (want(k)) o[k] = keys[k];
  if (LEG) for (const k in keys) if (LEG.test(k)) { const nk = k.replace(LEG, 'lco_'); if (o[nk] == null && want(nk)) o[nk] = keys[k]; } return o; }
const J = (t, d) => { try { return JSON.parse(t) || d; } catch (e) { return d; } };
// 0) default graphics quality HIGH if the player never chose one (game reads localStorage lco_quality; ?q= still overrides)
try { if (!localStorage.getItem('lco_quality')) localStorage.setItem('lco_quality', 'high'); } catch (e) {}
// 1) restore before the game scripts run (preload runs first)
try {
  const save = ipcRenderer.sendSync('save:load');
  if (save && save.keys) { const sk = normalize(save.keys), cur = snapshot();
    if (save._fromCloudNewer || !Object.keys(cur).length) { for (const k in sk) localStorage.setItem(k, sk[k]); }
    else {   // local wins: still union-merge achievements / squad2 record and max best/evacs/hiscore so nothing earned elsewhere is lost
      for (const k of D.merge_union || ['lco_ach', 'lco_sq2']) if (sk[k] != null) localStorage.setItem(k, JSON.stringify(Object.assign({}, J(sk[k], {}), J(cur[k], {}))));
      for (const k of D.merge_max || ['lco_best', 'lco_evacs', 'lco_hiscore']) if (sk[k] != null && (+sk[k] || 0) > (+cur[k] || 0)) localStorage.setItem(k, sk[k]);
      for (const k of D.flag_sticky || ['lco_open']) if (sk[k] === '1') localStorage.setItem(k, '1'); } }
} catch (e) {}
// 2) persist on change (cheap poll) + on exit
let last = '';
function flush(force) { const s = snapshot(), j = JSON.stringify(s); if (force || j !== last) { last = j; ipcRenderer.send('save:write', s); } }
setInterval(flush, 5000);
window.addEventListener('beforeunload', () => flush(true));
ipcRenderer.on('save:flush', () => flush(true));
// 3) achievements
let steamOn = false; try { steamOn = ipcRenderer.sendSync('steam:status').available; } catch (e) {}
const ach = { activate: (id) => { if (typeof id === 'string') ipcRenderer.send('steam:unlock', id); setTimeout(() => flush(true), 50); return true; } };
contextBridge.exposeInMainWorld('steamworks', { achievement: ach, activateAchievement: ach.activate, available: steamOn });
// rc8.2 #7: same route under vsHost.steam.unlock (lowercase game ids or ACH_* names; main.js maps them via steam/lco_steam_config.json)
contextBridge.exposeInMainWorld('vsHost', { electron: true, steam: { unlock: (id) => ach.activate(id), available: steamOn }, setFullscreen: (b) => ipcRenderer.send('fs:set', !!b),
  build: (() => { try { return ipcRenderer.sendSync('build:info'); } catch (e) { return null; } })(), quit: () => ipcRenderer.send('app:quit') });
// rc8.2 #37 suspend/resume (wrapper side): main.js asks for a run snapshot before the window closes; game-side snapshot = assets/runsave.js (window.__RS)
ipcRenderer.on('run:suspend', () => { let ok = false; try { ok = !!webFrame.executeJavaScript("(()=>{try{if(window.__RSH&&window.__RSH.live()&&window.__RS){window.__RS.save('host-quit');localStorage.setItem('lco_suspended',JSON.stringify({at:Date.now()}));return 1}}catch(e){}return 0})()"); } catch (e) {}
  setTimeout(() => { flush(true); ipcRenderer.send('run:suspended'); }, 150); });
// on launch: a host-suspended run is offered via the game's own RESUME RUN path (runsave.js needs a fresh lco_navcause.disc). Lead spec: honour lco_suspended without the 30-min cap.
try { const sp = J(localStorage.getItem('lco_suspended'), null); if (sp && localStorage.getItem('lco_runsave')) localStorage.setItem('lco_navcause', JSON.stringify({ disc: true, at: Date.now(), why: 'host-suspend' })); if (sp) localStorage.removeItem('lco_suspended'); } catch (e) {}
contextBridge.exposeInMainWorld('lcoHost', { platform: process.platform, electron: true, steam: () => ipcRenderer.sendSync('steam:status'), quit: () => ipcRenderer.send('app:quit'), log: (k, d) => { try { ipcRenderer.send('crash:log', String(k), JSON.parse(JSON.stringify(d || {}))); } catch (e) {} }, setFullscreen: (b) => ipcRenderer.send('fs:set', !!b) });
