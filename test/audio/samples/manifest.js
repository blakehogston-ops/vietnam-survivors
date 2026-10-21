/*
 * Sample manifest for sample_player.js. base + <format>/<name>.<format>, e.g. samples/ogg/m16_single_1.ogg.
 * batch 1 = first batch (budget 1.5 MB, loaded right after the menu); batch 2 = loads after batch 1.
 * files = primary clips (random variant per play, no immediate repeat).
 * alt   = fallback clips, fetched ONLY if every primary file of that slot fails to load (no extra download otherwise).
 * disabled = slot is NOT loaded by load() unless load(manifest, { includeDisabled: true }). No slot is disabled since the
 *   2026-10-14 map build (bugle, tandem rotor and the river batch 3 are all on).
 * batch 3 = map build (PBR engine + river bed): loads after batch 2 with a plain load(SAMPLE_MANIFEST).
 * music = the music slots (menu, menu_asian, intro_riff, briefing, combat, extraction, win, loss, reinforcements): loaded with
 *   SamplePlayer.loadMusic(SAMPLE_MANIFEST) after the sample batches; NOT part of the 1.5 MB first batch.
 * cues = timing contract for the warning cues (lead times, clip lengths); see README "Warning cues".
 * Empty "files" = no file yet. Weapons with no file stay SILENT (no synth fallback).
 * NOT CLEARED: every file must be cleared by Copyright and IP Auditor before it ships (LICENSES.md has source,
 * licence and attribution per file; audit: ../LICENSE_AUDIT.md). Nobody has listened to these clips yet.
 */
