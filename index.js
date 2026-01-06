const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

// ⚠️ TU NUMERO
const MY_PHONE_NUMBER = "525532397858"; 
const MAX_LOBBIES = 6; 
const PORT = process.env.PORT || 3000;

const RANGOS = {
    'hierro': 'Hierro ⚔️ Bronce', 'bronce': 'Bronce ⚔️ Plata', 'plata': 'Plata ⚔️ Oro', 'oro': 'Oro ⚔️ Platino',
    'platino': 'Platino ⚔️ Esmeralda', 'esmeralda': 'Esmeralda ⚔️ Diamante', 'diamante': 'Diamante ⚔️ Maestro',
    'master': 'Maestro ⚔️ Gran Maestro', 'maestro': 'Maestro ⚔️ Gran Maestro', 'gm': 'Gran Maestro ⚔️ Retador',
    'grandmaster': 'Gran Maestro ⚔️ Retador', 'granmaestro': 'Gran Maestro ⚔️ Retador',
    'challenger': 'Retador ⚔️ Soberano', 'retador': 'Retador ⚔️ Soberano'
};

let lobbies = {};

// SERVIDOR WEB (Vital para Render)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot Elementals: ONLINE V15 (Anti-Sleep)');
});
server.listen(PORT, () => { console.log(`🌐 Web online puerto ${PORT}`); });

