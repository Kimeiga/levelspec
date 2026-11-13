"""Draw the reviewable spatial proposal; AML is the editable delivery source.
Authoring helper only: Python 3 + shapely. Writes layout.json and layout.svg.
"""
from pathlib import Path
import json, math
from shapely.geometry import Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).parent

def rect(x,y,w,d): return [[x,y],[x+w,y],[x+w,y+d],[x,y+d]]
floors=[
 dict(id='LOWER-ROAD',z=0,points=[[54,8],[76,8],[80,12],[80,20],[72,26],[62,26],[54,26],[40,28],[22,30],[16,28],[14,24],[18,18],[40,16],[54,18]],label='COVERT ROAD / +0',labelAt=[61,13]),
 dict(id='GARDEN',z=3,points=[[12,40],[34,40],[34,60],[24,60],[12,56],[9,48]],label='CLIFF GARDEN / +3',labelAt=[23,43]),
 dict(id='FOYER',z=3,points=[[48,34],[65,34],[65,40],[60,44],[48,44]],label='FOYER / +3',labelAt=[56,37]),
 dict(id='HALL',z=3,points=rect(38,44,22,16),label='GREAT HALL / +3',labelAt=[49,55]),
 dict(id='SALON',z=3,points=rect(24,60,22,20),label='A / SALON +3',labelAt=[35,76]),
 dict(id='SERVICE',z=3,points=rect(60,44,8,8),label='PANTRY',labelAt=[64,49]),
 dict(id='DRAIN',z=0,points=[[72,26],[80,20],[84,24],[96,32],[96,44],[86,44],[86,36],[78,30]],label='DRAIN / +0',labelAt=[91,39]),
 dict(id='VAULT',z=0,points=rect(78,44,18,24),label='B / VAULT +0',labelAt=[87,63]),
 dict(id='ORANGERY',z=3,points=[[-10,48],[9,48],[12,56],[24,60],[24,64],[0,64],[-10,58]],label='ORANGERY / +3',labelAt=[2,55]),
 dict(id='MUSIC-ROOM',z=3,points=[[0,64],[24,64],[24,88],[6,88],[-4,82],[-4,70]],label='MUSIC ROOM / +3',labelAt=[10,84]),
 dict(id='NORTH-GALLERY',z=3,points=rect(6,88,30,6),label='WEST GALLERY',labelAt=[20,92]),
 dict(id='LIBRARY',z=3,points=rect(46,60,32,20),label='LIBRARY / +3',labelAt=[62,78]),
 dict(id='PUMP-HOUSE',z=0,points=[[96,30],[116,30],[124,38],[124,42],[96,42]],label='PUMP HOUSE / +0',labelAt=[103,34]),
 dict(id='WINE-PASSAGE',z=0,points=rect(112,42,12,8),label='WINE PASSAGE',labelAt=[118,47]),
 dict(id='CELLAR-WING',z=0,points=rect(96,50,28,32),label='CELLAR WING / +0',labelAt=[110,79]),
 dict(id='BACK-HALL',z=3,points=rect(54,88,8,6),label='REAR HALL',labelAt=[58,92]),
 dict(id='ARRIVAL-COURT',z=3,points=rect(6,94,108,8),label='CT / CARRIAGE COURT +3',labelAt=[63,100]),
 dict(id='REAR-COURT',z=3,points=rect(36,80,50,8),label='STAFF COURT / +3',labelAt=[61,85])]
stairs=[dict(id='GARDEN-STAIR',start=[20,28,0],end=[20,40,3],width=8),dict(id='FRONT-STAIR',start=[57,26,0],end=[57,34,3],width=6),dict(id='SERVICE-STAIR',start=[68,49,3],end=[78,49,0],width=6),dict(id='VAULT-STAIR',start=[82,68,0],end=[82,80,3],width=8),dict(id='CELLAR-STAIR',start=[110,82,0],end=[110,94,3],width=8)]
for s in stairs:
 x,y,z=s['start']; a,b,c=s['end']; dx=a-x;dy=b-y;length=math.hypot(dx,dy);nx=-dy/length*s['width']/2;ny=dx/length*s['width']/2
 s['points']=[[x+nx,y+ny],[x-nx,y-ny],[a-nx,b-ny],[a+nx,b+ny]]
