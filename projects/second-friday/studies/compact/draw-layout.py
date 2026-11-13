"""Draw the authored layout proposal. No geometry compilation occurs here."""
from pathlib import Path
import json
P=Path(__file__).parent
spaces=[('SP-W','West garage',0,8,14,24,0),('ARR-W','Shoe arrivals',14,8,28,32,0),('RAG','Clothes yard',4,24,22,44,0),('COURT','Auction court',28,20,56,44,0),('TEA','Tea terrace',22,44,56,54,2.4),('HALL','Appliance hall',24,4,64,20,0),('REPAIR','Repair yard',56,12,76,40,0),('ARR-E','Book arrivals',56,32,70,56,0),('SP-E','East garage',70,40,84,56,0)]
masses=[('TAILOR',16,20,22,30,5.2),('RAG-STALL',8,31,16,36,2.8),('COURT-W',27.7,30,28.3,44,5.2),('COURT-E',55.7,20,56.3,34,5.2),('SW-SHOP',28,20,36,24,5.2),('SE-SHOP',48,20,56,24,5.2),('REPAIR-ISLAND',36,8,50,14,4.8),('AUCTION',40,30,44,34,3.2),('TEA-SCREEN',36,44,48,44.4,5.2),('WEST-SCREEN',19,10,21,17,3.2),('EAST-SCREEN',64,40,66,44,3.2),('EAST-RETURN',70,37.5,76,38,3.2),('W-INNER',9.5,12,10,22,3.5),('E-INNER',74,42,74.5,54,3.5)]
cover=[('C-W',32,27,36,29,1.1,0),('C-E',48,35,52,37,1.1,0),('C-S',37,22,40,24,2.4,0),('C-N',32,39,35,41,1.1,0),('C-REPAIR',65,23,69,26,2.5,0),('C-TEA',40,49,44,51,1.1,2.4),('C-BOOKS',60,41,63,43,1.1,0)]
stairs=[('ST-W',[25,32,0],[25,44,2.4],6),('ST-E',[68,48,0],[56,48,2.4],6)]
# Interior garage walls have two independent 4–6m exits. Tall screens dogleg the view.
walls=[('W-E1',14,8,14,10,4.6,0),('W-E2',14,16,14,24,4.6,0),('W-N1',4,24,6,24,4.6,0),('W-N2',12,24,14,24,4.6,0),('E-W1',70,40,70,43,4.6,0),('E-W2',70,49,70,56,4.6,0),('E-S1',70,40,72,40,4.6,0),('E-S2',76,40,84,40,4.6,0),('TEA-P-W',28,44,36,44,1.15,2.4),('TEA-P-E',48,44,56,44,1.15,2.4)]
data={'revision':'L04','spaces':spaces,'masses':masses,'cover':cover,'stairs':stairs,'walls':walls}
(P/'layout-data.json').write_text(json.dumps(data,indent=2)+'\n')
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1000" viewBox="0 0 1280 1000"><rect width="1280" height="1000" fill="#f8f3e8"/><style>text{font-family:Arial,sans-serif;fill:#263a42} .sm{font-size:12px}.label{font-size:15px;font-weight:bold}</style><text x="60" y="45" font-size="30" font-weight="bold">SECOND FRIDAY — Amman, Jordan</text><text x="60" y="75" font-size="17">5v5 single-point control · L04 developed layout · meters / Z-up · origin southwest · N = +Y ↑</text>']
def point(x,y):return (70+x*12,800-y*12)
def area(x0,y0,x1,y1,fill,stroke='#6c726d'):
 x,y=point(x0,y1);return f'<rect x="{x}" y="{y}" width="{(x1-x0)*12}" height="{(y1-y0)*12}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
def txt(x,y,s,cls='label'):
 a,b=point(x,y);return f'<text x="{a}" y="{b}" text-anchor="middle" class="{cls}">{s}</text>'
def line(x0,y0,x1,y1,col,width=4):
 a,b=point(x0,y0);c,d=point(x1,y1);return f'<path d="M{a},{b}L{c},{d}" stroke="{col}" stroke-width="{width}"/>'
