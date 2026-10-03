# Last Bird Out — Quang Tri, 1968

*(formerly "Vietnam Survivors". The repo name and the URL `vietnam-survivors` are unchanged so existing links keep working. Saves migrate automatically: the old `vs_*` localStorage keys are copied once to `lbo_*` and never deleted.)*

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
| `?give=company:2,medevac:3` / `DBG.give('company',2)` | Hand yourself level-up weapons/support perks (id:level, comma separated) for QA. |
| Fast-forward | `?t=540` jumps near the 10:00 extraction; in a script call `__ms.step(1/60)` in a loop with `window.__simHold=true` (this is how the bots run a 12-minute mission in seconds). |
| Ribbons / medals | Console: `DBG.grantRibbon('doc','bs')` (ids: `car ph bs ss nc moh`), `DBG.resetRibbons('doc')` or `DBG.resetRibbons('all')`, `DBG.listRibbons()` / `DBG.listRibbons('doc')`. Character ids: `doc hammer boone skipper zippo rat radio preacher chef`. |

Tools (`cd tools && npm i playwright-core`; they use the installed Chrome): `botrun.js` (balance/mission/firebase bot; `--fb` firebase metrics, `--q 't=480'` extra URL flags, prints per-run service XP old vs new), `botdiag.js` (diagnostic run), `fbstress.js` (firebase early-build stress test: injects N siege enemies during the first 45 s and checks the build keeps progressing).

## Balance notes (latest)
- **Firebase footprint:** square perimeter instead of a circle. Sandbag walls on four sides at half-side 168 px (a 336 x 336 px site, 1.5x the old 112 px radius), 56-px gates in the middle of each side, turrets at the four corners and the four gate midpoints (8 total), bunker / medic tent / helipad / 106mm inside, barbed-wire square at half-side 237 px (was radius 158). Same 3 build stages, progress bar and timings.
- **Engineer grace:** for the first 40 s of a call-in engineers take 85 % less damage, cannot die, are not picked as targets, and do not panic or slow down under fire (protection fades out over the next 20 s). Build progress never fully stalls while any engineer lives (minimum work rate of half speed for the first 45 s, quarter speed after).
- **Service tiers:** `TIER_XP = [350, 1000, 2200, 4000, 6500]` (was `[120, 320, 620, 1050, 1600]`). Run XP = `time/6 + kills/12 + 2 x weapon levels + 25 x maxed weapons + 25 x bosses + 150 if extracted + hold kills/12` (was kills/4, 3x levels, 40x maxed, hold kills/4). A good 12-min run is roughly 700-1000 XP, so tier 5 takes about 8-10 full runs; short runs earn proportionally little. Existing saves keep their XP; their tier is recomputed from the new table.

