from pathlib import Path
import json,copy,hashlib,sys
sys.path.insert(0,str(Path('generated/galini-reboot-geometry-tools').resolve()))
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
B=Path('projects/galini-reboot/planning');out=B/'l03';out.mkdir(exist_ok=True)
d=json.loads((B/'l02/layout.json').read_text());d['revision']='L03';d['status']='Focused paper repair; awaiting independent local return and strategy review; no AML'
d['parentRevision']={'revision':'L02','layoutSha256':hashlib.sha256((B/'l02/layout.json').read_bytes()).hexdigest(),'changes':['GA-L02-SP1 suspended School support assemblies','GA-L02-SP2 route witness corrections in encounters.json','Existing turning transfers made explicit; no new route or curve']}
# Keep the existing normalized polygons and all edge identifiers. These named records
# replace the vertical retaining fill, not the guard or the +8 walking surface.
groups={
 'SS01': ['B-F08-01-0-1','B-F08-01-0-2'],
 'SS02': ['B-F08-01-0-63','B-F08-01-0-64','B-F08-01-0-65'],
 'SS03': [f'B-F08-01-0-{n}' for n in range(53,61)],
}
for sid,ids in groups.items():
 for b in d['boundaries']:
  if b['id'] not in ids:continue
  b['previousBaseSupport']=b['baseSupport'];b['baseSupport']=7.7;b['supportAssembly']=sid
  b['supportContract']='Upper slab/edge assembly only; no continuous fill below Z7.7. Separate listed beams/piers/bearings govern lower support.'
  if b['kind']=='retaining crest / parapet':b['kind']='suspended slab-edge / parapet'
