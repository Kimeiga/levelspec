"""Reproduce the native AML blockout from the reviewed project layout.
Python 3 + shapely. The resulting level.aml is the primary editable source.
"""
from pathlib import Path
import json, math, random
from xml.etree.ElementTree import Element, SubElement, indent, tostring
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union
P=Path(__file__).parent;d=json.loads((P/'layout.json').read_text())
r=Element('architecture',version='1',id='veilcrest',name='Veilcrest · secret mountain mansion · 5v5 defuse',units='meters',validation='playable',description='Original two-site mountain estate. Upper salon, lower vault, cliff garden and diagonal drainage cut. Roofless playable rooms for review; solid library core and scenic mountain bowl. See projects/veilcrest/README.md.',**{'curve-tolerance':'.01'})
def el(tag,parent=r,**a):return SubElement(parent,tag,{k.replace('_','-'):str(v) for k,v in a.items()})
def n(v):return f'{v:.4f}'.rstrip('0').rstrip('.') if isinstance(v,float) else str(v)
def seq(v):return ' '.join(map(n,v))
def points(v):return '; '.join(seq(x) for x in v)
def prof(id,pts,**kw):return el('profile',id=id,points=points(pts),**kw)
def path(id,pts):return el('path',id=id,points=points(pts))
materials={'paving':'#b6aa8a','marble':'#d2c4a8','stone':'#9b967f','plaster':'#d2c8ad','rock':'#6c786e','slate':'#3f5a60','wood':'#886d4f','hedge':'#48664d','metal':'#657c7c','gold':'#c9a35d','tint-a':'#ce8d61','tint-b':'#75b5ba','tree':'#365a49','trunk':'#74604a','soil':'#7b8566'}
for id,col in materials.items():el('material',id=id,color=col,roughness='.9')
for f in d['floors']:prof(f['id']+'-plan',f['points'])
for b in d['boxes']:prof(b['id']+'-plan',[[b['bounds'][0],b['bounds'][1]],[b['bounds'][0]+b['bounds'][2],b['bounds'][1]],[b['bounds'][0]+b['bounds'][2],b['bounds'][1]+b['bounds'][3]],[b['bounds'][0],b['bounds'][1]+b['bounds'][3]]])
for s in d['stairs']:path(s['id']+'-axis',sorted([s['start'],s['end']],key=lambda p:p[2]))
for w in d['walls']+d['outerWalls']:path(w['id']+'-axis',[w['a'],w['b']])
a=el('assembly',id='ESTATE',label='Reviewed physical floors, walls, stairways and cover',coincident_material='retained-face')
for f in d['floors']:
 el('slab',parent=a,id=f['id'],profile=f['id']+'-plan',elevation=f['z'],thickness=f['z']+.35,material='paving' if f['z']==0 or f['id'] in ['GARDEN','REAR-COURT'] else 'marble',group='lower' if f['z']==0 else 'upper')
for b in d['boxes']:
 x,y,w,h=b['bounds'];el('box',parent=a,id=b['id'],position=seq([x,y,b['z']]),width=w,depth=h,height=b['height'],material=b['material'],group='architecture' if b['height']>6 else 'cover',label=b['role'])
for s in d['stairs']:el('stairs',parent=a,id=s['id'],path=s['id']+'-axis',width=s['width'],count=20,underside='filled',thickness='.35',material='stone',group='transfers')
for w in d['outerWalls']+d['walls']:
 el('wall',parent=a,id=w['id'],path=w['id']+'-axis',height=w['height'],thickness=w['thickness'],material='stone' if w['id'].startswith('EDGE') else 'plaster',group='walls')
 for i,(u,v) in enumerate(w['doors']):
  # The arched opening has width 5–6 m, crown 3.2 and clear shoulders ≥2.0.
  door=el('opening',id=w['id']+f'-arch-{i}',host=w['id'],shape='arch',center=seq([(u+v)/2,2.1]),width=v-u,height=4.2,mode='through',reveal_material='stone')
