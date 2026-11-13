"""Project-owned translation of the accepted L02 geometry into editable native AML."""
from pathlib import Path
import json, math, hashlib
import xml.etree.ElementTree as X
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
P=Path(__file__).parent;src=P/'layout-l02/layout-data.json';d=json.loads(src.read_text())
d['revision']='R08';d['status']='Derived construction overlay on accepted L02; bounded compiled review pending. Actual movement and optical evidence is recorded separately.'
def geometry_parts(g):return [g] if g.geom_type=='Polygon' else [p for p in g.geoms if p.geom_type=='Polygon']
def geometry_data(g):return [dict(outer=list(p.exterior.coords)[:-1],holes=[list(r.coords)[:-1] for r in p.interiors]) for p in geometry_parts(g)]
def line_parts(g):return [g] if g.geom_type=='LineString' else [p for p in g.geoms if p.geom_type=='LineString']
# Physical inspection found a short gap between Awning's chamfer and the literal
# butt-capped S01 path. Realize that already-intended connection inside the court.
awning_joint=LineString([[36,22],[40,28]]).buffer(2.5,cap_style=2,join_style=2)
repair_bounds=awning_joint.buffer(.6)
f0=d['floors'][0];ground=unary_union([Polygon(p['outer'],p['holes']) for p in f0['polygons']]).union(awning_joint)
f0['polygons']=geometry_data(ground)
new_walls=[]
for w in d['boundaryWalls']:
 if w['z']!=0:new_walls.append(w);continue
 for i,line in enumerate(line_parts(LineString([w['a'],w['b']]).difference(repair_bounds))):
  if line.length>.03:new_walls.append({**w,'id':w['id']+f'-a{i}','a':list(line.coords[0]),'b':list(line.coords[-1])})
for i,line in enumerate(line_parts(ground.boundary.intersection(repair_bounds))):
 for j,(a,b) in enumerate(zip(list(line.coords),list(line.coords)[1:])):
  if math.dist(a,b)>.03:new_walls.append(dict(id=f'AWNING-join-wall-{i}-{j}',a=a,b=b,z=0,top=9.5,thickness=.3,role='Complete facade around repaired Awning/underpass paving junction'))
d['boundaryWalls']=new_walls
for c in d['context']:
 c['polygons']=geometry_data(unary_union([Polygon(p['outer'],p['holes']) for p in c['polygons']]).difference(awning_joint.buffer(.45)))
# The lower well has a narrower north/south footprint than its upper void.
# Stop lower facade remnants at the storey and close those setbacks with real
# nonplayable ceiling returns; never leave detached9.5m blades inside the well.
well_repaired=[]
for w in d['boundaryWalls']:
 if w['z']==0 and w['top']>6.9 and all(41.3<=p[0]<=62.3 and 39<=p[1]<=53 for p in [w['a'],w['b']]):
  well_repaired.append({'id':w['id'],'previousTop':w['top'],'top':3.2,'a':w['a'],'b':w['b']});w['top']=3.2;w['role']='Lower courtyard facade joined to the factory storey / setback cap'
d['constructionRepairs']={'lowerWellFacades':well_repaired,'setbackCaps':[{'id':'WELL-S-RETURN','polygon':[[46,41],[56,41],[56,42.15],[46,42.15]],'top':3.2,'thickness':.24},{'id':'WELL-N-RETURN','polygon':[[46,50.85],[56,50.85],[56,52],[46,52]],'top':3.2,'thickness':.24}],'coreFooting':{'id':'CORE-FOOTING','polygon':[[56,43],[62,43],[62,47],[56,47]],'base':0,'top':3.2}}
# The Paper lintel may not cross the S1 body corridor.
for w in d['partitions']:
 if w['id'].startswith('D-PAPER-lintel'):
  w['b']=[24,40]
for j in d['journeys']:
 if j['id']=='J02':j['waypoints'].insert(2,[25,15,0])
 if j['id']=='J05':
  at=j['waypoints'].index([66,61,3.2]);j['waypoints'][at:at+1]=[[68,60,3.2],[66,60,3.2],[64,61,3.2]]
