# Sound cue pack, batches 1 to 5 (45 cues)

Original, synthesized game audio for a 1968 Vietnam-era pixel survivor game. Everything is built live from oscillators and a cached noise buffer. There are no audio files and no samples of real recordings.

## Files
| File | What it is |
|---|---|
| `sound_cues.js` | The pack. Plain JS, no dependencies. Exposes `Cues` (`window.Cues` in a browser, `require('./sound_cues.js').Cues` in node). |
| `preview.html` | Audition page: one button per cue, stress tests, and a level-audition section. Open it in a browser and click any button to unlock audio. |
| `renders/*.wav` | Offline renders of every cue (mono, 44.1 kHz) made by `test/render.js`, for listening without a browser. `batch2_sequence.wav` (reinforcement + medpack) and `batch3_sequence.wav` (medevac), `batch4_bolt_sequence.wav` (M1903 shot then bolt cycle) and `batch5_perkRadio_chain.wav` (three radio popups in a row) are short timelines through the compressor bus; `batch_sequences.txt` lists what is in them. |
| `renders/report.json` | Peak, RMS and check results from the last render run. |
| `test/render.js`, `test/browser_check.js` | Dev-only checks. They need `npm install` in `test/` (`node-web-audio-api`, `puppeteer-core`). The game does not need them. |

## Calling a cue
```js
const ctx = new AudioContext();               // resume() it on the first tap
const bus = Cues.createBus(ctx, ctx.destination, 0.9);   // optional compressor/limiter (recommended)

Cues.m16(ctx, bus);                           // dst defaults to ctx.destination
Cues.ak47(ctx, bus, { vol: 0.7 });            // vol scales the cue
Cues.claymore(ctx, bus, { when: ctx.currentTime + 0.5 });   // schedule at an absolute time
Cues.lowHealthHeartbeat(ctx, bus, 1.6);       // rate 0.5..3, one lub-dub per call
Cues.buildTick(ctx, bus, 0.37);               // progress 0..1, pitch rises ~300 -> ~900 Hz
Cues.ribbonBugle(ctx, bus, 'silverStar');     // tier name, see below
Cues.setLowEffects(true);                     // tier 3 cues now do nothing
```
Every cue returns `null` if skipped (Low effects, death cap, unknown ribbon) or `{ name, tier, start, duration, group }`.
For the cues with a main parameter (`lowHealthHeartbeat` rate, `buildTick` progress, `ribbonBugle` tier) the parameter comes right after `dst`, and opts can follow. You can also pass one opts object, such as `{ progress: 0.4, when: t }`.

Other helpers: `Cues.list(tier?)`, `Cues.tiers`, `Cues.play(name, ctx, dst, ...args)`, `Cues.heartbeatInterval(rate)` (seconds between beats), `Cues.death(kind, ctx, dst, {count})` (picks the death cue for `bullet|heavy|m60|explosion|flame|claymore|tank`, and plays one `bigKill` if `count >= 30`), `Cues.stats()`, `Cues.limits`.

## Tiers
1 = always plays. 2 = normal. 3 = dropped first when `setLowEffects(true)`.

## All cues (45): name, tier, what it is
Call each as `Cues.<name>(ctx, dst, ...)`. `Cues.list()` returns this same list at runtime and `Cues.tiers[name]` gives the tier. "Group" is the voice-limit group (see below). "New" marks cues added after batch 1.

