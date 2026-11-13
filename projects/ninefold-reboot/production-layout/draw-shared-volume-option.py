from pathlib import Path
import json,html
P=Path(__file__).parents[1];d=json.loads((P/'production-layout/layout-data-r08.json').read_text());parts=[]
parts.append('<svg xmlns="http://www.w3.org/2000/svg" width="1460" height="860"><style>text{font-family:Arial;fill:#233b3d}.h{font-size:22px;font-weight:bold}.b{font-size:17px}.s{font-size:14px}</style><rect width="1460" height="860" fill="#f8f7f0"/>')
def text(x,y,t,cl='b'):parts.append(f'<text x="{x}" y="{y}" class="{cl}">{html.escape(t)}</text>')
text(30,36,'Local comparison NF-V01 · School stair turns through an inhabited service court','h');text(30,65,'Proposal only. R08 remains the compiled baseline; this option has no movement, timing, sightline or architectural acceptance.')
for side in range(2):
 ox=35+side*715;oy=640;s=13
 tr=lambda p:(ox+(p[0]-25)*s,oy-(p[1]-35)*s)
 def poly(p,fill,stroke='#546f65',dash=''):
  q=' '.join(f'{tr(v)[0]},{tr(v)[1]}' for v in p);parts.append(f'<polygon points="{q}" fill="{fill}" stroke="{stroke}" stroke-width="2" stroke-dasharray="{dash}"/>')
 def route(p,color='#345d65',dash=''):
  q=' '.join(f'{tr(v)[0]},{tr(v)[1]}' for v in p);parts.append(f'<polyline points="{q}" fill="none" stroke="{color}" stroke-width="4" stroke-dasharray="{dash}"/>')
 text(ox,104,'R08 · straight S5, full School terrace' if side==0 else 'NF-V01 · quarter-turn S5 + west roof gallery','h')
 for id,fill in [('BOILER','#e7d9b7'),('SCHOOL','#d0e3d8'),('ROOF','#d9dde7')]:
  r=next(r for r in d['rooms'] if r['id']==id);poly(r['polygon'],fill)
 for id in ['BOILER-TANK','R-HUT']:
  o=next(o for o in d['obstacles'] if o['id']==id);poly(o['polygon'],'#a1aaa0')
 route([[30,52],[30,60],[42,60]],'#ae8052','6 4')
 if side==0:
  poly([[34,49],[38,49],[38,61],[34,61]],'#b3c5c6');poly([[34,61],[38,61],[38,64],[34,64]],'#cbd9dc')
  for y in [49+i*.6 for i in range(21)]:route([[34,y],[38,y]],'#6a8e91')
  route([[36,46],[36,64],[38,64]],'#236e79');text(ox+200,480,'S5: z3.2 → 6.4','s')
 else:
  poly([[38,43],[42,43],[42,49],[38,49]],'#c0cfe0');poly([[38,49],[42,49],[42,53],[38,53]],'#c0cfe0');poly([[32,49],[38,49],[38,53],[32,53]],'#a8bdd9');poly([[29,49],[32,49],[32,53],[29,53]],'#a8bdd9');poly([[29,53],[33,53],[33,64],[29,64]],'#b4bfda');poly([[29,61],[36,61],[36,65],[29,65]],'#b4bfda')
  for y in [43+i*.6 for i in range(11)]:route([[38,y],[42,y]],'#6a8e91')
  for x in [32+i*.6 for i in range(11)]:route([[x,49],[x,53]],'#6a8e91')
  route([[40,40],[40,49],[40,51],[32,51],[31,51],[31,63],[36,63]],'#236e79');text(ox+264,488,'4 × 4 m midlanding z4.8','s');text(ox+15,355,'Gallery z6.4','s');text(ox+270,565,'Lower foot z3.2','s')
 text(ox+400,170,'School roof z6.4','b');text(ox+400,250,'Roof hut unchanged','s');text(ox+400,390,'Ground Boiler court','b');text(ox+400,415,'Tank and ground route','s');text(ox+400,438,'must remain usable.','s');text(ox+400,550,'School terrace z3.2','b')
 text(ox+10,690,'Dashed ochre: existing ground movement. Blue: upper route. Footprints shown in meters.','s')
text(30,738,'Potential gain: two-stage clearing and a roof gallery above a real ground courtyard; the sight picture changes at the midlanding.')
text(30,768,'Costs: removes a 4 m strip of School staging, extends the roof commitment, and requires rebuilding adjoining School mass/guards.')
text(30,798,'Compare follower support, court-to-gallery exposure, ground tank clearances and opening timing before selecting. No new graph edge.')
text(30,830,'Disposition: retain R08 now. This is a focused development candidate, not a cosmetic stair-shape swap or an instruction to add a spiral.','s');parts.append('</svg>')
(P/'production-layout/shared-volume-option.svg').write_text('\n'.join(parts))
(P/'production-layout/shared-volume-option.json').write_text(json.dumps({'id':'NF-V01','status':'unselected comparison only; not in AML','lowerFlight':{'a':[40,43,3.2],'b':[40,49,4.8],'width':4,'risers':10,'tread':.6},'midlanding':{'polygon':[[38,49],[42,49],[42,53],[38,53]],'z':4.8},'upperFlight':{'a':[38,51,4.8],'b':[32,51,6.4],'width':4,'risers':10,'tread':.6},'roofGallery':{'polygons':[[[29,49],[32,49],[32,53],[29,53]],[[29,53],[33,53],[33,64],[29,64]],[[29,61],[36,61],[36,65],[29,65]]],'z':6.4},'requiredReview':['School staging and S1/B support','lower Boiler ground movement and tank clearances','new lower/upper information and roof approach timing','School context rebuilt as attached inhabited volume','all cutouts, guards, two flights and landing headroom'],'decision':'Retain R08 pending independent comparison; geometry not implemented.'},indent=2)+'\n')
