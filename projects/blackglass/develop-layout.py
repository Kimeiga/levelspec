from pathlib import Path
import json, html
p=Path(__file__).parent
d=json.loads((p/'layout-data.json').read_text());d['revision']='L05'
for r in d['rooms']:
 if r['id']=='R':r['name']='CT operations / rear bridge'
 if r['id']=='CT':r['name']='Summit command pad'
positions=[(16,12,4.5),(30,12,4.5),(24,18,4),(44,19,4),(10,28,4),(22,28,3),(18,32,3.4),(9,42,4),(18,48,3.4),(22,42,3.4),(10,52,4),(22,52,3.4),(48,39.5,4),(30,40.5,4),(35,50,4),(26,59,4),(35,58,4),(35,72,4),(29,78,4),(29,84,4),(20,87,4),(48,93,4),(60,84,4),(60,78,4),(48,74,4)]
lookup={r['id']:r for r in d['rooms']}
d['doors']=[]
for (a,b),(x,y,w) in zip(d['flat_links'],positions):
 aa=lookup[a]['bounds'];bb=lookup[b]['bounds'];axis='y' if aa[2]==bb[0] or bb[2]==aa[0] else 'x'
 d['doors'].append({'id':f'{a}-{b}','from':a,'to':b,'center':[x,y,lookup[a]['z']],'width':w,'axis':axis,'height':3.6})
# Base/top elevations are explicit; obstacle IDs survive source and render review.
obs=[
 ('F-cargo',(7,18,14,22),0,3.2,'opaque freight stack / break dock-to-cooling view'),('F-low',(17,23,21,25),0,1.25,'freight crossing refuge'),
 ('C-kiosk',(30,16,34,20),0,3.4,'offset concourse sight screen'),('E-low',(47,20,51,22),0,1.25,'cable stair preparation'),
 ('P-pump1',(7,32,11,36),0,2.8,'coolant equipment, western lane split'),('P-pump2',(12,37,16,40),0,1.25,'pump retreat refuge'),
 ('K-low',(5.5,46,9,48),0,1.25,'B long preparation'),('PC-rack',(21,45,24,48),0,2.8,'control room offset screen'),
 ('B-core',(11,59,17,65),0,4.2,'data core divides plant and rear paths'),('B-low1',(5,55,9,57),0,1.25,'long-entry refuge'),
 ('B-rack',(21,64,24,67),0,2.8,'short versus rear angle separator'),('B-low2',(18,68,22,70),0,1.25,'rear reposition refuge'),
 ('M-array',(39,41,44,45),6,3.5,'atrium optical baffle'),('M-low',(32,46,35,48),6,1.25,'gallery-to-cleanroom retreat'),
 ('H-exchanger',(50,40.5,54,44),6,3.4,'main ascent approach screen'),('H-low',(59,38,62,40),6,1.25,'upper main preparation'),
 ('Q-low',(19,42,23,44),6,1.25,'gallery reverse-peek refuge; 3.8m passage remains'),
 ('D-screen',(32,53,37,55),6,3.4,'west-wall baffle closes Mid-to-CT ray; circulation east'),('D-low',(41,54,44,56),6,1.25,'split staging refuge'),
 ('R-low',(27,72.8,30,74.3),6,1.25,'rear bridge duck/reposition refuge'),('U-low',(22,85,24,87),6,1.25,'vault stair head refuge'),
 ('AW-low',(43,71,45.5,72.5),12,1.25,'reactor short landing refuge'),
 ('A-reactor',(56.6,64.6,63.4,71.4),12,5,'circular reactor core radius3.4'),('A-screen',(50,64,54,66),12,3.4,'short entrance angle separator'),
 ('A-low1',(55,60.5,59,62.5),12,1.25,'main-entry duck refuge'),('A-low2',(65,73,69,75),12,1.25,'rear retake reposition refuge')]
