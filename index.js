const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http'); 

// ⚠️ TU NUMERO (SÚPER ADMIN)
const MY_PHONE_NUMBER = "525532397858"; 

const MAX_LOBBIES = 6; 
const PORT = process.env.PORT || 3000; 

// LISTA INICIAL DE ADMINS
let admins = [
    { nombre: "Uvi", numero: "525654812179" },
    { nombre: "Estef", numero: "573114860414" },
    { nombre: "Samu", numero: "573173607093" },
    { nombre: "Cham", numero: "59894793177" },
    { nombre: "Ore", numero: "50687309582" }
];

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

// 🌐 SERVIDOR WEB (Para mantenerlo vivo en la nube)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot Elementals: ACTIVO Y CORRIENDO 24/7');
});

server.listen(PORT, () => {
    console.log(`🌐 Servidor Web escuchando en el puerto ${PORT}`);
});

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                console.log(`\n📢 TU CODIGO: ${code?.match(/.{1,4}/g)?.join("-") || code}\n`);
            } catch (e) { console.log("Error pidiendo código", e); }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ BOT ACTIVO: Nube + Admins');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
        if (!text) return;

        console.log(`📩 Recibido: ${text}`);

        const remoteJid = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid; 
        
        const args = text.trim().split(/\s+/);
        const command = args[0].toLowerCase(); 
        const subCommand = args[1] ? args[1].toLowerCase() : ""; 
        const eloArg = args.slice(2).join("").toLowerCase(); 
        
        if (!lobbies[remoteJid]) lobbies[remoteJid] = {};

        // MENU
        if (command === '.menu' || command === '.ayuda' || command === '.help') {
            const txtMenu = "🤖 *COMANDOS ELEMENTALS* 🤖\n\n" +
                            "🏆 *RANKED*\n" +
                            "• .ranked duo | trio | 5q [avisar]\n\n" +
                            "❄️ *ARAM*\n" +
                            "• .aram duo | trio | 4q | 5q [avisar]\n\n" +
                            "👑 *GESTIÓN ADMINS*\n" +
                            "• .adm\n" +
                            "• .adm nuevo [Nombre] [Numero]\n" +
                            "• .adm borrar [Nombre]\n\n" +
                            "📢 *UTILIDAD*\n" +
                            "• .todos [mensaje]\n" +
                            "• .encuesta Pregunta / Opción 1 / Opción 2\n" +
                            "• .me uno [ID]\n\n" +
                            "⚡ *INFO*\n" +
                            "• .discord | .reglas";
            await sock.sendMessage(remoteJid, { text: txtMenu });
        }

        // 👑 COMANDO DE ADMINS
        if (command === '.adm') {
            
            // AGREGAR
            if (subCommand === 'nuevo' || subCommand === 'add') {
                if (!sender.includes(MY_PHONE_NUMBER)) {
                    await sock.sendMessage(remoteJid, { text: "⛔ Solo el Dueño puede editar admins." });
                    return;
                }
                let nuevoNombre = args[2];
                let nuevoNumero = args[3];
                if (!nuevoNombre || !nuevoNumero) {
                    await sock.sendMessage(remoteJid, { text: "⚠️ Uso: .adm nuevo [Nombre] [Numero]" });
                    return;
                }
                admins.push({ nombre: nuevoNombre, numero: nuevoNumero });
                await sock.sendMessage(remoteJid, { text: `✅ Admin Agregado: ${nuevoNombre}` });
                return;
            }

            // BORRAR
            if (subCommand === 'borrar' || subCommand === 'del') {
                if (!sender.includes(MY_PHONE_NUMBER)) {
                    await sock.sendMessage(remoteJid, { text: "⛔ Acceso denegado." });
                    return;
                }
                let nombreBorrar = args[2];
                if (!nombreBorrar) {
                    await sock.sendMessage(remoteJid, { text: "⚠️ Uso: .adm borrar [Nombre]" });
                    return;
                }
                let largoInicial = admins.length;
                admins = admins.filter(a => a.nombre.toLowerCase() !== nombreBorrar.toLowerCase());

                if (admins.length < largoInicial) {
                    await sock.sendMessage(remoteJid, { text: `🗑️ Admin Eliminado: ${nombreBorrar}` });
                } else {
                    await sock.sendMessage(remoteJid, { text: `⚠️ No encontré a "${nombreBorrar}".` });
                }
                return;
            }

            // LISTAR
            let textoAdmins = "👑 *ADMINISTRADORES ELEMENTALS* 👑\n\n";
            admins.forEach(a => {
                textoAdmins += `👤 ${a.nombre} — +${a.numero}\n`;
            });
            await sock.sendMessage(remoteJid, { text: textoAdmins });
        }

        // TODOS
        if (command === '.todos' || command === '.tagall') {
            if (!remoteJid.endsWith('@g.us')) return;
            try {
                const groupMetadata = await sock.groupMetadata(remoteJid);
                const participants = groupMetadata.participants.map(p => p.id);
                const mensajeUsuario = args.slice(1).join(" ");
                const textoFinal = `📢 *LLAMADO GENERAL ELNS* 📢\n\n${mensajeUsuario ? "💬 " + mensajeUsuario : "¡Atención a todos!"}\n\n#Elementals`;
                await sock.sendMessage(remoteJid, { text: textoFinal, mentions: participants });
            } catch (error) { console.log("Error en .todos:", error); }
        }

        // ARAM
        if (command === '.aram') {
            const modosAram = ['duo', 'trio', 'cuarteto', '4q', '5q'];
            if (!modosAram.includes(subCommand)) {
                await sock.sendMessage(remoteJid, { text: "❄️ *Modos ARAM:*\nUse: .aram duo | trio | cuarteto | 5q" });
                return;
            }
            let limite = 5; let etiquetaModo = "5Q";
            if (subCommand === 'duo') { limite = 2; etiquetaModo = "DUO"; }
            else if (subCommand === 'trio') { limite = 3; etiquetaModo = "TRIO"; }
            else if (subCommand === 'cuarteto' || subCommand === '4q') { limite = 4; etiquetaModo = "CUARTETO"; }
            else if (subCommand === '5q') { limite = 5; etiquetaModo = "5Q"; }

            let mentions = [sender]; let avisoTexto = "";
            if (args.includes('avisar') || args.includes('todos')) {
                if (remoteJid.endsWith('@g.us')) {
                    try {
                        const groupMetadata = await sock.groupMetadata(remoteJid);
                        mentions = groupMetadata.participants.map(p => p.id);
                        avisoTexto = "\n📢 *¡LLAMADO GENERAL!*";
                    } catch (e) { }
                }
            }

            let salaID = null;
            for (let i = 1; i <= MAX_LOBBIES; i++) { if (!lobbies[remoteJid][i]) { salaID = i; break; } }
            if (!salaID) { await sock.sendMessage(remoteJid, { text: `⚠️ Salas llenas.` }); return; }

            lobbies[remoteJid][salaID] = {
                id: salaID, tipo: `ARAM ${etiquetaModo} ❄️`, rango: 'Abismo de los Lamentos', limite: limite, participantes: [sender],
                timer: setTimeout(() => { if (lobbies[remoteJid][salaID]) { sock.sendMessage(remoteJid, { text: `⏰ Sala #${salaID} cerrada.` }); delete lobbies[remoteJid][salaID]; } }, 5 * 60 * 1000)
            };
            const mensajeMenu = `🎮 *ARAM ${etiquetaModo}* (Sala #${salaID})\n❄️ *Abismo de los Lamentos*\n👑 Líder: @${sender.split('@')[0]}\n👥 Cupos: 1/${limite}\n⏳ 5 Minutos${avisoTexto}\n\n👉 Escribe *.me uno ${salaID}* para entrar.`;
            await sock.sendMessage(remoteJid, { text: mensajeMenu, mentions: mentions });
        }

        // RANKED
        if (command === '.ranked') {
            const tiposValidos = ['duo', 'trio', '5q'];
            if (!tiposValidos.includes(subCommand)) return;
            let mentions = [sender]; let avisoTexto = "";
            if (args.includes('avisar') || args.includes('todos')) {
                if (remoteJid.endsWith('@g.us')) {
                    try {
                        const groupMetadata = await sock.groupMetadata(remoteJid);
                        mentions = groupMetadata.participants.map(p => p.id);
                        avisoTexto = "\n📢 *¡LLAMADO GENERAL!*";
                    } catch (e) { }
                }
            }
            let salaID = null;
            for (let i = 1; i <= MAX_LOBBIES; i++) { if (!lobbies[remoteJid][i]) { salaID = i; break; } }
            if (!salaID) { await sock.sendMessage(remoteJid, { text: `⚠️ Salas llenas.` }); return; }

            let limite = (subCommand === 'duo') ? 2 : (subCommand === 'trio') ? 3 : 5;
            let tipo = subCommand.toUpperCase();
            let argumentosLimpios = eloArg.replace('avisar', '').replace('todos', '').trim();
            let nombreRango = RANGOS[argumentosLimpios] || "Elo Libre";

            lobbies[remoteJid][salaID] = {
                id: salaID, tipo: `RANKED ${tipo}`, rango: nombreRango, limite: limite, participantes: [sender],
                timer: setTimeout(() => { if (lobbies[remoteJid][salaID]) { sock.sendMessage(remoteJid, { text: `⏰ Sala #${salaID} cerrada.` }); delete lobbies[remoteJid][salaID]; } }, 5 * 60 * 1000) 
            };
            const mensajeMenu = `🎮 *RANKED ${tipo}* (Sala #${salaID})\n🏅 *${nombreRango}*\n👑 Líder: @${sender.split('@')[0]}\n👥 Cupos: 1/${limite}\n⏳ 5 Minutos${avisoTexto}\n\n👉 Escribe *.me uno ${salaID}* para entrar.`;
            await sock.sendMessage(remoteJid, { text: mensajeMenu, mentions: mentions });
        }

        // ME UNO
        if (command === '.me' && subCommand === 'uno') {
            const salasActivas = Object.keys(lobbies[remoteJid]);
            if (salasActivas.length === 0) return; 
            let idTarget = null; const argNumero = args[2];
            if (salasActivas.length === 1) { idTarget = salasActivas[0]; } 
            else { if (argNumero && lobbies[remoteJid][argNumero]) { idTarget = argNumero; } else { await sock.sendMessage(remoteJid, { text: `⚠️ Usa: *.me uno ${salasActivas.join('*, *.me uno ')}*` }); return; } }
            const sala = lobbies[remoteJid][idTarget];
            if (sala.participantes.includes(sender)) return; 
            sala.participantes.push(sender);
            if (sala.participantes.length < sala.limite) {
                let lista = ""; sala.participantes.forEach((p, i) => { lista += `\n${i + 1}. @${p.split('@')[0]}`; });
                const msj = `🎮 *${sala.tipo}* (Sala #${sala.id})\n🏅 *${sala.rango}*\n👥 Cupos: ${sala.participantes.length}/${sala.limite}\n────────────────${lista}\n────────────────\n👉 Escribe *.me uno ${sala.id}*`;
                await sock.sendMessage(remoteJid, { text: msj, mentions: sala.participantes });
            } else {
                clearTimeout(sala.timer);
                let txt = `🚀 *TEAM COMPLETO (Sala #${sala.id})*\n🎮 *${sala.tipo}*\n🏅 *${sala.rango}*\n\n`;
                sala.participantes.forEach((p, i) => txt += `${i+1}. @${p.split('@')[0]}\n`);
                txt += `\n#ELNS`; 
                await sock.sendMessage(remoteJid, { text: txt, mentions: sala.participantes });
                delete lobbies[remoteJid][idTarget]; 
            }
        }
        // ENCUESTA
        if (command === '.encuesta') {
            let contenido = text.replace(/^\.encuesta\s*/i, '').trim();
            if (!contenido) { await sock.sendMessage(remoteJid, { text: "⚠️ .encuesta Pregunta / Op1 / Op2" }); return; }
            let partes = contenido.split('/').map(s => s.trim()).filter(s => s);
            let opciones = partes.length > 1 ? partes.slice(1) : ["Sí", "No"];
            await sock.sendMessage(remoteJid, { poll: { name: "📊 ELNS: " + partes[0], values: opciones, selectableCount: 1 } });
        }
        // EXTRAS
        if (command === '.discord') { await sock.sendMessage(remoteJid, { image: { url: "https://cdn.discordapp.com/attachments/484533098634149888/1455432347754303681/Post_para_Facebook_Sorteo_Gamer_Moderno_Neon_Violeta_20251229_232815_0000.png?ex=6954b480&is=69536300&hm=eae2dedc8ab994215ba1a8a04e41b965f092ea9216ee559d6a89782d209e154b&" }, caption: "📢 *DISCORD*\n🔗 https://discord.gg/yXnPdAvef" }); }
        if (command === '.reglas') { await sock.sendMessage(remoteJid, { text: "⚡ *Reglas:*\n1️⃣ Respeto\n2️⃣ No spam\n3️⃣ 0 Toxicidad\n4️⃣ Fair Play\n#Elementals" }); }
        if (command === '.adm' && subCommand === '') {
             let textoAdmins = "👑 *ADMINISTRADORES ELEMENTALS* 👑\n\n";
            admins.forEach(a => { textoAdmins += `👤 ${a.nombre} — +${a.numero}\n`; });
            await sock.sendMessage(remoteJid, { text: textoAdmins });
        }
    });
}
connectToWhatsApp();
