"""
Kinchika · Preparar modelos 3D para la web
===========================================

Toma un modelo crudo (por ejemplo, el .glb/.fbx que genera Higgsfield),
lo limpia y lo exporta como .glb liviano listo para la escena 3D del sitio.

Uso (desde la carpeta del repositorio, en PowerShell):

    & "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b `
        -P pipeline\\blender\\preparar_modelo.py -- `
        --tipo buzo --entrada pipeline\\out\\buzo-higgsfield.glb --salida public\\models\\buzo.glb

Opciones:
    --tipo      buzo | pez
                  buzo: conserva esqueleto y animaciones.
                  pez:  une todo en una sola malla estática, mirando a +X y de largo 1
                        (la web anima la cola por shader).
    --entrada   archivo .glb / .gltf / .fbx / .obj  (o "demo" para probar sin Higgsfield)
    --salida    archivo .glb de destino (normalmente dentro de public/models/)
    --caras     máximo de caras (por defecto: buzo 12000, pez 1500)
    --altura    alto final del buzo en metros (por defecto 1.8)
    --textura   lado máximo de las texturas en píxeles (por defecto 1024)
    --invertir  gira el pez 180° si quedó mirando hacia atrás
    --guardar-blend  además guarda un .blend junto a la salida, para seguir editando

Probado con Blender 4.2 LTS o superior.
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

# En Windows la salida de Blender puede ir a una consola que no es UTF-8
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


# ─────────────────────────── argumentos ───────────────────────────

def leer_argumentos():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(prog="preparar_modelo.py")
    p.add_argument("--tipo", choices=["buzo", "pez"], required=True)
    p.add_argument("--entrada", required=True)
    p.add_argument("--salida", required=True)
    p.add_argument("--caras", type=int, default=0)
    p.add_argument("--altura", type=float, default=1.8)
    p.add_argument("--textura", type=int, default=1024)
    p.add_argument("--invertir", action="store_true")
    p.add_argument("--guardar-blend", action="store_true")
    a = p.parse_args(argv)
    if not a.caras:
        a.caras = 12000 if a.tipo == "buzo" else 1500
    return a


# ─────────────────────────── utilidades ───────────────────────────

def escena_vacia():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def importar(ruta):
    ext = os.path.splitext(ruta)[1].lower()
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=ruta)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=ruta)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=ruta)
    else:
        raise SystemExit(f"Formato no soportado: {ext}")


def mallas():
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def total_caras():
    return sum(len(o.data.polygons) for o in mallas())


def con_objeto(obj):
    """Contexto con `obj` como objeto activo (para operadores)."""
    return bpy.context.temp_override(
        object=obj, active_object=obj, selected_objects=[obj], selected_editable_objects=[obj]
    )


def caja_mundo(objs):
    mins = Vector((math.inf,) * 3)
    maxs = Vector((-math.inf,) * 3)
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mins = Vector(map(min, mins, w))
            maxs = Vector(map(max, maxs, w))
    return mins, maxs


def reducir_caras(objetivo):
    antes = total_caras()
    if antes <= objetivo:
        print(f"  - caras: {antes} (no hace falta reducir)")
        return
    ratio = max(0.02, objetivo / antes)
    for o in mallas():
        mod = o.modifiers.new("Kinchika_Decimate", "DECIMATE")
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        with con_objeto(o):
            bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
            bpy.ops.object.modifier_apply(modifier=mod.name)
    print(f"  - caras: {antes} -> {total_caras()}")


def reducir_texturas(lado_max):
    for img in bpy.data.images:
        if img.size[0] == 0 or img.type != "IMAGE":
            continue
        w, h = img.size
        if max(w, h) <= lado_max:
            continue
        k = lado_max / max(w, h)
        img.scale(max(1, int(w * k)), max(1, int(h * k)))
        img.pack()
        print(f"  - textura {img.name}: {w}x{h} -> {img.size[0]}x{img.size[1]}")


# ─────────────────────────── modelos de prueba ───────────────────────────

def demo_pez():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.5)
    cuerpo = bpy.context.active_object
    cuerpo.scale = (1.0, 0.14, 0.3)  # largo en X, alto en Z (convención Blender)
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.22, depth=0.25, location=(-0.6, 0, 0))
    cola = bpy.context.active_object
    cola.rotation_euler = (0, math.radians(90), 0)
    cola.scale = (1, 0.15, 1)
    cuerpo.name, cola.name = "pez_cuerpo", "pez_cola"


def demo_buzo():
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm = bpy.context.active_object
    arm.name = "Esqueleto"
    bpy.ops.object.mode_set(mode="EDIT")
    b0 = arm.data.edit_bones[0]
    b0.head, b0.tail = (0, 0, 0), (0, 0, 0.9)
    b1 = arm.data.edit_bones.new("piernas")
    b1.head, b1.tail, b1.parent = (0, 0, 0), (0, 0, -0.9), b0
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.18, depth=1.8)
    cuerpo = bpy.context.active_object
    cuerpo.name = "buzo_demo"
    with bpy.context.temp_override(
        object=arm, active_object=arm, selected_objects=[cuerpo, arm], selected_editable_objects=[cuerpo, arm]
    ):
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    # aleteo simple
    arm.animation_data_create()
    accion = bpy.data.actions.new("aleteo")
    arm.animation_data.action = accion
    pb = arm.pose.bones["piernas"]
    pb.rotation_mode = "XYZ"
    for f, ang in ((1, -20), (13, 20), (25, -20)):
        pb.rotation_euler = (math.radians(ang), 0, 0)
        pb.keyframe_insert("rotation_euler", frame=f)
    bpy.context.scene.frame_end = 25


# ─────────────────────────── procesos ───────────────────────────

def preparar_pez(a):
    # quitar esqueletos y animación: la web ondula la cola por shader
    for o in list(bpy.context.scene.objects):
        if o.type == "ARMATURE":
            bpy.data.objects.remove(o, do_unlink=True)
    objs = mallas()
    if not objs:
        raise SystemExit("El archivo no contiene mallas.")
    for o in objs:
        for m in list(o.modifiers):
            if m.type == "ARMATURE":
                o.modifiers.remove(m)
        o.parent = None
    # unir en una sola malla y aplicar transformaciones
    principal = objs[0]
    if len(objs) > 1:
        with bpy.context.temp_override(
            object=principal, active_object=principal, selected_objects=objs, selected_editable_objects=objs
        ):
            bpy.ops.object.join()
    # contexto nuevo: después de unir, los otros objetos ya no existen
    with con_objeto(principal):
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    pez = principal
    pez.name = "pez"

    # orientar el eje más largo hacia X
    mins, maxs = caja_mundo([pez])
    dim = maxs - mins
    eje = max(range(3), key=lambda i: dim[i])
    if eje == 1:
        pez.rotation_euler = (0, 0, math.radians(90))
    elif eje == 2:
        pez.rotation_euler = (0, math.radians(90), 0)
    if a.invertir:
        pez.rotation_euler.z += math.radians(180)
    with con_objeto(pez):
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    pez.location = (0, 0, 0)

    # largo 1
    mins, maxs = caja_mundo([pez])
    largo = max(maxs.x - mins.x, 1e-6)
    pez.scale = (1 / largo,) * 3
    with con_objeto(pez):
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    reducir_caras(a.caras)
    with con_objeto(pez):
        bpy.ops.object.shade_smooth()


def preparar_buzo(a):
    if not mallas():
        raise SystemExit("El archivo no contiene mallas.")
    raices = [o for o in bpy.context.scene.objects if o.parent is None]
    mins, maxs = caja_mundo(mallas())
    alto = max(maxs.z - mins.z, 1e-6)
    k = a.altura / alto
    centro = (mins + maxs) / 2
    for r in raices:
        r.location = (r.location - centro) * k
        r.scale = r.scale * k
    reducir_caras(a.caras)
    acciones = [ac.name for ac in bpy.data.actions]
    print(f"  - animaciones: {', '.join(acciones) if acciones else 'ninguna (el buzo flotará sin animar)'}")


def exportar(a):
    salida = os.path.abspath(a.salida)
    os.makedirs(os.path.dirname(salida), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=salida,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=(a.tipo == "buzo"),
        export_texcoords=True,
        export_normals=True,
    )
    kb = os.path.getsize(salida) / 1024
    print(f"\nOK Exportado: {salida} ({kb:.0f} KB)")
    if a.guardar_blend:
        blend = os.path.splitext(salida)[0] + ".blend"
        bpy.ops.wm.save_as_mainfile(filepath=blend, copy=True)
        print(f"OK Proyecto Blender: {blend}")


def main():
    a = leer_argumentos()
    print(f"\nKinchika · preparando {a.tipo}: {a.entrada}")
    escena_vacia()
    if a.entrada == "demo":
        demo_pez() if a.tipo == "pez" else demo_buzo()
    else:
        if not os.path.exists(a.entrada):
            raise SystemExit(f"No existe el archivo: {a.entrada}")
        importar(a.entrada)
    reducir_texturas(a.textura)
    preparar_pez(a) if a.tipo == "pez" else preparar_buzo(a)
    exportar(a)


if __name__ == "__main__":
    main()
