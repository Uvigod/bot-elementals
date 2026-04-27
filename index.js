const {
default: makeWASocket,
useMultiFileAuthState,
DisconnectReason,
delay
} = require('@whiskeysockets/baileys');

const pino=require('pino');
const http=require('http');

const MY_PHONE_NUMBER='525532397858';
const MAX_LOBBIES=6;
const PORT=process.env.PORT||3000;

const GROUP_GENERAL='120363XXXXXXXX@g.us';
const GROUP_RECLUTAMIENTO='120363YYYYYYYY@g.us';
const WELCOME_GROUPS=[GROUP_GENERAL,GROUP_RECLUTAMIENTO];

let lobbies={};

const RANGOS={
'hierro':'Hierro ⚔️ Bronce',
'bronce':'Bronce ⚔️ Plata',
'plata':'Plata ⚔️ Oro',
'oro':'Oro ⚔️ Platino',
'platino':'Platino ⚔️ Esmeralda',
'esmeralda':'Esmeralda ⚔️ Diamante',
'diamante':'Diamante ⚔️ Maestro',
'master':'Maestro ⚔️ Gran Maestro',
'maestro':'Maestro ⚔️ Gran Maestro'
};

// ====================
// WEB SERVER
// ====================
const server=http.createServer((req,res)=>{
res.writeHead(200,{'Content-Type':'text/plain'});
res.end('Bot Elementals Online');
});

server.listen(PORT,()=>{
console.log(`🌐 Web online puerto ${PORT}`);
});

// (ANTI-SLEEP REMOVIDO PARA EVITAR INTERFERENCIA)

async function connectToWhatsApp(){

const {state,saveCreds}=await useMultiFileAuthState('auth_render_v3');

const sock=makeWASocket({
auth:state,
printQRInTerminal:false,
logger:pino({level:'silent'}),

// browser más estable
browser:['Ubuntu','Chrome','121.0.0'],

syncFullHistory:false,
connectTimeoutMs:60000,
defaultQueryTimeoutMs:0,
markOnlineOnConnect:false
});

sock.ev.on('creds.update',saveCreds);

// ====================
// CONNECTION + PAIRING FIX
// ====================
sock.ev.on('connection.update', async(update)=>{

const {connection,lastDisconnect}=update;

// CLAVE: esperar conexión abierta antes de pedir código
if(connection==='open'){

console.log('✅ Conexion abierta');

if(!sock.authState.creds.registered){
try{

await delay(3000);

const code=
await sock.requestPairingCode(
MY_PHONE_NUMBER
);

const clean=
code?.match(/.{1,4}/g)?.join('-')||code;

console.log(`\n🟢 CODIGO DE VINCULACION:\n${clean}\n`);

}catch(e){
console.log('⚠️ Pairing error:',e.message)
}

}

}

if(connection==='close'){

const reason=
lastDisconnect?.error?.output?.statusCode;

console.log('⚠️ Conexion cerrada:',reason);

if(reason!==DisconnectReason.loggedOut){
setTimeout(()=>{
console.log('🔄 Reconectando...');
connectToWhatsApp();
},8000);
}

}

});

// ====================
// BIENVENIDAS SOLO GRUPOS ASIGNADOS
// ====================
sock.ev.on('group-participants.update',async(update)=>{
try{
if(update.action!=='add') return;
if(!WELCOME_GROUPS.includes(update.id)) return;

for(const user of update.participants){

let mensaje='';

if(update.id===GROUP_GENERAL){
mensaje=`🌟 Bienvenid@ @${user.split('@')[0]} a ELEMENTALS`;
}

if(update.id===GROUP_RECLUTAMIENTO){
mensaje=`⚔️ Bienvenid@ @${user.split('@')[0]}\nEnvía tu captura para acceso.`;
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
console.log(e)
}
});

// ====================
// MENSAJES
// ====================
sock.ev.on('messages.upsert',async({messages})=>{
try{

const m=messages[0];
if(!m.message||m.key.fromMe) return;

const text=
m.message.conversation||
m.message.extendedTextMessage?.text||'';

if(!text) return;

const remoteJid=m.key.remoteJid;
const sender=m.key.participant||remoteJid;

const args=text.trim().split(/\s+/);
const command=args[0].toLowerCase();
const subCommand=args[1]?.toLowerCase()||'';
const eloArg=args.slice(2).join('').toLowerCase();

if(!lobbies[remoteJid]) lobbies[remoteJid]={};

// MENU
if(command==='.menu'){
await sock.sendMessage(remoteJid,{text:
`🤖 COMANDOS
.ranked duo [elo]
.aram trio
.me uno 1
.build yasuo
.idgrupo`
});
}

// ID GRUPO
if(command==='.idgrupo'){
if(!remoteJid.endsWith('@g.us')) return;
await sock.sendMessage(remoteJid,{
text:`🆔 ${remoteJid}`
});
}

// ADM
if(command==='.adm'){
await sock.sendMessage(remoteJid,{text:
`👑 ADMIN
Uvi
Estef
Samu
Cham`
});
}

// BUILD
if(command==='.build'){
if(!args[1]) return;

const champName=args.slice(1)
.join('-')
.toLowerCase();

await sock.sendMessage(remoteJid,{text:
`https://www.wildriftfire.com/guide/${champName}`
});
}

// RANKED
if(command==='.ranked'){
if(!['duo','trio','5q'].includes(subCommand)) return;

let limite=subCommand==='duo'?2:
subCommand==='trio'?3:5;

let salaID=null;
for(let i=1;i<=MAX_LOBBIES;i++){
if(!lobbies[remoteJid][i]){
salaID=i;
break;
}
}

if(!salaID) return;

lobbies[remoteJid][salaID]={
id:salaID,
limite,
participantes:[sender],
rango:RANGOS[eloArg]||'Libre'
};

await sock.sendMessage(remoteJid,{text:
`🎮 Sala ${salaID}\n👥1/${limite}`
});
}

// JOIN
if(command==='.me'&&subCommand==='uno'){
let id=args[2];
const sala=lobbies[remoteJid][id];
if(!sala) return;

if(sala.participantes.includes(sender)){
return sock.sendMessage(remoteJid,{text:'Ya estás dentro'})
}

sala.participantes.push(sender);

if(sala.participantes.length===sala.limite){
await sock.sendMessage(remoteJid,{text:'🚀 FULL TEAM'});
delete lobbies[remoteJid][id];
}else{
await sock.sendMessage(remoteJid,{text:
`👥 ${sala.participantes.length}/${sala.limite}`
});
}
}

}catch(e){
console.log(e)
}
});

}

connectToWhatsApp();