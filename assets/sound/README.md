# Sound cue pack, batches 1 to 3 (42 cues)

Original, synthesized game audio for a 1968 Vietnam-era pixel survivor game. Everything is built live from oscillators and a cached noise buffer. There are no audio files and no samples of real recordings.

## Files
| File | What it is |
|---|---|
| `sound_cues.js` | The pack. Plain JS, no dependencies. Exposes `Cues` (`window.Cues` in a browser, `require('./sound_cues.js').Cues` in node). |
| `preview.html` | Audition page: one button per cue, stress tests, and a level-audition section. Open it in a browser and click any button to unlock audio. |
| `renders/*.wav` | Offline renders of every cue (mono, 44.1 kHz) made by `test/render.js`, for listening without a browser. `batch2_sequence.wav` (reinforcement + medpack) and `batch3_sequence.wav` (medevac) are short timelines through the compressor bus; `batch_sequences.txt` lists what is in them. |
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

## All cues (42): name, tier, what it is
Call each as `Cues.<name>(ctx, dst, ...)`. `Cues.list()` returns this same list at runtime and `Cues.tiers[name]` gives the tier. "Group" is the voice-limit group (see below). "New" marks cues added after batch 1.

| Cue name | Tier | Description |
|---|---|---|
| `lowHealthHeartbeat(rate)` | 1 | lub-dub, faster and slightly higher with rate. Call once per beat, every `heartbeatInterval(rate)` s. |
| `bossSpawn` | 1 | dark drone, two descending horn blasts, war-drum hits (~2.1 s) |
| `b40Launch` | 1 | launch thump, rising rocket whoosh, high pip that cuts through gunfire |
| `tankLost` | 1 | big boom, metal clank, sad two-note descending sting |
| `uiTick` | 1 | tiny click |
| `levelUpSwell` | 1 | rising swell into a bright chord |
| `readyTick` | 1 | soft two-note "ready" tick (air-call cooldown done) |
| `medpackPickup` | 1 | **New.** Warm rising two-note chime (A4 up to E5, triangle + octave-down sine, ~0.9 s). Lower and rounder than `readyTick`, `boardingChime` and `uiTick`. |
| `reinforcementCall` | 1 | **New.** Radio squelch, then a short urgent rising "incoming" sting (square stabs G4-C5-E5, rising whine, un-key click, ~1 s). |
| `medevacCall` | 1 | **New.** Radio squelch, two soft roger pips, then a calm slow falling pair of rounded notes (A4 down to F4) and un-key click (~1.35 s). Deliberately the opposite contour of `reinforcementCall`. |
| `m16` | 2 | sharp high crack |
| `m60` | 2 | slow heavy chatter; opts `shots` (default 3, about 9 rounds/s) |
| `m79` | 2 | hollow thunk, then the burst; opts `burst:false`, `delay` |
| `ak47` | 2 | deeper than `m16` (lower crack band, heavier body, longer tail) |
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

Counts: 10 tier 1, 20 tier 2, 12 tier 3 = 42 cues (the six `death*` cues share one table row).

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

## Test status (honest)
Done and passing (latest run: `node render.js` passed 6 runs in a row, `node browser_check.js` passed):
- `node --check` and a full `require` of `sound_cues.js` under Node.
- **Offline render in Node** with `node-web-audio-api` (a Rust implementation of the Web Audio spec, not a browser). All 42 cues plus 9 variants rendered with no NaNs, peaks under 0.99 (largest single cue about 0.84) and non-silent output. Cues end inside their declared durations. The WAVs are in `renders/`.
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
- **Headless Chrome** (`google-chrome` through puppeteer-core): `preview.html` loads, all 60 buttons were clicked with no page or console errors, and all 42 cues rendered offline in Chrome's own Web Audio with no NaNs or clipping.
- Test-harness fix: `test/render.js` now copies each rendered channel (`Float32Array.from`). Earlier, analyses done after later renders occasionally read garbage because the view from `getChannelData` can alias native memory that has been freed. The cues themselves were not the cause (1,500+ repeated renders of every cue and the sequences showed no blow-ups).

Not tested:
- **Nobody has listened to these.** The renders were never auditioned by a human. Every claim above about "warm", "calm", "urgent", "shimmering", "soft" and "whop-whop" is an intention backed only by the measurements listed, such as pitch contour, spectral centroid, envelope shape and rotor-rate modulation. Whether the helicopters read as Hueys, whether `medpackPickup` feels rewarding, and whether `medevacHeal` sounds like healing are unjudged. Treat the synthesis parameters as a first draft to tune by ear.
- Playback on real speakers, iPhone Safari (first-tap unlock, performance) and heavy-fight CPU cost with hundreds of concurrent voices. The source counts above are counts of audio nodes, not measured CPU.
- How the new cues sit against the real mix (music, ambience, the colonel's voice, gunfire). Levels were only compared with the other cues in this pack.
- The "Real clip" loader (no real file was available).
- Historical accuracy of the sound descriptions has not been reviewed by Vietnam Vet.
- Nothing is wired into the game; no game files were edited.

Re-run the checks: `cd test && npm install && node render.js && node browser_check.js` (the second needs Chrome at `/usr/bin/google-chrome`).
