const fs = require('fs');
const { sendResultsEmail } = require('../services/emailService');
const historyStore = require('../services/historyStore');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Inspection reports always go to David. Override via env var if needed.
const REPORT_RECIPIENT = process.env.REPORT_RECIPIENT || 'david@hulkautomation.com';

/**
 * Submit an inspection report.
 *
 * Accepts multipart/form-data (preferred — includes the 4 photos inline) or
 * application/json (which falls back to the historyId lookup for images).
 *
 * Required body fields:
 *   - technicianName (string, non-empty)
 *
 * Optional:
 *   - description, text, objects (the analysis result fields)
 *   - historyId (used to look up stored photos if none are uploaded)
 *
 * The recipient is fixed (REPORT_RECIPIENT) — no email field is read from
 * the request.
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
    const technicianName = (body.technicianName || '').trim();
    const description = (body.description || '').trim();
    const text = (body.text || '').trim();

    let objects = body.objects;
    if (typeof objects === 'string') {
      try { objects = JSON.parse(objects); } catch { objects = objects.split(',').map((s) => s.trim()).filter(Boolean); }
    }
    if (!Array.isArray(objects)) objects = [];

    if (!technicianName) {
      uploadedPaths.forEach(unlinkSafe);
      return res.status(400).json({ error: 'Technician name is required' });
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
      to: REPORT_RECIPIENT,
      technicianName,
      description,
      text,
      objects,
      images,
    });

    res.json({
      success: true,
      messageId: result.messageId,
      sentTo: REPORT_RECIPIENT,
      attachmentCount: images.length,
    });
  } catch (err) {
    next(err);
  } finally {
    uploadedPaths.forEach(unlinkSafe);
  }
}

/** Re-send a previous scan from history (admin / API use). */
async function resend(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const to = (body.email || '').trim() || REPORT_RECIPIENT;
    const technicianName = (body.technicianName || '').trim() || 'Resend';

    if (!EMAIL_RE.test(to)) {
      return res.status(400).json({ error: 'Valid "email" is required' });
    }

    const rec = historyStore.get(id);
    if (!rec) return res.status(404).json({ error: 'History entry not found' });

    const images = (rec.imagePaths || [])
      .filter((p) => fs.existsSync(p))
      .map((p) => ({ path: p }));

    const result = await sendResultsEmail({
      to,
      technicianName,
      description: rec.description,
      text: rec.text,
      objects: rec.objects,
      images,
    });

    res.json({ success: true, messageId: result.messageId, sentTo: to, id });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendEmail, resend };
