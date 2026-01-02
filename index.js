const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http'); 

// ⚠️ TU NUMERO (Solo números, sin espacios ni +)
const MY_PHONE_NUMBER = "525532397858"; 

const PORT = process.env.PORT || 3000; 

// CONFIGURACIÓN DE NAVEGADOR (Truco para evitar bloqueos)
const UVI_BROWSER = ["Ubuntu", "Chrome", "20.0.04"];

// LISTA DE ADMINS
let admins = [
    { nombre: "Uvi", numero: "525654812179" },
    { nombre: "Estef", numero: "573114860414" },
    { nombre: "Samu", numero: "573173607093" },
    { nombre: "Cham", numero: "59894793177" },
    { nombre: "Ore", numero: "50687309582" }
];

// LISTA DE LOBBIES
let lobbies = {};
const MAX_LOBBIES = 6; 

// SERVIDOR WEB (Keep-Alive)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot Elementals: ACTIVO - V6.0');
});
server.listen(PORT, () => { console.log(`🌐 Servidor Web en puerto ${PORT}`); });

async function connectToWhatsApp() {
    // 🗑️ NOMBRE NUEVO PARA LIMPIAR MEMORIA CORRUPTA
    const { state, saveCreds } = await useMultiFileAuthState('auth_session_v6_clean');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: UVI_BROWSER, // Usamos navegador Linux estándar
        markOnlineOnConnect: true, // Marcar como conectado al iniciar
        connectTimeoutMs: 60000, 
        defaultQueryTimeoutMs: 0, // Evita timeouts raros
        keepAliveIntervalMs: 10000, // Mantiene la conexión viva
        retryRequestDelayMs: 5000 // Espera 5s antes de reintentar si falla
    });

    // ⏳ GENERADOR DE CÓDIGO (Con espera de seguridad)
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                // Pequeña pausa extra para asegurar conexión
                await delay(2000); 
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                const codeLimpio = code?.match(/.{1,4}/g)?.join("-") || code;
                
                // 📢 MENSAJE GIGANTE
                console.log(`\n\n\n🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢`);
                console.log(`🟢   TU CODIGO DE VINCULACION:    🟢`);
                console.log(`🟢                                🟢`);
                console.log(`🟢        ${codeLimpio}       🟢`);
                console.log(`🟢                                🟢`);
                console.log(`🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢\n\n\n`);

            } catch (e) { 
                console.log("⚠️ No se pudo generar código (Esperando reinicio...)", e.message); 
            }
        }, 6000); // Espera 6 segundos exactos
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect.error?.output?.statusCode;
            console.log(`⚠️ Conexión cerrada: ${reason}. Reconectando...`);
            
            const shouldReconnect = reason !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                // 🛑 PAUSA DE SEGURIDAD (Evita el bucle rápido)
                setTimeout(connectToWhatsApp, 5000);
            } else {
                console.log("⛔ Sesión cerrada. Borra la carpeta 'auth_session_v6_clean' si quieres reiniciar.");
            }
        } else if (connection === 'open') {
            console.log('✅ BOT CONECTADO Y LISTO');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message) return;
            const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
            if (!text) return;

            const remoteJid = m.key.remoteJid;
            const sender = m.key.participant || m.key.remoteJid; 
            const args = text.trim().split(/\s+/);
            const command = args[0].toLowerCase(); 
            const subCommand = args[1] ? args[1].toLowerCase() : ""; 
            
            if (!lobbies[remoteJid]) lobbies[remoteJid] = {};

            // --- COMANDOS ---

            if (command === '.menu' || command === '.ayuda') {
                const txt = "🤖 *ELEMENTALS BOT V6*\n\n🏆 *.ranked* duo | trio | 5q\n❄️ *.aram* duo | trio | 4q | 5q\n📢 *.todos* [mensaje]\n👑 *.adm*";
                await sock.sendMessage(remoteJid, { text: txt });
            }

            // [Agrega aquí el resto de comandos RANKED, ARAM, ETC. que ya tenías]
            // (He resumido el código para que veas la parte de conexión, 
            // pero el resto de la lógica de salas sigue igual)
            
            // ... (Pega aquí el resto de tus comandos Ranked/Aram de la versión anterior si los necesitas, 
            // o usa este código base para probar la conexión primero).

        } catch (e) {
            console.log("Error en mensaje:", e);
        }
    });
}

connectToWhatsApp();
