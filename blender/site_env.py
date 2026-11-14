# UZ GROW — atrof-muhit: ufqdagi tog'lar, dalalar, katta yo'l, ariq, teraklar, qishloq uylari, elektr liniyasi.
# Avval 01–05 ni qayta quradi, keyin ustiga qo'shadi (eng oxirgi skript — eksportdan oldin shuni ishga tushiring):
#   exec(open(r"...\site_env.py", encoding="utf-8").read())
#
# Takrorlanadigan obyektlar (teraklar, daraxtlar, uylar, ustunlar) bu yerda faqat SHABLON (EnvTpl_*),
# joylashuvlari web/src/data/environment.json ga yoziladi — sayt ularni instancing bilan chizadi.
import json

BLENDER_DIR = r"C:\Users\ghost\Desktop\uzgrow-3d-web site\blender"
exec(open(BLENDER_DIR + r"\ch05_build.py", encoding="utf-8").read())

ENV_JSON = r"C:\Users\ghost\Desktop\uzgrow-3d-web site\web\src\data\environment.json"
rng = random.Random(2017)

M.update({
    "mountain": mat("Mountain", (0.36, 0.33, 0.29), rough=0.95),
    "asphalt": mat("Asphalt", (0.07, 0.07, 0.075), rough=0.85),
    "marking": mat("Road_Marking", (0.85, 0.85, 0.8), rough=0.6),
    "water": mat("Canal_Water", (0.05, 0.12, 0.14), metal=0.2, rough=0.06),
    "bank": mat("Canal_Bank", (0.32, 0.3, 0.24), rough=1.0),
    "crop_a": mat("Field_Crop", (0.2, 0.32, 0.1), rough=0.9),
    "crop_b": mat("Field_Wheat", (0.55, 0.46, 0.22), rough=0.95),
    "crop_c": mat("Field_Plowed", (0.22, 0.16, 0.11), rough=1.0),
    "poplar": mat("Foliage_Poplar", (1, 1, 1), rough=0.85),
    "shrub0": mat("Foliage_Shrub0", (1, 1, 1), rough=0.85),
    "shrub1": mat("Foliage_Shrub1", (1, 1, 1), rough=0.85),
    "grass": mat("Foliage_Grass", (1, 1, 1), rough=0.9),
    "boulder": mat("Boulder", (1, 1, 1), rough=0.9),
    "cement": mat("Cement_Bag", (1, 1, 1), rough=0.85),
    "pallet": mat("Pallet_Wood", (0.42, 0.3, 0.18), rough=0.85),
    "pole": mat("Pole_Concrete", (0.6, 0.6, 0.58), rough=0.8),
    "cable": mat("Cable", (0.05, 0.05, 0.05), metal=0.6, rough=0.5),
    "house": mat("House_Wall", (0.82, 0.78, 0.7), rough=0.85),
    "house_roof": mat("House_Roof", (0.25, 0.4, 0.35), metal=0.6, rough=0.45),
    "window": mat("House_Window", (0.06, 0.08, 0.1), metal=0.7, rough=0.15),
    "trim": mat("House_Trim", (0.88, 0.88, 0.85), rough=0.6),
    "door": mat("House_Door", (0.2, 0.12, 0.07), rough=0.55),
})

# Skan qilingan toshlar va sement qoplari (Poly Haven) — kutubxonadan. Rasmlari saytda material nomi bo'yicha.
LIB = BLENDER_DIR + r"\assets_lib.blend"
with bpy.data.libraries.load(LIB, link=False) as (data_from, data_to):
    data_to.meshes = list(data_from.meshes)
_lib = {("cement_bag" if me.name.startswith("cement_bag") else "boulder_01"): me for me in data_to.meshes}
for me in _lib.values():
    me.materials.clear()
bould_me = _lib["boulder_01"]
bould_me.name = "Boulder"
bould_me.materials.append(M["boulder"])
bag_src = _lib["cement_bag"]


