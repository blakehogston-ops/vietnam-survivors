/* music_ai.js (rc8.1) - Blake's Jungle Dread AI score replaces the old music. FILL-IN · AI MUSIC (ElevenLabs Starter, Indie conditions,
   PENDING the Steam AI-music disclosure sentence). Tracks are defined in audio/samples/manifest.js (ai_*); files in audio/music_ai/.
   ?music=old = debug opt-in back to the previous score (this file then changes nothing).
   Slot map (manifest aliases, so MUSX / SamplePlayer keep their logic):
     menu_theme (menu + briefing)  -> ai_menu    jungle_dread_menu
     intro_riff (insertion walk)   -> ai_full    jungle_dread_full   (the Valkyries opening scene is untouched and still owns the music while it plays)
     gameplay, no wave / pre-wave  -> ai_full    jungle_dread_full   (MusicAI.pick)
     gameplay, wave on             -> combat  -> ai_combat jungle_dread_combat (only combat tier: gunship/ramp boosts no longer swap tracks)
     extraction (bird inbound/pad) -> ai_final   jungle_final_wave   (the last stand on the pad = final wave)
     loss                          -> ai_over    cue_game_over, then ai_menu (aftermath) after it
     win                           -> unchanged  Marines' Hymn
   Crossfades 1.8 s. Cues (wave start, level up, extraction landing) play one at a time on the music bus AFTER the music duck, so a cue
   can duck the loop without ducking itself; they follow the music volume slider. Level-up is cut to ~1.9 s and ducks the loop -6 dB. */
