from pathlib import Path
import json,math,html
from shapely.geometry import Polygon,LineString,Point
P=Path(__file__).parent;d=json.loads((P/'layout-data.json').read_text())
sections=[dict(id='C1',name='Factory, street and real lightwell',a=[52,28],b=[52,64],notes=['x52; looking west, +Y to right','Ground ceiling2.96; loft clear3.46; open-sky void y41–52.','Northern receiving and south machine floor share one factory roof.']),dict(id='C2',name='Bounded lightwell aperture',a=[40,48.6],b=[64,48.6],notes=['y48.6; looking north, +X to right','V-WELL: x56,y47.6–49.6; sill4.15/head5.75.','Blue ray projected into section; reciprocal exposed eye at x57.']),dict(id='C3',name='Porcelain / Sign stacked shoulder',a=[72,52],b=[94,52],notes=['y52; looking north, +X to right','V-SIGN: x80,y51–53; sill4.35/head5.75.','Kiln ends z2.75 below the gallery; plant lies outside this slice.'])]
for i,s in enumerate(d['stairs']):
 a,b=s['a'],s['b'];ux,uy=(b[0]-a[0])/12,(b[1]-a[1])/12
 sections.append(dict(id=f'C{i+4}',name=s['id']+' / '+s['name'],a=[a[0]-ux*4,a[1]-uy*4],b=[b[0]+ux*4,b[1]+uy*4],stair=s['id'],notes=[f'Axis ({a[0]},{a[1]}) → ({b[0]},{b[1]}); level{s["low"]:g}→{s["high"]:g}', '20 risers×0.16;0.60 tread;4 m width;3 m landings.',{'S1':'Open School threshold; turn south to the separate B door.','S2':'Ground Tailor goes around its foot; no under-flight crossing.','S3':'Ground Dye–A passes under the top landing, clear2.96 m.','S4':'Stair occupies A rear edge; ground passage remains west of it.','S5':'Over Boiler ground: minimum under-flight clearance2.96 m.','S6':'Offset6 m from S3; ground Water passage can pass below.'}[s['id']]]))
d['sections']=sections;(P/'layout-data.json').write_text(json.dumps(d,indent=2)+'\n')
out=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1740 1540"><rect width="100%" height="100%" fill="#f7f3e9"/><g font-family="Arial" fill="#233d42"><text x="35" y="43" font-size="29" font-weight="bold">NINEFOLD / LOFT STREET · L02 · COORDINATED SECTIONS C1–C9</text><text x="35" y="76" font-size="16">Meters; axes use the common plan origin. Solid gray = cut opaque structure; ochre = low objects; teal = actual floor slabs; pink = stairs.</text><text x="35" y="101" font-size="16">Bodies2 m / r0.25; eyes1.86 /1.023. Blue sight rays and clearances are planned geometry, not compiled observations.</text>']
for idx,c in enumerate(sections):
 col,row=idx%3,idx//3;ox=32+col*574;oy=145+row*450;ploty=oy+250;sz=13;L=math.dist(c['a'],c['b']);sx=min(22,490/L);a,b=c['a'],c['b'];axis=LineString([a,b]);ux,uy=(b[0]-a[0])/L,(b[1]-a[1])/L
 out.append(f'<rect x="{ox}" y="{oy-18}" width="555" height="425" rx="8" fill="#fffdf7" stroke="#cbd1c9"/><text x="{ox+14}" y="{oy+9}" font-size="18" font-weight="bold">{html.escape(c["id"]+" / "+c["name"])}</text>')
 px=ox+35
 def xy(t,z):return px+t*sx,ploty-z*sz
 def line(t1,z1,t2,z2,color,width=1,dash=''):
  x1,y1=xy(t1,z1);x2,y2=xy(t2,z2);out.append(f'<path d="M{x1},{y1} L{x2},{y2}" stroke="{color}" stroke-width="{width}" {"stroke-dasharray="+chr(34)+dash+chr(34) if dash else ""}/>')
 def block(lo,hi,z,top,color):
  x,y=xy(lo,top);out.append(f'<rect x="{x}" y="{y}" width="{max(.8,(hi-lo)*sx)}" height="{max(.8,(top-z)*sz)}" fill="{color}"/>')
 def ranges(g):
  cut=g.intersection(axis)
  gs=[cut] if cut.geom_type in ['LineString','Point'] else list(cut.geoms)
  result=[]
  for part in gs:
   if part.is_empty:continue
   if part.geom_type=='Point':t=axis.project(part);result.append((t,t))
   elif part.geom_type=='LineString':ts=[axis.project(Point(p)) for p in part.coords];result.append((min(ts),max(ts)))
  return result
 for z in [0,3.2,6.4,9.6,12.8]:
  line(0,z,L,z,'#dce0d7',.7);x,y=xy(0,z);out.append(f'<text x="{x-27}" y="{y+4}" font-size="10">{z:g}</text>')
 for m in d['plinths']:
  for p in m['polygons']:
   for lo,hi in ranges(Polygon(p['outer'],p['holes'])):block(lo,hi,m['base'],m['top'],'#b8c0b6')
 for f in d['floors']:
  for p in f['polygons']:
   for lo,hi in ranges(Polygon(p['outer'],p['holes'])):block(lo,hi,f['z']-.24,f['z'],'#528e80')
 for building in d['buildings']:
  g=Polygon(building['polygon'],building['roofHoles'])
  for lo,hi in ranges(g):block(lo,hi,building['roofUnderside'],building['roofTop'],'#4d5a56')
 for o in d['obstacles']:
  for lo,hi in ranges(Polygon(o['polygon'])):block(lo,hi,o['z'],o['top'],'#c38a52' if o['top']-o['z']<=1.3 else '#7b8580')
 for w in [*d['boundaryWalls'],*d['partitions']]:
  for lo,hi in ranges(LineString([w['a'],w['b']]).buffer(w['thickness']/2,cap_style=2)):block(lo,hi,w['z'],w['top'],'#35433e')
 for s in d['stairs']:
  sa,sb=s['a'],s['b'];fx,fy=(sb[0]-sa[0])/12,(sb[1]-sa[1])/12
  def fz(t):p=axis.interpolate(t);f=((p.x-sa[0])*fx+(p.y-sa[1])*fy)/12;return s['low']+max(0,min(1,f))*3.2
  for lo,hi in ranges(LineString([sa,sb]).buffer(2,cap_style=2)):
   x1,y1=xy(lo,fz(lo));x2,y2=xy(hi,fz(hi));out.append(f'<path d="M{x1},{y1} L{x2},{y2} L{x2},{y2+.24*sz} L{x1},{y1+.24*sz} Z" fill="#b57286"/>')
   if c.get('stair')==s['id']:
    line(lo,fz(lo)+1.1,hi,fz(hi)+1.1,'#a97186',1,'4 3')
    for t in [lo+3,lo+6,hi-.5]:
     z=fz(t);block(t-.25,t+.25,z,z+2,'#4a899b');line(t-.3,z+1.86,t+.3,z+1.86,'#a43128',2)
    for step in range(21):
     p=[sa[0]+fx*step*.6,sa[1]+fy*step*.6];t=axis.project(Point(p));line(t,s['low']+step*.16,t+.6,s['low']+step*.16,'#8b4a64',.8)
 if c['id']=='C2':
  for x,z in [(50,0),(57,3.2)]:block(x-40-.25,x-40+.25,z,z+2,'#4a899b')
  line(17,5.06,10,1.86,'#2584a5',2);line(17,4.223,10,1.023,'#c48037',1,'3 3')
 if c['id']=='C3':
  for x,z in [(76,0),(80.75,3.2)]:block(x-72-.25,x-72+.25,z,z+2,'#4a899b')
  line(8.75,5.06,4,1.86,'#2584a5',2)
 for t in range(0,math.floor(L)+1,4):x,y=xy(t,0);out.append(f'<text x="{x}" y="{y+18}" font-size="10">{t} m</text>')
 for k,n in enumerate(c['notes']):out.append(f'<text x="{ox+15}" y="{oy+295+k*23}" font-size="13">{html.escape(n)}</text>')
 out.append(f'<text x="{ox+15}" y="{oy+382}" font-size="12">Exact cut axis ({a[0]:g},{a[1]:g}) → ({b[0]:g},{b[1]:g}).</text>')
