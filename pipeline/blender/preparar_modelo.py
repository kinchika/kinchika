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
    --caras     máximo de caras (por defecto: buzo 16000, pez 1500)
    --altura    largo final del buzo en metros, medido en su dimensión mayor (por defecto 1.8)
    --textura   lado máximo de las texturas en píxeles (por defecto 1024)
    --invertir  gira el pez 180° si quedó mirando hacia atrás
    --voltear   da vuelta el pez si quedó con la panza hacia arriba
    --ancho     ancho mínimo del pez como fracción del largo (ej: 0.13). Algunos modelos
                  son casi planos y de frente se ven como una línea.
    --quitar    nombres (o parte del nombre) de mallas a eliminar, separados por coma
                  (ej: "pPlane" para el plano auxiliar de algunos modelos de Sketchfab)
    --imagen    formato de las texturas en el .glb: JPEG (por defecto, más liviano), WEBP o AUTO
    --rugosidad-min  rugosidad mínima de los materiales del buzo (por defecto 0.45). Los modelos
                  convertidos desde "specular/glossiness" suelen quedar brillantes como plástico.
    --guardar-blend  el .blend se guarda junto al archivo de entrada (pipeline/out), no en public/
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
    p.add_argument("--voltear", action="store_true")
    p.add_argument("--ancho", type=float, default=0.0)
    p.add_argument("--quitar", default="")
    p.add_argument("--rugosidad-min", type=float, default=0.45)
    p.add_argument("--imagen", choices=["AUTO", "JPEG", "WEBP"], default="JPEG")
    p.add_argument("--guardar-blend", action="store_true")
    a = p.parse_args(argv)
    if not a.caras:
        a.caras = 16000 if a.tipo == "buzo" else 1500
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
    # el importador de glTF crea mallas auxiliares ocultas (forma de los huesos) que no son del modelo
    return [o for o in bpy.context.scene.objects
            if o.type == "MESH" and o.visible_get()
            and not any(c.name == "glTF_not_exported" for c in o.users_collection)]


def quitar_mallas(nombres):
    claves = [n.strip().lower() for n in nombres.split(",") if n.strip()]
    for o in list(mallas()):
        if any(k in o.name.lower() for k in claves):
            print(f"  - quitado: {o.name}")
            bpy.data.objects.remove(o, do_unlink=True)


def total_caras():
    return sum(len(o.data.polygons) for o in mallas())


def con_objeto(obj):
    """Contexto con `obj` como objeto activo (para operadores)."""
    return bpy.context.temp_override(
        object=obj, active_object=obj, selected_objects=[obj], selected_editable_objects=[obj]
    )


def caja_mundo(objs):
    # recalcular antes de medir: después de unir o aplicar transformaciones,
    # bound_box y matrix_world pueden quedar desactualizados
    bpy.context.view_layer.update()
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


def _material(nombre, color, rugosidad):
    m = bpy.data.materials.new(nombre)
    m.diffuse_color = color
    if getattr(m, "node_tree", None) is None:  # Blender 4.x; en 5.x el material ya trae nodos
        m.use_nodes = True
    nt = getattr(m, "node_tree", None)
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None) if nt else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = rugosidad
    return m


