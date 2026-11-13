"""Pack varied bag triples and flatten only their contacting sides. Retain UVs and face counts."""
import json
import math
from pathlib import Path

ASSETS = Path.cwd() / 'src/dressing/kowloon/shop/assets'
catalog = json.loads((ASSETS / 'grocer-props.json').read_text())
ARRANGEMENTS = [
    ([1, .80, 1.08], [-.35, .17, .48], [0, .04, .04], [0, 2, 1]),
    ([.84, 1.10, .94], [.42, -.28, .06], [.03, -.04, .06], [3, 0, 2]),
    ([1.08, .88, .78], [-.55, .28, -.08], [-.04, .05, 0], [1, 3, 0]),
    ([.90, .78, 1.08], [.15, -.45, .42], [.04, -.05, .03], [2, 1, 3]),
]


def world(point, pose, sign):
    """Place one source vertex with uniform scale, yaw and reflection, keeping Z upright."""
    x, y, z = [value*pose['scale'] for value in point]
    x *= sign
    c, s = math.cos(pose['yaw']), math.sin(pose['yaw'])
    return [x*c-y*s+pose['at'][0], x*s+y*c+pose['at'][1], z]


def source(point, pose, sign):
    """Return a deformed group-space position to the original asset's local meter frame."""
    x, y, z = point[0]-pose['at'][0], point[1]-pose['at'][1], point[2]
    c, s = math.cos(pose['yaw']), math.sin(pose['yaw'])
    return [(x*c+y*s)*sign/pose['scale'],(-x*s+y*c)/pose['scale'],z/pose['scale']]


def flatten(value, low, high, bounds):
    """Compress contact-side vertices into a thin flat band without collapsing triangles."""
    if low is not None:
        start = low+.004*(low-bounds[0])
        if value < start:
            return low+(value-bounds[0])*(start-low)/(start-bounds[0])
    if high is not None:
        start = high-.004*(bounds[1]-high)
        if value > start:
            return start+(value-start)*(high-start)/(bounds[1]-start)
    return value


def normals(faces):
    """Area-weight vertex normals across coincident UV seams after local compression."""
    sums = {}
    for face in faces:
        a, b, c = face
        u, v = [[p[i]-a[i] for i in range(3)] for p in [b,c]]
        n = [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
        if math.hypot(*n) < 1e-12:
            raise ValueError('Contact compression collapsed a face')
        for p in face:
            key = tuple(round(value,9) for value in p)
            old = sums.setdefault(key,[0,0,0])
            for i in range(3): old[i] += n[i]
    return {key:[value/math.hypot(*normal) for value in normal] for key,normal in sums.items()}


def cluster(asset, arrangement, mirrored):
    """Pack three overlapping footprints, then flatten both sides to disjoint shared contact planes."""
    scales, yaws, depths, labels = arrangement
    sign = -1 if mirrored else 1
    poses, bodies, bounds = [], [], []
    for scale, yaw, depth, label in zip(scales,yaws,depths,labels):
        pose = dict(scale=scale,yaw=yaw,at=[0,depth*asset['size'][1],0],labelOffset=label)
        body = [[world(v[:3],pose,sign) for v in face] for face in asset['faces']]
        low, high = min(v[0] for face in body for v in face), max(v[0] for face in body for v in face)
        if bodies:
            previous = bounds[-1]
            overlap = .18*min(previous[1]-previous[0],high-low)
            pose['at'][0] = previous[1]-overlap-low
            for face in body:
                for v in face: v[0] += pose['at'][0]
            low += pose['at'][0]
            high += pose['at'][0]
        poses.append(pose)
        bodies.append(body)
        bounds.append([low,high])
    planes = [(bounds[i][1]+bounds[i+1][0])/2 for i in range(2)]
    for index, (body,pose) in enumerate(zip(bodies,poses)):
        low = planes[index-1]+.00015 if index else None
        high = planes[index]-.00015 if index<2 else None
        local_faces, moved = [], set()
        for original, face in zip(asset['faces'],body):
            local_face = []
            for vertex, point in zip(original,face):
                clipped = flatten(point[0],low,high,bounds[index])
                if abs(clipped-point[0]) > 1e-10:
                    point[0] = clipped
                    local = source(point,pose,sign)
                    moved.add(tuple(vertex[:3]))
                else: local = vertex[:3]
                local_face.append(local)
            local_faces.append(local_face)
        rebuilt = normals(local_faces)
        pose['shape'] = [
            [[*p,*(rebuilt[tuple(round(value,9) for value in p)] if tuple(v[:3]) in moved else v[3:6])]
             for v,p in zip(original,face)] for original,face in zip(asset['faces'],local_faces)]
        # Compression can turn a corner past its old smoothed normal; retain outward shading there.
        for face in pose['shape']:
            a,b,c = face
            u,v = [[p[i]-a[i] for i in range(3)] for p in [b,c]]
            normal = [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
            normal = [value/math.hypot(*normal) for value in normal]
            for vertex in face:
                if sum(vertex[i+3]*normal[i] for i in range(3)) <= .15:
                    vertex[3:] = normal
        pose['changedVertices'] = len(moved)
        pose['shape'] = [[[round(value,6) for value in vertex] for vertex in face] for face in pose['shape']]
    vertices = [v for body in bodies for face in body for v in face]
    low = [min(v[i] for v in vertices) for i in range(3)]
    high = [max(v[i] for v in vertices) for i in range(3)]
    center = [(low[i]+high[i])/2 for i in range(2)]
    for pose in poses: pose['at'][:2] = [pose['at'][i]-center[i] for i in range(2)]
    return {'size':[high[i]-low[i] for i in range(3)],'poses':poses}


profiles = {}
for name in ['rice-sack','dry-goods-bag']:
    profiles[name] = {}
    for mirrored in [False,True]:
        groups = [cluster(catalog[name],arrangement,mirrored) for arrangement in ARRANGEMENTS]
        profiles[name]['mirrored' if mirrored else 'regular'] = groups
        print(name,mirrored,'changed vertices per arrangement',[[p['changedVertices'] for p in group['poses']] for group in groups])
target = ASSETS/'bag-clusters.json'
temporary = target.with_suffix('.tmp')
temporary.write_text(json.dumps(profiles,separators=(',',':'))+'\n')
temporary.replace(target)
