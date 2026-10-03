# Vietnam Survivors

A stylized browser arcade survival game (Vampire Survivors-style) set in Vietnam, 1968. Play a US Marine against VC and NVA waves. Single HTML file, no assets.

**Mature: stylized violence** - cartoon pixel blood and gore.

## Features
- Original Southeast Asian pentatonic lounge music (WebAudio): plucked zither arpeggios, bowed erhu-style lead with vibrato, wood block / bell / shaker. Tempo scales ~90 BPM (level 1) to ~150 BPM (level 20).
- Distant UH-1 "Huey" helicopter ambience every 20-40 s (quiet, panning).
- Punji pit traps: camouflaged, revealed as you approach. They damage and slow you; enemies fall in too.
- VC shout phrases in pixel-font speech bubbles.
- Support weapons (8 levels each): M29 81mm mortar team (arcing rounds, ring warning), M101 105mm howitzer (smoke marker then delayed salvo), PBR Mk II river gunboat (twin .50 cal M2s + M60s, patrols the nearest river then moves on).
- UH-1 Huey door gunners: unlocks at M60 level 6 or player level 12; circles overhead with rotor sound.
- VC fire cosmetic tracers and muzzle flashes at the player (no damage).
- Spider-hole tunnel hatches pop open with dust and VC emerge from them.
- More VC phrases in pixel-font speech bubbles ("Diddy mao!", "Long live Ho Chi Minh!", ...).
- More support weapons (8 levels each): strafing runs (A-1H Skyraider, A-4E Skyhawk, F-4B Phantom II with cannon and Zuni rockets), armor support (a persistent escort tank with an HP bar: M48A3 Patton, M67 "Zippo" flame tank from level 3, M551 Sheridan from level 6; enemies and RPGs damage it, and when destroyed it burns as a wreck and a replacement rolls in from the screen edge after a cooldown that shrinks with level), B-52D Arc Light bomb strip (Agent Orange defoliant clouds from level 5), and UC-123 Ranch Hand spray runs (poison/slow clouds).
- **Marine Fire Team / Squad Insertion** (8 levels): a UH-1 Huey flies in, hovers and ropes down 8 Marines (squad leader, point man with an Ithaca 37, M16A1 rifleman, M60 gunner, M79 grenadier, M14 marksman, corpsman who slowly heals you, radioman who speeds re-insertion). They follow you in loose formation, auto-fire real (modest) damage, have individual HP bars, take damage from enemies and RPGs and die with gore. Replacements arrive by Huey on a cooldown that shrinks with level; allies are capped at 8.
- **VC RPG Troopers** (from ~4 min, at most 2-4 at a time): they keep their distance and fire RPGs at your tank and Hueys first (the door-gunner Huey and the squad-insertion Huey have HP bars that scale with weapon level and crash with an explosion when shot down), otherwise at your squad Marines or you.
- **KC-135 Aerial Refueling** (5-level upgrade, available once you own Arc Light, strafing or Ranch Hand): shorter air-support cooldowns plus extra Arc Light bombs and strafing / Ranch Hand passes. A KC-135A Stratotanker with contrails also flies along high above every B-52 Arc Light run. *In memory of the KC-135 crew chiefs: they kept them flying.*
- **Gore ON/OFF switch on the main menu** (saved in localStorage, default ON). OFF = no blood, decals, gibs or corpses; enemies just poof into dust and the red damage vignette stays mild.
- Fullscreen button / F key.

## Update notes
- **Character select** with 9 service records, between-run progression, per-character abilities and a patrol squad. **Cutscenes:** the launch briefing (Col. Mercer in olive utilities with silver oak leaves, a 50-star US flag and a USMC flag on gold-fringed staffs with a 2-frame wave, warm desk-lamp tint, quiet office audio: muffled hum, ticking clock, distant artillery, radio-static blip under each line; advances on tap/click/keys, text auto-fits small screens) and the cargo-bay intro (inside a Huey: both doors open on scrolling jungle, door gunner on an M23 bungee mount, crew chief, Marines on the floor edge, loose gear, rotor-wash dust, loud rotor + wind with a transistor-radio riff that fades for the title card; skippable at any moment with all intro audio cut).
- **Firebase system** (LZ radio, engineers, tiers, waves, sappers), NVA armor (PT-76 / T-54), B-40 and RPG-7 troopers, Hanoi Hannah radio event, Vietnamese/English shouts with an on-screen pixel font.
  - **Firebase pacing:** a call-in starts calm (~25% enemy density and VC only for 30 s, then a linear ramp to full over 60 s; no bosses/RPG troopers in the first 90 s). Engineers build in three visible stages (sandbag ring → bunker → turrets) with a progress bar, a dashed build-zone outline and ghost footprints; the sandbag ring and first turret are up in roughly 30-40 s. A CH-47 Chinook hovers over the site and lowers a sling-load crate on a cable (the heavy gun / mortar pit needs it). First sapper at ~60-75 s, first enemy tank no earlier than 2 min after the call-in, one free emergency repair when the site falls under 25% HP, tougher engineers/structures, and the squad holds a ring just inside the wire. Audio: build ticks rise in pitch with the bar, a stage-complete chime, Chinook thump + cable creak, a calm layer that fades into combat.
  - Balance: boss HP scaling per boss is +60% (was +90%) so the extraction mission is reachable.
