/* 梦境手记 · 本地/自建服务器
 * 零依赖：提供静态文件服务 + /api/chat 安全代理（密钥只存在于服务器环境变量中）。
 * 运行：node server.js   （需要 Node.js 18+）
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

/* 手动读取 .env（避免依赖 dotenv） */
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
} catch (e) { /* 忽略 .env 读取失败 */ }

const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const PORT = Number(process.env.PORT || 3000);
const API_URL = 'https://api.deepseek.com/chat/completions';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

async function handleChat(req, res) {
  if (!API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: '服务器未配置 DEEPSEEK_API_KEY，请查看 README 完成配置。' } }));
    return;
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let body;
  try { body = JSON.parse(raw || '{}'); } catch (e) { body = {}; }
  const { messages = [], stream = true, temperature = 0.9, max_tokens = 4096 } = body;

  let upstream;
  try {
    upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages, stream, temperature, max_tokens }),
    });
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: '无法连接 AI 服务：' + err.message } }));
    return;
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    res.end(text);
    return;
  }

  if (!stream) {
    const json = await upstream.json();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(json));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/chat' && req.method === 'POST') {
    await handleChat(req, res);
    return;
  }
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, keyConfigured: Boolean(API_KEY) }));
    return;
  }

  /* 静态文件 */
  let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`梦境手记已启动：http://localhost:${PORT}`);
  console.log(API_KEY ? 'API 密钥已配置 ✓' : '⚠ 未检测到 DEEPSEEK_API_KEY，AI 解读暂不可用');
});