- **Company Reinforcement (level-up perk, max Lv3, unlocks at player level 6):** 4 UH-1s fly in from four sides and rope down 5 Marines each (20: 8 rifle, 4 M14, 4 M60, 4 M79; yellow armbands, 4 skin tones). They fight until dead or you extract (no timer), hold a leash ring around you (teleported back if > 820 px away), Hueys leave empty. Tuning: `ITEMS.company.stats` = HP 80 +30/Lv (+ run time/10, cap +60), damage x1 +0.2/Lv, cooldown 120 s -15/Lv, started at the call. A new company needs the cooldown AND <= `COY.recall` (5) survivors; hard cap `COY.cap` (30) company Marines alive. Company Marines do not count toward the 'Marines still standing' ribbon conditions. Cheap by design (slot-follow movement, staggered targeting, contact checks every other frame, sound probability 0.07/shot); bot check: 600 enemies + 30 allies cost about the same frame time as 600 enemies alone. `tools/botrun.js` prints `coy` (calls, dropped, dead, avgLife, per-company seconds to half / <=5 alive / wiped) and `medevac` (calls, total HP healed).
- **Medevac (level-up support perk, max Lv3, unlocks at player level 5):** a Red Cross UH-1 flies in, hovers over you ~3.5 s and heals everyone within `MEDEVAC.R` (620 px) over 7 ticks: you, squad, patrol, company Marines, tank, firebase engineers; 40 % / 60 % / 80 % of max HP by level, cooldown 90 s -12/Lv (own cooldown, not part of the air-support cap). It only comes when you are under 80 % HP or 3+ allies are under 60 %, never heals past max, floating +HP on up to 8 units, red smoke (reduced by Low effects). Art: Artist Helper `medevac_huey.js` (Red Cross Huey, 2 rotor phases) and `heal_pulse.js` (green-white ground ring + rising plus, at most `MEDEVAC.fxMax` = 30 live effects, nearest units first, skipped under Low effects). Separate from the one-time Dustoff revive. HUD pills (COMPANY / MEDEVAC) sit above the ability button.
- **PFC Josh Johnson 'Country' (Buffalo Gap, VA):** starts with the **M1903 Springfield .30-06** (bolt-action) instead of the M16A1; the M16A1 is not offered to him as a level-up (everyone else is unchanged, and the patrol Marines keep M16A1s). `ITEMS.m1903.stats`: bolt `1.55 s x 0.93^(lvl-1)` (0.93 s at Lv8), pierce `4 + floor(lvl/2)` (Lv8 scoped: pierces the whole line), range `600 + 45 x (lvl-1)`, boss/tank damage `120 + 30 x (lvl-1)`. Any non-boss, non-tank enemy (VC, NVA, officer, B-40 trooper, sapper) dies to one round (`bullet.ohk`). Visible long tracer, bolt-cycle animation + two bolt clicks (`boltA`/`boltB`), heavy crack = pack cue `ak47` (request to Sound Helper: a dedicated tier-2 `boltRifleCrack` and `boltCycle`).
- **Sound (Stage C):** the 42-cue pack (`assets/sound/sound_cues.js`, inlined) plays through `Cues.createBus` (compressor) into the SFX master, then a final limiter (-7 dB threshold, 14:1) so stacked guns/cues/music/voice stay under 1.0 (measured peak 0.91 over a 60 s heavy fight, 0 clipped frames; `?meter` adds a peak meter, `__ms.Snd.peakMax`). The cue bus ducks to about half while the Colonel's recorded voice or the briefing is playing. Legacy event names map to pack cues in `CUEMAP`/`CUEAIR` (guns, mortar, B-40, boss, level-up, UI, build stage, medic pack, signal pop, deaths, air strafe/napalm/tanker); everything else keeps the original in-game synth. Budget: 18 non-tier-1 cues per 250 ms. Low health: heartbeat cue + synced screen-edge pulse below 30 % HP.
- **Low effects (Stage D):** Settings switch (main menu and pause menu). ON by default on touch devices (`pointer:coarse`), saved as `lbo_lowfx`, `?lowfx=1/0` overrides. Caps: particles 210 (was 520, half the non-glow smoke dropped, bursts x0.55), decals 260 (700), drops 110 (300), rotor wash x0.3, enemy cap 420 (700), tier-3 sound cues off. Measured (headless Chrome, 4x CPU throttle, 390x844 @3x, t=600 bot fight): **30 avg / 15 min FPS off vs 41 avg / 30 min FPS on**; desktop stays 60 either way.
- **Extraction (Stage E):** `EX` constants unchanged (bot, Doc, 24 runs: reach LZ 79 %, evacuated 46 %, inside the 45-55 % target; Hammer 75 % evacuated, so the bot favours some kits). Company + Medevac Lv2 from second zero lifted Doc to 100 % reach / 83 % evac, so LZ hold waves now grow `EX.COY_PER` (4 %) per living Company Marine, max `EX.COY_MAX` (+100 %): same bot with both perks maxed early is now 100 % reach / 58 % evac (12 runs). Players only get the perks after level 5-6 and must pick them over other upgrades.
- **Service-record card:** end-of-run screen shows the character, an animated XP bar to the next tier, tier-unlock text, the earned-ribbon strip (new ones outlined and described) and the dedication to the Vietnam veterans and MSgt. Hogston. With `?fps`/`?bot`/`?debug` it also prints "killed by: <source>" and damage taken per source.

## Ribbons & medals
Six awards per character, shown highest first as a rack on the character-select service record with "how to earn it" text (unearned ones are dimmed; the Medal of Honor is a locked silhouette until earned). Stored per character in `localStorage` (`vs_chars`), each unlocks once, and **only at the end of a patrol (death or extraction)** - quitting to the menu, skipping or closing the tab grants nothing. New awards are listed on the end-of-run screen.

| Ribbon | Earned by |
|---|---|
| Combat Action Ribbon (`car`) | Survive 4:00 and defeat 250 enemies in one patrol |
| Purple Heart (`ph`) | Fall below 25% HP, recover past 60%, and still be alive after 6:00 |
| Bronze Star (`bs`) | 6,000 kills in one patrol, or 20 boss kills over your career with that Marine |
| Silver Star (`ss`) | Kill 2 bosses in one patrol, each with 4+ squad Marines standing |
| Navy Cross (`nc`) | Extracted after 2+ boss kills and 1,500+ LZ-hold kills (600+ on `?diff=hard`) |
| Medal of Honor (`moh`) | Extracted with 3+ boss kills and 5+ Marines standing, after dropping under 15% HP during the LZ hold, no Dustoff |

Art: Artist Helper's `ribbons.js` (kept in `assets/artist/`, inlined in `index.html`). Stripe patterns are from the official specs cited in `assets/artist/README.md`; they still need Vietnam Vet's review (CAR left/right orientation).

