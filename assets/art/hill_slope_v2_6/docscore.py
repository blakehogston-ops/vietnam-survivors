# Pixel-level readability check (v2.6). Re-implements, read-only, the gate's metric from /workspace/qa/readability_gate/measure_helmet.py
# (--v21: opaque ring side): best = max(figure-vs-bg, outline #1a1c12-vs-bg, rim-vs-bg), WCAG contrast on sRGB luminance. gate.sh itself is NOT edited.
import numpy as np
OUT=np.array([0x1a,0x1c,0x12],np.float32)
FIG={'Doc':((0x5a,0x6e,0x36),.6),'NVA':((0xae,0xaa,0x78),.5)}
def lum(a):
    v=np.asarray(a,np.float32)/255; v=np.where(v<=.04045,v/12.92,((v+.055)/1.055)**2.4); return v[...,0]*.2126+v[...,1]*.7152+v[...,2]*.0722
def cr(la,lb): hi=np.maximum(la,lb); lo=np.minimum(la,lb); return (hi+.05)/(lo+.05)
def score(rgb,fig='Doc'):
    m,bl=FIG[fig]; m=np.array(m,np.float32); rim=np.floor(m+(236-m)*bl)
    L=lum(rgb); return np.maximum.reduce([cr(lum(m),L),cr(lum(OUT),L),cr(lum(rim),L)])
def report(rgb,mask=None,label=''):
    a=np.asarray(rgb)[...,:3]; px=a.reshape(-1,3) if mask is None else a[mask]
    u,inv=np.unique(px.astype(np.int32),axis=0,return_inverse=True); out=[]
    for f in FIG:
        s=score(u,f)[inv.ravel()]; i=np.argmin(s); hx='#%02x%02x%02x'%tuple(int(v) for v in px[i][:3]); out.append(f"{label}{f}: px {len(s)}, unique colours {len(u)}, min {s.min():.2f} ({hx}), below 3.25: {100*(s<3.25).mean():.3f}%, below 3.2: {100*(s<3.2).mean():.3f}%, below 3.0: {100*(s<3.0).mean():.3f}%")
    return out
if __name__=='__main__':
    import sys; from PIL import Image
    for p in sys.argv[1:]:
        a=np.asarray(Image.open(p).convert('RGB')); 
        for l in report(a[:770],label=p.split('/')[-1]+' rows0-769 '): print(l)
        for l in report(a,label=p.split('/')[-1]+' full '): print(l)
def fix(rgb,thr=3.27,figs=('Doc','NVA')):
    """v2.6: every colour scoring < thr for Doc/NVA is darkened or lifted (same hue, uniform scale) by the smallest step that passes."""
    a=np.asarray(rgb,np.float32); sh=a.shape; px=a.reshape(-1,sh[-1]); c=px[:,:3]
    u,inv=np.unique(np.round(c).astype(np.int32),axis=0,return_inverse=True); inv=inv.ravel()
    ok=lambda x:np.minimum.reduce([score(x,f) for f in figs])>=thr
    k=np.ones(len(u),np.float32); bad=~ok(u.astype(np.float32))
    for step in np.arange(.01,.70,.01):
        for f in (1-step,1+step):
            cand=bad&(k==1)&ok(np.floor(np.clip(u*f,0,255)+.5)); k[cand]=f
    c2=np.floor(np.clip(c*k[inv][:,None],0,255)+.5); px=px.copy(); px[:,:3]=c2; return px.reshape(sh),int(bad.sum()),len(u)
