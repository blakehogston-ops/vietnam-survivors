# STAGING MANIFEST: LCO rc8.1 /test/ web build (b879526)

- **Source:** /workspace/qa/frozen/b879526 (read-only, has FROZEN.txt). Matches `git archive b879526` from /workspace/vietnam-survivors byte for byte (only FROZEN.txt extra). b879526 descends from 7ec3a1e.
- **Change vs 91d4441:** index.html and assets/art/hud_art.js only (56+/49-), UI textfit commits 319f8dc..bba2291: 18px label chips (FIREBASE SITE, PICKUP PAD, boss/officer/world labels, XP, LVL dogtag, clock plate, boss bar), claymore stamp as pre-rendered art sprite, BIRD WANTS SMOKE prompt timing, Mature line + Credits 18px, end card 2-col on short wide screens, menu caption 18px; build stamp b7be5d6 -> bba2291.
- **Exclusions:** `tools/`, `qa/`, `proof/`, `notes/`, `*.map`, `vo_ho_k01.*`, `vo_ho_k02.*`, `FROZEN.txt`
- **Tier injection:** `<script>window.LCO_BUILD_TIER='public';</script>` before the first `<script>` in index.html (scripts/inject_tier.js).
- **Disclosure:** AI_DISCLOSURE.txt is v3 (same as 91d4441 staging).
- **Legal word gate:** the Legal rg gate returns 0 on the source tree and on this folder.

- **Change vs 7ec3a1e:** index.html only, 63d5d79 pad-ring fix (PICKUP PAD label chip back to rc6b size, ring re-stroked above the men); build stamp bba2291 -> 63d5d79. Earlier change history below is vs 91d4441 for 7ec3a1e.
- Gates: QA GO (r81_verdict_summary.md); blind playtests PASS (Lead: deeptest-rc81/verdict-b879526.md, Junior: deeptest-rc81/blind-b879526-junior.md).
- rc8.1 = b879526 (code 63d5d79)
- MUST-FIX before any Steam depot build: smoke:portable squad2 achievement mapping fails (one unlock grants all 8; lco_sq2 not written). The EP waived it for the portable zips only (Oct 23, 3:14 AM ET); still required before any Steam depot build.
