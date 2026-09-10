"""
generar_geojson_por_barrio.py
==============================
Lee SINIESTROS.csv (toda la ciudad) y genera un archivo .geojson SEPARADO
por cada barrio que ya tiene cliente creado — así cada mapa carga solo sus
propios siniestros en vez de los 4318 de toda Mar del Plata.

Qué hace:
  1. Lee el CSV completo (4318 filas).
  2. Normaliza el valor de la columna BARRIOS agrupando las variantes
     obvias (typos, acentos rotos, mayúsculas/minúsculas) usando
     GRUPOS_BARRIO abajo — cubre TODAS las 142 variantes encontradas en
     el CSV, agrupadas en sus barrios reales.
  3. Cualquier valor de barrio que no esté contemplado en GRUPOS_BARRIO
     (no debería pasar, pero por las dudas) cae en SIN_CLIENTE.geojson.
  4. Geocodifica cada dirección única con Google Geocoding API (con
     cache, para no pedir la misma dirección dos veces).
  5. Escribe un archivo <barrio>.geojson por cada barrio, con LAS MISMAS
     claves de propiedades que ya usa tu geojson actual (incluyendo los
     nombres con la codificación rota, para que sea compatible con lo
     que ya subís hoy a mano).

Uso:
    pip install requests
    python generar_geojson_por_barrio.py
"""

import csv
import json
import re
import time
import unicodedata

import requests

RUTA_CSV = "./SINIESTROS.csv"
GOOGLE_GEOCODING_API_KEY = "AIzaSyBp2ZiKA4lYieyjX_aJJjE023NeqKrRhJc"
CARPETA_SALIDA = "./geojson_por_barrio"

