# rc8.2 #25 package audit (Oct 28 2026, ~11:35 PM ET) — branch rc8.2/25-packaging
Built from repo: `npm ci && node prep.js && electron-builder --linux dir --x64` (Electron 31.7.7 -> bumped to 45.1.0 in the next commit, electron-builder 24.13.3, steamworks.js 0.4.0). Win/Mac dist not built tonight (Wine broken after the 22:59 box reboot; see blockers).

| Check | Result |
|---|---|
| app.asar entries | 976 (949 under /game) |
| node_modules in package | steamworks.js only (asarUnpack). No electron / electron-builder / png2icons / test deps |
| tools/ qa/ proof/ test/ superseded/ prep.js builder.friends.js STEAM_CHECKLIST.md | absent |
| smoke.js / vo_ho_k01-02 (Loc VO) | absent in public tier (friends tier adds them back, nothing else) |
| DO-NOT-SHIP: *_preview.* (combat_loop_calm_preview), menu_asian*, samples/candidates, _rejected_audit | absent (excluded in prep.js AND build.files) |
| steam_appid.txt / 480 | not shipped; extraFiles removed; old file at steam/superseded/steam_appid.txt.480. App ID = steam/lco_app_id.json placeholder `REPLACE_WITH_REAL_STEAM_APP_ID` |
| unlock-all | public tier URL has no all=1 (only friends/test tiers append it) |
| tier / stamp | package.json lcoTier=public, lcoStamp written by prep.js from game BUILD (`lco-std-811b 1908a28`) |
| Lighter-brand gate (rg -i) | 0 matches |
| Icons | steam/build/icon.{png,ico,icns} PLACEHOLDER from apple-touch-icon.png (180 px upscaled). Art track must supply a 1024 px master |
| Signing | none (Windows unsigned, mac ad-hoc only). Blake signs: /workspace/staging/rc8.2-signing-for-blake.md |
| unpacked size (linux) | 356 MB |

audio/vo_ai/dry/* ships on purpose (radio lines via SamplePlayer.radioLine, RC8_NOTES l.131); baked-radio takes are not shipped.
