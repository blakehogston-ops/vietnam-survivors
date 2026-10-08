/* Medic pack pickup (12x10). '.' transparent. Olive canvas pouch with white panel and red cross, strap on top.
   Readable on jungle backgrounds: white panel + red cross stand out; dark outline. */
const MEDPACK = {
  grid: [
    "....OOOO....",
    "...OssssO...",
    "..OOOOOOOO..",
    ".OGGGGGGGGO.",
    ".OGWWWWWWGO.",
    ".OGWWRRWWGO.",
    ".OGWRRRRWGO.",
    ".OGWWRRWWGO.",
    ".OGGGGGGGGO.",
    "..OOOOOOOO.."
  ],
  legend: { O:'#1c1a12', s:'#8a7a4a', G:'#5b6b36', W:'#f1efe6', R:'#d2261b' }
};
if(typeof module!=='undefined') module.exports={MEDPACK};
