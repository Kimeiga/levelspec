import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArchitectureBuilder,serializeAml} from 'levelspec';
import {produceDocument} from 'levelspec/producers';
import {physicalRouteEvidence} from '../src/authoring/physical-routes.ts';
import {boxGeometry} from '../src/vector/props.ts';
import {floor,mouth,route,rectangle} from './fixtures/physical-architecture.ts';

function ladder(){
  const builder=new ArchitectureBuilder('ladder');floor(builder,'a',rectangle(0,0,12,12));floor(builder,'b',rectangle(0,0,12,12,4));route(builder,[6,6,0],[6,6,4],'a','b');builder.document.player.ladder=true;
  builder.document.links.push({id:'ladder',kind:'ladder',ability:'ladder',bidirectional:true,from:[6,6,0],to:[6,6,4],fromArea:'a',toArea:'b'});return builder.document;
}
test('native ability links retain their direction and coincident duplicate links share one capacity',async()=>{
  const d=ladder(),made=await produceDocument(d);assert.equal(made.text,serializeAml(d));assert.equal(made.physical.routes[0].physicalDisjointRoutes,1);
  d.links.push({...d.links[0],id:'duplicate'});assert.equal((await produceDocument(d)).physical.routes[0].physicalDisjointRoutes,1);
  d.links.push({...d.links[0],id:'reverse',from:d.links[0].to,to:d.links[0].from,fromArea:'b',toArea:'a'});assert.equal((await produceDocument(d)).physical.routes[0].physicalDisjointRoutes,1);
});
test('disabled abilities and reversed one-way native traversal remain rejected',async()=>{
  const d=ladder();d.player.ladder=false;await assert.rejects(produceDocument(d),/NAV|ROUTE|UNREACHABLE/);
  d.player.ladder=true;d.links[0].ability='unsupported';await assert.rejects(produceDocument(d),/NAV|ROUTE|UNREACHABLE|ability/i);
  d.links[0].ability='ladder';d.links[0].bidirectional=false;assert.equal((await produceDocument(d)).physical.routes[0].physicalDisjointRoutes,1);
  const made=await produceDocument(d);made.level.document.routes[0]={...d.routes[0],from:'end',to:'start'};
  assert.equal(physicalRouteEvidence(made.level,(made.report.sealed??made.report.navigation)!).routes[0].physicalDisjointRoutes,0);
});
function divided(){
  const builder=new ArchitectureBuilder('divided');floor(builder,'a',[[0,0,0],[8,0,0],[8,8,0],[16,8,0],[16,16,0],[0,16,0]]);floor(builder,'b',rectangle(8,0,8,8));floor(builder,'t',rectangle(16,0,8,16));
  mouth(builder,'ab-low','a','b',[[8,0,0],[8,8,0]]);mouth(builder,'ab-high','a','b',[[8,8,0],[16,8,0]]);mouth(builder,'at','a','t',[[16,8,0],[16,16,0]]);mouth(builder,'bt','b','t',[[16,0,0],[16,8,0]]);
  route(builder,[4,4,0],[20,4,0],'a','t',2);return builder;
}
test('native solids split intra-area route components while a visualization mesh cannot remove physical capacity',async()=>{
  const baseline=divided();assert.equal((await produceDocument(baseline.document)).physical.routes[0].physicalDisjointRoutes,2);
  for(const kind of ['box','wall','collision']){
    const b=divided();
    if(kind==='wall'){b.path('divider-axis',[[0,7.5,0],[8,7.5,0]]);b.wall('divider','divider-axis',{height:3,thickness:1});}
    else {const solid=b.box('divider',{position:[0,7,0],width:8,depth:1,height:3});if(kind==='collision')b.compose('collision','proxy',[solid]);}
    await assert.rejects(produceDocument(b.document),/PHYSICAL_ROUTE_REQUIREMENT/);assert.equal(b.document.routes[0].minRoutes,2);
  }
  const decorative=divided();decorative.add({kind:'visual-mesh',id:'drawing',src:'divider.glb'});
  assert.equal((await produceDocument(decorative.document,{resolveAsset:async()=>boxGeometry([0,7,0],[8,8,3])})).physical.routes[0].physicalDisjointRoutes,2);
});
test('an unrelated enabled link cannot excuse a blocked physical approach',async()=>{
  const b=divided();b.box('divider',{position:[0,7,0],width:8,depth:1,height:3});b.document.player.ladder=true;b.document.links.push({id:'unrelated',kind:'ladder',ability:'ladder',bidirectional:true,from:[18,3,0],to:[21,3,0],fromArea:'t',toArea:'t'});
  await assert.rejects(produceDocument(b.document),/PHYSICAL_ROUTE_REQUIREMENT/);
});
test('disconnected native floors sharing one logical area cannot alias physical components',async()=>{
  const b=new ArchitectureBuilder('disconnected-area');floor(b,'a-low',rectangle(0,0,8,8),'a');floor(b,'a-high',rectangle(8,8,8,8),'a');floor(b,'b',rectangle(8,0,8,8));floor(b,'t',rectangle(16,0,8,16));
  mouth(b,'ab-low','a-low','b',[[8,0,0],[8,8,0]]);mouth(b,'ab-high','a-high','b',[[8,8,0],[16,8,0]]);mouth(b,'at','a-high','t',[[16,8,0],[16,16,0]]);mouth(b,'bt','b','t',[[16,0,0],[16,8,0]]);route(b,[4,4,0],[20,4,0],'a-low','t',2);
  await assert.rejects(produceDocument(b.document),/ROUTE_REQUIREMENT/);b.document.markers[0].region='b';b.document.markers[0].position=[12,4,0];assert.equal((await produceDocument(b.document)).physical.routes[0].physicalDisjointRoutes,2);
});
