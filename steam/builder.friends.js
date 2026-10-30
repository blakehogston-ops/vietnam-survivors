'use strict';
/* Friends / test packages (Blake's rule, Legal Oct 28): same as the public build config in package.json "build", but
   - lcoTier = 'friends' (or LCO_PKG_TIER=test) -> unlock-all ON at runtime (steam/main.js BUILD_TIER),
   - keeps smoke.js and the Loc HO-K01/K02 (Vietnamese) VO files that the public config excludes.
   Usage: npx electron-builder -c builder.friends.js --mac   (public: plain `electron-builder`, lcoTier='public'). */
const base = require('./package.json').build;
const tier = process.env.LCO_PKG_TIER === 'test' ? 'test' : 'friends';
module.exports = Object.assign({}, base, {
  files: base.files.filter((f) => f !== '!**/smoke*.js' && !f.startsWith('!game/audio/vo_ai/')).concat(['smoke.js']),   // rc8.2: only smoke.js + Loc VO come back; DO-NOT-SHIP/dev excludes stay
  extraMetadata: { lcoTier: tier },
  directories: Object.assign({}, base.directories, { output: 'dist-' + tier }),
});