# Exact physical members; Z extents are absolute, with beams below the .30 m slab.
def member(id,p,base,top,role):return {'id':id,'p':p,'base':base,'top':top,'role':role,'opaque':True,'collidable':True}
def rect(a,b,c,e):return [[a,b],[c,b],[c,e],[a,e]]
assemblies=[
 {'id':'SS01','name':'School west arcade lip','boundaryIds':groups['SS01'],'upperZ':8,'slabSoffit':7.7,'lowestBeamSoffit':7.25,'lowerZ':4,'crossing':[94,84,4],
  'slabPlan':[[94,82],[95,81.94444444444444],[95,89],[94,89]],
  'members':[member('SS01-B1',rect(93.825,82,94.175,89),7.25,7.7,'West perimeter beam'),member('SS01-B2',rect(94,81.825,95.225,82.175),7.25,7.7,'South crossbeam bears into intact School west jamb above D17'),member('SS01-B3',rect(94,88.65,95.225,89),7.25,7.7,'North crossbeam bears into intact School west wall')],
  'bearings':['WX-M14-4 at y81.825–82.175 above D17 head Z7; beam bears to x95.225','WX-M14-4 at y88.65–89, intact upper/lower shell'],
  'void':'Continuous lower air from Z4 to at least Z7.25 across x93.825–95.225, y82.175–88.65 except existing School facade; D17 remains y82–86, clear height3. No new lower pier.'},
 {'id':'SS02','name':'School Fountain balcony','boundaryIds':groups['SS02'],'upperZ':8,'slabSoffit':7.7,'lowestBeamSoffit':7.25,'lowerZ':4,'crossing':[107.7142857143,63,4],
  'slabPlan':rect(98,63,111,67),
  'members':[member('SS02-B1',rect(97.825,62.825,111.175,63.175),7.25,7.7,'Balcony front beam below W03'),member('SS02-B2',rect(97.825,63,98.175,67.225),7.25,7.7,'West return beam bears into School south facade'),member('SS02-B3',rect(110.825,63,111.175,67.225),7.25,7.7,'East return beam bears into School south facade'),member('SS02-P1',rect(98.05,63.25,98.65,63.85),4,7.25,'West balcony pier, outside Fountain-to-D16 body corridor'),member('SS02-P2',rect(110.25,63.25,110.85,63.85),4,7.25,'East balcony pier, outside Fountain-to-D16 body corridor'),member('SS02-B4',rect(98.05,63,98.65,63.85),7.25,7.7,'West pier cap connects to front beam'),member('SS02-B5',rect(110.25,63,110.85,63.85),7.25,7.7,'East pier cap connects to front beam')],
  'bearings':['WX-M14-1 at x97.825–98.175 and x110.825–111.175, y67; both outside D16','SS02-P1/P2 sit on retained +4 terrace; no new route/floor extension'],
  'void':'Fountain-to-D16 passes between piers. Minimum overhead member Z7.25 gives3.25 m over +4. W03 remains observation-only; its wall thickness and finite sill are compiled-review obligations.'},
 {'id':'SS03','name':'School east colonnade and Bell receiving deck','boundaryIds':groups['SS03'],'upperZ':8,'slabSoffit':7.7,'lowestBeamSoffit':7.25,'lowerZ':4,'crossing':[125.68,80.84,4],
  'slabPlan':[[113,81],[124,81],[124,80],[126,81],[130,99],[127,99],[125,86],[113,86]],
  'members':[member('SS03-B1',rect(113,84.2,125,84.8),7.25,7.7,'Arcade beam bears on O04/O05 and School east shell'),member('SS03-B2',[[124,79.825],[126.14,80.74],[130.175,99],[129.825,99],[125.86,81.26],[124,80.175]],7.25,7.7,'Outer edge beam, no wall fill under lower receiving turn'),member('SS03-B3',rect(124.2,81,124.8,86.225),7.25,7.7,'Crossbeam from O05 to Bellhouse south shell'),member('SS03-B4',rect(113,81,126.2,81.35),7.25,7.7,'Stair-well north rim beam; no fill into lower colonnade'),member('SS03-B5',rect(124.5,85.65,127.3,86.05),7.25,7.7,'Tie from Bellhouse corner to outer beam'),member('SS03-P1',rect(129.4,98.4,130.35,99.4),-6,7.25,'Rock-bank masonry bearing beyond lower playable court'),member('SS03-B6',[[113,75.99],[118,76.825],[118,77],[113,76.16666666666667]],7.25,7.7,'Bell top-porch edge beam ties to School east shell; S8 masonry supports flight-side edge')],
  'bearings':['O04/O05: existing lower colonnade piers shortened to beam soffit7.25; caps continue above','WX-M14-2 east shell at y84.2–84.8 above D18 headZ7','WX-M17-1 Bellhouse south shell at y86, x124.2–124.8','SS03-P1 is outside +4 court; complete to scenic bed−6','S8 masonry under flights remains solid; H-B stays open'],
  'void':'The lower D18-to-Bell journey passes south of colonnade piers and under the outer beam. No retaining fill on the named suspended upper edges;3.25 m minimum beam clearance over +4.'}
]
# Make beam-to-pier joints explicit and retain the existing stable pier identifiers.
for ob in d['obstacles']:
 if ob['id'] in ['O04','O05']:
  ob['height']=3.25;ob['role']='Supports SS03-B1/B3 at soffit7.25; lower public arcade remains open';ob['supportAssembly']='SS03'
