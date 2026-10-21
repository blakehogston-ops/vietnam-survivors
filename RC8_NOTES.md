# RC8 notes (feature/next, base rc7.1 5803d99)

Every line ID that rc8 adds, changes or cuts compared with rc7.1. All of these are captions only; no new VO was recorded for rc8.

## Added: officer / radio line IDs (OFFVO)
- **Lt Hollis (LT-)**: LT-A01 LT-A02 LT-A03, LT-F01 LT-F02 LT-F03 LT-F04, LT-H01, LT-R03 LT-R04, LT-S01 LT-S03 LT-S04
- **Hollis squad / HO-**: HO-C01 HO-C02 HO-C03, HO-F01 HO-F02, HO-L01 HO-L02 HO-L03, HO-M01 "Shot, over!" HO-M02 "Splash!", HO-P01, HO-S01 HO-S03, HO-T01 HO-T02 HO-T03, HO-W01 "Out of LAWs!" HO-W02, HO-X01, HO-Y01 "Sparks is down! Somebody get on the hook!" HO-Y02
- **Capt O'Malley, Golf Six (SK-), radio only** (skipper_radio_rc8.md):
  - SK-F01: firebase call
  - SK-F02: fire mission approved
  - SK-E01: bird inbound
  - SK-E02: bird has your smoke
  - SK-E03: Lt down, "whoever's on this handset"