def demo_buzo():
    """Apneísta de prueba: figura humana simple con traje, máscara, snorkel y aletas largas.
    Desciende cabeza abajo (como en un descenso por la boya) y patalea con las aletas."""
    traje = _material("traje", (0.12, 0.15, 0.2, 1), 0.6)
    aletas = _material("aletas", (0.8, 0.5, 0.05, 1), 0.4)
    mascara = _material("mascara", (0.6, 0.8, 0.9, 1), 0.1)

    # esqueleto (de pie, mirando a −Y; al final se da vuelta cabeza abajo)
    huesos = [  # nombre, inicio, fin, padre
        ("cadera", (0, 0, 0.9), (0, 0, 1.1), None),
        ("torso", (0, 0, 1.1), (0, 0, 1.5), "cadera"),
        ("cabeza", (0, 0, 1.5), (0, 0, 1.85), "torso"),
    ]
    for lado, x in (("L", 1), ("R", -1)):
        huesos += [
            (f"brazo.{lado}", (0.24 * x, 0, 1.45), (0.27 * x, 0, 0.85), "torso"),
            (f"muslo.{lado}", (0.1 * x, 0, 0.9), (0.1 * x, 0, 0.5), "cadera"),
            (f"pierna.{lado}", (0.1 * x, 0, 0.5), (0.1 * x, 0, 0.08), f"muslo.{lado}"),
            (f"aleta.{lado}", (0.1 * x, 0, 0.08), (0.1 * x, 0, -0.62), f"pierna.{lado}"),
        ]
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm = bpy.context.active_object
    arm.name = "Esqueleto"
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    eb.remove(eb[0])
    for nombre, ini, fin, padre in huesos:
        b = eb.new(nombre)
        b.head, b.tail = ini, fin
        if padre:
            b.parent = eb[padre]
    bpy.ops.object.mode_set(mode="OBJECT")

    # cuerpo hecho con primitivas; cada pieza se mueve 100 % con un hueso
    partes = [  # forma, hueso, material, posición, escala (semiejes)
        ("esfera", "cadera", traje, (0, 0, 0.95), (0.17, 0.12, 0.13)),
        ("cilindro", "torso", traje, (0, 0, 1.25), (0.19, 0.13, 0.27)),
        ("esfera", "cabeza", traje, (0, 0, 1.66), (0.11, 0.12, 0.13)),
        ("cubo", "cabeza", mascara, (0, -0.1, 1.68), (0.08, 0.03, 0.04)),
        ("cilindro", "cabeza", aletas, (0.1, 0, 1.8), (0.015, 0.015, 0.12)),
    ]
    for lado, x in (("L", 1), ("R", -1)):
        partes += [
            ("cilindro", f"brazo.{lado}", traje, (0.25 * x, 0, 1.15), (0.05, 0.05, 0.3)),
            ("cilindro", f"muslo.{lado}", traje, (0.1 * x, 0, 0.7), (0.075, 0.075, 0.22)),
            ("cilindro", f"pierna.{lado}", traje, (0.1 * x, 0, 0.29), (0.06, 0.06, 0.22)),
            ("cubo", f"aleta.{lado}", aletas, (0.1 * x, -0.02, -0.25), (0.1, 0.015, 0.36)),
        ]
    piezas = []
    for forma, hueso, mat, pos, esc in partes:
        if forma == "esfera":
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1, location=pos, scale=esc)
        elif forma == "cilindro":
            bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=1, depth=2, location=pos, scale=esc)
        else:
            bpy.ops.mesh.primitive_cube_add(size=2, location=pos, scale=esc)
        o = bpy.context.active_object
        if forma != "cubo":
            with con_objeto(o):
                bpy.ops.object.shade_smooth()
        o.vertex_groups.new(name=hueso).add(range(len(o.data.vertices)), 1.0, "REPLACE")
        o.data.materials.append(mat)
        piezas.append(o)
    cuerpo = piezas[0]
    with bpy.context.temp_override(
        object=cuerpo, active_object=cuerpo, selected_objects=piezas, selected_editable_objects=piezas
    ):
        bpy.ops.object.join()
    with con_objeto(cuerpo):
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    cuerpo.name = "buzo_demo"
    cuerpo.parent = arm
    cuerpo.modifiers.new("Esqueleto", "ARMATURE").object = arm

    # aleteo: piernas alternadas, la aleta acompaña con un poco más de ángulo
    arm.animation_data_create()
    arm.animation_data.action = bpy.data.actions.new("aleteo")
    for f, s in ((1, 1), (13, -1), (25, 1)):
        for lado, x in (("L", 1), ("R", -1)):
            for hueso, ang in (("muslo", 18), ("pierna", 10), ("aleta", 16)):
                pb = arm.pose.bones[f"{hueso}.{lado}"]
                pb.rotation_mode = "XYZ"
                pb.rotation_euler = (math.radians(ang * s * x), 0, 0)
                pb.keyframe_insert("rotation_euler", frame=f)
    bpy.context.scene.frame_end = 25

    # cabeza abajo, como en el descenso, y girado 35° para que en la web se vea de tres cuartos
    arm.rotation_euler = (0, math.pi, math.radians(35))


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
        # sin animación: si no, al recalcular la escena las claves devuelven el giro original
        o.animation_data_clear()
        if o.data.shape_keys:
            o.data.shape_keys.animation_data_clear()
        for m in list(o.modifiers):
            if m.type == "ARMATURE":
                o.modifiers.remove(m)
        # soltar del padre sin perder su posición/giro/escala en el mundo
        mundo = o.matrix_world.copy()
        o.parent = None
        # el importador de glTF deja los objetos en modo cuaternión: rotation_euler no tendría efecto
        o.rotation_mode = "XYZ"
        o.matrix_world = mundo
    # eliminar los vacíos que quedaron (nodos del archivo original)
    for o in list(bpy.context.scene.objects):
        if o.type == "EMPTY":
            bpy.data.objects.remove(o, do_unlink=True)
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
    print(f"  - medidas originales: {dim.x:.2f} x {dim.y:.2f} x {dim.z:.2f} (eje mayor: {'XYZ'[eje]})")
    if eje == 1:
        pez.rotation_euler = (0, 0, math.radians(90))
    elif eje == 2:
        pez.rotation_euler = (0, math.radians(90), 0)
    if a.invertir:
        pez.rotation_euler.z += math.radians(180)
    with con_objeto(pez):
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    # el alto del pez (lomo-vientre) debe quedar en Z: en la web es el eje Y (arriba)
    mins, maxs = caja_mundo([pez])
    dim = maxs - mins
    if dim.y > dim.z:
        pez.rotation_euler = (math.radians(90), 0, 0)
        with con_objeto(pez):
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    if a.voltear:
        pez.rotation_euler = (math.radians(180), 0, 0)
        with con_objeto(pez):
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    with con_objeto(pez):
        bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    pez.location = (0, 0, 0)
    mins, maxs = caja_mundo([pez])
    d = maxs - mins
    print(f"  - medidas (largo X, ancho Y, alto Z): {d.x:.2f} x {d.y:.2f} x {d.z:.2f}")

    # largo 1
    mins, maxs = caja_mundo([pez])
    largo = max(maxs.x - mins.x, 1e-6)
    ancho = (maxs.y - mins.y) / largo
    k_ancho = a.ancho / ancho if a.ancho > ancho > 0 else 1.0
    pez.scale = (1 / largo, k_ancho / largo, 1 / largo)
    if k_ancho != 1.0:
        print(f"  - ancho: {ancho:.3f} -> {a.ancho:.3f} del largo")
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
    # dimensión mayor: un buzo nadando en horizontal es más largo que alto
    largo = max(max(maxs - mins), 1e-6)
    k = a.altura / largo
    centro = (mins + maxs) / 2
    for r in raices:
        r.location = (r.location - centro) * k
        r.scale = r.scale * k
    reducir_caras(a.caras)
    # neopreno, goma y plástico mate: sin brillo de espejo
    for mat in bpy.data.materials:
        if not mat.node_tree:
            continue
        for n in mat.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                r = n.inputs["Roughness"]
                if not r.is_linked and r.default_value < a.rugosidad_min:
                    print(f"  - rugosidad {mat.name}: {r.default_value:.2f} -> {a.rugosidad_min:.2f}")
                    r.default_value = a.rugosidad_min
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
        export_image_format=a.imagen,
    )
    kb = os.path.getsize(salida) / 1024
    print(f"\nOK Exportado: {salida} ({kb:.0f} KB)")
    if a.guardar_blend:
        # nunca dentro de public/: Vite copiaría el .blend (varios MB) al sitio publicado
        carpeta = os.path.dirname(os.path.abspath(a.entrada)) if os.path.exists(a.entrada) else os.path.dirname(salida)
        blend = os.path.join(carpeta, os.path.splitext(os.path.basename(salida))[0] + ".blend")
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
    if a.quitar:
        quitar_mallas(a.quitar)
    reducir_texturas(a.textura)
    preparar_pez(a) if a.tipo == "pez" else preparar_buzo(a)
    exportar(a)


if __name__ == "__main__":
    main()
