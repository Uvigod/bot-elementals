const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http'); 

// ⚠️ TU NUMERO
const MY_PHONE_NUMBER = "525532397858"; 

const PORT = process.env.PORT || 3000; 

// LISTA DE ADMINS
let admins = [
    { nombre: "Uvi", numero: "525654812179" },
    { nombre: "Estef", numero: "573114860414" },
    { nombre: "Samu", numero: "573173607093" },
    { nombre: "Cham", numero: "59894793177" },
    { nombre: "Ore", numero: "50687309582" }
];

let lobbies = {};
const MAX_LOBBIES = 6; 

// SERVIDOR WEB
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot Elementals: ACTIVO V6.1');
});
server.listen(PORT, () => { console.log(`🌐 Servidor Web en puerto ${PORT}`); });

async function connectToWhatsApp() {
    // 🗑️ CAMBIAMOS NOMBRE DE CARPETA OTRA VEZ PARA LIMPIAR EL ERROR 405
    const { state, saveCreds } = await useMultiFileAuthState('auth_elementals_fixed_v6');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        // 🛠️ CAMBIO CLAVE: Usamos identificación de Mac para evitar bloqueo 405
        browser: Browsers.macOS('Chrome'),
        syncFullHistory: false, // Hace que cargue más rápido
        connectTimeoutMs: 60000, 
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                await delay(3000); 
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                const codeLimpio = code?.match(/.{1,4}/g)?.join("-") || code;
                
                console.log(`\n\n🟢🟢🟢 CODIGO NUEVO 🟢🟢🟢`);
                console.log(`      ${codeLimpio}      `);
                console.log(`🟢🟢🟢 ESCRIBELO YA 🟢🟢🟢\n\n`);
            } catch (e) { console.log("⚠️ Esperando siguiente intento...", e.message); }
        }, 5000); 
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect.error?.output?.statusCode;
            console.log(`⚠️ Conexión cerrada: ${reason}. Reconectando...`);
            // Si el error no es "Logout", reconectamos
            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(connectToWhatsApp, 5000);
            }
        } else if (connection === 'open') {
            console.log('✅ BOT CONECTADO Y FUNCIONANDO');
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

            // --- COMANDOS BÁSICOS (Agrega aquí el resto si funciona la conexión) ---
            if (command === '.menu') {
                await sock.sendMessage(remoteJid, { text: "🤖 *BOT ELEMENTALS ONLINE*\nComandos:\n.ranked\n.aram\n.adm\n.todos" });
            }
            if (command === '.adm') {
                let textoAdmins = "👑 *ADMINISTRADORES ELEMENTALS* 👑\n\n";
                admins.forEach(a => { textoAdmins += `👤 ${a.nombre} — +${a.numero}\n`; });
                await sock.sendMessage(remoteJid, { text: textoAdmins });
            }
            // (El resto de comandos RANKED/ARAM funcionarán igual, pero primero conectemos)

        } catch (e) { console.log("Error:", e); }
    });
}
connectToWhatsApp();
