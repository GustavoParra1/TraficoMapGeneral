// Script para resetear contraseña en Firebase LAPLATAMAPS
// Usa la API REST de Firebase para resetear la contraseña del usuario admin@laplatamaps.com.ar

// Configuración de LAPLATAMAPS
const laplatamapsConfig = {
  apiKey: "AIzaSyAY2jYGrXdwv3eyH19r8p7sw7iy5V5ApXg",
  authDomain: "laplatamaps-52a3b.firebaseapp.com",
  projectId: "laplatamaps-52a3b",
  storageBucket: "laplatamaps-52a3b.firebasestorage.app",
  messagingSenderId: "9948736453",
  appId: "1:9948736453:web:0f607caf88bb9478bdf9ac"
};

const userEmail = "admin@laplatamaps.com.ar";
const userUid = "Fv9Ye5MpgHXjgEm2o1DB0cDxF053";

async function resetPassword() {
  try {
    console.log("🔐 Conectando a Firebase LAPLATAMAPS...");
    
    // Usar la API REST de Firebase para enviar email de reset
    const resetUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${laplatamapsConfig.apiKey}`;
    
    const response = await fetch(resetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: userEmail
      })
    });
    
    const data = await response.json();
    
    if (data.email) {
      console.log("✅ Email de reset enviado exitosamente a:", userEmail);
      console.log("📧 El usuario recibirá un email para resetear su contraseña");
      console.log("🔗 Link de reset disponible en el email");
    } else {
      console.error("❌ Error:", data.error?.message || "Error desconocido");
    }
    
  } catch (error) {
    console.error("❌ Error en reset de contraseña:", error);
  }
}

console.log("========================================");
console.log("🔧 RESET DE CONTRASEÑA - LAPLATAMAPS");
console.log("========================================");
console.log(`Usuario: ${userEmail}`);
console.log(`UID: ${userUid}`);
console.log("----------------------------------------");

resetPassword();
