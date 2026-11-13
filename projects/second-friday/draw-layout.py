"""Building-first outdoor market proposal, with explicit freestanding footprints."""
from pathlib import Path
import json
P=Path(__file__).parent
buildings=[
 ('B01','Limestone apartments',[(0,14),(30,14),(30,34),(20,34),(20,40),(0,40)],9),
 ('B02','Tailor walk-up',[(36,8),(58,8),(58,24),(50,24),(50,32),(36,32)],7.5),
 ('B03','Radio house',[(70,10),(92,10),(92,28),(82,28),(82,34),(70,34)],8.4),
 ('B04','East workshops',[(108,22),(130,22),(130,48),(116,48),(116,42),(108,42)],6.8),
 ('B05','Repair wedge',[(86,42),(100,34),(110,50),(102,60),(92,56)],5.5),
 ('B06','Auction house',[(50,40),(66,36),(76,46),(72,56),(58,56),(50,50)],6),
 ('B07','Carpet sellers',[(22,48),(36,44),(42,58),(34,66),(22,62)],7),
 ('B08','Tea house roof',[(54,78),(78,78),(78,94),(54,94)],3.2),
 ('B09','Book depot',[(98,72),(120,72),(120,94),(98,94)],9),
 ('B10','North tenement',[(16,84),(44,84),(44,100),(16,100)],8),
 ('B11','West tenement',[(0,56),(16,56),(20,70),(14,76),(0,76)],9)]
stairs=[('ST-W',[60,62,0],[60,78,3.2],5.2),('ST-E',[94,88,0],[78,88,3.2],5.2)]
D={'revision':'B02','extent':[0,0,136,108],'buildings':buildings,'stairs':stairs,'spawns':{'W':[8,92,0],'E':[124,10,0]},'objective':{'center':[86,64,0],'bounds':[76,56,90,70]}}
cover=[('AUCTION-CABINET',81,61,84,64,2.6),('CLOCKS',77,56,80,58,1.1),('BOOKS',86,68,90,70,1.1),('RADIO-RACK',79,39,81,43,2.4),('CARPET-LOW',44,60,47,64,1.1),('CLOTHES-LOW',44,74,48,76,1.1),('WARDROBES',28,72,32,75,2.5),('APPLIANCES',118,56,122,59,2.5),('FRIDGES',104,62,108,65,2.5),('E-LOW',96,68,100,70,1.1),('COPPER-LOW',61,26,65,29,1.1),('COPPER-RACK',64,32,66,34,2.5),('BOOK-RACK',88,74,92,77,2.5)]
D['cover']=cover
D['roofScreen']=[66,77.8,74,78.2,6.0]
(P/'layout-data.json').write_text(json.dumps(D,indent=2)+'\n')
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1450" height="1230" viewBox="0 0 1450 1230"><rect width="1450" height="1230" fill="#f7f1e5"/><style>text{font-family:Arial,sans-serif;fill:#243b43}.sm{font-size:12px}.name{font-size:14px;font-weight:bold}</style><text x="65" y="44" font-size="30" font-weight="bold">SECOND FRIDAY — building-first outdoor district</text><text x="65" y="74" font-size="17">Amman, Jordan · 5v5 control · B02 developed layout · 136 × 108m · meters / Z-up · N = +Y ↑</text>']
def pt(x,y):return (65+x*9.5,1125-y*9.5)
def rect(x0,y0,x1,y1,fill,stroke='#8b8e7d'):
 x,y=pt(x0,y1);return f'<rect x="{x}" y="{y}" width="{(x1-x0)*9.5}" height="{(y1-y0)*9.5}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
def text(x,y,s,cl='name'):
 a,b=pt(x,y);return f'<text x="{a}" y="{b}" text-anchor="middle" class="{cl}">{s}</text>'
