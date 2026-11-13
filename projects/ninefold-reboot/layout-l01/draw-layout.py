from pathlib import Path
import json, math, html, hashlib
from shapely.geometry import Polygon, LineString, box, Point
from shapely.ops import unary_union

P=Path(__file__).parent
old=json.loads((P.parent/'planning/alternatives-data.json').read_text())[1]
D={'revision':'L01','units':'m','axes':'right-handed Z up; north +Y; common origin southwest',
   'status':'developed prediction; no AML, no collision or measured gameplay claims',
   'body':{'radius':.25,'standing':2,'crouching':1.1,'eye':1.86,'crouchEye':1.023,'step':.25,'slopeDegrees':42,'speed':3.4},
   'extent':[98,86],'rooms':[],'links':[],'stairs':[],'openings':[],'partitions':[],'obstacles':[],'buildings':[],'views':[],'journeys':[]}

def rect(x,y,w,h):return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]
def room(id,name,poly,z,kind='outdoor'):
 D['rooms'].append(dict(id=id,name=name,polygon=poly,z=z,kind=kind))
def link(id,pts,z,width):D['links'].append(dict(id=id,points=pts,z=z,width=width))
for r in old['rooms']:
 if r['id'] not in ['B','LAUNDRY','EAST','SIGN','BOILERG','ROOF','RESERVOIR']:
  room(r['id'],r['label'],r['polygon'],r['z'],r['kind'])
for r in old['paths']:
 if r['z']==0 and r['id'] not in ['A-CT','tailor-stair','tailor-alley']:
  link(r['id'],r['points'],0,r['width'])
room('SCHOOL','SCHOOL TERRACE',rect(33,33,10,18),3.2)
room('EAST','EAST PORCH',rect(62,34,10,15),3.2,'roofed')
room('B','B / MACHINE FLOOR',[[42,31],[62,31],[62,43],[56,43],[56,41],[42,41]],3.2,'indoor')
room('NORTH','NORTH RECEIVING',rect(42,52,16,7),3.2,'indoor')
room('WESTLEG','WEST WORK AISLE',rect(42,41,4,11),3.2,'indoor')
room('POCKET','INSPECTION BAY',rect(56,47,6,5),3.2,'indoor')
room('SIGN','SIGN GALLERY',[[80,48],[92,48],[92,52],[86,52],[86,58],[80,58]],3.2,'indoor')
room('BOILERG','BOILER GALLERY',rect(48,59,22,4),3.2,'indoor')
room('ROOF','SCHOOL ROOF',[[32,61],[43,61],[48,65],[48,72],[32,72]],6.4)
room('RESERVOIR','RESERVOIR ROOF',rect(58,73,12,9),6.4)
link('east-sign',[[72,46],[77,46],[80,50]],3.2,4)
link('north-pocket',[[58,53],[59,53],[59,50]],3.2,3)
link('roof-fold',[[48,67],[54,67],[54,76],[58,76]],6.4,4)
link('A-CT',[[82,62],[82,68],[82,70]],0,4.5)
link('sign-bottom',[[82,66],[88,66],[88,64]],0,4)
link('tailor-alley',[[39,17],[56,17],[56,24],[60,24],[60,20],[70,20],[70,39],[78,39],[78,44]],0,4)
link('tailor-stair',[[65,20],[65,23]],0,4)
link('boiler-bottom',[[67,76],[68,76],[68,73]],0,4)

def stair(id,a,b,low,high,name,receiving):
 ux,uy=(b[0]-a[0])/12,(b[1]-a[1])/12
 def pad(p,front):
  q=[p[0]+ux*3*front,p[1]+uy*3*front]
  return list(LineString([p,q]).buffer(2,cap_style=2).exterior.coords)[:-1]
 D['stairs'].append(dict(id=id,name=name,a=a,b=b,low=low,high=high,width=4,run=12,rise=3.2,risers=20,riser=.16,tread=.6,slab=.24,
  lowerLanding=pad(a,-1),upperLanding=pad(b,1),guardHeight=1.1,guardThickness=.18,minimumHeadroom=2.35,
  receiving=receiving,cutoutRule='No upper slab over the 4 m flight footprint. Flight-side guards follow grade; landing ends remain open.'))
