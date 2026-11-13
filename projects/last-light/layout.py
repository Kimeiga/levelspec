"""Regenerate the dimensional design packet; does not modify the editable AML."""
import json, math
from pathlib import Path
P=Path(__file__).parent
rot=lambda p:[80-p[0],72-p[1]]
rect=lambda x,y,w,h:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]
rooms=[dict(id='ANCHOR-A',label='A · old department store',poly=rect(4,4,16,16),z=0),dict(id='SOUTH',label='South promenade',poly=[[20,8],[40,8],[40,24],[32,24],[32,20],[20,20]],z=0),dict(id='ARCADE',label='West arcade',poly=[[4,20],[20,20],[20,32],[28,32],[28,48],[4,48]],z=0),dict(id='COURT',label='Dry fountain court',poly=[[34,24],[46,24],[52,30],[52,42],[46,48],[34,48],[28,42],[28,30]],z=0)]
for src,id,label in [(rooms[0],'ANCHOR-B','B · old department store'),(rooms[1],'NORTH','North promenade'),(rooms[2],'CINEMA','East cinema')]:rooms.append(dict(id=id,label=label,poly=[rot(p) for p in src['poly']],z=0))
rooms.extend([dict(id='FOOD-LOFT',label='Food court loft',poly=rect(10,34,18,8),z=3),dict(id='PROJECTION-LOFT',label='Projection loft',poly=[rot(p) for p in rect(10,34,18,8)],z=3)])
obstacles=[]
def ob(id,x,y,w,d,h,role,z=0,mat='dark'):
 obstacles.append(dict(id=id,poly=rect(x,y,w,d),z=z,height=h,role=role,material=mat))
ob('LIFT',38.5,34,3,4,5.8,'Opaque dead lift shaft splits point and interrupts opposing loft views',mat='teal')
ob('A-KIOSK',25,13,5,4,3.2,'Jewelry kiosk gives hard reset before south entry',mat='pink')
ob('A-CORE',12,12,4,6,3.4,'Spawn service core offsets both exits',mat='teal')
ob('A-LOW',34,17.5,4,1.2,1.15,'Standing exposed / crouch refuge south staging',mat='pink')
ob('ARCADE-CABINETS',4,27,2,5,2.3,'Cabinet bank creates west wall recess',mat='teal')
ob('WEST-COUNTER',18,39.5,5,2.5,1.15,'Loft preparation refuge; exposed to opposing height',3,'pink')
for src in list(obstacles[1:]):
 if src['id']=='WEST-COUNTER':id='EAST-COUNTER'
 else:id={'A-KIOSK':'B-KIOSK','A-CORE':'B-CORE','A-LOW':'B-LOW','ARCADE-CABINETS':'CINEMA-COUNTER'}[src['id']]
 obstacles.append(dict(src,id=id,poly=[rot(p) for p in src['poly']]))
ob('F-SOUTH',33,30,4,1.1,1.1,'Broken fountain rim; exposed to upper views',mat='tile')
ob('F-NORTH',43,40.9,4,1.1,1.1,'Broken fountain rim; exposed to upper views',mat='tile')
# Internal full-height spawn walls, both doors 6m wide.
walls=[dict(id='A-E1',a=[20,4],b=[20,10],z=0,h=4),dict(id='A-E2',a=[20,16],b=[20,20],z=0,h=4),dict(id='A-N1',a=[4,20],b=[6,20],z=0,h=4),dict(id='A-N2',a=[12,20],b=[20,20],z=0,h=4)]
for w in list(walls):walls.append(dict(w,id=w['id'].replace('A-','B-'),a=rot(w['a']),b=rot(w['b'])))
# Loft guards: lower screen and solid side cheeks, no traversable aperture.
for side,x,ys in [('W',28,[34,36,40,42]),('E',52,[30,32,36,38])]:
 for i,(a,b,h) in enumerate(zip(ys[:-1],ys[1:],[2.6,1.1,2.6])):walls.append(dict(id=f'{side}-LOFT-FRONT-{i}',a=[x,a],b=[x,b],z=3,h=h))
