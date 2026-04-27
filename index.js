const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

// ============================
// CONFIG
// ============================
const MY_PHONE_NUMBER = "525532397858";
const MAX_LOBBIES = 6;
const PORT = process.env.PORT || 3000;

// Reemplaza con tus IDs reales usando .idgrupo
const GROUP_GENERAL = "120363XXXXXXXX@g.us";
const GROUP_RECLUTAMIENTO = "120363YYYYYYYY@g.us";

const RANGOS = {
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
'grandmaster':'Gran Maestro ⚔️ Retador',
'granmaestro':'Gran Maestro ⚔️ Retador',
'challenger':'Retador ⚔️ Soberano',
'retador':'Retador ⚔️ Soberano'
};

let lobbies = {};

// ============================
// WEB SERVER (RENDER)
// ============================
const server = http.createServer((req,res)=>{
res.writeHead(200,{ 'Content-Type':'text/plain'});
res.end('🤖 Bot Elementals ONLINE');
});

server.listen(PORT,()=>{
console.log(`🌐 Web online puerto ${PORT}`)
});

// Autoping anti-sleep real
setInterval(()=>{
http.get(`http://localhost:${PORT}`)
},240000);

// ============================
async function connectToWhatsApp(){

const { state, saveCreds } = await useMultiFileAuthState('auth_termux_render_final');

const sock = makeWASocket({
auth: state,
printQRInTerminal:false,
logger:pino({level:'silent'}),
browser:["Ubuntu","Chrome","20.0.04"],
syncFullHistory:false,
connectTimeoutMs:60000,
});

// Pair code
if(!sock.authState.creds.registered){
setTimeout(async()=>{
try{
await delay(3000);
const code = await sock.requestPairingCode(MY_PHONE_NUMBER);
const limpio = code?.match(/.{1,4}/g)?.join('-') || code;
console.log(`\n🟢 CODIGO ${limpio}\n`)
}catch(e){
console.log('⚠️ Esperando...',e.message)
}
},3000)
}

sock.ev.on('creds.update', saveCreds);

// ============================
// CONEXION
// ============================
sock.ev.on('connection.update',(update)=>{
const {connection,lastDisconnect}=update;

if(connection==='close'){
const reason = lastDisconnect?.error?.output?.statusCode;

if(reason!==DisconnectReason.loggedOut){
setTimeout(()=>connectToWhatsApp(),5000);
}

}else if(connection==='open'){
console.log('✅ BOT ACTIVO');
}
});

// ============================
// BIENVENIDAS AUTOMATICAS
// ============================
sock.ev.on('group-participants.update', async(update)=>{
try{
if(update.action !== 'add') return;

for(const user of update.participants){

let mensaje='';

if(update.id===GROUP_GENERAL){
mensaje=
`🌟 ¡Bienvenid@ @${user.split('@')[0]} a ELEMENTALS! 🌟\n\n📌 Este es el chat general.\n🎮 Busca team, comparte builds y convive.\nUsa *.menu* para ver comandos.\n\n¡Disfruta la comunidad! ⚡`;
}

else if(update.id===GROUP_RECLUTAMIENTO){
mensaje=
`⚔️ Bienvenid@ @${user.split('@')[0]} ⚔️\n\nGracias por unirte al área de reclutamiento.\n\n📌 Busca nuestro gremio como *ELNS*\n📸 Envía tu captura al ingresar para darte acceso a más grupos.\n\n¡Te esperamos en Elementals! 🔥`;
}

else{
mensaje=`✨ Bienvenid@ @${user.split('@')[0]} a la comunidad Elementals.`
}

await sock.sendMessage(update.id,{
image:{
url:'https://i.imgur.com/ZObpHNP.jpeg'
},
caption:mensaje,
mentions:[user]
});

}
}catch(e){
console.log('Error bienvenida:',e)
}
});

// ============================
// MENSAJES
// ============================
sock.ev.on('messages.upsert', async({messages})=>{
try{
const m=messages[0];
if(!m.message||m.key.fromMe) return;

const text=
m.message.conversation ||
m.message.extendedTextMessage?.text || '';

if(!text) return;

const remoteJid=m.key.remoteJid;
const sender=m.key.participant || remoteJid;

const args=text.trim().split(/\s+/);
const command=args[0].toLowerCase();
const subCommand=args[1]?.toLowerCase()||'';
const eloArg=args.slice(2).join('').toLowerCase();

if(!lobbies[remoteJid]) lobbies[remoteJid]={};

// ============================
// MENU
// ============================
if(command==='.menu'||command==='.ayuda'){
await sock.sendMessage(remoteJid,{text:
`🤖 *COMANDOS ELEMENTALS* 🤖

🏆 .ranked duo [elo]
🏆 .ranked trio [elo]
🏆 .ranked 5q

❄️ .aram duo
❄️ .aram trio
❄️ .aram 4q | 5q

🛠 .build [campeón]
📥 .me uno [id]
📊 .encuesta pregunta / op1 / op2
🆔 .idgrupo
⚡ .discord .reglas .adm`
});
}

// ============================
// ID GRUPO
// ============================
if(command==='.idgrupo'){
if(!remoteJid.endsWith('@g.us')){
return sock.sendMessage(remoteJid,{text:'⚠️ Solo en grupos'})
}

await sock.sendMessage(remoteJid,{
text:`🆔 ID de este grupo:\n${remoteJid}`
});
}

if(command==='.tiktok'){
await sock.sendMessage(remoteJid,{image:{url:'https://i.imgur.com/dqaeRXo.jpeg'},caption:'🎥 Tiktok oficial\nhttps://www.tiktok.com/@uvitoooo'})
}

if(command==='.reglas'){
await sock.sendMessage(remoteJid,{text:
`⚡ Reglas:
1 Respeto
2 No spam
3 Juego limpio
4 Respeta staff`
})
}

if(command==='.bienvenida'){
await sock.sendMessage(remoteJid,{image:{url:'https://i.imgur.com/ZObpHNP.jpeg'},caption:'✨ Bienvenid@ a Elementals'})
}

if(command==='.discord'){
await sock.sendMessage(remoteJid,{image:{url:'https://i.imgur.com/ttP1mk4.jpeg'},caption:'📢 https://discord.gg/yXnPdAvef'})
}

if(command==='.adm'){
await sock.sendMessage(remoteJid,{text:
`👑 ADMINISTRADORES
👤 Uvi - +525654812179
👤 Estef - +573114860414
👤 Samu - +573173607093
👤 Cham - +59894793177`
})
}

// ============================
// BUILD
// ============================
if(command==='.build'){
if(!args[1]){
return sock.sendMessage(remoteJid,{text:'Usa .build yasuo'})
}

const champName=args.slice(1)
.join('-')
.toLowerCase()
.normalize('NFD')
.replace(/[\u0300-\u036f]/g,'');

const champDisplay=args.slice(1).join(' ').toUpperCase();

await sock.sendMessage(remoteJid,{text:
`🛠 BUILD ${champDisplay}

https://www.wildriftfire.com/guide/${champName}
https://bestbuildwr.com/champions/${champName}`
})
}

// ============================
// ARAM
// ============================
if(command==='.aram'){
if(!['duo','trio','4q','cuarteto','5q'].includes(subCommand)) return;

let limite=5;
if(subCommand==='duo') limite=2;
if(subCommand==='trio') limite=3;
if(subCommand==='4q'||subCommand==='cuarteto') limite=4;

let salaID=null;
for(let i=1;i<=MAX_LOBBIES;i++){
if(!lobbies[remoteJid][i]){
salaID=i;
break;
}
}

if(!salaID){
return sock.sendMessage(remoteJid,{text:'Salas llenas'})
}

lobbies[remoteJid][salaID]={
id:salaID,
tipo:'ARAM',
rango:'Abismo',
limite,
participantes:[sender],
timer:setTimeout(()=>{
delete lobbies[remoteJid][salaID];
sock.sendMessage(remoteJid,{text:`🗑 Sala ${salaID} expiró`})
},300000)
};

await sock.sendMessage(remoteJid,{text:
`🎮 ARAM Sala ${salaID}
👥 1/${limite}
👉 .me uno ${salaID}`,
mentions:[sender]
});
}

// ============================
// RANKED
// ============================
if(command==='.ranked'){
if(!['duo','trio','5q'].includes(subCommand)) return;

let salaID=null;
for(let i=1;i<=MAX_LOBBIES;i++){
if(!lobbies[remoteJid][i]){
salaID=i;
break;
}
}

if(!salaID) return;

let limite=5;
if(subCommand==='duo') limite=2;
if(subCommand==='trio') limite=3;

let rango=RANGOS[eloArg]||'Elo Libre';

lobbies[remoteJid][salaID]={
id:salaID,
tipo:`RANKED ${subCommand.toUpperCase()}`,
rango,
limite,
participantes:[sender],
timer:setTimeout(()=>{
delete lobbies[remoteJid][salaID]
},300000)
};

await sock.sendMessage(remoteJid,{text:
`🎮 Ranked Sala ${salaID}
🏅 ${rango}
👥 1/${limite}
👉 .me uno ${salaID}`,
mentions:[sender]
});
}

// ============================
// JOIN LOBBY
// ============================
if(command==='.me'&&subCommand==='uno'){

let id=args[2];
const keys=Object.keys(lobbies[remoteJid]);

if(!id&&keys.length===1){
id=keys[0]
}

const sala=lobbies[remoteJid][id];
if(!sala) return;

if(sala.participantes.includes(sender)){
return sock.sendMessage(remoteJid,{text:'⚠️ Ya estás en esa sala'})
}

sala.participantes.push(sender);

if(sala.participantes.length<sala.limite){
let lista='';
sala.participantes.forEach((p,i)=>{
lista+=`\n${i+1}. @${p.split('@')[0]}`
});

await sock.sendMessage(remoteJid,{
text:`🎮 ${sala.tipo}\n👥 ${sala.participantes.length}/${sala.limite}${lista}`,
mentions:sala.participantes
});

}else{
clearTimeout(sala.timer);

await sock.sendMessage(remoteJid,{
text:`🚀 FULL TEAM\n${sala.tipo}\n#ELNS`,
mentions:sala.participantes
});

delete lobbies[remoteJid][id];
}
}

// ============================
// ENCUESTA
// ============================
if(command==='.encuesta'){
let c=text.replace(/^\.encuesta\s*/i,'').trim();
let p=c.split('/').map(s=>s.trim()).filter(Boolean);
let op=p.length>1?p.slice(1):['Sí','No'];

await sock.sendMessage(remoteJid,{
poll:{
name:'📊 '+p[0],
values:op,
selectableCount:1
}
})
}

// ============================
// ATENCION
// ============================
if(command==='.atencion'&&remoteJid.endsWith('@g.us')){
try{
const meta=await sock.groupMetadata(remoteJid);
await sock.sendMessage(remoteJid,{
text:args.slice(1).join(' ')||'📢 Atención',
mentions:meta.participants.map(p=>p.id)
})
}catch{
await sock.sendMessage(remoteJid,{text:'No pude mencionar al grupo'})
}
}

}catch(e){
console.log(e)
}

});

}

connectToWhatsApp();