d['journeys'].append(dict(id='J10',name='Repaired intended Awning / underpass connection',waypoints=[[30,20,0],[36,22,0],[40,28,0],[40,34,0],[43,34,0],[52,34,0]]))
for j in d['journeys']:
 j['polylineLength']=sum(math.dist(a,b) for a,b in zip(j['waypoints'],j['waypoints'][1:]));j['straightMotionSeconds']=j['polylineLength']/3.4
for v in d['views']:
 v['verticalFov']=60;v['horizontalFov']=math.degrees(2*math.atan(math.tan(math.radians(30))*4/3));v['frameAspect']=4/3;v['cameraNote']='Planned camera-form optical framing; actual walking captures use 65 degree vertical FOV and record the projection matrix.'
(P/'production-layout').mkdir(exist_ok=True)
(P/'production-layout/layout-data-r08.json').write_text(json.dumps(d,indent=2)+'\n')
root=X.Element('architecture',{'version':'1','id':'ninefold-reboot','name':'Ninefold Reboot / Loft Street','units':'meters','validation':'playable','description':'R08 bounded native blockout from accepted L02: occupied factory above through-street, attached lightwell facades, ground Porcelain site and committed roof switch. Local physical repairs are documented in the compiled review packet. Independent compiled review pending; no balance claim.'})
def fmt(x):return f'{x:.6f}'.rstrip('0').rstrip('.') if isinstance(x,(int,float)) else str(x)
def attrs(kw):return {k.replace('_','-'):('true' if v is True else 'false' if v is False else fmt(v)) for k,v in kw.items() if v is not None}
def el(tag,parent=root,**kw):return X.SubElement(parent,tag,attrs(kw))
def pts(q):return '; '.join(' '.join(fmt(v) for v in p) for p in q)
def parts(g):return [g] if g.geom_type=='Polygon' else [p for p in g.geoms if p.geom_type=='Polygon']
def polygon(id,poly,holes=[]):
 e=el('profile',id=id,points=pts(poly))
 for h in holes:el('hole',e,points=pts(h))
 return id
def shape(id,g):return polygon(id,list(g.exterior.coords)[:-1],[list(r.coords)[:-1] for r in g.interiors])
def path(id,points):el('path',id=id,points=pts(points));return id
materials={'paving':'#b8b7a9','concrete':'#c8c5b7','jade':'#88aba0','rust':'#b58e76','ink':'#475b59','low':'#a1b1a0','ceramic':'#d0c4a9','sage':'#adb8a7','ochre':'#c2ae91','grey':'#aab4b1','window':'#526765','a-zone':'#d6a15c','b-zone':'#73b4a3','sign':'#9a5a4c'}
for id,c in materials.items():el('material',id=id,color=c)
city=el('assembly',id='city',label='Complete occupied masonry district',coincident_material='retained-face')
mapping=[]
floor_geoms={};floor_ids={}
for f in d['floors']:
 floor_geoms[f['z']]=unary_union([Polygon(p['outer'],p['holes']) for p in f['polygons']])
 for i,p in enumerate(f['polygons']):
  id=f'floor-{fmt(f["z"])}-{i}';floor_ids[f['z']]=id
  el('slab',city,id=id,group='ground' if f['z']==0 else 'middle' if f['z']==3.2 else 'roof-walk',profile=polygon(id+'-plan',p['outer'],p['holes']),elevation=f['z'],thickness=f['thickness'],material='paving' if f['z']==0 else 'jade' if f['z']==3.2 else 'concrete')
  mapping.append({'layout':f['id'],'aml':id})
for w in d['boundaryWalls']+d['partitions']:
 el('wall',city,id=w['id'],group='walls',path=path(w['id']+'-axis',[[*w['a'],w['z']],[*w['b'],w['z']]]),thickness=w['thickness'],height=w['top']-w['z'],material='concrete',label=w['role'])
 mapping.append({'layout':w['id'],'aml':w['id']})
