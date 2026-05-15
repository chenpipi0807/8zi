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

// --- Create new task (排盘 + 5 parallel topic analyses) ---
app.post('/api/tasks', async (req, res) => {
  const { input, bazi_result, baziCtx, systemPrompt, topicPrompts } = req.body;

  const TOPICS = ['命格总论', '事业财运', '婚姻感情', '健康运势', '当前大运'];

  // Concurrent API calls for all 5 topics
  const topicResults = await Promise.all(TOPICS.map(async (topic) => {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `以下是当事人的命盘信息，请进行解读：\n\n${baziCtx}\n\n${topicPrompts[topic]}` }
    ];
    const response = await callDeepSeek(messages);
    return { topic, messages: [...messages, { role: 'assistant', content: response }] };
  }));

  const topics = {};
  topicResults.forEach(r => { topics[r.topic] = r.messages; });

  const db = readDB();
  const task = {
    id: db.nextId++,
    created_at: new Date().toISOString(),
    input,
    bazi_result,
    topics
  };
  db.tasks.push(task);
  writeDB(db);

  res.json({ id: task.id, topics });
});

// --- Continue conversation ---
app.post('/api/tasks/:id/chat', async (req, res) => {
  const { userMessage, topic } = req.body;
  const id = parseInt(req.params.id);

  let db = readDB();
  let task = db.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'not found' });

  // New format: topic-specific threads; old format: single messages array
  const useTopics = task.topics && topic;
  const contextMessages = useTopics ? task.topics[topic] : task.messages;
  if (!contextMessages) return res.status(400).json({ error: 'invalid topic' });

  const apiMessages = [...contextMessages, { role: 'user', content: userMessage }];
  const aiResponse = await callDeepSeek(apiMessages);

  // Re-read fresh db after API returns to avoid overwriting concurrent writes
  db = readDB();
  task = db.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'not found' });

  if (useTopics) {
    task.topics[topic].push({ role: 'user', content: userMessage });
    task.topics[topic].push({ role: 'assistant', content: aiResponse });
  } else {
    task.messages.push({ role: 'user', content: userMessage });
    task.messages.push({ role: 'assistant', content: aiResponse });
  }
  writeDB(db);

  res.json({ reply: aiResponse });
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
        max_tokens: 4000,
        thinking: { type: 'disabled' }
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
