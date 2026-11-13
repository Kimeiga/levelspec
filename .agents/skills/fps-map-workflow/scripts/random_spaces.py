#!/usr/bin/env python3
"""Reproducible idea diagrams. JSON here is experiment data, never AML input."""
import argparse
import html
import json
import math
from pathlib import Path
import random

VERSION = "random-spaces-2"


def point(x, y):
    return [round(x, 4), round(y, 4)]


def segments(polygon):
    return zip(polygon, polygon[1:] + polygon[:1])


def intersection(a, b, c, d):
    """Strict segment crossings only; endpoint and collinear contact are excluded."""
    den = (b[0]-a[0])*(d[1]-c[1])-(b[1]-a[1])*(d[0]-c[0])
    if abs(den) < 1e-9:
        return None
    t = ((c[0]-a[0])*(d[1]-c[1])-(c[1]-a[1])*(d[0]-c[0]))/den
    u = ((c[0]-a[0])*(b[1]-a[1])-(c[1]-a[1])*(b[0]-a[0]))/den
    return point(a[0]+t*(b[0]-a[0]), a[1]+t*(b[1]-a[1])) if 0<t<1 and 0<u<1 else None


def inside(p, polygon):
    result = False
    for a, b in segments(polygon):
        if (a[1]>p[1]) != (b[1]>p[1]):
            x = (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]
            if p[0] < x:
                result = not result
    return result


def overlap(a, b):
    return (any(inside(p, b) for p in a) or any(inside(p, a) for p in b)
            or any(intersection(p, q, r, s) for p, q in segments(a) for r, s in segments(b)))


def room_shape(center, width, height, angle, kind):
    outlines = {
        "rectangle": [(-1,-1),(1,-1),(1,1),(-1,1)],
        "trapezoid": [(-.7,-1),(.7,-1),(1,1),(-1,1)],
        "chamfer": [(-.6,-1),(.65,-1),(1,-.5),(1,.6),(.5,1),(-1,1),(-1,-.5)],
        "L-court": [(-1,-1),(.15,-1),(.15,-.1),(1,-.1),(1,1),(-1,1)],
        "ellipse": [(math.cos(i*math.tau/20), math.sin(i*math.tau/20)) for i in range(20)],
        "fan": [(0,-.5)]+[(math.cos(a), math.sin(a)) for a in [i*math.pi/12 for i in range(13)]],
    }
    ca, sa = math.cos(angle), math.sin(angle)
    return [point(center[0]+x*width/2*ca-y*height/2*sa,
                  center[1]+x*width/2*sa+y*height/2*ca) for x, y in outlines[kind]]


def passage(rng, start, end, width, height):
    kind = rng.choice(["straight", "dogleg", "bow", "swing", "taper"])
    dx, dy = end[0]-start[0], end[1]-start[1]
    length = max(math.hypot(dx, dy), .001)
    nx, ny = -dy/length, dx/length
    amount = rng.uniform(-.27, .27)*length
    if kind in ("straight", "taper"):
        points = [start, end]
    elif kind == "dogleg":
        points = [start, point(start[0]+dx*.3+nx*amount, start[1]+dy*.3+ny*amount),
                  point(start[0]+dx*.7+nx*amount, start[1]+dy*.7+ny*amount), end]
    else:
        points = []
        for i in range(13):
            t = i/12
            offset = math.sin(t*math.pi*(2 if kind == "swing" else 1))*amount
            points.append(point(start[0]+dx*t+nx*offset, start[1]+dy*t+ny*offset))
    points = [point(max(2,min(width-2,x)), max(2,min(height-2,y))) for x,y in points]
    initial = rng.uniform(2.2, 4.8)
    widths = [round(initial*(1+(rng.uniform(-.4,.7) if kind=="taper" else .22*math.sin(i*math.pi/max(1,len(points)-1)))),4) for i in range(len(points))]
    left, right = [], []
    for i, (p, w) in enumerate(zip(points, widths)):
        prev, nxt = points[max(0,i-1)], points[min(len(points)-1,i+1)]
        tx, ty = nxt[0]-prev[0], nxt[1]-prev[1]
        scale = max(math.hypot(tx,ty), .001)
        for side, target in [(1,left),(-1,right)]:
            target.append(point(max(0,min(width,p[0]-side*ty/scale*w/2)),
                                max(0,min(height,p[1]+side*tx/scale*w/2))))
    return {"path_kind":kind, "centerline":points, "widths":widths, "polygon":left+right[::-1]}


