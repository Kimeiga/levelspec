#!/usr/bin/env python3
"""Authored CS2 Dust II blockout. The radar registers the plan, not its geometry.
Requires Pillow and Shapely. Dimensions are explicit blockout estimates; see
reference/dust2/README.md. Curved flights emit native SVGX Bezier boundaries.
"""
from pathlib import Path
import hashlib,json,math,xml.etree.ElementTree as ET
from PIL import Image
from shapely.geometry import Polygon,box,LineString,Point
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
REFERENCE=ROOT/'reference/dust2/user-radar.png'
SCALE=.1
# Deliberate corners omit raster chips, door-leaf pixels and decorative notches.
# Coordinates remain in the supplied radar's registration for overlay review.
OUTLINE=[(78,16),(135,16),(135,80),(218,80),(256,101),(256,118),(322,118),(322,150),(490,150),(490,211),(555,211),(574,192),(574,154),(618,154),(618,102),(792,102),(792,35),(925,35),(925,102),(932,102),(932,215),(968,215),(973,270),(973,318),(953,318),(953,329),(942,329),(928,356),(925,496),(968,500),(968,669),(927,669),(927,698),(848,698),(848,691),(776,691),(776,573),(762,560),(730,560),(730,568),(738,568),(738,829),(685,829),(685,824),(650,824),(650,877),(667,877),(667,965),(607,965),(607,1003),(489,1003),(487,980),(152,980),(150,974),(56,974),(56,880),(90,846),(90,755),(94,755),(94,595),(124,595),(124,575),(169,575),(169,518),(141,518),(141,504),(66,504),(66,414),(97,414),(97,328),(66,328),(66,183),(78,183)]
def bezier(a,b,c,d,n=48):
 return [tuple((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k] for k in (0,1)) for t in [i/n for i in range(n+1)]]
# Quarter-turn winders, upper landing west and lower landing north. The inner
# radius prevents pinched zero-width treads at the inside of the bend.
outer_curve=[(282,500),(315.137,500),(342,473.137),(342,440)]
inner_curve=[(312,440),(312,456.569),(298.569,470),(282,470)]
outer_points=bezier(*outer_curve);inner_points=bezier(*inner_curve)
HOLES=[
 [(348,876),(348,770),(300,770),(300,790),(260,790),(245,775),(245,742),(257,730),(280,730),(269,595),(246,595),(246,575),(201,575),(201,518),(213,518),(213,503),*outer_points,(440,440),(440,477),(438,477),(438,536),(446,536),(446,568),(416,568),(416,617),(393,617),(405,692),(445,692),(445,876)],
 [(282,385),(438,385),(438,396),(446,396),(446,362),(427,360),(427,265),(394,265),(394,272),(327,272),(327,265),(280,265),(267,255),(254,266),(254,305),(210,350),(198,372),(170,372),(170,328),(130,328),(130,414),(185,414),(185,442),(212,444),(282,444)],
 [(680,274),(762,274),(762,282),(841,282),(841,456),(723,456),(672,467),(672,556),(688,564),(679,570),(679,664),(688,668),(688,674),(670,674),(670,623),(548,623),(535,610),(535,448),(548,435),(680,435)],
 [(618,274),(618,384),(580,384),(580,372),(532,372),(532,384),(490,384),(490,286),(563,286),(584,274)],
 [(479,684),(491,672),(575,672),(589,686),(589,790),(582,790),(582,827),(568,840),(550,840),(550,833),(491,833),(481,820)],
]
footprint=Polygon(OUTLINE,HOLES)
assert footprint.is_valid, 'Authored footprint must be a valid polygon'
remaining=footprint;regions=[]
def clamp(t):return max(0,min(1,t))
def polygons(shape):
 if shape.is_empty:return []
 if shape.geom_type=='Polygon':return [shape]
 return [p for child in getattr(shape,'geoms',[]) for p in polygons(child)]
def region(name,label,shape,height,material='ground',stairs=None,layer='ground',ceiling=None,rise=.18):
 global remaining
 part=remaining.intersection(shape);remaining=remaining.difference(shape)
 polys=polygons(part)
 for i,p in enumerate(polys):
  if p.is_empty or p.area<1:continue
  if p.geom_type!='Polygon':continue
  regions.append(dict(id=name+('.'+str(i) if i else ''),area=name,label=label,poly=p,height=height,material=material,stairs=stairs,layer=layer,ceiling=ceiling,rise=rise))

