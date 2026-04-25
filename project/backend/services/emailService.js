const fs = require('fs');

// Hollywood Oil Change palette — black, yellow, red only (white permitted for body text).
const palette = {
  black: '#000000',
  surface: '#0A0A0A',
  yellow: '#FFD700',
  yellowSoft: '#FFEA70',
  red: '#FF0000',
  white: '#FFFFFF',
  whiteMuted: 'rgba(255,255,255,0.72)',
  border: 'rgba(255,215,0,0.30)',
};

const RESEND_API_URL = 'https://api.resend.com/emails';
// Resend's onboarding domain works without DNS verification but only delivers
// to the email address used to register the Resend account. For real
// production use, verify a domain in the Resend dashboard and set RESEND_FROM
// to e.g. "Hollywood Oil Change <reports@yourdomain.com>".
const DEFAULT_FROM = 'Hollywood Oil Change <onboarding@resend.dev>';

function buildHtml({ description, text, objects }) {
  const objectsHtml = (objects || []).length
    ? `<ul style="margin:0;padding-left:20px;color:${palette.white};">${objects
        .map((o) => `<li style="margin:4px 0;">${escapeHtml(o)}</li>`)
        .join('')}</ul>`
    : `<em style="color:${palette.whiteMuted};">No objects detected.</em>`;

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:${palette.black}; padding:24px;">
    <div style="max-width:640px; margin:0 auto; background:${palette.surface}; border-radius:14px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.5); border:1px solid ${palette.border};">
      <div style="background:linear-gradient(135deg,${palette.yellow},${palette.red}); color:${palette.black}; padding:28px 32px;">
        <h1 style="margin:0; font-size:22px; font-weight:800; letter-spacing:0.02em;">HOLLYWOOD OIL CHANGE — Inspection Report</h1>
        <p style="margin:6px 0 0 0; opacity:.78; font-size:13px;">Generated on ${new Date().toLocaleString()}</p>
      </div>
      <div style="padding:28px 32px;">
        <h2 style="font-size:13px; text-transform:uppercase; letter-spacing:.08em; color:${palette.yellow}; margin:0 0 8px;">Description</h2>
        <p style="margin:0 0 24px; font-size:15px; color:${palette.white}; line-height:1.55;">${escapeHtml(description) || `<em style="color:${palette.whiteMuted};">None</em>`}</p>

        <h2 style="font-size:13px; text-transform:uppercase; letter-spacing:.08em; color:${palette.yellow}; margin:0 0 8px;">Extracted Text</h2>
        <pre style="white-space:pre-wrap; background:${palette.black}; border:1px solid ${palette.border}; border-radius:8px; padding:14px; font-size:14px; color:${palette.white}; margin:0 0 24px;">${escapeHtml(text) || `<em style="color:${palette.whiteMuted};">No text detected.</em>`}</pre>

        <h2 style="font-size:13px; text-transform:uppercase; letter-spacing:.08em; color:${palette.yellow}; margin:0 0 8px;">Detected Objects</h2>
        <div style="font-size:14px; color:${palette.white};">${objectsHtml}</div>

        <hr style="border:none; border-top:1px solid ${palette.border}; margin:28px 0;" />
        <p style="font-size:12px; color:${palette.whiteMuted}; margin:0;">The four analyzed photos are attached to this email.</p>
      </div>
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extFromMime(mime) {
  if (!mime) return 'jpg';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  // Generic fallback for anything else (e.g. image/svg+xml -> svg)
  const m = /^image\/([a-z0-9.+-]+)$/i.exec(mime);
  return m ? m[1].split('+')[0] : 'jpg';
}

/**
 * Send the inspection report via the Resend HTTPS API.
 *
 * Resend goes over standard HTTPS, which is reachable from Railway
 * (unlike outbound SMTP, which Railway tends to block).
 *
 * Required env: RESEND_API_KEY
 * Optional env: RESEND_FROM (defaults to the Resend onboarding sender —
 *   only delivers to the email address used to sign up for Resend).
 *
 * @param {object} opts
 * @param {string} opts.to — recipient email
 * @param {string} opts.description
 * @param {string} opts.text
 * @param {string[]} opts.objects
 * @param {Array<{path: string, mimetype?: string}>} [opts.images] — files to attach
 */
async function sendResultsEmail({ to, description, text, objects, images }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const list = Array.isArray(images) ? images : [];
  const attachments = list.map((img, i) => {
    const mime = img.mimetype || 'image/jpeg';
    const ext = extFromMime(mime);
    return {
      filename: `photo-${i + 1}.${ext}`,
      content: fs.readFileSync(img.path).toString('base64'),
      content_type: mime,
    };
  });

  const payload = {
    from: process.env.RESEND_FROM || DEFAULT_FROM,
    to: [to],
    subject: 'Hollywood Oil Change — Inspection Report',
    html: buildHtml({ description, text, objects }),
    attachments,
  };

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.message || body?.error?.message || JSON.stringify(body);
    } catch {
      try { detail = await res.text(); } catch { /* noop */ }
    }
    throw new Error(`Resend API error: ${detail}`);
  }

  const data = await res.json();
  return { messageId: data.id };
}

module.exports = { sendResultsEmail };
