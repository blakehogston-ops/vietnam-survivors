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
- **Character select** with 9 service records, between-run progression, per-character abilities and a patrol squad; cargo-bay intro and launch briefing cutscene.
- **Firebase system** (LZ radio, engineers, tiers, waves, sappers), NVA armor (PT-76 / T-54), B-40 and RPG-7 troopers, Hanoi Hannah radio event, Vietnamese/English shouts with an on-screen pixel font.
- **Balance:** level-up rerolls and banishes, new passives (Radio Discipline, Field Manual, C-4 Demolition Kit, Dustoff), evolutions (AC-47 Spooky, Arc Light Box Mission), boss supply crates, softened enemy HP scaling. `tools/botrun.js` is a headless Playwright bot that plays a run in seconds and prints survival, DPS, boss time-to-kill and tank lifespan per minute (`node tools/botrun.js --minutes 5,10,15 --runs 3`).
- **Weapon-specific deaths:** every kill reacts to what killed it (thud, wet impact, blast launch, burn to charred, Claymore snap, track crush, punji impale) with capped, oldest-first-fading stamped corpses and decals; mass kills fall back to a cheap path. Agent Orange wilts the foliage and leaves bare ground.
- **Mobile:** safe-area aware HUD, 44px+ tap targets, stacked level-up cards in portrait, scrollable menus, zoom and pull-to-refresh blocked, orientation handling.
- Historical fixes: M50A1 Ontos, UH-1E/CH-46 Marine insertion, A-4E/F-4B/A-6A strafing runs.