# Goose is above A Default. The street climbs north from Cross into Goose;
# the shallow flight then descends south onto the level bomb platform.
# Three 18 cm risers remain blockout estimates, not surveyed CS2 dimensions.
def long_height(y):return 2+2.54*clamp((220-y)/110)
region('a_north_stairs','Goose to A · shallow descending steps',box(792,110,848,132),lambda x,y:4+.54*clamp((132-y)/22),'stone',('y',132,110))
region('a_back_platform','Goose · upper landing',box(792,0,1000,110),lambda x,y:4.54,'site')
region('a_goose_side','Long A · upper road to Goose',box(848,110,1000,220),lambda x,y:long_height(y),'ground')
region('a_short_site_connection','A Short · level site connection',box(618,100,681,154),lambda x,y:4,'stone',layer='short')
# The platform ends at the traced retaining wall, not the lower CT corridor.
region('a_site','Bombsite A',Polygon([(681,100),(1000,100),(1000,220),(848,220),(848,208),(797,208),(797,187),(681,187)]),lambda x,y:4,'site')
# Raise the connected plateau, preserving Catwalk/Long at the same elevation.
# Twelve Short risers fit the reference rhythm; CT retains 3.8 m clearance.
region('a_short','A Short · bridge',box(619,154,681,335),lambda x,y:4,'stone',layer='short')
region('a_short_stairs','A Short stairs',box(619,335,681,375),lambda x,y:2+2*clamp((375-y)/40),'stone',('y',375,335),layer='short')
region('catwalk_approach','Catwalk · approach',box(504,433,619,624),lambda x,y:2,'stone',layer='short')
region('catwalk','Catwalk',box(504,375,681,445),lambda x,y:2,'stone',layer='short')
# CT leaves the covered bridge eastward, with stairs along the south/right side.
# The flight ends at a level landing before a gentle transition into Long's road.
# Upper/lower source edges stay separate; the lower route must remain open.
region('ct_a_stairs','CT to Cross · eastbound side stairs',box(681,260,762,274),lambda x,y:2*clamp((x-681)/81),'stone',('x',681,762))
region('ct_a_ramp','CT to Cross · eastbound ramp',box(681,187,762,260),lambda x,y:2*clamp((x-681)/81),'stone')
region('ct_a_landing','CT to Cross · level landing',box(762,187,780,282),lambda x,y:2,'stone')
region('ct_cross_transition','Cross · merge with Long A',box(780,187,848,282),lambda x,y:2+clamp((x-780)/68)*(long_height(y)-2),'ground')
# Broad natural inclines stay floor surfaces. All flanking walls follow the
# overall height profile; the long road remains continuous toward A.
region('a_ramp','Long A · Cross approach',box(681,220,1000,365),lambda x,y:long_height(y),'ground')
region('pit_stairs','Pit Plat · ascending south steps',box(927,560,1000,592),lambda x,y:2+1.2*clamp((y-560)/32),'stone',('y',560,592),rise=.15)
region('pit_platform','Pit Plat · raised side platform',box(927,592,1000,720),lambda x,y:3.2,'stone')
region('pit','Pit · central depression',box(848,650,927,720),lambda x,y:.2,'stone')
region('pit_ramp','Pit · descending approach',box(848,560,927,650),lambda x,y:.2+1.8*clamp((650-y)/90),'ground')
region('long_a','Long A',box(671,365,1000,560),lambda x,y:2)
region('long_corner','Long doors · corner',box(738,560,926,720),lambda x,y:2)
region('long_doors','Long doors',box(675,560,738,690),lambda x,y:2,'stone')
region('outside_long','Outside Long',box(580,690,1000,835),lambda x,y:2)
# The spawn street falls east/right on the radar, not north into Mid/Long.
# Keep the high spawn point and western tunnel approach. The eastern apron
# starts at the actual divider (y=876), avoiding a detached retaining strip.
# Ramp endpoints/elevations are explicit blockout estimates from the reference.
region('t_long_ramp','T side · level Long approach',box(580,835,1000,876),lambda x,y:2)
region('t_spawn','T spawn · upper western landing',unary_union([box(0,890,490,1100),box(350,876,490,890)]),lambda x,y:3,'spawn')
region('t_spawn_ramp','T spawn · east-descending ramp',box(490,876,607,1100),lambda x,y:3-clamp((x-490)/117),'spawn')
region('t_spawn_low','T spawn · lower eastern landing',box(607,876,1000,1100),lambda x,y:2,'spawn')
region('t_platform','T Plat',box(159,765,350,890),lambda x,y:3,'spawn')
region('outside_tunnels_ramp','T ramp · down to Outside Tunnels',box(0,765,159,890),lambda x,y:1.46+1.54*clamp((y-765)/115),'spawn')
region('outside_tunnels','Outside Tunnels · lower approach',box(0,620,300,765),lambda x,y:1.46,'ground')
region('tunnel_entry_stairs','T-side tunnel entrance steps',box(90,602,282,620),lambda x,y:1.46+.54*clamp((620-y)/18),'stone',('y',620,602),ceiling=6.5)
flight_poly=Polygon([outer_curve[-1],*inner_points,*outer_points])
region('lower_tunnels_stairs','Tunnel stairs · curved bend',flight_poly,lambda x,y:2*clamp(math.atan2(max(0,y-440),max(0,x-282))/(math.pi/2)),'tunnel',('curve',),ceiling=6.5)
region('tunnel_center_platform','Tunnel bend · flat central platform',Polygon([(282,440),*inner_points]),lambda x,y:2,'tunnel',ceiling=6.5)
region('upper_tunnels','Upper tunnels',box(0,414,282,602),lambda x,y:2,'tunnel',ceiling=6.5)
region('lower_tunnels','Lower tunnels · level hall to Mid',box(282,380,446,440),lambda x,y:0,'tunnel',ceiling=4.2)
region('b_exit_stairs','B courtyard to tunnel · ascending doorway steps',box(97,328,130,346),lambda x,y:1.46+.54*clamp((y-328)/18),'stone',('y',328,346),ceiling=6.5)
region('b_tunnel','B tunnel entrance',box(0,328,170,414),lambda x,y:2,'tunnel',ceiling=6.5)
region('b_site','Bombsite B',box(0,0,267,328),lambda x,y:1.46,'site')
# Finish the west/east incline before CT Mid. Both sides of the old Y328 join
# now share Z=0 rather than ending a ramp against a flat patch with a .52 m lip.
region('b_approach','Mid to B',box(267,0,444,328),lambda x,y:1.46*(1-clamp((x-267)/177)))
region('ct_mid','CT mid',box(444,150,619,385),lambda x,y:0)
region('lower_mid','Lower Mid · level tunnel exit',box(420,385,504,445),lambda x,y:0)
region('mid_low_landing','Lower Mid · ramp landing',box(420,445,504,485),lambda x,y:0)
region('mid_stairs','Mid · Catwalk-side stair strip',box(490,485,504,545),lambda x,y:2*clamp((y-485)/60),'stone',('y',485,545),rise=.125)
region('mid','Middle · central incline',box(420,485,504,545),lambda x,y:2*clamp((y-485)/60))
region('mid_upper_landing','Top Mid · ramp landing',box(420,545,504,624),lambda x,y:2)
region('top_mid','Top mid',box(350,624,580,835),lambda x,y:2)
region('t_mid_ramp','T side · level Mid approach',box(350,835,580,876),lambda x,y:2)
# Any remaining pieces are named explicitly and use the nearest authored surface
# only as a first-pass placement; the report exposes every region for review.
if not remaining.is_empty:
 for i,p in enumerate(polygons(remaining)):
  if p.geom_type!='Polygon' or p.area<1:continue
  nearest=min(regions,key=lambda r:r['poly'].distance(p.representative_point()));z=nearest['height'](p.centroid.x,p.centroid.y)
  regions.append(dict(id=f'connector.{i}',area=nearest['area'],label=nearest['label']+' · boundary extension',poly=p,height=nearest['height'],material='ground',stairs=None,layer='ground'))
