// Chat Criptografado (web) — servidor relay WebSocket + estático.
// Substitui os DatagramSockets UDP (7777/8888) do original Java por um relay ws:
// cada mensagem cifrada (DES/ECB/PKCS5 no CLIENTE, chave nunca chega ao servidor)
// é repassada aos demais pares conectados. O servidor é burro de propósito.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3000;
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

const wss = new WebSocketServer({ server });
const pares = new Set();

wss.on('connection', (socket) => {
  pares.add(socket);

  // Equivalente ao eco de portas do original ("Conectado. UDP 7777 -> 8888")
  socket.send(JSON.stringify({
    type: 'sys',
    text: `Conectado ao relay. Pares na sala: ${pares.size}. Aguardando mensagens...`
  }));

  socket.on('message', (raw) => {
    // Relay fiel: repassa o payload CIFRADO a todos os outros pares, sem tocar no conteúdo
    for (const par of pares) {
      if (par !== socket && par.readyState === 1) par.send(raw.toString());
    }
  });

  socket.on('close', () => { pares.delete(socket); });
});

server.listen(PORT, () => {
  console.log(`Chat Criptografado (DES/ECB) em http://localhost:${PORT}`);
  console.log('Abra 2 abas/janelas, gere a chave em uma, cole na outra e converse.');
});
