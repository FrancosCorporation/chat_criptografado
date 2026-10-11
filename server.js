// Chat Criptografado (web) — servidor relay WebSocket + estático.
// Substitui os DatagramSockets UDP (7777/8888) do original Java por um relay ws:
// cada mensagem cifrada (AES-GCM padrão ou DES legado no CLIENTE; a chave nunca chega ao servidor)
// é repassada aos demais pares conectados. O servidor é burro de propósito.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3000;
const MAX_PAYLOAD_BYTES = 64 * 1024 * 1024;
const MAX_CONNECTIONS = 100;
const MAX_CONNECTIONS_PER_IP = 10;
const MAX_CONNECTION_ATTEMPTS_PER_MINUTE = 20;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json'
};

const server = http.createServer(async (req, res) => {
  let path = req.url.split('?')[0];
  if (path === '/') path = '/index.html';
  try {
    // rotas especiais: bundle oficial do crypto-js (node_modules) e módulo DES compartilhado (js/)
    let file;
    if (path === '/crypto-js.js') file = join(ROOT, 'node_modules/crypto-js/crypto-js.js');
    else if (path === '/des.js') file = join(ROOT, 'js/des.js');
    else file = normalize(join(ROOT, 'public', path));
    if (!file.startsWith(ROOT)) throw new Error('fora da raiz');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
  }
});

const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES });
const pares = new Set();
const conexoesPorIp = new Map();
const tentativasPorIp = new Map();

function nomeValido(value) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.trim().length <= 40
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function payloadValido(raw) {
  let pacote;
  try {
    pacote = JSON.parse(raw.toString('utf8'));
  } catch {
    return null;
  }

  if (!pacote || typeof pacote !== 'object' || Array.isArray(pacote)) return null;
  if (!['msg', 'file'].includes(pacote.type) || !nomeValido(pacote.from)) return null;
  if (typeof pacote.data !== 'string' || pacote.data.length === 0 || pacote.data.length > MAX_PAYLOAD_BYTES
      || !/^(?:[0-9a-f]{2})+$/i.test(pacote.data)) return null;

  const alg = pacote.alg || 'des-ecb'; // clientes antigos continuam usando o formato legado
  if (!['des-ecb', 'aes-gcm'].includes(alg)) return null;

  if (pacote.type === 'file') {
    if (typeof pacote.name !== 'string' || pacote.name.trim().length === 0 || pacote.name.length > 255
        || pacote.name.includes('/') || pacote.name.includes('\\') || pacote.name.includes('..')
        || /[\u0000-\u001f\u007f]/.test(pacote.name)) return null;
  }

  return {
    type: pacote.type,
    from: pacote.from.trim(),
    alg,
    data: pacote.data,
    ...(pacote.type === 'file' ? { name: pacote.name.trim() } : {})
  };
}

function tentativasRecentes(ip, agora) {
  const recentes = (tentativasPorIp.get(ip) || []).filter((timestamp) => agora - timestamp < 60_000);
  recentes.push(agora);
  tentativasPorIp.set(ip, recentes);
  return recentes.length;
}

const idleSweep = setInterval(() => {
  const agora = Date.now();
  for (const socket of pares) {
    if (agora - socket.lastActivity > IDLE_TIMEOUT_MS) socket.close(1001, 'conexão ociosa');
  }
  for (const [ip, timestamps] of tentativasPorIp) {
    const recentes = timestamps.filter((timestamp) => agora - timestamp < 60_000);
    if (recentes.length) tentativasPorIp.set(ip, recentes);
    else tentativasPorIp.delete(ip);
  }
}, 30_000);
idleSweep.unref();

wss.on('connection', (socket, request) => {
  const ip = request.socket.remoteAddress || 'desconhecido';
  const agora = Date.now();
  const tentativas = tentativasRecentes(ip, agora);
  const conexoesDoIp = conexoesPorIp.get(ip);
  if (tentativas > MAX_CONNECTION_ATTEMPTS_PER_MINUTE
      || pares.size >= MAX_CONNECTIONS
      || (conexoesDoIp?.size || 0) >= MAX_CONNECTIONS_PER_IP) {
    console.warn(`Conexão recusada para ${ip}: limite de conexões ou tentativas atingido.`);
    socket.close(1013, 'limite de conexões atingido');
    return;
  }

  pares.add(socket);
  socket.lastActivity = agora;
  socket.invalidPayloads = 0;
  if (!conexoesPorIp.has(ip)) conexoesPorIp.set(ip, new Set());
  conexoesPorIp.get(ip).add(socket);

  // Equivalente ao eco de portas do original ("Conectado. UDP 7777 -> 8888")
  socket.send(JSON.stringify({
    type: 'sys',
    text: `Conectado ao relay. Pares na sala: ${pares.size}. Aguardando mensagens...`
  }));

  socket.on('message', (raw) => {
    socket.lastActivity = Date.now();
    if (raw.length > MAX_PAYLOAD_BYTES) {
      console.warn(`Mensagem recusada de ${ip}: ${raw.length} bytes.`);
      socket.close(1009, 'mensagem grande demais');
      return;
    }

    const pacote = payloadValido(raw);
    if (!pacote) {
      socket.invalidPayloads++;
      socket.send(JSON.stringify({ type: 'sys', text: 'Formato de mensagem inválido.' }));
      if (socket.invalidPayloads >= 3) socket.close(1008, 'payload inválido');
      return;
    }

    socket.invalidPayloads = 0;
    // Relay fiel: valida o envelope e repassa o payload cifrado sem decodificar o conteúdo.
    const mensagem = JSON.stringify(pacote);
    for (const par of pares) {
      if (par !== socket && par.readyState === 1) par.send(mensagem);
    }
  });

  socket.on('error', (error) => console.warn(`Erro de conexão de ${ip}: ${error.message}`));
  socket.on('close', (code) => {
    pares.delete(socket);
    const socketsDoIp = conexoesPorIp.get(ip);
    socketsDoIp?.delete(socket);
    if (socketsDoIp?.size === 0) conexoesPorIp.delete(ip);
    if (code === 1009) console.warn(`Conexão de ${ip} fechada: limite de payload (${MAX_PAYLOAD_BYTES} bytes).`);
  });
});

wss.on('error', (error) => console.error(`Erro no relay WebSocket: ${error.message}`));

server.listen(PORT, () => {
  console.log(`Chat Criptografado (AES-GCM padrão, DES legado) em http://localhost:${PORT}`);
  console.log('Abra 2 abas/janelas, gere a chave em uma, cole na outra e converse.');
});
