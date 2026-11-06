'use strict';
/* Steamworks wrapper (steamworks.js). Every call is a safe no-op when Steam isn't running / the native module can't load,
   so the game runs fine standalone. APP ID 480 = Valve's Spacewar test app: PLACEHOLDER, replace with the real App ID. */
let sw = null, client = null, status = 'not-initialised';
function init(appId) {
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
