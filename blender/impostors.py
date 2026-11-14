# Haqiqiy og'ir modellardan (Poly Haven daraxtlari, o'tlari) yengil impostor rasmlar render qiladi.
# Har model 2 ta ko'rinishdan (0° va 90°) shaffof fonda render qilinadi; saytda ular kesishgan
# ikki tekislik (cross-billboard) bo'lib ko'p nusxada chiziladi.
#   exec(open(r"...\impostors.py", encoding="utf-8").read())
import bpy, math, json, os
from mathutils import Vector

IMP_DIR = r"C:\Users\ghost\Desktop\uzgrow-3d-web site\web\scripts\impostor_src"
os.makedirs(IMP_DIR, exist_ok=True)


def setup_render(res, samples=48):
    scn = bpy.context.scene
    try:
        scn.render.engine = "CYCLES"
        scn.cycles.samples = samples
        scn.cycles.use_denoising = True
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "OPTIX"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = d.type != "CPU"
        scn.cycles.device = "GPU"
    except Exception as e:
        print("cycles sozlanmadi:", e, "| engine:", scn.render.engine)
    scn.render.film_transparent = True
    scn.render.resolution_x = scn.render.resolution_y = res
    scn.render.resolution_percentage = 100
    scn.render.image_settings.file_format = "PNG"
    scn.render.image_settings.color_mode = "RGBA"
    scn.view_settings.view_transform = "Standard"
    scn.view_settings.look = "None"
    # yumshoq osmon yorug'i + quyosh: barg ichidagi hajmni beradi, soya yo'nalishini "yopishtirib" qo'ymaydi
    world = bpy.data.worlds.get("ImpWorld") or bpy.data.worlds.new("ImpWorld")
    try:
        world.use_nodes = True
    except Exception:
        pass
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.86, 0.92, 1.0, 1)
    bg.inputs[1].default_value = 0.85
    scn.world = world
    sun = bpy.data.objects.get("ImpSun")
    if not sun:
        sun = bpy.data.objects.new("ImpSun", bpy.data.lights.new("ImpSun", "SUN"))
        scn.collection.objects.link(sun)
    sun.data.energy = 2.6
    sun.data.angle = math.radians(12)
    sun.rotation_euler = (math.radians(38), 0, math.radians(30))
    cam = bpy.data.objects.get("ImpCam")
    if not cam:
        cam = bpy.data.objects.new("ImpCam", bpy.data.cameras.new("ImpCam"))
        scn.collection.objects.link(cam)
    cam.data.type = "ORTHO"
    cam.data.clip_end = 1000
    scn.camera = cam
    return cam


def world_bbox(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def render_impostor(name, objs, res=1024, views=(0, 90), samples=48, center=None):
    """objs ni ikki yo'nalishdan render qiladi. center (x, y) — tana joyi: kesishgan tekisliklar o'qi shu yerdan o'tadi.
    Qaytaradi: {size, height}: rasm qoplagan haqiqiy o'lcham (m)."""
    scn = bpy.context.scene
    cam = setup_render(res, samples)
    for o in scn.objects:
        if o.type == "MESH":
            o.hide_render = o not in objs
    lo, hi = world_bbox(objs)
    c = (lo + hi) / 2
    if center is not None:
        c = Vector((center[0], center[1], c.z))
    half = max(max(c.x - lo.x, hi.x - c.x), max(c.y - lo.y, hi.y - c.y))
    size = max(hi.z - lo.z, half * 2) * 1.04
    cam.data.ortho_scale = size
    for k, yaw in enumerate(views):
        a = math.radians(yaw)
        d = Vector((math.sin(a), -math.cos(a), 0))
        # rasm pastki cheti = yer sathi (lo.z)
        cam.location = Vector((c.x, c.y, lo.z + size / 2)) + d * (size + 50)
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        scn.render.filepath = os.path.join(IMP_DIR, f"{name}_{k}.png")
        bpy.ops.render.render(write_still=True)
    return {"size": round(size, 3), "height": round(hi.z - lo.z, 3)}
