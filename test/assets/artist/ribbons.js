/* ribbons.js — Artist Helper. Navy/Marine ribbon bars + Medal of Honor, letter-grid + legend (letter -> hex), '.' = transparent.
 * FULL  = 44x12 px: 1 px = 1/32" of the real 1-3/8" x 3/8" ribbon, stripe widths taken from MIL-DTL-11589 sheets (see README).
 * COMPACT = 23x6 hand-rounded version for the menu rack / phone.
 * Ribbons are flat rectangles: draw a 1px dark outline in-engine if you want one. Gameplay rack order (highest first): NC, SS, BS, PH, CAR.
 * The Medal of Honor is NEVER a gameplay / farmable reward (Blake's spec): it is not in RIBBON_RACK_ORDER. The gameplay unlock that used
 * to be 'Medal of Honor' is now 'Last Bird Out' (unit-patch badge in last_bird_out_badge.js, LAST_BIRD_OUT_BADGE).
 */
const RIBBONS = {
 "car": {
  "name": "Combat Action Ribbon",
  "full": [
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB",
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB",
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB",
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB",
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB",
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB",
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB",
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB",
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB",
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB",
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB",
   "RRRRRRRRRRYYYYYYYYYYrWWbYYYYYYYYYYBBBBBBBBBB"
  ],
  "compact": [
   "RRRRRYYYYYrWbYYYYYBBBBB",
   "RRRRRYYYYYrWbYYYYYBBBBB",
   "RRRRRYYYYYrWbYYYYYBBBBB",
   "RRRRRYYYYYrWbYYYYYBBBBB",
   "RRRRRYYYYYrWbYYYYYBBBBB",
   "RRRRRYYYYYrWbYYYYYBBBBB"
  ],
  "legend": {
   "R": "#c8102e",
   "Y": "#f2c230",
   "r": "#c8102e",
   "W": "#f4f4f4",
   "b": "#1e3a8a",
   "B": "#1e3a8a"
  }
 },
 "ph": {
  "name": "Purple Heart",
  "full": [
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW",
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW",
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW",
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW",
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW",
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW",
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW",
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW",
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW",
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW",
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW",
   "WWWWPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPWWWW"
  ],
  "compact": [
   "WWPPPPPPPPPPPPPPPPPPPWW",
   "WWPPPPPPPPPPPPPPPPPPPWW",
   "WWPPPPPPPPPPPPPPPPPPPWW",
   "WWPPPPPPPPPPPPPPPPPPPWW",
   "WWPPPPPPPPPPPPPPPPPPPWW",
   "WWPPPPPPPPPPPPPPPPPPPWW"
  ],
  "legend": {
   "W": "#f4f4f4",
   "P": "#5a2a82"
  }
 },
 "bs": {
  "name": "Bronze Star",
  "full": [
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW",
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW",
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW",
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW",
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW",
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW",
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW",
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW",
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW",
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW",
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW",
   "WSSSSSSSSSSSSSSSSSSWBBBBWSSSSSSSSSSSSSSSSSSW"
  ],
  "compact": [
   "WSSSSSSSSSWBWSSSSSSSSSW",
   "WSSSSSSSSSWBWSSSSSSSSSW",
   "WSSSSSSSSSWBWSSSSSSSSSW",
   "WSSSSSSSSSWBWSSSSSSSSSW",
   "WSSSSSSSSSWBWSSSSSSSSSW",
   "WSSSSSSSSSWBWSSSSSSSSSW"
  ],
  "legend": {
   "W": "#f4f4f4",
   "S": "#c8102e",
   "B": "#1e3a8a"
  }
 },
 "ss": {
  "name": "Silver Star",
  "full": [
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB",
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB",
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB",
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB",
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB",
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB",
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB",
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB",
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB",
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB",
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB",
   "BBBWBBBBBBBWWWWWWWSSSSSSSSWWWWWWWBBBBBBBWBBB"
  ],
  "compact": [
   "BWBBBWWWWSSSSSWWWWBBBWB",
   "BWBBBWWWWSSSSSWWWWBBBWB",
   "BWBBBWWWWSSSSSWWWWBBBWB",
   "BWBBBWWWWSSSSSWWWWBBBWB",
   "BWBBBWWWWSSSSSWWWWBBBWB",
   "BWBBBWWWWSSSSSWWWWBBBWB"
  ],
  "legend": {
   "B": "#1e3a8a",
   "W": "#f4f4f4",
   "S": "#c8102e"
  }
 },
 "nc": {
  "name": "Navy Cross",
  "full": [
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN",
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN",
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN",
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN",
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN",
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN",
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN",
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN",
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN",
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN",
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN",
   "NNNNNNNNNNNNNNNNNNWWWWWWWWNNNNNNNNNNNNNNNNNN"
  ],
  "compact": [
   "NNNNNNNNNWWWWWNNNNNNNNN",
   "NNNNNNNNNWWWWWNNNNNNNNN",
   "NNNNNNNNNWWWWWNNNNNNNNN",
   "NNNNNNNNNWWWWWNNNNNNNNN",
   "NNNNNNNNNWWWWWNNNNNNNNN",
   "NNNNNNNNNWWWWWNNNNNNNNN"
  ],
  "legend": {
   "N": "#10214b",
   "W": "#f4f4f4"
  }
 }
};
/* MEDAL_OF_HONOR: ONLY for the Ballard and Taylor tribute cards (real Medal of Honor recipients). Never awarded in gameplay,
 * never shown in a ribbon rack. Navy pattern (neck ribbon), which is the correct version for Marines per the historian. Unchanged data. */
