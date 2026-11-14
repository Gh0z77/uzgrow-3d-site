# UZ GROW — detallashtirilgan texnika va odamlar: buldozer, avtokran, yoritish minorasi, ishchilar.
# ch01_build.py ichidan exec qilinadi (M, mat, box_into, beam_into, tube_into, mesh_from o'sha yerdan keladi).
# O'lchamlar haqiqiy texnikadan olingan: buldozer ~D6 sinfi, kran ~50 t yo'lsiz avtokran. Teksturalar
# (bo'yoq, po'lat) saytda material nomi bo'yicha qo'yiladi, shuning uchun bu yerda faqat geometriya.
M.update({
    "chrome": mat("Chrome", (0.8, 0.81, 0.83), metal=1.0, rough=0.16),
    "rubber": mat("Rubber", (0.018, 0.018, 0.02), rough=0.92),
    "track": mat("Track_Steel", (0.07, 0.065, 0.06), metal=0.75, rough=0.62),
    "decal": mat("Decal_Dark", (0.02, 0.022, 0.025), rough=0.5),
    "decal_w": mat("Decal_White", (0.9, 0.9, 0.88), rough=0.5),
    "beacon": mat("Beacon", (1.0, 0.45, 0.05), emit=(1.0, 0.4, 0.03), strength=3),
    "red": mat("Tail_Red", (0.6, 0.02, 0.02), emit=(0.9, 0.02, 0.02), strength=1.2),
    "reflect": mat("Reflect", (0.82, 0.84, 0.8), rough=0.3, emit=(0.8, 0.85, 0.75), strength=0.25),
    "w_skin": mat("Worker_Skin", (0.5, 0.31, 0.21), rough=0.6),
    "w_pants": mat("Worker_Pants", (0.05, 0.075, 0.13), rough=0.85),
    "w_shirt": mat("Worker_Shirt", (0.14, 0.17, 0.22), rough=0.85),
    "w_boot": mat("Worker_Boot", (0.05, 0.035, 0.022), rough=0.55),
    "wood": mat("Wood_Handle", (0.42, 0.29, 0.16), rough=0.7),
})


# ---------- umumiy geometriya yordamchilari ----------
def _set_mat(verts, idx, smooth=False):
    for f in {f for v in verts for f in v.link_faces}:
        f.material_index = idx
        f.smooth = smooth


def cbox_into(bm, size, center, mat_index=0, bevel=0.03):
    """Qirralari yumaloqlangan quti: tekis qirrasiz haqiqiy kuzov tunukasi kabi yorug'likni ushlaydi."""
    r = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.transform(bm, verts=r["verts"], matrix=Matrix.Translation(center) @ Matrix.Diagonal((*size, 1)))
    edges = list({e for v in r["verts"] for e in v.link_edges})
    res = bmesh.ops.bevel(bm, geom=edges + r["verts"], offset=bevel, offset_type="OFFSET", segments=1, profile=0.5, affect="EDGES")
    faces = set(res.get("faces", []))
    for v in res.get("verts", []):
        faces.update(v.link_faces)
    for f in faces:
        f.material_index = mat_index
    return faces


def prism_into(bm, profile, y0, y1, mat_index=0, smooth=False):
    """XZ tekisligidagi ko'pburchak profilni Y bo'ylab cho'zadi (kapot, kabina, otval)."""
    a = [bm.verts.new((x, y0, z)) for x, z in profile]
    b = [bm.verts.new((x, y1, z)) for x, z in profile]
    n = len(profile)
    faces = [bm.faces.new(a[::-1]), bm.faces.new(b)]
    for i in range(n):
        j = (i + 1) % n
        faces.append(bm.faces.new((a[i], a[j], b[j], b[i])))
    for f in faces:
        f.material_index = mat_index
    for f in faces[2:]:
        f.smooth = smooth
    bmesh.ops.recalc_face_normals(bm, faces=faces)


def ribbon_into(bm, profile, y0, y1, thick, mat_index=0):
    """Ochiq egri profilga qalinlik beradi (otval, qanot)."""
    outer = list(profile)
    inner = []
    for i, (x, z) in enumerate(profile):
        x0, z0 = profile[max(0, i - 1)]
        x1, z1 = profile[min(len(profile) - 1, i + 1)]
        tx, tz = x1 - x0, z1 - z0
        ln = math.hypot(tx, tz) or 1
        inner.append((x - tz / ln * thick, z + tx / ln * thick))
    prism_into(bm, outer + inner[::-1], y0, y1, mat_index)


def ycyl_into(bm, x, z, y0, y1, r, seg=12, mat_index=0):
    tube_into(bm, (x, y0, z), (x, y1, z), r, seg, mat_index)


def xbeam(bm, size, center, ang, mat_index=0):
    """Y o'qi atrofida burilgan quti (gusenitsa bo'g'ini)."""
    r = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.transform(bm, verts=r["verts"], matrix=Matrix.Translation(center) @ Matrix.Rotation(ang, 4, "Y") @ Matrix.Diagonal((*size, 1)))
    _set_mat(r["verts"], mat_index)


def loft_into(bm, rings, seg=8, mat_index=0, side=None):
    """Elliptik halqalar bo'ylab silliq tana: qo'l, oyoq, gavda. rings: (markaz, rx, ry)."""
    pts = [Vector(c) for c, _, _ in rings]
    loops = []
    for i, (c, rx, ry) in enumerate(rings):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        s = (side or Vector((1, 0, 0)))
        s = (s - t * s.dot(t))
        if s.length < 1e-4:
            s = Vector((0, 1, 0)) - t * t.y
        s.normalize()
        u = t.cross(s).normalized()
        loops.append([bm.verts.new(Vector(c) + s * (rx * math.cos(2 * math.pi * k / seg)) + u * (ry * math.sin(2 * math.pi * k / seg)))
                      for k in range(seg)])
    faces = []
    for a, b in zip(loops, loops[1:]):
        for k in range(seg):
            n = (k + 1) % seg
            faces.append(bm.faces.new((a[k], a[n], b[n], b[k])))
    for f in faces:
        f.smooth = True
    faces.append(bm.faces.new(loops[0][::-1]))
    faces.append(bm.faces.new(loops[-1]))
    for f in faces:
        f.material_index = mat_index
    bmesh.ops.recalc_face_normals(bm, faces=faces)


