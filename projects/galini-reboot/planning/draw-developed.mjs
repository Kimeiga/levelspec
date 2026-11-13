import { writeFile, mkdir } from 'node:fs/promises';
import { launchBrowser } from '../../../tests/browser/support/browser.mjs';
const out='projects/galini-reboot/planning/developed';
await mkdir(out,{recursive:true});
const rect=(x1,y1,x2,y2)=>[[x1,y1],[x2,y1],[x2,y2],[x1,y2]];
const floors=[
 {id:'F00',name:'Ferry / Shore Toe / Boat District',z:0,p:[[0,2],[42,2],[48,9],[58,11],[66,17],[74,12],[84,12],[90,2],[128,2],[131,21],[127,34],[76,34],[73,29],[65,27],[57,29],[49,34],[4,34],[-1,24]]},
 {id:'F04W',name:'Laundry / Press district',z:4,p:[[5,46],[50,46],[50,66],[8,66],[3,57]]},
 {id:'F04E',name:'Taverna / School district',z:4,p:[[78,46],[127,46],[130,57],[125,66],[78,66]]},
 {id:'F08W',name:'Chapel / Cistern district',z:8,p:[[8,78],[50,78],[50,96],[32,107],[10,100],[4,88]]},
 {id:'F08E',name:'Inn / Bell / Ridge district',z:8,p:[[78,78],[127,78],[131,101],[112,111],[84,106],[76,96],[76,84]]},
 {id:'BR-M',name:'Middle market bridge',z:4,p:rect(50,54,78,60),bridge:true,clearWidth:5.3,deckThickness:.6,piers:[{x:58,y:57,width:2,base:-6,top:3.4},{x:70,y:57,width:2,base:-6,top:3.4}]},
 {id:'BR-U',name:'Upper civic bridge',z:8,p:rect(50,86,76,92),bridge:true,clearWidth:5.3,deckThickness:.7,piers:[{x:58,y:89,width:2,base:-6,top:7.3},{x:68,y:89,width:2,base:-6,top:7.3}]},
];
const buildings=[
 ['M01','Ferry store',0,rect(0,3,10,14),4.8,'hipped'],
 ['M02','Fish houses',0,[[20,5],[31,5],[31,16],[23,18],[19,14]],6.2,'paired gables'],
 ['M03','Net shed',0,[[33,24],[43,24],[43,30],[34,31]],3.8,'shed'],
 ['M04','Laundry row',4,[[5,48],[15,48],[15,59],[11,62],[5,59]],6.3,'paired gables'],
 ['M05','Press house and return',4,[[27,47],[41,47],[41,58],[43,58],[43,65],[36,65],[36,57],[27,57]],6.0,'two gables'],
 ['M06','Potter house',4,rect(25,60,36,66),5.2,'hipped'],
 ['M07','Chapel',8,[[12,82],[22,82],[22,99],[16,102],[12,99]],6.7,'gable with apse'],
 ['M08','West Homes / bridge return',8,[[33,78],[43,78],[43,87],[44,87],[44,95],[39,95],[39,89],[33,89]],6.4,'two gables'],
 ['M09','Cistern house',8,[[29,100],[38,98.8],[38,102.5],[30,105]],4.5,'hipped'],
 ['M10','Boat shed / harbor bend',0,[[86,8],[101,8],[101,23],[96,23],[96,20],[87,20]],5.2,'two gables'],
 ['M11','Salt store',0,[[78,29],[95,29],[95,34],[79,34]],5.0,'shed'],
 ['M12','Customs house',0,rect(114,19,126,29),6.5,'hipped'],
 ['M13','Taverna / middle gateway',4,rect(78,48,96,62),6.3,'two gables'],
 ['M14','School / arcade',4,rect(100,57,112,66),6.2,'gable'],
 ['M15','East homes',4,rect(116,51,127,61),6.0,'paired gables'],
 ['M16','Upper Inn / civic arch',8,rect(76,83,87,97),7.0,'hipped'],
 ['M17','Bell building',8,[[102,81],[113,81],[114,93],[103,94]],7.3,'gable + bell turret'],
 ['M18','Gatehouse',8,[[118,97],[128,98],[127,103],[118,106]],6.2,'hipped'],
 ['M19','Shore workshop',0,[[53,11],[62,12],[62,18],[54,18]],4.6,'shed'],
 ['M20','Waterfront homes',0,[[115,3],[126,3],[126,14],[116,14]],6.0,'paired gables'],
].map(([id,name,z,p,eaves,roof])=>({id,name,z,p,eaves,roof,wallThickness:.45,roofRise:roof.includes('shed')?.8:1.6,roofWalkable:false,foundation:'Solid rock/retaining foundation from -6 m scenic bed or adjoining terrace to base; no exposed floating slab.'}));
const interiors=[
 {id:'I01',building:'M05',name:'Press passage',z:4,p:rect(27,50,41,54),clear:3,doors:[[[27,50],[27,54]],[[41,50],[41,54]]],role:'4 m clear vaulted passage from Laundry to Press porch; ordinary reverse route.'},
 {id:'I02',building:'M12',name:'Customs porch',z:0,p:[[114,22],[124,22],[124,29],[120,29],[120,26],[114,26]],clear:3,doors:[[[114,22],[114,26]],[[120,29],[124,29]]],role:'L-shaped roofed connection from B court to S6 receiving stepside.'},
 {id:'I03',building:'M14',name:'School arcade',z:4,p:rect(100,60,112,64),clear:3,doors:[[[100,60],[100,64]],[[112,60],[112,64]]],role:'4 m clear arcade joins the north bridgehead to the Bell ascent side.'},
 {id:'I04',building:'M13',name:'Taverna receiving room',z:4,p:rect(78.45,48.45,95.55,61.55),clear:3,doors:[[[78,54],[78,60]],[[96,49],[96,54]],[[91,62],[95,62]]],channels:[rect(78,54,78.45,60),rect(95.55,49,96,54),rect(91,61.55,95,62)],role:'Bridge entry, shallow return, then Fountain or School departure. Roof remains occupied building mass above.'},
 {id:'I05',building:'M16',name:'Inn archway',z:8,p:rect(76,86,87,92),clear:4,doors:[[[76,86],[76,92]],[[87,86],[87,92]]],role:'Straight civic arch; useful through-support retained, unlike the middle gateway.'},
];
const obstacles=[
 {id:'O01',name:'Cistern rim',z:8,p:rect(25,95,29,96.2),height:1.2,role:'Crouch preparation north of A; open flanks remain. Does not secure bridge stance.',collision:true,opaque:true,ballistic:'unknown',destructible:'unknown'},
 {id:'O02',name:'Boat handling bench',z:0,p:rect(104,27,108,28.2),height:1.2,role:'Ground-level crouch reset toward S5; elevated S5/S6 can look behind it. Not universal site cover.',collision:true,opaque:true,ballistic:'unknown',destructible:'unknown'},
 {id:'O03',name:'Taverna internal return',z:4,p:rect(86,54,86.45,61.55),height:3,role:'Separates the bridge-facing stance from east/north exits; 5.55 m clear path south of tip.',collision:true,opaque:true,ballistic:'unknown',destructible:'unknown'},
];
const stairs=[
 ['S1','Harbor stair',18,34,46,0,'F00','F04W'],['S2','Cooper stair',46.5,34,46,0,'F00','F04W'],
 ['S3','Cypress stair',17,66,78,4,'F04W','F08W'],['S4','Press stair',46.5,66,78,4,'F04W','F08W'],
 ['S5','Salt stair',101,34,46,0,'F00','F04E'],['S6','Sea stair',121,34,46,0,'F00','F04E'],
 ['S7','School stair',86,66,78,4,'F04E','F08E'],['S8','Bell stair',117,66,78,4,'F04E','F08E'],
].map(([id,name,x,y0,y1,z,from,to])=>({id,name,from,to,a:[x,y0,z],b:[x,y1,z+4],width:4,p:rect(x-2,y0,x+2,y1),bottomLanding:rect(x-2,y0-3,x+2,y0),topLanding:rect(x-2,y1,x+2,y1+3),risers:20,riser:.2,goings:19,going:12/19,guardHeight:1.1,guardThickness:.2,clearHeadroom:'Open sky throughout flight and both landings; no overhead slab or roof intersects the footprint.',support:'Solid stepped stone/retaining fill, not a floating flight.'}));
const openings=[
 {id:'W01',name:'Laundry observation window',a:[22,46],b:[25,46],z:4,sill:1.2,head:2.3,wallHeight:2.6,thickness:.45,movement:false,role:'Bounded standing view of Net street; crouching cannot look over sill. Reciprocal lower challenge.'},
 {id:'W02',name:'Civic bridge south aperture',a:[61,86],b:[64,86],z:8,sill:1.1,head:2.1,wallHeight:2.4,thickness:.35,movement:false,role:'Middle-span information requires standing on upper span, turning away from both bridge ends.'},
];
const boundaries=[];
function eq(a,b){return Math.abs(a-b)<.001;}
for(const f of floors){
 for(let i=0;i<f.p.length;i++){
  const a=f.p[i],b=f.p[(i+1)%f.p.length],horizontal=eq(a[1],b[1]);
  // Bridge abutments are joined floor faces, not parapeted ends.
  if(f.bridge && eq(a[0],b[0]))continue;
  let height=1.1;
  if(!f.bridge){
   if(horizontal && [34,46,66,78].includes(a[1]))height=2.4;
   if(f.id==='F04W'&&eq(a[0],50)&&eq(b[0],50))height=2.4;
   if(f.id==='F04E'&&eq(a[0],78)&&eq(b[0],78))height=2.4;
   if(f.id==='F08W'&&eq(a[0],50)&&eq(b[0],50))height=2.4;
   if(f.id==='F08E'&&eq(a[0],76)&&eq(b[0],76))height=2.4;
  }
  if(f.id==='BR-U'&&horizontal&&eq(a[1],86))height=2.4;
  const gaps=[];
  for(const s of stairs){for(const endpoint of[s.a,s.b]){
   if(eq(endpoint[2],f.z)&&horizontal&&eq(endpoint[1],a[1])&&endpoint[0]>=Math.min(a[0],b[0])&&endpoint[0]<=Math.max(a[0],b[0]))gaps.push({kind:'movement',id:s.id,a:[endpoint[0]-2.2,a[1]],b:[endpoint[0]+2.2,a[1]]});
  }}
  if(eq(a[0],b[0])){
   if((f.id==='F04W'&&eq(a[0],50))||(f.id==='F04E'&&eq(a[0],78)))gaps.push({kind:'movement',id:'BR-M',a:[a[0],54],b:[a[0],60]});
   if((f.id==='F08W'&&eq(a[0],50))||(f.id==='F08E'&&eq(a[0],76)))gaps.push({kind:'movement',id:'BR-U',a:[a[0],86],b:[a[0],92]});
  }
  for(const w of openings)if(eq(w.z,f.z)&&horizontal&&eq(w.a[1],a[1])&&w.a[0]>=Math.min(a[0],b[0])&&w.b[0]<=Math.max(a[0],b[0])){gaps.push({kind:'observation',id:w.id,a:w.a,b:w.b,sill:w.sill,head:w.head});height=w.wallHeight;}
  boundaries.push({id:`R-${f.id}-${i+1}`,floor:f.id,a,b,z:f.z,base:f.bridge?f.z-(f.deckThickness??.3):-6,parapetHeight:height,thickness:f.bridge?.35:.45,gaps,role:f.bridge?'Bridge side parapet':'Continuous retaining foundation with crest wall; scenic side inaccessible'});
 }
}
const places=[
 ['T','Ferry landing',13,20,0],['N1','Net street',27,32,0],['N2','Cooper yard',46,23,0],['N3','Shore toe',65,23,0],['N4','Lower harbor bend',92,25,0],['B','Boat court',108,21,0],['N5','Customs stepside',121,31,0],
 ['W1','Laundry court',21,56,4],['W2','Press porch',47,58,4],['W3','Potter pocket',18,63,4],['M','Middle bridge',64,57,4],['E1','Taverna bridgehead',91,52,4],['E2','Fountain court',105,52,4],['E3','School court',117,64,4],
 ['A','Cistern court',28,91,8],['A1','Chapel approach',26,83,8],['A2','West lookout',47,91,8],['U','Upper bridge',64,89,8],['E4','Inn porch',93,91,8],['E5','Bell court',119,87,8],['CT','Ridge arrival',108,102,8],
].map(([id,name,x,y,z])=>({id,name,p:[x,y,z]}));
const objectives=[{id:'SITE-A',p:rect(25,88,31,94),z:8,anchor:[28,91,8]},{id:'SITE-B',p:rect(105,18,111,24),z:0,anchor:[108,21,0]}];
const spawns=[{id:'SPAWN-T',z:0,positions:[[10,19],[12,19],[14,19],[16,19],[14,21]]},{id:'SPAWN-CT',z:8,positions:[[104,102],[106,102],[108,102],[110,102],[108,104]]}];
const packet={revision:'L01',phase:'Developed layout; pending independent gates',selected:'B / Ravine Quarter',units:'meters',up:'Z',north:'+Y',origin:'Common world origin (0,0) at southwest quay',body:{radius:.3,standing:1.8,crouch:1.1,step:.3,maxSlope:42,standingEye:1.674,crouchEye:1.023,inspectionSpeed:3.4,crouchSpeed:1.7},defaults:{floorThickness:.3,wallOpaque:true,collision:true,ballistic:'unknown',destructibility:'unknown',utilitySound:'unavailable',roofsWalkable:false,scenicRavineBed:-6,stairsRequiredJump:false},floors,buildings,interiors,obstacles,stairs,openings,boundaries,places,objectives,spawns};
await writeFile(`${out}/layout.json`,JSON.stringify(packet,null,2));
const palette={0:'#f1e2b9',4:'#d0ddc4',8:'#e4c695'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
function projection(bounds,box){const[x0,y0,x1,y1]=bounds,[bx,by,bw,bh]=box;const s=Math.min(bw/(x1-x0),bh/(y1-y0));return {s,xy:p=>[bx+(p[0]-x0)*s,by+(y1-p[1])*s]};}
const pts=(p,xy)=>p.map(v=>xy(v).join(',')).join(' ');
const line=(a,b,xy,attrs='')=>`<line x1="${xy(a)[0]}" y1="${xy(a)[1]}" x2="${xy(b)[0]}" y2="${xy(b)[1]}" ${attrs}/>`;
function label(p,t,xy,size=12,fill='#193d46',attrs=''){const[x,y]=xy(p);return`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle" ${attrs}>${esc(t)}</text>`;}
function segmentsWithoutGaps(a,b,gaps){const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy;const ts=gaps.map(g=>[g.a,g.b].map(p=>((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l2).sort((u,v)=>u-v)).sort((u,v)=>u[0]-v[0]);let cur=0,r=[];for(const[x,y]of ts){if(x>cur)r.push([cur,Math.min(x,1)]);cur=Math.max(cur,y);}if(cur<1)r.push([cur,1]);return r.filter(([x,y])=>y>x).map(([x,y])=>[[a[0]+x*dx,a[1]+x*dy],[a[0]+y*dx,a[1]+y*dy]]);}
let clipSerial=0;
function plan({bounds=[-3,-2,134,115],box=[55,120,1070,890],level=null,labels=true,poses=[]}={}){
 const{xy,s}=projection(bounds,box);const clip=`clip-${++clipSerial}`;let o='';
 o+=`<rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" rx="8" fill="#94c8cd"/>`;
 const context=[[-3,-1],[132,-1],[135,105],[112,115],[82,111],[65,102],[35,112],[8,103],[-3,66]];
 o+=`<polygon points="${pts(context,xy)}" fill="#b6b7a0"/>`;
 const ravine=[[56,112],[71,113],[74,95],[72,80],[70,64],[71,45],[73,29],[65,27],[57,29],[60,45],[57,64],[54,80]];
 o+=`<polygon points="${pts(ravine,xy)}" fill="#899e96" stroke="#708c86" stroke-width="1"/>`;
 if(bounds[0]<0)o+=label([65,72],'DRY RAVINE / -6 m',xy,10,'#3d6866');
 for(const f of floors)if(level===null||f.z===level)o+=`<polygon points="${pts(f.p,xy)}" fill="${palette[f.z]}" stroke="#526d70" stroke-width="1.2"/>`;
 for(const b of buildings)if(level===null||b.z===level){o+=`<polygon points="${pts(b.p,xy)}" fill="#526970" stroke="#294751" stroke-width="1.6"/>`;const c=b.p.reduce((s,p)=>[s[0]+p[0]/b.p.length,s[1]+p[1]/b.p.length],[0,0]);if(labels)o+=label(c,b.id,xy,10,'#fdf5e1');}
 for(const i of interiors)if(level===null||i.z===level){o+=`<polygon points="${pts(i.p,xy)}" fill="#fff8df" stroke="#314d56" stroke-width="1.3"/>`;for(const p of i.channels??[])o+=`<polygon points="${pts(p,xy)}" fill="#fff8df"/>`;for(const d of i.doors)o+=line(d[0],d[1],xy,`stroke="#fff8df" stroke-width="${.65*s}"`);if(labels){const c=i.p.reduce((s,p)=>[s[0]+p[0]/i.p.length,s[1]+p[1]/i.p.length],[0,0]);o+=label(c,i.id,xy,10);}}
 for(const o2 of obstacles)if(level===null||o2.z===level){o+=`<polygon points="${pts(o2.p,xy)}" fill="${o2.height>2?'#3d5661':'#ab8464'}" stroke="#624a3b" stroke-width="1.1"/>`;if(labels)o+=label([o2.p[0][0],o2.p[0][1]-.7],o2.id,xy,10);}
 for(const r of boundaries)if(level===null||r.z===level){for(const[a,b]of segmentsWithoutGaps(r.a,r.b,r.gaps))o+=line(a,b,xy,`stroke="${r.parapetHeight>2?'#334c56':'#7f7769'}" stroke-width="${r.parapetHeight>2?3:1.8}"`);for(const g of r.gaps.filter(g=>g.kind==='observation')){o+=line(g.a,g.b,xy,'stroke="#ae5f71" stroke-width="3" stroke-dasharray="3 3"');if(labels)o+=label([(g.a[0]+g.b[0])/2,g.a[1]-1.5],g.id,xy,10,'#924e67');}}
 for(const st of stairs){if(level!==null&&st.a[2]!==level&&st.b[2]!==level)continue;const ghost=level!==null&&st.b[2]===level;
  for(const p of[st.bottomLanding,st.topLanding])o+=`<polygon points="${pts(p,xy)}" fill="#eeeada" stroke="#a16b87" stroke-width="1" stroke-dasharray="3 2"/>`;
  o+=`<polygon points="${pts(st.p,xy)}" fill="#f5eeda" stroke="#5d767a" stroke-width="1.2"/>`;
  for(let k=1;k<20;k++){const y=st.a[1]+12*k/20;o+=line([st.a[0]-2,y],[st.a[0]+2,y],xy,'stroke="#718485" stroke-width=".8"');}
  o+=line(st.a,st.b,xy,'stroke="#a36a86" stroke-width="2" marker-end="url(#arrow)"');
  if(labels)o+=label([st.a[0]+3.7,(st.a[1]+st.b[1])/2],`${st.id} ${st.a[2]}→${st.b[2]}`,xy,10,'#7e4569','paint-order="stroke" stroke="#fff7e5" stroke-width="2.5"');
 }
 for(const q of objectives)if(level===null||q.z===level)o+=`<polygon points="${pts(q.p,xy)}" fill="#c37c52" fill-opacity=".35" stroke="#a75d37" stroke-width="2" stroke-dasharray="5 3"/>`;
 for(const q of spawns)if(level===null||q.z===level)for(const p of q.positions){const[x,y]=xy(p);o+=`<circle cx="${x}" cy="${y}" r="${.3*s}" fill="#375b8a"/>`;}
 if(labels)for(const p of places){if(level!==null&&p.p[2]!==level)continue;const special=['T','CT','A','B'].includes(p.id);o+=label([p.p[0],p.p[1]+(p.id==='E1'?-2:1.1)],`${p.id} · ${p.id==='E1'?'Bridgehead':p.name}`,xy,special?12:10,special?'#9b5036':'#274c53','paint-order="stroke" stroke="#faf4e4" stroke-width="3" font-weight="600"');}
 for(const pose of poses){const[x,y]=xy(pose.p);o+=`<circle cx="${x}" cy="${y}" r="5" fill="${pose.color??'#b14f51'}" stroke="#fff" stroke-width="1.5"/>`;o+=label([pose.p[0],pose.p[1]+1],pose.id,xy,12,pose.color??'#a34848','font-weight="700" paint-order="stroke" stroke="#fff" stroke-width="2"');if(pose.look)o+=line(pose.p,pose.look,xy,`stroke="${pose.color??'#b14f51'}" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#arrow)"`);}
 return `<defs><clipPath id="${clip}"><rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"/></clipPath></defs><g clip-path="url(#${clip})">${o}</g>`;
}
const base=(w,h,title,sub,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#a36a86"/></marker></defs><rect width="${w}" height="${h}" fill="#f8f3e6"/><g font-family="sans-serif" fill="#203e44"><text x="42" y="43" font-size="26" font-weight="700">${esc(title)}</text><text x="42" y="72" font-size="15">${esc(sub)}</text>${body}</g></svg>`;
const wrap=(text,x,y,width=54,size=14,color='#24494f')=>{let lines=[],line='';for(const w of text.split(' ')){if((line+' '+w).length>width){lines.push(line);line=w;}else line+=(line?' ':'')+w;}if(line)lines.push(line);return lines.map((l,i)=>`<text x="${x}" y="${y+i*(size+8)}" font-size="${size}" fill="${color}">${esc(l)}</text>`).join('');};
let overview=plan();
overview+=`<path d="M1080,175 V125 M1074,137 L1080,125 L1086,137" fill="none" stroke="#244b53" stroke-width="2"/><text x="1080" y="115" text-anchor="middle">N +Y</text>`;
let yy=130;for(const [title,text]of[
 ['Organization','Two occupied town shoulders. Ground shore end-run, +4 market crossing and +8 civic crossing remain different commitments.'],
 ['Actual boundaries','Colored faces are floors. Solid masses are complete nonplayable buildings; cream Ixx areas are roofed passages. Dark perimeter lines are 2.4 m crest walls; thin tan lines are 1.1 m parapets.'],
 ['Bridge arrivals','Middle: shallow Taverna return, then Fountain or School departure. Upper: open civic span and short Inn arch; West Homes separates its stance from A.'],
 ['Movement vs information','Hatched S1–S8 are the only level transfers. Purple W01/W02 are observation openings, never routes. Sea and ravine are scenic.'],
 ['Review status','L01 developed prediction. No AML, collision walk, verified sightline or timing claim. Exact coordinates, roofs, gaps and heights: layout.json.'],
 ['Body and clearance','Radius .30 / standing 1.80 / crouch 1.10 / step .30 / slope 42°. Eight 4 m clear stairs with 3 m landings; all are reversible and open to sky.']]){overview+=`<text x="1160" y="${yy}" font-size="17" font-weight="700">${esc(title)}</text>`+wrap(text,1160,yy+27,42,14);yy+=145;}
overview+=`<text x="55" y="1045" font-size="14">Common coordinates: meters, Z-up, north +Y. Objects and openings have stable IDs. Drawn boundaries govern; apparent XY proximity is not a connection.</text>`;
await writeFile(`${out}/overview.svg`,base(1540,1080,'GALINI · L01 · Ravine Quarter developed layout','Selected architectural organization B / pending independent strategy and local visibility gates',overview));
for(const z of[0,4,8]){
 let body=plan({bounds:[-3,-2,134,115],box:[55,105,1090,900],level:z});
 body+=wrap(`FLOOR +${z} m. All other floors are omitted; adjoining stair flights and both landings are shown. Do not treat the visible scenic background as walkable.`,1170,135,39,15);
 body+=wrap('Movement: cream doors / hatched stairs. Observation only: purple dashed W apertures. Boundary walls terminate at declared openings, not at arbitrary drawing overlaps.',1170,285,39,15);
 body+=wrap('Wall heights: dark perimeter 2.4 m (W01 panel 2.6); thin perimeter 1.1 m. Stair side guards 1.1 m. Bridge clear width 5.3 m; all stair clear widths 4.0 m.',1170,440,39,15);
 let y=615;for(const i of interiors.filter(x=>x.z===z)){body+=wrap(`${i.id} / ${i.name}: ${i.clear.toFixed(1)} m clear below roof. ${i.role}`,1170,y,39,14);y+=115;}
 body+=`<text x="55" y="1044" font-size="14">Actual floor polygons, building footprints, perimeter gaps and all dimensions are retained in layout.json. L01 / plan prediction only.</text>`;
 await writeFile(`${out}/level-${z}.svg`,base(1540,1080,`GALINI · L01 · aligned floor +${z} m`,'Same origin and scale on all floor sheets / north +Y / retained Galini player body',body));
}
// Individual vertical profiles preserve exact route coordinates and occupied landing lengths.
let profiles='';
for(let i=0;i<stairs.length;i++){
 const st=stairs[i],col=i%2,row=Math.floor(i/2),x=50+col*745,y=120+row*220,sc=24;
 profiles+=`<rect x="${x-12}" y="${y-22}" width="710" height="203" rx="8" fill="#e7ebe1"/><text x="${x}" y="${y}" font-size="18" font-weight="700">${st.id} · ${st.name} · ${st.from} → ${st.to}</text>`;
 const px=t=>x+35+(t+3)*sc,py=z=>y+145-z*sc;
 profiles+=`<path d="M${px(-3)},${py(0)} H${px(0)} L${px(12)},${py(4)} H${px(15)}" fill="none" stroke="#315961" stroke-width="4"/>`;
 for(let k=0;k<20;k++){const t=k*12/19,z=(k+1)*.2;profiles+=`<path d="M${px(t)},${py(z-.2)} V${py(z)} ${k<19?`H${px((k+1)*12/19)}`:''}" fill="none" stroke="#758982" stroke-width="1"/>`;}
 profiles+=`<path d="M${px(-3)},${py(1.1)} H${px(0)} L${px(12)},${py(5.1)} H${px(15)}" fill="none" stroke="#8b7b6b" stroke-width="1" stroke-dasharray="5 3"/>`;
 for(const[t,z,id]of[[0,0,'bottom'],[6,2,'mid'],[12,4,'top']]){profiles+=`<circle cx="${px(t)}" cy="${py(z+1.674)}" r="3" fill="#b25164"/><text x="${px(t)+6}" y="${py(z+1.674)-3}" font-size="10">${id} eye ${ (st.a[2]+z+1.674).toFixed(3)}</text>`;}
 profiles+=`<text x="${x+495}" y="${y+40}" font-size="12">x = ${st.a[0]} m</text><text x="${x+495}" y="${y+62}" font-size="12">y ${st.a[1]} → ${st.b[1]}</text><text x="${x+495}" y="${y+84}" font-size="12">z ${st.a[2]} → ${st.b[2]}</text><text x="${x+495}" y="${y+106}" font-size="12">4 m clear / 3 m landings</text><text x="${x+495}" y="${y+128}" font-size="12">20 × .20 m risers</text><text x="${x+495}" y="${y+150}" font-size="12">19 × .6316 m goings</text>`;
}
profiles+=wrap('All flights: 12 m horizontal run, open sky above both landings and every tread. Side guards 1.10 m above nosing line with .20 m thickness outside the 4 m clear width. Retaining infill supports the flight. These are exact design envelopes, not compiled stair or camera measurements.',50,1025,170,14);
await writeFile(`${out}/stairs-sections.svg`,base(1540,1100,'GALINI · L01 · S1–S8 coordinate sections','Unfolded longitudinal sections / 1:1 horizontal and vertical scale / eye height = floor +1.674 m',profiles));
// Roof and structural intent is explicitly separate from the navigable floor drawing.
let roofs=plan({labels:false});
const{xy:rxy}=projection([-3,-2,134,115],[55,120,1070,890]);
for(const b of buildings){roofs+=`<polygon points="${pts(b.p,rxy)}" fill="#d1ab85" stroke="#865e4e" stroke-width="1.5"/>`;const xs=b.p.map(p=>p[0]),ys=b.p.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;roofs+=line([cx,Math.min(...ys)+1],[cx,Math.max(...ys)-1],rxy,'stroke="#946d56" stroke-width="1.2"');roofs+=label([cx,cy],`${b.id} e+${b.eaves}`,rxy,10);}
roofs+=wrap('Roof-on massing intent. Eaves numbers are heights above each building base. Ridge rise is 1.6 m; sheds rise .8 m. All roofs are scenic, opaque, collidable and nonwalkable. Passage I01/I02/I03/I04 ceilings are 3 m above floor; I05 is 4 m. Solid upper construction continues to the roof.',1160,135,42,15);
roofs+=wrap('Each building has a complete .45 m perimeter shell; unlisted windows and doors are closed/scenic. Intersecting M05/M06 fronts are adjoining party walls, not duplicate walkable rooms. Retaining foundations reach the rock/scenic bed. No roof is an extra gameplay edge.',1160,370,42,15);
roofs+=wrap('The two bridges have masonry abutments and two piers each in inaccessible ravine ground. Middle deck is .60 m thick at +4; upper deck .70 m at +8. They occupy different north/south positions and do not stack over another playable floor.',1160,585,42,15);
roofs+=wrap('Later captures required: actual roof-on overview plus cutaway matching the same source hash. This is a plan of intended roof forms, not a rendered architectural acceptance.',1160,795,42,15);
await writeFile(`${out}/roof-plan.svg`,base(1540,1080,'GALINI · L01 · roof / complete-volume intent','Roof polygons cover occupied buildings; interior routes remain below their stated ceilings',roofs));
// Reviewed bounded variants, with identical neighboring geometry for honest comparison.
let variants='';
for(const [i,title,text]of[[0,'V-M0 / straight gateway','Rejected: direct bridge-to-Fountain alignment gives the reserve broad through-support, but combines crossing observation with district reinforcement.'],[1,'V-M1 / shallow return (selected)','Selected: O03 blocks the bridge stance from both receiving exits. A follower at (82,54,+4) can shift south to trade the leader around the tip; retreat remains reversible.'],[2,'V-U0 / open A-facing upper arrival','Rejected: an undivided upper terrace can combine bridge information with A local-ascent control.'],[3,'V-U1 / occupied West Homes return (selected)','Selected: M08 separates (47,91,+8) from A. Crossers can circle north to A or descend S4; direct support across that building is lost.']]){
 const x=45+(i%2)*755,y=110+Math.floor(i/2)*480,bounds=i<2?[74,46,100,65]:[24,76,55,101];
 variants+=`<text x="${x}" y="${y}" font-size="20" font-weight="700">${title}</text>`;
 variants+=plan({bounds,box:[x,y+20,700,330],level:i<2?4:8,labels:false});
 if(i===0){const{xy}=projection(bounds,[x,y+20,700,330]);variants+=`<polygon points="${pts(obstacles.find(o=>o.id==='O03').p,xy)}" fill="#fff8df"/>`;variants+=line([74,57],[99,52],xy,'stroke="#b15e68" stroke-width="2" stroke-dasharray="5 3"');}
 if(i===2){const{xy}=projection(bounds,[x,y+20,700,330]);variants+=`<polygon points="${pts(buildings.find(b=>b.id==='M08').p,xy)}" fill="#e4c695" stroke="#7d9182" stroke-dasharray="5 3"/>`;variants+=line([47,91],[27,81],xy,'stroke="#b15e68" stroke-width="2" stroke-dasharray="5 3"');}
 variants+=wrap(text,x,y+380,88,14);
}
variants+=wrap('Information variant: upper bridge south edge is a 2.4 m opaque wall with only W02 at x61–64, sill +1.1 / head +2.1. An open 1.1 m rail along the whole edge was declined: it would make the entire span a middle-bridge overlook. The selected aperture preserves one useful reciprocal observation at the cost of occupying the span and turning away from its ends.',50,1080,177,14);
await writeFile(`${out}/variant-comparison.svg`,base(1560,1175,'GALINI · L01 · bounded arrival / information comparisons','Same neighboring districts retained / selected variants remain subject to independent local review',variants));
const browser=await launchBrowser();
try {for(const f of ['overview','level-0','level-4','level-8','stairs-sections','roof-plan','variant-comparison']){const {readFile}=await import('node:fs/promises');const svg=await readFile(`${out}/${f}.svg`,'utf8');const width=Number(svg.match(/width="(\d+)"/)[1]),height=Number(svg.match(/height="(\d+)"/)[1]);const page=await browser.newPage({viewport:{width,height}});await page.setContent(svg);await page.screenshot({path:`${out}/${f}.png`});await page.close();}}finally{await browser.close();}
console.log('Wrote L01 exact layout, aligned plans, all stair sections, roofs and variants.');
export { plan, base, wrap, projection, pts, line, label };