- **Officer OF- lines** (EP, back in rc8; jr/officer-of f3fb2df, merged 3a16b92):
  - OF-L01 "Corpsman up! Lieutenant's hit!"
  - OF-A01 "Get me air on that position!"
  - OF-A02 "Air's coming in. Get down!" (O-1 FAC, 20-30 s from call to impact)
  - OF-D01 "Check fire, check fire! Too close!"
  - OF-Q01 "Hold the fire mission! Doc's got men out there!" (narrowed, f3fb2df: Doc's air call is never overridden; friendlies or wounded inside NAP_SAFE hold the strike, which resumes automatically)
- **Radio sequence order**:
  - Fire mission: LT-R03 -> SK-F02 -> LT-R04
  - Firebase: SK-F01, then LT-R04 at +4.6 s if the Lt is alive
  - Bird call: SK-E01, or SK-E03 if the Lt is down

## Added: amtracs (Lead Playtester run 2)
- AMT_UP_1 (caption only, speaker AMTRAC): "Golf Two-Six, amtracs up. Hauling wire and ammo to the line, over."
- Job labels over each amtrac: WIRE + AMMO / 105 SUPPORT (first 14 s), then CASEVAC / TO THE BREACH / PATROL

## Added: smoke-call captions (inline comment IDs)
- D01 "Bird, Doc. Smoke out. Over." / G00 "Smoke's out."
- P17 `BIRD: "I see <colour>, over."`
- D02-D04 "Bird, Doc. Roger <colour>. Over." / G01 "Roger <colour>. Bring it in." -> SK-E02
- P04 and P13 are unchanged from rc7.1.

## Added: LINES keys
- FB_BUILT_1
- Medevac: MV_CALL_1 MV_CALL_1a MV_CALL_1b MV_CALL_1c MV_INBOUND_1 MV_LOAD_1 MV_LIFT_1
- Casualty radio: CR_ARRIVE_1 CR_PICKUP_1 CR_PICKUP_2 CR_WOUNDED_1 CR_WOUNDED_2
- Downtime: DT_ALERT_1 DT_DOC_1 DT_HEAT_1 DT_HOME_1 DT_HOME_2 DT_LOST_1 DT_MUSIC_1 DT_SHORT_1 DT_SLEEP_1 DT_WEATHER_1

## Changed strings (Vet batch 3 / proofread / AD)
- Banner: 'RECON INBOUND: 3RD RECON BN BY PBR · SOG BY H-34'
- "3rd Reconnaissance Battalion"; WP marking rocket (replaces the red smoke marker on the fire mission); "CH-46 waiting"; "Nobody on the radio!"
- "Dustoff" -> "Emergency Medevac" (game, README, DESIGN_QUANG_TRI, POLISH_BACKLOG). Huey medevac art cut; CH-46 only.
- Old flamer character name -> flamer / 'Lighter' (tree-wide grep for the old name = 0; old saves are migrated)
- Triage "Marines & tank"; the special button title reads Space only
- FIREBASE BUILT · <name> SECURED; 'THE PAD'; "SIXTY MIKE-MIKE"
- squad2 skipper = Capt O'Malley (Golf Six), shown as a radio card only; Hollis keeps the Lt portrait
- New HUD hints:
  - 'MOVE INTO THE RING' (HOLD F outside the firebase ring)
  - 'G: SMOKE WHEN THE BIRD ASKS FOR IT'
  - MoH 'AREA CLEAR · <task>' after a hot phase; the label no longer flips to OPTIONAL

## Cut
- No line IDs were cut. Strings removed: "Dustoff", the old flamer name, Huey medevac references.
- Not in rc8: the VFX rc8.1 flame patches (vfx/flame_rc81_patches/).

## Audio rc8a (jr/audio-rc8): new sourced clips (all cleared)
Per Lead (MERGE_NOTE_RC8_SOURCING_OCT20 rev 2). Files were recopied fresh from sound_pack/samples on 2026-10-20. Gating: `AUD_OK` in `index.html` (a per-clip kill switch, all true).
- **o1_birddog_flyby, lvtp5_engine_loop, firebase_amb_loop:** Legal PASS and Audio Director PASS (2026-10-20). **On by default, no pending flag.** Audio Director's sound_pack note says the checks were done by spectrogram analysis and nobody has listened by ear yet, so give them one listen before the rc8b freeze.
  - **o1_birddog_flyby** (Bird Dog FAC pass; stand-in, unidentified single-engine piston light plane): specials bus (`MIX.SPECIAL`), **not** in `MIX.DUCKERS`.
    - Coupling: jr/officer-of (f3fb2df) has no audio hook. `AUDP.birdDog(A)` is the hook the officer code can call about 9 s before the WP marking rocket. Until it does, `AUDP.tick()` polls `OFFI.air` / `OFFI.fac` (`air.T`, `air.mk`, `air.st`) and starts the pass once per strike when impact is ≤ 22.5 s out (the rocket fires at ≤ 13.5 s). If those fields are renamed, update AUDP.
  - **lvtp5_engine_loop:** an amtrac engine loop, edited from a modern AAV-7 recording. It is **not** an LVTP-5 recording, and nothing (comments, notes, credits, strings) may call it one. One handle plays while any amtrac is alive. Its level falls off with distance to the nearest live vehicle (0 at 1100 px), through its own fader into `MIX.AMB`.
  - **firebase_amb_loop:** a night rainforest bed (Guatemala; region stand-in), rev 2 cut. It replaces `jungle_loop` in `MIX.AMB`, starts at FIREBASE BUILT (`fbS.state==='done'`), and replaces the synth Calm layer (Calm is gated off under `SAMP.on`).
- **tokay_gecko_1..3:** Legal cleared it 2026-10-20 and it's **on by default**.
  - It rides `MIX.AMB` and plays at most one call every 60-120 s (Math.random, never the game RNG).
  - It plays only at a built firebase, at night (hour ≥ 19) or during calm. It never plays during contact (no enemies within FBS+260 px of the firebase) or extraction (`ex.ph>=4`).
- **Every rc8 audio clip is now cleared.** Nothing is left pending, so the `AUD_PENDING` flag has been removed. `AUD_OK` stays as a per-clip kill switch, and all its entries are true.
- Bus offsets are unchanged.

## rc8.1 (branch rc8.1, off 622cade) — no new VO line IDs
- FX81 (`?fx81=0` disables): (A) CH-46 rotor wash dust/grass + smoke bend (ph4 descent → lift), touchdown shake 3.5, staggered boarding (0.28 s/Marine), door-gun M60 tracers now red (US M62, Vet). (B) VFX flame_rc81 patches applied (explosions/vehicles/tanks_v2/amtrac_support + index fires/fireball merged with FGLOW); hut_destroy/impact_feel/vehicle_hits patches target files not in this tree → not applied. F-4B low pass (alt 26 + ground shadow) with jet swell; napalm rolling wall, fireball + heat shimmer, smoke column, shockwave ring + debris; FX81 pool capped 40/90/150 (LOW/MED-or-strike/HIGH).
- (C) Firebase life between waves (no hostiles within FBS+260, not in extraction): idle props (sandbag, ammo can, RTO whip); night 81mm illum flare + outgoing H&I thump every 28–52 s; day radio chatter (existing cleared Snd clips only).
- Blake: idle Marines repair damaged built structures (wall, sandbags, bunkers, guns) at 40% of engineer rate (16 hp/s → 6.4 hp/s), max 3 Marines, stops the moment a wave reaches the wire. Repair swing animation + green progress bar over the structure. Log: FX81.log.rep.
- Fixes: firebase arrow turn-limited (≤0.12 rad/frame) + never re-sites behind Doc; HOLD F ring margin +8 px, layout-independent F (e.key), slower decay inside ring; `?nobrief` skips brief2; FIREBASE BUILT (held banner) preempts and is never dropped/expired from the banner queue.

## FLAG_DEFAULTS (rc8.1 re-freeze, flag rule: finished features ON by default, =0 turns off)
| flag | default now | why |
|---|---|---|
| impnapalm | ON (?impnapalm=0 off) | finished VFX_IMPACT napalm (canister, rolling fireball, teardrop scorch, flame sheet); FX81 skips its own rolling wall + fireball when it is on (no double draw) |
| impm40 | ON (?impm40=0 off) | finished M40 SHAKE/KICK recoil |
| implat | ON (unchanged) | already default |
| jungle | ON desktop (unchanged) | Lead ruling rc8; off on touch/LOW |
| terrain | ON (?terrain=0 off) | terrain v2 (48 px MAP_TERRAIN2 ground); EP flag ruling |
| tts | kept OFF | browser robot voice; captions + recordings are the design |
| jstrike | kept OFF | option NOT approved (jungle LOD during strikes) |
| fglow | kept OFF | measured ~5 ms slower in software raster; re-test on real GPU |
| bglow | ON (?bglow=0 off) | warm blast glow, LOW quality only; EP flag ruling |
| smksheet | kept OFF | AD rc8: sheet smoke reads cartoony |
| napalm rev 2 | kept OFF | EP/perf ruling (option D) |
| lowfx | auto (unchanged) | on for touch devices only |
| decoy, capture, napsafe, botfb, padmel, t, nobrief, nointro, nodemo, autostart, bot, god, give, win, loss, unlockall, demo, public, meter, fps, all, brief, combat, reinforcements, menu_intro, intro_riff, moht/mohd | opt-in | QA / debug / harness / test-only |

## QUALITY TIERS (rc8.1, EP: target a high-end PC; Settings > QUALITY LOW/MED/HIGH, saved in localStorage lco_quality; ?q= forces)
- HIGH: every finished visual on: terrain v2, full jungle (LOD 0), impact napalm + FX81 napalm, full flame caps, full atmosphere. No strike-time drop (rc8 perf A+B strike mix now opt-in via ?smix=1).
- MED: terrain v2, light jungle LOD, impact napalm, MED flame/atmosphere caps (LQT.med particle cap).
- LOW: terrain v2, light jungle LOD (off on touch/mobile), impact napalm, LOW flame caps, warm blast glow (bglow), lowest particle cap.
- Kept off on every tier: fglow, jstrike, smksheet, tts, napalm rev 2.
- Perf gate: perf-regress +10% on MED and LOW; HIGH reported only.

## rc8.1 UI scaling + first-run card
- DOM UI (HUD, banners, menus) scaled by CSS zoom max(1, innerHeight/1080) (--uis); canvas world zoom + canvas HUD scale with height above 1080 px, so 1440p/4K show the 1080p view. 1280x800, 1080p, 2560x1080 unchanged. Proof: /workspace/proof/rc81/scale/.
- First-run "Move with WASD" card opens at insertion (intro/early play), never over the main menu.
- settings_skin toggle(): `if(!inp) return;` (QUALITY row is a <select>).

## FILL_IN_AUDIO (rc8.1, Blake ruling Oct 20: uncleared audio stays in test/friends builds as fill-in)
| Manifest key | Files | Source | Licence status |
|---|---|---|---|
| rto_down_sting | audio/samples/{ogg,m4a}/rto_down_sting_1.* | VSCO 2 CE low brass D minor (CC0) + pdsounds static cut + LukaCafuka key/release (existing sound_pack file, not recreated) | OPEN - Legal check before Steam |
| radio_static_bed_loop | audio/samples/{ogg,m4a}/radio_static_bed_loop_1.* | pdsounds STE-011 hiss bed, 6.0 s loop (existing sound_pack file, not recreated) | OPEN - broadcast-bleed ear check + Legal check before Steam |
Levels unchanged: sample_player gains 0.213 (sting) / 0.316 (radio bed).