# Local walls carry real opening locations. Arches have 4.2 m clear central height.
walls=[dict(id='A-WEST',a=[24,60,3],b=[24,80,3],height=4.8,thickness=.5,doors=[[8,14]]),dict(id='MUSIC-SOUTH',a=[0,64,3],b=[24,64,3],height=4.8,thickness=.5,doors=[[8,14]]),dict(id='MUSIC-NORTH',a=[6,88,3],b=[24,88,3],height=4.8,thickness=.5,doors=[[2,8]]),dict(id='B-EAST',a=[96,44,0],b=[96,68,0],height=5,thickness=.5,doors=[[12,18]]),dict(id='CELLAR-SOUTH',a=[96,50,0],b=[124,50,0],height=5,thickness=.5,doors=[[18,24]]),dict(id='CELLAR-NORTH',a=[96,82,0],b=[124,82,0],height=7,thickness=.5,doors=[[11,17]]),dict(id='LIBRARY-SOUTH',a=[46,60,3],b=[78,60,3],height=7,thickness=.5,doors=[[6,12]]),dict(id='LIBRARY-WEST',a=[46,60,3],b=[46,80,3],height=7,thickness=.5,doors=[[10,16]]),dict(id='LIBRARY-NORTH',a=[46,80,3],b=[78,80,3],height=7,thickness=.5,doors=[]),dict(id='LIBRARY-EAST',a=[78,60,-.45],b=[78,80,-.45],height=10.45,thickness=.5,doors=[]),dict(id='A-SOUTH',a=[24,60,3],b=[46,60,3],height=4.8,thickness=.5,doors=[[2,8]]),dict(id='A-NORTH',a=[24,80,3],b=[46,80,3],height=4.8,thickness=.5,doors=[[13,19]]),dict(id='HALL-FOYER',a=[48,44,3],b=[60,44,3],height=4.8,thickness=.45,doors=[[3,9]]),dict(id='HALL-PANTRY',a=[60,44,3],b=[60,52,3],height=4.8,thickness=.45,doors=[[1,7]]),dict(id='B-WEST',a=[78,44,0],b=[78,68,0],height=7,thickness=.5,doors=[[2,8]]),dict(id='B-SOUTH',a=[78,44,0],b=[96,44,0],height=5,thickness=.5,doors=[[9,15]]),dict(id='B-NORTH',a=[78,68,0],b=[96,68,0],height=7,thickness=.5,doors=[[1,7]])]
boxes=[
 dict(id='COURT-SERVICE-PAVILION',bounds=[63,94,8,5],z=3,height=4.2,material='stone',role='Central service pavilion interrupts the residual end-to-end court diagonal; north aisle 3 m'),

 dict(id='COURT-GATEHOUSE-W',bounds=[37,97,8,5],z=3,height=4.2,material='stone',role='North-edge carriage pavilion breaks long court line; 3 m south aisle'),
 dict(id='COURT-GATEHOUSE-E',bounds=[87,94,8,5],z=3,height=4.2,material='stone',role='South-edge carriage pavilion breaks court line; 3 m north aisle'),

 dict(id='ORANGERY-PLANTER',bounds=[-3,53,5,2.4],z=3,height=1.25,material='hedge',role='Low refuge on wider west approach'),
 dict(id='ORANGERY-TRELLIS',bounds=[15,58,3,4],z=3,height=2.4,material='hedge',role='Tall screen makes the music-room arrival require an offset'),
 dict(id='MUSIC-PIANO',bounds=[7,74,4,3],z=3,height=1.25,material='wood',role='Preparation and low refuge in the new west wing'),
 dict(id='MUSIC-CABINET',bounds=[15,80,3,4],z=3,height=2.7,material='wood',role='Tall screen splits north gallery and A west arrivals'),
 dict(id='CELLAR-BARRELS',bounds=[105,59,4,8],z=0,height=2.7,material='wood',role='Tall rack splits south/east route and B approach'),
 dict(id='CELLAR-LOW-RACK',bounds=[116,68,5,1.4],z=0,height=1.25,material='wood',role='Low refuge on the long east wing'),
 dict(id='CELLAR-WINE-RACK',bounds=[100,74,6,3],z=0,height=2.7,material='wood',role='Interrupts north cellar stair to B east view'),
 dict(id='PUMP-MACHINE',bounds=[110,34,4,4],z=0,height=2.7,material='metal',role='Separates pump-house entry and wine approach'),

 dict(id='FOYER-SCREEN',bounds=[51,38,11,2],z=3,height=3.4,material='stone',role='Blocks the complete front-stair to hall-arch optical channel; west aisle 3 m, east aisle 2 m'),
 dict(id='ROCK-SPINE',bounds=[34,40,4,20],z=-.4,height=11.4,material='rock',role='Separates cliff garden from hall; no windows or traversal'),
 dict(id='LIBRARY-CORE',bounds=[56,64,12,12],z=-.4,height=13.4,material='stone',role='Reduced solid reading pavilion inside a playable library loop'),
 dict(id='HALL-FIREPLACE',bounds=[47,46,4,5],z=3,height=2.7,material='stone',role='Tall central double-sided hearth splits hall views; 9 m passing width east'),
 dict(id='A-SCULPTURE',bounds=[33,66,4,4],z=3,height=2.5,material='stone',role='Tall sculpture plinth separates salon entry views; flank costs movement'),
 dict(id='A-CREDENZA',bounds=[27,72,4,1.3],z=3,height=1.25,material='wood',role='Crouched refuge against the garden entry; library east and music west can flank it'),
 dict(id='A-PIANO',bounds=[40,64,3,1.5],z=3,height=1.25,material='wood',role='Low salon repositioning east of sculpture; library/music side exposure remains'),
 dict(id='GARDEN-HEDGE',bounds=[26,52,3,4],z=3,height=2.4,material='hedge',role='Tall planter screens direct garden-to-salon preview'),
 dict(id='GARDEN-BENCH',bounds=[14,46,4,1.4],z=3,height=1.25,material='stone',role='Low refuge beyond garden stair crest, side exposure remains'),
 dict(id='B-CISTERN',bounds=[85,53,4,5],z=0,height=2.7,material='stone',role='Tall cistern divides central plant views; west/south entry apron is exposed'),
 dict(id='B-CHEST',bounds=[80,59,3,1.4],z=0,height=1.25,material='wood',role='Low same-level refuge; elevated stair sees over it'),
 dict(id='B-FILTER',bounds=[91,47,3,1.5],z=0,height=1.25,material='metal',role='Low drain-side entry preparation'),
 dict(id='ROAD-VAN',bounds=[64,18,4,4],z=0,height=2.7,material='metal',role='Tall equipment van separates spawn exits'),
 dict(id='ROAD-RETAINING',bounds=[36,23,8,2],z=0,height=1.25,material='stone',role='Low intermediate refuge on west road; north side hill'),
 dict(id='CT-SCREEN',bounds=[58,80,5,3],z=3,height=2.7,material='stone',role='Court screen partitions exits; earned A north control exposes parts of court')]
