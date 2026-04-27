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
// CONFIGURACIÓN
// ====================
const MY_PHONE_NUMBER = "525532397858";
const PORT = process.env.PORT || 3000;
const MAX_LOBBIES = 6;

// IDs de Grupos (Cámbialos por tus IDs reales usando .idgrupo)
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
// WEB SERVER
// ====================
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot Elementals: ONLINE FULL V16');
});
server.listen(PORT, () => { console.log(`🌐 Web online puerto ${PORT}`); });

// Anti-Sleep para la consola
setInterval(() => { console.log("💓 Bot Elementals: Sesión activa..."); }, 60000);

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_elementals_v16');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"], // Clave para la notificación
        syncFullHistory: false,
        connectTimeoutMs: 60000,
    });

    // ==========================================
    // VINCULACIÓN POR CÓDIGO
    // ==========================================
    if (!sock.authState.creds.registered) {
        console.log(`⏳ Generando código de vinculación para: ${MY_PHONE_NUMBER}`);
        setTimeout(async () => {
            try {
                await delay(5000); 
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                const codeLimpio = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log("\n=======================================");
                console.log(`🟢 TU CÓDIGO ES: ${codeLimpio}`);
                console.log("=======================================\n");
            } catch (e) { 
                console.log("⚠️ Error al generar código:", e.message); 
            }
        }, 10000); 
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
            console.log('✅ BOT ELEMENTALS CONECTADO');
        }
    });

    // ====================
    // BIENVENIDAS
    // ====================
    sock.ev.on('group-participants.update', async (update) => {
        try {
            if (update.action !== 'add' || !WELCOME_GROUPS.includes(update.id)) return;
            for (const user of update.participants) {
                let mensaje = update.id === GROUP_GENERAL 
                    ? `🌟 Bienvenid@ @${user.split('@')[0]} a ELEMENTALS`
                    : `⚔️ Bienvenid@ @${user.split('@')[0]}\nEnvía tu captura para acceso al gremio.`;

                await sock.sendMessage(update.id, {
                    image: { url: 'https://i.imgur.com/ZObpHNP.jpeg' },
                    caption: mensaje,
                    mentions: [user]
                });
            }
        } catch (e) { console.log("Error Bienvenida:", e); }
    });

    // ====================
    // COMANDOS Y MENSAJES
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

            // 1. MENU
            if (command === '.menu' || command === '.ayuda') {
                const txtMenu = "🤖 *COMANDOS ELEMENTALS*\n\n" +
                                "🏆 *RANKED*\n• .ranked duo [elo]\n• .ranked trio [elo]\n• .ranked 5q\n\n" +
                                "❄️ *ARAM*\n• .aram duo | trio | 4q | 5q\n\n" +
                                "🛠️ *BUILDS*\n• .build [Campeon]\n\n" +
                                "📥 *ACCIONES*\n• .me uno [ID]\n\n" +
                                "⚡ *INFO*\n• .discord | .tiktok | .reglas\n• .adm | .idgrupo | .bienvenida";
                await sock.sendMessage(remoteJid, { text: txtMenu });
            }

            // 2. ADMINS
            if (command === '.adm') {
                await sock.sendMessage(remoteJid, { 
                    text: "👑 *ADMINISTRADORES*\n👤 Uvi - +525654812179\n👤 Estef - +573114860414\n👤 Samu - +573173607093\n👤 Cham - +59894793177\n👤 Ore - +50687309582" 
                });
            }

            // 3. REDES Y INFO
            if (command === '.tiktok') await sock.sendMessage(remoteJid, { image: { url: "https://i.imgur.com/dqaeRXo.jpeg" }, caption: "🎥 *TIKTOK OFICIAL*\n🔗 https://www.tiktok.com/@uvitoooo" });
            if (command === '.discord') await sock.sendMessage(remoteJid, { image: { url: "https://i.imgur.com/ttP1mk4.jpeg" }, caption: "📢 *DISCORD*\n🔗 https://discord.gg/yXnPdAvef" });
            if (command === '.reglas') await sock.sendMessage(remoteJid, { text: "⚡ *Reglas:*\n1️⃣ Respeto total\n2️⃣ No spam\n3️⃣ Sin contenido inapropiado\n4️⃣ Juego limpio" });
            if (command === '.idgrupo') await sock.sendMessage(remoteJid, { text: `🆔 ID: ${remoteJid}` });
            
            if (command === '.bienvenida') {
                await sock.sendMessage(remoteJid, { 
                    image: { url: "https://i.imgur.com/ZObpHNP.jpeg" }, 
                    caption: "•☆ Bienvenid@ ☆•°\n¿Has tenido experiencia en otros gremios?\nSomos ELEMENTALS. ¡Envía tu captura al ingresar!" 
                });
            }

            // 4. BUILDS
            if (command === '.build') {
                if (!args[1]) return sock.sendMessage(remoteJid, { text: "⚠️ Ejemplo: .build yasuo" });
                const champName = args.slice(1).join("-").toLowerCase();
                const linkFire = `https://www.wildriftfire.com/guide/${champName}`;
                await sock.sendMessage(remoteJid, { text: `🛠️ *BUILD PRO:* ${champName.toUpperCase()}\n🔗 ${linkFire}` });
            }

            // 5. RANKED
            if (command === '.ranked') {
                if (!['duo','trio','5q'].includes(subCommand)) return;
                let salaID = null;
                for(let i=1;i<=MAX_LOBBIES;i++) if(!lobbies[remoteJid][i]){salaID=i;break;}
                if(!salaID) return sock.sendMessage(remoteJid,{text:"⚠️ Salas llenas"});

                let limite = subCommand === 'duo' ? 2 : subCommand === 'trio' ? 3 : 5;
                let rango = RANGOS[eloArg] || "Elo Libre";

                lobbies[remoteJid][salaID] = {
                    id: salaID, tipo: 'RANKED', rango, limite, participantes: [sender],
                    timer: setTimeout(() => { delete lobbies[remoteJid][salaID]; }, 300000)
                };

                await sock.sendMessage(remoteJid, { text: `🎮 *RANKED* (Sala ${salaID})\n🏅 ${rango}\n👥 1/${limite}\n👉 .me uno ${salaID}` });
            }

            // 6. ARAM
            if (command === '.aram') {
                if (!['duo','trio','4q','5q'].includes(subCommand)) return;
                let salaID = null;
                for(let i=1;i<=MAX_LOBBIES;i++) if(!lobbies[remoteJid][i]){salaID=i;break;}
                if(!salaID) return;

                let limite = subCommand === 'duo' ? 2 : subCommand === 'trio' ? 3 : subCommand === '4q' ? 4 : 5;
                lobbies[remoteJid][salaID] = {
                    id: salaID, tipo: 'ARAM', limite, participantes: [sender],
                    timer: setTimeout(() => { delete lobbies[remoteJid][salaID]; }, 300000)
                };

                await sock.sendMessage(remoteJid, { text: `❄️ *ARAM* (Sala ${salaID})\n👥 1/${limite}\n👉 .me uno ${salaID}` });
            }

            // 7. UNIRSE (.me uno [id])
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
                        text: `🚀 *SALA ${id} FULL*\n\n${lista}\n\n¡A jugar!`,
                        mentions: sala.participantes 
                    });
                    delete lobbies[remoteJid][id];
                }
            }

        } catch (e) { console.log(e); }
    });
}

connectToWhatsApp();
