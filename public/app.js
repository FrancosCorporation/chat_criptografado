// Cliente do Chat Criptografado — fluxo fiel ao Chat1.java (2022):
// boas-vindas -> nome -> chave (G gera / C cola, como copiar o Chave.key) -> conversa
// com mensagens "nome : texto" cifradas em DES/ECB/PKCS5 no cliente.
import { criarDES, gerarChaveHex } from '/des.js';

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
let des = null;
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
  inpChave.value = gerarChaveHex();
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
    des = await criarDES(inpChave.value.trim().toLowerCase());
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

  ws.onmessage = (evento) => {
    const pacote = JSON.parse(evento.data);
    if (pacote.type === 'sys') { msgSistema(pacote.text); return; }
    // wire: registra o payload CIFRADO que trafegou (fiel ao eco "[B@..." do original)
    wire(`${pacote.from} >> ${pacote.data}`);
    const texto = des.decifrar(pacote.data);
    if (!texto) { msgQuebrada(pacote.from); return; }
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
$('#form-msg').addEventListener('submit', (e) => {
  e.preventDefault();
  const texto = inpMsg.value;
  if (!texto.trim() || !ws || ws.readyState !== 1) return;
  inpMsg.value = '';

  if (texto.startsWith('/')) return comando(texto);

  const pacote = { type: 'msg', from: nome, data: des.cifrar(texto) };
  wire(`${nome} << ${pacote.data}`);
  ws.send(JSON.stringify(pacote));
  msgEnviada(texto);
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
      const reader = new FileReader();
      reader.onload = () => {
        // fiel ao bloco comentado do original: o arquivo É cifrado antes de trafegar
        const base64 = btoa([...new Uint8Array(reader.result)].map((b) => String.fromCharCode(b)).join(''));
        const pacote = { type: 'file', from: nome, name: file.name, data: des.cifrar(base64) };
        wire(`${nome} << [arquivo ${file.name}] ${pacote.data.slice(0, 60)}...`);
        ws.send(JSON.stringify(pacote));
        msgEnviada(`📎 ${file.name} (enviado cifrado)`);
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
function wire(texto) { wireLog.textContent += `${texto}\n`; wireLog.scrollTop = wireLog.scrollHeight; }
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
