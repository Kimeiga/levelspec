from pathlib import Path
import json,math,importlib.util,sys,html
spec=importlib.util.spec_from_file_location('v','projects/galini-reboot/planning/draw-l03.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
d=v.d;out=v.out;e=json.loads((out/'encounters.json').read_text())
def pose(id,role,p,look):return {'id':id,'role':role,'p':p,'eye':p[2]+1.674,'look':look,'stance':'standing','horizontalFov':90,'color':{'leader':'#b9674e','follower':'#497a9c','opponent':'#a54c69','neighbor':'#4f8068'}[role]}
rows=[
('TURN-S1','Laundry return / 180 degrees',['S1a','S1b'],'L1', [5,35,31,62], [pose('L','leader',[20,53.5,2],[22,49,3]),pose('F','follower',[17,49,1],[20,53.5,2]),pose('O','opponent',[26,44.5,4],[22,46,4]),pose('N','neighbor',[10,45,0],[15,46,0])], 'The +2 turn reverses the climb. F must reach the return and upper gallery before a D03 trade; N occupies the undercroft below a real slab, not an imaginary second window.'),
('TURN-S2','Cooper quarter-turn / 90 degrees',['S2a','S2b'],'L2',[33,24,53,52],[pose('L','leader',[47,42,2],[41,42,3]),pose('F','follower',[46,37,1],[47,42,2]),pose('O','opponent',[36.5,45,4],[38,42,4]),pose('N','neighbor',[37,26,0],[46,30,0])],'The outdoor turn changes the uphill challenge from north to west. Press is another arrival after the crest. The lower quay and upper street remain different territories; crest and guards bound support.'),
('TURN-S4','Press house return / 180 degrees',['S4a','S4b'],'L4',[29,68,52,88],[pose('L','leader',[40,83.5,6],[38,79,7]),pose('F','follower',[42,79,5],[40,83.5,6]),pose('O','opponent',[33.5,81,8],[38,74.5,8]),pose('N','neighbor',[49.5,74,4],[46,74,4])],'The lower entry passes through the house before returning toward the A-facing gallery. Walls prevent N trading through the facade. The +6 landing and both flights stay inside the same open slab well.'),
('TURN-S5','Salt store quarter-turn / 90 degrees',['S5a','S5b'],'L5',[88,25,111,46],[pose('L','leader',[103,37,2],[98,37,3]),pose('F','follower',[103,32,1],[103,37,2]),pose('O','opponent',[93,38,4],[95,37,4]),pose('N','neighbor',[109,28.6,0],[103,28.6,0])],'The public foot turns toward a roofed loading loft. D09 and the crest delay the outside follower. N shares the low apron but cannot replace the follower at the upper threshold; inspect both descending and climbing bodies.'),
('TURN-S7','School return / 180 degrees',['S7a','S7b'],'L7',[91,63,117,93],[pose('L','leader',[105,79,6],[102,74,7]),pose('F','follower',[108,74,5],[105,79,6]),pose('O','opponent',[98,84,8],[102,69,8]),pose('N','neighbor',[106,84,4],[112,84,4])],'The occupied lower arcade passes north of the +6 landing. N has 3.7 m under the +8 slab, not 1.7 m under the landing. Slab and well-side enclosure prevent automatic upper-to-lower sight; the stair arrival is a separate challenge.'),
('TURN-S8','Bell public quarter-turn / 90 degrees',['S8a','S8b'],'L8',[109,66,131,91],[pose('L','leader',[122,79,6],[122,74,5]),pose('F','follower',[117,79,7],[122,79,6]),pose('O','opponent',[122,69,4],[122,74,5]),pose('N','neighbor',[116,83,4],[125.5,83,4])],'The public descent bends beside the School while N uses the lower arcade below the neighboring deck. The H-B well stays open; SS03 supports the deck without filling N’s journey. The follower must clear the corner before covering the lower foot.'),
]
turns=[]
body=''
for i,(id,title,stairs,landing,bounds,poses,note) in enumerate(rows):
 x=45+(i%2)*775;y=125+(i//2)*525
 turn={'id':id,'name':title,'stairs':stairs,'landing':landing,'poses':poses,'prediction':note,'inspection':'Capture leader/follower/opponent/neighbor before turn, on landing and after turn; use actual standing and crouch poses. Check guard ends, inner/outer body paths, roof/well headroom and reverse travel.'};turns.append(turn)
 body+=f'<text x="{x}" y="{y}" font-size="20" font-weight="700" fill="#294b55">{title}</text>'
 body+=v.plan(None,bounds,(x,y+20,420,300),poses,False)
 body+=v.wrap(note,x+440,y+38,35,14)
 for j,p in enumerate(poses):body+=v.wrap(f'{p["id"]} {p["role"]}: {p["p"]} / eye{p["eye"]:.3f}',x,y+350+j*24,88,12)
 for p in poses:e['captures'].append({'id':f'CAM-{id}-{p["id"]}','body':p['p'],'eye':[*p['p'][:2],p['eye']],'look':p['look'],'horizontalFov':90,'stance':'standing','reverseAlsoRequired':True,'note':'Added exact turn/neighbor witness. Camera request only; compiled validation remains.'})
body+=v.wrap('Actual 90/180-degree landings, not six isolated straight stairs. Purple arrows show flight direction; L/F/O/N mark leader, follower, opponent and neighboring route. S3 retains its separate occupied +6 Chapel porch and offset second ascent; R6 retains its shallow road turn. No extra spiral is selected merely to add a shape. All viewpoints are predictions; inspect both eye heights and body clearance in native geometry.',45,1720,184,13)
(out/'turns-and-neighbors.svg').write_text(v.base(1590,1820,'GALINI / L03 / turning transfers and neighboring occupation','Existing geometry retained / explicit half-turn and quarter-turn journeys with later camera witnesses',body))
e['turningTransfers']=turns
e['repairWitnesses']={'GA-L02-SP1':['SS01','SS02','SS03'],'GA-L02-SP2':{'R02':'Quay witness (27,27,0) becomes (27,26.2,0)','R07':'Press witness (30,50,4) becomes (28,50,4)','R05/R10':'Salt foot continues to(103,28.6,0), then(109,28.6,0) before(111,25,0)'},'supportClarifications':['SEC06 named F retains F→O sight; deeper southern move may lose it','SEC03 advanced F1=(37,59,4)','SEC09 advanced F1=(102,86,8)']}
(out/'encounters.json').write_text(json.dumps(e,indent=2)+'\n')
# Three exact repaired crossings: lower plans and coordinate sections show the
# suspended edge and actual named members without disguising the old contradiction.
body=''
sections=[
 ('SS01',[90,79,100,91],[(92,84,4),(98,84,4)],'X at Y84; D17 sits in M14 west shell at X95','R08 crosses X94,+4. The west lip has a beam at7.25, then D17 has a3.0 m clear opening. Bearings enter the existing shell above its door head; no lower post blocks the straight arcade.'),
 ('SS02',[94,59,115,70],[(107.7142857,63,4),(108,68,4)],'X at Y63.55; piers bound the Fountain-to-D16 path','R05 crosses Y63,+4 between the two explicit balcony piers. Clear slab underside7.7; beam underside7.25. Balcony W03 remains in its upper screen. The lower path is not a retaining-wall breach.'),
 ('SS03',[110,75,132,90],[(125.5,83,4),(126,77,4)],'Along R08 from (125.5,83) toward (126,77)','R08 crosses the outer deck edge at(125.68,80.84,+4). O04/O05 sit north of the route. Beams tie the edge to School/Bellhouse and a distant bank bearing; no continuous lower wall follows this edge.'),
]
for i,(sid,bounds,path,title,note) in enumerate(sections):
 y=130+i*425;assembly=next(a for a in d['supportAssemblies'] if a['id']==sid)
 body+=f'<text x="45" y="{y}" font-size="22" font-weight="700" fill="#294b55">{sid} / {assembly["name"]}</text>'
 pp=[pose('L','leader',list(path[0]),list(path[1])),pose('O','opponent',list(path[1]),list(path[0]))]
 body+=v.plan(4,bounds,(45,y+20,420,275),pp,False)
 x=515;scale=28;bottom=y+265;z=lambda q:bottom-(q-4)*scale
 body+=f'<text x="{x}" y="{y+30}" font-size="15" fill="#294b55">{html.escape(title)}</text>'
 if sid=='SS01':
  xx=lambda q:x+(q-91)*45
  body+=f'<path d="M{xx(91)},{z(4)} H{xx(99)} M{xx(94)},{z(8)} H{xx(99)}" stroke="#3b5e65" stroke-width="4" fill="none"/>'
  body+=f'<rect x="{xx(94)}" y="{z(8)}" width="{5*45}" height="{.3*28}" fill="#3b5e65"/>'
  body+=f'<rect x="{xx(93.825)}" y="{z(7.7)}" width="{.35*45}" height="{.45*28}" fill="#725c47"/><rect x="{xx(94.775)}" y="{z(10.5)}" width="{.45*45}" height="{3.5*28}" fill="#3b5e65"/>'
  body+=v.wrap('D17 clear Z4–7; upper facade remains opaque.',x,y+320,55,12)
 elif sid=='SS02':
  xx=lambda q:x+(q-97)*29
  body+=f'<path d="M{xx(97)},{z(4)} H{xx(112)} M{xx(98)},{z(8)} H{xx(111)}" stroke="#3b5e65" stroke-width="4" fill="none"/>'
  body+=f'<rect x="{xx(98)}" y="{z(8)}" width="{13*29}" height="{.3*28}" fill="#3b5e65"/>'
  for lo,hi in [(98.05,98.65),(110.25,110.85)]:body+=f'<rect x="{xx(lo)}" y="{z(7.7)}" width="{(hi-lo)*29}" height="{3.7*28}" fill="#725c47"/>'
  body+=v.wrap('Lower route center X≈107.79; piers X98.05–98.65 /110.25–110.85.',x,y+320,55,12)
 else:
  xx=lambda q:x+q*60;edge=math.dist([125.5,83],[125.68,80.84])
  body+=f'<path d="M{xx(0)},{z(4)} H{xx(6.02)} M{xx(0)},{z(8)} H{xx(edge)}" stroke="#3b5e65" stroke-width="4" fill="none"/>'
  body+=f'<rect x="{xx(0)}" y="{z(8)}" width="{edge*60}" height="{.3*28}" fill="#3b5e65"/>'
  body+=f'<rect x="{xx(edge)-7}" y="{z(7.7)}" width="14" height="{.45*28}" fill="#725c47"/><path d="M{xx(edge)},{z(8)} V{z(9.1)}" stroke="#7e6a50" stroke-width="4"/>'
  body+=v.wrap('Deck ends ~2.17 m along this route cut; beam soffit7.25 / guard top9.1.',x,y+320,55,12)
 # standing lower-body envelope and level labels on every coordinate section
 body+=f'<path d="M{x+260},{z(4)} V{z(5.8)}" stroke="#b9674e" stroke-width="8"/><circle cx="{x+260}" cy="{z(5.674)}" r="4" fill="#a54c69"/>'
 for h,offset in [(4,0),(7.25,20),(7.7,10),(8,0)]:body+=f'<text x="{x+450}" y="{z(h)+4+offset}" font-size="11" fill="#294b55">Z{h}</text>'
 body+=v.wrap(note,1045,y+45,58,14)
 body+=v.wrap('Boundary IDs: '+', '.join(assembly['boundaryIds'])+'. Exact member footprints and bearings: layout.json supportAssemblies.',1045,y+205,58,12)
body+=v.wrap('Brown on lower plans: discrete collidable supports. Purple dashed: upper suspended edge; lower movement remains open. The .30 m upper slab stays real; beam depth reduces outside clear height to3.25 m, while School interior arcade retains3.7 m and D17/D18 openings retain3.0 m. Existing full shells remain. These are construction contracts and analytic drawings, not compiled collision or structural-capacity certification.',45,1435,180,13)
(out/'support-repair.svg').write_text(v.base(1590,1530,'GALINI / L03 / bounded School support repair','GA-L02-SP1 / exact suspended edges, real beams and bearings, preserved lower journeys',body))
# Record exact local corrected witnesses next to the floor/shell rather than only prose.
body=''
for i,(rid,title,bounds,z,old,new) in enumerate([
 ('R02','Quay approach',[21,21,39,30],0,[[25,25,0],[27,27,0],[36,26,0]],[[25,25,0],[27,26.2,0],[36,26,0]]),
 ('R07','Press corner',[24,42,34,59],4,[[28,45.5,4],[30,50,4],[28,55,4]],[[28,45.5,4],[28,50,4],[28,55,4]]),
 ('R05 / R10','Salt stair foot',[99,24,114,34],0,[[103,29,0],[109,29,0],[111,25,0]],[[103,29,0],[103,28.6,0],[109,28.6,0],[111,25,0]])]):
 x=45+i*510;y=130;box=(x,y+30,470,420)
 body+=f'<text x="{x}" y="{y}" font-size="20" font-weight="700" fill="#294b55">{rid} / {title}</text>'+v.plan(z,bounds,box,[],False)
 s=min(box[2]/(bounds[2]-bounds[0]),box[3]/(bounds[3]-bounds[1]));xy=lambda p:(x+(p[0]-bounds[0])*s,y+30+(bounds[3]-p[1])*s)
 body+=f'<polyline points="{v.points(old,xy)}" fill="none" stroke="#b55c6d" stroke-width="3" stroke-dasharray="5 4"/><polyline points="{v.points(new,xy)}" fill="none" stroke="#3c7c78" stroke-width="3"/>'
 for p in new:
  xx,yy=xy(p);body+=f'<circle cx="{xx}" cy="{yy}" r="{.3*s}" fill="none" stroke="#3c7c78" stroke-width="1.2"/>'
 body+=v.wrap('Selected centers: '+str(new),x,610,55,13)
body+=v.wrap('Dashed rose: L02 witness. Solid teal and radius-.30 disks: L03 witness. Existing floor topology and shell openings are retained. Local projected capsule/finite-shell checks accompany these drawings; they cannot prove tread collision, guards, headroom or continuous native movement.',45,780,175,14)
(out/'route-repair.svg').write_text(v.base(1590,890,'GALINI / L03 / radius-aware route witness corrections','GA-L02-SP2 / corrected centers stay inside the existing spaces; no new route or body change',body))
print('Wrote focused support, turn/neighbor and route repair sheets; added exact later capture witnesses.')
