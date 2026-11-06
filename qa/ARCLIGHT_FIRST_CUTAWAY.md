# rc8.4 first B-52 cutaway patch

Base: `c82ab0a` (stamp), parent `fc7fa9f` (Hanoi Hannah code).

## Scope and discovery
The current preview did **not** contain Cutaway, cutOnce, cutSeen, the power-up-cutaway setting, or napalm/Spooky/howitzer cutaway triggers. Those were only on the separate historical rc8.2/cutaway branch. This patch ports only the shared pause/skip controller from there; it does not merge that branch or change the other weapons. Default controller clamp remains 4 seconds; Arc Light alone registers durMs/maxMs = 16100. The first-activation picture is the trailer cinematic `assets/video/arclight_v3_12h_final_v5` (muted HTML video, webm with mp4 fallback), not the procedural ARCLIGHT_ART stand-in.

Base Arc Light and Box Mission both call cutOnce('arclight', existingEffect). The callback preserves the original effect, timings, bomb counts, rumble and announcements, capturing `id` instead of the transient CURW global. On first call the weapon/update loops return immediately; state=cutaway gates all subsequent sim updates. Finish/skip restores play, offsets the spec-op wall clocks, stops/unducks the mix and invokes the effect once. Subsequent calls share G.cutSeen.arclight and add no sequence, voice or captions. A new run gets a fresh flag.

The original lco_cutaways key (default on; ?cutaways=0/1 override) is supported with menu and pause switches. __simHold bypasses the shot, as does demo play. Skip: keyboard, click/tap, gamepad A/Start edge, after 250ms, with a 280ms exit fade. Both existing debug hooks are available (?cutaway=arclight and __lco.cutaway('arclight')). Debug playback does not consume the gameplay first-call flag.

## Audio
Only the shipping main-take `arclight_cutaway_30s_v4.ogg/.m4a` was copied. Both ffprobe durations are **30.000000 seconds**. Copied hashes match SOURCES.md v4/v6 render, not older/library/alternate voices:
- ogg: 8ab3ae53b18c4057790b9482ee19eae947321286dde2a7214963690158026c69
- m4a: 0ad4ceb5316b50768979eed3394aa22ad97576cd8971e88784a717c41fd77b8c

The mix includes the final designed Golf Six, Hollis, pilot tanker tribute, co-pilot, Skyspot and bombs-away VO plus baked FX/music. It is played without pitch variation or a second radio FX pass. Playback syncs to trailer practice: picture t=0 is mix t=9.95 (cut to bomber). SamplePlayer plays the v4 buffer from offset 9.95 for 16.10 seconds (mix 9.95 through 26.05), covering the tanker tribute, run-in, Skyspot, bombs away, and the short post-bomber tail. Golf Six and Hollis (0–9.88) are not played over the bomber picture. The mp4/webm files are encoded without an audio track; the clip's original voices are discarded. Loading is prewarmed and a cold call stays paused until the mix and cinematic are ready, then gets the full 16.10 seconds. Skip while loading cancels late playback. If the video fails, the shot stays black with chatter rather than falling back to the drawn stand-in.

ARC_LIGHT_TIMING.md still has a stale 'planned' v4 heading; SOURCES.md's final render section and the actual shipping files confirm completion. Source log says HAA/Legal review of the designed voices is pending; the license row records this honestly. No Steam/release clearance is implied.

## Verification
Run `node qa/arclight_first_cutaway.js`: **29 checks pass**. This compiles all 77 inline scripts and executes the actual current controller and entire updateWeapons function in an isolated VM with mocked audio/render/video dependencies and a fake monotonic clock. Checks cover first calls in either order, trailer file and 9.95/16.10 sync, complete duration beyond 3.2s through 16.099s, natural end, exact original effect fields, once-per-run shared flag, keyboard/tap skip, off toggle persistence, simHold bypass, simultaneous readiness, cold load and skip-while-loading, spec-op wall pause and frame/input wiring. The update guard is directly executed; frame wiring is checked structurally.

No browser/Playwright/audio-listening playthrough was run. QA should verify the full audio and visual experience in a real browser, including that the trailer cinematic plays (not the drawn B-52s), that chatter starts on the tanker tribute rather than Golf Six, pad skip, and menu layout. Existing bombs/effects retain their original 2.6s inbound delay after the sequence exits. The shared /workspace/builds/CUTAWAY_SLOTS.md describes this 16.10 s cinematic slot.

No build stamping: the in-page stamp still names fc7fa9f until the producer stamps an approved code commit. No push, PR, Pages deployment or Steam changes. rc8.3/patch and rc8.4/hanoi-hannah pointers stay unchanged.