for id,a,b in [('W-REAR',[10,34],[10,42]),('W-NORTH',[10,42],[28,42]),('W-SOUTH',[16,34],[28,34]),('E-REAR',[70,38],[70,30]),('E-SOUTH',[70,30],[52,30]),('E-NORTH',[64,38],[52,38])]:walls.append(dict(id=id,a=a,b=b,z=3,h=1.1))
stairs=[dict(id='WEST-STAIR',a=[13,22,0],b=[13,34,3],width=6,count=20,fromRoom='ARCADE',toRoom='FOOD-LOFT'),dict(id='EAST-STAIR',a=[67,50,0],b=[67,38,3],width=6,count=20,fromRoom='CINEMA',toRoom='PROJECTION-LOFT')]
markers=[dict(id='control',pos=[36,36,0],kind='objective',room='COURT')]
for team,room in [('A','ANCHOR-A'),('B','ANCHOR-B')]:
 for i,p in enumerate([[7,7],[10,7],[13,7],[7,10],[10,10]]):
  if team=='B':p=rot(p)
  markers.append(dict(id=f'{team.lower()}-spawn-{i+1}',pos=p+[0],kind='spawn',team=team,room=room))
for id,pos,room in [('south-stage',[36,22,0],'SOUTH'),('north-stage',[44,50,0],'NORTH'),('west-mouth',[26,36,0],'ARCADE'),('east-mouth',[54,36,0],'CINEMA'),('west-loft',[25,38,3],'FOOD-LOFT'),('east-loft',[55,34,3],'PROJECTION-LOFT'),('west-stair-foot',[13,21,0],'ARCADE'),('west-stair-top',[13,35,3],'FOOD-LOFT'),('east-stair-foot',[67,51,0],'CINEMA'),('east-stair-top',[67,37,3],'PROJECTION-LOFT')]:markers.append(dict(id=id,pos=pos,room=room,kind='poi'))
data=dict(revision='L03',objectiveZone=dict(center=[40,36,0],radius=7,height=2.5,level='ground only; lofts do not score'),units='meters; right-handed Z-up',rooms=rooms,obstacles=obstacles,walls=walls,stairs=stairs,markers=markers,connections=[['ANCHOR-A','SOUTH'],['ANCHOR-A','ARCADE'],['SOUTH','COURT'],['ARCADE','COURT'],['ANCHOR-B','NORTH'],['ANCHOR-B','CINEMA'],['NORTH','COURT'],['CINEMA','COURT']])
(P/'layout-data.json').write_text(json.dumps(data,indent=2)+'\n')
s=9;ox=65;oy=710
pt=lambda p:f'{ox+p[0]*s},{oy-p[1]*s}'
parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1100" viewBox="0 0 1200 1100">','<rect width="1200" height="1100" fill="#f7f3e9"/>','<style>text{font-family:Arial;fill:#243d40}.small{font-size:12px}.label{font-size:14px;font-weight:bold}</style>','<text x="60" y="35" font-size="26" font-weight="bold">LAST LIGHT GALLERIA · L03</text>','<text x="60" y="60" font-size="15">5v5 control · +Y north ↑ · meters · shared floor edges are open except heavy drawn walls</text>']
for r in rooms:
 color='#d9b4c0' if r['z'] else '#dfdccd'
 parts.append(f'<polygon points="{" ".join(map(pt,r["poly"]))}" fill="{color}" fill-opacity=".75" stroke="#768581" stroke-width="1.5"/>')
 # label from manual anchors for clarity
positions={'ANCHOR-A':(12,5.4),'ANCHOR-B':(68,66),'SOUTH':(30,9),'NORTH':(50,62),'ARCADE':(17,46),'CINEMA':(63,26),'COURT':(40,45),'FOOD-LOFT':(21,35),'PROJECTION-LOFT':(59,37)}
for r in rooms:
 x,y=positions[r['id']];parts.append(f'<text x="{ox+x*s}" y="{oy-y*s}" class="label" text-anchor="middle">{r["id"]} +{r["z"]}</text>')
for o in obstacles:
 parts.append(f'<polygon points="{" ".join(map(pt,o["poly"]))}" fill="{"#607c79" if o["height"]>2 else "#c7888e"}" stroke="#465957"/>')
 cx=sum(p[0] for p in o['poly'])/4;cy=sum(p[1] for p in o['poly'])/4
 parts.append(f'<text x="{ox+cx*s}" y="{oy-cy*s}" font-size="9" text-anchor="middle">{o["id"]}</text>')