def hydraulic(bm, p0, p1, r, barrel_mat=1, rod_mat=4, split=0.55, seg=10):
    """Gidrotsilindr: qalin korpus + yaltiroq shtok + uchlaridagi quloqlar."""
    p0, p1 = Vector(p0), Vector(p1)
    m = p0.lerp(p1, split)
    tube_into(bm, p0, m, r, seg, barrel_mat)
    tube_into(bm, m, p1, r * 0.55, seg, rod_mat)
    d = (p1 - p0).normalized()
    tube_into(bm, m - d * 0.03, m + d * 0.03, r * 1.18, seg, barrel_mat)


def text_me(name, body, size, material, extrude=0.008):
    cu = bpy.data.curves.new(name + "_c", "FONT")
    cu.body = body
    cu.size = size
    cu.extrude = extrude
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    tmp = bpy.data.objects.new(name + "_t", cu)
    scn.collection.objects.link(tmp)
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(cu)
    me.name = name
    me.materials.clear()
    me.materials.append(material)
    return me


# =====================================================================
# BULDOZER (old tomoni +X, gusenitsa tagi z=0)
# mats: 0 sariq, 1 to'q, 2 oyna, 3 fara, 4 xrom, 5 gusenitsa po'lati, 6 mayoq, 7 orqa chiroq
# =====================================================================
DOZER_MATS = ["yellow", "dark", "glass", "headlight", "chrome", "track", "beacon", "red"]


def track_side(bm, cy):
    """Bitta gusenitsa: 44 ta boshmoq (boshmoq + tish), yetaklovchi yulduzcha, yo'naltiruvchi g'ildirak, katoklar."""
    R, XF, XR = 0.43, 1.78, -1.72
    Tw = 0.56
    S = XF - XR
    P = 2 * S + 2 * math.pi * R
    N = 44
    for k in range(N):
        s = P * k / N
        if s < S:                                                   # pastki to'g'ri qism: orqadan oldinga
            x, z, ang = XR + s, 0.035, 0.0
        elif s < S + math.pi * R:                                   # oldingi aylana
            a = (s - S) / R
            x, z, ang = XF + math.sin(a) * (R - 0.0), R - math.cos(a) * (R - 0.035), -a
        elif s < 2 * S + math.pi * R:                               # yuqori to'g'ri qism
            x, z, ang = XF - (s - S - math.pi * R), 2 * R - 0.035, -math.pi
        else:                                                       # orqa aylana
            a = (s - 2 * S - math.pi * R) / R
            x, z, ang = XR - math.sin(a) * R, R + math.cos(a) * (R - 0.035), -math.pi - a
        xbeam(bm, (0.2, Tw, 0.028), (x, cy, z), ang, 5)
        # tish boshmoqdan tashqariga qaraydi
        ox, oz = math.sin(ang) * -0.035, -math.cos(ang) * 0.035
        xbeam(bm, (0.035, Tw, 0.05), (x + ox, cy, z + oz), ang, 5)
    box_into(bm, (S - 0.1, 0.36, 0.42), ((XF + XR) / 2, cy, R), 1)   # rama
    for x in (-1.15, -0.65, -0.15, 0.35, 0.85, 1.3):                 # tayanch katoklar
        ycyl_into(bm, x, 0.19, cy - 0.2, cy + 0.2, 0.125, 12, 5)
    for x in (-0.6, 0.65):                                           # yuqori katoklar
        ycyl_into(bm, x, 0.78, cy - 0.11, cy + 0.11, 0.075, 10, 5)
    ycyl_into(bm, XF, R, cy - 0.17, cy + 0.17, 0.385, 18, 5)         # yo'naltiruvchi g'ildirak
    ycyl_into(bm, XF, R, cy - 0.2, cy + 0.2, 0.15, 10, 1)
    ycyl_into(bm, XR, R, cy - 0.15, cy + 0.15, 0.34, 18, 1)          # yetaklovchi yulduzcha + tishlari
    ycyl_into(bm, XR, R, cy - 0.19, cy + 0.19, 0.14, 10, 0)
    for k in range(11):
        a = 2 * math.pi * k / 11
        xbeam(bm, (0.08, 0.1, 0.09), (XR + math.cos(a) * 0.37, cy, R + math.sin(a) * 0.37), -a, 1)


