/* sprites_batch1.js — Artist Helper, batch 1 (original pixel art, drop-in for Vietnam survivor)
 * Format = same as index.html: TOP_* = 11 rows x 16 cols (head+torso), '.' = transparent.
 * Legs: reuse the game's LEGS0 / LEGS (2 walk frames, 4 rows). Legend letters used by the legs: P = trousers, B = boots.
 * Each sprite has its own legend (letter -> hex). The engine adds its own 1px dark outline, so none is drawn here.
 * Usage in index.html (after makeSprites/LEGS0 exist):
 *   const spr = makeSprites(B1.hogston.top, LEGS0, B1.hogston.pal, 2);   // NVA-type uses LEGS (rifle stock col) instead
 * or call  B1_register(makeSprites, LEGS0, LEGS, SPR_TARGET)  to build all of them into an object.
 */
const LEGS0_REF = [["...PPPPPPPP....","...PPP..PPP....","...PPP..PPP....","...BBB..BBB...."],["...PPPPPPPP....","....PPPPPP.....","....PPPPPP.....","....BBBBBB....."]];
const LEGS_REF  = [["...PPPPPPPP..W.","...PPP..PPP..W.","...PPP..PPP....","...BBB..BBB...."],["...PPPPPPPP..W.","....PPPPPP...W.","....PPPPPP.....","....BBBBBB....."]];

/* (a) MSgt. Hogston, USAF tanker maintenance. Patrol cap w/ OMS patch (Q/K pixels), round face, open collar over white
 *     undershirt (W), E-7 chevrons on both sleeves (V), pens in left pocket (L), headset round the neck (G), holstered sidearm (K grip/O holster). */
const TOP_HOGSTON = [
  "................",
  "....CCCCCCCC....",
  "...CCCQKKQCCC...",
  "...cccccccccc...",
  "...SSSSSSSSSS...",
  "...SSESSSSESS...",
  "...UUgWWWWgUU...",
  "..VVUGWWWWGLVV..",
  "..SVuGUuUUGUVS..",
  "..SuUUBBBBUKuS..",
  "...UUUUUUUUOU..."
];
const PAL_HOGSTON = {C:'#74804a',c:'#566133',Q:'#d9d3a8',K:'#1a1a16',S:'#e2b98f',E:'#24180d',U:'#6a7a42',u:'#4f5d2e',
  W:'#f4f2ea',G:'#2c2f33',g:'#555a60',V:'#a9bfdc',L:'#cfd3d8',B:'#3f301c',O:'#4a3320',P:'#66753f'};

/* (b) Navy corpsman ("Doc"): camo helmet with red cross, white-khaki medical bag with red cross on the hip, tan strap. */
const TOP_CORPSMAN = [
  ".....CCCCCC.....",
  "....CCCRRCCC....",
  "....CcRRRRcC....",
  "....cccRRccc....",
  "....SSSSSSSS....",
  "....SESSSSES....",
  "...UTUUUUUUUU...",
  "..UUuTUUUUUuUU..",
  "..SUUuTUUUMMRMM.",
  "..SuUUBTBBMRRRM.",
  "...UUUUUUUMMRMM."
];
const PAL_CORPSMAN = {C:'#6e8b4a',c:'#4a6233',R:'#d62020',S:'#e2b98f',E:'#24180d',U:'#58733a',u:'#3f5528',T:'#b59a62',
  B:'#4a3a22',M:'#ece6c8',P:'#5f7a3c'};

/* (c) Marine rifleman skin-tone variants — same rig as TOP_MARINE (camo M1 helmet, flak jacket, rifle drawn by the game).
 *     Differences are more than recolors: sideburn/hair pixels (H), helmet-cover markings, and small personal items. */
// Washington (Black Marine): dark skin, short hair at the sideburns, white peace-mark dot on helmet cover, cigarette.
const TOP_MARINE_WASHINGTON = [
  ".....CCCCCC.....",
  "....CCCCCCCC....",
  "....CcCCWCcC....",
  "....cccccccc....",
  "....HSSSSSSH....",
  "....SESSSSESW...",
  "...UUUUUUUUUU...",
  "..UUuUUUUUUuUU..",
  "..SUUuUUUUuUUS..",
  "..SuUUBBBBUUuS..",
  "...UUUUUUUUUU..."
];
const PAL_MARINE_WASHINGTON = {C:'#6e8b4a',c:'#4a6233',S:'#7a4b2d',H:'#1b130e',E:'#120c08',W:'#f2efe4',U:'#58733a',u:'#3f5528',B:'#4a3a22',P:'#5f7a3c'};
// Medium-brown skin (Hispanic / Native American / Pacific roster slot — pick a name later): black hair, rolled sleeves, gold crucifix (Y) at throat.
const TOP_MARINE_MEDIUM = [
  ".....CCCCCC.....",
  "....CCCCCCCC....",
  "....CcCCCCcC....",
  "....ccccYccc....",
  "....HSSSSSSH....",
  "....SESSSSES....",
  "...UUUUYYUUUU...",
  "..SUuUUUUUUuUS..",
  "..SUUuUUUUuUUS..",
  "..SuUUBBBBUUuS..",
  "...UUUUUUUUUU..."
];
const PAL_MARINE_MEDIUM = {C:'#6e8b4a',c:'#4a6233',S:'#b4774a',H:'#14100c',E:'#150e08',Y:'#e0c040',U:'#58733a',u:'#3f5528',B:'#4a3a22',P:'#5f7a3c'};
// Fair, freckled redhead: red sideburns, freckles (F), helmet-band cigarette pack (W).
const TOP_MARINE_FAIR = [
  ".....CCCCCC.....",
  "....CCCCCCCC....",
  "....CcCCCCcC....",
  "....ccWWcccc....",
  "....RSSSSSSR....",
  "....FESSSSEF....",
  "...UUUUUUUUUU...",
  "..UUuUUUUUUuUU..",
  "..SUUuUUUUuUUS..",
  "..SuUUBBBBUUuS..",
  "...UUUUUUUUUU..."
];
const PAL_MARINE_FAIR = {C:'#6e8b4a',c:'#4a6233',S:'#f2d2b0',R:'#b5481f',F:'#cf8f6a',E:'#24180d',W:'#f2efe4',U:'#58733a',u:'#3f5528',B:'#4a3a22',P:'#5f7a3c'};