d['obstacles']=[{'id':i,'bounds':b,'base':z,'height':h,'role':role} for i,b,z,h,role in obs]
d['markers']={'T':[22,6,0],'CT':[35,75,6],'A':[65,66,12],'B':[8,63,0]}
d['stair_screen_overrides']={'S1-west':5.2}
d['heights']={'gallery_slab':.8,'walls':5.2,'doors':3.6,'stair_screens':3.4,'slab':.35,'low_cover':1.25,'standing_eye':1.674,'crouched_eye':1.023,'standing_body':1.8,'crouched_body':1.1}
(p/'layout-data.json').write_text(json.dumps(d,indent=2)+'\n')
S=8;ox=60;oy=860
X=lambda x:ox+x*S
Y=lambda y:oy-y*S
out=['<svg xmlns="http://www.w3.org/2000/svg" width="1660" height="1160" viewBox="0 0 1660 1160">','<rect width="1660" height="1160" fill="#101a27"/>','<style>text{font-family:Arial,sans-serif;fill:#eaf1fa}.label{font-size:10px;font-weight:bold;text-anchor:middle}.sub{font-size:9px;text-anchor:middle;fill:#b7cedf}</style>','<text x="40" y="32" font-size="26" font-weight="bold">BLACKGLASS — DEVELOPED LAYOUT L05</text>','<text x="40" y="56" font-size="13">5v5 defusal / 24 spaces / 32 connections / 3 contour levels / north ↑ / meters, Z-up / origin (0,0) southwest</text>']
# Nonplayable terrain: steep slope begins beyond x66, below upper rooms.
out+= [f'<path d="M {X(66)} {Y(97)} L {X(83)} {Y(97)} L {X(83)} {Y(-5)} L {X(66)} {Y(-5)} Z" fill="#303a44"/>',f'<text x="{X(75)}" y="{Y(82)}" font-size="12" transform="rotate(90 {X(75)} {Y(82)})">ROCK CUT / NO PLAYABLE SURFACE</text>']
for r in d['rooms']:
 i=r['id'];x1,y1,x2,y2=r['bounds'];z=r['z'];fill={0:'#264455',6:'#3d5368',12:'#62515d'}[z]
 if i=='B':fill='#135f63'
 if i=='A':fill='#805134'
 out.append(f'<rect x="{X(x1)}" y="{Y(y2)}" width="{(x2-x1)*S}" height="{(y2-y1)*S}" fill="{fill}" stroke="#bfd0dc" stroke-width="2"/>')
 if i not in ['Q','L']:
  out.append(f'<text x="{X((x1+x2)/2)}" y="{Y((y1+y2)/2)-4}" class="label">{i}</text><text x="{X((x1+x2)/2)}" y="{Y((y1+y2)/2)+9}" class="sub">+{z}</text>')
for s in d['stairs']:
 x1,y1,x2,y2=s['bounds']
 out.append(f'<rect x="{X(x1)}" y="{Y(y2)}" width="{(x2-x1)*S}" height="{(y2-y1)*S}" fill="#7e7154" stroke="#efd896" stroke-width="2"/>')
 for j in range(1,16):
  yy=y1+(y2-y1)*j/16;out.append(f'<path d="M {X(x1)} {Y(yy)} H {X(x2)}" stroke="#c7b480" stroke-width=".7"/>')
 out.append(f'<text x="{X((x1+x2)/2)}" y="{Y((y1+y2)/2)}" class="label">{s["id"]}</text>')
for o in d['doors']:
 x,y,z=o['center'];w=o['width'];cmd=f'M {X(x)} {Y(y-w/2)} V {Y(y+w/2)}' if o['axis']=='y' else f'M {X(x-w/2)} {Y(y)} H {X(x+w/2)}'
 out.append(f'<path d="{cmd}" stroke="#73f5cd" stroke-width="5"/>')
for o in d['obstacles']:
 i=o['id'];x1,y1,x2,y2=o['bounds'];fill='#44baae' if o['height']<1.5 else '#17232f'
 if i=='A-reactor':
  out.append(f'<circle cx="{X(60)}" cy="{Y(68)}" r="{3.4*S}" fill="#17232f" stroke="#ffb75a" stroke-width="2"/>')
 else:out.append(f'<rect x="{X(x1)}" y="{Y(y2)}" width="{(x2-x1)*S}" height="{(y2-y1)*S}" fill="{fill}" stroke="#a5d0d8" stroke-width="1"/>')
 out.append(f'<text x="{X((x1+x2)/2)}" y="{Y((y1+y2)/2)+3}" font-size="7" text-anchor="middle">{i}</text>')
for i,(x,y,z) in d['markers'].items():
 col='#ec8c55' if i in ['T','A'] else '#63d4df';out.append(f'<circle cx="{X(x)}" cy="{Y(y)}" r="10" fill="{col}"/><text x="{X(x)}" y="{Y(y)+4}" class="label">{i}</text>')
out.extend([f'<text x="{X(24)}" y="{Y(39)+2}" class="label">Q +6 / over L</text>',f'<text x="{X(24)}" y="{Y(32)}" class="label">L +0</text>'])
# L05 stair screen repair: westS1 is taller, no threshold or movement change.
out.append(f'<path d="M {X(38)} {Y(24)} V {Y(36)}" stroke="#ed91be" stroke-width="4"/>')
out.append(f'<text x="{X(37)}" y="{Y(29)}" font-size="9" text-anchor="end">S1 west5.2h</text>')
# Observation-only openings face scenic space; clear collision glazing closes each.
for xx,y1,y2 in [(2,59,66),(72,63,72)]:
 out.append(f'<path d="M {X(xx)} {Y(y1)} V {Y(y2)}" stroke="#79cfff" stroke-width="5" stroke-dasharray="3 2"/>')
# Selected predicted lines stop at actual tall baffles; optical studies only.
for a,b in [((37,38),(39,41)),((49,74),(50,65)),((9,54),(11,59))]:
 out.append(f'<path d="M {X(a[0])} {Y(a[1])} L {X(b[0])} {Y(b[1])}" stroke="#f3a1bd" stroke-width="1.5" stroke-dasharray="4 3"/>')