stair('S1',[21,42],[33,42],0,3.2,'Butcher → School','3 m top apron; turn south around SCH return before B west door')
stair('S2',[65,23],[65,35],0,3.2,'Tailor → East','3 m top apron; turn south or east at East porch')
stair('S3',[68,73],[68,61],0,3.2,'Water / Dye → Boiler','3 m top apron; west into enclosed gallery, north B door at y59')
stair('S4',[88,64],[88,52],0,3.2,'A rear → Sign','3 m top apron; turn west into Sign, no stair-top A panorama')
stair('S5',[36,49],[36,61],3.2,6.4,'School → School roof','3 m top apron; roof hatch opens to west court')
stair('S6',[62,63],[62,75],3.2,6.4,'Boiler → Reservoir','3 m top apron; arrival east of folded roof seam')

def wall(id,a,b,z,top,role):D['partitions'].append(dict(id=id,a=a,b=b,z=z,top=top,thickness=.3,role=role))
def opening(id,a,b,z,head,kind,role,sill=None):
 D['openings'].append(dict(id=id,a=a,b=b,z=z,head=head,kind=kind,role=role,sill=z if sill is None else sill,width=round(math.dist(a,b),3)))
def wall_with_door(id,a,b,da,db,z,top,role):
 wall(id+'-1',a,da,z,top,role);wall(id+'-2',db,b,z,top,role)
 opening(id,da,db,z,z+2.6,'movement',role)
 # Lintel is a real opaque member; the opening's head is not the roof.
 wall(id+'-lintel',da,db,z+2.6,top,role+' lintel')

# Actual ground indoor thresholds. Room perimeter edges elsewhere belong to generated facade walls.
wall_with_door('D-BUTCHER',[11,31],[24,31],[11,31],[15,31],0,3.05,'covered commercial entry')
wall_with_door('D-PAPER',[24,35],[24,41],[24,37],[24,41],0,3.05,'Butcher / Paper threshold')
wall_with_door('D-UNDER-W',[43,30],[43,39],[43,32],[43,36],0,2.96,'factory street west portal')
wall_with_door('D-UNDER-N',[43,39],[61,39],[50,39],[54,39],0,2.96,'underpass / lift well portal')
wall_with_door('D-DYE-S',[51,52],[64,52],[51,52],[54,52],0,2.96,'well / Dye threshold')
wall_with_door('D-DYE-W',[51,52],[51,65],[51,56],[51,60],0,2.96,'Boiler / Dye doorway')
wall_with_door('D-DYE-E',[64,52],[64,65],[64,56],[64,60],0,2.96,'Dye / A connector')
wall_with_door('D-DYE-N',[51,65],[64,65],[57,65],[61,65],0,2.96,'Dye / Water exit')
wall_with_door('D-A-S',[73,42],[83,42],[76,42],[80,42],0,6.4,'Tailor / Porcelain front')
wall_with_door('D-A-W',[73,42],[73,59],[73,56],[73,59],0,6.4,'Dye / Porcelain rear shoulder')
wall_with_door('D-A-N',[81,62],[92,62],[81,62],[84,62],0,6.4,'A / CT rear threshold')
# The factory is a volume with a U-shaped occupied lower loft and a lightwell void.
wall_with_door('D-B-W',[42,31],[42,51],[42,34],[42,38],3.2,6.65,'School to B west production floor')
wall_with_door('D-B-E',[62,31],[62,49],[62,39],[62,43],3.2,6.65,'East to B southeast production floor')
wall_with_door('D-B-N',[42,59],[58,59],[48,59],[52,59],3.2,6.65,'Boiler to B north receiving')
wall_with_door('D-NORTH',[42,52],[58,52],[42,52],[46,52],3.2,6.65,'north receiving to west work aisle')
wall('SCH-RETURN',[36,38],[40,38],3.2,5.6,'school entry preparation return; west passing gap 3 m')
wall('EAST-RETURN',[66,39],[70,39],3.2,6.35,'separate S2 arrival from B door; 4 m west bypass')
wall('WELL-W',[46,41],[46,52],3.2,6.65,'opaque west lightwell edge; rejected School aperture absent')
wall('WELL-S',[46,41],[56,41],3.2,6.65,'opaque wall keeps southern bomb floor from lower information')
wall('WELL-N',[46,52],[56,52],3.2,6.65,'opaque north well edge below receiving bay')
wall('WELL-E-1',[56,41],[56,47.6],3.2,6.65,'east well edge')
wall('WELL-E-2',[56,49.6],[56,52],3.2,6.65,'east well edge')
wall('WELL-AP-sill',[56,47.6],[56,49.6],3.2,4.15,'opaque sill')
wall('WELL-AP-head',[56,47.6],[56,49.6],5.75,6.65,'opaque head')
opening('V-WELL',[56,47.6],[56,49.6],3.2,5.75,'observation','only lower information aperture; reciprocal, no movement',4.15)
wall('SIGN-W1',[80,50.5],[80,51],3.2,6.4,'Sign west pier between entry and observation')
opening('D-SIGN',[80,48],[80,50.5],3.2,5.8,'movement','East connector enters Sign at southwest threshold')
wall('SIGN-entry-head',[80,48],[80,50.5],5.8,6.4,'Sign entry lintel')
wall('SIGN-W2',[80,53],[80,58],3.2,6.4,'Sign west wall')
wall('SIGN-sill',[80,51],[80,53],3.2,4.35,'Sign aperture sill')
wall('SIGN-head',[80,51],[80,53],5.75,6.4,'Sign aperture head')
opening('V-SIGN',[80,51],[80,53],3.2,5.75,'observation','looks only at A western shoulder; not plant or Tailor',4.35)
wall('ROOF-SCREEN',[38,61],[43,61],6.4,9.05,'roof service frontage screens Boiler, not a panorama')
wall('ROOF-FOLD',[51.8,69],[51.8,74],6.4,9.05,'roof utility enclosure return; route on its east')

