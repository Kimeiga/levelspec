"""Generate reusable canvas awnings using actual Blender Cloth, then export settled shells.
Run: Blender -b --factory-startup --python projects/kowloon-tarps/model.py -- --prototype
No procedural lighting is baked. The editable Cloth cages and pin targets remain in tarps.blend.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT / 'projects/kowloon-tarps'
OUTPUT = ROOT / 'generated/tarp-study'
WIDTH, DEPTH, DROP = 3.0, 1.3, .45
NX, NY = 60, 30

VARIANTS = [
    {'id': 'taut', 'title': 'Taut wrinkles', 'slack_x': .065, 'slack_y': .025,
     'front_ties': [0, 15, 30, 45, 60], 'bending': .015, 'tension': 100, 'skirt': 0},
    {'id': 'loose', 'title': 'Loose center', 'slack_x': .075, 'slack_y': .045,
     'front_ties': [0, 12, 30, 48, 60], 'bending': .008, 'tension': 100, 'skirt': 0},
    {'id': 'asymmetric', 'title': 'Asymmetric pull', 'slack_x': .075, 'slack_y': .035,
     'front_ties': [0, 12, 30, 42, 60], 'bending': .012, 'tension': 100, 'skirt': 0},
    {'id': 'skirt', 'title': 'Rumpled skirt', 'slack_x': .09, 'slack_y': .025,
     'front_ties': list(range(0, 61, 6)), 'bending': .0003, 'tension': 100, 'skirt': .11},
]


def material(name, color, roughness):
    """Neutral intrinsic clay for silhouette inspection, deliberately without baked shading."""
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return result


def finished_canvas(variant):
    """Use the shared intrinsic PBR maps, packed for a self-contained editable Blender asset."""
    colors = {'taut': (.56, .64, .48), 'loose': (.67, .52, .39),
              'asymmetric': (.43, .56, .61), 'skirt': (.66, .62, .43)}
    result = material(variant['id'] + ' · weathered canvas PBR', colors[variant['id']], .87)
    nodes, links = result.node_tree.nodes, result.node_tree.links
    shader = nodes.get('Principled BSDF')
    uv = nodes.new('ShaderNodeTexCoord')
    scale = nodes.new('ShaderNodeVectorMath')
    scale.operation = 'SCALE'
    scale.inputs[3].default_value = 1 / 1.5
    links.new(uv.outputs['UV'], scale.inputs[0])
    textures = {}
    for suffix in ['', '-normal', '-properties']:
        filename = ROOT / 'src/materials/library' / ('tarp' + suffix + '.png')
        image = bpy.data.images.load(str(filename), check_existing=True)
        if suffix:
            image.colorspace_settings.name = 'Non-Color'
        image.pack()
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = image
        texture.extension = 'REPEAT'
        links.new(scale.outputs[0], texture.inputs['Vector'])
        textures[suffix] = texture
    tint = nodes.new('ShaderNodeMixRGB')
    tint.blend_type = 'MULTIPLY'
    tint.inputs[0].default_value = 1
    tint.inputs[2].default_value = (*colors[variant['id']], 1)
    links.new(textures[''].outputs['Color'], tint.inputs[1])
    links.new(tint.outputs[0], shader.inputs['Base Color'])
    normal = nodes.new('ShaderNodeNormalMap')
    normal.inputs['Strength'].default_value = .7
    links.new(textures['-normal'].outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs[0], shader.inputs['Normal'])
    channels = nodes.new('ShaderNodeSeparateColor')
    links.new(textures['-properties'].outputs['Color'], channels.inputs[0])
    links.new(channels.outputs['Green'], shader.inputs['Roughness'])
    result['texture_period_meters'] = 1.5
    result['no_baked_lighting'] = True
    return result


def activate(scene, obj=None):
    """Make a scene and optional mesh active for Blender's simulation operators."""
    bpy.context.window.scene = scene
    if obj:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)


def cylinder(scene, name, a, b, radius, mat, collision=False):
    """Physical support reference with a true circular section and optional cloth collision."""
    activate(scene)
    direction = Vector(b) - Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=direction.length,
                                      location=(Vector(a) + Vector(b)) * .5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(mat)
    if collision:
        obj.modifiers.new('Cloth contact', 'COLLISION')
        obj.collision.thickness_outer = .004
        obj.collision.thickness_inner = .002
        obj.collision.cloth_friction = 8
    return obj


def camera(scene, name, location, target, scale):
    """Orthographic diagnostic camera; all shapes remain in physical meters."""
    data = bpy.data.cameras.new(name)
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = scale
    scene.camera = obj
    return obj


