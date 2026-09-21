# Chat Criptografado

## 🐳 Instalação e Execução (Docker) — recomendado

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose

### Rodar com Docker
```bash
docker compose up --build
```
```bash
docker run --rm -v $(pwd):/src -w /src eclipse-temurin:17 sh -c 'javac -d out $(find src -name "*.java")'
```

### Sem Docker (local)
```bash
# Requer JDK
javac -d out $(find src -name '*.java')
java -cp out Chat1
```

Chat peer-to-peer em Java com mensagens cifradas em **DES** — **projeto de estudo** de programação em redes (2022).

![Java](https://img.shields.io/badge/Java-11-orange?logo=openjdk&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-conclu%C3%ADdo%20(estudo)-blue)

## Sobre

Trabalho de estudo desenvolvido em 2022 para praticar sockets e criptografia simétrica em Java.
É um chat entre dois pontos (dois processos na mesma máquina ou em máquinas diferentes) que troca
mensagens via **UDP** e cifra o conteúdo com o algoritmo **DES**. A chave de criptografia **é gerada
em tempo de execução** pela própria aplicação (opção `G` do menu) e gravada localmente no arquivo
`Chave.key` — esse arquivo **não é versionado** e não há chave fixa no repositório.

Os créditos no código citam os professores **Alexandre Paiva e Bruno Manso** (material de apoio da disciplina).

## Funcionalidades

- Chat ponto a ponto via **UDP** (`DatagramSocket`/`DatagramPacket`), com envio e recebimento em threads separadas.
- **Criptografia DES/ECB/PKCS5Padding** (`javax.crypto`) de todas as mensagens, com decifragem na recepção.
- **Geração de chave em runtime** (`KeyGenerator` + `SecureRandom`), salva em `Chave.key` para ser usada pelos dois lados.
- Menu de opções com interface em `JOptionPane` (Swing):
  - `G` — geolocalização do próprio IP consultando a API pública `ipapi.co`;
  - `O` — geolocalização de outro IP, abrindo o **Google Maps** no navegador;
  - `U` / `D` — transferência de arquivo entre os pontos via **TCP** (`ServerSocket`/`Socket`);
  - `S` / `V` — sair ou voltar ao chat.
- Seleção de IP de destino (local `127.0.0.1`, IP externo ou IP digitado manualmente).
- Classes de exemplo didáticas: `GeradorChave`, `Criptografador`, `Descriptografador` e variantes para arquivo,
  além de um cliente/servidor TCP mínimo (`clienteseguro` / `servidorseguro`).

## Stack

- **Java 11** (projeto Eclipse `JavaSE-11`).
- **Java Swing / AWT** para os diálogos (`JOptionPane`, `Desktop`).
- **java.net**: `DatagramSocket`, `DatagramPacket`, `ServerSocket`, `Socket`, `URL`/`URLConnection`.
- **javax.crypto / java.security**: DES, `Cipher`, `KeyGenerator`, `SecureRandom`.
- API externa: [ipapi.co](https://ipapi.co) (geolocalização por IP).

## Como rodar

Requer JDK 11+ instalado. Não há build automatizado (Maven/Gradle) — o projeto é Eclipse puro.

Via linha de comando, a partir da raiz do repositório:

```bash
javac -d bin src/Exemplos/*.java
java -cp bin Exemplos.chat1.Chat1
```

Pontos de entrada (`main`) disponíveis:

- `Exemplos.chat1.Chat1` — versão com interface gráfica (menus e diálogos).
- `Exemplos.PeerChat1.Chat1` — versão de console (menu "1 - Gerar chave / 2 - Entrar no programa").

> A segunda versão do chat (`chat2` / `PeerChat2`, em `src/Exemplos/PeerChat2.java`) está **em desenvolvimento**:
> o bloco principal está comentado no código. Ela **não** tem `main` executável no estado atual.

Passos para conversar:

1. Execute a aplicação nas duas máquinas (ou em dois terminais).
2. Em um dos lados, gere a chave (opção `G` no menu) e copie o arquivo `Chave.key` gerado para o outro lado,
   ou gere a chave em ambos os lados antes de conectar.
3. Informe porta de saída, porta de destino e o IP do outro ponto, e comece a digitar.

> Observação: `Chave.key` é criada em tempo de execução e está no `.gitignore`; o arquivo citado no
> código-fonte é gerado automaticamente, não sendo necessário versioná-lo.

## Estrutura do projeto

```
chat_criptografado/
├── src/Exemplos/
│   ├── Chat1.java                  # chat UDP com interface gráfica (main em chat1.Chat1)
│   ├── PeerChat1.java              # chat UDP de console (main em PeerChat1.Chat1)
│   ├── PeerChat2.java              # 2ª versão do chat (em desenvolvimento, main comentado)
│   ├── ComunicadorSeguro.java      # cliente/servidor TCP reutilizável
│   ├── GeradorChave.java           # gera a chave DES em runtime
│   ├── Criptografador*.java        # exemplos de cifragem (texto e arquivo)
│   ├── Descriptografador*.java     # exemplos de decifragem
│   ├── clienteseguro.java          # cliente TCP de exemplo
│   ├── servidorseguro.java         # servidor TCP de exemplo
│   └── ...                         # demais exemplos de aula
├── .classpath / .project           # configuração Eclipse
└── README.md
```

## Licença

MIT — veja [LICENSE](LICENSE).