def obstacle(id,poly,z,top,role):D['obstacles'].append(dict(id=id,polygon=poly,z=z,top=top,role=role,collision=True,visualOpacity='opaque',ballistics='unknown',destructibility='unknown'))
obstacle('CORE',rect(56,43,6,4),3.2,6.65,'full-height service core separates southeast floor from northern observation bay')
obstacle('B-PRESS',rect(50,33,4,4),3.2,5.8,'tall press; plant at south-east side, west/north approach requires a changed angle')
obstacle('B-TABLE',rect(47,37.5,3,1.4),3.2,4.4,'low production table; crouched refuge from west, exposed to north aisle arrival')
obstacle('N-SORT',rect(48,54,4,1.5),3.2,4.4,'receiving counter; staging refuge, not protection from both north door and west aisle')
obstacle('A-KILN',rect(81,48,3,8),0,2.75,'tall kiln assembly splits rear shoulder from southeastern plant bay')
obstacle('A-PALLET',rect(85,45.5,3,1.5),0,1.2,'plant-side low cover, exposed from rear and south if teammate loses either front')
obstacle('A-BENCH',rect(75,49.5,3,1.3),0,1.2,'ground western preparation; upper Sign can defeat it')
obstacle('W-CART',rect(47,44,2,2.6),0,1.2,'low well cart for a lower player to pause; east aperture can see around its north end')
obstacle('U-PIER',rect(47,31,1,2.5),0,2.96,'factory support pier, breaks oblique west-to-well body line')
obstacle('DYE-RACK',rect(55,55,2,5),0,2.96,'shelving divides store transfer from outer rear route')
obstacle('BOILER-TANK',[[33,54],[37,54],[38,55],[38,58],[37,59],[33,59],[32,58],[32,55]],0,2.5,'court machine creates north/south passages; follower can trade around south shoulder')
obstacle('BUTCHER-COUNTER',rect(12,35,2,4),0,1.2,'shop prep and contact reset without filling stair approach')
obstacle('AWNING-STALL',rect(28,13,5,2.4),0,2.6,'shop back breaks straight view to Canal spawn')
obstacle('T-RETURN',rect(13,17,5,2),0,3,'spawn exit shield; two outgoing decisions remain visible to teammates')
obstacle('CT-RETURN',rect(73,73,2.5,5),0,3,'spawn offset cover against A rear corridor')
obstacle('R-WATER',rect(60,78,5,2),6.4,8.6,'roof tank utility mass; no walkable top or required boost')
obstacle('R-HUT',rect(40,66,4,4),6.4,9.2,'roof caretaker room; passing on north or south, no interior access')

