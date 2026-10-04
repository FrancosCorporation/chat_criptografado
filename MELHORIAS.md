# MELHORIAS — chat_criptografado

> **Gerado por análise de código em 2026-10-02** · Stack: Node 18+ (Express implícito via `http`) + `ws` + `crypto-js` · conversão Java→JS
> Branch `master` · base `8cbfb26` ("feat: conversao Java->JavaScript") · 431 LOC · **1 teste** (`test/chat-test.mjs`, 8 asserts)
>
> **Este arquivo é um plano de execução.** Cada item tem ID, `arquivo:linha`, mudança exata,
> critério de aceite e comando de verificação.

---

## 0. Como usar este documento

1. Execute na ordem **P0 → P1 → P2 → P3**, respeitando as ondas da §8.
2. Ao terminar um item: marque `- [x]`, rode o **Verificação**, comite `fix(<ID>): descrição`.
3. **Não quebre a fidelidade ao original Java (2022).** Este repositório existe para reproduzir o
   `Chat1.java` (DES/ECB/PKCS5 sobre UDP). O teste `test/chat-test.mjs:23-34` valida exatamente
   esse comportamento. As melhorias de criptografia (`SEC-01`) devem entrar como **modo novo em
   paralelo**, nunca substituindo o DES sem que o teste antigo continue verde.
4. **Idioma:** comentários e mensagens em português (padrão do repo); commits em inglês com
   prefixo `fix:`/`feat:`/`docs:`.

---

## 1. Diagnóstico executivo

Chat ponto-a-ponto sobre WebSocket, port fiel de um projeto Java/UDP de 2022. O servidor (`server.js`,
65 linhas) é um relay **burro de propósito**: recebe texto cifrado e repassa aos outros pares sem
nunca tocar no conteúdo — a chave nunca chega ao servidor. Isso está bem feito e é documentado no
comentário `server.js:3-4`.

**O que está bem (não refaça):**

| Item | Evidência |
|---|---|
| O servidor não vê o conteúdo | `server.js:53-55` repassa `raw.toString()` sem decodificar |
| Roundtrip DES testado | `test/chat-test.mjs:23-25` (ciphertext ≠ plaintext, decifra exato) |
| Chave errada não entrega plaintext | `test/chat-test.mjs:34` |
| Integração real com 2 clientes | `test/chat-test.mjs:50-72` (servidor spawnado, payload verificado) |
| Path traversal bloqueado | `server.js:30` — `if (!file.startsWith(ROOT)) throw` |
| Chave gerada com CSPRNG | `js/des.js:20` — `crypto.getRandomValues` (não `Math.random`) |

**O que está quebrado:** o relay não limita **nada** — nem tamanho de mensagem, nem número de
conexões, nem taxa —, não há TLS obrigatório, e a única forma de entrar na sala é conhecer a URL.

O item mais importante **não é um bug**: DES/ECB tem 56 bits de chave e vazagem estrutural por bloco
(`SEC-01`). Mas como é o **propósito** do repositório, a correção é adicionar um modo moderno, não
remover o legado.

---

## 2. Tabela de prioridades

| ID | Título | Sev | Arquivo | Depende de |
|---|---|---|---|---|
| BUG-00 | Relay sem limite de tamanho de mensagem (OOM) | **P0** | `server.js:52-57` | — |
| BUG-01 | Relay sem limite de conexões simultâneas | **P0** | `server.js:43` | — |
| SEC-01 | DES/ECB de 56 bits como única cifra | **P0** | `js/des.js:30` | — |
| SEC-02 | Sem TLS: `ws://` obrigatório em `server.js` | **P1** | `server.js:62` | — |
| SEC-03 | Relay sem autenticação nem rate limit | **P1** | `server.js:43` | — |
| SEC-04 | Sem validação do formato do payload recebido | **P1** | `server.js:52` | — |
| BUG-02 | `pacote.from` aceito cegamente do cliente (spoof) | **P1** | `server.js:55`, `public/app.js:63` | SEC-03 |
| BUG-03 | `JSON.parse` sem try/catch derruba o handler | **P1** | `public/app.js:67` | — |
| BUG-04 | Sem `maxPayload` no `WebSocketServer` | **P1** | `server.js:40` | BUG-00 |
| IMP-01 | Não reconecta após queda | **P2** | `public/app.js:63` | — |
| IMP-02 | Nenhum indicador de digitação/presença | **P3** | `public/app.js` | — |
| TEST-02 | Sem teste de limite/payload inválido | **P1** | novo `test/` | BUG-00, BUG-04 |
| TEST-03 | Sem teste do modo AES-GCM | **P1** | novo `test/` | SEC-01 |
| DEVOPS-01 | Sem Dockerfile nem CI | **P2** | *(ausente)* | — |
| DEVOPS-02 | `.gitignore` ignora `package-lock.json` (build não reproduzível) | **P3** | `.gitignore:21` | — |
| DEVOPS-03 | Falta `.env` de exemplo para as variáveis novas | **P3** | *(ausente)* `.env.example` | BUG-00, BUG-01 |
| DEVOPS-04 | `crypto-js` sem pin de versão exata | **P2** | `package.json:14` | DEVOPS-02 |
| BUG-05 | `receberArquivo` usa nome vindo do par (download forjado) | **P2** | `public/app.js:185` | SEC-04 |
| SEC-05 | `/geo` envia IP do usuário para terceiro (`ipapi.co`) | **P2** | `public/app.js:106` | — |
| BUG-06 | `btoa` + string gigante trava a aba com arquivo grande | **P2** | `public/app.js:124` | — |
| BUG-07 | `wireLog` cresce sem limite (memória na UI) | **P3** | `public/app.js:167` | — |
| DOC-01 | README não expõe limites do relay | **P3** | `README.md` | BUG-00 |

