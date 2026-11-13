from pathlib import Path
import json,html
P=Path(__file__).parent

def room(id,label,box,z,kind='open'):
 x,y,w,h=box
 return dict(id=id,label=label,polygon=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],z=z,kind=kind)
def path(id,points,z,width=4):return dict(id=id,points=points,z=z,width=width)
def stair(id,a,b,low,high):return dict(id=id,a=a,b=b,low=low,high=high,width=4)
A=dict(id='A',name='Courtyard Stack',extent=[80,96],subtitle='Several occupied courts, a through-gallery and a roof precinct around two offset light wells.',rooms=[
room('T','CART GATE',[8,5,12,12],0),room('MARKET','PRINT COURT',[19,20,15,12],0),room('NOODLE','NOODLE WORKS',[35,30,13,12],0,'indoor'),room('A','A / MACHINE COURT',[56,38,18,20],0,'indoor'),room('DYE','DYE STORE',[61,64,13,9],0,'indoor'),room('PUMP','PUMP COURT',[12,60,17,12],0),room('WORKSHOP','REPAIR SHOP',[9,39,14,12],0,'indoor'),room('WELL','LOW LIGHTWELL',[28,46,16,15],0),room('HERB','HERB SHOP',[52,15,14,12],0,'indoor'),room('CT','CT / SERVICE GATE',[58,83,15,9],0),
room('LAUNDRY','LAUNDRY',[9,61,15,8],3.2),room('CLINIC','CLINIC HALL',[49,62,12,13],3.2,'indoor'),room('GALLERY','WELL GALLERY',[28,45,18,5],3.2),room('TEA','TEA LANDING',[59,39,10,8],3.2,'indoor'),room('B','B / TANK COURT',[21,70,21,15],6.4),room('DRYING','DRYING COURT',[47,78,12,10],6.4)],paths=[
path('cart-print',[[14,16],[14,24],[20,24]],0,4.5),path('south-arcade',[[20,10],[42,10],[42,20],[52,20]],0,5),path('print-noodle',[[34,26],[41,26],[41,30]],0),path('print-repair',[[24,32],[24,36],[17,36],[17,39]],0),path('covered-street',[[48,36],[52,36],[52,45],[56,45]],0,4.5),path('valve-alley',[[66,21],[69,21],[69,38]],0),path('repair-well',[[23,44],[31,44],[31,46]],0),path('well-pump',[[28,55],[24,55],[24,60]],0),path('well-dye',[[44,55],[51,55],[51,68],[61,68]],0),path('dye-A',[[68,64],[68,58]],0),path('north-service',[[20,72],[20,78],[53,78],[64,78],[64,83]],0,4.5),path('CT-dye',[[67,83],[67,73]],0),
path('laundry-gallery',[[24,65],[25,65],[25,48],[28,48]],3.2),path('gallery-clinic',[[46,48],[51,48],[51,62]],3.2),path('tea-clinic',[[64,47],[64,57],[56,57],[56,62]],3.2),path('gallery-tea',[[46,48],[55,48],[55,43],[59,43]],3.2),path('herb-top',[[57,37],[62,37],[62,39]],3.2),path('well-top',[[47,60],[51,60],[51,62]],3.2),path('roof-fold',[[42,80],[47,80]],6.4),path('laundry-top',[[20,77],[24,77]],6.4)],stairs=[stair('S1',[13,49],[13,61],0,3.2),stair('S2',[57,25],[57,37],0,3.2),stair('S3',[56,79],[56,67],0,3.2),stair('S4',[35,60],[47,60],0,3.2),stair('S5',[20,65],[20,77],3.2,6.4),stair('S6',[51,72],[51,84],3.2,6.4)],anchors={'T':[14,10,0],'CT':[65,88,0],'A':[65,48,0],'B':[31,78,6.4]},views=[dict(a=[36,48],b=[36,56],z=3.2,label='gallery → well'),dict(a=[64,43],b=[64,51],z=3.2,label='tea → A threshold')],journeys=['Cart Gate → Print Court → Repair Shop → Laundry → Tank Court, with lower Lightwell and gallery exits after contact.','Cart Gate → South Arcade → Herb Shop → A south threshold; Herb stair can shift pressure to Tea / Clinic.','CT Service Gate → Dye Store → A rear, or North Service → Clinic / Drying Court → B east.'],risks=['The middle gallery may compress too much territory into one rotation hub; review its exposed versus screened segments.','B western/eastern arrivals need distinct clearings around tank masses; do not count two nearby mouths as independent strategies.'])
B=dict(id='B',name='Loft Street',extent=[98,86],subtitle='A dogleg commercial street passes below a split factory loft; roof travel reconnects its two approach districts.',rooms=[
room('T','CANAL GATE',[5,9,13,12],0),room('AWNING','AWNING COURT',[24,10,15,14],0),room('UNDER','FACTORY UNDERPASS',[43,30,18,9],0,'indoor'),room('A','A / PORCELAIN WORKS',[73,42,19,20],0,'indoor'),room('BOILER','BOILER COURT',[28,50,16,15],0),room('DYE','DYE STORE',[51,52,13,13],0,'indoor'),room('CT','CT / WATER STREET',[67,70,15,12],0),room('BUTCHER','BUTCHER ARCADE',[11,31,13,13],0,'indoor'),room('DRAIN','DRAIN POCKET',[13,50,10,8],0),room('WELL','LIFT LIGHTWELL',[46,42,10,9],0),
room('LAUNDRY','SCHOOL LANDING',[33,40,10,11],3.2),room('EAST','EAST LANDING',[62,39,10,10],3.2),room('SIGN','SIGN GALLERY',[80,48,10,10],3.2),room('BOILERG','BOILER GALLERY',[59,51,9,5],3.2),room('ROOF','ROOF COURT',[32,61,16,11],6.4),room('RESERVOIR','RESERVOIR ROOF',[57,64,12,10],6.4)],paths=[
path('canal-awning',[[18,15],[24,15]],0,5),path('canal-butcher',[[11,21],[11,31]],0),path('dogleg-street',[[37,24],[40,28],[40,34],[43,34]],0,5),path('tailor-alley',[[39,17],[56,17],[56,24],[68,24],[68,39],[78,42]],0),path('butcher-drain',[[17,44],[17,50]],0),path('paper-arcade',[[24,39],[31,39],[31,34],[43,34]],0),path('drain-boiler',[[23,54],[28,54]],0),path('boiler-dye',[[44,58],[51,58]],0),path('under-well',[[52,39],[52,42]],0),path('well-dye',[[52,51],[52,52]],0),path('dye-A',[[64,58],[73,58]],0,4.5),path('water-street',[[59,65],[59,76],[67,76]],0,5),path('A-CT',[[82,62],[82,70]],0,4.5),path('tailor-stair',[[68,27],[65,27]],0),
path('east-sign',[[72,46],[80,46],[84,48]],3.2),path('east-boiler',[[66,49],[66,51]],3.2),path('loft-boiler',[[59,52],[59,54],[61,54]],3.2),path('roof-seam',[[48,67],[57,67]],6.4)],stairs=[stair('S1',[21,42],[33,42],0,3.2),stair('S2',[65,27],[65,39],0,3.2),stair('S3',[60,65],[60,53],0,3.2),stair('S4',[86,62],[86,50],0,3.2),stair('S5',[36,49],[36,61],3.2,6.4),stair('S6',[65,54],[65,66],3.2,6.4)],anchors={'T':[11,15,0],'CT':[74,77,0],'A':[83,52,0],'B':[52,36,3.2]},views=[dict(a=[50,40],b=[50,47],z=3.2,label='loft → lift well'),dict(a=[84,52],b=[78,52],z=3.2,label='sign → A shoulder'),dict(a=[41,66],b=[38,58],z=6.4,label='roof → boiler edge')],journeys=['Canal Gate → Butcher Arcade → School Landing → B west; Drain / Boiler remains a lower continuation after early contact.','Canal Gate → Awning Court → dogleg Underpass → Lift Well → Dye Store; Tailor Alley commits to A or East Landing.','CT Water Street → Dye Store → B north stair, or A rear → Sign Gallery → East Landing; Roof Court is a longer approach switch.'],risks=['B surrounds a lift well above a real through-route; distinguish sound/visibility assumptions and isolate unavoidable multi-level threats.','The roof bypass must cost meaningful time without becoming a dominant panorama over both objectives.'])
B['rooms'].append(dict(id='B',label='B / MACHINE LOFT',polygon=[[42,32],[62,32],[62,53],[56,53],[56,41],[46,41],[46,52],[42,52]],z=3.2,kind='indoor'))

