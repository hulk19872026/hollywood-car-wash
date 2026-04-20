const nodemailer = require('nodemailer');

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be configured');
  }
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function buildHtml({ description, text, objects }) {
  const objectsHtml = (objects || []).length
    ? `<ul style="margin:0;padding-left:20px;">${objects
        .map((o) => `<li style="margin:4px 0;">${escapeHtml(o)}</li>`)
        .join('')}</ul>`
    : '<em style="color:#888;">No objects detected.</em>';

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#f6f8fb; padding:24px;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.06);">
      <div style="background:linear-gradient(135deg,#4f46e5,#9333ea); color:#fff; padding:28px 32px;">
        <h1 style="margin:0; font-size:22px; font-weight:700;">📸 Image Analysis Results</h1>
        <p style="margin:6px 0 0 0; opacity:.85; font-size:13px;">Generated on ${new Date().toLocaleString()}</p>
      </div>
      <div style="padding:28px 32px;">
        <h2 style="font-size:15px; text-transform:uppercase; letter-spacing:.05em; color:#4f46e5; margin:0 0 8px;">Description</h2>
        <p style="margin:0 0 24px; font-size:15px; color:#1f2937; line-height:1.55;">${escapeHtml(description) || '<em>None</em>'}</p>

        <h2 style="font-size:15px; text-transform:uppercase; letter-spacing:.05em; color:#4f46e5; margin:0 0 8px;">Extracted Text</h2>
        <pre style="white-space:pre-wrap; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:14px; font-size:14px; color:#111827; margin:0 0 24px;">${escapeHtml(text) || '<em style="color:#888;">No text detected.</em>'}</pre>

        <h2 style="font-size:15px; text-transform:uppercase; letter-spacing:.05em; color:#4f46e5; margin:0 0 8px;">Detected Objects</h2>
        <div style="font-size:14px; color:#1f2937;">${objectsHtml}</div>

        <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;" />
        <p style="font-size:12px; color:#6b7280; margin:0;">The analyzed image is attached to this email.</p>
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
 * @param {string} [opts.imagePath] — absolute path to attach
 */
async function sendResultsEmail({ to, description, text, objects, imagePath }) {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Image Analyzer" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Image Analysis Results',
    html: buildHtml({ description, text, objects }),
    attachments: imagePath
      ? [{ filename: 'analyzed-image.jpg', path: imagePath }]
      : [],
  };

  const info = await transporter.sendMail(mailOptions);
  return { messageId: info.messageId };
}

module.exports = { sendResultsEmail };