**Placar: 3 P0 · 8 P1 · 6 P2 · 4 P3 = 21 itens.**

---

## 3. Segurança
### SEC-01 · DES/ECB de 56 bits como única cifra · [P0]

- **Arquivo:** `js/des.js:30` (`const cfg = { mode: lib.mode.ECB, padding: lib.pad.Pkcs7 }`)
- **Evidência:** o wrapper usa DES em modo ECB. `js/des.js:17` admite no comentário: "Chave DES = 8
  bytes (56 bits efetivos)". ECB cifra cada bloco de 8 bytes **independentemente**, com a mesma
  chave — blocos idênticos produzem cifertexto idêntico.
- **Impacto:** DES tem 56 bits: é quebrável por força bruta com hardware commodity em dias (já é,
  há anos). ECB revela padrão: uma mensagem com blocos repetidos (ex.: `pacote.type: 'msg'` ou texto
  com espaços) mantém estrutura visível no ciphertext. Quem observa o tráfego identifica padrão de
  conteúdo sem precisar da chave.
- **Mudança:** **não remover o DES** — ele é o propósito do repositório (fidelidade ao `Chat1.java`
  de 2022, e o teste `test/chat-test.mjs:23-34` valida esse comportamento). Em vez disso:
  1. Adicionar um **modo AES-256-GCM** como opção preferencial (via `crypto` nativo do Node, sem
     dependência): `cipher = createCipheriv('aes-256-gcm', chave32, ivRandom)` com IV de 12 bytes
     aleatórios por mensagem e tag de autenticação.
  2. Sinalizar o algoritmo no pacote: `alg: 'des-ecb'` (legado) ou `alg: 'aes-gcm'` (novo), com
     default para `aes-gcm` quando os dois lados anunciam suporte.
  3. **Manter o caminho DES** intocado para o teste de fidelidade; adicionar teste novo para AES.
- **Aceite:** `npm test` continua verde (fidelidade preservada) **e** um teste novo prova que
  mensagens com mesmo conteúdo têm ciphertexts **diferentes** (IV aleatório).
- **Verificação:**
  ```bash
  npm test    # teste antigo DES ainda verde
  node -e "const{createCipheriv,randomBytes}=require('crypto');const k=randomBytes(32);
  const c=(iv)=>{const ci=createCipheriv('aes-256-gcm',k,iv);const e=Buffer.concat([ci.update('ola'),ci.final()]);return Buffer.concat([e,ci.getAuthTag()]).toString('hex')};
  const a=c(randomBytes(12)),b=c(randomBytes(12));console.log(a!==b?'OK: IV aleatorio -> ciphertext diferente':'FALHA');"
  ```

### BUG-00 · Relay sem limite de tamanho de mensagem (OOM) · [P0]

- **Arquivo:** `server.js:52-57`
- **Evidência:**
  ```javascript
  socket.on('message', (raw) => {
    for (const par of pares) {
      if (par !== socket && par.readyState === 1) par.send(raw.toString());
    }
  });
  ```
  Não há teto de tamanho em `raw`. A linha 30 só protege o `readFile` de arquivos estáticos, não a
  mensagem do WebSocket.
- **Impacto:** qualquer cliente conectado envia uma mensagem de centenas de MB e o servidor faz
  `raw.toString()` — **aloca essa string inteira em memória** — e depois envia uma cópia a **cada**
  outro par (multiplicando o consumo por N). Com 10 pares conectados, uma mensagem de 500 MB custa
  ~5 GB de RAM. É DoS de memória de um único comando, e é explotável por qualquer anônimo, porque
  não existe autenticação (`SEC-03`).
- **Mudança:** (1) declarar o teto no `WebSocketServer`:
  ```javascript
  const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 * 1024 }); // 64 MiB
  ```
  (2) rejeitar explícitaamente acima do limite com código de fechamento 1009 (mensagem grande
  demais); (3) dimensionar o teto com base no maior arquivo suportado (ver `SEC-05`); (4) logar o
  remetente e o tamanho quando recusar.
- **Aceite:** mensagem acima de 64 MiB fecha a conexão com 1009 e o servidor **não** cresce em
  memória; mensagens legítimas continuam passando.
- **Verificação:**
  ```bash
  node --max-old-space-size=512 server.js &   # sobe com 512 MiB
  node -e "const WebSocket=require('ws');const w=new WebSocket('ws://localhost:3000');
  w.on('open',()=>{w.send('a'.repeat(70*1024*1024))});
  w.on('close',c=>console.log('fechou com',c));setTimeout(()=>process.exit(0),3000)"
  # esperado: close 1009, processo do servidor continua vivo
  ```

### BUG-01 · Relay sem limite de conexões simultâneas · [P0]

- **Arquivo:** `server.js:43` (`wss.on('connection', (socket) => { pares.add(socket); ...`)
- **Evidência:** cada conexão é aceita e guardada num `Set`; não há checagem de contagem, nem de IP,
  nem de taxa. A linha 49 devolve `Pares na sala: ${pares.size}` — o próprio servidor expõe quantas
  conexões estão abertas.
- **Impacto:** abrir milhares de conexões vazias esgota file descriptors, memória por socket e a
  banda da rede. Como não há limite nem autenticação, qualquer um mantém a sala sempre cheia e
  pode bloquear novos usuários legítimos — DoS de disponibilidade, além de distorcer o contador de
  "pares na sala" que o cliente exibe.