/* (d) NVA regular: tan pith helmet with red star (R, gold border Y), khaki-green uniform, canvas chest rig (T), red collar tabs,
 *     AK-style rifle in col 13 (K barrel / W stock) — uses the game's LEGS (with the rifle stock column), like TOP_NVA. */
const TOP_NVA_REGULAR = [
  ".....CCCCCC..K..",
  "....CCCYRYCC.K..",
  "...CCCRRRRCCCK..",
  "..cccccccccc.W..",
  "....SSSSSSSS.W..",
  "....SESSSSES.W..",
  "...UUURUURUUUW..",
  "..UUUTUUUUTUUW..",
  "..SuUTUUUUTUSSW.",
  "..uUTBBBBBTUu.W.",
  "...UUUUUUUU..W.."
];
const PAL_NVA_REGULAR = {C:'#a9ab6e',c:'#7d7a46',Y:'#e8c84a',R:'#d8271e',S:'#e2b98f',E:'#24180d',U:'#8f9358',u:'#6f7442',
  T:'#b9b87c',B:'#4b3a22',K:'#c9ced4',W:'#6b4426',P:'#7f8450'};

/* (e) B-40 (RPG-2) Rocket Trooper: distinct silhouette = rocket tube on the shoulder angled up-and-out with a big bright
 *     orange/red warhead, olive bush hat with wide brim, bright orange scarf (A), black pajamas. Highest-contrast enemy sprite. */
const TOP_B40 = [
  "..............YA",
  ".....CCCCCC..YRA",
  "..cccCCCCCCccRRA",
  "..ccccccccccOO..",
  "....SSSSSSSOO...",
  "....SESSSSOES...",
  "...UUAAAAOUUU...",
  "..UUuAAAOUUuUU..",
  "..SUUuUOUUUuUS..",
  "..SuUUBBBBUUuS..",
  "...UUUUUUUUUU..."
];
const PAL_B40 = {C:'#6f7a3e',c:'#4d5629',Y:'#ffe14a',A:'#ff7a00',R:'#e0261b',S:'#dbb287',E:'#24180d',U:'#2e2e34',u:'#1e1e23',
  O:'#9aa09a',B:'#7a6a3a',P:'#2e2e33'};

const B1 = {
  hogston:  {top:TOP_HOGSTON,  pal:PAL_HOGSTON,  legs:'LEGS0', label:'MSgt. Hogston, USAF'},
  corpsman: {top:TOP_CORPSMAN, pal:PAL_CORPSMAN, legs:'LEGS0', label:'Navy corpsman'},
  marineWashington: {top:TOP_MARINE_WASHINGTON, pal:PAL_MARINE_WASHINGTON, legs:'LEGS0', label:'Marine (Washington)'},
  marineMedium:     {top:TOP_MARINE_MEDIUM,     pal:PAL_MARINE_MEDIUM,     legs:'LEGS0', label:'Marine (medium skin tone)'},
  marineFair:       {top:TOP_MARINE_FAIR,       pal:PAL_MARINE_FAIR,       legs:'LEGS0', label:'Marine (fair, freckled)'},
  nvaRegular: {top:TOP_NVA_REGULAR, pal:PAL_NVA_REGULAR, legs:'LEGS', label:'NVA regular'},
  b40:        {top:TOP_B40,         pal:PAL_B40,         legs:'LEGS0', label:'B-40 Rocket Trooper'}
};
/* Legs palettes: add P (trousers) and B (boots) — already in every pal above except where P is shared. */
function B1_register(makeSprites, LEGS0, LEGS, target, scale){
  for(const k in B1){ const d=B1[k]; target[k]=makeSprites(d.top, d.legs==='LEGS'?LEGS:LEGS0, d.pal, scale||2); }
  return target;
}
if(typeof module!=='undefined') module.exports={B1,B1_register,LEGS0_REF,LEGS_REF};
