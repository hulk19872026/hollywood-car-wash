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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'image-analysis-api', timestamp: Date.now() });
});

app.get('/api', (_req, res) => res.json(API_INFO));

app.use(express.static(path.join(__dirname, 'public')));

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
