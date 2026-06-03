const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Armazenar conversas em memória
const conversas = {};

// Webhook para receber mensagens do Zavu
app.post('/webhook/zavu', async (req, res) => {
  try {
    console.log('Webhook recebido:', req.body);
    
    const { from, text } = req.body;
    
    if (!from || !text) {
      return res.json({ success: false, message: 'Dados incompletos' });
    }

    // Guardar conversa
    if (!conversas[from]) {
      conversas[from] = [];
    }
    
    conversas[from].push({
      remetente: 'usuario',
      mensagem: text,
      timestamp: new Date()
    });

    // Gerar resposta
    const resposta = gerarResposta(text);
    
    // Enviar resposta de volta
    const axios = require('axios');
    await axios.post(
      'https://api.zavu.dev/api/v1/messages/send',
      {
        to: from,
        text: resposta
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.ZAVU_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Guardar resposta do bot
    conversas[from].push({
      remetente: 'bot',
      mensagem: resposta,
      timestamp: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Status
app.get('/api/status', (req, res) => {
  res.json({
    status: '✅ Online',
    servico: 'Assist EMT Bot',
    plataforma: 'Zavu WhatsApp API',
    conversas_ativas: Object.keys(conversas).length
  });
});

// API: Conversas
app.get('/api/conversas', (req, res) => {
  res.json({
    total_conversas: Object.keys(conversas).length,
    conversas: conversas
  });
});

// API: Conversa específica
app.get('/api/conversas/:numero', (req, res) => {
  const numero = req.params.numero;
  const conversa = conversas[numero] || [];
  res.json({ numero, mensagens: conversa });
});

// API: Enviar mensagem manual
app.post('/api/enviar', async (req, res) => {
  try {
    const { numero, mensagem } = req.body;
    const axios = require('axios');

    await axios.post(
      'https://api.zavu.dev/api/v1/messages/send',
      {
        to: numero,
        text: mensagem
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.ZAVU_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

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

function gerarResposta(mensagem) {
  const texto = mensagem.toLowerCase();

  if (texto.includes('oi') || texto.includes('olá')) {
    return '👋 Olá! Bem-vindo ao Assist EMT. Como posso ajudá-lo?';
  }
  if (texto.includes('ajuda')) {
    return '📋 Opções:\n1️⃣ Informações\n2️⃣ Agendamento\n3️⃣ Suporte\n4️⃣ Atendente';
  }
  if (texto === '1') {
    return 'ℹ️ Somos especializados em atendimento de emergências médicas 24/7.';
  }
  if (texto === '2') {
    return '📅 Para agendar, envie sua disponibilidade.';
  }
  if (texto === '3') {
    return '🛠️ Estou aqui para ajudar. Qual é o seu problema?';
  }
  if (texto === '4') {
    return '👤 Conectando com um atendente...';
  }
  
  return '✅ Mensagem recebida! Responderemos em breve.';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bot rodando na porta ${PORT}`);
});
