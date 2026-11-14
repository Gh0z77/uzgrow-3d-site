# UZ GROW — 01 "Noldan boshlash": dala, tekislash, poydevor, karkas.
# Blender ichida ishga tushiriladi: exec(open(r"...\ch01_build.py", encoding="utf-8").read())
# Timeline 0..600 kadr (30 fps). Saytda scroll shu kadrlarni o'ynatadi.
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, noise
from bpy_extras import anim_utils

random.seed(7)
BLENDER_DIR = r"C:\Users\ghost\Desktop\uzgrow-3d-web site\blender"
scn = bpy.context.scene

# ---------- parametrlar ----------
SPANS, SPAN_W = 5, 8.0      # prolyotlar soni va eni (m)  -> eni 40 m
BAYS, BAY_L = 10, 4.0       # qadamlar soni va uzunligi   -> uzunligi 40 m
GUTTER_H, RISE = 4.5, 2.3   # novgacha balandlik, dumaloq arka ko'tarilishi
W, L = SPANS * SPAN_W, BAYS * BAY_L
X0, Y0 = -W / 2, -L / 2
F_END = 600

# ---------- tozalash ----------
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.cameras,
             bpy.data.lights, bpy.data.actions):
    for d in list(coll):
        coll.remove(d)
scn.frame_start, scn.frame_end = 0, F_END
scn.render.fps = 30
scn.render.resolution_x, scn.render.resolution_y = 1920, 1080


# ---------- yordamchilar ----------
def mat(name, color, metal=0.0, rough=0.6, emit=None, strength=0.0):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m


M = {
    "soil": mat("Soil", (0.085, 0.062, 0.045), rough=0.95),
    "steel": mat("Steel_Galv", (0.62, 0.64, 0.66), metal=1.0, rough=0.32),
    "concrete": mat("Concrete", (0.42, 0.41, 0.39), rough=0.85),
    "yellow": mat("Machine_Yellow", (0.85, 0.55, 0.05), metal=0.2, rough=0.45),
    "dark": mat("Machine_Dark", (0.03, 0.03, 0.035), metal=0.5, rough=0.6),
    "glass": mat("Cab_Glass", (0.02, 0.03, 0.04), metal=0.9, rough=0.08),
    "headlight": mat("Headlight", (1, 1, 1), emit=(1.0, 0.9, 0.7), strength=25),
    "lamp": mat("Lamp_Panel", (1, 1, 1), emit=(1.0, 0.86, 0.62), strength=30),
    "logo": mat("Logo_Glow", (0.1, 0.4, 0.15), emit=(0.3, 1.0, 0.42), strength=12),
    "vest": mat("Vest", (1.0, 0.35, 0.02), emit=(1.0, 0.3, 0.0), strength=0.6),
    "helmet": mat("Helmet", (0.95, 0.95, 0.92), rough=0.4),
    "skin": mat("Worker_Dark", (0.12, 0.11, 0.1), rough=0.8),
}


def new_obj(name, me, loc=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, me)
    scn.collection.objects.link(o)
    o.location = loc
    if parent:
        o.parent = parent
    return o


def empty(name, loc=(0, 0, 0), parent=None):
    return new_obj(name, None, loc, parent)


def box_into(bm, size, center, mat_index=0):
    r = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.transform(bm, verts=r["verts"],
                        matrix=Matrix.Translation(center) @ Matrix.Diagonal((*size, 1)))
    for f in {f for v in r["verts"] for f in v.link_faces}:
        f.material_index = mat_index


def beam_into(bm, p0, p1, w, h=None, mat_index=0):
    """p0 -> p1 yo'nalishida to'rtburchak profil."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    q = d.to_track_quat("Z", "Y")
    r = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.transform(bm, verts=r["verts"], matrix=Matrix.Translation((p0 + p1) / 2)
                        @ q.to_matrix().to_4x4() @ Matrix.Diagonal((w, h or w, d.length, 1)))
    for f in {f for v in r["verts"] for f in v.link_faces}:
        f.material_index = mat_index


def tube_into(bm, p0, p1, r, seg=8, mat_index=0):
    """p0 -> p1 dumaloq quvur (haqiqiy issiqxona profillari kabi)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    if d.length < 1e-6:
        return
    q = d.to_track_quat("Z", "Y")
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d.length)
    bmesh.ops.transform(bm, verts=res["verts"], matrix=Matrix.Translation((p0 + p1) / 2) @ q.to_matrix().to_4x4())
    for f in {f for v in res["verts"] for f in v.link_faces}:
        f.material_index = mat_index
        f.smooth = True