# Ground route below the A-short bridge. It overlaps XY intentionally, on its
# own layer; the bridge does not cut or cap this floor.
under=box(619,154,681,274).intersection(footprint)
regions.append(dict(id='ct_underpass',area='ct_underpass',label='CT spawn · under A Short',poly=under,height=lambda x,y:0,material='ground',stairs=None,layer='underpass'))

# Node all boundaries before allocating edge IDs, so T-junctions refer to the
# same exact vertices and shared edges. Different elevations retain separate IDs.
coords=set()
for r in regions:
 for ring in [r['poly'].exterior,*r['poly'].interiors]:
  coords.update((round(x,3),round(y,3)) for x,y in list(ring.coords)[:-1])
# A continuous street can rise through the height of its neighboring terrace.
# Node the equality point so each explicit retaining seam has an unambiguous
# lower/upper side instead of swapping floor order midway along one edge.
for i,r in enumerate(regions):
 for other in regions[i+1:]:
  shared=r['poly'].boundary.intersection(other['poly'].boundary)
  for line in shared.geoms if hasattr(shared,'geoms') else [shared]:
   if line.geom_type!='LineString':continue
   points=list(line.coords)
   for a,b in zip(points,points[1:]):
    def difference(t):
     x=a[0]+(b[0]-a[0])*t;y=a[1]+(b[1]-a[1])*t
     return r['height'](x,y)-other['height'](x,y)
    first,last=difference(0),difference(1)
    if first*last>=-1e-10:continue
    low,high=0.,1.
    for _ in range(40):
     mid=(low+high)/2
     if difference(mid)*first>0:low=mid
     else:high=mid
    t=(low+high)/2
    coords.add((round(a[0]+(b[0]-a[0])*t,3),round(a[1]+(b[1]-a[1])*t,3)))