- **Mudança:** (1) teto global de conexões (ex.: 100) — acima disso, recusar com 1013 (temporariamente
  indisponível) e **logar** o IP; (2) limite por IP (ex.: 10) via `socket.remoteAddress`; (3) rate
  limit de conexões por janela (ex.: 20/min por IP) para preencher a sala não custar nada; (4)
  fechar conexões ociosas após timeout de inatividade (ex.: 5 min sem mensagem).
- **Aceite:** a 101ª conexão é recusada; um único IP não passa de 10 conexões; conexão ociosa cai
  após o timeout.
- **Verificação:**
  ```bash
  node -e "const WebSocket=require('ws');let n=0;
  for(let i=0;i<120;i++){const w=new WebSocket('ws://localhost:3000');
  w.on('open',()=>n++);w.on('close',c=>{if(c===1013)process.exit(0)});} 
  setTimeout(()=>{console.log('abertas:',n);process.exit(0)},4000)"
  # esperado: estabiliza no limite (100), nao 120
  ```
### SEC-02 · Sem TLS: o servidor força `ws://` quando não há HTTPS · [P1]

- **Arquivo:** `server.js:62` (`server.listen(PORT, ...)`) — o servidor só fala HTTP puro;
  `public/app.js:59-60` decide o protocolo:
  ```javascript
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ```
- **Evidência:** não há `https.createServer` com certificado nem `wss` configurado no servidor. O
  protocolo só é seguro **se** a página atrás for servida por HTTPS — mas nada impede o acesso por
  `http://host:3000`.
- **Impacto:** em `ws://`, o payload cifrado **e** o nome dos arquivos trafegam em claro. Embora o
  conteúdo seja DES (`SEC-01`), o `pacote.name` (`public/app.js:127`) é **plaintext** — expõe nomes
  de arquivo. Além disso, metadados (IP, quando os pares falam) ficam legíveis para quem estiver no
  caminho. Sem TLS, o MITM pode ainda **substituir o `app.js`** e entregar um cliente comprometido
  que roube a chave digitada — o servidor não assina nada que o cliente verifique.
- **Mudança:** (1) documentar/obrigar HTTPS no proxy (Caddy/Nginx) e recusar conexão puramente
  HTTP em produção; (2) adicionar `HSTS` quando servido por HTTPS; (3) o ideal de longo prazo é
  **autenticar o canal**: como o relay é burro por desenho, a assinatura pode ser feita no cliente
  sobre a chave compartilhada, sem que o servidor a veja. Se houver proxy com TLS, apenas garantir
  que `wss://` é o default e `ws://` só em `localhost`.
- **Aceite:** acesso por `http://` fora de `localhost` é redirecionado/recusado; o tráfego observado
  é TLS.
- **Verificação:**
  ```bash
  curl -sI http://localhost:3000/ | grep -Ei 'HTTP/1.1 30[0-9]|strict-transport'
  # em producao, atrás de proxy:
  curl -sI https://host/exemplo | grep -i strict-transport-security
  ```

### SEC-03 · Relay sem autenticação nem rate limit · [P1]

- **Arquivo:** `server.js:43-60` (nenhum middleware de auth) · `public/app.js:22-28` (só pede um nome)
- **Evidência:** a "entrada" na sala é apenas digitar um nome (`app.js:23`) e ter a URL. O servidor
  não emite nem valida token, e não há contagem de tentativas em lugar nenhum.
- **Impacto:** qualquer pessoa com a URL (ou escaneando portas) entra e lê o tráfego cifrado dos
  outros. Como não há rate limit, pode-se floods a sala (ligado a `BUG-01`). E como não há
  identidade, `BUG-02` (spoof de `from`) é indistinguível de ataque legítimo.
- **Mudança:** (1) exigir uma **sala** com chave compartilhada (o segredo que o `app.js` já gera em
  `gerarChaveHex`, `app.js:32`) — o servidor pode validar o **conhecimento** da chave por um
  desafio HMAC, **sem nunca armazená-la**; (2) rate limit de conexão por IP (`BUG-01`); (3) recusar
  conexão acima do limite de pares da sala.
- **Aceite:** sem a chave da sala, o handshake é recusado; a 6ª tentativa em 1 min dá `429`/1013.
- **Verificação:**
  ```bash
  node -e "const WebSocket=require('ws');const w=new WebSocket('ws://localhost:3000');
  w.on('message',d=>console.log('server said:',d.toString().slice(0,60)));
  w.on('close',c=>console.log('fechou',c));setTimeout(()=>process.exit(0),2500)"
  # sem chave valida: conexao recusada
  ```

### SEC-04 · Sem validação do formato do payload recebido · [P1]

- **Arquivo:** `server.js:52-57`
- **Evidência:** o servidor repassa **qualquer** `raw` para todos os pares sem checar: (a) que é JSON
  válido; (b) que `type` pertence a um conjunto fechado (`sys`/`msg`/`file`); (c) que `data` é string
  hex; (d) que `name` é um nome de arquivo plausível.
- **Impacto:** um cliente malicioso envia payload arbitrário e o receptor faz
  `JSON.parse(evento.data)` (`public/app.js:67`) **sem try/catch** (`BUG-03`) — JSON inválido derruba
  o `onmessage` e o cliente para de receber mensagens. `type` desconhecido cai no `else` de
  `app.js:76` e vira mensagem comum, mascarando a intenção. Sem checar `name`, o `SEC-05` vira
  explorável.
- **Mudança:** (1) validar no servidor com um esquema mínimo (JSON válido, `type` em enum, `data`
  string hex de tamanho par, `name` sem `/`, `\\`, `..` ou bytes de controle); (2) rejeitar payload
  inválido sem repassar (e **não** fechar a conexão por isso — pode ser cliente antigo); (3) contar
  inválidos e fechar só após N seguidos (anti-flood).
