# Butun sayt uchun yagona kamera yo'li (Blender koordinatalari, Z yuqoriga).
# Har bob o'z kadrlarini qo'shadi; spline hamma nuqtalardan o'tgani uchun boblar orasida "sakrash" bo'lmaydi.
# ch01_build.py va ch02_build.py exec() orqali ishlatadi.
from mathutils import Vector

SHOTS = [  # (kadr, kamera joyi, qarash nuqtasi)
    # 01 — Noldan boshlash
    (0, (-5, -80, 1.5), (0, 40, 3.5)),
    (90, (-4, -66, 1.8), (0, 20, 2.5)),
    (180, (-14, -50, 4.5), (-2, 0, 0.8)),
    (280, (-24, -38, 5.5), (0, -6, 0.3)),
    (380, (-32, -30, 8.5), (0, 0, 2.0)),
    (480, (-40, -32, 13), (0, 2, 3.5)),
    (600, (-42, -42, 21), (0, 4, 2.5)),
    # 02 — Muhandislik kuchi
    (690, (-36, -40, 11), (-4, -4, 4)),
    (790, (-24, -38, 5.5), (0, -6, 3.5)),
    (860, (16, -36, 3.5), (17, -14, 0.5)),     # isitish (janubi-sharqdan, qozonxona ko'rinadi)
    (940, (5, -31, 7.5), (0, -8, 6.2)),        # ventilyatsiya (tom darchalari, ventilyatorlar)
    (1020, (-20, -37, 3.6), (-21, -14, 0.4)),  # sug'orish (suv idishi, tomchi liniyalari)
    (1100, (5.5, -27, 2.4), (2.6, -19.5, 1.5)),  # avtomatika (boshqaruv shkafi, eshik yonida)
    (1200, (34, -52, 15), (0, 0, 3)),
    # 03 — Tayyor issiqxona (dron)
    (1290, (58, -8, 26), (0, 0, 2)),           # sharqdan ko'tarilish
    (1390, (30, 46, 44), (-2, 0, 0)),          # shimoli-sharq, butun majmua
    (1500, (-20, -8, 92), (-22, 0, 0)),        # tepadan — tom ochiq; issiqxona o'ngda, chapda parametrlar
    (1590, (-22, -4, 88), (-22, 0, 0)),
    (1690, (-30, -62, 24), (0, -10, 2)),       # janubi-g'arbga sho'ng'iydi
    (1800, (0, -34, 2.0), (0, -19, 1.9)),      # eshik oldida — 04-bob shu yerdan ichkariga kiradi
    # 04 — Issiqxona ichiga sayohat (x = 1.75 — markaziy prolyotdagi o'simlik qatorlari orasidagi yo'lak)
    (1855, (0, -22, 1.7), (0.4, -10, 1.4)),    # eshikdan o'tish
    (1935, (1.2, -17, 2.5), (3, -8, 0.2)),     # pol va substrat tayyorlanmoqda
    (2020, (1.75, -12, 0.9), (2.3, -4, 0.25)), # ko'chat ekish — past, qator bo'ylab
    (2115, (1.75, -6.5, 0.55), (2.5, -2, 0.12)),  # tomchilatib sug'orish — yaqin plan
    (2235, (1.75, 1, 1.5), (1.75, 12, 1.3)),   # time-lapse: o'sish, yo'lak bo'ylab yuramiz
    (2330, (1.75, 6, 2.3), (3, 15, 1.3)),
    (2400, (1.75, 6, 4.2), (8, 18, 1.0)),      # hosil — tepadan; 05-bob shu yerdan tomdan chiqadi
    # 05 — Natija va kompaniya qudrati (quyosh botadi, majmua o'sadi)
    (2470, (3, 0, 15), (4, 30, 0)),            # tomdan chiqish
    (2570, (-30, -72, 55), (10, 50, 0)),       # orqaga va yuqoriga — majmua paydo bo'lmoqda
    (2690, (-95, -150, 115), (10, 60, 0)),     # keng panorama, oltin soat
    (2820, (55, -175, 150), (0, 55, 0)),       # aylanib o'tish
    (3000, (0, -125, 255), (0, 40, 0)),        # juda baland, kechqurun — xaritaga o'tish
]


def _catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)


def apply_camera(cam, f_end, step=2):
    """SHOTS bo'yicha 0..f_end oralig'ida kamera kalit-kadrlarini (qayta) yozadi."""
    if cam.animation_data:
        cam.animation_data_clear()
    shots = [s for s in SHOTS if s[0] <= f_end] + [s for s in SHOTS if s[0] > f_end][:1]
    P = [Vector(s[1]) for s in shots]
    T = [Vector(s[2]) for s in shots]
    F = [s[0] for s in shots]
    prev_q = None
    for f in range(0, f_end + 1, step):
        seg = max(i for i in range(len(F) - 1) if F[i] <= f) if f < F[-1] else len(F) - 2
        t = (f - F[seg]) / (F[seg + 1] - F[seg])
        t = t * t * (3 - 2 * t) * 0.35 + t * 0.65   # nuqtalar yonida biroz sekinlashadi
        i0, i3 = max(seg - 1, 0), min(seg + 2, len(F) - 1)
        pos = _catmull(P[i0], P[seg], P[seg + 1], P[i3], t)
        tgt = _catmull(T[i0], T[seg], T[seg + 1], T[i3], t)
        q = (tgt - pos).to_track_quat("-Z", "Y")
        if prev_q is not None and prev_q.dot(q) < 0:
            q.negate()
        prev_q = q
        cam.location = pos
        cam.rotation_quaternion = q
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_quaternion", frame=f)
