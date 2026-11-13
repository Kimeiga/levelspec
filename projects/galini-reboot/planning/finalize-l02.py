from pathlib import Path
import sys,json,math
sys.path.insert(0,str(Path('generated/galini-reboot-geometry-tools').resolve()))
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
B=Path('projects/galini-reboot/planning'); d=json.loads((B/'recomposition/r02.json').read_text()); out=B/'l02'
def rect(a,b,c,e):return [[a,b],[c,b],[c,e],[a,e]]
def replace(arr,id,p,index):
 for r in arr:
  if r[0]==id:r[index]=p
replace(d['masses'],'M03',[[29,29],[39,28],[41,35],[37,38],[29,37]],3)
replace(d['masses'],'M04',rect(8,38,27,58),3)
replace(d['masses'],'M06',[[18,61],[28,59],[31,64],[29,72],[20,71]],3)
replace(d['masses'],'M11',rect(77,29,95,42),3)
replace(d['masses'],'M17',[[113,86],[125,86],[127,98],[118,101],[113,97]],3)
replace(d['floorIntent'],'E4S',[[94,65],[108,64],[114,68],[126,70],[128,85],[117,91],[93,89],[90,83],[91,74]],3)
replace(d['floorIntent'],'W4L',[[24,43],[31,43],[34,48],[35,55],[29,58],[24,58],[19,62],[15,66],[11,64],[14,56],[22,52],[24,48]],3)
replace(d['floorIntent'],'W4P',[[30,48],[34,44],[35,40],[38,40],[38,44],[42,44],[44,46],[49,49],[53,54],[53,63],[53,70],[50,77],[44,78],[38,75],[37,69],[37,62],[31,60],[28,54]],3)
replace(d['floorIntent'],'E4L',[[90,34],[95,34],[95,39],[99,39],[100,47],[94,49],[90,43]],3)
d['floorIntent'] += [['E4R','Grocer / cart-road upper street',4,[[124,51],[133,51],[133,65],[125,71],[113,74],[113,67],[121,65],[126,61]]],['E8BL','Bell stair top porch',8,rect(110,77,114,82)]]
replace(d['interiors'],'I03',[[20,43],[27,43],[27,58],[15,58],[15,55],[25,55],[25,46],[20,46]],3)
replace(d['interiors'],'I04',[[29,53],[39,53],[39,57],[43,57],[43,61],[35,61],[35,57],[29,57]],3)
replace(d['interiors'],'I07',rect(90,34,95,42),3)
replace(d['interiors'],'I09',rect(78.45,49.45,94.55,63.55),3)
replace(d['interiors'],'I10',[[95,67],[113,67],[113,71],[110,71],[110,81],[113,81],[113,86],[99,86],[99,89],[95,89]],3)
for s in d['stairs']:
 if s[0]=='S2b':s[2]=[44,42,2];s[3]=[38,42,4]
 if s[0]=='S8a':s[2]=[114,79,8];s[3]=[120,79,6]
 if s[0]=='S8b':s[2]=[122,77,6];s[3]=[122,71,4]
replace(d['landings'],'L2',rect(44,40,49,44),2)
replace(d['landings'],'L8',rect(120,77,124,81),2)
d['stairVoids'].append(['H-B',8,rect(114,77,124,81)])
d['ramp']={'id':'R6','name':'Customs cart road','path':[[126,30,0],[130,40,2],[130,44,2],[129,54,4]],'width':5,'middleLanding':'LR6','kind':'two planar ramp runs with a level turning court; no stair nosing'}
def ribbon(a,b,w):
 dx=b[0]-a[0];dy=b[1]-a[1];dist=math.hypot(dx,dy); nx=-dy/dist*w/2;ny=dx/dist*w/2
 return [[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny]]
ramps=[]
for id,a,b in [('R6a',d['ramp']['path'][0],d['ramp']['path'][1]),('R6b',d['ramp']['path'][2],d['ramp']['path'][3])]:
 ramps.append({'id':id,'a':a,'b':b,'width':5,'p':ribbon(a,b,5),'slopeDegrees':math.degrees(math.atan2(b[2]-a[2],math.hypot(b[0]-a[0],b[1]-a[1]))),'guardHeight':1.1,'headroom':'Open sky'})