# Upper/lower section at gallery, with body eyes and slab thickness.
out+=['<text x="790" y="105" font-size="18" font-weight="bold">HEIGHT STUDIES / predicted, not compiled</text>','<text x="790" y="135" font-size="13">Q over L / section looking north / Z shown at 16 px/m</text>','<path d="M 800 338 H 1025 M 800 242 H 1025" stroke="#a6d7df" stroke-width="6"/>','<path d="M 800 242 V 159 M 1025 242 V 159 M 800 338 V 290" stroke="#c0ccda" stroke-width="5"/>','<path d="M 850 338 V 309 M 880 242 V 213" stroke="#f2dca2" stroke-width="4"/>','<circle cx="850" cy="311" r="3" fill="#f6a9c9"/><circle cx="880" cy="215" r="3" fill="#f6a9c9"/>','<text x="1045" y="337" font-size="12">L floor +0 / eye +1.674</text>','<text x="1045" y="242" font-size="12">Q floor +6 / eye +7.674</text>','<text x="1045" y="267" font-size="12">.80m Q slab; underside +5.20</text>','<text x="1045" y="292" font-size="12">No optical slit or physical transfer.</text>','<text x="1045" y="317" font-size="12">5.2m opaque walls contain Q views.</text>',
'<text x="790" y="385" font-size="13">S3 / S4 rises: +6 → +12 / 12m run / 30 × .20m risers</text>','<path d="M 805 520 H 850 L 1042 424 H 1100" stroke="#d9c68f" stroke-width="6" fill="none"/>','<path d="M 850 466 L 1042 370" stroke="#b2c6d6" stroke-width="4"/>','<path d="M 890 500 V 473 M 1042 424 V 397" stroke="#f2dca2" stroke-width="3"/>','<text x="1120" y="422" font-size="12">Landing eye +13.674</text>','<text x="1120" y="448" font-size="12">3.4m side screens follow stair grade.</text>','<text x="1120" y="474" font-size="12">Clear headroom ≥3.6m at doors.</text>','<text x="1120" y="500" font-size="12">Top hold can see ascent; stair is committed.</text>',
'<text x="790" y="568" font-size="13">Low-cover / upright body: floor +0, top +1.25, eyes +1.674 / +1.023</text>','<text x="790" y="593" font-size="13">Upper floors use the same offsets. Oblique/elevated views may defeat low refuges.</text>','<text x="790" y="618" font-size="13">Study FOV: 100° horizontal / 75° vertical. All predicted lines require compiled checks.</text>']
legend=['Cyan thresholds: 3–4.5m wide, 3.6m head clearance; walls 5.2m high.','Dark fixtures: full-height screens/equipment. Teal: 1.25m low refuges.','Screens: +3.4m over tread; S1 west rises5.2m to close the spawn ray.','Spawn rooms T and R receive opaque roofs at +4.2m over their floors.','A plant: (65,66,+12), east of core. B plant: (8,63,0), west of data core.','All seven stairs reversible; no jump, boost, drop or crouch-only route.','Blue dashed: outward observation windows, sill1.1 / head3.2; clear collision pane.',
'A main = H / S3; A short = D / S4 / AW; A rear = CT / AC.','B long = K; B auxiliary = PC; B short = Q / S5 / J; B rear = V / S6.','Mountain starts east of X66 below upper decks; cliff rock remains outside floors.','R / N / U / V form one service wing around the rear of the lower vault.']
for j,t in enumerate(legend):out.append(f'<text x="790" y="{675+j*23}" font-size="12">{html.escape(t)}</text>')
# Callout index offers legible full names without crowding small rooms.
for j,r in enumerate(d['rooms']):
 col=j//12;row=j%12;out.append(f'<text x="{45+col*350}" y="{935+row*17}" font-size="11">{r["id"]} — {html.escape(r["name"])} (+{r["z"]})</text>')
out+=['<path d="M 60 895 H 220 M 60 889 V 901 M 220 889 V 901" stroke="#c8d6e1"/>','<text x="110" y="915" font-size="11">20 meters</text>','</svg>']
(p/'layout.svg').write_text('\n'.join(out))
# Inventory is derived from the authored layout, not an independent acceptance claim.
lines=['# L05 fixture inventory','','All fixtures are opaque visible collision solids. Bullet penetration, destruction, grenade and sound behavior are unconfigured. Low fixtures at1.25m offer possible crouched optical refuge against same-level eyes; side/elevated exposure remains. Source IDs equal the IDs below. Rock, supports, roofs and structural trim are grouped scenic/structural fixtures and may still occlude views.','','| ID | XY bounds | Base / height | Purpose |','| --- | --- | --- | --- |']
for o in d['obstacles']:lines.append(f'| {o["id"]} | {o["bounds"]} | {o["base"]} / {o["height"]}m | {o["role"]} |')
(p/'inventory.md').write_text('\n'.join(lines)+'\n')
