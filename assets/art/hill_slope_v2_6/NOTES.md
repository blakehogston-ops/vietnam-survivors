# hill_slope_v2_6 — CONCEPT, nothing committed. v2.5 (AD-approved tones) + AD grass fix + pixel-level readability fix + HAA laterite polish (partial). v2.5 and earlier untouched.
Build order:
1. `OUTP=ingame_panel_hill_slope_v2_6_raw.png GROUNDOUT=/tmp/v26_ground.png python3 make_hill_slope_v2_6.py panel`
2. `python3 burn_edge_v2_6.py` (the v2.4.1 ragged burn edge)
3. `python3 ground_fix_v2_6.py /tmp/v26_ground.png` (writes ground_fix_output.txt)
4. `python3 make_hill_slope_v2_6.py palette` + `bash /workspace/qa/readability_gate/gate.sh palette_hill_slope_v2_6.png`
5. `python3 make_crops_compare_v2_6.py`
Kept from v2.5: layout, craters, ejecta, burn plot + ragged edge, defoliated patch, olive/khaki ground, straw tones, clump positions (17).

1 Elephant grass: new grass_wind_v4.py replaces the domes.
- One wind direction (to screen-right); the lean amount varies per clump (.15-.75) and per blade. Never mirrored.
- 3-7 sub-tussocks of random height give an irregular silhouette, with blades fanning out and ragged strays.
- 22% of blades droop at the tip. 0-6 tall seed-head stalks per clump, with plumes trailing downwind.
- Rooting: blade bases are scattered vertically (no common baseline), many short tufts lean the same way past the clump edge, and the root shadow is ragged rather than an ellipse.
- Size, height, lean, density and seed count are randomised per clump.

2 Readability: docscore.py re-implements gate.sh's metric read-only (measure_helmet.py --v21: max(figure, opaque outline #1a1c12, rim) WCAG contrast). gate.sh is not edited.
- ground_fix_v2_6.py builds the ground mask: pixels equal to the exported ground layer, lit or uniformly shadowed, plus the burn-edge zone. That is 66.9% of the panel.
- It nudges every failing ground colour by the smallest uniform darken/lift (same hue) to reach Doc & NVA >= 3.27 after rounding.
- The ground layer also gets the same fix before sprites go on.

| Pixel-level, all ground px (842,830) | before fix | after fix |
|---|---|---|
| Doc min | 2.91 | 3.23 |
| Doc % below 3.25 | 4.743% | 0.007% (~60 px) |
| Doc % below 3.2 | 3.436% | 0 |
| NVA min | 3.24 | 3.24 |
| NVA % below 3.25 | 0.252% | 0.007% |
| Nudged colours | 13,671 of 69,310 | mean change 3/255 |

Reference, v2.5 ground: about 5.8% below 3.25, min 2.91.
Whole panel including sprites (grass, scrub, figures; not ground): Doc min 2.91, 4.8% below 3.25. These are sprite pixels, not standing ground.

Standard gate (gate_output.txt): PASS, Doc 3.25 / NVA 3.25, lowest #8f6146 (the laterite mean). This is exactly on the floor.

3 HAA laterite polish (darken the light tone about 10%, a touch redder, same saturation): only partly possible.
- lat_tone hue target 24.5° -> 23°. The light tone (Y>95) is darkened by LDK.
- LDK=.10 failed the palette gate: the laterite mean dropped to #855b41 = 2.93 FAIL.
- The laterite mean can only darken about 1.2% before Doc drops below 3.25 (×0.9875 = 3.254), so LDK=.012.
- With the ground fix and the hue change, the rendered light laterite moves #9d7551 (h 28.7°, s .48, Y 125.1) -> #996f4e (h 26.6°, s .49, Y 120.3). That is about 4% darker and 2° redder, with saturation unchanged.
- All laterite: #826041 -> #815e40.
- Going further needs the gate floor relaxed, or the light tone stepped across Doc's band (about 20% darker), which would change the art.

Weak spots (honest, 1x):
- Seed heads and drooping tips mostly read only at 2x. At 1x the clumps read as ragged, leaning tussocks, but some are still fairly soft masses.
- About 60 ground px remain at 3.23-3.24 (Doc and NVA pull opposite ways on those colours).
- The palette gate sits exactly at 3.25.
- The ground mask is heuristic: ground fully covered by semi-transparent sprite edges isn't fixed, and it's counted as sprite.
