// Cifras compartilhadas (browser + Node): AES-256-GCM padrão e DES/ECB legado do Chat1.java.
// No browser o modo DES usa o global CryptoJS; no Node, o pacote crypto-js.

let CryptoJS = null;
async function carregarCryptoJS() {
  if (CryptoJS) return CryptoJS;
  if (typeof window !== 'undefined' && window.CryptoJS) {
    CryptoJS = window.CryptoJS;
  } else {
    const mod = await import('crypto-js');
    CryptoJS = mod.default;
  }
  return CryptoJS;
}

// Chave DES = 8 bytes (56 bits efetivos), mesma força do KeyGenerator("DES") original.
export function gerarChaveHex() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// AES-256-GCM é a opção padrão da interface; gerarChaveHex permanece DES para compatibilidade.
export function gerarChaveAESHex() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function criarDES(chaveHex) {
  if (!/^[0-9a-fA-F]{16}$/.test(chaveHex)) {
    throw new Error('Chave DES inválida: use 16 caracteres hex (8 bytes).');
  }
  const lib = await carregarCryptoJS();
  const chave = lib.enc.Hex.parse(chaveHex);
  const cfg = { mode: lib.mode.ECB, padding: lib.pad.Pkcs7 }; // PKCS7 == PKCS5 (8 bytes)

  return {
    alg: 'des-ecb',
    chaveHex,

    // -> ciphertext em hex (o "payload cifrado" que trafega, como os bytes do DatagramPacket)
    cifrar(texto) {
      const ct = lib.DES.encrypt(texto, chave, cfg);
      return ct.ciphertext.toString(lib.enc.Hex);
    },

    // -> texto plano; lança/retorna lixo se a chave do par for diferente (fiel ao original)
    decifrar(hex) {
      const dec = lib.DES.decrypt({ ciphertext: lib.enc.Hex.parse(hex) }, chave, cfg);
      return dec.toString(lib.enc.Utf8);
    }
  };
}

async function carregarWebCrypto() {
  if (globalThis.crypto?.subtle) return globalThis.crypto;
  const mod = await import('node:crypto');
  return mod.webcrypto;
}

function bytesParaHex(bytes) {
  const chunks = [];
  for (let start = 0; start < bytes.length; start += 8192) {
    let chunk = '';
    const end = Math.min(start + 8192, bytes.length);
    for (let i = start; i < end; i++) chunk += bytes[i].toString(16).padStart(2, '0');
    chunks.push(chunk);
  }
  return chunks.join('');
}

function hexParaBytes(hex) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) throw new Error('Payload AES-GCM inválido.');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function criarAESGCM(chaveHex) {
  if (!/^[0-9a-fA-F]{64}$/.test(chaveHex)) {
    throw new Error('Chave AES inválida: use 64 caracteres hex (32 bytes).');
  }

  const webcrypto = await carregarWebCrypto();
  const chave = await webcrypto.subtle.importKey(
    'raw', hexParaBytes(chaveHex), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
  );

  return {
    alg: 'aes-gcm',
    chaveHex,

    async cifrar(texto) {
      const iv = webcrypto.getRandomValues(new Uint8Array(12));
      const conteudo = new TextEncoder().encode(String(texto));
      const cifrado = new Uint8Array(await webcrypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 }, chave, conteudo
      ));
      const pacote = new Uint8Array(iv.length + cifrado.length);
      pacote.set(iv);
      pacote.set(cifrado, iv.length);
      return bytesParaHex(pacote);
    },

    async decifrar(hex) {
      if (typeof hex !== 'string' || hex.length < 24 + 32 || hex.length % 2 !== 0) {
        throw new Error('Payload AES-GCM inválido.');
      }
      const bytes = hexParaBytes(hex);
      const iv = bytes.slice(0, 12);
      const cifrado = bytes.slice(12);
      const texto = await webcrypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: 128 }, chave, cifrado
      );
      return new TextDecoder('utf-8', { fatal: true }).decode(texto);
    }
  };
}

export async function criarCriptografia(chaveHex) {
  if (/^[0-9a-fA-F]{16}$/.test(chaveHex)) return criarDES(chaveHex);
  if (/^[0-9a-fA-F]{64}$/.test(chaveHex)) return criarAESGCM(chaveHex);
  throw new Error('Use uma chave AES de 64 hex ou uma chave DES legada de 16 hex.');
}
