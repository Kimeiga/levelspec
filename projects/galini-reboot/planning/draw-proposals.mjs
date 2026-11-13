import { writeFile } from 'node:fs/promises';
import { launchBrowser } from '../../../tests/browser/support/browser.mjs';

// Project-specific spatial proposals; these are drawings, not AML or physical verification.
const A = {
  id:'harbor-fold', title:'A · Harbor Fold', extent:[124,108],
  subtitle:'An inhabited cliff: market streets above working waterfront, with short views and separate level access.',
  land:[[0,0],[77,0],[120,16],[124,55],[124,104],[98,108],[72,100],[46,94],[7,69],[-3,32]],
  floors:[
    {z:0,p:[[0,3],[27,1],[51,3],[80,2],[115,17],[120,39],[108,51],[84,51],[70,45],[63,28],[48,25],[39,31],[18,32],[1,27]]},
    {z:0,p:[[32,22],[40,23],[46,29],[57,29],[59,39],[47,41],[41,37],[36,30]]},
    {z:4,p:[[12,40],[28,33],[48,36],[67,31],[81,42],[94,51],[91,67],[77,72],[64,77],[51,69],[30,72],[13,61]]},
    {z:8,p:[[46,73],[58,68],[73,71],[86,67],[91,58],[107,56],[122,65],[121,100],[106,104],[80,96],[62,94],[44,85]]},
    {z:4,p:[[109,49],[118,49],[119,60],[110,61]]},
  ],
  buildings:[
    ['M01','Ticket office',0,[[0,3],[9,2],[11,13],[1,15]]],
    ['M02','Fish auction',0,[[27,3],[43,4],[42,14],[29,16]]],
    ['M03','Netters row',0,[[24,23],[34,24],[35,34],[24,32]]],
    ['M04','Cooper workshop',0,[[49,8],[64,11],[61,23],[49,21]]],
    ['M05','Taverna',0,[[69,14],[82,17],[79,29],[68,24]]],
    ['M06','Boat sheds',0,[[88,40],[100,43],[100,51],[87,48]]],
    ['M07','Bakery',4,[[22,42],[32,40],[35,52],[23,56]]],
    ['M08','Winery vault',4,[[41,43],[55,42],[59,52],[43,56]]],
    ['M09','Lemon houses',4,[[43,62],[57,60],[62,68],[53,73],[44,70]]],
    ['M10','Market hall',4,[[65,44],[74,44],[78,52],[74,57],[64,55]]],
    ['M11','Sea houses',4,[[80,55],[87,53],[89,64],[80,67]]],
    ['M12','Guesthouse',8,[[58,76],[72,73],[76,84],[62,88]]],
    ['M13','Chapel',8,[[88,71],[98,71],[100,86],[88,87]]],
    ['M14','Bell tower',8,[[81,77],[86,77],[86,84],[81,84]]],
    ['M15','Upper houses',8,[[94,90],[104,87],[108,98],[96,100]]],
    ['M16','Gatehouse',8,[[113,76],[121,80],[122,90],[114,88]]],
    ['M17','Headland houses',8,[[102,62],[111,65],[111,73],[103,74]]],
    ['M18','Quay stores',0,[[52,1],[71,2],[74,9],[65,12],[49,8]]],
  ],
  interiors:[
    {id:'I01',name:'Winery passage',z:4,p:[[42,47],[55,45],[57,49],[43,52]],doors:[[[42,47],[43,52]],[[55,45],[57,49]]]},
    {id:'I02',name:'Boathouse',z:0,p:[[88,25],[106,28],[109,37],[94,39],[86,34]],doors:[[[86,30],[86,34]],[[105,29],[107,33]]]},
    {id:'I03',name:'Chapel nave',z:8,p:[[89,73],[97,73],[98,85],[89,85]],doors:[[[89,76],[89,79]],[[98,79],[98,82]]]},
  ],
  stairs:[
    ['S1','Laundry stair',[18,30,0],[18,42,4],4],
    ['S2','Net stair',[50,35,0],[50,47,4],4],
    ['S3','Quay stair',[75,28,0],[75,40,4],4],
    ['S4','Cypress rise',[35,65,4],[47,77,8],4],
    ['S5','Market rise',[75,65,4],[87,73,8],4],
    ['S6a','Sea descent',[114,65,8],[114,53,4],4],
    ['S6b','Boat descent',[111,53,4],[106,41,0],4],
  ],
  places:[
    ['T','Ferry court',12,19,0,'spawnT'],['01','Fish quay',40,19,0],['02','Net street',40,32,0],['03','Cooper court',62,30,0],
    ['04','Taverna porch',81,33,0],['B','Boat court',98,21,0,'site'],['05','Harbor passage',111,40,0],
    ['06','Laundry court',18,55,4],['07','Cistern court',36,60,4],['08','Fountain lane',48,57,4],
    ['09','Market stoa',66,60,4],['10','Sea balcony',91,61,4],['11','Cypress terrace',52,79,8],
    ['12','Upper lane',76,88,8],['A','Chapel terrace',106,80,8,'site'],['13','Bell porch',83,75,8],
    ['14','Olive court',88,94,8],['CT','Inland gate',114,96,8,'spawnCT'],
  ],
  views:[['V1',[91,63],[103,47]],['V2',[78,73],[71,61]],['V3',[36,60],[18,54]]],
  retaining:[[[13,39],[29,34],[40,36]],[[58,37],[66,32],[79,43]],[[92,58],[107,56]],[[48,73],[58,69],[73,72]]],
  notes:['0 m: ferry, net street and boat district','4 m: inhabited market and cistern shelf','8 m: chapel headland and upper town','T / CT and A / B are provisional anchors','Solid masses define streets; pale voids are playable','Three roofed passages / interiors are shown','Sea-edge continuation is scenic, not swimming'],
  questions:['Do the market choices stay useful after contact?','Can the eastern stairs support a retreat from B?','Does the chapel overlook reveal too much harbor?'],
};
const B = {
  id:'ravine-quarter', title:'B · Ravine Quarter', extent:[132,114],
  subtitle:'Two inhabited shoulders around a dry ravine: upper civic ground, middle crossing and low shoreline detour.',
  land:[[-2,0],[129,-1],[133,106],[109,114],[83,109],[72,96],[59,99],[36,110],[9,99],[-3,62]],
  ravine:[[58,110],[74,112],[77,91],[72,78],[73,63],[69,45],[75,31],[66,22],[58,31],[61,48],[55,66],[57,83]],
  floors:[
    {z:0,p:[[0,3],[45,2],[50,16],[46,34],[28,38],[15,44],[0,36]]},
    {z:0,p:[[39,8],[55,10],[65,18],[80,10],[94,10],[99,21],[79,29],[64,27],[50,21],[41,21]]},
    {z:0,p:[[76,4],[125,2],[130,21],[126,44],[109,49],[88,46],[77,33],[69,24]]},
    {z:4,p:[[10,41],[28,35],[48,38],[53,57],[43,68],[21,66],[6,57]]},
    {z:8,p:[[12,69],[34,65],[51,74],[49,94],[27,105],[9,93]]},
    {z:4,p:[[75,43],[96,41],[121,49],[124,70],[107,77],[81,69],[71,57]]},
    {z:8,p:[[80,77],[98,73],[127,83],[130,104],[110,110],[83,104],[71,90]]},
    {z:4,p:[[47,52.5],[78,52.5],[78,57.5],[47,57.5]]},
    {z:8,p:[[46,80.3],[79,84.3],[78.4,89.7],[45.4,85.7]]},
  ],
  buildings:[
    ['M01','Ferry store',0,[[0,4],[8,3],[10,13],[1,17]]],
    ['M02','Fish houses',0,[[19,5],[30,4],[33,15],[22,18]]],
    ['M03','Net shed',0,[[32,25],[42,23],[45,34],[34,37]]],
    ['M04','Laundry row',4,[[9,44],[19,42],[24,51],[18,57],[9,55]]],
    ['M05','Press house',4,[[30,42],[42,40],[46,50],[35,54],[29,49]]],
    ['M06','Potter house',4,[[26,58],[35,56],[37,64],[28,67]]],
    ['M07','Chapel',8,[[16,81],[26,79],[27,96],[16,98]]],
    ['M08','West homes',8,[[32,72],[43,73],[45,80],[35,84]]],
    ['M09','Cistern house',8,[[35,90],[47,89],[46,97],[36,101]]],
    ['M10','Boat shed',0,[[90,8],[104,7],[108,18],[96,22],[89,16]]],
    ['M11','Salt store',0,[[80,31],[90,28],[94,39],[85,44],[78,38]]],
    ['M12','Customs',0,[[112,36],[123,34],[126,44],[115,48]]],
    ['M13','Taverna',4,[[74,47],[87,44],[93,54],[82,62],[73,57]]],
    ['M14','School',4,[[94,59],[107,55],[112,65],[105,72],[95,70]]],
    ['M15','East homes',4,[[112,50],[121,52],[122,61],[113,62]]],
    ['M16','Upper inn',8,[[79,81],[91,78],[95,88],[84,92]]],
    ['M17','Bell building',8,[[100,80],[110,79],[114,88],[102,91]]],
    ['M18','Gate house',8,[[119,92],[128,92],[129,103],[118,105]]],
    ['M19','Shore workshop',0,[[53,9],[64,12],[64,19],[56,18]]],
    ['M20','Waterfront homes',0,[[115,5],[125,5],[126,17],[117,20]]],
  ],
  interiors:[
    {id:'I01',name:'Press passage',z:4,p:[[30,45],[42,43],[43,48],[32,51]],doors:[[[30,45],[32,51]],[[42,43],[43,48]]]},
    {id:'I02',name:'Customs porch',z:0,p:[[113,38],[122,36],[124,42],[115,45]],doors:[[[113,38],[115,45]],[[122,36],[124,42]]]},
    {id:'I03',name:'School arcade',z:4,p:[[96,62],[107,59],[109,64],[97,68]],doors:[[[96,62],[97,68]],[[107,59],[109,64]]]},
    {id:'I04',name:'Taverna gateway',z:4,p:[[74,52],[87,49],[90,54],[77,59]],doors:[[[74,52],[77,59]],[[87,49],[90,54]]]},
    {id:'I05',name:'Inn archway',z:8,p:[[78,84],[89,82],[92,87],[80,91]],doors:[[[78,84],[80,91]],[[89,82],[92,87]]]},
  ],
  stairs:[
    ['S1','Harbor stair',[22,29,0],[22,41,4],4],['S2','Cooper stair',[44,28,0],[44,40,4],4],
    ['S3','Cypress stair',[17,59,4],[17,71,8],4],['S4','Press stair',[43,62,4],[49,75,8],4],
    ['S5','Salt stair',[92,33,0],[92,45,4],4],['S6','Sea stair',[110,36,0],[110,48,4],3.5],
    ['S7','School stair',[85,65,4],[85,77,8],4],['S8','Bell stair',[114,69,4],[114,81,8],4],
  ],
  places:[
    ['T','Ferry landing',13,20,0,'spawnT'],['01','Fish quay',36,18,0],['02','Cooper yard',47,25,0],
    ['03','Shore toe',65,22,0],['04','Lower harbor',82,18,0],['B','Boat court',111,25,0,'site'],
    ['05','Customs stepside',101,41,0],['06','Laundry court',25,51,4],['07','Press porch',46,57,4],
    ['08','Potter pocket',20,63,4],['09','Middle bridge',63,55,4],['10','Fountain court',98,51,4],
    ['11','School court',115,66,4],['A','Cistern court',30,87,8,'site'],['12','Chapel porch',29,97,8],
    ['13','West lookout',45,86,8],['14','Upper bridge',64,85,8],['15','Upper street',98,95,8],
    ['CT','Ridge arrival',109,102,8,'spawnCT'],['16','Bell court',115,88,8],
  ],
  views:[['V1',[47,58],[77,58]],['V2',[47,89],[77,92]],['V3',[88,76],[92,61]]],
  retaining:[[[9,40],[28,36],[43,39]],[[12,68],[34,66],[44,72]],[[75,43],[95,42],[115,47]],[[80,76],[98,74],[113,80]]],
  notes:['0 m: shoreline detour around the ravine toe','4 m: market crossing through two district fronts','8 m: civic bridge and separate upper streets','Ravine is scenic / inaccessible; no jumping','Site A and B lie in different town shoulders','Bridges are routes with landings, not teleports','T / CT and A / B remain provisional anchors'],
  questions:['Does losing a bridge over-constrain a late rotation?','Is the low shoreline journey worth its commitment?','Can a bridge holder watch more than one front?'],
};
const colors={0:'#f2e4bd',4:'#d0dcc4',8:'#e5c99a'};
const escape = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const xy = ([x,y]) => `${x*7+60},${(114-y)*7+100}`;
const polygon = p => p.map(xy).join(' ');
function textAt(x,y,text,size=12,fill='#203e44',anchor='middle',extra='') {const [px,py]=xy([x,y]).split(',');return `<text x="${px}" y="${py}" fill="${fill}" font-size="${size}" text-anchor="${anchor}" ${extra}>${escape(text)}</text>`;}
function label(p){const [id,name,x,y,z,kind]=p, color=kind==='spawnT'?'#b96d48':kind==='spawnCT'?'#3c7897':kind==='site'?'#be7547':'#24494f';return `<g>${kind?`<circle cx="${x*7+60}" cy="${(114-y)*7+100}" r="18" fill="${color}" stroke="#fffaf0" stroke-width="3"/>${textAt(x,y-1,id,13,'#fff', 'middle','font-weight="700"')}`:textAt(x,y,id,11,color,'middle','font-weight="700"')}${textAt(x,y-3.8,name,12,color,'middle','font-weight="650" paint-order="stroke" stroke="#faf5e6" stroke-width="3"')}${textAt(x,y-6.2,`${z===0?'0':`+${z}`} m`,10,color)}</g>`;}
function stairs(s){const[id,name,a,b,w]=s, dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),nx=-dy/l*w/2,ny=dx/l*w/2;
 const p=[[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny]];
 let out=`<polygon points="${polygon(p)}" fill="#f1ead6" stroke="#536b6d" stroke-width="1.5"/>`;
 for(let i=1;i<14;i++){const t=i/14;out+=`<line x1="${(a[0]+dx*t+nx)*7+60}" y1="${(114-a[1]-dy*t-ny)*7+100}" x2="${(a[0]+dx*t-nx)*7+60}" y2="${(114-a[1]-dy*t+ny)*7+100}" stroke="#627c7b" stroke-width="1"/>`;}
 out+=`<path d="M${xy(a)} L${xy(b)}" stroke="#a36a84" stroke-width="2" marker-end="url(#arrow)" fill="none"/>`;
 return out+textAt((a[0]+b[0])/2+3,(a[1]+b[1])/2,`${id} ${a[2]}→${b[2]}`,10,'#74455b','start','paint-order="stroke" stroke="#fff9eb" stroke-width="3"');
}
function draw(data){let out=`<svg xmlns="http://www.w3.org/2000/svg" width="1460" height="1230" viewBox="0 0 1460 1230"><defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#a36a84"/></marker><pattern id="rock" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M-2,12 L12,-2 M4,16 L16,4" stroke="#9b9e88" stroke-width="1"/></pattern></defs><rect width="1460" height="1230" fill="#f8f3e6"/><text x="48" y="43" font-family="sans-serif" font-size="28" fill="#203e44" font-weight="700">GALINI REBOOT · ${data.title}</text><text x="48" y="73" font-family="sans-serif" font-size="16" fill="#526368">S01 / Phase A · Unselected spatial proposal · meters / Z-up / north +Y</text><g font-family="sans-serif"><rect x="42" y="105" width="970" height="820" rx="15" fill="#91c8ce"/><polygon points="${polygon(data.land)}" fill="#b8b59b" stroke="#939985" stroke-width="2"/>`;
 for(const f of data.floors)out+=`<polygon points="${polygon(f.p)}" fill="${colors[f.z]}" stroke="#4c6867" stroke-width="1.4"/>`;
 if(data.ravine)out+=`<polygon points="${polygon(data.ravine)}" fill="#9caa9d"/><polygon points="${polygon(data.ravine)}" fill="url(#rock)"/>${textAt(65,72,'DRY RAVINE',12,'#4c625d','middle','transform="rotate(-87 515 394)"')}`;
 // Elevated bridge footprints are restored above the ravine's scenic ground.
 for(const f of data.floors.filter(f=>f.p.length===4))out+=`<polygon points="${polygon(f.p)}" fill="${colors[f.z]}" stroke="#4c6867" stroke-width="1.4"/>`;
 for(const r of data.retaining)out+=`<polyline points="${polygon(r)}" fill="none" stroke="#6f7366" stroke-width="4" stroke-dasharray="8 2"/>`;
 for(const [id,name,z,p] of data.buildings){out+=`<polygon points="${polygon(p)}" fill="#596c70" stroke="#344c52" stroke-width="2"/>`;let x=p.reduce((s,p)=>s+p[0],0)/p.length,y=p.reduce((s,p)=>s+p[1],0)/p.length;out+=textAt(x,y,id,11,'#fff5d8','middle','font-weight="600"');}
 for(const i of data.interiors){out+=`<polygon points="${polygon(i.p)}" fill="#fcf7df" stroke="#344c52" stroke-width="2.5"/>`; for(const d of i.doors)out+=`<polyline points="${polygon(d)}" stroke="#fcf7df" stroke-width="5"/>`;let x=i.p.reduce((s,p)=>s+p[0],0)/i.p.length,y=i.p.reduce((s,p)=>s+p[1],0)/i.p.length;out+=textAt(x,y,i.id,10,'#384e58');}
 for(const s of data.stairs)out+=stairs(s);
 for(const [id,a,b] of data.views)out+=`<path d="M${xy(a)} L${xy(b)}" stroke="#b26053" stroke-width="2" stroke-dasharray="7 4" fill="none"/><circle cx="${a[0]*7+60}" cy="${(114-a[1])*7+100}" r="4" fill="#b26053"/>${textAt(a[0]+2,a[1]+2,id,10,'#954d41')}`;
 for(const p of data.places)out+=label(p);
 out+=`<path d="M965,176 L965,130" stroke="#24494f" stroke-width="3"/><path d="M958,144 L965,130 L972,144" fill="none" stroke="#24494f" stroke-width="3"/><text x="965" y="120" font-size="15" text-anchor="middle">N</text><line x1="72" y1="900" x2="212" y2="900" stroke="#24494f" stroke-width="4"/><text x="142" y="919" font-size="12" text-anchor="middle">20 m</text>`;
 let yy=125;const side=(s,size=15,weight=400)=>{out+=`<text x="1040" y="${yy}" font-size="${size}" font-weight="${weight}" fill="#24494f">${escape(s)}</text>`;yy+=size+12;};
 side('Spatial organization',18,700);
 const words=data.subtitle.split(' ');let line='';for(const word of words){if((line+' '+word).length>43){side(line,14);line=word;}else line+=(line?' ':'')+word;}if(line)side(line,14);yy+=10;
 side('Reading the plan',18,700);for(const n of data.notes)side(n,13);yy+=10;
 side('Floor / movement legend',18,700);for(const z of [0,4,8]){out+=`<rect x="1040" y="${yy-13}" width="22" height="17" fill="${colors[z]}" stroke="#52666a"/>`;out+=`<text x="1074" y="${yy}" font-size="14">${z===0?'Waterfront 0 m':`Terrace +${z} m`}</text>`;yy+=27;}
 side('Dark masses: complete buildings, no entry',13);side('Cream Ixx: roofed playable interior',13);side('Hatched flights: explicit level transfer',13);side('Red dashes: proposed view, not a path',13);yy+=14;
 side('Open review questions',18,700);for(const q of data.questions)side(q,13);yy+=12;side('No AML or physical acceptance at S01.',13);side('Layouts remain open to independent proposals.',13);
 out+=`<text x="55" y="970" font-size="19" font-weight="700">Street / building inventory</text>`;
 data.buildings.forEach(([id,name,z],i)=>out+=`<text x="${55+(i%4)*340}" y="${1001+Math.floor(i/4)*25}" font-size="13" fill="#24494f">${id} · ${escape(name)} · base ${z} m</text>`);
 const iy=1150;out+=`<text x="55" y="${iy}" font-size="14">${data.interiors.map(i=>`${i.id}: ${i.name}`).join('  /  ')}</text><text x="55" y="${iy+28}" font-size="14">Body kept from Galini: radius 0.30 m / standing 1.80 m / crouch 1.10 m / step 0.30 m / slope ≤42°.</text><text x="55" y="${iy+52}" font-size="13">Dimensions and shown views are design hypotheses. Boundary/landing precision, sightlines and traversal require later layout and compiled review.</text></g></svg>`;
 return out;
}
await writeFile('projects/galini-reboot/planning/alternatives.json',JSON.stringify({revision:'S01',alternatives:[A,B]},null,2));
for(const data of [A,B])await writeFile(`projects/galini-reboot/planning/${data.id}.svg`,draw(data));
const browser=await launchBrowser();try{for(const data of[A,B]){const page=await browser.newPage({viewport:{width:1460,height:1230}});await page.setContent(draw(data));await page.screenshot({path:`projects/galini-reboot/planning/${data.id}.png`});await page.close();}}finally{await browser.close();}
console.log('Wrote two unselected spatial proposals.');
