/* MEDEVAC HUEY (Red Cross "Dustoff" Huey). Original art. Top-down like drawHuey() in index.html; nose points +x (heading 0).
   1) drawMedevacHuey(ctx,x,y,scale,rotorPhase[,heading])  - procedural, same style/scale as drawHuey (scale 1 = game px).
        x,y = centre of the aircraft (same as drawHuey's x,y after the z-offset). rotorPhase: 0 or 1 (integer parity used; pass
        Math.floor(time*N)) - the two blade positions. heading = radians, default 0 (use h.hd). Does NOT draw shadow / HP bar / rotor
        disc glow beyond its own blur; caller keeps those. Adds: white square + red cross on roof AND tail boom, open side doors
        (dark opening + tan litter), rotor blur disc.
   2) MEDEVAC_HUEY.frames[0|1] - letter grids (48x48, nose right, 1 grid px = 2 game px -> draw with scale 2) + MEDEVAC_HUEY.legend.
        '.' transparent. Rotate the canvas for heading. Fallback if you don't want the procedural version.  */
const MEDEVAC_HUEY = {
  w: 48, h: 48, gridPxPerGamePx: 0.5,
  frames: [
    ["................................................",
     "...................b.b.b.b.b....................",
     "................b.b.b.b.b.b.b.b.................",
     "...............b.b.b.b.b.b.b.b.b.b..............",
     "............b.b.b.b.b.b.b.b.b.b.b.b.............",
     "...........b.b.b.b.b.b.b.b.b.b.b.b.b.b..........",
     "..........b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.........",
     ".........b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b........",
     "........b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.......",
     ".......b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b......",
     "......b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.....",
     ".....b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b......",
     "....b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.....",
     ".....b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b....",
     "....b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b...",
     "...b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b....",
     "..b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b...",
     "...b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b..",
     "..b.b.b.b.b.b.b.b.KKKKKKKKKKKKK.b.b.b.b.b.b.b...",
     ".b.b.b.b.b.b.b.b.b.b.ZTTZ.Kb.b.b.b.b.b.b.b.b.b..",
     "..b.b.b.b.b.b.b.b.bOOOOOOOOOO.b.b.b.b.b.b.b.b.b.",
     "gDDD.b.b.b.b.b.b.OOODDDDDOOOCCCb.b.b.b.b.b.b.b..",
     "gDDDb.bWRRW.b.b.bOODDWWRWWOCCCCCb.b.b.b.b.b.b.b.",
     "gDDDDDDRRRRDDDDDOODDDWWRWWDCCcCC.b.b.b.b.b.b.b..",
     "gDDDDDDRRRRDDDDDOODDDRRRMMDCCCCCBBBBBBBBBBBBBBB.",
     ".b.b.b.WRRWb.b.b.OODDWWRWWOCCCCC.b.b.b.b.b.b.b..",
     "..b.b.b.b.b.b.b.bOOODWWRWWOOCCC.b.b.b.b.b.b.b.b.",
     ".b.b.b.b.b.b.b.b.b.OOOOOOOOOOb.b.b.b.b.b.b.b.b..",
     "..b.b.b.b.b.b.b.b.b.bZTTZ.K.b.b.b.b.b.b.b.b.b.b.",
     "...b.b.b.b.b.b.b.bKKKKKKKKKKKKKb.b.b.b.b.b.b.b..",
     "..b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b...",
     "...b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b..",
     "....b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b...",
     "...b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b....",
     "....b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.....",
     ".....b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b....",
     "......b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.....",
     ".....b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b......",
     "......b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.......",
     ".......b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b........",
     "........b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.b.........",
     ".........b.b.b.b.b.b.b.b.b.b.b.b.b.b.b..........",
     "..........b.b.b.b.b.b.b.b.b.b.b.b.b.b...........",
     ".............b.b.b.b.b.b.b.b.b.b.b.b............",
     "..............b.b.b.b.b.b.b.b.b.b...............",
     ".................b.b.b.b.b.b.b.b................",
     "....................b.b.b.b.b...................",
     "................................................"],
    ["................................................",
     "....................b.b.b.b.b...................",
     ".................b.b.b.b.b.b.b.b................",
     "..............b.b.b.b.b.b.b.b.b.b...............",
     ".............b.b.b.b.b.b.b.b.b.b.b.b............",
     "..........b.b.b.b.b.b.b.b.b.b.b.b.b.b...........",
     ".........b.b.b.b.b.b.b.b.b.b.b.b.b.b.b..........",
     "........b.BBb.b.b.b.b.b.b.b.b.b.b.b.b.b.........",
     ".......b.b.BBb.b.b.b.b.b.b.b.b.b.b.b.b.b........",
     "......b.b.b.B.b.b.b.b.b.b.b.b.b.b.b.b.b.b.......",
     ".....b.b.b.b.B.b.b.b.b.b.b.b.b.b.b.b.b.b.b......",
     "......b.b.b.bBB.b.b.b.b.b.b.b.b.b.b.b.b.b.b.....",
     ".....b.b.b.b.bBB.b.b.b.b.b.b.b.b.b.b.b.b.b.b....",
     "....b.b.b.b.b.bBB.b.b.b.b.b.b.b.b.b.b.b.b.b.....",
     "...b.b.b.b.b.b.bBb.b.b.b.b.b.b.b.b.b.b.b.b.b....",
     "....b.b.b.b.b.b.bBb.b.b.b.b.b.b.b.b.b.b.b.b.b...",
     "...b.b.b.b.b.b.b.BBb.b.b.b.b.b.b.b.b.b.b.b.b.b..",
     "..b.b.b.b.b.b.b.b.BBb.b.b.b.b.b.b.b.b.b.b.b.b...",
     "...b.b.b.b.b.b.b.bKKKKKKKKKKKKKb.b.b.b.b.b.b.b..",
     "..b.b.b.b.b.b.b.b.b.BZTTZ.K.b.b.b.b.b.b.b.b.b.b.",
     ".b.b.b.b.b.b.b.b.b.OOOOOOOOOOb.b.b.b.b.b.b.b.b..",
     ".DDDb.b.b.b.b.b.bOOODDDDDOOOCCC.b.b.b.b.b.b.b.b.",
     "gDDD.b.WRRWb.b.b.OODDWWRWWOCCCCC.b.b.b.b.b.b.b..",
     "gDDDDDDRRRRDDDDDOODDDWWRWWDCCcCCb.b.b.b.b.b.b.b.",
     ".DDDDDDRRRRDDDDDOODDDRRRMMDCCCCC.b.b.b.b.b.b.b..",
     "..b.b.bWRRW.b.b.bOODDWWRWWOCCCCCb.b.b.b.b.b.b.b.",
     ".b.b.b.b.b.b.b.b.OOODWWRWWOOCCCb.b.b.b.b.b.b.b..",
     "..b.b.b.b.b.b.b.b.bOOOOOOOOOO.b.b.b.b.b.b.b.b.b.",
     ".b.b.b.b.b.b.b.b.b.b.ZTTZ.KB.b.b.b.b.b.b.b.b.b..",
     "..b.b.b.b.b.b.b.b.KKKKKKKKKKKKK.b.b.b.b.b.b.b...",
     "...b.b.b.b.b.b.b.b.b.b.b.b.b.B.b.b.b.b.b.b.b.b..",
     "..b.b.b.b.b.b.b.b.b.b.b.b.b.bBB.b.b.b.b.b.b.b...",
     "...b.b.b.b.b.b.b.b.b.b.b.b.b.bBB.b.b.b.b.b.b....",
     "....b.b.b.b.b.b.b.b.b.b.b.b.b.bBb.b.b.b.b.b.b...",
     ".....b.b.b.b.b.b.b.b.b.b.b.b.b.bBb.b.b.b.b.b....",
     "....b.b.b.b.b.b.b.b.b.b.b.b.b.b.BBb.b.b.b.b.....",
     ".....b.b.b.b.b.b.b.b.b.b.b.b.b.b.BBb.b.b.b......",
     "......b.b.b.b.b.b.b.b.b.b.b.b.b.b.BBb.b.b.b.....",
     ".......b.b.b.b.b.b.b.b.b.b.b.b.b.b.B.b.b.b......",
     "........b.b.b.b.b.b.b.b.b.b.b.b.b.b.B.b.b.......",
     ".........b.b.b.b.b.b.b.b.b.b.b.b.b.bBB.b........",
     "..........b.b.b.b.b.b.b.b.b.b.b.b.b.bBB.........",
     "...........b.b.b.b.b.b.b.b.b.b.b.b.b.b..........",
     "............b.b.b.b.b.b.b.b.b.b.b.b.............",
     "...............b.b.b.b.b.b.b.b.b.b..............",
     "................b.b.b.b.b.b.b.b.................",
     "...................b.b.b.b.b....................",
     "................................................"]
  ],
  legend: {K:'#1c1c1c', O:'#55633f', D:'#46523a', C:'#9fc4d2', c:'#d8eef4', Z:'#1a1a14', T:'#cdb98a', W:'#f4f1e6', R:'#cf2222', g:'#2b2b2b', B:'#1a1a1a', b:'#cfcfc6', M:'#333333'}
};

