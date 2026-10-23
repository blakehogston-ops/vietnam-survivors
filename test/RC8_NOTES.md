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

### FILL_IN_AUDIO: AI MUSIC - Jungle Dread score (rc8.1, Blake's pick Oct 21-22) - 10 files, ALL FILL-IN
Source: ElevenLabs Starter, /workspace/sound_pack/music_ai (README.md). Legal PASS under the Indie conditions, PENDING the Steam AI-music disclosure sentence. Code: assets/music_ai.js (slot aliases + selection + cues), tracks ai_* in audio/samples/manifest.js, files audio/music_ai/{ogg,m4a}. Gains lift ~-16 LUFS to ~-14 LUFS (old music level); music bus unchanged. Old score removed from the load list (files kept in audio/music/); ?music=old = debug opt-in back to it. Marines' Hymn (win) and the Valkyries opening are unchanged.

| Manifest key | File | Use | Status |
|---|---|---|---|
| ai_menu | audio/music_ai/jungle_dread_menu.{ogg,m4a} | menu + briefing loop | FILL-IN · AI MUSIC (Starter, Indie conditions, pending the Steam AI-music disclosure sentence) |
| ai_full | audio/music_ai/jungle_dread_full.{ogg,m4a} | exploration / pre-wave loop (alternates with river) | FILL-IN · AI MUSIC (Starter, Indie conditions, pending the Steam AI-music disclosure sentence) |
| ai_river | audio/music_ai/jungle_river.{ogg,m4a} | exploration / pre-wave loop #2 | FILL-IN · AI MUSIC (Starter, Indie conditions, pending the Steam AI-music disclosure sentence) |
| ai_combat | audio/music_ai/jungle_dread_combat.{ogg,m4a} | wave combat loop | FILL-IN · AI MUSIC (Starter, Indie conditions, pending the Steam AI-music disclosure sentence) |
| ai_final | audio/music_ai/jungle_final_wave.{ogg,m4a} | final wave = extraction (bird inbound / on the pad) loop | FILL-IN · AI MUSIC (Starter, Indie conditions, pending the Steam AI-music disclosure sentence) |
| ai_over | audio/music_ai/cue_game_over.{ogg,m4a} | game over, then ai_menu | FILL-IN · AI MUSIC (Starter, Indie conditions, pending the Steam AI-music disclosure sentence) |
| ai_cue_wave | audio/music_ai/cue_wave_start.{ogg,m4a} | wave start cue | FILL-IN · AI MUSIC (Starter, Indie conditions, pending the Steam AI-music disclosure sentence) |
| ai_cue_levelup | audio/music_ai/cue_level_up.{ogg,m4a} | level-up cue (cut to 1.9 s, ducks music -6 dB) | FILL-IN · AI MUSIC (Starter, Indie conditions, pending the Steam AI-music disclosure sentence) |
| ai_cue_landing | audio/music_ai/cue_extraction_landing.{ogg,m4a} | bird touchdown cue | FILL-IN · AI MUSIC (Starter, Indie conditions, pending the Steam AI-music disclosure sentence) |
| ai_credits | audio/music_ai/jungle_credits.{ogg,m4a} | once after the win Hymn / credits panel open | FILL-IN · AI MUSIC (Starter, Indie conditions, pending the Steam AI-music disclosure sentence) |

### FILL_IN_AUDIO: AI VO (rc8.1, Blake approved Oct 21) - 171 lines, ALL FILL-IN, PENDING LEGAL + Steam AI-content disclosure
Source: ElevenLabs Starter (paid), /workspace/sound_pack/vo_ai (HANDOFF_FOR_LEAD.md, FILL_IN_AUDIO_VO.md has voice ids + credits). Code: assets/vo_ai.js (table built by tools/build_vo_ai.py).
Files: audio/vo_ai/{ogg,m4a}/ (in-person, SamplePlayer.play) and audio/vo_ai/dry/{ogg,m4a}/ (radio, SamplePlayer.radioLine only; the baked-radio ogg/ takes are NOT shipped, so the radio FX is never doubled). Gain 1.0, special bus (RMS -24, -31 net).
Friends-build only (build tier): HO-K01, HO-K02 (Loc, Vietnamese, UNVERIFIED). A public/Steam build sets window.LCO_BUILD_TIER='public' (or ?tier=public; auto when the Steam client is running in the desktop host) and they are neither loaded nor played. ?vo=0 = all AI VO off.