def building(id,name,poly,z,roof,holes=[]):D['buildings'].append(dict(id=id,name=name,polygon=poly,base=z,roofUnderside=roof-.24,roofTop=roof,roofHoles=holes,role='complete opaque enclosed mass / roof; selective occupied voids'))
building('F1','Machine factory',rect(41.7,30.7,20.6,28.6),0,6.9,[rect(46,41,10,11)])
building('F2','Porcelain works',[[72.7,41.7],[82.7,41.7],[82.7,38.7],[92.3,41.7],[92.3,62.3],[80.7,62.3],[80.7,59.3],[72.7,59.3]],0,6.65)
building('F3','Dye shop / Boiler annex',rect(50.7,51.7,13.6,13.6),0,3.2)
building('F4','Butcher shop',[[10.7,30.7],[24.3,30.7],[24.3,39.3],[21.3,39.3],[21.3,44.3],[10.7,44.3]],0,3.05)
building('F5','Boiler upper gallery',rect(47.7,58.7,22.6,4.6),3.2,6.65)
building('F6','East covered porch',rect(61.7,33.7,10.6,15.6),3.2,6.6)

def geomdata(g):
 if g.is_empty:return []
 gs=[g] if g.geom_type=='Polygon' else list(g.geoms)
 return [dict(outer=[[round(x,4),round(y,4)] for x,y in p.exterior.coords[:-1]],holes=[[[round(x,4),round(y,4)] for x,y in r.coords[:-1]] for r in p.interiors]) for p in gs if p.geom_type=='Polygon']

floors={};domains={};flightShapes={}
for s in D['stairs']:flightShapes[s['id']]=LineString([s['a'],s['b']]).buffer(2,cap_style=2)
for z in [0,3.2,6.4]:
 pieces=[Polygon(r['polygon']) for r in D['rooms'] if r['z']==z]+[LineString(l['points']).buffer(l['width']/2,cap_style=2,join_style=2) for l in D['links'] if l['z']==z]
 for s in D['stairs']:
  if s['low']==z:pieces.append(Polygon(s['lowerLanding']))
  if s['high']==z:pieces.append(Polygon(s['upperLanding']))
 g=unary_union(pieces)
 # Exact upper flight cutouts avoid pretending the arrow is a flat floor.
 for s in D['stairs']:
  if s['high']==z:g=g.difference(flightShapes[s['id']])
 floors[z]=g
 domains[z]=unary_union([g]+[flightShapes[s['id']] for s in D['stairs'] if z in [s['low'],s['high']]])
D['floors']=[dict(id=f'FL-{z}',z=z,thickness=.24,polygons=geomdata(g)) for z,g in floors.items()]
D['boundaryWalls']=[]
for z,g in domains.items():
 gs=[g] if g.geom_type=='Polygon' else list(g.geoms)
 i=0
 for p in gs:
  for ring in [p.exterior,*p.interiors]:
   for a,b in zip(list(ring.coords),list(ring.coords)[1:]):
    i+=1
    line=LineString([a,b])
    # Flights have graded guards, not a wall across a level-transfer mouth.
    for s in D['stairs']:
     if z in [s['low'],s['high']]:line=line.difference(flightShapes[s['id']].boundary.buffer(.012))
    for o in D['openings']:
     if o['z']==z:line=line.difference(LineString([o['a'],o['b']]).buffer(.012,cap_style=2))
    segments=[line] if line.geom_type=='LineString' else list(line.geoms)
    for j,seg in enumerate(segments):
     if seg.length<.05:continue
     D['boundaryWalls'].append(dict(id=f'EDGE-{z}-{i:03}-{j}',a=list(seg.coords[0]),b=list(seg.coords[-1]),z=z,top=(9.5 if z==0 else 6.65 if z==3.2 else 7.65),thickness=.3,
       role='opaque outer facade' if z==0 else 'outer enclosure' if z==3.2 else 'roof parapet'))
def line_parts(g):
 return [g] if g.geom_type=='LineString' else [p for p in g.geoms if p.geom_type=='LineString']