def dozer(bm):
    TY = 1.12
    for s in (-1, 1):
        track_side(bm, s * TY)
        # qanot: gusenitsa ustidagi tunuka, old tomoni qiya
        prism_into(bm, [(-2.25, 0.93), (1.35, 0.93), (2.2, 0.62), (2.2, 0.58), (1.35, 0.88), (-2.25, 0.88)],
                   s * TY - 0.33, s * TY + 0.33, 0)
        for x in (-1.75, -0.55, 0.65):                                # qanot tirgaklari
            box_into(bm, (0.08, 0.5, 0.2), (x, s * 0.72, 0.84), 1)
        # tutqich va zinapoya
        tube_into(bm, (-1.5, s * 1.42, 1.0), (-0.35, s * 1.42, 1.0), 0.016, 6, 1)
        for x in (-1.5, -0.35):
            tube_into(bm, (x, s * 1.42, 0.92), (x, s * 1.42, 1.0), 0.016, 6, 1)
        box_into(bm, (0.5, 0.2, 0.03), (-0.9, s * 1.5, 0.62), 1)
    # rama va dvigatel
    cbox_into(bm, (3.6, 1.4, 0.55), (-0.15, 0, 0.95), 0, 0.04)
    prism_into(bm, [(0.1, 1.1), (1.8, 1.1), (1.8, 1.92), (1.55, 2.02), (0.2, 2.1)], -0.66, 0.66, 0)
    # radiator panjarasi
    box_into(bm, (0.03, 1.15, 0.72), (1.815, 0, 1.5), 1)
    for k in range(7):
        box_into(bm, (0.05, 1.18, 0.035), (1.83, 0, 1.2 + k * 0.1), 0)
    tube_into(bm, (1.83, -0.62, 1.17), (1.83, -0.62, 1.86), 0.02, 6, 0)
    tube_into(bm, (1.83, 0.62, 1.17), (1.83, 0.62, 1.86), 0.02, 6, 0)
    # kapot yonidagi shamollatish tirqishlari
    for s in (-1, 1):
        for k in range(7):
            box_into(bm, (0.9, 0.012, 0.035), (1.0, s * 0.665, 1.25 + k * 0.08), 1)
        box_into(bm, (0.012 + 0.9, 0.012, 0.012), (1.0, s * 0.668, 1.21), 0)
    # chiqindi quvur va havo tozalagich
    tube_into(bm, (1.2, -0.32, 2.0), (1.2, -0.32, 2.85), 0.052, 10, 1)
    tube_into(bm, (1.2, -0.32, 2.2), (1.2, -0.32, 2.62), 0.075, 10, 1)      # issiqlik to'sig'i
    tube_into(bm, (1.25, -0.32, 2.85), (1.32, -0.32, 2.92), 0.054, 10, 1)   # qopqoq qiya
    tube_into(bm, (1.05, 0.32, 2.0), (1.05, 0.32, 2.22), 0.05, 10, 1)
    tube_into(bm, (1.05, 0.32, 2.22), (1.05, 0.32, 2.5), 0.1, 12, 1)
    tube_into(bm, (1.05, 0.32, 2.5), (1.05, 0.32, 2.53), 0.115, 12, 0)
    # yonilg'i baki orqada
    cbox_into(bm, (0.62, 1.3, 0.72), (-1.68, 0, 1.45), 0, 0.05)
    tube_into(bm, (-1.68, 0.4, 1.81), (-1.68, 0.4, 1.86), 0.05, 10, 1)
    # kabina
    box_into(bm, (1.36, 1.2, 0.3), (-0.62, 0, 1.45), 1)
    prism_into(bm, [(-1.27, 1.6), (0.03, 1.6), (0.03, 1.72), (-1.27, 1.72)], -0.61, 0.61, 0)
    box_into(bm, (0.5, 0.5, 0.42), (-0.85, 0, 1.92), 1)                       # o'rindiq
    for x in (-1.25, 0.02):
        for y in (-0.6, 0.6):
            beam_into(bm, (x, y, 1.6), (x, y, 2.9), 0.075, mat_index=0)       # ROPS ustunlari
    for s in (-1, 1):
        beam_into(bm, (-0.45, s * 0.6, 1.7), (-0.45, s * 0.6, 2.86), 0.045, mat_index=1)
        box_into(bm, (1.22, 0.02, 1.08), (-0.62, s * 0.6, 2.28), 2)            # yon oynalar
        box_into(bm, (0.14, 0.04, 0.03), (-0.55, s * 0.62, 2.0), 4)            # eshik tutqichi
        tube_into(bm, (0.04, s * 0.62, 2.82), (0.2, s * 0.86, 2.78), 0.012, 5, 1)
        box_into(bm, (0.03, 0.14, 0.24), (0.2, s * 0.86, 2.66), 1)             # ko'zgu
    box_into(bm, (0.02, 1.1, 1.1), (0.02, 0, 2.28), 2)                         # old oyna
    box_into(bm, (0.02, 1.1, 1.1), (-1.25, 0, 2.28), 2)                        # orqa oyna
    cbox_into(bm, (1.62, 1.46, 0.1), (-0.62, 0, 2.95), 0, 0.03)                # tom
    # tepadagi chiroqlar va mayoq
    for y in (-0.42, 0.42):
        box_into(bm, (0.08, 0.22, 0.14), (0.16, y, 2.98), 1)
        box_into(bm, (0.02, 0.18, 0.1), (0.21, y, 2.98), 3)
        box_into(bm, (0.08, 0.22, 0.14), (-1.42, y, 2.98), 1)
        box_into(bm, (0.02, 0.18, 0.1), (-1.47, y, 2.98), 3)
    tube_into(bm, (-0.62, 0.45, 3.0), (-0.62, 0.45, 3.13), 0.055, 10, 6)
    tube_into(bm, (-0.5, -0.5, 3.0), (-0.5, -0.5, 3.5), 0.006, 4, 1)            # antenna
    # old faralar (radiator yonida)
    for y in (-0.52, 0.52):
        box_into(bm, (0.08, 0.28, 0.18), (1.86, y, 1.98), 1)
        box_into(bm, (0.02, 0.24, 0.14), (1.91, y, 1.98), 3)
    # otval: egilgan po'lat, kesuvchi pichoq, yon quloqlar, orqa qovurg'alar
    BX, BH, BW = 2.82, 1.28, 1.92
    curve = [(BX - 0.32 * math.sin(math.pi * 0.86 * t) + 0.05 * t, 0.04 + BH * t) for t in [k / 10 for k in range(11)]]
    ribbon_into(bm, curve, -BW, BW, -0.05, 0)
    prism_into(bm, [(BX + 0.02, 0.0), (BX + 0.07, 0.0), (BX + 0.02, 0.16), (BX - 0.1, 0.25)], -BW - 0.01, BW + 0.01, 1)   # pichoq
    for s in (-1, 1):
        prism_into(bm, [(BX - 0.45, 0.02), (BX + 0.04, 0.02), (BX + 0.02, 0.5), (BX - 0.1, BH), (BX - 0.45, BH - 0.15)],
                   s * BW, s * (BW + 0.03), 0)
    for y in (-1.5, -0.9, -0.3, 0.3, 0.9, 1.5):
        beam_into(bm, (BX - 0.34, y, 0.15), (BX - 0.3, y, BH - 0.1), 0.045, 0.14, mat_index=0)
    box_into(bm, (0.08, 2 * BW - 0.2, 0.08), (BX - 0.24, 0, BH - 0.04), 0)
    box_into(bm, (0.1, 2 * BW - 0.3, 0.1), (BX - 0.38, 0, 0.3), 0)
    for s in (-1, 1):
        # itaruvchi ramka va gidrotsilindrlar
        beam_into(bm, (0.15, s * 1.42, 0.45), (BX - 0.42, s * 1.42, 0.42), 0.16, 0.2, mat_index=0)
        tube_into(bm, (1.25, s * 1.42, 0.45), (BX - 0.4, s * 1.35, 0.95), 0.045, 8, 1)
        hydraulic(bm, (1.0, s * 0.74, 1.72), (BX - 0.34, s * 0.9, 1.12), 0.07)
        ycyl_into(bm, 0.15, 0.45, s * 1.3, s * 1.55, 0.1, 10, 1)
    hydraulic(bm, (1.5, 1.42, 0.62), (BX - 0.34, 1.5, 1.1), 0.055)              # qiyalash silindri
    # orqa yumshatgich (ripper)
    for s in (-1, 1):
        beam_into(bm, (-2.05, s * 0.55, 0.85), (-2.95, s * 0.55, 0.72), 0.12, 0.16, mat_index=0)
        beam_into(bm, (-2.05, s * 0.55, 0.45), (-2.95, s * 0.55, 0.58), 0.1, 0.12, mat_index=0)
        hydraulic(bm, (-1.98, s * 0.4, 1.25), (-2.95, s * 0.4, 0.8), 0.06)
    box_into(bm, (0.2, 1.5, 0.3), (-3.02, 0, 0.66), 0)
    prism_into(bm, [(-3.02, 0.95), (-2.92, 0.95), (-2.92, 0.3), (-3.05, 0.1), (-3.3, -0.02), (-3.24, 0.14), (-3.02, 0.32)], -0.05, 0.05, 1)
    for y in (-0.72, 0.72):
        box_into(bm, (0.03, 0.14, 0.09), (-1.99, y, 1.1), 7)