footprints=[Polygon(f['points']) for f in floors]+[Polygon(s['points']) for s in stairs]
outline=unary_union(footprints)
# Every outer edge is a real boundary. Exterior walls extend below adjacent slabs.
outer=[]
for loop in [outline.exterior,*outline.interiors]:
 coords=list(loop.coords)
 for a,b in zip(coords,coords[1:]):
  mid=Polygon([a,b,(b[0]+.001,b[1]+.001)]).centroid
  x=(a[0]+b[0])/2;y=(a[1]+b[1])/2
  top=7.8
  if y<34:top=3.2
  if x<34 and 39<y<60:top=4.25
  if 16<=x<=24 and 28<=y<=40:top=5.5
  if 54<=x<=60 and 26<=y<=34:top=6.8
  if y>=80:top=6.5
  outer.append(dict(id=f'EDGE-{len(outer):02}',a=[*a,-.45],b=[*b,-.45],height=top+.45,thickness=.5,doors=[]))
# No seam walls at shared floor/stair thresholds. Stair sides get full-height cheek walls.
for s in stairs:
 for i,(a,b) in enumerate([(s['points'][0],s['points'][3]),(s['points'][1],s['points'][2])]):
  walls.append(dict(id=s['id']+f'-CHEEK-{i}',a=[*a,-.45],b=[*b,-.45],height=max(s['start'][2],s['end'][2])+4.45,thickness=.4,doors=[]))
