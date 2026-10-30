/** Convex planar clipping with deterministic repairs and allocation guards. */
import { aborted, type ClippingLimits, type Diagnostic, type NavigationOptions, type RepairRecord, type SourceLocation, type V3 } from "./types.ts";
import { orient } from "./geometry.ts";

const POINT_EPS = 1e-8, AREA_EPS = 1e-10;
export const DEFAULT_CLIPPING_LIMITS: ClippingLimits = {
  fragmentsPerTriangle: 4096, intermediateVerticesPerTriangle: 32768, generatedVertices: 2_000_000,
};
export function clippingLimits(options: NavigationOptions): ClippingLimits {
  const limits = { ...DEFAULT_CLIPPING_LIMITS, ...options.clippingLimits };
  for (const [key, value] of Object.entries(limits))
    if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`Clipping ${key} must be a positive safe integer.`);
  return limits;
}
export class ClippingError extends Error {
  diagnostic: Diagnostic;
  constructor(diagnostic: Diagnostic) { super(diagnostic.message); this.name = "ClippingError"; this.diagnostic=diagnostic; }
}
export function polygonArea(p: V3[]) {
  if (p.length < 3) return 0;
  return Math.abs(p.slice(1, -1).reduce((a, v, i) => a + orient(p[0], v, p[i + 2]), 0)) / 2;
}
const distance = (a: V3, b: V3) => Math.hypot(...a.map((v, i) => v - b[i]));
const areaTolerance = (poly:V3[]) => Math.max(1e-8,polygonArea(poly)*1e-7,
  poly.reduce((sum,p,i)=>sum+Math.hypot(p[0]-poly[(i+1)%poly.length][0],p[1]-poly[(i+1)%poly.length][1]),0)*POINT_EPS*2);
export function counterclockwise(poly: V3[]) {
  const signed = poly.slice(1, -1).reduce((a, v, i) => a + orient(poly[0], v, poly[i + 2]), 0);
  return signed >= 0 ? poly : [...poly].reverse();
}

