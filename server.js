const express = require('express');
const dotenv = require('dotenv');
const https = require('https');

dotenv.config();

const app = express();
app.use(express.json());

const ZAVU_API_KEY = process.env.ZAVU_API_KEY;

app.post('/webhook/zavu', async (req, res) => {
  try {
    console.log('✅ WEBHOOK RECEBIDO!');
    const { from, text } = req.body;
    console.log(`Mensagem de ${from}: ${text}`);

    // Enviar resposta
    const resposta = text.toLowerCase().includes('olá') 
      ? '👋 Olá! Bem-vindo ao bot!' 
      : '✅ Mensagem recebida!';

    await enviarMensagem(from, resposta);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

async function enviarMensagem(numero, texto) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      to: numero,
      text: texto
    });

    const options = {
      hostname: 'api.zavu.dev',
      path: '/api/v1/messages/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZAVU_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Resposta enviada:', data);
        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error('Erro ao enviar:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

app.get('/api/status', (req, res) => {
  res.json({ status: '✅ Online', bot: 'Assist EMT' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bot rodando na porta ${PORT}`);
});
