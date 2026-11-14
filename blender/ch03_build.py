# UZ GROW — 03 "Tayyor issiqxona": majmua yakunlanadi, dron kadri, tom ochiladi (kadr 1200..1800).
# Avval 01+02 ni qayta quradi (bitta uzluksiz timeline), keyin ustiga qo'shadi:
#   exec(open(r"...\ch03_build.py", encoding="utf-8").read())
# Saytda o'lchov yozuvlari Dim_Label_* bo'sh obyektlar joyiga qo'yiladi.
BLENDER_DIR = r"C:\Users\ghost\Desktop\uzgrow-3d-web site\blender"
exec(open(BLENDER_DIR + r"\ch02_build.py", encoding="utf-8").read())

F_END = 1800
scn.frame_end = F_END

M.update({
    "gravel": mat("Gravel", (0.36, 0.34, 0.3), rough=1.0),
    "fence": mat("Fence", (0.05, 0.2, 0.12), metal=0.6, rough=0.45),
    "wall": mat("Packhouse_Wall", (0.86, 0.88, 0.87), rough=0.6),
    "roof": mat("Packhouse_Roof", (0.1, 0.28, 0.2), metal=0.5, rough=0.4),
    "bark": mat("Bark", (0.18, 0.11, 0.06), rough=0.9),
    "leaf": mat("Leaf", (0.12, 0.32, 0.1), rough=0.8),
    "dim": mat("Dim_Line", (0.8, 1.0, 0.85), emit=(0.55, 1.0, 0.65), strength=4),
    "mesh": mat("Fence_Mesh", (0.5, 0.55, 0.52), metal=0.6, rough=0.5),
    "foliage": mat("Foliage_Tree", (1, 1, 1), rough=0.85),
    "roller": mat("Roller_Door", (0.72, 0.74, 0.74), metal=0.3, rough=0.45),
})

# =====================================================================
# Qurilish tugadi: texnika, minoralar va ishchilar ketadi
# =====================================================================
for n in range(4):
    m = bpy.data.objects[f"LightMast_{n}"]
    pop(m, "scale", 1204 + n * 5, 1226 + n * 5, Vector((1, 1, 1)), Vector((TINY,) * 3), "CUBIC", "EASE_IN")
for n in range(10):
    w = bpy.data.objects[f"Worker_{n}"]
    pop(w, "scale", 1200 + n * 2, 1208 + n * 2, Vector((1, 1, 1)), Vector((TINY,) * 3), "CUBIC", "EASE_IN")
# Kran ufqda logotip oldida qolmasin — uzoqlashib bo'lgach yo'qoladi
crane = bpy.data.objects["Crane"]
pop(crane, "scale", 736, 742, Vector((1, 1, 1)), Vector((TINY,) * 3), "LINEAR", "AUTO")
dz = bpy.data.objects["Bulldozer"]
key(dz, "location", 1205, dz.location.copy())
key(dz, "location", 1300, dz.location + Vector((0, -140, 0)))
ease(dz, "SINE", "EASE_IN_OUT")