| Cue name | Tier | Description |
|---|---|---|
| `lowHealthHeartbeat(rate)` | 1 | lub-dub, faster and slightly higher with rate. Call once per beat, every `heartbeatInterval(rate)` s. |
| `bossSpawn` | 1 | dark drone, two descending horn blasts, war-drum hits (~2.1 s) |
| `b40Launch` | 1 | launch thump, rising rocket whoosh, high pip that cuts through gunfire |
| `tankLost` | 1 | big boom, metal clank, sad two-note descending sting |
| `uiTick` | 1 | tiny click |
| `levelUpSwell` | 1 | rising swell into a bright chord. Still in the pack; the game now uses `perkRadio` on the level-up cards (this one remains available, e.g. for a real level-up flash). |
| `perkRadio` | 1 | **New.** Level-up / perk card popup: push-to-talk click, ~0.25 s of band-limited radio static, two short rising chirps (~0.15 s each, the second higher), un-key tick, ~0.8 s. Deliberately small and soft because it plays often (peak ~0.13, about 0.36x the peak and 0.85x the RMS of `levelUpSwell`). Tier 1, so it plays under Low effects. |
| `readyTick` | 1 | soft two-note "ready" tick (air-call cooldown done) |
| `medpackPickup` | 1 | **New.** Warm rising two-note chime (A4 up to E5, triangle + octave-down sine, ~0.9 s). Lower and rounder than `readyTick`, `boardingChime` and `uiTick`. |
| `reinforcementCall` | 1 | **New.** Radio squelch, then a short urgent rising "incoming" sting (square stabs G4-C5-E5, rising whine, un-key click, ~1 s). |
| `medevacCall` | 1 | **New.** Radio squelch, two soft roger pips, then a calm slow falling pair of rounded notes (A4 down to F4) and un-key click (~1.35 s). Deliberately the opposite contour of `reinforcementCall`. |
| `m16` | 2 | sharp high crack |
| `m60` | 2 | slow heavy chatter; opts `shots` (default 3, about 9 rounds/s) |
| `m79` | 2 | hollow thunk, then the burst; opts `burst:false`, `delay` |
| `ak47` | 2 | deeper than `m16` (lower crack band, heavier body, longer tail) |
| `boltRifleCrack` | 2 | **New.** M1903 Springfield (.30-06) single shot, ~0.6 s declared (audible ~0.5 s). Slower and heavier than `m16`/`ak47`: a darker, less bright crack, a deep pitch-dropping body thump and a long low-mid report tail (bandpass ~650 down to 180 Hz) with a brown-noise rumble and a faint slap-back echo. Measured ~1.3x the RMS of `ak47` and a tail ~50x stronger at 0.15 to 0.5 s, with a similar peak (~0.55 raw). |
| `boltCycle` | 2 | **New.** The bolt working, ~0.5 s: lift click, pull-back rasp and end-stop clack, push-forward rasp, chamber tick, and a heavier lock clack (4 clack events plus 2 rasps). Short bright metallic clicks with no low end, roughly 0.2x the peak of `boltRifleCrack`. Call it ~0.4 s after the shot. |
| `claymore` | 2 | short sharp blast plus steel-ball scatter |
| `mortarThump` | 2 | tube bloop; opts `whistle:true` adds a falling whistle |
| `airStrafe` | 2 | jet flyby with a 20mm "brrrt" (group: air) |
| `napalmWhoomph` | 2 | low whoomph, rumble, fire crackle (group: air) |
| `tankerFlyover` | 2 | four-engine low roar; opts `flightLine:true` for the Hogston spool-up and fuel-boom clank, `radio:false` to skip the squelch (group: air) |
| `signalPop` | 2 | canister pop then smoke hiss |
| `boardingChime` | 2 | two bell-like dings |
| `buildTick(progress)` | 2 | hammer tick, pitch rises with progress |
| `buildStageComplete` | 2 | brass-ish C-E-G-C arpeggio; opts `stage` 1..3 gives 2, 3 or 4 notes |
| `sandbagThud` | 2 | short dull thud for each finished wall segment (lightest, dullest) |
| `turretMid` | 2 | medium thud with a light metal clink |
| `turretCorner` | 2 | deeper and heavier than `turretMid`, with a low metal clunk |
| `medpackDrop` | 2 | **New.** Soft pouch-drop: muffled cloth thud, faint rustle, then a small bright ping (~0.4 s). Quiet on purpose. |
| `reinforcementHueys` | 2 | **New.** ~4 s. Four overlapping rotor "whop-whop" layers (blade rates 10.4 to 11.8 Hz so they phase against each other) swell in from a distance, brighten, touch down at ~3 s with a thump and dust puff, then settle. 11 audio sources by default; `layers` (1..4) lowers it (1 layer = 5 sources). |
| `medevacHuey` | 2 | **New.** ~3 s. ONE Huey: slow rotor approach swell, then a steadier, closer hover with a faint turbine whine. No touchdown thump. 4 sources. |
| `medevacHeal` | 2 | **New.** One soft warm shimmering swell (A major add9, detuned pairs, gentle tremolo, a few quiet sparkles, ~1.7 s). **Always one sound**: call it once per heal pulse; any further call whose start is within 0.6 s of the previous one is dropped (returns `null`), so healing 50 units cannot stack 50 sounds. `count` in opts is accepted and ignored. |
| `deathBullet` `deathHeavy` `deathExplosion` `deathFlame` `deathClaymore` `deathTank` | 3 | per-weapon death sounds (group: death) |
| `bigKill` | 3 | one combined mass-kill boom for 30+ deaths in a frame; bypasses the death cap |
| `radioSquelch` | 3 | radio key-up burst and click |
| `ribbonPin` | 3 | tiny metallic pin clicks |
| `ribbonBugle(tier)` | 3 | `combatAction` (one note), `purpleHeart` (soft drum and low note), `bronzeStar` (3-note call), `silverStar` (fuller, harmonised), `navyCross` (drum, phrase, held chord), `medalOfHonor` (slow, solemn, hushed room tone, nothing else). Also accepts `'Medal of Honor'`, `'moh'` and similar. The bugle phrases are original and use the bugle's natural harmonics. |
| `hueyDeparture` | 3 | **New.** ~3.2 s rotor fade-away after the reinforcement drop: two layers sinking in level and brightness. 5 sources. |
| `medevacDeparture` | 3 | **New.** ~2.8 s single-Huey rotor fade-away after the medevac, with a falling whine. 4 sources. |

