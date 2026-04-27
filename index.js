const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    delay, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

// ====================
// CONFIGURACIÓN (Tus datos)
// ====================
const MY_PHONE_NUMBER = "525532397858";
const PORT = process.env.PORT || 3000;
const MAX_LOBBIES = 6;

// IDs de Grupos (Cámbialos por tus IDs reales)
const GROUP_GENERAL = '120363XXXXXXXX@g.us';
const GROUP_RECLUTAMIENTO = '120363YYYYYYYY@g.us';
const WELCOME_GROUPS = [GROUP_GENERAL, GROUP_RECLUTAMIENTO];

const RANGOS = {
    'hierro': 'Hierro ⚔️ Bronce', 'bronce': 'Bronce ⚔️ Plata', 'plata': 'Plata ⚔️ Oro', 'oro': 'Oro ⚔️ Platino',
    'platino': 'Platino ⚔️ Esmeralda', 'esmeralda': 'Esmeralda ⚔️ Diamante', 'diamante': 'Diamante ⚔️ Maestro',
    'master': 'Maestro ⚔️ Gran Maestro', 'maestro': 'Maestro ⚔️ Gran Maestro', 'gm': 'Gran Maestro ⚔️ Retador',
    'grandmaster': 'Gran Maestro ⚔️ Retador', 'granmaestro': 'Gran Maestro ⚔️ Retador',
    'challenger': 'Retador ⚔️ Soberano', 'retador': 'Retador ⚔️ Soberano'
};

let lobbies = {};

// ====================
// WEB SERVER (Para Render)
// ====================
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot Elementals: Híbrido V3 Online');
});
server.listen(PORT, () => { console.log(`🌐 Web online puerto ${PORT}`); });

// Anti-Sleep
setInterval(() => { console.log("💓 Manteniendo sesión activa..."); }, 60000);

