/*
 * sample_player.js - real recorded samples for "Last Bird Out - Quang Tri, 1968".
 * Plain browser JS, no dependencies. Works next to sound_cues.js (the synthesized cues).
 *
 *   SamplePlayer.init(audioCtx, { sfxBus, musicBus, voiceBus, rotorBus, musicDuck, sfxDuck });
 *   SamplePlayer.load(SAMPLE_MANIFEST);          // call after the menu is up; batch 1 first, then the rest
 *   SamplePlayer.play('m16_single');             // or footstep('mud'), winchester(), smokeDropMoment({...})
 *   SamplePlayer.b40Launch({ impactAt }); SamplePlayer.chargeWarning({ chargeAt });   // warning cues: schedule ONLY
 *     once the attack is committed (see README "Warning cues"); bigNightAssault() is off unless enabled.
 *   SamplePlayer.m79({ impactAt });              // M79: launch now, 40 mm impact at impactAt (AudioContext time)
 *   SamplePlayer.flyby('jet', { bombAt });        // aircraft: jet | skyraider | ranchHand | tandemRotor | huey
 *   SamplePlayer.turretFire('corner' | 'mid');    // .50 cal / M60 bursts, 2 dB quieter (at the base)
 *   SamplePlayer.loadMusic(SAMPLE_MANIFEST);     // music slots, after the sample batches (not in the 1.5 MB first batch)
 *   SamplePlayer.playMusic('menu' | 'intro_riff' | 'briefing' | 'combat' | 'extraction' | 'win' | 'dedication' | 'loss' | 'reinforcements' | 'menu_intro' | 'menu_theme' | 'combat_2..5');   // menu_asian CUT (do not ship)
 *   SamplePlayer.combatIntensity('calm' | 'intense'); SamplePlayer.stopMusic(fade);
 *
 * Rules built in (Blake's spec):
 *  - Weapons (m16, m60, m79, enemy guns, B-40, mortar, bomb, flamethrower) are never synthesized. If a weapon file is missing or failed,
 *    the call stays silent and logs ONE console.info per slot. Non-weapons may fall back to a Cues.* cue.
 *  - At most 12 sample voices at once (oldest, lowest-priority voice is stolen), at most 6 gunshots at once.
 *  - Rifles are short and their gain sits below the Huey rotor, the distant bomb and the voice (Gunny) reference.
 *  - winchester(): music ducks ~-10 dB (rc8a clamp) in ~0.3 s, the rotor stays. smokeDropMoment(): one quiet second,
 *    hit-stop callback, canister hit, then the fight returns.
 *  - Everything routes into the game's own buses, so the game's mute / volume / pause keep working.
 */