# A visible gabled slate roof, pilasters and sealed windows give the solid core its mansion identity.
for side,pts in [('west',[[56,64,13],[62,64,17],[62,76,17],[56,76,13]]),('east',[[62,64,17],[68,64,13],[68,76,13],[62,76,17]])]:
 prof('LIBRARY-ROOF-'+side+'-plan',pts,dimensions=3)
 el('roof',parent=a,id='LIBRARY-ROOF-'+side,profile='LIBRARY-ROOF-'+side+'-plan',thickness='.28',material='slate',playable='false',group='scenic-roofs')
for x in [57,62,66]:
 el('box',parent=a,id=f'LIBRARY-pilaster-{x}',position=seq([x,63.8,3]),width='.6',depth='.4',height=9.8,material='plaster',group='facade')
 for z in [6,10]:
  el('box',parent=a,id=f'LIBRARY-sealed-window-{x}-{z}',position=seq([x+.3,63.88,z]),width='1.5',depth='.13',height='2',material='slate',group='facade',collidable='false')
  el('box',parent=a,id=f'LIBRARY-window-sill-{x}-{z}',position=seq([x+.15,63.75,z-.15]),width='1.8',depth='.35',height='.15',material='plaster',group='facade')
el('box',parent=a,id='LIBRARY-front-cornice',position='56 63.75 12.55',width='12',depth='.5',height='.45',material='plaster',group='facade')
el('box',parent=a,id='LIBRARY-chimney',position='65 70 14',width='2',depth='2.4',height='4.5',material='stone',group='scenic-roofs')
# Slim caps remain over their wall footprints and do not create traversable extras.
for w in d['outerWalls']:
 aa=w['a'];bb=w['b'];
 if min(aa[1],bb[1])<40:continue
 top=aa[2]+w['height'];path(w['id']+'-cap-axis',[[aa[0],aa[1],top-.12],[bb[0],bb[1],top-.12]])
 el('wall',parent=a,id=w['id']+'-cap',path=w['id']+'-cap-axis',height='.18',thickness='.5',material='plaster',group='facade')
# Objective coloration partitions existing faces, without extra shells or collision.
for id,rect,elev,host,mat in [('A',[28,63,14,12],3,'SALON','tint-a'),('B',[81,49,12,14],0,'VAULT','tint-b')]:
 x,y,w,h=rect;pts=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];prof('SITE-'+id+'-plan',pts)
 el('face-material',id='SITE-'+id+'-tint',host=host,face='top',profile='SITE-'+id+'-plan',material=mat)
 vol=el('volume',id='PLANT-'+id+'-volume',profile='SITE-'+id+'-plan',elevation=elev,height='2.5',role='objective')
 el('property',parent=vol,name='site',value=id);el('property',parent=vol,name='mode',value='defuse')
# Native authored floor tops define required routes; scenic terrain and roofs remain nonplayable.
el('player',radius='.3',height='2',crouch='1.1',step='.25',slope='42',vault='0',ladder='false',rappel='false')
markers=[]
def mark(id,pos,kind,element,team=None):
 kw=dict(id=id,position=seq(pos),kind=kind,element=element,movement='land',group='lower' if pos[2]==0 else 'upper')
 if team:kw['team']=team
 el('marker',**kw);markers.append(id)