export class ClipContext {
  readonly limits: ClippingLimits;
  readonly repairs: RepairRecord[] = [];
  private repairIndex = new Map<string, RepairRecord>();
  private object = "";
  private source?: SourceLocation;
  private generated = 0;
  private options: NavigationOptions;
  constructor(options: NavigationOptions = {}) { this.options=options; this.limits = clippingLimits(options); }
  begin(object: string, source?: SourceLocation) { this.object = object; this.source = source; aborted(this.options.signal); }
  fail(operation: string, message: string, code = "CLIP_INVARIANT"): never {
    throw new ClippingError({severity: "error", code, message: `${operation}: ${message}`, objects: [this.object], source: this.source});
  }
  repair(code: string, message: string, count = 1, area = 0, maxDisplacement = 0) {
    const key = JSON.stringify([code,this.object]);
    const existing = this.repairIndex.get(key);
    if (existing) { existing.count += count; existing.area = (existing.area ?? 0) + area; existing.maxDisplacement = Math.max(existing.maxDisplacement ?? 0, maxDisplacement); }
    else {const record={code, message, objects:[this.object], source:this.source, count, area, maxDisplacement, movement:this.options.movement ?? "land"};this.repairs.push(record);this.repairIndex.set(key,record);}
  }
  private limit(operation: string, measured: number, limit: number) {
    aborted(this.options.signal);
    if (measured > limit) this.fail(operation, `${measured} exceeds limit ${limit}.`, "CLIP_COMPLEXITY_LIMIT");
  }
  allocate(count: number) {
    this.limit("generated vertices", this.generated + count, this.limits.generatedVertices);
    this.generated += count;
  }
  checkPieces(pieces: V3[][]) {
    this.limit("fragments per source triangle", pieces.length, this.limits.fragmentsPerTriangle);
    this.limit("intermediate vertices per source triangle", pieces.reduce((n,p)=>n+p.length,0), this.limits.intermediateVerticesPerTriangle);
    return pieces;
  }
  extend(pieces: V3[][], fresh: V3[][]) {
    this.limit("fragments per source triangle",pieces.length+fresh.length,this.limits.fragmentsPerTriangle);
    this.limit("intermediate vertices per source triangle",pieces.reduce((n,p)=>n+p.length,0)+fresh.reduce((n,p)=>n+p.length,0),this.limits.intermediateVerticesPerTriangle);
    for(const p of fresh)pieces.push(p);
  }
  normalize(input: V3[]): V3[] {
    this.limit("polygon vertices", input.length, this.limits.intermediateVerticesPerTriangle);
    if (input.some(p=>p.length!==3 || p.some(v=>!Number.isFinite(v)))) this.fail("normalize", "Nonfinite or malformed polygon vertex.");
    let p: V3[] = [];
    for (const v of input) if (!p.length || distance(p[p.length-1],v)>POINT_EPS) p.push(v);
    if (p.length>1 && distance(p[0],p[p.length-1])<=POINT_EPS) p.pop();
    let changed = true;
    while (changed && p.length>=3) {
      aborted(this.options.signal);
      changed=false;
      for(let i=0;i<p.length;i++) {
        const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length], ac=distance(a,c);
        if(ac>POINT_EPS && Math.abs(distance(a,b)+distance(b,c)-ac)<1e-12 && Math.abs(orient(a,b,c))<AREA_EPS) {p.splice(i,1);changed=true;break;}
      }
    }
    if (input.length!==p.length) this.repair("CLIP_NORMALIZED", "Removed redundant clipping vertices.", input.length-p.length,Math.abs(polygonArea(input)-polygonArea(p)),POINT_EPS);
    if(p.length<3) {
      if(p.length) this.repair("CLIP_ZERO_AREA", "Discarded a zero-area clipping fragment.",1,polygonArea(p));
      return [];
    }
    let sign=0, turning=0;
    for(let i=0;i<p.length;i++) {
      const a=p[i],b=p[(i+1)%p.length],c=p[(i+2)%p.length];
      const turn=orient(a,b,c);
      turning+=Math.atan2(turn,(b[0]-a[0])*(c[0]-b[0])+(b[1]-a[1])*(c[1]-b[1]));
      if(Math.abs(turn)<=AREA_EPS)continue;
      if(sign && sign*turn<0)this.fail("normalize", "Clipping requires a convex polygon.");
      sign=Math.sign(turn);
    }
    if(!sign) {this.repair("CLIP_ZERO_AREA", "Discarded a zero-area clipping fragment.",1,polygonArea(p));return [];}
    if(Math.abs(Math.abs(turning)-2*Math.PI)>1e-5)this.fail("normalize","Self-intersecting or folded polygon boundary.");
    if(polygonArea(p)<=AREA_EPS) {this.repair("CLIP_ZERO_AREA", "Discarded a zero-area clipping fragment.",1,polygonArea(p));return [];}
    return p;
  }
  clip(input: V3[], distanceToPlane: (p: V3)=>number): V3[] {
    const poly=this.normalize(input), result: V3[]=[];
    const push=(p:V3)=>{
      if(result.length && (distance(result[result.length-1],p)<=POINT_EPS || distance(result[0],p)<=POINT_EPS))return;
      this.limit("half-plane output vertices",result.length+1,Math.min(poly.length+2,this.limits.intermediateVerticesPerTriangle));result.push(p);
    };
    for(let i=0;i<poly.length;i++) {
      if ((i & 127) === 0) aborted(this.options.signal);
      const a=poly[i],b=poly[(i+1)%poly.length], da=distanceToPlane(a),db=distanceToPlane(b);
      if(!Number.isFinite(da)||!Number.isFinite(db))this.fail("clip","Nonfinite clipping distance.");
      if(da>=0 && (!result.length || distance(result[result.length-1],a)>POINT_EPS))push(a);
      if((da>=0)!==(db>=0)) {
        const t=da/(da-db), point=a.map((v,k)=>v+t*(b[k]-v)) as V3;
        push(point);
      }
    }
    const output=this.normalize(result);
    if(output.length>poly.length+1)this.fail("clip","A half-plane clip added more than one vertex.");
    if(polygonArea(output)>polygonArea(poly)+areaTolerance(poly))this.fail("clip","Output area exceeds input area.");
    return output;
  }
  intersect(poly: V3[], mask: V3[]): V3[] {
    mask=counterclockwise(this.normalize(mask));
    if(!mask.length)return [];
    for(let i=0;i<mask.length && poly.length;i++)poly=this.clip(poly,p=>orient(mask[i],mask[(i+1)%mask.length],p));
    return poly;
  }
  subtract(poly: V3[], mask: V3[]): V3[][] {
    poly=this.normalize(poly);mask=counterclockwise(this.normalize(mask));
    if(!poly.length)return [];
    if(!mask.length)return [poly];
    const intersection=this.intersect(poly,mask);
    if(!intersection.length)return [poly];
    const outside:V3[][]=[];let rest=poly, vertices=0;
    for(let i=0;i<mask.length && rest.length;i++) {
      const a=mask[i],b=mask[(i+1)%mask.length];
      const part=this.clip(rest,p=>-orient(a,b,p));
      if(part.length) {this.limit("subtraction fragments",outside.length+1,this.limits.fragmentsPerTriangle);this.limit("subtraction vertices",vertices+part.length,this.limits.intermediateVerticesPerTriangle);vertices+=part.length;outside.push(part);}
      rest=this.clip(rest,p=>orient(a,b,p));
    }
    const resultArea=outside.reduce((a,p)=>a+polygonArea(p),0)+polygonArea(intersection), original=polygonArea(poly);
    if(Math.abs(resultArea-original)>areaTolerance(poly))this.fail("subtract",`Area conservation failed (${original} → ${resultArea}).`);
    if(Math.abs(resultArea-original)>Math.max(1e-8,original*1e-7))this.repair("CLIP_PRECISION_SNAPPED","Resolved a floating-point sliver within the clipping point tolerance.",1,Math.abs(resultArea-original),POINT_EPS*2);
    return this.checkPieces(outside);
  }
  key(poly: V3[]) {
    const p=counterclockwise(poly).map(v=>v.map(n=>n.toFixed(8)).join(","));
    let start=0;for(let i=1;i<p.length;i++)if(p[i]<p[start])start=i;
    return p.slice(start).concat(p.slice(0,start)).join(";");
  }
  subtractMany(pieces: V3[][], mask: V3[]) {
    const result:V3[][]=[],seen=new Set<string>();let vertices=0;
    for(const p of pieces)for(const part of this.subtract(p,mask)) {
      const key=this.key(part);
      if(seen.has(key)){this.repair("CLIP_DUPLICATE", "Removed an equivalent clipping fragment.");continue;}
      this.limit("fragments per source triangle",result.length+1,this.limits.fragmentsPerTriangle);
      this.limit("intermediate vertices per source triangle",vertices+part.length,this.limits.intermediateVerticesPerTriangle);
      seen.add(key);vertices+=part.length;result.push(part);
    }
    return result;
  }
}