# Unequal construction bays and retained equipment carve the occupied outlines.
shapesA={
 'MARKET':[[19,20],[28,20],[28,18],[34,18],[36,25],[32,32],[19,32]],
 'NOODLE':[[35,30],[48,30],[48,42],[40,42],[40,39],[35,39]],
 'A':[[56,38],[66,38],[66,35],[74,38],[74,58],[64,58],[64,55],[56,55]],
 'WELL':[[28,46],[39,46],[44,50],[44,59],[36,63],[28,58]],
 'B':[[21,70],[28,70],[28,67],[42,67],[42,85],[34,85],[34,82],[21,82]],
 'WORKSHOP':[[9,39],[18,39],[18,37],[23,37],[23,51],[9,51]]}
shapesB={
 'AWNING':[[24,10],[39,10],[39,21],[35,25],[24,24]],
 'A':[[73,42],[83,42],[83,39],[92,42],[92,62],[81,62],[81,59],[73,59]],
 'BOILER':[[28,50],[40,50],[44,54],[44,65],[34,65],[34,62],[28,62]],
 'BUTCHER':[[11,31],[24,31],[24,39],[21,39],[21,44],[11,44]],
 'ROOF':[[32,61],[43,61],[48,65],[48,72],[32,72]]}
for model,shapes in [(A,shapesA),(B,shapesB)]:
 for r in model['rooms']:
  if r['id'] in shapes:r['polygon']=shapes[r['id']]