for i,(x,y) in enumerate([[58,11],[62,11],[66,11],[60,14],[68,14]]):mark('t-spawn'+('' if i==0 else '-'+str(i+1)),[x,y,0],'attacker_spawn','LOWER-ROAD','T')
for i,(x,y) in enumerate([[52,98],[54,100],[56,98],[58,100],[60,98]]):mark('ct-spawn'+('' if i==0 else '-'+str(i+1)),[x,y,3],'defender_spawn','ARRIVAL-COURT','CT')
for id,pos,element in [('site-a',[39,70,3],'SALON'),('site-b',[83,55,0],'VAULT'),('garden',[21,50,3],'GARDEN'),('hall',[54,55,3],'HALL'),('pantry',[65,49,3],'SERVICE'),('drain',[91,39,0],'DRAIN'),('court-west',[40,84,3],'REAR-COURT'),('court-east',[82,84,3],'REAR-COURT'),('orangery',[5,55,3],'ORANGERY'),('music',[20,72,3],'MUSIC-ROOM'),('library',[51,73,3],'LIBRARY'),('pump',[104,36,0],'PUMP-HOUSE'),('wine',[118,46,0],'WINE-PASSAGE'),('cellar',[112,72,0],'CELLAR-WING'),('carriage',[56,98,3],'ARRIVAL-COURT')]:mark(id,pos,'objective' if id.startswith('site-') else 'poi',element)
for s in d['stairs']:
 # Markers stay on full flat landings, not on tread nosings.
 dx=s['end'][0]-s['start'][0];dy=s['end'][1]-s['start'][1];L=math.hypot(dx,dy);nx=dx/L;ny=dy/L
 for end,base,direction,element in [('start',s['start'],-1,{'GARDEN-STAIR':'LOWER-ROAD','FRONT-STAIR':'LOWER-ROAD','SERVICE-STAIR':'SERVICE','VAULT-STAIR':'VAULT','CELLAR-STAIR':'CELLAR-WING'}[s['id']]),('end',s['end'],1,{'GARDEN-STAIR':'GARDEN','FRONT-STAIR':'FOYER','SERVICE-STAIR':'VAULT','VAULT-STAIR':'REAR-COURT','CELLAR-STAIR':'ARRIVAL-COURT'}[s['id']])]:
  mark(s['id']+'-'+end,[base[0]+direction*nx,base[1]+direction*ny,base[2]],'poi',element)
# Actual reversible shared thresholds; these establish semantic adjacency and test support.
interfaces=[('LOWER-ROAD','GARDEN-STAIR',[[16.5,28,0],[23.5,28,0]]),('GARDEN-STAIR','GARDEN',[[16.5,40,3],[23.5,40,3]]),('LOWER-ROAD','FRONT-STAIR',[[54.5,26,0],[59.5,26,0]]),('FRONT-STAIR','FOYER',[[54.5,34,3],[59.5,34,3]]),('FOYER','HALL',[[51.5,44,3],[56.5,44,3]]),('HALL','LIBRARY',[[52.5,60,3],[57.5,60,3]]),('LIBRARY','SALON',[[46,70.5,3],[46,75.5,3]]),('GARDEN','SALON',[[26.5,60,3],[31.5,60,3]]),('HALL','SERVICE',[[60,45.5,3],[60,50.5,3]]),('SERVICE','SERVICE-STAIR',[[68,46.5,3],[68,51.5,3]]),('SERVICE-STAIR','VAULT',[[78,46.5,0],[78,51.5,0]]),('LOWER-ROAD','DRAIN',[[73,25.25,0],[79,20.75,0]]),('DRAIN','VAULT',[[87.5,44,0],[92.5,44,0]]),('VAULT','VAULT-STAIR',[[79.5,68,0],[84.5,68,0]]),('VAULT-STAIR','REAR-COURT',[[78.5,80,3],[85.5,80,3]]),('SALON','REAR-COURT',[[37.5,80,3],[42.5,80,3]])]
interfaces += [('GARDEN','ORANGERY',[[10.2,51.2,3],[11.4,54.4,3]]),('ORANGERY','MUSIC-ROOM',[[8.5,64,3],[13.5,64,3]]),('MUSIC-ROOM','SALON',[[24,68.5,3],[24,73.5,3]]),('MUSIC-ROOM','NORTH-GALLERY',[[8.5,88,3],[13.5,88,3]]),('NORTH-GALLERY','ARRIVAL-COURT',[[6.5,94,3],[35.5,94,3]]),('ARRIVAL-COURT','BACK-HALL',[[54.5,94,3],[61.5,94,3]]),('BACK-HALL','REAR-COURT',[[54.5,88,3],[61.5,88,3]]),('DRAIN','PUMP-HOUSE',[[96,32.5,0],[96,41.5,0]]),('PUMP-HOUSE','WINE-PASSAGE',[[112.5,42,0],[123.5,42,0]]),('WINE-PASSAGE','CELLAR-WING',[[114.5,50,0],[119.5,50,0]]),('CELLAR-WING','VAULT',[[96,56.5,0],[96,61.5,0]]),('CELLAR-WING','CELLAR-STAIR',[[107.5,82,0],[112.5,82,0]]),('CELLAR-STAIR','ARRIVAL-COURT',[[106.5,94,3],[113.5,94,3]])]
for i,(left,right,pts) in enumerate(interfaces):
 path(f'PORTAL-{i:02}-axis',pts);el('connection',id=f'PORTAL-{i:02}',**{'from':left,'to':right,'path':f'PORTAL-{i:02}-axis'})
