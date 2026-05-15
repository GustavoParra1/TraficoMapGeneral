const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp({
  credential: applicationDefault(),
  projectId: "trafico-map-general-v2"
});

const uid = 'isB8SwuYeqSZncizuwA783wb6sX2';

getAuth().getUser(uid)
  .then(userRecord => {
    console.log('Custom claims:', userRecord.customClaims);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error obteniendo usuario:', error);
    process.exit(1);
  });