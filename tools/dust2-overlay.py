#!/usr/bin/env python3
"""Compare *exported triangles*, not the input tracing polygon, with the radar.

Run after vector-build, using generated/dust2-venv/bin/python. Pixel/world
registration is fixed by vector-dust2.py; this audit never fits or warps output.
"""
from pathlib import Path
import base64, hashlib, json, math, argparse
import numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'generated/dust2-alignment'
OUT.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser()
parser.add_argument('--check',action='store_true')
args=parser.parse_args()
reference=ROOT/'reference/dust2/user-radar.png'
im=Image.open(reference).convert('RGBA'); width,height=im.size
pixels=np.asarray(im)[:,:,:3]
mask=pixels.max(axis=2)>28
runs=[]
for y,row in enumerate(mask):
 changes=np.flatnonzero(np.diff(np.r_[False,row,False]))
 runs.extend(box(int(a),y,int(b),y+1) for a,b in zip(changes[::2],changes[1::2]))
raw=unary_union(runs)
if raw.geom_type=='MultiPolygon': raw=max(raw.geoms,key=lambda p:p.area)
wall_refs=json.loads((ROOT/'reference/dust2/walls.json').read_text())['walls']
targets={w['id']:LineString(w['points']).buffer(w['width']/2,cap_style=2,join_style=2) for w in wall_refs}
# Silhouette contains a rasterized outline. The wall's outer face follows that
# outline and its inner face is 2.4 pixels inboard. 1 px tolerance is raster AA.
perimeter=raw.difference(raw.buffer(-2.4,join_style=2))
expected=unary_union([perimeter,*targets.values()])
contract=json.loads((ROOT/'generated/dust2-plan-contract.json').read_text())
authored=Polygon(contract['outer'],contract['holes'])

def polys(shape):
 if shape.is_empty:return []
 return [shape] if shape.geom_type=='Polygon' else [p for p in shape.geoms if p.geom_type=='Polygon']
def path(shape):
 return ' '.join('M '+' L '.join(f'{x:.3f},{y:.3f}' for x,y in ring.coords)+' Z' for p in polys(shape) for ring in [p.exterior,*p.interiors])
def draw_shape(draw,shape,fill,outline=None):
 for p in polys(shape):
  draw.polygon(list(p.exterior.coords),fill=fill)
  if outline:draw.line(list(p.exterior.coords),fill=outline,width=1)
  for r in p.interiors:draw.polygon(list(r.coords),fill=(0,0,0,0))
def audit(file):
 data=json.loads(file.read_text());mesh=data['mesh'];floor=[];walls=[];risers=[];objects={}
 for t,si in enumerate(mesh['surfaces']):
  s=data['surfaces'][si]
  points=[mesh['positions'][i*3:i*3+3] for i in mesh['indices'][t*3:t*3+3]]
  tri=Polygon([(p[0]*10+50,1005-p[1]*10) for p in points])
  if tri.area<1e-8:continue
  if s['kind'] in ['floor','stairs','ramp']:floor.append(tri)
  elif s['kind']=='wall':
   if s['role']=='riser':risers.append(tri)
   else:
    walls.append(tri);objects.setdefault(s['object'],[]).append(tri)
 floor=unary_union(floor);walls=unary_union(walls);risers=unary_union(risers)
 physical_walls=unary_union([walls,risers])
 shell=unary_union([floor,walls])
 distances=[];raw_distances=[];numerical_rings=[]
 for p in polys(shell):
  for ring in [p.exterior,*p.interiors]:
   # Float32 CSG triangles can leave microscopic projected rings. Report these,
   # but do not mistake a <1e-8 px² loop for a missing architectural boundary.
   # Area also catches collinear rings with nonzero length but effectively zero width.
   ring_area=Polygon(ring).area
   numerical=ring_area<1e-8
   if numerical:numerical_rings.append(ring_area)
   for k in range(math.ceil(ring.length*2)):
    distance=raw.boundary.distance(ring.interpolate(k/2));raw_distances.append(distance)
    if not numerical:distances.append(distance)
 missing=raw.difference(shell);extra=shell.difference(raw)
 # Measure all compiled wall footprints against independent reference marks.
 false=walls.difference(expected.buffer(1,join_style=2))
 missed=expected.difference(walls.buffer(1,join_style=2))
 measures={
  'geometryHash':data['geometryHash'],
  'envelopeIoU':shell.intersection(raw).area/shell.union(raw).area,
  'floorIoU':floor.intersection(raw).area/floor.union(raw).area,
  'missingEnvelopePixels2':missing.area,'extraEnvelopePixels2':extra.area,
  'maxBoundaryDistancePixels':max(distances),'p95BoundaryDistancePixels':float(np.percentile(distances,95)),
  'rawMaxBoundaryDistancePixels':max(raw_distances),'numericalProjectionRings':len(numerical_rings),'numericalProjectionAreaPixels2':sum(numerical_rings),
  'falseWallPixels2Beyond1px':false.area,'missingWallPixels2Beyond1px':missed.area,
  'wallPrecisionWithin1px':1-false.area/walls.area,'wallRecallWithin1px':1-missed.area/expected.area,
  'interiorWalls':{ident:{'intersectionOverUnion':(actual:=unary_union([unary_union(v) for k,v in objects.items() if k.startswith(ident+'.')])).intersection(target).area/actual.union(target).area,'missingPixels2Beyond1px':target.difference(actual.buffer(1)).area} for ident,target in targets.items()}
 }
 # Raster similarity is context only. Acceptance follows the deliberately
 # authored plan and actual compiled floors, not antialiased source pixels.
 measures['triangles']=len(mesh['indices'])//3
 measures['authoredFloorCoverage']=floor.intersection(authored).area/authored.area
 measures['missingAuthoredFloorPixels2']=authored.difference(floor.buffer(.12)).area
 measures['landmarks']={name:floor.buffer(.12).covers(Point(p[0]*10+50,1005-p[1]*10)) for name,p in contract['landmarks'].items()}
 measures['passages']={p['id']:floor.buffer(.12).covers(LineString([p['from'],p['to']]).buffer(p['minimumWidth']*5,cap_style=2)) for p in contract['passages']}
 measures['navigationPassed']=data.get('navigation',{}).get('passed')
 measures['uncoveredSamples']=data.get('navigation',{}).get('coverage',{}).get('uncoveredCount')
 for ident,target in targets.items():
  # At a solid union, exposed triangles may belong to an adjoining retaining
  # seam as well as a regular wall. Inspect both while owner IoU stays visible.
  measures['interiorWalls'][ident]['missingPhysicalPixels2Beyond1px']=target.difference(physical_walls.buffer(1)).area
 return measures,dict(floor=floor,walls=walls,risers=risers,missing=missing,extra=extra,false=false,missed=missed)