colors={0:'#f1e6c9',3.2:'#9bc9bd',6.4:'#e8b580'}
def draw(d):
 w,h=d['extent']; scale=min(560/w,640/h); margin=45; panelw=610; W=1880; H=1080
 out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"><defs><filter id="outline" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius=".22" result="d"/><feFlood flood-color="#354a4b"/><feComposite in2="d" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter><marker id="up" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#a45067"/></marker></defs><rect width="100%" height="100%" fill="#f6f1e6"/><g fill="#253c3f" font-family="Arial,sans-serif"><text x="35" y="43" font-size="28" font-weight="bold">NINEFOLD REBOOT · Alternative {d["id"]} / {d["name"]} · S01</text><text x="35" y="72" font-size="17">{html.escape(d["subtitle"])}</text><text x="35" y="98" font-size="14">Raw proposal for independent comparison · meters · north ↑ · new composition, not a source reconstruction · no favorite selected</text>']
 for k,z in enumerate([0,3.2,6.4]):
  ox=30+k*panelw;oy=140
  out.append(f'<text x="{ox+15}" y="{oy-10}" font-size="19" font-weight="bold">{["GROUND / z0","MIDDLE / z3.2","ROOFS / z6.4"][k]}</text>')
  out.append(f'<g transform="translate({ox+margin},{oy+h*scale}) scale({scale},-{scale})"><rect x="0" y="0" width="{w}" height="{h}" fill="#a5aba3" stroke="#79877f" stroke-width=".3"/>')
  # Dashed other-level footprints retain alignment without declaring an extra floor.
  for r in d['rooms']:
   if r['z']!=z: out.append(f'<polygon points="{" ".join(f"{x},{y}" for x,y in r["polygon"])}" fill="none" stroke="#667870" stroke-width=".22" stroke-dasharray="1 1"/>')
  out.append(f'<g filter="url(#outline)" fill="{colors[z]}">')
  for r in d['rooms']:
   if r['z']==z:out.append(f'<polygon points="{" ".join(f"{x},{y}" for x,y in r["polygon"])}"/>')
  for p in d['paths']:
   if p['z']==z:out.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in p["points"])}" fill="none" stroke="{colors[z]}" stroke-width="{p["width"]}" stroke-linejoin="round"/>')
  out.append('</g>')
  for s in d['stairs']:
   if z not in [s['low'],s['high']]:continue
   a,b=s['a'],s['b'];out.append(f'<path d="M{a[0]},{a[1]} L{b[0]},{b[1]}" stroke="#e3b8bd" stroke-width="{s["width"]}"/><path d="M{a[0]},{a[1]} L{b[0]},{b[1]}" stroke="#a45067" stroke-width=".45" marker-end="url(#up)"/>')
  for v in d['views']:
   if v['z']==z:out.append(f'<path d="M{v["a"][0]},{v["a"][1]} L{v["b"][0]},{v["b"][1]}" stroke="#287a95" stroke-width=".45" stroke-dasharray=".8 .6"/>')
  for key,p in d['anchors'].items():
   if p[2]==z:out.append(f'<circle cx="{p[0]}" cy="{p[1]}" r="2.8" fill="none" stroke="{"#bc6444" if key in ["A","B"] else "#376d65"}" stroke-width=".6"/>')
  out.append('</g>')
  def label(x,y,t,size=11,weight='normal'):out.append(f'<text x="{ox+margin+x*scale}" y="{oy+(h-y)*scale}" text-anchor="middle" font-size="{size}" font-weight="{weight}" paint-order="stroke" stroke="#f6f1e6" stroke-width="2">{html.escape(t)}</text>')
  for r in d['rooms']:
   if r['z']==z:
    xs=[p[0] for p in r['polygon']];ys=[p[1] for p in r['polygon']];x=(min(xs)+max(xs))/2;y=(min(ys)+max(ys))/2
    if r['id']=='B' and d['id']=='B':y=36
    label(x,y,r['label'],11,'bold')
    if r['kind']=='indoor':label(x,y-2.3,'enclosed volume',9)
  for s in d['stairs']:
   if z in [s['low'],s['high']]:label((s['a'][0]+s['b'][0])/2+3,(s['a'][1]+s['b'][1])/2,f'{s["id"]} ↑ {s["low"]}→{s["high"]}',10)
  out.append(f'<path d="M{ox+margin},{oy+h*scale+18} h{10*scale}" stroke="#253c3f" stroke-width="3"/><text x="{ox+margin}" y="{oy+h*scale+35}" font-size="12">10 m</text>')
 out.append('<text x="35" y="840" font-size="16" font-weight="bold">Read the spatial relationships</text>')
 for i,t in enumerate(d['journeys']):out.append(f'<text x="35" y="870" transform="translate(0,{i*25})" font-size="15">{html.escape(t)}</text>')
 out.append('<text x="35" y="963" font-size="14">Solid gray = inaccessible residential/service mass; colored fill = occupied floor; dashed outlines = another level only. Pink arrows = explicit stairs.</text><text x="35" y="986" font-size="14">Blue dashed lines = bounded observation hypotheses, not movement. Covered volumes retain real roofs; roof cutaways are an inspection choice.</text><text x="35" y="1009" font-size="14">Floor polygons and stair endpoints are provisional. Detailed walls, door apertures, local cover and physical transfer landings follow independent selection.</text><text x="35" y="1032" font-size="14">Do not infer navigation, utility, sound separation or competitive balance from this drawing. Typical links 4–5 m; no mandatory jump, ladder or drop.</text></g></svg>')
 return ''.join(out)
for d in [A,B]:
 (P/f'alternative-{d["id"].lower()}-s01.svg').write_text(draw(d))
(P/'alternatives-data.json').write_text(json.dumps([A,B],indent=2)+'\n')