# A ground facade under a real upper route is a plinth, not a tall wall through it.
# Break intervals at actual occupied footprints so this is construction data, not an exception note.
for category in ['boundaryWalls','partitions']:
 resolved=[]
 for w in D[category]:
  line=LineString([w['a'],w['b']])
  if line.length<.01:continue
  for s in D['stairs']:
   if abs(w['z']-s['low'])<.01:line=line.difference(flightShapes[s['id']].buffer(.02))
  pending=[(p,w['top']) for p in line_parts(line)]
  for upper in [3.2,6.4]:
   if w['z']>=upper or w['top']<upper-.24:continue
   footprint=domains[upper].buffer(.42)
   newer=[]
   for seg,top in pending:
    newer += [(p,min(top,upper-.24)) for p in line_parts(seg.intersection(footprint))]
    newer += [(p,top) for p in line_parts(seg.difference(footprint))]
   pending=newer
  for i,(seg,top) in enumerate(pending):
   if seg.length>.03 and top>w['z']+.01:resolved.append({**w,'id':w['id']+f'-p{i}','a':list(seg.coords[0]),'b':list(seg.coords[-1]),'top':top})
 D[category]=resolved
D['guards']=[]
for s in D['stairs']:
 ux,uy=(s['b'][0]-s['a'][0])/12,(s['b'][1]-s['a'][1])/12
 for sign in [-1,1]:
  D['guards'].append(dict(id=s['id']+('-L' if sign==1 else '-R'),a=[s['a'][0]-uy*2*sign,s['a'][1]+ux*2*sign,s['low']],b=[s['b'][0]-uy*2*sign,s['b'][1]+ux*2*sign,s['high']],height=1.1,thickness=.18,role='solid graded stair guard; no rail gap / no intended traversal'))

# Separate context parcels, clipped around occupied floors, stairs and complete landmark buildings.
reserved=unary_union([*domains.values(),*[Polygon(b['polygon']) for b in D['buildings']]]).buffer(.45)
parcels=[('C01','Canal tenement',box(0,0,24,30),13.6),('C02','Southern shop houses',box(24,0,60,30),10.4),('C03','Tailor residential wing',box(60,0,98,39),15.2),('C04','West housing',box(0,30,32,68),12),('C05','School block',box(32,30,42,61),9.4),('C06','Courtyard infill',box(42,39,73,57),10.8),('C07','North residential slab',box(0,68,58,86),16),('C08','Water street residences',box(58,61,98,86),12.6)]
D['context']=[dict(id=id,name=name,polygons=geomdata(poly.difference(reserved)),base=0,roofTop=top) for id,name,poly,top in parcels]
D['plinths']=[dict(id='PL-MIDDLE',base=0,top=2.96,polygons=geomdata(floors[3.2].difference(domains[0]).difference(unary_union(list(flightShapes.values()))))),dict(id='PL-ROOF',base=0,top=6.16,polygons=geomdata(floors[6.4].difference(domains[0]).difference(domains[3.2]).difference(unary_union(list(flightShapes.values())))))]
D['plinthRule']='Inaccessible solid supports below first occupied surface only; never fill a ground walk domain or stair flight. These are separate support masses, not one extruded gray remainder.'
D['anchors']={'T':[11,14,0],'CT':[78,78,0],'A':[87,43.8,0],'B':[57,35,3.2]}

def view(id,p,target,section,claim):D['views'].append(dict(id=id,feet=p,targetFeet=target,eyeOffset=1.86,horizontalFov=90,verticalFov=60,section=section,prediction=claim))
view('WELL-UP',[57,48.6,3.2],[50,49,0],'C2','bounded reciprocal well view; stand close to aperture, separated from plant by CORE')
view('WELL-DOWN',[50,49,0],[57,48.6,3.2],'C2','standing lower opponent can reciprocate; crouched body is a separate study')
view('WELL-UNDER',[52,40,0],[57,48.6,3.2],'C2','underpass shoulder predicted outside aperture horizontal extent')
view('WELL-DYE',[52,54,0],[57,48.6,3.2],'C2','Dye threshold hidden by north jamb; do not infer whole lower transfer control')
view('B-E',[60,40,3.2],[45,36,3.2],'C1','press divides west threshold from plant-side attention')
view('B-N',[44,50,3.2],[45,37,3.2],'C1','north clearing emerges through west work aisle; long aisle commitment, School support can challenge')
view('B-SUPPORT',[49,39.7,3.2],[44,46,3.2],'C1','plant teammate covers west aisle while observer leaves for north pocket')
view('SIGN-UP',[81,52,3.2],[76,52,0],'C3','A shoulder visible; plant behind kiln and outside aperture')
view('SIGN-DOWN',[76,52,0],[81,52,3.2],'C3','reciprocal angle defeats A-BENCH north position')
view('A-SOUTH',[78,43,0],[86,44,0],'C3','front pressure reaches plant bay; kiln hides rear shoulder')
view('A-REAR',[78,57,0],[86,44,0],'C3','kiln obstructs direct rear-to-plant ray; reposition south of kiln')
view('SCHOOL-LEADER',[30,42,2.4],[36,42,3.2],'C4','crest and terrace return visible; B threshold remains around south turn')
view('SCHOOL-FOLLOWER',[27,42,1.6],[36,42,3.2],'C4','following player supports terrace crest, not B interior')
view('EAST-LEADER',[65,32,2.4],[65,38,3.2],'C5','East return shields southward B entry from final ascent')
view('BOILER-LEADER',[68,64,2.4],[64,61,3.2],'C6','gallery elbow; north site door only after turning west')
view('SIGN-LEADER',[88,55,2.4],[84,50,3.2],'C7','landing leads into gallery; window requires a further westward stop')
view('ROOF-SCHOOL',[36,58,5.6],[36,64,6.4],'C8','roof hut protects onward choice; no complete Boiler view')
view('ROOF-RES',[62,72,5.6],[66,77,6.4],'C9','tank-side arrival, fold travel requires west turn')