# =====================================================================
# AVTOKRAN (shassi old tomoni +X)
# mats: 0 sariq, 1 to'q, 2 oyna, 3 xrom, 4 rezina, 5 fara, 6 mayoq, 7 orqa chiroq
# =====================================================================
CARRIER_MATS = ["yellow", "dark", "glass", "chrome", "rubber", "headlight", "beacon", "red"]


def wheel_into(bm, x, y):
    R, Wd = 0.66, 0.52
    s = 1 if y > 0 else -1
    tube_into(bm, (x, y - Wd / 2, R), (x, y + Wd / 2, R), R, 24, 4)
    for k in range(26):                                                 # protektor
        a = 2 * math.pi * k / 26
        xbeam(bm, (0.075, Wd * 0.98, 0.03), (x + math.cos(a) * (R + 0.005), y, R + math.sin(a) * (R + 0.005)), -a, 4)
    # disk: botiq, gardish va boltlar
    tube_into(bm, (x, y + s * (Wd / 2 - 0.02), R), (x, y + s * (Wd / 2 + 0.005), R), 0.4, 20, 0)
    tube_into(bm, (x, y + s * (Wd / 2), R), (x, y + s * (Wd / 2 + 0.02), R), 0.15, 12, 1)
    for k in range(10):
        a = 2 * math.pi * k / 10
        tube_into(bm, (x + math.cos(a) * 0.24, y + s * (Wd / 2), R + math.sin(a) * 0.24),
                  (x + math.cos(a) * 0.24, y + s * (Wd / 2 + 0.03), R + math.sin(a) * 0.24), 0.018, 5, 3)


def outrigger(bm, x, s):
    box_into(bm, (0.52, 1.1, 0.42), (x, s * 1.3, 0.92), 0)                  # g'ilof
    beam_into(bm, (x, s * 1.3, 0.92), (x, s * 3.25, 0.92), 0.3, 0.3, mat_index=0)
    tube_into(bm, (x, s * 3.25, 1.3), (x, s * 3.25, 0.72), 0.14, 12, 0)     # silindr
    tube_into(bm, (x, s * 3.25, 0.72), (x, s * 3.25, 0.12), 0.085, 12, 3)   # shtok
    tube_into(bm, (x, s * 3.25, 0.1), (x, s * 3.25, 0.03), 0.42, 16, 1)     # tayanch tovon
    box_into(bm, (0.9, 0.9, 0.03), (x, s * 3.25, 0.015), 1)
    for d in (-1, 1):
        box_into(bm, (0.06, 1.8, 0.18), (x + d * 0.17, s * 2.2, 0.92), 1)