el('wall',city,id='S1-crest-bearing',group='supports',path=path('S1-crest-bearing-axis',[[33,40,0],[33,44,0]]),thickness=.3,height=2.96,material='concrete',label='Seal the reviewed nonwalkable underside of the School landing; top entry stays open')
for s in d['stairs']:
 id=s['id'];under='sloped';under_profile=None
 if s['low']==0:
  under='custom';under_profile=path(id+'-soffit',[[0,-.24,0],[9.9,-.24,0],[9.9,2.4,0],[12,2.96,0]])
 elif id=='S5':
  under='custom';under_profile=path(id+'-soffit',[[0,2.96,0],[2.3,2.96,0],[2.3,3.573333,0],[12,6.16,0]])
 el('stairs',city,id=id,group='stairs',path=path(id+'-axis',[[*s['a'],s['low']],[*s['b'],s['high']]]),width=s['width'],count=s['risers'],thickness=s['slab'],underside=under,underside_profile=under_profile,material='rust',label=s['name'])
 for side,suffix in [('left','L'),('right','R')]:
  el('enclosure',city,id=id+'-'+suffix,host=id,side=side,construction='parapet',offset=0,thickness=s['guardThickness'],height=s['guardHeight'],material='concrete')
  if s['low']==0 or id=='S5':
   length=12 if s['low']==0 else 2.3;sign=1 if side=='left' else -1
   ux,uy=(s['b'][0]-s['a'][0])/12,(s['b'][1]-s['a'][1])/12
   a=[s['a'][0]-uy*(2+.09)*sign,s['a'][1]+ux*(2+.09)*sign,s['low']]
   b=[a[0]+ux*length,a[1]+uy*length,s['low']]
   top=path(id+'-'+suffix+'-bearing-top',[[0,.16,0],[length,.16+3.04*length/12,0]])
   el('wall',city,id=id+'-'+suffix+'-bearing',group='supports',path=path(id+'-'+suffix+'-bearing-axis',[a,b]),thickness=.18,height=3.2,top=top,material='concrete',label='Bearing skirt under outward-mounted stair guard; no sub-body floor slit')
 mapping.append({'layout':id,'aml':id,'guards':[id+'-L',id+'-R']})
for o in d['obstacles']:
 el('extrusion',city,id=o['id'],group='cover',profile=polygon(o['id']+'-plan',o['polygon']),position=f'0 0 {fmt(o["z"])}',distance=o['top']-o['z'],material='low' if o['top']-o['z']<=1.3 else 'ink',label=o['role'])
 mapping.append({'layout':o['id'],'aml':o['id']})
for m in d['plinths']:
 for i,p in enumerate(m['polygons']):
  id=m['id']+f'-{i}';el('extrusion',city,id=id,group='supports',profile=polygon(id+'-plan',p['outer'],p['holes']),position=f'0 0 {fmt(m["base"])}',distance=m['top']-m['base'],material='concrete',label='Closed nonplayable support below the reviewed occupied surface')
  mapping.append({'layout':m['id'],'aml':id})
for c in d['constructionRepairs']['setbackCaps']:
 for i,p in enumerate(parts(Polygon(c['polygon']).difference(floor_geoms[3.2]))):
  id=c['id']+f'-{i}';el('canopy',city,id=id,group='roofs',profile=shape(id+'-plan',p),elevation=3.2,thickness=.24,playable=False,material='concrete',label='Attached nonplayable courtyard setback cap; lower passage clearance2.96 m')