journeys=[
('J01','T School B',[[11,14,0],[11,27,0],[12,31,0],[17,33,0],[18,42,0],[21,42,0],[27,42,1.6],[33,42,3.2],[35,42,3.2],[35,35.5,3.2],[42,35.5,3.2],[46,35.5,3.2],[46,39.5,3.2],[55,39.5,3.2],[57,35,3.2]]),
('J02','T Tailor A',[[11,14,0],[24,15,0],[25,20,0],[39,17,0],[56,17,0],[56,24,0],[60,24,0],[60,20,0],[70,20,0],[70,39,0],[78,39,0],[78,44,0],[79,44,0],[87,44,0]]),
('J03','lower continuation',[[17,39,0],[20,37,0],[24,38,0],[31,39,0],[31,34,0],[43,34,0],[52,34,0],[52,39,0],[52,47,0],[52,54,0],[53,61,0],[59,63,0],[59,69,0],[59,76,0],[68,76,0]]),
('J04','Drain Boiler Dye A',[[17,42,0],[17,54,0],[29,54,0],[30,60,0],[42,60,0],[44,58,0],[53,58,0],[53,62,0],[61,62,0],[61,58,0],[73,58,0],[78,57,0],[79,57,0],[79,46,0],[86,44,0]]),
('J05','CT Boiler north B',[[78,78,0],[78,80,0],[69,80,0],[68,76,0],[68,73,0],[68,67,1.6],[68,61,3.2],[66,61,3.2],[54,61,3.2],[50,61,3.2],[50,59,3.2],[50,57,3.2],[44,57,3.2],[44,49,3.2],[44,39.5,3.2],[46,39.5,3.2],[55,39.5,3.2],[57,35,3.2]]),
('J06','CT Sign East B',[[78,78,0],[80.5,73,0],[80.5,69,0],[82,66,0],[88,66,0],[88,64,0],[88,58,1.6],[88,52,3.2],[88,50,3.2],[82,50,3.2],[77,46,3.2],[69,46,3.2],[64,43,3.2],[64,41,3.2],[62,41,3.2],[58,40,3.2],[57,35,3.2]]),
('J07','early School roof Boiler switch',[[36,46,3.2],[36,49,3.2],[36,55,4.8],[36,61,6.4],[36,64,6.4],[38,64,6.4],[46,65,6.4],[48,67,6.4],[54,67,6.4],[54,76,6.4],[60,76,6.4],[62,76,6.4],[62,75,6.4],[62,69,4.8],[62,63,3.2],[62,61,3.2],[50,61,3.2],[50,59,3.2]]),
('J08','East from Tailor',[[70,24,0],[70,20,0],[65,20,0],[65,23,0],[65,29,1.6],[65,35,3.2],[65,38,3.2],[64,41,3.2],[62,41,3.2]]),
('J09','north information commitment',[[50,57,3.2],[54,57,3.2],[57,55,3.2],[57,53,3.2],[59,53,3.2],[59,49,3.2],[57,48.6,3.2]])]
for id,name,pts in journeys:
 length=sum(math.dist(a,b) for a,b in zip(pts,pts[1:]))
 D['journeys'].append(dict(id=id,name=name,waypoints=pts,polylineLength=round(length,2),straightMotionSeconds=round(length/3.4,2),status='coordinate estimate only; does not include clearing, stance, collision or target-game movement'))

