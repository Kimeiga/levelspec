"""Create a separate native-AML comparison with the central level change removed.

Only this local stair, its hatch guards and the hatch are changed. Canonical
Fusion is never overwritten. Run with the same Shapely environment as author.py.
"""
from pathlib import Path
from math import sin,cos,pi
import xml.etree.ElementTree as E
from shapely.geometry import Polygon
from shapely import set_precision
P=Path(__file__).parent
out=P.parent.parent/'generated/fusion/variants/no-central-stair.aml'
r=E.parse(P/'level.aml').getroot()

def arc(radius,start,end,count=100):
    return [(radius*cos((start+(end-start)*i/count)*pi/180),4+radius*sin((start+(end-start)*i/count)*pi/180)) for i in range(count+1)]
def points(ps):return '; '.join(' '.join(f'{v:.6f}' for v in p) for p in ps)
def loop(node):return [[float(v) for v in row.split()] for row in node.get('points').split(';')]
mask=Polygon(arc(6.5,218,316)+arc(3.8,316,218))
profiles={p.get('id'):p for p in r.findall('profile')}
equator=profiles['vessel-equator-footprint'];equator.set('points',points(arc(8.8,0,360,144)[:-1]))
for h in list(equator):equator.remove(h)
E.SubElement(equator,'hole',{'points':points(arc(4.1,360,0,144)[:-1])})
for parent in list(r.iter()):
    for child in list(parent):
        id=child.get('id','')
        if id in ['central-curved-stair','central-curved-stair-left','central-curved-stair-right','central-curve']:
            parent.remove(child)
        elif child.tag=='extrusion' and id.startswith('floor-edge-0-'):
            original=profiles[child.get('profile')];shape=Polygon(loop(original),[loop(h) for h in original.findall('hole')])
            if not shape.intersects(mask):continue
            remaining=set_precision(shape.difference(mask),.001).simplify(.002)
            parts=[] if remaining.is_empty else [remaining] if remaining.geom_type=='Polygon' else list(remaining.geoms)
            parent.remove(child)
            for i,part in enumerate(parts):
                if part.area<.001:continue
                pid=f'{id}-variant-profile-{i}'
                p=E.SubElement(r,'profile',{'id':pid,'points':points(list(part.exterior.coords)[:-1])})
                for h in part.interiors:E.SubElement(p,'hole',{'points':points(list(h.coords)[:-1])})
                attrs=dict(child.attrib);attrs.update(id=f'{id}-variant-{i}',profile=pid);E.SubElement(parent,'extrusion',attrs)
r.set('name','Fusion — central stair absent comparison')
E.indent(r,space='  ');out.parent.mkdir(parents=True,exist_ok=True)
E.ElementTree(r).write(out,encoding='utf-8',xml_declaration=True)
print(out)