def carrier(bm):
    Hc = 1.35
    cbox_into(bm, (11.8, 2.5, 0.62), (-0.35, 0, Hc), 0, 0.04)                # asosiy rama
    box_into(bm, (11.4, 2.3, 0.04), (-0.35, 0, Hc + 0.33), 1)                # palub (soya qoplama)
    for k in range(9):
        box_into(bm, (0.04, 2.34, 0.03), (-5.8 + k * 1.2, 0, Hc + 0.36), 0)
    for s in (-1, 1):
        for x in (-3.75, 2.35):                                              # yon asbob qutilari
            cbox_into(bm, (2.1 if x < 0 else 1.5, 0.08, 0.5), (x, s * 1.28, Hc - 0.02), 0, 0.012)
            box_into(bm, (0.5, 0.02, 0.03), (x, s * 1.33, Hc + 0.05), 3)
        for x in (-4.4, -2.9, 0.6, 2.1):                                     # g'ildiraklar va qanotlar
            wheel_into(bm, x, s * 1.02)
            prism_into(bm, [(x - 0.82, 1.15), (x - 0.62, 1.48), (x + 0.62, 1.48), (x + 0.82, 1.15),
                            (x + 0.79, 1.13), (x + 0.6, 1.44), (x - 0.6, 1.44), (x - 0.79, 1.13)], s * 0.74, s * 1.3, 1)
        tube_into(bm, (-5.2, s * 1.3, 1.7), (3.0, s * 1.3, 1.7), 0.02, 6, 0)  # panjara
        for x in (-5.2, -2.4, 0.3, 3.0):
            tube_into(bm, (x, s * 1.3, 1.65), (x, s * 1.3, 1.7), 0.02, 6, 0)
    outrigger(bm, -5.55, 1); outrigger(bm, -5.55, -1)
    outrigger(bm, 3.05, 1); outrigger(bm, 3.05, -1)
    # haydovchi kabinasi: qiya oyna, eshik, faralar
    CX = 3.75
    prism_into(bm, [(CX, 1.65), (CX + 1.95, 1.65), (CX + 2.02, 2.2), (CX + 1.5, 3.3), (CX + 0.1, 3.38), (CX, 3.3)], -1.22, 1.22, 0)
    prism_into(bm, [(CX + 1.98, 2.26), (CX + 2.0, 2.22), (CX + 1.52, 3.24), (CX + 1.5, 3.27)], -1.12, 1.12, 2)   # old oyna
    for s in (-1, 1):
        prism_into(bm, [(CX + 0.75, 2.32), (CX + 1.84, 2.32), (CX + 1.42, 3.16), (CX + 0.75, 3.18)], s * 1.22, s * 1.235, 2)
        box_into(bm, (0.2, 0.025, 0.03), (CX + 0.95, s * 1.24, 2.2), 3)
        tube_into(bm, (CX + 1.5, s * 1.22, 3.1), (CX + 1.75, s * 1.5, 3.08), 0.018, 6, 1)
        box_into(bm, (0.05, 0.18, 0.42), (CX + 1.75, s * 1.52, 2.86), 1)     # ko'zgu
        box_into(bm, (0.04, 0.5, 0.2), (CX + 2.06, s * 0.88, 1.85), 5)       # fara
        box_into(bm, (0.04, 0.15, 0.1), (CX + 2.06, s * 0.45, 1.85), 7)
        box_into(bm, (0.6, 0.12, 0.05), (CX + 1.7, s * 1.28, 1.4), 1)        # zinapoya
        box_into(bm, (0.6, 0.12, 0.05), (CX + 1.7, s * 1.28, 1.05), 1)
        box_into(bm, (0.04, 0.12, 0.28), (-6.32, s * 1.0, 1.42), 7)
    box_into(bm, (0.08, 1.2, 0.34), (CX + 2.04, 0, 2.1), 1)                  # panjara
    for k in range(4):
        box_into(bm, (0.09, 1.22, 0.025), (CX + 2.05, 0, 1.97 + k * 0.08), 0)
    cbox_into(bm, (0.3, 2.56, 0.42), (CX + 2.18, 0, 1.35), 1, 0.04)          # bamper
    box_into(bm, (0.36, 2.1, 0.08), (CX + 2.2, 0, 1.13), 0)
    tube_into(bm, (CX + 0.6, 0.3, 3.38), (CX + 0.6, 0.3, 3.5), 0.06, 10, 6)  # mayoq
    tube_into(bm, (CX + 0.6, -0.3, 3.38), (CX + 0.6, -0.3, 3.5), 0.06, 10, 6)
    tube_into(bm, (CX - 0.25, -1.0, 1.7), (CX - 0.25, -1.0, 3.6), 0.06, 10, 1)  # chiqindi quvur
    box_into(bm, (1.3, 0.75, 0.75), (CX - 0.75, 0.75, 2.1), 1)               # dvigatel qopqog'i


