import pandas as pd
import os

# Diccionario de mapeo resultado → código
CODIGOS = {
    'asiste policía y libera': 'APL',
    'asiste policia y libera': 'APL',
    'hallazgo de automotor': 'HA',
    'recuperado': 'HA',
    'intervención policial': 'PD',
    'intervencion policial': 'PD',
    'persecución y detención': 'PD',
    'persecucion y detencion': 'PD',
    'detención': 'D',
    'detencion': 'D',
    'seguimiento del evento': 'SE',
    'no asiste': 'NA',
    'sin recurso policial': 'NA',
    'secuestro de vehículo': 'SV',
    'secuestro de vehiculo': 'SV',
    'asiste bomberos': 'AB',
    'persecución y pérdida': 'PP',
    'persecucion y perdida': 'PP',
    'asiste unidad sanitaria': 'AUS',
    'otros': 'OT',
}

def normaliza(texto):
    return str(texto).lower().replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u').replace('ü','u').replace('ñ','n').strip()

def asigna_codigo(resultado):
    norm = normaliza(resultado)
    for key in CODIGOS:
        if key in norm:
            return CODIGOS[key]
    return 'OT'

if __name__ == '__main__':
    # Cambia el path al archivo que uses realmente
    archivo = r'c:/Users/gparra/TraficoMapGeneral/public/data/robos_final.csv'
    df = pd.read_csv(archivo)
    df['codigo'] = df['resultado'].apply(asigna_codigo)
    df.to_csv(archivo, index=False)
    print('✅ Columna codigo agregada y completada en', archivo)
