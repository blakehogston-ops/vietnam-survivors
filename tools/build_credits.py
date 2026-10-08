#!/usr/bin/env python3
"""In-game audio credits (menu + pause) = Sound Helper's INGAME_CREDITS_BLOCK.txt (text between the 'cut here' lines),
URLs turned into links, minus lines/names for files held back from this build (river map batch 3, felix.blume bugle).
Also writes audio/THIRD_PARTY_AUDIO.txt filtered the same way, then checks: every shipped file has a credited source,
every credited name has a shipped file, qubodup / FAIL sources absent."""
import html, os, re, sys, json, subprocess
SP = sys.argv[1] if len(sys.argv) > 1 else '/workspace/sound_pack'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = os.path.join(ROOT, 'index.html'); OUT = os.path.join(ROOT, 'audio')
shipped = sorted(f[:-4] for f in os.listdir(os.path.join(OUT, 'samples', 'ogg')))
# ---- per-file sources from THIRD_PARTY_AUDIO.txt ----
T = open(os.path.join(SP, 'THIRD_PARTY_AUDIO.txt')).read()
ent = re.findall(r'^samples/ogg/(\S+)\.ogg[^\n]*\n((?:    [^\n]*\n)+)', T, re.M)
src = {n: b for n, b in ent}
held = [n for n in src if n not in shipped]
# names credited only by held files -> drop from the credits
HELD_NAMES = set()
for nm in ('byjoshberry', 'NickTayloe', 'felix.blume', 'Auxide_Audio'):   # credit names of the map-build files
    in_held = any(nm in src[k] for k in held); in_ship = any(nm in src[k] for k in shipped)
    if in_held and not in_ship: HELD_NAMES.add(nm)
# ---- credits block ----
B = open(os.path.join(SP, 'INGAME_CREDITS_BLOCK.txt')).read().split('\n')
cut = [i for i, l in enumerate(B) if 'cut here' in l]; lines = B[cut[0] + 1:cut[1]]
link = lambda t: re.sub(r'(https?://[^\s,;)]+[^\s,;).])', lambda m: '<a href="%s" target="_blank" rel="noopener">%s</a>' % (m.group(1), m.group(1)), t)
out, dropped = [], []
for l in lines:
    l = l.strip()
    if not l: continue
    if l.startswith('- ') and any(h in l for h in HELD_NAMES): dropped.append(l[:60]); continue
    t = html.escape(l[2:] if l.startswith('- ') else l, quote=False)
    if ';' in l and 'http' not in l:   # courtesy list: drop held-only names
        parts = [p.strip() for p in l.split(';')]; keep = [p for p in parts if not any(h == re.sub(r'\W+$', '', p) or p.startswith(h) for h in HELD_NAMES)]
        dropped += [p for p in parts if p not in keep]; out.append('<p>%s</p>' % html.escape('; '.join(keep), quote=False)); continue
    if l.startswith('Full per-file'):
        out.append('<p class="crtp">%s <a href="audio/THIRD_PARTY_AUDIO.txt" target="_blank" rel="noopener">THIRD_PARTY_AUDIO.txt</a></p>' % html.escape(l.split(':')[0] + ':')); continue
    if 'http' not in l and not l.startswith('- '): out.append('<p class="crh"><b>%s</b></p>' % t); continue
    out.append('<p>%s</p>' % link(t))
body = '\n'.join(out)
assert not re.search('qubodup|areniporgen|multimax|mozfoo', body, re.I)
s = open(F).read()
pat = re.compile(r'(<details class="credits"><summary>Credits &amp; audio licences</summary><div class="crbody">\n).*?(\n</div></details>)', re.S)
s, n = pat.subn(lambda m: m.group(1) + body + m.group(2), s); assert n == 2, n
open(F, 'w').write(s)
# ---- THIRD_PARTY_AUDIO.txt filtered to what ships ----
T2 = T
for n in held: T2 = re.sub(r'^samples/ogg/%s\.ogg[^\n]*\n(?:    [^\n]*\n)+\n?' % re.escape(n), '', T2, flags=re.M)
T2 = '\n'.join(l for l in T2.split('\n') if not (l.startswith('- ') and any(h in l for h in HELD_NAMES)))
for h in HELD_NAMES: T2 = re.sub(r'\b%s; ' % re.escape(h), '', T2)
T2 = T2.replace('THIRD-PARTY AUDIO', 'THIRD-PARTY AUDIO (this build: %d files; held back until the map build: %s)' % (len(shipped), ', '.join(held) or 'none'), 1)
open(os.path.join(OUT, 'THIRD_PARTY_AUDIO.txt'), 'w').write(T2)
# ---- check: every shipped file -> credited source; every credited name -> a shipped file ----
plain = re.sub('<[^>]+>', '', body)
nofile = [n for n in shipped if n not in src]
cc_by = [n for n in shipped if n in src and 'CC BY' in src[n]]
def credited(n):
    m = re.search(r'Source:\s*([^\n]+)', src[n]); s0 = m.group(1)
    toks = [t for t in re.findall(r'[A-Za-z][A-Za-z0-9_.]+', s0) if len(t) > 3]
    return any(t in plain for t in toks)
uncredited = [n for n in shipped if n in src and not credited(n)]
names = re.findall(r'\bby ([A-Za-z0-9_.]+)|\(c\) ([A-Za-z ]+?) \(|; ([A-Za-z0-9_. ]+?)(?= \(|;|$)', plain)
cnames = sorted({x.strip() for t in names for x in t if x.strip()})
cnames = [c for c in cnames if c not in ('the', 'fredsylvestre66 via Pixabay')]
ship_src = '\n'.join(src[n] for n in shipped if n in src)
orphan_names = [c for c in cnames if c.split(' (')[0] not in ship_src and c not in ('U.S. Marine Band', 'PSYCH ROCK')]
print(json.dumps({'paragraphs': len(out), 'links': body.count('<a '), 'held_files': held, 'held_names': sorted(HELD_NAMES), 'dropped': dropped,
                  'shipped_files': len(shipped), 'cc_by_files': len(cc_by), 'files_without_source_entry': nofile, 'files_without_credit': uncredited,
                  'credited_names_checked': cnames, 'credit_names_without_file': orphan_names}, indent=1))
