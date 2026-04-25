const nodemailer = require('nodemailer');

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

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be configured');
  }

  // Allow full override via env (host/port/secure). When not provided, default
  // to Gmail on port 587 with STARTTLS — more reliable on cloud providers
  // (Railway, Render, Fly) than the legacy SMTPS port 465 used by the
  // `service: 'gmail'` shorthand, which often hits connection timeouts.
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const secure = process.env.EMAIL_SECURE
    ? process.env.EMAIL_SECURE === 'true'
    : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Generous timeouts — cloud egress to SMTP can be slow on first connect.
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
  });
}

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

/**
 * @param {object} opts
 * @param {string} opts.to — recipient email
 * @param {string} opts.description
 * @param {string} opts.text
 * @param {string[]} opts.objects
 * @param {string[]} [opts.imagePaths] — absolute paths to attach (one per photo)
 */
async function sendResultsEmail({ to, description, text, objects, imagePaths }) {
  const transporter = createTransporter();

  const paths = Array.isArray(imagePaths) ? imagePaths : [];
  const attachments = paths.map((p, i) => ({
    filename: `photo-${i + 1}.jpg`,
    path: p,
  }));

  const mailOptions = {
    from: `"Hollywood Oil Change" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Hollywood Oil Change — Inspection Report',
    html: buildHtml({ description, text, objects }),
    attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  return { messageId: info.messageId };
}

module.exports = { sendResultsEmail };