for w in walls:parts.append(f'<line x1="{ox+w["a"][0]*s}" y1="{oy-w["a"][1]*s}" x2="{ox+w["b"][0]*s}" y2="{oy-w["b"][1]*s}" stroke="{"#72384b" if w["z"] else "#304c4b"}" stroke-width="4"/>')
for st in stairs:
 x,y,z=st['a'];xx,yy,zz=st['b'];w=st['width']/2
 poly=[[x-w,y],[x+w,y],[xx+w,yy],[xx-w,yy]]
 parts.append(f'<polygon points="{" ".join(map(pt,poly))}" fill="#a3bfc1" stroke="#405c5e"/>')
 for i in range(1,20):
  t=i/20;yt=y+(yy-y)*t;parts.append(f'<line x1="{ox+(x-w)*s}" y1="{oy-yt*s}" x2="{ox+(x+w)*s}" y2="{oy-yt*s}" stroke="#56777a" stroke-width=".7"/>')
 parts.append(f'<text x="{ox+x*s}" y="{oy-(y+yy)/2*s}" class="small" text-anchor="middle">20 × .15</text>')
for m in markers:
 if m['kind']=='spawn':parts.append(f'<circle cx="{ox+m["pos"][0]*s}" cy="{oy-m["pos"][1]*s}" r="4" fill="{"#19869a" if m.get("team")=="A" else "#cd6f40"}"/>')
parts.append(f'<circle cx="{ox+40*s}" cy="{oy-36*s}" r="63" fill="none" stroke="#d39c38" stroke-width="3" stroke-dasharray="9 5"/>')
notes=['BODY / CAMERA','Radius .40 · stand 2.00 · crouch 1.15','Step .30 · slope 42° · eye 1.86 / 1.07','Inspection fov 75° vertical','', 'GROUND / LOFT INTERFACES','Ground slab top 0 / thickness .35','Lofts top +3 / underside +2.65','Stairs 6m wide · 12m run · 20 risers','Full 6×8m receiving landing','Low front guards 1.1; side cheeks 2.6','No upper bridge / no required jump','', 'COURT MOUTHS (clear before walls)','South X34–40 / Y24: 6m','North X40–46 / Y48: 6m','West X28 / Y32–42: 10m','East X52 / Y30–40: 10m','Walls .24m / 5.8m high','', 'READING','Teal masses: tall optical screens','Pink masses: low cover, upper exposed','Pink floor: +3m occupied loft','Orange dashed: proposed control ring','White voids: sealed retail / exterior']
for i,t in enumerate(notes):parts.append(f'<text x="810" y="{95+i*22}" font-size="{14 if t.isupper() else 13}" font-weight="{"bold" if t.isupper() else "normal"}">{t}</text>')
# Aligned schematic section with actual levels.
parts += ['<text x="60" y="775" class="label">SECTION X–X · Y36 · LOOK NORTH · predicted height relationships</text>']
sx=lambda x:60+x*9
sz=lambda z:920-z*18
for a,b,z,t in [(4,76,0,.35),(10,28,3,.35),(52,70,3,.35)]:parts.append(f'<rect x="{sx(a)}" y="{sz(z)}" width="{(b-a)*9}" height="{t*18}" fill="#747f7c"/>')
for x,z,h in [(28,3,1.1),(52,3,1.1),(38.5,0,5.8)]:parts.append(f'<rect x="{sx(x)}" y="{sz(z+h)}" width="{27 if x==38.5 else 3}" height="{h*18}" fill="#455f5d"/>')
for x in [25,55]:
 parts.append(f'<circle cx="{sx(x)}" cy="{sz(4.86)}" r="4" fill="#c7774c"/>')
 parts.append(f'<line x1="{sx(x)}" y1="{sz(4.86)}" x2="{sx(40)}" y2="{sz(4.86)}" stroke="#bb7645" stroke-dasharray="5 4"/>')
parts += ['<text x="60" y="968" class="small">Ground mouths below lofts: 2.65m clear. Lift opaque through +5.8; upper-to-upper center ray intercepted.</text>','<text x="60" y="992" class="small">Guards are low cover; lofts can see outer control sectors. Full crouch / ascending / offset views remain compiled checks.</text>','<text x="60" y="1040" font-size="13">Ground loop: A → South → Court → Arcade → A. Opposing loop B → North → Court → Cinema → B.</text>','<text x="60" y="1064" font-size="13">Upper lofts are local cul-de-sacs with reverse stair exits; ground passages continue underneath.</text>','</svg>']
(P/'layout.svg').write_text('\n'.join(parts))
