#!/usr/bin/env python3
"""Generate assets/vo_ai.js line table + copy audio from /workspace/sound_pack/vo_ai (HANDOFF_FOR_LEAD.md)."""
import json,re,os,shutil,subprocess
S='/workspace/sound_pack/vo_ai'; R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H=open(S+'/HANDOFF_FOR_LEAD.md').read()
RADIO=set(x.strip() for x in re.search(r'Radio IDs: (.*)',H).group(1).split(','))
man=re.findall(r"^\s*(\w+): \{ group: '(\w+)', batch: 3, files: \['(\w+)'\] \},\s*// (\S+)",H,re.M)
raw={x['id']:x for x in json.load(open(S+'/raw_lines.json'))}
FRIENDS={'HO-K01','HO-K02'}
def dur(p): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',p]).decode())
rows=[]
for slot,grp,f,lid in man:
  radio=grp=='radio'
  base=lid
  if lid.startswith('G22-'): base='G22'
  if lid=='BK_RADIO_OUT-alt': text='Nobody on the hook!'
  elif base=='G22': text=None
  else:
    w=raw[lid]['words']; q=re.findall(r'"([^"]+)"',w); text=q[0] if q else w
  sub='dry/' if radio else ''
  for ext in ('ogg','m4a'):
    d=os.path.join(R,'audio/vo_ai',sub+ext); os.makedirs(d,exist_ok=True)
    shutil.copy2(os.path.join(S,sub+ext,f+'.'+ext),d)
  rows.append([lid,f,text,1 if radio else 0,1 if lid in FRIENDS else 0,round(dur(os.path.join(S,sub+'ogg',f+'.ogg')),2)])
assert len(rows)==171,len(rows)
rid={r[0] for r in rows}
assert RADIO<=rid|{'G01-V'} , RADIO-rid
json.dump(rows,open('/tmp/vo_ai_rows.json','w'),ensure_ascii=False)   # table is embedded into assets/vo_ai.js (LINES)
print(len(rows),'lines;',sum(r[3] for r in rows),'radio;',sum(r[4] for r in rows),'friends-only')
