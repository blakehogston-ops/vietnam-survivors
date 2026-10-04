# Tester feedback plan (Oct 3, 2026). PLAN ONLY, nothing built yet.
Sizes: S = under an hour, M = a few hours, L = a day-sized chunk. Order is cheapest and highest impact first.

## Batch 1: quick wins (all S; ship together)
1. No punji pits inside the firebase. Pit spawner skips the square (FBW + margin) around any active firebase; delete pits already inside when it is secured.
2. Flamethrower: range about 2x, more damage per tick, wider flame sprite so the range reads. Gamer re-checks balance.
3. Menu text: shorten instructions to 3-4 bullet lines, larger font (min 16 px on phones), full detail behind a "?" or "How to play" screen.
4. Item cards: one-sentence plain summary on the card, long blurb moved to a tap/hover "details" area.
5. Declutter gibs: cap body parts per kill, shorter life, fade faster, fewer on screen (hard cap 40), and Low effects uses none. Keep blood decals but dimmer.
6. Make the player obvious (already in backlog): ring + name tag, allies slightly dimmed.
7. Steel-plate boots support item (historically, Panama-sole boots): makes the player immune to punji pits (Vietnam Vet to confirm the name).

## Batch 2: clarity and level-up depth (M)
8. Level-up slot limits per category (example: 5 weapons, 5 support items). Once full, level-up offers only upgrades for owned items, so max levels and evolutions arrive sooner. Needs Blake/Gamer to pick the numbers.
9. Icons: redraw/recolor so each weapon and support item has a unique silhouette and color family (Artist Helper). Weapons = red/orange frame, support = blue/green frame.
10. Declutter the screen in general: fewer overlapping effects, enemy hit flashes simpler, cap simultaneous tracers/smoke, enemy outlines vs. ground contrast, damage numbers off by default. Needs a playtest pass with screenshots at 300+ enemies.
11. Tutorial: first run only, 4-5 short prompts (move, collect XP, pick an item, radio the LZ, extraction) with a skip, plus a "Tutorial" button on the menu. Mobile and controller prompts differ.
12. Firebase walls: bigger footprint OR 2-3 concentric wall layers (inner sandbags, outer wire, optional third ring) that build in stages; breaches repair by engineers. Pathing and perf need testing.

## Batch 3: big features (L)
13. More evolutions: when two max-level items are held, they combine into a powerful evolution (e.g. flamethrower + napalm, Claymore + trip flares, etc.). Plan a combo table of 8-12 pairs, each with its own icon, sound and tuned numbers; Gamer balances so they carry the late game but are not instant wins. Do the table first (design only), then 3 at a time.
14. Bunker garrison: when the firebase is secured, Marines man bunker emplacements and fire from inside; each bunker has HP and is destroyed before its Marines die. The player can enter any bunker for cover (protected but limited firing). Needs bunker art, enter/exit controls (button + controller), and allied AI changes.
15. Rivers and boats: a real-looking river (animated water, banks, reeds) and clearer PBR/Swift boats, with a boat that can drop a 4-man recon team (MACV-SOG style: extra HP and maxed weapons, temporary). Needs water art (Artist Helper), boat sprites, a new river map section, and a landing event. Vietnam Vet to verify the boat type.

## Suggested order when usage resets
Batch 1 in one push, QA pass; then 8, 9, 11; then 12; then 10; Batch 3 one item at a time, in the order 13 (design), 14, 15.

## Decisions from Blake (Oct 3, 7:42 PM ET)
- Slot limits: Gamer decides, based on what similar games do (Vampire Survivors uses 6 weapons + 6 passives; Gamer to recommend).
- Combos: no favorites; every combo must feel clearly awesome when achieved (unique name, gold icon, sound, banner + screen flash, visibly different effect), balanced by Gamer so it helps win at high levels without making the game trivial.
- Bunkers start EMPTY; patrol Marines automatically fill them. The player can still shelter in any bunker.

