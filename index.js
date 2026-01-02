const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http'); // 🆕 NECESARIO PARA RENDER

// ⚠️ TU NUMERO
const MY_PHONE_NUMBER = "525532397858"; 
const MAX_LOBBIES = 6; 
const PORT = process.env.PORT || 3000; // 🆕 PUERTO PARA RENDER

// RANGOS
const RANGOS = {
    'hierro': 'Hierro ⚔️ Bronce', 'bronce': 'Bronce ⚔️ Plata', 'plata': 'Plata ⚔️ Oro', 'oro': 'Oro ⚔️ Platino',
    'platino': 'Platino ⚔️ Esmeralda', 'esmeralda': 'Esmeralda ⚔️ Diamante', 'diamante': 'Diamante ⚔️ Maestro',
    'master': 'Maestro ⚔️ Gran Maestro', 'maestro': 'Maestro ⚔️ Gran Maestro', 'gm': 'Gran Maestro ⚔️ Retador',
    'grandmaster': 'Gran Maestro ⚔️ Retador', 'granmaestro': 'Gran Maestro ⚔️ Retador',
    'challenger': 'Retador ⚔️ Soberano', 'retador': 'Retador ⚔️ Soberano'
};

let lobbies = {};

// 🆕 SERVIDOR WEB (Para que Render no mate el bot)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot Elementals: ONLINE (Config Termux)');
});
server.listen(PORT, () => { console.log(`🌐 Web online puerto ${PORT}`); });

