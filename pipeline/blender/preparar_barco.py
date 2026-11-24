"""
Kinchika · Preparar el barco de la portada
==========================================

Toma el "Motor Yacht" de gogiart (Sketchfab, CC BY 4.0) y lo deja listo para la web:

  * casco pintado oscuro (como un barco de pesca deportiva) y cabina blanca
  * cubierta de popa despejada: sin los paneles ni sus postes
  * mallas simplificadas: el original tiene ~600.000 triángulos (barandas y
    ventanas con muchísimo detalle); queda en ~40.000
  * texturas a 1024 px en JPEG
  * orientado para la escena: proa hacia −X, popa en x = 0 y línea de flotación
    en y = 0 (en metros reales: ~9,4 m de eslora)

Uso (desde la carpeta del repositorio, en PowerShell):

    & "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" -b `
        -P pipeline\\blender\\preparar_barco.py -- `
        --entrada pipeline\\out\\barco-sketchfab.glb --salida public\\models\\barco.glb
"""

import argparse
import math
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
p = argparse.ArgumentParser(prog="preparar_barco.py")
p.add_argument("--entrada", required=True)
p.add_argument("--salida", required=True)
p.add_argument("--por-malla", type=int, default=2500, help="máximo de triángulos por pieza")
p.add_argument("--casco", type=int, default=6000, help="máximo de triángulos del casco")
p.add_argument("--textura", type=int, default=1024)
p.add_argument("--flotacion", type=float, default=0.84,
               help="altura (m, desde la quilla) de la franja roja: ahí queda el agua")
args = p.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args.entrada)
scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == "MESH"]


def tris(o):
    return sum(len(poly.vertices) - 2 for poly in o.data.polygons)


# ── cubierta de popa despejada ──
# Object_22 y Object_25 son los paneles de popa; además se borra todo lo que
# sobresale de la cubierta detrás de la cabina (los postes de esos paneles).
# Coordenadas del original: popa hacia +Y, Z arriba; la escalera de baño (y > 4) se conserva.
for nombre in ("Object_22", "Object_25"):
    o = scene.objects.get(nombre)
    if o:
        bpy.data.objects.remove(o)
meshes = [o for o in scene.objects if o.type == "MESH"]
for o in meshes:
    mw = o.matrix_world
    bm = bmesh.new()
    bm.from_mesh(o.data)
    borrar = []
    for f in bm.faces:
        c = mw @ f.calc_center_median()
        if 2.25 < c.y < 4.0 and c.z > 1.78:
            borrar.append(f)
    if borrar:
        bmesh.ops.delete(bm, geom=borrar, context="FACES")
        bm.to_mesh(o.data)
        print(f"popa despejada: {o.name} -{len(borrar)} caras")
    bm.free()


# ── materiales: casco oscuro, cabina blanca ──
# acmat_8 (gris 0.8 sin textura) cubre el costado del casco y también la cabina:
# las caras sobre la borda pasan a un material blanco propio antes de oscurecer el casco.
BORDA = 1.72   # altura (m, desde la quilla, antes de orientar) del canto de la cubierta
blanco = None
for o in meshes:
    idx = next((i for i, s in enumerate(o.material_slots)
                if s.material and s.material.name.startswith("acmat_8")), None)
    if idx is None:
        continue
    if blanco is None:
        blanco = o.material_slots[idx].material.copy()
        blanco.name = "cabina_blanca"
    o.data.materials.append(blanco)
    nuevo = len(o.material_slots) - 1
    mw = o.matrix_world
    movidas = 0
    for poly in o.data.polygons:
        if poly.material_index == idx and (mw @ poly.center).z > BORDA:
            poly.material_index = nuevo
            movidas += 1
    print(f"{o.name}: {movidas} caras a la cabina blanca")

for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        continue
    if mat.name.startswith("acmat_8"):
        bsdf.inputs["Base Color"].default_value = (0.012, 0.016, 0.02, 1.0)   # casco casi negro
        bsdf.inputs["Roughness"].default_value = 0.3                           # gelcoat brillante
        print("casco oscuro:", mat.name)
    elif mat.name == "cabina_blanca":
        bsdf.inputs["Base Color"].default_value = (0.86, 0.87, 0.86, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.4
    else:
        # el original es todo muy mate (0.93): un poco de brillo en la fibra de vidrio
        r = bsdf.inputs["Roughness"]
        if not r.is_linked and r.default_value > 0.8:
            r.default_value = 0.6

# ── simplificar ──
antes = sum(tris(o) for o in meshes)
for o in meshes:
    n = tris(o)
    es_casco = any(s.material and s.material.name.startswith(("acmat_8", "acmat_3")) for s in o.material_slots)
    limite = args.casco if es_casco else args.por_malla
    if n > limite:
        mod = o.modifiers.new("simplificar", "DECIMATE")
        mod.ratio = limite / n
        bpy.context.view_layer.objects.active = o
        for sel in scene.objects:
            sel.select_set(sel == o)
        bpy.ops.object.modifier_apply(modifier=mod.name)
despues = sum(tris(o) for o in meshes)
print(f"triángulos: {antes} -> {despues}")

# ── orientar: proa a −X, popa en x = 0, flotación en z = 0 (Blender, Z arriba) ──
bpy.context.view_layer.update()
raiz = [o for o in scene.objects if o.parent is None]
giro = Matrix.Rotation(-math.pi / 2, 4, "Z")   # la proa estaba en −Y
for o in raiz:
    o.matrix_world = giro @ o.matrix_world
bpy.context.view_layer.update()
mn = Vector((1e9, 1e9, 1e9))
mx = Vector((-1e9, -1e9, -1e9))
for o in meshes:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        mn = Vector(map(min, mn, w))
        mx = Vector(map(max, mx, w))
desplazar = Matrix.Translation(Vector((-mx.x, -(mn.y + mx.y) / 2, -(mn.z + args.flotacion))))
for o in raiz:
    o.matrix_world = desplazar @ o.matrix_world
bpy.context.view_layer.update()
print("eslora (m):", round(mx.x - mn.x, 2), "manga:", round(mx.y - mn.y, 2), "alto:", round(mx.z - mn.z, 2))

# ── texturas: 1024 px ──
for img in bpy.data.images:
    if img.size[0] > args.textura or img.size[1] > args.textura:
        k = args.textura / max(img.size)
        img.scale(max(1, int(img.size[0] * k)), max(1, int(img.size[1] * k)))

bpy.ops.export_scene.gltf(
    filepath=args.salida,
    export_format="GLB",
    export_image_format="JPEG",
    export_jpeg_quality=82,
    export_apply=True,
    export_yup=True,
    export_animations=False,
)
print("listo:", args.salida)