def box_uv(bm):
    """Har yuzga metrli (1 birlik = 1 m) UV: saytdagi teksturalar kattaligi model masshtabiga bog'liq bo'lmaydi.
    Build o'zi UV yozgan bo'lsa (barg kartalari, impostorlar) tegmaydi."""
    if bm.loops.layers.uv:
        return
    uvl = bm.loops.layers.uv.new("UVMap")
    bm.normal_update()
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            c = l.vert.co
            l[uvl].uv = (c.y, c.z) if ax == 0 else (c.x, c.z) if ax == 1 else (c.x, c.y)


def mesh_from(name, build, mats):
    bm = bmesh.new()
    build(bm)
    box_uv(bm)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    return me


def fcurves(id_data):
    ad = id_data.animation_data
    if not ad or not ad.action:
        return []
    cb = anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot)
    return cb.fcurves if cb else []


def ease(id_data, interp="CUBIC", easing="EASE_OUT", back=1.4):
    for fc in fcurves(id_data):
        for k in fc.keyframe_points:
            k.interpolation = interp
            k.easing = easing
            if interp == "BACK":
                k.back = back


def key(o, path, frame, value):
    setattr(o, path, value)
    o.keyframe_insert(data_path=path, frame=frame)


# ---------- yer ----------
def ground():
    n, size = 90, 120.0
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=n, y_segments=n, size=size / 2)
    me = bpy.data.meshes.new("Ground_Site")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M["soil"])
    g = new_obj("Ground_Site", me)
    g.shape_key_add(name="Basis")
    rough = g.shape_key_add(name="Rough")
    piles = [(Vector((random.uniform(-18, 18), random.uniform(-18, 18))), random.uniform(0.8, 1.6),
              random.uniform(2.5, 4.5)) for _ in range(9)]
    for i, v in enumerate(me.vertices):
        p = Vector((v.co.x, v.co.y))
        r = max(abs(p.x), abs(p.y))
        fall = 1.0 - min(1.0, max(0.0, (r - 28) / 14))
        fall = fall * fall * (3 - 2 * fall)
        z = noise.noise(Vector((p.x * 0.08, p.y * 0.08, 0.3))) * 0.55
        z += noise.noise(Vector((p.x * 0.35, p.y * 0.35, 1.7))) * 0.12
        for c, h, rad in piles:
            d = (p - c).length
            if d < rad:
                z += h * (math.cos(d / rad * math.pi) * 0.5 + 0.5)
        rough.data[i].co.z = v.co.z + z * fall
    sk = me.shape_keys
    rough.value = 1.0
    rough.keyframe_insert("value", frame=95)
    rough.value = 0.0
    rough.keyframe_insert("value", frame=235)
    ease(sk, "SINE", "EASE_IN_OUT")
    # tashqi dala
    outer = mesh_from("Ground_Field", lambda bm: box_into(bm, (1400, 1400, 0.02), (0, 0, -0.04)), [M["soil"]])
    new_obj("Ground_Field", outer)


ground()

# ---------- poydevor ----------
found_me = mesh_from("Foundation", lambda bm: box_into(bm, (0.7, 0.7, 0.6), (0, 0, -0.25)), [M["concrete"]])
def column(bm):
    box_into(bm, (0.12, 0.12, GUTTER_H), (0, 0, GUTTER_H / 2))   # 120×120 kvadrat quvur
    box_into(bm, (0.32, 0.32, 0.016), (0, 0, 0.008))              # taglik plastina
    box_into(bm, (0.2, 0.2, 0.012), (0, 0, GUTTER_H - 0.006))     # yuqori qopqoq
    for sx in (-0.11, 0.11):                                      # anker boltlar
        for sy in (-0.11, 0.11):
            tube_into(bm, (sx, sy, 0.0), (sx, sy, 0.05), 0.014, 6)
    for a in range(4):                                            # taglik qovurg'alari
        ang = a * math.pi / 2
        c, s = math.cos(ang), math.sin(ang)
        beam_into(bm, (c * 0.06, s * 0.06, 0.016), (c * 0.15, s * 0.15, 0.016), 0.01, 0.12)


