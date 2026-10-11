// Cliente do Chat Criptografado — fluxo fiel ao Chat1.java (2022):
// boas-vindas -> nome -> chave (G gera / C cola, como copiar o Chave.key) -> conversa
// com mensagens "nome : texto" cifradas em DES/ECB/PKCS5 no cliente.
import { criarCriptografia, gerarChaveAESHex } from '/des.js';

const $ = (sel) => document.querySelector(sel);
const telaBemvindo = $('#tela-bemvindo');
const telaChave = $('#tela-chave');
const inpNome = $('#inp-nome');
const inpChave = $('#inp-chave');
const sala = $('#sala');
const listaMsgs = $('#mensagens');
const wireLog = $('#wire-log');
const inpMsg = $('#inp-msg');
const statusEl = $('#status');

let nome = '';
let cifra = null;
let ws = null;

// ---------- fluxo ----------
$('#btn-entrar').addEventListener('click', () => {
  nome = inpNome.value.trim();
  if (!nome) { inpNome.focus(); return; }
  telaBemvindo.hidden = true;
  telaChave.hidden = false;
  inpChave.focus();
});
inpNome.addEventListener('keydown', (e) => e.key === 'Enter' && $('#btn-entrar').click());

$('#btn-gerar').addEventListener('click', () => {
  inpChave.value = gerarChaveAESHex();
  navigator.clipboard?.writeText(inpChave.value).then(() => {
    inpChave.placeholder = 'chave gerada e copiada!';
  }).catch(() => {});
});

$('#btn-colar').addEventListener('click', async () => {
  try {
    inpChave.value = (await navigator.clipboard.readText()).trim();
  } catch { inpChave.focus(); }
});

$('#btn-usar').addEventListener('click', async () => {
  try {
    cifra = await criarCriptografia(inpChave.value.trim().toLowerCase());
  } catch (erro) {
    inpChave.value = '';
    inpChave.placeholder = erro.message;
    return;
  }
  telaChave.hidden = true;
  sala.hidden = false;
  conectar();
});