def pallet(bm):
    """Yog'och taglik ustida 3 qator qop (har qatorda bog'lab terilgan 5 ta)."""
    for x in (-0.48, 0.0, 0.48):
        box_into(bm, (0.1, 1.2, 0.08), (x, 0, 0.04), 1)
    for y in (-0.5, 0.0, 0.5):
        box_into(bm, (1.1, 0.12, 0.025), (0, y, 0.1), 1)
    tmp = bmesh.new()
    tmp.from_mesh(bag_src)
    uv_src = tmp.loops.layers.uv.active
    uvl = bm.loops.layers.uv.verify()
    for z in range(3):
        rot = 0 if z % 2 == 0 else math.pi
        for k, (dx, dy, a) in enumerate(((-0.25, -0.38, 0), (0.25, -0.38, 0), (-0.38, 0.27, math.pi / 2), (0.0, 0.27, math.pi / 2), (0.38, 0.27, math.pi / 2))):
            mx = Matrix.Rotation(rot, 4, "Z") @ Matrix.Translation((dx, dy, 0.2 + z * 0.17)) @ Matrix.Rotation(a + rng.uniform(-0.04, 0.04), 4, "Z")
            vmap = {}
            for v in tmp.verts:
                vmap[v] = bm.verts.new(mx @ v.co)
            for f in tmp.faces:
                nf = bm.faces.new([vmap[v] for v in f.verts])
                nf.material_index = 0
                nf.smooth = f.smooth
                for l0, l1 in zip(f.loops, nf.loops):
                    l1[uvl].uv = l0[uv_src].uv
    tmp.free()
    # bm dagi taxtalar uchun UV yo'q (0,0) — Pallet_Wood teksturasiz, baribir o'qilmaydi


pallet_me = mesh_from("CementPallet", pallet, [M["cement"], M["pallet"]])
for k, (x, y, rz) in enumerate(((-27.5, -12.0, 0.1), (-27.5, -9.8, -0.05), (-25.6, -11.0, 1.5))):
    o = new_obj(f"Prop_Cement_{k}", pallet_me, (x, y, 0))
    o.rotation_euler = (0, 0, rz)
    pop(o, "scale", 640 + k * 6, 690 + k * 6, Vector((1, 1, 1)), RISE0, "SINE", "EASE_IN_OUT")

ROAD_Y = -100.0        # katta yo'l (sharqdan g'arbga)
CANAL_Y = -92.0        # yo'l bo'yidagi ariq
SITE_CLEAR = 150.0     # majmua atrofi bo'sh (bloklar ±135 gacha)

# =====================================================================
# Tog'lar — ufqdagi halqa (shimolda balandroq, Chimyon tomoni)
# =====================================================================
def mountains(bm):
    seg, rows = 420, 16
    r0, r1 = 620.0, 1000.0
    grid = []
    for j in range(rows):
        t = j / (rows - 1)
        r = r0 + (r1 - r0) * t
        row = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            x, y = math.cos(a) * r, math.sin(a) * r
            north = 0.55 + 0.45 * max(0.0, math.sin(a))                     # shimol (+y) balandroq
            n = noise.fractal(Vector((math.cos(a) * 3.1, math.sin(a) * 3.1, t * 2.2)), 0.55, 2.1, 7)
            ridge = 1 - abs(noise.noise(Vector((a * 6.0, t * 3.0, 0.7))))
            fine = 1 - abs(noise.noise(Vector((math.cos(a) * 26.0, math.sin(a) * 26.0, t * 9.0))))   # mayda qirralar
            h = (70 + 190 * north) * (0.55 + 0.45 * n) * (0.6 + 0.4 * ridge) * (0.88 + 0.16 * fine)
            h *= math.sin(min(1.0, t * 1.35) * math.pi / 2)                  # ichki chet yerga tushadi
            row.append(bm.verts.new((x, y, h - 6)))
        grid.append(row)
    for j in range(rows - 1):
        for i in range(seg):
            a, b = grid[j][i], grid[j][(i + 1) % seg]
            c, d = grid[j + 1][(i + 1) % seg], grid[j + 1][i]
            f = bm.faces.new((a, b, c, d))
            f.smooth = True


new_obj("Env_Mountains", mesh_from("Mountains", mountains, [M["mountain"]]))

# =====================================================================
# Katta yo'l, majmuaga kirish yo'li, ariq
# =====================================================================
ROAD_LEN = 1300.0


def main_road(bm):
    box_into(bm, (ROAD_LEN, 9.0, 0.06), (0, 0, 0.0), 0)
    for s in (-1, 1):                                                     # chekka chiziqlar
        box_into(bm, (ROAD_LEN, 0.15, 0.065), (0, s * 4.1, 0.0), 1)
    x = -ROAD_LEN / 2
    while x < ROAD_LEN / 2:                                               # o'rtadagi uzuq chiziq
        box_into(bm, (3.0, 0.15, 0.065), (x + 1.5, 0, 0.0), 1)
        x += 9.0