col_me = mesh_from("Column", column, [M["steel"]])

for j in range(BAYS + 1):
    for i in range(SPANS + 1):
        x, y = X0 + i * SPAN_W, Y0 + j * BAY_L
        f = new_obj(f"Foundation_{i}_{j}", found_me, (x, y, 0))
        t = 228 + j * 5 + i * 2
        key(f, "location", t, Vector((x, y, -0.65)))
        key(f, "location", t + 16, Vector((x, y, 0.0)))
        ease(f, "BACK", "EASE_OUT", 1.2)

        c = new_obj(f"Column_{i}_{j}", col_me, (x, y, 0.05))
        t = 300 + j * 8 + i * 2
        key(c, "location", t, Vector((x, y, -GUTTER_H - 0.2)))
        key(c, "location", t + 24, Vector((x, y, 0.05)))
        ease(c, "BACK", "EASE_OUT", 1.1)

# ---------- novlar (gutter) ----------
def gutter(bm):
    """U-profilli nov: taglik + ikki yon devor + tashqariga qayrilgan labchalar."""
    ln = L + 0.4
    box_into(bm, (0.34, ln, 0.012), (0, ln / 2, 0.006))
    for s in (-1, 1):
        box_into(bm, (0.012, ln, 0.2), (s * 0.165, ln / 2, 0.1))
        box_into(bm, (0.05, ln, 0.012), (s * 0.19, ln / 2, 0.2))


gut_me = mesh_from("Gutter", gutter, [M["steel"]])
for i in range(SPANS + 1):
    g = new_obj(f"Gutter_{i}", gut_me, (X0 + i * SPAN_W, Y0 - 0.2, GUTTER_H + 0.05))
    t = 400 + i * 6
    key(g, "scale", t, Vector((1, 0.001, 1)))
    key(g, "scale", t + 40, Vector((1, 1, 1)))
    ease(g, "CUBIC", "EASE_IN_OUT")


# ---------- arka-fermalar ----------
ARCH_R = ((SPAN_W / 2) ** 2 + RISE ** 2) / (2 * RISE)   # dumaloq tom: aylana segmenti radiusi


def arch_z(u):
    """Dumaloq (aylana segmenti) arka: u = -1..1 nov→tizma→nov."""
    x = u * SPAN_W / 2
    return math.sqrt(max(0.0, ARCH_R ** 2 - x * x)) - (ARCH_R - RISE)


def arch_xz(u, offset=0.0):
    """Arka nuqtasi, aylana markaziga qarab offset (m) ichkariga suriladi — pastki belbog' uchun."""
    x = u * SPAN_W / 2
    z = arch_z(u)
    cz = -(ARCH_R - RISE)
    n = Vector((x, z - cz)).normalized()
    return Vector((x + SPAN_W / 2 - n.x * offset, 0, z - n.y * offset))


