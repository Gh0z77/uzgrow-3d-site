# UZ GROW — 05 "Natija va kompaniya qudrati": tomdan chiqish, katta majmua panoramasi (kadr 2400..3000).
# Avval 01–04 ni qayta quradi (bitta uzluksiz timeline), keyin ustiga qo'shadi:
#   exec(open(r"...\ch05_build.py", encoding="utf-8").read())
#
# Majmuadagi qo'shni issiqxonalar to'liq model emas — yengil "proksi" blok (EstateTpl_*).
# Saytda u ~16 nusxaga instancing bilan ko'paytiriladi va kechqurun ichidan yorug'lik sochadi.
# To'liq issiqxonani 16 marta takrorlash chizish chaqiruvlarini ~10 000 ga yetkazardi.
BLENDER_DIR = r"C:\Users\ghost\Desktop\uzgrow-3d-web site\blender"
exec(open(BLENDER_DIR + r"\ch04_build.py", encoding="utf-8").read())

F_END = 3000
scn.frame_end = F_END

M.update({
    "estate": mat("Estate_Shell", (0.82, 0.92, 0.96), rough=0.2),
})


def estate_shell(bm):
    for i in range(SPANS):
        x0 = X0 + i * SPAN_W
        pts = arch_pts(ZB)
        vs = [(bm.verts.new((x0 + x, Y0, z)), bm.verts.new((x0 + x, Y0 + L, z))) for x, z in pts]
        for (a0, a1), (b0, b1) in zip(vs, vs[1:]):
            bm.faces.new((a0, b0, b1, a1))
        for y in (Y0, Y0 + L):
            ngon_into(bm, [(x0 + gx, y, gz) for gx, _, gz in gable_outline()])
    for x in (X0, X0 + W):
        ngon_into(bm, [(x, Y0, 0), (x, Y0 + L, 0), (x, Y0 + L, ZB), (x, Y0, ZB)])


def estate_frame(bm):
    for i in range(SPANS + 1):
        x = X0 + i * SPAN_W
        box_into(bm, (0.35, L + 0.4, 0.22), (x, 0, ZB - 0.05))
        for y in (Y0, Y0 + L):
            box_into(bm, (0.2, 0.2, ZB), (x, y, ZB / 2))
    for i in range(SPANS):
        x = X0 + i * SPAN_W + SPAN_W / 2
        box_into(bm, (0.14, L, 0.14), (x, 0, ZB + arch_z(0) + SKIN + 0.05))
    for y in (Y0, Y0 + L):
        box_into(bm, (W, 0.25, 0.25), (0, y, 0.12))


for k, (name, build, m) in enumerate((("EstateTpl_Shell", estate_shell, M["estate"]),
                                       ("EstateTpl_Frame", estate_frame, M["steel"]))):
    new_obj(name, mesh_from(name, build, [m]), (k * 50.0, 300, -30))   # yer ostida yashirin

apply_camera(cam, F_END)
ease(cam, "LINEAR", "AUTO")

scn.frame_set(F_END)
print("OK ch05 objects:", len(bpy.data.objects))
