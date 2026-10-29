"""rc8.2 hill slope v2.6 retint for khe_sanh_861a (AD ruling, option 1).
Retints the existing terrain_v2 gGrass/gGrassDry/gJungle/gDirt tiles + their edge/lip sprites (legend colours only; frames,
layers and draw order untouched) toward the Concept Artist's v2.6 palette, then applies the v2.6 readability fix:
any colour scoring < 3.25 for Doc or NVA (docscore.py metric) gets the smallest uniform same-hue darken/lift that clears 3.25.
Usage: python3 tools/hill26_retint.py /tmp/leg.json  -> prints JSON {sprite: legend}"""
import json,sys,importlib.util,numpy as np
spec=importlib.util.spec_from_file_location('ds','assets/art/hill_slope_v2_6/docscore.py'); ds=importlib.util.module_from_spec(spec); spec.loader.exec_module(ds)
P=json.load(open('assets/art/hill_slope_v2_6/palette_hill_slope_v2_6.json')); L=json.load(open(sys.argv[1]))
h=lambda s:np.array([int(s[i:i+2],16) for i in (1,3,5)],float)
hx=lambda a:'#%02x%02x%02x'%tuple(int(v) for v in a)
mean=lambda ks:np.mean([h(P[k]) for k in ks],0)
FAM={'gGrass':(mean(['grass_v0','grass_v1','grass_v2','grass_v3']),['gGrass','eGrass','eGrassLip']),
     'gGrassDry':(h(P['grass_straw_mid']),['gGrassDry','eGrassDryLip']),
     'gJungle':(mean(['jungle_v0','jungle_v1','jungle_v2','jungle_v3']),['gJungle','eJungle','eJungleLip']),
     'gDirt':(mean(['laterite_v0','laterite_v1','laterite_v2','laterite_v3']),['gDirt','eDirt','eDirtLip'])}
FLOOR=3.25
# gate.sh also scores the item4 helmet ramp H1-H5 (measure_helmet.py FIG); hold all of them at the floor too
ds.FIG.update({'H1':((0xec,0xe6,0xbc),.5),'H2':((0xdc,0xd5,0xa2),.5),'H3':((0xc6,0xbf,0x88),.5),'H4':((0xa8,0xa2,0x6e),.5),'H5':((0x86,0x80,0x5a),.5)})
# in game every ground tile is overlaid by terrain_v2 fTint (macro tint, 6 translucent colours): hold the floor for the plain colour AND under each tint
TINT=[((0x10,0x18,0x0a),a/255) for a in (0x0c,0x1c,0x2e)]+[((0xf0,0xe8,0xc0),a/255) for a in (0x0a,0x16,0x22)]
import itertools
J=np.array(list(itertools.product((-1,0,1),repeat=3)))
def variants(c):   # plain + under each single fTint stamp, +-1 per channel for canvas (premultiplied) alpha rounding
    o=[c]+[np.round(c*(1-a)+np.array(t)*a) for t,a in TINT]
    return [np.clip(v+d,0,255) for v in o for d in J]
def ok(c): return all(float(ds.score(v[None],f)[0])>=FLOOR+0.005 for v in variants(c) for f in ds.FIG)
def fix(c):
    if ok(c): return c
    for s in range(1,400):
        for k in (1-s/400,1+s/400):
            n=np.clip(np.round(c*k),0,255)
            if ok(n): return n
    raise SystemExit('no fix for '+hx(c))
out={}
for base,(tgt,sprites) in FAM.items():
    g=L[base]; cnt=g['count']; tot=sum(cnt.values())
    m=sum(h(g['legend'][k])*n for k,n in cnt.items())/tot
    ratio=tgt/m
    for sp in sprites:
        out[sp]={k:hx(fix(np.clip(np.round(h(v)*ratio),0,255))) for k,v in L[sp]['legend'].items()}
print(json.dumps(out,separators=(',',':')))