- **Aceite:** payload com `type: "arbitrary"`, JSON inválido ou `name: "../../x"` **não** chega aos
  outros pares.
- **Verificação:**
  ```bash
  node -e "const WebSocket=require('ws');const w=new WebSocket('ws://localhost:3000');
  w.on('open',()=>{w.send('nao e json');w.send(JSON.stringify({type:'x',data:'zz'}));
  w.send(JSON.stringify({type:'msg',from:'a',data:'zz',name:'../../etc/passwd'}))});
  setTimeout(()=>process.exit(0),2500)"
  # nenhum outro cliente deve receber esses payloads
  ```

### SEC-05 · `/geo` envia o IP do usuário para um terceiro sem avisar · [P2]

- **Arquivo:** `public/app.js:106` (`fetch('https://ipapi.co/json/')`)
- **Evidência:** o comando `/geo` (linha 104) faz `fetch` direto para `ipapi.co`, um serviço externo,
  com o IP de origem do usuário. A resposta é mostrada (`app.js:110`) e guardada em `window.__geo`
  (`app.js:113`), que depois alimenta o `/mapa` (linha 118). Não há aviso de que um terceiro é
  contactado, nem consentimento, nem opção de desligar.
- **Impacto:** o usuário pensa que está usando uma funcionalidade local, mas **revela seu IP e
  geolocalização a um domínio de terceiros** — num app cujo diferencial é privacidade (cifra ponta
  a ponta). Entregar IP a terceiro quebra a expectativa de anonimato do outro lado da conversa, e o
  navegador envia também o `Origin`.
- **Mudança:** (1) **documentar** no README e na UI que `/geo` consulta um serviço externo;
  (2) preferir `navigator.geolocation` do navegador — sem rede externa e com consentimento real;
  (3) se manter `ipapi.co`, pedir confirmação antes e oferecer `/geo local` que não sai da máquina;
  (4) não persistir coordenadas em `window.__geo` além da sessão.
- **Aceite:** o usuário é avisado antes de qualquer requisição externa, ou o `/geo` funciona sem
  contatar domínio de terceiros.
- **Verificação:**
  ```bash
  grep -n "ipapi.co" public/app.js     # se mantido, deve haver confirmacao previa
  # devtools > Network: /geo nao deve disparar request para dominio de terceiros
  ```


### BUG-02 · `pacote.from` aceito cegamente do cliente (spoof de identidade) · [P1]

- **Arquivo:** `server.js:55` (`par.send(raw.toString())` repassa o campo inteiro) e origem em
  `public/app.js:63` (`const pacote = { type: 'msg', from: nome, data: des.cifrar(texto) }`)
- **Evidência:** `nome` vem do input do usuário (`app.js:23`) e o servidor **nunca sobrescreve**
  `from`. O remetente escolhe o nome que os outros vão ver.
- **Impacto:** um cliente pode se declarar como qualquer pessoa na sala (inclusive outro par
  conectado) e fazer com que a mensagem pareça vinda dele. Como o conteúdo é cifrado com a chave
  compartilhada, **todos os pares decifram** a mensagem falsificada e a aceitam como legítima.
  É falsificação de identidade com plausibilidade total — o receptor não tem como distinguir.
- **Mudança:** (1) o servidor **atribui** o identificador: registra um `peerId` por conexão no
  `handshake` e injeta `from` no payload antes de repassar (ignorando o que o cliente mandou);
  (2) se a sala tiver nome por usuário, exigir o vínculo no handshake (`SEC-03`);
  (3) mostrar no cliente o identificador atribuído, não o digitado.
- **Aceite:** enviar `from: "outro-usuario"` e o receptor vê o `peerId` atribuído pelo servidor.
- **Verificação:**
  ```bash
  node -e "const WebSocket=require('ws');const a=new WebSocket('ws://localhost:3000');
  const b=new WebSocket('ws://localhost:3000');
  b.on('message',d=>{try{const p=JSON.parse(d);if(p.from!=='spoof')console.log('OK, from real:',p.from)}catch{}});
  Promise.all([a,b].map(w=>new Promise(r=>w.on('open',r)))).then(()=>{
  a.send(JSON.stringify({type:'msg',from:'spoof',data:'00'}))});setTimeout(()=>process.exit(0),2500)"
  ```

### BUG-03 · `JSON.parse` sem `try/catch` derruba o handler do cliente · [P1]

- **Arquivo:** `public/app.js:66-78` — `const pacote = JSON.parse(evento.data);` na linha 67, dentro
  de `ws.onmessage`, **sem** `try/catch`.
- **Evidência:** não há bloco `try` em torno do `parse`. Uma exceção não tratada dentro de um
  `onmessage` interrompe o callback e é registrada como erro não tratado no console.
- **Impacto:** um único payload inválido (enviado por qualquer par, e o servidor não filtra —
  `SEC-04`) quebra o recebimento no cliente. Em navegadores que paramam o handler após exceção, o
  usuário **deixa de receber mensagens** sem perceber — perda silenciosa de mensagens enquanto a
  conexão parece "conectada".
- **Mudança:** envolver o `parse` e o processamento inteiro em `try/catch`; em `catch`, mostrar aviso
  de mensagem inválida (via `msgSistema`) e **continuar** recebendo. Nunca deixar exceção escapar do
  handler.
- **Aceite:** ao receber `"lixo-json"`, o cliente mostra aviso e continua recebendo a mensagem seguinte.
- **Verificação:**
  ```bash
  # com os 2 clientes abertos, enviar payload invalido pelo servidor de teste
  node -e "const WebSocket=require('ws');const w=new WebSocket('ws://localhost:3000');
  w.on('open',()=>w.send('{quebrado'))" \
  # o cliente deve continuar recebendo apos a mensagem seguinte valida
  ```