def turret(bm):
    tube_into(bm, (0, 0, -0.34), (0, 0, 0.12), 1.2, 28, 1)                    # aylanma halqa
    cbox_into(bm, (4.6, 2.5, 0.42), (-0.75, 0, 0.3), 0, 0.03)                 # platforma
    cbox_into(bm, (2.5, 1.5, 0.9), (-1.45, -0.3, 0.95), 0, 0.05)              # dvigatel qopqog'i
    for k in range(6):
        box_into(bm, (1.8, 0.012, 0.04), (-1.5, -1.055, 0.72 + k * 0.09), 1)  # shamollatish
    tube_into(bm, (-0.8, -0.6, 1.4), (-0.8, -0.6, 2.2), 0.05, 10, 1)
    # lebedka barabani
    ycyl_into(bm, -1.9, 1.65, -0.45, 1.05, 0.42, 20, 1)
    ycyl_into(bm, -1.9, 1.65, -0.52, -0.45, 0.52, 20, 0)
    ycyl_into(bm, -1.9, 1.65, 1.05, 1.12, 0.52, 20, 0)
    box_into(bm, (0.2, 0.1, 1.4), (-1.9, -0.55, 1.1), 0)
    box_into(bm, (0.2, 0.1, 1.4), (-1.9, 1.15, 1.1), 0)
    # qarshi yuk bloklari (qatlam-qatlam plitalar)
    for k in range(4):
        cbox_into(bm, (0.36, 2.3, 1.15), (-2.85 - k * 0.38, 0, 0.85), 1 if k % 2 else 0, 0.03)
    # boom o'qi qulog'i va luffing silindri
    for s in (-1, 1):
        prism_into(bm, [(-0.9, 0.5), (1.0, 0.5), (0.75, 1.3), (0.15, 1.3)], s * 0.45, s * 0.55, 0)
    ycyl_into(bm, 0.4, 1.0, -0.6, 0.6, 0.2, 14, 3)
    hydraulic(bm, (1.55, 0, 0.42), (6.6, 0, 7.6), 0.21, 0, 3, 0.56, 16)
    box_into(bm, (0.9, 0.9, 0.18), (1.55, 0, 0.42), 0)
    # operator kabinasi
    CY = 1.36
    prism_into(bm, [(0.15, 0.5), (1.45, 0.5), (1.65, 1.2), (1.5, 2.0), (0.15, 2.0)], CY - 0.47, CY + 0.47, 0)
    prism_into(bm, [(1.62, 1.24), (1.64, 1.2), (1.49, 1.94), (1.47, 1.94)], CY - 0.4, CY + 0.4, 2)
    prism_into(bm, [(0.45, 1.25), (1.58, 1.25), (1.45, 1.93), (0.45, 1.93)], CY + 0.47, CY + 0.482, 2)
    box_into(bm, (0.02, 0.8, 0.65), (0.14, CY, 1.6), 2)
    tube_into(bm, (0.6, CY, 2.0), (0.6, CY, 2.1), 0.05, 8, 6)


BOOM_L, BOOM_PITCH = 30.0, math.radians(47)


def octa_beam(bm, x0, x1, w, h, mat_index=0, chamfer=0.3):
    """Sakkiz qirrali teleskop bo'lim: yon tomoni tekis, burchaklari kesilgan."""
    c = chamfer
    prof = [(-w / 2, -h * (0.5 - c * 0.5)), (-w / 2, h * (0.5 - c * 0.5)), (-w * (0.5 - c), h / 2), (w * (0.5 - c), h / 2),
            (w / 2, h * (0.5 - c * 0.5)), (w / 2, -h * (0.5 - c * 0.5)), (w * (0.5 - c), -h / 2), (-w * (0.5 - c), -h / 2)]
    a = [bm.verts.new((x0, y, z)) for y, z in prof]
    b = [bm.verts.new((x1, y, z)) for y, z in prof]
    fs = [bm.faces.new(a), bm.faces.new(b[::-1])]
    for i in range(8):
        j = (i + 1) % 8
        fs.append(bm.faces.new((a[i], b[i], b[j], a[j])))
    for f in fs:
        f.material_index = mat_index
    bmesh.ops.recalc_face_normals(bm, faces=fs)


def boom(bm):
    secs = [(-1.0, 8.5, 0.86, 1.08), (8.0, 16.0, 0.72, 0.9), (15.5, 23.5, 0.59, 0.73), (23.0, BOOM_L - 0.5, 0.47, 0.58)]
    for k, (x0, x1, w, h) in enumerate(secs):
        octa_beam(bm, x0, x1, w, h, 0)
        octa_beam(bm, x1 - 0.26, x1 + 0.02, w + 0.05, h + 0.05, 1)            # bo'lim yoqasi
    ycyl_into(bm, 0.0, 0.0, -0.46, 0.46, 0.2, 14, 1)
    # bosh qismi: bloklar
    box_into(bm, (0.9, 0.42, 0.42), (BOOM_L - 0.35, 0, 0), 0)
    for dx, dz in ((0.25, 0.05), (-0.25, 0.1)):
        ycyl_into(bm, BOOM_L + dx, dz, -0.14, 0.14, 0.3, 18, 1)
        ycyl_into(bm, BOOM_L + dx, dz, -0.2, 0.2, 0.06, 8, 2)
    # yon kabel kanali va zinapoya halqalari
    for s in (-1, 1):
        tube_into(bm, (0.8, s * 0.46, -0.3), (8.0, s * 0.46, -0.3), 0.022, 6, 1)
    for k in range(5):
        box_into(bm, (0.06, 0.04, 0.5), (1.5 + k * 1.3, 0.46, 0.1), 1)


def boom_decal_into(parent, y, flip):
    o = new_obj("Crane_Decal", text_me("Crane_Decal", "UZ GROW", 0.62, M["decal"]), (4.2, y, 0), parent)
    o.rotation_euler = (math.radians(90), 0, math.radians(180) if flip else 0)
    return o


def hook_block(bm, cable):
    tube_into(bm, (-0.03, 0, 0), (-0.03, 0, -cable), 0.012, 4, 0)
    tube_into(bm, (0.03, 0, 0), (0.03, 0, -cable), 0.012, 4, 0)
    z = -cable
    for s in (-1, 1):                                                         # yon plitalar (sariq-qora)
        prism_into(bm, [(-0.3, z + 0.05), (0.3, z + 0.05), (0.26, z - 0.7), (-0.26, z - 0.7)], s * 0.14, s * 0.17, 1)
    ycyl_into(bm, 0, z - 0.2, -0.13, 0.13, 0.26, 16, 0)
    ycyl_into(bm, 0, z - 0.2, -0.18, 0.18, 0.05, 8, 0)
    box_into(bm, (0.42, 0.3, 0.14), (0, 0, z - 0.72), 1)                     # traversa
    tube_into(bm, (0, 0, z - 0.78), (0, 0, z - 0.98), 0.05, 8, 0)
    # ilgak: bir tomoni ochiq, uchiga qarab ingichkalashadi
    rings = []
    for k in range(10):
        a = math.radians(-100 + k * 28)
        r = 0.19
        c = Vector((math.cos(a) * r, 0, z - 1.17 + math.sin(a) * r))
        t = k / 9
        rings.append((c, 0.05 * (1 - t) + 0.022 * t, 0.075 * (1 - t) + 0.02 * t))
    rings.insert(0, (Vector((0, 0, z - 0.98)), 0.05, 0.06))
    loft_into(bm, rings, 8, 0, Vector((0, 1, 0)))