(function () {
  var OLD = /[?&]music=old\b/.test(location.search);
  var M = window.MusicAI = { on: false, wave: false, waveAt: -1e9, log: [], XF: 1.8 };
  var mf = window.SAMPLE_MANIFEST, mu = mf && mf.music;
  if (OLD || !mu || !mu.tracks || !mu.tracks.ai_menu) return;
  M.on = true;
  mu.aliases = Object.assign({}, mu.aliases || {}, { menu_theme: 'ai_menu', intro_riff: 'ai_full', combat: 'ai_combat', extraction: 'ai_final', loss: 'ai_over' });
  mu.combatTiers = ['ai_combat'];
  M.list1 = function () { return ['ai_menu']; };
  M.list2 = function () { return ['scene_opening', 'ai_full', 'ai_combat', 'ai_final', 'win', 'ai_over', 'ai_river', 'ai_credits']; };   /* old score out of the load list (files stay in audio/music/) */
  M.fade = function (w) { return w === 'win' ? 0.1 : (w === 'loss' ? 0.3 : M.XF); };
  function X() { return window.__ms || {}; }   /* the game's debug/handle object (index.html): Snd, MIX, G, enemies */
  function now() { return performance.now() / 1000; }
  /* wave state, driven by the MUSI.set hook (pullback start = pre-wave break, assault / firebase wave = wave) */
  M.reset = function () { M.exT = 0; M.wave = false; M.waveAt = -1e9; M.lastLu = -1e9; M.st = null; M.ph5 = null; };
  M.onWave = function (wb, keep) {
    if (wb) { M.wave = false; return; }
    if (keep) return;
    var fresh = !M.wave || now() - M.waveAt > 8; M.wave = true; M.waveAt = now();
    if (fresh) M.cue('wave');
  };
  function nearFoes() { try { var g = X().G, en = X().enemies, n = 0; for (var i = 0; i < en.length; i++) { var e = en[i]; if (!e.dead && Math.abs(e.x - g.p.x) < 720 && Math.abs(e.y - g.p.y) < 520) n++; } return n; } catch (e) { return 99; } }
  M.pick = function (g, ex) {
    try { var ms = SamplePlayer.musicState && SamplePlayer.musicState();
      if (ms && ms.scene) {   /* the 12 s Valkyries clip owns the music; 1.8 s before it ends the scene is released and MUSX crossfades into this state's Jungle Dread track (no wait for ramp / liftoff) */
        var sp = mu.tracks.scene_opening || {}, t = now(); if (M.scT0 == null) M.scT0 = t;
        if (t - M.scT0 < (sp.dur || 12) - M.XF) return 'combat';
        M.scT0 = null; SamplePlayer.musicEvent('release'); try { X().MUSX.key = null; } catch (e) {} M.log.push({ t: +t.toFixed(2), scene: 'released' });
      } else M.scT0 = null;
    } catch (e) {}
    if (M.wave && now() - M.waveAt > 45 && nearFoes() < 4) M.wave = false;   /* a wave with no break call (firebase) ends when the area is quiet */
    if (M.wave) return 'combat';
    return M.explore();   /* 'intro_riff' = alias of ai_full: same MUSX key as the insertion walk, so the track carries on instead of restarting */
  };
  /* exploration: jungle_dread_full and jungle_river alternate, switching at the end of the current loop (capped at 150 s of exploring) */
  var EXL = { intro_riff: 144.5, ai_river: 115.0 };
  M.exK = 'intro_riff'; M.exT = 0; M.exL = 0;
  M.explore = function () {
    var t = now(), dt = M.exL ? Math.min(1, t - M.exL) : 0; M.exL = t; M.exT += dt;   /* only time spent exploring counts */
    if (M.exT >= Math.min(150, EXL[M.exK]) && SamplePlayer.hasMusic('ai_river')) { M.exK = M.exK === 'intro_riff' ? 'ai_river' : 'intro_riff'; M.exT = 0; M.log.push({ t: +t.toFixed(2), explore: M.exK }); }
    return M.exK;
  };
  /* credits: no end-credits screen exists, so jungle_credits plays once after the win Hymn finishes (same run), or while the
     credits panel (<details class="credits">) is open on the menu / end screen; when it ends or the panel closes the normal track returns */
  M.cr = null; M.winG = null; M.winAt = 0;
  document.addEventListener('toggle', function (e) { var d = e.target; if (!d || !d.classList || !d.classList.contains('credits')) return; M.cr = d.open ? now() : null; }, true);
  M.override = function (st, g) {
    var t = now(), ex = g && !g.demo ? g.ex : null;
    if (st === 'over' && ex && ex.result === 'evac') { if (M.winG !== g) { M.winG = g; M.winAt = t; } if (t - M.winAt > 29.6) return 'ai_credits'; }   /* Hymn (29.37 s) first, untouched */
    if (M.cr != null && (st === 'menu' || st === 'over' || st === 'brief') && t - M.cr < 146.5) return 'ai_credits';
    return null;
  };
  /* ---------- cues ---------- */
  var CUE = { wave: { f: 'cue_wave_start', k: 'ai_cue_wave', pr: 2, duck: -4 }, levelup: { f: 'cue_level_up', k: 'ai_cue_levelup', pr: 1, duck: -6, len: 1.55, fo: 0.35 }, landing: { f: 'cue_extraction_landing', k: 'ai_cue_landing', pr: 3, duck: -7 }   /* AD: same -7 dB as VO */ };
  var buf = {}, cur = null, ldd = false; M.fmt = {};
  function ctx() { try { return X().Snd.ctx; } catch (e) { return null; } }
  M.load = function () {
    var c = ctx(); if (ldd || !c) return; ldd = true;
    var ogg = false; try { ogg = !!new Audio().canPlayType('audio/ogg; codecs="vorbis"'); } catch (e) {}
    Object.keys(CUE).forEach(function (n) {
      /* same rule as SamplePlayer.pickFormats: ogg first; m4a first only when canPlayType('audio/ogg; codecs="vorbis"') is ''; the other format is the fallback */
      var fm = ogg ? ['ogg', 'm4a'] : ['m4a', 'ogg'];
      function get(i) { return fetch('audio/music_ai/' + CUE[n].f + '.' + fm[i]).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (ab) { return new Promise(function (res, rej) { c.decodeAudioData(ab, res, rej); }); }).then(function (b) { buf[n] = b; M.fmt[n] = fm[i]; })
        .catch(function (e) { if (i + 1 < fm.length) return get(i + 1); M.log.push('cue ' + n + ' failed ' + e); }); }
      get(0);
    });
  };
  M.cue = function (n) {
    var c = ctx(), d = CUE[n]; if (!c || !d || !buf[n]) return false;
    try { if (X().Snd.muted) return false; } catch (e) {}
    var t = c.currentTime;
    if (cur && cur.end > t) { if (CUE[cur.n].pr >= d.pr) { M.log.push({ t: +t.toFixed(2), skip: n, busy: cur.n }); return false; } try { cur.g.gain.cancelScheduledValues(t); cur.g.gain.setTargetAtTime(0, t, 0.05); cur.s.stop(t + 0.3); } catch (e) {} }
    var tr = (mu.tracks[d.k] || {}), lvl = (tr.gain || 1), vol = 1; try { vol = X().Snd.mbus.gain.value; } catch (e) {}
    var s = c.createBufferSource(); s.buffer = buf[n]; var g = c.createGain(); s.connect(g);
    var dest = null; try { dest = X().MIX.bus.mus; } catch (e) {} if (!dest) { try { dest = X().Snd.mbus; } catch (e) {} } if (!dest) return false;
    g.connect(dest);
    var len = d.len ? d.len + d.fo : buf[n].duration, end = t + len;
    g.gain.setValueAtTime(lvl * vol, t);
    if (d.len) { g.gain.setValueAtTime(lvl * vol, t + d.len); g.gain.linearRampToValueAtTime(0, end); s.start(t); s.stop(end + 0.02); } else s.start(t);
    try { SamplePlayer.duckMusic && SamplePlayer.duckMusic('aicue', d.duck, { attack: 0.06, until: end - 0.2, release: 0.6 }); } catch (e) {}
    cur = { n: n, s: s, g: g, end: end }; M.log.push({ t: +t.toFixed(2), cue: n, len: +len.toFixed(2) }); if (M.log.length > 100) M.log.shift();
    return true;
  };
  /* polled from MUSX.tick: level-up cards opening, the bird touching down */
  M.tick = function (st, g) {
    M.load();
    if (st === 'levelup' && M.st !== 'levelup' && now() - (M.lastLu || -1e9) > 4) { M.lastLu = now(); M.cue('levelup'); }
    M.st = st;
    var ex = g && !g.demo ? g.ex : null, p5 = !!(ex && ex.ph === 5);
    if (p5 && M.ph5 !== ex) { M.ph5 = ex; M.cue('landing'); }
  };
  M.reset();
})();
