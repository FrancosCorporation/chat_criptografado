// Testes de integração do Chat Criptografado (Node puro).
// Uso: npm test
// Critério do PLANO.md: "servidor sobe, 2 clientes trocam mensagem com payload cifrado verificado".
import { createRequire } from 'node:module';
import { criarDES, gerarChaveHex } from '../js/des.js';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');

let falhas = 0;
function check(nome, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${nome}`);
  if (!cond) falhas++;
}

// --- 1) DES/ECB/PKCS5: roundtrip fiel ao javax.crypto do Chat1.java ---
{
  const chave = gerarChaveHex();
  const des = await criarDES(chave);
  const texto = 'Rodolfo : ola, isto e um teste de mensagem';
  const ct = des.cifrar(texto);
  check('DES gera ciphertext != plaintext', ct !== texto && /^[0-9a-f]+$/.test(ct));
  check('DES decifra exatamente o texto original', des.decifrar(ct) === texto);
  check('chave gerada tem 16 hex (8 bytes, DES)', chave.length === 16);
}

// --- 2) Chaves diferentes -> decifragem falha (lixa) ---
{
  const desA = await criarDES('1a2b3c4d5e6f7788');
  const desB = await criarDES('99aabbccddeeff00');
  const ct = desA.cifrar('secreto');
  const lixo = desB.decifrar(ct);
  check('chave errada produz lixo/valor quebrado (não o plaintext)', lixo !== 'secreto');
}

// --- 3) Integração real: servidor + 2 clientes trocam mensagem cifrada ---
{
  const PORTA = 3888;
  const servidor = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORTA) },
    stdio: 'ignore'
  });
  await new Promise((r) => setTimeout(r, 900));

  const des = await criarDES('0123456789abcdef');
  const texto = 'Rodolfo : chat criptografado no ar!';
  const recebidas = [];

  const clienteA = new WebSocket(`ws://localhost:${PORTA}`);
  const clienteB = new WebSocket(`ws://localhost:${PORTA}`);
  await Promise.all([
    new Promise((r) => clienteA.on('open', r)),
    new Promise((r) => clienteB.on('open', r))
  ]);

  clienteB.on('message', (raw) => {
    const pacote = JSON.parse(raw.toString());
    if (pacote.type === 'msg') recebidas.push(pacote);
  });

  // A envia o payload CIFRADO (como o app.js faz)
  clienteA.send(JSON.stringify({ type: 'msg', from: 'Rodolfo', data: des.cifrar(texto) }));

  await new Promise((r) => setTimeout(r, 700));

  check('2 clientes conectados trocaram 1 mensagem', recebidas.length === 1);
  if (recebidas.length === 1) {
    const pacote = recebidas[0];
    check('wire carrega ciphertext DES (plaintext não trafega)', pacote.data !== texto && /^[0-9a-f]+$/.test(pacote.data));
    check('receptor decifra o payload e recupera a mensagem', des.decifrar(pacote.data) === texto);
  }

  clienteA.close();
  clienteB.close();
  servidor.kill();
}

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM ✔ (chat envia mensagem, cifrada)' : `\n${falhas} TESTE(S) FALHARAM ✘`);
process.exit(falhas === 0 ? 0 : 1);