# =====================================================================
# Majmua: yo'l, maydoncha, to'siq, qadoqlash sexi, daraxtlar
# =====================================================================
road = new_obj("Road", mesh_from("Road", lambda bm: box_into(bm, (6, 50, 0.04), (0, -25, 0.01)), [M["gravel"]]), (0, Y0 - 0.3, 0))
pop(road, "scale", 1212, 1252, Vector((1, TINY, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")
apron = new_obj("Apron", mesh_from("Apron", lambda bm: box_into(bm, (26, 10, 0.04), (0, 0, 0.012)), [M["gravel"]]), (0, Y0 - 5.5, 0))
pop(apron, "scale", 1222, 1246, Vector((TINY, 1, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")

FX = 34.0
GATE = 4.0


def fence_mesh(length):
    """Setka to'siq: dumaloq ustunlar, tepa va pastki trubalar, o'rtada setka (saytda shaffof tekstura)."""
    def build(bm):
        n = max(1, int(round(length / 3)))
        for k in range(n + 1):
            x = length * k / n
            tube_into(bm, (x, 0, 0), (x, 0, 2.15), 0.04, 8)
            tube_into(bm, (x, 0, 2.15), (x, 0, 2.17), 0.046, 8)
            box_into(bm, (0.26, 0.26, 0.14), (x, 0, 0.05), 2)                       # beton tag
        tube_into(bm, (0, 0, 2.05), (length, 0, 2.05), 0.024, 6)
        tube_into(bm, (0, 0, 0.1), (length, 0, 0.1), 0.012, 5)
        v = [bm.verts.new(p) for p in ((0, 0, 0.1), (length, 0, 0.1), (length, 0, 2.05), (0, 0, 2.05))]
        bm.faces.new(v).material_index = 1
    return mesh_from(f"Fence_{length:.0f}", build, [M["fence"], M["mesh"], M["concrete"]])


sides = [  # (nom, boshlanish, uzunlik, burilish)
    ("Fence_S0", (-FX, -FX), FX - GATE, 0),
    ("Fence_S1", (FX, -FX), FX - GATE, 180),
    ("Fence_E", (FX, -FX), 2 * FX, 90),
    ("Fence_W", (-FX, -FX), 2 * FX, 90),
    ("Fence_N", (-FX, FX), 2 * FX, 0),
]
for k, (name, (x, y), ln, rot) in enumerate(sides):
    o = new_obj(name, fence_mesh(ln), (x, y, 0))
    o.rotation_euler = (0, 0, math.radians(rot))
    t = 1228 + k * 8
    pop(o, "scale", t, t + 34, Vector((TINY, 1, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")
def gate(bm):
    for s in (-1, 1):
        cbox_into(bm, (0.32, 0.32, 2.7), (s * GATE, 0, 1.35), 0, 0.02)          # darvoza ustuni
        box_into(bm, (0.4, 0.4, 0.06), (s * GATE, 0, 2.73), 1)
        # surma tabaqalar (ochiq holda devor bo'ylab)
        for z in (0.2, 1.1, 2.0):
            tube_into(bm, (s * (GATE + 0.2), -0.32, z), (s * (GATE + 4.2), -0.32, z), 0.03, 6, 0)
        for k in range(21):
            tube_into(bm, (s * (GATE + 0.2 + k * 0.2), -0.32, 0.2), (s * (GATE + 0.2 + k * 0.2), -0.32, 2.0), 0.012, 4, 0)


gp = new_obj("Gate", mesh_from("GatePost", gate, [M["fence"], M["steel"]]), (0, -FX, 0))
pop(gp, "scale", 1230, 1250, RISE0, Vector((1, 1, 1)), "BACK", "EASE_OUT")

# Qadoqlash sexi — issiqxonaning g'arbida
PH = Vector((X0 - 7.5, 8, 0))
PW, PL, PHT, RIDGE = 10.0, 22.0, 5.5, 7.6


def packhouse(bm):
    """Sendvich-panelli qadoqlash sexi: yuklash rampasi, ko'tarma darvozalar, oynalar, novlar, sovutish bloklari."""
    box_into(bm, (PW, PL, PHT), (0, 0, PHT / 2), 0)
    box_into(bm, (PW + 0.08, PL + 0.08, 0.6), (0, 0, 0.3), 4)            # beton sokol
    for z in (2.1, 3.9):                                                 # panel choklari
        box_into(bm, (PW + 0.02, PL + 0.02, 0.025), (0, 0, z), 5)
    for x in (-PW / 2, PW / 2):
        for k in range(1, 7):
            box_into(bm, (0.04, 0.05, PHT - 0.6), (x, -PL / 2 + k * PL / 7, PHT / 2 + 0.3), 5)
    o = 0.45
    a = bm.verts.new((-PW / 2 - o, -PL / 2 - o, PHT - 0.13))
    b = bm.verts.new((-PW / 2 - o, PL / 2 + o, PHT - 0.13))
    c = bm.verts.new((0, PL / 2 + o, RIDGE))
    d = bm.verts.new((0, -PL / 2 - o, RIDGE))
    e = bm.verts.new((PW / 2 + o, -PL / 2 - o, PHT - 0.13))
    f = bm.verts.new((PW / 2 + o, PL / 2 + o, PHT - 0.13))
    for quad in ((a, b, c, d), (d, c, f, e)):
        bm.faces.new(quad).material_index = 1
    for tri in (((-PW / 2, -PL / 2, PHT), (PW / 2, -PL / 2, PHT), (0, -PL / 2, RIDGE - 0.4)),
                ((-PW / 2, PL / 2, PHT), (0, PL / 2, RIDGE - 0.4), (PW / 2, PL / 2, PHT))):
        bm.faces.new([bm.verts.new(p) for p in tri]).material_index = 0
    box_into(bm, (0.5, PL + 1, 0.16), (0, 0, RIDGE + 0.03), 1)            # tizma qopqog'i
    for y in (-7, 0, 7):                                                  # shamollatgich
        tube_into(bm, (0, y, RIDGE), (0, y, RIDGE + 0.5), 0.26, 12, 5)
        tube_into(bm, (0, y, RIDGE + 0.5), (0, y, RIDGE + 0.58), 0.34, 12, 5)
    for s in (-1, 1):                                                     # novlar va tarnovlar
        tube_into(bm, (s * (PW / 2 + o), -PL / 2 - o, PHT - 0.2), (s * (PW / 2 + o), PL / 2 + o, PHT - 0.2), 0.09, 8, 5)
        for y in (-PL / 2 - 0.2, 0, PL / 2 + 0.2):
            tube_into(bm, (s * (PW / 2 + 0.2), y, 0.1), (s * (PW / 2 + 0.2), y, PHT - 0.25), 0.05, 8, 5)
    # issiqxona tomonidagi jabha: 2 ta ko'tarma darvoza, ramka
    for y in (-6.5, -1.5):
        box_into(bm, (0.08, 3.8, 3.7), (PW / 2 + 0.03, y, 2.1), 6)
        for k in range(14):
            box_into(bm, (0.1, 3.8, 0.015), (PW / 2 + 0.05, y, 0.4 + k * 0.26), 5)
        box_into(bm, (0.14, 4.1, 0.18), (PW / 2 + 0.05, y, 4.02), 2)
        for s in (-1, 1):
            box_into(bm, (0.14, 0.12, 3.8), (PW / 2 + 0.05, y + s * 1.97, 2.1), 2)
            box_into(bm, (0.18, 0.2, 1.0), (PW / 2 + 0.09, y + s * 2.1, 0.5), 7)  # sariq to'sqich
    box_into(bm, (1.9, 11.4, 0.9), (PW / 2 + 0.95, -4, 0.45), 4)          # yuklash rampasi
    prism_into(bm, [(PW / 2 + 0.05, 4.55), (PW / 2 + 2.6, 4.3), (PW / 2 + 2.6, 4.22), (PW / 2 + 0.05, 4.45)], -9.9, 1.9, 1)   # soyabon
    for y in (-9.6, -4, 1.6):
        tube_into(bm, (PW / 2 + 2.4, y, 0.9), (PW / 2 + 2.4, y, 4.28), 0.05, 8, 5)
    # g'arb jabhasi: lenta oyna
    for k in range(7):
        box_into(bm, (0.06, 2.1, 1.25), (-PW / 2 - 0.02, -PL / 2 + 2.0 + k * 3.0, 3.1), 3)
        box_into(bm, (0.08, 2.2, 0.06), (-PW / 2 - 0.03, -PL / 2 + 2.0 + k * 3.0, 3.75), 5)
        box_into(bm, (0.14, 2.3, 0.06), (-PW / 2 - 0.05, -PL / 2 + 2.0 + k * 3.0, 2.45), 5)
    # sovutish bloklari
    for y in (4.5, 7.0, 9.5):
        cbox_into(bm, (0.9, 1.9, 1.3), (-PW / 2 - 0.65, y, 0.75), 2, 0.03)
        tube_into(bm, (-PW / 2 - 1.11, y, 0.85), (-PW / 2 - 1.13, y, 0.85), 0.55, 16, 5)
    box_into(bm, (0.06, PL - 1, 0.35), (PW / 2 + 0.02, 0, 4.85), 8)      # brend chizig'i


ph = new_obj("Packhouse", mesh_from("Packhouse", packhouse, [M["wall"], M["roof"], M["unit"], M["glass"], M["concrete"], M["steel"], M["roller"], M["yellow"], M["logo"]]), PH)
pop(ph, "scale", 1238, 1272, RISE0, Vector((1, 1, 1)), "BACK", "EASE_OUT")

sign = bpy.data.curves.new("PackSign", "FONT")
sign.body = "UZ GROW"
sign.size = 1.5
sign.extrude = 0.05
sign.align_x = "CENTER"
stob = bpy.data.objects.new("PackSignTmp", sign)
scn.collection.objects.link(stob)
sign_me = bpy.data.meshes.new_from_object(stob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
bpy.data.objects.remove(stob, do_unlink=True)
sign_me.name = "PackSign"
sign_me.materials.clear()
sign_me.materials.append(M["logo"])
so = new_obj("Packhouse_Sign", sign_me, (PW / 2 + 0.08, 4.5, 2.9), ph)
so.rotation_euler = (math.radians(90), 0, math.radians(90))


# Haqiqiy daraxt skani (Poly Haven tree_small_02), Cycles'da render qilingan impostor
tree_me = mesh_from("Tree", lambda bm: cross_into(bm, "tree_round", 0.74, extra=True), [M["foliage"]])
tree_pos = [(s * 6.5, y) for y in (-42, -50, -58, -66) for s in (-1, 1)]
tree_pos += [(x, 40) for x in range(-30, 31, 10)] + [(41, y) for y in (-20, 0, 20)] + [(-41, -26), (-42, 30)]
for n, (x, y) in enumerate(tree_pos):
    o = new_obj(f"Tree_{n}", tree_me, (x, y, 0))
    o.rotation_euler = (0, 0, random.uniform(0, 6.28))
    s = random.uniform(0.8, 1.3)
    t = 1250 + n * 3
    pop(o, "scale", t, t + 16, Vector((TINY,) * 3), Vector((s, s, s)), "BACK", "EASE_OUT")

# =====================================================================
# Tom ochiladi: panellar ko'tarilib "eriydi", tepadan ichki qism ko'rinadi, keyin qaytadi
# =====================================================================
LIFT = 8.0
for j in range(BAYS):
    for i in range(SPANS):
        o = bpy.data.objects[f"Roof_{i}_{j}"]
        base = o.location.copy()
        t1 = 1414 + j * 3 + i * 2
        t2 = 1620 + j * 3 + i * 2
        key(o, "location", t1, base)
        key(o, "location", t1 + 26, base + Vector((0, 0, LIFT)))
        key(o, "location", t2, base + Vector((0, 0, LIFT)))
        key(o, "location", t2 + 26, base)
        key(o, "scale", t1, Vector((1, 1, 1)))
        key(o, "scale", t1 + 26, Vector((TINY,) * 3))
        key(o, "scale", t2, Vector((TINY,) * 3))
        key(o, "scale", t2 + 26, Vector((1, 1, 1)))
        ease(o, "CUBIC", "EASE_IN_OUT")
for i in range(SPANS):
    o = bpy.data.objects[f"Vent_Flap_{i}"]
    base = o.location.copy()
    for f, lift, s in ((1410, 0, 1), (1440, LIFT, TINY), (1616, LIFT, TINY), (1646, 0, 1)):
        key(o, "location", f + i * 2, base + Vector((0, 0, lift)))
        key(o, "scale", f + i * 2, Vector((s, s, s)))
    ease(o, "CUBIC", "EASE_IN_OUT")

# O'lchov chiziqlari (40 m × 40 m) — tepadan ko'rinishda
def dim_line(length, along_x):
    def build(bm):
        sx, sy = (length, 0.24) if along_x else (0.24, length)
        box_into(bm, (sx, sy, 0.03), (0, 0, 0))
        for e in (-1, 1):
            c = (e * length / 2, 0, 0) if along_x else (0, e * length / 2, 0)
            box_into(bm, (0.24, 1.8, 0.03) if along_x else (1.8, 0.24, 0.03), c)
    return mesh_from("DimX" if along_x else "DimY", build, [M["dim"]])


dim_w = new_obj("Dim_W", dim_line(W, True), (0, Y0 - 3.2, 0.12))
dim_l = new_obj("Dim_L", dim_line(L, False), (X0 + W + 3, 0, 0.12))
for o, axis in ((dim_w, 0), (dim_l, 1)):
    s0 = Vector((1, 1, 1))
    s0[axis] = TINY
    key(o, "scale", 1486, s0)
    key(o, "scale", 1516, Vector((1, 1, 1)))
    key(o, "scale", 1628, Vector((1, 1, 1)))
    key(o, "scale", 1650, s0)
    ease(o, "CUBIC", "EASE_IN_OUT")
empty("Dim_Label_W", (0, Y0 - 6.2, 0.2))
empty("Dim_Label_L", (X0 + W + 6.8, 0, 0.2))
empty("Dim_Label_A", (0, 0, 1.0))

# =====================================================================
# Eshik ochiladi — 04-bob ichkariga kirish
# =====================================================================
for name, dx in (("Door_L", -1.45), ("Door_R", 1.45)):
    o = bpy.data.objects[name]
    base = o.location.copy()
    key(o, "location", 1760, base)
    key(o, "location", 1796, base + Vector((dx, 0, 0)))
    ease(o, "CUBIC", "EASE_IN_OUT")

apply_camera(cam, F_END)
ease(cam, "LINEAR", "AUTO")

scn.frame_set(F_END)
print("OK ch03 objects:", len(bpy.data.objects))