out.append('<text x="35" y="1523" font-size="14">Stair guards shown dashed as side projections; all flight slabs cut the upper floor. No mandatory jump, crouch, boost or drop. All six transfers reversible.</text></g></svg>')
(P/'sections-l02.svg').write_text(''.join(out))

# A compact, literal comparison rather than a second preferred-layout rationale.
out=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1300 820"><rect width="100%" height="100%" fill="#f7f3e9"/><g font-family="Arial" fill="#233d42"><text x="30" y="43" font-size="27" font-weight="bold">L02 / ONE LIGHTWELL INFORMATION POSITION</text><text x="30" y="76" font-size="16">Both candidate apertures tested at standing eye5.06 against three lower eyes1.86. Same sill4.15 / head5.75.</text>']
checks=json.loads((P/'planning-checks.json').read_text())
for idx,v in enumerate(checks['apertureComparison']):
 ox=40+idx*640;oy=120;s=23
 out.append(f'<text x="{ox}" y="{oy}" font-size="20" font-weight="bold">{html.escape(v["id"])}</text>')
 def X(x):return ox+(x-41)*s
 def Y(y):return oy+435-(y-37)*s
 out.append(f'<rect x="{X(46)}" y="{Y(52)}" width="{10*s}" height="{11*s}" fill="#efe0bb" stroke="#435b56" stroke-width="5"/>')
 wx=v['x'];ys=v['y'];out.append(f'<path d="M{X(wx)},{Y(ys[0])} L{X(wx)},{Y(ys[1])}" stroke="#2c94af" stroke-width="7"/>')
 o=v['observer'];out.append(f'<circle cx="{X(o[0])}" cy="{Y(o[1])}" r="6" fill="#257f99"/>')
 targets={'underpass':[52,40],'well-center':[50,49],'Dye-threshold':[52,54]}
 for r in v['rays']:
  t=targets[r['target']];col='#2185a1' if r['insideAperture'] else '#b66d51'
  out.append(f'<path d="M{X(o[0])},{Y(o[1])} L{X(t[0])},{Y(t[1])}" stroke="{col}" stroke-width="2" stroke-dasharray="5 4"/><circle cx="{X(t[0])}" cy="{Y(t[1])}" r="5" fill="{col}"/><text x="{X(t[0])+10}" y="{Y(t[1])-10}" font-size="13">{r["target"]}</text>')
 for k,r in enumerate(v['rays']):out.append(f'<text x="{ox}" y="{620+k*24}" font-size="15">{r["target"]}: {"inside" if r["insideAperture"] else "outside"} aperture plane · y/z={r["wallIntersection"][1:]}</text>')
out.append('<text x="30" y="744" font-size="16">Selected east/north pocket requires a detour from the machine floor and reveals only a bounded well slice.</text><text x="30" y="771" font-size="15">Declined west opening combines the north work-aisle hold with underpass information. Neither version proves firing or acoustic behavior.</text><text x="30" y="798" font-size="15">Dye rejection is only0.08 m beyond the selected jamb: inspect offsets, crouch and body visibility in compiled views before acceptance.</text></g></svg>')
(P/'aperture-comparison-l02.svg').write_text(''.join(out))