def truss(bm, end_wall=False):
    """Ikki belbog'li dumaloq arka-ferma: yuqori va pastki arka, zigzag panjara, tortqi, burchak tirgaklari."""
    seg = 28
    us = [-1 + 2 * k / seg for k in range(seg + 1)]
    top = [arch_xz(u) for u in us]
    for a, b in zip(top, top[1:]):
        tube_into(bm, a, b, 0.042, 8)
    inner = [u for u in us if abs(u) <= 0.78]
    low = [arch_xz(u, 0.32) for u in inner]
    for a, b in zip(low, low[1:]):
        tube_into(bm, a, b, 0.03, 6)
    tube_into(bm, arch_xz(-0.86), low[0], 0.03, 6)
    tube_into(bm, low[-1], arch_xz(0.86), 0.03, 6)
    for k, u in enumerate(inner):                                  # zigzag panjara (Warren)
        if k % 2 == 0 and k + 1 < len(inner):
            tube_into(bm, low[k], arch_xz(inner[k + 1]), 0.016, 5)
            if k + 2 < len(inner):
                tube_into(bm, arch_xz(inner[k + 1]), low[k + 2], 0.016, 5)
    tube_into(bm, (0.15, 0, 0.0), (SPAN_W - 0.15, 0, 0.0), 0.025, 6)       # gorizontal tortqi
    for x in (SPAN_W * 0.3, SPAN_W * 0.7):                                 # osmalar
        u = x / (SPAN_W / 2) - 1
        tube_into(bm, (x, 0, 0.0), arch_xz(u, 0.32), 0.012, 5)
    for x0, s in ((0.0, 1), (SPAN_W, -1)):                                  # burchak tirgaklari ustunga
        tube_into(bm, (x0 + s * 0.07, 0, -0.75), (x0 + s * 0.85, 0, -0.02), 0.025, 6)
    if end_wall:                                                            # torets: tik ustunlar va ko'ndalang rigel
        for x in (SPAN_W * 0.25, SPAN_W * 0.5, SPAN_W * 0.75):
            u = x / (SPAN_W / 2) - 1
            box_into(bm, (0.08, 0.08, GUTTER_H + 0.15 + arch_z(u) - 0.05), (x, 0, (arch_z(u) - GUTTER_H - 0.15) / 2))
        tube_into(bm, (0.06, 0, -2.2), (SPAN_W - 0.06, 0, -2.2), 0.03, 6)


truss_me = mesh_from("Truss", truss, [M["steel"]])
truss_end_me = mesh_from("TrussEnd", lambda bm: truss(bm, True), [M["steel"]])
truss_starts = []
for j in range(BAYS + 1):
    for i in range(SPANS):
        x, y = X0 + i * SPAN_W, Y0 + j * BAY_L
        tr = new_obj(f"Truss_{i}_{j}", truss_end_me if j in (0, BAYS) else truss_me, (x, y, GUTTER_H + 0.15))
        t = 432 + j * 9 + i * 2
        truss_starts.append((t, y))
        # vaqti kelguncha ko'rinmaydi, keyin balandda paydo bo'lib, joyiga tushadi
        key(tr, "scale", t - 7, Vector((0.001, 0.001, 0.001)))
        key(tr, "scale", t, Vector((1, 1, 1)))
        key(tr, "location", t, Vector((x, y, GUTTER_H + 7)))
        key(tr, "location", t + 24, Vector((x, y, GUTTER_H + 0.15)))
        ease(tr, "CUBIC", "EASE_OUT")

# ---------- progonlar (purlins) ----------
pur_me = mesh_from("Purlin", lambda bm: tube_into(bm, (0, 0, 0), (0, L, 0), 0.025, 6), [M["steel"]])
PURLIN_U = (-0.72, -0.36, 0.0, 0.36, 0.72)
k = 0
for i in range(SPANS):
    for n, u in enumerate(PURLIN_U):
        x = X0 + i * SPAN_W + (u + 1) * SPAN_W / 2
        p = new_obj(f"Purlin_{i}_{n}", pur_me, (x, Y0, GUTTER_H + 0.15 + arch_z(u) + 0.045))
        t = 526 + k
        key(p, "scale", t, Vector((1, 0.001, 1)))
        key(p, "scale", t + 34, Vector((1, 1, 1)))
        ease(p, "CUBIC", "EASE_IN_OUT")
        k += 1

# Yon devorlardagi diagonal (X) bog'lovchilar — chetki qadamlarda
brace_me = mesh_from("WallBrace", lambda bm: (
    tube_into(bm, (0, 0, 0.3), (0, BAY_L, GUTTER_H - 0.1), 0.02, 6),
    tube_into(bm, (0, BAY_L, 0.3), (0, 0, GUTTER_H - 0.1), 0.02, 6)), [M["steel"]])
