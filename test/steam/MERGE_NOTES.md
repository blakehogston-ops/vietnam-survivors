# rc8.2/25-pkg-merge: merge of Lead's 3e4dfb7 into packaging (base 42c4d39)

This branch is based on 42c4d39, not on 400a8f5. 400a8f5 is test evidence only and must not ship.
The merge brings in 331ce28 (G.spk / spkCap freeze fix), c40ec27, 3e4dfb7 (LO.reqOk null guard) and the earlier rc-int commits.

## Conflicts and how each was resolved
| File | Resolution |
|---|---|
| index.html (game code) | Took Lead's side (`git checkout --theirs`). It is byte-identical to 3e4dfb7:index.html. |
| steam/main.js | Auto-merged except for one line, the `[lco] userData` log. Kept the packaging App ID check (`STEAM_APP_ID ? steam.init(...) : 'skipped: no App ID'`) and used Lead's `redactPath(NEW_DIR)`. Lead's `redactPath()` function and his basename-only migrate result (`'migrated:' + path.basename(d)`) came in through the clean auto-merge. Packaging logic is unchanged: --windowed/--fullscreen, window.json, BUILD_INFO stamp, BUILD_TIER, ACH map. |
| ASSET_LICENSE_LOG.md | Union of both sides. The HEAD BeVietnamPro font row (item 29) comes first, then Lead's CH-46D native and loadout-icons sections. |

## Checks run at merge time
- No conflict markers: `rg '^(<<<<<<<|>>>>>>>)'` returns 0.
- `node --check steam/*.js` passes.
- `if(!r)return true` is in reqOk. The spkCap fix (331ce28) is included because index.html equals 3e4dfb7. `redactPath` is in steam/main.js.
- `git diff 3e4dfb7 HEAD -- . ':!steam'` shows only the packaging-side item 29 files: fonts/BeVietnamPro/*, THIRD_PARTY_ASSETS.txt, the ASSET_LICENSE_LOG font row and tools/vifont_check.js (tools/ is not packaged).
- The brand-name gate (see rebuild_from.sh) returns 0.

## Rebuilding from QA's passed sha
`steam/rebuild_from.sh <sha>` merges that sha with the same rules and refuses to proceed if steam/main.js conflicts. It then runs the checks, prep.js and the Windows zip build, writing to builds/win-rc8.2-<sha>-candidate/.

## Build stamp fix (follow-up commit)
prep.js used to stamp from the hand-set `BUILD.id` in index.html, which was stale (491cea2 or 10ce436 instead of the real HEAD). It now stamps `git -C <src> rev-parse --short HEAD` plus the time in ET, for example `383f405 (2026-10-29 18:10 ET)`. It falls back to BUILD.id only if git is unavailable, and logs `[prep] stamp source: ...`. The stamp goes into package.json `lcoStamp`, which main.js reads into BUILD_INFO.stamp, which is exposed as vsHost.build, and into game/RC_SOURCE.txt. prep rewrites package.json, so revert it after a dry run (rebuild_from.sh does this).