const MEDAL_OF_HONOR = {
 "name": "Medal of Honor (Navy, neck ribbon)",
 "grid": [
  "lLLLLLL.............LLLLLLl",
  ".lLLLLLL...........LLLLLLl.",
  "..lLLLLLL.........LLLLLLl..",
  "...lLLLLLL.......LLLLLLl...",
  "....lLLLLLL.....LLLLLLl....",
  ".....lLLLLLL...LLLLLLl.....",
  "......lLLLLLL.LLLLLLl......",
  ".......lLLLLLLLLLLLl.......",
  "........lLLLLLLLLLl........",
  "........lLLLLLLLLLl........",
  "........lLLLLWLLLLl........",
  "........lLLLLLLLLLl........",
  "........lLLLWLWLLLl........",
  "........lLLWLLLWLLl........",
  "........lLLLWLWLLLl........",
  "........lLLWLLLWLLl........",
  "........lLLLWLWLLLl........",
  "........lLLWLLLWLLl........",
  "........lLLLLLLLLLl........",
  "........lLLLLLLLLLl........",
  "........lllllllllll........",
  "............GgG............",
  "............GgG............",
  "............GgG............",
  ".............g.............",
  ".............G.............",
  "............GGG............",
  "............GGG............",
  "............GGG............",
  "...........HGGGg...........",
  "...........GGGGG...........",
  ".......HGHGGDDDGGggg.......",
  "EeEGHGHGHGGDDHDDGGggggggEeE",
  "eE..GHGHGGDHHHHHDGGgggg..EE",
  "EE...GHGGDDHHHHHDDGggg...Ee",
  "Ee.....HGDHHHHHHHDGg.....eE",
  "eE......GDDHHHHHDDG......EE",
  "EE......GGDHHHHHDGG......Ee",
  "EeE.....HGGDDHDDGGg.....EeE",
  ".EE.....GHGGDDDGGgg.....eE.",
  ".Ee.....HGHGGGGGggg.....EE.",
  "..EE...HGHGH...ggggg...EE..",
  "..EeE..GHGH.....gggg..EEe..",
  "...EEe.HG.........gg.EEe...",
  "....eEEG...........gEEe....",
  ".....EeE...........EEe.....",
  "......EEeEE.....EeEEe......",
  "........EEeEEeEEeEE........"
 ],
 "legend": {
  "L": "#74aee0",
  "l": "#4f8fc8",
  "W": "#ffffff",
  "G": "#d9a62b",
  "g": "#9a6f12",
  "H": "#f6dc7a",
  "D": "#7a5410",
  "E": "#3f8a3a",
  "e": "#2a5e27"
 },
 "locked": [
  "XXXXXXX.............XXXXXXX",
  ".XXXXXXX...........XXXXXXX.",
  "..XXXXXXX.........XXXXXXX..",
  "...XXXXXXX.......XXXXXXX...",
  "....XXXXXXX.....XXXXXXX....",
  ".....XXXXXXX...XXXXXXX.....",
  "......XXXXXXX.XXXXXXX......",
  ".......XXXXXXXXXXXXX.......",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "........XXXXXXXXXXX........",
  "............XXX............",
  "............XXX............",
  "............XXX............",
  ".............X.............",
  ".............X.............",
  "............XXX............",
  "............XXX............",
  "............XXX............",
  "...........XXXXX...........",
  "...........XXXXX...........",
  ".......XXXXXXXXXXXXX.......",
  "XXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "XX..XXXXXXXXXXXXXXXXXXX..XX",
  "XX...XXXXXXXXXXXXXXXXX...XX",
  "XX.....XXXXXXXXXXXXX.....XX",
  "XX......XXXXXXXXXXX......XX",
  "XX......XXXXXXXXXXX......XX",
  "XXX.....XXXXXXXXXXX.....XXX",
  ".XX.....XXXXXXXXXXX.....XX.",
  ".XX.....XXXXXXXXXXX.....XX.",
  "..XX...XXXXX...XXXXX...XX..",
  "..XXX..XXXX.....XXXX..XXX..",
  "...XXX.XX.........XX.XXX...",
  "....XXXX...........XXXX....",
  ".....XXX...........XXX.....",
  "......XXXXX.....XXXXX......",
  "........XXXXXXXXXXX........"
 ],
 "locked_legend": {
  "X": "#2b2f36"
 }
};
const RIBBON_RACK_ORDER = ['nc','ss','bs','ph','car']; // gameplay rack, highest precedence first. 'moh' removed on purpose: MoH is tribute-card only.
if(typeof module!=='undefined') module.exports={RIBBONS,MEDAL_OF_HONOR,RIBBON_RACK_ORDER};
