# UZ GROW — 02 "Muhandislik kuchi": qoplama + ichki tizimlar (kadr 600..1200).
# Avval 01-bobni qayta quradi (bitta uzluksiz timeline), keyin ustiga qo'shadi:
#   exec(open(r"...\ch02_build.py", encoding="utf-8").read())
# Saytda X-ray rejimi va tizimlarning porlashi materiallar nomi orqali boshqariladi:
#   Cladding, Sys_Heat, Sys_Vent, Sys_Water, Sys_Auto
BLENDER_DIR = r"C:\Users\ghost\Desktop\uzgrow-3d-web site\blender"
exec(open(BLENDER_DIR + r"\ch01_build.py", encoding="utf-8").read())

F_END = 1200
scn.frame_end = F_END
G = GUTTER_H
ZB = GUTTER_H + 0.15          # fermalar asosi
SKIN = 0.07                   # qoplama fermadan qancha tepada

M.update({
    "clad": mat("Cladding", (0.82, 0.92, 0.96), rough=0.15),
    "heat": mat("Sys_Heat", (0.95, 0.38, 0.08), metal=0.6, rough=0.35, emit=(1.0, 0.32, 0.05), strength=1),
    "vent": mat("Sys_Vent", (0.75, 0.95, 0.82), metal=0.4, rough=0.35, emit=(0.45, 1.0, 0.6), strength=1),
    "water": mat("Sys_Water", (0.1, 0.45, 1.0), metal=0.3, rough=0.3, emit=(0.15, 0.55, 1.0), strength=1),
    "auto": mat("Sys_Auto", (0.1, 0.9, 1.0), metal=0.2, rough=0.3, emit=(0.1, 0.9, 1.0), strength=1),
    "unit": mat("Unit_Dark", (0.08, 0.09, 0.1), metal=0.5, rough=0.45),
    "tank": mat("Tank_White", (0.85, 0.87, 0.88), rough=0.4),
})
M["clad"].diffuse_color = (0.82, 0.92, 0.96, 0.3)


def _faces(verts, idx):
    for f in {f for v in verts for f in v.link_faces}:
        f.material_index = idx


def pipe_into(bm, p0, p1, r, seg=8, mat_index=0):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    q = d.to_track_quat("Z", "Y")
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d.length)
    bmesh.ops.transform(bm, verts=res["verts"], matrix=Matrix.Translation((p0 + p1) / 2) @ q.to_matrix().to_4x4())
    _faces(res["verts"], mat_index)


def ngon_into(bm, pts, mat_index=0):
    f = bm.faces.new([bm.verts.new(p) for p in pts])
    f.material_index = mat_index


def arch_pts(z0, seg=28, reverse=False):
    us = [-1 + 2 * k / seg for k in range(seg + 1)]
    if reverse:
        us = us[::-1]
    return [((u + 1) * SPAN_W / 2, z0 + arch_z(u) + SKIN) for u in us]


def lathe_y(bm, prof, seg=32, mat_index=0, smooth=True):
    """Y o'qi atrofida aylanma jism: prof = [(radius, y), ...] yopiq kontur (qobiq, halqa, disk)."""
    rings = [[bm.verts.new((r * math.cos(2 * math.pi * k / seg), y, r * math.sin(2 * math.pi * k / seg))) for k in range(seg)] for r, y in prof]
    faces = []
    for a, ra in enumerate(rings):
        rb = rings[(a + 1) % len(rings)]
        for k in range(seg):
            f = bm.faces.new((ra[k], ra[(k + 1) % seg], rb[(k + 1) % seg], rb[k]))
            f.material_index = mat_index
            f.smooth = smooth
            faces.append(f)
    bmesh.ops.recalc_face_normals(bm, faces=faces)


def wire_ring(bm, r, y, t=0.0045, seg=28, mat_index=0):
    lathe_y(bm, [(r + t, y), (r - t, y - t), (r - t, y + t)], seg, mat_index)


TINY = 0.001
RISE0 = Vector((1, 1, -TINY))  # yerdan o'sib chiqadiganlar: boshida yer ostida yashirin turadi


def pop(o, path, f0, f1, v0, v1, interp="CUBIC", easing="EASE_OUT"):
    key(o, path, f0, v0)
    key(o, path, f1, v1)
    # Yassilangan obyektning tagi yer sathi bilan z-fighting qilmasin: yashirin paytda yerga botib turadi
    base = o.location.copy()
    sunk = base - Vector((0, 0, 0.5))
    if path == "scale" and v0 == RISE0:
        key(o, "location", f0, sunk)
        key(o, "location", f0 + 1, base)
    elif path == "scale" and v1 == RISE0:
        key(o, "location", f1 - 1, base)
        key(o, "location", f1, sunk)
    ease(o, interp, easing)

