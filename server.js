import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import Zavu from '@zavudev/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const zavu = new Zavu({
  apiKey: process.env.ZAVU_API_KEY
});

const conversas = new Map();

// WEBHOOK - Receber mensagens do Zavu
app.post('/webhook/zavu', async (req, res) => {
  try {
    const { id, from, text, timestamp, channel } = req.body;

    console.log(`📨 Mensagem recebida de ${from}: ${text}`);

    if (!conversas.has(from)) {
      conversas.set(from, []);
    }
    conversas.get(from).push({
      remetente: 'usuario',
      mensagem: text,
      timestamp: timestamp
    });

    const resposta = await gerarResposta(text, from);

    await zavu.messages.send({
      to: from,
      channel: 'whatsapp',
      text: resposta
    });

    console.log(`✅ Resposta enviada para ${from}: ${resposta}`);

    conversas.get(from).push({
      remetente: 'bot',
      mensagem: resposta,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, messageId: id });
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

async function gerarResposta(mensagem, numeroUsuario) {
  const textoLower = mensagem.toLowerCase();

  if (textoLower.includes('oi') || textoLower.includes('olá')) {
    return 'Olá! 👋 Bem-vindo ao Assist EMT. Como posso ajudá-lo?';
  }

  if (textoLower.includes('ajuda') || textoLower.includes('help')) {
    return `📋 Opções disponíveis:\n1️⃣ Informações gerais\n2️⃣ Agendamento\n3️⃣ Suporte técnico\n4️⃣ Falar com um atendente\n\nDigite o número da opção desejada.`;
  }

  if (textoLower.includes('1')) {
    return 'ℹ️ Somos a Assist EMT, especializada em soluções de emergência médica e transporte.';
  }

  if (textoLower.includes('2')) {
    return '📅 Para agendar um serviço, por favor informe a data e local desejado.';
  }

  if (textoLower.includes('3')) {
    return '🔧 Para suporte técnico, descreva seu problema e faremos o possível para resolver.';
  }

  if (textoLower.includes('4')) {
    return '👤 Um atendente entrará em contato em breve. Aguarde...';
  }

  return '👍 Recebi sua mensagem! Um dos nossos atendentes responderá em breve.';
}

// ENDPOINTS - API
app.get('/api/status', (req, res) => {
  res.json({
    status: '✅ Online',
    servico: 'Assist EMT Bot',
    plataforma: 'Zavu WhatsApp API',
    conversas_ativas: conversas.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/conversas/:numero', (req, res) => {
  const { numero } = req.params;
  const conversa = conversas.get(numero);

  if (!conversa) {
    return res.status(404).json({ error: 'Conversa não encontrada' });
  }

  res.json({
    numero,
    mensagens: conversa,
    total: conversa.length
  });
});

app.get('/api/conversas', (req, res) => {
  const todasConversas = {};
  conversas.forEach((mensagens, numero) => {
    todasConversas[numero] = mensagens;
  });

  res.json({
    total_conversas: conversas.size,
    conversas: todasConversas
  });
});

app.post('/api/enviar', async (req, res) => {
  try {
    const { numero, mensagem } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
    }

    await zavu.messages.send({
      to: numero,
      channel: 'whatsapp',
      text: mensagem
    });

    console.log(`✅ Mensagem enviada para ${numero}`);
    res.json({ success: true, numero, mensagem });
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🤖 ASSIST EMT BOT - ZAVU API         ║
║  ✅ Servidor rodando na porta ${PORT}       ║
║  📱 Webhook: /webhook/zavu            ║
║  🔗 API: /api/*                        ║
╚════════════════════════════════════════╝
  `);
});