| Line ID | File | Path | Tier | Status |
|---|---|---|---|---|
| brief2_01 | brief2_01 | play | all | FILL-IN · PENDING LEGAL |
| brief2_02 | brief2_02 | play | all | FILL-IN · PENDING LEGAL |
| brief2_03 | brief2_03 | play | all | FILL-IN · PENDING LEGAL |
| brief2_04 | brief2_04 | play | all | FILL-IN · PENDING LEGAL |
| ins2_01 | ins2_01 | play | all | FILL-IN · PENDING LEGAL |
| ins2_02 | ins2_02 | play | all | FILL-IN · PENDING LEGAL |
| LT-F01 | vo_lt_f01 | play | all | FILL-IN · PENDING LEGAL |
| LT-F02 | vo_lt_f02 | play | all | FILL-IN · PENDING LEGAL |
| LT-F03 | vo_lt_f03 | play | all | FILL-IN · PENDING LEGAL |
| LT-F04 | vo_lt_f04 | play | all | FILL-IN · PENDING LEGAL |
| LT-S01 | vo_lt_s01 | play | all | FILL-IN · PENDING LEGAL |
| LT-S02 | vo_lt_s02 | play | all | FILL-IN · PENDING LEGAL |
| LT-S03 | vo_lt_s03 | play | all | FILL-IN · PENDING LEGAL |
| LT-S04 | vo_lt_s04 | play | all | FILL-IN · PENDING LEGAL |
| LT-A01 | vo_lt_a01 | play | all | FILL-IN · PENDING LEGAL |
| LT-A02 | vo_lt_a02 | play | all | FILL-IN · PENDING LEGAL |
| LT-A03 | vo_lt_a03 | play | all | FILL-IN · PENDING LEGAL |
| LT-A04 | vo_lt_a04 | play | all | FILL-IN · PENDING LEGAL |
| LT-M01 | vo_lt_m01 | play | all | FILL-IN · PENDING LEGAL |
| LT-M02 | vo_lt_m02 | play | all | FILL-IN · PENDING LEGAL |
| LT-M03 | vo_lt_m03 | play | all | FILL-IN · PENDING LEGAL |
| LT-M04 | vo_lt_m04 | play | all | FILL-IN · PENDING LEGAL |
| LT-R01 | vo_lt_r01 | play | all | FILL-IN · PENDING LEGAL |
| LT-R02 | vo_lt_r02 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| LT-R03 | vo_lt_r03 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| LT-R04 | vo_lt_r04 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| LT-G01 | vo_lt_g01 | play | all | FILL-IN · PENDING LEGAL |
| LT-G02 | vo_lt_g02 | play | all | FILL-IN · PENDING LEGAL |
| LT-G03 | vo_lt_g03 | play | all | FILL-IN · PENDING LEGAL |
| LT-G04 | vo_lt_g04 | play | all | FILL-IN · PENDING LEGAL |
| LT-H01 | vo_lt_h01 | play | all | FILL-IN · PENDING LEGAL |
| HO-S01 | vo_ho_s01 | play | all | FILL-IN · PENDING LEGAL |
| HO-S02 | vo_ho_s02 | play | all | FILL-IN · PENDING LEGAL |
| HO-S03 | vo_ho_s03 | play | all | FILL-IN · PENDING LEGAL |
| HO-F01 | vo_ho_f01 | play | all | FILL-IN · PENDING LEGAL |
| HO-C01 | vo_ho_c01 | play | all | FILL-IN · PENDING LEGAL |
| HO-C02 | vo_ho_c02 | play | all | FILL-IN · PENDING LEGAL |
| HO-C03 | vo_ho_c03 | play | all | FILL-IN · PENDING LEGAL |
| HO-L01 | vo_ho_l01 | play | all | FILL-IN · PENDING LEGAL |
| HO-L02 | vo_ho_l02 | play | all | FILL-IN · PENDING LEGAL |
| HO-L03 | vo_ho_l03 | play | all | FILL-IN · PENDING LEGAL |
| HO-P01 | vo_ho_p01 | play | all | FILL-IN · PENDING LEGAL |
| HO-F02 | vo_ho_f02 | play | all | FILL-IN · PENDING LEGAL |
| HO-U01 | vo_ho_u01 | play | all | FILL-IN · PENDING LEGAL |
| HO-W01 | vo_ho_w01 | play | all | FILL-IN · PENDING LEGAL |
| HO-W02 | vo_ho_w02 | play | all | FILL-IN · PENDING LEGAL |
| HO-Z01 | vo_ho_z01 | play | all | FILL-IN · PENDING LEGAL |
| HO-Y01 | vo_ho_y01 | play | all | FILL-IN · PENDING LEGAL |
| HO-Y02 | vo_ho_y02 | play | all | FILL-IN · PENDING LEGAL |
| HO-X01 | vo_ho_x01 | play | all | FILL-IN · PENDING LEGAL |
| HO-T01 | vo_ho_t01 | play | all | FILL-IN · PENDING LEGAL |
| HO-T03 | vo_ho_t03 | play | all | FILL-IN · PENDING LEGAL |
| HO-T02 | vo_ho_t02 | play | all | FILL-IN · PENDING LEGAL |
| BK_RADIO_OUT | vo_bk_radio_out | play | all | FILL-IN · PENDING LEGAL |
| BK_RADIO_OUT-alt | vo_bk_radio_out_alt | play | all | FILL-IN · PENDING LEGAL |
| HO-M01 | vo_ho_m01 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| HO-M02 | vo_ho_m02 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| HO-K01 | vo_ho_k01 | play | FRIENDS ONLY | FILL-IN · PENDING LEGAL |
| HO-K02 | vo_ho_k02 | play | FRIENDS ONLY | FILL-IN · PENDING LEGAL |
| OF-L01 | vo_of_l01 | play | all | FILL-IN · PENDING LEGAL |
| OF-L02 | vo_of_l02 | play | all | FILL-IN · PENDING LEGAL |
| OF-L03 | vo_of_l03 | play | all | FILL-IN · PENDING LEGAL |
| OF-L04 | vo_of_l04 | play | all | FILL-IN · PENDING LEGAL |
| OF-M03 | vo_of_m03 | play | all | FILL-IN · PENDING LEGAL |
| OF-A01 | vo_of_a01 | play | all | FILL-IN · PENDING LEGAL |
| OF-A02 | vo_of_a02 | play | all | FILL-IN · PENDING LEGAL |
| OF-D01 | vo_of_d01 | play | all | FILL-IN · PENDING LEGAL |
| OF-Q01 | vo_of_q01 | play | all | FILL-IN · PENDING LEGAL |
| SK-B01 | vo_sk_b01 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| SK-F01 | vo_sk_f01 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| SK-F02 | vo_sk_f02 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| SK-E01 | vo_sk_e01 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| SK-E02 | vo_sk_e02 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| SK-E03 | vo_sk_e03 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| MV_CALL_1a | vo_mv_call_1a | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| MV_CALL_1b | vo_mv_call_1b | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| MV_CALL_1c | vo_mv_call_1c | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| FB_BUILT_1 | vo_fb_built_1 | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| DT_MAIL_A | vo_dt_mail_a | play | all | FILL-IN · PENDING LEGAL |
| DT_MAIL_B | vo_dt_mail_b | play | all | FILL-IN · PENDING LEGAL |
| DT_FOOD_A | vo_dt_food_a | play | all | FILL-IN · PENDING LEGAL |
| DT_FOOD_B | vo_dt_food_b | play | all | FILL-IN · PENDING LEGAL |
| DT_CARDS_A | vo_dt_cards_a | play | all | FILL-IN · PENDING LEGAL |
| DT_CARDS_B | vo_dt_cards_b | play | all | FILL-IN · PENDING LEGAL |
| DT_WEATHER_1 | vo_dt_weather_1 | play | all | FILL-IN · PENDING LEGAL |
| DT_HEAT_1 | vo_dt_heat_1 | play | all | FILL-IN · PENDING LEGAL |
| DT_SLEEP_1 | vo_dt_sleep_1 | play | all | FILL-IN · PENDING LEGAL |
| DT_SHORT_1 | vo_dt_short_1 | play | all | FILL-IN · PENDING LEGAL |
| DT_MUSIC_1 | vo_dt_music_1 | play | all | FILL-IN · PENDING LEGAL |
| DT_HOME_1 | vo_dt_home_1 | play | all | FILL-IN · PENDING LEGAL |
| DT_HOME_2 | vo_dt_home_2 | play | all | FILL-IN · PENDING LEGAL |
| DT_DOC_1 | vo_dt_doc_1 | play | all | FILL-IN · PENDING LEGAL |
| DT_LOST_1 | vo_dt_lost_1 | play | all | FILL-IN · PENDING LEGAL |
| DT_ALERT_1 | vo_dt_alert_1 | play | all | FILL-IN · PENDING LEGAL |
| CR_PICKUP_1 | vo_cr_pickup_1 | play | all | FILL-IN · PENDING LEGAL |
| CR_PICKUP_2 | vo_cr_pickup_2 | play | all | FILL-IN · PENDING LEGAL |
| CR_ARRIVE_1 | vo_cr_arrive_1 | play | all | FILL-IN · PENDING LEGAL |
| CR_WOUNDED_1 | vo_cr_wounded_1 | play | all | FILL-IN · PENDING LEGAL |
| CR_WOUNDED_2 | vo_cr_wounded_2 | play | all | FILL-IN · PENDING LEGAL |
| MV_INBOUND_1 | vo_mv_inbound_1 | play | all | FILL-IN · PENDING LEGAL |
| MV_LOAD_1 | vo_mv_load_1 | play | all | FILL-IN · PENDING LEGAL |
| MV_LIFT_1 | vo_mv_lift_1 | play | all | FILL-IN · PENDING LEGAL |
| G00 | vo_gunny_smoke_out | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| G01-V | vo_gunny_roger_violet | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| G01-Y | vo_gunny_roger_yellow | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| G01-G | vo_gunny_roger_green | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| G04 | vo_gunny_pullback | play | all | FILL-IN · PENDING LEGAL |
| G05 | vo_gunny_hotlz | play | all | FILL-IN · PENDING LEGAL |
| G06 | vo_gunny_bird_deck | play | all | FILL-IN · PENDING LEGAL |
| G07 | vo_gunny_ten_seconds | play | all | FILL-IN · PENDING LEGAL |
| G08 | vo_gunny_get_on_pad | play | all | FILL-IN · PENDING LEGAL |
| G09 | vo_gunny_five_mikes | play | all | FILL-IN · PENDING LEGAL |
| G10 | vo_gunny_cmdr_smoke | play | all | FILL-IN · PENDING LEGAL |
| G11 | vo_gunny_mirror | play | all | FILL-IN · PENDING LEGAL |
| G12 | vo_gunny_pad_marked | play | all | FILL-IN · PENDING LEGAL |
| G14 | vo_gunny_zis3 | play | all | FILL-IN · PENDING LEGAL |
| G15 | vo_gunny_lull_1 | play | all | FILL-IN · PENDING LEGAL |
| G16 | vo_gunny_lull_2 | play | all | FILL-IN · PENDING LEGAL |
| G17 | vo_gunny_lull_3 | play | all | FILL-IN · PENDING LEGAL |
| G18 | vo_gunny_lull_4 | play | all | FILL-IN · PENDING LEGAL |
| G20 | vo_gunny_nva_officer | play | all | FILL-IN · PENDING LEGAL |
| G21a | vo_gunny_firebase_marked | play | all | FILL-IN · PENDING LEGAL |
| G22-east | vo_gunny_pad_dir_east | play | all | FILL-IN · PENDING LEGAL |
| G22-southeast | vo_gunny_pad_dir_southeast | play | all | FILL-IN · PENDING LEGAL |
| G22-south | vo_gunny_pad_dir_south | play | all | FILL-IN · PENDING LEGAL |
| G22-southwest | vo_gunny_pad_dir_southwest | play | all | FILL-IN · PENDING LEGAL |
| G22-west | vo_gunny_pad_dir_west | play | all | FILL-IN · PENDING LEGAL |
| G22-northwest | vo_gunny_pad_dir_northwest | play | all | FILL-IN · PENDING LEGAL |
| G22-north | vo_gunny_pad_dir_north | play | all | FILL-IN · PENDING LEGAL |
| G22-northeast | vo_gunny_pad_dir_northeast | play | all | FILL-IN · PENDING LEGAL |
| G22-10 | vo_gunny_pad_dist_10 | play | all | FILL-IN · PENDING LEGAL |
| G22-20 | vo_gunny_pad_dist_20 | play | all | FILL-IN · PENDING LEGAL |
| G22-30 | vo_gunny_pad_dist_30 | play | all | FILL-IN · PENDING LEGAL |
| G22-40 | vo_gunny_pad_dist_40 | play | all | FILL-IN · PENDING LEGAL |
| G22-50 | vo_gunny_pad_dist_50 | play | all | FILL-IN · PENDING LEGAL |
| G22-60 | vo_gunny_pad_dist_60 | play | all | FILL-IN · PENDING LEGAL |
| G23 | vo_gunny_bird_auto | play | all | FILL-IN · PENDING LEGAL |
| G24 | vo_gunny_bird_called | play | all | FILL-IN · PENDING LEGAL |
| N01 | vo_bark_nva_01 | play | all | FILL-IN · PENDING LEGAL |
| N02 | vo_bark_nva_02 | play | all | FILL-IN · PENDING LEGAL |
| N03 | vo_bark_nva_03 | play | all | FILL-IN · PENDING LEGAL |
| N04 | vo_bark_nva_04 | play | all | FILL-IN · PENDING LEGAL |
| N05 | vo_bark_nva_05 | play | all | FILL-IN · PENDING LEGAL |
| N06 | vo_bark_nva_06 | play | all | FILL-IN · PENDING LEGAL |
| N07 | vo_bark_nva_07 | play | all | FILL-IN · PENDING LEGAL |
| N08 | vo_bark_nva_08 | play | all | FILL-IN · PENDING LEGAL |
| D01 | vo_doc_smoke_out | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| D02 | vo_doc_roger_violet | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| D03 | vo_doc_roger_yellow | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| D04 | vo_doc_roger_green | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| D05 | vo_doc_negative_smoke | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| D06 | vo_doc_mirror | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| D07 | vo_doc_flare | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| D09 | vo_doc_roger_out | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| D08 | vo_doc_say_again | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| R01 | vo_fac_mark | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| R02 | vo_rto_clearedhot | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P17-V | vo_pilot_see_violet_over | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P17-Y | vo_pilot_see_yellow_over | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P17-G | vo_pilot_see_green_over | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P04 | vo_pilot_inbound | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P05 | vo_pilot_inhot | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P06 | vo_pilot_winchester | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P07 | vo_pilot_wilco_setdown | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P13 | vo_pilot_short_final | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P14 | vo_pilot_waveoff_hot | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P15 | vo_pilot_taking_fire | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P16 | vo_pilot_one_smoke | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P09 | vo_pilot_wilco_holding | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P10 | vo_spooky_inhot | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
| P11 | vo_spooky_winchester | dry/ radioLine | all | FILL-IN · PENDING LEGAL |
