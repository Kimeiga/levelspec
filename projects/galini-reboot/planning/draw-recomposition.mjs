import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {launchBrowser} from '../../../tests/browser/support/browser.mjs';
const out='projects/galini-reboot/planning/recomposition';
const rect=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]];
const floors=[
 ['Q0','Quay and shore street',0,[[0,2],[40,2],[48,10],[61,13],[66,20],[75,14],[84,13],[90,3],[130,3],[132,23],[129,31],[122,34],[111,33],[105,29],[99,28],[94,27],[85,26],[78,28],[69,28],[63,27],[54,30],[44,32],[36,28],[28,27],[22,31],[12,35],[7,30],[0,26]]],
 ['Q0L','Laundry lower approach',0,[[7,29],[15,29],[17,38],[27,40],[27,47],[14,47],[14,55],[7,55],[5,43]]],
 ['Q0C','Cooper public rise approach',0,[[28,25],[43,25],[50,29],[50,36],[43,39],[38,33],[30,31]]],
 ['W4L','Laundry upper frontage',4,[[24,43],[31,43],[34,48],[35,55],[29,58],[24,58],[19,62],[15,66],[11,64],[14,56],[22,52],[24,48]]],
 ['W4P','Press street and receiving porch',4,[[30,48],[44,46],[49,49],[53,54],[53,63],[49,66],[48,72],[44,76],[38,75],[37,69],[37,62],[31,60],[28,54]]],
 ['W6','Chapel lower porch',6,[[9,71],[19,71],[21,75],[15,79],[12,80],[8,78],[7,74]]],
 ['W8','Civic precinct / upper court',8,[[7,84],[14,84],[14,79],[29,77],[32,80],[32,88],[37,92],[50,86],[54,86],[54,95],[42,101],[27,104],[9,101]]],
 ['E4T','Taverna receiving street',4,[[78,50],[92,46],[100,43],[104,47],[108,50],[114,49],[126,48],[128,57],[123,64],[116,66],[113,73],[109,74],[105,70],[100,65],[96,67],[94,74],[94,88],[90,89],[89,80],[89,66],[84,64],[78,62]]],
 ['E4S','School lower court / arcade arrivals',4,[[94,65],[108,64],[114,68],[119,73],[120,88],[111,90],[93,89],[90,83],[91,74]]],
 ['E4L','Salt loading loft approach',4,[[90,34],[97,34],[99,40],[100,47],[94,49],[90,43]]],
 ['E8','Upper Inn / Bell street',8,[[76,92],[87,88],[94,89],[94,82],[112,81],[112,76],[118,77],[126,81],[130,99],[127,112],[111,114],[94,109],[87,105],[76,102]]],
 ['E8S','School occupied upper floor',8,rect(95,67,113,89)],
 ['E8B','School balcony',8,rect(98,63,111,67)],
 ['BR-M','Market bridge',4,rect(50,56,78,62)],
 ['BR-U','Bent civic bridge',8,[[54,87],[64,88],[76,92],[76,98],[64,94],[54,93]]],
];
const masses=[
 ['M01','Ferry store',0,rect(0,3,10,16)],['M02','Fish houses',0,[[19,4],[31,4],[31,19],[24,21],[18,17]]],
 ['M03','Cooper row',0,[[29,29],[39,28],[41,37],[37,42],[29,39]]],
 ['M04','Laundry House',0,rect(8,38,27,57)],
 ['M05','Press house',4,[[33,50],[47,50],[47,56],[43,56],[43,61],[47,61],[47,70],[38,73],[33,68],[33,61],[29,58],[29,53]]],
 ['M06','Potter house',4,[[18,58],[28,56],[31,61],[29,69],[20,68]]],
 ['M07','Chapel',8,[[15,80],[27,80],[27,98],[21,101],[15,98]]],
 ['M08','West Homes / Press stair house',4,[[32,70],[48,70],[48,89],[35,91],[32,85]]],
 ['M09','Cistern house',8,[[35,99],[43,97],[46,99],[39,103],[34,103]]],
 ['M10','Boat shed',0,[[86,8],[101,8],[101,23],[96,23],[96,20],[87,20]]],
 ['M11','Salt store / upper loading loft',0,rect(77,29,96,42)],
 ['M12','Customs house',0,rect(113,18,125,29)],
 ['M13','Taverna / gateway',4,rect(78,49,95,64)],
 ['M14','School / lower arcade / upper rooms',4,rect(95,67,113,89)],
 ['M15','East homes / grocer frontage',4,[[115,52],[125,52],[126,62],[120,67],[114,64]]],
 ['M16','Upper inn',8,rect(76,87,89,105)],
 ['M17','Bell house',8,[[113,84],[125,84],[127,98],[118,101],[113,97]]],
 ['M18','Ridge gatehouse',8,[[118,104],[128,103],[127,111],[118,112]]],
 ['M19','Shore workshop',0,[[53,14],[61,16],[61,21],[54,21]]],
 ['M20','Waterfront homes',0,rect(115,4,127,14)],
];
const interiors=[
 ['I01','Laundry undercroft',0,rect(8,41,15,55)],
 ['I02','Laundry stair room lower',0,rect(15,43,25,54)],
 ['I03','Laundry upper landing',4,[[20,43],[27,43],[27,49],[24,49],[24,46],[20,46]]],
 ['I04','Press public passage',4,[[29,53],[39,53],[39,57],[47,57],[47,61],[35,61],[35,57],[29,57]]],
 ['I05','Press stair-house vestibule',4,rect(39,71,48,76)],
 ['I06','Press upper passage',8,[[32,73],[40,73],[40,76],[35.5,76],[35.5,84],[32,84]]],
 ['I07','Salt loading loft',4,rect(90,34,96,42)],
 ['I08','Customs porch',0,[[113,22],[123,22],[123,29],[119,29],[119,26],[113,26]]],
 ['I09','Taverna receiving room',4,rect(78,50,94.5,63.5)],
 ['I10','School lower arcade',4,[[95,67],[113,67],[113,71],[110,71],[110,81],[113,81],[113,86],[99,86],[99,89],[95,89]]],
 ['I11','School upper rooms',8,rect(95,67,113,89)],
 ['I12','Inn arch',8,rect(76,92,89,98)],
];
const holes=[['H-L',4,rect(15,46,25,55)],['H-P',8,rect(35.5,76,44.5,85)],['H-S',8,rect(100,71,110,81)]];
const stairs=[
 ['S1a','Laundry indoor', [17,46,0],[17,52,2],3.5],['S1b','Laundry indoor return',[22,52,2],[22,46,4],3.5],
 ['S2a','Cooper street',[46,34,0],[46,40,2],4],['S2b','Cooper street return',[46,40,2],[40,40,4],4],
 ['S3a','Civic lower flight',[15,66,4],[15,72,6],4],['S3b','Chapel edge flight',[10,78,6],[10,84,8],3.5],
 ['S4a','Press house stair',[42,76,4],[42,82,6],3.5],['S4b','Press house return',[38,82,6],[38,76,8],3.5],
 ['S5a','Salt stair',[103,29,0],[103,35,2],4],['S5b','Loading loft stair',[101,37,2],[95,37,4],4],
 ['S7a','School stair',[108,71,4],[108,77,6],3.5],['S7b','School stair return',[102,77,6],[102,71,8],3.5],
 ['S8a','Bell public stair',[122,82,8],[116,82,6],4],['S8b','Bell public stair',[116,82,6],[116,76,4],4],
];
const landings=[
 ['L1',2,rect(15,52,25,55)],['L2',2,rect(44,38,49,43)],['L3',6,rect(8,72,19,78)],['L4',6,rect(35.5,82,44.5,85)],['L5',2,rect(101,35,106,39)],['L7',6,rect(100,77,110,81)],['L8',6,rect(114,80,119,85)],
];
const ramp={id:'R6',name:'Customs cart road',path:[[123,30,0],[126,40,2],[123,50,4]],width:5};
const places=[['T','Ferry',13,23,0],['A','Cistern court',32,95,8],['B','Boat court',108,21,0],['CT','Ridge arrival',106,104,8],['a','Laundry undercroft',11,49,0],['b','Upper laundry porch',28,49,4],['c','Press receiving porch',49,63,4],['d','Chapel porch',15,76,6],['e','West lookout',50,94,8],['f','Salt loft',93,40,4],['g','Lower harbor bend',94,25,0],['h','Fountain bend',107,58,4],['i','School lower arcade',103,84,4],['j','School upper room',98,84,8],['k','Inn porch',94,96,8],['l','Bell stepside',120,76,4]];
const data={revision:'R02',status:'Recomposition comparison; not frozen developed gate',units:'meters Z-up',floorIntent:floors,masses,interiors,stairVoids:holes,stairs,landings,ramp,places,body:{radius:.3,height:1.8,crouch:1.1,step:.3,maxSlope:42},criticalRelationships:[{id:'C-L',name:'Laundry lower/upper overlap',lower:0,upper:4,clearBelowUpper:3.7,stairVoid:'H-L',meaning:'Ground approach continues into a real undercroft; indoor return stair emerges in the upper frontage. The floor opening stays open over both flights.'},{id:'C-P',name:'Press inhabited stair house',lower:4,upper:8,clearBelowUpper:3.7,stairVoid:'H-P',meaning:'Mid Press territory enters a house, reverses in a stair room and exits west into the A street; bridge arrivals reach the east/north side of that house.'},{id:'C-S',name:'School occupied lower arcade / upper floor',lower:4,upper:8,clearBelowUpper:3.7,stairVoid:'H-S',meaning:'The lower arcade at y82–86 continues beneath an occupied upper room. Both levels have district exits, not just a connecting stair. Stairwell void is y71–81; crossing is north of its landing, not underneath a 2 m landing.'}],changesFromBandPlan:['Whole terrace-band polygons replaced by occupied fronts, narrow contour streets and offset courts.','Laundry now has a lower undercroft and internal stair returning to upper street.','Chapel ascent occupies a +6 m porch between separate flights, then travels around the chapel to the site.','Press stair is embedded in West Homes and exits on the A-facing side, distinct from the bridge shoulder.','School has a usable +4 arcade beneath a separately occupied +8 upper floor and an internal stairwell.','Bell public stair changes direction and arrives beside the School arcade; Customs is a sloping cart road, not another 12 m stair.','Upper civic bridge bends into the Inn at a different station; middle bridge reaches a deeper market threshold.']};
await writeFile(`${out}/r02.json`,JSON.stringify(data,null,2));
const colors={0:'#f2e4bc',2:'#dfe3c5',4:'#c7d9bd',6:'#dccb9e',8:'#dfbe88'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const xy=p=>[55+p[0]*7.6,100+(116-p[1])*7.6];const pp=p=>p.map(v=>xy(v).join(',')).join(' ');
const label=(p,text,size=11,color='#203f47',more='')=>{const[x,y]=xy(p);return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${color}" ${more}>${esc(text)}</text>`;};
function flight(st){const[id,n,a,b,w]=st,dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy),nx=-dy/d*w/2,ny=dx/d*w/2,p=[[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny]];let s=`<polygon points="${pp(p)}" fill="#f7edd6" stroke="#4e6d72" stroke-width="1.2"/>`;for(let i=1;i<10;i++){const t=i/10;const p1=xy([a[0]+t*dx+nx,a[1]+t*dy+ny]),p2=xy([a[0]+t*dx-nx,a[1]+t*dy-ny]);s+=`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#6b8381" stroke-width="1"/>`;}s+=`<polyline points="${pp([a,b])}" fill="none" stroke="#a16988" stroke-width="2" marker-end="url(#arrow)"/>`;return s;}
function render(level=null){let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1560" height="1140" viewBox="0 0 1560 1140"><defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#a16988"/></marker></defs><rect width="1560" height="1140" fill="#f8f3e6"/><g font-family="sans-serif"><text x="45" y="43" font-size="27" font-weight="700" fill="#213f46">GALINI · R02 · Contour town / ${level===null?'composition':`floor +${level} m`}</text><text x="45" y="73" font-size="15" fill="#3d5b64">Reworked two-shoulder organization / actual invented space, before revised detailed gate / meters, Z-up, north +Y</text><rect x="42" y="100" width="1050" height="902" rx="12" fill="#93c8cd"/><polygon points="${pp([[-2,0],[133,0],[135,109],[112,116],[79,108],[65,110],[35,110],[5,106],[-2,65]])}" fill="#b5b49b"/><polygon points="${pp([[55,112],[72,110],[75,94],[70,80],[71,68],[72,44],[69,28],[63,27],[57,35],[58,49],[54,67],[53,84]])}" fill="#8eaaa4"/>`;
 for(const[id,n,z,p]of floors)if(level===null||level===z)s+=`<polygon points="${pp(p)}" fill="${colors[z]}" stroke="#5a7572" stroke-width="1.2"/>`;
 for(const[id,n,z,p]of masses){const relevant=level===null||level===z||([4,8].includes(level)&&['M04','M08','M11','M14'].includes(id));if(!relevant)continue;s+=`<polygon points="${pp(p)}" fill="#526c73" stroke="#294b56" stroke-width="1.8"/>`;const c=p.reduce((a,v)=>[a[0]+v[0]/p.length,a[1]+v[1]/p.length],[0,0]);s+=label(c,id,10,'#fff7db');}
 // Upper routes are shown after massing; occupied interiors are cut out of complete buildings.
 for(const[id,n,z,p]of interiors)if((level===null&&(!['I10'].includes(id)))||level===z){s+=`<polygon points="${pp(p)}" fill="${colors[z]}" stroke="#33555e" stroke-width="1.3"/>`;const c=p.reduce((a,v)=>[a[0]+v[0]/p.length,a[1]+v[1]/p.length],[0,0]);s+=label(c,`${id} +${z}`,9,'#3c5c63');}
 for(const[id,z,p]of holes)if(level===null||level===z)s+=`<polygon points="${pp(p)}" fill="#a4ada3" stroke="#976e91" stroke-width="1.2" stroke-dasharray="4 2"/>`;
 for(const[id,z,p]of landings)if(level===null||level===z)s+=`<polygon points="${pp(p)}" fill="${colors[z]}" stroke="#946e8b" stroke-width="1.2"/>`;
 for(const st of stairs)if(level===null||[st[2][2],st[3][2]].includes(level))s+=flight(st);
 if(level===null||[0,4].includes(level)){s+=`<polyline points="${pp(ramp.path)}" fill="none" stroke="#f3e3b6" stroke-width="38" stroke-linejoin="round"/><polyline points="${pp(ramp.path)}" fill="none" stroke="#a06b87" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#arrow)"/>`;s+=label([129,40],'R6',11,'#885778');}
 for(const[id,n,x,y,z]of places)if(level===null||z===level){const special=['T','CT','A','B'].includes(id);s+=label([x,y],special?`${id} · ${n}`:`${id} · ${n}`,special?13:10,special?'#a15436':'#254b53','font-weight="650" paint-order="stroke" stroke="#fcf5df" stroke-width="3"');}
 for(const[id,x,y,t]of[['S1',24,55,'0→2→4'],['S2',46,43,'0→2→4'],['S3',7,76,'4→6→8'],['S4',45,84,'4→6→8'],['S5',105,38,'0→2→4'],['S7',109,80,'4→6→8'],['S8',121,81,'8→6→4']])if(level===null)s+=label([x,y],`${id} ${t}`,10,'#80506b','paint-order="stroke" stroke="#fff6df" stroke-width="2"');
 const side=(text,x,y,width=47,size=14)=>{let ss='',l='',lines=[];for(const w of text.split(' ')){if((l+' '+w).length>width){lines.push(l);l=w;}else l+=(l?' ':'')+w;}if(l)lines.push(l);return lines.map((l,i)=>`<text x="${x}" y="${y+i*(size+8)}" font-size="${size}" fill="#284c54">${esc(l)}</text>`).join('');};
 let y=129;for(const[t,n]of[
 ['Ground / upper overlap','Laundry is a real house: a lower undercroft, indoor return stair and upper street frontage. School has a usable lower arcade below an occupied upper room.'],
 ['Journeys generated by fronts','The civic ascent stops at a +6 m chapel porch, then wraps the chapel. Press enters a stair house and exits toward A; bridge arrivals reach the other side of that same mass.'],
 ['Different east commitments','Salt loading loft descends inside a retaining / store complex. Customs uses a sloping cart road. The upper reserve enters School rooms or takes the public Bell stair.'],
 ['Three cross-town choices','Middle bridge reaches a market threshold. Upper bridge bends into the Inn. The low shore still goes around the ravine toe, with a pause before B. No new cross-ravine edge.'],
 ['Status / limits','R02 compares a changed composition against the rejected terrace-band L01. Openings, guards and every stairwell still require the revised detailed packet. No AML or physical acceptance.']]){s+=`<text x="1125" y="${y}" font-size="18" font-weight="700" fill="#294b53">${esc(t)}</text>`+side(n,1125,y+28,47,14);y+=171;}
 s+=`<text x="55" y="1041" font-size="16" font-weight="650" fill="#294b53">Preserved: calm Greek coastal city / cliffy terrain / 5v5 defusal / radius .30 m, standing 1.80 m, crouch 1.10 m, step .30 m, slope 42°.</text>`;
 s+=side('Spatial comparison only: paths are actual floor proposals but the drawing is not yet a continuous physical proof. The +6 m Chapel porch is an occupied pause; +2/+6 stair landings elsewhere are local transfers. Roofed underpasses reserve 3.7 m below the upper slab. Scenic roofs remain closed.',55,1071,188,14);
 return s+'</g></svg>';
}
for(const z of[null,0,4,6,8])await writeFile(`${out}/${z===null?'composition':`floor-${z}`}.svg`,render(z));
const browser=await launchBrowser();try{for(const z of[null,0,4,6,8]){const page=await browser.newPage({viewport:{width:1560,height:1140}});await page.setContent(render(z));await page.screenshot({path:`${out}/${z===null?'composition':`floor-${z}`}.png`});await page.close();}}finally{await browser.close();}
console.log('Wrote R02 composition comparison and aligned occupied floors.');
