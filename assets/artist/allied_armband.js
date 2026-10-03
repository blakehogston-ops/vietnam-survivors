/* Company Reinforcement allies: same rig as the squad Marines, plus a bright armband (letter 'A') on both upper arms
   so friendly reinforcements are easy to tell from the player's own squad. Mix the skin-tone variants for a varied company.
   Usage: ALLIED.marine / .washington / .medium / .fair -> {top, pal}; legs: LEGS0. */
const _TOP_MARINE=[".....CCCCCC.....","....CCCCCCCC....","....CcCCCCcC....","....cccccccc....","....SSSSSSSS....","....SESSSSES....","...UUUUUUUUUU...","..UUuUUUUUUuUU..","..SUUuUUUUuUUS..","..SuUUBBBBUUuS..","...UUUUUUUUUU..."];
function _band(top){ // paint armband on row 7 (upper arms), cols 2 and 13
  const g=top.map(r=>r.split('')); g[7][2]='A'; g[7][13]='A'; return g.map(r=>r.join(''));
}
const ARMBAND='#f0d23a';
function _build(){
  const B=(typeof require!=='undefined')?require('./sprites_batch1.js').B1:null;
  const out={ marine:{top:_band(_TOP_MARINE), pal:{C:'#6e8b4a',c:'#4a6233',S:'#e2b98f',E:'#24180d',U:'#58733a',u:'#3f5528',B:'#4a3a22',P:'#5f7a3c',A:ARMBAND}} };
  if(B){
    for(const [k,src] of [['washington','marineWashington'],['medium','marineMedium'],['fair','marineFair']]){
      out[k]={top:_band(B[src].top), pal:Object.assign({},B[src].pal,{A:ARMBAND})};
    }
  }
  return out;
}
const ALLIED=_build();
if(typeof module!=='undefined') module.exports={ALLIED};
