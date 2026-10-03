/* HEAL PULSE + rising plus particle. Original art.
   1) drawHealPulse(ctx,x,y,t[,scale])  t = 0..1 (0 = just started, 1 = gone). Soft green-white expanding ring (radius ~6 -> ~46 game px),
      ease-out, fades in the last 40%. Ground-level effect: draw it UNDER the unit's sprite, centred on its feet. Cheap: 1 arc + 1 gradient.
   2) HEAL_PULSE.frames[0..4] - the same effect as 25x25 letter grids (ring grows, last two dithered/fading). Pick frame = min(4, floor(t*5)).
      Draw at scale 2 (50 px) for a unit, or bigger for the medevac area. '.' transparent. Legend in HEAL_PULSE.legend.
   3) HEAL_PLUS.frames[0|1] - 5x5 plus-sign particle (bright, then dim/small). drawHealPlus(ctx,x,y,t) = rises ~18 px and flips to
      frame 1 at t>0.55; t = 0..1 life. Spawn 2-4 per healed unit, jitter x by a few px.  */
const HEAL_PULSE = {
  w: 25, h: 25,
  frames: [
    [".........................",
     ".........................",
     ".........................",
     ".........................",
     ".........................",
     ".........................",
     ".........................",
     ".........................",
     "..........GGGGG..........",
     ".........GGWWWGG.........",
     "........GGW...WGG........",
     "........GW.....WG........",
     "........GW.....WG........",
     "........GW.....WG........",
     "........GGW...WGG........",
     ".........GGWWWGG.........",
     "..........GGGGG..........",
     ".........................",
     ".........................",
     ".........................",
     ".........................",
     ".........................",
     ".........................",
     ".........................",
     "........................."],
    [".........................",
     ".........................",
     ".........................",
     ".........................",
     ".........................",
     "..........GGGGG..........",
     "........GGGWWWGGG........",
     ".......GGWWf.fWWGG.......",
     "......GGW.f.f.f.WGG......",
     "......GW.f.f.f.f.WG......",
     ".....GGWf.f...f.fWGG.....",
     ".....GWf.f.....f.fWG.....",
     ".....GW.f.......f.WG.....",
     ".....GWf.f.....f.fWG.....",
     ".....GGWf.f...f.fWGG.....",
     "......GW.f.f.f.f.WG......",
     "......GGW.f.f.f.WGG......",
     ".......GGWWf.fWWGG.......",
     "........GGGWWWGGG........",
     "..........GGGGG..........",
     ".........................",
     ".........................",
     ".........................",
     ".........................",
     "........................."],
    [".........................",
     ".........................",
     "............G............",
     "........GGGGGGGGG........",
     "......GGGWWWWWWWGGG......",
     ".....GGWW.......WWGG.....",
     "....GGW...........WGG....",
     "....GW.............WG....",
     "...GGW.............WGG...",
     "...GW...............WG...",
     "...GW...............WG...",
     "...GW...............WG...",
     "..GGW...............WGG..",
     "...GW...............WG...",
     "...GW...............WG...",
     "...GW...............WG...",
     "...GGW.............WGG...",
     "....GW.............WG....",
     "....GGW...........WGG....",
     ".....GGWW.......WWGG.....",
     "......GGGWWWWWWWGGG......",
     "........GGGGGGGGG........",
     "............G............",
     ".........................",
     "........................."],
    [".........................",
     ".........G.G.G.G.........",
     "......G.w.......w.G......",
     ".....G.w.........w.G.....",
     "....G...............G....",
     "...G.................G...",
     "..G...................G..",
     "...w.................w...",
     "..w...................w..",
     ".G.....................G.",
     ".........................",
     ".G.....................G.",
     ".........................",
     ".G.....................G.",
     ".........................",
     ".G.....................G.",
     "..w...................w..",
     "...w.................w...",
     "..G...................G..",
     "...G.................G...",
     "....G...............G....",
     ".....G.w.........w.G.....",
     "......G.w.......w.G......",
     ".........G.G.G.G.........",
     "........................."],
    ["..........g.g.g..........",
     ".......g.g.....g.g.......",
     "......g...........g......",
     ".....g.............g.....",
     "....g...............g....",
     "...g.................g...",
     "..g...................g..",
     ".g.....................g.",
     ".........................",
     ".g.....................g.",
     "g.......................g",
     ".........................",
     "g.......................g",
     ".........................",
     "g.......................g",
     ".g.....................g.",
     ".........................",
     ".g.....................g.",
     "..g...................g..",
     "...g.................g...",
     "....g...............g....",
     ".....g.............g.....",
     "......g...........g......",
     ".......g.g.....g.g.......",
     "..........g.g.g.........."]
  ],
  legend: {W:'#f4fff2', w:'#d8f5d8', G:'#7be07b', g:'#4fbf6a', f:'#a8ecb0'}
};
const HEAL_PLUS = {
  w: 5, h: 5,
  frames: [
    ["..W..","..W..","WWWWW","..W..","..W.."],
    [".....","..g..",".gWg.","..g..","....."]
  ],
  legend: { W:'#f4fff2', g:'#7be07b' }
};
function drawHealPulse(ctx, x, y, t, scale) {
  scale = scale || 1; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const e = 1 - (1 - t) * (1 - t), r = (6 + 40 * e) * scale, a = t < .6 ? 1 : (1 - t) / .4;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(1, .8);   // slight ground-plane squash like the game's shadows
  const gr = ctx.createRadialGradient(0, 0, r * .45, 0, 0, r);
  gr.addColorStop(0, 'rgba(160,240,170,0)'); gr.addColorStop(1, 'rgba(160,240,170,' + (.28 * a).toFixed(3) + ')');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = Math.max(1, (4 - 2.5 * t) * scale); ctx.strokeStyle = 'rgba(123,224,123,' + (.85 * a).toFixed(3) + ')';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = Math.max(1, (1.6 - t) * scale); ctx.strokeStyle = 'rgba(244,255,242,' + a.toFixed(3) + ')';
  ctx.beginPath(); ctx.arc(0, 0, r - 1.5 * scale, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function drawHealPlus(ctx, x, y, t, scale) {
  scale = scale || 2; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const g = HEAL_PLUS.frames[t > .55 ? 1 : 0], px = scale;
  ctx.save(); ctx.globalAlpha = t < .7 ? 1 : (1 - t) / .3; const ox = Math.round(x - 2.5 * px), oy = Math.round(y - 18 * t - 2.5 * px);
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const c = HEAL_PLUS.legend[g[j][i]]; if (c) { ctx.fillStyle = c; ctx.fillRect(ox + i * px, oy + j * px, px, px) } }
  ctx.restore();
}
if (typeof module !== 'undefined') module.exports = { HEAL_PULSE, HEAL_PLUS, drawHealPulse, drawHealPlus };
