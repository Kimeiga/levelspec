from pathlib import Path
import json, random, html
root=Path(__file__).parent
rooms=[
 ('T','Insertion dock',(10,0,36,12),0),('F','Freight hall',(4,12,24,28),0),('C','Arrival concourse',(24,12,44,24),0),('E','Cable port',(44,12,60,24),0),
 ('P','Cooling pumps',(4,28,18,42),0),('L','Lower gallery',(18,28,30,42),0),('K','Cold airlock',(4,42,18,52),0),('PC','Pump control',(18,42,26,52),0),
 ('B','B / Data vault',(2,52,26,72),0),('M','Mid / Atrium',(30,36,48,50),6),('H','Heat exchangers',(48,36,64,46),6),('Q','Suspended gallery',(18,38,30,44),6),
 ('D','Cleanroom',(32,50,52,58),6),('J','Short airlock',(26,56,32,62),0),('W','Service spine',(32,58,38,72),6),('R','Rear bridge',(26,72,44,78),6),
 ('U','Switchgear',(20,84,38,90),6),('V','Vault stair head',(14,84,20,90),6),('N','Coolant manifold',(26,78,32,84),6),('I','Security vestibule',(38,90,48,96),12),
 ('CT','CT / Summit pad',(48,84,70,96),12),('A','A / Reactor hall',(48,58,72,78),12),('AW','Scrubber landing',(42,70,48,78),12),('AC','Command access',(56,78,64,84),12)]
# Endpoints are on room boundaries, so stairs form parts of the building wings.
stairs=[('S1','C','M',(38,24,44,36),0,6),('S2','E','H',(54,24,60,36),0,6),('S3','H','A',(58,46,64,58),6,12),('S4','D','AW',(42,58,48,70),6,12),('S5','Q','J',(26,44,30,56),6,0),('S6','B','V',(14,72,20,84),0,6),('S7','R','I',(38,78,44,90),6,12)]
links=[('T','F'),('T','C'),('F','C'),('C','E'),('F','P'),('F','L'),('P','L'),('P','K'),('K','PC'),('L','PC'),('K','B'),('PC','B'),('M','H'),('M','Q'),('M','D'),('J','B'),('D','W'),('W','R'),('R','N'),('N','U'),('U','V'),('I','CT'),('CT','AC'),('AC','A'),('A','AW')]
seed=731904
rng=random.Random(seed)
raw=[{'id':r[0],'candidate_xy':[round((r[2][0]+r[2][2])/2+rng.uniform(-5,5),2),round((r[2][1]+r[2][3])/2+rng.uniform(-5,5),2)]} for r in rooms]
data={'revision':'S01','units':'meters, right-handed Z-up','seed':seed,'provisional_floors':{'nodes':18,'edges':24},'actual_counts':{'nodes':len(rooms),'edges':len(links)+len(stairs)},'rooms':[{'id':i,'name':n,'bounds':b,'z':z} for i,n,b,z in rooms],'stairs':[{'id':i,'from':a,'to':b,'bounds':q,'z0':z0,'z1':z1} for i,a,b,q,z0,z1 in stairs],'flat_links':links,'raw_seed':raw,'seed_notes':'Jittered spatial anchors reshaped into three coherent cliffside wings; retained the separated objective levels, gallery-over-pumps crossing, mid-to-rear spine and two independent ascents toward Reactor. Raw positions are scaffolding, not authored room corners.'}
(root/'layout-data.json').write_text(json.dumps(data,indent=2)+'\n')
S=7;ox=75;oy=790
X=lambda x:ox+x*S
Y=lambda y:oy-y*S
out=['<svg xmlns="http://www.w3.org/2000/svg" width="1360" height="1040" viewBox="0 0 1360 1040">', '<rect width="1360" height="1040" fill="#101a27"/>', '<style>text{font-family:Arial,sans-serif;fill:#eaf1fa} .label{font-size:10px;font-weight:bold;text-anchor:middle}.sub{font-size:9px;text-anchor:middle;fill:#c3d3e4}</style>','<text x="45" y="36" font-size="27" font-weight="bold">BLACKGLASS / CLIFFSIDE ARRAY</text>','<text x="45" y="62" font-size="14">S01 • Quick spatial sketch • 5v5 CT/T bomb defusal • 72 × 96m playable envelope</text>']
out+=['<path d="M 690 100 L 830 100 L 830 845 L 555 845 L 620 700 L 640 550 L 650 350 Z" fill="#29313b" stroke="#66717a"/>','<text x="725" y="140" font-size="14">MOUNTAIN</text>','<text x="713" y="161" font-size="12">steep rock cut</text>','<text x="18" y="410" font-size="12" transform="rotate(-90 18 410)">VALLEY / 30m FALL BELOW FACILITY</text>']
colors={0:'#264455',6:'#3d5368',12:'#62515d'}
for i,n,b,z in rooms:
 x1,y1,x2,y2=b
 fill='#12696a' if i=='B' else '#8a492d' if i=='A' else colors[z]
 dash=' stroke-dasharray="5 3"' if i=='Q' else ''
 out.append(f'<rect x="{X(x1)}" y="{Y(y2)}" width="{(x2-x1)*S}" height="{(y2-y1)*S}" fill="{fill}" stroke="#a4bbc8" stroke-width="2"{dash}/>')
 cx=X((x1+x2)/2);cy=Y((y1+y2)/2)
 label=i+' / '+n if (x2-x1)>10 else i
 out.append(f'<text x="{cx}" y="{cy-3}" class="label">{html.escape(label)}</text><text x="{cx}" y="{cy+10}" class="sub">+{z}m</text>')
