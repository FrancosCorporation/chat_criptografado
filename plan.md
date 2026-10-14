# Plan — chat_criptografado

## 1. Visão geral
Chat P2P criptografado (fidelidade ao projeto Java de 2022, DES/ECB original) — versão web Node com WebSocket. **Intencionalmente preserva o DES/ECB legado** como modo compatível e adiciona AES-256-GCM moderno em paralelo (SEC-01, não substitui o legacy).

## 2. Arquitetura e tecnologias
Node 22+, ESM, `ws` 8 + `crypto-js` 4. Modos: DES (compat) / AES-256-GCM (padrão).

## 3. Funcionalidades existentes
- [x] AES-256-GCM com IV aleatório por mensagem (novo modo) — 2026-10-11.
- [x] DES legado em paralelo (compatibilidade preservada) — 2026-10-11.
- [x] Relay com limites (64 MiB payload, 100 conexões, 10/IP, anti-idle) — implementado.
- [x] Interface com limites por modo — implementado.
- [ ] CI — **implementada nesta sessão**.

## 4. Objetivos futuros
- OBJ-01 (P2, concluído nesta sessão): CI estática.
- OBJ-02 (P3): TEST-01 — teste do chat local com 2 clientes WS (fora da esteira).
- OBJ-03 (P3): demo de criptografia no README (captura do Wireshark antes/depois).

## 5–9. Melhorias/Roadmap/Riscos/Ideias
- **Regra absoluta (§0):** nunca remover o modo DES sem deixar o teste antigo verde.
- Risco: crypto-js é amplamente usado; qualquer migração para `node:crypto` deve ser dedicada.

*(Gerado em 2026-10-14 pelo agente orquestrador)*
