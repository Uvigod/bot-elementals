const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

const MY_PHONE_NUMBER = "525532397858";
const MAX_LOBBIES = 6;
const PORT = process.env.PORT || 10000;

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
  res.end('🤖 Bot Elementals: ONLINE (Anti-Sleep)');
});

server.listen(PORT, () => { 
  console.log(`🌐 Servidor Web activo en puerto: ${PORT}`); 
});

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_elementals');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
  });

  // SOLICITUD DE CÓDIGO DE VINCULACIÓN
  if (!sock.authState.creds.registered) {
    console.log("⏳ Preparando solicitud de código para:", MY_PHONE_NUMBER);
    await delay(5000); // Espera 5 segundos a que Render estabilice
    try {
      const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
      const codeLimpio = code?.match(/.{1,4}/g)?.join("-") || code;
      console.log(`\n\n🔗 CÓDIGO DE VINCULACIÓN: ${codeLimpio}\n\n`);
    } catch (err) {
      console.log("❌ Error al pedir código:", err.message);
    }
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Conexión cerrada. ¿Reintentar?:', shouldReconnect);
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      console.log('✅ CONECTADO EXITOSAMENTE A WHATSAPP');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const m = messages[0];
      if (!m.message || m.key.fromMe) return;

      const remoteJid = m.key.remoteJid;
      const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
      const args = text.trim().split(/\s+/);
      const command = args[0].toLowerCase();
      const subCommand = args[1] ? args[1].toLowerCase() : "";
      const eloArg = args.slice(2).join("").toLowerCase();
      const sender = m.key.participant || m.key.remoteJid;

      if (!lobbies[remoteJid]) lobbies[remoteJid] = {};

      if (command === '.menu') {
        await sock.sendMessage(remoteJid, { text: "🤖 *BOT ELEMENTALS*\n\n• .ranked duo/trio/5q [elo]\n• .aram duo/trio/5q\n• .build [campeon]\n• .bienvenida\n• .reglas" });
      }

      if (command === '.bienvenida') {
        await sock.sendMessage(remoteJid, { 
          image: { url: "https://i.imgur.com/ZObpHNP.jpeg" }, 
          caption: "•☆ Bienvenid@ ☆•°\nSomos ELEMENTALS (ELNS).\n¡Envía captura al entrar para el grupo principal!" 
        });
      }

      if (command === '.reglas') {
        await sock.sendMessage(remoteJid, { text: "⚡ *Reglas ELNS:*\n1. Respeto\n2. No spam\n3. Juego limpio." });
      }

      if (command === '.build') {
        if (!args[1]) return;
        const champ = args[1].toLowerCase();
        await sock.sendMessage(remoteJid, { text: `🛠️ *Build para ${champ.toUpperCase()}:*\n🔗 https://www.wildriftfire.com/guide/${champ}` });
      }

      // Lógica simple de unirse (.me uno)
      if (command === '.me' && subCommand === 'uno') {
        let id = args[2];
        if(!lobbies[remoteJid][id]) return;
        let sala = lobbies[remoteJid][id];
        if(sala.participantes.includes(sender)) return;
        
        sala.participantes.push(sender);
        if(sala.participantes.length >= sala.limite) {
          await sock.sendMessage(remoteJid, { text: `🚀 *FULL TEAM (Sala ${id})*\n#ELNS ⚡`, mentions: sala.participantes });
          delete lobbies[remoteJid][id];
        } else {
          await sock.sendMessage(remoteJid, { text: `🎮 *Unido a Sala ${id}*\nFaltan: ${sala.limite - sala.participantes.length}`, mentions: [sender] });
        }
      }

    } catch (e) { console.log("Error:", e); }
  });
}

connectToWhatsApp();
