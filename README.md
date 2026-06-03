# 🤖 Assist EMT Bot - Zavu WhatsApp API

WhatsApp Bot usando Zavu API para responder mensagens automaticamente.

## Setup

1. Instale dependências: `npm install`
2. Configure `.env` com sua API Key
3. Inicie: `npm start`

## Endpoints

- `GET /api/status` - Status do bot
- `GET /api/conversas` - Todas as conversas
- `GET /api/conversas/:numero` - Conversa específica
- `POST /api/enviar` - Enviar mensagem manual
- `POST /webhook/zavu` - Webhook do Zavu

## Deploy

Este projeto está configurado para rodar no Railway.