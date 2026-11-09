import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArchitectureBuilder,compile} from 'levelspec';
import {heightAt} from '../src/vector/geometry.ts';

test('native half-turn stairs follow composite curved rails without filling the inner well',async()=>{
  const b=new ArchitectureBuilder('half-turn');
  for(const [side,r]of [['inner',2],['outer',4]]as const){
    for(const [i,start]of [[0,0],[1,90]]as const){const a=start*Math.PI/180;b.path(side+i,[[r*Math.cos(a),r*Math.sin(a),0]],{segments:[{kind:'arc',center:[0,0,0],radii:[r,r],start,sweep:90,rotation:0}],elevation:[i*1.2,(i+1)*1.2]});}
    b.path(side,[],{paths:[side+'0',side+'1']});
  }
  b.stairs('stairs',{left:'inner',right:'outer',count:12,thickness:.25});b.wall('inner-wall','inner',{height:3});b.wall('outer-wall','outer',{height:3});b.assembly('stairwell',[...b.document.elements]);
  b.document.markers=[{id:'start',layer:'architecture',region:'stairs',kind:'spawn',position:[2.94,.596,.2]},{id:'end',layer:'architecture',region:'stairs',kind:'poi',position:[-2.94,.596,2.4]}];b.document.routes=[{id:'around',from:'start',to:'end',minRoutes:1,minDistance:6,maxDistance:11}];
  const level=await compile(b.document);assert.deepEqual(level.diagnostics,[]);const f=level.floors.find(f=>f.region==='stairs')!;const heights=f.triangles.flatMap(t=>t.map(i=>f.points[i][2]));assert.ok(heights.every(z=>Math.abs(z-Math.round(z/.2)*.2)<1e-5));assert.equal(new Set(heights.map(z=>Math.round(z/.2))).size,12);assert.equal(heightAt(f,0,1),undefined);assert.equal(level.navigation!.passed,true,JSON.stringify(level.navigation!.coverage.uncovered));assert.equal(level.navigation!.routes[0].reachable,true);assert.ok(level.navigation!.routes[0].distance>6);
});
