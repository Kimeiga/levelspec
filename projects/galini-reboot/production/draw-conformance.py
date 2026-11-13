from pathlib import Path
import json,sys,xml.etree.ElementTree as ET
sys.path.insert(0,str(Path('generated/galini-reboot-geometry-tools').resolve()))
from shapely.geometry import Polygon,box
P=Path('projects/galini-reboot');d=json.loads((P/'planning/l03/layout.json').read_text());xml=ET.parse(P/'level.aml').getroot();profiles={p.get('id'):p for p in xml.findall('profile')};native={}
def points(t):return [[float(n) for n in p.split()] for p in t.split(';')]
for s in xml.iter('slab'):
 if s.get('id','').startswith('F'):
  p=profiles[s.get('profile')];native[s.get('id')]=Polygon(points(p.get('points')),[points(h.get('points')) for h in p.findall('hole')])
patches=json.loads((P/'production/margin-repair-proposal.json').read_text());panels=[('Laundry ground / open return',0,(5,37,29,60)),('School lower arcade / north shoulder',4,(90,64,128,92)),('Chapel +6 porch / solid stair side',6,(6,69,22,85)),('Taverna facade / full-thickness doors',4,(76,49,97,66)),('Upper School / Bell well / edge copings',8,(91,64,128,92)),('CT gatehouse / attached perimeter coping',8,(116,100,132,114))]
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1390"><rect width="100%" height="100%" fill="#fbf9f0"/><text x="35" y="32" font-family="sans-serif" font-size="24">C11 native versus frozen L03 — precise local plan overlays</text>']
for i,(title,z,bounds) in enumerate(panels):
 bx=35+(i%2)*890;by=70+(i//2)*410;x0,y0,x1,y1=bounds;scale=min(780/(x1-x0),320/(y1-y0));X=lambda x:bx+40+(x-x0)*scale;Y=lambda y:by+365-(y-y0)*scale;clip=box(*bounds)
 svg.append(f'<rect x="{bx}" y="{by}" width="850" height="390" fill="#fffdf7" stroke="#b9b8ad"/><text x="{bx+14}" y="{by+25}" font-family="sans-serif" font-size="19">{title} · Z{z}</text>')
 def draw(g,fill,stroke,width=1):
  g=g.intersection(clip)
  if g.is_empty:return
  gg=[g] if g.geom_type=='Polygon' else [q for q in getattr(g,'geoms',[]) if q.geom_type=='Polygon']
  for q in gg:
   path=' '.join('M '+' L '.join(f'{X(x):.2f} {Y(y):.2f}' for x,y in r.coords)+' Z' for r in [q.exterior,*q.interiors]);svg.append(f'<path d="{path}" fill="{fill}" fill-rule="evenodd" stroke="{stroke}" stroke-width="{width}"/>')
 for f in d['flatFloors']:
  if f['z']!=z:continue
  old=Polygon(f['p'],f['holes']);new=native[f['id']];draw(old,'#e3e9e7','#497d86',2);draw(new,'#d9c99d','#6d796e',.8);draw(old.difference(new),'#c96356','#9c4035',1)
 for b in d['buildings']:draw(Polygon(b['p']),'none','#8d8a81',1)
 for s in d['stairs']:
  if min(s['a'][2],s['b'][2])<=z<=max(s['a'][2],s['b'][2]):draw(Polygon(s['p']),'none','#7b62a0',2)
 for p in patches:
  if p['base']<=z<=p['top']:draw(Polygon(p['p']),'#a886af','#6c4774',1)
 for door in d['doors']:
  if door['z']!=z:continue
  a,b=door['a'],door['b']
  if not clip.intersects(Polygon([[a[0]-.01,a[1]-.01],[b[0]+.01,a[1]-.01],[b[0]+.01,b[1]+.01],[a[0]-.01,b[1]+.01]])):continue
  svg.append(f'<line x1="{X(a[0])}" y1="{Y(a[1])}" x2="{X(b[0])}" y2="{Y(b[1])}" stroke="#28825d" stroke-width="4"/><text x="{X((a[0]+b[0])/2)+5}" y="{Y((a[1]+b[1])/2)-5}" font-family="sans-serif" font-size="14">{door["id"]}</text>')
 svg.append(f'<text x="{bx+14}" y="{by+382}" font-family="sans-serif" font-size="12">X{x0}–{x1}, Y{y0}–{y1} m. Native wall mass remains; green lines are declared door widths.</text>')
svg.append('<text x="35" y="1330" font-family="sans-serif" font-size="16">Gold: current native walking slab. Blue edge: frozen L03. Red: removed non-route floor remnant. Purple fill: attached masonry closure.</text><text x="35" y="1356" font-family="sans-serif" font-size="16">Purple line: unchanged flight footprint. All movement apertures retain L03 dimensions; channels now cut duplicate facade fabric.</text><text x="35" y="1380" font-family="sans-serif" font-size="14">See repairs-c01.json for exact bounds/alignment, native-sections-c11 for actual physical sections, and final source for roofs/arches/guard webs.</text></svg>');(P/'production/conformance-c11.svg').write_text(''.join(svg))
