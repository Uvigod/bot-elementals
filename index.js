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

// RANGOS
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

// SERVIDOR WEB
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot Elementals: ONLINE V7.4');
});
server.listen(PORT, () => { console.log(`🌐 Web online puerto ${PORT}`); });

async function connectToWhatsApp() {
    // 🗑️ CAMBIO CLAVE: Nombre nuevo para borrar memoria vieja
    const { state, saveCreds } = await useMultiFileAuthState('auth_session_v8_reset');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
        syncFullHistory: false,
        connectTimeoutMs: 60000, 
    });

    // GENERADOR DE CÓDIGO
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                await delay(4000); 
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                const codeLimpio = code?.match(/.{1,4}/g)?.join("-") || code;
                
                console.log(`\n\n🟢🟢🟢 CODIGO NUEVO PARA VINCULAR 🟢🟢🟢`);
                console.log(`👉      ${codeLimpio}      👈`);
                console.log(`🟢🟢🟢 ESCRIBELO RAPIDO EN WHATSAPP 🟢🟢🟢\n\n`);

            } catch (e) { console.log("⚠️ Esperando...", e.message); }
        }, 6000); 
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) setTimeout(connectToWhatsApp, 5000);
        } else if (connection === 'open') {
            console.log('✅ BOT V7.4 CONECTADO - MEMORIA LIMPIA');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;
            const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
            if (!text) return;

            const remoteJid = m.key.remoteJid;
            const sender = m.key.participant || m.key.remoteJid; 
            const args = text.trim().split(/\s+/);
            const command = args[0].toLowerCase(); 
            const subCommand = args[1] ? args[1].toLowerCase() : ""; 
            const eloArg = args.slice(2).join("").toLowerCase(); 
            
            if (!lobbies[remoteJid]) lobbies[remoteJid] = {};

            // --- COMANDOS ---
            if (command === '.menu' || command === '.ayuda') {
                await sock.sendMessage(remoteJid, { text: "🤖 *ELEMENTALS BOT*\n.ranked\n.aram\n.encuesta\n.discord\n.adm | .atencion" });
            }
            if (command === '.encuesta') {
                let contenido = text.replace(/^\.encuesta\s*/i, '').trim();
                if (!contenido) return sock.sendMessage(remoteJid, { text: "⚠️ Uso: .encuesta Pregunta / Op1 / Op2" });
                let partes = contenido.split('/').map(s => s.trim()).filter(s => s);
                let opciones = partes.length > 1 ? partes.slice(1) : ["Sí", "No"];
                await sock.sendMessage(remoteJid, { poll: { name: "📊 " + partes[0], values: opciones, selectableCount: 1 } });
            }
            if (command === '.discord') {
                await sock.sendMessage(remoteJid, { image: { url: "https://cdn.discordapp.com/attachments/484533098634149888/1455432347754303681/Post_para_Facebook_Sorteo_Gamer_Moderno_Neon_Violeta_20251229_232815_0000.png" }, caption: "🔗 https://discord.gg/yXnPdAvef" });
            }
            if (command === '.reglas') {
                 await sock.sendMessage(remoteJid, { text: "⚡ *Reglas:*\nRespeto, 0 Toxicidad, Fair Play." });
            }
            if (command === '.adm') {
                if (subCommand === 'nuevo' && sender.includes(MY_PHONE_NUMBER)) { admins.push({ nombre: args[2], numero: args[3] }); return sock.sendMessage(remoteJid, {text: "✅"}); }
                if (subCommand === 'borrar' && sender.includes(MY_PHONE_NUMBER)) { admins = admins.filter(a => a.nombre.toLowerCase() !== args[2].toLowerCase()); return sock.sendMessage(remoteJid, {text: "🗑️"}); }
                let t = "👑 *ADMINS*\n"; admins.forEach(a => t += `👤 ${a.nombre}\n`); await sock.sendMessage(remoteJid, { text: t });
            }
            if (command === '.ranked') {
                if (!['duo','trio','5q'].includes(subCommand)) return;
                let salaID = null; for (let i=1; i<=MAX_LOBBIES; i++) if(!lobbies[remoteJid][i]) {salaID=i; break;}
                if(!salaID) return sock.sendMessage(remoteJid,{text:"⚠️ Lleno"});
                let limite = (subCommand==='duo')?2:(subCommand==='trio')?3:5;
                let rango = RANGOS[eloArg.replace('avisar','').trim()] || "Elo Libre";
                let aviso=""; let ments=[sender];
                if(text.includes('avisar') && remoteJid.endsWith('@g.us')) { const meta=await sock.groupMetadata(remoteJid); ments=meta.participants.map(p=>p.id); aviso="\n📢 *LLAMADO*"; }
                lobbies[remoteJid][salaID]={id:salaID, tipo:`RANKED ${subCommand.toUpperCase()}`, rango, limite, participantes:[sender], timer: setTimeout(()=>{delete lobbies[remoteJid][salaID];},300000)};
                await sock.sendMessage(remoteJid, {text:`🎮 *RANKED ${subCommand.toUpperCase()}* #${salaID}\n🏅 ${rango}\n👥 1/${limite}\n👉 .me uno ${salaID}${aviso}`, mentions:ments});
            }
            if (command === '.aram') {
                if (!['duo','trio','4q','5q'].includes(subCommand)) return;
                let salaID = null; for (let i=1; i<=MAX_LOBBIES; i++) if(!lobbies[remoteJid][i]) {salaID=i; break;}
                if(!salaID) return sock.sendMessage(remoteJid,{text:"⚠️ Lleno"});
                let limite=5; if(subCommand==='duo')limite=2; if(subCommand==='trio')limite=3; if(subCommand==='4q')limite=4;
                let aviso=""; let ments=[sender];
                if(text.includes('avisar') && remoteJid.endsWith('@g.us')) { const meta=await sock.groupMetadata(remoteJid); ments=meta.participants.map(p=>p.id); aviso="\n📢 *LLAMADO*"; }
                lobbies[remoteJid][salaID]={id:salaID, tipo:`ARAM`, rango:"Abismo", limite, participantes:[sender], timer: setTimeout(()=>{delete lobbies[remoteJid][salaID];},300000)};
                await sock.sendMessage(remoteJid, {text:`❄️ *ARAM* #${salaID}\n👥 1/${limite}\n👉 .me uno ${salaID}${aviso}`, mentions:ments});
            }
            if (command === '.me' && subCommand === 'uno') {
                let id=args[2]; const keys=Object.keys(lobbies[remoteJid]);
                if(!id && keys.length===1) id=keys[0];
                const sala=lobbies[remoteJid][id]; if(!sala || sala.participantes.includes(sender)) return;
                sala.participantes.push(sender);
                if(sala.participantes.length<sala.limite) {
                    let l=""; sala.participantes.forEach((p,i)=>l+=`\n${i+1}. @${p.split('@')[0]}`);
                    await sock.sendMessage(remoteJid, {text:`🎮 *${sala.tipo}*\n👥 ${sala.participantes.length}/${sala.limite}\n${l}\n👉 .me uno ${sala.id}`, mentions:sala.participantes});
                } else {
                    clearTimeout(sala.timer); let l=""; sala.participantes.forEach((p,i)=>l+=`\n${i+1}. @${p.split('@')[0]}`);
                    await sock.sendMessage(remoteJid, {text:`🚀 *FULL TEAM (#${sala.id})*\n🎮 ${sala.tipo}\n${l}\n\n#ELNS Go!`, mentions:sala.participantes}); delete lobbies[remoteJid][id];
                }
            }
            // --- 👻 COMANDO .ATENCION ---
            if (command === '.atencion') {
                if (!remoteJid.endsWith('@g.us')) return;
                const meta = await sock.groupMetadata(remoteJid);
                const parts = meta.participants.map(p => p.id);
                const mensajeLimpio = args.slice(1).join(" ") || "📢 *Atención Gremio*";
                await sock.sendMessage(remoteJid, { text: mensajeLimpio, mentions: parts });
            }

        } catch (e) { console.log("Error:", e); }
    });
}
connectToWhatsApp();
