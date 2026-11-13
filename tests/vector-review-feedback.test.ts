import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArchitectureBuilder,parseAml,serializeAml} from 'levelspec';
import {produceDocument} from 'levelspec/producers';
import {floor,mouth,route,rectangle} from './fixtures/physical-architecture.ts';

test('contiguous and subdivided native mouths retain one capacity while separated mouths provide two',async()=>{
  for(const collinear of [false,true]){
    const b=new ArchitectureBuilder('contiguous');
    floor(b,'a',collinear?[[0,0,0],[8,0,0],[8,4,0],[8,8,0],[0,8,0]]:[[0,0,0],[10,0,0],[10,4,0],[6,4,0],[6,10,0],[0,10,0]]);
    floor(b,'b',collinear?rectangle(8,0,8,8):rectangle(6,4,4,6));
    if(collinear){mouth(b,'lower','a','b',[[8,0,0],[8,4,0]]);mouth(b,'upper','a','b',[[8,4,0],[8,8,0]]);route(b,[2,2,0],[12,4,0],'a','b');}
    else{mouth(b,'horizontal','a','b',[[6,4,0],[10,4,0]]);mouth(b,'vertical','a','b',[[6,4,0],[6,10,0]]);route(b,[2,2,0],[8,7,0],'a','b');}
    assert.equal((await produceDocument(b.document)).physical.routes[0].physicalDisjointRoutes,1);b.document.routes[0].minRoutes=2;await assert.rejects(produceDocument(b.document),/ROUTE_REQUIREMENT/);
  }
  const separated=new ArchitectureBuilder('separated');floor(separated,'a',[[0,0,0],[8,0,0],[8,4,0],[6,4,0],[6,8,0],[8,8,0],[8,12,0],[0,12,0]]);floor(separated,'b',rectangle(8,0,8,12));
  mouth(separated,'lower','a','b',[[8,0,0],[8,4,0]]);mouth(separated,'upper','a','b',[[8,8,0],[8,12,0]]);route(separated,[2,6,0],[12,6,0],'a','b',2);assert.equal((await produceDocument(separated.document)).physical.routes[0].physicalDisjointRoutes,2);
});

test('a native holed floor and inset room retain one actual checked doorway',async()=>{
  const b=new ArchitectureBuilder('ring');floor(b,'ring',rectangle(0,0,20,20),'ring',[rectangle(6,6,8,8)]);floor(b,'inner',rectangle(6,6,8,8));
  for(const [id,points] of [['south',[[6,6,0],[14,6,0]]],['east',[[14,6,0],[14,14,0]]],['north',[[14,14,0],[6,14,0]]],['west',[[6,6,0],[6,14,0]]]] as const){b.path(id,points.map(p=>[...p]));b.wall(id+'-wall',id,{height:3});}
  b.opening('doorway','west-wall',{center:[4,1.25],width:2,height:2.5});mouth(b,'entrance','ring','inner',[[6,9,0],[6,11,0]]);route(b,[3,10,0],[10,10,0],'ring','inner');b.assembly('rooms',[...b.document.elements]);
  const made=await produceDocument(b.document);assert.equal(made.physical.routes[0].physicalDisjointRoutes,1);assert.equal(parseAml(serializeAml(b.document)).profiles.find(p=>p.id==='ring:profile')!.holes.length,1);
  b.document.routes[0].minRoutes=2;await assert.rejects(produceDocument(b.document),/ROUTE_REQUIREMENT/);
});

test('actual curved native mouth paths and partial spans cannot manufacture extra route capacity',async()=>{
  for(const partial of [false,true]){
    const b=new ArchitectureBuilder('curve');b.path('curve',[[10,0,0]],{segments:[{kind:'bezier',controls:[[16,3,0],[16,9,0]],to:[10,12,0]}]});
    b.path('west-return',[[10,12,0],[0,12,0],[0,0,0],[10,0,0]]);b.path('east-return',[[10,0,0],[20,0,0],[20,12,0],[10,12,0]]);
    b.document.profiles.push({id:'west-plan',outer:{paths:['curve','west-return']},holes:[],interior:[],breaklines:[]},{id:'east-plan',outer:{paths:['east-return','-curve']},holes:[],interior:[],breaklines:[]});b.slab('west','west-plan',{area:'west'});b.slab('east','east-plan',{area:'east'});
    if(partial)b.path('partial',[[13.375,2.71875,0]],{segments:[{kind:'bezier',controls:[[14.875,4.78125,0],[14.875,7.21875,0]],to:[13.375,9.28125,0]}]});
    b.document.connections.push({id:'mouth',from:'west',to:'east',path:partial?'partial':'curve'});route(b,[3,6,0],[18,6,0],'west','east');
    assert.equal((await produceDocument(b.document)).physical.routes[0].physicalDisjointRoutes,1);b.document.routes[0].minRoutes=2;await assert.rejects(produceDocument(b.document),/ROUTE_REQUIREMENT/);
  }
});
