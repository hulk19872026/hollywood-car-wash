const fs = require('fs');
const { analyzeImage } = require('../services/openaiService');
const historyStore = require('../services/historyStore');

const REQUIRED_PHOTO_COUNT = 4;

function unlinkSafe(p) {
  if (p && fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch { /* noop */ }
  }
}

async function analyze(req, res, next) {
  const files = Array.isArray(req.files) ? req.files : [];
  try {
    if (files.length !== REQUIRED_PHOTO_COUNT) {
      // Cleanup partial uploads then reject
      files.forEach((f) => unlinkSafe(f.path));
      return res.status(400).json({
        error: `Exactly ${REQUIRED_PHOTO_COUNT} images are required (field name "images"). Received ${files.length}.`,
      });
    }

    const result = await analyzeImage(
      files.map((f) => ({ filePath: f.path, mimeType: f.mimetype }))
    );

    const record = historyStore.add({
      description: result.description,
      text: result.text,
      objects: result.objects,
      imagePaths: files.map((f) => f.path),
    });

    res.json({
      id: record.id,
      timestamp: record.timestamp,
      ...result,
    });
  } catch (err) {
    files.forEach((f) => unlinkSafe(f.path));
    if (err.response?.data?.error) {
      return res.status(502).json({
        error: 'Upstream API error',
        detail: err.response.data.error.message || err.response.data.error,
      });
    }
    next(err);
  }
}

module.exports = { analyze };
