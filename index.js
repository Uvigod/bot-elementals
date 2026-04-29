const {
 default: makeWASocket,
 useMultiFileAuthState,
 DisconnectReason,
 delay,
 fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino=require('pino');
const http=require('http');

const MY_PHONE_NUMBER="525532397858";
const PORT=process.env.PORT||10000;
const MAX_LOBBIES=6;

const GROUP_GENERAL="120363402802073822@g.us";
const GROUP_RECLUTAMIENTO="120363419361096786@g.us";
const GROUP_PRUEBA="120363423601849121@g.us";

const WELCOME_GROUPS=[
GROUP_GENERAL,
GROUP_RECLUTAMIENTO,
GROUP_PRUEBA
];

const RANGOS={
'hierro':'Hierro ⚔️ Bronce',
'bronce':'Bronce ⚔️ Plata',
'plata':'Plata ⚔️ Oro',
'oro':'Oro ⚔️ Platino',
'platino':'Platino ⚔️ Esmeralda',
'esmeralda':'Esmeralda ⚔️ Diamante',
'diamante':'Diamante ⚔️ Maestro',
'master':'Maestro ⚔️ Gran Maestro',
'maestro':'Maestro ⚔️ Gran Maestro',
'gm':'Gran Maestro ⚔️ Retador',
'retador':'Retador ⚔️ Soberano'
};

let lobbies={};

http.createServer((req,res)=>{
res.writeHead(200,{'Content-Type':'text/plain'});
res.end('Bot Elementals Online');
}).listen(PORT,()=>console.log('🌐 Web online'));

async function connectToWhatsApp(){
const {state,saveCreds}=await useMultiFileAuthState('auth_elementals');
const {version}=await fetchLatestBaileysVersion();

const sock=makeWASocket({
version,
auth:state,
printQRInTerminal:false,
logger:pino({level:'silent'}),
browser:["Ubuntu","Chrome","20.0.04"],
connectTimeoutMs:60000,
defaultQueryTimeoutMs:0
});

if(!sock.authState.creds.registered){
await delay(5000);
const code=await sock.requestPairingCode(MY_PHONE_NUMBER);
console.log('🔗',code?.match(/.{1,4}/g)?.join('-'));
}

sock.ev.on('creds.update',saveCreds);

sock.ev.on('connection.update',({connection,lastDisconnect})=>{
if(connection==='open') console.log('✅ CONECTADO');
if(connection==='close'){
const reason=lastDisconnect?.error?.output?.statusCode;
if(reason!==DisconnectReason.loggedOut){
setTimeout(connectToWhatsApp,5000);
}
}
});

// BIENVENIDAS (versión que sí funcionó con imagen local)
sock.ev.on('group-participants.update',async(update)=>{
try{
if(update.action!=='add' && update.action!=='invite') return;
if(!WELCOME_GROUPS.includes(update.id)) return;

for(const user of update.participants){
let mensaje='';

if(update.id===GROUP_GENERAL){
mensaje=`⚡ ¡Bienvenidos a Elementals! ⚡

Bienvenid@ @${String(user).split('@')[0]}

🎮 Partidas | 🔥 Torneos | 📈 Skill
🤝 Un espacio para jugar, convivir y subir de nivel.

📍 Únete al Discord:
👉 https://discord.gg/hybTpQX66

👑 Staff:
🇲🇽 Uvi (+52 56 5481 2179)
🇨🇴 Estef (+57 311 486 0414)
🇨🇴 Samu (+57 317 360 7093)
🇺🇾 Cham (+598 94 793 177)

📜 Reglas de Oro:
Respeto total (Cero toxicidad).
No Spam ni contenido inapropiado.
Juego limpio siempre.
Promoción solo con permiso.

#Elementals ⚡`;
}
else if(update.id===GROUP_RECLUTAMIENTO){
mensaje=`@${String(user).split('@')[0]}

•☆ Bienvenid@ ☆•°
¿Has tenido experiencia en otros gremios?
Busca ELNS en gremios.
¡Envía tu captura al ingresar!
°•☆`;
}
else if(update.id===GROUP_PRUEBA){
mensaje=`🧪 GRUPO DE PRUEBAS

Bienvenid@ @${String(user).split('@')[0]}

Funciona ✅`;
}

await sock.sendMessage(update.id,{
image:{url:'./bienvenida.png'},
caption:mensaje,
mentions:[user]
});
}
}catch(e){console.log(e)}
});

sock.ev.on('messages.upsert',async({messages})=>{
try{
const m=messages[0];
if(!m.message||m.key.fromMe) return;

const remoteJid=m.key.remoteJid;
const text=m.message.conversation||m.message.extendedTextMessage?.text||'';
if(!text) return;

const args=text.trim().split(/\s+/);
const command=args[0].toLowerCase();
const subCommand=args[1]?.toLowerCase()||'';
const sender=m.key.participant||remoteJid;

if(!lobbies[remoteJid]) lobbies[remoteJid]={};

if(command==='.menu'){
return sock.sendMessage(remoteJid,{text:
`╔══════ ⚡ *ELEMENTALS BOT* ⚡ ══════╗

🎮 *LOBBIES RANKED*
┆ .ranked duo [elo]
┆ .ranked trio [elo]
┆ .ranked 5q [elo]
┆ .me uno [id]

🛠️ *UTILIDADES*
┆ .build [campeón]
┆ .todos [mensaje]

🏛️ *COMUNIDAD*
┆ .dc
┆ .adm
┆ .reglas

━━━━━━━━━━━━━━━━━━━━
⚔️ Gremio: ELNS
🌪️ Wild Rift Community
╚════════════════════════╝`
});
}

if(command==='.dc'){
return sock.sendMessage(remoteJid,{
image:{url:'./dc.png'},
caption:`🎮 DISCORD OFICIAL ELEMENTALS\n\nhttps://discord.gg/hybTpQX66\n\nComunidad`
});
}

if(command==='.adm'){
return sock.sendMessage(remoteJid,{text:
`👑 *STAFF ELEMENTALS*

⚔️ Uvi
📞 +525654812179

⚔️ Estef
📞 +573114860414

⚔️ Samu
📞 +573173607093

⚔️ Cham
📞 +59894793177`
});
}

if(command==='.reglas'){
return sock.sendMessage(remoteJid,{text:
`⚖️ *REGLAS ELNS*

1️⃣ Respeto
2️⃣ No spam
3️⃣ Juego limpio
4️⃣ No flame ni toxicidad`
});
}

if(command==='.todos' && remoteJid.endsWith('@g.us')){
const meta=await sock.groupMetadata(remoteJid);
return sock.sendMessage(remoteJid,{
text:args.slice(1).join(' ')||'📢 Atención a todos',
mentions:meta.participants.map(p=>p.id)
});
}

if(command==='.build'){
if(!args[1]) return;
return sock.sendMessage(remoteJid,{text:
`https://www.wildriftfire.com/guide/${args[1].toLowerCase()}`
});
}

if(command==='.ranked'){
if(!['duo','trio','5q'].includes(subCommand)) return;
let limite=subCommand==='duo'?2:subCommand==='trio'?3:5;
let salaID=1;
while(lobbies[remoteJid][salaID]) salaID++;
const eloArg=args.slice(2).join('').toLowerCase();
const rango=RANGOS[eloArg]||'Elo Libre';

lobbies[remoteJid][salaID]={
id:salaID,
limite,
participantes:[sender],
rango,
timer:setTimeout(()=>{
delete lobbies[remoteJid][salaID]
},300000)
};

return sock.sendMessage(remoteJid,{text:
`🎮 ${subCommand.toUpperCase()} Sala ${salaID}\n🏅 ${rango}\n👥 1/${limite}\n👉 .me uno ${salaID}`
});
}

if(command==='.me' && subCommand==='uno'){
const id=args[2];
const sala=lobbies[remoteJid][id];
if(!sala) return;
if(sala.participantes.includes(sender)) return;

sala.participantes.push(sender);

if(sala.participantes.length>=sala.limite){
clearTimeout(sala.timer);
await sock.sendMessage(remoteJid,{
text:'🚀 FULL TEAM #ELNS',
mentions:sala.participantes
});
delete lobbies[remoteJid][id];
}else{
await sock.sendMessage(remoteJid,{text:
`Faltan ${sala.limite-sala.participantes.length}`
});
}
}

}catch(e){console.log(e)}
});
}

connectToWhatsApp();