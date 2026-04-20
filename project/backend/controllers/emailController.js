const fs = require('fs');
const { sendResultsEmail } = require('../services/emailService');
const historyStore = require('../services/historyStore');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Two supported modes:
 *
 *  A) multipart/form-data with fields:
 *       image (file, optional), email, description, text, objects (JSON string or repeated field)
 *
 *  B) application/json with:
 *       { email, description, text, objects, historyId? }
 *     If historyId is given, the stored image for that scan will be attached.
 */
async function sendEmail(req, res, next) {
  try {
    const body = req.body || {};
    const email = (body.email || '').trim();
    const description = (body.description || '').trim();
    const text = (body.text || '').trim();

    let objects = body.objects;
    if (typeof objects === 'string') {
      try { objects = JSON.parse(objects); } catch { objects = objects.split(',').map((s) => s.trim()).filter(Boolean); }
    }
    if (!Array.isArray(objects)) objects = [];

    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Valid "email" is required' });
    }

    // Figure out image path
    let imagePath = null;
    if (req.file?.path) {
      imagePath = req.file.path;
    } else if (body.historyId) {
      const rec = historyStore.get(body.historyId);
      if (rec?.imagePath && fs.existsSync(rec.imagePath)) imagePath = rec.imagePath;
    }

    const result = await sendResultsEmail({
      to: email,
      description,
      text,
      objects,
      imagePath,
    });

    res.json({
      success: true,
      messageId: result.messageId,
      sentTo: email,
    });
  } catch (err) {
    next(err);
  }
}

/** Re-send a previous scan from history */
async function resend(req, res, next) {
  try {
    const { id } = req.params;
    const email = (req.body?.email || '').trim();

    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Valid "email" is required' });
    }

    const rec = historyStore.get(id);
    if (!rec) return res.status(404).json({ error: 'History entry not found' });

    const result = await sendResultsEmail({
      to: email,
      description: rec.description,
      text: rec.text,
      objects: rec.objects,
      imagePath: rec.imagePath && fs.existsSync(rec.imagePath) ? rec.imagePath : null,
    });

    res.json({ success: true, messageId: result.messageId, sentTo: email, id });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendEmail, resend };