svg.append(rect(0,0,136,108,'#e9dec8'))
# Building masses are the first authored entities. All remaining tan space is outdoors.
for id,name,pts,h in buildings:
 coords=' '.join(','.join(map(str,pt(x,y))) for x,y in pts);svg.append(f'<polygon points="{coords}" fill="'+('#bdd2c9' if id=='B08' else '#5d6a6a')+'" stroke="#314b50" stroke-width="2"/>')
 cx=sum(x for x,y in pts)/len(pts);cy=sum(y for x,y in pts)/len(pts)
 a,b=pt(cx,cy);svg.append(f'<text x="{a}" y="{b}" text-anchor="middle" fill="white" style="fill:'+('#243b43' if id=='B08' else '#fff4dc')+'" font-family="Arial" font-size="15">'+id+f' / {h}m</text>')
for id,a,b,w in stairs:
 x0=min(a[0],b[0]);x1=max(a[0],b[0]);y0=min(a[1],b[1]);y1=max(a[1],b[1]);v=x0==x1
 if v:x0-=w/2;x1+=w/2
 else:y0-=w/2;y1+=w/2
 svg.append(rect(x0,y0,x1,y1,'#c8a875'))
 for i in range(1,21):
  t=i/20;s,e=(pt(x0,y0+(y1-y0)*t),pt(x1,y0+(y1-y0)*t)) if v else (pt(x0+(x1-x0)*t,y0),pt(x0+(x1-x0)*t,y1));svg.append(f'<path d="M{s[0]},{s[1]}L{e[0]},{e[1]}" stroke="#9a825e"/>')
 svg.append(text((x0+x1)/2,(y0+y1)/2,'↑ +3.2' if v else '← +3.2','sm'))
svg+= [rect(2,84,14,104,'#d5a587'),text(8,96,'W'),text(8,93,'SPAWN','sm'),rect(116,2,134,18,'#90b8bd'),text(125,11,'E SPAWN','sm'),rect(76,56,90,70,'none','#c97528'),text(84,66,'CONTROL'),text(66,73,'AUCTION SQUARE','sm'),text(47,59,'CARPET BEND','sm'),text(46,38,'TAILOR STREET','sm'),text(67,28,'COPPER CROSS','sm'),text(122,59,'APPLIANCE YARD','sm'),text(88,77,'BOOK WALK','sm'),text(67,97,'ROOF TEA TERRACE','sm'),text(33,80,'NORTH CLOTHES','sm'),text(36,104,'SERVICE STREET','sm')]
for id,x0,y0,x1,y1,h in cover:
 svg.append(rect(x0,y0,x1,y1,'#c18d57' if h>2 else '#dbb76d'));svg.append(text((x0+x1)/2,y1+.8,id,'sm'))
svg.append(rect(66,77.8,74,78.2,'#344c51'))
# Provisional journeys show choices through voids, not implied building interiors.
for pts,c in [([(8,92),(8,80),(30,80),(46,74),(50,64),(54,60),(74,60),(80,62)],'#a86642'), ([(8,92),(8,104),(50,104),(50,80),(50,64),(54,60),(60,60),(60,82)],'#a86642'), ([(124,10),(100,6),(96,30),(84,36),(82,50),(84,58)],'#38868e'), ([(124,10),(132,18),(133,54),(116,54),(110,66),(96,66),(88,64)],'#38868e')]:
 coords=' '.join(','.join(map(str,pt(x,y))) for x,y in pts);svg.append(f'<polyline points="{coords}" fill="none" stroke="{c}" stroke-width="3" stroke-dasharray="6 5"/>')
svg+=['<text x="65" y="1165" font-size="16">Dark masses = closed freestanding buildings. Every tan street, alley and courtyard is outdoors; no playable building interiors.</text>','<text x="65" y="1192" font-size="16">Green B08 = one accessible roof terrace; two external stairs. Low displays = ochre 1.1m; tall racks = brown 2.4–2.6m. Partial cloth roofs are noncolliding scenery.</text>','</svg>']
(P/'layout.svg').write_text('\n'.join(svg))
