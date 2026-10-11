# Chat Criptografado

![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-yellow?logo=javascript&logoColor=white)
![Node](https://img.shields.io/badge/node-%3E%3D18-green?logo=node.js&logoColor=white)
![WebSocket](https://img.shields.io/badge/transport-WebSocket-blue)
![Cripto](https://img.shields.io/badge/cifra-AES--256--GCM-blue)
![Tests](https://img.shields.io/badge/testes-7%2F7%20passando-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

Chat ponto a ponto que usa **AES-256-GCM** no navegador e mantém DES/ECB/PKCS5 como modo legado
para compatibilidade com o projeto Java/UDP de 2022, cujos 15 fontes originais estão em [`java/`](java/).

> Projeto de estudo originado nas aulas dos professores **Alexandre Paiva** e **Bruno Manso** (2022).

## Como funciona

```
[Cliente A]                          [Cliente B]
    |  cifra AES-GCM (chave local)       |
    |  "Rodolfo : oi" ──► hex cifrado    |
    └────────────► relay ws ◄────────────┘
                    │  repassa o CIPHERTEXT sem decifrar (servidor burro)
                    ▼
             B decifra com a MESMA chave e exibe "Rodolfo : oi"
```

- **Criptografia no cliente**: AES-256-GCM usa um IV aleatório por mensagem e autentica o conteúdo.
  A chave **nunca sai do navegador**; o relay só enxerga ciphertext hex. Chaves antigas DES de 8 bytes
  continuam aceitas para preservar o modo didático original.
- **Transporte**: os `DatagramSocket` UDP (7777↔8888) de 2022 viraram um relay **WebSocket** (`ws`).
- **Fiel ao original**: mensagens no formato `nome : texto`, eco do ciphertext trafegado
  (painel "wire"), comando `/menu` com `/geo` (ipapi.co), `/mapa` (Google Maps), `/arquivo`
  (transferência cifrada) e `/sair`.

## Instalação e execução

Requer [Node.js 18+](https://nodejs.org/).

```bash
npm install   # instala ws + crypto-js
npm start     # servidor em http://localhost:3000
npm test      # 7 testes: roundtrip DES, chave errada, 2 clientes trocando mensagem cifrada
```

Como usar (2 pessoas / 2 abas):

1. Abra **http://localhost:3000** em duas abas ou navegadores.
2. Em **uma** das pontas: digite seu nome → botão **G** gera uma chave AES (copiada automaticamente).
3. Envie a chave ao outro participativo pelo canal que preferir e cole lá com **C**.
4. Conversem — o painel **wire** mostra que só trafega ciphertext.
5. Comandos: `/geo`, `/mapa`, `/arquivo`, `/sair`.

> Em rede real: rode o servidor em uma máquina (`PORT=3000 node server.js`) e as outras
> pontas acessam `http://<ip-da-maquina>:3000`.

## O que mudou em relação ao Java de 2022 (e o que ficou igual)

| Original (Java 11) | Versão web (Node 18+) |
|---|---|
| UDP `DatagramSocket` 7777↔8888, payload cifrado | relay WebSocket (`ws`), payload cifrado igual |
| `javax.crypto` DES/ECB/PKCS5Padding, `Chave.key` serializado | AES-256-GCM padrão; DES legado disponível para chave hex de 16 chars |
| Troca de mensagens no console (Scanner) | sala de chat no navegador com histórico |
| `/menu` com JOptionPane (geo-IP, Maps, arquivo TCP) | `/geo`, `/mapa`, `/arquivo` (cifrado), `/sair` |
| Transferência de arquivo em **texto plano** (TCP) | transferência de arquivo **cifrada** (o bloco comentado do original, enfim ativo) |

## Estrutura

```
chat_criptografado/
├── server.js               # relay ws + estático (Node puro)
├── js/des.js               # AES-GCM e wrapper DES/ECB legado (browser + Node)
├── public/
│   ├── index.html          # boas-vindas -> nome -> chave -> sala
│   ├── app.js              # fluxo do cliente (cifra/decifra/comandos)
│   └── style.css
├── test/chat-test.mjs      # 7 testes (npm test)
└── java/                   # ✔ PROJETO ORIGINAL 2022 preservado
    └── Exemplos/           # Chat1, PeerChat1/2, ComunicadorSeguro, didáticos...
```

### Rodar a versão Java original (histórica)

```bash
cd java
javac -d bin Exemplos/*.java
java -cp bin Exemplos.chat1'$'Chat1   # main aninhado do Chat1.java
java -cp bin Exemplos.PeerChat1'$'Chat1
```

## Licença

MIT — veja [LICENSE](LICENSE).
