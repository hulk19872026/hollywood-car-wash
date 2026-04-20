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
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const analyzeRoutes = require('./routes/analyze');
const emailRoutes = require('./routes/email');
const historyRoutes = require('./routes/history');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// --- Health check (useful for Railway) ---
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'image-analysis-api', timestamp: Date.now() });
});

app.get('/', (_req, res) => {
  res.json({
    name: 'Image Analysis API',
    version: '1.0.0',
    endpoints: ['/health', 'POST /analyze', 'POST /send-email', 'GET /history', 'POST /history/:id/resend'],
  });
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
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
