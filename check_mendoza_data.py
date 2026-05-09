import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred, {'projectId': 'trafico-map-general-v2'})
db = firestore.client()

# Ver qué hay en Mendoza
siniestros = db.collection('clientes').document('mendoza-2').collection('siniestros').get()
print(f'Siniestros en Mendoza: {len(list(siniestros))}')

for doc in siniestros:
    data = doc.data()
    print(f'  {doc.id}: lat={data.get("lat")}, lng={data.get("lng")}')
    print(f'    Datos: {data}')
