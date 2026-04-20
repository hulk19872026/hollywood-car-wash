const fs = require('fs');
const { analyzeImage } = require('../services/openaiService');
const historyStore = require('../services/historyStore');

async function analyze(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided (field name must be "image")' });
    }

    const { path: filePath, mimetype } = req.file;
    const result = await analyzeImage(filePath, mimetype);

    // Save in history (keep the image path so we can re-send later)
    const record = historyStore.add({
      description: result.description,
      text: result.text,
      objects: result.objects,
      imagePath: filePath,
    });

    res.json({
      id: record.id,
      timestamp: record.timestamp,
      ...result,
    });
  } catch (err) {
    // Cleanup file on failure
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* noop */ }
    }
    // Surface OpenAI HTTP errors nicely
    if (err.response?.data?.error) {
      return res.status(502).json({
        error: 'OpenAI API error',
        detail: err.response.data.error.message || err.response.data.error,
      });
    }
    next(err);
  }
}

module.exports = { analyze };