# ------------------------------------------------------------
# Agrupamiento COMPLETO de las 142 variantes de barrio encontradas en el
# CSV (typos, acentos rotos por la codificación, mayúsculas/minúsculas)
# en sus ~100 barrios reales. Cubre las 4318 filas — no solo los barrios
# que ya tienen cliente creado.
#
# Ojo con estos casos que quedaron A PROPÓSITO sin agrupar entre sí,
# porque son ambiguos o podrían ser barrios oficiales distintos:
#   - "Camet", "Alto Camet", "Félix U. Camet" y "Parque Camet" quedan
#     como 4 grupos separados (decisión tomada explícitamente).
#   - "El Grosellar"/"Grosellar" quedan aparte de "Parque Camet" y de
#     cualquier "Montemar" (no confirmado que sean el mismo barrio).
#   - "Cerrito S" / "VCerrito S" (truncados) quedan en su propio grupo,
#     separados de "Cerrito Sur" y "Cerrito San Salvador" (no se sabe
#     cuál de los dos es realmente).
# ------------------------------------------------------------
GRUPOS_BARRIO = {
    "9_de_julio": ["9 de Julio", "Nueve de Julio"],
    "acantilados": ["Acantilados", "Los Acantilados"],
    "aeroparque": ["Aeroparque"],
    "alfar": ["Alfar"],
    "alto_camet": ["Alto Camet"],
    "autodromo": ["Autodromo"],
    "av_colon_e_italia": ["Av. Col\ufffdn e Italia"],
    "colina_alegre": ["Barrio Colina alegre", "Barrio Colinalegre"],
    "batan": ["Batan", "Bat\ufffdn"],
    "belisario_roldan": ["Belisario Roldan"],
    "bernardino_rivadavia": ["Bernardino Rivadavia"],
    "bosque_alegre": ["Bosque  Alegre", "Bosque Alegre"],
    "bosque_grande": ["Bosque Grande", "Bosque Grande "],
    "bosque_peralta_ramos": ["Bosque Peralta Ramos"],
    "caisamar": ["Caisamar"],
    "camet": ["Camet"],
    "centro": ["Centro", "centro"],
    "cerrito_s_ambiguo": ["Cerrito S", "VCerrito S"],
    "cerrito_san_salvador": ["Cerrito San Salvador"],
    "cerrito_sur": ["Cerrito Sur"],
    "colinas_peralta_ramos": ["Colinas Peralta Ramos"],
    "constitucion": ["Constituci\u00f3n", "Constituci\ufffdn"],
    "coronel_dorrego": ["Coronel Dorrego"],
    "divino_rostro": ["Divino Rostro"],
    "don_bosco": ["Don Bosco"],
    "don_emilio": ["Don Emilio"],
    "el_colmenar": ["El Colmenar"],
    "el_gaucho": ["El Gaucho"],
    "el_grosellar": ["El Grosellar", "Grosellar"],
    "el_jardin_stella_maris": ["El Jard\ufffdn Stella Maris"],
    "el_martillo": ["El Martillo"],
    "el_progreso": ["El Progreso"],
    "el_retazo": ["El Retazo"],
    "estacion_norte": ["Estaci\ufffdn Norte"],
    "faro_norte": ["Faro Norte"],
    "felix_u_camet": ["F\ufffdlix U. Camet"],
    "florencio_sanchez": ["Florencio Sanchez", "Florencio S\u00e1nchez", "Florencio S\ufffdnchez"],
    "florentino_ameghino": ["Florentino Ameghino"],
    "fortunato_de_la_plaza": ["Fortunato de la Plaza"],
    "general_belgrano": ["General Belgrano"],
    "general_pueyrredon": ["General Pueyrredon", "General Pueyrred\u00f3n", "General Pueyrred\ufffdn"],
    "general_roca": ["General Roca"],
    "general_san_martin": ["General San Mart\ufffdn"],
    "hipodromo": ["Hipodromo", "Hip\ufffddromo"],
    "jardin_peralta_ramos": ["Jardin de Peralta Ramos", "Jard\u00edn Peralta Ramos", "Jard\ufffdn Peralta Ramos", "Jard\ufffdn de Peralta Ramos"],
    "jorge_newbery": ["Jorge Newbery"],
    "jose_hernandez": ["Jose Hernandez"],
    "juramento": ["Juramento"],
    "la_florida": ["La Florida"],
    "la_perla": ["La Perla"],
    "las_americas": ["Las Amarices", "Las Americas", "Las Am\u00e9ricas", "Las Am\ufffdricas"],
    "las_avenidas": ["Las Avenidas"],
    "las_canteras": ["Las Canteras"],
    "las_dos_marias": ["Las Dos Marias", "Las Dos Mar\u00edas", "Las Dos Mar\ufffdas"],
    "las_heras": ["Las Heras"],
    "las_lilas": ["Las Lilas"],
    "libertad": ["Libertad"],
    "los_pinares": ["Los Pinares", "Loa Pinares"],
    "lomas_de_stella_maris": ["Lomas de Stella Maris"],
    "lomas_del_golf": ["Lomas del Golf"],
    "lopez_de_gomara": ["Lopez de Gomara"],
    "los_andes": ["Los Andes"],
    "los_tilos": ["Los Tilos"],
    "los_troncos": ["Los Troncos"],
    "macrocentro": ["Macrocentro"],
    "malvinas_argentinas": ["Malvinas Argentinas"],
    "nuevo_golf": ["Nuevo Golf"],
    "parque_independencia": ["Parque Independencia"],
    "parque_luro": ["Parque  Luro", "Parque Luro"],
    "parque_camet": ["Parque Camet"],
    "parque_palermo": ["Parque Palermo"],
    "parque_pena": ["Parque Pe\ufffda"],
    "peralta_ramos_oeste": ["Peralta Ramos Oeste"],
    "pinos_de_anchorena": ["Pinos de Anchorena"],
    "playa_grande": ["Playa Grande"],
    "playa_serena": ["Playa Serena"],
    "plaza_mitre": ["Plaza Mitre"],
    "primera_junta": ["Primera Junta"],
    "puerto": ["Puerto"],
    "punta_mogotes": ["Punta Mogotes"],
    "regional": ["Regional"],
    "rumenco": ["Rumenco"],
    "san_antonio": ["San Antonio"],
    "san_carlos": ["San Carlos"],
    "san_cayetano": ["San Cayetano"],
    "san_jacinto": ["San Jacinto"],
    "san_jorge": ["San Jorge"],
    "san_jose": ["San Jose", "San Jos\u00e9", "San Jos\ufffd"],
    "san_juan": ["San Juan"],
    "san_martin": ["San Mart\ufffdn"],
    "san_patricio": ["San Patricio"],
    "san_salvador": ["San Salvador"],
    "santa_celina": ["Santa Celina"],
    "santa_monica": ["Santa Monica", "Santa M\u00f3nica", "Santa M\ufffdnica"],
    "santa_rita": ["Santa Rita"],
    "santa_rosa_de_lima": ["Santa Rosa de Lima"],
    "santa_rosa_del_mar": ["Santa Rosa del Mar"],
    "sarmiento": ["Sarmiento"],
    "sierra_de_los_padres": ["Sierra de Los Padres"],
    "termas_huinco": ["Termas Huinc", "Termas Huinco", "Termas Huinc\u00f3", "Termas Huinc\u00f3 ", "Termas Huinc\ufffd", "Termas Huinc\ufffd "],
    "vieja_terminal": ["Vieja Terminal"],
    "villa_evita": ["Villa Evita"],
    "villa_lourdes": ["Vila Lourdes", "Villa Lourdes"],
    "villa_primera": ["Villa Primera"],
    "virgen_de_lujan": ["Virgen de Lujan"],
    "zacagnini": ["Zacagnini"],
    "pompeya": ["Nueva Pompeya"],
}

