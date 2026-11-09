# ACH_* API names Blake must create in Steamworks (rc8.2 #7)
Steamworks > App Admin > Stats & Achievements > Achievements. API name must match exactly. Display names/descriptions are the game's own text (accuracy gate: HAA + MHR before publishing). Mark Hidden as you prefer. Icons: 64x64 achieved + unachieved JPG/PNG per achievement (art track).

## A. Game achievements (34, game table `const ACH`)
| # | API name | Display name | Description |
|---|---|---|---|
| 1 | ACH_BOOTS | Boots on the Ground | Hold for one minute after insertion. |
| 2 | ACH_HOLD_5 | Hold the Line | Hold for five minutes. |
| 3 | ACH_HOLD_10 | Ten Mikes | Hold for ten minutes. |
| 4 | ACH_HOLD_15 | Long Night | Hold for fifteen minutes. |
| 5 | ACH_FIRST_OUT | Last Chopper Out | Get Doc out on the bird. |
| 6 | ACH_ALL_HOME | Nobody Left Behind | Extract with every living Marine aboard. |
| 7 | ACH_TEN_HOME | Squad Intact | Bring ten or more Marines home. |
| 8 | ACH_FULL_HOME | All Fifteen | Bring the whole squad home with no Marine killed. |
| 9 | ACH_FALLEN_HOME | They Come Home Too | Carry a fallen Marine to the bird. |
| 10 | ACH_EARLY_CALL | By the Book | Call the bird before 4:00 and extract. |
| 11 | ACH_MID_CALL | Steady Hands | Call the bird after 6:00 and extract. |
| 12 | ACH_LATE_CALL | Hold Until Relieved | Call the bird after 10:00 and extract. |
| 13 | ACH_LATER_CALL | Iron Patience | Call the bird after 13:00 and extract. |
| 14 | ACH_WAVEOFF | Coming Around | Survive a wave-off and extract. |
| 15 | ACH_WAVEOFF2 | Twice Around | Survive two wave-offs and extract. |
| 16 | ACH_MOH_ONE | In Their Honor | Complete a Medal of Honor mission. |
| 17 | ACH_MOH_TWO | Above and Beyond | Complete both Medal of Honor missions in one run. |
| 18 | ACH_BARRAGE5 | Under the Tubes | Live through five mortar barrages in one run. |
| 19 | ACH_BARRAGE10 | Dug In | Live through ten mortar barrages in one run. |
| 20 | ACH_SAPPER_STOP | Wire Watch | Face twenty sappers in one run and hold. |
| 21 | ACH_NIGHT_HOLD | Holding at Dusk | Hold past eight minutes with a firebase built. |
| 22 | ACH_FIREBASE | Dig In | Build a firebase. |
| 23 | ACH_KILLS_250 | Hard Contact | Stop 250 enemy soldiers in one run. |
| 24 | ACH_KILLS_1000 | Heavy Contact | Stop 1,000 enemy soldiers in one run. |
| 25 | ACH_LVL_10 | Seasoned | Reach level 10. |
| 26 | ACH_LVL_20 | Salt | Reach level 20. |
| 27 | ACH_HUEY_UNLOCK | Guns Up | Huey gunship escort unlocked. |
| 28 | ACH_SCORE_5K | Commendation | Earn a hold-out score of 5,000. |
| 29 | ACH_SCORE_15K | Citation | Earn a hold-out score of 15,000. |
| 30 | ACH_SCORE_30K | Unit Honor | Earn a hold-out score of 30,000. |
| 31 | ACH_RIGHT_SMOKE | Right Color | Extract without confirming the wrong smoke. |
| 32 | ACH_KIT_OUT | Corpsman's Kit | Extract with the Corpsman's Kit loadout. |
| 33 | ACH_LEAN_OUT | Traveling Light | Extract with the Point Man loadout. |
| 34 | ACH_SQUAD_ALIVE8 | Keep Them Together | Have eight Marines alive at the ten-minute mark. |

## B. Squad 2 Marine unlocks (8, fired once per Marine by squad2Check / window.squad2Unlock)
| API name | Marine |
|---|---|
| ACH_SQUAD2_HAMMER | Sgt Maximus 'Hammer' Savage (Machine Gunner) |
| ACH_SQUAD2_BOONE | PFC Josh 'Country' Johnson (Rifleman / Marksman) |
| ACH_SQUAD2_SKIPPER | 2ndLt 'Two-Six' (Platoon Commander; game id stays skipper) |
| ACH_SQUAD2_FLAMER | LCpl Marcus 'Lighter' Washington (Flamethrower) |
| ACH_SQUAD2_RAT | Cpl Hector 'Tunnel Rat' Ramirez (Combat Engineer) |
| ACH_SQUAD2_RADIO | MSgt Hogston, USAF (Tanker Maintenance, attached) |
| ACH_SQUAD2_PREACHER | Sgt Elijah 'Preacher' Miller (Grenadier) |
| ACH_SQUAD2_CHEF | PFC Delbert 'Biscuit' Crumpacker (Mess Cook) |

## C. Doc loadout unlocks (4, derived by the wrapper)
| API name | Trigger |
|---|---|
| ACH_SQUAD2_LOADOUT_KIT | first_out |
| ACH_SQUAD2_LOADOUT_POINT | hold_10 |
| ACH_SQUAD2_LOADOUT_GUN | all_home |
| ACH_SQUAD2_LOADOUT_M79 | hold-out score >= 8000 |

Ribbons: NONE (EP ruling Oct 28: real medals are never rewards; ACH_RIB_* removed).

Total to create: 34 + 8 + 4 = 46. NOTE: the brief said 27; the current game table has 34. Item 5 (remove real medals) may rename moh_one/moh_two - keep the API names stable or tell the Steam Build Engineer. Do NOT create anything until the accuracy gate signs the names.
