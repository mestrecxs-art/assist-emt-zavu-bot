const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Armazenar conversas
const conversas = {};

// Logger para Baileys
const logger = pino({ level: 'error' });

// Inicializar Baileys
let sock = null;
let isConnected = false;

async function connectWhatsApp() {
  try {
    console.log('🔄 Conectando ao WhatsApp com Baileys...');

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
      auth: state,
      logger: logger,
      syncFullHistory: false
    });

    // Evento: conexão estabelecida e QR Code
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('📱 QR CODE GERADO! Escaneie com seu WhatsApp:');
        console.log(qr);
        // Salvar QR code em base64 para acesso via API
        global.qrCode = qr;
      }

      if (connection === 'open') {
        console.log('✅ WhatsApp conectado com Baileys!');
        isConnected = true;
        global.qrCode = null; // Limpar QR após conexão bem-sucedida
      } else if (connection === 'close') {
        console.log('❌ WhatsApp desconectado');
        isConnected = false;

        if (lastDisconnect?.error?.output?.statusCode !== 401) {
          setTimeout(() => connectWhatsApp(), 3000);
        }
      }
    });

    // Salvar credenciais
    sock.ev.on('creds.update', saveCreds);

    // Evento: mensagem recebida
    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];

      if (!msg.message) return;

      const from = msg.key.remoteJid;
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

      if (!texto) return;

      console.log(`📱 Mensagem de ${from}: ${texto}`);

      // Guardar conversa
      if (!conversas[from]) {
        conversas[from] = [];
      }

      conversas[from].push({
        remetente: 'usuario',
        mensagem: texto,
        timestamp: new Date()
      });

      // Gerar resposta
      const resposta = gerarResposta(texto);

      // Enviar resposta
      try {
        await sock.sendMessage(from, { text: resposta });

        console.log(`✅ Resposta enviada para ${from}: ${resposta}`);

        conversas[from].push({
          remetente: 'bot',
          mensagem: resposta,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error.message);
      }
    });

  } catch (error) {
    console.error('❌ Erro ao conectar WhatsApp:', error.message);
    setTimeout(() => connectWhatsApp(), 5000);
  }
}

// Função de resposta
function gerarResposta(mensagem) {
  const texto = mensagem.toLowerCase().trim();

  if (texto.includes('oi') || texto.includes('olá') || texto.includes('opa')) {
    return '👋 Olá! Bem-vindo ao Assist EMT. Como posso ajudá-lo?';
  }
  if (texto.includes('ajuda')) {
    return '📋 Opções disponíveis:\n1️⃣ Informações gerais\n2️⃣ Agendamento\n3️⃣ Suporte técnico\n4️⃣ Falar com atendente';
  }
  if (texto === '1') {
    return 'ℹ️ Somos especializados em atendimento de emergências médicas 24/7.';
  }
  if (texto === '2') {
    return '📅 Para agendar, envie sua disponibilidade.';
  }
  if (texto === '3') {
    return '🛠️ Qual é o seu problema técnico?';
  }
  if (texto === '4') {
    return '👤 Conectando com um atendente...';
  }

  return '✅ Mensagem recebida! Responderemos em breve.';
}

// APIs REST (para dashboard)

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
      return res.status(500).json({ error: 'WhatsApp não está conectado' });
    }

    await sock.sendMessage(numero, { text: mensagem });

    if (!conversas[numero]) conversas[numero] = [];
    conversas[numero].push({
      remetente: 'bot',
      mensagem: mensagem,
      timestamp: new Date()
    });

    res.json({ success: true, message: 'Mensagem enviada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', connected: isConnected });
});

// QR Code endpoint
app.get('/api/qr', (req, res) => {
  if (global.qrCode) {
    res.json({
      qr: global.qrCode,
      status: 'QR Code gerado - escaneie com seu WhatsApp'
    });
  } else if (isConnected) {
    res.json({
      status: 'Bot já está conectado!',
      message: 'Não há novo QR Code necessário'
    });
  } else {
    res.status(503).json({
      status: 'QR Code ainda não foi gerado',
      message: 'Aguarde alguns segundos...'
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Bot rodando na porta ${PORT}`);
  connectWhatsApp();
});
