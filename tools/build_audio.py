#!/usr/bin/env python3
"""Copy Sound Helper's real-sample layer into the game (audio/...), shipping only files that are used.
- skips disabled slots (bugle, river-map batch 3)
- BLOCKED slots (licence audit FAIL) ship with NO file and no alt, so they play nothing
- keeps a file only if both the .ogg and .m4a exist; writes a filtered manifest.js (base 'audio/samples/')
usage: python3 tools/build_audio.py [/workspace/sound_pack]"""
import json, os, re, shutil, subprocess, sys
SP = sys.argv[1] if len(sys.argv) > 1 else '/workspace/sound_pack'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'audio')
USE = ['m60_burst', 'ak47', 'b40_launch', 'whistle', 'mortar_launch', 'mortar_incoming', 'bomb_distant', 'radio_squelch', 'huey_rotor_loop', 'flamethrower_burst', 'smoke_canister', 'm79_launch']   # slots the game actually plays (no footstep / flame-loop / fly-by / SKS / AK-burst cue exists, so those files are not shipped)
BLOCK = ['m16_single', 'm16_burst', 'rpd_burst', 'mortar_impact', 'm79_impact']   # audit FAIL (areniporgen M16A1, MultiMax2121 RPD, Mozfoo mortar + M79 impact)
js = subprocess.run(['node', '-e', "const m=require(process.argv[1]).SAMPLE_MANIFEST; console.log(JSON.stringify(m))", os.path.join(SP, 'samples', 'manifest.js')], capture_output=True, text=True, check=True).stdout
M = json.loads(js)
have = lambda n: os.path.exists(os.path.join(SP, 'samples', 'ogg', n + '.ogg')) and os.path.exists(os.path.join(SP, 'samples', 'm4a', n + '.m4a'))
for d in ('ogg', 'm4a'):
    p = os.path.join(OUT, 'samples', d); shutil.rmtree(p, ignore_errors=True); os.makedirs(p)
slots, used, silent, missing = {}, [], [], {}
for k, s in M['slots'].items():
    if s.get('disabled') or (k not in USE and k not in BLOCK): continue
    s = dict(s)
    if k in BLOCK:
        s['files'] = []; s.pop('alt', None); s['blocked'] = 'licence audit FAIL: no file, plays nothing'; silent.append(k)
    else:
        for key in ('files', 'alt'):
            if key in s:
                keep = [n for n in s[key] if have(n)]; gone = [n for n in s[key] if not have(n)]
                if gone: missing.setdefault(k, []).extend(gone)
                s[key] = keep
        if 'alt' in s and not s['alt']: s.pop('alt')
        if not s['files'] and not s.get('alt'): silent.append(k)
        used += s['files'] + s.get('alt', [])
    slots[k] = s
for n in used:
    shutil.copy2(os.path.join(SP, 'samples', 'ogg', n + '.ogg'), os.path.join(OUT, 'samples', 'ogg', n + '.ogg'))
    shutil.copy2(os.path.join(SP, 'samples', 'm4a', n + '.m4a'), os.path.join(OUT, 'samples', 'm4a', n + '.m4a'))
M['slots'] = slots; M['base'] = 'audio/samples/'; M['thirdParty'] = os.path.exists(os.path.join(SP, 'THIRD_PARTY_AUDIO.txt'))
open(os.path.join(OUT, 'samples', 'manifest.js'), 'w').write('/* Built by tools/build_audio.py from Sound Helper\'s samples/manifest.js: only shipped files are listed; licence-FAIL slots have no file. */\n(function(root){ var SAMPLE_MANIFEST=' + json.dumps(M, indent=1) + ';\n if(typeof module!=="undefined"&&module.exports)module.exports={SAMPLE_MANIFEST:SAMPLE_MANIFEST}; else root.SAMPLE_MANIFEST=SAMPLE_MANIFEST; })(typeof window!=="undefined"?window:this);\n')
# game-side patch (documented, asserted): warning cues (B-40 bang, charge whistle) get a priority voice OUTSIDE the 12-voice / 6-gun caps:
# never refused, never stolen, and not counted against other sounds.
P = open(os.path.join(SP, 'sample_player.js')).read()
PATCH = [
 ("function overlapping(t0, t1, filter) { return voices.filter(function (v) { return v.start < t1",
  "function overlapping(t0, t1, filter) { return voices.filter(function (v) { return v.cat !== 'warn' && v.start < t1"),
 ("      if (!makeRoom(s, t, plan.dur)) { stats.dropped++; return null; }\n      return handle(startVoice(slot, s, buf, t, o, s.maxDur, plan));",
  "      if (o.warnVoice) { var wv = startVoice(slot, s, buf, t, o, s.maxDur, plan); wv.cat = 'warn'; wv.prio = 99; stats.warnVoices = (stats.warnVoices || 0) + 1; return handle(wv); }   /* game patch: warning voice outside the caps */\n      if (!makeRoom(s, t, plan.dur)) { stats.dropped++; return null; }\n      return handle(startVoice(slot, s, buf, t, o, s.maxDur, plan));"),
 ("h = P.play(slot, Object.assign({}, o, { when: at }));", "h = P.play(slot, Object.assign({}, o, { when: at, warnVoice: true }));"),
]
for a, b in PATCH:
    assert P.count(a) == 1, ('sample_player.js patch anchor not found', a[:60]); P = P.replace(a, b)
open(os.path.join(OUT, 'sample_player.js'), 'w').write('/* copied from Sound Helper by tools/build_audio.py; one game-side patch marked "game patch" (warning voices outside the caps) */\n' + P)
os.makedirs(os.path.join(OUT, 'music'), exist_ok=True)
for f in ('combat_loop.ogg', 'combat_loop.m4a'): shutil.copy2(os.path.join(SP, 'music', f), os.path.join(OUT, 'music', f))
shutil.copy2(os.path.join(SP, 'samples', 'LICENSES.md'), os.path.join(OUT, 'samples', 'LICENSES.md'))
tp = os.path.join(SP, 'THIRD_PARTY_AUDIO.txt')
if os.path.exists(tp): shutil.copy2(tp, os.path.join(OUT, 'THIRD_PARTY_AUDIO.txt'))
elif os.path.exists(os.path.join(OUT, 'THIRD_PARTY_AUDIO.txt')): os.remove(os.path.join(OUT, 'THIRD_PARTY_AUDIO.txt'))
sz = lambda d: sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(d) for f in fs)
print(json.dumps({'files': len(used), 'silent_slots': silent, 'missing_files': missing, 'third_party_txt': os.path.exists(tp),
                  'bytes_samples_ogg': sz(os.path.join(OUT, 'samples', 'ogg')), 'bytes_samples_m4a': sz(os.path.join(OUT, 'samples', 'm4a')), 'bytes_music': sz(os.path.join(OUT, 'music')),
                  'batch1_ogg': sum(os.path.getsize(os.path.join(OUT, 'samples', 'ogg', n + '.ogg')) for k, s in slots.items() if s.get('batch') == 1 for n in s['files'])}, indent=1))