# Reverse lookup: barrio_raw (tal cual aparece en el CSV, sin normalizar)
# -> nombre canónico de barrio.
ALIAS_BARRIO_EXACTO = {
    variante: canonico
    for canonico, variantes in GRUPOS_BARRIO.items()
    for variante in variantes
}

# 🎯 Por ahora, generar archivo SOLO para los barrios que YA tienen
# cliente creado (el resto de GRUPOS_BARRIO sirve para no perder ningún
# typo/variante en el conteo, pero no se escribe archivo para ellos).
BARRIOS_CON_CLIENTE = {
    "constitucion",
    "parque_luro",
    "zacagnini",
    "caisamar",
    "aeroparque",
    "los_pinares",
    "parque_camet",
    "centro",
    "don_bosco",
    "la_perla",
    "peralta_ramos_oeste",
    "pompeya",
    "san_juan",
    "villa_primera",
}


def normalizar(texto):
    if texto is None:
        return ""
    texto = str(texto).strip().lower()
    texto = texto.replace("\ufffd", "")  # sacar el caracter de reemplazo roto
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", texto).strip()


_cache_geocode = {}


MAX_REINTENTOS = 4  # total de intentos = 1 + MAX_REINTENTOS
ESPERA_BASE_SEG = 1.5  # backoff exponencial: 1.5s, 3s, 6s, 12s...


def geocodificar(direccion, barrio):
    consulta = f"{direccion}, {barrio}, Mar del Plata, Buenos Aires, Argentina"
    clave = normalizar(consulta)
    if clave in _cache_geocode:
        return _cache_geocode[clave]

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    resultado = None

    for intento in range(1, MAX_REINTENTOS + 2):  # 1..(MAX_REINTENTOS+1)
        try:
            resp = requests.get(url, params={"address": consulta, "key": GOOGLE_GEOCODING_API_KEY}, timeout=15)
            data = resp.json()
            estado = data.get("status")

            if estado == "OK" and data.get("results"):
                loc = data["results"][0]["geometry"]["location"]
                resultado = (loc["lng"], loc["lat"])  # GeoJSON usa [lng, lat]
                break

            # ZERO_RESULTS / INVALID_REQUEST no se arreglan reintentando
            if estado in ("ZERO_RESULTS", "INVALID_REQUEST", "REQUEST_DENIED"):
                print(f"  ⚠️  Geocoding falló para \"{consulta}\": {estado}")
                break

            # OVER_QUERY_LIMIT / UNKNOWN_ERROR sí conviene reintentar
            if intento <= MAX_REINTENTOS:
                espera = ESPERA_BASE_SEG * (2 ** (intento - 1))
                print(f"  ⏳ {estado} en \"{consulta}\" — reintento {intento}/{MAX_REINTENTOS} en {espera:.1f}s")
                time.sleep(espera)
                continue
            else:
                print(f"  ⚠️  Geocoding falló para \"{consulta}\" tras {intento} intentos: {estado}")

        except Exception as e:
            if intento <= MAX_REINTENTOS:
                espera = ESPERA_BASE_SEG * (2 ** (intento - 1))
                print(f"  ⏳ Error de red en \"{consulta}\" — reintento {intento}/{MAX_REINTENTOS} en {espera:.1f}s ({e})")
                time.sleep(espera)
                continue
            else:
                print(f"  ⚠️  Error de red geocodificando \"{consulta}\" tras {intento} intentos: {e}")

    _cache_geocode[clave] = resultado
    time.sleep(0.12)
    return resultado