async function connectToWhatsApp() {
    // Usamos una carpeta limpia para evitar errores de sesión previos
    const { state, saveCreds } = await useMultiFileAuthState('auth_elementals_v3');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false,
        connectTimeoutMs: 60000,
    });

    // ==========================================
    // LÓGICA DE VINCULACIÓN (LA QUE SÍ FUNCIONA)
    // ==========================================
    if (!sock.authState.creds.registered) {
        console.log(`\n⏳ Solicitando código para: ${MY_PHONE_NUMBER}`);
        setTimeout(async () => {
            try {
                await delay(5000); // Esperamos a que el socket esté listo
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                const codeLimpio = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log("\n---------------------------------------");
                console.log(`🟢 TU CÓDIGO DE VINCULACIÓN: ${codeLimpio}`);
                console.log("---------------------------------------\n");
            } catch (e) { 
                console.log("⚠️ Error pidiendo código (Reintenta):", e.message); 
            }
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                console.log("🔄 Reconectando...");
                setTimeout(() => connectToWhatsApp(), 5000);
            }
        } else if (connection === 'open') {
            console.log('✅ BOT CONECTADO Y LISTO');
        }
    });

    // ====================
    // BIENVENIDAS AUTOMÁTICAS
    // ====================
    sock.ev.on('group-participants.update', async (update) => {
        try {
            if (update.action !== 'add') return;
            if (!WELCOME_GROUPS.includes(update.id)) return;

            for (const user of update.participants) {
                let mensaje = '';
                if (update.id === GROUP_GENERAL) {
                    mensaje = `🌟 Bienvenid@ @${user.split('@')[0]} a ELEMENTALS`;
                }
                if (update.id === GROUP_RECLUTAMIENTO) {
                    mensaje = `⚔️ Bienvenid@ @${user.split('@')[0]}\nEnvía tu captura para acceso al gremio.`;
                }

                await sock.sendMessage(update.id, {
                    image: { url: 'https://i.imgur.com/ZObpHNP.jpeg' },
                    caption: mensaje,
                    mentions: [user]
                });
            }
        } catch (e) { console.log("Error Bienvenida:", e); }
    });

    // ====================
    // GESTIÓN DE MENSAJES Y COMANDOS
    // ====================
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;

            const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
            if (!text) return;

            const remoteJid = m.key.remoteJid;
            const sender = m.key.participant || remoteJid;
            const args = text.trim().split(/\s+/);
            const command = args[0].toLowerCase();
            const subCommand = args[1]?.toLowerCase() || "";
            const eloArg = args.slice(2).join("").toLowerCase();

            if (!lobbies[remoteJid]) lobbies[remoteJid] = {};

            // MENU PRINCIPAL
            if (command === '.menu') {
                await sock.sendMessage(remoteJid, { 
                    text: "🤖 *COMANDOS ELEMENTALS*\n\n.ranked duo/trio [elo]\n.aram duo/trio/4q/5q\n.me uno [ID]\n.build [Campeón]\n.idgrupo\n.adm\n.bienvenida\n.tiktok | .discord" 
                });
            }

            // ID DEL GRUPO (Para configurar las constantes arriba)
            if (command === '.idgrupo') {
                await sock.sendMessage(remoteJid, { text: `🆔 ID: ${remoteJid}` });
            }

            // BUILDS
            if (command === '.build') {
                if (!args[1]) return;
                const champ = args.slice(1).join("-").toLowerCase();
                await sock.sendMessage(remoteJid, { text: `🛠️ *BUILD:* https://www.wildriftfire.com/guide/${champ}` });
            }

            // SISTEMA DE SALAS (RANKED)
            if (command === '.ranked') {
                if (!['duo', 'trio', '5q'].includes(subCommand)) return;
                let salaID = null;
                for (let i = 1; i <= MAX_LOBBIES; i++) if (!lobbies[remoteJid][i]) { salaID = i; break; }
                if (!salaID) return;

                let limite = subCommand === 'duo' ? 2 : subCommand === 'trio' ? 3 : 5;
                let rango = RANGOS[eloArg] || "Elo Libre";

                lobbies[remoteJid][salaID] = {
                    id: salaID,
                    tipo: 'RANKED',
                    limite,
                    participantes: [sender],
                    rango,
                    timer: setTimeout(() => { delete lobbies[remoteJid][salaID]; }, 300000)
                };

                await sock.sendMessage(remoteJid, { 
                    text: `🎮 *RANKED ${subCommand.toUpperCase()}* (Sala ${salaID})\n🏅 ${rango}\n👥 1/${limite}\n👉 .me uno ${salaID}` 
                });
            }

            // SISTEMA DE SALAS (ARAM)
            if (command === '.aram') {
                if (!['duo', 'trio', '4q', '5q'].includes(subCommand)) return;
                let salaID = null;
                for (let i = 1; i <= MAX_LOBBIES; i++) if (!lobbies[remoteJid][i]) { salaID = i; break; }
                if (!salaID) return;

                let limite = subCommand === 'duo' ? 2 : subCommand === 'trio' ? 3 : subCommand === '4q' ? 4 : 5;

                lobbies[remoteJid][salaID] = {
                    id: salaID,
                    tipo: 'ARAM',
                    limite,
                    participantes: [sender],
                    timer: setTimeout(() => { delete lobbies[remoteJid][salaID]; }, 300000)
                };

                await sock.sendMessage(remoteJid, { 
                    text: `❄️ *ARAM* (Sala ${salaID})\n👥 1/${limite}\n👉 .me uno ${salaID}` 
                });
            }

            // UNIRSE A SALA
            if (command === '.me' && subCommand === 'uno') {
                let id = args[2];
                const sala = lobbies[remoteJid][id];
                if (!sala || sala.participantes.includes(sender)) return;

                sala.participantes.push(sender);

                if (sala.participantes.length < sala.limite) {
                    await sock.sendMessage(remoteJid, { 
                        text: `👥 Sala ${id}: ${sala.participantes.length}/${sala.limite}\n👉 .me uno ${id}`,
                        mentions: sala.participantes 
                    });
                } else {
                    clearTimeout(sala.timer);
                    let lista = sala.participantes.map(p => `@${p.split('@')[0]}`).join('\n');
                    await sock.sendMessage(remoteJid, { 
                        text: `🚀 *SALA ${id} COMPLETA*\n\n${lista}\n\n¡A jugar! #ELNS`,
                        mentions: sala.participantes 
                    });
                    delete lobbies[remoteJid][id];
                }
            }

            // OTROS COMANDOS
            if (command === '.adm') await sock.sendMessage(remoteJid, { text: "👑 *ADMINS:* Uvi, Estef, Samu, Cham, Ore" });
            if (command === '.discord') await sock.sendMessage(remoteJid, { text: "📢 https://discord.gg/yXnPdAvef" });

        } catch (e) { console.log("Error Mensaje:", e); }
    });
}

connectToWhatsApp();