# =====================================================================
# YORITISH MINORASI: treyler, generator, ko'taruvchi machta
# =====================================================================
def tower(bm):
    cbox_into(bm, (2.1, 1.05, 1.05), (0, 0, 0.98), 1, 0.05)                 # generator korpusi
    for k in range(7):
        box_into(bm, (0.7, 0.012, 0.03), (0.45, -0.53, 0.72 + k * 0.08), 0)
    box_into(bm, (2.3, 1.2, 0.1), (0, 0, 0.42), 0)
    for s in (-1, 1):
        ycyl_into(bm, 0.0, 0.3, s * 0.62, s * 0.84, 0.3, 14, 2)
        ycyl_into(bm, 0.0, 0.3, s * 0.82, s * 0.85, 0.15, 10, 0)
    beam_into(bm, (1.1, 0, 0.42), (2.0, 0, 0.42), 0.07, mat_index=0)
    tube_into(bm, (2.0, 0, 0.0), (2.0, 0, 0.42), 0.03, 6, 0)
    tube_into(bm, (-0.6, 0, 1.5), (-0.6, 0, 4.2), 0.075, 10, 1)              # teleskop machta
    tube_into(bm, (-0.6, 0, 4.2), (-0.6, 0, 6.2), 0.055, 10, 1)
    tube_into(bm, (-0.6, 0, 6.2), (-0.6, 0, 7.6), 0.04, 10, 1)
    box_into(bm, (1.8, 0.1, 0.14), (-0.6, 0, 7.55), 1)
    for x in (-1.05, 1.05):                                                  # tayanch oyoqlar
        beam_into(bm, (x, -0.5, 0.4), (x, -1.1, 0.05), 0.05, mat_index=0)
        beam_into(bm, (x, 0.5, 0.4), (x, 1.1, 0.05), 0.05, mat_index=0)


TOWER_MATS = ["dark", "yellow", "rubber"]


# =====================================================================
# ISHCHILAR: gavda, xalat (aks ettiruvchi tasmalar bilan), kaska, etik
# mats: 0 jilet, 1 kaska, 2 teri, 3 shim, 4 ko'ylak, 5 etik, 6 tasma, 7 yog'och, 8 po'lat
# =====================================================================
WORKER_MATS = ["vest", "helmet", "w_skin", "w_pants", "w_shirt", "w_boot", "reflect", "wood", "steel"]


def arm_into(bm, shoulder, elbow, wrist, mat_shirt=4, mat_skin=2):
    s, e, w = Vector(shoulder), Vector(elbow), Vector(wrist)
    loft_into(bm, [(s, 0.062, 0.062), (s.lerp(e, 0.5), 0.056, 0.056), (e, 0.048, 0.048), (e.lerp(w, 0.5), 0.044, 0.044), (w.lerp(e, 0.08), 0.036, 0.036)], 8, mat_shirt)
    loft_into(bm, [(w.lerp(e, 0.1), 0.03, 0.03), (w, 0.034, 0.028), (w + (w - e).normalized() * 0.09, 0.03, 0.02)], 6, mat_skin)


def leg_into(bm, hip, knee, ankle, toe_dir=(0, -1, 0)):
    h, k, a = Vector(hip), Vector(knee), Vector(ankle)
    td = Vector(toe_dir)
    loft_into(bm, [(h, 0.092, 0.1), (h.lerp(k, 0.5), 0.075, 0.08), (k, 0.058, 0.062), (k.lerp(a, 0.5), 0.052, 0.058), (a + Vector((0, 0, 0.04)), 0.052, 0.055)], 8, 3)
    # etik
    loft_into(bm, [(a + Vector((0, 0, 0.1)), 0.055, 0.06), (a, 0.052, 0.06), (a + Vector((0, 0, -0.03)) + td * 0.03, 0.052, 0.075)], 8, 5)
    bottom = a.z - 0.05
    loft_into(bm, [(a - td * 0.07 + Vector((0, 0, bottom - a.z + 0.04)), 0.045, 0.04), (a + td * 0.05 + Vector((0, 0, bottom - a.z + 0.05)), 0.054, 0.05),
                   (a + td * 0.17 + Vector((0, 0, bottom - a.z + 0.04)), 0.05, 0.04), (a + td * 0.21 + Vector((0, 0, bottom - a.z + 0.03)), 0.03, 0.022)], 8, 5, Vector((1, 0, 0)))


