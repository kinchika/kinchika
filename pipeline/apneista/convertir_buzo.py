"""
Convierte el buzo autónomo (modelo "Diver" de ucdavisterc, CC BY 4.0) en un apneísta:

  1. Quita el equipo de buceo autónomo: tanque y válvula, chaleco, regulador y boquilla,
     mangueras, manómetro, octopus y snorkel. Se conservan la máscara y su correa.
  2. Alarga las aletas (aletas largas de apnea) escalando los huesos l_fin_1 y r_fin_1
     a lo largo de la aleta, tanto en la pose base como en toda la animación.
  3. Suaviza la flexión de la hoja: la animación original dobla cada segmento de una
     aleta corta; en una larga esa curva se acumula y la punta queda como un gancho.

No usa dependencias: solo Python 3.8 o superior.

Uso (desde la raíz del repo):
    python pipeline/apneista/convertir_buzo.py ENTRADA.glb public/models/apneista.glb

El modelo original ya no está en public/models. Para recuperarlo desde el historial:
    git show 6f1ae14:public/models/buzo.glb > pipeline/out/buzo.glb
"""
import json
import struct
import sys
from array import array

# Partes del mesh "accessories" que se conservan, identificadas por su cantidad de
# triángulos (el modelo trae cada pieza del equipo como un trozo separado).
# Si el modelo de entrada fuera otro, el script se detiene en vez de adivinar.
PIEZAS_ESPERADAS = [940, 600, 600, 420, 364, 226, 224, 160, 128, 96, 48, 20]
CONSERVAR = {364: 'máscara', 128: 'correa de la máscara'}
HUESOS_ALETA = ['l_fin_1_07', 'r_fin_1_067']
LARGO_ALETA = 2.5   # el eje X local del hueso apunta a lo largo de la aleta
# Segmentos de la hoja cuyo doblez se reduce, y cuánto se conserva del doblez original
SEGMENTOS_HOJA = ['_fin_2_', '_fin_3_', '_fin_4_', '_fin_5_']
FLEXION = 0.5


def leer_glb(ruta):
    data = open(ruta, 'rb').read()
    magic, version, _ = struct.unpack('<4sII', data[:12])
    if magic != b'glTF' or version != 2:
        sys.exit('No es un archivo GLB 2.0')
    jlen, jtype = struct.unpack('<I4s', data[12:20])
    gltf = json.loads(data[20:20 + jlen])
    off = 20 + jlen
    blen, btype = struct.unpack('<I4s', data[off:off + 8])
    return gltf, bytearray(data[off + 8:off + 8 + blen])


