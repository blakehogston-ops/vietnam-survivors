# rc8.2 #37 — wrapper side done (Steam Build Engineer), game side spec for Lead Developer
Branch rc8.2/25-packaging, steam/main.js + steam/preload.js. No index.html / assets edits by me.

## A. Stale build ID in the packaged app
Wrapper: `prep.js` writes package.json `lcoStamp` from the packaged game's `const BUILD` (e.g. `lco-std-811b 1908a28 (2026-10-28 22:51 ET)`); exposed as `window.vsHost.build = {version, stamp, tier, electron}` (sync, before game scripts).
Lead (game): where the menu/end card prints the build line, when `window.vsHost&&vsHost.build` exists show `vsHost.build.version + ' · ' + BUILD.id` (and tier if not public). The stale value came from packaging an old game/ copy; prep.js now always copies the repo HEAD and the stamp proves which.

## B. Suspend / resume on quit
Wrapper (done): window `close` is intercepted → page gets `run:suspend` → preload calls `window.__RS.save('host-quit')` if `__RSH.live()`, writes `lco_suspended={at}`, flushes lco_save_v2.json (Steam Cloud), then the window closes (1.5 s timeout). On next launch preload sees `lco_suspended` + `lco_runsave` and writes `lco_navcause={disc:true,at:now,why:'host-suspend'}` so the existing runsave.js RESUME RUN button appears.
Lead (needed, assets/runsave.js):
1. In `offer()`: accept `nc.why==='host-suspend'` without the 30-min `MAXAGE` cap (player may come back days later); keep the cap for Chrome discards.
2. Button text for host-suspend: "RESUME RUN" with "Saved when you quit at m:ss" (not the "Chrome unloaded the tab" copy).
3. Also snapshot on the in-game QUIT (desktop) button if a run is live (currently quit→menu clears it); decide with EP whether menu-quit = abandon.
4. Cloud: lco_runsave is an lco_* key, so it syncs; if its size is a concern add it to excludeKeys and we keep it local only.
Untested end-to-end: needs (1) before a resume after >30 min can work. Quit within 30 min should already offer RESUME.

## C. Achievements (#7) — hook request (optional)
Expose `window.__lco.achIds = ACH.map(a=>a.id)` so the packaged test reads the live table instead of parsing index.html.