(function (root) {
  var SAMPLE_MANIFEST = {
    base: 'samples/',
    formats: ['ogg', 'm4a'],
    slots: {
      // group: mix-bus group (player / squad / enemy / specials / foley / radio / ambience), see README 'Mix-bus groups'; non-weapon slots have none
      // M16 = FFSL AR-15 (CC0; the areniporgen M16A1 failed the licence audit and was removed). near = primary, mid = alt.
      m16_single:         { group: 'player', batch: 1, files: ['m16_ar15_near_1', 'm16_ar15_near_2'], alt: ['m16_ar15_mid_1', 'm16_ar15_mid_2'] },
      m16_burst:          { group: 'player', batch: 1, files: ['m16_burst_1', 'm16_burst_2'] },   // 3 / 5 rounds spliced from the FFSL AR-15 shots;
                                                                                // play(..., {rounds}) re-triggers m16_single instead
      m60_burst:          { group: 'squad', batch: 1, files: ['m60_burst_1', 'm60_burst_2'] },   // FranklinRook1984 (CC0) - provenance: Legal
      // enemy rifles: Free Firearm Sound Library (CC0). ak47_burst play(..., {rounds}) re-triggers ak47 singles.
      ak47:               { group: 'enemy', batch: 1, files: ['ak47_single_1', 'ak47_single_2', 'ak47_single_3'] },
      ak47_burst:         { group: 'enemy', batch: 1, files: ['ak47_burst_1', 'ak47_burst_2', 'ak47_burst_3', 'ak47_burst_4'] },  // 3,3,5,5 rounds
      sks:                { group: 'enemy', batch: 1, files: ['sks_single_1', 'sks_single_2', 'sks_single_3', 'sks_single_4'] },
      rpd_burst:          { group: 'enemy', batch: 1, files: ['rpd_burst_1', 'rpd_burst_2'] },     // STAND-IN: FFSL AK-47, edited (CC0): 6 / 8 rounds, ~730 rpm, -1.5 st, distance
      // M79: launch = LeMudCrab M203/M320 STAND-IN (CC0); alt vabadus M203 / barryshamir (CC0). impact = Kostrava (CC0), edited
      m79_launch:         { group: 'player', batch: 1, files: ['m79_launch_1'], alt: ['m79_launch_alt_vabadus', 'm79_launch_alt_barryshamir'] },
      m79_impact:         { group: 'specials', batch: 1, files: ['m79_impact_1'] },
      // klangfabrik RPG (CC0) - B-40 STAND-IN. Defaults = short bang + tail (0.56 / 0.66 s, no whoosh); alt = 2.6 s bang + whoosh
      b40_launch:         { group: 'enemy', batch: 1, files: ['b40_launch_1', 'b40_launch_2'], alt: ['b40_launch_long_1', 'b40_launch_long_2'] },
      // standard charge warning (chargeWarning()): joedeshon (CC BY 4.0, credit); alt bigal13 / designerschoice (CC BY 4.0)
      whistle:            { batch: 1, files: ['whistle_1'], alt: ['whistle_alt_police', 'whistle_alt_pea_distant'] },
      // rare big-night-assault cue only: felix.blume Veracruz military-band bugler (CC0), rising C#5-E5 call, 4.0 s (not Taps-like).
      // ON for the map build (Blake: fine as a placeholder, 2026-10-14). 40.38-44.38 s of freesound #410877. Still wants an ear check.
      // (The Spanish cavalry call, Boscoricardo17, is rejected and no longer built.)
      bugle:              { batch: 1, files: ['bugle_felixblume_1'] },
      mortar_launch:      { group: 'specials', batch: 1, files: ['mortar_launch_1', 'mortar_launch_2', 'mortar_launch_3'] },  // greenbastardd 81 mm (CC0, own recording)
      mortar_impact:      { group: 'specials', batch: 1, files: ['mortar_impact_1', 'mortar_impact_2'] },  // Kostrava (CC0), 2 blasts not used by bomb_distant
      mortar_incoming:    { group: 'specials', batch: 1, files: ['mortar_incoming_1'] },             // Zagge28 (CC0)
      bomb_distant:       { group: 'specials', batch: 1, files: ['bomb_distant_2', 'bomb_distant_3', 'bomb_distant_4', 'bomb_distant_1'] },
                                                                                // 2-4 Kostrava (CC0); 1 Baradari (CC-BY 3.0, credit)
      radio_squelch:      { batch: 1, files: ['radio_squelch_1', 'radio_squelch_2', 'radio_squelch_3'] },  // pdsounds PD + JovianSounds CC0
      huey_rotor_loop:    { batch: 1, files: ['huey_rotor_loop_1'], alt: ['huey_rotor_loop_rmutt'] },      // OroborosNZ CC-BY 4.0 (credit); alt Rmutt CC0
      // turret build clunks (batch 1, build phase): FreqMan sandbag (CC BY 4.0) + hotdogtornados ammo box (CC0) / FartBiscuit1700 clink (CC BY 3.0)
      turret_corner_build: { batch: 1, files: ['turret_corner_build_1'] },
      turret_mid_build:   { batch: 1, files: ['turret_mid_build_1'] },
      huey_flyby:         { group: 'specials', batch: 2, files: ['huey_flyby_1', 'huey_flyby_2'] },  // 1 OroborosNZ (credit), 2 Rmutt CC0
      // turret gunfire: turretFire('corner') = .50 cal STAND-IN, klangfabrik "50 CAL Machine Gun" (CC0; M2 not confirmed), 5- and
      // 7-round bursts. Moved out of the pending river batch (batch 3) into batch 2 for the base turrets; still the PBR gun later.
      pbr_50cal_burst:    { group: 'squad', batch: 2, files: ['pbr_50cal_burst_1', 'pbr_50cal_burst_2'] },
      // aircraft (Blake approved 2026-10-07), batch 2. All CC BY 3.0 (credit) except the tandem rotor (CC0).
      jet_flyby:          { group: 'specials', batch: 2, files: ['jet_flyby_1'] },            // kleanthism F-4/F-5 STAND-IN low pass (5 s)
      skyraider_flyby:    { group: 'specials', batch: 2, files: ['skyraider_flyby_1'] },      // Fight2FlyPhoto A-1H Skyraider (+ P-47D) pass (4.5 s)
      ranch_hand_flyover: { group: 'specials', batch: 2, files: ['ranch_hand_flyover_1'] },   // gezortenplotz C-130 STAND-IN for the C-123 (7 s)
      tandem_rotor_flyby: { group: 'specials', batch: 2, files: ['tandem_rotor_flyby_1'] },   // surrey_film Chinook STAND-IN for a CH-46 (CC0); ON for the map build
      flamethrower_loop:  { group: 'specials', batch: 2, files: ['flamethrower_loop_1'], alt: ['flamethrower_torch_loop'] },   // AslakHostaker CC0; alt torch PD
      flamethrower_burst: { group: 'specials', batch: 2, files: ['flamethrower_burst_1', 'flamethrower_burst_2'], alt: ['flamethrower_torch_burst'] },
      step_mud:           { batch: 2, files: ['step_mud_1', 'step_mud_2', 'step_mud_3', 'step_mud_4'],      // Nox_Sound mud CC0
                            alt: ['step_mud_grass_1', 'step_mud_grass_2', 'step_mud_grass_3'] },
      step_boards:        { batch: 2, files: ['step_boards_1', 'step_boards_2', 'step_boards_3'] },         // congusbongus/swuing CC-BY
      step_water:         { batch: 2, files: ['step_water_1', 'step_water_2', 'step_water_3', 'step_water_4'], // j1987 CC0
                            alt: ['step_water_cb_1', 'step_water_cb_2', 'step_water_cb_3'] },
      step_deck:          { batch: 2, files: ['step_deck_1', 'step_deck_2', 'step_deck_3'],                 // Eelke via congusbongus CC-BY
                            alt: ['step_deck_conleec_1', 'step_deck_conleec_2', 'step_deck_conleec_3'] },  // conleec CC0 (stairwell)
      // ---- weapons + explosions, week of 2026-10-14 (build_weapons_oct14.py; LICENSES.md section 1h). Real recordings only,
      //      no synth fallback. All guns share the 6-gunshot cap. NOT CLEARED yet (auditor + ear check).
      // bolt rifle (Country's M40 / Springfield): gezortenplotz Remington 700 .308 (CC BY 3.0, credit); alt bolt AugustSandberg Mauser (CC0)
      bolt_rifle_shot:    { group: 'player', batch: 1, files: ['bolt_rifle_shot_1', 'bolt_rifle_shot_2'] },
      bolt_rifle_bolt:    { group: 'foley', batch: 1, files: ['bolt_rifle_bolt_1'], alt: ['bolt_rifle_bolt_alt_mauser'] },
      // shotgun (Ithaca 37 STAND-IN): AnthonyChan0 Mossberg 500 shot + pump (CC0)
      shotgun_shot:       { group: 'player', batch: 1, files: ['shotgun_shot_1', 'shotgun_shot_2'] },
      shotgun_rack:       { group: 'player', batch: 1, files: ['shotgun_rack_1'] },
      // Doc's smoke canister pop: vckhaze smoke bomb (CC0) + a short real gas-fire hiss (SGAK, CC0)
      smoke_pop:          { group: 'specials', batch: 1, files: ['smoke_pop_1'] },
      // knife throw (game key knives -> knife_throw), Legal PASS: kylepyke knife into wood (CC0); 2/3 add a pitched-up
      // Sophia_C longsword swish (CC BY 4.0, credit Sophia O. Caldwell); alt Gingie (CC0)
      knife_throw:        { group: 'player', batch: 1, files: ['knife_throw_1', 'knife_throw_2', 'knife_throw_3'], alt: ['knife_throw_alt_gingie'] },
      // ---- Blake's new features 2026-10-14 evening (build_blake_oct14.py). Batch 2: none is needed at start.
      car15_single:       { group: 'player', batch: 2, files: ['car15_single_1', 'car15_single_2'] },         // FFSL AR-15 (CC0) edited
      car15_burst:        { group: 'player', batch: 2, files: ['car15_burst_1', 'car15_burst_2'] },           // 3 / 5 rounds, 75 ms beat
      m79_sawed:          { group: 'player', batch: 2, files: ['m79_sawed_1'] },                               // LeMudCrab (CC0) edited
      smg_m45_burst:      { group: 'player', batch: 2, files: ['smg_m45_burst_1', 'smg_m45_burst_2'], alt: ['smg_m45_burst_alt_mp5_1', 'smg_m45_burst_alt_mp5_2'] },  // poissonmort Sten (CC BY 4.0, PENDING LEGAL); alt Franki-01234 MP5 (CC0, PENDING LEGAL)
      pistol22_suppressed:{ group: 'player', batch: 2, files: ['pistol22_suppressed_1', 'pistol22_suppressed_2', 'pistol22_suppressed_3'] },  // STAND-IN; Geoff-Bremner-Audio .22LR (CC BY 4.0, PENDING LEGAL)
      bunker_enter:       { group: 'foley', batch: 2, files: ['bunker_enter_1'] },      // FreqMan / hotdogtornados / FartBiscuit1700 / Nox_Sound + dynamique rattle (PENDING LEGAL)
      bunker_exit:        { group: 'foley', batch: 2, files: ['bunker_exit_1'] },
      pbr_runup:          { group: 'specials', batch: 2, files: ['pbr_runup_1'] },      // STAND-IN Jacuzzi water-jet: byjoshberry diesel + wjauch jet-ski (CC0, PENDING LEGAL)
      pbr_beach:          { group: 'specials', batch: 2, files: ['pbr_beach_1'] },      // diesel + NickTayloe river wash
      pbr_depart:         { group: 'specials', batch: 2, files: ['pbr_depart_1'] },     // diesel + jet-ski + river
      h34_flyby:          { group: 'specials', batch: 2, files: ['h34_flyby_1'] },      // STAND-IN H-34: Fight2FlyPhoto radial + OroborosNZ Huey chop slowed 2 st
      h34_land:           { group: 'specials', batch: 2, files: ['h34_land_1'] },
      h34_liftoff:        { group: 'specials', batch: 2, files: ['h34_liftoff_1'] },
      h34_hover_loop:     { group: 'specials', batch: 2, files: ['h34_hover_loop_1'] },
      radio_cff:          { group: 'radio', batch: 2, files: ['radio_cff_1'] },         // LukaCafuka (CC0, PENDING LEGAL) + pdsounds + JovianSounds, no voices
      // 2026-10-14 night: missing / placeholder sounds (build_missing_oct14.py). New 'ui' group -40 and 'hit' group -41.5 (subtle under the guns; hits fire on every bullet), 'sting' group -30.
      m3a1_burst:         { group: 'player', batch: 2, files: ['m3a1_burst_1', 'm3a1_burst_2', 'm3a1_burst_3'] },   // CLOSE STAND-IN M3A1 Grease Gun: real Sten rounds pitched -2 st, ~450 rpm. PENDING LEGAL
      m14_shot:           { group: 'squad', batch: 2, files: ['m14_shot_1', 'm14_shot_2', 'm14_shot_3'] },   // M14 (marksmen): gezortenplotz .308 (7.62x51), 3 varied edits. Legal PASS (Rijam removed, FAIL)
      m1911_shot:         { group: 'squad', batch: 2, files: ['m1911_shot_1', 'm1911_shot_2', 'm1911_shot_3'] },   // M1911 .45 (corpsman): C-V + Carmelomike. PENDING LEGAL
      m2_carbine:         { group: 'squad', batch: 2, files: ['m2_carbine_1', 'm2_carbine_2', 'm2_carbine_3'] },   // M2 carbine single (real M1 carbine, cognito perceptu). PENDING LEGAL
      m2_carbine_burst:   { group: 'squad', batch: 2, files: ['m2_carbine_burst_1', 'm2_carbine_burst_2'] },   // M2 carbine auto, real rounds on a 80 ms beat. PENDING LEGAL
      ui_pickup:          { group: 'ui', batch: 1, files: ['ui_pickup_1', 'ui_pickup_2', 'ui_pickup_3', 'ui_pickup_4'] },   // gem / pick: dog-tag clinks. PENDING LEGAL
      ui_heal:            { group: 'ui', batch: 1, files: ['ui_heal_1', 'ui_heal_2'] },   // heal / medpack: velcro pouch + bandage rip. PENDING LEGAL
      ui_level:           { group: 'ui', batch: 2, files: ['ui_level_1'] },   // level up: charging handle + dog tags. PENDING LEGAL
      ui_ready:           { group: 'ui', batch: 2, files: ['ui_ready_1'] },   // ready: charging-handle release. PENDING LEGAL
      ui_chime:           { group: 'ui', batch: 2, files: ['ui_chime_1'] },   // boarding chime: ship bell. PENDING LEGAL
      radio_pulse:        { group: 'ui', batch: 2, files: ['radio_pulse_1'] },   // extraction homing pulse: PRC beep (LukaCafuka). PENDING LEGAL
      hit_flesh:          { group: 'hit', batch: 1, files: ['hit_flesh_1', 'hit_flesh_2', 'hit_flesh_3', 'hit_flesh_4'] },   // enemy hit: body punches. PENDING LEGAL
      kill_hit:           { group: 'foley', batch: 2, files: ['kill_hit_1', 'kill_hit_2'] },   // demo kill: heavier hit. PENDING LEGAL
      hurt_grunt:         { group: 'foley', batch: 1, files: ['hurt_grunt_1', 'hurt_grunt_2'] },   // player hurt: Wigglesworth body hits only, no voice (MrFossy grunt ON HOLD for Blake)
      thud_dirt:          { group: 'foley', batch: 1, files: ['thud_dirt_1', 'thud_dirt_2', 'thud_dirt_3'] },   // generic thud: sandbag + canvas on dirt. PENDING LEGAL
      punji_trap:         { group: 'foley', batch: 2, files: ['punji_trap_1', 'punji_trap_2'] },   // punji: bamboo snap + hit. PENDING LEGAL
      creak_wood:         { group: 'foley', batch: 2, files: ['creak_wood_1'] },   // wood creak. PENDING LEGAL
      hatch_metal:        { group: 'foley', batch: 2, files: ['hatch_metal_1'] },   // metal hatch. PENDING LEGAL
      stage_hammer:       { group: 'foley', batch: 2, files: ['stage_hammer_1'] },   // build stage complete: three hammer blows. PENDING LEGAL
      radio_tune:         { group: 'radio', batch: 3, files: ['radio_tune_1'] },   // Hanoi Hannah broadcast start: radio tuning static. PENDING LEGAL
      sting_boss:         { group: 'sting', batch: 2, files: ['sting_boss_1'] },   // boss inbound: timpani hit. PENDING LEGAL
      sting_evac:         { group: 'sting', batch: 3, files: ['sting_evac_1'] },   // evac fallback (music missing): acoustic C major. PENDING LEGAL
      sting_over:         { group: 'sting', batch: 3, files: ['sting_over_1'] },   // game-over fallback (music missing): acoustic chords -2 st. PENDING LEGAL
      // 2026-10-20 (samples/build_radio_oct20.py): RTO-down sting, radio beds for Blake's voice lines, battle dressing. New sources PENDING LEGAL.
      rto_down_sting:     { /* FILL-IN (Blake ruling Oct 20): licence OPEN, Legal check before Steam */ group: 'sting', batch: 3, files: ['rto_down_sting_1'] },   // RTO killed: VSCO 2 CE low brass D minor (CC0) + pdsounds static cut to dead air + LukaCafuka key/release. PENDING LEGAL
      radio_key_in:       { group: 'radio', batch: 2, files: ['radio_key_in_1'] },     // faint key click + squelch open/hiss: LukaCafuka + pdsounds STE-011 (cleared sources)
      radio_key_out:      { group: 'radio', batch: 2, files: ['radio_key_out_1'] },    // release burst + FM static rush, then silence (no roger beep): LukaCafuka + pdsounds STE-011 (cleared)
      radio_static_bed_loop: { /* FILL-IN (Blake ruling Oct 20): licence OPEN, Legal check before Steam */ group: 'radio', batch: 2, files: ['radio_static_bed_loop_1'] },   // PRC-25-style hiss bed, 6.0 s seamless loop: pdsounds STE-011 (PwC; broadcast-bleed ear check open)
      bandage_dressing:   { group: 'foley', batch: 2, files: ['bandage_dressing_1', 'bandage_dressing_2', 'bandage_dressing_3'] },   // wrapper tear + cloth rip + press: Luckius / OwlishMedia (OGA, CC0). PENDING LEGAL
      // claymore: modusmogulus crack + qubodup snap + Kostrava (all CC0; areniporgen #693421 FAILED the Oct 14 audit)
      explosion_claymore: { group: 'specials', batch: 1, files: ['explosion_claymore_1'] },
      // tank / artillery guns (field recordings, passed with conditions: ear check; craigsmith removed after the 2026-10-14 audit FAIL):
      // daveincamas 21-gun salute, three field guns (CC BY 4.0, credit); alt t-man95 black-powder cannon (CC0, 0.38 s cuts end before crowd voices)
      cannon:             { group: 'squad', batch: 2, files: ['cannon_1', 'cannon_2', 'cannon_3', 'cannon_4'], alt: ['cannon_alt_blackpowder_1', 'cannon_alt_blackpowder_2', 'cannon_alt_blackpowder_3'] },
      // cannon('pt76'): Walking.With.Microphones ZiS-3 76 mm salute (CC BY 4.0, credit), cuts end before the fireworks; Blake approved Oct 14
      cannon_76mm:        { group: 'enemy', batch: 2, files: ['cannon_76mm_1', 'cannon_76mm_2', 'cannon_76mm_3'] },
      // CH-46 evac bird hover (evacBirdHover()): surrey_film Chinook STAND-IN (CC0), seamless 2.5 s loop
      tandem_rotor_loop:  { batch: 2, files: ['tandem_rotor_loop_1'] },
      // 106 mm recoilless back-blast + Zuni launch: klangfabrik RPG (CC0), heavier/longer than the B-40
      backblast:          { group: 'squad', batch: 2, files: ['backblast_1', 'backblast_2'] },
      // Spooky minigun, distant/airborne: rob762x51 200 ft + 4 ft (CC0). strafe_20mm = STAND-IN, same recording -3 st (ear check)
      minigun_burst:      { group: 'specials', batch: 2, files: ['minigun_burst_1', 'minigun_burst_2'] },
      strafe_20mm:        { group: 'specials', batch: 2, files: ['strafe_20mm_1'] },
      // close HE (satchel, Huey crash, tank kill, boss, RPG impact): qubodup
      // firework (CC0), modusmogulus (CC0), juskiddink quarry (CC BY 4.0, credit), Kostrava (CC0), Baradari (CC BY 3.0, credit)
      explosion_close:    { group: 'specials', batch: 1, files: ['explosion_close_1', 'explosion_close_2', 'explosion_close_3', 'explosion_close_4'] },
      napalm_ignite:      { group: 'specials', batch: 2, files: ['napalm_ignite_1'] },     // samararaine bonfire whoosh (CC0)
      fire_loop:          { group: 'specials', batch: 2, files: ['fire_loop_1'] },         // SGAK gasoline fire (CC0), 6 s seamless loop

      // ---- river map: ON for the 2026-10-14 map build. Batch 3, so batches 1 / 2 do not change; load(SAMPLE_MANIFEST)
      //      fetches it after batch 2, or load(SAMPLE_MANIFEST, { batch: 3 }) when the map starts.

      // PBR diesel engine loop (6.07 s): byjoshberry (CC BY 4.0, credit)
      pbr_engine_loop:    { batch: 3, map: 'river map', files: ['pbr_engine_loop_1'] },
      // river ambience loop (8 s, mono): NickTayloe floodwater whirlpool (CC BY 4.0, credit); alt Auxide_Audio mountain river (CC0)
      river_ambience_loop: { batch: 3, map: 'river map', files: ['river_ambience_loop_1'], alt: ['river_ambience_loop_auxide'] },
      // ---- weather (Blake approved random weather, 2026-10-14 night). 'ambience' mix-bus group (-41 dBFS post-gain RMS, 6 dB under
      //      the player guns). Batch 3 (after the map build). Real field recordings, built from Freesound HQ previews by
      //      samples/build_weather_oct14.py; rebuilt from the originals. Legal PASS. Helpers: weather(), thunder(), rainRoof().
      rain_light:         { group: 'ambience', batch: 3, files: ['rain_light_1'] },        // nyoz #615747 (CC0) tropical light rain, Reunion; 30.0 s loop
      rain_heavy:         { group: 'ambience', batch: 3, files: ['rain_heavy_1'] },        // LG #462774 (CC BY 4.0, credit) torrential rain, Thailand; 32.0 s loop
      rain_roof_loop:     { group: 'ambience', batch: 3, files: ['rain_roof_loop_1'] },    // Sassaby #771981 (CC0) medium rain on a tin roof; 30.0 s loop (bunker interiors)
      thunder_distant:    { group: 'ambience', batch: 3, files: ['thunder_distant_1', 'thunder_distant_2', 'thunder_distant_3'] },  // TRP #572443 x2, richwise #361401 (CC0)
      thunder_near:       { group: 'ambience', batch: 3, files: ['thunder_near_1', 'thunder_near_2'] },  // TRP #574412, #567945 (CC0)
      // ---- rc8 sourcing 2026-10-20 (samples/build_rc8_oct20.py). Real field recordings, NO synth. o1 / lvtp5 / firebase: Legal PASS 2026-10-20 (low risk); tokay: Legal PASS 2026-10-20. NOBODY HAS LISTENED to any of them.
      //      Levels (rc8a convention): slot gain 0.5 puts post-gain RMS at ruling target minus the game's MIX.DB bus offset.
      // O-1 Bird Dog FAC marking-run pass: STAND-IN (generic propeller light plane, type unknown, NOT an O-1). ezwa / pdsounds (PD) via Wikimedia Commons. specials -> -31 after the -7 bus
      o1_birddog_flyby:   { group: 'specials', batch: 2, files: ['o1_birddog_flyby_1'] },
      // amtrac engine + tracks loop, 12 s: real USMC AAV-7 (LVTP-7 family; stand-in for the LVTP-5), USMC/DVIDS b-roll (PD, US gov) via Commons. ambience bus -10 -> -40
      lvtp5_engine_loop:  { group: 'ambience', batch: 2, files: ['lvtp5_engine_loop_1'] },
      // firebase night bed, 40 s loop (rev 2: 264-306 s, band-scanned for howler / toucan calls): Anon6116 'Rainforest by Night' (CC0), Peten, Guatemala (REGION STAND-IN for Quang Tri). ambience bus -10 -> -43. Game: MIX.AMB 'jungle_loop' -> this slot
      firebase_amb_loop:  { group: 'ambience', batch: 2, files: ['firebase_amb_loop_1'] },
      // tokay gecko calls (real, northern Laos), Richard Ling via Commons (PD). Legal PASS 2026-10-20. One-shot, trigger sparingly: once every 1-2 min, night / calm at the firebase. ambience bus -10 -> -40 (gated RMS)
      tokay_gecko:        { group: 'ambience', batch: 2, files: ['tokay_gecko_1', 'tokay_gecko_2', 'tokay_gecko_3'] }
    },
    // ---- music slots (2026-10-14). Real recordings only. Loudness matched to combat_loop (-13.6 LUFS integrated, within
    // 0.7 dB), true peak <= -1.1 dBFS in both formats. Built by music/build_music.py; report in music/build/music_report.json.
    // loop tracks: loopStart/loopEnd are seconds INTO THE DECODED BUFFER for the ogg; the m4a files carry m4aOffsetSec of
    // pre-roll (AAC priming), so the player adds that offset for m4a buffers. Kevin MacLeod = stings only (Content ID).
    // The Marines' Hymn is ONLY the win card and the Hogston dedication. Loss = "Last Kiss Goodnight". Never Taps.
    music: {
      base: 'music/',
      formats: ['ogg', 'm4a'],
      tracks: {
        menu:       { file: 'music_menu',       loop: true,  loopStart: 0, loopEnd: 31.475, m4aOffsetSec: 0.046440, gain: 1 },  // Happy Bee - Surf, K. MacLeod (CC BY 4.0)
        intro_riff: { file: 'music_intro_riff', loop: false, dur: 16.384, m4aOffsetSec: 0.046440, gain: 1 },                   // 60s Garage Rock - No voice edit, Abydos_Music (Pixabay)
        briefing:   { file: 'music_briefing',   loop: true,  loopStart: 0, loopEnd: 40.000, m4aOffsetSec: 0.046440, gain: 1 },  // DD Groove, K. MacLeod (CC BY 4.0)
        combat:     { file: 'combat_loop',      loop: true,  loopStart: 0, loopEnd: 80.000, m4aOffsetSec: 0, gain: 1, intensity: true, tier: 1, bpm: 120.0, phraseSec: 8.000 },  // PSYCH ROCK, fredsylvestre66 (Pixabay)
        extraction: { file: 'music_extraction', loop: true,  loopStart: 0, loopEnd: 37.980, m4aOffsetSec: 0.046440, gain: 1 },  // 2026-10-20: "The Thunderer" (Sousa), United States Marine Band 2017, Wikimedia Commons, U.S. gov work (PD). Replaces Abydos 'Loop 1' (Content ID medium). PENDING Legal
        win:        { file: 'music_win',        loop: false, dur: 29.366, m4aOffsetSec: 0.046440, gain: 1, hymn: true },        // Marines' Hymn, U.S. Marine Band (PD) - win card + Hogston dedication ONLY
        loss:       { file: 'music_loss',       loop: false, dur: 36.000, m4aOffsetSec: 0.046440, gain: 1 },                    // Last Kiss Goodnight, K. MacLeod (CC BY 4.0)
        reinforcements: { file: 'music_reinforcements', group: 'music', loop: false, sting: true, dur: 54.930, finalHitSec: 47.230, m4aOffsetSec: 0.046440, gain: 1, returnTo: 'combat', returnAtSec: 48.0, returnXf: 2.5 },   // combat fades back in 0.8 s after the final hit, under the ring-out  // 60s Rock, Abydos_Music (Pixabay) - PBR recon + SOG insert; last 24 bars, ends on the band's final hit. PENDING Legal
        // menu_asian: CUT 2026-10-20 (Vietnam Vet: generic 'Asian' pentatonic strings = Hollywood cliche). DO NOT SHIP. Files music/music_menu_asian.* kept unused;
        // the slot is out of tracks so no load list, default or playMenu fallback can pick it (see doNotShip below).
        // combat tiers 2-5 (2026-10-14): rising energy, all -13.6 LUFS (intensity comes from the music, not the level). PENDING Legal (§1p).
        // phraseSec = 4 bars of the loop (loop = 32 bars = 8 phrases): combatMusicTier() switches on these boundaries.
        combat_2: { file: 'music_combat_2', group: 'music', loop: true, loopStart: 0, loopEnd: 59.533, m4aOffsetSec: 0.046440, gain: 1, intensity: true, tier: 2, bpm: 129.0, phraseSec: 7.442 },  // 60s Underground Organ Rock, JuliusH (Pixabay #4209) - driving
        combat_3: { file: 'music_combat_3', group: 'music', loop: true, loopStart: 0, loopEnd: 59.533, m4aOffsetSec: 0.046440, gain: 1, intensity: true, tier: 3, bpm: 129.2, phraseSec: 7.442 },  // Steampunk Garage, Pixabay user 4379051 (#142325) - pushing
        combat_4: { file: 'music_combat_4', group: 'music', loop: true, loopStart: 0, loopEnd: 47.624, m4aOffsetSec: 0.046440, gain: 1, intensity: true, tier: 4, bpm: 161.5, phraseSec: 5.953 },  // Garage Rock, NewEraMusic (#559346) - frantic
        // combat_5 (2026-10-20): "Heavy Pizza Jam" by Ə (Piacenza band, live rehearsal; Jangwa Nook Records / Petites Maisons netlabel), FMA, CC BY 4.0.
        // Replaces La Menteuse (Content ID HIGH). Free-tempo jam, ~195 BPM closing build, 28.65 s phrase from 198.5 s (corr 0.43), phrase = loop/4. PENDING Legal.
        combat_5: { file: 'music_combat_5', group: 'music', loop: true, loopStart: 0, loopEnd: 28.650, m4aOffsetSec: 0.046440, gain: 1, intensity: true, tier: 5, bpm: 195, phraseSec: 7.1625 },
        // menu_theme (2026-10-20): Semper Fidelis (Sousa, 1888), United States Marine Band 2016, Wikimedia Commons, U.S. gov work, PUBLIC DOMAIN.
        // Replaces Zapatista (Content ID HIGH; music_menu_theme.* kept unused, DO NOT SHIP). One repeated strain 56.00-112.51 s, -14.0 LUFS.
        menu_theme: { file: 'music_menu_march', group: 'music', loop: true, loopStart: 0, loopEnd: 56.510, m4aOffsetSec: 0.046440, gain: 1 },
        scene_opening: { file: 'music_easter_valkyries', group: 'music', loop: false, scene: 'opening', dur: 76.000, m4aOffsetSec: 0.046440, gain: 1, returnTo: 'combat', returnXf: 2.5 },   // Ride of the Valkyries, Edison 1921 (PD) - opening insertion ONLY
        menu_intro: { file: 'music_menu_intro', group: 'music', loop: false, sting: true, dur: 14.500, finalHitSec: 12.150, m4aOffsetSec: 0.046440, gain: 1, next: 'menu_theme' }  // When Johnny Comes Marching Home, U.S. Navy Band Brass Quartet (Wikimedia Commons, U.S. gov work, PD). playMenu() plays it, then the loop
      },
      combatTiers: ['combat', 'combat_2', 'combat_3', 'combat_4', 'combat_5'],   // playMusic('combat') plays the current tier
      // combat_4_alt: CANDIDATE only (Rock Oco, Ə, CC BY 4.0; human-made). NOT a track: Blake keeps combat_4 for now. To swap: point combat_4.file at
      // 'music_combat_4_alt' with loopEnd 36.540, bpm 158, phraseSec 9.135 (loop/4).
      alternates: { combat_4_alt: { file: 'music_combat_4_alt', loop: true, loopStart: 0, loopEnd: 36.540, m4aOffsetSec: 0.046440, gain: 1, intensity: true, tier: 4, bpm: 158, phraseSec: 9.135 } },
      // scenes (2026-10-20, Blake's override): the OPENING insertion (first CH-46 drop at game start, with the door guns / gunships) plays
      // "Ride of the Valkyries" (Wagner), American Symphony Orchestra, Edison Diamond Disc 80638-R (rec./rel. Dec 1921), Wikimedia Commons
      // (NPS Edison NHS collection). US PD (published before 1923). Period crackle kept. 76.0 s excerpt (source 18.0-94.0 s), 2 s fade in /
      // 5 s fade out, NO loop, -14.0 LUFS. Legal: PASS with conditions (no Apocalypse Now material; courtesy credit; no 'authentic period' claim).
      // SamplePlayer.musicEvent('opening_in') plays it; it is never a combat tier and never plays on reinforcement drop-offs. (Was unlockables.valkyries.)
      scenes: { opening: { track: 'scene_opening', fade: 1.5 } },
      aliases: { dedication: 'win' },   // the Hogston dedication uses the same Hymn file
      doNotShip: ['music_menu_asian', 'music_menu_theme']   // cut (Vet) / Content ID HIGH (Zapatista): files kept, never loaded. music_combat_5 is now Ə (La Menteuse file overwritten; source kept in research/)
    },
    // Warning cues (Gamer, 2026-10-07). leadMs = how long BEFORE the attack the cue starts. durMs = clip lengths (ms).
    // commitOnly: the game must schedule the cue only once the attack is committed (it can no longer be cancelled),
    // so a launch bang is always followed by an impact and a whistle by a charge. SamplePlayer does not enforce this.
    cues: {
      b40:             { slot: 'b40_launch', helper: 'b40Launch', leadMs: 1000, commitOnly: true, attack: 'rocket impact',
                         durMs: { b40_launch_1: 560, b40_launch_2: 660 }, altDurMs: { b40_launch_long_1: 2610, b40_launch_long_2: 2610 } },
      chargeWarning:   { slot: 'whistle', helper: 'chargeWarning', leadMs: 2000, commitOnly: true, attack: 'enemy charge',
                         durMs: { whistle_1: 1120 }, altDurMs: { whistle_alt_police: 1050, whistle_alt_pea_distant: 1700 } },
      jetFlyby:        { slot: 'jet_flyby', helper: 'flyby', type: 'jet', leadMs: 3000, commitOnly: false, attack: 'distant bomb (bomb_distant) at bombAt',
                         durMs: { jet_flyby_1: 5000 } },
      m79:             { slot: 'm79_launch', impactSlot: 'm79_impact', helper: 'm79', leadMs: null, commitOnly: false,
                         note: 'player weapon: launch at fire time, impact when the round lands (impactAt)',
                         durMs: { m79_launch_1: 436, m79_impact_1: 850 }, altDurMs: { m79_launch_alt_vabadus: 256, m79_launch_alt_barryshamir: 502 } },
      bigNightAssault: { slot: 'bugle', helper: 'bigNightAssault', enabled: true, leadMs: null, commitOnly: true,
                         attack: 'big night assault (rare)', durMs: { bugle_felixblume_1: 4000 } }   // leadMs: set by Lead Developer for the assault
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = { SAMPLE_MANIFEST: SAMPLE_MANIFEST };
  else root.SAMPLE_MANIFEST = SAMPLE_MANIFEST;
})(typeof window !== 'undefined' ? window : this);