footing=d['constructionRepairs']['coreFooting'];el('extrusion',city,id=footing['id'],group='supports',profile=polygon(footing['id']+'-plan',footing['polygon']),distance=3.2,material='concrete',label='Service core carried continuously to ground outside the well walking surface')
for id,p,w,dep,h in [('J-S1',[32.85,39.85,0],.3,.3,2.96),('J-WEST',[41.85,51.85,3.2],.3,.3,3.45),('J-SIGN',[85.85,57.85,3.2],.3,.3,3.2),('J-S3',[69.85,69.85,0],.3,.5,6.4),('J-S4-W',[85.8,61.85,0],.3,.3,6.4),('J-S4-E',[89.9,61.85,0],.3,.3,6.4),('J-S5-W',[33.85,50.8,3.2],.3,.4,3.45),('J-S5-E',[37.85,50.8,3.2],.3,.4,3.45),('J-AWNING',[35.05,25.1,0],.45,.45,9.5)]:
 el('box',city,id=id,group='supports',position=' '.join(map(fmt,p)),width=w,depth=dep,height=h,material='concrete',label='Physical wall/guard junction cap; closes a sub-body residual seam')
# Roof polygons close indoor rooms. Coincident playable slabs own their own support top.
for b in d['buildings']:
 g=Polygon(b['polygon'],b['roofHoles'])
 for z,fg in floor_geoms.items():
  if abs(b['roofTop']-z)<.001:g=g.difference(fg)
 for i,p in enumerate(parts(g)):
  id=b['id']+f'-roof-{i}';thickness=.25 if b['id'] in ['F1','F2','F5','F6'] else b['roofTop']-b['roofUnderside']
  el('roof',city,id=id,group='roofs',profile=shape(id+'-plan',p),elevation=b['roofTop'],thickness=thickness,playable=False,material='ceramic' if b['id']=='F2' else 'concrete',label=b['name']+' complete roof; hide only for cutaway')
  mapping.append({'layout':b['id'],'aml':id})
# Adjoining contextual masses retain their separate heights and identities.
for k,c in enumerate(d['context']):
 for i,p in enumerate(c['polygons']):
  poly=Polygon(p['outer'],p['holes']);id=c['id']+f'-{i}'
  el('extrusion',city,id=id,group='context',profile=shape(id+'-plan',poly),distance=c['roofTop'],material=['sage','ochre','grey'][k%3],label=c['name']+' / inaccessible complete mass')
  mapping.append({'layout':c['id'],'aml':id})

# Flush facade infill and lightweight services give the distinct masses an inhabited scale.
# They stay above player/camera routes and outside walk domains; no new walkable surfaces.
detail=el('group',id='facades',label='Residential bays and utility details; noncolliding presentation',collidable=False)
context_shapes=[(Polygon(p['outer'],p['holes']),c['roofTop']) for c in d['context'] for p in c['polygons']]
for k,c in enumerate(d['context']):
 count=0
 for p in c['polygons']:
  ring=p['outer']
  for a,b in zip(ring,ring[1:]+ring[:1]):
   dx,dy=b[0]-a[0],b[1]-a[1];L=math.hypot(dx,dy)
   if L<5 or min(abs(dx),abs(dy))>.005:continue
   for z in range(4,math.floor(c['roofTop']-1),3):
    for j in range(max(1,int(L/3.6))):
     t=(j+.5)/max(1,int(L/3.6));x,y=a[0]+dx*t,a[1]+dy*t
     nx,ny=-dy/L,dx/L
     if all(any(top>z+1.15 and poly.covers(Point(x+sign*nx*.1,y+sign*ny*.1)) for poly,top in context_shapes) for sign in [-1,1]):continue
     if abs(dx)>abs(dy):position=f'{fmt(x-.65)} {fmt(y-.025)} {z}';w,dep=1.3,.05
     else:position=f'{fmt(x-.025)} {fmt(y-.65)} {z}';w,dep=.05,1.3
     el('box',detail,id=f'{c["id"]}-window-{count}',position=position,width=w,depth=dep,height=1.15,material='window',collidable=False)
     count+=1

# Landmarks are coplanar material assignments, not added trip surfaces.
for name,key,z in [('site-a','A',0),('site-b','B',3.2)]:
 x,y,_=d['anchors'][key];id=name+'-mark';polygon(id,[[x-1.4,y-1.25],[x+1.4,y-1.25],[x+1.4,y+1.25],[x-1.4,y+1.25]])
 el('face-material',id=name+'-paint',host=floor_ids[z],face='top',profile=id,material='a-zone' if key=='A' else 'b-zone')
