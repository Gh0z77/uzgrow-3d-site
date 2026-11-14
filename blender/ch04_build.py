# UZ GROW — 04 "Issiqxona ichiga sayohat": pol, substrat, o'simlik shablonlari (kadr 1800..2400).
# Avval 01–03 ni qayta quradi (bitta uzluksiz timeline), keyin ustiga qo'shadi:
#   exec(open(r"...\ch04_build.py", encoding="utf-8").read())
#
# O'simliklar bu yerda faqat SHABLON sifatida yasaladi (PlantTpl_*). Saytda ular ~1000 nusxaga
# GPU instancing bilan ko'paytiriladi va o'sishni shader boshqaradi — har birini Blender obyekti
# qilish faylni ham, chizish chaqiruvlarini ham keskin oshirib yuborardi.
# Joylashuv parametrlari web/src/scene/plants.ts dagi PLANT_LAYOUT bilan bir xil bo'lishi kerak.
BLENDER_DIR = r"C:\Users\ghost\Desktop\uzgrow-3d-web site\blender"
exec(open(BLENDER_DIR + r"\ch03_build.py", encoding="utf-8").read())

F_END = 2400
scn.frame_end = F_END

M.update({
    "floor": mat("Floor_Gravel", (0.5, 0.49, 0.46), rough=0.95),
    "bag": mat("Slab_Bag", (0.92, 0.93, 0.92), rough=0.5),
    "coir": mat("Coir", (0.24, 0.15, 0.08), rough=1.0),
    "leaf": mat("Plant_Leaf", (0.12, 0.36, 0.09), rough=0.6),
    "flower": mat("Plant_Flower", (1.0, 0.82, 0.1), rough=0.5, emit=(1.0, 0.8, 0.1), strength=0.3),
    "fruit": mat("Plant_Fruit", (0.25, 0.5, 0.12), rough=0.3),
})