for id,n,x0,y0,x1,y1,z in spaces:svg.append(area(x0,y0,x1,y1,'#c7dfda' if z else '#e8ddc4'))
for id,x0,y0,x1,y1,z in masses:svg.append(area(x0,y0,x1,y1,'#59676a'))
for id,x0,y0,x1,y1,h,z in cover:
 svg.append(area(x0,y0,x1,y1,'#ba8359' if h>2 else '#d7b56c'));svg.append(txt((x0+x1)/2,(y0+y1)/2,id,'sm'))
for id,a,b,w in stairs:
 x0=min(a[0],b[0]);x1=max(a[0],b[0]);y0=min(a[1],b[1]);y1=max(a[1],b[1]);vertical=x0==x1
 if vertical:x0-=w/2;x1+=w/2
 else:y0-=w/2;y1+=w/2
 svg.append(area(x0,y0,x1,y1,'#d2b076'))
 for i in range(1,16):
  t=i/16
  if vertical:svg.append(line(x0,y0+(y1-y0)*t,x1,y0+(y1-y0)*t,'#a18b64',1))
  else:svg.append(line(x0+(x1-x0)*t,y0,x0+(x1-x0)*t,y1,'#a18b64',1))
 svg.append(txt((x0+x1)/2,(y0+y1)/2,'↑ +2.4' if vertical else '← +2.4','sm'))
for id,x0,y0,x1,y1,h,z in walls:svg.append(line(x0,y0,x1,y1,'#59676a',5 if h>2 else 3))
svg.append(area(34,24,50,40,'none','#d28630'))
svg += [txt(42,26,'CONTROL'),txt(42,37.8,'AUCTION 3.2m','sm'),txt(7,16,'WEST'),txt(7,13,'SPAWN','sm'),txt(77,48,'EAST'),txt(77,45,'SPAWN','sm'),txt(39,52,'TEA TERRACE +2.4'),txt(10,40,'CLOTHES','sm'),txt(41,6,'APPLIANCE HALL','sm'),txt(67,29,'REPAIR','sm'),txt(24,12,'SHOES','sm'),txt(61,38,'BOOKS','sm')]
for pts,col in [([(7,16),(7,11),(12,11),(12,13),(17,13),(17,18),(24,18),(24,26),(31,26),(37,28)],'#bb6849'), ([(7,16),(8,26),(18,27),(24,31),(25,43),(30,47)],'#a17338'), ([(78,48),(78,41),(72,41),(72,46),(69,46),(69,38),(60,38),(53,38)],'#287f88'), ([(78,48),(78,41),(74,41),(74,39),(68,39),(67,31),(61,28),(60,17),(44,17),(44,24)],'#528d92')]:
 coords=' '.join(','.join(map(str,point(*p))) for p in pts);svg.append(f'<polyline points="{coords}" fill="none" stroke="{col}" stroke-width="3" stroke-dasharray="5 5"/>')
svg += ['<text x="70" y="840" font-size="15">Dark = opaque solid masses; low cover ochre = 1.1m, brown = 2.4–2.5m. Garage exits: west east 6m / north 6m;</text>','<text x="70" y="866" font-size="15">east west 6m / south 4m. Ground court mouths: W y24–30 / E y34–44 / S x36–48. All other terrace rear/sides closed.</text>','<text x="70" y="892" font-size="15">Tea section A–A at y44: floor +2.4m, slab 0.35m; edge top +3.55m; screen x36–48 top +5.2m.</text>','<text x="70" y="918" font-size="15">Stairs 12m run / 2.4m rise / 6m wide / 16 risers. East stair turned east–west to preserve ground court doorway.</text>','<text x="70" y="944" font-size="15">Optical prediction: tea side bays see only portions of court; central screen + kiosk divide views. Verify compiled opposing views.</text>','<text x="70" y="970" font-size="15">Standing body 1.8m / r0.35m / eye1.674m; crouch1.1m / eye1.023m. Headroom ≥3.8m beneath awnings.</text>','</svg>']
(P/'layout.svg').write_text('\n'.join(svg))