## Art drop-ins
Pending Artist Helper pieces plug into the `ART` object near the top of the sprite code in `index.html` (`ART.portraits[charId]`, `ART.wallTiles`, `ART.decals`, `ART.cdRing`); until set, the built-in placeholders are used.


## Country (Josh Johnson) rifle sound and Hogston service photo
- The M1903 shot is an original synthesized cue (`Cues.boltRifleCrack`, tier 2): 1-3 ms click, ~80 ms supersonic crack, ~220 ms low boom, ~500 ms echo tail (~250 ms and quieter under Low effects) and a bolt clack-clack about 0.5 s later. It goes through the cue-bus compressor and the final limiter, honours mute, and allows at most 2 voices at once. Measured: no clipped frames.
- MSgt. Hogston's character card and end-of-run card show a framed service photo (`assets/hogston_profile.jpg`, family photo used with the owner's permission, metadata stripped). It is preloaded; if it fails to load only the pixel portrait is shown. The original is kept out of git (`ref/` is ignored).

## Controller support (browser Gamepad API, standard mapping: Xbox / PlayStation / Steam Deck)
Plug in or pair a pad and press any button; a hint shows for a few seconds ("A: special  Start: pause"; PlayStation pads show Cross / Options). Keyboard, mouse and touch keep working; on touch devices the on-screen SIGNAL button is hidden while a pad is connected. Unplugging during play auto-pauses. Optional rumble on hits and on the special if the pad exposes `vibrationActuator`. Browsers only let a page use the pad after the first button press, and a pad press does not unlock Web Audio or fullscreen by itself: click or press a key once for sound, and Select (fullscreen) only works if the browser allows it without a mouse click (Steam/Electron build: yes).

| Context | Button | Does |
|---|---|---|
| Play | Left stick / D-pad | Move (stick dead zone 0.2) |
| Play | A (Cross), LT or RT | Special (= Space / E) |
| Play | X (Square) | Pop the LZ signal (= G) |
| Play | LB (L1) or R3 | Mute (= M) |
| Play | Start (Options) | Pause (= P / Esc) |
| Any | Select (Create) | Fullscreen (= F) |
| Level-up | Stick / D-pad / LB / RB | Move the highlight on the cards (gold outline) |
| Level-up | A / X / Y / B | Choose / Reroll (= R) / Banish (= B) / cancel a banish |
| Menus, pause, game over | Stick / D-pad up-down | Move the highlight; left/right changes a slider by 10 |
| Menus, pause, game over | A / B | Press the highlighted item / back (pause: resume, game over: main menu) |
| Main menu | Start | Start Patrol (opens character select) |
| Character select | Stick / D-pad / LB / RB, A (or Start), B | Change man, deploy, back |
| Briefing | A / Start or B | Next line / skip |
| Intro | any button | Skip |
| Signal confirm | A (or Start) | Confirm the colour |

QA hook (console): `DBG.pad.press('A')`, `DBG.pad.axes(1,0)`, `DBG.pad.info()`, `DBG.pad.connect()` / `DBG.pad.disconnect()` simulate a pad; mocking `navigator.getGamepads` also works. Button icons are text labels for now.

## Firebase footprint is a SQUARE
Walls (336 x 336 px, half-side `FBS` = 168), the wire (half-side 237), turret slots, the build-progress trace (it runs around the square outline, with the % in the middle), the radio-point site marker and call-in hold trace, and the Marines' hold ring are all square. Only the extraction LZ ring is a circle. Headless check: all 40 sandbags sit at Chebyshev distance 168 from the centre (Euclidean up to 228), wire at 237 (up to 322).

## Build stamp and caching
- The main menu and pause screen show `BUILD <hash> <date ET>` in the bottom-left corner. After every code commit run `node tools/stamp.js`, then commit and push the one-line stamp commit: it writes the short hash of the commit it follows (the code commit), the date, and the `?v=<hash>` cache-buster used on the favicon links, the Colonel's audio files and the Hogston photo.
- GitHub Pages serves `index.html` with `Cache-Control: max-age=600`, so a visitor can see a page up to ~10 minutes old after a push (a hard refresh, or opening the URL with `?v=anything`, always fetches the new one). The page also carries `no-cache` meta tags and, two seconds after loading, asks the server (HEAD, no-store) whether `index.html` is newer than the copy it is running; if so it shows "A newer version of the game is available · click to reload".

## Level-up radio sound and rifle (Sound Helper 45-cue pack)
- `perkRadio` (tier 1) plays once per level-up popup (0.5 s minimum gap, so chained popups do not stack); `boltRifleCrack` (tier 2) is the M1903 shot, and `boltCycle` (tier 2, 19 short sources) follows 0.4 s later, at most once per 0.9 s and skipped on Low-effects devices when more than 220 enemies are out. Everything runs through `Cues.createBus` (compressor) and the final limiter; measured peak 0.87 with 0 clipped frames in a heavy fight, 0.85 with 14 forced level-up radios on top.