### BUG-04 · Sem `maxPayload` no `WebSocketServer` · [P1]

- **Arquivo:** `server.js:40` (`const wss = new WebSocketServer({ server });`)
- **Evidência:** o construtor recebe **apenas** `{ server }`. Sem `maxPayload`, o `ws` aplica o
  default de 100 MB — mas a alocação já acontece **antes** do relay decidir, e a linha 55 faz
  `raw.toString()` sobre tudo.
- **Impacto:** é a porta de entrada do `BUG-00`. Mesmo com checagem manual depois, o buffer já foi
  alocado; 100 MB por conexão simultânea esgota a memória antes de qualquer filtro.
- **Mudança:** declarar `maxPayload` explícito (alinhado ao `BUG-00`), de modo que o `ws` recuse na
  camada de transporte antes de alocar.
- **Aceite:** o handshake de envio acima do limite é recusado pela biblioteca, não pelo relay.
- **Verificação:**
  ```bash
  grep -n 'maxPayload' server.js                     # deve aparecer no WebSocketServer
  node --check server.js && npm test
  ```
---

## 4. Bugs e defeitos funcionais

*(os bugs `BUG-00` a `BUG-04` já estão documentados na §3 por serem exploráveis via rede — o
formato de item foi mantido idêntico. Esta seção trata dos defeitos de comportamento puro.)*

### BUG-05 · Transferência de arquivo: nome vindo do par é usado direto no `download` · [P2]

- **Arquivo:** `public/app.js:185` (`a.download = nomeArquivo;`) e origem `public/app.js:127`
  (`{ type: 'file', from: nome, name: file.name, ... }`)
- **Evidência:** `nomeArquivo` vem de `receberArquivo(pacote.from, pacote.name, texto)` (`app.js:74`),
  ou seja, do **outrem**. É passado para `a.download` sem sanitizar. O servidor também repassa
  `name` sem checar (`SEC-04`).
- **Impacto:** `a.download` com valor como `../../` ou nome com `\n`/caracteres de controle não
  consegue escrever fora da pasta de downloads (o navegador impõe isso), mas **pode** sugerir nome
  enganoso (`nota.pdf\u0000.txt`, nome com RTL override que inverte a extensão visível) ou nome
  idêntico ao de outro arquivo — induzindo o usuário a sobrescrever/abrir o arquivo errado. Não é
  RCE, mas é engenharia social via nome de arquivo forjado, e passa por uma verificação que o
  servidor não faz.
- **Mudança:** (1) sanitizar no cliente: strip de `/`, `\\`, `..`, bytes de controle e caracteres
  de direção (U+202A..U+202E, U+2066..U+2069), limitar a 255 chars; (2) melhor: **o servidor normaliza**
  `name` no relay (`SEC-04`) — quem está na posição de autoridade deve validar; (3) mostrar o nome
  sanitizado ao usuário antes do clique.
- **Aceite:** `name: "../../evil"` e `name: "a\u202Efdp.exe"` chegam saneados ao receptor.
- **Verificação:**
  ```bash
  node -e "const s=n=>n.replace(/[\\/\\.\x00-\x1F\u202A-\u202E\u2066-\u2069]/g,'').slice(0,255);
  console.log(s('../../etc/passwd'));
  console.log(s('a\u202Efdp.exe'))"    # sem travessia nem override
  ```

### BUG-06 · `btoa` no envio de arquivo estoura com binário não-Latin-1 · [P2]

- **Arquivo:** `public/app.js:124` (`const base64 = btoa([...new Uint8Array(reader.result)].map((b) => String.fromCharCode(b)).join(''));`)
- **Evidência:** `String.fromCharCode(b)` para todo byte é seguro, mas `.join('')` **monta uma string
  gigante em memória** e `btoa` a copia de novo. Para um arquivo de 50 MB, são ~150 MB de alocação
  (buffer + string UTF-16 + saída base64) **antes** de cifrar — e o DES depois processa o base64.
- **Impacto:** envio de arquivo razoável congela a aba (main thread, sem `requestIdleCallback`) e pode
  derrubar a aba por OOM no cliente. Além disso, cifrar **base64** em vez dos bytes cru: o
  ciphertext fica 33% maior que o necessário, e isso multiplica o custo no relay (`BUG-00`).
- **Mudança:** (1) cifrar os **bytes** diretamente (`Uint8Array`), não o base64 — com AES-GCM
  (`SEC-01`) isso é natural via `Buffer`; (2) fazer a leitura/cifra em `Blob.slice` por chunks (ex.:
  1 MiB) para não materializar o arquivo inteiro; (3) mover para um `Worker` para não travar a UI.
- **Aceite:** enviar um arquivo de 50 MB não trava a aba e o tamanho no wire cai ~33%.
- **Verificação:**
  ```bash
  # no navegador: enviar 50 MB e medir
  performance.measureMemory && console.log(await performance.measureMemory())
  # e conferir no wire-log que o payload nao e base64 do base64
  ```

### BUG-07 · `wireLog` cresce sem limite (vazamento de memória na UI) · [P3]

- **Arquivo:** `public/app.js:167` (`wireLog.textContent += `${texto}\n`;`)
- **Evidência:** concatenação em `textContent` **sem rotação**. Cada mensagem e cada arquivo envia
  mais uma linha com o ciphertext completo (`app.js:97,127,167`).
- **Impacto:** sessão longa com arquivos crescendo o DOM indefinidamente — lentidão progressiva e
  eventual crash da aba. É o lado cliente do mesmo problema do `BUG-00`.
- **Mudança:** manter no máximo N linhas (ex.: 500), descartando as mais antigas; e truncar cada
  linha a ~80 chars (o log é diagnóstico, não precisa do ciphertext completo).
