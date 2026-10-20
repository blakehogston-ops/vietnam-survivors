'use strict';
// Steamworks wrapper with graceful fallback: if Steam isn't running (or steamworks.js can't load) every call is a safe no-op.
let sw = null, client = null, status = 'not-initialised';
const pending = new Set();           // achievements unlocked while Steam was unavailable (re-sent on next launch via the save file)

function init(appId) {
  try {
    sw = require('steamworks.js');
    client = sw.init(appId);          // throws if the Steam client isn't running / app id invalid
    status = 'ok';
    try { sw.electronEnableSteamOverlay(); } catch (e) { /* overlay is optional */ }
  } catch (e) {
    client = null;
    status = 'unavailable: ' + (e && e.message ? e.message : e);
  }
  return status;
}
const available = () => !!client;
const getStatus = () => status;

function unlock(name) {
  if (!client) { pending.add(name); return false; }
  try { if (!client.achievement.isActivated(name)) client.achievement.activate(name); return true; }
  catch (e) { return false; }
}
function sync(names) { for (const n of names || []) unlock('ACH_' + n); }

// Steam Cloud (optional). Auto-Cloud on the userData folder also works; this is a belt-and-braces path.
function cloudWrite(name, text) {
  if (!client) return false;
  try { if (client.cloud.isEnabledForApp() && client.cloud.isEnabledForAccount()) return client.cloud.writeFile(name, text); } catch (e) {}
  return false;
}
function cloudRead(name) {
  if (!client) return null;
  try { if (client.cloud.isEnabledForAccount() && client.cloud.fileExists(name)) return client.cloud.readFile(name); } catch (e) {}
  return null;
}
function runCallbacks() { /* steamworks.js pumps callbacks internally */ }
module.exports = { init, available, getStatus, unlock, sync, cloudWrite, cloudRead, runCallbacks };