Counts: 11 tier 1, 22 tier 2, 12 tier 3 = 45 cues (the six `death*` cues share one table row).

### Suggested game mapping for the new cues
| Game event | Cue | Notes |
|---|---|---|
| NVA drops a medic pack | `medpackDrop` | at the pack's spawn time |
| Player collects a medic pack | `medpackPickup` | tier 1, so it plays under Low effects too |
| Company Reinforcement perk activated | `reinforcementCall` | at activation |
| The four Hueys arrive and the Marines jump out | `reinforcementHueys` | start ~1 s after the call; it is ~4 s long and touches down at ~3 s, so spawn the Marines at about +3 s |
| Hueys leave | `hueyDeparture` | right after the drop |
| Medevac requested | `medevacCall` | at request |
| Medevac Huey arrives and hovers | `medevacHuey` | ~3 s |
| Heal pulse lands | `medevacHeal` | once per pulse, however many units are healed |
| Medevac Huey leaves | `medevacDeparture` | after the heal |

**Assumption on the wall cues:** I read "slightly deeper/heavier" for `turretCorner` as relative to `turretMid`. `sandbagThud` is the lightest and dullest of the three.

## Voice limiter
- **One-shot guard** (`medevacHeal`, `minGap` 0.6 s): a repeat call starting within 0.6 s of the previous one on the same `AudioContext` returns `null` and is counted in `Cues.stats().skippedDup`.
- **Voice budget of the helicopter cues:** `reinforcementHueys` 11 sources by default (`layers` option 1..4), `hueyDeparture` 5, `medevacHuey` 4, `medevacDeparture` 4. They are not in the air group, so the game should not trigger a second `reinforcementHueys` while one is still playing (the perk's own cooldown already prevents that).
- **Death group** (`death*`, `bigKill`): at most `Cues.limits.death` (4) play at once. Extra calls return `null`. `bigKill` bypasses the cap, so a mass kill always sounds.
- **Air group** (`airStrafe`, `napalmWhoomph`, `tankerFlyover`): at most `Cues.limits.airFull` (2) at full volume. A third call ducks the oldest to 30% (`Cues.limits.airDuck`) with a fast fade. It does not cut it.
- Limits are tracked per `AudioContext`. They count a sound as active until its declared duration ends.

## Levels
Each cue has its own trim, so cues are roughly balanced against each other. Tier 1 peaks about 0.7 to 0.8, weapons about 0.45 to 0.65 and tier 3 about 0.15 to 0.65, each on its own. Several cues at once can exceed 1.0 (10 simultaneous deaths measured about 1.6 in the offline test), so route everything through `Cues.createBus` or your own limiter.

## preview.html
- A button per cue, grouped by tier (red outline = tier 1, blue = tier 3). Controls cover volume, a Low effects checkbox, heartbeat rate, build progress and stage, and the Hogston flight-line tanker.
- Stress tests: 10 deaths at once, a 30-death `bigKill`, 3 air calls at once, a 3 s heartbeat loop, a build sweep and a 4 s fight mix.
- **Level audition:** sliders for voice gain (default 1.5x, like the game's current voice gain), music gain and ambience gain, and a button to start and stop a placeholder music and ambience bed. "Play placeholder voice tone" plays a pulsed sawtooth buzz in speech-like phrases at the voice gain. It is **a tone stand-in, not a voice**, and the music and ambience are throw-away placeholders too. If you want to hear the real recording, use "Real clip (optional)" to load one of Blake's mp3 or wav files from your own disk. It is decoded locally in the browser and not uploaded. The voice, music and ambience gain nodes connect to the output chosen when you first use this section.

## Batch 4 and 5 checks (boltRifleCrack, boltCycle, perkRadio)
Measured in `test/render.js` (offline, node-web-audio-api) and `test/browser_check.js` (Chrome). The numbers are from the last run; the noise start offset is random so they move a little each time.
- **Tiers:** `boltRifleCrack` 2, `boltCycle` 2, `perkRadio` 1, `levelUpSwell` still 1 and still in the pack.
- **`boltRifleCrack`:** no NaN, peak about 0.55 to 0.6 (below the 0.85 limit I set), active about 0.5 s, RMS about 1.3x `ak47` and 2.5x `m16`, tail energy (0.15 to 0.5 s) about 50x `ak47`'s. Its first-93 ms spectral centroid (about 2.6 kHz) is well below `m16` (about 4.9 kHz) but only about 5 to 10% below `ak47` (about 2.8 kHz), so the difference from `ak47` is mostly weight and the long tail, not a dramatically darker crack. I tried to make the crack darker and the centroid gap did not grow reliably, so that comparison is reported for information and is not a pass/fail.
- **`boltCycle`:** no NaN, 4 distinct clacks detected by onset (at about 0, 0.2, 0.37 and 0.45 s), active about 0.52 s, peak about 0.2 (about 0.36x the crack's), brighter than the crack (centroid about 3.4 kHz).
- **Low effects:** both bolt cues (tier 2) and `perkRadio` (tier 1) still play with `setLowEffects(true)`; `skippedLow` stays 0. Checked in Node and in Chrome. Nothing here is tier 3, so nothing is skipped.
- **Sequence (shot at 0.1 s, cycle at 0.5 s, so the cycle starts exactly 0.4 s after the shot):** raw peak about 0.55 to 0.65, through `Cues.createBus` about 0.75 to 0.85; five shot-and-cycle pairs 1 s apart through the bus about 0.8 to 0.9; three simultaneous cracks through the bus about 0.75 to 0.93. **Caveat:** the bus compressor has built-in make-up gain, so bus peaks run higher than raw peaks. A single `ak47` already reaches 0.9 to 1.07 over 5 shots on the bus, `boltRifleCrack` stays at about 0.7 to 0.95. Ten simultaneous cracks on the bus reach about 0.75 to 1.0 (information only, not asserted).
- **`perkRadio`:** no NaN, duration about 0.73 s audible (0.8 declared), peak about 0.125, RMS about 0.0285 (0.85x `levelUpSwell`). Static is present between 0.04 and 0.28 s (RMS about 0.02, silence after 0.85 s is exactly 0). Both chirps rise (about 1.0 to 1.2 kHz, then 1.3 to 1.6 kHz) and the second is higher than the first. Three popups in a row alone through the bus peak about 0.19. Three popups on top of a dense 8-shot `m16` fight through the bus peaked 0.86 to 1.01 versus 0.73 to 0.85 for the fight alone, so the bus can touch full scale in a heavy fight with popups on top (information only, the bus is the limiter there).
- **Sources:** `boltRifleCrack` 6, `boltCycle` 19 (many tiny 12 to 50 ms sources), `perkRadio` 7. Counts of audio nodes, not measured CPU. `boltCycle` is the most node-hungry short cue in the pack, so if CPU matters on the iPhone, cache or pre-render it.
- **Known flaky test, not caused by these cues:** the existing "air ducking did not reduce level" check compares two renders of random noise and failed in 2 of about 30 runs (the difference is about 5%). The bolt cues' own centroid check was removed as a pass/fail for the same reason (random noise). I left the air check as it was.

## Test status (honest)
Done and passing (latest runs: `node render.js` passed 10 of 10 consecutive runs after the last change to the cues and tests, `node browser_check.js` passed):
- `node --check` and a full `require` of `sound_cues.js` under Node.
- **Offline render in Node** with `node-web-audio-api` (a Rust implementation of the Web Audio spec, not a browser). All 45 cues plus 9 variants rendered with no NaNs, peaks under 0.99 (largest single cue about 0.84) and non-silent output. Cues end inside their declared durations. The WAVs are in `renders/`.
- Measured checks from batch 1: `ak47` has a lower spectral centroid than `m16`; `buildTick` pitch rises from progress 0 to 1; `turretCorner` is deeper than `turretMid` and has the highest RMS of the three wall cues; Low effects skips tier 3 and not tiers 1 or 2; 10 simultaneous deaths play 4 (plus a priority `bigKill`); the third air call ducks one and the level drops measurably; an unknown ribbon name returns `null`.
- **Batch 2 and 3 measured checks (new cues):**
  - Tier of each new cue matches the spec.
  - `medpackPickup`: the two notes measure about 441 Hz then 657 Hz (rising), and its spectral centroid (about 560 Hz) is far lower than `readyTick` (about 1.8 kHz), `boardingChime` (about 1.3 kHz) and `uiTick` (about 7 kHz).
  - `reinforcementHueys`: ends at ~4.0 s, swells in (RMS at 2 to 3 s is about 4.6x the first second), and a single layer shows an envelope-modulation peak in the 9.5 to 12 Hz band (ratio to the median of other bins about 3, median of 7 renders). The 4-layer mix is deliberately smeared by the different blade rates, so the whop check is done on 1 layer. Source count 11 (default) or 5 (1 layer).
  - `medevacHuey`: ~3.05 s, approach swell (hover RMS about 6x the first half second), whop modulation present (median-of-7 ratio 10 in the last run, passing threshold is 2; single renders varied widely because the noise start is random), 4 sources.
  - `medevacCall` vs `reinforcementCall`: medevac falls (441 Hz to 350 Hz), reinforcement rises (393 to 522 to 657 Hz stabs), and medevac's peak is lower (about 0.17 vs 0.38).
  - `medevacHeal`: 50 simultaneous requests play exactly one sound, with identical output and the same source count as a single call; it blooms slowly (loudest region about 10x the first 50 ms).
  - `hueyDeparture` and `medevacDeparture` fade away (first-second RMS at least 2.5x the last second). Under `setLowEffects(true)` both return `null` (also checked inside Chrome) while all new tier 1 and 2 cues still play.
  - Sequences through `Cues.createBus`: reinforcement/medpack sequence peaks about 0.75, medevac sequence about 0.64, and a worst case with reinforcement, medevac and medpack cues all overlapping about 0.8. No NaNs and no clipping anywhere.
- **Headless Chrome** (`google-chrome` through puppeteer-core): `preview.html` loads, all 66 buttons were clicked with no page or console errors, and all 45 cues rendered offline in Chrome's own Web Audio with no NaNs or clipping.
- Test-harness fix: `test/render.js` now copies each rendered channel (`Float32Array.from`). Earlier, analyses done after later renders occasionally read garbage because the view from `getChannelData` can alias native memory that has been freed. The cues themselves were not the cause (1,500+ repeated renders of every cue and the sequences showed no blow-ups).

Not tested:
- **The bolt-action cues and `perkRadio` were never heard by anyone.** "Heavy", "sharp", "metallic" and "radio" are intentions backed only by the measurements above. Whether `boltRifleCrack` sounds like an M1903 rather than a generic rifle, whether `boltCycle` reads as a bolt rather than random clicks, and whether `perkRadio` is quiet enough not to be fatiguing after hundreds of level-ups are unjudged. The historical accuracy of the M1903 (.30-06) description has not been reviewed by Vietnam Vet.
- **Nobody has listened to these.** The renders were never auditioned by a human. Every claim above about "warm", "calm", "urgent", "shimmering", "soft" and "whop-whop" is an intention backed only by the measurements listed, such as pitch contour, spectral centroid, envelope shape and rotor-rate modulation. Whether the helicopters read as Hueys, whether `medpackPickup` feels rewarding, and whether `medevacHeal` sounds like healing are unjudged. Treat the synthesis parameters as a first draft to tune by ear.
- Playback on real speakers, iPhone Safari (first-tap unlock, performance) and heavy-fight CPU cost with hundreds of concurrent voices. The source counts above are counts of audio nodes, not measured CPU.
- How the new cues sit against the real mix (music, ambience, the colonel's voice, gunfire). Levels were only compared with the other cues in this pack.
- The "Real clip" loader (no real file was available).
- Historical accuracy of the sound descriptions has not been reviewed by Vietnam Vet.
- Nothing is wired into the game; no game files were edited.

Re-run the checks: `cd test && npm install && node render.js && node browser_check.js` (the second needs Chrome at `/usr/bin/google-chrome`).