new_obj("Env_MainRoad", mesh_from("MainRoad", main_road, [M["asphalt"], M["marking"]]), (0, ROAD_Y, 0.0))
link = new_obj("Env_AccessRoad", mesh_from("AccessRoad", lambda bm: box_into(bm, (6.0, 26.0, 0.04), (0, 13.0, 0.0)), [M["gravel"]]),
               (0, -96.0, 0.0))
pop(link, "scale", 1240, 1262, Vector((1, TINY, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")   # 03-bobdagi yo'l bilan birga


def canal(bm):
    box_into(bm, (ROAD_LEN, 2.2, 0.05), (0, 0, -0.35), 0)                # suv
    for s in (-1, 1):                                                     # beton qirg'oqlar
        beam_into(bm, (-ROAD_LEN / 2, s * 1.25, -0.2), (ROAD_LEN / 2, s * 1.25, -0.2), 0.3, 0.5, 1)


new_obj("Env_Canal", mesh_from("Canal", canal, [M["water"], M["bank"]]), (0, CANAL_Y, 0))
# kirish yo'li ariq ustidan ko'prikcha bilan o'tadi
new_obj("Env_Bridge", mesh_from("Bridge", lambda bm: (box_into(bm, (7.0, 3.4, 0.3), (0, 0, 0.0)),
                                                       box_into(bm, (0.25, 3.4, 0.6), (-3.4, 0, 0.3)),
                                                       box_into(bm, (0.25, 3.4, 0.6), (3.4, 0, 0.3))), [M["concrete"]]),
        (0, CANAL_Y, 0.02))

# =====================================================================
# Dalalar — yo'lning narigi tomonida va majmua atrofida yamoqlar
# =====================================================================
FIELD_MATS = ("crop_a", "crop_b", "crop_c")


def field_patch(bm, x0, y0, x1, y1):
    v = [bm.verts.new(p) for p in ((x0, y0, 0.02), (x1, y0, 0.02), (x1, y1, 0.02), (x0, y1, 0.02))]
    bm.faces.new(v)


fields = {k: [] for k in FIELD_MATS}
for gx in range(-6, 6):                                                  # yo'ldan janubda
    for gy in range(4):
        x0, y0 = gx * 110 + rng.uniform(-6, 6), ROAD_Y - 14 - gy * 95
        fields[FIELD_MATS[rng.randrange(3)]].append((x0, y0 - 88, x0 + 104, y0))
for side in (-1, 1):                                                     # sharq/g'arb yon dalalar
    for gy in range(-1, 5):
        x0 = side * (SITE_CLEAR + 20) if side > 0 else -(SITE_CLEAR + 20) - 160
        y0 = -80 + gy * 100
        fields[FIELD_MATS[rng.randrange(3)]].append((x0, y0, x0 + 160, y0 + 92))
for k, patches in fields.items():
    new_obj(f"Env_Fields_{k}", mesh_from(f"Fields_{k}", lambda bm, ps=patches: [field_patch(bm, *p) for p in ps], [M[k]]))

# =====================================================================
# Shablonlar: terak, uy, elektr ustuni (sayt instancing qiladi)
# =====================================================================
def house(bm):
    """Qishloq uyi: suvoq devor, sokol, romli derazalar, ayvon, gofrir to'rt qiyalik tom, mo'ri."""
    box_into(bm, (9.0, 7.0, 3.2), (0, 0, 1.6), 0)
    box_into(bm, (9.08, 7.08, 0.5), (0, 0, 0.25), 3)
    a, b, c, d = (bm.verts.new(p) for p in ((-5.0, -4.0, 3.12), (5.0, -4.0, 3.12), (5.0, 4.0, 3.12), (-5.0, 4.0, 3.12)))
    e, f = bm.verts.new((-2.2, 0, 5.0)), bm.verts.new((2.2, 0, 5.0))
    for face in ((a, b, f, e), (c, d, e, f), (b, c, f), (d, a, e)):        # to'rt qiyalik tom
        bm.faces.new(face).material_index = 1
    for x in (-3.0, 0.0, 3.0):                                             # derazalar
        box_into(bm, (1.26, 0.04, 1.42), (x, -3.51, 1.8), 3)
        box_into(bm, (1.1, 0.06, 1.26), (x, -3.52, 1.8), 2)
        box_into(bm, (0.05, 0.08, 1.26), (x, -3.53, 1.8), 3)
        box_into(bm, (1.36, 0.14, 0.05), (x, -3.56, 1.1), 3)
    for x in (-3.0, 2.0):
        box_into(bm, (1.26, 0.04, 1.42), (x, 3.51, 1.8), 3)
        box_into(bm, (1.1, 0.06, 1.26), (x, 3.52, 1.8), 2)
    box_into(bm, (1.12, 0.06, 2.2), (-0.4, 3.52, 1.1), 3)                  # eshik
    box_into(bm, (0.96, 0.08, 2.1), (-0.4, 3.53, 1.05), 4)
    box_into(bm, (3.4, 2.0, 0.16), (-0.4, 4.5, 0.08), 3)                   # ayvon
    for x in (-2.0, 1.2):
        beam_into(bm, (x, 5.3, 0.16), (x, 5.3, 2.75), 0.14, mat_index=3)
    prism_into(bm, [(-2.4, 2.9), (1.6, 2.9), (1.6, 2.98), (-2.4, 2.98)], 3.5, 5.6, 1)
    box_into(bm, (0.6, 0.6, 1.6), (2.5, 1.1, 4.5), 0)                      # mo'ri
    box_into(bm, (0.72, 0.72, 0.08), (2.5, 1.1, 5.3), 3)


def pole(bm):
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.17, radius2=0.09, depth=10.0)
    bmesh.ops.translate(bm, verts=r["verts"], vec=(0, 0, 5.0))
    for f in {f for v in r["verts"] for f in v.link_faces}:
        f.smooth = True
    box_into(bm, (0.12, 2.6, 0.14), (0, 0, 9.4), 2)
    for y in (-1.15, 0, 1.15):
        tube_into(bm, (0, y, 9.47), (0, y, 9.62), 0.03, 6, 2)
        for z in (9.6, 9.67, 9.74):                                        # chinni izolyator
            tube_into(bm, (0, y, z), (0, y, z + 0.03), 0.06, 8, 1)
    beam_into(bm, (0, 0, 8.6), (0, 1.0, 9.32), 0.05, mat_index=2)          # tirgak
    beam_into(bm, (0, 0, 8.6), (0, -1.0, 9.32), 0.05, mat_index=2)


M["insulator"] = mat("Insulator", (0.35, 0.5, 0.42), rough=0.2)

for k, (name, build, mats) in enumerate((
        ("EnvTpl_Poplar", lambda bm: cross_into(bm, "poplar", 1.0), [M["poplar"]]),
        ("EnvTpl_Shrub0", lambda bm: cross_into(bm, "shrub_0", 1.0), [M["shrub0"]]),
        ("EnvTpl_Shrub1", lambda bm: cross_into(bm, "shrub_1", 1.0), [M["shrub1"]]),
        ("EnvTpl_Grass", lambda bm: cross_into(bm, "grass", 1.0), [M["grass"]]),
        ("EnvTpl_House", house, [M["house"], M["house_roof"], M["window"], M["trim"], M["door"]]),
        ("EnvTpl_Pole", pole, [M["pole"], M["insulator"], M["steel"]]))):
    new_obj(name, mesh_from(name, build, mats), (k * 30.0, 400, -40))   # yer ostida yashirin
new_obj("EnvTpl_Boulder", bould_me, (200.0, 400, -40))

# =====================================================================
# Joylashuvlar (instancing uchun JSON) + elektr simlari
# =====================================================================
def clear_of_site(x, y, pad=0.0):
    return max(abs(x), abs(y - 30)) > SITE_CLEAR + pad


env = {"poplar": [], "tree": [], "house": [], "pole": [], "grass": [], "shrub": [], "boulder": []}


def _free_ground(x, y):
    """Majmua, yo'llar va ariqdan tashqari."""
    if max(abs(x), abs(y)) < 37.5:
        return False
    if abs(x) < 6 and y < -30:                    # kirish yo'li
        return False
    if -106 < y < -88:                            # katta yo'l va ariq
        return False
    if x < -38 and x > -50 and y < 20:            # buldozer va kran yo'li
        return False
    return True


# O't tutamlari: to'siq yonida zich, uzoqlashgan sari siyrak; butalar va skan qilingan toshlar orasida
for _ in range(2400):
    d = 38 + rng.random() ** 1.6 * 150
    side = rng.randrange(4)
    t = rng.uniform(-d, d)
    x, y = ((t, -d), (t, d), (-d, t), (d, t))[side]
    if _free_ground(x, y):
        env["grass"].append([round(x, 1), round(y, 1), round(rng.uniform(0, 6.28), 2), round(rng.uniform(0.9, 1.9), 2), rng.randrange(4)])
for _ in range(320):
    d = 38 + rng.random() ** 1.4 * 130
    side = rng.randrange(4)
    t = rng.uniform(-d, d)
    x, y = ((t, -d), (t, d), (-d, t), (d, t))[side]
    if _free_ground(x, y):
        env["shrub"].append([round(x, 1), round(y, 1), round(rng.uniform(0, 6.28), 2), round(rng.uniform(0.9, 1.9), 2), rng.randrange(2)])
for _ in range(70):
    d = 38 + rng.random() * 120
    side = rng.randrange(4)
    t = rng.uniform(-d, d)
    x, y = ((t, -d), (t, d), (-d, t), (d, t))[side]
    if _free_ground(x, y):
        env["boulder"].append([round(x, 1), round(y, 1), round(rng.uniform(0, 6.28), 2), round(rng.uniform(0.35, 1.2), 2)])

# terak qatori: ariq bo'yida va dalalar chegarasida (shamolto'sar)
x = -ROAD_LEN / 2 + 10
while x < ROAD_LEN / 2 - 10:
    if abs(x) > 5:
        env["poplar"].append([round(x + rng.uniform(-0.8, 0.8), 2), round(CANAL_Y + 2.6, 2), round(rng.uniform(0, 6.28), 2), round(rng.uniform(0.85, 1.15), 2)])
    x += rng.uniform(5.5, 7.0)
for bx in (-SITE_CLEAR - 20, SITE_CLEAR + 20, -350, 350):
    y = ROAD_Y + 12
    while y < 420:
        if not (abs(bx) == SITE_CLEAR + 20 and y < -80):
            env["poplar"].append([round(bx + rng.uniform(-0.8, 0.8), 2), round(y, 2), round(rng.uniform(0, 6.28), 2), round(rng.uniform(0.85, 1.2), 2)])
        y += rng.uniform(5.5, 7.5)
for gy in (-200, -295, -390):                                           # janubiy dalalar orasida
    xx = -600
    while xx < 600:
        env["poplar"].append([round(xx, 2), round(gy + rng.uniform(-0.6, 0.6), 2), round(rng.uniform(0, 6.28), 2), round(rng.uniform(0.85, 1.15), 2)])
        xx += rng.uniform(6.0, 8.0)

# qishloqlar: uylar + bog' daraxtlari
for cx, cy, n in ((-270, -170, 26), (300, 220, 22), (-420, 260, 18), (430, -240, 16)):
    for _ in range(n):
        hx, hy = cx + rng.uniform(-70, 70), cy + rng.uniform(-50, 50)
        env["house"].append([round(hx, 1), round(hy, 1), round(rng.choice((0, 1.5708)) + rng.uniform(-0.1, 0.1), 2), round(rng.uniform(0.85, 1.25), 2), rng.randrange(4)])
        for _ in range(3):
            env["tree"].append([round(hx + rng.uniform(-14, 14), 1), round(hy + rng.uniform(-14, 14), 1), round(rng.uniform(0, 6.28), 2), round(rng.uniform(0.8, 1.4), 2)])
# dala chetidagi yakka daraxtlar
for _ in range(90):
    tx, ty = rng.uniform(-600, 600), rng.uniform(-520, 520)
    if clear_of_site(tx, ty, 20) and abs(ty - ROAD_Y) > 12:
        env["tree"].append([round(tx, 1), round(ty, 1), round(rng.uniform(0, 6.28), 2), round(rng.uniform(0.9, 1.5), 2)])

# elektr liniyasi: yo'lning janubiy chetida
POLE_Y, POLE_STEP = ROAD_Y - 9.0, 45.0
poles_x = [x for x in [-ROAD_LEN / 2 + 20 + k * POLE_STEP for k in range(int((ROAD_LEN - 40) / POLE_STEP) + 1)]]
env["pole"] = [[round(x, 1), POLE_Y, 0.0, 1.0] for x in poles_x]


def cables(bm):
    for a, b in zip(poles_x, poles_x[1:]):
        for y in (-1.15, 0, 1.15):
            pts = []
            for k in range(9):
                t = k / 8
                sag = 1.1 * 4 * t * (1 - t)
                pts.append(Vector((a + (b - a) * t, POLE_Y + y, 9.75 - sag)))
            for p, q in zip(pts, pts[1:]):
                tube_into(bm, p, q, 0.018, 4)


new_obj("Env_Cables", mesh_from("Cables", cables, [M["cable"]]))

with open(ENV_JSON, "w", encoding="utf-8") as fh:
    json.dump(env, fh, separators=(",", ":"))

scn.frame_set(F_END)
print("OK env:", {k: len(v) for k, v in env.items()}, "objects:", len(bpy.data.objects))
