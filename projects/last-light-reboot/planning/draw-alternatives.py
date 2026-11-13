from pathlib import Path
from xml.sax.saxutils import escape
import json

ROOT=Path(__file__).parent

def box(x1,y1,x2,y2):
    """Return a counterclockwise rectangular proposal footprint in meters."""
    return [[x1,y1],[x2,y1],[x2,y2],[x1,y2]]

def area(id,name,points,label,z=0):
    """Keep spatial identity, outline, label anchor and floor elevation together."""
    return dict(id=id,name=name,points=points,label=label,z=z)

A=dict(id='A',title='DEPARTMENT AFTER HOURS',extent=[120,96],
 subtitle='A large occupied store beside the public mall; a continuous partial upper gallery, not two isolated lofts.',
 ground=[
 area('W0','West anchor',box(4,40,20,64),[12,53]),area('W1','Window vestibule',box(20,44,30,56),[25,50]),
 area('W2','Concourse bend',[[30,40],[42,40],[42,62],[36,66],[30,60]],[36,51]),
 area('W3','Bookshop cut-through',[[26,58],[36,58],[36,72],[24,72],[24,64],[20,64],[20,60],[26,60]],[29,65]),
 area('W4','Shutter arcade',[[10,64],[20,64],[20,74],[30,74],[30,82],[10,82]],[18,78]),
 area('N1','Skylight promenade',[[30,72],[84,72],[84,84],[70,84],[70,80],[30,80]],[55,77]),
 area('E3','Cinema ticket hall',box(84,66,100,84),[93,77]),
 area('E0','East anchor',box(100,42,116,66),[108,54]),area('E1','Record-store threshold',box(88,46,100,58),[94,52]),
 area('E2','Arcade junction',[[80,34],[94,34],[94,46],[88,46],[88,66],[84,72],[80,72]],[85,61]),
 area('S1','Stockroom dogleg',[[14,26],[30,26],[30,44],[20,44],[20,40],[14,40]],[23,35]),
 area('S2','Loading bay',box(30,18,46,34),[38,25]),area('S3','Service belt',box(46,18,80,28),[63,23]),
 area('S4','Receiving court',[[80,18],[98,18],[98,40],[94,40],[94,34],[80,34]],[89,26]),
 area('D0','Former department store',[[42,32],[74,32],[82,40],[82,64],[76,70],[42,70]],[62,65]),
 area('D1','Parcel threshold',box(50,28,62,36),[56,32]),area('D2','North shop doors',box(64,66,76,76),[70,70])],
 upper=[area('U1','West landing',[[20,72],[24,72],[24,76],[30,76],[30,72],[34,72],[34,82],[20,82]],[27,78],3.6),area('U2','North retail gallery',box(34,70,82,78),[58,74],3.6),
 area('U3','Returns balcony',box(36,46,44,70),[40,59],3.6),area('U4','Cinema gallery',[[78,52],[90,52],[90,76],[78,76]],[84,63],3.6),
 area('U5','Projection lounge',box(90,54,102,76),[96,65],3.6),area('U6','East landing',box(86,46,98,54),[92,50],3.6)],
 stairs=[dict(id='X1',points=box(24,58,30,76),start=[27,58],end=[27,76],rise=3.6),dict(id='X2',points=box(88,28,94,46),start=[91,28],end=[91,46],rise=3.6)],
 masses=[area('M1','Sealed shops',box(10,84,70,94),[40,89]),area('M2','Cinema back wall',box(102,68,116,88),[109,78]),
 area('M3','Plant + stores',box(46,6,80,18),[63,12]),area('M4','Escalator / lift core',box(58,42,64,58),[61,50]),
 area('M5','West stock core',box(4,22,14,40),[9,31])],
 covers=[dict(id='C1',points=box(46,42,52,44),h=1.1),dict(id='C2',points=box(70,56,76,58),h=1.1),dict(id='C3',points=box(45,57,49,62),h=3.2),dict(id='C4',points=box(70,36,74,42),h=3.2)],
 walls=[[[42,32],[50,32]],[[62,32],[74,32],[82,40],[82,54]],[[82,62],[82,64],[76,70]],[[64,70],[42,70],[42,52]],[[42,44],[42,32]]],
 openings=[[[42,44],[42,52]],[[50,32],[62,32]],[[82,54],[82,62]],[[64,70],[76,70]]],
 spawns=[[11,50],[109,54]],objective=dict(center=[60,50],anchor=[54,50],r=8,z=0),
 notes=['Ground objective is inside an occupied store, while the public promenade continues beyond it.','X1 and X2 connect a continuous partial gallery at +3.6 m; upper occupancy does not score.','Store core and shuttered frontage interrupt views. Green mouths are actual openings; thin area lines are not walls.'],
 section='HEIGHT DIAGRAM A (schematic): ground sales floor at 0; partial gallery +3.6; slab 0.35; interior roof +9.6; core +6.8. Ground scoring only.')

