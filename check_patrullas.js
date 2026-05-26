const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkPatrullas() {
  const cities = ["mardelplata", "cordoba"];
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  for (const city of cities) {
    console.log(`--- Checking patrullas_${city} ---`);
    const snapshot = await db.collection(`patrullas_${city}`)
      .where("online", "==", true)
      .limit(3)
      .get();

    if (snapshot.empty) {
      console.log(`No active patrols (online=true) found in patrullas_${city}.`);
      continue;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const lastUpdate = data.timestamp ? data.timestamp.toDate() : "N/A";
      const isRecent = lastUpdate !== "N/A" && lastUpdate > fiveMinutesAgo;
      
      console.log(`Document ID: ${doc.id}`);
      console.log(`  Lat: ${data.lat}, Lng: ${data.lng}, Speed: ${data.speed}, Online: ${data.online}`);
      console.log(`  Last Update: ${lastUpdate} ${isRecent ? "(RECENT)" : "(OLD)"}`);
      
      if (!data.lat || !data.lng || data.speed === undefined || data.online !== true) {
         console.warn("  WARNING: Document missing required fields or online is not true.");
      }
    });
  }
  process.exit(0);
}

checkPatrullas().catch(err => {
  console.error(err);
  process.exit(1);
});
