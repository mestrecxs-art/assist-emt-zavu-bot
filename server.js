const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const conversas = {};
const logger = pino({ level: 'error' });
let sock = null;
let isConnected = false;

async function connectWhatsApp() {
  try {
    console.log('🔄 Conectando ao WhatsApp com Baileys...');
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
      auth: state,
      logger: logger,
      printQRInTerminal: true,
      syncFullHistory: false
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'open') {
        console.log('✅ WhatsApp conectado!');
        isConnected = true;
      } else if (connection === 'close') {
        console.log('❌ WhatsApp desconectado');
        isConnected = false;
        if (lastDisconnect?.error?.output?.statusCode !== 401) {
          setTimeout(() => connectWhatsApp(), 3000);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.message) return;
      const from = msg.key.remoteJid;
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      if (!texto) return;

      console.log(`📱 Mensagem de ${from}: ${texto}`);

      if (!conversas[from]) conversas[from] = [];
      conversas[from].push({
        remetente: 'usuario',
        mensagem: texto,
        timestamp: new Date()
      });

      const resposta = gerarResposta(texto);

      try {
        await sock.sendMessage(from, { text: resposta });
        console.log(`✅ Resposta enviada: ${resposta}`);
        conversas[from].push({
          remetente: 'bot',
          mensagem: resposta,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('❌ Erro:', error.message);
      }
    });

  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    setTimeout(() => connectWhatsApp(), 5000);
  }
}

function gerarResposta(mensagem) {
  const texto = mensagem.toLowerCase().trim();
  if (texto.includes('oi') || texto.includes('olá')) {
    return '👋 Olá! Bem-vindo ao Assist EMT. Como posso ajudá-lo?';
  }
  if (texto.includes('ajuda')) {
    return '📋 Opções:\n1️⃣ Informações\n2️⃣ Agendamento\n3️⃣ Suporte\n4️⃣ Atendente';
  }
  if (texto === '1') return 'ℹ️ Atendimento de emergências médicas 24/7.';
  if (texto === '2') return '📅 Envie sua disponibilidade.';
  if (texto === '3') return '🛠️ Qual é o problema?';
  if (texto === '4') return '👤 Conectando...';
  return '✅ Mensagem recebida!';
}

app.get('/api/status', (req, res) => {
  res.json({
    status: isConnected ? '✅ Online' : '❌ Offline',
    servico: 'Assist EMT Bot',
    plataforma: 'WhatsApp (Baileys)',
    conversas_ativas: Object.keys(conversas).length,
    conectado: isConnected
  });
});

app.get('/api/conversas', (req, res) => {
  res.json({
    total_conversas: Object.keys(conversas).length,
    conversas: conversas
  });
});

app.get('/api/conversas/:numero', (req, res) => {
  const numero = req.params.numero;
  const conversa = conversas[numero] || [];
  res.json({ numero, mensagens: conversa });
});

app.post('/api/enviar', async (req, res) => {
  try {
    const { numero, mensagem } = req.body;
    if (!sock || !isConnected) {
      return res.status(500).json({ error: 'WhatsApp não conectado' });
    }
    await sock.sendMessage(numero, { text: mensagem });
    if (!conversas[numero]) conversas[numero] = [];
    conversas[numero].push({
      remetente: 'bot',
      mensagem: mensagem,
      timestamp: new Date()
    });
    res.json({ success: true, message: 'Enviado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', connected: isConnected });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bot rodando na porta ${PORT}`);
  connectWhatsApp();
});