// ---------- websocket ----------
function conectar() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}`);

  ws.onopen = () => setStatus('conectado', true);
  ws.onclose = () => setStatus('desconectado', false);
  ws.onerror = () => setStatus('erro de conexão', false);

  ws.onmessage = async (evento) => {
    let pacote;
    try {
      pacote = JSON.parse(evento.data);
    } catch {
      msgSistema('O relay enviou uma mensagem inválida.');
      return;
    }
    if (pacote.type === 'sys') { msgSistema(pacote.text); return; }
    // wire: registra o payload CIFRADO que trafegou (fiel ao eco "[B@..." do original)
    const prefixoCipher = pacote.data.slice(0, 200);
    wire(`${pacote.from} >> ${prefixoCipher}${pacote.data.length > 200 ? '…' : ''}`);
    const alg = pacote.alg || 'des-ecb';
    if (!cifra || alg !== cifra.alg) { msgQuebrada(pacote.from); return; }
    let texto;
    try {
      texto = await cifra.decifrar(pacote.data);
    } catch {
      msgQuebrada(pacote.from);
      return;
    }
    if (pacote.type === 'file') {
      receberArquivo(pacote.from, pacote.name, texto);
    } else {
      msgRecebida(pacote.from, texto);
    }
  };
}

function setStatus(texto, on) {
  statusEl.textContent = texto;
  statusEl.className = `status ${on ? 'on' : 'off'}`;
}

// ---------- envio ----------
$('#form-msg').addEventListener('submit', async (e) => {
  e.preventDefault();
  const texto = inpMsg.value;
  if (!texto.trim() || !ws || ws.readyState !== 1) return;
  if (texto.startsWith('/')) {
    inpMsg.value = '';
    return comando(texto);
  }

  try {
    const pacote = { type: 'msg', from: nome, alg: cifra.alg, data: await cifra.cifrar(texto) };
    if (ws.readyState !== 1) throw new Error('Conexão interrompida.');
    inpMsg.value = '';
    wire(`${nome} << ${pacote.data}`);
    ws.send(JSON.stringify(pacote));
    msgEnviada(texto);
  } catch {
    msgSistema('Não foi possível cifrar ou enviar a mensagem. Tente novamente.');
  }
});

// ---------- /menu simplificado (fiel às letras do original) ----------
function comando(texto) {
  const cmd = texto.trim().toLowerCase();
  if (cmd === '/geo') {
    msgSistema('Consultando geolocalização (ipapi.co)...');
    fetch('https://ipapi.co/json/')
      .then((r) => r.json())
      .then((d) => {
        const resumo = `${d.ip} — ${d.city}/${d.region}, ${d.country_name} (lat ${d.latitude}, long ${d.longitude})`;
        msgSistema(`Geo-IP: ${resumo}`);
        window.__geo = d;
      })
      .catch(() => msgSistema('Geo-IP indisponível (rede/CORS).'));
  } else if (cmd === '/mapa') {
    const g = window.__geo;
    if (g) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${g.latitude},${g.longitude}`, '_blank');
      msgSistema('Google Maps aberto em nova aba.');
    } else {
      msgSistema('Rode /geo primeiro para obter as coordenadas.');
    }
  } else if (cmd === '/arquivo') {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const limite = cifra?.alg === 'aes-gcm' ? 20 * 1024 * 1024 : 2 * 1024 * 1024;
      if (file.size > limite) {
        msgSistema(`Arquivo acima do limite para ${cifra?.alg === 'aes-gcm' ? 'AES-GCM' : 'DES legado'}.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        // fiel ao bloco comentado do original: o arquivo É cifrado antes de trafegar
        try {
          const base64 = arrayBufferParaBase64(reader.result);
          const pacote = {
            type: 'file', from: nome, name: file.name, alg: cifra.alg,
            data: await cifra.cifrar(base64)
          };
          if (!ws || ws.readyState !== 1) throw new Error('Conexão interrompida.');
          wire(`${nome} << [arquivo ${file.name}] ${pacote.data.slice(0, 60)}...`);
          ws.send(JSON.stringify(pacote));
          msgEnviada(`📎 ${file.name} (enviado cifrado)`);
        } catch {
          msgSistema('Não foi possível cifrar ou enviar o arquivo. Tente novamente.');
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  } else if (cmd === '/sair') {
    msgSistema('Sessão encerrada.');
    setTimeout(() => ws.close(), 300);
  } else {
    msgSistema(`Comando desconhecido: ${cmd}. Use /geo, /mapa, /arquivo, /sair.`);
  }
}

function arrayBufferParaBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const partes = [];
  const tamanhoParte = 0x8000;
  for (let inicio = 0; inicio < bytes.length; inicio += tamanhoParte) {
    partes.push(String.fromCharCode(...bytes.subarray(inicio, inicio + tamanhoParte)));
  }
  return btoa(partes.join(''));
}

// ---------- render ----------
function rolar() { listaMsgs.scrollTop = listaMsgs.scrollHeight; }
function bubble(cls, html) {
  const div = document.createElement('div');
  div.className = `msg ${cls}`;
  div.innerHTML = html;
  listaMsgs.appendChild(div);
  rolar();
}
function msgRecebida(de, texto) { bubble('msg-recebida', `<span class="msg-nome">${esc(de)}</span>${esc(texto)}`); }
function msgEnviada(texto) { bubble('msg-enviada', `<span class="msg-nome">${esc(nome)}</span>${esc(texto)}`); }
function msgSistema(texto) { bubble('msg-sistema', esc(texto)); }
function msgQuebrada(de) { bubble('msg-recebida msg-quebrada', `⚠ ${esc(de)} enviou dados que não decifram com sua chave (chaves diferentes?).`); }
function wire(texto) {
  wireLog.textContent += `${texto}\n`;
  if (wireLog.textContent.length > 100_000) wireLog.textContent = wireLog.textContent.slice(-80_000);
  wireLog.scrollTop = wireLog.scrollHeight;
}
function esc(s) { const d = document.createElement('span'); d.textContent = s; return d.innerHTML; }

function receberArquivo(de, nomeArquivo, base64) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes]));
  const a = document.createElement('a');
  a.href = url; a.download = nomeArquivo; a.textContent = `📎 Baixar ${nomeArquivo} (de ${de})`;
  const div = document.createElement('div');
  div.className = 'msg msg-recebida';
  div.appendChild(a);
  listaMsgs.appendChild(div);
  rolar();
}
