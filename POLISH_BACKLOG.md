# Polish pass (after extraction + firebase easing + cargo-bay intro)
Skip anything already in the build.

## Feel (Gamer)
- Low-health warning: red screen-edge pulse + heartbeat that speeds up below 25% HP
- Level-up beat: ~0.5s slow-down/flash + rising swell before cards; cards not tappable by accident mid-fight
- Kill milestones at 100/500/1000: Gunny radio line ("Semper Fi", "Outstanding, Marines"), squelch click. No "Oorah"/"Devil Dog"
- Boss warning bar before each boss incl. B-40 trooper (different icon)
- End-of-run screen: rank, time, kills, best weapon, medals (Purple Heart = hit, Bronze Star = kills, Silver Star/Navy Cross = boss kills), "Freedom Bird" on extraction, medal-pin chime
- XP magnet after boss death

## History (Vietnam Vet)
- Helmet-cover markings (6-8 variants: peace sign, hometown, short-timer calendar, slogan), Zippo, cigarettes in helmet band, P-38 on dog tags
- Period slang: in-country, the World, beaucoup, Willy Pete, slick
- Map names with one-line blurbs: Khe Sanh, Hue, Con Thien, Hill 881, Cua Viet (I Corps 1968)
- Monsoon weather (rain, fog, red laterite mud tile), with a low-effects setting; must not hide enemies/warnings
- Radio call signs as spoken chatter: Dustoff, Spooky, Arc Light

## Sound
- Per-map ambience: artillery (Khe Sanh), river/boat engines (Cua Viet), urban echo (Hue); rain on foliage, distant thunder

## Phone/QA
- Pause on hidden tab/call and resume without time jump or audio glitch
- Safe areas, 44px targets, settings + best runs persist across reload, rotation mid-run doesn't reset or stretch canvas

## Medal system + diverse roster (user request, high priority)
- Real-life medals earned per character for accomplishments, shown as a ribbon bar (service-ribbon rack) next to each character on the main menu/character select, from Combat Action Ribbon up to the Medal of Honor. Persistent per character. Order of precedence and ribbon colors must be vetted by Vietnam Vet. Use ribbon/medal designs only, nothing implying a real person's award.
- Roster diversity: several characters of different races/ethnicities (e.g. Washington is Black), with distinct skin tones, faces and hair in sprites. Respectful, no stereotypes; bios stay character-based. Artist Helper to supply sprite variants.

### Ribbon ladder (Gamer + Vietnam Vet; thresholds tunable)
Order low to high: Combat Action Ribbon (first firefight / survive 3 min; created 1969, awarded retroactively), Purple Heart (drop below 25% HP and survive), Bronze Star (1000 kills in a run or 5 total boss kills; "V" device for valor), Silver Star (boss kill with squad alive), Navy Cross (extraction on hard map holding Hot LZ), Medal of Honor (extraction, squad survives, player nearly dies; ~1 in 50 for a good player; drawn as a medal on a light-blue neck ribbon, locked silhouette until earned).
- Rack displays highest first. "How to earn it" text visible on the menu. Min thresholds so none is earned by accident.
- Save: each ribbon unlocks once, per character, persists across reload. Death/skip/closed tab never grants one half-way. MoH can't double-fire.
- DEBUG: URL flag or DBG.grant(char, ribbon) / DBG.resetRibbons() for QA.
- Artist Helper to verify exact ribbon stripe patterns against the official Navy/Marine ribbon chart before final art; my placeholders must be marked as placeholders until verified.
- Audio: pin-click on earn; tier cues (bugle note, soft drum, brass phrase); solemn bugle with hushed room tone for MoH only.

## Team top picks (2026-10-03 2:47 PM)
QUICK (fold into polish pass):
- Gamer: late-game HP scaling t/160 after min 8 (already in the earlier batch, verify); firebase grace (done in batch, verify)
- Vet: one-sentence historical fact per weapon/vehicle on level-up card (Vet writes them); text accuracy pass on a full list of player-facing text (export list to Vet); credits dedication to Vietnam veterans and MSgt. Hogston
- Artist: thin dark outline on sprites, bright accent on B-40 troopers and bosses, soft ground ring under player; end-of-run screen as service-record card with ribbon rack
- Sound: master + music sliders, persistent mute, first-tap unlock (verify existing); danger cues (low-HP heartbeat, boss spawn, B-40 launch, "tank lost") with shared voice limit
- QA: pause button + tap-to-resume on phones (visibilitychange); low-effects toggle (particles, weather, decals)
LATER:
- Gamer: reroll/banish + evolutions balance pass (Spooky, Box Mission)
- Vet: real I Corps maps with blurbs
- Artist: full original art pass (portraits, intro, 5 map backdrops)
- Sound: full original soundtrack + per-map ambience
- QA: in-game performance readout + run log

## QA / debug commands (see README "Debug & QA switches")
- `DBG.bot=true` / `?bot` autopilot, `DBG.god`, `?t=N` start time, `DBG.fps=true` / `?fps` avg+min FPS readout (off by default), `dbgAirCd()`, `__ms.*` test handles, `tools/botrun.js --fb|--mission`, `tools/fbstress.js`.
- Ribbons: `DBG.grantRibbon(charId,id)`, `DBG.resetRibbons(charId|'all')`, `DBG.listRibbons()`.
- Open: Low effects toggle (tiers from Sound Helper), favicon is a data URI (no 404).


## Player highlight (requested by Blake, Oct 3, 2026 — do LATER, after the friends build is shared)
- Make the main player clearly stand out from allies (squad, patrol, Company Marines, engineers, Hueys' crew): e.g. a soft ground ring or bright outline/arrow under the player, slightly brighter sprite, and a name tag; keep allies dimmer (yellow armband already marks Company).
- Must stay cheap on phones: no extra per-frame gradients; cache the ring sprite; skip glow under Low effects (keep a simple ring).
- Optional toggle in settings; check it reads well on all 3 skin-tone variants and in the dark/night lighting.