for side, x in ((0, X0), (1, X0 + W)):
    for n, j in enumerate((0, BAYS - 1)):
        b = new_obj(f"Brace_{side}_{n}", brace_me, (x, Y0 + j * BAY_L, 0))
        t = 545 + side * 4 + n * 2
        key(b, "scale", t, Vector((1, 1, 0.001)))
        key(b, "scale", t + 24, Vector((1, 1, 1)))
        ease(b, "CUBIC", "EASE_OUT")


# ---------- buldozer ----------
exec(open(BLENDER_DIR + r"\models.py", encoding="utf-8").read())

dz = new_obj("Bulldozer", mesh_from("Bulldozer", dozer, [M[k] for k in DOZER_MATS]))
for k, (y, flip) in enumerate(((-0.672, False), (0.672, True))):
    dec = new_obj(f"Bulldozer_Decal_{k}", text_me(f"Bulldozer_Decal_{k}", "UZ GROW", 0.2, M["decal"], 0.004), (0.98, y, 1.82), dz)
    dec.rotation_euler = (math.radians(90), 0, math.radians(180) if flip else 0)
path = [  # (kadr, x, y, yo'nalish gradusda)
    (0, -30, -15, 0), (90, -30, -15, 0), (125, 22, -15, 0), (138, 26, -9, 180),
    (172, -22, -7, 180), (184, -26, -1, 360), (214, 22, 1, 360), (226, 26, 7, 540),
    (256, -14, 9, 540), (290, -44, -3, 630),
]
for f, x, y, a in path:
    key(dz, "location", f, Vector((x, y, 0)))
    key(dz, "rotation_euler", f, (0, 0, math.radians(a)))
ease(dz, "SINE", "EASE_IN_OUT")


# ---------- avtokran ----------
cr = new_obj("Crane", mesh_from("Crane_Carrier", carrier, [M[k] for k in CARRIER_MATS]), (X0 - 9, 0, 0))
cr.rotation_euler = (0, 0, math.radians(90))
tu = new_obj("Crane_Turret", mesh_from("Crane_Turret", turret, [M["yellow"], M["dark"], M["glass"], M["chrome"], M["beacon"]]),
             (0, 0, 2.0), cr)
bo = new_obj("Crane_Boom", mesh_from("Crane_Boom", boom, [M["yellow"], M["dark"], M["chrome"]]), (0.4, 0, 1.0), tu)
bo.rotation_euler = (0, -BOOM_PITCH, 0)
boom_decal_into(bo, -0.435, False)
boom_decal_into(bo, 0.435, True)
tip = Vector((0.4 + BOOM_L * math.cos(BOOM_PITCH), 0, 1.0 + BOOM_L * math.sin(BOOM_PITCH)))
CABLE = 12.0
hook = new_obj("Crane_Hook", mesh_from("Crane_Hook", lambda bm: hook_block(bm, CABLE), [M["dark"], M["yellow"]]), tip, tu)

# Kran karetkasi (+90° ga burilgan) site tomonga qaraydi; burilish bay bo'yicha fermalarga ergashadi.
base_yaw = math.radians(-90)
reach = tip.x
key(tu, "rotation_euler", 0, (0, 0, base_yaw - math.radians(35)))
key(tu, "rotation_euler", 410, (0, 0, base_yaw - math.radians(35)))
for t, y in truss_starts[::SPANS]:
    yaw = math.atan2(y, reach)
    key(tu, "rotation_euler", t + 6, (0, 0, base_yaw + yaw))
key(tu, "rotation_euler", 585, (0, 0, base_yaw))
ease(tu, "SINE", "EASE_IN_OUT")

# ---------- yorug'lik minoralari ----------
# Mesh nomi obyekt nomidan farq qilsin: bir necha materialli mesh saytda <nom>_0, <nom>_1 bo'lib bo'linadi
# va LightMast_1 obyekti animatsiyasi boshqa bo'lakka tushib qolardi.
tower_me = mesh_from("MastRig", tower, [M[k] for k in TOWER_MATS])
def lamp_panel(bm):
    """To'rtta LED prozhektor bitta ramkada."""
    box_into(bm, (1.7, 0.06, 0.06), (0, 0.1, 0.34), 0)
    box_into(bm, (1.7, 0.06, 0.06), (0, 0.1, -0.34), 0)
    for x in (-0.45, 0.45):
        cbox_into(bm, (0.76, 0.14, 0.62), (x, 0.06, 0), 0, 0.02)
        box_into(bm, (0.68, 0.02, 0.54), (x, -0.02, 0), 1)


