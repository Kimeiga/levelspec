import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameplay} from '../src/gameplay/index.ts';
import {createSemantic,publishSemanticDocument,type NativeSemanticPlan} from '../src/authoring/semantic.ts';
import {produceDocument} from '../src/authoring/native-producer.ts';
import {physicalRouteEvidence} from '../src/authoring/physical-routes.ts';
import {serializeLevelSvgx} from '../src/vector/format.ts';

function ladder() {
  const d=createGameplay({format:'levelspec-gameplay/2',id:'ladder_vertical',name:'Vertical ladder',player:{ladder:true},spaces:[{id:'a',rect:[0,0,12,12]},{id:'b',rect:[0,0,12,12],z:4}],connections:[],markers:[{id:'spawn',space:'a',kind:'spawn'},{id:'site',space:'b',kind:'site'}],routes:[{id:'climb',from:'spawn',to:'site',minRoutes:1}]});
  d.links.push({id:'ladder',kind:'ladder',ability:'ladder',bidirectional:true,from:[6,6,0],to:[6,6,4],fromArea:'a',toArea:'b'});return d;
}
test('enabled authored native ladder publishes unchanged and duplicate links have one capacity',async()=>{
  const d=ladder(),made=await publishSemanticDocument(d);assert.equal(made.text,serializeLevelSvgx(d));assert.equal(made.physical.routes[0].physicalDisjointRoutes,1);
  d.links.push({...d.links[0],id:'duplicate'});const duplicate=await publishSemanticDocument(d);assert.equal(duplicate.physical.routes[0].physicalDisjointRoutes,1);
  d.links.push({...d.links[0],id:'reverse',from:d.links[0].to,to:d.links[0].from,fromArea:'b',toArea:'a'});
  const reverse=await publishSemanticDocument(d);assert.equal(reverse.physical.routes[0].physicalDisjointRoutes,1);
});
test('disabled abilities and reversed one-way traversal remain rejected',async()=>{
  const d=ladder();d.player.ladder=false;await assert.rejects(publishSemanticDocument(d),/NAV|ROUTE|UNREACHABLE/);
  d.player.ladder=true;d.links[0].ability='unsupported';await assert.rejects(publishSemanticDocument(d),/NAV|ROUTE|UNREACHABLE|ability/i);
  d.links[0].ability='ladder';d.links[0].bidirectional=false;
  assert.equal((await publishSemanticDocument(d)).physical.routes[0].physicalDisjointRoutes,1);
  const made=await produceDocument(d);made.level.document.routes[0]={...d.routes[0],from:'site',to:'spawn'};
  assert.equal(physicalRouteEvidence(made.level,(made.report.sealed??made.report.navigation)!).routes[0].physicalDisjointRoutes,0);
});
function divided():NativeSemanticPlan {return {format:'levelspec-semantic/2',id:'solid_cut',name:'Solid cut',grid:1,layers:[{id:'ground',height:4}],areas:[{id:'a',rects:[[0,0,8,8],[0,8,16,8]]},{id:'b',rects:[[8,0,8,8]]},{id:'t',rects:[[16,0,8,16]]}],covers:[{id:'divider',rect:[0,7,8,1],height:3}],markers:[{id:'start',area:'a',kind:'spawn',position:[4,4]},{id:'end',area:'t',kind:'site',position:[20,4]}],routes:[{id:'walk',from:'start',to:'end',minRoutes:2}]};}
test('solid cover splits a logical area before physical route capacity is counted',async()=>{
  const d=createSemantic(divided()),native=await produceDocument(d),navigation=(native.report.sealed??native.report.navigation)!,physical=physicalRouteEvidence(native.level,navigation);
  assert.equal(navigation.routes[0].disjointRoutes,2);assert.equal(physical.routes[0].physicalDisjointRoutes,1);
  await assert.rejects(publishSemanticDocument(d),/PHYSICAL_ROUTE_REQUIREMENT/);
  assert.equal(d.covers[0].max[2],3);assert.equal(d.routes[0].minRoutes,2);
  d.player.ladder=true;d.links.push({id:'unrelated',kind:'ladder',ability:'ladder',bidirectional:true,from:[18,3,0],to:[21,3,0],fromArea:'t',toArea:'t'});
  await assert.rejects(publishSemanticDocument(d),/PHYSICAL_ROUTE_REQUIREMENT/);
  d.links=[];d.covers=[];assert.equal((await publishSemanticDocument(d)).physical.routes[0].physicalDisjointRoutes,2);
});
test('solid native props and walls split intra-area navigation while visual props do not',async()=>{
  const d=createSemantic(divided());d.covers=[];
  d.props=[{id:'prop_divider',layer:'ground',shape:'box',position:[4,7.5,0],scale:[8,1,3],rotation:[0,0,0],material:d.materials[0].id,collision:'solid'}];
  await assert.rejects(publishSemanticDocument(d),/PHYSICAL_ROUTE_REQUIREMENT/);
  d.props[0].collision='box';await assert.rejects(publishSemanticDocument(d),/PHYSICAL_ROUTE_REQUIREMENT/);
  d.props[0].collision='none';assert.equal((await publishSemanticDocument(d)).physical.routes[0].physicalDisjointRoutes,2);
  d.props=[];d.layers[0].vertices.push({id:'wall_a',x:0,y:7.5,z:0},{id:'wall_b',x:8,y:7.5,z:0});
  d.layers[0].edges.push({id:'wall_divider',from:'wall_a',to:'wall_b',kind:'wall',height:3,thickness:1,openings:[]});
  await assert.rejects(publishSemanticDocument(d),/PHYSICAL_ROUTE_REQUIREMENT/);
});
test('an unrelated authored link cannot excuse an ordinary one-mouth two-route requirement',async()=>{
  const d=createGameplay({format:'levelspec-gameplay/2',id:'one_mouth_link',name:'One mouth',player:{ladder:true},spaces:[{id:'a',footprint:[[0,0],[10,0],[10,4],[6,4],[6,10],[0,10]]},{id:'b',rect:[6,4,4,6]}],connections:[],markers:[{id:'s',space:'a',kind:'spawn',position:[2,2]},{id:'t',space:'b',kind:'site',position:[8,7]}],routes:[{id:'two',from:'s',to:'t',minRoutes:2}]});
  d.links.push({id:'unrelated',kind:'ladder',ability:'ladder',bidirectional:true,from:[7,6,0],to:[8,8,0],fromArea:'b',toArea:'b'});
  await assert.rejects(publishSemanticDocument(d),/PHYSICAL_ROUTE_REQUIREMENT/);
});
