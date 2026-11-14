# Joriy sahnani (01–05 boblar + atrof-muhit, bitta uzluksiz timeline) GLB qilib eksport qiladi.
# Avval site_env.py ni ishga tushiring (u 01–05 ni ham quradi):
# bitta "Scene" animatsiyasi, Draco siqish.
import bpy, os

# Xom fayl. Saytga `npm run models` (web/) optimallashtirib ko'chiradi.
OUT = r"C:\Users\ghost\Desktop\uzgrow-3d-web site\blender\out\site.glb"
os.makedirs(os.path.dirname(OUT), exist_ok=True)

scn = bpy.context.scene
for o in bpy.data.objects:
    o.select_set(not o.name.startswith("Preview_"))

bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    use_selection=True,
    export_cameras=True,
    export_lights=False,
    export_apply=False,
    export_yup=True,
    export_animations=True,
    export_animation_mode="SCENE",
    export_anim_scene_split_object=False,
    export_frame_range=True,
    export_force_sampling=True,
    export_bake_animation=False,
    export_optimize_animation_size=True,
    export_anim_slide_to_zero=False,
    export_morph=True,
    export_morph_animation=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=7,
)
print("exported", OUT, round(os.path.getsize(OUT) / 1024), "KB")
