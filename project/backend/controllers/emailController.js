const fs = require('fs');
const { sendResultsEmail } = require('../services/emailService');
const historyStore = require('../services/historyStore');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Two supported modes:
 *
 *  A) multipart/form-data with fields:
 *       images[] (files, optional), email, description, text,
 *       objects (JSON string or repeated field)
 *
 *  B) application/json with:
 *       { email, description, text, objects, historyId? }
 *     If historyId is given, the stored images for that scan will be attached.
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

    // Figure out which images to attach
    let imagePaths = [];
    if (Array.isArray(req.files) && req.files.length) {
      imagePaths = req.files.map((f) => f.path);
    } else if (body.historyId) {
      const rec = historyStore.get(body.historyId);
      if (rec?.imagePaths?.length) {
        imagePaths = rec.imagePaths.filter((p) => fs.existsSync(p));
      }
    }

    const result = await sendResultsEmail({
      to: email,
      description,
      text,
      objects,
      imagePaths,
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

    const imagePaths = (rec.imagePaths || []).filter((p) => fs.existsSync(p));

    const result = await sendResultsEmail({
      to: email,
      description: rec.description,
      text: rec.text,
      objects: rec.objects,
      imagePaths,
    });

    res.json({ success: true, messageId: result.messageId, sentTo: email, id });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendEmail, resend };