- **Aceite:** após 10 mil mensagens, `wireLog` tem no máximo 500 linhas.
- **Verificação:** inspecionar `wireLog.childElementCount` / tamanho após tráfego de teste.

---

## 5. Qualidade: testes, arquitetura e observabilidade

### TEST-02 · Sem teste de limite de tamanho e payload inválido · [P1]

- **Arquivo:** novo `test/limite-test.mjs`
- **Evidência:** o `test/chat-test.mjs` cobre 3 blocos (roundtrip DES, chave errada, integração de
  2 clientes). **Não** cobre: mensagem acima do limite, JSON inválido, `type` desconhecido, conexões
  acima do teto, `from` forjado. São exatamente os P0/P1 deste documento.
- **Impacto:** `BUG-00`, `BUG-01`, `SEC-04` e `BUG-02` podem voltar a qualquer refactor de relay
  sem sinal vermelho.
- **Mudança:** criar `test/limite-test.mjs` (mesmo padrão do teste existente: `check()` + exit code),
  cobrindo: (1) envio > `maxPayload` → close 1009; (2) 101ª conexão → recusa; (3) JSON inválido não
  repassa; (4) `type` fora do enum não repassa; (5) `from` sobrescrito pelo servidor. Adicionar ao
  `package.json` (`"test": "node test/chat-test.mjs && node test/limite-test.mjs"`).
- **Aceite:** `npm test` roda os 2 arquivos e falha se um dos limites regredir.
- **Verificação:**
  ```bash
  npm test   # ambos os arquivos, 0 falhas
  ```

### TEST-03 · Sem teste do modo AES-GCM · [P1]

- **Arquivo:** novo `test/aes-test.mjs`
- **Evidência:** o único teste de cifra é o DES (`test/chat-test.mjs:18-26`). O modo novo de `SEC-01`
  não teria verificação alguma.
- **Impacto:** introduzir um modo de cifra novo sem teste é como introduzi-lo às cegas — IV fixo,
  tag ignorada ou ordem de parâmetros trocada passariam despercebidos, e esses são erros clássicos
  de GCM.
- **Mudança:** cobrir: (1) roundtrip; (2) **IV aleatório** — mesma plaintext, ciphertexts diferentes;
  (3) ciphertext adulterado (flip em 1 bit) → falha de tag; (4) chave errada → falha; (5) IV reutilizado
  detectável/evitado pela API.
- **Aceite:** `npm test` prova os 5 casos; adulteração é rejeitada.
- **Verificação:**
  ```bash
  node test/aes-test.mjs    # 5 asserts passando
  ```

### IMP-01 · Não reconecta após queda · [P2]

- **Arquivo:** `public/app.js:63` (`ws.onclose = () => setStatus('desconectado', false);`)
- **Evidência:** o `onclose` **só** atualiza o status. Não há nova tentativa, nem backoff. O usuário
  precisa sair e reentrar (`btn-usar`) manualmente.
- **Impacto:** qualquer queda breve de rede (Wi-Fi oscilante, proxy reiniciando) encerra a sessão e
  as mensagens seguintes são perdidas silenciosamente (`ws.readyState !== 1` em `app.js:91` faz
  `return` sem avisar — o usuário digita e nada sai).
- **Mudança:** reconexão automática com backoff exponencial (0,5s → 8s, com jitter), revalidando a
  chave da sala; mostrar "reconectando…" no `status`. Alertar explicitamente quando a mensagem não
  pôde ser enviada (hoje é um `return` mudo).
- **Aceite:** derrubar o servidor por 3 s e religar → o cliente volta sozinho, sem intervenção.
- **Verificação:**
  ```bash
  # subir, derrubar por 3s e religar; o navegador deve voltar a receber sem clique
  kill -STOP <pid>; sleep 3; kill -CONT <pid>
  ```

### IMP-02 · Nenhum indicador de presença/digitação · [P3]

- **Arquivo:** `public/app.js:62` (`ws.onopen = () => setStatus('conectado', true);`)
- **Evidência:** o único status é "conectado/desconectado". O servidor manda `Pares na sala: N`
  **uma vez** no `server.js:47-50` e nunca mais. Não há evento de entrada/saída de pares nem
  indicador de digitação.
- **Impacto:** o usuário não sabe com quem está falando nem quando o outro saiu. Como não há
  identidade atribuída (`BUG-02`), isso agrava a sensação de sala anônima.
- **Mudança:** enviar mensagem `peers` a cada entrada/saída (`server.js:59` já tem o `close`);
  exibir contagem e lista atualizada. Adicionar evento `typing` (opt-in, sem servidor de estado).
- **Aceite:** abrir/fechar uma aba atualiza a contagem na sala de todos os pares.
- **Verificação:** abrir 2 clientes, fechar 1, e conferir que o outro vê a contagem mudar.

---

## 6. DevOps / Infra

### DEVOPS-01 · Sem Dockerfile e sem CI · [P2]

- **Arquivo:** *(ausente)* `Dockerfile`, *(ausente)* `.github/workflows/`
- **Evidência:** `ls -la` não mostra `Dockerfile`; não existe `.github/workflows`.
- **Impacto:** sem CI, `npm test` (que é bom!) só roda se alguém lembrar. É o mesmo motivo pelo
  qual projetos irmãos da conta já têm CI e este não. Sem Dockerfile não há como subir de forma
  reproduzível além de `npm start` manual.
- **Mudança:** (1) `Dockerfile` multi-stage (`node:20-alpine`, `npm ci --omit=dev`, `USER node`,
  `EXPOSE 3000`, `HEALTHCHECK` em algo como `/` com resposta 200); (2) `ci.yml` com
  `node --check server.js` + `npm ci` + `npm test` em `on: [push, pull_request]`.
