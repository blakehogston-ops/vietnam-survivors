'use strict';
/* Steamworks wrapper (steamworks.js). Every call is a safe no-op when Steam isn't running / the native module can't load,
   so the game runs fine standalone. App ID comes from steam/lco_app_id.json (placeholder until Blake fills it in; 480 only via LCO_APPID in dev/tests). */
let sw = null, client = null, status = 'not-initialised';
function init(appId) {
  // rc8.2 #7 test stub (LCO_TEST=1 + LCO_STEAM_STUB=<log file>): fake Steam client that appends every activate(api) to the log. Never active otherwise.
  if (process.env.LCO_TEST === '1' && process.env.LCO_STEAM_STUB) { const fs = require('fs'), f = process.env.LCO_STEAM_STUB, got = new Set();
    client = { achievement: { isActivated: (a) => got.has(a), activate: (a) => { got.add(a); fs.appendFileSync(f, a + '\n'); return true; } },
      cloud: { isEnabledForAccount: () => false, isEnabledForApp: () => false }, utils: { isSteamRunningOnSteamDeck: () => false } };
    status = 'ok (stub, appId ' + appId + ')'; return status; }
  try {
    sw = require('steamworks.js');
    client = sw.init(appId);
    status = 'ok';
    try { sw.electronEnableSteamOverlay(); } catch (e) {}
  } catch (e) { client = null; status = 'unavailable: ' + (e && e.message ? e.message : e); }
  return status;
}
const available = () => !!client;
const getStatus = () => status;
function unlock(api) {
  if (!client) return false;
  try { if (!client.achievement.isActivated(api)) return client.achievement.activate(api); return true; } catch (e) { return false; }
}
function cloudOk() { try { return !!client && client.cloud.isEnabledForAccount() && client.cloud.isEnabledForApp(); } catch (e) { return false; } }
function cloudWrite(name, text) { if (!cloudOk()) return false; try { return client.cloud.writeFile(name, text); } catch (e) { return false; } }
function cloudRead(name) { if (!cloudOk()) return null; try { return client.cloud.fileExists(name) ? client.cloud.readFile(name) : null; } catch (e) { return null; } }
function isDeck() { try { return !!client && client.utils.isSteamRunningOnSteamDeck(); } catch (e) { return false; } }
module.exports = { init, available, getStatus, unlock, cloudWrite, cloudRead, isDeck };
