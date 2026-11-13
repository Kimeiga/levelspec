"""Project-local native AML assembly recipe. layout-data.json retains reviewed dimensions."""
from pathlib import Path
import json, xml.etree.ElementTree as ET
p=Path(__file__).parent;d=json.loads((p/'layout-data.json').read_text())
root=ET.Element('architecture',{'version':'1','id':'blackglass','name':'Blackglass · Cliffside Array','units':'meters','validation':'playable','description':'L05 / R04: original 5v5 CT/T two-site defusal blockout. High-tech villain lair on a steep mountain. Reactor+12, suspended Data Vault0, CT operations+6. Gameplay integration and playtesting pending.'})
def add(parent,tag,**attrs):return ET.SubElement(parent,tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
def vec(xs):return ' '.join(f'{x:g}' for x in xs)
materials={'deck':'#a5b8c4','shell':'#cbd5db','steel':'#3d586b','dark':'#1c3346','cyan':'#4ad8dc','orange':'#eaaa57','low':'#77aab8','rock':'#54606b','rock-light':'#75818b','snow':'#dce6eb','plant-a':'#edb363','plant-b':'#7cd8cc'}
for i,c in materials.items():add(root,'material',id=i,color=c,roughness=.7,metalness=.25 if i in ['steel','dark'] else 0)
physical=add(root,'assembly',id='facility',label='Physical cliffside facility',coincident_material='retained-face')
scenery=add(physical,'assembly',id='mountain',label='Nonplayable mountain and structural supports',coincident_material='retained-face')
# Every profile, path, floor, threshold, and fixture retains a stable authored ID.
def profile(i,b):
 x1,y1,x2,y2=b;add(root,'profile',id=i,points='; '.join(vec(v) for v in [(x1,y1),(x2,y1),(x2,y2),(x1,y2)]))
def box(i,b,z,h,mat='shell',parent=physical,**extra):
 x1,y1,x2,y2=b;return add(parent,'box',id=i,position=vec((x1,y1,z)),width=x2-x1,depth=y2-y1,height=h,material=mat,**extra)
def wall(i,a,b,h=5.2,mat='shell',parent=physical,thick=.3):
 add(root,'path',id=i+'-axis',points=vec(a)+'; '+vec(b));add(parent,'wall',id=i,path=i+'-axis',thickness=thick,height=h,material=mat)
rooms={r['id']:r for r in d['rooms']}
for r in d['rooms']:
 i=r['id'];b=r['bounds'];z=r['z'];profile(i+'-plan',b)
 add(physical,'slab',id='floor-'+i,label=r['name'],profile=i+'-plan',elevation=z,thickness=.8 if i=='Q' else .35,material='deck' if i not in ['A','B'] else 'steel',playable='true')
 # Roof only the two protected spawn rooms; other spaces remain reviewable open sections.
 if i in ['T','R']:
  add(physical,'roof',id='roof-'+i,profile=i+'-plan',elevation=z+4.55,thickness=.35,material='steel',playable='false')
# Exact room-boundary door intervals; stairs use full footprint width at their ends.
openings={i:[] for i in rooms}
for portal in d['doors']:
 x,y,z=portal['center'];w=portal['width'];axis=portal['axis'];a= (x,y-w/2) if axis=='y' else (x-w/2,y);b=(x,y+w/2) if axis=='y' else(x+w/2,y)
 for i in [portal['from'],portal['to']]:openings[i].append((a,b,0,3.6,portal['id']))
 add(root,'path',id='portal-'+portal['id'],points=vec((*a,z))+'; '+vec((*b,z)))
 add(root,'connection',id='connection-'+portal['id'],**{'from':'floor-'+portal['from'],'to':'floor-'+portal['to']},path='portal-'+portal['id'])
for s in d['stairs']:
 x1,y1,x2,y2=s['bounds']
 openings[s['from']].append(((x1,y1),(x2,y1),0,3.6,s['id']+'-in'))
 openings[s['to']].append(((x1,y2),(x2,y2),0,3.6,s['id']+'-out'))
openings['B'].append(((2,59),(2,66),1.1,3.2,'B-window'))
openings['A'].append(((72,63),(72,72),1.1,3.2,'A-window'))
for r in d['rooms']:
 i=r['id'];x1,y1,x2,y2=r['bounds'];z=r['z']
 edges=[((x1,y1),(x2,y1)),((x2,y1),(x2,y2)),((x1,y2),(x2,y2)),((x1,y1),(x1,y2))]
 for j,(a,b) in enumerate(edges):
  axis=0 if a[1]==b[1] else 1;fixed=1-axis;start=a[axis];end=b[axis];cuts=[]
  for aa,bb,lo,hi,oid in openings[i]:
   if aa[fixed]==a[fixed] and bb[fixed]==a[fixed] and start<=aa[axis]<bb[axis]<=end:cuts.append((aa[axis],bb[axis],lo,hi,oid))
  cuts.sort();cursor=start;part=0
  def partwall(t0,t1,bottom,top,suffix):
   if t1-t0<.001 or top-bottom<.001:return
   aa=[a[0],a[1],z+bottom];bb=[b[0],b[1],z+bottom];aa[axis]=t0;bb[axis]=t1
   wall(f'{i}-wall-{j}-{suffix}',aa,bb,top-bottom)
  for low,high,sill,head,oid in cuts:
   partwall(cursor,low,0,5.2,f'{part}-solid');partwall(low,high,0,sill,f'{part}-sill');partwall(low,high,head,5.2,f'{part}-head');cursor=high;part+=1
  partwall(cursor,end,0,5.2,f'{part}-solid')
# Native stairs with actual horizontal treads. Screens follow the rise, not a horizontal bounding box.
for s in d['stairs']:
 i=s['id'];x1,y1,x2,y2=s['bounds'];z0=s['z0'];z1=s['z1'];cx=(x1+x2)/2
 add(root,'path',id=i+'-axis',points=vec((cx,y1,z0))+'; '+vec((cx,y2,z1)))
 add(physical,'stairs',id=i,path=i+'-axis',width=x2-x1,count=30,thickness=.35,underside='sloped',material='steel')
 for side,xx in [('west',x1),('east',x2)]:wall(i+'-'+side,(xx,y1,z0),(xx,y2,z1),5.2 if i=='S1' and side=='west' else 3.4,'shell',thick=.3)
 for ending,yy,zz,room in [('in',y1,z0,s['from']),('out',y2,z1,s['to'])]:
  add(root,'path',id=i+'-'+ending+'-portal',points=vec((x1,yy,zz))+'; '+vec((x2,yy,zz)))
  add(root,'connection',id=i+'-'+ending,**{'from':'floor-'+room if ending=='in' else i,'to':i if ending=='in' else 'floor-'+room},path=i+'-'+ending+'-portal')
# Individually named gameplay fixtures; decorative details stay inside their occupied bounds.
for o in d['obstacles']:
 i=o['id'];b=o['bounds'];z=o['base'];h=o['height'];mat='low' if h<1.5 else'dark'
 if i=='A-reactor':
  add(physical,'cylinder',id=i,position='60 68 12',radius=3.4,height=5,segments=24,material='dark')
  add(physical,'cylinder',id=i+'-cap',position='60 68 17',radius=3.4,height=.25,segments=24,material='orange')
  for j,zz in enumerate([12.7,15.9]):add(physical,'cylinder',id=i+f'-ring-{j}',position=vec((60,68,zz)),radius=3.42,height=.16,segments=24,material='cyan')
 else:
  box(i,b,z,h,mat)
  x1,y1,x2,y2=b
  box(i+'-status',(x1+.08,y1-.018,x2-.08,y1+.02),z+h-.24,.12,'cyan',collidable='false')
# Clear safety glazing: explicit optical/physics split, no claim of bullet/glass mechanics.
box('B-window-safety',(1.97,59,2.03,66),1.1,2.1,'cyan',visible='false',collidable='true')
box('A-window-safety',(71.97,63,72.03,72),13.1,2.1,'cyan',visible='false',collidable='true')
for label,xx,yy1,yy2,zz in [('B',2,59,66,0),('A',72,63,72,12)]:
 for k,yy in enumerate([yy1,yy2]):box(label+f'-window-frame-{k}',(xx-.22,yy-.12,xx+.22,yy+.12),zz+1.1,2.1,'steel')
 box(label+'-window-band',(xx-.21,yy1,xx+.21,yy2),zz+3.2,.12,'cyan')
# Plant markings are render face partitions, without extra collision shells.
for i,b in [('A',(63.5,63,69,69)),('B',(5,60.5,10.5,66))]:
 profile('plant-'+i+'-plan',b);add(root,'face-material',id='plant-'+i,host='floor-'+i,face='top',profile='plant-'+i+'-plan',material='plant-'+i.lower())
# Repeating facade fins and conduits: integral to occupied exterior faces, no corridor intrusion.
for i,x,ya,yb,z in [('B',2,53,71,0),('A',72,59,77,12)]:
 for k,y in enumerate(range(ya,yb,4)):box(i+f'-fin-{k}',(x-.42,y,x+.42,y+.35),z-.35,5.55,'steel')
 box(i+'-lightline',(x-.19,ya,x+.19,yb),z+4.5,.13,'cyan')
# Main mountain extrusion behind the lair. In XZ, its top remains below A/command floors until X72.
sections=[
 ('south',20,42,[(66,-36),(66,-6),(74,9),(82,26),(96,40),(113,55),(126,46),(126,-40)],'rock-light'),
 ('central',65,45,[(66,-36),(66,7),(72,10),(78,25),(90,42),(106,58),(122,61),(126,-40)],'rock'),
 ('north',110,45,[(66,-36),(66,7),(72,10),(80,28),(92,48),(110,60),(126,51),(126,-40)],'rock-light')]
for tag,yy,length,section,mat in sections:
 add(root,'profile',id='rock-'+tag+'-section',points='; '.join(vec(v) for v in section))
 add(scenery,'extrusion',id='mountain-'+tag,profile='rock-'+tag+'-section',distance=length,position=vec((0,yy,0)),rotation='90 0 0',material=mat)
# Rock shelves actually receive upper-room slabs; the data vault remains cantilevered.
for tag,b,z in [('reactor',(48,58,72,78),11.65),('command',(48,84,70,96),11.65),('heat',(48,36,64,46),5.65)]:
 box('rock-shelf-'+tag,b,-36,z+36,'rock',scenery)
# Valley bed and fins are far below occupied decks; upper decks visibly cantilever out over them.
box('ravine-bed',(-25,-20,66,112),-38,2,'rock',scenery)
for j,(x,y,z) in enumerate([(6,55,0),(6,69,0),(23,55,0),(23,69,0),(12,4,0),(34,4,0),(31,38,6),(46,48,6),(49,60,12),(70,76,12),(28,74,6),(42,74,6)]):
 box(f'foundation-{j}',(x-.7,y-.7,x+.7,y+.7),-36,z+35.65,'steel',scenery)
 # Beam cap at deck underside connects the pair to deck without a floating joint.
 box(f'foundation-cap-{j}',(x-1,y-1,x+1,y+1),z-.65,.3,'steel',scenery)
# Scenographic comms spire and turbine stack, inaccessible beyond eastern retaining mass.
box('spire-base',(77,75,85,83),22,6,'dark',scenery)
add(scenery,'cylinder',id='comms-spire',position='81 79 28',radius=1.25,height=25,segments=12,material='steel')
add(scenery,'cone',id='comms-crown',position='81 79 48',radius=5,top_radius=1.3,height=3,segments=12,material='dark')
add(scenery,'cylinder',id='comms-signal',position='81 79 53',radius=.35,height=4,segments=8,material='cyan')
for j,yy in enumerate([28,40]):
 add(scenery,'cylinder',id=f'turbine-stack-{j}',position=vec((76,yy,18)),radius=2.4,height=9,segments=16,material='steel')
 add(scenery,'cylinder',id=f'turbine-stack-rim-{j}',position=vec((76,yy,26.7)),radius=2.6,height=.4,segments=16,material='cyan')
add(root,'player',radius=.3,height=1.8,step=.25,slope=42,crouch=1.1,vault=0,rappel='false',ladder='false')
# Room markers use intentional clear supports, rather than obstructed equipment centers.
points={'T':(22,6,0),'F':(18,16,0),'C':(37,19,0),'E':(54,19,0),'P':(14,32,0),'L':(22,34,0),'K':(12,48,0),'PC':(20,50,0),'B':(8,63,0),'M':(35,44,6),'H':(57,42,6),'Q':(25,40,6),'D':(39,52,6),'J':(29,59,0),'W':(35,66,6),'R':(35,75,6),'U':(29,87,6),'V':(17,87,6),'N':(29,81,6),'I':(42,93,12),'CT':(58,89,12),'A':(65,66,12),'AW':(46,75,12),'AC':(60,81,12)}
for i,xyz in points.items():
 kind='attacker_spawn' if i=='T' else 'defender_spawn' if i=='R' else 'objective' if i in ['A','B'] else 'poi'
 add(root,'marker',id='point-'+i,label=rooms[i]['name'],position=vec(xyz),kind=kind,element='floor-'+i,movement='land')
for i,(x,y) in enumerate([(15,4),(29,4),(15,8),(29,8)],2):add(root,'marker',id=f'T-spawn-{i}',position=vec((x,y,0)),kind='attacker_spawn',element='floor-T',movement='land')
for i,(x,y) in enumerate([(32,74),(38,74),(32,76),(38,76)],2):add(root,'marker',id=f'CT-spawn-{i}',position=vec((x,y,6)),kind='defender_spawn',element='floor-R',movement='land')
# Flat edge checks bound local shortest paths; stair checks have close endpoint markers.
for a,b in d['flat_links']:add(root,'route',id='door-'+a+'-'+b,**{'from':'point-'+a,'to':'point-'+b},min_routes=1,max_distance=45,movement='land')
for s in d['stairs']:
 i=s['id'];x1,y1,x2,y2=s['bounds'];x=(x1+x2)/2
 for end,yy,zz,rid in [('foot',y1-.7,s['z0'],s['from']),('head',y2+.7,s['z1'],s['to'])]:add(root,'marker',id=i+'-'+end,position=vec((x,yy,zz)),kind='poi',element='floor-'+rid,movement='land')
 add(root,'route',id=i+'-traverse',**{'from':i+'-foot','to':i+'-head'},min_routes=1,max_distance=19,movement='land')
for i,a,b,limit in [('T-A','T','A',160),('T-B','T','B',110),('CT-A','R','A',110),('CT-B','R','B',100),('A-B','A','B',155),('Mid-B','M','B',65),('Mid-A','M','A',85)]:add(root,'route',id=i,**{'from':'point-'+a,'to':'point-'+b},min_routes=1,max_distance=limit,movement='land')
add(root,'no-spawn-los',markers='point-T point-R')
ET.indent(root,space='  ');ET.ElementTree(root).write(p/'level.aml',encoding='utf-8',xml_declaration=True)
print('Authored',len(list(root.iter())),'native XML elements')
