/** Native vector proposals: shared floor boundaries supply the actual route graph. */
import {SceneBuilder} from '../vector/authoring.ts';
import {snapCoordinate} from '../vector/precision.ts';
import {junctions} from '../authoring/native-junctions.ts';
import type {V3,Region} from '../vector/types.ts';
import type {Theme} from './themes.ts';
import type {Rng} from './rng.ts';

export interface NativeRoom {id:string;x:number;y:number;w:number;h:number;z:number;wallHeight:number}
interface Surface {id:string;points:V3[];fill:Region['fill'];wallHeight:number}
const centre=(r:NativeRoom):V3=>[r.x+r.w/2,r.y+r.h/2,r.z];
const color=(n:number)=>'#'+n.toString(16).padStart(6,'0');

export class NativeBuilder {
  readonly scene:SceneBuilder;
  readonly rooms:NativeRoom[]=[];
  private surfaces:Surface[]=[];
  private scale:number;
  readonly wallHeight:number;
  constructor(id:string,name:string,theme:Theme,rng:Rng,scale=1) {
    if(!Number.isFinite(scale)||scale<=0)throw new RangeError('Native layout scale must be positive.');
    this.scale=scale;
    this.scene=new SceneBuilder(id);
    const d=this.scene.document;d.name=name;d.wallThickness=theme.wallThickness;d.floorThickness=0.22;
    d.player={...d.player,radius:0.35,height:1.8,step:0.45,crouch:1.1,vault:0};
    this.wallHeight=snapCoordinate(rng.float(...theme.ceiling));d.wallHeight=this.wallHeight;
    const roles=theme.palette.roles,finish=theme.surface??{roughness:0.8,metalness:0};
    for(const [id,role] of [['floor','floor'],['wall','static_hard'],['cover','cover']] as const)
      this.scene.material(id,{color:color(roles[role]??0x82909a),...finish});
    d.sky={color:color(theme.palette.sky),intensity:theme.palette.hemiIntensity};
  }
  private world(p:V3):V3 {return [snapCoordinate(p[0]*this.scale),snapCoordinate(p[1]*this.scale),snapCoordinate(p[2])];}
  room(id:string,x:number,y:number,w:number,h:number,z=0,wallHeight=this.wallHeight):NativeRoom {
    const room={id,x,y,w,h,z,wallHeight};this.rooms.push(room);
    this.surface(id,[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],'floor',wallHeight);
    return room;
  }
  surface(id:string,points:V3[],fill:Region['fill']='floor',wallHeight=this.wallHeight) {
    if(points.length<3||points.some(p=>p.some(n=>!Number.isFinite(n))))throw new Error('Invalid native floor polygon.');
    this.surfaces.push({id,points:points.map(p=>p.map(snapCoordinate) as V3),fill,wallHeight});
  }
  /** An actual floor strip between aligned room faces, not an off-mesh shortcut. */
  join(id:string,a:NativeRoom,b:NativeRoom,width=5,stairs=false) {
    const A=centre(a),B=centre(b),fill=a.z===b.z?'floor':stairs?'stairs':'ramp';
    if(A[1]===B[1]) {
      const [left,right]=a.x<b.x?[a,b]:[b,a],x=left.x+left.w,X=right.x,y=A[1]-width/2;
      this.surface(id,[[x,y,left.z],[X,y,right.z],[X,y+width,right.z],[x,y+width,left.z]],fill,1.15);
    } else if(A[0]===B[0]) {
      const [south,north]=a.y<b.y?[a,b]:[b,a],y=south.y+south.h,Y=north.y,x=A[0]-width/2;
      this.surface(id,[[x,y,south.z],[x+width,y,south.z],[x+width,Y,north.z],[x,Y,north.z]],fill,1.15);
    } else throw new Error('Native room joins must align.');
  }
  /** Two real stair flights outside the overlapping storey footprints. */
  switchback(id:string,lower:NativeRoom,upper:NativeRoom) {
    const x=lower.x+(lower.w-8.5)/2,y=lower.y+lower.h,z=lower.z,Z=upper.z,m=(z+Z)/2;
    this.surface(id+'.out',[[x,y,z],[x+4,y,z],[x+4,y+8,m],[x,y+8,m]],'stairs',1.15);
    this.surface(id+'.landing',[[x,y+8,m],[x+8.5,y+8,m],[x+8.5,y+12,m],[x,y+12,m]],'floor',1.15);
    this.surface(id+'.back',[[x+4.5,y,Z],[x+8.5,y,Z],[x+8.5,y+8,m],[x+4.5,y+8,m]],'stairs',1.15);
  }
  private decorate(theme:Theme,rng:Rng) {
    const d=this.scene.document;
    for(const r of this.rooms) {
      if(!rng.bool(Math.min(0.9,theme.decor.clutter+theme.decor.centreCover)))continue;
      const z=r.z,height=snapCoordinate(rng.float(...theme.decor.crateHeight));
      d.covers.push({id:`decor.${r.id}`,layer:'layout',min:[r.x+2,r.y+2,z],max:[r.x+3.2,r.y+3.2,z+height],material:'cover',role:'cover'});
      if(rng.bool(theme.decor.beams)&&r.w>=10&&r.h>=10) {
        const base=z+Math.min(2.6,r.wallHeight-0.5);
        if(base-z>d.player.height)d.covers.push({id:`beam.${r.id}`,layer:'layout',min:[r.x+2,r.y+r.h-3,base],max:[r.x+r.w-2,r.y+r.h-2.5,base+0.25],material:'cover',role:'beam'});
      }
    }
  }
  finish(spawn:NativeRoom,exit:NativeRoom,minRoutes:number,theme:Theme,rng:Rng) {
    const group=this.scene.group('plan',{},'layout'),all=this.surfaces.flatMap(s=>s.points);
    const heights=new Map<string,number>(),owners=new Map<string,number>();
    for(const s of this.surfaces) {
      const region=group.polygon(s.id,junctions(s.points,all).map(p=>this.world(p)),{fill:s.fill,thickness:0.22,material:'floor',
        ...(s.fill==='stairs'?{rise:0.18,underside:'sloped' as const}:{})});
      region.label=s.id;region.area=region.id;
      for(const ref of region.boundary){const id=ref.replace(/^-/,'');owners.set(id,(owners.get(id)??0)+1);heights.set(id,s.wallHeight);}
    }
    for(const edge of group.layer.edges)if(owners.get(edge.id)===1){edge.kind='wall';edge.height=heights.get(edge.id);edge.material='wall';}
    const d=this.scene.document;
    for(const [id,room,kind] of [['spawn',spawn,'attacker_spawn'],['exit',exit,'objective']] as const)
      d.markers.push({id,kind,position:this.world(centre(room)),layer:'layout',region:`plan/${room.id}`});
    d.routes.push({id:'run',from:'spawn',to:'exit',minRoutes});
    this.decorate(theme,rng);
    for(const cover of d.covers){cover.min=this.world(cover.min);cover.max=this.world(cover.max);}
    return d;
  }
}