# =====================================================================
# QOPLAMA
# =====================================================================
def roof_panel(bm):
    pts = arch_pts(0)
    vs = [(bm.verts.new((x, 0, z)), bm.verts.new((x, BAY_L, z))) for x, z in pts]
    for (a0, a1), (b0, b1) in zip(vs, vs[1:]):
        bm.faces.new((a0, b0, b1, a1))


roof_me = mesh_from("RoofPanel", roof_panel, [M["clad"]])
for j in range(BAYS):
    for i in range(SPANS):
        o = new_obj(f"Roof_{i}_{j}", roof_me, (X0 + i * SPAN_W, Y0 + j * BAY_L, ZB))
        t = 680 + j * 8 + i * 2
        pop(o, "scale", t, t + 22, Vector((1, TINY, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")

wall_me = mesh_from("WallPanel", lambda bm: ngon_into(bm, [(0, 0, 0), (0, BAY_L, 0), (0, BAY_L, ZB), (0, 0, ZB)]), [M["clad"]])
for side, x in ((0, X0 - 0.1), (1, X0 + W + 0.1)):
    for j in range(BAYS):
        o = new_obj(f"Wall_{side}_{j}", wall_me, (x, Y0 + j * BAY_L, 0))
        t = 640 + j * 5 + side * 2
        pop(o, "scale", t, t + 18, RISE0, Vector((1, 1, 1)))


def gable_outline(bottom=0.0):
    return [(0, 0, bottom), (SPAN_W, 0, bottom), (SPAN_W, 0, ZB)] + [(x, 0, z) for x, z in arch_pts(ZB, reverse=True)][1:-1] + [(0, 0, ZB)]


gable_me = mesh_from("GablePanel", lambda bm: ngon_into(bm, gable_outline()), [M["clad"]])
DOOR_W, DOOR_H = 3.0, 3.2
DOOR_SPAN = SPANS // 2
dx0 = SPAN_W / 2 - DOOR_W / 2


def gable_door(bm):
    ngon_into(bm, [(0, 0, 0), (dx0, 0, 0), (dx0, 0, DOOR_H), (0, 0, DOOR_H)])
    ngon_into(bm, [(dx0 + DOOR_W, 0, 0), (SPAN_W, 0, 0), (SPAN_W, 0, DOOR_H), (dx0 + DOOR_W, 0, DOOR_H)])
    ngon_into(bm, gable_outline(DOOR_H))


gable_door_me = mesh_from("GableDoorPanel", gable_door, [M["clad"]])
for end, y in ((0, Y0 - 0.1), (1, Y0 + L + 0.1)):
    for i in range(SPANS):
        door = end == 0 and i == DOOR_SPAN
        o = new_obj(f"Gable_{end}_{i}", gable_door_me if door else gable_me, (X0 + i * SPAN_W, y, 0))
        t = 650 + i * 6 + end * 3
        pop(o, "scale", t, t + 20, RISE0, Vector((1, 1, 1)))

# Eshik: rom va ikki surma tabaqa (04-bobda ochiladi)
door_x0 = X0 + DOOR_SPAN * SPAN_W + dx0


def door_frame(bm):
    beam_into(bm, (0, 0, 0), (0, 0, DOOR_H + 0.1), 0.14)
    beam_into(bm, (DOOR_W, 0, 0), (DOOR_W, 0, DOOR_H + 0.1), 0.14)
    beam_into(bm, (-0.07, 0, DOOR_H + 0.05), (DOOR_W + 0.07, 0, DOOR_H + 0.05), 0.14)


frame = new_obj("Door_Frame", mesh_from("DoorFrame", door_frame, [M["steel"]]), (door_x0, Y0 - 0.1, 0))
pop(frame, "scale", 662, 680, RISE0, Vector((1, 1, 1)))


def door_leaf(bm):
    ngon_into(bm, [(0.05, 0, 0.05), (DOOR_W / 2 - 0.05, 0, 0.05), (DOOR_W / 2 - 0.05, 0, DOOR_H - 0.05), (0.05, 0, DOOR_H - 0.05)], 0)
    for a, b in (((0.03, 0, 0.03), (DOOR_W / 2 - 0.03, 0, 0.03)), ((0.03, 0, DOOR_H - 0.03), (DOOR_W / 2 - 0.03, 0, DOOR_H - 0.03)),
                 ((0.03, 0, 0.03), (0.03, 0, DOOR_H - 0.03)), ((DOOR_W / 2 - 0.03, 0, 0.03), (DOOR_W / 2 - 0.03, 0, DOOR_H - 0.03)),
                 ((0.03, 0, DOOR_H / 2), (DOOR_W / 2 - 0.03, 0, DOOR_H / 2))):
        beam_into(bm, a, b, 0.06, mat_index=1)


leaf_me = mesh_from("DoorLeaf", door_leaf, [M["clad"], M["steel"]])
for n, x in enumerate((door_x0, door_x0 + DOOR_W / 2)):
    o = new_obj(("Door_L", "Door_R")[n], leaf_me, (x, Y0 - 0.22, 0))
    pop(o, "scale", 668, 686, RISE0, Vector((1, 1, 1)))

# =====================================================================
# 1) ISITISH — quvur-relsli tizim + qozonxona
# =====================================================================
ROWS = (1.4, 3.1, 4.9, 6.6)
Y_IN0, Y_IN1 = Y0 + 0.7, Y0 + L - 1.0


# Quvur-rels: yo'lak o'rtasida juft quvur (isitadi va hosil aravasi shu ustida yuradi), oxiri U-tirsak, tagida tayanchlar
AISLES = (2.25, 4.0, 5.75)
RAIL_GAUGE, RAIL_Z, RAIL_R = 0.55, 0.13, 0.026
HEAD_A, HEAD_B = -0.35, -0.12   # Y_IN0 ga nisbatan: kirish va qaytish kollektorlari


def heat_rail(bm):
    ln = Y_IN1 - Y_IN0
    g = RAIL_GAUGE / 2
    for ax in AISLES:
        tube_into(bm, (ax + g, HEAD_A, RAIL_Z), (ax + g, ln, RAIL_Z), RAIL_R, 8)
        tube_into(bm, (ax - g, HEAD_B, RAIL_Z), (ax - g, ln, RAIL_Z), RAIL_R, 8)
        prev = (ax + g, ln, RAIL_Z)
        for k in range(1, 7):
            a = math.pi * k / 6
            p = (ax + math.cos(a) * g, ln + math.sin(a) * g, RAIL_Z)
            tube_into(bm, prev, p, RAIL_R, 8)
            prev = p
        y = 1.2
        while y < ln:
            for s in (-g, g):                            # har quvur ostida alohida egar va taglik
                box_into(bm, (0.035, 0.035, RAIL_Z - RAIL_R), (ax + s, y, (RAIL_Z - RAIL_R) / 2))
                box_into(bm, (0.09, 0.05, 0.012), (ax + s, y, RAIL_Z - RAIL_R))
                box_into(bm, (0.1, 0.1, 0.008), (ax + s, y, 0.04))
            y += 2.5


rail_me = mesh_from("HeatRail", heat_rail, [M["heat"]])
for i in range(SPANS):
    o = new_obj(f"Heat_Rail_{i}", rail_me, (X0 + i * SPAN_W, Y_IN0, 0))
    t = 842 + i * 8
    pop(o, "scale", t, t + 30, Vector((1, TINY, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")

BOILER_X = X0 + W + 7.5
heat_main = new_obj("Heat_Main", mesh_from("HeatMain", lambda bm: (
    pipe_into(bm, (0, 0, RAIL_Z), (X0 + 0.2 - BOILER_X, 0, RAIL_Z), 0.06, 10),
    pipe_into(bm, (0, HEAD_B - HEAD_A, RAIL_Z), (X0 + 0.2 - BOILER_X, HEAD_B - HEAD_A, RAIL_Z), 0.06, 10)), [M["heat"]]),
    (BOILER_X - 1.72, Y_IN0 + HEAD_A, 0))
pop(heat_main, "scale", 826, 852, Vector((TINY, 1, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")


def boiler(bm):
    """Konteynerli qozonxona: qovurg'ali devorlar, eshik, jalyuzi, gaz quvuri, trubaning tortqilari."""
    box_into(bm, (3.4, 5.2, 0.2), (0, 0, 0.1), 3)                              # beton taglik
    cbox_into(bm, (3.2, 5.0, 2.7), (0, 0, 1.55), 0, 0.03)
    box_into(bm, (3.28, 5.08, 0.14), (0, 0, 2.2), 1)
    for k in range(17):                                                        # devor qovurg'alari
        y = -2.4 + k * 0.3
        for s in (-1, 1):
            box_into(bm, (0.04, 0.09, 2.5), (s * 1.61, y, 1.55), 0)
    box_into(bm, (0.05, 1.05, 2.05), (-1.63, 1.2, 1.25), 2)                    # eshik
    box_into(bm, (0.06, 0.04, 0.2), (-1.67, 0.8, 1.2), 1)
    for k in range(6):                                                         # jalyuzi
        box_into(bm, (0.07, 1.2, 0.05), (-1.64, -1.2, 1.0 + k * 0.12), 2)
    box_into(bm, (3.0, 4.8, 0.12), (0, 0, 2.96), 2)                            # tom
    for y in (-1.8, 0.0):                                                      # issiqlik almashtirgich qutilari tomda
        cbox_into(bm, (1.2, 1.2, 0.4), (-0.6, y, 3.2), 2, 0.03)
    pipe_into(bm, (0.8, -1.4, 2.9), (0.8, -1.4, 7.4), 0.28, 16, 2)
    pipe_into(bm, (0.8, -1.4, 6.6), (0.8, -1.4, 6.9), 0.33, 16, 1)
    pipe_into(bm, (0.8, -1.4, 3.6), (0.8, -1.4, 3.75), 0.32, 16, 2)
    for a in (0.5, 2.6, 4.7):                                                  # truba tortqilari
        pipe_into(bm, (0.8, -1.4, 6.5), (0.8 + math.cos(a) * 1.6, -1.4 + math.sin(a) * 1.6, 2.98), 0.008, 4, 2)
    # gaz va qaytish quvurlari
    for y in (HEAD_A - 1.6, HEAD_B - 1.6):
        pipe_into(bm, (-1.72, y, RAIL_Z), (-1.72, y, 0.6), 0.06, 10, 1)
        pipe_into(bm, (-1.72, y, 0.6), (-1.6, y, 0.6), 0.06, 10, 1)
        pipe_into(bm, (-1.64, y, 0.6), (-1.61, y, 0.6), 0.1, 12, 1)


boil = new_obj("Heat_Boiler", mesh_from("Boiler", boiler, [M["unit"], M["heat"], M["steel"], M["concrete"]]), (BOILER_X, Y_IN0 + 1.6, 0))
pop(boil, "scale", 812, 836, RISE0, Vector((1, 1, 1)), "BACK", "EASE_OUT")

# =====================================================================
# 2) VENTILYATSIYA — tom darchalari + aylanma ventilyatorlar
# =====================================================================
apex = arch_z(0) + SKIN + 0.06


def vent_flap(bm):
    us = [0.04 + (0.42 - 0.04) * k / 6 for k in range(7)]
    pts = [(u * SPAN_W / 2, arch_z(u) + SKIN + 0.06 - apex) for u in us]
    vs = [(bm.verts.new((x, 0, z)), bm.verts.new((x, L, z))) for x, z in pts]
    for (a0, a1), (b0, b1) in zip(vs, vs[1:]):
        f = bm.faces.new((a0, b0, b1, a1))
        f.material_index = 0
    x1, z1 = pts[-1]
    beam_into(bm, (x1, 0, z1), (x1, L, z1), 0.07, mat_index=1)
    beam_into(bm, (pts[0][0], 0, pts[0][1]), (pts[0][0], L, pts[0][1]), 0.06, mat_index=1)
    for y in range(0, int(L) + 1, int(BAY_L)):
        for a, b in zip(pts, pts[1:]):
            beam_into(bm, (a[0], y, a[1]), (b[0], y, b[1]), 0.05, mat_index=1)


flap_me = mesh_from("VentFlap", vent_flap, [M["clad"], M["vent"]])
for i in range(SPANS):
    o = new_obj(f"Vent_Flap_{i}", flap_me, (X0 + i * SPAN_W + SPAN_W / 2, Y0, ZB + apex))
    key(o, "scale", 792 + i * 3, Vector((TINY, TINY, TINY)))  # ko'ndalang ramkalar ham yashirin bo'lsin
    key(o, "scale", 812 + i * 3, Vector((1, 1, 1)))
    key(o, "rotation_euler", 905 + i * 5, (0, 0, 0))
    key(o, "rotation_euler", 940 + i * 5, (0, math.radians(-28), 0))
    ease(o, "CUBIC", "EASE_IN_OUT")


FAN_R = 0.44   # 36 dyuymli sirkulyatsiya ventilyatori (HAF)
FAN_Z = 3.75


def fan_housing(bm):
    """Prokat tunuka qobiq, ikki tomonda sim panjara, orqada elektr motor, fermaga osma."""
    lathe_y(bm, [(0.50, -0.16), (0.475, -0.135), (0.452, -0.10), (FAN_R, -0.05), (FAN_R, 0.12),
                 (FAN_R + 0.007, 0.125), (FAN_R + 0.007, -0.045), (0.46, -0.095), (0.482, -0.128), (0.507, -0.152)], 36, 0)
    wire_ring(bm, FAN_R + 0.008, 0.123, 0.006, 36, 0)                         # orqa qirra bukmasi
    # Sim panjaralar: oldi bir oz gumbazli
    for r in (0.11, 0.2, 0.29, 0.38, 0.47):
        wire_ring(bm, r, -0.215 + (r - 0.06) * 0.114, 0.0045, 28, 2)
    for r in (0.15, 0.24, 0.33, 0.42):
        wire_ring(bm, r, 0.185 - (r - 0.09) * 0.1, 0.0045, 28, 2)
    for k in range(8):
        a = 2 * math.pi * k / 8 + 0.39
        c, s = math.cos(a), math.sin(a)
        tube_into(bm, (0.06 * c, -0.215, 0.06 * s), (0.5 * c, -0.165, 0.5 * s), 0.004, 3, 2)
        tube_into(bm, (0.09 * c, 0.185, 0.09 * s), (FAN_R * c, 0.13, FAN_R * s), 0.004, 3, 2)
    # Motor: qovurg'ali korpus, qopqoq, klemma qutisi, val va to'rt tirgak
    tube_into(bm, (0, 0.05, 0), (0, 0.25, 0), 0.085, 18, 1)
    tube_into(bm, (0, 0.25, 0), (0, 0.285, 0), 0.06, 14, 1)
    tube_into(bm, (0, 0.0, 0), (0, 0.05, 0), 0.014, 8, 2)
    for y in (0.08, 0.115, 0.15, 0.185, 0.22):
        wire_ring(bm, 0.088, y, 0.005, 18, 1)
    box_into(bm, (0.075, 0.08, 0.05), (0, 0.15, 0.105), 1)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        c, s = math.cos(a), math.sin(a)
        beam_into(bm, (0.075 * c, 0.1, 0.075 * s), (FAN_R * c, 0.1, FAN_R * s), 0.012, 0.03, 2)
    # Osma: ikki sterjen ferma tortqisiga qisqich bilan, tok kabeli pastga egilib motorga tushadi
    top = ZB - FAN_Z
    for x in (-0.22, 0.22):
        tube_into(bm, (x, 0, 0.385), (x, 0, top), 0.008, 6, 2)
        box_into(bm, (0.06, 0.07, 0.02), (x, 0, 0.395), 2)
        box_into(bm, (0.05, 0.06, 0.075), (x, 0, top), 2)
    pts = [(0, 0.15, 0.13), (0.02, 0.17, 0.26), (0.06, 0.1, 0.34), (0.12, 0.05, 0.5), (0.13, 0.03, top)]
    for a, b in zip(pts, pts[1:]):
        tube_into(bm, a, b, 0.005, 4, 1)


def fan_blades(bm):
    """Besh buralgan parrak: ildizda tik, uchida yotiq, kesimi bukilgan (tekis plastina emas)."""
    lathe_y(bm, [(0.018, -0.082), (0.042, -0.07), (0.058, -0.045), (0.058, 0.05), (0.015, 0.05)], 16, 0)
    chords = (0.09, 0.135, 0.175, 0.185, 0.15)
    for b in range(5):
        rot = Matrix.Rotation(2 * math.pi * b / 5, 4, "Y")
        for side, dy in ((0, 0.0), (1, 0.003)):
            grid = []
            for k, ch in enumerate(chords):
                t = k / (len(chords) - 1)
                r = 0.05 + (FAN_R - 0.022 - 0.05) * t
                tw = math.radians(38 - 20 * t)
                row = []
                for s in (-0.5, 0.0, 0.5):
                    camber = 0.018 * (1 - (2 * s) ** 2)
                    tx = s * ch
                    row.append(bm.verts.new(rot @ Vector((r, tx * math.sin(tw) - camber + dy, tx * math.cos(tw) + 0.05 * t * t))))
                grid.append(row)
            for i in range(len(grid) - 1):
                for j in range(2):
                    q = (grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j])
                    f = bm.faces.new(q if side else q[::-1])
                    f.smooth = True


housing_me = mesh_from("FanHousing", fan_housing, [M["vent"], M["unit"], M["steel"]])
blades_me = mesh_from("FanBlades", fan_blades, [M["vent"]])
n = 0
for y in (-8.0, 12.0):                                 # ikkalasi ham ferma tortqisi ostida
    for i in range(SPANS):
        h = new_obj(f"Fan_{n}", housing_me, (X0 + (i + 0.5) * SPAN_W, y, FAN_Z))
        h.rotation_euler = (0, 0, math.pi * (i % 2))   # qo'shni prolyotlarda havo qarama-qarshi aylanadi
        new_obj(f"Fan_Blades_{n}", blades_me, (0, 0, 0), h)   # saytda vaqt bo'yicha aylanadi
        t = 900 + n * 3
        pop(h, "scale", t, t + 14, Vector((TINY,) * 3), Vector((1, 1, 1)), "BACK", "EASE_OUT")
        n += 1

# =====================================================================
# 3) SUG'ORISH — suv idishi, magistral, tomchilatib va tumanlatib sug'orish
# =====================================================================
TANK = Vector((X0 - 8, Y0 - 4, 0))


def tank(bm):
    tube_into(bm, (0, 0, 0), (0, 0, 0.18), 2.25, 32, 3)                          # beton taglik
    tube_into(bm, (0, 0, 0.18), (0, 0, 4.4), 2.0, 32, 0)                         # gofrir korpus
    r2 = bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=2.03, radius2=0.25, depth=0.5)
    bmesh.ops.translate(bm, verts=r2["verts"], vec=(0, 0, 4.65))
    for f in {f for v in r2["verts"] for f in v.link_faces}:
        f.smooth = True
    for z in (1.2, 2.3, 3.4):                                                    # halqalar
        tube_into(bm, (0, 0, z), (0, 0, z + 0.07), 2.03, 32, 2)
    tube_into(bm, (0, 0, 3.05), (0, 0, 3.3), 2.035, 32, 1)
    # zinapoya va ko'rsatkich quvuri
    for s in (-0.22, 0.22):
        tube_into(bm, (2.1, s, 0.2), (2.1, s, 5.0), 0.02, 6, 2)
    for k in range(16):
        tube_into(bm, (2.1, -0.22, 0.4 + k * 0.3), (2.1, 0.22, 0.4 + k * 0.3), 0.012, 5, 2)
    for k in range(5):
        a = -0.4 + k * 0.2
        tube_into(bm, (math.cos(a) * 2.05, math.sin(a) * 2.05, 4.35), (math.cos(a) * 2.05, math.sin(a) * 2.05, 4.9), 0.012, 5, 2)
    tube_into(bm, (-2.05, 0, 0.3), (-2.05, 0, 4.2), 0.03, 6, 1)
    main_dy = WATER_Y - TANK.y
    pipe_into(bm, (0, 2.0, 0.15), (0, main_dy, 0.15), 0.08, 8, 1)
    pipe_into(bm, (0, main_dy, 0.15), (2.0, main_dy, 0.15), 0.08, 8, 1)


WATER_Y = Y0 + 0.2   # magistral janubiy devor ichidan o'tadi
tk = new_obj("Water_Tank", mesh_from("Tank", tank, [M["tank"], M["water"], M["steel"], M["concrete"]]), TANK)
pop(tk, "scale", 985, 1006, RISE0, Vector((1, 1, 1)), "BACK", "EASE_OUT")

wm = new_obj("Water_Main", mesh_from("WaterMain", lambda bm: pipe_into(bm, (0, 0, 0.15), (W + 5.8, 0, 0.15), 0.08, 8), [M["water"]]),
             (X0 - 6, WATER_Y, 0))
pop(wm, "scale", 996, 1020, Vector((TINY, 1, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")


MIST_X = 3.0   # ferma va ip simlariga tegmaydigan joyda


def water_lines(bm):
    ln = Y_IN1 - Y_IN0
    for rx in ROWS:                                     # tomchilatish magistrali — mat yonida polda
        pipe_into(bm, (rx - 0.21, 0, 0.052), (rx - 0.21, ln, 0.052), 0.012, 6)
    pipe_into(bm, (MIST_X, 0, 4.05), (MIST_X, ln, 4.05), 0.014, 6)
    for k in range(1, int(ln / 2)):                     # tuman forsunkalari: tushirma quvur va xochsimon bosh
        y = k * 2.0
        pipe_into(bm, (MIST_X, y, 4.04), (MIST_X, y, 3.9), 0.005, 4)
        for a in range(4):
            c, s = math.cos(a * math.pi / 2), math.sin(a * math.pi / 2)
            pipe_into(bm, (MIST_X, y, 3.9), (MIST_X + c * 0.035, y + s * 0.035, 3.89), 0.004, 3)
    for j in range(1, BAYS):                            # fermaga simli osma
        y = Y0 + j * BAY_L - Y_IN0
        pipe_into(bm, (MIST_X, y, 4.05), (MIST_X, y, ZB), 0.003, 3)


lines_me = mesh_from("WaterLines", water_lines, [M["water"]])
for i in range(SPANS):
    o = new_obj(f"Water_Lines_{i}", lines_me, (X0 + i * SPAN_W, Y_IN0, 0))
    t = 1010 + i * 7
    pop(o, "scale", t, t + 28, Vector((1, TINY, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")

# =====================================================================
# 4) AVTOMATIKA — boshqaruv shkafi, sensorlar, ma'lumot tarmog'i, meteostansiya
# =====================================================================
CAB = Vector((door_x0 + DOOR_W + 1.1, Y0 + 0.45, 0))
NET_Z = 4.3


def cabinet(bm):
    """Boshqaruv shkafi: plintus, ikki eshik, tutqichlar, sensorli panel, indikatorlar, panjara, kabel qutisi."""
    box_into(bm, (1.14, 0.49, 0.1), (0, 0, 0.05), 2)
    cbox_into(bm, (1.1, 0.45, 1.8), (0, 0, 1.0), 0, 0.012)
    for s in (-1, 1):
        box_into(bm, (0.525, 0.012, 1.72), (s * 0.27, -0.228, 1.0), 0)
        box_into(bm, (0.025, 0.035, 0.16), (s * 0.03, -0.245, 1.05), 2)
        for z in (0.35, 1.65):
            box_into(bm, (0.03, 0.03, 0.08), (s * 0.545, -0.225, z), 2)
    box_into(bm, (0.38, 0.008, 0.28), (-0.27, -0.236, 1.42), 0)
    box_into(bm, (0.34, 0.008, 0.24), (-0.27, -0.241, 1.42), 3)
    for k in range(3):
        tube_into(bm, (0.14 + k * 0.09, -0.232, 1.48), (0.14 + k * 0.09, -0.246, 1.48), 0.018, 10, 1)
        tube_into(bm, (0.14 + k * 0.09, -0.232, 1.36), (0.14 + k * 0.09, -0.244, 1.36), 0.022, 10, 2)
    for k in range(6):
        box_into(bm, (0.32, 0.012, 0.012), (0.27, -0.236, 0.3 + k * 0.035), 2)
    box_into(bm, (0.14, 0.14, 0.12), (0, 0, 1.96), 2)


cab = new_obj("Auto_Cabinet", mesh_from("Cabinet", cabinet, [M["unit"], M["auto"], M["steel"], M["glass"]]), CAB)
pop(cab, "scale", 1062, 1076, RISE0, Vector((1, 1, 1)), "BACK", "EASE_OUT")

riser = new_obj("Auto_Riser", mesh_from("AutoRiser", lambda bm: pipe_into(bm, (0, 0, 0), (0, 0, NET_Z - 1.9), 0.02, 8), [M["auto"]]),
                (CAB.x, CAB.y, 1.9))
pop(riser, "scale", 1072, 1083, RISE0, Vector((1, 1, 1)))

bus = new_obj("Auto_Bus", mesh_from("AutoBus", lambda bm: pipe_into(bm, (X0 + 0.2 - CAB.x, 0, 0), (X0 + W - 0.2 - CAB.x, 0, 0), 0.016, 6), [M["auto"]]),
              (CAB.x, CAB.y, NET_Z))
pop(bus, "scale", 1080, 1100, Vector((TINY, 1, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")

line_me = mesh_from("AutoLine", lambda bm: pipe_into(bm, (0, 0, 0), (0, Y_IN1 - CAB.y, 0), 0.012, 6), [M["auto"]])
for i in range(SPANS + 1):
    x = X0 + i * SPAN_W + (0.35 if i < SPANS else -0.35)
    o = new_obj(f"Auto_Line_{i}", line_me, (x, CAB.y, NET_Z))
    t = 1094 + i * 4
    pop(o, "scale", t, t + 22, Vector((1, TINY, 1)), Vector((1, 1, 1)), "CUBIC", "EASE_IN_OUT")


M["sensor"] = mat("Sensor_White", (0.86, 0.87, 0.85), rough=0.45)
SENSOR_Z = 2.0


def sensor(bm):
    """Iqlim o'lchagich: ekin ustida fermadan osilgan oq quti, quyosh to'sig'i (disklar), havo so'rish quvuri."""
    z = SENSOR_Z
    cbox_into(bm, (0.24, 0.13, 0.12), (0, 0, z), 0, 0.012)
    tube_into(bm, (0.12, 0, z), (0.21, 0, z), 0.032, 14, 0)
    tube_into(bm, (0.205, 0, z), (0.215, 0, z), 0.038, 14, 1)
    tube_into(bm, (-0.08, 0, z - 0.2), (-0.08, 0, z - 0.07), 0.008, 6, 2)
    for k in range(5):                                         # radiatsion to'siq
        h = z - 0.09 - k * 0.026
        tube_into(bm, (-0.08, 0, h), (-0.08, 0, h + 0.004), 0.07 - k * 0.003, 16, 0)
    box_into(bm, (0.08, 0.005, 0.03), (0.04, -0.067, z + 0.02), 1)
    box_into(bm, (0.18, 0.02, 0.012), (0, 0, z + 0.067), 2)
    tube_into(bm, (0, 0, z + 0.065), (0, 0, ZB), 0.003, 3, 2)
    tube_into(bm, (0.07, 0, z + 0.06), (0.07, 0, ZB), 0.004, 4, 1)


sensor_me = mesh_from("Sensor", sensor, [M["sensor"], M["auto"], M["steel"]])
# Yo'laklar ustida, ferma tortqilari ostida: o'simlik qatorlariga va kamera yo'liga tegmaydi
sensor_pos = [(2, 2.25, -16), (0, 2.25, -12), (1, 4.0, -4), (3, 4.0, -12), (2, 2.25, 8), (3, 2.25, 4), (1, 2.25, 12), (4, 2.25, -4)]
for n, (i, ax, y) in enumerate(sensor_pos):
    o = new_obj(f"Auto_Sensor_{n}", sensor_me, (X0 + i * SPAN_W + ax, y, 0))
    t = 1100 + n * 4
    pop(o, "scale", t, t + 12, Vector((TINY,) * 3), Vector((1, 1, 1)), "BACK", "EASE_OUT")


def weather(bm):
    beam_into(bm, (0, 0, 0), (0, 0, 7.5), 0.1, mat_index=0)
    beam_into(bm, (-0.8, 0, 7.2), (0.8, 0, 7.2), 0.06, mat_index=0)
    box_into(bm, (0.35, 0.25, 0.45), (-0.8, 0, 6.9), 1)
    pipe_into(bm, (0.8, 0, 7.2), (0.8, 0, 7.6), 0.03, 6, 0)
    for k in range(3):
        a = 2 * math.pi * k / 3
        box_into(bm, (0.12, 0.12, 0.08), (0.8 + 0.25 * math.cos(a), 0.25 * math.sin(a), 7.6), 1)


ws = new_obj("Auto_Weather", mesh_from("WeatherStation", weather, [M["steel"], M["auto"]]), (X0 + W + 4, Y0 - 5, 0))
pop(ws, "scale", 1064, 1086, RISE0, Vector((1, 1, 1)), "BACK", "EASE_OUT")

# =====================================================================
# Qurilish yakunlanadi: kran chiqib ketadi, material to'plami tugaydi
# =====================================================================
crane = bpy.data.objects["Crane"]
key(crane, "location", 612, crane.location.copy())
key(crane, "location", 735, crane.location + Vector((0, 95, 0)))
ease(crane, "SINE", "EASE_IN_OUT")

pile_o = bpy.data.objects["BeamPile"]
pop(pile_o, "scale", 640, 700, Vector((1, 1, 1)), RISE0, "SINE", "EASE_IN_OUT")

# Kamera — 01 va 02 bitta yo'l
apply_camera(cam, F_END)
ease(cam, "LINEAR", "AUTO")

scn.frame_set(F_END)
print("OK ch02 objects:", len(bpy.data.objects))