B=dict(id='B',title='TWIN ATRIUM EXCHANGE',extent=[120,104],
 subtitle='A raised food court connects two different atria; ground-level circulation continues beneath the objective.',
 ground=[area('W0','West anchor',box(4,8,24,28),[14,18]),area('W1','Department threshold',box(24,10,40,34),[32,22]),
 area('W2','West atrium',[[28,32],[52,32],[58,40],[58,64],[50,72],[28,72]],[43,61]),
 area('W3','Back-of-house',box(8,28,24,54),[16,41]),area('W4','Food preparation',box(12,54,30,78),[20,65]),
 area('W5','Cinema recess',box(24,74,44,88),[34,82]),area('N1','North transfer',box(44,80,70,88),[57,84]),
 area('N2','Upper anchor foyer',box(70,76,98,88),[83,82]),
 area('E0','East anchor',box(98,76,116,98),[107,87]),area('E1','Department threshold',box(82,66,98,96),[90,92]),
 area('E2','East atrium',[[64,26],[88,26],[96,34],[96,66],[88,72],[64,72]],[76,35]),
 area('E3','Delivery passage',box(96,44,112,76),[104,61]),area('E4','Receiving dock',box(86,16,112,44),[105,29]),
 area('E5','South quiet court',box(58,10,90,26),[74,17]),area('S1','Shutter promenade',box(36,12,62,22),[49,17]),
 area('G1','Under-court passage',box(42,44,78,54),[60,49])],
 upper=[area('U0','Food-court exchange',[[48,42],[76,42],[82,48],[82,60],[76,66],[48,66],[42,60],[42,48]],[62,62],3.6),
 area('U1','West gallery',box(36,56,48,72),[42,67],3.6),area('U2','North gallery',box(30,72,78,82),[54,78],3.6),
 area('U3','North entry',box(60,64,68,76),[64,70],3.6),area('U4','East gallery',[[78,30],[88,30],[88,46],[82,46],[82,54],[78,54]],[83,38],3.6),
 area('U5','South gallery',[[50,20],[100,20],[100,28],[94,28],[94,30],[50,30]],[74,25],3.6),area('U6','South entry',box(60,28,68,44),[64,36],3.6),
 area('U7','West stair landing',box(32,56,44,64),[36,59],3.6),area('U8','East stair landing',box(78,38,92,46),[88,43],3.6),area('U9','North service landing',box(22,76,34,84),[27,81],3.6)],
 stairs=[dict(id='X1',points=box(34,38,40,56),start=[37,38],end=[37,56],rise=3.6),
 dict(id='X2',points=box(24,58,30,76),start=[27,58],end=[27,76],rise=3.6),
 dict(id='X3',points=box(82,46,88,64),start=[85,64],end=[85,46],rise=3.6),
 dict(id='X4',points=box(94,28,100,46),start=[97,46],end=[97,28],rise=3.6)],
 masses=[area('M1','Sealed retail',box(4,80,24,98),[14,89]),area('M2','Anchor stores',box(42,4,80,10),[61,7]),
 area('M3','Sealed shop island',box(40,22,56,32),[48,27]),area('M4','Plant block',box(60,90,94,102),[77,96])],
 covers=[dict(id='C1',points=box(57,53,65,60),h=4,z=3.6),dict(id='C2',points=box(47,46,54,48),h=1.1,z=3.6),dict(id='C3',points=box(70,58,77,60),h=1.1,z=3.6)],
 walls=[],openings=[],spawns=[[12,17],[108,88]],objective=dict(center=[61,51],anchor=[61,48],r=7,z=3.6),
 notes=['The raised scoring floor has a real lower passage; ground players must take an ascent to contest.','Grand stairs and service stairs arrive on different sides; the two atria remain visually separate below.','Upper food stalls break a complete ring view. No essential gap jump or hero mobility is assumed.'],
 section='HEIGHT DIAGRAM B (schematic): two open atria rise to +10.8; enclosed transfer floor at 0; food court +3.6; soffit +3.25. Upper scoring only.')

