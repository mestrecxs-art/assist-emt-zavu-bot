const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

// LOG DE TODAS AS REQUISIÇÕES
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Body:', req.body);
  next();
});

app.post('/webhook/zavu', (req, res) => {
  console.log('✅ WEBHOOK RECEBIDO!');
  console.log(JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

app.get('/api/status', (req, res) => {
  res.json({ status: '✅ Online', bot: 'Assist EMT' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Bot rodando na porta ${PORT}`));
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

app.post('/webhook/zavu', (req, res) => {
  console.log('Webhook:', req.body);
  res.json({ success: true });
});

app.get('/api/status', (req, res) => {
  res.json({ status: '✅ Online', bot: 'Assist EMT' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot rodando na porta ${PORT}`));