p=ramps[0]['p'];q=ramps[1]['p'];d['landings'].append(['LR6',2,[p[3],p[2],q[1],q[0]]])
def endlanding(a,b,w,top,depth=3):
 dx=b[0]-a[0];dy=b[1]-a[1];ll=math.hypot(dx,dy);tx=dx/ll;ty=dy/ll;c=b if top else a; sign=1 if top else -1
 return ribbon(c,[c[0]+sign*depth*tx,c[1]+sign*depth*ty,c[2]],w)
# Only open-end landings; turn platforms already have explicit polygons.
for sid,top in [('S1a',False),('S1b',True),('S2a',False),('S2b',True),('S3a',False),('S3b',True),('S4a',False),('S4b',True),('S5a',False),('S5b',True),('S7a',False),('S7b',True),('S8a',False),('S8b',True)]:
 s=next(v for v in d['stairs'] if v[0]==sid);z=s[3][2] if top else s[2][2]
 d['landings'].append([f'END-{sid}',z,endlanding(s[2],s[3],s[4],top)])
for r,top in [(ramps[0],False),(ramps[1],True)]:d['landings'].append([f'END-{r["id"]}',r['b'][2] if top else r['a'][2],endlanding(r['a'],r['b'],5,top)])
# Entrances cut through actual exterior walls. Channels include only wall thickness.
doors=[
 ('D01','M04','I01',0,[8,43],[8,47],3),('D02','M04','I02',0,[15,44],[15,48],3),
 ('D03','M04','I03',4,[27,44],[27,48],3),('D04','M04','I03',4,[15,58],[18,58],3),
 ('D05','M05','I04',4,[29,53],[29,57],3),('D06','M05','I04',4,[43,57],[43,61],3),
 ('D07','M08','I05',4,[48,72],[48,76],3),('D08','M08','I06',8,[32,79],[32,83],3),
 ('D09','M11','I07',4,[95,35],[95,39],3),('D10','M11','I07',4,[91,42],[94,42],3),
 ('D11','M12','I08',0,[113,22],[113,26],3),('D12','M12','I08',0,[119,29],[123,29],3),
 ('D13','M13','I09',4,[78,56],[78,62],3),('D14','M13','I09',4,[95,51],[95,55],3),('D15','M13','I09',4,[90,64],[94,64],3),
 ('D16','M14','I10',4,[106,67],[110,67],3),('D17','M14','I10',4,[95,82],[95,86],3),('D18','M14','I10',4,[113,82],[113,86],3),
 ('D19','M14','I11',8,[101,89],[105,89],3),('D20','M14','I11',8,[100,67],[104,67],3),
 ('D23','M14','I11',8,[113,77],[113,81],3),
 ('D21','M16','I12',8,[76,92],[76,98],4),('D22','M16','I12',8,[89,92],[89,98],4),
]
doors=[dict(zip(['id','building','interior','z','a','b','clearHeight'],x),width=math.dist(x[4],x[5]),movement=True) for x in doors]
obstacles=[{'id':'O01','name':'Cistern rim','z':8,'height':1.2,'p':rect(29,99,33,100.2),'role':'Crouch preparation north of A, with open flanks'}, {'id':'O02','name':'Boat bench','z':0,'height':1.2,'p':rect(104,27,108,28.2),'role':'Conditional ground crouch cover; upper descents can see behind it'}, {'id':'O03','name':'Taverna return','z':4,'height':3,'p':rect(85.5,55,85.95,63.55),'role':'Requires moving south of the tip before seeing the two east-district departures'}]
obstacles += [{'id':'O04','name':'School colonnade west pier','z':4,'height':3.7,'p':rect(114.2,84.2,114.8,84.8),'role':'Supports the occupied +8 terrace over the lower public arcade'}, {'id':'O05','name':'School colonnade east pier','z':4,'height':3.7,'p':rect(124.2,84.2,124.8,84.8),'role':'Supports the occupied +8 terrace over the lower public arcade'}]
windows=[{'id':'W02','name':'Civic bridge bounded observation','z':8,'a':[59,87.5],'b':[62,87.8],'sill':1.1,'head':2.1,'wallHeight':2.4,'observer':[60.5,88.6,8],'target':[60.5,59,4],'movement':False}, {'id':'W03','name':'School balcony observation','z':8,'a':[104,63],'b':[107,63],'sill':1.1,'head':2.1,'wallHeight':2.4,'observer':[105.5,63.6,8],'target':[106,57,4],'movement':False}]
stairs=[]
for id,name,a,b,width in d['stairs']:
 stairs.append({'id':id,'name':name,'a':a,'b':b,'width':width,'p':ribbon(a,b,width),'risers':10,'riser':.2,'goings':9,'going':math.dist(a[:2],b[:2])/9,'guardHeight':1.1,'guardThickness':.2,'support':'Solid masonry infill / stair-side envelope; space below the flights is not a route','ceiling':'Open stairwell to roof at least 3 m above upper arrival for indoor stairs; open sky for civic and store-edge flights'})