def draw(data):
    """Render two coordinated floor plans and a height diagram from the proposal coordinates."""
    width,height=2040,1390; scale=7.3; offsets=[65,1080]; baseline=910
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
    '<rect width="2040" height="1390" fill="#f5f1e7"/>',
    '<style>text{font-family:Arial,sans-serif;fill:#233e44}.label{font-size:12px;font-weight:700}.tiny{font-size:10px}.title{font-size:34px;font-weight:700}.subtitle{font-size:19px}.note{font-size:17px}</style>',
    f'<text x="55" y="48" class="title">LAST LIGHT REBOOT / {data["id"]} · {escape(data["title"])}</text>',
    f'<text x="55" y="82" class="subtitle">{escape(data["subtitle"])}</text>',
    '<text x="55" y="114" class="note">S01 · 5v5 hero-shooter Control hypothesis · meters / right-handed Z-up · +Y north ↑ · raw proposals awaiting independent comparison</text>']
    def point(p,offset): return [offset+p[0]*scale,baseline-p[1]*scale]
    def poly(points,offset,fill,stroke='#7c8c89',sw=1,opacity=1,dash=''):
        ps=' '.join(','.join(str(round(v,2)) for v in point(p,offset)) for p in points)
        out.append(f'<polygon points="{ps}" fill="{fill}" fill-opacity="{opacity}" stroke="{stroke}" stroke-width="{sw}" stroke-dasharray="{dash}"/>')
    def line(points,offset,color,width,dash=''):
        ps=' '.join(','.join(str(round(v,2)) for v in point(p,offset)) for p in points)
        out.append(f'<polyline points="{ps}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round" stroke-dasharray="{dash}"/>')
    def label(item,offset,short=False):
        x,y=point(item['label'],offset);name=item['name']; out.append(f'<text x="{x}" y="{y-3}" text-anchor="middle" class="label">{escape(item["id"])} +{item["z"]:g}</text>')
        if not short:
            words=name.split(); mid=(len(words)+1)//2
            for i,s in enumerate([' '.join(words[:mid]),' '.join(words[mid:])]):
                if s:out.append(f'<text x="{x}" y="{y+12+i*12}" text-anchor="middle" class="tiny">{escape(s)}</text>')
    for layer,offset in enumerate(offsets):
        out.append(f'<text x="{offset}" y="157" font-size="24" font-weight="bold">{ "GROUND / 0 m" if layer==0 else "UPPER / +3.6 m" }</text>')
        for x in range(0,121,20):
            line([[x,0],[x,104]],offset,'#dce0d7',.7)
            px,py=point([x,0],offset);out.append(f'<text x="{px}" y="{py+20}" class="tiny" text-anchor="middle">{x}</text>')
        for y in range(0,105,20):
            line([[0,y],[120,y]],offset,'#dce0d7',.7)
            px,py=point([0,y],offset);out.append(f'<text x="{px-15}" y="{py+4}" class="tiny" text-anchor="end">{y}</text>')
        for a in data['ground']:poly(a['points'],offset,'#dedaca' if layer==0 else '#e9e6dd',sw=1.5,opacity=1 if layer==0 else .6)
        for a in data['masses']:poly(a['points'],offset,'#53666a',sw=1.5,opacity=.9 if layer==0 else .24)
        if layer==0:
            for a in data['ground']:label(a,offset)
            for walls in data['walls']:line(walls,offset,'#203d43',6)
            for mouth in data['openings']:line(mouth,offset,'#4a9e83',5)
            for a in data['upper']:poly(a['points'],offset,'none','#a87790',2,.8,'7 5')
        else:
            for a in data['upper']:poly(a['points'],offset,'#d9adba','#955d77',2)
            for a in data['upper']:label(a,offset)
            # Visible atrium voids remain pale ground below; no implied upper floor across them.
        for stair in data['stairs']:
            poly(stair['points'],offset,'#c7b077','#8b7847',1.5)
            x1,y1=stair['points'][0];x2,y2=stair['points'][2]
            for j in range(1,24):
                y=y1+(y2-y1)*j/24;line([[x1,y],[x2,y]],offset,'#8d7b50',.9)
            line([stair['start'],stair['end']],offset,'#233f44',2)
            a=point(stair['end'],offset);b=point(stair['start'],offset);dy=1 if a[1]>b[1] else -1
            out.append(f'<path d="M{a[0]-4},{a[1]-dy*7} L{a[0]},{a[1]} L{a[0]+4},{a[1]-dy*7}" fill="none" stroke="#233f44" stroke-width="2"/>')
            x,y=point([(x1+x2)/2,(y1+y2)/2],offset);out.append(f'<text x="{x-26}" y="{y}" class="label" transform="rotate(-90 {x-26} {y})">{stair["id"]} 0→3.6</text>')
        for c in data['covers']:
            if (c.get('z',0)==0 and layer==0) or (c.get('z',0)>0 and layer==1):
                poly(c['points'],offset,'#bb879b' if c['h']<2 else '#3a575c',sw=1.3)
                p=c['points'];x,y=point([(p[0][0]+p[2][0])/2,(p[0][1]+p[2][1])/2],offset)
                out.append(f'<text x="{x}" y="{y-5}" class="tiny" text-anchor="middle">{c["id"]} h{c["h"]}</text>')
        if layer==0:
            for i,p in enumerate(data['spawns']):
                x,y=point(p,offset);out.append(f'<circle cx="{x}" cy="{y}" r="9" fill="{["#26989c","#da834e"][i]}" stroke="white" stroke-width="2"/><text x="{x}" y="{y+35}" text-anchor="middle" class="label">SPAWN {i+1}</text>')
        objective=data['objective']
        if (objective['z']==0 and layer==0) or (objective['z']>0 and layer==1):
            x,y=point(objective['center'],offset);out.append(f'<circle cx="{x}" cy="{y}" r="{objective["r"]*scale}" fill="#67b6c6" fill-opacity=".13" stroke="#27788a" stroke-width="3" stroke-dasharray="10 5"/><text x="{x}" y="{y-15}" class="label" text-anchor="middle">CONTROL +{objective["z"]:g}</text>')
        line([[0,-5],[20,-5]],offset,'#233f44',3);out.append(f'<text x="{offset+73}" y="{baseline+55}" class="label" text-anchor="middle">20 m</text>')
    out.append('<line x1="1020" y1="145" x2="1020" y2="964" stroke="#b5c0b8"/>')
    out.append('<text x="55" y="1000" class="note" font-weight="bold">READING: cream = ground · pink = upper floor · ochre = stair · dark = solid mass · dashed pink = overhead floor footprint</text>')
    for i,note in enumerate(data['notes']):out.append(f'<text x="55" y="1038" class="note" transform="translate(0 {i*29})">{escape(note)}</text>')
    out.append(f'<text x="55" y="1150" class="note" font-weight="bold">{escape(data["section"])}</text>')
    # A schematic height diagram illustrates occupied levels; this is not a projected section.
    out.append('<g transform="translate(0 50)"><rect x="80" y="1250" width="690" height="8" fill="#687c7c"/><rect x="180" y="1206" width="170" height="5" fill="#a7738b"/><rect x="550" y="1206" width="170" height="5" fill="#a7738b"/><path d="M180,1250 L290,1206 M610,1206 L720,1250" fill="none" stroke="#9d8855" stroke-width="5"/><path d="M80,1140 L80,1250 M770,1140 L770,1250" stroke="#687c7c" stroke-width="8"/><path d="M80,1140 L770,1140" stroke="#687c7c" stroke-width="5" stroke-dasharray="35 15"/>')
    if data['id']=='B':out.append('<rect x="350" y="1206" width="200" height="5" fill="#a7738b"/>')
    else:out.append('<rect x="415" y="1168" width="50" height="82" fill="#3a575c"/>')
    out.append('<text x="800" y="1208" class="note">+3.6 occupied floor / 3.25 m clear below</text><text x="800" y="1255" class="note">0 ground floor · body radius .40 / standing 2.0 m</text></g><text x="55" y="1360" class="note">Roof/skylight geometry will be modeled. This drawing is an architectural hypothesis, not compiled reachability or gameplay acceptance.</text></svg>')
    return '\n'.join(out)

for data in [A,B]:
    (ROOT/f'proposal-{data["id"].lower()}-s01.json').write_text(json.dumps(data,indent=2))
    (ROOT/f'proposal-{data["id"].lower()}-s01.svg').write_text(draw(data))
