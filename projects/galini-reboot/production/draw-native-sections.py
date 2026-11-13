import json,sys,hashlib
from pathlib import Path
run=Path(sys.argv[1]);out=Path('projects/galini-reboot/production');j=json.loads((run/'compiled.json').read_text());m=j['physicalMesh'];pos=m['positions'];idx=m['indices']
sections=[('Laundry occupied return',0,17,(37,60,-.5,12)),('Press return / upper exit',1,79,(30,50,3.5,15)),('School and Bell shared level',1,79,(91,128,3,15)),('Market bridge arch and bank',1,56.2,(47,81,-6.8,8)),('School north landing support',0,100,(68,91,3,13)),('Bell lower arrival',1,71,(118,126,3.2,10))]
W,H=1800,1120;svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%" fill="#faf8ef"/><text x="35" y="32" font-family="sans-serif" font-size="24">C11 exact native physical sections — source {hashlib.sha256((run/"loaded.aml").read_bytes()).hexdigest()[:16]}</text>'];manifest=[]
for k,(name,axis,plane,bounds) in enumerate(sections):
 x0=35+(k%2)*890;y0=65+(k//2)*340;left,right,bottom,top=bounds;scale=min(820/(right-left),240/(top-bottom));ox=x0+20;oy=y0+295
 tx=lambda x:ox+(x-left)*scale;ty=lambda z:oy-(z-bottom)*scale
 svg.append(f'<rect x="{x0}" y="{y0}" width="850" height="320" fill="#fffdf7" stroke="#b7b3a6"/><text x="{x0+12}" y="{y0+23}" font-family="sans-serif" font-size="18">{name} · {"X" if axis==0 else "Y"}={plane} m</text>')
 for z in range(int(bottom),int(top)+1,2):svg.append(f'<line x1="{tx(left)}" y1="{ty(z)}" x2="{tx(right)}" y2="{ty(z)}" stroke="#d8d6cc"/><text x="{x0+2}" y="{ty(z)+4}" font-family="sans-serif" font-size="11">{z}</text>')
 count=0
 for i in range(0,len(idx),3):
  points=[pos[idx[i+t]*3:idx[i+t]*3+3] for t in range(3)];hits=[]
  for a,b in zip(points,points[1:]+points[:1]):
   if (a[axis]-plane)*(b[axis]-plane)<0:
    t=(plane-a[axis])/(b[axis]-a[axis]);q=[a[n]+(b[n]-a[n])*t for n in range(3)];hits.append([q[1-axis],q[2]])
   elif abs(a[axis]-plane)<1e-7:hits.append([a[1-axis],a[2]])
  if len(hits)<2:continue
  a,b=hits[0],hits[-1]
  if max(a[0],b[0])<left or min(a[0],b[0])>right or max(a[1],b[1])<bottom or min(a[1],b[1])>top:continue
  if min(a[0],b[0])<left or max(a[0],b[0])>right or min(a[1],b[1])<bottom or max(a[1],b[1])>top:continue
  count+=1;svg.append(f'<line x1="{tx(a[0])}" y1="{ty(a[1])}" x2="{tx(b[0])}" y2="{ty(b[1])}" stroke="#374a4b" stroke-width="1.1"/>')
 svg.append(f'<text x="{x0+12}" y="{y0+312}" font-family="sans-serif" font-size="12">Horizontal range {left}–{right} m · Z {bottom}–{top} m · {count} physical triangle intersections</text>');manifest.append({'name':name,'axis':axis,'plane':plane,'bounds':bounds,'segments':count})
svg.append('<text x="35" y="1100" font-family="sans-serif" font-size="14">Actual collision triangles. Section lines are diagnostic, not architectural elevations. No geometry or navigation modified.</text></svg>');(out/'native-sections-c11.svg').write_text(''.join(svg));(out/'native-sections-c11.json').write_text(json.dumps({'sourceSha256':hashlib.sha256((run/'loaded.aml').read_bytes()).hexdigest(),'physicalHash':j['physicalHash'],'sections':manifest},indent=2)+'\n')