# Architectural roof schedules. Floor 4/8 are separately occupied where listed, never inferred scenic roofs.
roofExtra={'M04':8.2,'M08':8.2,'M11':8.2,'M14':8.2,'M16':6.5,'M07':6.7}
buildings=[{'id':id,'name':name,'base':z,'p':p,'wallThickness':.45,'eaves':z+roofExtra.get(id,5.8),'ridge':z+roofExtra.get(id,5.8)+1.5,'roof':'complete pitched masonry/plaster building; shape follows occupied footprint','roofWalkable':False} for id,name,z,p in d['masses']]
# Normalized actual flat floor boundaries: retain union components and holes, subtract scenic solids,
# then add declared interior floors and door channels, and cut all stair/ramp footprints from flat floors.
flat=[]
channels=[]
for door in doors:
 if door['building']=='M13':
  channel=LineString([door['a'],door['b']]).buffer(.5,cap_style=2)
  channels.append((door['z'],channel))
for z in [0,2,4,6,8]:
 items=[Polygon(p) for _,_,fz,p in d['floorIntent'] if fz==z]+[Polygon(p) for _,fz,p in d['landings'] if fz==z]
 shape=unary_union(items) if items else Polygon()
 solid=unary_union([Polygon(b['p']) for b in buildings if z<b['eaves']])
 shape=shape.difference(solid)
 interiors=[Polygon(p) for _,_,iz,p in d['interiors'] if iz==z]
 shape=unary_union([shape,*interiors,*[Polygon(p) for _,lz,p in d['landings'] if lz==z],*[p for cz,p in channels if cz==z]])
 # A lower scenic solid cannot become an accidental walk-under below a supported stair.
 cuts=[Polygon(s['p']) for s in stairs if z<=max(s['a'][2],s['b'][2])]+[Polygon(r['p']) for r in ramps if z<=max(r['a'][2],r['b'][2])]
 shape=shape.difference(unary_union(cuts))
 shape=shape.difference(unary_union([Polygon(p) for _,hz,p in d['stairVoids'] if hz==z]))
 shape=shape.difference(unary_union([Polygon(o['p']) for o in obstacles if o['z']==z]))
 if not shape.is_valid:shape=shape.buffer(0)
 parts=list(shape.geoms) if shape.geom_type=='MultiPolygon' else [shape]
 for i,p in enumerate(parts):
  if p.is_empty or p.area<.5:continue
  flat.append({'id':f'F{z:02}-{i+1:02}','z':z,'p':[list(v) for v in list(p.exterior.coords)[:-1]],'holes':[[list(v) for v in list(h.coords)[:-1]] for h in p.interiors],'area':p.area})
# Each boundary is a wall/guard unless a declared movement interface reaches it.
boundaries=[]
endpointLines=[]
for s in stairs+ramps:
 for k,end in enumerate([s['a'],s['b']]):
  poly=s['p'];a,b=(poly[0],poly[1]) if k==0 else (poly[3],poly[2]);endpointLines.append((end[2],LineString([a,b]),s['id']))
