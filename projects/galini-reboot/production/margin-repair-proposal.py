from pathlib import Path
import json,sys
sys.path.insert(0,str(Path('generated/galini-reboot-geometry-tools').resolve()))
from shapely.geometry import Polygon,LineString,Point,box
j=json.load(open('projects/galini-reboot/planning/l03/layout.json'));e=json.load(open('projects/galini-reboot/production/encounters-c01.json'))
p=[
 {'id':'NORTH-SCHOOL-PLINTH','floor':'F04-01','p':[[92.9,88.7],[113.35,88.7],[113.35,90.7],[92.9,90.7]],'base':3.7,'top':7.7,'reason':'Closed retaining shoulder behind lower School facade; actual lower arcade remains at y84.'},
 {'id':'RIDGE-GATEHOUSE-PLINTH','floor':'F08-01','p':[[127.1,102.7],[130.1,102.7],[128.2,112.2],[126.7,112.2]],'base':7.7,'top':9.1,'reason':'Merge thin unwalkable slot behind gatehouse with perimeter retaining coping.'},
 {'id':'CHAPEL-SOUTH-COPE','floor':'F06-01','p':[[7.8,71.8],[8.55,71.8],[8.55,72.65],[7.8,72.65]],'base':5.7,'top':7.1,'reason':'Close tiny exterior bevel beside solid parapet, outside occupied porch route.'},
 {'id':'PRESS-FACADE-FOOT','floor':'F08-01','p':[[31.6,84.8],[32.25,84.8],[32.25,85.55],[31.6,85.55]],'base':7.7,'top':9.2,'reason':'Close sub-body triangular corner beneath slanted Press facade.'},
 {'id':'SCHOOL-WEST-COPE','floor':'F08-01','p':[[94.05,88.35],[95,88.35],[95,89.25],[94.05,89.25]],'base':7.7,'top':9.1,'reason':'Cap short blind-end slot by School north-west facade and suspended lip.'},
 {'id':'BELL-SOUTH-COPE','floor':'F08-01','p':[[114,76.15],[116,76.15],[116,77],[114,77]],'base':7.7,'top':9.1,'reason':'Close sub-body triangular well-rim spur south of Bell ascent.'}
]
for q in p:
 f=next(f for f in j['flatFloors'] if f['id']==q['floor']);g=Polygon(q['p']).intersection(Polygon(f['p'],f['holes'])).buffer(.12,join_style=2);q['p']=list(g.exterior.coords)[:-1];q['area']=g.area
 hits=[]
 for r in e['routes']:
  for a,b in zip(r['waypoints'],r['waypoints'][1:]):
   if max(a[2],b[2])+1.8<q['base'] or min(a[2],b[2])>q['top']:continue
   if LineString([a[:2],b[:2]]).buffer(.3).intersects(g):hits.append(r['id'])
 q['routeCapsulePlanIntersections']=sorted(set(hits))
json.dump(p,open('projects/galini-reboot/production/margin-repair-proposal.json','w'),indent=2)
W,H=1500,1320;s=9;X=lambda x:60+x*s;Y=lambda y:1150-y*s
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="#f8f6ee"/><text x="50" y="35" font-family="sans-serif" font-size="23">C08 local construction proposal — close incidental unwalkable margins</text>']
for f in j['flatFloors']:
 pts=' '.join(f'{X(x)},{Y(y)}' for x,y in f['p']);svg.append(f'<polygon points="{pts}" fill="#d9dfda" stroke="#89968d" stroke-width="1"/>')
for b in j['buildings']:
 pts=' '.join(f'{X(x)},{Y(y)}' for x,y in b['p']);svg.append(f'<polygon points="{pts}" fill="#c0bcae" stroke="#6f716d" stroke-width="1"/>')
for i,q in enumerate(p):
 pts=' '.join(f'{X(x)},{Y(y)}' for x,y in q['p']);svg.append(f'<polygon points="{pts}" fill="#bd594d" stroke="#8e3027" stroke-width="2"/>');x,y=q['p'][0];svg.append(f'<text x="{X(x)-12}" y="{Y(y)-10}" font-family="sans-serif" font-size="18" fill="#7b251e">{i+1}</text>')
for i,q in enumerate(p):svg.append(f'<text x="50" y="{1190+i*18}" font-family="sans-serif" font-size="14">{i+1}. {q["id"]}: {q["reason"]} Route intersections: {q["routeCapsulePlanIntersections"]}.</text>')
svg.append('</svg>');Path('projects/galini-reboot/production/margin-repair-proposal.svg').write_text(''.join(svg))
print([(q['id'],q['area'],q['routeCapsulePlanIntersections']) for q in p])
