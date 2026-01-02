const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http'); 

// ⚠️ TU NUMERO
const MY_PHONE_NUMBER = "525532397858"; 

const PORT = process.env.PORT || 3000; 

// ADMINS
let admins = [
    { nombre: "Uvi", numero: "525654812179" },
    { nombre: "Estef", numero: "573114860414" },
    { nombre: "Samu", numero: "573173607093" },
    { nombre: "Cham", numero: "59894793177" },
    { nombre: "Ore", numero: "50687309582" }
];

const RANGOS = {
    'hierro': 'Hierro ⚔️ Bronce', 'bronce': 'Bronce ⚔️ Plata', 'plata': 'Plata ⚔️ Oro', 'oro': 'Oro ⚔️ Platino',
    'platino': 'Platino ⚔️ Esmeralda', 'esmeralda': 'Esmeralda ⚔️ Diamante', 'diamante': 'Diamante ⚔️ Maestro',
    'master': 'Maestro ⚔️ Gran Maestro', 'maestro': 'Maestro ⚔️ Gran Maestro', 'gm': 'Gran Maestro ⚔️ Retador',
    'grandmaster': 'Gran Maestro ⚔️ Retador', 'granmaestro': 'Gran Maestro ⚔️ Retador',
    'challenger': 'Retador ⚔️ Soberano', 'retador': 'Retador ⚔️ Soberano'
};

let lobbies = {};
const MAX_LOBBIES = 6; 

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot Elementals: ONLINE V9.0');
});
server.listen(PORT, () => { console.log(`🌐 Web online puerto ${PORT}`); });

async function connectToWhatsApp() {
    // ☢️ CAMBIO DE MEMORIA: Obliga a pedir código nuevo
    const { state, saveCreds } = await useMultiFileAuthState('auth_elementals_v9_final');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'), // Modo Mac para evitar bloqueos
        syncFullHistory: false,
        connectTimeoutMs: 60000, 
    });

    if (!sock.authState.creds.registered) {
        console.log("⏳ Esperando 5 segundos antes de pedir código...");
        setTimeout(async () => {
            try {
                await delay(5000); 
                console.log("📞 Intentando pedir código a WhatsApp...");
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                const codeLimpio = code?.match(/.{1,4}/g)?.join("-") || code;
                
                console.log(`\n\n🟢🟢🟢 CÓDIGO NUEVO (V9.0) 🟢🟢🟢`);
                console.log(`👉      ${codeLimpio}      👈`);
                console.log(`🟢🟢🟢 ¡ÚSALO YA! 🟢🟢🟢\n\n`);
            } catch (e) { 
                console.log("⚠️ Error pidiendo código:", e.message); 
                console.log("💡 Si dice 'rate-overlimit', espera 10 minutos.");
            }
        }, 5000); 
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) setTimeout(connectToWhatsApp, 5000);
        } else if (connection === 'open') {
            console.log('✅ BOT CONECTADO Y LISTO (V9.0)');
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

            // MENU
            if (command === '.menu' || command === '.ayuda') {
                const txt = "🤖 *ELEMENTALS BOT* 🤖\n\n🏆 *RANKED*\n.ranked duo | trio | 5q\n\n❄️ *ARAM*\n.aram duo | trio | 4q | 5q\n\n📊 *EXTRA*\n.encuesta | .discord | .reglas\n\n👑 *ADMIN*\n.adm | .atencion";
                await sock.sendMessage(remoteJid, { text: txt });
            }
            // DISCORD
            if (command === '.discord') {
                await sock.sendMessage(remoteJid, { text: "📢 *DISCORD OFICIAL ELEMENTALS*\n🔗 https://discord.gg/yXnPdAvef" });
            }
            // ADMINS
            if (command === '.adm') {
                if (subCommand === 'nuevo' && sender.includes(MY_PHONE_NUMBER)) { admins.push({ nombre: args[2], numero: args[3] }); return sock.sendMessage(remoteJid, {text: "✅"}); }
                if (subCommand === 'borrar' && sender.includes(MY_PHONE_NUMBER)) { admins = admins.filter(a => a.nombre.toLowerCase() !== args[2].toLowerCase()); return sock.sendMessage(remoteJid, {text: "🗑️"}); }
                let t = "👑 *ADMINISTRADORES*\n\n"; admins.forEach(a => t += `👤 ${a.nombre} — +${a.numero}\n`); await sock.sendMessage(remoteJid, { text: t });
            }
            // RANKED
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
            // ARAM
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
            // JUGAR
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
            // OTROS
            if (command === '.encuesta') {
                let contenido = text.replace(/^\.encuesta\s*/i, '').trim();
                let partes = contenido.split('/').map(s => s.trim()).filter(s => s);
                let opciones = partes.length > 1 ? partes.slice(1) : ["Sí", "No"];
                await sock.sendMessage(remoteJid, { poll: { name: "📊 " + (partes[0] || "Encuesta"), values: opciones, selectableCount: 1 } });
            }
            if (command === '.reglas') await sock.sendMessage(remoteJid, { text: "⚡ *Reglas:*\nRespeto, 0 Toxicidad, Fair Play." });
            if (command === '.atencion' && remoteJid.endsWith('@g.us')) {
                const meta = await sock.groupMetadata(remoteJid);
                await sock.sendMessage(remoteJid, { text: args.slice(1).join(" ") || "📢 *Atención*", mentions: meta.participants.map(p => p.id) });
            }

        } catch (e) { console.log("Error:", e); }
    });
}
connectToWhatsApp();