el('player',radius=.25,height=2,step=.25,slope=42,crouch=1.1,vault=0,rappel=False,ladder=False)
for s in d['stairs']:
 ux,uy=(s['b'][0]-s['a'][0])/12,(s['b'][1]-s['a'][1])/12
 for end,p,z,frm,to in [('in',s['a'],s['low'],floor_ids[s['low']],s['id']),('out',s['b'],s['high'],s['id'],floor_ids[s['high']])]:
  q=[[p[0]-uy*2,p[1]+ux*2,z],[p[0]+uy*2,p[1]-ux*2,z]]
  el('connection',id=s['id']+'-'+end,**{'from':frm,'to':to},path=path(s['id']+'-'+end+'-portal',q))
markers={}
def marker(id,p,kind='poi'):
 z=p[2];element=floor_ids.get(z)
 if element is None:
  element=next(s['id'] for s in d['stairs'] if LineString([s['a'],s['b']]).distance(Point(p[:2]))<.1 and s['low']<z<s['high'])
 el('marker',id=id,position=' '.join(fmt(v) for v in p),kind=kind,element=element,movement='land');markers[id]=p
for id,key,kind in [('t-spawn','T','attacker_spawn'),('ct-spawn','CT','defender_spawn'),('site-a','A','objective'),('site-b','B','objective')]:marker(id,d['anchors'][key],kind)
for id,points in [('t',[[8,12,0],[8,16,0],[11,11,0],[11,18,0]]),('ct',[[77,75,0],[79.5,75,0],[77,80,0],[79.5,80,0]])]:
 for i,p in enumerate(points):marker(id+f'-spawn-{i+2}',p,'attacker_spawn' if id=='t' else 'defender_spawn')
for s in d['stairs']:
 ux,uy=(s['b'][0]-s['a'][0])/12,(s['b'][1]-s['a'][1])/12
 marker(s['id']+'-foot',[s['a'][0]-ux,s['a'][1]-uy,s['low']]);marker(s['id']+'-top',[s['b'][0]+ux,s['b'][1]+uy,s['high']])
 el('route',id=s['id']+'-local',**{'from':s['id']+'-foot','to':s['id']+'-top'},min_routes=1,max_distance=18,movement='land')
for j in d['journeys']:
 marker(j['id']+'-start',j['waypoints'][0]);marker(j['id']+'-end',j['waypoints'][-1])
 el('route',id=j['id'],**{'from':j['id']+'-start','to':j['id']+'-end'},min_routes=1,max_distance=math.ceil(j['polylineLength']+15),movement='land')
el('no-spawn-los',markers='t-spawn ct-spawn')
X.indent(root,space='  ');X.ElementTree(root).write(P/'level.aml',encoding='utf-8',xml_declaration=True)
(P/'source-map.json').write_text(json.dumps({'revision':'R08','status':'Bounded compiled blockout; independent compiled review pending; no balance claim','acceptedLayoutSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'productionLayout':'production-layout/layout-data-r08.json','objects':mapping,'constructionNotes':['F1/F2/F5/F6 roof thickness is .25 rather than .24 to close the paper .01 m wall/soffit gap. Top elevations unchanged.','Roof faces coincident with playable slabs are omitted where those slabs already provide real enclosure/support.','All six flights retain native horizontal treads and graded parapets. Custom soffits enclose unusably low portions of S1–S5; the claimed S3/S5/S6 underpasses remain real open volumes.','Awning paving and local lintel, bearing and joint repairs realize the intended L02 links. Exact dimensions are in production-layout/physical-repairs-r08.json.','Ground lightwell walls stop at 3.2 m and attach to upper facades through nonplayable setback caps; the service core reaches ground. V-WELL and the upper roof hole are unchanged.','Facade panes are flush, noncolliding visualization-only infill on contextual masses; no new gameplay window or route.']},indent=2)+'\n')
print('AML',len(root),'top-level records;',len(mapping),'mapped physical objects')