d['supportAssemblies']=assemblies
d['constructionPrecedence']=['Explicit supportAssemblies supersede the old retaining interpretation for listed boundaries. These boundaries start at7.7; only listed discrete members extend lower.','Existing full exterior shell walls and declared door apertures remain; support exceptions do not erase building enclosure.','Normalized floors remain the walking surfaces. Added support-member footprints are opaque collidable solids at their declared Z extents, even where floor polygons continue underneath.','The beam/column dimensions are invented blockout construction, not engineering certification. Native compilation must verify complete connections, finite apertures and headroom.']
d['limits'].append('SS01–SS03 lower airspace and discrete supports are explicit L03 contracts; roof-on and ordinary interior views must verify these assemblies.')
(out/'layout.json').write_text(json.dumps(d,indent=2)+'\n')
# Clone rendering helpers only; L02 source/data are never rewritten.
for old,new in [('draw-l02.py','draw-l03.py'),('packet-l02.py','packet-l03.py'),('extra-sections-l02.py','extra-sections-l03.py'),('check-plan-l02.py','check-plan-l03.py'),('check-walls-l02.py','check-walls-l03.py'),('render-l02.mjs','render-l03.mjs'),('check-sheet-bounds.mjs','check-sheet-bounds-l03.mjs')]:
 t=(B/old).read_text().replace('l02','l03').replace('L02','L03')
 if old=='packet-l02.py':
  t=t.replace('[27,27,0],[36,26,0]','[27,26.2,0],[36,26,0]')
  t=t.replace('[30,50,4],[28,55,4]','[28,50,4],[28,55,4]')
  t=t.replace('[103,29,0],[109,29,0]','[103,29,0],[103,28.6,0],[109,28.6,0]')
  t=t.replace('Rounding M10 loses immediate support from the shore follower.','The named F and L can both see O. Support is lost only for deeper southern movement around M10, not automatically at the shown bend.')
  marker="scenarioRows=["
  addition="""# Advanced support poses preserve the independent paper finding as a testable witness.
for section in sections:
 if section['id']=='SEC02': section['poses'].append(P('L1','leader',[26,44.5,4],[30,48,4]))
 if section['id']=='SEC03': section['poses'].append(P('F1','follower',[37,59,4],[49,59,4]))
 if section['id']=='SEC09': section['poses'].append(P('F1','follower',[102,86,8],[106,99,8]))
"""
  t=t.replace(marker,addition+marker)
  t=t.replace('3.7 m clear space is preserved; O04/O05 and adjoining masonry carry the upper deck. Do not fill the lower arcade with generic rock support.','3.7 m slab clearance /3.25 m below beams. SS01–SS03 define slab-edge exceptions, exact beams and discrete bearings, including O04/O05. Lower routes stay open. See support-repair sections.')
 if old=='draw-l02.py':
  marker=" for st in d['stairs']:"
  addition=""" # Discrete structure is drawn at the actual selected level; upper suspended edges
 # are dashed on lower plans so their preserved passage can be reviewed directly.
 for assembly in d.get('supportAssemblies',[]):
  for member in assembly['members']:
   if level is not None and member['base']<=level<member['top']:
    o+=f'<polygon points="{points(member["p"],xy)}" fill="#725c47" stroke="#4f4134" stroke-width="1.2"/>'
  if level==assembly['lowerZ']:
   for edge in d['boundaries']:
    if edge['id'] in assembly['boundaryIds']:o+=line(edge['a'],edge['b'],xy,'stroke="#807298" stroke-width="1.2" stroke-dasharray="4 3"')
"""
  t=t.replace(marker,addition+marker)
  t=t.replace('R02 spatial-interest return. Original body retained.','R02 interest return; focused School support repair. Original body retained.')
  t=t.replace('Exact polygons, holes and edge IDs: layout.json.','Purple dashed on lower plans: suspended upper edges, no retaining fill below. Exact polygons and support assemblies: layout.json.')
 t=t.replace('Thick dark edges are full-height enclosure or 2.4 m observation screens. Thin tan edges are 1.1 m guards. Stair-end joins are open; side guards follow the actual grade. Purple dashed on lower plans: suspended upper edges, no retaining fill below. Exact polygons and support assemblies: layout.json.','Thick edges: walls/screens. Thin tan: guards. Purple dashed on lower plans: suspended upper edges. Stair ends stay open; side guards follow grade. Exact floor, edge and support IDs: layout.json.')
 (B/new).write_text(t)
print('Wrote L03 layout and isolated drawing helpers; L02 untouched.')
