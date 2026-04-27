const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    delay,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const http = require('http');

// Configuración de usuario
const MY_PHONE_NUMBER = '525532397858';
const MAX_LOBBIES = 6;
const PORT = process.env.PORT || 3000;

const GROUP_GENERAL = '120363XXXXXXXX@g.us';
const GROUP_RECLUTAMIENTO = '120363YYYYYYYY@g.us';
const WELCOME_GROUPS = [GROUP_GENERAL, GROUP_RECLUTAMIENTO];

let lobbies = {};

const RANGOS = {
    'hierro': 'Hierro ⚔️ Bronce',
    'bronce': 'Bronce ⚔️ Plata',
    'plata': 'Plata ⚔️ Oro',
    'oro': 'Oro ⚔️ Platino',
    'platino': 'Platino ⚔️ Esmeralda',
    'esmeralda': 'Esmeralda ⚔️ Diamante',
    'diamante': 'Diamante ⚔️ Maestro',
    'master': 'Maestro ⚔️ Gran Maestro',
    'maestro': 'Maestro ⚔️ Gran Maestro'
};

// ====================
// WEB SERVER
// ====================
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Elementals Online');
});

server.listen(PORT, () => {
    console.log(`🌐 Web online puerto ${PORT}`);
});

// ====================
// BOT CORE
// ====================
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_render_v3');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // Desactivado para usar Pairing Code
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"], // Necesario para Pairing Code
        syncFullHistory: false,
    });

    // Lógica de Vinculación por Código
    if (!sock.authState.creds.registered) {
        if (MY_PHONE_NUMBER) {
            console.log(`\n⏳ Generando código para: ${MY_PHONE_NUMBER}...`);
            await delay(6000); // Espera de seguridad para inicializar el socket
            try {
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                const cleanCode = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log('\n---------------------------------------');
                console.log(`🟢 CÓDIGO DE VINCULACIÓN: ${cleanCode}`);
                console.log('---------------------------------------\n');
            } catch (error) {
                console.error('⚠️ Error al solicitar código:', error);
            }
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log('✅ Conexión establecida con WhatsApp');
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log('⚠️ Conexión cerrada:', reason);

            if (reason !== DisconnectReason.loggedOut) {
                console.log('🔄 Intentando reconectar...');
                setTimeout(() => connectToWhatsApp(), 5000);
            } else {
                console.log('❌ Sesión cerrada. Elimina la carpeta auth_render_v3 y vuelve a vincular.');
            }
        }
    });

    // ====================
    // BIENVENIDAS
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
                    mensaje = `⚔️ Bienvenid@ @${user.split('@')[0]}\nEnvía tu captura para acceso.`;
                }

                await sock.sendMessage(update.id, {
                    image: { url: 'https://i.imgur.com/ZObpHNP.jpeg' },
                    caption: mensaje,
                    mentions: [user]
                });
            }
        } catch (e) { console.log(e); }
    });

    // ====================
    // GESTIÓN DE MENSAJES
    // ====================
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;

            const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
            if (!text) return;

            const remoteJid = m.key.remoteJid;
            const sender = m.key.participant || remoteJid;

            const args = text.trim().split(/\s+/);
            const command = args[0].toLowerCase();
            const subCommand = args[1]?.toLowerCase() || '';
            const eloArg = args.slice(2).join('').toLowerCase();

            if (!lobbies[remoteJid]) lobbies[remoteJid] = {};

            // Comando .menu
            if (command === '.menu') {
                await sock.sendMessage(remoteJid, {
                    text: `🤖 *BOT ELEMENTALS*\n\n.ranked duo [elo]\n.aram trio\n.me uno [id]\n.build [campeón]\n.idgrupo\n.adm`
                });
            }

            // ID Grupo
            if (command === '.idgrupo') {
                await sock.sendMessage(remoteJid, { text: `🆔 ID: ${remoteJid}` });
            }

            // Build Wild Rift
            if (command === '.build') {
                if (!args[1]) return;
                const champ = args.slice(1).join('-').toLowerCase();
                await sock.sendMessage(remoteJid, { text: `🛡️ Build: https://www.wildriftfire.com/guide/${champ}` });
            }

            // Lógica simple de Ranked
            if (command === '.ranked') {
                if (!['duo', 'trio', '5q'].includes(subCommand)) return;
                let limite = subCommand === 'duo' ? 2 : subCommand === 'trio' ? 3 : 5;
                let salaID = null;

                for (let i = 1; i <= MAX_LOBBIES; i++) {
                    if (!lobbies[remoteJid][i]) { salaID = i; break; }
                }

                if (!salaID) return;

                lobbies[remoteJid][salaID] = {
                    id: salaID,
                    limite,
                    participantes: [sender],
                    rango: RANGOS[eloArg] || 'Libre'
                };

                await sock.sendMessage(remoteJid, {
                    text: `🎮 *SALA CREADA: ${salaID}*\n🏆 Rango: ${lobbies[remoteJid][salaID].rango}\n👥 Participantes: 1/${limite}`
                });
            }

            // Unirse a sala
            if (command === '.me' && subCommand === 'uno') {
                let id = args[2];
                const sala = lobbies[remoteJid][id];
                if (!sala) return;

                if (sala.participantes.includes(sender)) return;

                sala.participantes.push(sender);

                if (sala.participantes.length === sala.limite) {
                    await sock.sendMessage(remoteJid, { text: `🚀 Sala ${id} COMPLETA. ¡A jugar!` });
                    delete lobbies[remoteJid][id];
                } else {
                    await sock.sendMessage(remoteJid, { text: `👥 Sala ${id}: ${sala.participantes.length}/${sala.limite}` });
                }
            }

        } catch (e) { console.log(e); }
    });
}

// Arrancar
connectToWhatsApp();