region_coords=set(coords)
wall_reference=json.loads((ROOT/'reference/dust2/walls.json').read_text())
def wall_base_region(r,wall):
 return r['id'] in wall.get('baseFloors',[]) or r['area'] in wall.get('baseFloors',[])
for wall in wall_reference['walls']:
 coords.update(tuple(p) for p in wall['points'])
 for a,b in zip(wall['points'],wall['points'][1:]):
  line=LineString([a,b])
  for r in regions:
   if r['layer']!=wall.get('layer','ground') and not wall_base_region(r,wall):continue
   hit=line.intersection(r['poly'].boundary)
   for p in hit.geoms if hasattr(hit,'geoms') else [hit]:
    if p.geom_type=='Point':coords.add((round(p.x,3),round(p.y,3)))
# Preserve complete stair landings on both adjoining floor loops. Wall-only
# contacts still split the wall height profile, but must not redefine a flight's
# width. Other wall/floor junctions remain noded explicitly.
def wall_only_landing_point(p):
 if p in region_coords:return False
 for r in regions:
  if not r['stairs'] or r['stairs']==('curve',):continue
  axis,lower,upper=r['stairs'];k=0 if axis=='x' else 1
  if any(abs(p[k]-z)<.002 for z in [lower,upper]) and r['poly'].boundary.distance(Point(*p))<.002:return True
 return False
floor_coords={p for p in coords if not wall_only_landing_point(p)}
def segment_coords(a,b,nodes=None):
 dx,dy=b[0]-a[0],b[1]-a[1];length2=dx*dx+dy*dy
 candidates=[(0,(round(a[0],3),round(a[1],3)))]
 for p in coords if nodes is None else nodes:
  t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length2
  if .002<t*math.sqrt(length2)<math.sqrt(length2)-.002 and abs((p[0]-a[0])*dy-(p[1]-a[1])*dx)/math.sqrt(length2)<.002:candidates.append((t,p))
 return [p for t,p in sorted(candidates)]
def loop_coords(ring):
 points=list(ring.coords)[:-1];out=[]
 for a,b in zip(points,points[1:]+points[:1]):
  # Always retain the original corner. Rounding an endpoint before the t test
  # could move it just outside [0,1), silently replacing an L corner by a diagonal.
  out.extend(segment_coords(a,b,floor_coords))
 return out