data=dict(revision='r09',floors=floors,stairs=stairs,walls=walls,outerWalls=outer,boxes=boxes,outline=list(outline.exterior.coords),holes=[list(x.coords) for x in outline.interiors])
(ROOT/'layout.json').write_text(json.dumps(data,indent=2)+'\n')
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1850" height="1250" viewBox="0 0 1850 1250">','<rect width="1850" height="1250" fill="#14241f"/>','<g font-family="sans-serif" fill="#eee4cc"><text x="55" y="47" font-size="30">VEILCREST / expanded layout r09</text><text x="55" y="76" font-size="16">Meters · right-handed Z-up · north ↑ · origin at map southwest · roofless review plan</text></g>','<g transform="translate(170 1150) scale(10 -10)" stroke-linejoin="round">']
def poly(pts,fill,stroke='#d3c4a2',width=.3):svg.append(f'<polygon points="{" ".join(f"{x},{y}" for x,y in pts)}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>')
for f in floors:poly(f['points'],'#bdad8c' if f['z']==3 else '#899b89')
for s in stairs:
 poly(s['points'],'#70988f')
 a=s['start'];b=s['end'];dx=b[0]-a[0];dy=b[1]-a[1];L=math.hypot(dx,dy);nx=-dy/L*s['width']/2;ny=dx/L*s['width']/2
 for i in range(1,20):
  x=a[0]+dx*i/20;y=a[1]+dy*i/20;svg.append(f'<path d="M{x+nx} {y+ny}L{x-nx} {y-ny}" stroke="#d1e1ca" stroke-width=".13"/>')
for b in boxes:poly(rect(*b['bounds']),'#343e35' if b['height']>2 else '#88735d')
for w in outer+walls:
 a=w['a'];b=w['b'];L=math.dist(a[:2],b[:2]);dx=(b[0]-a[0])/L;dy=(b[1]-a[1])/L
 cuts=[0]+[v for d in w['doors'] for v in d]+[L]
 for i in range(0,len(cuts)-1,2):
  u,v=cuts[i:i+2];svg.append(f'<path d="M{a[0]+dx*u} {a[1]+dy*u}L{a[0]+dx*v} {a[1]+dy*v}" stroke="#e6ddc3" stroke-width="{w["thickness"]}"/>')
 for u,v in w['doors']:
  svg.append(f'<path d="M{a[0]+dx*u} {a[1]+dy*u}L{a[0]+dx*v} {a[1]+dy*v}" stroke="#e5a56e" stroke-width=".16" stroke-dasharray=".4 .3"/>')
poly(rect(28,63,14,12),'none','#e4a074',.35);poly(rect(81,49,12,14),'none','#80c8d8',.35)
for x,y in [[58,11],[62,11],[66,11],[60,14],[68,14]]:svg.append(f'<circle cx="{x}" cy="{y}" r=".65" fill="#dc8c76"/>')
for x,y in [[52,98],[54,100],[56,98],[58,100],[60,98]]:svg.append(f'<circle cx="{x}" cy="{y}" r=".65" fill="#7bb6c7"/>')
# Grid references do not obscure the plan.
for n in range(0,101,10):svg.append(f'<path d="M{n} 0v-1M0 {n}h-1" stroke="#90a388" stroke-width=".15"/>')
svg.append('</g><g font-family="sans-serif" text-anchor="middle" fill="#18251e" font-size="13" font-weight="600">')
for f in floors:
 x,y=f['labelAt'];svg.append(f'<text x="{170+10*x}" y="{1150-10*y}">{f["label"]}</text>')
for b in boxes:
 x,y,w,d=b['bounds'];svg.append(f'<text x="{170+10*(x+w/2)}" y="{1146-10*(y+d/2)}" fill="#f6e6c6" font-size="10">{b["id"]}</text>')
svg.append('</g><g font-family="sans-serif" fill="#d1dcc7" font-size="15">')
notes=['SECTION NOTES / predicted geometry','Upper floors +3; lower floors +0.','Lower slabs .35; upper podium 3.35.','Five reversible flights / rise 3 m.','20 risers × 0.15 m; width 6–8 m.','','A south arch: x26–32.','A north x37–43; west y68–74.','A east y70–76 via library.','B W y46–52; S x87–93.','B N x79–85; E y56–62.','Arch crown 4.2 m above local floor.','','Sculpture / cistern / hearth:','2.5 / 2.7 / 2.7 m tall occluders.','Low cover: 1.25 m above floor.','Standing eye 1.86; low eye 1.023.','Stair cheek walls ≥4 m at crest.','','Core reduced to 12 × 12 m.','Library loop is now playable;','spine screens garden / hall.','','Dashed copper: traversable arch.','Site outlines: A copper / B cyan.','Exterior: closed physical boundary.','Scenic ridges lie beyond walls.','','Scale: 10 pixels = 1 meter.','Review predictions, not balance.']
for i,t in enumerate(notes):svg.append(f'<text x="1450" y="{130+i*27}">{t}</text>')
svg.append('<text x="55" y="1220">See brief.md for mechanics, inventory.md for obstacles and design.md for scenarios / return travel.</text></g></svg>')
(ROOT/'layout.svg').write_text('\n'.join(svg))
