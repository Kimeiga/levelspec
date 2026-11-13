"""Draw the two corrected nominated views from exact proposed geometry."""
from pathlib import Path
import json, html
from shapely.geometry import Polygon, LineString, Point, box

P=Path(__file__).parent
d=json.loads((P/'layout-data.json').read_text())
old=json.loads((P.parent/'layout-l01/layout-data.json').read_text())
physical=['rooms','links','stairs','openings','partitions','obstacles','buildings','floors','boundaryWalls','guards','context','plinths','anchors','journeys']
assert all(d[k]==old[k] for k in physical)
vol=[]
for w in d['boundaryWalls']+d['partitions']:
    vol.append((w['id'],LineString([w['a'],w['b']]).buffer(w['thickness']/2,cap_style=2),w['z'],w['top']))
for o in d['obstacles']:
    vol.append((o['id'],Polygon(o['polygon']),o['z'],o['top']))
def hits(a,b):
    line=LineString([a[:2],b[:2]]); result=[]
    for name,poly,low,high in vol:
        cut=line.intersection(poly)
        if cut.is_empty: continue
        for part in (list(cut.geoms) if hasattr(cut,'geoms') else [cut]):
            z=[a[2]+line.project(Point(c))/line.length*(b[2]-a[2]) for c in part.coords]
            if max(z)>low+1e-8 and min(z)<high-1e-8:
                result.append(name);break
    return result
views={v['id']:v for v in d['views']}; rows=[]
for name in ['B-SUPPORT','SIGN-UP','SIGN-DOWN']:
    v=views[name];a=[*v['feet'][:2],v['feet'][2]+1.86];b=[*v['targetFeet'][:2],v['targetFeet'][2]+1.86]
    rows.append(dict(id=name,a=a,b=b,hits=hits(a,b)))
for name,b in [('School',[40,35.5,5.06]),('East',[64,41,5.06]),('plant',[57,35,5.06])]:
    a=[44.5,39.7,5.06];rows.append(dict(id='west-mouth-to-'+name,a=a,b=b,hits=hits(a,b)))
assert all(not r['hits'] for r in rows[:3])
(P/'focused-checks.json').write_text(json.dumps(dict(scope='Finite plan-wall/obstacle intersections; not compiled mesh visibility',physicalGeometryMatchesL01=True,rays=rows),indent=2)+'\n')

out=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 860"><rect width="1500" height="860" fill="#f7f3e9"/><g font-family="Arial" fill="#233d42"><text x="30" y="45" font-size="28" font-weight="bold">NINEFOLD / L02 · CORRECTED SUPPORT AND SIGN VIEWS</text><text x="30" y="78" font-size="17">Exact planned geometry; unchanged walls, windows, stairs and body. Finite optical predictions, not compiled acceptance.</text>']
def text(x,y,s,size=15):out.append(f'<text x="{x}" y="{y}" font-size="{size}">{html.escape(s)}</text>')
def path(points,stroke,width=2,dash=''):
    out.append('<path d="M'+' L'.join(f'{x},{y}' for x,y in points)+f'" fill="none" stroke="{stroke}" stroke-width="{width}" stroke-dasharray="{dash}"/>')
def xy(x,y):return 45+(x-33)*18,630-(y-29)*18
crop=box(33,29,69,55.5)
for name,poly,low,high in vol:
    if high<=3.2 or low>=5.2:continue
    cut=poly.intersection(crop)
    if cut.is_empty:continue
    for part in (list(cut.geoms) if hasattr(cut,'geoms') else [cut]):
        if part.geom_type!='Polygon':continue
        points=' '.join(f'{x},{y}' for x,y in [xy(*c) for c in part.exterior.coords])
        out.append(f'<polygon points="{points}" fill="{"#c69259" if high<=4.5 else "#6b7d79"}"/>')
text(45,120,'B / west-mouth commitment',22)
for r in rows:
    if r['id'].startswith('SIGN'):continue
    a,b=xy(*r['a'][:2]),xy(*r['b'][:2]);color='#b96543' if r['hits'] else '#16859a'
    path([a,b],color,2.5,'5 3' if r['hits'] else '')
    out.append(f'<circle cx="{b[0]}" cy="{b[1]}" r="5" fill="{color}"/>')
    label=r['id'].replace('west-mouth-to-','').replace('B-SUPPORT','aisle')
    text(b[0]+8,b[1]-9,label)
x,y=xy(44.5,39.7);out.append(f'<circle cx="{x}" cy="{y}" r="6" fill="#b64d37"/>');text(x-100,y+25,'support 44.5,39.7')
text(45,677,'Aisle and both opposing eye rays are open; PRESS blocks plant.',15)
text(45,705,'This is exposed support with an attention cost, not a protected all-front hold.',14)
text(45,732,'Plan scale18 px/m; feet+3.2, standing eyes+5.06.',14)

def sx(x):return 815+(x-75)*75
def sy(z):return 630-z*65
def rect(x1,x2,z1,z2,color):out.append(f'<rect x="{sx(x1)}" y="{sy(z2)}" width="{(x2-x1)*75}" height="{(z2-z1)*65}" fill="{color}"/>')
text(815,120,'Sign / finite sill section y52',22)
rect(75,79.85,-.24,0,'#528e80');rect(80.15,83,2.96,3.2,'#528e80')
rect(79.85,80.15,3.2,4.35,'#35433e');rect(79.85,80.15,5.75,6.65,'#35433e')
rect(75.75,76.25,0,2,'#aec8cc');rect(80.5,81,3.2,5.2,'#aec8cc')
path([(sx(80.75),sy(5.06)),(sx(76),sy(1.86))],'#16859a',3)
path([(sx(81),sy(5.06)),(sx(76),sy(1.86))],'#b96543',2,'5 4')
path([(sx(80.75),sy(4.223)),(sx(76),sy(1.86))],'#a87751',1,'2 4')
text(815,677,'New upper x80.75: ray z4.454 at lower sill face; sill z4.35.',15)
text(815,705,'Old upper x81: ray z4.324, blocked. Crouched upper eye stays below sill.',14)
text(815,732,'Section X75 px/m, Z65 px/m; all coordinates in meters.',14)
text(sx(76)-20,sy(0)+25,'x76');text(sx(80.75)-22,sy(3.2)+25,'x80.75')
text(30,808,'Required return: confirm the corrected positions and exposure cost. Native routes, mesh apertures, offsets and actual opposing views remain for the compiled gate.',15)
out.append('</g></svg>');(P/'focused-views-l02.svg').write_text(''.join(out))