root=ET.Element('level',version='2',id='dust2_vector',name='Dust II · CS2 blockout',description='Authored CS2 approximation registered at 0.1 m/pixel. Curved tunnel stairs, distinct entrance flights, estimated elevations; see reference/dust2/README.md.',**{'wall-height':'4.5','wall-thickness':'0.24','floor-thickness':'0.2'})
ET.SubElement(root,'player',radius='.25',height='2',step='.4',slope='42')
ET.SubElement(root,'sky',color='#e6efff',intensity='.55')
for name,color in [('ground','#bda982'),('stone','#c6b992'),('site','#d6bd88'),('spawn','#aeaa80'),('tunnel','#948a72'),('wall','#dbc89d'),('crate','#88714e')]:
 ET.SubElement(root,'material',id='mat.'+name,color=color,roughness='.92',repeat='1',metalness='0')
layers={name:ET.SubElement(root,'layer',id=name,label=label) for name,label in [('ground','Main routes'),('short','A Short bridge'),('underpass','CT underpass')]}
vertices={};edges={};edge_xy={};owners={};region_edges={};seams=[];edge_paths={}
def q(v):return round(v,3)
def vtx(x,y,z):return (q((x-50)*SCALE),q((1005-y)*SCALE),q(z))
def vertex(layer,p):
 key=(layer,*p)
 if key not in vertices:
  ident=f'v{len(vertices)}';vertices[key]=ident;ET.SubElement(layers[layer],'vertex',id=ident,x=str(p[0]),y=str(p[1]),z=str(p[2]))
 return vertices[key]
def edge(layer,a,b,owner):
 va,vb=vertex(layer,a),vertex(layer,b);key=(layer,*sorted([va,vb]));reverse=False
 if key not in edges:
  ident=f'e{len(edges)}';element=ET.SubElement(layers[layer],'edge',id=ident,**{'from':va,'to':vb,'kind':'wall','material':'mat.wall'});edges[key]=(ident,va,vb,element);edge_xy[ident]=(a,b);owners[ident]=[]
 ident,A,B,element=edges[key];owners[ident].append(owner)
 return ('-' if va!=A else '')+ident
for r in regions:
 loops=[]
 authored_loops=[]
 if r['stairs']==('curve',):
  corners=[(342,440,0),(312,440,0),(282,470,2),(282,500,2)]
  p=[vtx(*v) for v in corners]
  loops=[[edge(r['layer'],a,b,r['id']) for a,b in zip(p,p[1:]+p[:1])]]
  for index,curve in [(1,inner_curve),(3,outer_curve)]:
   ref=loops[0][index];ident=ref.lstrip('-')
   e=next(v[3] for v in edges.values() if v[0]==ident)
   controls=[vtx(x,y,0)[:2] for x,y in curve[1:3]]
   if ref.startswith('-'):controls.reverse()
   e.set('control','; '.join(' '.join(str(v) for v in point) for point in controls))
   edge_paths[ident]=LineString(bezier(*curve))
  authored_loops=[list(r['poly'].exterior.coords)]
 elif r['id']=='tunnel_center_platform':
  # The inside half of the bend remains a flat upper platform. Give its curved
  # boundary the same XY control points as the stair rail, at a constant height.
  corners=[(282,444,2),(282,440,2),(312,440,2),(282,470,2)]
  p=[vtx(*v) for v in corners]
  loops=[[edge(r['layer'],a,b,r['id']) for a,b in zip(p,p[1:]+p[:1])]]
  ident=loops[0][2].lstrip('-');e=next(v[3] for v in edges.values() if v[0]==ident)
  e.set('control','; '.join(' '.join(str(v) for v in vtx(x,y,0)[:2]) for x,y in inner_curve[1:3]))
  edge_paths[ident]=LineString(inner_points)
  authored_loops=[list(r['poly'].exterior.coords)]
 else:
  for ring in [r['poly'].exterior,*r['poly'].interiors]:
   p=[vtx(x,y,r['height'](x,y)) for x,y in loop_coords(ring)];p=[v for i,v in enumerate(p) if v!=p[i-1]];loops.append([edge(r['layer'],a,b,r['id']) for a,b in zip(p,p[1:]+p[:1])]);authored_loops.append([(v[0]/SCALE+50,1005-v[1]/SCALE) for v in p])
 # Catch dropped corners during noding/quantization before compilation. The
 # bound is the perimeter swept by the maximum millimetre rounding displacement.
 authored=Polygon(authored_loops[0],authored_loops[1:])
 assert authored.is_valid, f'Invalid noded outline: {r["id"]}'
 assert authored.symmetric_difference(r['poly']).area < r['poly'].length*.008+.01, f'Noding changed footprint: {r["id"]}'
 region_edges[r['id']]=loops[0]
 attrs=dict(id=r['id'],label=r['label'],area=r['area'],boundary=' '.join(loops[0]),material='mat.'+r['material'])
 if r.get('ceiling') is not None:attrs['ceiling']=str(r['ceiling'])
 if r['stairs']==('curve',):attrs.update(fill='stairs',lower=loops[0][0].lstrip('-'),upper=loops[0][2].lstrip('-'),rise=str(r.get('rise',.18)))
 elif r['stairs']:
  axis,lower,upper=r['stairs'];k=0 if axis=='x' else 1
  def landing(value):
   for ref in loops[0]:
    a,b=edge_xy[ref.lstrip('-')];pa=(a[0]/SCALE+50,1005-a[1]/SCALE);pb=(b[0]/SCALE+50,1005-b[1]/SCALE)
    if abs(pa[k]-value)<.02 and abs(pb[k]-value)<.02:return ref.lstrip('-')
  low,high=landing(lower),landing(upper)
  if low and high:attrs.update(fill='stairs',lower=low,upper=high,rise=str(r.get('rise',.18)))
  else:raise ValueError(f'Landing boundaries missing for {r["id"]}: {low} {high}')
 element=ET.SubElement(layers[r['layer']],'region',**attrs)
 for hole in loops[1:]:ET.SubElement(element,'hole',boundary=' '.join(hole))