## Team notes (plan only)
- Artist Helper, art needs: Batch 1 = player ring + name tag, boots icon, flamethrower flame with brighter core. Batch 2 = icon redo (border color + silhouette per category: weapons / support / perks), calmer body-part and blood decals. Batch 3 = sandbag bunker, destroyed bunker, firing flash, river tile set, boat sprites, 4 recon-team figures (Vietnam Vet checks camo/period first). Cheapest first: player ring and icon redo.
- QA, test plan per batch (one short round each): pits never in firebase square (10-min bot run); flamethrower range in px before/after + kills/min + FPS; menu text readable at 1280x720 and small phone; ring visible on all backgrounds in a crowd; boots stop pit damage; gib count + FPS vs current; slots full -> no new-item cards over many level-ups; icons distinct at real size; tutorial skippable and not replayed; bigger firebase secures in a sensible time at 60 FPS; each combo alone vs normal run at level 20+; bunkers: fire, die with garrison, shelter/leave, no stuck player; river/boats FPS; recon team HP/weapons per spec. Every batch also: clean private-window load, BUILD stamp, DBG.pad pass.
- Dev debug hooks QA asked for (build with Batch 1): `?fps` readout adds gib count and slot counts (weapons/support used of max); `DBG.give('itemId', level)` to grant items; `DBG.fullSlots()` to fill categories.

## DRAFT combo list (for Gamer to refine; descriptions give Artist Helper and Sound Helper something to design from)
Existing: M60 + Ammo Pouch = AC-47 Spooky; Arc Light + KC-135 = Box Mission. New candidates, each = two max-level items:
1. Flamethrower + Napalm = FIRESTORM: a rotating wall of fire circles the player and leaves burning ground.
2. M79 + Demo Charges = THUMPER BARRAGE: each shot becomes a six-grenade cluster volley that chains explosions.
3. Claymore + Radio = PERIMETER DEFENSE: claymores auto-plant in a ring around you and re-arm on a short timer.
4. M1903 + FM Radio (spotter) = ONE SHOT, ONE KILL: every shot pierces the whole screen line and marks a target for guaranteed crits.
5. Mortar + Howitzer = FIRE MISSION: a walking barrage sweeps across the screen in a line with a big final salvo.
6. Huey + Medevac = ANGEL FLIGHT: a gunship pair covers you and heals Marines and you while flying.
7. Squad + Company = FULL COMPANY ASSAULT: allies get armor, faster fire and a charge order that wipes a screen-wide wave.
8. Gunboat + Strafe = BROWN WATER NAVY: a river gunboat plus A-1 Skyraider run clears a long lane.
9. Grease Gun + Butcher Knives = MESS HALL MAYHEM (Cook): thrown knives spin back like boomerangs and ricochet; the Grease Gun fires in a full spray.
Each combo: gold-bordered icon, banner + screen flash, shared "combo earned" fanfare (Sound Helper), plus its own short signature sound. Gamer balances and may swap pairs.

## Unlockable characters (Blake, Oct 3, 8:01 PM ET) — PLAN ONLY, size M (Batch 2)
Idea: start with 2-3 characters available; the rest are locked on character select (silhouette + "Unlock: ..." line) and unlock by playing. Saved in localStorage (lbo_* keys), shown with a banner + sound the first time it happens, and checked at end-of-run.
Proposed starting roster: the Rifleman/default Marine plus Doc (corpsman) are free. Suggested unlocks (Gamer to tune):
- Hammer (M60): survive 8 minutes in one run.
- Country (M1903): get 100 kills with a single weapon / reach level 10.
- Radio: secure a firebase once.
- Skipper (squad leader): extract successfully once.
- Zippo (flamethrower): kill 500 enemies total.
- Cook: reach service tier 2 (or collect 10 ribbons' worth of XP).
- MSgt. Hogston (tribute character): unlock after earning a Bronze Star ribbon, or reach tier 3, so it feels earned and special.
- Washington variants / skin tones: free cosmetic choices, not locked.
Implementation: add `unlock:{type,n}` to each character def; track lifetime stats (kills, best time, firebases secured, extractions) if not already saved; locked card shows progress "3/5". Debug: `DBG.unlockAll()` and `DBG.resetUnlocks()` for QA. Controller: locked cards focusable but not selectable. Steam: tie unlocks to achievements later.
Open for Blake/Gamer: which characters start unlocked, and should Hogston be unlockable or available at start?