- **Aceite:** `docker build` sobe e `npm test` roda no CI a cada push.
- **Verificação:**
  ```bash
  docker build -t chatcripto . && docker run --rm -p 3000:3000 chatcripto & sleep 3
  curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/    # 200
  ```

### DEVOPS-02 · `.gitignore` ignora `package-lock.json` · [P3]

- **Arquivo:** `.gitignore:21` (`package-lock.json`)
- **Evidência:** as últimas duas linhas do `.gitignore` são `node_modules/` e `package-lock.json`.
- **Impacto:** sem o lockfile versionado, `npm ci` **falha** (ele exige o lock) e cada máquina gera
  árvore de dependências diferente — o teste pode passar aqui e falhar em outro. É o que impede o
  `DEVOPS-01` de usar `npm ci`.
- **Mudança:** remover a linha `package-lock.json` do `.gitignore`, comitar o lock existente
  (`ls` mostra que ele está no disco) e trocar `npm install` por `npm ci` em qualquer instrução.
- **Aceite:** `package-lock.json` versionado; `npm ci` funciona.
- **Verificação:**
  ```bash
  git ls-files --error-unmatch package-lock.json && echo OK
  npm ci --dry-run
  ```

### DEVOPS-03 · Falta `.env` de exemplo e variáveis de porta · [P3]

- **Arquivo:** *(ausente)* `.env.example` · `server.js:11` (`const PORT = process.env.PORT || 3000;`)
- **Evidência:** a única variável é `PORT`, com default 3000. Não há `.env.example` nem `.env`.
- **Impacto:** impacto baixo **hoje**, mas junto com o `SEC-02` (TLS) e `BUG-01` (limite de conexões)
  as configurações novas vão precisar de casa — sem exemplo, quem clona descobre por tentativa.
- **Mudança:** `.env.example` com `PORT=3000`, `MAX_PAYLOAD_MB=64`, `MAX_PEERS=100` (as novas de
  `BUG-00`/`BUG-01`) e comentários de uso.
- **Aceite:** `.env.example` versionado reflete todas as variáveis lidas pelo código.
- **Verificação:** `diff` entre `process.env.` do código e as chaves do exemplo.

---

## 7. Documentação

### DOC-01 · README não expõe os limites e o modo de cifra · [P3]

- **Arquivo:** `README.md` (4.094 bytes)
- **Evidência:** o README descreve a instalação e a conversão Java→JS, mas não documenta: (a) o teto
  de mensagem/conexões que `BUG-00`/`BUG-01` vão introduzir; (b) que a cifra é **DES/ECB de 56 bits**
  e portanto **não é apropriada para dados sensíveis**; (c) que o modo novo (AES-GCM, `SEC-01`) é o
  recomendado.
- **Impacto:** o usuário pode tratar isto como chat seguro (o nome do projeto é "criptografado")
  quando, com DES de 56 bits, **não é** para qualquer segredo real. Isso é expectativa enganosa —
  e é o tipo de coisa que precisa estar explícita, não implícita.
- **Mudança:** seção "Limites e segurança" com: algoritmo e força de chave (com aviso claro), teto
  de mensagem/conexão, ausência de autenticação no canal, recomendação de AES-GCM, e nota de que o
  DES existe por fidelidade histórica ao `Chat1.java`.
- **Aceite:** alguém lê o README e sabe que **não** deve usar isto para credencial/segredo.
- **Verificação:** `grep -n 'DES\|56 bits\|limite' README.md` retorna a seção nova.

---

## 8. Ordem de execução (waves)

### Wave 1 — Parar DoS imediato (P0)
1. **`BUG-04`** — declarar `maxPayload` no `WebSocketServer` (barreira na camada de transporte).
2. **`BUG-00`** — teto explícito + rejeição 1013/1009 com log do remetente.
3. **`BUG-01`** — limite global e por IP de conexões + timeout de inatividade.

> `BUG-04` antes de `BUG-00`: o `maxPayload` do `ws` recusa **antes** de alocar; o teto do relay
> sozinho chega tarde demais.

### Wave 2 — Cifra e canal (P0/P1)
4. **`SEC-01`** — adicionar AES-256-GCM **em paralelo** (nunca removendo o DES; manter `npm test` verde).
5. **`TEST-03`** — travar o modo novo (IV aleatório, tag, adulteração).
6. **`SEC-02`** — obrigar TLS/wss fora de localhost.
7. **`SEC-03`** — handshake com desafio HMAC (sem servidor conhecer a chave).

### Wave 3 — Integridade do protocolo (P1)
8. **`SEC-04`** — validar payload no servidor (enum de `type`, `data` hex, `name` saneado).
9. **`BUG-02`** — servidor sobrescreve `from` com `peerId` próprio.
10. **`BUG-03`** — `try/catch` no `JSON.parse` do cliente.
11. **`TEST-02`** — testes de limite/payload inválido (trava dos itens 1-3 e 8).

### Wave 4 — Qualidade e infra (P2/P3)
12. **`BUG-05`**, **`BUG-06`** — nome de arquivo saneado; cifra dos bytes (não do base64).
13. **`SEC-05`** — revisar o `/geo` (IP do usuário para terceiro).
14. **`IMP-01`** — reconexão com backoff.
15. **`DEVOPS-01`** — Dockerfile + CI (com `npm ci`, exige `DEVOPS-02`).
16. **`DEVOPS-02`**, **`DEVOPS-03`**, **`BUG-07`**, **`IMP-02`**, **`DOC-01`**.