# =====================================================================
# Pol: devordan devorgacha mayda sheben, substrat qoplari, tomchilatish naychalari
# =====================================================================
ROW_LEN = Y_IN1 - Y_IN0
FLOOR_TOP = 0.035
floor_me = mesh_from("FloorGravel", lambda bm: box_into(bm, (W + 0.1, L + 0.1, 0.03), (0, (L + 0.1) / 2, FLOOR_TOP - 0.015)), [M["floor"]])
floor_o = new_obj("Floor_Gravel", floor_me, (0, Y0 - 0.05, 0))
pop(floor_o, "scale", 1862, 1904, Vector((1, TINY, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")


SLAB_W, SLAB_H = 0.3, 0.12
BAG_L = 1.8   # har qopda ikki o'simlik


def slabs(bm):
    for rx in ROWS:
        y = -0.45
        while y < ROW_LEN - 0.1:
            cbox_into(bm, (SLAB_W, BAG_L - 0.05, SLAB_H), (rx, y + BAG_L / 2, SLAB_H / 2), 0, 0.014)
            y += BAG_L
        y = 0.0
        while y < ROW_LEN:                               # ekish teshigi va tomchilatish naychasi
            h = SLAB_H + 0.002
            ngon_into(bm, [(rx - 0.065, y - 0.065, h), (rx + 0.065, y - 0.065, h), (rx + 0.065, y + 0.065, h), (rx - 0.065, y + 0.065, h)], 1)
            tube_into(bm, (rx - 0.21, y + 0.1, 0.055), (rx - 0.155, y + 0.1, h + 0.005), 0.0025, 3, 2)   # qop ustiga yotib boradi
            tube_into(bm, (rx - 0.155, y + 0.1, h + 0.005), (rx - 0.05, y + 0.05, h + 0.005), 0.0025, 3, 2)
            tube_into(bm, (rx - 0.05, y + 0.05, h + 0.022), (rx - 0.05, y + 0.05, h - 0.002), 0.004, 4, 2)  # tomchilatish qoziqchasi
            y += 0.9


slab_me = mesh_from("SlabRows", slabs, [M["bag"], M["coir"], M["water"]])
for i in range(SPANS):
    o = new_obj(f"Slabs_{i}", slab_me, (X0 + i * SPAN_W, Y_IN0, 0))
    t = 1888 + i * 8
    pop(o, "scale", t, t + 36, Vector((1, TINY, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")

# Hosil aravasi: quvur-relslar ustida, yo'lak oxirida turadi
M["crate"] = mat("Crate_Green", (0.08, 0.33, 0.15), rough=0.55)
M["tomato"] = mat("Tomato_Red", (0.6, 0.05, 0.03), rough=0.32)
CRATE_RND = random.Random(5)   # umumiy random ketma-ketligini (atrofdagi daraxtlar joyini) o'zgartirmaydi


def crate(bm, cx, cy, z, filled=False):
    """Teshikli plastik yashik 60×40×22 sm: to'liq devor emas, tasmalar orasidan ko'rinib turadi."""
    a, b, h = 0.3, 0.2, 0.22
    box_into(bm, (a * 2, b * 2, 0.012), (cx, cy, z + 0.006), 2)
    box_into(bm, (a * 2 + 0.012, b * 2 + 0.012, 0.022), (cx, cy, z + h - 0.011), 2)
    for k in range(3):
        zz = z + 0.045 + k * 0.05
        for s in (-1, 1):
            box_into(bm, (a * 2, 0.008, 0.028), (cx, cy + s * b, zz), 2)
            box_into(bm, (0.008, b * 2, 0.028), (cx + s * a, cy, zz), 2)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box_into(bm, (0.02, 0.02, h), (cx + sx * a, cy + sy * b, z + h / 2), 2)
    if filled:
        for px in range(-2, 3):
            for py in range(-1, 2):
                res = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=0.05)
                p = (cx + px * 0.105 + CRATE_RND.uniform(-0.01, 0.01), cy + py * 0.115 + CRATE_RND.uniform(-0.01, 0.01), z + h - 0.035 + CRATE_RND.uniform(-0.012, 0.012))
                bmesh.ops.translate(bm, verts=res["verts"], vec=p)
                for f in {f for v in res["verts"] for f in v.link_faces}:
                    f.material_index = 3
                    f.smooth = True


def trolley(bm):
    g = RAIL_GAUGE / 2
    wz = RAIL_Z + RAIL_R + 0.048
    for sy in (-0.55, 0.55):
        tube_into(bm, (-g - 0.02, sy, wz), (g + 0.02, sy, wz), 0.012, 8, 0)
        for s in (-1, 1):
            tube_into(bm, (s * g - 0.016, sy, wz), (s * g + 0.016, sy, wz), 0.048, 14, 1)
            for t in (-0.022, 0.022):
                tube_into(bm, (s * g + t - 0.003, sy, wz), (s * g + t + 0.003, sy, wz), 0.06, 14, 1)
    for s in (-1, 1):
        box_into(bm, (0.05, 1.4, 0.05), (s * 0.29, 0, 0.3), 0)
        for sy in (-0.55, 0.55):
            box_into(bm, (0.04, 0.04, 0.1), (s * 0.29, sy, wz + 0.04), 0)
    box_into(bm, (0.64, 1.4, 0.016), (0, 0, 0.333), 1)
    for s in (-1, 1):
        tube_into(bm, (s * 0.29, -0.68, 0.3), (s * 0.29, -0.68, 1.08), 0.016, 8, 0)
    tube_into(bm, (-0.3, -0.68, 1.08), (0.3, -0.68, 1.08), 0.016, 8, 0)
    tube_into(bm, (-0.29, -0.68, 0.7), (0.29, -0.68, 0.7), 0.012, 6, 0)
    for cy in (-0.32, 0.32):
        for lv in range(3):
            crate(bm, 0, cy, 0.342 + lv * 0.222, filled=lv == 2)


trolley_me = mesh_from("HarvestTrolley", trolley, [M["steel"], M["dark"], M["crate"], M["tomato"]])
for n, i in enumerate((2, 3)):
    o = new_obj(f"Trolley_{n}", trolley_me, (X0 + i * SPAN_W + AISLES[2], 14.0, 0))
    pop(o, "scale", 2110 + n * 6, 2130 + n * 6, RISE0, Vector((1, 1, 1)), "BACK", "EASE_OUT")

# =====================================================================
# Pomidor o'simligi shablonlari (balandligi 2.2 m, "high-wire" usuli)
# =====================================================================
PLANT_H = 2.2
GOLDEN = math.radians(137.5)


def leaf_card(bm, uvl, base, ang, length, droop):
    """Murakkab barg: tomir bo'ylab bukilgan karta (3×2 kvadrat). Rasm tomato_leaf.webp — haqiqiy barg skanidan
    (Poly Haven), shuning uchun tishli qirralar geometriyada emas, teksturada."""
    d = Vector((math.cos(ang), math.sin(ang), 0))
    side = Vector((-d.y, d.x, 0))
    b = Vector(base)
    grid = []
    for ti, t in enumerate((0.0, 0.34, 0.68, 1.0)):
        row = []
        axis = b + d * (length * t) + Vector((0, 0, 0.12 * length * t - droop * t * t))
        for col in (-1, 0, 1):
            p = axis + side * (col * 0.52 * length) + Vector((0, 0, abs(col) * 0.09 * length * (0.4 + t)))
            row.append(bm.verts.new(p))
        grid.append(row)
    for i in range(3):
        for j in range(2):
            f = bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
            f.smooth = True
            vs = (0.0, 0.34, 0.68, 1.0)
            for l, (cu, cv) in zip(f.loops, ((j, i), (j + 1, i), (j + 1, i + 1), (j, i + 1))):
                l[uvl].uv = (cu * 0.5, 0.02 + vs[cv] * 0.97)


def plant_leaves(bm):
    uvl = bm.loops.layers.uv.verify()
    # Poya: bo'g'inma-bo'g'in zigzag (tekis tayoq emas), yuqoriga ingichkalashadi
    pts = [Vector((math.sin(k * 2.4) * 0.016 * min(1, k / 2), math.cos(k * 1.7) * 0.016 * min(1, k / 2), k * PLANT_H / 8)) for k in range(9)]
    start = len(bm.faces)
    for k, (p, q) in enumerate(zip(pts, pts[1:])):
        tube_into(bm, p, q, 0.0125 - 0.0008 * k, 5)
    bm.faces.ensure_lookup_table()
    for f in bm.faces[start:]:
        for l in f.loops:
            l[uvl].uv = (0.5, 0.4)                                           # poya rangi: barg tomiri piksellari
    n = 18
    for k in range(n):
        h = 0.14 + k * (PLANT_H - 0.16) / n
        top = k / (n - 1)
        a = k * GOLDEN + random.uniform(-0.25, 0.25)
        leaf_card(bm, uvl, (0, 0, h), a, (0.68 - 0.33 * top) * random.uniform(0.9, 1.08), (0.34 - 0.24 * top) * random.uniform(0.85, 1.15))
    for k in range(3):                                                       # uchidagi yosh barglar yuqoriga qaragan
        leaf_card(bm, uvl, (0, 0, PLANT_H - 0.06), k * 2.1 + 0.4, 0.26, 0.0)


def fruit_cluster(bm):
    """Pomidor shingillari: bir oz yassi, qovurg'ali meva va yashil kosacha (UV.x=1: shader pishish rangini bermaydi)."""
    uvl = bm.loops.layers.uv.verify()
    for t, (h, cnt) in enumerate(((0.55, 3), (0.85, 4), (1.15, 3))):
        a0 = t * 2.1
        c = Vector((math.cos(a0) * 0.17, math.sin(a0) * 0.17, h))
        for k in range(cnt):
            a = a0 + (k - cnt / 2) * 0.55
            p = c + Vector((math.cos(a) * 0.055, math.sin(a) * 0.055, -0.04 * (k % 2)))
            R = 0.05 * random.uniform(0.92, 1.08)
            res = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=R)
            for v in res["verts"]:
                ang = math.atan2(v.co.y, v.co.x)
                rib = 1 + 0.035 * math.cos(ang * 6) * max(0.0, v.co.z / R)
                v.co = Vector((v.co.x * rib, v.co.y * rib, v.co.z * 0.86)) + p
            for f in {f for v in res["verts"] for f in v.link_faces}:
                f.smooth = True
                for l in f.loops:
                    l[uvl].uv = (0.0, 0.0)
            # kosacha: 5 uchli yulduz meva tepasida
            top = p + Vector((0, 0, R * 0.87))
            ctr = bm.verts.new(top + Vector((0, 0, 0.004)))
            for s in range(5):
                b0 = 2 * math.pi * s / 5
                v0 = bm.verts.new(top + Vector((math.cos(b0 - 0.3) * 0.009, math.sin(b0 - 0.3) * 0.009, 0.002)))
                v1 = bm.verts.new(top + Vector((math.cos(b0) * 0.03, math.sin(b0) * 0.03, -0.006)))
                v2 = bm.verts.new(top + Vector((math.cos(b0 + 0.3) * 0.009, math.sin(b0 + 0.3) * 0.009, 0.002)))
                f = bm.faces.new((ctr, v0, v1, v2))
                f.smooth = True
                for l in f.loops:
                    l[uvl].uv = (1.0, 0.0)


def clusters(heights, count, radius, seg, rings, offset):
    def build(bm):
        for t, h in enumerate(heights):
            a0 = t * 2.1
            c = Vector((math.cos(a0) * offset, math.sin(a0) * offset, h))
            for k in range(count[t]):
                a = a0 + (k - count[t] / 2) * 0.55
                p = c + Vector((math.cos(a) * 0.05, math.sin(a) * 0.05, -0.035 * (k % 2)))
                r = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=radius)
                bmesh.ops.translate(bm, verts=r["verts"], vec=p)
                for f in {f for v in r["verts"] for f in v.link_faces}:
                    f.smooth = True
    return build


tpl = [
    ("PlantTpl_Leaves", plant_leaves, M["leaf"]),
    ("PlantTpl_Flower", clusters((1.25, 1.6, 1.95), (4, 4, 3), 0.022, 5, 3, 0.11), M["flower"]),
    ("PlantTpl_Fruit", fruit_cluster, M["fruit"]),
]
for k, (name, build, m) in enumerate(tpl):
    me = mesh_from(name, build, [m])
    new_obj(name, me, (k * 1.0, 0, -30))   # yer ostida yashirin turadi; sayt geometriyasini oladi

# "High-wire" usuli: har qator ustida simli yo'naltirgich, har o'simlikka ip tushadi
M["string"] = mat("Plant_String", (0.42, 0.4, 0.33), rough=0.9)


def strings(bm):
    ln = ROW_LEN
    for rx in ROWS:
        box_into(bm, (0.012, ln, 0.012), (rx, ln / 2, 3.85), 1)
        y = 0.45
        while y < ln:
            box_into(bm, (0.003, 0.003, 3.75), (rx, y, 1.97), 0)
            y += 0.9


str_me = mesh_from("PlantStrings", strings, [M["string"], M["steel"]])
for i in range(SPANS):
    o = new_obj(f"Plant_Strings_{i}", str_me, (X0 + i * SPAN_W, Y_IN0, 0))
    t = 1900 + i * 8
    pop(o, "scale", t, t + 36, Vector((1, 1, TINY)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")

apply_camera(cam, F_END)
ease(cam, "LINEAR", "AUTO")

scn.frame_set(F_END)
print("OK ch04 objects:", len(bpy.data.objects))
