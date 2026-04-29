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
const MAX_LOBBIES=6;
const PORT=process.env.PORT||10000;

// Reemplaza con IDs reales usando .idgrupo
const GROUP_GENERAL="120363402802073822@g.us";
const GROUP_RECLUTAMIENTO="120363419361096786@g.us";

const WELCOME_GROUPS=[
GROUP_GENERAL,
GROUP_RECLUTAMIENTO,
"120363423601849121@g.us"
];

const RANGOS={
'hierro':'Hierro ⚔️ Bronce',
'bronce':'Bronce ⚔️ Plata',
'plata':'Plata ⚔️ Oro',
'oro':'Oro ⚔️ Platino',
'platino':'Platino ⚔️ Esmeralda',
'esmeralda':'Esmeralda ⚔️ Diamante',
'diamante':'Diamante ⚔️ Maestro'
};

let lobbies={};

const server=http.createServer((req,res)=>{
res.writeHead(200,{'Content-Type':'text/plain'});
res.end('🤖 Bot Elementals Online');
});

server.listen(PORT,()=>{
console.log(`🌐 Servidor activo puerto ${PORT}`);
});

async function connectToWhatsApp(){

const {state,saveCreds}=await useMultiFileAuthState('auth_elementals');
const {version}=await fetchLatestBaileysVersion();

const sock=makeWASocket({
version,
auth:state,
printQRInTerminal:false,
logger:pino({level:'silent'}),
browser:["Ubuntu","Chrome","20.0.04"],
syncFullHistory:false,
connectTimeoutMs:60000,
defaultQueryTimeoutMs:0
});

// ===== PAIRING ORIGINAL (SE DEJA IGUAL) =====
if(!sock.authState.creds.registered){
console.log('⏳ Preparando solicitud de código...');
await delay(5000);
try{
const code=await sock.requestPairingCode(MY_PHONE_NUMBER);
const codeLimpio=code?.match(/.{1,4}/g)?.join('-')||code;
console.log(`\n🔗 CÓDIGO: ${codeLimpio}\n`);
}catch(err){
console.log('❌ Error pairing:',err.message);
}
}

sock.ev.on('creds.update',saveCreds);

sock.ev.on('connection.update',(update)=>{
const {connection,lastDisconnect}=update;

if(connection==='close'){
const reason=lastDisconnect?.error?.output?.statusCode;
if(reason!==DisconnectReason.loggedOut){
setTimeout(()=>connectToWhatsApp(),5000);
}
}

if(connection==='open'){
console.log('✅ CONECTADO A WHATSAPP');
}
});

// ===== BIENVENIDA SOLO EN GRUPOS AUTORIZADOS =====
sock.ev.on('group-participants.update',async(update)=>{
try{
console.log('Evento grupo:', update);
if(
update.action!=='add' &&
update.action!=='invite'
) return;
if(!WELCOME_GROUPS.includes(update.id)) return;

for(const user of update.participants){
let mensaje='';

if(update.id===GROUP_GENERAL){
mensaje=`🌪️ ELEMENTALS – Wild Rift 🌊
Comunidad oficial del gremio ⚡

Bienvenid@ @${user.split('@')[0]}

🎮 Partidas | 🔥 Torneos | 📈 Mejora continua

🎙️Discord: https://discord.gg/hybTpQX66

🤝 Espacio para jugar, convivir y crecer juntos

👑 Administradores:

Uvi — +525654812179
Estef — +573114860414
Samu — +573173607093
Cham — +59894793177

⚡ Reglas:
1️⃣ Respeto (no flamear ni ofender)
2️⃣ No spam
3️⃣ Sin contenido inapropiado
4️⃣ Juego limpio
5️⃣ Promoción con permiso
6️⃣ Respeta al staff

#Elementals ⚡`;
}
else if(update.id===GROUP_RECLUTAMIENTO){
mensaje=`@${user.split('@')[0]}

•☆ Bienvenid@ ☆•°
¿Has tenido experiencia en otros gremios?
Somos ELEMENTALS — en el apartado de gremios búscanos como ELNS.
Si necesitas ayuda, pídela con confianza.
¡Recuerda enviarnos tu captura al ingresar para aceptarte en los demás grupos!
°•☆`;
}

Busca nuestro gremio como ELNS.
📸 Envía tu captura para acceso a más grupos.`;
}
else if(update.id==="120363423601849121@g.us"){
mensaje=`🧪 GRUPO DE PRUEBAS

Bienvenid@ @${user.split('@')[0]}

Si ves este mensaje, la bienvenida automática funciona ✅`;
}

await sock.sendMessage(update.id,{
image:{
url:'./bienvenida.png'
},
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
const text=m.message.conversation||m.message.extendedTextMessage?.text||"";
const args=text.trim().split(/\s+/);
const command=args[0].toLowerCase();
const subCommand=args[1]?.toLowerCase()||"";
const sender=m.key.participant||m.key.remoteJid;

if(!lobbies[remoteJid]) lobbies[remoteJid]={};

if(command==='.menu'){
await sock.sendMessage(remoteJid,{text:
`╔═══ ⚡ *ELEMENTALS BOT* ⚡ ═══╗

🎮 *LOBBIES*
┆ .ranked duo [elo]
┆ .ranked trio [elo]
┆ .ranked 5q [elo]
┆ .me uno [id]

🛠️ *UTILIDADES*
┆ .build [campeón]

📚 *COMUNIDAD*
┆ .reglas
┆ .adm
┆ .dc
┆ .bienvenida
┆ .todos [mensaje]

━━━━━━━━━━━━━━━━━━
🏛️ Gremio: *ELNS*
🔥 Powered by Elementals
╚════════════════════╝`
});
}

if(command==='.todos' && remoteJid.endsWith('@g.us')){
const meta=await sock.groupMetadata(remoteJid);
await sock.sendMessage(remoteJid,{
text:args.slice(1).join(' ')||'📢 Atención a todos',
mentions:meta.participants.map(p=>p.id)
});
}

if(command==='.idgrupo'){
if(!remoteJid.endsWith('@g.us')) return;
await sock.sendMessage(remoteJid,{text:`🆔 ${remoteJid}`});
}

if(command==='.dc'){
await sock.sendMessage(remoteJid,{
image:{
url:'./dc.png'
},
caption:`🎮 *DISCORD OFICIAL ELEMENTALS*

🔗 https://discord.gg/hybTpQX66

Comunidad`
});
});
}

if(command==='.adm'){
await sock.sendMessage(remoteJid,{
text:
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

if(command==='.bienvenida'){
await sock.sendMessage(remoteJid,{
image:{url:'https://i.imgur.com/ZObpHNP.jpeg'},
caption:'✨ Bienvenid@ a Elementals'
});
}

if(command==='.reglas'){
await sock.sendMessage(remoteJid,{text:
`⚖️ *REGLAS ELNS*

1️⃣ Respeto
2️⃣ No spam
3️⃣ Juego limpio
4️⃣ No flame`
});
}

if(command==='.build'){
if(!args[1]) return;
const champ=args[1].toLowerCase();
await sock.sendMessage(remoteJid,{text:
`https://www.wildriftfire.com/guide/${champ}`
});
}

if(command==='.ranked'){
if(!['duo','trio','5q'].includes(subCommand)) return;

let limite=5;
if(subCommand==='duo') limite=2;
if(subCommand==='trio') limite=3;

let salaID=1;
while(lobbies[remoteJid][salaID]) salaID++;

const eloArg=args.slice(2).join('').toLowerCase();
const rango=RANGOS[eloArg]||'Elo Libre';

lobbies[remoteJid][salaID]={
id:salaID,
limite,
participantes:[sender],
rango,
tipo:`RANKED ${subCommand.toUpperCase()}`
};

await sock.sendMessage(remoteJid,{
text:`🎮 ${subCommand.toUpperCase()} (Sala ${salaID})
🏅 ${rango}
👥 1/${limite}
👉 .me uno ${salaID}`
});
}

if(command==='.me'&&subCommand==='uno'){
let id=args[2];
if(!lobbies[remoteJid][id]) return;
let sala=lobbies[remoteJid][id];

if(sala.participantes.includes(sender)){
return sock.sendMessage(remoteJid,{text:'⚠️ Ya estás dentro'});
}

sala.participantes.push(sender);

if(sala.participantes.length>=sala.limite){
await sock.sendMessage(remoteJid,{
text:`🚀 FULL TEAM\n#ELNS`,
mentions:sala.participantes
});
delete lobbies[remoteJid][id];
}else{
await sock.sendMessage(remoteJid,{
text:`Faltan ${sala.limite-sala.participantes.length}`,
mentions:[sender]
});
}
}

}catch(e){
console.log('Error:',e)
}
});

}

connectToWhatsApp();