async function connectToWhatsApp() {
    // 🆕 Cambiamos nombre para forzar limpieza
    const { state, saveCreds } = await useMultiFileAuthState('auth_termux_final_v12');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        // 💎 TU CONFIGURACIÓN DE TERMUX (La que funciona)
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false,
        connectTimeoutMs: 60000,
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                await delay(3000); // Esperamos un poco
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                const codeLimpio = code?.match(/.{1,4}/g)?.join("-") || code;
                
                console.log(`\n\n🟢🟢🟢 TU CÓDIGO (Ubuntu) 🟢🟢🟢`);
                console.log(`👉      ${codeLimpio}      👈`);
                console.log(`🟢🟢🟢 VINCULA AHORA 🟢🟢🟢\n\n`);
            } catch (e) { console.log("⚠️ Error pidiendo código", e.message); }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ BOT ACTIVO: CONFIGURACIÓN TERMUX + RENDER');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
        if (!text) return;

        const remoteJid = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid; 
        const args = text.trim().split(/\s+/);
        const command = args[0].toLowerCase(); 
        const subCommand = args[1] ? args[1].toLowerCase() : ""; 
        const eloArg = args.slice(2).join("").toLowerCase(); 
        
        if (!lobbies[remoteJid]) lobbies[remoteJid] = {};

        // 1. MENU
        if (command === '.menu' || command === '.ayuda' || command === '.help') {
            const txtMenu = "🤖 *COMANDOS ELEMENTALS* 🤖\n\n🏆 *RANKED*\n• .ranked duo | trio | 5q\n\n❄️ *ARAM*\n• .aram duo | trio | 4q | 5q\n\n📊 *EXTRA*\n• .encuesta | .discord | .adm | .atencion";
            await sock.sendMessage(remoteJid, { text: txtMenu });
        }

        // 2. ARAM (Tu lógica exacta)
        if (command === '.aram') {
            const modosAram = ['duo', 'trio', 'cuarteto', '4q', '5q'];
            if (!modosAram.includes(subCommand)) return sock.sendMessage(remoteJid, { text: "⚠️ Use: .aram duo | trio | 4q | 5q" });

            let limite = 5; let etiquetaModo = "5Q";
            if (subCommand === 'duo') { limite = 2; etiquetaModo = "DUO"; }
            else if (subCommand === 'trio') { limite = 3; etiquetaModo = "TRIO"; }
            else if (subCommand === 'cuarteto' || subCommand === '4q') { limite = 4; etiquetaModo = "4Q"; }

            let salaID = null; for (let i = 1; i <= MAX_LOBBIES; i++) if (!lobbies[remoteJid][i]) { salaID = i; break; }
            if (!salaID) return sock.sendMessage(remoteJid, { text: "⚠️ Salas llenas." });

            let aviso=""; let ments=[sender];
            if(text.includes('avisar') && remoteJid.endsWith('@g.us')) { 
                const meta=await sock.groupMetadata(remoteJid); ments=meta.participants.map(p=>p.id); aviso="\n📢 *LLAMADO*"; 
            }

            lobbies[remoteJid][salaID] = {
                id: salaID, tipo: `ARAM ${etiquetaModo}`, rango: 'Abismo', limite: limite, participantes: [sender],
                timer: setTimeout(() => { delete lobbies[remoteJid][salaID]; sock.sendMessage(remoteJid, {text:`🗑️ Sala ${salaID} expiró.`})}, 300000)
            };
            await sock.sendMessage(remoteJid, { text: `🎮 *ARAM ${etiquetaModo}* (Sala ${salaID})\n👥 1/${limite}\n👉 .me uno ${salaID}${aviso}`, mentions: ments });
        }

        // 3. RANKED (Tu lógica exacta)
        if (command === '.ranked') {
            const tiposValidos = ['duo', 'trio', '5q'];
            if (!tiposValidos.includes(subCommand)) return;
            let salaID = null; for (let i = 1; i <= MAX_LOBBIES; i++) if (!lobbies[remoteJid][i]) { salaID = i; break; }
            if (!salaID) return sock.sendMessage(remoteJid, { text: "⚠️ Salas llenas." });

            let limite = (subCommand === 'duo') ? 2 : (subCommand === 'trio') ? 3 : 5;
            let tipo = subCommand.toUpperCase();
            let nombreRango = RANGOS[eloArg] || "Elo Libre";

            let aviso=""; let ments=[sender];
            if(text.includes('avisar') && remoteJid.endsWith('@g.us')) { 
                const meta=await sock.groupMetadata(remoteJid); ments=meta.participants.map(p=>p.id); aviso="\n📢 *LLAMADO*"; 
            }

            lobbies[remoteJid][salaID] = {
                id: salaID, tipo: `RANKED ${tipo}`, rango: nombreRango, limite: limite, participantes: [sender],
                timer: setTimeout(() => { delete lobbies[remoteJid][salaID]; sock.sendMessage(remoteJid, {text:`🗑️ Sala ${salaID} expiró.`})}, 300000)
            };
            await sock.sendMessage(remoteJid, { text: `🎮 *RANKED ${tipo}* (Sala ${salaID})\n🏅 ${nombreRango}\n👥 1/${limite}\n👉 .me uno ${salaID}${aviso}`, mentions: ments });
        }

        // 4. UNIRSE
        if (command === '.me' && subCommand === 'uno') {
            let idTarget = args[2];
            const salasActivas = Object.keys(lobbies[remoteJid]);
            if (!idTarget && salasActivas.length === 1) idTarget = salasActivas[0];
            
            const sala = lobbies[remoteJid][idTarget];
            if (!sala || sala.participantes.includes(sender)) return; 
            sala.participantes.push(sender);

            if (sala.participantes.length < sala.limite) {
                let lista = ""; sala.participantes.forEach((p, i) => lista += `\n${i + 1}. @${p.split('@')[0]}`);
                await sock.sendMessage(remoteJid, { text: `🎮 *${sala.tipo}* (Sala ${sala.id})\n👥 ${sala.participantes.length}/${sala.limite}\n${lista}\n👉 .me uno ${sala.id}`, mentions: sala.participantes });
            } else {
                clearTimeout(sala.timer);
                let txt = `🚀 *FULL TEAM (Sala ${sala.id})*\n🎮 ${sala.tipo}\n`;
                sala.participantes.forEach((p, i) => txt += `${i+1}. @${p.split('@')[0]}\n`);
                txt += `\n#ELNS`; 
                await sock.sendMessage(remoteJid, { text: txt, mentions: sala.participantes });
                delete lobbies[remoteJid][idTarget]; 
            }
        }

        // 5. OTROS
        if (command === '.encuesta') {
            let contenido = text.replace(/^\.encuesta\s*/i, '').trim();
            let partes = contenido.split('/').map(s => s.trim()).filter(s => s);
            let opciones = partes.length > 1 ? partes.slice(1) : ["Sí", "No"];
            await sock.sendMessage(remoteJid, { poll: { name: "📊 " + partes[0], values: opciones, selectableCount: 1 } });
        }
        if (command === '.adm') await sock.sendMessage(remoteJid, { text: "👑 *ADMINS:*\nUvi, Estef, Samu, Cham, Ore" });
        if (command === '.discord') await sock.sendMessage(remoteJid, { text: "📢 *DISCORD*\n🔗 https://discord.gg/yXnPdAvef" });
        if (command === '.atencion' && remoteJid.endsWith('@g.us')) {
             const meta = await sock.groupMetadata(remoteJid);
             await sock.sendMessage(remoteJid, { text: args.slice(1).join(" ") || "📢 *Atención*", mentions: meta.participants.map(p => p.id) });
        }
    });
}
connectToWhatsApp();
