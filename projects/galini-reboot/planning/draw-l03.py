from pathlib import Path
import json,html,math
out=Path('projects/galini-reboot/planning/l03');d=json.loads((out/'layout.json').read_text())
colors={0:'#f1e1b6',2:'#e3dfbf',4:'#c6d8bd',6:'#d9c79b',8:'#dfbd87'}
def points(p,xy):return ' '.join(','.join(str(round(v,3)) for v in xy(a)) for a in p)
def text(p,t,xy,size=11,color='#294c54'):
 x,y=xy(p);return f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}" fill="{color}" paint-order="stroke" stroke="#f8f1de" stroke-width="2">{html.escape(t)}</text>'
def line(a,b,xy,style):return f'<polyline points="{points([a,b],xy)}" fill="none" {style}/>'
def wrap(s,x,y,n=48,size=14):
 import textwrap
 return ''.join(f'<text x="{x}" y="{y+i*(size+8)}" font-size="{size}" fill="#294b54">{html.escape(t)}</text>' for i,t in enumerate(textwrap.wrap(s,n)))
serial=0
def plan(level=None,bounds=(-3,-2,138,116),box=(45,105,1060,890),poses=[],names=True):
 global serial
 serial+=1;x0,y0,x1,y1=bounds;bx,by,bw,bh=box;s=min(bw/(x1-x0),bh/(y1-y0));xy=lambda p:(bx+(p[0]-x0)*s,by+(y1-p[1])*s)
 o=f'<defs><clipPath id="clip{serial}"><rect x="{bx}" y="{by}" width="{bw}" height="{bh}"/></clipPath></defs><g clip-path="url(#clip{serial})"><rect x="{bx}" y="{by}" width="{bw}" height="{bh}" fill="#96c8cc"/>'
 for p,c in [([[-2,0],[136,0],[138,108],[112,116],[79,108],[65,110],[35,110],[5,106],[-2,65]],'#b8b69d'),([[55,112],[72,110],[75,94],[70,80],[71,68],[72,44],[69,28],[63,27],[57,35],[58,49],[54,67],[53,84]],'#90aaa2')]:o+=f'<polygon points="{points(p,xy)}" fill="{c}"/>'
 for b in d['buildings']:
  if level is None or b['base']<=level<b['eaves']:o+=f'<polygon points="{points(b["p"],xy)}" fill="#4d6870" stroke="#304e58" stroke-width="1.5"/>'
 for h in d['stairVoids']:
  if level is None or h['z']==level:o+=f'<polygon points="{points(h["p"],xy)}" fill="#a9aca3" stroke="#95718d" stroke-dasharray="4 3"/>'
 for f in d['flatFloors']:
  if level is not None and f['z']!=level:continue
  path=' '.join('M'+' L'.join(','.join(map(str,xy(p))) for p in ring)+' Z' for ring in [f['p'],*f['holes']])
  o+=f'<path d="{path}" fill="{colors[f["z"]]}" fill-rule="evenodd" stroke="#667f77" stroke-width=".9"/>'
 for r in d['boundaries']:
  if (level is None or r['z']==level) and r['kind']!='movement interface':o+=line(r['a'],r['b'],xy,f'stroke="{ "#2e4b56" if r["height"]>2 else "#82735c"}" stroke-width="{2.5 if r["height"]>2 else 1.5}"')
 for wall in d['walls']:
  wz=level if level is not None else max([i['z'] for i in d['interiors'] if any(q['interior']==i['id'] and q['building']==wall['building'] for q in d['doors'])]+[next(b['base'] for b in d['buildings'] if b['id']==wall['building'])])
  if not wall['base']<=wz<wall['top']:continue
  a=wall['a'];b=wall['b'];dx=b[0]-a[0];dy=b[1]-a[1];l2=dx*dx+dy*dy;intervals=[]
  for door in d['doors']:
   if door['id'] not in wall['doors'] or door['z']!=wz:continue
   intervals.append(sorted([((q[0]-a[0])*dx+(q[1]-a[1])*dy)/l2 for q in [door['a'],door['b']]]))
  cur=0;segments=[]
  for lo,hi in sorted(intervals):
   if lo>cur:segments.append((cur,lo))
   cur=max(cur,hi)
  if cur<1:segments.append((cur,1))
  for lo,hi in segments:o+=line([a[0]+lo*dx,a[1]+lo*dy],[a[0]+hi*dx,a[1]+hi*dy],xy,'stroke="#294b57" stroke-width="2.4"')

 # Discrete structure is drawn at the actual selected level; upper suspended edges
 # are dashed on lower plans so their preserved passage can be reviewed directly.
 for assembly in d.get('supportAssemblies',[]):
  for member in assembly['members']:
   if level is not None and member['base']<=level<member['top']:
    o+=f'<polygon points="{points(member["p"],xy)}" fill="#725c47" stroke="#4f4134" stroke-width="1.2"/>'
  if level==assembly['lowerZ']:
   for edge in d['boundaries']:
    if edge['id'] in assembly['boundaryIds']:o+=line(edge['a'],edge['b'],xy,'stroke="#807298" stroke-width="1.2" stroke-dasharray="4 3"')
 for st in d['stairs']:
  if level is not None and level not in [st['a'][2],st['b'][2]]:continue
  o+=f'<polygon points="{points(st["p"],xy)}" fill="#f6edd6" stroke="#4e6e75" stroke-width="1.1"/>'
  for i in range(1,10):
   t=i/10;a=[v+(st['p'][3][k]-v)*t for k,v in enumerate(st['p'][0])];b=[v+(st['p'][2][k]-v)*t for k,v in enumerate(st['p'][1])]
   o+=line(a,b,xy,'stroke="#70877d" stroke-width=".8"')
  o+=line(st['a'],st['b'],xy,'stroke="#a16c89" stroke-width="1.6" marker-end="url(#arrow)"')
 for r in d['ramps']:
  if level is None or level in [r['a'][2],r['b'][2]]:o+=f'<polygon points="{points(r["p"],xy)}" fill="#f1e3c1" stroke="#7d7866" stroke-width="1.3"/>'+line(r['a'],r['b'],xy,'stroke="#a16c89" stroke-width="1.6" stroke-dasharray="5 3" marker-end="url(#arrow)"')
 for door in d['doors']:
  if level is None or door['z']==level:o+=line(door['a'],door['b'],xy,f'stroke="#fff8e0" stroke-width="{.6*s}"')
 for w in d['windows']:
  if level is None or w['z']==level:o+=line(w['a'],w['b'],xy,'stroke="#ac5e78" stroke-width="3.5" stroke-dasharray="4 3"')+text([(w['a'][0]+w['b'][0])/2,(w['a'][1]+w['b'][1])/2-1],w['id'],xy,10,'#934d70')
 for q in d['objectiveFootprints']:
  if level is None or q['z']==level:o+=f'<polygon points="{points(q["p"],xy)}" fill="#ba734c" fill-opacity=".25" stroke="#a3613d" stroke-width="2" stroke-dasharray="4 3"/>'
 for ob in d['obstacles']:
  if level is None or ob['z']==level:o+=f'<polygon points="{points(ob["p"],xy)}" fill="{ "#39545f" if ob["height"]>2 else "#aa8261"}" stroke="#6f5342" stroke-width="1"/>'
 if names:
  for b in d['buildings']:
   if (level is None or b['base']<=level<b['eaves']) and b['id'] not in ['M04','M08','M11','M13','M14','M16']:
    c=[sum(p[k] for p in b['p'])/len(b['p']) for k in range(2)];o+=text(c,b['id'],xy,10,'#253e46')
  for i in d['interiors']:
   if level is not None and i['z']!=level:continue
   if level is None and i['id'] in ['I01','I02','I05','I10']:continue
   c=[sum(p[k] for p in i['p'])/len(i['p']) for k in range(2)];o+=text(c,f'{i["id"]} +{i["z"]}',xy,10)
  for id,n,x,y,z in d['places']:
   if id in ['T','CT','A','B'] and (level is None or z==level):o+=text([x,y],f'{id} / {n}',xy,13,'#9b5137')
 for spawn in d.get('spawns',[]):
  if level is None or spawn['z']==level:
   for center in spawn['positions']:
    sx,sy=xy(center);o+=f'<circle cx="{sx}" cy="{sy}" r="{.3*s}" fill="#426e99"/>'
 for p in poses:
  x,y=xy(p['p']);color=p.get('color','#ad4c65');o+=f'<circle cx="{x}" cy="{y}" r="5" fill="{color}" stroke="#fff" stroke-width="1.2"/>'+text([p['p'][0],p['p'][1]+.9],p['id'],xy,12,color)
  if p.get('look'):o+=line(p['p'],p['look'],xy,f'stroke="{color}" stroke-width="1.4" stroke-dasharray="5 3" marker-end="url(#arrow)"')
 return o+'</g>'