function drawMedevacHuey(ctx, x, y, scale, rotorPhase, heading) {
  scale = scale || 1; rotorPhase = (rotorPhase | 0) & 1; heading = heading || 0;
  const TAU = Math.PI * 2, fr = ctx.fillStyle;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(heading); ctx.scale(scale, scale);
  // skids
  ctx.fillStyle = '#1c1c1c'; ctx.fillRect(-12, -11, 26, 1.6); ctx.fillRect(-12, 9.4, 26, 1.6);
  ctx.fillRect(-6, -11, 1.5, 8); ctx.fillRect(4, -11, 1.5, 8); ctx.fillRect(-6, 3, 1.5, 8); ctx.fillRect(4, 3, 1.5, 8);
  // tail boom + fin
  ctx.fillStyle = '#46523a'; ctx.fillRect(-44, -2, 34, 4); ctx.fillRect(-46, -7, 5, 8);
  // tail-boom medevac marking: white square, red cross (visible even when the roof is hidden)
  ctx.fillStyle = '#f4f1e6'; ctx.fillRect(-34, -4, 8, 8); ctx.fillStyle = '#cf2222'; ctx.fillRect(-31, -3.5, 2, 7); ctx.fillRect(-33.5, -1, 7, 2);
  // fuselage
  ctx.fillStyle = '#55633f'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 8.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#46523a'; ctx.beginPath(); ctx.ellipse(-3, 0, 9, 6, 0, 0, TAU); ctx.fill();
  // nose glass
  ctx.fillStyle = '#9fc4d2'; ctx.beginPath(); ctx.ellipse(11, 0, 5.5, 5.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#d8eef4'; ctx.fillRect(10, -3, 2, 2);
  // open side doors: dark opening, tan litter inside
  ctx.fillStyle = '#1a1a14'; ctx.fillRect(-6, -10, 8, 2.6); ctx.fillRect(-6, 7.4, 8, 2.6);
  ctx.fillStyle = '#cdb98a'; ctx.fillRect(-5, -9.6, 5, 1.6); ctx.fillRect(-5, 8, 5, 1.6);
  // roof: big white square + red cross (same box as drawMedevac, slightly larger)
  ctx.fillStyle = '#f4f1e6'; ctx.fillRect(-6, -6, 12, 12); ctx.fillStyle = '#cf2222'; ctx.fillRect(-1.8, -5, 3.6, 10); ctx.fillRect(-5, -1.8, 10, 3.6);
  // tail rotor
  ctx.fillStyle = 'rgba(210,210,210,.55)'; ctx.save(); ctx.translate(-45, -3); ctx.rotate(rotorPhase ? 1.1 : 0); ctx.fillRect(-5, -.8, 10, 1.6); ctx.restore();
  // rotor blur disc + 2-phase blade
  ctx.globalAlpha = .13; ctx.fillStyle = '#cfcfc6'; ctx.beginPath(); ctx.arc(0, 0, 47, 0, TAU); ctx.fill();
  ctx.globalAlpha = .75; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.6; ctx.save(); ctx.rotate(rotorPhase ? .9 : 0);
  ctx.beginPath(); ctx.moveTo(-47, 0); ctx.lineTo(47, 0); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill();
  ctx.restore(); ctx.fillStyle = fr;
}
function drawMedevacHueyGrid(ctx, x, y, scale, rotorPhase, heading) {   // grid fallback, centred on x,y
  const g = MEDEVAC_HUEY.frames[(rotorPhase | 0) & 1], s = 2 * (scale || 1);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(heading || 0);
  for (let j = 0; j < g.length; j++) for (let i = 0; i < g[j].length; i++) { const c = MEDEVAC_HUEY.legend[g[j][i]]; if (c) { ctx.fillStyle = c; ctx.fillRect((i - 24) * s, (j - 24) * s, s + .5, s + .5) } }
  ctx.restore();
}
if (typeof module !== 'undefined') module.exports = { MEDEVAC_HUEY, drawMedevacHuey, drawMedevacHueyGrid };