# Region splits describe elevation patches, not architectural partitions.
# Only the traced perimeter becomes a wall automatically. Interior architectural
# walls are separately traced below, so changing a height patch cannot invent one.
for ident,a,b,e in edges.values():
 A,B=edge_xy[ident]
 line=edge_paths.get(ident,LineString([(A[0]/SCALE+50,1005-A[1]/SCALE),(B[0]/SCALE+50,1005-B[1]/SCALE)]))
 if len(owners[ident])==2 or not footprint.boundary.buffer(.025).covers(line):e.set('kind','open')
 # At the CT/Short-stair corner the centreline separation is only 0.1 m.
 # A 0.2 m wall meets the stair side; a default 0.24 m wall cuts through it.
 if e.get('kind')=='wall' and all(abs(p[0]-56.8)<.001 for p in [A,B]) and any(abs(p[1]-63)<.001 for p in [A,B]):e.set('thickness','.2')
# Match coincident XY boundaries on separate layers/elevations explicitly.
xygroups={}
for ident,a,b,e in edges.values():
 key=tuple(sorted([edge_xy[ident][0][:2],edge_xy[ident][1][:2]]));xygroups.setdefault(key,[]).append((ident,e))
region_by_id={r['id']:r for r in regions}
for group in xygroups.values():
 matched=set()
 def connect(a,A,b,B):
  A.set('kind','open');B.set('kind','open');ET.SubElement(root,'seam',id=f'seam{len(seams)}',edges=f'{a} {b}',kind='open',material='mat.wall');seams.append((a,b));matched.update([a,b])
 for i,(a,A) in enumerate(group):
  for b,B in group[i+1:]:
   if a in matched or b in matched:continue
   if sorted(edge_xy[a])==sorted(edge_xy[b]):connect(a,A,b,B)
 for i,(a,A) in enumerate(group):
  for b,B in group[i+1:]:
   if a in matched or b in matched:continue
   ra=region_by_id[owners[a][0]];rb=region_by_id[owners[b][0]]
   if ra['poly'].intersection(rb['poly']).area<.01:connect(a,A,b,B)
