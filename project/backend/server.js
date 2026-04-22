/**
 * Image Analysis API — Railway-ready Express server
 *
 * Endpoints:
 *   GET  /health        — health check
 *   POST /analyze       — analyze an uploaded image (multipart/form-data: "image")
 *   POST /send-email    — send analysis results via email
 *   GET  /history       — in-memory scan history
 *   POST /history/:id/resend — re-send a previous scan by id
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');

const analyzeRoutes = require('./routes/analyze');
const emailRoutes = require('./routes/email');
const historyRoutes = require('./routes/history');

const app = express();

console.log('[startup] NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('[startup] cwd:', process.cwd());
console.log('[startup] entry:', __filename);

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const API_INFO = {
  name: 'Image Analysis API',
  version: '1.0.0',
  endpoints: ['/health', 'POST /analyze', 'POST /send-email', 'GET /history', 'POST /history/:id/resend'],
};

function landingHtml() {
  const rows = API_INFO.endpoints
    .map((e) => `<li><code>${e}</code></li>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${API_INFO.name}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    background: linear-gradient(135deg, #4f46e5, #9333ea);
    color: #fff; display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .card {
    max-width: 640px; width: 100%;
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 16px; padding: 36px 40px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  }
  h1 { margin: 0 0 6px; font-size: 26px; display: flex; align-items: center; gap: 10px; }
  .status { display:inline-flex; align-items:center; gap:8px; font-size: 13px; opacity: .9; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background:#22c55e; box-shadow:0 0 10px #22c55e; }
  p { margin: 14px 0 24px; opacity: .92; line-height: 1.55; }
  h2 { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; margin: 0 0 10px; opacity: .8; }
  ul { list-style: none; padding: 0; margin: 0 0 22px; }
  li { padding: 10px 14px; background: rgba(0,0,0,0.25); border-radius: 8px; margin-bottom: 8px; font-size: 14px; }
  code { font-family: SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }
  .meta { font-size: 12px; opacity: .7; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 14px; }
  a { color: #fff; }
</style>
</head>
<body>
  <main class="card">
    <h1>📸 ${API_INFO.name}</h1>
    <div class="status"><span class="dot"></span> Service online · v${API_INFO.version}</div>
    <p>This is a REST API used by the companion mobile app. Use the endpoints below to analyze images and email the results.</p>
    <h2>Endpoints</h2>
    <ul>${rows}</ul>
    <div class="meta">Health: <a href="/health">/health</a> · JSON: <a href="/?format=json">/?format=json</a></div>
  </main>
</body>
</html>`;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'image-analysis-api', timestamp: Date.now() });
});

app.get('/', (req, res) => {
  const wantsJson = req.query.format === 'json' || (req.accepts(['html', 'json']) === 'json');
  if (wantsJson) return res.json(API_INFO);
  res.type('html').send(landingHtml());
});

// --- Routes ---
app.use('/analyze', analyzeRoutes);
app.use('/send-email', emailRoutes);
app.use('/history', historyRoutes);

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// --- Central error handler ---
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[startup] Server listening on 0.0.0.0:${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('SIGTERM', () => {
  console.log('[shutdown] SIGTERM received, closing server');
  server.close(() => process.exit(0));
});
