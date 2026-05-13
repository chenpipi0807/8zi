require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- JSON file store ---
const DB_FILE = path.join(__dirname, 'data.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) return { tasks: [], nextId: 1 };
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { tasks: [], nextId: 1 }; }
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// --- List all tasks ---
app.get('/api/tasks', (req, res) => {
  const db = readDB();
  const summary = db.tasks.map(t => ({ id: t.id, created_at: t.created_at, input: t.input }));
  res.json(summary.reverse());
});

// --- Get single task ---
app.get('/api/tasks/:id', (req, res) => {
  const db = readDB();
  const task = db.tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'not found' });
  res.json(task);
});

// --- Create new task (排盘 + first AI call) ---
app.post('/api/tasks', async (req, res) => {
  const { input, bazi_result, messages } = req.body;
  const aiResponse = await callDeepSeek(messages);
  const fullMessages = [...messages, { role: 'assistant', content: aiResponse }];

  const db = readDB();
  const task = {
    id: db.nextId++,
    created_at: new Date().toISOString(),
    input,
    bazi_result,
    messages: fullMessages
  };
  db.tasks.push(task);
  writeDB(db);

  res.json({ id: task.id, messages: fullMessages });
});

// --- Continue conversation ---
app.post('/api/tasks/:id/chat', async (req, res) => {
  const { userMessage } = req.body;
  const db = readDB();
  const task = db.tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'not found' });

  task.messages.push({ role: 'user', content: userMessage });
  const aiResponse = await callDeepSeek(task.messages);
  task.messages.push({ role: 'assistant', content: aiResponse });
  writeDB(db);

  res.json({ reply: aiResponse, messages: task.messages });
});

async function callDeepSeek(messages) {
  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages,
        temperature: 0.8,
        max_tokens: 4000
      })
    });
    const json = await resp.json();
    return json.choices?.[0]?.message?.content || '未获得有效回复';
  } catch (e) {
    return '请求失败：' + e.message;
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`八字排盘已启动: http://localhost:${PORT}`);
  console.log(`局域网: http://<本机IP>:${PORT}`);
});