final,shapes=audit(ROOT/'generated/vector/dust2_vector.runtime.json')
baseline_path=ROOT/'generated/dust2-refinement/before/dust2_vector.runtime.json'
baseline,before=audit(baseline_path) if baseline_path.exists() else (final,shapes)
report={'referenceSha256':hashlib.sha256(reference.read_bytes()).hexdigest(),
 'sourceSha256':hashlib.sha256((ROOT/'examples/dust2.level.svgx').read_bytes()).hexdigest(),
 'registration':{'pixelsPerMetre':10,'pixelXAtWorldOrigin':50,'pixelYAtWorldOrigin':1005,'fitApplied':False},
 'compiledCurveTolerancePixels':.12,'rasterMetricsAreInformational':True,'baseline':baseline,'final':final,
 'scope':'CS2 approximation: raster similarity is informational. Acceptance checks compiled floor coverage against the authored vector plan, landmarks, minimum passage widths, interior wall presence and navigation. Dimensions remain blockout estimates.'}
(OUT/'report.json').write_text(json.dumps(report,indent=2))
layers={}
for name,parts in [('before',before),('after',shapes)]:
 layers[name]={key:path(value) for key,value in parts.items()}
 overlay=Image.new('RGBA',im.size);draw=ImageDraw.Draw(overlay)
 draw_shape(draw,parts['walls'],(34,240,222,195))
 # Draw the floor outline as a line, not filled polygons that could obscure walls.
 for p in polys(parts['floor']):
  for ring in [p.exterior,*p.interiors]:draw.line(list(ring.coords),fill=(245,244,130,230),width=1)
 Image.alpha_composite(im,overlay).save(OUT/f'{name}-overlay.png')
 difference=Image.new('RGBA',im.size);d=ImageDraw.Draw(difference)
 draw_shape(d,parts['missing'],(255,178,45,230));draw_shape(d,parts['extra'],(255,55,144,230));draw_shape(d,parts['false'],(255,55,144,230));draw_shape(d,parts['missed'],(255,178,45,230))
 Image.alpha_composite(im,difference).save(OUT/f'{name}-difference.png')