def setup_lights(scene):
    """Real-time-style neutral lighting for cloth shape inspection."""
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.world = bpy.data.worlds.new(scene.name + ' world')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get('Background').inputs[0].default_value = (.72, .76, .81, 1)
    scene.world.node_tree.nodes.get('Background').inputs[1].default_value = .3
    for name, loc, energy, size in [('Key', (4, -.5, 1.4), 500, 2), ('Rim', (-2, 3, 2), 180, 3)]:
        data = bpy.data.lights.new(scene.name + name, 'AREA')
        obj = bpy.data.objects.new(scene.name + name, data)
        scene.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (Vector((WIDTH / 2, DEPTH / 2, -.2)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
        data.energy, data.shape, data.size = energy, 'DISK', size
    scene.view_settings.view_transform = 'AgX'


def make_cloth(scene, variant, cloth_mat):
    """Create oversized rest cloth and animate only attachment targets into the final frame."""
    skirt_rows = 4 if variant['skirt'] else 0
    rows = NY + skirt_rows
    vertices, faces, uvs = [], [], []
    for j in range(rows + 1):
        v = j / NY
        if j <= NY:
            y = DEPTH * v * (1 + variant['slack_y'])
            z = -DROP * v
        else:
            # A sewn fold gives the valance its rest angle; gravity settles its free lower edge.
            y = DEPTH * (1 + variant['slack_y']) + .012 * (j - NY) / skirt_rows
            z = -DROP - variant['skirt'] * (j - NY) / skirt_rows
        for i in range(NX + 1):
            u = i / NX
            x = WIDTH * (u - .5) * (1 + variant['slack_x']) + WIDTH / 2
            # Millimeter-scale initial perturbation breaks the grid's perfect symmetry only.
            perturbation = .006 * math.sin(i * .71 + j * 1.33) * math.sin(math.pi * min(1, v))
            vertices.append((x, y, z + perturbation))
            roof_length = math.hypot(DEPTH * (1 + variant['slack_y']), DROP)
            run = roof_length * v if j <= NY else roof_length + math.hypot(variant['skirt'], .012) * (j - NY) / skirt_rows
            uvs.append((u * WIDTH * (1 + variant['slack_x']), run))
    for j in range(rows):
        for i in range(NX):
            a = j * (NX + 1) + i
            faces.append((a, a + 1, a + NX + 2, a + NX + 1))
    mesh = bpy.data.meshes.new(variant['id'] + ' rest cage')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name='Canvas rest space')
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for loop in polygon.loop_indices:
            uv.data[loop].uv = uvs[mesh.loops[loop].vertex_index]
    obj = bpy.data.objects.new(variant['id'] + ' · editable cloth', mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(cloth_mat)
    activate(scene, obj)
    basis = obj.shape_key_add(name='Surplus fabric rest shape')
    targets = obj.shape_key_add(name='Attachment targets')
    pinned = list(range(NX + 1)) + [NY * (NX + 1) + i for i in variant['front_ties']]
    pinned += [j * (NX + 1) + i for j in [NY // 3, NY * 2 // 3] for i in [0, NX]]
    pin_group = obj.vertex_groups.new(name='Sewn rear edge and front ties')
    pin_group.add(pinned, 1, 'REPLACE')
    attachments = []
    for index in pinned:
        i, j = index % (NX + 1), index // (NX + 1)
        x = .03 + (WIDTH - .06) * i / NX
        y, z = DEPTH * j / NY, -DROP * j / NY
        if variant['id'] == 'asymmetric' and j == NY and i == 42:
            y, z = DEPTH - .045, -DROP + .08
        targets.data[index].co = (x, y, z)
        attachments.append({'vertex': index, 'kind': 'rear-seam' if j == 0 else 'front-tie' if j == NY else 'side-tie',
                            'positionMeters': [x, y, z]})
    targets.value = 0
    targets.keyframe_insert('value', frame=1)
    targets.value = 1
    targets.keyframe_insert('value', frame=12)
    cloth = obj.modifiers.new('Actual cloth settlement', 'CLOTH')
    cloth.settings.vertex_group_mass = pin_group.name
    cloth.settings.rest_shape_key = basis
    cloth.settings.quality = 15
    cloth.settings.mass = .04
    cloth.settings.air_damping = 5
    cloth.settings.tension_stiffness = variant['tension']
    cloth.settings.compression_stiffness = variant['tension']
    cloth.settings.shear_stiffness = 35
    cloth.settings.bending_stiffness = variant['bending']
    cloth.settings.tension_damping = 8
    cloth.settings.compression_damping = 8
    cloth.settings.shear_damping = 8
    cloth.settings.bending_damping = .8
    cloth.settings.pin_stiffness = 1
    cloth.settings.effector_weights.gravity = 0
    cloth.settings.effector_weights.keyframe_insert('gravity', frame=1)
    cloth.settings.effector_weights.keyframe_insert('gravity', frame=12)
    cloth.settings.effector_weights.gravity = 1
    cloth.settings.effector_weights.keyframe_insert('gravity', frame=24)
    cloth.collision_settings.use_collision = True
    cloth.collision_settings.distance_min = .004
    cloth.collision_settings.collision_quality = 4
    cloth.collision_settings.use_self_collision = True
    cloth.collision_settings.self_distance_min = .003
    cloth.collision_settings.self_friction = 5
    cloth.point_cache.frame_start = 1
    cloth.point_cache.frame_end = 110
    obj['simulation_note'] = 'Actual Blender Cloth, oversized rest cage; pins settle over frames 1–12, gravity ramps up by frame 24; frozen at frame 110.'
    return obj, cloth, attachments


def reduce_settled(scene, obj, attachments):
    """Reduce the settled interior while protecting the pinned edge and silhouette."""
    activate(scene, obj)
    edge_uses = {}
    for polygon in obj.data.polygons:
        vertices = list(polygon.vertices)
        for a, b in zip(vertices, vertices[1:] + vertices[:1]):
            key = tuple(sorted((a, b)))
            edge_uses[key] = edge_uses.get(key, 0) + 1
    protected = {i for edge, count in edge_uses.items() if count == 1 for i in edge}
    protected.update(item['vertex'] for item in attachments)
    anchors = [obj.data.vertices[item['vertex']].co.copy() for item in attachments]
    group = obj.vertex_groups.new(name='Interior reduction only')
    group.add([v.index for v in obj.data.vertices if v.index not in protected], 1, 'REPLACE')
    group.add(list(protected), 0, 'REPLACE')
    modifier = obj.modifiers.new('Runtime interior reduction', 'DECIMATE')
    modifier.ratio = min(1, 1800 / sum(len(p.vertices) - 2 for p in obj.data.polygons))
    modifier.vertex_group = group.name
    modifier.vertex_group_factor = 1000
    modifier.use_collapse_triangulate = True
    graph = bpy.context.evaluated_depsgraph_get()
    reduced = bpy.data.meshes.new_from_object(obj.evaluated_get(graph), depsgraph=graph)
    final_indices = [min(range(len(reduced.vertices)), key=lambda i: (reduced.vertices[i].co - p).length_squared)
                     for p in anchors]
    maximum_anchor_error = max((reduced.vertices[i].co - p).length for i, p in zip(final_indices, anchors))
    obj.modifiers.remove(modifier)
    if maximum_anchor_error < .0001:
        obj.data = reduced
        for item, index in zip(attachments, final_indices):
            item['vertex'] = index
    else:
        bpy.data.meshes.remove(reduced)
        print('REDUCTION SKIPPED: pin displacement', maximum_anchor_error, flush=True)
    return maximum_anchor_error


def export_settled(scene, source, variant, attachments):
    """Snapshot evaluated Cloth into a plain editable mesh and portable, unlit geometry data."""
    activate(scene, source)
    graph = bpy.context.evaluated_depsgraph_get()
    evaluated = source.evaluated_get(graph)
    mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=graph)
    mesh.name = variant['id'] + ' settled mesh'
    settled = bpy.data.objects.new(variant['id'] + ' · settled shell', mesh)
    scene.collection.objects.link(settled)
    source.hide_render = True
    source.hide_set(True)
    simulated_positions = [tuple(vertex.co) for vertex in mesh.vertices]
    rest = [tuple(vertex.co) for vertex in source.data.vertices]
    peak_change = max((Vector(a) - Vector(b)).length for a, b in zip(simulated_positions, rest))
    reduction_error = reduce_settled(scene, settled, attachments)
    mesh = settled.data
    positions = [tuple(vertex.co) for vertex in mesh.vertices]
    mesh.calc_loop_triangles()
    indices = [v for triangle in mesh.loop_triangles for v in triangle.vertices]
    final_uvs = [(0, 0)] * len(mesh.vertices)
    for loop in mesh.loops:
        final_uvs[loop.vertex_index] = tuple(mesh.uv_layers.active.data[loop.index].uv)
    bounds = [[min(p[axis] for p in positions), max(p[axis] for p in positions)] for axis in range(3)]
    normalized = [[p[0] / WIDTH, p[1] / DEPTH, (p[2] + DROP * p[1] / DEPTH) / DEPTH] for p in positions]
    for item in attachments:
        item['settledPositionMeters'] = [round(v, 7) for v in positions[item['vertex']]]
        item['normalized'] = [round(v, 7) for v in normalized[item['vertex']]]
    result = {
        'id': variant['id'], 'name': variant['title'],
        'referenceDimensions': {'width': WIDTH, 'depth': DEPTH, 'drop': DROP, 'skirt': variant['skirt']},
        'positions': [[round(v, 7) for v in p] for p in normalized],
        'uv': [[round(v, 7) for v in p] for p in final_uvs],
        'indices': indices,
        'normals': [[round(v, 7) for v in vertex.normal] for vertex in mesh.vertices],
        'attachments': attachments,
        'supports': {'rearRail': [[.03, 0, -.017], [WIDTH - .03, 0, -.017]],
                     'frontRail': [[.03, DEPTH, -DROP - .017], [WIDTH - .03, DEPTH, -DROP - .017]]},
        'boundsMeters': bounds,
        'simulation': {'engine': 'Blender Cloth', 'blenderVersion': bpy.app.version_string,
                       'frames': [1, 110], 'framesPerSecond': 24, 'pinTransitionFrames': [1, 12],
                       'gravityTransitionFrames': [12, 24], 'sourceGrid': [NX, NY + (4 if variant['skirt'] else 0)],
                       'quality': 15, 'mass': .04, 'airDamping': 5, 'tension': variant['tension'],
                       'compression': variant['tension'], 'shear': 35, 'bending': variant['bending'],
                       'slackX': variant['slack_x'], 'slackY': variant['slack_y'],
                       'selfCollision': True, 'frameCollision': True,
                       'reductionPinErrorMeters': reduction_error,
                       'maximumSimulationDisplacementMeters': peak_change},
        'material': 'canvas', 'triangles': len(indices) // 3,
    }
    print('SETTLED', variant['id'], 'triangles', len(indices) // 3, 'bounds', bounds, 'movement', peak_change, flush=True)
    return settled, result


def run_variant(variant, index):
    """Run one isolated physical simulation and retain both authoring and settled forms."""
    scene = bpy.data.scenes.new(variant['id'] + ' · cloth authoring')
    activate(scene)
    scene.frame_start, scene.frame_end = 1, 110
    scene.render.fps = 24
    scene.gravity = (0, 0, -9.81)
    cloth_mat = material(variant['id'] + ' neutral canvas', (.27, .25, .20), .86)
    steel = material(variant['id'] + ' support steel', (.055, .065, .063), .54)
    source, cloth, attachments = make_cloth(scene, variant, cloth_mat)
    cylinder(scene, 'Rear support reference', (.03, 0, -.017), (WIDTH - .03, 0, -.017), .015, steel, True)
    cylinder(scene, 'Front support reference', (.03, DEPTH, -DROP - .017), (WIDTH - .03, DEPTH, -DROP - .017), .015, steel, True)
    for x in [.03, WIDTH - .03]:
        cylinder(scene, 'Side arm reference', (x, 0, -.025), (x, DEPTH, -DROP - .025), .012, steel)
        cylinder(scene, 'Wall brace reference', (x, 0, -.58), (x, DEPTH * .85, -DROP * .85 - .025), .012, steel)
    activate(scene, source)
    for frame in range(1, 111):
        scene.frame_set(frame)
        # Request evaluation every frame; jumping directly to the end does not simulate cloth.
        source.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh().vertices[0].co[:]
        source.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()
        if frame % 20 == 0:
            print('SIMULATING', variant['id'], frame, flush=True)
    settled, data = export_settled(scene, source, variant, attachments)
    setup_lights(scene)
    camera(scene, variant['id'] + ' camera', (4.5, 4.3, 2.45), (1.5, .65, -.26), 4.2)
    scene.render.filepath = str(OUTPUT / f'model-{variant["id"]}.png')
    bpy.ops.render.render(write_still=True)
    settled.data.materials.clear()
    settled.data.materials.append(finished_canvas(variant))
    return scene, data


def main():
    """Build requested prototype/full library, saving editable and portable outputs together."""
    args = argparse.ArgumentParser()
    args.add_argument('--prototype', action='store_true')
    options = args.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (PROJECT / 'assets').mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    forms = []
    for index, variant in enumerate(VARIANTS[:2] if options.prototype else VARIANTS):
        scene, data = run_variant(variant, index)
        forms.append(data)
    result = {'version': 1, 'coordinates': 'right-handed Z-up; meters at reference dimensions',
              'positionEncoding': '[x / width, y / depth, (z + drop * y / depth) / depth]',
              'uvEncoding': 'physical rest meters: U spans surplus fabric width; V follows sloped roof length and connected skirt',
              'runtime': 'Static evaluated cloth shell; generate underside/materials/supports in renderer. Choose scale near reference aspect.',
              'forms': forms}
    name = 'model-prototype.json' if options.prototype else 'cloth-forms.json'
    target = OUTPUT / name if options.prototype else PROJECT / 'assets' / name
    target.write_text(json.dumps(result, separators=(',', ':')) + '\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(PROJECT / 'tarps.blend'))
    print('SAVED', target, flush=True)


if __name__ == '__main__':
    main()