# Planned cameras, reserved now for revision-matched actual renders later.
D['cameras']=[dict(id='overall-roofs',position=[135,-112,122],target=[48,43,2],roofMode='on'),dict(id='overall-cutaway',position=[135,-112,122],target=[48,43,2],roofMode='hide F1,F2,F5 roofs only')]
D['cameras'] += [dict(id=v['id'],position=[v['feet'][0],v['feet'][1],v['feet'][2]+1.86],target=[v['targetFeet'][0],v['targetFeet'][1],v['targetFeet'][2]+1.86],roofMode='on',fov=90) for v in D['views']]

COL={0:'#efe0bb',3.2:'#acd2c6',6.4:'#efba80'}
def esc(x):return html.escape(str(x))
def svg_path(g):
 data=geomdata(g);parts=[]
 for p in data:
  for ring in [p['outer'],*p['holes']]:parts.append('M'+' L'.join(f'{x},{y}' for x,y in ring)+' Z')
 return ' '.join(parts)
def diagram(z):
 W,H=1450,1400;scale=12;ox=85;oy=150
 out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="#f7f3e9"/><g font-family="Arial" fill="#243d42"><text x="50" y="50" font-size="29" font-weight="bold">NINEFOLD / LOFT STREET · L01 · z{z:g} m</text><text x="50" y="83" font-size="18">Developed layout for independent review · actual floor boundaries · north ↑ · meters</text><text x="50" y="112" font-size="16">Opaque walls black · movement portals green · optical apertures blue · explicit stairs pink · dashed roof footprint</text>']
 out.append(f'<g transform="translate({ox},{oy+86*scale}) scale({scale},-{scale})">')
 for k in range(0,99,10):out.append(f'<path d="M{k},0 V86" stroke="#d6d9d1" stroke-width=".07"/>')
 for k in range(0,87,10):out.append(f'<path d="M0,{k} H98" stroke="#d6d9d1" stroke-width=".07"/>')
 for c in D['context']:
  for p in c['polygons']:out.append(f'<path d="{svg_path(Polygon(p["outer"],p["holes"]))}" fill="#bdc2b8" stroke="#89958c" stroke-width=".1"/>')
 for b in D['buildings']:
  out.append(f'<polygon points="{" ".join(f"{x},{y}" for x,y in b["polygon"])}" fill="none" stroke="#7b7a70" stroke-width=".15" stroke-dasharray=".7 .45"/>')
 out.append(f'<path d="{svg_path(floors[z])}" fill="{COL[z]}" fill-rule="evenodd" stroke="#465951" stroke-width=".18"/>')
 for s in D['stairs']:
  if z not in [s['low'],s['high']]:continue
  a,b=s['a'],s['b'];g=flightShapes[s['id']]
  out.append(f'<path d="{svg_path(g)}" fill="#e4b6c1" stroke="#934f67" stroke-width=".15"/>')
  ux,uy=(b[0]-a[0])/12,(b[1]-a[1])/12
  for i in range(21):
   x,y=a[0]+ux*i*.6,a[1]+uy*i*.6
   out.append(f'<path d="M{x-uy*2},{y+ux*2} L{x+uy*2},{y-ux*2}" stroke="#934f67" stroke-width=".08"/>')
  out.append(f'<path d="M{a[0]},{a[1]} L{b[0]},{b[1]}" stroke="#934f67" stroke-width=".2"/>')
 for w in D['boundaryWalls']:
  if w['z']==z:
   out.append(f'<path d="M{w["a"][0]},{w["a"][1]} L{w["b"][0]},{w["b"][1]}" stroke="#34413f" stroke-width=".27"/>')
 for w in D['partitions']:
  if abs(w['z']-z)<.001:
   out.append(f'<path d="M{w["a"][0]},{w["a"][1]} L{w["b"][0]},{w["b"][1]}" stroke="#152f36" stroke-width=".4"/>')
 for o in D['openings']:
  if o['z']==z:
   out.append(f'<path d="M{o["a"][0]},{o["a"][1]} L{o["b"][0]},{o["b"][1]}" stroke="{COL[z]}" stroke-width=".6"/><path d="M{o["a"][0]},{o["a"][1]} L{o["b"][0]},{o["b"][1]}" stroke="{"#287e68" if o["kind"]=="movement" else "#268cba"}" stroke-width=".2" stroke-dasharray=".35 .2"/>')
 for ob in D['obstacles']:
  if ob['z']==z:
   out.append(f'<polygon points="{" ".join(f"{x},{y}" for x,y in ob["polygon"])}" fill="{"#6c7772" if ob["top"]-z>1.3 else "#c99159"}" stroke="#414e48" stroke-width=".14"/>')
 for v in D['views']:
  if v['feet'][2]==z:
   a,b=v['feet'],v['targetFeet'];out.append(f'<circle cx="{a[0]}" cy="{a[1]}" r=".35" fill="#1387a1"/><path d="M{a[0]},{a[1]} L{b[0]},{b[1]}" stroke="#1387a1" stroke-width=".13" stroke-dasharray=".5 .4"/>')
 for id,p in D['anchors'].items():
  if p[2]==z:out.append(f'<circle cx="{p[0]}" cy="{p[1]}" r="2" fill="none" stroke="#b0543f" stroke-width=".3"/>')
 out.append('</g>')
 def label(x,y,t,size=12):out.append(f'<text x="{ox+x*scale}" y="{oy+(86-y)*scale}" text-anchor="middle" font-size="{size}" font-weight="bold" paint-order="stroke" stroke="#f7f3e9" stroke-width="2">{esc(t)}</text>')
 overrides={'B':(52,32),'A':(87,59),'NORTH':(50,58),'WESTLEG':(44,49),'SCHOOL':(37,45),'SIGN':(83,57),'BOILERG':(58,62),'UNDER':(54,36),'EAST':(69,44),'DYE':(60,54),'POCKET':(59,51),'WELL':(51,44),'BUTCHER':(17,34.5),'CT':(74.5,80),'BOILER':(36,63)}
 for r in D['rooms']:
  if r['z']==z:
   c=Polygon(r['polygon']).centroid;x,y=overrides.get(r['id'],(c.x,c.y));label(x,y,'WORK AISLE' if r['id']=='WESTLEG' else r['name'],11 if len(r['name'])>15 else 12)
 for s in D['stairs']:
  if z in [s['low'],s['high']]:label((s['a'][0]+s['b'][0])/2+2.6,(s['a'][1]+s['b'][1])/2,s['id']+' ↑',13)
 for o in D['openings']:
  if o['z']==z:label((o['a'][0]+o['b'][0])/2+1,(o['a'][1]+o['b'][1])/2+1,o['id'],10)
 for ob in D['obstacles']:
  if ob['z']==z:
   c=Polygon(ob['polygon']).centroid;label(c.x,c.y,'COUNTER' if ob['id']=='BUTCHER-COUNTER' else ob['id'],10)
 for k in range(0,99,10):label(k,-2,str(k),11)
 for k in range(0,87,10):label(-3,k,str(k),11)
 out.append('<text x="50" y="1260" font-size="17">Floor0 / floor3.2 / floor6.4; slabs0.24. Straight stairs20×0.16 rise,0.60 tread,4 m clear,3 m landings.</text><text x="50" y="1287" font-size="17">Tall obstacles gray; low1.2 m furniture ochre. All sightline rays are predictions, not compiled evidence.</text><text x="50" y="1314" font-size="17">Full dimensions, roofs, openings, walls, view positions and journey waypoints: layout-data.json.</text><text x="50" y="1341" font-size="17">See sections C1–C9 and review-packet.md. Roof cutaways are inspection modes, not missing roofs.</text></g></svg>')
 return ''.join(out)

for z,name in [(0,'ground'),(3.2,'middle'),(6.4,'roof')]:(P/f'{name}-l01.svg').write_text(diagram(z))
(P/'layout-data.json').write_text(json.dumps(D,indent=2)+'\n')
print(json.dumps({'floors':{z:round(g.area,1) for z,g in floors.items()},'stairs':len(D['stairs']),'journeys':[(j['id'],j['polylineLength'],j['straightMotionSeconds']) for j in D['journeys']]}))