(function (root) {
  'use strict';

  var WEAPONS = { m16_single: 1, m16_burst: 1, m60_burst: 1, pbr_50cal_burst: 1, ak47: 1, ak47_burst: 1, sks: 1, rpd_burst: 1, m79_launch: 1, m79_impact: 1, b40_launch: 1, mortar_launch: 1, mortar_impact: 1, mortar_incoming: 1,
    bomb_distant: 1, flamethrower_loop: 1, flamethrower_burst: 1,
    // week of 2026-10-14: weapons + explosions (no synth fallback)
    bolt_rifle_shot: 1, bolt_rifle_bolt: 1, shotgun_shot: 1, shotgun_rack: 1, cannon: 1, cannon_76mm: 1, backblast: 1, car15_single: 1, car15_burst: 1, m79_sawed: 1, smg_m45_burst: 1, pistol22_suppressed: 1, minigun_burst: 1, strafe_20mm: 1,
    explosion_close: 1, explosion_claymore: 1, napalm_ignite: 1, fire_loop: 1, smoke_pop: 1, knife_throw: 1,
    // 2026-10-14 night: missing / placeholder weapons (no synth fallback)
    m3a1_burst: 1, m14_shot: 1, m1911_shot: 1, m2_carbine: 1, m2_carbine_burst: 1 };

  // cat: voice-limit category. prio: higher survives voice stealing. gain: linear trim before variation.
  // out: which internal output the slot uses ('sfx' -> sfxBus, 'rotor' -> rotorBus or sfxBus).
  var SLOTS = {
    huey_rotor_loop:    { cat: 'rotor',     prio: 5, gain: 0.394, out: 'rotor', loop: true },
    huey_flyby:         { cat: 'rotor',     prio: 5, gain: 0.5576, out: 'rotor' },
    // aircraft (Blake approved 2026-10-07, batch 2): not guns, never in the gunshot cap. flyby(type) plays them.
    jet_flyby:          { cat: 'air',       prio: 4, gain: 0.5605 },                                  // STAND-IN F-4/F-5 low pass; before the bomb
    skyraider_flyby:    { cat: 'air',       prio: 4, gain: 0.516 },                                  // A-1H (P-47D mixed in)
    ranch_hand_flyover: { cat: 'air',       prio: 4, gain: 0.617 },                                  // STAND-IN C-130 for the C-123
    tandem_rotor_flyby: { cat: 'rotor',     prio: 5, gain: 0.7089, out: 'rotor' },                    // STAND-IN Chinook for a CH-46 (on for the map build)
    // turret build clunks (sample-only Cues.turretCorner / turretMid, tier-2 trim 0.7 applied by the Cues wrapper)
    turret_corner_build: { cat: 'build',    prio: 2, gain: 0.208 },                                  // sandbag thud + deep ammo-box clunk
    turret_mid_build:   { cat: 'build',     prio: 2, gain: 0.163 },                                  // sandbag thud + light metal clink
    m16_single:         { cat: 'gun',       prio: 1, gain: 0.564, vary: true, maxDur: 0.6 },
    m16_burst:          { cat: 'gun',       prio: 1, gain: 0.3967, vary: true, maxDur: 1.0, burstOf: 'm16_single', rate: 12.5, rounds: [3, 5], maxRounds: 5 },  // 20-rd mags, 3-5 rd bursts (FFSL AR-15 rounds)
    m60_burst:          { cat: 'gun',       prio: 2, gain: 0.209, vary: true },
    // enemy rifles (Blake approved 2026-10-07): ~2.5 dB under Doc's M16, share the 6-gunshot cap, no synth fallback
    ak47:               { cat: 'gun',       prio: 1, gain: 0.2658, vary: true, maxDur: 0.7 },
    ak47_burst:         { cat: 'gun',       prio: 1, gain: 0.2026, vary: true, maxDur: 1.2, burstOf: 'ak47', rate: 11, rounds: [3, 5], maxRounds: 30 },  // 30-rd mag
    sks:                { cat: 'gun',       prio: 1, gain: 0.2405, vary: true, maxDur: 0.7 },   // semi-auto, 10-rd
    rpd_burst:          { cat: 'gun',       prio: 1, gain: 0.1521, vary: true, maxDur: 1.8 },   // enemy LMG STAND-IN: FFSL AK-47 edited, 6/8-rd belt bursts, ~730 rpm, lower, farther
    // M79 (Blake's pick 2026-10-07): launch = LeMudCrab M203/M320 STAND-IN, counts toward the 6-gunshot cap, between the
    // M60 and the mortar launch; impact = Kostrava blast, ~5 dB under the mortar impact. No synth fallback (weapon).
    m79_launch:         { cat: 'gun',       prio: 2, gain: 0.404, vary: true, maxDur: 0.6 },
    m79_impact:         { cat: 'explosive', prio: 3, gain: 0.357, vary: true },
    b40_launch:         { cat: 'explosive', prio: 3, gain: 0.0853, vary: true },                // STAND-IN; short bang (b40Launch(), lead 1 s)
    whistle:            { cat: 'signal',    prio: 3, gain: 0.4704, vary: true },   // rc8a +3 dB (was 0.333)
                   // standard charge warning (chargeWarning(), lead 2 s)
    bugle:              { cat: 'signal',    prio: 3, gain: 0.3856 },   // rc8a +3 dB (was 0.273)
                               // big night assault only; on via manifest cues.bigNightAssault.enabled
    // river map (batch 3, on for the map build). The .50 shares the 6-gunshot cap; the loops use prio 5 so gunfire
    // never steals the engine or the river bed (a stolen loop would not come back).
    pbr_50cal_burst:    { cat: 'gun',       prio: 2, gain: 0.241, vary: true },                 // STAND-IN .50 cal (M2 not confirmed)
    pbr_engine_loop:    { cat: 'engine',    prio: 5, gain: 0.1159, loop: true },   // rc8a -2 dB (was 0.146)
                    // under the Huey loop
    river_ambience_loop: { cat: 'ambience', prio: 5, gain: 0.457, loop: true },   // rc8.1 (AD): -43 net in game (file RMS -24.27, x0.457 -6.8, vol .8 -1.9, amb bus -10); 0.062 would be -60
                    // under the footsteps
    // weather (2026-10-14 night, 'ambience' group): loops prio 5 so gunfire never steals the bed; thunder prio 3, not a gun
    rain_light:         { cat: 'ambience',  prio: 5, gain: 0.2359, loop: true },                    // post-gain RMS -42
    rain_heavy:         { cat: 'ambience',  prio: 5, gain: 0.3057, loop: true },                    // post-gain RMS -40
    rain_roof_loop:     { cat: 'ambience',  prio: 5, gain: 0.1913, loop: true },                    // post-gain RMS -41 (bunker interiors)
    thunder_distant:    { cat: 'weather',   prio: 3, gain: 0.4016, vary: true },                    // post-gain RMS -42
    thunder_near:       { cat: 'weather',   prio: 3, gain: 0.4879, vary: true },                    // post-gain RMS -40.5, crack peaks ~-15 dBFS
    o1_birddog_flyby:   { cat: 'air',       prio: 4, gain: 0.5 },                                  // STAND-IN light-plane pass (post-gain RMS -24, specials bus -7 -> -31)
    lvtp5_engine_loop:  { cat: 'engine',    prio: 5, gain: 0.3575, loop: true }, // rc8.1 mixcheck: -2.9 dB to ambience target                      // amtrac engine loop (modern AAV-7 source, not an LVTP-5), 12 s loop (post-gain -30, ambience bus -10 -> -40)
    firebase_amb_loop:  { cat: 'ambience',  prio: 5, gain: 0.5, loop: true },                      // night insects bed, 40 s loop (post-gain -33, ambience bus -10 -> -43)
    tokay_gecko:        { cat: 'weather',   prio: 3, gain: 0.7099, vary: true }, // rc8.1 mixcheck: +3 dB to ambience target                      // tokay calls, 3 variants (gated post-gain -30, ambience bus -10 -> -40); not a loop
    mortar_launch:      { cat: 'explosive', prio: 3, gain: 0.7554, vary: true },
    mortar_impact:      { cat: 'explosive', prio: 3, gain: 0.3547, vary: true },
    mortar_incoming:    { cat: 'explosive', prio: 3, gain: 0.3587, vary: true },
    bomb_distant:       { cat: 'explosive', prio: 4, gain: 0.4513, vary: true },
    flamethrower_loop:  { cat: 'fire',      prio: 3, gain: 0.4582, loop: true },
    flamethrower_burst: { cat: 'fire',      prio: 3, gain: 0.4866, vary: true },
    radio_squelch:      { cat: 'radio',     prio: 3, gain: 0.6504, vary: true },   // rc8a +4.9 dB (was 0.370), group radio
   
    // ---- week of 2026-10-14 (build_weapons_oct14.py). Every shot slot is cat 'gun' (6-gunshot cap). Gains calibrated
    // to TARGET_POST in samples/measure_levels.py: rifles under the Huey, bomb and Gunny; bomb_distant stays loudest.
    bolt_rifle_shot:    { cat: 'gun',       prio: 2, gain: 0.1023, vary: true },                // M40 / Springfield (.308 Remington 700)
    bolt_rifle_bolt:    { cat: 'mech',      prio: 1, gain: 0.514, vary: true },                // bolt cycle after the shot
    shotgun_shot:       { cat: 'gun',       prio: 2, gain: 0.3749, vary: true },                // Ithaca 37 STAND-IN (Mossberg 500)
    shotgun_rack:       { cat: 'mech',      prio: 1, gain: 0.598, vary: true },
    cannon:             { cat: 'gun',       prio: 3, gain: 0.397, vary: true },                // field guns (21-gun salute); tank90 / t54 / howitzer
    cannon_76mm:        { cat: 'gun',       prio: 3, gain: 0.0825, vary: true },                // ZiS-3 76 mm; pt76
    tandem_rotor_loop:  { cat: 'rotor',     prio: 5, gain: 0.398, out: 'rotor', loop: true },  // CH-46 evac bird hover (STAND-IN Chinook)
    backblast:          { cat: 'gun',       prio: 3, gain: 0.2918, vary: true },                // 106 mm RR / Ontos back-blast, Zuni launch
    minigun_burst:      { cat: 'gun',       prio: 2, gain: 0.3682, vary: true },                // Spooky, distant / airborne
    strafe_20mm:        { cat: 'gun',       prio: 2, gain: 0.3531, vary: true },                // STAND-IN: minigun -3 st (ear check)
    explosion_close:    { cat: 'explosive', prio: 4, gain: 0.6279, vary: true },                // close HE, layered real recordings
    explosion_claymore: { cat: 'explosive', prio: 4, gain: 0.5665, vary: true },                // sharp crack
    napalm_ignite:      { cat: 'fire',      prio: 3, gain: 0.7541, vary: true },
    fire_loop:          { cat: 'fire',      prio: 5, gain: 0.6252, loop: true },                // quiet burning loop
    knife_throw:        { cat: 'blade',     prio: 1, gain: 0.5459, vary: true, maxDur: 1.0 },   // thrown knife into wood (not a gun)
    // ---- Blake's new features, 2026-10-14 evening (samples/build_blake_oct14.py). Guns are cat 'gun' (6-gunshot cap).
    car15_single:       { cat: 'gun',       prio: 1, gain: 0.514, vary: true, maxDur: 0.6 },       // CAR-15 / XM177 (FFSL AR-15, brighter, shorter tail)
    car15_burst:        { cat: 'gun',       prio: 1, gain: 0.3556, vary: true, maxDur: 1.0, burstOf: 'car15_single', rate: 13.3, rounds: [3, 5], maxRounds: 5 },  // ~800 rpm
    m79_sawed:          { cat: 'gun',       prio: 2, gain: 0.1635, vary: true, maxDur: 0.4 },       // sawed-off M79 launch (hit = m79_impact)
    smg_m45_burst:      { cat: 'gun',       prio: 1, gain: 0.7187, vary: true, maxDur: 1.2 },       // Swedish K stand-in (Sten 9 mm), 600 rpm
    pistol22_suppressed:{ cat: 'gun',       prio: 1, gain: 0.325, vary: true, maxDur: 0.4 },       // STAND-IN suppressed .22 (muffled .22LR + action)
    bunker_enter:       { cat: 'foley',     prio: 1, gain: 0.312, vary: true },
    bunker_exit:        { cat: 'foley',     prio: 1, gain: 0.2782, vary: true },
    pbr_runup:          { cat: 'engine',    prio: 4, gain: 0.5024 },                                // STAND-IN for the Jacuzzi water-jet
    pbr_beach:          { cat: 'engine',    prio: 4, gain: 0.5987 },
    pbr_depart:         { cat: 'engine',    prio: 4, gain: 0.6103 },
    h34_flyby:          { cat: 'air',       prio: 4, gain: 0.5118 },                                // STAND-IN H-34 (Skyraider radial + slowed Huey chop)
    h34_land:           { cat: 'air',       prio: 4, gain: 0.6129 },
    h34_liftoff:        { cat: 'air',       prio: 4, gain: 0.5467 },
    h34_hover_loop:     { cat: 'rotor',     prio: 5, gain: 0.445, out: 'rotor', loop: true },
    radio_cff:          { cat: 'radio',     prio: 3, gain: 1.1393 },                                // call-for-fire key-up / static / release, no voices
    smoke_pop:          { cat: 'canister',  prio: 6, gain: 0.6634 },                            // Doc's canister: pop + hiss
    // 2026-10-14 night: missing / placeholder sounds (samples/build_missing_oct14.py; all new sources PENDING LEGAL)
    m3a1_burst:         { cat: 'gun',       prio: 1, gain: 0.7734, vary: true, maxDur: 1.2 },   // CLOSE STAND-IN M3A1 Grease Gun: real Sten rounds pitched -2 st, ~450 rpm
    m14_shot:           { cat: 'gun',       prio: 1, gain: 0.1818, vary: true, maxDur: 0.6 },   // M14 (marksmen): gezortenplotz .308 (7.62x51), 3 varied edits
    m1911_shot:         { cat: 'gun',       prio: 1, gain: 0.514, vary: true, maxDur: 0.5 },   // M1911 .45 (corpsman): C-V + Carmelomike
    m2_carbine:         { cat: 'gun',       prio: 1, gain: 0.335, vary: true, maxDur: 0.5 },   // M2 carbine single (real M1 carbine, cognito perceptu)
    m2_carbine_burst:   { cat: 'gun',       prio: 1, gain: 0.2385, vary: true, maxDur: 0.8 },   // M2 carbine auto, real rounds on a 80 ms beat
    ui_pickup:          { cat: 'ui',        prio: 0, gain: 0.354, vary: true },   // gem / pick: dog-tag clinks
    ui_heal:            { cat: 'ui',        prio: 2, gain: 0.203, vary: true },   // heal / medpack: velcro pouch + bandage rip
    ui_level:           { cat: 'ui',        prio: 3, gain: 0.183 },   // level up: charging handle + dog tags
    ui_ready:           { cat: 'ui',        prio: 2, gain: 0.122 },   // ready: charging-handle release
    ui_chime:           { cat: 'ui',        prio: 3, gain: 0.149 },   // boarding chime: ship bell
    radio_pulse:        { cat: 'ui',        prio: 2, gain: 0.117 },   // extraction homing pulse: PRC beep (LukaCafuka)
    hit_flesh:          { cat: 'hit',       prio: 0, gain: 0.1983, vary: true },   // enemy hit: body punches
    kill_hit:           { cat: 'hit',       prio: 1, gain: 0.3311, vary: true },   // demo kill: heavier hit
    hurt_grunt:         { cat: 'hit',       prio: 4, gain: 0.1933, vary: true },   // player hurt: Wigglesworth body hits (no voice; MrFossy grunt on hold)
    thud_dirt:          { cat: 'foley',     prio: 1, gain: 0.2681, vary: true },   // generic thud: sandbag + canvas on dirt
    punji_trap:         { cat: 'foley',     prio: 3, gain: 0.5104, vary: true },   // punji: bamboo snap + hit
    creak_wood:         { cat: 'foley',     prio: 1, gain: 0.1276 },   // wood creak
    hatch_metal:        { cat: 'foley',     prio: 2, gain: 0.2049 },   // metal hatch
    stage_hammer:       { cat: 'foley',     prio: 3, gain: 0.2278 },   // build stage complete: three hammer blows
    radio_tune:         { cat: 'radio',     prio: 3, gain: 0.5409 },   // Hanoi Hannah broadcast start: radio tuning static
    sting_boss:         { cat: 'sting',     prio: 5, gain: 0.35 },   // rc8a (AD) 0.35 (was 1.5866)
      // boss inbound: timpani hit
    sting_evac:         { cat: 'sting',     prio: 5, gain: 0.5481 },   // evac fallback (music missing): acoustic C major
    sting_over:         { cat: 'sting',     prio: 5, gain: 0.53 },   // game-over fallback (music missing): acoustic chords -2 st
    // 2026-10-20 (samples/build_radio_oct20.py; new sources PENDING LEGAL)
    rto_down_sting:     { cat: 'sting',     prio: 5, gain: 0.213 },   // RTO killed: low brass D minor + static cut to dead air
    radio_key_in:       { cat: 'radio',     prio: 4, gain: 0.57 },   // faint handset key click + squelch open/hiss (radioLine)
    radio_key_out:      { cat: 'radio',     prio: 4, gain: 0.7575 },   // release: short FM static rush, then silence; no roger beep (PRC-25) (radioLine)
    radio_static_bed_loop: { cat: 'radio',  prio: 4, gain: 0.316, loop: true },   // PRC-25-style hiss bed (radioLine plays it ~-12 dB under the voice)
    bandage_dressing:   { cat: 'foley',     prio: 2, gain: 0.1592, vary: true },   // battle dressing: wrapper tear + cloth rip + press
    // Footsteps: all 12 clips are loudness-matched in build_samples.py; these per-surface trims put every surface ~6 dB
    // under the M16 single-shot average (whole-clip RMS, measured by samples/measure_levels.py).
    step_mud:           { cat: 'step',      prio: 0, gain: 0.233, vary: true },
    step_boards:        { cat: 'step',      prio: 0, gain: 0.234, vary: true },
    step_water:         { cat: 'step',      prio: 0, gain: 0.236, vary: true },
    step_deck:          { cat: 'step',      prio: 0, gain: 0.234, vary: true }
  };
  var SURFACES = { mud: 'step_mud', boards: 'step_boards', water: 'step_water', deck: 'step_deck' };
  var FLYBYS = { jet: 'jet_flyby', skyraider: 'skyraider_flyby', ranchHand: 'ranch_hand_flyover', tandemRotor: 'tandem_rotor_flyby', huey: 'huey_flyby' };
  var TURRETS = { corner: 'pbr_50cal_burst', mid: 'm60_burst' }, TURRET_BUILD = { corner: 'turret_corner_build', mid: 'turret_mid_build' };

  function dbToGain(db) { return Math.pow(10, db / 20); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function info(msg) { if (typeof console !== 'undefined' && console.info) console.info('[SamplePlayer] ' + msg); }

  function create() {
    var P = {};
    var ctx = null, buses = {}, out = {}, duckTargets = {};
    var buffers = {};          // slot -> [AudioBuffer]
    var state = {};            // slot -> 'pending' | 'loaded' | 'failed' | 'missing'
    var voices = [];           // { slot, cat, prio, start, end, src, g }
    var loggedSilent = {};     // weapon slot -> true once logged
    var lastStep = -1, lastVariant = {};
    var cfg = { maxVoices: 12, maxGun: 6, maxStep: 2, stepMinGap: 0.1, voiceRefGain: 1.5,
      winchesterDb: -10, winchesterAttack: 0.3, winchesterRelease: 0.8,
      smokeQuiet: 1.0, smokeMusicDb: -10, smokeSfxDb: -10, smokeAttack: 0.06, smokeResume: 0.6,
      // warning cues (manifest.cues overrides the lead times once load() has seen it)
      b40LeadMs: 1000, chargeLeadMs: 2000, enableBigNightAssault: false, bigNightLeadMs: 0,
      jetLeadMs: 3000,      // flyby('jet', { bombAt }) starts the pass this long before the bomb (manifest cues.jetFlyby overrides)
      musicCalmHz: 700, musicCalmDb: -10,   // combat calm state (same source, low-pass + quieter)
      turretDb: -2 };       // turrets sit at the base, away from Doc: same gun, 2 dB quieter (no other distance model exists)
    var stats = { played: 0, stolen: 0, dropped: 0, silentWeapon: 0, fallbacks: 0, rateLimited: 0, loaded: 0, failed: 0 };
    var opts0 = {};
    var cueSpec = {};          // manifest.cues (lead times / clip lengths), set by load()
    var rand = Math.random;

    // ---------- setup ----------
    P.init = function (audioCtx, o) {
      o = o || {}; ctx = audioCtx; opts0 = o;
      for (var k in o.config || {}) cfg[k] = o.config[k];
      if (o.enableBigNightAssault) cfg.enableBigNightAssault = true;
      if (o.random) rand = o.random;
      var dest = ctx.destination;
      buses.sfx = o.sfxBus || dest; buses.music = o.musicBus || null; buses.voice = o.voiceBus || null;
      buses.rotor = o.rotorBus || buses.sfx;
      out.sfx = ctx.createGain(); out.sfx.connect(buses.sfx);
      out.rotor = ctx.createGain(); out.rotor.connect(buses.rotor);
      // Duck targets: a dedicated duck GainNode (recommended) or the bus gain itself (base value is remembered).
      duckTargets.music = makeDuck(o.musicDuck || buses.music, !!o.musicDuck);
      duckTargets.sfx = makeDuck(o.sfxDuck || (o.sfxBus ? o.sfxBus : null), !!o.sfxDuck);
      return P;
    };
    // dedicated = a GainNode/AudioParam that only SamplePlayer moves (base level 1). Otherwise it is the game's bus
    // gain: its level is read when a duck starts from rest and restored on release.
    function makeDuck(node, dedicated) {
      if (!node) return null;
      var param = node.gain ? node.gain : node;  // GainNode or AudioParam
      if (!param || typeof param.setValueAtTime !== 'function') return null;
      return { param: param, dedicated: dedicated, base: dedicated ? 1 : null, holders: {}, ramp: null, releaseAt: -1 };
    }
    P.config = cfg;
    P.slots = SLOTS;
    P.isWeapon = function (slot) { return !!WEAPONS[slot]; };

    // ---------- loading ----------
    function pickFormats(manifest) {
      var f = (manifest.formats || ['ogg', 'm4a']).slice();
      if (opts0.format) return [opts0.format].concat(f.filter(function (x) { return x !== opts0.format; }));
      try {
        if (typeof document !== 'undefined') {
          var a = document.createElement('audio');
          var ogg = a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"');
          if (!ogg && f.indexOf('m4a') >= 0) f = ['m4a'].concat(f.filter(function (x) { return x !== 'm4a'; }));
        }
      } catch (e) { /* keep default order */ }
      return f;
    }
    function fetchBuf(url) {
      if (opts0.fetchArrayBuffer) return opts0.fetchArrayBuffer(url);
      return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); });
    }
    function decode(ab) {
      return new Promise(function (res, rej) {
        try { var p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); }
      });
    }
    function loadOne(base, name, formats) {
      var i = 0;
      function next() {
        if (i >= formats.length) return Promise.reject(new Error('no playable format for ' + name));
        var ext = formats[i++], url = base + ext + '/' + name + '.' + ext;
        return fetchBuf(url).then(decode).catch(function () { return next(); });
      }
      return next();
    }
    // load(manifest, { batch: 1 }) loads only that batch. load(manifest) loads batch 1, then everything else.
    // Never rejects: resolves with { loaded: [...slots], failed: [...slots], missing: [...slots] }.
    P.load = function (manifest, o) {
      o = o || {};
      if (!ctx) return Promise.resolve({ loaded: [], failed: [], missing: [], error: 'init() first' });
      var base = manifest.base || '', formats = pickFormats(manifest), slots = manifest.slots || {};
      if (manifest.cues) cueSpec = manifest.cues;
      // the manifest can switch the big-night-assault bugle on (map build); init({ enableBigNightAssault: false }) still wins
      if (cueSpec.bigNightAssault && cueSpec.bigNightAssault.enabled === true && opts0.enableBigNightAssault !== false) cfg.enableBigNightAssault = true;
      // disabled slots (bugle, river-map slots) are skipped unless asked for, or the big-night-assault cue is enabled
      var names = Object.keys(slots).filter(function (s) { return (o.batch == null || (slots[s].batch || 2) === o.batch) &&
        (!slots[s].disabled || o.includeDisabled || (s === 'bugle' && cfg.enableBigNightAssault)); });
      names.sort(function (a, b) { return (slots[a].batch || 2) - (slots[b].batch || 2); });
      var report = { loaded: [], failed: [], missing: [] };
      var queue = names.slice(), conc = o.concurrency || 2;
      function work() {
        var slot = queue.shift(); if (!slot) return Promise.resolve();
        var files = slots[slot].files || [];
        if (slots[slot].from) { work.derived = true; return work(); }
        if (!files.length) { state[slot] = 'missing'; report.missing.push(slot); return work(); }
        state[slot] = 'pending';
        function fetchAll(list) { return Promise.all(list.map(function (n) { return loadOne(base, n, formats).then(function (b) { return b; }, function () { return null; }); })); }
        return fetchAll(files)
          .then(function (bs) {
            var ok = bs.filter(Boolean), alt = slots[slot].alt || [];
            if (ok.length || !alt.length) return ok;
            info('primary files for "' + slot + '" failed; trying ' + alt.length + ' alt file(s)');
            return fetchAll(alt).then(function (b2) { var o2 = b2.filter(Boolean); if (o2.length) report.alt = (report.alt || []).concat(slot); return o2; });
          })
          .then(function (ok) {
            if (ok.length) { buffers[slot] = ok; state[slot] = 'loaded'; stats.loaded++; report.loaded.push(slot); }
            else { state[slot] = 'failed'; stats.failed++; report.failed.push(slot); info('could not load any file for "' + slot + '"' + (SLOTS[slot] && SLOTS[slot].burstOf ? ' (will re-trigger ' + SLOTS[slot].burstOf + ')' : WEAPONS[slot] ? ' (weapon: will stay silent)' : '')); }
          }).then(work);
      }
      var workers = []; for (var w = 0; w < conc; w++) workers.push(work());
      return Promise.all(workers).then(function () {
        names.forEach(function (s) { if (slots[s].from) state[s] = state[slots[s].from] || 'missing'; });
        return report;
      });
    };
    P.state = function (slot) { return slot ? (state[slot] || 'missing') : JSON.parse(JSON.stringify(state)); };
    P.hasSample = function (slot) { var s = SLOTS[slot]; if (buffers[slot] && buffers[slot].length) return true; return !!(s && s.burstOf && buffers[s.burstOf] && buffers[s.burstOf].length); };
    // For tests / tools: inject decoded buffers directly.
    P._setBuffers = function (slot, list) { buffers[slot] = list; state[slot] = list && list.length ? 'loaded' : 'missing'; };

    // ---------- voices ----------
    function now() { return ctx ? ctx.currentTime : 0; }
    function prune(t) { voices = voices.filter(function (v) { return v.end > t && !v.dead; }); }
    function activeAt(t, filter) { return voices.filter(function (v) { return v.start <= t + 1e-6 && v.end > t && !v.dead && (!filter || filter(v)); }); }
    // voices whose lifetime overlaps [t0, t1): used for caps so voices scheduled in the future are counted too
    function overlapping(t0, t1, filter) { return voices.filter(function (v) { return v.start < t1 && v.end > t0 && !v.dead && (!filter || filter(v)); }); }
    function kill(v, t) {
      v.dead = true; stats.stolen++;
      try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + 0.015); v.src.stop(t + 0.02); } catch (e) { /* already stopped */ }
    }
    function makeRoom(info, t, dur) {
      var t1 = t + (isFinite(dur) ? dur : 3600);
      function capCat(cat, max) {
        var f = function (v) { return v.cat === cat; }, l = overlapping(t, t1, f);
        while (l.length >= max) { kill(oldest(l), t); l = overlapping(t, t1, f); }
      }
      if (info.cat === 'gun') capCat('gun', cfg.maxGun);
      if (info.cat === 'step') capCat('step', cfg.maxStep);
      var all = overlapping(t, t1);
      while (all.length >= cfg.maxVoices) {
        var cands = all.filter(function (v) { return v.prio <= info.prio; });
        if (!cands.length) return false;
        var minP = Math.min.apply(null, cands.map(function (v) { return v.prio; }));
        kill(oldest(cands.filter(function (v) { return v.prio === minP; })), t);
        all = overlapping(t, t1);
      }
      return true;
    }
    function oldest(list) { return list.reduce(function (a, b) { return b.start < a.start ? b : a; }); }
    function pickBuffer(slot) {
      var list = buffers[slot]; if (!list || !list.length) return null;
      var i = Math.floor(rand() * list.length);
      if (list.length > 1 && i === lastVariant[slot]) i = (i + 1) % list.length;  // no immediate repeats
      lastVariant[slot] = i; return list[i];
    }
    function planVoice(s, buf, o, durCap) {
      var rate = 1, gain = s.gain * (o.vol == null ? 1 : o.vol);
      if (s.vary && o.vary !== false) { rate = 1 + (rand() * 2 - 1) * 0.04; gain *= dbToGain((rand() * 2 - 1) * 1.5); }
      if (o.rate) rate *= o.rate;
      var loop = o.loop != null ? o.loop : !!s.loop, dur = loop ? Infinity : buf.duration / rate;
      if (durCap && durCap < dur) dur = durCap;
      return { rate: rate, gain: gain, loop: loop, dur: dur };
    }
    function startVoice(slot, s, buf, t, o, durCap, plan) {
      plan = plan || planVoice(s, buf, o, durCap);
      var src = ctx.createBufferSource(); src.buffer = buf;
      var rate = plan.rate, gain = plan.gain;
      src.playbackRate.value = rate;
      var g = ctx.createGain(); g.gain.value = gain;
      src.connect(g); g.connect(o.dest && o.dest.context === ctx ? o.dest : (s.out === 'rotor' ? out.rotor : out.sfx));   // o.dest: Cues' trim node (sample-only cues)
      var loop = plan.loop, dur = plan.dur;
      if (!loop && dur < buf.duration / rate - 1e-6) {   // choke (burst rounds, maxDur): short fade at the cap
        g.gain.setValueAtTime(gain, t + dur - 0.02); g.gain.linearRampToValueAtTime(0, t + dur);
      }
      if (loop) src.loop = true;
      src.start(t); if (!loop) src.stop(t + dur + 0.01);
      var v = { slot: slot, cat: s.cat, prio: s.prio, start: t, end: t + dur, src: src, g: g, bus: o.busName || '' };
      src.onended = function () { v.dead = true; };
      voices.push(v); stats.played++;
      if (o.duckMusic && duckTargets.music) {   // 2026-10-20: play(slot, { duckMusic: -3 }) ducks the music while this voice sounds
        v.dk = 'v@' + slot + ':' + t.toFixed(3); hold(duckTargets.music, v.dk, o.duckMusic, t, cfg.voiceDuckAttack, loop ? null : t + dur, cfg.voiceDuckRelease);
      }
      return v;
    }
    function handle(v) {
      return { slot: v.slot, start: v.start, end: v.end,
        stop: function (fade) { fade = fade == null ? 0.08 : fade; var t = now(); if (v.dead) return; v.dead = true;
          if (v.dk) unhold(duckTargets.music, v.dk, t, cfg.voiceDuckRelease);
          try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + fade); v.src.stop(t + fade + 0.01); } catch (e) { /* ignore */ } } };
    }
    function silentWeapon(slot) {
      stats.silentWeapon++;
      if (!loggedSilent[slot]) { loggedSilent[slot] = true; info('no sample for weapon "' + slot + '" (' + (state[slot] || 'missing') + '); staying silent - weapons have no synth fallback'); }
      return null;
    }
    function fallback(slot, s, t, o) {
      var Cues = opts0.cues || root.Cues;
      if (!s.fallback || !Cues || typeof Cues[s.fallback] !== 'function') return null;
      stats.fallbacks++;
      try { return Cues[s.fallback](ctx, out.sfx, { when: t, vol: o.vol }); } catch (e) { return null; }
    }

    // play(slot, { when, vol, rate, loop, vary:false, rounds }) -> handle | Cues result (fallback) | null
    P.play = function (slot, o) {
      o = o || {}; if (!ctx) return null;
      var s = SLOTS[slot]; if (!s) { info('unknown slot "' + slot + '"'); return null; }
      var t = o.when != null ? Math.max(o.when, now()) : now();
      prune(Math.min(t, now()));
      /* game patch (mix buses, restored RC5.1 - lost when the rc4 pack copy overwrote this file): P.route(slot, s, o) -> { dest, vol, prio, cat, bus, cap } or { drop: true }; per-bus per-slot voice caps */
      if (P.route && !o.routed) { var rt = P.route(slot, s, o); if (rt) { if (rt.drop) { stats.dropped++; return null; }
          if (rt.cap) { var same = overlapping(t, t + 0.05, function (v) { return v.slot === slot && v.bus === rt.bus; }); if (same.length >= rt.cap) { stats.capped = (stats.capped || 0) + 1; return null; } }
          o = Object.assign({}, o, { dest: rt.dest || o.dest, vol: (o.vol == null ? 1 : o.vol) * (rt.vol == null ? 1 : rt.vol), routed: true, busName: rt.bus });
          if (rt.prio != null || rt.cat) s = Object.assign({}, s, { prio: rt.prio != null ? rt.prio : s.prio, cat: rt.cat || s.cat }); } }
      // recorded bursts are used when loaded; play(..., { rounds: n }) or no burst files -> re-trigger the single shot
      if (s.burstOf && (o.rounds || !(buffers[slot] && buffers[slot].length))) return playBurst(slot, s, t, o);
      // o.variant: preferred file index (explosion(kind)); falls back to a random variant if that file is not loaded
      var buf = o.variant != null && buffers[slot] && buffers[slot][o.variant] ? buffers[slot][o.variant] : pickBuffer(slot);
      if (!buf) return WEAPONS[slot] ? silentWeapon(slot) : fallback(slot, s, t, o);
      var plan = planVoice(s, buf, o, s.maxDur);
      if (o.warnVoice) { var wv = startVoice(slot, s, buf, t, o, s.maxDur, plan); wv.cat = 'warn'; wv.prio = 99; stats.warnVoices = (stats.warnVoices || 0) + 1; return handle(wv); }   /* game patch: warning voice outside the caps (restored RC5.1) */
      if (!makeRoom(s, t, plan.dur)) { stats.dropped++; return null; }
      return handle(startVoice(slot, s, buf, t, o, s.maxDur, plan));
    };
    function playBurst(slot, s, t, o) {
      if (!buffers[s.burstOf] || !buffers[s.burstOf].length) return silentWeapon(slot);
      var n = o.rounds || (s.rounds[0] + Math.floor(rand() * (s.rounds[1] - s.rounds[0] + 1)));
      n = Math.max(1, Math.min(s.maxRounds || 30, Math.round(n) || 1));   // m16: clamp to 1..5
      var gap = 1 / s.rate, hs = [];
      for (var i = 0; i < n; i++) {
        var ti = t + i * gap + (i ? (rand() * 2 - 1) * 0.004 : 0);
        var last = i === n - 1, b = pickBuffer(s.burstOf), cap = last ? SLOTS[s.burstOf].maxDur : gap + 0.03;
        var plan = planVoice(s, b, o, cap);
        if (!makeRoom(s, ti, plan.dur)) { stats.dropped++; continue; }
        hs.push(handle(startVoice(slot, s, b, ti, o, cap, plan)));
      }
      return hs.length ? { slot: slot, rounds: hs.length, start: t, end: hs[hs.length - 1].end, stop: function (f) { hs.forEach(function (h) { h.stop(f); }); } } : null;
    };

    P.footstep = function (surface, o) {
      o = o || {}; var slot = SURFACES[surface];
      if (!slot) { info('unknown surface "' + surface + '" (use mud|boards|water|deck)'); return null; }
      var t = o.when != null ? Math.max(o.when, now()) : now();
      if (lastStep >= 0 && t - lastStep < cfg.stepMinGap) { stats.rateLimited++; return null; }
      lastStep = t;
      return P.play(slot, o);
    };

    // ---------- ducking ----------
    // We track our own ramp so the value at any time is known exactly (no reliance on cancelAndHoldAtTime, which
    // browsers and node implementations handle differently when no event is pending).
    // 2026-10-20: segment list (so later scheduled steps are known too), timed holders (until[key] = audio time the holder
    // expires; rel[key] = its release time) and a floor: the music duck never goes below cfg.musicDuckFloorDb (-10 dB)
    // INCLUDING the game's own MIX special duck reported through externalMusicDuck(db). Holders never add up: the deepest wins.
    function valueAt(d, t) {
      var sg = d.segs; if (!sg || !sg.length) return d.ramp ? (t <= d.ramp.t0 ? d.ramp.v0 : t >= d.ramp.t1 ? d.ramp.v1 : d.ramp.v0 + (d.ramp.v1 - d.ramp.v0) * (t - d.ramp.t0) / (d.ramp.t1 - d.ramp.t0)) : d.base;
      var r = sg[0]; for (var i = 0; i < sg.length; i++) if (sg[i].t0 <= t) r = sg[i];
      if (t <= r.t0) return r.v0; if (t >= r.t1) return r.v1;
      return r.v0 + (r.v1 - r.v0) * (t - r.t0) / (r.t1 - r.t0);
    }
    function dbAt(d, t) {
      var db = 0, rt = 0, u = d.until || {};
      for (var k in d.holders) if (!(u[k] != null && u[k] <= t)) { if (d === duckTargets.music && /^(voice@|v@|ext:|gunship$)/.test(k)) rt = Math.min(rt, d.holders[k]); else db = Math.min(db, d.holders[k]); }
      // routine ducks (voice / radio / gunship / per-voice / game-requested) never go below the floor together with the game's own
      // MIX special duck; rc8a: winchester and smoke are clamped to -10 dB as well (below)
      if (rt < 0) rt = Math.max(rt, Math.min(0, cfg.musicDuckFloorDb - (music.extDuck || 0)));
      return Math.max(-10, Math.min(db, rt));   // rc8a (AD): every duck clamped at -10 dB (winchester, smoke music, smoke sfx included)
    }
    function purge(d, t) { var u = d.until || {}; for (var k in u) if (u[k] <= t) { delete d.holders[k]; delete u[k]; if (d.rel) delete d.rel[k]; } }
    function applyDuck(d, t, dur) {
      purge(d, t);
      var p = d.param, v0 = valueAt(d, t), db = dbAt(d, t), target = d.base * dbToGain(db), t1 = t + Math.max(0.005, dur);
      p.cancelScheduledValues(t); p.setValueAtTime(v0, t); p.linearRampToValueAtTime(target, t1);
      d.ramp = { t0: t, t1: t1, v0: v0, v1: target }; d.segs = [d.ramp];
      // future expiries of timed holders: step to the new deepest holder at each one, with that holder's release time
      var u = d.until || {}, ex = Object.keys(u).filter(function (k) { return u[k] > t; }).sort(function (a, b) { return u[a] - u[b]; }), prev = target, tp = t1;
      for (var i = 0; i < ex.length; i++) {
        var te = Math.max(u[ex[i]], tp), nd = dbAt(d, te + 1e-6), nv = d.base * dbToGain(nd), rl = (d.rel && d.rel[ex[i]]) || 0.4;
        if (Math.abs(nv - prev) < 1e-6) continue;
        p.setValueAtTime(prev, te); p.linearRampToValueAtTime(nv, te + rl); d.segs.push({ t0: te, t1: te + rl, v0: prev, v1: nv }); prev = nv; tp = te + rl;
        if (nd === 0) d.releaseAt = te + rl;
      }
      if (db === 0 && !ex.length) d.releaseAt = t1;
    }
    // hold(d, key, db, t, attack[, until, release]): until = the holder ends by itself at that audio time (release ramp)
    function hold(d, key, db, t, dur, until, rel) {
      if (!d) return;
      // bus-gain mode: (re)read the game's level only when starting from rest, so a volume change between ducks is kept
      if (!d.dedicated && !Object.keys(d.holders).length && (d.base == null || now() >= d.releaseAt)) { d.base = d.param.value; d.ramp = null; d.segs = null; }
      d.holders[key] = db; d.until = d.until || {}; d.rel = d.rel || {};
      if (until != null) { d.until[key] = until; d.rel[key] = rel != null ? rel : 0.4; } else { delete d.until[key]; delete d.rel[key]; }
      applyDuck(d, t, dur);
    }
    function unhold(d, key, t, dur) { if (!d || !(key in d.holders)) return; delete d.holders[key]; if (d.until) delete d.until[key]; applyDuck(d, t, dur); }
    cfg.musicDuckFloorDb = -10; cfg.voiceMusicDuckDb = -7; cfg.voiceDuckAttack = 0.08; cfg.voiceDuckRelease = 0.4; cfg.gunshipMusicDuckDb = -3;
    // Public duck API (2026-10-20). duckMusic(key, db, { attack, until, release }) / unduckMusic(key, { release }).
    // externalMusicDuck(db): the game reports its OWN music duck (index.html MIX specials: -4 dB on MIX.bus.mus) so the
    // two never stack past cfg.musicDuckFloorDb. voiceDuck(start, end): -7 dB under a voice line (80 ms attack, 400 ms release).
    P.duckMusic = function (key, db, o) { o = o || {}; if (!ctx) return; var t = o.when != null ? Math.max(o.when, now()) : now();
      hold(duckTargets.music, 'ext:' + key, db, t, o.attack != null ? o.attack : cfg.voiceDuckAttack, o.until, o.release); };
    P.unduckMusic = function (key, o) { o = o || {}; if (!ctx) return; unhold(duckTargets.music, 'ext:' + key, o.when != null ? Math.max(o.when, now()) : now(), o.release != null ? o.release : cfg.voiceDuckRelease); };
    P.externalMusicDuck = function (db) { music.extDuck = Math.min(0, db || 0); var d = duckTargets.music; if (d && Object.keys(d.holders).length) applyDuck(d, now(), 0.05); return music.extDuck; };
    P.voiceDuck = function (start, end, o) { o = o || {}; if (!ctx) return; var t = Math.max(start != null ? start : now(), now());
      hold(duckTargets.music, 'voice@' + t.toFixed(3), o.db != null ? o.db : cfg.voiceMusicDuckDb, t, cfg.voiceDuckAttack, end != null ? end : t + 3, cfg.voiceDuckRelease); };
    P.musicDuckDb = function (t) { var d = duckTargets.music; if (!d) return 0; t = t != null ? t : now(); var v = valueAt(d, t); return 20 * Math.log10(Math.max(1e-6, v / (d.base || 1))); };
    P.duckState = function () { var m = duckTargets.music, s = duckTargets.sfx; return { music: m ? Object.assign({}, m.holders) : null, sfx: s ? Object.assign({}, s.holders) : null }; };

    // Sky magazine hit Winchester: music ducks under the rotor. The rotor bus is never touched.
    P.winchester = function (o) {
      o = o || {}; if (!ctx) return null;
      var t = o.when != null ? o.when : now();
      hold(duckTargets.music, 'winchester', o.db != null ? o.db : cfg.winchesterDb, t, o.attack != null ? o.attack : cfg.winchesterAttack);
      if (!duckTargets.music) info('winchester(): no musicBus/musicDuck given, nothing to duck');
      return { at: t, release: function (r) { return P.winchesterRelease(r); } };
    };
    P.winchesterRelease = function (o) {
      o = typeof o === 'number' ? { release: o } : (o || {});
      var t = o.when != null ? o.when : now();
      unhold(duckTargets.music, 'winchester', t, o.release != null ? o.release : cfg.winchesterRelease);
    };

    P.release = function (o) { return P.winchesterRelease(o); };   // alias: winchester() / release()

    // The commander drops the smoke: hit-stop, music + sfx duck for one quiet second, canister hits, fight returns.
    // o: { when, quiet, onHitStop(), onCanister(), onResume() }. Returns the schedule (audio-clock times).
    P.smokeDropMoment = function (o) {
      o = o || {}; if (!ctx) return null;
      var t0 = o.when != null ? Math.max(o.when, now()) : now();
      var q = o.quiet != null ? o.quiet : cfg.smokeQuiet;
      var tc = t0 + q, tr = tc + 0.15;
      hold(duckTargets.music, 'smoke', cfg.smokeMusicDb, t0, cfg.smokeAttack);
      hold(duckTargets.sfx, 'smoke', cfg.smokeSfxDb, t0, cfg.smokeAttack);
      // our own already-scheduled weapon voices fade with the sfx duck; new ones keep playing ducked
      unhold(duckTargets.sfx, 'smoke', tc - 0.03, 0.03);   // sfx back just before the canister so it is not ducked
      var can = P.play('smoke_pop', { when: tc });   // real canister pop (no synth fallback)
      unhold(duckTargets.music, 'smoke', tr, cfg.smokeResume);
      var sched = { start: t0, canisterAt: tc, resumeAt: tr, end: tr + cfg.smokeResume, canister: can };
      later(t0, o.onHitStop, sched); later(tc, o.onCanister, sched); later(tr, o.onResume, sched);
      return sched;
    };
    function later(t, fn, arg) {
      if (typeof fn !== 'function') return;
      var ms = Math.max(0, (t - now()) * 1000);
      if (ms < 1) { try { fn(arg); } catch (e) { info('callback error: ' + e.message); } return; }
      setTimeout(function () { try { fn(arg); } catch (e) { info('callback error: ' + e.message); } }, ms);
    }

    // ---------- warning cues ----------
    // The game decides; these only schedule. Call them ONLY once the attack is committed (cannot be cancelled any
    // more): a B-40 bang must always be followed by an impact, a whistle always by a charge. The returned object gives
    // the times so the game can line the attack up with the cue. If the attack time is closer than the lead time,
    // the cue plays now and late = true (the attack is NOT moved).
    function leadOf(name, cfgKey) { var c = cueSpec[name]; return c && c.leadMs != null ? c.leadMs : cfg[cfgKey]; }
    function warnCue(slot, leadMs, attackAt, o) {
      o = o || {}; if (!ctx) return null;
      var lead = leadMs / 1000, t = now(), want = attackAt != null ? attackAt - lead : (o.when != null ? o.when : t);
      var at = Math.max(want, t), h = P.play(slot, Object.assign({}, o, { when: at, warnVoice: true }));
      return { slot: slot, cueAt: at, attackAt: attackAt != null ? attackAt : at + lead, leadMs: leadMs, late: want < t - 1e-3, handle: h, played: !!h };
    }
    // b40Launch({ impactAt }) or b40Launch({ when }): launch bang 1 s (cues.b40.leadMs) before the rocket impact.
    P.b40Launch = function (o) { o = o || {}; return warnCue('b40_launch', leadOf('b40', 'b40LeadMs'), o.impactAt, o); };
    // chargeWarning({ chargeAt }) or chargeWarning({ when }): enemy whistle 2 s (cues.chargeWarning.leadMs) before a charge.
    P.chargeWarning = function (o) { o = o || {}; return warnCue('whistle', leadOf('chargeWarning', 'chargeLeadMs'), o.chargeAt, o); };
    // bigNightAssault({ assaultAt | when }): rare bugle cue. Plays when the manifest has cues.bigNightAssault.enabled = true
    // (map build) or init(ctx, { enableBigNightAssault: true }); init(ctx, { enableBigNightAssault: false }) forces it off.
    P.bigNightAssault = function (o) {
      o = o || {}; if (!ctx) return null;
      if (!cfg.enableBigNightAssault) { info('bigNightAssault(): disabled by default; not played'); return null; }
      return warnCue('bugle', leadOf('bigNightAssault', 'bigNightLeadMs') || 0, o.assaultAt, o);
    };
    // m79({ impactAt, when }): plays the M79 launch now (or at when) and the 40 mm impact at impactAt (AudioContext
    // time; clamped to >= the launch). No impactAt -> launch only (call m79Impact() when the round lands). Both are
    // weapons: if a file failed they stay silent (no synth). Returns { launch, impact, launchAt, impactAt }.
    P.m79 = function (o) {
      o = o || {}; if (!ctx) return null;
      var t = o.when != null ? Math.max(o.when, now()) : now();
      var launch = P.play('m79_launch', Object.assign({}, o, { when: t })), ia = null, impact = null;
      if (o.impactAt != null) { ia = Math.max(o.impactAt, t); impact = P.play('m79_impact', Object.assign({}, o, { when: ia })); }
      return { launch: launch, impact: impact, launchAt: t, impactAt: ia };
    };
    P.m79Impact = function (o) { return P.play('m79_impact', o || {}); };
    // flyby(type, { when, vol, bombAt, bomb }): type = 'jet' | 'skyraider' | 'ranchHand' | 'tandemRotor' | 'huey'.
    // jet + bombAt: the pass starts cues.jetFlyby.leadMs (3 s) before bombAt so the jet goes over before the distant
    // bomb; bomb: true also plays bomb_distant at bombAt. tandemRotor is disabled in the manifest (null unless loaded).
    P.flyby = function (type, o) {
      o = o || {}; if (!ctx) return null; var slot = FLYBYS[type];
      if (!slot) { info('unknown flyby "' + type + '" (use ' + Object.keys(FLYBYS).join('|') + ')'); return null; }
      var t = now(), lead = leadOf('jetFlyby', 'jetLeadMs') / 1000, at = o.when != null ? o.when : t, late = false;
      if (type === 'jet' && o.bombAt != null) { at = o.bombAt - lead; late = at < t - 1e-3; }
      at = Math.max(at, t);
      var h = P.play(slot, Object.assign({}, o, { when: at })), b = null;
      if (o.bomb && o.bombAt != null) b = P.play('bomb_distant', Object.assign({}, o, { when: Math.max(o.bombAt, at) }));
      return { type: type, slot: slot, cueAt: at, bombAt: o.bombAt != null ? o.bombAt : null, late: late, handle: h, bomb: b, played: !!h };
    };
    // turretFire('corner' | 'mid', { when, vol, rounds }): corner turret = .50 cal bursts, mid-wall turret = M60 bursts,
    // 2 dB under the same gun near Doc (cfg.turretDb). Weapons: share the 6-gunshot cap, silent if not loaded.
    P.turretFire = function (pos, o) {
      o = o || {}; var slot = TURRETS[pos]; if (!slot) { info('unknown turret "' + pos + '" (use corner|mid)'); return null; }
      return P.play(slot, Object.assign({}, o, { vol: (o.vol == null ? 1 : o.vol) * dbToGain(cfg.turretDb) }));
    };
    // turretBuild('corner' | 'mid', { when, vol, dest }): the real sandbag + metal build clunks (Cues.turretCorner /
    // Cues.turretMid call this; there is no synth version any more).
    P.turretBuild = function (pos, o) {
      var slot = TURRET_BUILD[pos]; if (!slot) { info('unknown turret build "' + pos + '" (use corner|mid)'); return null; }
      return P.play(slot, o || {});
    };
    // ---------- weapons + explosions (week of 2026-10-14) ----------
    // All are weapons: a missing/failed file stays silent (one console.info), never a synth. Every shot shares the
    // 6-gunshot cap. Each returns the play handle (or null), except the two-part helpers which return { shot, bolt }.
    // boltRifle({ when, vol, bolt: true, boltDelay: 0.55 }): .308 shot, then the bolt cycle (bolt: false = shot only).
    P.boltRifle = function (o) {
      o = o || {}; if (!ctx) return null; var t = o.when != null ? Math.max(o.when, now()) : now();
      var shot = P.play('bolt_rifle_shot', Object.assign({}, o, { when: t }));
      var bolt = o.bolt === false ? null : P.play('bolt_rifle_bolt', Object.assign({}, o, { when: t + (o.boltDelay != null ? o.boltDelay : 0.55) }));
      return { shot: shot, bolt: bolt };
    };
    P.boltCycle = function (o) { return P.play('bolt_rifle_bolt', o || {}); };
    // shotgun({ when, vol, rack: true, rackDelay: 0.45 }): Ithaca 37 shot, then the pump rack (rack: false = shot only).
    P.shotgun = function (o) {
      o = o || {}; if (!ctx) return null; var t = o.when != null ? Math.max(o.when, now()) : now();
      var shot = P.play('shotgun_shot', Object.assign({}, o, { when: t }));
      var rack = o.rack === false ? null : P.play('shotgun_rack', Object.assign({}, o, { when: t + (o.rackDelay != null ? o.rackDelay : 0.45) }));
      return { shot: shot, rack: rack };
    };
    P.shotgunRack = function (o) { return P.play('shotgun_rack', o || {}); };
    // cannon(kind, o): kind = 'tank90' (M48) | 't54' | 'pt76' | 'howitzer' (105 mm) -> cannon slot, small pitch per calibre;
    // 'recoilless' (106 mm) | 'ontos' | 'zuni' -> back-blast slot (heavier, longer than the B-40).
    var CANNON = { tank90: { slot: 'cannon', rate: 1.04 }, t54: { slot: 'cannon', rate: 1.0 }, pt76: { slot: 'cannon_76mm', rate: 1.0 },
      howitzer: { slot: 'cannon', rate: 0.96 }, recoilless: { slot: 'backblast', rate: 1.0 }, ontos: { slot: 'backblast', rate: 0.98 },
      zuni: { slot: 'backblast', rate: 1.04 } };
    P.cannon = function (kind, o) {
      o = o || {}; var k = CANNON[kind || 'tank90'];
      if (!k) { info('unknown cannon "' + kind + '" (use ' + Object.keys(CANNON).join('|') + ')'); return null; }
      return P.play(k.slot, Object.assign({}, o, { rate: (o.rate || 1) * k.rate }));
    };
    P.zuni = function (o) { return P.cannon('zuni', o); };
    P.minigun = function (o) { return P.play('minigun_burst', o || {}); };          // Spooky, distant airborne burst
    P.strafe20mm = function (o) { return P.play('strafe_20mm', o || {}); };         // STAND-IN (ear check)
    // explosion(kind, o): 'claymore' -> sharp crack; 'satchel' | 'tank_kill' | 'huey_crash' | 'rpg' | 'boss' -> preferred
    // close-HE variant (random if omitted or not loaded). 'rpg' plays 2 dB lower (smaller warhead).
    var EXPLOSION = { claymore: { slot: 'explosion_claymore' }, satchel: { slot: 'explosion_close', variant: 0 },
      tank_kill: { slot: 'explosion_close', variant: 1 }, huey_crash: { slot: 'explosion_close', variant: 1 },
      rpg: { slot: 'explosion_close', variant: 2, db: -2 }, boss: { slot: 'explosion_close', variant: 3 }, any: { slot: 'explosion_close' } };
    P.explosion = function (kind, o) {
      o = o || {}; var k = EXPLOSION[kind || 'any'];
      if (!k) { info('unknown explosion "' + kind + '" (use ' + Object.keys(EXPLOSION).join('|') + ')'); return null; }
      return P.play(k.slot, Object.assign({ variant: k.variant }, o, { vol: (o.vol == null ? 1 : o.vol) * dbToGain(k.db || 0) }));
    };
    // napalm({ when, vol, fire: true }): ignition whoosh, then the quiet fire loop from 0.8 s (returns { ignite, fire };
    // stop the fire with fire.stop(fade)). fireLoop(o) starts only the loop.
    P.napalm = function (o) {
      o = o || {}; if (!ctx) return null; var t = o.when != null ? Math.max(o.when, now()) : now();
      var ig = P.play('napalm_ignite', Object.assign({}, o, { when: t }));
      var fire = o.fire === false ? null : P.play('fire_loop', Object.assign({}, o, { when: t + 0.8 }));
      return { ignite: ig, fire: fire };
    };
    P.fireLoop = function (o) { return P.play('fire_loop', o || {}); };
    // evacBirdHover({ when, vol, fade }): CH-46 evac bird (drawEvacBird) hovering through boarding: seamless tandem-rotor
    // loop on the rotor bus. Returns the handle; call handle.stop(fade) when the bird lifts off. Not a weapon (no cap).
    P.evacBirdHover = function (o) {
      o = o || {}; var h = P.play('tandem_rotor_loop', o);
      if (h && o.fade) { var g = null; voices.forEach(function (v) { if (v.start === h.start && v.slot === 'tandem_rotor_loop') g = v.g; });
        if (g) { var t = h.start, v0 = g.gain.value; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v0, t + o.fade); } }
      return h;
    };
    P.knifeThrow = function (o) { return P.play('knife_throw', o || {}); };       // whoosh + thunk into wood; silent if not loaded
    P.smokePop = function (o) { return P.play('smoke_pop', o || {}); };            // Doc pops the canister on the circle
    // Blake's new features (2026-10-14 evening). Weapons stay silent if not loaded; the rest are plain one-shots / a loop.
    P.car15 = function (o) { o = o || {}; return P.play(o.rounds ? 'car15_burst' : 'car15_single', o); };  // {rounds} -> burst
    P.m79Sawed = function (o) {                                                    // like m79(): launch now, m79_impact at impactAt
      o = o || {}; if (!ctx) return null; var t = o.when != null ? Math.max(o.when, now()) : now();
      var launch = P.play('m79_sawed', Object.assign({}, o, { when: t })), ia = null, impact = null;
      if (o.impactAt != null) { ia = Math.max(o.impactAt, t); impact = P.play('m79_impact', Object.assign({}, o, { when: ia })); }
      return { launch: launch, impact: impact, launchAt: t, impactAt: ia };
    };
    P.smgM45 = function (o) { return P.play('smg_m45_burst', o || {}); };
    P.pistol22 = function (o) { return P.play('pistol22_suppressed', o || {}); };
    P.bunker = function (dir, o) { return P.play(dir === 'exit' ? 'bunker_exit' : 'bunker_enter', o || {}); };
    P.pbrManeuver = function (kind, o) { var s = { runup: 'pbr_runup', beach: 'pbr_beach', depart: 'pbr_depart' }[kind]; return s ? P.play(s, o || {}) : null; };
    P.h34 = function (kind, o) { var s = { flyby: 'h34_flyby', land: 'h34_land', liftoff: 'h34_liftoff', hover: 'h34_hover_loop' }[kind]; return s ? P.play(s, o || {}) : null; };
    P.radioCff = function (o) { return P.play('radio_cff', o || {}); };
    // 2026-10-14 night: missing / placeholder sounds. Guns stay silent until loaded; the rest are plain one-shots.
    P.m3a1 = function (o) { return P.play('m3a1_burst', o || {}); };
    P.m14 = function (o) { return P.play('m14_shot', o || {}); };
    P.m1911 = function (o) { return P.play('m1911_shot', o || {}); };
    P.m2Carbine = function (o) { o = o || {}; return P.play(o.auto ? 'm2_carbine_burst' : 'm2_carbine', o); };   // {auto} -> burst
    P.ui = function (kind, o) { var s = { pick: 'ui_pickup', gem: 'ui_pickup', heal: 'ui_heal', medpack: 'ui_heal', level: 'ui_level', ready: 'ui_ready', chime: 'ui_chime', pulse: 'radio_pulse' }[kind]; return s ? P.play(s, o || {}) : null; };
    P.hit = function (kind, o) { var s = { hit: 'hit_flesh', kill: 'kill_hit', hurt: 'hurt_grunt', thud: 'thud_dirt', punji: 'punji_trap' }[kind || 'hit']; return s ? P.play(s, o || {}) : null; };
    P.world = function (kind, o) { var s = { creak: 'creak_wood', hatch: 'hatch_metal', stage: 'stage_hammer', tune: 'radio_tune', sigpop: 'smoke_pop' }[kind]; return s ? P.play(s, o || {}) : null; };
    P.sting = function (kind, o) { var s = { boss: 'sting_boss', evac: 'sting_evac', over: 'sting_over', rtoDown: 'rto_down_sting' }[kind]; return s ? P.play(s, o || {}) : null; };

    // ---------- 2026-10-20: RTO down, battle dressing, radio voice lines ----------
    P.rtoDown = function (o) { return P.play('rto_down_sting', o || {}); };
    P.bandage = function (o) { return P.play('bandage_dressing', o || {}); };
    // radioLine(bufferOrSlot, { when, vol, bed, bedDb, lowHz, highHz, drive, keyGap, dest }) -> handle | null
    // Wraps a recorded voice line so it sounds like a PRC-25 transmission: radio_key_in, then the voice through a band-pass
    // (high-pass lowHz ~300 Hz + low-pass highHz ~3000 Hz, 2 poles each) and a light soft-clip (drive 0..1, default 0.25),
    // the radio_static_bed_loop under it (bedDb, default -12 dB re. its slot level; bed:false = off), then radio_key_out.
    // bufferOrSlot = an AudioBuffer or a slot name (e.g. a future 'vo_*' slot). Routes to the voice bus when init() got one.
    // Key-in/out/bed play only when loaded (no synth fallback); the voice still plays without them.
    cfg.radioLowHz = 300; cfg.radioHighHz = 3000; cfg.radioDrive = 0.25; cfg.radioBedDb = -12; cfg.radioKeyGap = 0.30;
    function softClipCurve(drive) {
      var n = 1024, c = new Float32Array(n), k = 1 + drive * 9, norm = Math.tanh(k);
      for (var i = 0; i < n; i++) { var x = i * 2 / (n - 1) - 1; c[i] = Math.tanh(k * x) / norm; }
      return c;
    }
    P.radioLine = function (line, o) {
      o = o || {}; if (!ctx) return null;
      var buf = line && typeof line === 'object' && line.getChannelData ? line : (typeof line === 'string' ? pickBuffer(line) : null);
      if (!buf) { info('radioLine: no voice buffer for ' + (typeof line === 'string' ? '"' + line + '"' : 'that argument')); return null; }
      var t = o.when != null ? Math.max(o.when, now()) : now(), vol = o.vol == null ? 1 : o.vol;
      var gap = o.keyGap != null ? o.keyGap : cfg.radioKeyGap;
      var hk = (buffers.radio_key_in && buffers.radio_key_in.length) ? P.play('radio_key_in', { when: t, vol: vol, vary: false }) : null;
      var tv = t + (hk ? gap : 0), dest = o.dest || buses.voice || out.sfx;
      var src = ctx.createBufferSource(); src.buffer = buf;
      var hp1 = ctx.createBiquadFilter(), hp2 = ctx.createBiquadFilter(), lp1 = ctx.createBiquadFilter(), lp2 = ctx.createBiquadFilter();
      [hp1, hp2].forEach(function (f) { f.type = 'highpass'; f.frequency.value = o.lowHz || cfg.radioLowHz; f.Q.value = 0.707; });
      [lp1, lp2].forEach(function (f) { f.type = 'lowpass'; f.frequency.value = o.highHz || cfg.radioHighHz; f.Q.value = 0.707; });
      var ws = ctx.createWaveShaper(); ws.curve = softClipCurve(o.drive != null ? o.drive : cfg.radioDrive); ws.oversample = '2x';
      var g = ctx.createGain(); g.gain.value = (o.voiceGain != null ? o.voiceGain : 1) * vol;
      src.connect(hp1); hp1.connect(hp2); hp2.connect(lp1); lp1.connect(lp2); lp2.connect(ws); ws.connect(g); g.connect(dest);
      var dur = buf.duration; src.start(tv); src.stop(tv + dur + 0.01);
      var bed = null;
      if (o.bed !== false && buffers.radio_static_bed_loop && buffers.radio_static_bed_loop.length)
        bed = P.play('radio_static_bed_loop', { when: tv - 0.05, vol: vol * dbToGain(o.bedDb != null ? o.bedDb : cfg.radioBedDb), vary: false });
      var tEnd = tv + dur;
      if (o.duck !== false) P.voiceDuck(tv - cfg.voiceDuckAttack, tEnd, { db: o.duckDb });   // music -7 dB under the call (2026-10-20)
      if (bed) { var bv = voiceOf(bed);   // end the looping bed sample-accurately with the voice (40 ms fade under the key-out)
        if (bv) { var bg = bv.g.gain.value; bv.g.gain.setValueAtTime(bg, tEnd + 0.02); bv.g.gain.linearRampToValueAtTime(0, tEnd + 0.06); bv.src.stop(tEnd + 0.07); bv.end = tEnd + 0.07; bed.end = bv.end; } }
      var hout = (buffers.radio_key_out && buffers.radio_key_out.length) ? P.play('radio_key_out', { when: tEnd + 0.02, vol: vol, vary: false }) : null;
      var end = tEnd + 0.02 + (hout ? hout.end - hout.start : 0), stopped = false;
      return { slot: 'radioLine', start: t, voiceStart: tv, voiceEnd: tEnd, end: end, keyIn: hk, keyOut: hout, bed: bed, nodes: { hp: hp1, lp: lp2, shaper: ws, gain: g },
        stop: function (fade) { if (stopped) return; stopped = true; fade = fade == null ? 0.08 : fade; var n = now();
          try { g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.linearRampToValueAtTime(0, n + fade); src.stop(n + fade + 0.01); } catch (e) { /* ignore */ }
          [hk, hout, bed].forEach(function (h) { if (h && h.stop) h.stop(fade); }); } };
    };

    // ---------- weather (2026-10-14 night) ----------
    // weather('light' | 'heavy' | 'off', { fade, when, vol }) -> handle { mode, slot, voice, stop(fade) }. Crossfades from the
    // current rain bed to the new one over fade s (default 3). Calling it with the current mode is a no-op (returns the same handle).
    // thunder({ near, when, vol }) -> play handle (thunder_near / thunder_distant); silent if not loaded (no synth fallback).
    // rainRoof(on, { fade }) -> handle | null: tin-roof rain loop for bunker interiors; while it is on the outdoor rain bed is
    // pulled down cfg.roofOutsideDb (default -12 dB) so the roof reads as 'inside'. rainRoof(false) restores it.
    var wx = { mode: 'off', h: null, roof: null, roofOn: false };
    var RAIN = { light: 'rain_light', heavy: 'rain_heavy' };
    cfg.weatherFade = 3.0; cfg.roofOutsideDb = -12;
    function voiceOf(h) { var r = null; if (h) voices.forEach(function (v) { if (!v.dead && v.slot === h.slot && v.start === h.start) r = v; }); return r; }
    function rampVoice(v, to, t, fade) { try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(to, t + Math.max(0.01, fade)); } catch (e) { /* ignore */ } }
    function fadeIn(h, fade, scale) { var v = voiceOf(h); if (!v) return; var g0 = v.g.gain.value; v.base = g0; v.g.gain.setValueAtTime(0, h.start); v.g.gain.linearRampToValueAtTime(g0 * (scale == null ? 1 : scale), h.start + Math.max(0.01, fade)); }
    P.weather = function (mode, o) {
      o = o || {}; var fade = o.fade == null ? cfg.weatherFade : o.fade; mode = RAIN[mode] ? mode : 'off';
      if (mode === wx.mode && (mode === 'off' || (wx.h && voiceOf(wx.h.voice)))) return wx.h;
      if (wx.h && wx.h.voice) wx.h.voice.stop(fade);
      wx.mode = mode; wx.h = null; if (mode === 'off') return null;
      var h = P.play(RAIN[mode], { when: o.when, vol: o.vol, loop: true }); if (!h) { wx.mode = 'off'; return null; }
      fadeIn(h, fade, wx.roofOn ? dbToGain(cfg.roofOutsideDb) : 1);
      wx.h = { mode: mode, slot: RAIN[mode], voice: h, stop: function (f) { return P.weather('off', { fade: f }); } };
      return wx.h;
    };
    P.weatherMode = function () { return wx.mode; };
    P.thunder = function (o) { o = o || {}; return P.play(o.near ? 'thunder_near' : 'thunder_distant', o); };
    P.rainRoof = function (on, o) {
      o = o || {}; var fade = o.fade == null ? 1.0 : o.fade, t = now(); on = !!on;
      var bed = wx.h && voiceOf(wx.h.voice);
      if (bed && on !== wx.roofOn) rampVoice(bed, (bed.base || SLOTS[bed.slot].gain) * (on ? dbToGain(cfg.roofOutsideDb) : 1), t, fade);
      wx.roofOn = on;
      if (!on) { if (wx.roof) wx.roof.stop(fade); wx.roof = null; return null; }
      if (wx.roof && voiceOf(wx.roof)) return wx.roof;
      wx.roof = P.play('rain_roof_loop', { loop: true, vol: o.vol }); if (wx.roof) fadeIn(wx.roof, fade); return wx.roof;
    };
    P.CANNON_KINDS = Object.keys(CANNON); P.EXPLOSION_KINDS = Object.keys(EXPLOSION);

    P.cueTiming = function () { return { b40: { leadMs: leadOf('b40', 'b40LeadMs'), slot: 'b40_launch' }, chargeWarning: { leadMs: leadOf('chargeWarning', 'chargeLeadMs'), slot: 'whistle' },
      bigNightAssault: { enabled: !!cfg.enableBigNightAssault, leadMs: leadOf('bigNightAssault', 'bigNightLeadMs'), slot: 'bugle' } }; };


    // ---------- music ----------
    // One music track at a time on the game's musicBus (so winchester() / smokeDropMoment() ducks still apply).
    // playMusic() crossfades from the current track. Loop tracks loop between loopStart and loopEnd (m4a buffers are
    // shifted by m4aOffsetSec, the AAC pre-roll). Stings (intro_riff, win, loss) play once and then stop by themselves.
    var music = { buffers: {}, fmt: {}, spec: null, cur: null, out: null, intensity: 'intense' };
    function musicOut() {
      if (!music.out) { music.out = ctx.createGain(); music.out.connect(buses.music || ctx.destination); }
      return music.out;
    }
    function musicName(name) { var sp = music.spec; if (!sp) return name; return (sp.aliases && sp.aliases[name]) || name; }
    // loadMusic(manifest, { tracks: ['menu', ...], concurrency }) -> { loaded, failed, missing }. Never rejects.
    P.loadMusic = function (manifest, o) {
      o = o || {};
      if (!ctx) return Promise.resolve({ loaded: [], failed: [], missing: [], error: 'init() first' });
      var sp = manifest && manifest.music; music.spec = sp || null;
      if (!sp || !sp.tracks) return Promise.resolve({ loaded: [], failed: [], missing: [], error: 'manifest has no music section' });
      var formats = pickFormats(sp), names = (o.tracks || Object.keys(sp.tracks)).filter(function (n) { return sp.tracks[n]; });
      var report = { loaded: [], failed: [], missing: [] }, queue = names.slice(), conc = o.concurrency || 2;
      function one(name) {
        var tr = sp.tracks[name], i = 0;
        if (!tr.file) { report.missing.push(name); return Promise.resolve(); }
        function next() {
          if (i >= formats.length) return Promise.reject(new Error('no format'));
          var ext = formats[i++];
          return fetchBuf(sp.base + tr.file + '.' + ext)   // flat layout: music/<file>.<ext>
            .then(decode).then(function (b) { return { b: b, ext: ext }; }, function () { return next(); });
        }
        return next().then(function (r) { music.buffers[name] = r.b; music.fmt[name] = r.ext; report.loaded.push(name); },
          function () { report.failed.push(name); info('could not load music "' + name + '" (stays silent; no synth score)'); });
      }
      function work() { var n = queue.shift(); return n ? one(n).then(work) : Promise.resolve(); }
      var ws = []; for (var w = 0; w < conc; w++) ws.push(work());
      return Promise.all(ws).then(function () { return report; });
    };
    P.hasMusic = function (name) { return !!music.buffers[musicName(name)]; };
    function stopTrack(cur, t, fade) {
      if (!cur || cur.dead) return; cur.dead = true;
      try { cur.g.gain.cancelScheduledValues(t); cur.g.gain.setValueAtTime(cur.g.gain.value, t); cur.g.gain.linearRampToValueAtTime(0, t + Math.max(0.005, fade)); cur.src.stop(t + Math.max(0.005, fade) + 0.02); } catch (e) { /* ignore */ }
    }
    // playMusic(name, { when, fade = 0.5, vol = 1, offset }) -> { name, start, end, loop, stop(fade) } | null
    P.playMusic = function (name, o) {
      o = o || {}; if (!ctx) return null;
      if (ctx) P.musicUpdate();
      if (music.scene && name === 'combat' && !o.exact && o.when == null && music.cur && !music.cur.dead && soundingName() === music.scene.track) return music.cur.handle;   // the opening scene owns the music until lift-off
      if (name === 'combat' && !o.exact) name = tierTrack(effTier());   // 'combat' = the current combat tier (tier 1 = combat; a gunship/ramp boost raises it)
      // boost wins over the combat stings (reinforcements, returnTo: 'combat'): while a boost is on they don't interrupt it
      if (music.boost && !o.force && sp0(name) && sp0(name).returnTo === 'combat' && music.cur && !music.cur.dead) { info('music "' + name + '" skipped: boost ' + music.boostEv + ' active'); return music.cur.handle; }
      var key = musicName(name), sp = music.spec, tr = sp && sp.tracks[key], buf = music.buffers[key];
      if (!tr) { info('unknown music slot "' + name + '"'); return null; }
      if (!buf) { info('music "' + name + '" not loaded; staying silent'); return null; }
      // a track already queued to come back after a sting (returnTo) is not restarted when the game asks for it again
      if (music.cur && music.cur.auto && !music.cur.dead && music.cur.name === key && !o.exact && o.when == null) return music.cur.handle;
      var t = o.when != null ? Math.max(o.when, now()) : now(), fade = o.fade != null ? o.fade : 0.5;
      var off = music.fmt[key] === 'm4a' ? (tr.m4aOffsetSec || 0) : 0;
      var src = ctx.createBufferSource(); src.buffer = buf;
      var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.707;
      var lvl = (tr.gain == null ? 1 : tr.gain) * (o.vol == null ? 1 : o.vol), calm = tr.intensity && music.intensity === 'calm';
      f.frequency.value = calm ? cfg.musicCalmHz : 20000;
      var target = lvl * (calm ? dbToGain(cfg.musicCalmDb) : 1);
      g.gain.setValueAtTime(fade > 0 ? 0 : target, t); if (fade > 0) g.gain.linearRampToValueAtTime(target, t + fade);
      src.connect(f); f.connect(g); g.connect(musicOut());
      var end = Infinity;
      if (tr.loop) { src.loop = true; src.loopStart = off + (tr.loopStart || 0); src.loopEnd = off + (tr.loopEnd || (buf.duration - off)); src.start(t, off + (o.offset || 0)); }
      else { var d = tr.dur || (buf.duration - off); src.start(t, off, d); end = t + d; }
      if (music.cur) { stopTrack(music.cur, t, fade); if (music.cur.prev) stopTrack(music.cur.prev, t, fade); }
      var cur = { name: key, src: src, g: g, f: f, start: t, end: end, loop: !!tr.loop, lvl: lvl, intensity: !!tr.intensity, dead: false };
      src.onended = function () { cur.dead = true; if (music.cur === cur) music.cur = null; };
      music.cur = cur;
      var handle = { name: key, start: t, end: end, loop: cur.loop, stop: function (fd) { stopTrack(cur, now(), fd == null ? 0.5 : fd); if (cur.next && cur.next.start > now()) cur.next.handle.stop(fd); if (music.cur === cur) music.cur = null; } };
      cur.handle = handle;
      // 2026-10-20: stings with returnTo (manifest) or { then } crossfade back into that track BEFORE they end, so there is no
      // silence after them (reinforcements -> combat: the combat tier fades in over returnXf s under the band's ring-out).
      var ret = o.then !== undefined ? o.then : tr.returnTo;
      if (!tr.loop && ret && isFinite(end)) {
        var rk = musicName(ret === 'combat' ? tierTrack(music.tier) : ret), xf = tr.returnXf != null ? tr.returnXf : 2.5;
        if (music.buffers[rk] && sp.tracks[rk]) {
          var at = Math.max(t + 0.05, tr.returnAtSec != null ? t + tr.returnAtSec : end - xf), rh = P.playMusic(ret, { when: at, fade: xf, exact: ret !== 'combat' });
          if (rh && music.cur && music.cur !== cur) { music.cur.auto = true; music.cur.prev = cur; cur.next = music.cur; handle.next = rh; }
        }
      }
      return handle;
    };

    // ---------- combat tiers (2026-10-14) ----------
    // manifest.music.combatTiers = ['combat', 'combat_2', ... 'combat_5'] (tier 1..5, rising energy, all -13.6 LUFS).
    // combatMusicTier(n, { waveBreak, force, fade = 2.5 }) changes track at the next PHRASE boundary (phraseBars bars at the
    // track's bpm) with an equal crossfade. Mid-fight it only steps UP; stepping down needs waveBreak (or force).
    // A cooldown (cfg.combatTierCooldownSec, default 25 s) stops it flipping back and forth.
    // setCombatIntensity(level, wave, { waveBreak }) maps player level + wave number to a tier via cfg.combatTierWaves /
    // cfg.combatTierLevels (the minimum wave / level for tiers 1..5); tier = the higher of the two.
    music.tier = 1; music.tierAt = -1e9;
    function tierList() { var sp = music.spec; return (sp && sp.combatTiers) || ['combat']; }
    function tierTrack(n) { var l = tierList(); return l[Math.max(0, Math.min(l.length, n || 1) - 1)]; }
    function thresholdTier(v, th) { var t = 1; for (var i = 0; i < th.length; i++) if (v >= th[i]) t = i + 1; return t; }
    P.combatTierFor = function (level, wave) {
      var tw = thresholdTier(wave || 1, cfg.combatTierWaves || [1, 3, 5, 7, 9]), tl = thresholdTier(level || 1, cfg.combatTierLevels || [1, 6, 11, 16, 22]);
      return Math.min(tierList().length, Math.max(tw, tl));
    };
    P.combatMusicTier = function (n, o) {
      o = o || {}; var max = tierList().length; n = Math.max(1, Math.min(max, Math.round(n || 1)));
      if (!ctx) { music.tier = n; return n; }
      var t = now(), cd = cfg.combatTierCooldownSec != null ? cfg.combatTierCooldownSec : 25;
      P.musicUpdate();
      if (n === music.tier) return n;
      if (n < music.tier && !o.waveBreak && !o.force) return music.tier;              // never step down mid-fight
      if (!o.force && t - music.tierAt < cd) return music.tier;                       // cooldown
      var effBefore = effTier(); music.tier = n; music.tierAt = t;
      if (music.boost && effTier() === effBefore) return n;                            // a boost is holding a higher tier: only the base changes
      n = effTier();
      var c = music.cur; if (!c || c.dead || !c.intensity) return n;                  // not in combat music: next playMusic('combat') picks it up
      var name = tierTrack(n), fade = o.fade != null ? o.fade : 2.5, tr = music.spec.tracks[c.name] || {};
      var phrase = tr.phraseSec || (tr.phraseBars || 4) * 4 * 60 / (tr.bpm || 120), el = t - c.start, when = c.start + Math.ceil(el / phrase) * phrase;
      if (when - t < 0.25) when += phrase;
      if (!music.buffers[musicName(name)]) { info('combat tier ' + n + ' ("' + name + '") not loaded; staying on ' + c.name); return n; }
      P.playMusic(name, { when: when, fade: fade, exact: true }); return n;
    };
    P.setCombatIntensity = function (level, wave, o) { return P.combatMusicTier(P.combatTierFor(level, wave), o); };

    // ---------- event boost (2026-10-20, Blake via Vietnam Vet): CH-46 reinforcement drop-off with UH-1E gunship runs ----------
    // musicEvent('gunship_in')  -> boost = base tier + 1 (next phrase, 2.5 s crossfade), cooldown ignored; music -3 dB under the run
    // musicEvent('ramp_down')   -> boost = tier 5 (at least base + 2, capped at the tier count), 1 s crossfade on the next downbeat
    // musicEvent('liftoff', { delay = 5 }) -> release back to the wave/level tier ~5 s later, 2.5 s crossfade on a phrase,
    //                              allowed outside a wave break; the tier cooldown is reset. The gunship duck is released too.
    // Safety: any boost still on after cfg.musicBoostTimeoutSec (45 s) is released the same way.
    // While a boost is on: setCombatIntensity()/combatMusicTier() only move the BASE tier (the boost holds the higher one);
    // a combat sting (returnTo: 'combat', e.g. reinforcements) asked for during a boost is skipped (the boost wins);
    // a boost that starts while a sting plays hands off at once (1 s crossfade) and cancels the sting's queued return.
    // musicUpdate() runs the release / timeout checks: it is called by every music API, plus a timer on a realtime context;
    // the game may also call it from its tick. musicState() -> { tier, boost, effective, boostEv, releaseAt, boostUntil }.
    cfg.musicBoostTimeoutSec = 45; cfg.musicLiftoffDelaySec = 5; cfg.musicRampFade = 1.0;
    music.boost = 0; music.boostEv = null; music.boostUntil = 0; music.releaseAt = 0; music.boostId = 0;
    // the track actually sounding now (music.cur can be a return queued for later, with the sting/scene as .prev)
    function soundingName() { var c = music.cur; if (!c || c.dead) return null; if (c.start > now() + 1e-6 && c.prev) return c.prev.name; return c.name; }
    function sp0(n) { var sp = music.spec; return sp && sp.tracks ? sp.tracks[musicName(n)] : null; }
    function effTier() { return Math.max(music.tier, music.boost || 0); }
    function nextGrid(c, unitSec, minLead) {
      var t = now(), el = t - c.start, when = c.start + Math.ceil(el / unitSec) * unitSec; if (when - t < minLead) when += unitSec; return when;
    }
    function switchTier(n, fade, grid) {   // grid: 'phrase' | 'beat' | 'now'
      var c = music.cur, name = tierTrack(n);
      if (!music.buffers[musicName(name)]) { info('combat tier ' + n + ' ("' + name + '") not loaded'); return null; }
      if (!c || c.dead) return null;                                   // nothing playing: the next playMusic('combat') starts at the effective tier
      if (c.name === musicName(name) && !c.auto) return null;
      if (!c.intensity) {                                              // a sting (reinforcements) or other track: hand off now
        if (sp0(c.name) && sp0(c.name).returnTo === 'combat') return P.playMusic(name, { fade: Math.min(fade, 1.0), exact: true });
        return null;                                                   // menu / win / loss / extraction: not ours to override
      }
      var tr = sp0(c.name) || {}, beat = 60 / (tr.bpm || 120), phrase = tr.phraseSec || (tr.phraseBars || 4) * 4 * beat;
      var when = grid === 'now' ? now() : grid === 'beat' ? nextGrid(c, beat * 4, 0.08) : nextGrid(c, phrase, 0.25);   // 'beat' = next bar downbeat
      if (grid === 'beat' && when - now() > 1.2) when = nextGrid(c, beat, 0.05);    // free-tempo / slow: next beat instead
      return P.playMusic(name, { when: when, fade: fade, exact: true });
    }
    function armTimer(at, id) {
      if (cfg.musicTimers === false || typeof setTimeout !== 'function' || (typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext)) return;
      var ms = Math.max(0, (at - now()) * 1000) + 30;
      setTimeout(function () { if (music.boostId === id) P.musicUpdate(); }, ms);
    }
    function releaseBoost(why) {
      var was = music.boost; music.boost = 0; music.boostEv = null; music.releaseAt = 0; music.boostUntil = 0; music.tierAt = -1e9;   // cooldown reset
      unhold(duckTargets.music, 'gunship', now(), 0.6);
      if (was && was !== music.tier) switchTier(music.tier, 2.5, 'phrase');
      (music.boostLog || (music.boostLog = [])).push({ t: +now().toFixed(3), ev: 'release', why: why, to: music.tier });
    }
    // ---- opening scene (Blake 2026-10-20): the run's FIRST insertion (CH-46 + door guns) plays the 1921 Edison 'Ride of the
    // Valkyries' (manifest music.scenes.opening -> track 'scene_opening', 76 s, no loop). musicEvent('opening_in') crossfades in over
    // 1.5 s; ramp_down keeps it; liftoff eases into the current combat tier (2.5 s) ~5 s later; if the 76 s run out first it hands
    // off to the current combat tier by itself (returnTo). Gunship duck -3 dB for the scene. Reinforcement drop-offs: no Valkyries.
    cfg.musicSceneTimeoutSec = 100;
    function startScene(name, o) {
      var sp = music.spec, sc = sp && sp.scenes && sp.scenes[name], tk = sc && sc.track;
      if (!tk || !music.buffers[musicName(tk)]) { info('scene "' + name + '" track not loaded; using the tier boost'); return P.musicEvent('gunship_in', o); }
      var t = now(); music.scene = { name: name, track: musicName(tk), t0: t, releaseAt: 0, until: t + (o.timeout != null ? o.timeout : cfg.musicSceneTimeoutSec) };
      hold(duckTargets.music, 'gunship', cfg.gunshipMusicDuckDb, t, 0.3); music.boostId++; armTimer(music.scene.until, music.boostId);
      var h = P.playMusic(tk, { fade: o.fade != null ? o.fade : (sc.fade || 1.5), force: true });
      (music.boostLog || (music.boostLog = [])).push({ t: +t.toFixed(3), ev: 'scene', scene: name, ok: !!h });
      return P.musicState();
    }
    function endScene(why) {
      var sc = music.scene; if (!sc) return; music.scene = null; music.tierAt = -1e9;
      unhold(duckTargets.music, 'gunship', now(), 0.6);
      var c = music.cur; if (c && !c.dead && (c.name === sc.track || (c.auto && c.prev && c.prev.name === sc.track && c.start > now()))) P.playMusic(tierTrack(effTier()), { fade: 2.5, exact: true });
      (music.boostLog || (music.boostLog = [])).push({ t: +now().toFixed(3), ev: 'release', why: why, scene: sc.name, to: music.tier });
    }
    P.musicUpdate = function () {
      if (ctx && music.scene) { var ts = now(); if (music.scene.releaseAt && ts >= music.scene.releaseAt) endScene('liftoff'); else if (ts >= music.scene.until) endScene('timeout'); }
      if (!ctx || !music.boost) return;
      var t = now();
      if (music.releaseAt && t >= music.releaseAt) releaseBoost('liftoff');
      else if (music.boostUntil && t >= music.boostUntil) releaseBoost('timeout');
    };
    P.musicEvent = function (ev, o) {
      o = o || {}; if (!ctx) return null; P.musicUpdate();
      var max = tierList().length, t = now(), target;
      if (ev === 'opening_in') return startScene('opening', o);
      if (music.scene) {   // during the opening scene: the ramp keeps the Valkyries; lift-off eases into combat
        if (ev === 'ramp_down' || ev === 'gunship_in') return P.musicState();
        if (ev === 'liftoff') { music.scene.releaseAt = t + (o.delay != null ? o.delay : cfg.musicLiftoffDelaySec); armTimer(music.scene.releaseAt, music.boostId); return P.musicState(); }
        if (ev === 'release' || ev === 'clear') { endScene('manual'); return P.musicState(); }
      }
      if (ev === 'gunship_in') {
        target = Math.min(max, music.tier + 1);
        hold(duckTargets.music, 'gunship', cfg.gunshipMusicDuckDb, t, 0.3);
      } else if (ev === 'ramp_down') {
        target = Math.min(max, Math.max(max >= 5 ? 5 : max, music.tier + 2));
      } else if (ev === 'liftoff') {
        if (!music.boost) return P.musicState();
        music.releaseAt = t + (o.delay != null ? o.delay : cfg.musicLiftoffDelaySec); armTimer(music.releaseAt, music.boostId);
        (music.boostLog || (music.boostLog = [])).push({ t: +t.toFixed(3), ev: ev, releaseAt: +music.releaseAt.toFixed(3) });
        return P.musicState();
      } else if (ev === 'release' || ev === 'clear') { if (music.boost) releaseBoost('manual'); return P.musicState(); }
      else { info('musicEvent: unknown event "' + ev + '"'); return null; }
      var before = effTier(); music.boost = Math.max(music.boost || 0, target); music.boostEv = ev; music.releaseAt = 0;
      music.boostUntil = t + (o.timeout != null ? o.timeout : cfg.musicBoostTimeoutSec); music.boostId++; armTimer(music.boostUntil, music.boostId);
      if (effTier() !== before || (music.cur && !music.cur.dead && !music.cur.intensity))
        switchTier(effTier(), ev === 'ramp_down' ? cfg.musicRampFade : 2.5, ev === 'ramp_down' ? 'beat' : 'phrase');
      (music.boostLog || (music.boostLog = [])).push({ t: +t.toFixed(3), ev: ev, boost: music.boost, base: music.tier });
      return P.musicState();
    };
    P.musicState = function () { return { scene: music.scene ? music.scene.name : null, tier: music.tier, boost: music.boost, effective: effTier(), boostEv: music.boostEv, releaseAt: music.releaseAt, boostUntil: music.boostUntil, cur: soundingName(), queued: music.cur && !music.cur.dead && music.cur.start > now() + 1e-6 ? music.cur.name : null, log: (music.boostLog || []).slice(-10) }; };
    P.currentCombatTier = function () { return music.tier; };

    // playMenu({ intro = 'menu_intro', loop = intro.next || 'menu', mode = 'crossfade' | 'butt', fade = 1.5 }) (2026-10-14):
    // plays the intro sting, then the menu loop. 'crossfade' starts the loop on the intro's final chord (finalHitSec) with a fade;
    // 'butt' starts it at the intro's end with no fade. If the intro isn't loaded, the loop starts straight away. Returns { intro, loop }.
    P.playMenu = function (o) {
      o = o || {}; if (!ctx) return null;
      var sp = music.spec, iname = o.intro || 'menu_intro', it = sp && sp.tracks[iname], lname = o.loop || (it && it.next) || 'menu';
      var t = o.when != null ? Math.max(o.when, now()) : now();
      var intro = it && music.buffers[iname] ? P.playMusic(iname, { when: t, fade: 0 }) : null;
      if (!intro) return { intro: null, loop: P.playMusic(lname, { when: t, fade: o.fade != null ? o.fade : 0.5 }) };
      var butt = o.mode === 'butt', at = butt ? intro.end : t + (it.finalHitSec || (intro.end - t));
      return { intro: intro, loop: P.playMusic(lname, { when: at, fade: butt ? 0 : (o.fade != null ? o.fade : 1.5) }) };
    };
    P.stopMusic = function (fade) { if (music.cur) { stopTrack(music.cur, now(), fade == null ? 0.5 : fade); music.cur = null; } };
    P.currentMusic = function () { return music.cur && !music.cur.dead ? music.cur.name : null; };
    // combatIntensity('calm' | 'intense', { ramp = 1.0 }): calm = the SAME combat source through a ~700 Hz low-pass at -10 dB
    // (stays in sync; no second file). Remembered, so a later playMusic('combat') starts in that state.
    P.combatIntensity = function (mode, o) {
      o = o || {}; if (mode !== 'calm' && mode !== 'intense') { info('combatIntensity: use calm|intense'); return null; }
      music.intensity = mode; var c = music.cur; if (!c || c.dead || !c.intensity || !ctx) return mode;
      var t = now(), r = o.ramp != null ? o.ramp : 1.0, calm = mode === 'calm';
      c.f.frequency.cancelScheduledValues(t); c.f.frequency.setValueAtTime(c.f.frequency.value, t); c.f.frequency.exponentialRampToValueAtTime(calm ? cfg.musicCalmHz : 20000, t + r);
      c.g.gain.cancelScheduledValues(t); c.g.gain.setValueAtTime(c.g.gain.value, t); c.g.gain.linearRampToValueAtTime(c.lvl * (calm ? dbToGain(cfg.musicCalmDb) : 1), t + r);
      return mode;
    };

    // ---------- misc ----------
    P.stopAll = function (fade) { var t = now(); voices.forEach(function (v) { if (!v.dead) handle(v).stop(fade == null ? 0.05 : fade); }); voices = []; };
    P.activeVoices = function (t) { return activeAt(t == null ? now() : t).length; };
    P.activeByCat = function (t) { var r = {}; activeAt(t == null ? now() : t).forEach(function (v) { r[v.cat] = (r[v.cat] || 0) + 1; }); return r; };
    P.stats = function () { return Object.assign({ active: P.activeVoices() }, stats); };
    // Mix rule check: rifle trim must sit below the Huey, the distant bomb and the voice reference (Gunny).
    P.levelRules = function () {
      var r = SLOTS.m16_single.gain;
      return { rifleBelowHuey: r < SLOTS.huey_rotor_loop.gain && r < SLOTS.huey_flyby.gain,
        rifleBelowBomb: r < SLOTS.bomb_distant.gain, rifleBelowVoice: r < cfg.voiceRefGain,
        stepsBelowRifle: ['step_mud', 'step_boards', 'step_water', 'step_deck'].every(function (k) { return SLOTS[k].gain < r; }),
        rifle: r, huey: SLOTS.huey_rotor_loop.gain, bomb: SLOTS.bomb_distant.gain, voiceRef: cfg.voiceRefGain };
    };
    return P;
  }

  var SamplePlayer = create();
  SamplePlayer.create = create;
  SamplePlayer.WEAPONS = Object.keys(WEAPONS);
  SamplePlayer.SURFACES = SURFACES;
  SamplePlayer.FLYBYS = FLYBYS;
  SamplePlayer.TURRETS = TURRETS;
  if (typeof module !== 'undefined' && module.exports) module.exports = { SamplePlayer: SamplePlayer };
  else root.SamplePlayer = SamplePlayer;
})(typeof window !== 'undefined' ? window : this);
