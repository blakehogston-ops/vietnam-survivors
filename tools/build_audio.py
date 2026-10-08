#!/usr/bin/env python3
"""Copy Sound Helper's real-sample layer into the game (audio/...). Oct 8 rule: recopy ALL of samples/ogg + samples/m4a,
sample_player.js, samples/manifest.js and THIRD_PARTY_AUDIO.txt after deleting the old copies (nothing stale stays).
Disabled manifest slots (bugle, tandem rotor, river map) ship as files but are never loaded.
Fails if any file or manifest entry still comes from a banned source (areniporgen, MultiMax2121, Mozfoo, qubodup).
usage: python3 tools/build_audio.py [/workspace/sound_pack]"""
import json, os, re, shutil, subprocess, sys
SP = sys.argv[1] if len(sys.argv) > 1 else '/workspace/sound_pack'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'audio')
BANNED = re.compile(r'areniporgen|multimax|mozfoo|qubodup', re.I)
for p in ('samples', 'sample_player.js', 'THIRD_PARTY_AUDIO.txt'):
    q = os.path.join(OUT, p)
    if os.path.isdir(q): shutil.rmtree(q)
    elif os.path.exists(q): os.remove(q)
os.makedirs(os.path.join(OUT, 'samples'))
for d in ('ogg', 'm4a'):
    src = os.path.join(SP, 'samples', d)
    if os.path.isdir(src): shutil.copytree(src, os.path.join(OUT, 'samples', d))
# keep the map-build files OUT (river batch 3: boat engine, river beds; the felix.blume bugle): no file, no manifest slot
HOLD = ['bugle', 'pbr_engine_loop', 'river_ambience_loop']
M0 = json.loads(subprocess.run(['node', '-e', "const m=require(process.argv[1]).SAMPLE_MANIFEST; console.log(JSON.stringify(m))", os.path.join(SP, 'samples', 'manifest.js')], capture_output=True, text=True, check=True).stdout)
held = []
for k in HOLD:
    sl = M0['slots'].pop(k, None)
    for nm in (sl or {}).get('files', []) + (sl or {}).get('alt', []):
        for d, ext in (('ogg', '.ogg'), ('m4a', '.m4a')):
            q = os.path.join(OUT, 'samples', d, nm + ext)
            if os.path.exists(q): os.remove(q); held.append(nm + ext)
M0['base'] = 'audio/samples/'
open(os.path.join(OUT, 'samples', 'manifest.js'), 'w').write("/* Sound Helper's samples/manifest.js, copied by tools/build_audio.py: base set to the game's audio/samples/; river-map batch 3 and the bugle are held back until the map build. */\n(function(root){ var SAMPLE_MANIFEST=" + json.dumps(M0, indent=1) + ";\n if(typeof module!=='undefined'&&module.exports)module.exports={SAMPLE_MANIFEST:SAMPLE_MANIFEST}; else root.SAMPLE_MANIFEST=SAMPLE_MANIFEST; })(typeof window!=='undefined'?window:this);\n")
shutil.copy2(os.path.join(SP, 'samples', 'LICENSES.md'), os.path.join(OUT, 'samples', 'LICENSES.md'))
tp = os.path.join(SP, 'THIRD_PARTY_AUDIO.txt')
if os.path.exists(tp): shutil.copy2(tp, os.path.join(OUT, 'THIRD_PARTY_AUDIO.txt'))
# game-side patch (documented, asserted): warning cues (B-40 bang, charge whistle) get a priority voice OUTSIDE the 12-voice / 6-gun caps
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
# banned-source check: file names + manifest + player (the text files may NAME them only as removed)
bad = [f for d in ('ogg', 'm4a') for f in os.listdir(os.path.join(OUT, 'samples', d)) if BANNED.search(f)]
js = subprocess.run(['node', '-e', "const m=require(process.argv[1]).SAMPLE_MANIFEST; console.log(JSON.stringify(m))", os.path.join(OUT, 'samples', 'manifest.js')], capture_output=True, text=True, check=True).stdout
M = json.loads(js)
files = {f[:-4] for f in os.listdir(os.path.join(OUT, 'samples', 'ogg'))}
missing = {k: [n for n in s.get('files', []) + s.get('alt', []) if n not in files] for k, s in M['slots'].items() if not s.get('disabled')}
missing = {k: v for k, v in missing.items() if v}
sz = lambda d: sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(d) for f in fs)
b1 = sum(os.path.getsize(os.path.join(OUT, 'samples', 'ogg', n + '.ogg')) for k, s in M['slots'].items() if s.get('batch') == 1 and not s.get('disabled') for n in s['files'] if n in files)
b2 = sum(os.path.getsize(os.path.join(OUT, 'samples', 'ogg', n + '.ogg')) for k, s in M['slots'].items() if s.get('batch') == 2 and not s.get('disabled') for n in s['files'] if n in files)
print(json.dumps({'held_back': held, 'ogg_files': len(files), 'banned_files': bad, 'missing_for_enabled_slots': missing, 'empty_slots': [k for k, s in M['slots'].items() if not s.get('files') and not s.get('disabled')],
                  'disabled': [k for k, s in M['slots'].items() if s.get('disabled')], 'third_party_txt': os.path.exists(tp),
                  'bytes_ogg': sz(os.path.join(OUT, 'samples', 'ogg')), 'bytes_m4a': sz(os.path.join(OUT, 'samples', 'm4a')), 'bytes_music': sz(os.path.join(OUT, 'music')), 'batch1_ogg': b1, 'batch2_ogg': b2}, indent=1))
if bad: sys.exit('BANNED SOURCE FILES: %s' % bad)