def escribir_glb(ruta, gltf, binario):
    while len(binario) % 4:
        binario.append(0)
    gltf['buffers'][0]['byteLength'] = len(binario)
    js = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(binario)
    with open(ruta, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<I4s', len(js), b'JSON') + js)
        f.write(struct.pack('<I4s', len(binario), b'BIN\x00') + binario)


TIPOS = {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}
COMPONENTES = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def leer_accessor(gltf, binario, i):
    a = gltf['accessors'][i]
    bv = gltf['bufferViews'][a['bufferView']]
    n = COMPONENTES[a['type']]
    tipo = TIPOS[a['componentType']]
    tam = struct.calcsize(tipo)
    paso = bv.get('byteStride') or n * tam
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    out = []
    for k in range(a['count']):
        out.append(list(struct.unpack_from('<' + tipo * n, binario, base + k * paso)))
    return out


def agregar_datos(gltf, binario, valores, tipo, target=None):
    """Agrega datos al final del binario y devuelve el índice del nuevo bufferView."""
    while len(binario) % 4:
        binario.append(0)
    inicio = len(binario)
    binario.extend(array(tipo, valores).tobytes())
    bv = {'buffer': 0, 'byteOffset': inicio, 'byteLength': len(binario) - inicio}
    if target:
        bv['target'] = target
    gltf['bufferViews'].append(bv)
    return len(gltf['bufferViews']) - 1


def quitar_equipo(gltf, binario):
    prim = None
    for mesh in gltf['meshes']:
        for p in mesh['primitives']:
            if gltf['materials'][p['material']].get('name') == 'accessories_diff':
                prim = p
    if prim is None:
        sys.exit('No se encontró el mesh del equipo (material "accessories_diff")')

    pos = leer_accessor(gltf, binario, prim['attributes']['POSITION'])
    idx = [v[0] for v in leer_accessor(gltf, binario, prim['indices'])]
    tris = [idx[k:k + 3] for k in range(0, len(idx), 3)]

    # piezas = grupos de triángulos conectados (uniendo vértices en la misma posición)
    padre = list(range(len(pos)))

    def raiz(x):
        while padre[x] != x:
            padre[x] = padre[padre[x]]
            x = padre[x]
        return x

    vistos = {}
    for v, p in enumerate(pos):
        clave = tuple(round(c, 4) for c in p)
        if clave in vistos:
            padre[raiz(v)] = raiz(vistos[clave])
        else:
            vistos[clave] = v
    for a, b, c in tris:
        r = raiz(a)
        padre[raiz(b)] = r
        padre[raiz(c)] = r

    piezas = {}
    for t in tris:
        piezas.setdefault(raiz(t[0]), []).append(t)
    tamanos = sorted((len(p) for p in piezas.values()), reverse=True)
    if tamanos != PIEZAS_ESPERADAS:
        sys.exit(f'El modelo no es el esperado. Piezas encontradas: {tamanos}')

    nuevos = [v for p in piezas.values() if len(p) in CONSERVAR for t in p for v in t]
    acc = gltf['accessors'][prim['indices']]
    tipo = 'I' if acc['componentType'] == 5125 else 'H'
    acc['bufferView'] = agregar_datos(gltf, binario, nuevos, tipo, target=34963)
    acc['byteOffset'] = 0
    acc['count'] = len(nuevos)
    acc.pop('min', None)
    acc.pop('max', None)
    print(f'Equipo: se conservan {", ".join(CONSERVAR.values())}; '
          f'{len(tris) - len(nuevos) // 3} de {len(tris)} triángulos eliminados')


def alargar_aletas(gltf, binario):
    nombres = [n.get('name') for n in gltf['nodes']]
    for hueso in HUESOS_ALETA:
        if hueso not in nombres:
            sys.exit(f'No se encontró el hueso {hueso}')
        nodo = gltf['nodes'][nombres.index(hueso)]
        escala = nodo.get('scale', [1, 1, 1])
        nodo['scale'] = [escala[0] * LARGO_ALETA, escala[1], escala[2]]

    for anim in gltf.get('animations', []):
        for canal in anim['channels']:
            t = canal['target']
            if t['path'] != 'scale' or nombres[t['node']] not in HUESOS_ALETA:
                continue
            sampler = anim['samplers'][canal['sampler']]
            valores = leer_accessor(gltf, binario, sampler['output'])
            planos = [c for v in valores for c in (v[0] * LARGO_ALETA, v[1], v[2])]
            viejo = gltf['accessors'][sampler['output']]
            nuevo = {'bufferView': agregar_datos(gltf, binario, planos, 'f'),
                     'componentType': 5126, 'count': viejo['count'], 'type': 'VEC3'}
            gltf['accessors'].append(nuevo)
            sampler['output'] = len(gltf['accessors']) - 1
    print(f'Aletas: {LARGO_ALETA:g} veces más largas ({", ".join(HUESOS_ALETA)})')


def slerp(q0, q1, t):
    """Interpolación esférica entre dos cuaterniones [x, y, z, w]."""
    import math
    d = sum(a * b for a, b in zip(q0, q1))
    if d < 0:
        q1, d = [-c for c in q1], -d
    if d > 0.9995:
        r = [a + (b - a) * t for a, b in zip(q0, q1)]
    else:
        th = math.acos(min(1.0, d))
        s = math.sin(th)
        r = [a * math.sin((1 - t) * th) / s + b * math.sin(t * th) / s for a, b in zip(q0, q1)]
    n = math.sqrt(sum(c * c for c in r))
    return [c / n for c in r]


def suavizar_flexion(gltf, binario):
    nombres = [n.get('name') or '' for n in gltf['nodes']]
    total = 0
    for anim in gltf.get('animations', []):
        for canal in anim['channels']:
            t = canal['target']
            nombre = nombres[t['node']]
            if t['path'] != 'rotation' or not any(s in nombre for s in SEGMENTOS_HOJA):
                continue
            reposo = gltf['nodes'][t['node']].get('rotation', [0, 0, 0, 1])
            sampler = anim['samplers'][canal['sampler']]
            valores = leer_accessor(gltf, binario, sampler['output'])
            planos = [c for q in valores for c in slerp(reposo, q, FLEXION)]
            viejo = gltf['accessors'][sampler['output']]
            nuevo = {'bufferView': agregar_datos(gltf, binario, planos, 'f'),
                     'componentType': 5126, 'count': viejo['count'], 'type': 'VEC4'}
            gltf['accessors'].append(nuevo)
            sampler['output'] = len(gltf['accessors']) - 1
            total += 1
    print(f'Flexión de la hoja: {total} segmentos al {FLEXION:.0%} del doblez original')


def compactar(gltf, binario):
    """Reescribe el binario solo con los bufferViews que se siguen usando."""
    usados = {a['bufferView'] for a in gltf['accessors'] if 'bufferView' in a}
    usados |= {img['bufferView'] for img in gltf.get('images', []) if 'bufferView' in img}
    nuevo, mapa, vistas = bytearray(), {}, []
    for i, bv in enumerate(gltf['bufferViews']):
        if i not in usados:
            continue
        while len(nuevo) % 4:
            nuevo.append(0)
        ini = bv.get('byteOffset', 0)
        trozo = binario[ini:ini + bv['byteLength']]
        bv = dict(bv, byteOffset=len(nuevo))
        nuevo.extend(trozo)
        mapa[i] = len(vistas)
        vistas.append(bv)
    gltf['bufferViews'] = vistas
    for a in gltf['accessors']:
        if 'bufferView' in a:
            a['bufferView'] = mapa[a['bufferView']]
    for img in gltf.get('images', []):
        if 'bufferView' in img:
            img['bufferView'] = mapa[img['bufferView']]
    return nuevo


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    entrada, salida = sys.argv[1], sys.argv[2]
    gltf, binario = leer_glb(entrada)
    quitar_equipo(gltf, binario)
    alargar_aletas(gltf, binario)
    suavizar_flexion(gltf, binario)
    binario = compactar(gltf, binario)
    escribir_glb(salida, gltf, binario)
    print(f'Listo: {salida}')


if __name__ == '__main__':
    main()