def generate(seed, count=16, width=120., height=96., connectivity=.4):
    rng = random.Random(seed)
    kinds = ["rectangle","trapezoid","chamfer","L-court","ellipse","fan"]
    nodes = []
    # Best of a few uniform samples spreads the centers without repairing overlaps.
    for i in range(count):
        samples = [point(rng.uniform(13,width-13),rng.uniform(13,height-13)) for _ in range(5)]
        center = max(samples,key=lambda p:min((math.dist(p,n["center"]) for n in nodes),default=1))
        rw, rh = rng.uniform(9,min(23,width*.22)), rng.uniform(8,min(20,height*.22))
        angle, kind = rng.uniform(-math.pi,math.pi), rng.choice(kinds)
        polygon = room_shape(center,rw,rh,angle,kind)
        polygon = [point(max(1,min(width-1,x)),max(1,min(height-1,y))) for x,y in polygon]
        nodes.append({"id":f"N{i+1:02}","center":center,"shape":kind,"rotation_radians":round(angle,4),"polygon":polygon})
    # A randomized distance-weighted tree guarantees declared graph connectivity only.
    pairs = sorted((math.dist(a["center"],b["center"])*rng.uniform(.65,1.5),i,j)
                   for i,a in enumerate(nodes) for j,b in enumerate(nodes[:i]))
    parent = list(range(count))
    def root(i):
        while parent[i] != i:
            i = parent[i]
        return i
    selected = []
    for _,i,j in pairs:
        if root(i)!=root(j):
            parent[root(i)] = root(j)
            selected.append((i,j))
    target = min(count*(count-1)//2,count-1+round(connectivity*count))
    candidates = [(i,j) for _,i,j in pairs if (i,j) not in selected]
    # Favor nearby additions, while allowing different loops at the same density.
    while len(selected)<target:
        index = int(rng.random()**2*min(len(candidates),count))
        selected.append(candidates.pop(index))
    edges = []
    for i,j in selected:
        edges.append({"id":f"E{len(edges)+1:02}","from":nodes[i]["id"],"to":nodes[j]["id"],
                      **passage(rng,nodes[i]["center"],nodes[j]["center"],width,height)})
    room_overlaps = [[a["id"],b["id"]] for i,a in enumerate(nodes) for b in nodes[:i] if overlap(a["polygon"],b["polygon"])]
    crossing_points = []
    ribbon_overlaps = []
    for i,a in enumerate(edges):
        for b in edges[:i]:
            if {a["from"],a["to"]}&{b["from"],b["to"]}:
                continue  # Shared-node interfaces are intentionally unexamined.
            found = [p for u,v in zip(a["centerline"],a["centerline"][1:])
                     for x,y in zip(b["centerline"],b["centerline"][1:]) if (p:=intersection(u,v,x,y))]
            crossing_points.extend({"edges":[a["id"],b["id"]],"point":p} for p in found)
            if overlap(a["polygon"],b["polygon"]):
                ribbon_overlaps.append([a["id"],b["id"]])
    intrusions = [[e["id"],n["id"]] for e in edges for n in nodes
                  if n["id"] not in [e["from"],e["to"]] and overlap(e["polygon"],n["polygon"])]
    return {"format":"idea-seed-experiment","generator":VERSION,"seed":seed,
            "parameters":{"nodes":count,"width":width,"height":height,"connectivity":connectivity},
            "units":"abstract provisional meters; not surveyed", "nodes":nodes,"edges":edges,
            "unresolved":{"room_overlaps":room_overlaps,"nonincident_passage_centerline_crossings":crossing_points,
                          "nonincident_passage_ribbon_overlaps":ribbon_overlaps,"passage_unrelated_room_overlaps":intrusions,
                          "limits":"2D polygon diagnostics only. Shared-node interfaces, self-intersections, edge contact, elevations, architecture, collision, navigation, sightlines and balance are not validated."}}


def svg(data):
    width, height = data["parameters"]["width"],data["parameters"]["height"]
    scale=8
    title=f'RAW SEED {data["seed"]} · {len(data["nodes"])} spaces / {len(data["edges"])} links'
    sheet_width=max(width*scale+80,1120,len(title)*20)
    sheet_height=height*scale+250
    diagram_offset=(sheet_width-80-width*scale)/2
    def pts(p):
        return " ".join(f"{x*scale:.2f},{y*scale:.2f}" for x,y in p)
    unresolved=data["unresolved"]
    lines=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{sheet_width:g}" height="{sheet_height:g}" viewBox="-40 -110 {sheet_width:g} {sheet_height:g}">',
           f'<rect x="-40" y="-110" width="{sheet_width:g}" height="{sheet_height:g}" fill="#f6f3ec"/>',
           '<style>text{font-family:Arial,sans-serif;fill:#26363b} .label{font-size:13px;font-weight:bold;paint-order:stroke;stroke:#f6f3ec;stroke-width:4px;stroke-linejoin:round} .edge{font-size:10px;fill:#526a72;paint-order:stroke;stroke:#f6f3ec;stroke-width:3px}</style>',
           f'<text x="0" y="-70" font-size="25" font-weight="bold">{html.escape(title)}</text>',
           '<text x="0" y="-43" font-size="14">Random shapes and passage ribbons · declared graph connected · NO architectural/gameplay validity</text>',
           f'<text x="0" y="-20" font-size="12">Bounds {width:g} × {height:g} provisional m · connectivity {data["parameters"]["connectivity"]:g} · elements carry no theme</text>',
           f'<g transform="translate({diagram_offset:g},0)">',
           f'<rect width="{width*scale}" height="{height*scale}" fill="none" stroke="#a6aaa5" stroke-dasharray="4 6"/>']
    for e in data["edges"]:
        lines.append(f'<polygon points="{pts(e["polygon"])}" fill="#c4d4d4" stroke="#6e8b91" stroke-width="1"/>')
        lines.append(f'<polyline points="{pts(e["centerline"])}" fill="none" stroke="#7b979b" stroke-width="1" stroke-dasharray="3 4"/>')
    colors={"rectangle":"#eed5ae","trapezoid":"#d7d8b3","chamfer":"#d5c5c7","L-court":"#bfd5b9","ellipse":"#d3cee2","fan":"#e5c2a7"}
    overlapping={n for pair in unresolved["room_overlaps"] for n in pair}
    for n in data["nodes"]:
        stroke="#af5b42" if n["id"] in overlapping else "#435859"
        lines.append(f'<polygon points="{pts(n["polygon"])}" fill="{colors[n["shape"]]}" fill-opacity=".86" stroke="{stroke}" stroke-width="2"/>')
    for e in data["edges"]:
        p=e["centerline"][len(e["centerline"])//2] if len(e["centerline"])>2 else [(a+b)/2 for a,b in zip(e["centerline"][0],e["centerline"][-1])]
        lines.append(f'<text class="edge" x="{p[0]*scale}" y="{p[1]*scale}">{e["id"]}</text>')
    for n in data["nodes"]:
        x,y=n["center"]
        lines.append(f'<text class="label" text-anchor="middle" x="{x*scale}" y="{y*scale-3}">{n["id"]}</text>')
        lines.append(f'<text class="edge" text-anchor="middle" x="{x*scale}" y="{y*scale+13}">{html.escape(n["shape"])}</text>')
    for c in unresolved["nonincident_passage_centerline_crossings"]:
        x,y=c["point"]
        lines.append(f'<circle cx="{x*scale}" cy="{y*scale}" r="7" fill="none" stroke="#c74b40" stroke-width="2"/>')
    lines.append('</g>')
    y=height*scale+26
    lines.append(f'<text x="0" y="{y}" font-size="12" fill="#a34c3c">Unresolved: {len(unresolved["room_overlaps"])} room overlaps · {len(unresolved["nonincident_passage_centerline_crossings"])} centerline crossings (red rings)</text>')
    lines.append(f'<text x="0" y="{y+21}" font-size="12">{len(unresolved["nonincident_passage_ribbon_overlaps"])} ribbon overlaps · {len(unresolved["passage_unrelated_room_overlaps"])} unrelated room intrusions · further diagnostic limits in seed.json</text>')
    lines.append(f'<text x="0" y="{y+44}" font-size="12">Retain raw.svg + seed.json. Crossings require authored decisions, not implicit junctions or grade separations.</text></svg>')
    return "\n".join(lines)+"\n"


def finite_extent(value):
    number=float(value)
    if not math.isfinite(number) or not 50<=number<=240:
        raise argparse.ArgumentTypeError("extent must be finite and between 50 and 240")
    return number


def fraction(value):
    number=float(value)
    if not math.isfinite(number) or not 0<=number<=1:
        raise argparse.ArgumentTypeError("connectivity must be finite and between 0 and 1")
    return number


def amount(value):
    number=int(value)
    if not 4<=number<=40:
        raise argparse.ArgumentTypeError("nodes must be between 4 and 40")
    return number


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed",type=int,required=True,help="integer seed, reproducible with this generator version")
    parser.add_argument("--nodes",type=amount,default=16,help="4..40 candidate spaces, not a final room quota (default: 16)")
    parser.add_argument("--width",type=finite_extent,default=120.,help="provisional diagram extent, 50..240 (default: 120)")
    parser.add_argument("--height",type=finite_extent,default=96.,help="provisional diagram extent, 50..240 (default: 96)")
    parser.add_argument("--connectivity",type=fraction,default=.4,help="extra links per node, 0..1; a connected tree is always declared")
    parser.add_argument("--out",type=Path,required=True,help="directory for raw.svg and seed.json; repeated runs replace those files")
    args=parser.parse_args()
    data=generate(args.seed,args.nodes,args.width,args.height,args.connectivity)
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/"seed.json").write_text(json.dumps(data,indent=2,sort_keys=True)+"\n")
    (args.out/"raw.svg").write_text(svg(data))
    print(json.dumps({"seed":args.seed,"out":str(args.out),"nodes":len(data["nodes"]),"edges":len(data["edges"])}))


if __name__=="__main__":
    main()
