# Run with: Godot --headless --path <temporary project> --script <this file> -- <model.glb>
extends SceneTree
func _initialize():
    var args = OS.get_cmdline_user_args()
    assert(args.size() == 1, "Pass the GLB or glTF path after --")
    var doc = GLTFDocument.new()
    var state = GLTFState.new()
    assert(doc.append_from_file(args[0], state) == OK, "Model must import")
    var root = doc.generate_scene(state)
    assert(root != null)
    var count = 0
    var uv2_count = 0
    var textures = 0
    var triangles = 0
    var stack = [root]
    while not stack.is_empty():
        var obj = stack.pop_back()
        stack.append_array(obj.get_children())
        if obj is MeshInstance3D:
            count += 1
            for i in obj.mesh.get_surface_count():
                var arrays = obj.mesh.surface_get_arrays(i)
                triangles += arrays[Mesh.ARRAY_INDEX].size() / 3
                if arrays[Mesh.ARRAY_TEX_UV2] != null:
                    uv2_count += 1
                var material = obj.mesh.surface_get_material(i)
                if material is StandardMaterial3D and material.albedo_texture != null:
                    textures += 1
    assert(count > 0)
    print("LEVELSPEC_GODOT_IMPORT ", JSON.stringify({"meshes":count,"uv2_surfaces":uv2_count,"triangles":triangles,"textured_surfaces":textures}))
    root.free()
    quit()