def torso_into(bm, lean=0.0):
    z = 0.94
    c = lambda h: Vector((0, lean * (h - z), h))
    # bel va tos (shim)
    loft_into(bm, [(c(0.86), 0.148, 0.104), (c(0.95), 0.158, 0.108), (c(1.03), 0.15, 0.1)], 10, 3)
    # gavda (ko'ylak ustida jilet)
    loft_into(bm, [(c(1.03), 0.158, 0.11), (c(1.16), 0.17, 0.117), (c(1.3), 0.188, 0.122), (c(1.4), 0.175, 0.112), (c(1.47), 0.12, 0.085)], 12, 0)
    # aks ettiruvchi tasmalar
    for h in (1.1, 1.2):
        loft_into(bm, [(c(h - 0.02), 0.171, 0.121), (c(h + 0.02), 0.175, 0.123)], 12, 6)
    for s in (-1, 1):
        for yy in (-1, 1):
            box_into(bm, (0.035, 0.008, 0.3), (s * 0.1, lean * (1.3 - z) + yy * 0.124, 1.3), 6)
    # bo'yin va bosh
    loft_into(bm, [(c(1.46), 0.052, 0.054), (c(1.54), 0.046, 0.05)], 8, 2)
    loft_into(bm, [(c(1.53), 0.05, 0.058), (c(1.56) + Vector((0, -0.008, 0)), 0.068, 0.08), (c(1.61) + Vector((0, -0.012, 0)), 0.078, 0.094),
                   (c(1.67) + Vector((0, -0.008, 0)), 0.08, 0.098), (c(1.72), 0.07, 0.086), (c(1.75), 0.04, 0.05)], 10, 2)
    box_into(bm, (0.022, 0.03, 0.04), (0, lean * (1.63 - z) - 0.105, 1.63), 2)  # burun
    # kaska: gumbaz + soyabon + qovurg'a
    hc = c(1.72)
    domes = [(hc + Vector((0, 0, -0.012)), 0.1, 0.116), (hc + Vector((0, 0, 0.02)), 0.098, 0.113), (hc + Vector((0, 0, 0.055)), 0.083, 0.098),
             (hc + Vector((0, 0, 0.082)), 0.056, 0.066), (hc + Vector((0, 0, 0.098)), 0.018, 0.022)]
    loft_into(bm, domes, 12, 1)
    loft_into(bm, [(hc + Vector((0, -0.03, -0.018)), 0.098, 0.135), (hc + Vector((0, -0.03, -0.008)), 0.098, 0.135)], 12, 1)
    loft_into(bm, [(hc + Vector((0, 0.005, 0.085)), 0.012, 0.09), (hc + Vector((0, 0.005, 0.1)), 0.008, 0.07)], 6, 1)


def worker_stand(bm):
    leg_into(bm, (-0.09, 0, 0.88), (-0.1, -0.01, 0.48), (-0.11, 0.015, 0.1))
    leg_into(bm, (0.09, 0, 0.88), (0.11, -0.01, 0.48), (0.12, 0.015, 0.1))
    torso_into(bm)
    arm_into(bm, (-0.2, 0, 1.41), (-0.25, 0.01, 1.14), (-0.27, -0.07, 0.9))
    arm_into(bm, (0.2, 0, 1.41), (0.3, 0.03, 1.15), (0.2, -0.12, 1.02))        # qo'lida planshet
    box_into(bm, (0.2, 0.012, 0.28), (0.1, -0.18, 1.08), 8)


def worker_shovel(bm):
    leg_into(bm, (-0.1, 0.02, 0.86), (-0.13, -0.12, 0.5), (-0.14, -0.1, 0.1))
    leg_into(bm, (0.1, 0.02, 0.86), (0.13, 0.13, 0.47), (0.15, 0.2, 0.1))
    torso_into(bm, -0.3)
    arm_into(bm, (-0.2, -0.13, 1.39), (-0.24, -0.3, 1.14), (-0.05, -0.42, 1.14))
    arm_into(bm, (0.2, -0.13, 1.39), (0.22, -0.35, 1.2), (0.05, -0.58, 0.86))
    a, b = Vector((-0.05, -0.32, 1.28)), Vector((0.1, -0.78, 0.2))
    tube_into(bm, a, b, 0.016, 6, 7)
    d = (b - a).normalized()
    side = Vector((1, 0, 0))
    v = [bm.verts.new(p) for p in (b + side * 0.11, b - side * 0.11, b - side * 0.09 + d * 0.27, b + d * 0.32, b + side * 0.09 + d * 0.27)]
    bm.faces.new(v).material_index = 8


def worker_carry(bm):
    leg_into(bm, (-0.09, 0, 0.88), (-0.1, -0.16, 0.52), (-0.1, -0.2, 0.1))
    leg_into(bm, (0.09, 0, 0.88), (0.1, 0.1, 0.48), (0.1, 0.28, 0.14))
    torso_into(bm, -0.08)
    arm_into(bm, (-0.2, -0.04, 1.41), (-0.27, -0.03, 1.5), (-0.1, 0.02, 1.76))
    arm_into(bm, (0.2, -0.04, 1.41), (0.27, -0.03, 1.5), (0.1, 0.02, 1.76))
    tube_into(bm, (-1.4, 0.03, 1.83), (1.4, 0.03, 1.83), 0.032, 8, 8)            # yelkasida quvur


# =====================================================================
# O'simlik impostorlari: kesishgan tekisliklar, UV Cycles render qilgan atlasga qaraydi.
# O'lchamlar web/scripts/pack-impostors.mjs yozgan foliage.json dan olinadi.
# =====================================================================
import json as _json
FOLIAGE = _json.load(open(BLENDER_DIR + r"\..\web\src\data\foliage.json", encoding="utf-8"))


def cross_into(bm, name, scale=1.0, extra=False):
    w, h = FOLIAGE[name]["w"] * scale, FOLIAGE[name]["h"] * scale
    uvl = bm.loops.layers.uv.verify()

    def quad(dx, dy, u0, u1):
        vs = [bm.verts.new(p) for p in ((-w / 2 * dx, -w / 2 * dy, 0), (w / 2 * dx, w / 2 * dy, 0),
                                        (w / 2 * dx, w / 2 * dy, h), (-w / 2 * dx, -w / 2 * dy, h))]
        f = bm.faces.new(vs)
        for l, uv in zip(f.loops, ((u0, 0), (u1, 0), (u1, 1), (u0, 1))):
            l[uvl].uv = uv

    quad(1, 0, 0, 0.5)
    quad(0, 1, 0.5, 1)
    if extra:                 # yaqin daraxtlar: yon tomondan qaraganda ham to'la ko'rinsin
        quad(0.707, 0.707, 0.5, 0)
        quad(0.707, -0.707, 1, 0.5)