def leer_filas():
    with open(RUTA_CSV, encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        filas = [r for r in reader if len(r) >= 10]
    return header, filas


def main():
    if GOOGLE_GEOCODING_API_KEY == "PONÉ_ACÁ_TU_API_KEY":
        print("❌ Editá GOOGLE_GEOCODING_API_KEY arriba en el script antes de correrlo.")
        return

    import os
    os.makedirs(CARPETA_SALIDA, exist_ok=True)

    header, filas = leer_filas()
    print(f"📄 {len(filas)} fila(s) leídas del CSV.\n")

    # columnas por posición (los nombres vienen con la codificación rota,
    # así que es más confiable ir por índice — ver el orden real arriba):
    # 0=N° ORDEN, 1=N° CÁMARA, 2=BARRIOS, 3=SINIESTRO,
    # 4=DIRECCIÓN SINIESTRO, 5=FECHA, 6=HORA, 7=CÓDIGO PARTICIPANTES,
    # 8=CÓDIGOS CAUSAS, 9=SEMÁFOROS

    grupos = {}            # nombre_canonico -> [feature, ...]
    sin_cliente_count = 0  # filas de barrios sin cliente todavia (no se geocodifican, para no gastar API de arriba)
    no_reconocido = []     # valores de BARRIOS que ni siquiera están en GRUPOS_BARRIO (no debería pasar)
    sin_geocodificar = []

    for i, fila in enumerate(filas, start=1):
        barrio_raw = fila[2].strip()
        direccion = fila[4].strip()
        canonico = ALIAS_BARRIO_EXACTO.get(barrio_raw)

        if canonico is None:
            no_reconocido.append(barrio_raw)
            continue

        if canonico not in BARRIOS_CON_CLIENTE:
            sin_cliente_count += 1
            continue  # no gastamos geocodificación en barrios sin cliente todavía

        coords = geocodificar(direccion, barrio_raw)
        if coords is None:
            sin_geocodificar.append((barrio_raw, direccion))
            continue

        feature = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [coords[0], coords[1]]},
            "properties": {
                "N\ufffd ORDEN": int(fila[0]) if fila[0].isdigit() else fila[0],
                "N\ufffd C\ufffdMARA": fila[1],
                "BARRIOS": barrio_raw,
                "SINIESTRO": int(fila[3]) if fila[3].isdigit() else fila[3],
                "DIRECCI\ufffdN SINIESTRO": direccion,
                "FECHA": fila[5],
                "HORA": fila[6],
                "C\ufffdDIGO PARTICIPANTES": fila[7],
                "C\ufffdDIGOS CAUSAS": fila[8],
                "SEM\ufffdFOROS": fila[9],
            }
        }

        grupos.setdefault(canonico, []).append(feature)

        if i % 200 == 0:
            print(f"  ...procesadas {i}/{len(filas)} filas")

    print(f"\n📊 Resumen:")
    for nombre, features in sorted(grupos.items()):
        print(f"   {nombre}: {len(features)} siniestro(s)")
    print(f"   ⏭️  Sin cliente todavía (no procesados, no gastaron geocodificación): {sin_cliente_count}")
    if no_reconocido:
        valores = sorted(set(no_reconocido))
        print(f"   ⚠️  Valores de BARRIOS no reconocidos en absoluto ({len(no_reconocido)} fila(s)): {valores}")
    if sin_geocodificar:
        print(f"   ⚠️  Sin geocodificar: {len(sin_geocodificar)} fila(s)")

    for nombre, features in grupos.items():
        geojson = {"type": "FeatureCollection", "features": features}
        ruta = f"{CARPETA_SALIDA}/{nombre}.geojson"
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(geojson, f, ensure_ascii=False)
        print(f"   💾 {ruta} ({len(features)} features)")

    if sin_geocodificar:
        print("\n   Direcciones que no se pudieron geocodificar (revisar a mano):")
        for barrio, direccion in sin_geocodificar[:30]:
            print(f"     - \"{direccion}\" ({barrio})")
        if len(sin_geocodificar) > 30:
            print(f"     ... y {len(sin_geocodificar) - 30} más.")

    print(f"\n✅ Listo. Archivos en {CARPETA_SALIDA}/")


if __name__ == "__main__":
    main()
