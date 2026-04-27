const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    delay, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

const MY_PHONE_NUMBER = "525532397858";
const PORT = process.env.PORT || 3000;
const MAX_LOBBIES = 6;

// IDs de Grupos
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

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot Elementals: Full V16');
});
server.listen(PORT, () => { console.log(`🌐 Puerto ${PORT}`); });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_elementals_v16');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        // CAMBIO DE BROWSER PARA FORZAR NOTIFICACIÓN
        browser: ["Mac OS", "Chrome", "10.15.7"], 
        syncFullHistory: false,
        connectTimeoutMs: 60000,
    });

    if (!sock.authState.creds.registered) {
        console.log(`⏳ Generando código para: ${MY_PHONE_NUMBER}`);
        setTimeout(async () => {
            try {
                await delay(5000); 
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                const codeLimpio = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log("\n=======================================");
                console.log(`🟢 TU CÓDIGO: ${codeLimpio}`);
                console.log("=======================================\n");
            } catch (e) { console.log("⚠️ Error:", e.message); }
        }, 10000); 
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) setTimeout(() => connectToWhatsApp(), 5000);
        } else if (connection === 'open') console.log('✅ CONECTADO');
    });

    sock.ev.on('group-participants.update', async (update) => {
        try {
            if (update.action !== 'add' || !WELCOME_GROUPS.includes(update.id)) return;
            for (const user of update.participants) {
                let mensaje = update.id === GROUP_GENERAL ? `🌟 Bienvenid@ @${user.split('@')[0]} a ELEMENTALS` : `⚔️ Bienvenid@ @${user.split('@')[0]}\nEnvía captura para acceso.`;
                await sock.sendMessage(update.id, { image: { url: 'https://i.imgur.com/ZObpHNP.jpeg' }, caption: mensaje, mentions: [user] });
            }
        } catch (e) { console.log(e); }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;
            const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
            const remoteJid = m.key.remoteJid;
            const sender = m.key.participant || remoteJid;
            const args = text.trim().split(/\s+/);
            const command = args[0].toLowerCase();
            const subCommand = args[1]?.toLowerCase() || "";
            const eloArg = args.slice(2).join("").toLowerCase();

            if (!lobbies[remoteJid]) lobbies[remoteJid] = {};

            // COMANDOS
            if (command === '.menu') await sock.sendMessage(remoteJid, { text: "🤖 *BOT FULL*\n.ranked\n.aram\n.build\n.adm\n.idgrupo" });
            
            if (command === '.adm') await sock.sendMessage(remoteJid, { text: "👑 *ADMINS*\nUvi, Estef, Samu, Cham, Ore" });

            if (command === '.idgrupo') await sock.sendMessage(remoteJid, { text: `🆔 ID: ${remoteJid}` });

            if (command === '.build') {
                const champ = args.slice(1).join("-").toLowerCase();
                await sock.sendMessage(remoteJid, { text: `🛠️ https://www.wildriftfire.com/guide/${champ}` });
            }

            if (command === '.ranked' || command === '.aram') {
                if (!['duo','trio','4q','5q'].includes(subCommand)) return;
                let id = null;
                for(let i=1;i<=MAX_LOBBIES;i++) if(!lobbies[remoteJid][i]){id=i;break;}
                if(!id) return;
                let limite = subCommand === 'duo' ? 2 : subCommand === 'trio' ? 3 : 5;
                lobbies[remoteJid][id] = { id, limite, participantes: [sender], timer: setTimeout(() => delete lobbies[remoteJid][id], 300000) };
                await sock.sendMessage(remoteJid, { text: `🎮 Sala ${id} (${command})\n👥 1/${limite}\n👉 .me uno ${id}` });
            }

            if (command === '.me' && subCommand === 'uno') {
                let id = args[2];
                const sala = lobbies[remoteJid][id];
                if (!sala || sala.participantes.includes(sender)) return;
                sala.participantes.push(sender);
                if (sala.participantes.length < sala.limite) {
                    await sock.sendMessage(remoteJid, { text: `👥 Sala ${id}: ${sala.participantes.length}/${sala.limite}`, mentions: sala.participantes });
                } else {
                    clearTimeout(sala.timer);
                    await sock.sendMessage(remoteJid, { text: `🚀 SALA ${id} COMPLETA`, mentions: sala.participantes });
                    delete lobbies[remoteJid][id];
                }
            }
        } catch (e) { console.log(e); }
    });
}
connectToWhatsApp();
