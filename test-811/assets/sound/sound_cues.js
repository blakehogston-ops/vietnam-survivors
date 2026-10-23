/*!
 * sound_cues.js - original WebAudio synth cues for a 1968 Vietnam-era pixel survivor game.
 * Plain JS, no dependencies, no audio files, no samples. Everything is oscillators + cached noise buffers.
 *
 * Usage:
 *   Cues.m16(ctx, dst)                 // dst defaults to ctx.destination
 *   Cues.lowHealthHeartbeat(ctx, dst, 1.4)   // rate param, then opts
 *   Cues.buildTick(ctx, dst, 0.37)           // progress 0..1
 *   Cues.ribbonBugle(ctx, dst, 'silverStar') // tier name
 *   Cues.setLowEffects(true)           // tier 3 cues return null and play nothing
 * Every cue returns null (skipped) or { name, tier, start, duration, ... }.
 * Common opts on every cue: { vol: 0..n (default 1), when: absolute ctx time (default now) }.
 */
(function (root) {
  'use strict';

  var lowEffects = false;
  var stats = { played: 0, skippedLow: 0, skippedDeathCap: 0, duckedAir: 0, skippedDup: 0 };

  // ---------------------------------------------------------------- noise (cached per context)
  var noiseCache = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function getNoise(ctx, kind) {
    var entry = noiseCache.get(ctx);
    if (!entry) { entry = {}; noiseCache.set(ctx, entry); }
    if (entry[kind]) return entry[kind];
    var len = Math.floor(ctx.sampleRate * 2);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0), r = mulberry32(kind === 'brown' ? 1968 : 1965), last = 0;
    for (var i = 0; i < len; i++) {
      var w = r() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    entry[kind] = buf;
    return buf;
  }

  // ---------------------------------------------------------------- low-level building blocks
  function track(out, node) {            // disconnect `out` once all its sources ended
    if (!out || !node) return;
    out._n = (out._n || 0) + 1;
    node.onended = function () {
      if (--out._n <= 0) { try { out.disconnect(); } catch (e) { /* already gone */ } }
    };
  }
  function envelope(p, t, dur, vol, a, rel) {
    a = Math.min(a || 0.002, dur * 0.9);
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(Math.max(vol, 0.0002), t + a);
    if (rel != null) {                   // sustained note: hold, then linear release
      p.setValueAtTime(vol, t + Math.max(a, dur - rel));
      p.linearRampToValueAtTime(0.0001, t + dur);
    } else {
      p.exponentialRampToValueAtTime(0.0001, t + dur);
    }
  }
  function makeFilter(ctx, spec, t, dur) {   // spec: [type, f0, f1?, q?]
    var f = ctx.createBiquadFilter();
    f.type = spec[0];
    f.frequency.setValueAtTime(spec[1], t);
    if (spec[2] && spec[2] !== spec[1]) f.frequency.exponentialRampToValueAtTime(spec[2], t + dur);
    f.Q.value = spec[3] != null ? spec[3] : 0.7;
    return f;
  }
  // o: {t,dur,vol,a,rel, type,f0,f1,glide, detune, filters:[[type,f0,f1,q]], vib:{rate,cents}}
  function osc(ctx, out, o) {
    var t = o.t, dur = o.dur;
    var s = ctx.createOscillator();
    s.type = o.type || 'sine';
    s.frequency.setValueAtTime(o.f0, t);
    if (o.f1 && o.f1 !== o.f0) s.frequency.exponentialRampToValueAtTime(o.f1, t + (o.glide || dur));
    if (o.detune) s.detune.value = o.detune;
    var node = s;
    (o.filters || []).forEach(function (spec) { var f = makeFilter(ctx, spec, t, dur); node.connect(f); node = f; });
    var g = ctx.createGain();
    envelope(g.gain, t, dur, o.vol, o.a, o.rel);
    node.connect(g); g.connect(out);
    if (o.vib) {
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vib.rate; lg.gain.value = o.vib.cents;
      lfo.connect(lg); lg.connect(s.detune);
      lfo.start(t); lfo.stop(t + dur + 0.05); track(out, lfo);
    }
    s.start(t); s.stop(t + dur + 0.05); track(out, s);
    return t + dur;
  }
  // o: {t,dur,vol,a,rel, brown, filters:[...]}
  function noise(ctx, out, o) {
    var t = o.t, dur = o.dur;
    var s = ctx.createBufferSource();
    s.buffer = getNoise(ctx, o.brown ? 'brown' : 'white');
    s.loop = true;
    var node = s;
    (o.filters || []).forEach(function (spec) { var f = makeFilter(ctx, spec, t, dur); node.connect(f); node = f; });
    var g = ctx.createGain();
    envelope(g.gain, t, dur, o.vol, o.a, o.rel);
    node.connect(g); g.connect(out);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); track(out, s);
    return t + dur;
  }
  // convenience: thump = pitch-dropping sine
  function thump(ctx, out, t, f0, f1, dur, vol) {
    return osc(ctx, out, { t: t, dur: dur, vol: vol, type: 'sine', f0: f0, f1: f1, a: 0.002 });
  }
  function hz(note) { return 440 * Math.pow(2, (note - 69) / 12); }   // MIDI -> Hz
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // ---------------------------------------------------------------- the cues (raw bodies)
  // Each body: function (ctx, out, t, p, o) -> duration in seconds. p = primary param (rate / progress / tier name).
  var BODY = {};

  // ===== TIER 1 =====
  BODY.lowHealthHeartbeat = function (ctx, out, t, rate) {
    rate = Math.max(0.5, Math.min(3, rate || 1));
    var gap = 0.19 / Math.sqrt(rate), pitch = 1 + (rate - 1) * 0.08;
    // "lub"
    thump(ctx, out, t, 70 * pitch, 38, 0.17, 0.95);
    noise(ctx, out, { t: t, dur: 0.06, vol: 0.12, brown: true, filters: [['lowpass', 220]] });
    // "dub" (a bit softer, higher)
    thump(ctx, out, t + gap, 85 * pitch, 45, 0.15, 0.7);
    return gap + 0.2;
  };
  BODY.bossSpawn = function (ctx, out, t) {
    // dark drone with slow filter swell + two descending horn blasts + war-drum hits
    [55, 55.7, 82.4].forEach(function (f, i) {
      osc(ctx, out, { t: t, dur: 2.0, vol: 0.2, type: 'sawtooth', f0: f, a: 0.5, rel: 0.9,
        filters: [['lowpass', 180, 700, 2]] });
    });
    [[0.05, 110, 98], [0.75, 98, 82.4]].forEach(function (h) {
      osc(ctx, out, { t: t + h[0], dur: 0.6, vol: 0.28, type: 'square', f0: h[1], f1: h[2], glide: 0.5, a: 0.04, rel: 0.2,
        filters: [['lowpass', 520, 380, 1.5]], vib: { rate: 5, cents: 12 } });
    });
    [0, 0.375, 0.75, 1.125].forEach(function (d, i) {
      thump(ctx, out, t + d, 95, 40, 0.28, i % 2 ? 0.6 : 0.9);
      noise(ctx, out, { t: t + d, dur: 0.05, vol: 0.18, filters: [['lowpass', 900]] });
    });
    return 2.1;
  };
  BODY.b40Launch = function (ctx, out, t) {
    // launch "thoomp", then a hissing, rising rocket whoosh, with a sharp high pip so it cuts through gunfire
    thump(ctx, out, t, 150, 45, 0.16, 0.9);
    noise(ctx, out, { t: t, dur: 0.1, vol: 0.45, filters: [['bandpass', 900, 500, 0.8]] });
    noise(ctx, out, { t: t + 0.05, dur: 0.85, vol: 0.5, a: 0.3,
      filters: [['bandpass', 500, 3200, 1.1], ['highpass', 300]] });
    osc(ctx, out, { t: t + 0.04, dur: 0.12, vol: 0.2, type: 'square', f0: 1760, f1: 1320, a: 0.005 });
    return 1.0;
  };
  BODY.tankLost = function (ctx, out, t) {
    thump(ctx, out, t, 95, 26, 0.7, 1.0);
    noise(ctx, out, { t: t, dur: 0.9, vol: 0.55, filters: [['lowpass', 1800, 120, 0.8]] });
    // metal clank: inharmonic partials
    [210, 337, 561, 890].forEach(function (f, i) {
      osc(ctx, out, { t: t + 0.02, dur: 0.6 - i * 0.08, vol: 0.14, type: 'triangle', f0: f, f1: f * 0.92 });
    });
    // sad two-note descending sting
    osc(ctx, out, { t: t + 0.55, dur: 0.45, vol: 0.2, type: 'square', f0: hz(57), a: 0.01, rel: 0.2, filters: [['lowpass', 900]] });
    osc(ctx, out, { t: t + 0.95, dur: 0.7, vol: 0.2, type: 'square', f0: hz(52), a: 0.01, rel: 0.4, filters: [['lowpass', 700]] });
    return 1.7;
  };
  BODY.uiTick = function (ctx, out, t) {
    osc(ctx, out, { t: t, dur: 0.03, vol: 0.3, type: 'square', f0: 1900, f1: 1400, a: 0.001 });
    noise(ctx, out, { t: t, dur: 0.012, vol: 0.18, filters: [['highpass', 4000]] });
    return 0.05;
  };
  BODY.levelUpSwell = function (ctx, out, t) {
    osc(ctx, out, { t: t, dur: 0.6, vol: 0.2, type: 'sawtooth', f0: 220, f1: 660, a: 0.5, filters: [['lowpass', 500, 3000, 1]] });
    noise(ctx, out, { t: t, dur: 0.6, vol: 0.14, a: 0.5, filters: [['bandpass', 600, 4000, 0.9]] });
    // bright resolve chord (A major) at the top of the swell
    [hz(69), hz(73), hz(76), hz(81)].forEach(function (f) {
      osc(ctx, out, { t: t + 0.55, dur: 0.55, vol: 0.14, type: 'triangle', f0: f, a: 0.004 });
    });
    return 1.15;
  };
  BODY.readyTick = function (ctx, out, t) {
    osc(ctx, out, { t: t, dur: 0.07, vol: 0.18, type: 'sine', f0: 1320, a: 0.003 });
    osc(ctx, out, { t: t + 0.06, dur: 0.1, vol: 0.2, type: 'sine', f0: 1760, a: 0.003 });
    return 0.2;
  };

  BODY.perkRadio = function (ctx, out, t) {
    // level-up / perk-card popup, played OFTEN, so it is deliberately small and soft (replaces levelUpSwell on the cards; levelUpSwell stays in the pack).
    // Radio transmission: push-to-talk click, ~0.25 s of band-limited static, two short RISING chirps (~0.15 s each, second one higher), un-key tick. ~0.8 s.
    noise(ctx, out, { t: t, dur: 0.012, vol: 0.45, a: 0.0005, filters: [['bandpass', 2000, 2000, 1.2], ['highpass', 800]] });                 // PTT click
    osc(ctx, out, { t: t, dur: 0.03, vol: 0.1, type: 'square', f0: 900, a: 0.002, filters: [['lowpass', 2500]] });
    noise(ctx, out, { t: t + 0.03, dur: 0.25, vol: 0.42, a: 0.02, rel: 0.08, filters: [['bandpass', 1800, 1500, 2.2], ['highpass', 500]] });   // static
    [[0.33, 880, 1320], [0.51, 1100, 1760]].forEach(function (c) {
      osc(ctx, out, { t: t + c[0], dur: 0.15, vol: 0.34, type: 'triangle', f0: c[1], f1: c[2], a: 0.01, rel: 0.05,
        filters: [['bandpass', (c[1] + c[2]) / 2, null, 1.2], ['highpass', 500]] });                                                           // chirp (speaker-band)
    });
    noise(ctx, out, { t: t + 0.33, dur: 0.33, vol: 0.04, a: 0.05, filters: [['bandpass', 2000, 1800, 1]] });                                  // faint hiss under the chirps
    noise(ctx, out, { t: t + 0.72, dur: 0.015, vol: 0.28, filters: [['bandpass', 2400, 2400, 1]] });                                          // un-key tick
    return 0.8;
  };
  BODY.medpackPickup = function (ctx, out, t) {
    // warm, rising two-note chime (A4 -> E5, a perfect fifth up). Sits LOWER and softer than readyTick (1320/1760 Hz sines),
    // boardingChime (bell partials at 784/1175 Hz) and uiTick (square click): triangle + octave-down sine, lowpassed, with a slow bloom.
    [[69, 0, 0.2], [76, 0.13, 0.55]].forEach(function (n, i) {
      var f = hz(n[0]), s = t + n[1], dur = n[2] + (i ? 0.25 : 0);
      osc(ctx, out, { t: s, dur: dur, vol: 0.3, type: 'triangle', f0: f, a: 0.012, rel: dur * 0.7, filters: [['lowpass', 2200, null, 0.6]] });
      osc(ctx, out, { t: s, dur: dur, vol: 0.2, type: 'sine', f0: f / 2, a: 0.015, rel: dur * 0.7 });                 // warmth
      osc(ctx, out, { t: s, dur: dur, vol: 0.12, type: 'sine', f0: f * 2.0, detune: 7, a: 0.02, rel: dur * 0.6 });    // soft shimmer
    });
    return 0.13 + 0.8;
  };
  BODY.reinforcementCall = function (ctx, out, t) {
    // radio key-up squelch, then a short rising "incoming" sting (G4 -> C5 -> E5 -> G5 stabs, band-limited like a radio speaker),
    // ending on a rising whine and an un-key click.
    noise(ctx, out, { t: t, dur: 0.13, vol: 0.3, a: 0.01, filters: [['bandpass', 1800, 1500, 2.5], ['highpass', 500]] });
    osc(ctx, out, { t: t + 0.01, dur: 0.05, vol: 0.07, type: 'square', f0: 1000, a: 0.003 });
    var s = t + 0.2;
    [67, 72, 76].forEach(function (m, i) {
      osc(ctx, out, { t: s + i * 0.1, dur: 0.1, vol: 0.2, type: 'square', f0: hz(m), a: 0.006, rel: 0.04,
        filters: [['highpass', 350], ['lowpass', 2600]] });
    });
    osc(ctx, out, { t: s + 0.3, dur: 0.42, vol: 0.2, type: 'sawtooth', f0: hz(79), f1: hz(91), glide: 0.4, a: 0.03, rel: 0.2,
      filters: [['bandpass', 1500, 2200, 0.9]] });
    noise(ctx, out, { t: s + 0.3, dur: 0.42, vol: 0.07, a: 0.1, filters: [['bandpass', 2000, 2600, 1.2]] });          // radio hiss under the whine
    noise(ctx, out, { t: s + 0.75, dur: 0.02, vol: 0.22, filters: [['bandpass', 2400, 2400, 1]] });                    // un-key click
    return 1.0;
  };

  BODY.medevacCall = function (ctx, out, t) {
    // calm "Dustoff inbound" call: radio squelch, two soft roger pips, then a slow, DESCENDING pair of rounded notes (A4 -> F4) and un-key.
    // Distinct from reinforcementCall, which is urgent: square stabs rising G4-C5-E5 plus a rising whine.
    noise(ctx, out, { t: t, dur: 0.13, vol: 0.26, a: 0.01, filters: [['bandpass', 1700, 1400, 2.5], ['highpass', 500]] });
    osc(ctx, out, { t: t + 0.01, dur: 0.05, vol: 0.06, type: 'square', f0: 1000, a: 0.003 });
    [0.2, 0.31].forEach(function (d) {
      osc(ctx, out, { t: t + d, dur: 0.06, vol: 0.16, type: 'sine', f0: 880, a: 0.004, rel: 0.03, filters: [['bandpass', 880, null, 2]] });
    });
    osc(ctx, out, { t: t + 0.5, dur: 0.28, vol: 0.24, type: 'triangle', f0: hz(69), a: 0.03, rel: 0.12, filters: [['lowpass', 1800], ['highpass', 300]] });
    osc(ctx, out, { t: t + 0.78, dur: 0.5, vol: 0.24, type: 'triangle', f0: hz(65), a: 0.03, rel: 0.3, filters: [['lowpass', 1600], ['highpass', 300]] });
    noise(ctx, out, { t: t + 0.5, dur: 0.78, vol: 0.04, filters: [['bandpass', 2000, 1800, 1]] });                    // faint radio hiss
    noise(ctx, out, { t: t + 1.3, dur: 0.02, vol: 0.18, filters: [['bandpass', 2400, 2400, 1]] });                     // un-key click
    return 1.35;
  };

  // ===== TIER 2: small arms =====
  BODY.m16 = function (ctx, out, t) {
    // sharp, high crack (5.56)
    noise(ctx, out, { t: t, dur: 0.07, vol: 0.7, filters: [['highpass', 1800], ['lowpass', 7500]] });
    thump(ctx, out, t, 220, 80, 0.06, 0.45);
    noise(ctx, out, { t: t + 0.01, dur: 0.18, vol: 0.12, filters: [['bandpass', 1100, 500, 0.7]] });   // short report tail
    return 0.25;
  };
  BODY.m60 = function (ctx, out, t, p, o) {
    // slow heavy chatter (7.62): bursts at ~9 rounds/sec
    var shots = o.shots || 3;
    for (var i = 0; i < shots; i++) {
      var s = t + i * 0.11, k = 1 - i * 0.04;
      noise(ctx, out, { t: s, dur: 0.1, vol: 0.55 * k, filters: [['lowpass', 3200, 900, 0.7], ['highpass', 250]] });
      thump(ctx, out, s, 130, 52, 0.12, 0.8 * k);
      noise(ctx, out, { t: s, dur: 0.03, vol: 0.25, filters: [['highpass', 2500]] });
    }
    noise(ctx, out, { t: t + (shots - 1) * 0.11, dur: 0.3, vol: 0.12, brown: true, filters: [['lowpass', 500]] });   // echo
    return (shots - 1) * 0.11 + 0.35;
  };
  BODY.m79 = function (ctx, out, t, p, o) {
    // hollow "thunk" from the tube... then the burst downrange
    thump(ctx, out, t, 150, 55, 0.14, 0.9);
    noise(ctx, out, { t: t, dur: 0.1, vol: 0.28, filters: [['bandpass', 420, 280, 2.5]] });
    osc(ctx, out, { t: t, dur: 0.12, vol: 0.12, type: 'triangle', f0: 330, f1: 200 });   // hollow ring of the tube
    var burst = (o.burst === false) ? 0 : 1;
    if (burst) {
      var b = t + (o.delay != null ? o.delay : 0.45);
      thump(ctx, out, b, 80, 32, 0.4, 0.7);
      noise(ctx, out, { t: b, dur: 0.45, vol: 0.4, filters: [['lowpass', 2000, 200, 0.7]] });
    }
    return burst ? (o.delay != null ? o.delay : 0.45) + 0.5 : 0.25;
  };
  BODY.ak47 = function (ctx, out, t) {
    // deeper than the m16: lower crack band, heavier body, longer tail
    noise(ctx, out, { t: t, dur: 0.1, vol: 0.62, filters: [['highpass', 600], ['lowpass', 3600, 1800, 0.8]] });
    thump(ctx, out, t, 150, 58, 0.11, 0.85);
    osc(ctx, out, { t: t, dur: 0.04, vol: 0.14, type: 'square', f0: 95, a: 0.001, filters: [['lowpass', 500]] });
    noise(ctx, out, { t: t + 0.015, dur: 0.26, vol: 0.18, filters: [['bandpass', 650, 300, 0.7]] });
    return 0.32;
  };
  BODY.boltRifleCrack = function (ctx, out, t) {
    // M1903 Springfield (.30-06) single shot: slower and louder than m16/ak47. A hard but not-so-bright crack (band 500 Hz to ~4 kHz,
    // lower than m16), a heavy pitch-dropping body thump, and a LONG low-mid tail (bandpass ~600 -> 180 Hz, ~0.5 s) plus a brown-noise
    // rumble, so it rings out like a big rifle over open ground. ~0.6 s.
    noise(ctx, out, { t: t, dur: 0.09, vol: 0.5, a: 0.001, filters: [['highpass', 300], ['lowpass', 2200, 1000, 0.8]] });      // crack
    thump(ctx, out, t, 120, 42, 0.22, 0.9);                                                                                       // heavy body
    osc(ctx, out, { t: t, dur: 0.06, vol: 0.14, type: 'square', f0: 85, a: 0.001, filters: [['lowpass', 450]] });                 // chest punch
    noise(ctx, out, { t: t + 0.01, dur: 0.6, vol: 0.5, a: 0.01, filters: [['bandpass', 650, 180, 0.8]] });                      // low-mid report tail
    noise(ctx, out, { t: t + 0.03, dur: 0.6, vol: 0.3, brown: true, a: 0.03, filters: [['lowpass', 380]] });                     // rumble / far echo
    noise(ctx, out, { t: t + 0.22, dur: 0.3, vol: 0.05, filters: [['bandpass', 900, 500, 0.9]] });                               // faint slap-back echo
    return 0.6;
  };
  BODY.boltCycle = function (ctx, out, t) {
    // bolt-action cycle, four metal events inside ~0.5 s: LIFT (handle up, quick click), PULL BACK (short rasp + end-stop clack),
    // PUSH FORWARD (rasp + soft chamber tick), LOCK (handle down: the loudest, most solid clack). Small inharmonic metal partials,
    // no low end, so it stays out of the way of the crack's tail. Meant to be quiet next to boltRifleCrack.
    function clack(at, vol, f) {
      noise(ctx, out, { t: at, dur: 0.012, vol: vol, a: 0.0005, filters: [['bandpass', f, f, 1.6], ['highpass', 1200]] });
      [1, 2.31, 3.97].forEach(function (m, i) {
        osc(ctx, out, { t: at, dur: 0.05 - i * 0.012, vol: vol * 0.45 / (i + 1), type: 'triangle', f0: f * m * 0.5, a: 0.0008 });
      });
    }
    function rasp(at, dur, vol, f0, f1) {
      noise(ctx, out, { t: at, dur: dur, vol: vol, a: dur * 0.2, filters: [['bandpass', f0, f1, 1.2], ['highpass', 1500]] });
    }
    clack(t, 0.5, 2600);                                       // lift
    rasp(t + 0.1, 0.09, 0.14, 2400, 3200);                     // pull back, slide
    clack(t + 0.2, 0.6, 2100);                                 // pull back, end stop
    rasp(t + 0.29, 0.08, 0.12, 3200, 2400);                    // push forward, slide
    clack(t + 0.37, 0.4, 3000);                                // chamber tick
    clack(t + 0.45, 0.9, 1800);                                // lock (handle down), heaviest
    thump(ctx, out, t + 0.45, 260, 140, 0.04, 0.1);
    return 0.5;
  };
  BODY.claymore = function (ctx, out, t) {
    // short, sharp blast + scatter of steel balls (not a big fireball)
    noise(ctx, out, { t: t, dur: 0.2, vol: 0.75, filters: [['bandpass', 2600, 1200, 0.6]] });
    thump(ctx, out, t, 140, 50, 0.16, 0.8);
    for (var i = 0; i < 14; i++) {
      noise(ctx, out, { t: t + 0.02 + i * 0.012 + rnd(0, 0.008), dur: 0.012, vol: rnd(0.1, 0.25), filters: [['highpass', 5000 + rnd(0, 2000)]] });
    }
    return 0.3;
  };
  BODY.mortarThump = function (ctx, out, t, p, o) {
    // tube "bloop": low pitch-dropped thump + muzzle breath; optional falling whistle
    thump(ctx, out, t, 210, 48, 0.28, 1.0);
    noise(ctx, out, { t: t, dur: 0.25, vol: 0.3, filters: [['lowpass', 700, 180, 0.8]] });
    osc(ctx, out, { t: t + 0.02, dur: 0.18, vol: 0.1, type: 'triangle', f0: 320, f1: 140 });
    if (o.whistle) osc(ctx, out, { t: t + 0.4, dur: 0.9, vol: 0.05, type: 'sine', f0: 2600, f1: 900, a: 0.5 });
    return o.whistle ? 1.3 : 0.45;
  };

  // ===== TIER 2: air calls (limited to 2 at full volume) =====
  BODY.airStrafe = function (ctx, out, t) {
    var d = 1.5;
    // jet flyby (doppler-ish pitch fall + swell)
    osc(ctx, out, { t: t, dur: d, vol: 0.12, type: 'sawtooth', f0: 520, f1: 300, a: 0.5, filters: [['lowpass', 1400]] });
    noise(ctx, out, { t: t, dur: d, vol: 0.2, a: 0.55, filters: [['bandpass', 1100, 500, 0.6]] });
    // 20mm cannon: noise gated by a ~26 Hz square LFO = "brrrrt" tearing sound
    var n = ctx.createBufferSource(); n.buffer = getNoise(ctx, 'white'); n.loop = true;
    var bp = makeFilter(ctx, ['bandpass', 1700, 1000, 0.5], t, 0.8);
    var gate = ctx.createGain(); gate.gain.value = 0.5;
    var lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 26;
    var lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(gate.gain);
    var env = ctx.createGain(); envelope(env.gain, t + 0.35, 0.85, 0.6, 0.02, 0.15);
    n.connect(bp); bp.connect(gate); gate.connect(env); env.connect(out);
    n.start(t, 0.2); n.stop(t + 1.3); lfo.start(t); lfo.stop(t + 1.3); track(out, n); track(out, lfo);
    // low thud-gate for body
    osc(ctx, out, { t: t + 0.35, dur: 0.8, vol: 0.18, type: 'square', f0: 52, a: 0.02, rel: 0.2, filters: [['lowpass', 160]] });
    return d;
  };
  BODY.napalmWhoomph = function (ctx, out, t) {
    thump(ctx, out, t, 75, 30, 0.7, 1.0);
    noise(ctx, out, { t: t, dur: 1.4, vol: 0.65, a: 0.09, filters: [['lowpass', 900, 130, 0.8]] });
    noise(ctx, out, { t: t + 0.05, dur: 1.0, vol: 0.18, a: 0.15, brown: true, filters: [['lowpass', 350]] });
    for (var i = 0; i < 9; i++) {      // fire crackle
      noise(ctx, out, { t: t + 0.25 + rnd(0, 1.0), dur: 0.015, vol: rnd(0.05, 0.16), filters: [['highpass', 2500]] });
    }
    return 1.5;
  };
  BODY.tankerFlyover = function (ctx, out, t, p, o) {
    // four-engine low roar swelling in and out, pitch drifting down as it passes. opts.flightLine = Hogston flavour.
    var lead = 0, d = 2.8;
    if (o.flightLine) {                 // turbine spool + fuel-boom clank before the pass
      osc(ctx, out, { t: t, dur: 0.7, vol: 0.1, type: 'sine', f0: 400, f1: 2000, a: 0.6, filters: [['lowpass', 3000]] });
      osc(ctx, out, { t: t + 0.7, dur: 0.18, vol: 0.2, type: 'triangle', f0: 520 });
      osc(ctx, out, { t: t + 0.7, dur: 0.14, vol: 0.14, type: 'triangle', f0: 1290 });
      lead = 0.55;
    } else if (o.radio !== false && !lowEffects) {
      BODY.radioSquelch(ctx, out, t, null, {});
    }
    var s = t + lead;
    [78, 79.6, 81.5, 83.1].forEach(function (f, i) {
      osc(ctx, out, { t: s, dur: d, vol: 0.13, type: 'sawtooth', f0: f * 1.12, f1: f * 0.88, a: 1.2,
        filters: [['lowpass', 260, 520, 1.2]], detune: (i - 1.5) * 6 });
    });
    noise(ctx, out, { t: s, dur: d, vol: 0.38, a: 1.2, filters: [['bandpass', 300, 160, 0.7]] });
    noise(ctx, out, { t: s + 0.2, dur: d - 0.2, vol: 0.1, a: 1.0, filters: [['bandpass', 1200, 700, 0.5]] });   // turbine hiss
    return lead + d;
  };
  BODY.medevacHuey = function (ctx, out, t) {
    // ONE Huey: slow approach swell (~1.7 s), then a steady, closer, brighter hover (~1.3 s) with the tail-rotor / turbine whine.
    // No touchdown thump (it hovers); lower and steadier than the four-ship reinforcementHueys. Voice budget: 2 rotor + 1 sub + 1 whine = 4.
    var d = 3.0;
    rotorLayer(ctx, out, { t: t, dur: d, vol: 0.5, a: 1.7, rel: 0.7, rate: 10.8, lp0: 150, lp1: 520 });
    osc(ctx, out, { t: t, dur: d, vol: 0.12, type: 'sine', f0: 50, f1: 54, a: 1.7, rel: 0.7 });
    osc(ctx, out, { t: t + 0.8, dur: d - 0.8, vol: 0.035, type: 'sine', f0: 1050, f1: 1180, a: 1.0, rel: 0.6 });         // whine
    return d;
  };
  BODY.medevacHeal = function (ctx, out, t) {
    // ONE soft, warm, shimmering swell for the whole heal pulse (A major add9: A3 A4 C#5 E5 B5). Slow bloom, slightly detuned pairs
    // for shimmer, gentle tremolo, a few quiet high sparkles. Always a single sound regardless of how many units are healed.
    var d = 1.6;
    [[57, 0.16, 0], [69, 0.17, -6], [69, 0.12, 6], [73, 0.14, -4], [73, 0.1, 5], [76, 0.14, 0], [83, 0.05, 3]].forEach(function (n, i) {
      osc(ctx, out, { t: t, dur: d, vol: n[1], type: i === 0 ? 'triangle' : 'sine', f0: hz(n[0]), detune: n[2], a: 0.45, rel: 0.9,
        filters: [['lowpass', 3200, null, 0.5]], vib: i > 0 ? { rate: 4.5 + i * 0.3, cents: 5 } : null });
    });
    [88, 85, 92].forEach(function (m, i) {     // sparkles
      osc(ctx, out, { t: t + 0.45 + i * 0.16, dur: 0.35, vol: 0.035, type: 'sine', f0: hz(m), a: 0.01 });
    });
    return d;
  };
  BODY.signalPop = function (ctx, out, t) {
    // "pop" of the canister, then the long smoke hiss
    thump(ctx, out, t, 320, 90, 0.07, 0.8);
    noise(ctx, out, { t: t, dur: 0.05, vol: 0.4, filters: [['bandpass', 1500, 800, 0.8]] });
    noise(ctx, out, { t: t + 0.05, dur: 2.0, vol: 0.2, a: 0.25, filters: [['highpass', 2200], ['bandpass', 4200, 2600, 0.6]] });
    return 2.1;
  };
  BODY.boardingChime = function (ctx, out, t) {
    // two bell-like dings; inharmonic partials
    [[0, 784], [0.22, 1175]].forEach(function (n) {
      [[1, 0.28], [2.76, 0.1], [5.4, 0.04]].forEach(function (pt) {
        osc(ctx, out, { t: t + n[0], dur: 0.9 / pt[0] + 0.15, vol: pt[1], type: 'sine', f0: n[1] * pt[0], a: 0.002 });
      });
    });
    return 1.2;
  };
  BODY.buildTick = function (ctx, out, t, progress) {
    progress = Math.max(0, Math.min(1, progress == null ? 0 : progress));
    var f = 300 * Math.pow(2, progress * 1.6);       // 300 -> ~910 Hz as the bar fills
    osc(ctx, out, { t: t, dur: 0.06, vol: 0.4, type: 'triangle', f0: f, f1: f * 0.8, a: 0.001 });
    noise(ctx, out, { t: t, dur: 0.02, vol: 0.2, filters: [['bandpass', f * 3, f * 3, 1.5]] });
    return 0.1;
  };
  BODY.buildStageComplete = function (ctx, out, t, p, o) {
    var stage = Math.max(1, Math.min(3, o.stage || 1));
    var seq = [60, 64, 67, 72].slice(0, stage + 1);   // C-E-G-C: 2, 3 or 4 notes for stage 1..3
    seq.forEach(function (n, i) {
      var last = i === seq.length - 1, s = t + i * 0.1;
      osc(ctx, out, { t: s, dur: last ? 0.55 : 0.16, vol: 0.2, type: 'square', f0: hz(n + 12), a: 0.005, rel: last ? 0.3 : 0.06, filters: [['lowpass', 1800]] });
      osc(ctx, out, { t: s, dur: last ? 0.55 : 0.16, vol: 0.18, type: 'sawtooth', f0: hz(n), a: 0.005, rel: last ? 0.3 : 0.06, filters: [['lowpass', 900]] });
    });
    thump(ctx, out, t, 110, 50, 0.15, 0.6);
    noise(ctx, out, { t: t, dur: 0.05, vol: 0.2, filters: [['lowpass', 1200]] });   // sandbag thud
    return (seq.length - 1) * 0.1 + 0.6;
  };

  // --- helicopter rotor layer: brown noise gated by a falling-sawtooth LFO (sharp "whop", then decay) at the UH-1's ~10.8 Hz blade-pass rate.
  // 2 sources per layer (noise + LFO). o: {t,dur,vol,a,rel, rate, lp0,lp1}
  function rotorLayer(ctx, out, o) {
    var t = o.t, dur = o.dur;
    var n = ctx.createBufferSource(); n.buffer = getNoise(ctx, 'brown'); n.loop = true;
    var lp = makeFilter(ctx, ['lowpass', o.lp0, o.lp1, 0.8], t, dur);
    var gate = ctx.createGain(); gate.gain.value = 0.4;
    var lfo = ctx.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = o.rate;
    var lg = ctx.createGain(); lg.gain.value = -0.38; lfo.connect(lg); lg.connect(gate.gain);
    var env = ctx.createGain(); envelope(env.gain, t, dur, o.vol, o.a, o.rel);
    n.connect(lp); lp.connect(gate); gate.connect(env); env.connect(out);
    n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
    track(out, n); track(out, lfo);
  }
  BODY.reinforcementHueys = function (ctx, out, t, p, o) {
    // ~4 s: four rotor layers (slightly different blade rates so they phase against each other) swell in from a distance,
    // brighten as they close, then touch down at ~3 s with a dust-puff and settle. Voice budget (default): 4 x 2 rotor sources
    // + 1 shared sub-rumble + 1 touchdown thump + 1 dust noise = 11 short-lived sources. opts.layers (1..4) lowers it.
    var layers = Math.max(1, Math.min(4, Math.round(o.layers != null ? o.layers : 4)));
    var d = 4.0, rates = [10.4, 10.9, 11.3, 11.8], offs = [0, 0.18, 0.4, 0.62], lps = [420, 380, 340, 300];
    for (var i = 0; i < layers; i++) {
      rotorLayer(ctx, out, { t: t + offs[i] * 0.5, dur: d - offs[i] * 0.5, vol: 0.5 / Math.sqrt(layers) * 0.9, a: 2.2 + offs[i], rel: 0.9,
        rate: rates[i], lp0: 140, lp1: lps[i] * 2.2 });
    }
    osc(ctx, out, { t: t, dur: d, vol: 0.14, type: 'sine', f0: 48, f1: 56, a: 2.4, rel: 0.8 });                          // shared sub-rumble
    thump(ctx, out, t + 2.95, 70, 34, 0.3, 0.55);                                                                      // skids/wheels settle
    noise(ctx, out, { t: t + 2.9, dur: 0.9, vol: 0.12, a: 0.15, filters: [['bandpass', 900, 400, 0.6]] });             // dust puff
    return d;
  };

  BODY.medpackDrop = function (ctx, out, t) {
    // soft pouch-drop: muffled cloth thud + a faint rustle, then a small bright ping (a tin clasp / ampoule), quiet enough to not mask combat
    thump(ctx, out, t, 135, 62, 0.12, 0.8);
    noise(ctx, out, { t: t, dur: 0.09, vol: 0.22, brown: true, filters: [['lowpass', 380, 160, 0.7]] });
    noise(ctx, out, { t: t + 0.03, dur: 0.1, vol: 0.07, filters: [['bandpass', 2200, 1400, 0.8]] });                    // cloth rustle
    osc(ctx, out, { t: t + 0.07, dur: 0.3, vol: 0.14, type: 'sine', f0: 2349, a: 0.002 });                           // ping (D7-ish, short)
    osc(ctx, out, { t: t + 0.07, dur: 0.12, vol: 0.05, type: 'sine', f0: 2349 * 2.76, a: 0.002 });
    return 0.4;
  };

  BODY.sandbagThud = function (ctx, out, t) {
    // short, dull thud: a sandbag wall segment settling. Low-passed, almost no top end.
    thump(ctx, out, t, 105, 52, 0.11, 0.9);
    noise(ctx, out, { t: t, dur: 0.08, vol: 0.3, brown: true, filters: [['lowpass', 420, 180, 0.7]] });
    return 0.15;
  };
  BODY.turretCorner = function (ctx, out, t) {
    // corner turret finished: deeper + heavier than the sandbag thud, with a low metal clunk
    thump(ctx, out, t, 78, 36, 0.26, 1.0);
    noise(ctx, out, { t: t, dur: 0.16, vol: 0.38, brown: true, filters: [['lowpass', 480, 150, 0.7]] });
    osc(ctx, out, { t: t + 0.01, dur: 0.22, vol: 0.12, type: 'triangle', f0: 170, f1: 150 });
    osc(ctx, out, { t: t + 0.01, dur: 0.16, vol: 0.07, type: 'triangle', f0: 421, f1: 390 });
    return 0.32;
  };
  BODY.turretMid = function (ctx, out, t) {
    // mid-wall turret finished: between sandbag and corner in weight, with a lighter, higher metal clink
    thump(ctx, out, t, 92, 44, 0.18, 0.85);
    noise(ctx, out, { t: t, dur: 0.12, vol: 0.3, brown: true, filters: [['lowpass', 520, 200, 0.7]] });
    osc(ctx, out, { t: t + 0.01, dur: 0.18, vol: 0.12, type: 'triangle', f0: 247, f1: 225 });
    osc(ctx, out, { t: t + 0.01, dur: 0.12, vol: 0.08, type: 'triangle', f0: 612, f1: 560 });
    return 0.25;
  };

  // ===== TIER 3 =====
  BODY.deathBullet = function (ctx, out, t) {
    thump(ctx, out, t, 130, 60, 0.07, 0.6);
    noise(ctx, out, { t: t, dur: 0.06, vol: 0.2, filters: [['lowpass', 600]] });
    return 0.1;
  };
  BODY.deathHeavy = function (ctx, out, t) {
    thump(ctx, out, t, 95, 38, 0.22, 0.9);
    noise(ctx, out, { t: t, dur: 0.2, vol: 0.4, filters: [['lowpass', 900, 250, 0.8]] });
    noise(ctx, out, { t: t + 0.03, dur: 0.16, vol: 0.15, filters: [['bandpass', 350, 180, 2]] });   // wet squelch
    return 0.3;
  };
  BODY.deathExplosion = function (ctx, out, t) {
    thump(ctx, out, t, 70, 26, 0.6, 1.0);
    noise(ctx, out, { t: t, dur: 0.7, vol: 0.6, filters: [['lowpass', 1500, 140, 0.8]] });
    for (var i = 0; i < 6; i++) {      // falling debris
      noise(ctx, out, { t: t + 0.2 + rnd(0, 0.5), dur: 0.03, vol: rnd(0.05, 0.14), filters: [['bandpass', rnd(600, 2400), 400, 1.5]] });
    }
    return 0.8;
  };
  BODY.deathFlame = function (ctx, out, t) {
    noise(ctx, out, { t: t, dur: 0.6, vol: 0.28, a: 0.12, filters: [['highpass', 1500], ['bandpass', 3500, 2000, 0.5]] });   // hiss
    noise(ctx, out, { t: t, dur: 0.5, vol: 0.3, a: 0.06, filters: [['lowpass', 500, 150, 0.8]] });                              // whoosh
    for (var i = 0; i < 7; i++) {      // crackle
      noise(ctx, out, { t: t + 0.1 + rnd(0, 0.5), dur: 0.012, vol: rnd(0.08, 0.2), filters: [['highpass', 2800]] });
    }
    return 0.7;
  };
  BODY.deathClaymore = function (ctx, out, t) {
    noise(ctx, out, { t: t, dur: 0.05, vol: 0.4, filters: [['highpass', 4000]] });
    osc(ctx, out, { t: t, dur: 0.08, vol: 0.18, type: 'triangle', f0: 2400, f1: 1200 });
    for (var i = 0; i < 5; i++) {      // pellets rattling
      noise(ctx, out, { t: t + 0.04 + i * 0.018, dur: 0.01, vol: rnd(0.08, 0.2), filters: [['highpass', 5500]] });
    }
    thump(ctx, out, t, 110, 55, 0.08, 0.35);
    return 0.2;
  };
  BODY.deathTank = function (ctx, out, t) {
    thump(ctx, out, t, 62, 34, 0.35, 0.9);
    // crunch: noise gated at ~18 Hz
    var n = ctx.createBufferSource(); n.buffer = getNoise(ctx, 'white'); n.loop = true;
    var bp = makeFilter(ctx, ['bandpass', 450, 250, 0.8], t, 0.35);
    var gate = ctx.createGain(); gate.gain.value = 0.5;
    var lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 18;
    var lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(gate.gain);
    var env = ctx.createGain(); envelope(env.gain, t, 0.35, 0.55, 0.005);
    n.connect(bp); bp.connect(gate); gate.connect(env); env.connect(out);
    n.start(t, 0.7); n.stop(t + 0.4); lfo.start(t); lfo.stop(t + 0.4); track(out, n); track(out, lfo);
    osc(ctx, out, { t: t, dur: 0.25, vol: 0.2, type: 'sawtooth', f0: 220, f1: 80, filters: [['lowpass', 600]] });   // bending metal
    return 0.45;
  };
  BODY.bigKill = function (ctx, out, t) {
    // one combined sound for mass kills (e.g. Arc Light): sub boom + rolling rumble + rapid thumps
    thump(ctx, out, t, 60, 22, 0.95, 1.0);
    noise(ctx, out, { t: t, dur: 1.1, vol: 0.55, filters: [['lowpass', 1100, 100, 0.8]] });
    noise(ctx, out, { t: t, dur: 1.0, vol: 0.2, brown: true, a: 0.1, filters: [['lowpass', 300]] });
    for (var i = 0; i < 8; i++) thump(ctx, out, t + 0.05 + i * 0.065 + rnd(0, 0.03), rnd(80, 120), 35, 0.15, rnd(0.3, 0.6));
    return 1.2;
  };
  BODY.radioSquelch = function (ctx, out, t) {
    // radio key-up: noise burst through a narrow "speaker" band, with a short click at the end
    noise(ctx, out, { t: t, dur: 0.14, vol: 0.28, a: 0.01, filters: [['bandpass', 1800, 1500, 2.5], ['highpass', 500]] });
    osc(ctx, out, { t: t + 0.01, dur: 0.05, vol: 0.06, type: 'square', f0: 1000, a: 0.003 });
    noise(ctx, out, { t: t + 0.14, dur: 0.02, vol: 0.22, filters: [['bandpass', 2400, 2400, 1]] });
    return 0.2;
  };
  BODY.hueyDeparture = function (ctx, out, t, p, o) {
    // rotor fade-away after the drop: 2 layers, starting present and sinking in level and brightness as the helicopters leave (~3.2 s).
    // Voice budget: 2 x 2 rotor sources + 1 sub-rumble = 5.
    var d = 3.2;
    rotorLayer(ctx, out, { t: t, dur: d, vol: 0.34, a: 0.05, rel: d * 0.9, rate: 10.8, lp0: 520, lp1: 130 });
    rotorLayer(ctx, out, { t: t + 0.05, dur: d - 0.05, vol: 0.26, a: 0.08, rel: (d - 0.05) * 0.9, rate: 11.4, lp0: 440, lp1: 120 });
    osc(ctx, out, { t: t, dur: d, vol: 0.1, type: 'sine', f0: 56, f1: 44, a: 0.05, rel: d * 0.9 });
    return d;
  };
  BODY.medevacDeparture = function (ctx, out, t) {
    // single Huey leaving with the wounded: rotor sinks in level and brightness, whine falls away (~2.8 s). Voice budget: 2 + 1 + 1 = 4.
    var d = 2.8;
    rotorLayer(ctx, out, { t: t, dur: d, vol: 0.34, a: 0.05, rel: d * 0.9, rate: 10.8, lp0: 560, lp1: 130 });
    osc(ctx, out, { t: t, dur: d, vol: 0.09, type: 'sine', f0: 54, f1: 42, a: 0.05, rel: d * 0.9 });
    osc(ctx, out, { t: t, dur: d * 0.7, vol: 0.03, type: 'sine', f0: 1180, f1: 800, a: 0.05, rel: d * 0.4 });
    return d;
  };
  BODY.ribbonPin = function (ctx, out, t) {
    osc(ctx, out, { t: t, dur: 0.02, vol: 0.3, type: 'triangle', f0: 3200, f1: 2600, a: 0.001 });
    osc(ctx, out, { t: t + 0.06, dur: 0.02, vol: 0.25, type: 'triangle', f0: 2400, f1: 2000, a: 0.001 });
    osc(ctx, out, { t: t + 0.06, dur: 0.35, vol: 0.08, type: 'sine', f0: 4200, a: 0.002 });
    return 0.45;
  };

  // --- bugle: sawtooth+square through a lowpass, vibrato, little pitch scoop. Phrases use the bugle's natural harmonics.
  function bugleNote(ctx, out, t, midi, dur, vol) {
    var f = hz(midi);
    osc(ctx, out, { t: t, dur: dur, vol: vol, type: 'sawtooth', f0: f * 0.97, f1: f, glide: 0.05, a: 0.04, rel: Math.min(0.15, dur * 0.4),
      filters: [['lowpass', Math.min(f * 4, 3000), null, 1.2]], vib: { rate: 5.2, cents: 7 } });
    osc(ctx, out, { t: t, dur: dur, vol: vol * 0.5, type: 'square', f0: f, a: 0.05, rel: Math.min(0.15, dur * 0.4),
      filters: [['lowpass', f * 2.5]] });
  }
  function drum(ctx, out, t, vol) {      // muffled snare/tom
    thump(ctx, out, t, 130, 70, 0.2, vol);
    noise(ctx, out, { t: t, dur: 0.12, vol: vol * 0.35, filters: [['lowpass', 1500]] });
  }
  var RIBBONS = {
    combataction: 'combatAction', car: 'combatAction',
    purpleheart: 'purpleHeart', ph: 'purpleHeart',
    bronzestar: 'bronzeStar', bs: 'bronzeStar',
    silverstar: 'silverStar', ss: 'silverStar',
    navycross: 'navyCross', nc: 'navyCross',
    medalofhonor: 'medalOfHonor', moh: 'medalOfHonor'
  };
  function ribbonKey(name) {
    return RIBBONS[String(name || '').toLowerCase().replace(/[^a-z]/g, '')] || null;
  }
  // MIDI: G4=67 C5=72 E5=76 G5=79 (bugle harmonics in C). All phrases original.
  BODY.ribbonBugle = function (ctx, out, t, name, o) {
    var k = ribbonKey(name);
    if (!k) { o._unknown = true; return 0; }
    var d = 0;
    if (k === 'combatAction') {                       // one clean note
      bugleNote(ctx, out, t, 72, 0.7, 0.3); d = 0.8;
    } else if (k === 'purpleHeart') {                 // soft muffled drum roll-off + low sustained note
      drum(ctx, out, t, 0.5); drum(ctx, out, t + 0.45, 0.4); drum(ctx, out, t + 0.9, 0.3);
      bugleNote(ctx, out, t + 1.2, 60, 0.9, 0.12); d = 2.2;
    } else if (k === 'bronzeStar') {                  // short 3-note call
      bugleNote(ctx, out, t, 67, 0.22, 0.3); bugleNote(ctx, out, t + 0.25, 72, 0.22, 0.3); bugleNote(ctx, out, t + 0.5, 76, 0.7, 0.32); d = 1.3;
    } else if (k === 'silverStar') {                  // fuller phrase with harmony
      [[67, 0.2], [72, 0.2], [76, 0.2], [79, 0.7]].forEach(function (n, i) {
        var s = t + i * 0.24; bugleNote(ctx, out, s, n[0], n[1] + (i === 3 ? 0.3 : 0.05), 0.3);
        bugleNote(ctx, out, s, n[0] - 12, n[1], 0.18);
      });
      d = 1.9;
    } else if (k === 'navyCross') {                   // fuller still: drum, phrase, held chord
      drum(ctx, out, t, 0.5); drum(ctx, out, t + 0.2, 0.4);
      [[67, 0.25], [72, 0.25], [76, 0.25], [79, 0.35], [76, 0.25]].forEach(function (n, i) {
        var s = t + 0.45 + i * 0.3; bugleNote(ctx, out, s, n[0], n[1] + 0.05, 0.3); bugleNote(ctx, out, s, n[0] - 12, n[1], 0.2);
      });
      var c = t + 0.45 + 5 * 0.3;
      [60, 67, 72, 76].forEach(function (m) { bugleNote(ctx, out, c, m, 1.4, 0.2); });
      d = c - t + 1.5;
    } else {                                          // medalOfHonor: slow, solemn, hushed room, nothing else
      noise(ctx, out, { t: t, dur: 7.0, vol: 0.025, a: 1.0, rel: 1.5, brown: true, filters: [['lowpass', 260]] });
      [[67, 1.2], [72, 1.2], [76, 0.9], [72, 0.9], [67, 2.2]].reduce(function (s, n, i) {
        bugleNote(ctx, out, s, n[0], n[1], 0.22);
        if (i === 4) { bugleNote(ctx, out, s, 55, n[1], 0.12); }
        return s + n[1] + 0.25;
      }, t + 0.6);
      d = 7.0;
    }
    return d;
  };

  // ---------------------------------------------------------------- registry: tier, group, per-cue master trim
  // trim = overall level adjustment; group: 'death' | 'air' | null; primary: name of positional param (or null)
  var META = {
    lowHealthHeartbeat: { tier: 1, primary: 'rate',     trim: 0.85 },
    bossSpawn:          { tier: 1, trim: 0.75 },
    b40Launch:          { tier: 1, trim: 0.75 },
    tankLost:           { tier: 1, trim: 0.7 },
    uiTick:             { tier: 1, trim: 0.9 },
    levelUpSwell:       { tier: 1, trim: 0.8 },
    perkRadio:          { tier: 1, trim: 0.4 },
    readyTick:          { tier: 1, trim: 0.9 },
    medpackPickup:      { tier: 1, trim: 0.8 },
    reinforcementCall:  { tier: 1, trim: 0.75 },
    medevacCall:        { tier: 1, trim: 0.7 },

    m16:                { tier: 2, trim: 0.55 },
    m60:                { tier: 2, trim: 0.5 },
    m79:                { tier: 2, trim: 0.55 },
    ak47:               { tier: 2, trim: 0.55 },
    boltRifleCrack:     { tier: 2, trim: 0.5 },
    boltCycle:          { tier: 2, trim: 0.35 },
    claymore:           { tier: 2, trim: 0.55 },
    mortarThump:        { tier: 2, trim: 0.6 },
    airStrafe:          { tier: 2, group: 'air', trim: 0.7 },
    napalmWhoomph:      { tier: 2, group: 'air', trim: 0.6 },
    tankerFlyover:      { tier: 2, group: 'air', trim: 0.7 },
    signalPop:          { tier: 2, trim: 0.7 },
    boardingChime:      { tier: 2, trim: 0.8 },
    buildTick:          { tier: 2, primary: 'progress', trim: 0.6 },
    buildStageComplete: { tier: 2, trim: 0.7 },
    sandbagThud:        { tier: 2, trim: 0.7 },
    turretCorner:       { tier: 2, trim: 0.7 },
    turretMid:          { tier: 2, trim: 0.7 },
    medpackDrop:        { tier: 2, trim: 0.7 },
    reinforcementHueys: { tier: 2, trim: 0.6 },
    medevacHuey:        { tier: 2, trim: 0.65 },
    medevacHeal:        { tier: 2, minGap: 0.6, trim: 0.7 },

    deathBullet:        { tier: 3, group: 'death', trim: 0.5 },
    deathHeavy:         { tier: 3, group: 'death', trim: 0.5 },
    deathExplosion:     { tier: 3, group: 'death', trim: 0.55 },
    deathFlame:         { tier: 3, group: 'death', trim: 0.5 },
    deathClaymore:      { tier: 3, group: 'death', trim: 0.5 },
    deathTank:          { tier: 3, group: 'death', trim: 0.55 },
    bigKill:            { tier: 3, group: 'death', priority: true, trim: 0.6 },
    radioSquelch:       { tier: 3, trim: 0.6 },
    ribbonPin:          { tier: 3, trim: 0.7 },
    ribbonBugle:        { tier: 3, primary: 'tier', trim: 0.8 },
    hueyDeparture:      { tier: 3, trim: 0.6 },
    medevacDeparture:   { tier: 3, trim: 0.6 }
  };

  var LIMITS = { death: 4, airFull: 2, airDuck: 0.3 };
  var limiterCache = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;
  function limiter(ctx) {
    var l = limiterCache.get(ctx);
    if (!l) { l = { death: [], air: [], last: {} }; limiterCache.set(ctx, l); }
    return l;
  }

  var Cues = {};

  function wrap(name) {
    var meta = META[name], body = BODY[name];
    var fn = function (ctx, dst, a, b) {
      if (!ctx) throw new Error('Cues.' + name + ': ctx required');
      dst = dst || ctx.destination;
      if (lowEffects && meta.tier === 3) { stats.skippedLow++; return null; }
      var p, o;
      if (meta.primary) {
        if (a !== null && typeof a === 'object') { o = a; p = o[meta.primary]; }
        else { p = a; o = b || {}; }
      } else { o = a || {}; }
      var t = (o.when != null) ? o.when : ctx.currentTime + 0.005;
      var lim = limiter(ctx), group = meta.group, list = group ? lim[group] : null, entry = null;

      if (list) { for (var i = list.length - 1; i >= 0; i--) if (list[i].end <= t) list.splice(i, 1); }
      if (group === 'death' && !meta.priority && list.length >= LIMITS.death) { stats.skippedDeathCap++; return null; }

      if (meta.minGap) {      // one-shot guard: a repeat inside minGap seconds of the previous start is dropped (e.g. one heal pulse = one sound)
        var prev = lim.last[name];
        if (prev != null && Math.abs(t - prev) < meta.minGap) { stats.skippedDup++; return null; }
        lim.last[name] = t;
      }
      var out = ctx.createGain();
      out.gain.value = meta.trim * (o.vol != null ? o.vol : 1);
      out.connect(dst);
      var dur = body(ctx, out, t, p, o);
      if (o._unknown) { out.disconnect(); return null; }

      if (list) {
        entry = { out: out, end: t + dur, ducked: false, base: out.gain.value };
        list.push(entry);
        if (group === 'air') {
          var full = list.filter(function (e) { return !e.ducked; });
          while (full.length > LIMITS.airFull) {
            var old = full.shift(); old.ducked = true; stats.duckedAir++;
            var now = Math.max(t, ctx.currentTime);
            old.out.gain.setValueAtTime(old.base, now);
            old.out.gain.setTargetAtTime(old.base * LIMITS.airDuck, now, 0.05);
          }
        }
      }
      stats.played++;
      return { name: name, tier: meta.tier, start: t, duration: dur, group: group || null };
    };
    fn.tier = meta.tier;
    fn.cueName = name;
    return fn;
  }

  Object.keys(META).forEach(function (n) { Cues[n] = wrap(n); });

  // ---------------------------------------------------------------- public helpers
  Cues.tiers = {};
  Object.keys(META).forEach(function (n) { Cues.tiers[n] = META[n].tier; });
  Cues.list = function (tier) {
    return Object.keys(META).filter(function (n) { return tier == null || META[n].tier === tier; });
  };
  Cues.setLowEffects = function (on) { lowEffects = !!on; };
  Cues.isLowEffects = function () { return lowEffects; };
  Cues.stats = function () { return JSON.parse(JSON.stringify(stats)); };
  Cues.resetStats = function () { stats = { played: 0, skippedLow: 0, skippedDeathCap: 0, duckedAir: 0, skippedDup: 0 }; };
  Cues.limits = LIMITS;
  Cues.ribbonTiers = ['combatAction', 'purpleHeart', 'bronzeStar', 'silverStar', 'navyCross', 'medalOfHonor'];
  Cues.play = function (name, ctx, dst) {
    if (!Cues[name] || !META[name]) throw new Error('Unknown cue: ' + name);
    return Cues[name].apply(null, [ctx, dst].concat([].slice.call(arguments, 3)));
  };
  // seconds between heartbeat calls for a given rate (call lowHealthHeartbeat once per beat)
  Cues.heartbeatInterval = function (rate) { return 0.9 / Math.max(0.5, Math.min(3, rate || 1)); };
  // pick the right death cue for a weapon kind; `count` = deaths this frame (>=30 -> single bigKill)
  var DEATH_KINDS = { bullet: 'deathBullet', rifle: 'deathBullet', heavy: 'deathHeavy', m60: 'deathHeavy', fifty: 'deathHeavy',
    explosion: 'deathExplosion', explosive: 'deathExplosion', flame: 'deathFlame', napalm: 'deathFlame',
    claymore: 'deathClaymore', tank: 'deathTank' };
  Cues.death = function (kind, ctx, dst, opts) {
    opts = opts || {};
    if ((opts.count || 1) >= 30) return Cues.bigKill(ctx, dst, opts);
    var n = DEATH_KINDS[String(kind).toLowerCase()] || 'deathBullet';
    return Cues[n](ctx, dst, opts);
  };
  // optional master bus with a compressor/limiter so heavy fights can't clip. Returns the node to use as `dst`.
  Cues.createBus = function (ctx, dst, level) {
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    var g = ctx.createGain(); g.gain.value = level != null ? level : 0.9;
    comp.connect(g); g.connect(dst || ctx.destination);
    comp.input = comp; comp.gainNode = g;
    return comp;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { Cues: Cues };
  else root.Cues = Cues;
})(typeof self !== 'undefined' ? self : this);