panel_me = mesh_from("LampPanel", lamp_panel, [M["dark"], M["lamp"]])
for n, (x, y) in enumerate([(25, -31), (31, 4), (27, 28), (-37, 14)]):
    m = new_obj(f"LightMast_{n}", tower_me, (x, y, 0))
    m.rotation_euler = (0, 0, math.atan2(-x, y))
    p = new_obj(f"LightTower_{n}", panel_me, (-0.6, 0, 8.0), m)
    p.rotation_euler = (math.radians(-25), 0, 0)


# ---------- ishchilar ----------
worker_mats = [M[k] for k in WORKER_MATS]
wk_mes = [mesh_from(f"Worker_{name}", build, worker_mats)
          for name, build in (("Stand", worker_stand), ("Shovel", worker_shovel), ("Carry", worker_carry))]
spots = [(-23, -22), (-21.5, -23), (-17, -23.5), (13, -24), (16, -22), (22.5, -10),
         (-23, 6), (-22.5, 8), (10, 23), (-4, 22.5)]
for n, (x, y) in enumerate(spots):
    w = new_obj(f"Worker_{n}", wk_mes[(n * 2 + n // 3) % 3], (x, y, 0))
    w.rotation_euler = (0, 0, random.uniform(0, 6.28))

# ---------- material to'plami: po'lat quvurlar yog'och tagliklarda ----------
def beam_pile(bm):
    for x in (-4.5, 0.0, 4.5):
        box_into(bm, (0.14, 2.1, 0.1), (x, 0, 0.05), 1)
    for row in range(4):
        n = 8 - row
        for c in range(n):
            box_into(bm, (12, 0.16, 0.16), (random.uniform(-0.08, 0.08), (c - (n - 1) / 2) * 0.2, 0.2 + row * 0.175))


pile = mesh_from("BeamPile", beam_pile, [M["steel"], M["wood"]])
new_obj("BeamPile", pile, (X0 - 9, -14, 0)).rotation_euler = (0, 0, math.radians(90))

# ---------- logotip ----------
txt = bpy.data.curves.new("LogoText", "FONT")
txt.body = "UZ GROW"
txt.size = 15
txt.extrude = 0.35
txt.align_x = "CENTER"
txt.align_y = "BOTTOM"
tob = bpy.data.objects.new("LogoTmp", txt)
scn.collection.objects.link(tob)
deps = bpy.context.evaluated_depsgraph_get()
logo_me = bpy.data.meshes.new_from_object(tob.evaluated_get(deps))
bpy.data.objects.remove(tob, do_unlink=True)
logo_me.name = "Logo"
logo_me.materials.clear()
logo_me.materials.append(M["logo"])
logo = new_obj("Logo", logo_me, (0, 160, 3.0))
logo.rotation_euler = (math.radians(90), 0, 0)
bar = mesh_from("LogoBar", lambda bm: box_into(bm, (78, 0.4, 0.35), (0, 0, 0)), [M["logo"]])
new_obj("LogoBar", bar, (0, 160, 1.4))

# ---------- kamera ----------
cam_data = bpy.data.cameras.new("Camera_Main")
cam_data.lens = 26
cam_data.clip_start, cam_data.clip_end = 0.1, 1500
cam = new_obj("Camera_Main", cam_data)
cam.rotation_mode = "QUATERNION"
scn.camera = cam

exec(open(BLENDER_DIR + r"\camera_path.py", encoding="utf-8").read())
apply_camera(cam, F_END)
ease(cam, "LINEAR", "AUTO")

# ---------- Blender ichida ko'rish uchun (eksport qilinmaydi) ----------
sun = bpy.data.objects.new("Preview_Sun", bpy.data.lights.new("Preview_Sun", "SUN"))
scn.collection.objects.link(sun)
sun.data.energy = 3
sun.rotation_euler = (math.radians(60), 0, math.radians(-40))

scn.frame_set(F_END)
print("OK objects:", len(bpy.data.objects))
