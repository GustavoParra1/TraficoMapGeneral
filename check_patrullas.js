import admin from "firebase-admin";
import { readFileSync } from "fs";
const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function run() {
  console.log("--- Patrullas in clientes/laplata/patrullas ---");
  const patrullasSnapshot = await db.collection("clientes/laplata/patrullas").get();
  patrullasSnapshot.forEach(doc => {
    const data = doc.data();
    console.log("ID: " + doc.id + ", DisplayName: " + (data.displayName || data.nombre || "N/A"));
  });

  console.log("\n--- Auth User Search ---");
  const emailToFind = "patrulla_070@seguridad.com";
  try {
    const userRecord = await auth.getUserByEmail(emailToFind);
    console.log("Found User: " + userRecord.uid + ", Email: " + userRecord.email);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.log("User with email " + emailToFind + " not found in Auth.");
    } else {
      console.error("Error fetching user:", error);
    }
  }
}

run().then(() => process.exit()).catch(err => { console.error(err); process.exit(1); });