- **Balance:** level-up rerolls and banishes, new passives (Radio Discipline, Field Manual, C-4 Demolition Kit, Dustoff), evolutions (AC-47 Spooky, Arc Light Box Mission), boss supply crates, softened enemy HP scaling. `tools/botrun.js` is a headless Playwright bot that plays a run in seconds and prints survival, DPS, boss time-to-kill and tank lifespan per minute (`node tools/botrun.js --minutes 5,10,15 --runs 3`).
- **Weapon-specific deaths:** every kill reacts to what killed it (thud, wet impact, blast launch, burn to charred, Claymore snap, track crush, punji impale) with capped, oldest-first-fading stamped corpses and decals; mass kills fall back to a cheap path. Agent Orange wilts the foliage and leaves bare ground.
- **Mobile:** safe-area aware HUD, 44px+ tap targets, stacked level-up cards in portrait, scrollable menus, zoom and pull-to-refresh blocked, orientation handling.
- **Extraction mission (~12 min):** the run now has a finish line. *Gunny* (a Gunnery Sergeant on the radio, pixel box in the colonel's style, text + radio blips, no voice acting) talks you through it.
  - **Signals:** the 3:00 boss drops colored smoke, the 6:00 boss drops a flare, and a signal mirror is air-dropped at 9:00 if you hold none (also re-sent at 10:00 if you have none and none lies on the map). Crates can carry a spare at most once per 90 s; regular enemies never drop them. Colors: red, yellow, green, violet (each also labelled in text).
  - **LZ phase (10:00):** press **G** or tap the **SIGNAL** button, then do the one-tap "Say again, what color smoke?" confirm (no timer, can't fail). Popping early is politely refused and keeps the item. The Huey arrives in 30 s (3.6 s of "Hot LZ!" radio and a small extra wave on final), then waits 45 s - about a 75 s hold (`?diff=easy` = 60 s, `?diff=hard` = 90 s). Spawn rate +25% during the hold, enemy cap stays 700, no new boss until it leaves; squad and air support keep working.
  - **Evac:** stand within 60 px of the Huey (ring on the ground, door open, crew chief waving) for 2 s to board and win; arrow + timer on screen, rotor sound rises as it nears, chime when you are in range. You lose if you die or the Huey lifts off empty. Kills during the hold add to the mission score. The Huey runs on game-time clocks that ignore your HP, position and camera and freeze only for pause / level-up (tab-away auto-pauses). The LZ spot is moved off rivers, firebase walls, tunnel hatches and punji pits.
  - Radio lines use period call-signs ("Broken Arrow", "Hot LZ", "Smoke's out", "Say again", "Contact, wait out", pilots' "Winchester" / "Bingo fuel", "Get on the bird!").
  - `node tools/botrun.js --mission --runs 12` plays whole missions and prints the % of runs that reach the LZ and that evacuate.
- Historical fixes: M50A1 Ontos, UH-1E/CH-46 Marine insertion, A-4E/F-4B/A-6A strafing runs.

## Debug & QA switches
All are off by default. Use them as URL flags, or from the browser console (`DBG` is a global: `DBG.bot=true`, `DBG.god=true`, `DBG.fps=true`).

| Switch | What it does |
|---|---|
| `?bot` / `DBG.bot=true` | The built-in autopilot plays (movement, level-up picks, signal confirm). `tools/botrun.js` uses it. |
| `?god` / `DBG.god=true` | Player takes no damage. |
| `?t=N` | Start the run at N seconds (gives a demo kit, fast-forwards the clock; an LZ appears 4 s later). Runs started this way do not award service XP. |
| `?fps` / `DBG.fps=true` | Small top-left readout: **avg** and **min** FPS over the last 5 s (updates twice a second). `window.fpsStats()` returns `{avg,min}` for scripts. Off by default. |
| `?nodemo` `?nointro` `?nobrief` `?autostart` `?brief` | Skip the attract-mode demo / cargo-bay intro / Colonel briefing, start straight into a run, or force the briefing. `?char=ID` picks the character. `?diff=easy|hard` changes the extraction hold. |
| `dbgAirCd()` | Console: prints total air-support cooldown reduction and every air weapon's effective cooldown (Hogston -55 % vs -45 %). |
| `__ms` | Console: internal handles for tests (`__ms.G`, `__ms.step(dt)`, `__ms.spawnLz()`, `__ms.beginFirebase()`, `__ms.fbS`, `__ms.runXpGain(G)` ...). |
| Fast-forward | `?t=540` jumps near the 10:00 extraction; in a script call `__ms.step(1/60)` in a loop with `window.__simHold=true` (this is how the bots run a 12-minute mission in seconds). |
| Ribbons / medals | (not built yet: debug commands will be added here) |

Tools (`cd tools && npm i playwright-core`; they use the installed Chrome): `botrun.js` (balance/mission/firebase bot; `--fb` firebase metrics, `--q 't=480'` extra URL flags, prints per-run service XP old vs new), `botdiag.js` (diagnostic run), `fbstress.js` (firebase early-build stress test: injects N siege enemies during the first 45 s and checks the build keeps progressing).

## Balance notes (latest)
- **Firebase footprint:** square perimeter instead of a circle. Sandbag walls on four sides at half-side 168 px (a 336 x 336 px site, 1.5x the old 112 px radius), 56-px gates in the middle of each side, turrets at the four corners and the four gate midpoints (8 total), bunker / medic tent / helipad / 106mm inside, barbed-wire square at half-side 237 px (was radius 158). Same 3 build stages, progress bar and timings.
- **Engineer grace:** for the first 40 s of a call-in engineers take 85 % less damage, cannot die, are not picked as targets, and do not panic or slow down under fire (protection fades out over the next 20 s). Build progress never fully stalls while any engineer lives (minimum work rate of half speed for the first 45 s, quarter speed after).
