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
- **Officer OF- lines** (EP, back in rc8; jr/officer-of 2d15937):
  - OF-L01 "Corpsman up! Lieutenant's hit!"
  - OF-A01 "Get me air on that position!"
  - OF-A02 "Air's coming in. Get down!" (O-1 FAC, 20-30 s from call to impact)
  - OF-D01 "Check fire, check fire! Too close!"
  - OF-Q01 "Hold the fire mission! Doc's got men out there!"
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
- Zippo -> flamer / 'Lighter' (`git grep -i zippo` = 0; old saves are migrated)
- Triage "Marines & tank"; the special button title reads Space only
- FIREBASE BUILT · <name> SECURED; 'THE PAD'; "SIXTY MIKE-MIKE"
- squad2 skipper = Capt O'Malley (Golf Six), shown as a radio card only; Hollis keeps the Lt portrait
- New HUD hints:
  - 'MOVE INTO THE RING' (HOLD F outside the firebase ring)
  - 'G: SMOKE WHEN THE BIRD ASKS FOR IT'
  - MoH 'AREA CLEAR · <task>' after a hot phase; the label no longer flips to OPTIONAL

## Cut
- No line IDs were cut. Strings removed: "Dustoff", "Zippo", Huey medevac references.
- Not in rc8: the VFX rc8.1 flame patches (vfx/flame_rc81_patches/).
