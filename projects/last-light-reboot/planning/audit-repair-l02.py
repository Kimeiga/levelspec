from pathlib import Path
import sys,json,math,importlib.util
sys.path.insert(0,str(Path('generated/last-light-reboot-tools').resolve()))
from shapely.geometry import Polygon,Point,LineString,box
from shapely.ops import unary_union
R=Path(__file__).parent
spec=importlib.util.spec_from_file_location('frontier',R/'compare-frontiers-l02.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
l02=json.loads((R/'developed-l02.json').read_text())
for o in l02['objects']:o['_g']=unary_union([Polygon(p['outer'],p['holes']) for p in o['footprint']])
lookup={o['id']:o for o in l02['objects']}
seamresults=[]
for seam in l02['roof_seams']:
 pieces=[o for o in l02['objects'] if o.get('assembly')==seam['id']]
 covered=unary_union([o['_g'] for o in pieces if o['z0']<=seam['z0'] and o['z1']>=seam['z1']])
 missing=LineString([seam['a'],seam['b']]).difference(covered).length
 seamresults.append(dict(**seam,uncovered_centerline_m=missing,objects=[o['id'] for o in pieces]))
probes=[]
for side,positions,portals in [('west',{'W-REG':[26,30],'W-PRESS':[36,16],'W-DEEP':[26,16]},['P-WP1','P-WS1']),('east',{'E-REG':[94,74],'E-PRESS':[108,64],'E-DEEP':[108,74]},['P-EP1','P-ES1'])]:
 for name,p in positions.items():
  for stance,eye in [('standing',1.86),('crouched-eye',1.0695)]:
   counts=[sum(not m.ray(p+[eye],q,l02['objects']) for q in m.samples(pid,eye)) for pid in portals]
   probes.append(dict(side=side,station=name,feet=p+[0],stance=stance,portal_ids=portals,visible_samples=counts,total_per_portal=5))
counterpairs=[('W-public-inside',[21,16,0],[26,16,0]),('W-service-inside',[15,27,0],[26,16,0]),('E-public-return',[101,80,0],[108,74,0]),('E-service-inside',[108,78,0],[108,74,0])]
responses=[]
for id,a,b in counterpairs:
 eyea=[a[0],a[1],a[2]+1.86];eyeb=[b[0],b[1],b[2]+1.86]
 body=Point(a[:2]).buffer(.4)
 blockers=[o['id'] for o in l02['objects'] if o['z0']<a[2]+2 and o['z1']>a[2]+.3 and o['_g'].intersection(body).area>.001]
 responses.append(dict(id=id,feet=a,intruder=b,standing_eye_visible=not m.ray(eyea,eyeb,l02['objects']),body_footprint_blockers=blockers))
result=dict(local_counter_positions=responses,revision='L02',scope='roof seam centerlines and named local frontier probes; no compiled or whole-area acceptance',roof_seams=seamresults,frontier_probes=probes)
(R/'repair-audit-l02.json').write_text(json.dumps(result,indent=2)+'\n')
print('All roof seam centerlines covered:',all(x['uncovered_centerline_m']<1e-9 for x in seamresults))
for p in probes:print(p['station'],p['stance'],p['visible_samples'])
# Four focused plan panels. Actual ground-level solid prisms and five frontier rays.
from xml.sax.saxutils import escape
out=['<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1530" viewBox="0 0 1600 1530"><rect width="1600" height="1530" fill="#f7f2e8"/><style>text{font-family:Arial;fill:#203c42}.title{font-size:27px;font-weight:bold}.h{font-size:20px;font-weight:bold}.n{font-size:13px}</style><text x="35" y="42" class="title">LAST LIGHT / L02 · LOCAL DEPARTURE COMPARISON</text><text x="35" y="72" class="n">Ground plan. Red ray = named eye ray open; green dashed = intercepted. Source outlines are actual L01/L02 prism footprints.</text>']
panels=[('West L01: both frontiers from W-REG',m.base['objects'],[0,44,4,44],[26,30],['P-WP1','P-WS1'],None),('Rejected west outer return: seals outside switch',m.base['objects']+m.variants['V1-outer-service-return'],[0,44,4,44],[26,30],['P-WP1','P-WS1'],'W-OUT'),('Selected west: public route uses east aisle',l02['objects'],[0,44,4,44],[26,30],['P-WP1','P-WS1'],'SW-VR-p0'),('Selected east: service return at stock edge',l02['objects'],[80,118,60,100],[94,74],['P-EP1','P-ES1'],'SE-VR-p0')]
for i,(title,obs,bounds,witness,pids,newid) in enumerate(panels):
 col=i%2;row=i//2;left=45+col*790;top=140+row*665;scale=14
 xy=lambda p:(left+(p[0]-bounds[0])*scale,top+(bounds[3]-p[1])*scale)
 out.append(f'<text x="{left}" y="{top-20}" class="h">{escape(title)}</text>')
 clip=box(bounds[0],bounds[2],bounds[1],bounds[3])
 for o in obs:
  if o['kind'] in ['roof','glazing'] or o['z0']>=2 or o['z1']<=0:continue
  g=o['_g'].intersection(clip);parts=[g] if g.geom_type=='Polygon' else [q for q in getattr(g,'geoms',[]) if q.geom_type=='Polygon']
  for p in parts:
   pts=' '.join(f'{xy(q)[0]:.2f},{xy(q)[1]:.2f}' for q in p.exterior.coords)
   out.append(f'<polygon points="{pts}" fill="{"#da7c4c" if o["id"]==newid else "#62777a"}"/>')
 for pid in pids:
  portal=m.portals[pid];a=xy(portal['a']);b=xy(portal['b']);out.append(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="#2f7b9b" stroke-width="4"/>')
  for q in m.samples(pid,1.86):
   hit=m.ray(witness+[1.86],q,obs);a=xy(witness);b=xy(q)
   out.append(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{"#548c6a" if hit else "#b34c46"}" stroke-width="1.6" stroke-dasharray="{"5 4" if hit else ""}"/>')
  c=xy([(portal['a'][0]+portal['b'][0])/2,(portal['a'][1]+portal['b'][1])/2]);out.append(f'<text x="{c[0]}" y="{c[1]-8}" text-anchor="middle" class="n">{pid}</text>')
 a=xy(witness);out.append(f'<circle cx="{a[0]}" cy="{a[1]}" r="6" fill="#b34c46"/><text x="{a[0]+10}" y="{a[1]-8}" class="n">{witness}</text>')
 if i==2:
  for path,color in [([[26,16],[36,16],[36,30],[35,30]],'#c78a34'),([[26,30],[22,30],[12,30]],'#4677a4')]:
   pts=' '.join(f'{xy(q)[0]},{xy(q)[1]}' for q in path);out.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="4"/>')
 if i==3:
  path=[[94,74],[93,70],[94,64],[108,64],[108,74]];pts=' '.join(f'{xy(q)[0]},{xy(q)[1]}' for q in path);out.append(f'<polyline points="{pts}" fill="none" stroke="#4677a4" stroke-width="4"/>')
 out.append(f'<text x="{left}" y="{top+590}" class="n">XY meters: x{bounds[0]}–{bounds[1]}, y{bounds[2]}–{bounds[3]}. Body radius .40 / height2.0.</text>')
out.append('<text x="35" y="1490" class="n">Orange = retained repair / public detour. Blue = retained outside switch. Existing internal spawn returns remain unchanged.</text></svg>')
(R/'repair-comparison-l02.svg').write_text('\n'.join(out))