# Explicit pixel-space architectural references, independently reviewable against
# the supplied image. Floor color changes, stair treads, boxes and site outlines
# are not interpreted as walls. Heights remain the previous blockout assumptions.
for wall in wall_reference['walls']:
 points=[];layer=wall.get('layer','ground')
 for a,b in zip(wall['points'],wall['points'][1:]):points.extend(segment_coords(a,b))
 points.append(wall['points'][-1])
 distance=0.
 for i,(a,b) in enumerate(zip(points,points[1:])):
  def support(p):
   choices=[r for r in regions if (r['layer']==layer or wall_base_region(r,wall)) and r['poly'].buffer(.02).covers(Point(*p))]
   choices=[r for r in choices if wall_base_region(r,wall)] or choices
   r=min(choices or [r for r in regions if r['layer']==layer],key=lambda r:r['poly'].distance(Point(*p)))
   return min(q['height'](*p) for q in choices) if choices else r['height'](*p)
  va=vertex(layer,vtx(*a,support(a)));vb=vertex(layer,vtx(*b,support(b)))
  attrs={'from':va,'to':vb,'kind':'wall','thickness':str(wall['width']*SCALE),'height':str(wall.get('height',4.5)),'material':'mat.wall'}
  candidates=[r for r in regions if (r['layer']==layer or wall_base_region(r,wall)) and not r['stairs'] and r['poly'].buffer(.02).covers(LineString([a,b]))]
  candidates=[r for r in candidates if wall_base_region(r,wall)] or candidates
  if candidates:
   anchor=min(candidates,key=lambda r:r['height'](*a)+r['height'](*b))
   attrs['base-floor']=anchor['id']
  element=ET.SubElement(layers[layer],'edge',id=wall['id']+f'.{i}',label=wall['label'],**attrs)
  length=math.dist(a,b)*SCALE
  for opening in wall.get('openings',[]):
   start=max(0,opening['start']-distance);end=min(length,opening['end']-distance)
   if end-start<=.001:continue
   ET.SubElement(element,'opening',id=wall['id']+'.'+opening['id']+f'.{i}',kind=opening['kind'],start=str(q(start)),end=str(q(end)),sill=str(opening.get('sill',0)),head=str(opening['head']))
  distance+=length
# Markers identify real supported positions. Routes are derived from actual mesh
# navigation; no off-mesh links are used to manufacture connectivity.
def marker(ident,label,pixel,kind,team='neutral',region_id=None):
 if region_id:r=next(r for r in regions if r['id']==region_id)
 else:r=next(r for r in regions if r['poly'].contains(Point(*pixel)) and r['layer']!='underpass')
 x,y=pixel;pos=vtx(x,y,r['height'](x,y));ET.SubElement(root,'marker',id=ident,label=label,layer=r['layer'],region=r['area'],position=' '.join(map(str,pos)),kind=kind,team=team)
marker('t_spawn_mark','T spawn',(370,935),'attacker_spawn','attack')
marker('ct_spawn_mark','CT spawn',(590,235),'defender_spawn','defend')
marker('site_a','Bombsite A',(811,170),'objective')
marker('site_b','Bombsite B',(207,124),'objective')
marker('a_back_mark','Goose · upper landing',(875,70),'poi')
marker('pit_mark','Pit',(885,675),'poi')
marker('pit_platform_mark','Pit Plat',(949,644),'poi')
marker('tunnel_upper_mark','Upper tunnel landing',(272,475),'poi')
marker('tunnel_lower_mark','Lower tunnel landing',(310,419),'poi')
marker('short_mark','A Short',(650,295),'poi')
marker('ct_cross_mark','CT ramp · Cross landing',(770,240),'poi')
marker('long_mark','Long A · direct site approach',(885,470),'poi')
marker('goose_mark','Goose · upper stair landing',(820,101),'poi')
local_routes=[
 ('b_doors_route','B Doors',(250,232),(285,232),10),
 ('b_tunnel_threshold_route','B tunnel threshold',(113,318),(113,355),10),
 ('short_stair_route','Short stairs',(650,382),(650,328),12),
 ('mid_stair_route','Mid side stairs',(497,478),(497,552),12),
 ('pit_platform_route','Pit Plat stairs',(949,552),(949,605),10),
]
for ident,label,start,end,limit in local_routes:
 marker(ident+'.from',label+' · near landing',start,'poi')
 marker(ident+'.to',label+' · far landing',end,'poi')
 ET.SubElement(root,'route',id=ident,**{'from':ident+'.from','to':ident+'.to','min-routes':'1','max-distance':str(limit)})