// 💓 ANTI-SLEEP INTERNO (Mantiene la consola activa)
setInterval(() => {
    console.log("💓 Bot Elementals: Manteniendo sesión activa...");
}, 60000); // Imprime cada 1 minuto

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_termux_render_final');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false,
        connectTimeoutMs: 60000,
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                await delay(3000);
                const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
                const codeLimpio = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n\n🟢 CODIGO: ${codeLimpio} 🟢\n\n`);
            } catch (e) { console.log("⚠️ Esperando...", e.message); }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ BOT V15 ACTIVO - MODO VIGILIA');
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
                const txtMenu = "🤖 *COMANDOS ELEMENTALS* 🤖\n\n" +
                                "🏆 *RANKED*\n" +
                                "• .ranked duo [elo]\n" +
                                "• .ranked trio [elo]\n" +
                                "• .ranked 5q\n\n" +
                                "❄️ *ARAM*\n" +
                                "• .aram duo\n" +
                                "• .aram trio\n" +
                                "• .aram 4q | 5q\n\n" +
                                "🛠️ *BUILDS*\n" +
                                "• .build [Campeon]\n\n" +
                                "📥 *ACCIONES*\n" +
                                "• .me uno [ID]\n\n" +
                                "📊 *ENCUESTAS*\n" +
                                "• .encuesta Pregunta / Op1 / Op2\n\n" +
                                "⚡ *INFO*\n" +
                                "• .discord | .tiktok | .reglas\n" +
                                "• .adm | .atencion";
                await sock.sendMessage(remoteJid, { text: txtMenu });
            }

            // COMANDOS EXTRA
            if (command === '.tiktok') await sock.sendMessage(remoteJid, { image: { url: "https://i.imgur.com/dqaeRXo.jpeg" }, caption: "🎥 *TIKTOK OFICIAL*\n\nEn este Canal se transmiten los torneos y eventos de Elementals.\n\n🔗 https://www.tiktok.com/@uvitoooo?_r=1&_t=ZS-92m3y2mwL1F" });
            if (command === '.reglas') await sock.sendMessage(remoteJid, { text: "⚡ *Reglas:*\n1️⃣ Respeto (no flamear ni ofender)\n2️⃣ No spam\n3️⃣ Sin contenido inapropiado\n4️⃣ Juego limpio\n5️⃣ Promoción con permiso\n6️⃣ Respeta al staff\n\n#Elementals ⚡" });
            if (command === '.build') {
                if (!args[1]) return sock.sendMessage(remoteJid, { text: "⚠️ Dime el campeón.\nEjemplo: .build yasuo" });
                const champName = args.slice(1).join("-").toLowerCase(); 
                const champDisplay = args.slice(1).join(" ").toUpperCase();
                const linkFire = `https://www.wildriftfire.com/guide/${champName}`;
                const linkBest = `https://bestbuildwr.com/champions/${champName}`;
                await sock.sendMessage(remoteJid, { text: `🛠️ *BUILD PRO: ${champDisplay}*\n\n🔥 *WildRiftFire*:\n🔗 ${linkFire}\n\n⚡ *BestBuildWR*:\n🔗 ${linkBest}`, matchedText: linkFire });
            }
            if (command === '.discord') await sock.sendMessage(remoteJid, { image: { url: "https://i.imgur.com/ttP1mk4.jpeg" }, caption: "📢 *DISCORD OFICIAL*\n🔗 https://discord.gg/yXnPdAvef" });
            if (command === '.adm') await sock.sendMessage(remoteJid, { text: "👑 *ADMINISTRADORES*\n👤 Uvi - +525654812179\n👤 Estef - +573114860414\n👤 Samu - +573173607093\n👤 Cham - +59894793177\n👤 Ore - +50687309582" });
            
            // RANKED Y ARAM
            if (command === '.aram') {
                if (!['duo','trio','4q','cuarteto','5q'].includes(subCommand)) return sock.sendMessage(remoteJid, { text: "⚠️ Use: .aram duo | trio | 4q | 5q" });
                let limite = 5; if(subCommand==='duo') limite=2; if(subCommand==='trio') limite=3; if(subCommand==='4q'||subCommand==='cuarteto') limite=4;
                let salaID = null; for(let i=1;i<=MAX_LOBBIES;i++) if(!lobbies[remoteJid][i]){salaID=i;break;}
                if(!salaID) return sock.sendMessage(remoteJid,{text:"⚠️ Salas llenas"});
                let aviso=""; let ments=[sender];
                if(text.includes('avisar') && remoteJid.endsWith('@g.us')) { const meta=await sock.groupMetadata(remoteJid); ments=meta.participants.map(p=>p.id); aviso="\n📢 *LLAMADO*"; }
                lobbies[remoteJid][salaID]={id:salaID, tipo:`ARAM`, rango:'Abismo', limite, participantes:[sender], timer:setTimeout(()=>{delete lobbies[remoteJid][salaID]; sock.sendMessage(remoteJid,{text:`🗑️ Sala ${salaID} expiró`})},300000)};
                await sock.sendMessage(remoteJid,{text:`🎮 *ARAM* (Sala ${salaID})\n👥 1/${limite}\n👉 .me uno ${salaID}${aviso}`, mentions:ments});
            }
            if (command === '.ranked') {
                if (!['duo','trio','5q'].includes(subCommand)) return;
                let salaID = null; for(let i=1;i<=MAX_LOBBIES;i++) if(!lobbies[remoteJid][i]){salaID=i;break;}
                if(!salaID) return sock.sendMessage(remoteJid,{text:"⚠️ Salas llenas"});
                let limite=5; if(subCommand==='duo') limite=2; if(subCommand==='trio') limite=3;
                let rango = RANGOS[eloArg] || "Elo Libre";
                let aviso=""; let ments=[sender];
                if(text.includes('avisar') && remoteJid.endsWith('@g.us')) { const meta=await sock.groupMetadata(remoteJid); ments=meta.participants.map(p=>p.id); aviso="\n📢 *LLAMADO*"; }
                lobbies[remoteJid][salaID]={id:salaID, tipo:`RANKED ${subCommand.toUpperCase()}`, rango, limite, participantes:[sender], timer:setTimeout(()=>{delete lobbies[remoteJid][salaID]; sock.sendMessage(remoteJid,{text:`🗑️ Sala ${salaID} expiró`})},300000)};
                await sock.sendMessage(remoteJid,{text:`🎮 *RANKED* (Sala ${salaID})\n🏅 ${rango}\n👥 1/${limite}\n👉 .me uno ${salaID}${aviso}`, mentions:ments});
            }
            if (command === '.me' && subCommand === 'uno') {
                let id=args[2]; const keys=Object.keys(lobbies[remoteJid]);
                if(!id && keys.length===1) id=keys[0];
                const sala=lobbies[remoteJid][id]; if(!sala||sala.participantes.includes(sender)) return;
                sala.participantes.push(sender);
                if(sala.participantes.length<sala.limite){
                    let l=""; sala.participantes.forEach((p,i)=>l+=`\n${i+1}. @${p.split('@')[0]}`);
                    await sock.sendMessage(remoteJid,{text:`🎮 *${sala.tipo}*\n👥 ${sala.participantes.length}/${sala.limite}\n${l}\n👉 .me uno ${sala.id}`, mentions:sala.participantes});
                } else {
                    clearTimeout(sala.timer); let l=""; sala.participantes.forEach((p,i)=>l+=`\n${i+1}. @${p.split('@')[0]}`);
                    await sock.sendMessage(remoteJid,{text:`🚀 *FULL TEAM*\n🎮 ${sala.tipo}\n${l}\n#ELNS`, mentions:sala.participantes}); delete lobbies[remoteJid][id];
                }
            }
            if (command === '.encuesta') {
                let c=text.replace(/^\.encuesta\s*/i,'').trim(); let p=c.split('/').map(s=>s.trim()).filter(s=>s);
                let op=p.length>1?p.slice(1):["Sí","No"];
                await sock.sendMessage(remoteJid,{poll:{name:"📊 "+p[0],values:op,selectableCount:1}});
            }
            if (command === '.atencion' && remoteJid.endsWith('@g.us')) {
                const meta=await sock.groupMetadata(remoteJid);
                await sock.sendMessage(remoteJid,{text:args.slice(1).join(" ")||"📢 *Atención*",mentions:meta.participants.map(p=>p.id)});
            }
        } catch(e){console.log(e)}
    });
}
connectToWhatsApp();
