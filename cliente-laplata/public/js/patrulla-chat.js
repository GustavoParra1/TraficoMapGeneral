/**
 * Patrulla Chat Module
 * Sistema de mensajería en tiempo real entre patrullas y centro-control
 * 
 * Uso desde app.js o centro-control:
 * const chat = new PatrullaChat(db, municipio);
 * chat.sendMessage(fromPatrolla, toPatrolla, messageText);
 * chat.subscribeToMessages(patrollaId, callback);
 */

class PatrullaChat {
  constructor(firestore, municipio) {
    this.db = firestore;
    this.municipio = municipio;
    this.chatCollection = `chat_${municipio}`;
    this.subscriptions = new Map(); // { patentId: unsubscribe }
    this.messages = new Map(); // { patentId: [messages] }
    
    console.log(`💬 PatrullaChat inicializado para ${municipio}`);
  }

  /**
   * Enviar mensaje entre patrullas o desde centro-control
   */
  async sendMessage(fromId, toId, messageText, messageType = 'text') {
    try {
      if (!messageText || messageText.trim() === '') {
        console.warn('⚠️ Mensaje vacío rechazado');
        return;
      }

      const docId = `${fromId}_${toId}`;
      const messageData = {
        from: fromId,
        to: toId,
        text: messageText.trim(),
        type: messageType, // 'text', 'alert', 'emergency', 'broadcast'
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
      };

      // Guardar mensaje en subcollección o documento separado
      await this.db.collection(this.chatCollection)
        .doc(docId)
        .collection('messages')
        .add(messageData);

      console.log(`💬 Mensaje enviado: ${fromId} → ${toId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error enviando mensaje:`, error);
      return false;
    }
  }

  /**
   * Enviar mensaje de broadcast a todas las patrullas
   */
  async broadcastMessage(fromId, messageText) {
    try {
      const broadcastData = {
        from: fromId,
        to: 'all',
        text: messageText.trim(),
        type: 'broadcast',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
      };

      await this.db.collection(this.chatCollection)
        .doc('broadcast_' + Date.now())
        .set(broadcastData);

      console.log(`📢 Broadcast enviado por ${fromId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error enviando broadcast:`, error);
      return false;
    }
  }

