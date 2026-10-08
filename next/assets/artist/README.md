# Artist Helper — Batch 1 (Vietnam survivor)

All art is original, drawn as data. Nothing here edits `game/index.html`; Lead Developer wires it in.

## Files
| File | What |
|---|---|
| `sprites_batch1.js` | 7 sprites as 11-row x 16-col top grids + per-sprite legends (`B1` object, plus `B1_register`) |
| `ribbons.js` | `RIBBONS` (CAR, PH, BS, SS, NC; full 44x12 + compact 23x6) and `MEDAL_OF_HONOR` (27x48 + locked silhouette) |
| `preview.html` / `preview.png` | Rendered sheet: sprites at 8x and 2x (both leg frames, next to 3 existing sprites for scale), ribbons, rack mock, MoH |
| `gen_ribbons.py`, `validate.js` | Generator for ribbons.js; validator for sprite grid sizes/legend letters (`node validate.js` -> OK) |

## Sprites (same format as `TOP_MARINE` etc.)
`B1.<id> = {top, pal, legs, label}`; `legs` is `'LEGS0'` (all but NVA) or `'LEGS'` (NVA, has the rifle-stock column).
Legends include `P` (trousers) and `B` (boots) for the shared leg grids. The engine adds the dark outline itself.
Drop-in: `SPR.hogston = makeSprites(B1.hogston.top, LEGS0, B1.hogston.pal, 2)` or `B1_register(makeSprites, LEGS0, LEGS, SPR, 2)`.

| id | Notes |
|---|---|
| `hogston` | MSgt. Hogston, USAF: olive patrol cap with OMS patch (4 px `Q K K Q` — a suggestion, not legible text), round face (10 px wide), open collar over white undershirt, E-7 chevrons (`V`) both sleeves, pens in left pocket (`L`), headset round neck (`G`), holstered sidearm; no rifle. |
| `corpsman` | Camo helmet with red cross, tan strap, ivory medical bag with red cross on right hip. |
| `marineWashington` | Dark skin, short hair at sideburns, white mark on helmet cover, cigarette. Same rig as `TOP_MARINE`. |
| `marineMedium` | Medium-brown skin, black hair, rolled sleeves (skin forearms), gold crucifix. Name/background left to Lead Dev + Vet. |
| `marineFair` | Fair skin, red hair, freckles, cigarette pack in helmet band. |
| `nvaRegular` | Tan pith helmet with red star (gold border), khaki-green uniform, tan chest rig, red collar tabs, rifle. |
| `b40` | Highest-contrast enemy: wide brim hat, bright orange scarf, tube on shoulder with big orange/red/yellow warhead sticking out up-right. |

Hogston note: the photo shows the real cap, "OMS" patch, open collar, chevrons, pocket pens. Branch/name tapes are too small to render at 16 px, so they are omitted. The photo is **not** copied into any asset. His face/hair here is a generic stylized round face — not a likeness.

## Ribbons (verified against specs; see Sources)
Pixel = 1/32" in FULL (44x12 = 1-3/8" x 3/8"). COMPACT is rounded by hand for small UI. Rack order, highest first: MoH (medal, not a bar), Navy Cross, Silver Star, Bronze Star, Purple Heart, Combat Action Ribbon.

- **Combat Action Ribbon** — MIL-DTL-11589/171: red edge (1/32+9/32), golden yellow 5/16, center 1/8" tripartite red/white/blue, yellow 5/16, blue 9/32+1/32 edge. Drawn red on viewer's left, blue on the right (matches militarymedals.com, medals.org.uk). Established 17 Feb 1969, retroactive to 1 Mar 1961, so valid for 1968 characters.
- **Purple Heart** — 1/8" white, 1-1/8" purple, 1/8" white (TIOH).
- **Bronze Star** — 1/32 white, 9/16 scarlet, 1/32 white, 1/8 ultramarine blue center, 1/32 white, 9/16 scarlet, 1/32 white (TIOH). *Correction for the team:* the blue stripe is the center; the field is **scarlet**, not "red center, blue edges".
- **Silver Star** — 3/32 ultramarine, 3/64 white, 7/32 blue, 7/32 white, 7/32 Old Glory red (center), mirrored (TIOH). Red center is rounded to 8 px and the 3/64 white to 1 px.
- **Navy Cross** — navy blue with 1/4" white center stripe (MIL-DTL-11589/101E).
- **Medal of Honor (Navy)** — gold five-pointed star on green laurel, suspended by a light-blue neck ribbon with **13 white stars** in three chevrons (TIOH Medal of Honor entry; Navy pattern = neck ribbon). Pad shows 13 single-pixel stars. Anchor suspension is only hinted by the gold loop. `MEDAL_OF_HONOR.locked` is a one-color silhouette for the locked slot.

Colors are sRGB approximations of the thread names (Scarlet, Ultramarine Blue, Navy Blue #1, Bluebird, Purple), not official swatches.

### Sources
- Combat Action Ribbon: https://en.wikipedia.org/wiki/Combat_Action_Ribbon ; https://www.medals.org.uk/usa/usa065.htm ; https://www.militarymedals.com/medals/combat-action-ribbon/ ; spec sheet MIL-DTL-11589/171E (via http://m.mydoc123.com/p-442785.html ; DLA ASSIST https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=9075)
- Navy Cross: https://badgesinsignia.emilspec.com/MIL-DTL-11589-101/index.html ; https://tioh.army.mil (Navy Cross entry)
- Silver Star / Bronze Star / Purple Heart / Medal of Honor: US Army Institute of Heraldry, https://tioh.army.mil/Catalog/Heraldry.aspx ; https://veteranmedals.army.mil
- Navy MoH neck ribbon history: Bureau of Naval Personnel, *Record of Medals of Honor* (Project Gutenberg #45900)

## Needs Vietnam Vet review
1. CAR left/right orientation. Wikipedia says the blue edge is toward the wearer's center; most pictures show red left / blue right as seen by a viewer. I drew red-left/blue-right; if the rack sits on the wearer's left chest, flip with a mirror.
2. Hogston: **USAF utility chevrons color/layout in 1968** (I used pale blue-white `V` on olive; E-7 should be 3 up + 2 rockers + star circle, which doesn't fit at 16 px — only a suggestion), cap color, OMS patch.
3. Corpsman: in the field they wore Marine greens with a Marine helmet; red cross on the helmet and a white-ish bag are gameplay-readable conventions (real corpsmen often removed markings). Confirm acceptable.
4. NVA pith-helmet shade and uniform tone; NVA star border color.
5. B-40: warhead length/color is exaggerated on purpose for readability.
6. Marine variants: who they are (names/hometowns/rank) is Lead Dev + Vet; sprites are only skin/hair/personal-item variants.

## Not done / next
Portraits, character-select art, medal-pin icons, corpse/crater decals, and the Vietnamese pixel font are still pending. Roster variants for the remaining characters (doc, hammer, etc.) can reuse these skin-tone/hair deltas.