encoded=base64.b64encode(reference.read_bytes()).decode()
html='''<!doctype html><html><head><meta charset="utf-8"><title>Dust II — plan alignment</title><style>
*{box-sizing:border-box}body{margin:0;background:#101716;color:#e8efeb;font:15px system-ui}aside{position:fixed;inset:0 auto 0 0;width:310px;padding:28px;overflow:auto;background:#19221f;border-right:1px solid #35443c}h1{font-size:25px;letter-spacing:-.5px;margin:10px 0}p{line-height:1.55;color:#b9c8c0}.eyebrow{font-size:11px;letter-spacing:2px;color:#9bae94}label{display:block;margin:17px 0}select,button{background:#283930;color:white;border:1px solid #556e5c;border-radius:4px;padding:9px}input[type=range]{width:100%}.stat{padding:12px 0;border-top:1px solid #38443c}.stat b{font-size:24px;display:block;font-variant-numeric:tabular-nums}.legend{font-size:13px}.cyan{color:#22f0de}.yellow{color:#f5f482}.pink{color:#ff3790}.amber{color:#ffb22d}main{margin-left:310px;height:100vh;overflow:hidden;touch-action:none;cursor:grab}svg{width:100%;height:100%;transform-origin:center}small{color:#a8b7ae;line-height:1.6}button{cursor:pointer}a{color:#22f0de}
</style></head><body><aside><div class="eyebrow">LEVELSPEC / DUST II</div><h1>CS2 plan review</h1><p>Authored architecture over the supplied radar. Raster similarity is informative; route and clearance checks determine acceptance.</p><label>Iteration <select id="iteration"><option value="after">Corrected</option><option value="before">Original blockout</option></select></label><label>Overlay opacity <input id="opacity" type="range" min="0" max="1" step=".01" value=".75"></label><label><input id="walls" type="checkbox" checked> <span class="cyan">Actual wall footprints</span></label><label><input id="floor" type="checkbox" checked> <span class="yellow">Actual floor outlines</span></label><label><input id="reference" type="checkbox"> Interior reference traces</label><label><input id="errors" type="checkbox"> Show difference map</label><label><input id="risers" type="checkbox"> Elevation risers</label><div id="stats"></div><p class="legend"><span class="pink">Pink: extra geometry / misplaced walls.</span><br><span class="amber">Amber: missing geometry / walls.</span></p><button id="reset">Reset view</button><p><small>Scroll to zoom; drag to pan. Toggle opacity to inspect the source beneath each wall. The source radar is approximate. Current navigation and clearance appear in the main viewer. Colored site outlines, boxes, shadows and stair treads are not wall traces.</small></p></aside><main><svg id="view" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 WIDTH HEIGHT"><image href="data:image/png;base64,IMAGE" width="WIDTH" height="HEIGHT"/><g id="overlay" fill-rule="evenodd"><path id="wallPath" fill="#22f0de"/><path id="floorPath" fill="none" stroke="#f5f482" stroke-width=".8"/><path id="refPath" fill="none" stroke="white" stroke-width=".7" stroke-dasharray="3 2" d="REFPATH"/><path id="riserPath" fill="#c78aff"/><path id="extraPath" fill="#ff3790"/><path id="missingPath" fill="#ffb22d"/></g></svg></main><script>
const layers=LAYERS,report=REPORT,$=id=>document.getElementById(id);function update(){const name=$('iteration').value,p=layers[name],m=report[name==='after'?'final':'baseline'];$('overlay').style.opacity=$('opacity').value;$('wallPath').setAttribute('d',$('walls').checked?p.walls:'');$('floorPath').setAttribute('d',$('floor').checked?p.floor:'');$('refPath').style.display=$('reference').checked?'':'none';$('riserPath').setAttribute('d',$('risers').checked?p.risers:'');$('extraPath').setAttribute('d',$('errors').checked?p.extra+' '+p.false:'');$('missingPath').setAttribute('d',$('errors').checked?p.missing+' '+p.missed:'');$('stats').innerHTML='<div class="stat"><b>'+m.triangles.toLocaleString()+'</b>Compiled triangles</div><div class="stat"><b>'+(m.authoredFloorCoverage*100).toFixed(2)+'%</b>Authored floor covered</div><div class="stat"><b>'+Object.values(m.landmarks).filter(Boolean).length+'/'+Object.keys(m.landmarks).length+'</b>Supported landmarks</div><div class="stat"><b>'+(m.navigationPassed===true?'Passed':m.navigationPassed===false?'Needs attention':'Not recorded')+'</b>Navigation and clearance</div><div class="stat"><b>'+(m.envelopeIoU*100).toFixed(1)+'%</b>Radar overlap (informational)</div>';}document.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',update));let scale=1,x=0,y=0,drag;const main=document.querySelector('main');function transform(){$('view').style.transform=`translate(${x}px,${y}px) scale(${scale})`;}main.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(1,Math.min(10,scale*Math.exp(-e.deltaY*.001)));transform();},{passive:false});main.onpointerdown=e=>{drag=[e.clientX-x,e.clientY-y];main.setPointerCapture(e.pointerId)};main.onpointermove=e=>{if(drag){x=e.clientX-drag[0];y=e.clientY-drag[1];transform();}};main.onpointerup=()=>drag=null;$('reset').onclick=()=>{scale=1;x=y=0;transform()};update();
</script></body></html>'''
for key,value in [('WIDTH',str(width)),('HEIGHT',str(height)),('IMAGE',encoded),('REFPATH',path(unary_union(list(targets.values())))),('LAYERS',json.dumps(layers)),('REPORT',json.dumps(report))]:html=html.replace(key,value)
(OUT/'index.html').write_text(html)
print(json.dumps(report,indent=2))
if args.check:
 assert final['missingAuthoredFloorPixels2']<1,'Compiled floor is missing from the authored plan'
 assert all(final['landmarks'].values()),'A named landmark has lost its floor'
 assert all(final['passages'].values()),'An authored corridor lost its required width'
 assert all(v['missingPhysicalPixels2Beyond1px']<2 for v in final['interiorWalls'].values()),'An authored interior wall is missing'
 assert final['navigationPassed'] is True,'Compiled navigation/clearance did not pass'