for target in ['site_a','site_b','a_back_mark','pit_mark','short_mark']:
 ET.SubElement(root,'route',id='t_to_'+target,**{'from':'t_spawn_mark','to':target,'min-routes':'1','max-distance':'250'})
ET.SubElement(root,'light',id='sun',kind='directional',position='-30 -15 90',target='40 50 0',color='#fff1d5',intensity='2.2')
ET.SubElement(root,'route',id='tunnel_bend_route',**{'from':'tunnel_upper_mark','to':'tunnel_lower_mark','min-routes':'1','max-distance':'15'})
ET.SubElement(root,'route',id='ct_to_cross',**{'from':'ct_spawn_mark','to':'ct_cross_mark','min-routes':'1','max-distance':'28'})
ET.SubElement(root,'route',id='short_to_site',**{'from':'short_mark','to':'site_a','min-routes':'1','max-distance':'32'})
ET.SubElement(root,'route',id='long_to_site',**{'from':'long_mark','to':'site_a','min-routes':'1','max-distance':'55'})
ET.SubElement(root,'route',id='long_to_goose',**{'from':'long_mark','to':'goose_mark','min-routes':'1','max-distance':'48'})
ET.SubElement(root,'route',id='goose_to_site',**{'from':'goose_mark','to':'site_a','min-routes':'1','max-distance':'12'})
# Underpass and tunnels need authored illumination; it contributes live direct
# light and baked bounce without faking an ambient fill.
for i,(pixel,z) in enumerate([((170,650),4.8),((176,457),4.8),((110,369),4.8),((644,237),2.2)]):
 p=vtx(*pixel,z);ET.SubElement(root,'light',id=f'tunnel_light{i}',kind='point',position=' '.join(map(str,p)),color='#ffe5b9',intensity='12')
ET.indent(root,space='  ')
out=ROOT/'examples/dust2.level.svgx';ET.ElementTree(root).write(out,encoding='UTF-8',xml_declaration=True)
region_coverage=unary_union([r['poly'] for r in regions])
assert footprint.difference(region_coverage).area<1, 'Region partition dropped part of the reference footprint'
report={'reference':str(REFERENCE.relative_to(ROOT)),'referenceSha256':hashlib.sha256(REFERENCE.read_bytes()).hexdigest(),'metresPerPixel':SCALE,'coordinatePrecision':.001,'regions':len(regions),'vertices':len(vertices),'edges':len(edges),'authoredOutlineVertices':len(OUTLINE),'omittedPartitionPixels2':footprint.difference(region_coverage).area,'compiledAudit':'generated/dust2-alignment/report.json','assumptions':['0.1 metres per pixel; dimensions are CS2 blockout estimates, not surveyed geometry','Goose ledge is provisionally 0.54 m above A; three shallow 18 cm risers','Western T Spawn/T Plat 3 m; spawn descends east from radar X490 to607 reaching2m; north Mid/Long approaches level2m; outside tunnel approach1.46m; Upper Tunnels2m; Lower Tunnels/CT0m','B courtyard1.46m climbs three 18cm steps into tunnel2m; Dog/Close flat; B divider4.5m with separate Doors and raised Window; Pit center0.2m, Pit Plat3.2m, Long2m','A Short and site connector Z4 over CT0 with3.8m slab clearance; Short rises2m in12steps; Mid side stairs rise2m in16steps; CT ramp/stairs rise east X681to762 toZ2, with level landing and Long merge; Long rises north from Cross2m toGoose4.54m and shallow stairs descend south to A site4m; no off-mesh shortcuts'],'output':str(out.relative_to(ROOT))}
(ROOT/'generated/dust2-plan-contract.json').write_text(json.dumps({'outer':OUTLINE,'holes':HOLES,'landmarks':{m.attrib['id']:[float(v) for v in m.attrib['position'].split()] for m in root.findall('marker')},'stairs':{'lower_tunnels_stairs':{'outerRadius':6,'innerRadius':3,'centerPlatform':'tunnel_center_platform','hallway':'lower_tunnels','lowerHeight':0,'upperHeight':2}},'passages':[{'id':'lower_tunnel_hall','from':[342,410],'to':[436,410],'minimumWidth':2.5},{'id':'b_tunnel','from':[113,350],'to':[113,410],'minimumWidth':2}]}))
(ROOT/'generated/dust2-reference-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