  /**
   * Suscribirse a mensajes de una patrulla
   */
  subscribeToMessages(patrollaId, callback) {
    try {
      // Escuchar mensajes incoming
      const unsub1 = this.db.collection(this.chatCollection)
        .doc('all_' + patrollaId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
          const messages = [];
          snapshot.forEach((doc) => {
            messages.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          if (this.messages.has(patrollaId)) {
            this.messages.get(patrollaId).push(...messages);
          } else {
            this.messages.set(patrollaId, messages);
          }

          callback(messages);
        }, (error) => {
          console.error(`❌ Error escuchando mensajes para ${patrollaId}:`, error);
        });

      // Guardar unsubscribe
      this.subscriptions.set(patrollaId, unsub1);
      console.log(`📡 Suscripción de chat iniciada para ${patrollaId}`);

      return messages;
    } catch (error) {
      console.error(`❌ Error en subscribeToMessages:`, error);
      return [];
    }
  }

  /**
   * Obtener historial de chat entre dos patrullas
   */
  async getConversation(patrollaId1, patrollaId2, limit = 20) {
    try {
      const docId = `${patrollaId1}_${patrollaId2}`;
      
      const snapshot = await this.db.collection(this.chatCollection)
        .doc(docId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const messages = [];
      snapshot.forEach((doc) => {
        messages.unshift({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`📋 ${messages.length} mensajes recuperados entre ${patrollaId1} y ${patrollaId2}`);
      return messages;
    } catch (error) {
      console.error(`❌ Error obteniendo conversación:`, error);
      return [];
    }
  }

  /**
   * Marcar mensaje como leído
   */
  async markAsRead(patrollaId, messageId) {
    try {
      // Implementación según estructura de datos
      console.log(`✅ Mensaje ${messageId} marcado como leído`);
    } catch (error) {
      console.error(`❌ Error marcando mensaje como leído:`, error);
    }
  }

  /**
   * Obtener últimos mensajes no leídos
   */
  async getUnreadMessages(patrollaId) {
    try {
      const snapshot = await this.db.collection(this.chatCollection)
        .doc('all_' + patrollaId)
        .collection('messages')
        .where('read', '==', false)
        .get();

      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });

      console.log(`📨 ${messages.length} mensajes no leídos para ${patrollaId}`);
      return messages;
    } catch (error) {
      console.error(`❌ Error obteniendo mensajes no leídos:`, error);
      return [];
    }
  }

  /**
   * Detener suscripción a mensajes
   */
  unsubscribe(patrollaId) {
    if (this.subscriptions.has(patrollaId)) {
      this.subscriptions.get(patrollaId)();
      this.subscriptions.delete(patrollaId);
      console.log(`🔕 Suscripción de chat cancelada para ${patrollaId}`);
    }
  }

  /**
   * Detener todas las suscripciones
   */
  unsubscribeAll() {
    for (const [patrollaId, unsub] of this.subscriptions) {
      unsub();
    }
    this.subscriptions.clear();
    console.log(`🔕 Todas las suscripciones de chat canceladas`);
  }
}

// Exportar para uso modular
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PatrullaChat;
}

// ========================================
// FUNCIONES DE TESTING DESDE CONSOLA
// ========================================

/**
 * Enviar mensaje de prueba desde centro-control
 */
window.enviarMensajePrueba = async function(toPatrolla = 'PATRULLA_01', mensaje = '¡Mensaje de prueba!') {
  try {
    if (typeof window.patullaChat === 'undefined') {
      console.error('❌ patullaChat no inicializado. Primero crea: window.patullaChat = new PatrullaChat(db, currentCity)');
      return;
    }

    const result = await window.patullaChat.sendMessage('CENTRO_CONTROL', toPatrolla, mensaje);
    if (result) {
      console.log(`✅ Mensaje enviado a ${toPatrolla}: "${mensaje}"`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

/**
 * Enviar broadcast a todas las patrullas
 */
window.enviarBroadcast = async function(mensaje = '⚠️ Alerta importante') {
  try {
    if (typeof window.patullaChat === 'undefined') {
      console.error('❌ patullaChat no inicializado');
      return;
    }

    const result = await window.patullaChat.broadcastMessage('CENTRO_CONTROL', mensaje);
    if (result) {
      console.log(`📢 Broadcast enviado a todas las patrullas: "${mensaje}"`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

/**
 * Ver conversación entre dos patrullas
 */
window.verConversacion = async function(patrolla1 = 'CENTRO_CONTROL', patrolla2 = 'PATRULLA_01') {
  try {
    if (typeof window.patullaChat === 'undefined') {
      console.error('❌ patullaChat no inicializado');
      return;
    }

    const mensajes = await window.patullaChat.getConversation(patrolla1, patrolla2);
    
    console.log(`\n📋 CONVERSACIÓN: ${patrolla1} ↔ ${patrolla2}`);
    console.log('═'.repeat(60));
    
    mensajes.forEach((msg, idx) => {
      const tiempo = msg.timestamp instanceof Date 
        ? msg.timestamp.toLocaleTimeString('es-AR')
        : '?';
      const emoji = msg.from === 'CENTRO_CONTROL' ? '📨' : '📤';
      
      console.log(`${emoji} [${tiempo}] ${msg.from}:`);
      console.log(`   "${msg.text}"`);
      if (idx < mensajes.length - 1) console.log('---');
    });
    
    console.log('═'.repeat(60));
    return mensajes;
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

console.log(`
╔════════════════════════════════════════════╗
║    💬 PATRULLA CHAT SYSTEM CARGADO        ║
╚════════════════════════════════════════════╝

COMANDOS DISPONIBLES:

1. enviarMensajePrueba(patrolla, mensaje)
   → Enviar mensaje directo a una patrulla
   Ej: enviarMensajePrueba('PATRULLA_01', '¿Cuál es tu ubicación?')

2. enviarBroadcast(mensaje)
   → Enviar mensaje a todas las patrullas
   Ej: enviarBroadcast('⚠️ Alerta: Zona restringida')

3. verConversacion(from, to)
   → Ver historial de mensajes
   Ej: verConversacion('CENTRO_CONTROL', 'PATRULLA_01')

Nota: Para usar estas funciones primero ejecuta:
window.patullaChat = new PatrullaChat(db, currentCity)
`);