for f in flat:
 for ringIndex,ring in enumerate([f['p'],*f['holes']]):
  for i,a in enumerate(ring):
   b=ring[(i+1)%len(ring)];ls=LineString([a,b]);mid=ls.interpolate(.5,normalized=True)
   moves=[id for z,ln,id in endpointLines if z==f['z'] and ln.distance(mid)<.03]
   moves += [q['id'] for q in doors if q['z']==f['z'] and LineString([q['a'],q['b']]).distance(mid)<.05]
   indoor=next((bl for bl in buildings if bl['base']<=f['z'] and Polygon(bl['p']).buffer(.01).contains(mid)),None)
   stairEdge=any(Polygon(s['p']).boundary.distance(mid)<.03 for s in stairs)
   kind='movement interface' if moves else 'stair-side / open-well guard' if stairEdge else 'interior full-height wall' if indoor else 'retaining crest / parapet'
   interiorClear=next((3.7 if ii[0] in ['I01','I10'] else 4 if ii[0]=='I12' else 3.2 for ii in d['interiors'] if ii[2]==f['z'] and Polygon(ii[3]).buffer(.02).contains(mid)),3.2)
   h=0 if moves else 1.1 if stairEdge or not indoor else interiorClear
   # Positive windows are deliberately bounded, not the whole upper edge.
   if not indoor and f['z']==8 and ((54<=mid.x<=76 and 86.5<=mid.y<=92.1) or (98<=mid.x<=111 and abs(mid.y-63)<.03)):h=2.4
   boundaries.append({'id':f'B-{f["id"]}-{ringIndex}-{i+1}','floor':f['id'],'z':f['z'],'a':a,'b':b,'kind':kind,'height':h,'thickness':.35 if not indoor else .45,'openings':moves,'baseSupport':-6 if not indoor else f['z']-.3})
walls=[]
for b in buildings:
 for i,a in enumerate(b['p']):
  end=b['p'][(i+1)%len(b['p'])];ln=LineString([a,end])
  ds=[q['id'] for q in doors if q['building']==b['id'] and ln.distance(Point(q['a']))<.01 and ln.distance(Point(q['b']))<.01]
  walls.append({'id':f'WX-{b["id"]}-{i+1}','building':b['id'],'a':a,'b':end,'base':-6,'top':b['eaves'],'thickness':.45,'doors':ds,'role':'Complete exterior shell / foundation, with explicit door voids only'})
walls.append({'id':'WI-M04-01','building':'M04','a':[15,41],'b':[15,55],'base':0,'top':3.7,'thickness':.35,'doors':['D02'],'role':'Undercroft / stair-room partition'})
for edge in boundaries:
 edge['observationOpenings']=[w['id'] for w in windows if edge['z']==w['z'] and LineString([edge['a'],edge['b']]).intersection(LineString([w['a'],w['b']]).buffer(.015,cap_style=2)).length>.05]

packet={'revision':'L02','status':'Developed prediction, awaiting independent strategy and local visibility review; no AML','selected':'R02 contour-town recomposition of Ravine Quarter','units':'meters, Z-up, north +Y','body':{'radius':.3,'height':1.8,'crouch':1.1,'step':.3,'slope':42,'standingEye':1.674,'crouchEye':1.023,'walkSpeed':3.4},'flatFloors':flat,'floorIntent':d['floorIntent'],'buildings':buildings,'interiors':[{'id':id,'name':name,'z':z,'p':p,'ceiling':z+(3.7 if id in ['I01','I10'] else 4 if id=='I12' else 3.2)} for id,name,z,p in d['interiors']],'stairs':stairs,'landings':[{'id':id,'z':z,'p':p} for id,z,p in d['landings']],'ramps':ramps,'stairVoids':[{'id':id,'z':z,'p':p} for id,z,p in d['stairVoids']],'doors':doors,'obstacles':obstacles,'windows':windows,'boundaries':boundaries,'walls':walls,'places':d['places'],'spawns':[{'id':'T','z':0,'positions':[[10,23],[12,23],[14,23],[16,23],[14,25]]},{'id':'CT','z':8,'positions':[[102,104],[104,104],[106,104],[108,104],[106,106]]}],'objectiveFootprints':[{'id':'A','z':8,'p':rect(29,92,35,98)},{'id':'B','z':0,'p':rect(105,18,111,24)}],'limits':['All visibility is predicted; no raycast, collision, navigation or timing acceptance.','Unlisted facade openings are closed/scenic. Roofs are complete and nonwalkable.','Scenic cliff/sea/ravine have no playable routes. Ravine bed -6 m; bridges require full abutments and piers/arches.','Ballistic protection, destruction, utility, sound and target-engine rules remain unavailable.'],'removedIncidentalGeometry':['Unconnected 0.4 m² residual triangle at (31,60,+4) is scenic, not a movement promise.'], 'retired':['L01 terrace-band layout and all its route predictions','W01 Laundry observation window; changed Laundry composition invalidated its location. W03 now supplies a different upper/lower information relationship.']}
(out/'layout.json').write_text(json.dumps(packet,indent=2)+'\n')
print('L02:',len(flat),'flat floor pieces,',len(boundaries),'explicit boundary segments,',len(doors),'movement openings.')