def base(w,h,title,sub,body):
 return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#a16c89"/></marker></defs><rect width="{w}" height="{h}" fill="#f8f3e6"/><g font-family="sans-serif"><text x="42" y="43" font-size="26" font-weight="700" fill="#213e47">{html.escape(title)}</text><text x="42" y="74" font-size="15" fill="#385b64">{html.escape(sub)}</text>{body}</g></svg>'
if __name__=='__main__':
 for z in [None,0,2,4,6,8]:
  o=plan(z);yy=130
  for title,body in [('Read actual space','Dark blue: complete opaque building mass. Colored faces: walkable floor at the labeled Z. Gray outlined holes: open stair wells, not floor. Green-gray ravine and tan rock: scenic, inaccessible.'),('Movement / information','Cream breaks D01–D23 are movement openings, each with declared width and headroom. Purple W02/W03 are observation only. Hatched flights and dashed road arrows are explicit level transfers.'),('Shared occupied volumes','Laundry lower undercroft / upper frontage: 0 and +4. Press stair house: +4 and +8. School lower arcade / occupied upper room: +4 and +8, with 3.7 m clear below the upper slab.'),('Boundary contract','Thick edges: walls/screens. Thin tan: guards. Purple dashed on lower plans: suspended upper edges. Stair ends stay open; side guards follow grade. Exact floor, edge and support IDs: layout.json.'),('Review status','L03 developed prediction after R02 interest return; focused School support repair. Original body retained. No AML, collision walk, measured sightline, timing or balance acceptance. R02 and rejected L01 remain as revision evidence.')]:
   o+=f'<text x="1140" y="{yy}" font-size="18" font-weight="700" fill="#2a4c55">{title}</text>'+wrap(body,1140,yy+27,44,14);yy+=171
  o+=wrap('Meters, right-handed Z-up, north +Y. Radius .30 / standing 1.80 / crouch 1.10 / step .30 / slope 42 degrees. The three cross-town commitments remain: shore, middle market crossing and upper civic crossing.',48,1040,181,14)
  name='overview' if z is None else f'floor-{z}'
  (out/f'{name}.svg').write_text(base(1540,1120,'GALINI / L03 / '+('Contour town developed layout' if z is None else f'aligned floor +{z} m'),'Actual normalized floor boundaries and openings / separate floors share the same origin and scale',o))
 print('Wrote normalized L03 SVG plans.')
