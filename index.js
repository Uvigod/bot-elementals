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

// RANGOS WILD RIFT
const RANGOS = {
    'hierro': 'Hierro ⚔️ Bronce',
    'bronce': 'Bronce ⚔️ Plata',
    'plata': 'Plata ⚔️ Oro',
    'oro': 'Oro ⚔️ Platino',
    'platino': 'Platino ⚔️ Esmeralda',
    'esmeralda': 'Esmeralda ⚔️ Diamante',
    'diamante': 'Diamante ⚔️ Maestro',
    'master': 'Maestro ⚔️ Gran Maestro',
    'maestro': 'Maestro ⚔️ Gran Maestro',
    'gm': 'Gran Maestro ⚔️ Retador',
    'grandmaster': 'Gran Maestro ⚔️ Retador',
    'granmaestro': 'Gran Maestro ⚔️ Retador',
    'challenger': 'Retador ⚔️ Soberano',
    'retador': 'Retador ⚔️ Soberano'
};

let lobbies = {};
const MAX_LOBBIES = 6; 

// SERVIDOR WEB (Para que Render no lo duerma)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot Elementals: ONLINE V7.0');
});
server.listen(PORT, () => { console.log(`🌐 Web online puerto ${PORT}`); });

async function connectToWhatsApp() {
    // Usamos la misma carpeta para intentar guardar sesión
    const { state, saveCreds } = await useMultiFileAuthState('auth_elementals_fixed_v6');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'), // Mantenemos el modo MAC que sí funcionó
        syncFullHistory: false,
        connectTimeoutMs: 60000, 
    });

    // GENERADOR DE CÓDIGO (Solo si se desconecta)
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                await delay(3000); 
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                const codeLimpio = code?.match(/.{1,4}/g)?.join("-") || code;
                
                console.log(`\n\n🟢🟢🟢 CODIGO NUEVO 🟢🟢🟢`);
                console.log(`      ${codeLimpio}      `);
                console.log(`🟢🟢🟢 ESCRIBELO YA 🟢🟢🟢\n\n`);
            } catch (e) { console.log("⚠️ Esperando...", e.message); }
        }, 5000); 
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect.error?.output?.statusCode;
            console.log(`⚠️ Desconectado: ${reason}. Reconectando...`);
            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(connectToWhatsApp, 5000);
            }
        } else if (connection === 'open') {
            console.log('✅ BOT CONECTADO: LISTO PARA RECIBIR COMANDOS');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message) return;
            // Ignorar mensajes del propio bot para evitar bucles
            if (m.key.fromMe) return;

            const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
            if (!text) return;

            console.log(`📩 Mensaje recibido: ${text}`); // Para ver en los logs si llegan

            const remoteJid = m.key.remoteJid;
            const sender = m.key.participant || m.key.remoteJid; 
            const args = text.trim().split(/\s+/);
            const command = args[0].toLowerCase(); 
            const subCommand = args[1] ? args[1].toLowerCase() : ""; 
            const eloArg = args.slice(2).join("").toLowerCase(); 
            
            if (!lobbies[remoteJid]) lobbies[remoteJid] = {};

            // --- 🤖 COMANDOS COMPLETOS ---

            // 1. MENU
            if (command === '.menu' || command === '.ayuda') {
                const txt = "🤖 *ELEMENTALS BOT* 🤖\n\n" +
                            "🏆 *RANKED*\n.ranked duo | trio | 5q\n\n" +
                            "❄️ *ARAM*\n.aram duo | trio | 4q | 5q\n\n" +
                            "📥 *JUGAR*\n.me uno [ID]\n\n" +
                            "👑 *ADMIN*\n.adm | .todos";
                await sock.sendMessage(remoteJid, { text: txt });
            }

            // 2. ADMINS
            if (command === '.adm') {
                if (subCommand === 'nuevo') {
                    if (!sender.includes(MY_PHONE_NUMBER)) return sock.sendMessage(remoteJid, {text: "⛔ Solo Dueño."});
                    admins.push({ nombre: args[2], numero: args[3] });
                    return sock.sendMessage(remoteJid, {text: "✅ Agregado"});
                }
                let textoAdmins = "👑 *ADMINISTRADORES*\n";
                admins.forEach(a => textoAdmins += `👤 ${a.nombre} — +${a.numero}\n`);
                await sock.sendMessage(remoteJid, { text: textoAdmins });
            }

            // 3. RANKED
            if (command === '.ranked') {
                const tipos = ['duo', 'trio', '5q'];
                if (!tipos.includes(subCommand)) return;
                
                let salaID = null;
                for (let i = 1; i <= MAX_LOBBIES; i++) if (!lobbies[remoteJid][i]) { salaID = i; break; }
                if (!salaID) return sock.sendMessage(remoteJid, {text: "⚠️ Salas llenas."});

                let limite = (subCommand === 'duo') ? 2 : (subCommand === 'trio') ? 3 : 5;
                let rango = RANGOS[eloArg.replace('avisar','').trim()] || "Elo Libre";
                
                // Menciones
                let mentions = [sender];
                let aviso = "";
                if (text.includes('avisar') && remoteJid.endsWith('@g.us')) {
                    const meta = await sock.groupMetadata(remoteJid);
                    mentions = meta.participants.map(p => p.id);
                    aviso = "\n📢 *¡LLAMADO GENERAL!*";
                }

                lobbies[remoteJid][salaID] = {
                    id: salaID, tipo: `RANKED ${subCommand.toUpperCase()}`, rango: rango, limite: limite, participantes: [sender],
                    timer: setTimeout(() => { delete lobbies[remoteJid][salaID]; sock.sendMessage(remoteJid, {text: `🗑️ Sala ${salaID} expiró.`})}, 300000)
                };

                const msg = `🎮 *RANKED ${subCommand.toUpperCase()}* (Sala ${salaID})\n🏅 ${rango}\n👥 1/${limite}\n👉 .me uno ${salaID}${aviso}`;
                await sock.sendMessage(remoteJid, { text: msg, mentions: mentions });
            }

            // 4. ARAM
            if (command === '.aram') {
                const tipos = ['duo', 'trio', '4q', '5q'];
                if (!tipos.includes(subCommand)) return;
                
                let salaID = null;
                for (let i = 1; i <= MAX_LOBBIES; i++) if (!lobbies[remoteJid][i]) { salaID = i; break; }
                if (!salaID) return sock.sendMessage(remoteJid, {text: "⚠️ Salas llenas."});

                let limite = 5;
                if(subCommand==='duo') limite=2; if(subCommand==='trio') limite=3; if(subCommand==='4q') limite=4;
                
                let mentions = [sender];
                let aviso = "";
                if (text.includes('avisar') && remoteJid.endsWith('@g.us')) {
                    const meta = await sock.groupMetadata(remoteJid);
                    mentions = meta.participants.map(p => p.id);
                    aviso = "\n📢 *¡LLAMADO GENERAL!*";
                }

                lobbies[remoteJid][salaID] = {
                    id: salaID, tipo: `ARAM`, rango: "Abismo", limite: limite, participantes: [sender],
                    timer: setTimeout(() => { delete lobbies[remoteJid][salaID]; sock.sendMessage(remoteJid, {text: `🗑️ Sala ${salaID} expiró.`})}, 300000)
                };

                const msg = `❄️ *ARAM* (Sala ${salaID})\n👥 1/${limite}\n👉 .me uno ${salaID}${aviso}`;
                await sock.sendMessage(remoteJid, { text: msg, mentions: mentions });
            }

            // 5. UNIRSE (.me uno)
            if (command === '.me' && subCommand === 'uno') {
                let id = args[2];
                if (!id) {
                    const keys = Object.keys(lobbies[remoteJid]);
                    if (keys.length === 1) id = keys[0];
                    else return sock.sendMessage(remoteJid, {text: "⚠️ Especifica ID: .me uno 1"});
                }
                const sala = lobbies[remoteJid][id];
                if (!sala || sala.participantes.includes(sender)) return;

                sala.participantes.push(sender);
                
                if (sala.participantes.length < sala.limite) {
                    let lista = "";
                    sala.participantes.forEach((p,i) => lista += `\n${i+1}. @${p.split('@')[0]}`);
                    await sock.sendMessage(remoteJid, { 
                        text: `🎮 *${sala.tipo}*\n👥 ${sala.participantes.length}/${sala.limite}\n${lista}\n👉 .me uno ${sala.id}`,
                        mentions: sala.participantes
                    });
                } else {
                    clearTimeout(sala.timer);
                    let txt = `🚀 *FULL TEAM (Sala ${sala.id})*\n🎮 ${sala.tipo}\n`;
                    sala.participantes.forEach((p,i) => txt += `\n${i+1}. @${p.split('@')[0]}`);
                    txt += "\n\n#ELNS Go!";
                    await sock.sendMessage(remoteJid, { text: txt, mentions: sala.participantes });
                    delete lobbies[remoteJid][id];
                }
            }

            // 6. TODOS
            if (command === '.todos') {
                if (!remoteJid.endsWith('@g.us')) return;
                const meta = await sock.groupMetadata(remoteJid);
                const parts = meta.participants.map(p => p.id);
                const txt = `📢 *ATENCIÓN*\n${args.slice(1).join(" ")}`;
                await sock.sendMessage(remoteJid, { text: txt, mentions: parts });
            }

        } catch (e) { console.log("Error procesando mensaje:", e); }
    });
}
connectToWhatsApp();