for aa in markers[:10]:
 for bb in ['site-a','site-b']:el('route',id=aa+'-to-'+bb,**{'from':aa,'to':bb,'max-distance':'150'})
for s in d['stairs']:el('route',id=s['id']+'-pass',**{'from':s['id']+'-start','to':s['id']+'-end','max-distance':str(math.dist(s['start'],s['end'])+5)})
el('route',id='rear-rotation',**{'from':'court-west','to':'court-east','max-distance':'60'})
for aa in markers[:5]:
 for bb in markers[5:10]:el('no-spawn-los',markers=aa+' '+bb)
# Sculpted mountain bowl: native constrained terrain with a hole for the complete estate.
play=unary_union([Polygon(x['points']) for x in d['floors']+d['stairs']]);hole=play.buffer(.8,join_style='mitre');rng=random.Random(585)
outer=[]
for i in range(40):
 t=i*math.tau/40;x=52+116*math.cos(t);y=48+105*math.sin(t);z=22+17*max(0,math.sin(t))+8*math.sin(t*3+.8)**2+5*rng.random();outer.append([round(x,3),round(y,3),round(z,3)])
terrain=prof('MOUNTAIN-BOWL-plan',outer,dimensions=3)
el('hole',parent=terrain,points=points([[x,y] for x,y in list(hole.exterior.coords)[:-1]]))
interior=[];trees=[]
for i in range(60):
 t=i*math.tau/60;rad=.65+.14*rng.random();x=52+116*rad*math.cos(t);y=48+105*rad*math.sin(t)
 if hole.distance(Point(x,y))<6:continue
 dist=hole.distance(Point(x,y));z=9+dist*.48+6*math.sin(t*4)**2+max(0,math.sin(t))*9;interior.append([round(x,3),round(y,3),round(z,3)]);trees.append((x,y,z))
terrain.set('interior',points(interior));el('terrain',id='MOUNTAIN-BOWL',profile='MOUNTAIN-BOWL-plan',material='soil',orientation='up',playable='false',collidable='false',group='scenery')
# Fill closed terrain pockets between routes as rocky hillside, isolated by real walls.
for i,loop in enumerate(play.interiors):
 pp=Polygon(loop);coords=list(loop.coords)[:-1];c=pp.representative_point();profile=prof(f'ROCK-POCKET-{i}-plan',[[x,y,-.6] for x,y in coords],dimensions=3,interior=seq([c.x,c.y,7 if pp.area>30 else 4]));el('terrain',id=f'ROCK-POCKET-{i}',profile=f'ROCK-POCKET-{i}-plan',material='rock',orientation='up',playable='false',collidable='false',group='scenery')
# Small forests stay wholly outside playable boundaries, with trunks seated into the terrain.
for i,(x,y,z) in enumerate(trees[::2]):
 h=5+rng.random()*4
 # A single terrain vertex supplies an exact seated tree location.
 el('cylinder',id=f'PINE-{i}-trunk',position=seq([round(x,3),round(y,3),round(z-.2,3)]),radius='.28',height=n(h*.65),segments=7,material='trunk',collidable='false',group='scenery')
 for j in range(2):el('cone',id=f'PINE-{i}-crown-{j}',position=seq([round(x,3),round(y,3),round(z+1+j*h*.28,3)]),radius=n(2.2-j*.4),height=n(h*.7),segments=7,material='tree',collidable='false',group='scenery')
# Optional whole-wing reachability asserts the new spaces remain joined through real thresholds.
for target in ['orangery','music','library','pump','wine','cellar']:
 el('route',id='t-to-'+target,**{'from':'t-spawn','to':target,'max-distance':'200'})
el('sky',color='#b9c7c7',intensity='.65')
indent(r,space='  ');(P/'level.aml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n'+tostring(r,encoding='unicode')+'\n')
print('Wrote',P/'level.aml')