for i,a,b,q,z0,z1 in stairs:
 x1,y1,x2,y2=q
 out.append(f'<rect x="{X(x1)}" y="{Y(y2)}" width="{(x2-x1)*S}" height="{(y2-y1)*S}" fill="#81755a" stroke="#eed391" stroke-width="1.4"/>')
 for j in range(1,12):
  yy=y1+(y2-y1)*j/12
  out.append(f'<path d="M {X(x1)} {Y(yy)} H {X(x2)}" stroke="#c5b37d" stroke-width=".8"/>')
 out.append(f'<text x="{X((x1+x2)/2)}" y="{Y((y1+y2)/2)}" class="label">{i}</text>')
# Draw shared thresholds, and stair threshold edges. Exact openings are developed next.
lookup={r[0]:r for r in rooms}
for a,b in links:
 aa=lookup[a][2];bb=lookup[b][2]
 if aa[2]==bb[0] or bb[2]==aa[0]:
  xx=aa[2] if aa[2]==bb[0] else aa[0];lo=max(aa[1],bb[1]);hi=min(aa[3],bb[3]);mid=(lo+hi)/2;w=min(4,hi-lo-.6)
  out.append(f'<path d="M {X(xx)} {Y(mid-w/2)} V {Y(mid+w/2)}" stroke="#71f5ca" stroke-width="5"/>')
 elif aa[3]==bb[1] or bb[3]==aa[1]:
  yy=aa[3] if aa[3]==bb[1] else aa[1];lo=max(aa[0],bb[0]);hi=min(aa[2],bb[2]);mid=(lo+hi)/2;w=min(4,hi-lo-.6)
  out.append(f'<path d="M {X(mid-w/2)} {Y(yy)} H {X(mid+w/2)}" stroke="#71f5ca" stroke-width="5"/>')
# Section: actual slope direction is E-W, floors attach at three contour levels.
out+=['<text x="875" y="118" font-size="18" font-weight="bold">SECTION / looking north</text>', '<path d="M 895 472 L 895 425 L 1030 331 L 1110 250 L 1265 151 L 1265 520 Z" fill="#36404b" stroke="#78818c"/>','<path d="M 865 403 H 1015 M 1000 323 H 1150 M 1110 243 H 1265" stroke="#6fe2db" stroke-width="8"/>','<path d="M 899 407 V 497 M 953 407 V 456 M 1006 327 V 416" stroke="#708393" stroke-width="6"/>','<text x="870" y="387" font-size="13">B data vault / +0m</text>','<text x="1010" y="307" font-size="13">Mid / +6m</text>','<text x="1120" y="227" font-size="13">A reactor / +12m</text>','<text x="890" y="548" font-size="13">Facility brackets a 45–60° mountainside.</text>','<text x="890" y="570" font-size="13">Lower deck hangs 30m above scenic ravine.</text>']
notes=['24 meaningful spaces / 32 movement connections','Authoring floors: 18 nodes / 24 edges','Cyan = actual shared threshold (bidirectional)','Gold = stairs, 6m rise over 12m run','Dashed Q = +6m gallery over lower gallery L','No transfer at the optical-only Q/L crossing','Typical doors 4m; stairs 4–6m; rooms 8–24m','7 reversible stair journeys; no mandatory jumps','North ↑ ; shared XY origin at dock southwest','Seed 731904 reshaped into packed building wings','Solid east mass is rock; west void is open ravine']
for j,t in enumerate(notes): out.append(f'<text x="875" y="{630+j*24}" font-size="13">{html.escape(t)}</text>')
out+=['<path d="M 75 865 H 215 M 75 859 V 871 M 215 859 V 871" stroke="#eaf1fa"/>','<text x="120" y="888" font-size="12">20 meters</text>','<text x="45" y="936" font-size="13">Intent: industrial megastructure carved into rock, with suspended lower vault, central double-height atrium, and upper reactor terrace.</text>','<text x="45" y="962" font-size="13">Height overlaps and all seven stair interfaces are part of the sketch; production geometry has not been authored.</text>','</svg>']
(root/'sketch.svg').write_text('\n'.join(out))
print(data['actual_counts'])
