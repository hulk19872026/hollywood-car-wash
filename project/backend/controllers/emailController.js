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
function unlinkSafe(p) {
  if (p && fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch { /* noop */ }
  }
}

async function sendEmail(req, res, next) {
  const uploadedPaths = Array.isArray(req.files) ? req.files.map((f) => f.path) : [];
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
      uploadedPaths.forEach(unlinkSafe);
      return res.status(400).json({ error: 'Valid "email" is required' });
    }

    // Prefer freshly-uploaded files (most reliable — Railway's filesystem and
    // in-memory historyStore are ephemeral, so an old historyId may point at
    // nothing). Fall back to the stored history paths for the resend-from-
    // history flow.
    let images = [];
    if (Array.isArray(req.files) && req.files.length) {
      images = req.files.map((f) => ({ path: f.path, mimetype: f.mimetype }));
    } else if (body.historyId) {
      const rec = historyStore.get(body.historyId);
      if (rec?.imagePaths?.length) {
        images = rec.imagePaths
          .filter((p) => fs.existsSync(p))
          .map((p) => ({ path: p }));
      }
    }

    const result = await sendResultsEmail({
      to: email,
      description,
      text,
      objects,
      images,
    });

    res.json({
      success: true,
      messageId: result.messageId,
      sentTo: email,
      attachmentCount: images.length,
    });
  } catch (err) {
    next(err);
  } finally {
    // Always clean up the per-request uploads. Files referenced via historyId
    // are owned by historyStore and intentionally left in place.
    uploadedPaths.forEach(unlinkSafe);
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

    const images = (rec.imagePaths || [])
      .filter((p) => fs.existsSync(p))
      .map((p) => ({ path: p }));

    const result = await sendResultsEmail({
      to: email,
      description: rec.description,
      text: rec.text,
      objects: rec.objects,
      images,
    });

    res.json({ success: true, messageId: result.messageId, sentTo: email, id });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendEmail, resend };
