// DES/ECB/PKCS5 — wrapper compartilhado (browser + Node), fiel ao Chat1.java de 2022
// que usava javax.crypto Cipher.getInstance("DES/ECB/PKCS5Padding").
// No browser usa o global CryptoJS (bundle oficial); no Node, o pacote crypto-js.

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

export async function criarDES(chaveHex) {
  if (!/^[0-9a-fA-F]{16}$/.test(chaveHex)) {
    throw new Error('Chave DES inválida: use 16 caracteres hex (8 bytes).');
  }
  const lib = await carregarCryptoJS();
  const chave = lib.enc.Hex.parse(chaveHex);
  const cfg = { mode: lib.mode.ECB, padding: lib.pad.Pkcs7 }; // PKCS7 == PKCS5 (8 bytes)

  return {
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