**Dependências que não podem ser invertidas:**
`BUG-04` antes de `BUG-00` · `SEC-04` antes de `BUG-05` (o servidor é quem deve saneear) ·
`SEC-01` antes de `TEST-03` · `DEVOPS-02` antes de `DEVOPS-01` (`npm ci` exige o lock) ·
`SEC-01` antes de `DOC-01` (documentar o modo bom).

---

## 9. Fora de escopo / riscos

| Item | Decisão | Motivo |
|---|---|---|
| **Remover** o DES/ECB e trocar tudo por AES | **Não** | Quebraria a razão de existir do repositório e o teste de fidelidade `test/chat-test.mjs:23-34`. A solução é modo novo **em paralelo** (`SEC-01`). |
| Voltar ao UDP original (DatagramSocket) | **Não** | A conversão para WebSocket é o commit `8cbfb26` e já é testada; voltar atrás perde o ganho de alcance. |
| Trocar `crypto-js` por `crypto` do Node no DES | **Não** | Node não tem DES; `crypto-js` é a implementação viável. Mantê-lo (com lock versionado, `DEVOPS-02`). |
| Adicionar servidor de contas/identidade real | **Não** | Contraria o desenho "servidor burro". A identidade mínima via `peerId` no handshake (`BUG-02`) basta. |
| Rate limit por conteúdo de mensagem | **Não** | O servidor não lê o conteúdo (é cifrado); rate limit é por conexão/IP (`BUG-01`). |

**Riscos desta execução:**

- **`SEC-01` pode quebrar compatibilidade.** Se os dois lados não anunciarem `alg`, o default
  antigo é DES. Faça a negociação **antes** de mudar o default, e mantenha os dois caminhos durante
  a transição — caso contrário dois clientes de versões diferentes não conversam.
- **`SEC-02` (obrigar TLS) pode derrubar o uso local.** Exclua `localhost` explicitamente ou os
  testes locais (`test/chat-test.mjs:50` usa `ws://localhost`) quebram.
- **`BUG-01` (limite de conexões) pode expulsar pares legítimos** num uso real de sala grande.
  Escolha o limite com margem e logue recusas por um período antes de fechar.
- **`BUG-06` trocar base64 por bytes cru muda o formato no wire.** Requer versão de protocolo —
  faça junto com `SEC-04` (validação de payload), senão cliente antigo recebe lixo.

---

## 10. Definição de pronto (DoD)

**Segurança**
- [ ] `SEC-01` — AES-GCM disponível; IV aleatório por mensagem; DES mantido e testado
- [ ] `SEC-02` — `ws://` só em localhost; TLS obrigatório fora disso
- [ ] `SEC-03` — sala exige desafio HMAC; sem chave, handshake recusado
- [ ] `SEC-04` — payload inválido não é repassado
- [ ] `SEC-05` — `/geo` não vaza IP para terceiro sem consentimento

**Funcional**
- [ ] `BUG-00` — mensagem > teto → 1009, sem crescimento de memória
- [ ] `BUG-01` — conexões acima do limite → recusa (1013)
- [ ] `BUG-02` — `from` é o `peerId` do servidor, não o digitado
- [ ] `BUG-03` — JSON inválido não quebra o cliente
- [ ] `BUG-04` — `maxPayload` declarado no `WebSocketServer`
- [ ] `BUG-05` — `name` com travessia/RTL chega saneado (validado no servidor)
- [ ] `BUG-06` — arquivo de 50 MB envia sem travar a aba
- [ ] `BUG-07` — `wireLog` tem teto de linhas

**Testes**
- [ ] `TEST-02` — testes de limite/payload inválido no `npm test`
- [ ] `TEST-03` — testes de AES-GCM (IV, tag, adulteração) no `npm test`

**Qualidade e infra**
- [ ] `IMP-01` — reconexão automática com backoff
- [ ] `IMP-02` — contagem de pares atualiza para todos
- [ ] `DEVOPS-01` — Dockerfile + CI verdes
- [ ] `DEVOPS-02` — `package-lock.json` versionado; `npm ci` funciona
- [ ] `DEVOPS-03` — `.env.example` com as variáveis novas
- [ ] `DOC-01` — README expõe limites e força real da cifra

**Validação final:**
```bash
node --check server.js && npm test
# nenhum limite regrediu, fidelidade DES preservada
```

---

*Fim do plano. Gerado por leitura direta do código em 2026-10-02. Nenhum item já estava corrigido*
*— todos apontam para defeitos ainda presentes.*

### DEVOPS-04 · `crypto-js` sem pin de versão exata · [P2]

- **Arquivo:** `package.json:14` (`"crypto-js": "^4.2.0"`)
- **Evidência:** o caret `^4.2.0` aceita qualquer `4.x >= 4.2.0`. O `package-lock.json` está no
  disco mas **não versionado** (`DEVOPS-02`), então `npm install` regenera a árvore em cada máquina
  — o que roda aqui não é necessariamente o que roda no servidor.
- **Impacto:** a biblioteca de cifra é componente de segurança; uma minor bump quebrante ou
  comprometida entra no build sem revisão. Como `crypto-js` é o que executa o DES do `SEC-01`, a
  confiança nele é direta na segurança do chat.
- **Mudança:** (1) versionar o lock (`DEVOPS-02`); (2) trocar o caret por versão exata em
  `package.json` (`"crypto-js": "4.2.0"`); (3) adicionar `npm audit --omit=dev` ao CI
  (`DEVOPS-01`) como barreira.
- **Aceite:** `npm ci` instala exatamente `4.2.0`; o CI roda `npm audit` a cada push.
- **Verificação:**
  ```bash
  grep 'crypto-js' package.json package-lock.json | grep -o '4\.2\.0' | head -3
  npm ci --dry-run && npm audit --omit=dev
  ```
