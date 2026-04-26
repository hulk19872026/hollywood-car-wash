/**
 * Render a Hollywood Oil Change inspection report as a single PDF.
 *
 * Layout (US Letter, 40pt margin):
 *   - Page 1: brand title, technician + timestamp metadata, description,
 *             extracted OCR text, detected objects list.
 *   - Pages 2-6: one labeled photo per page, sized to fit the usable area.
 *
 * Returns a Buffer suitable for attaching to email.
 */
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Hollywood Oil Change brand palette — kept here so the PDF doesn't need
// to import anything from the email module.
const COLOR_BRAND_YELLOW = '#FFD700';
const COLOR_BRAND_RED    = '#DC2626';
const COLOR_TEXT         = '#0A0A0A';
const COLOR_MUTED        = '#555555';
const COLOR_BORDER       = '#E5E5E5';
const COLOR_CODE_BG      = '#F4F4F4';

const PHOTO_LABELS = [
  'Registration',
  'Mileage on Dashboard',
  'Engine',
  'Undercarriage',
  'Rear Plate',
];

function sectionHeading(doc, label) {
  doc.fillColor(COLOR_BRAND_YELLOW).font('Helvetica-Bold').fontSize(11)
    .text(label.toUpperCase(), { characterSpacing: 1.5 });
  doc.moveDown(0.3);
}

function ruler(doc) {
  const x1 = doc.page.margins.left;
  const x2 = doc.page.width - doc.page.margins.right;
  const y = doc.y;
  doc.strokeColor(COLOR_BORDER).lineWidth(0.5).moveTo(x1, y).lineTo(x2, y).stroke();
  doc.moveDown(0.6);
}

/**
 * @param {object} opts
 * @param {string} [opts.technicianName]
 * @param {string} [opts.submittedAt]
 * @param {string} [opts.description]
 * @param {string} [opts.text]
 * @param {string[]} [opts.objects]
 * @param {Array<{path: string, mimetype?: string}>} [opts.images]
 * @returns {Promise<Buffer>}
 */
function buildInspectionPdf(opts) {
  const {
    technicianName = '',
    submittedAt = new Date().toLocaleString(),
    description = '',
    text = '',
    objects = [],
    images = [],
  } = opts || {};

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ---- Cover / info page ----------------------------------------------
    doc.fillColor(COLOR_BRAND_YELLOW).font('Helvetica-Bold').fontSize(28)
      .text('HOLLYWOOD OIL CHANGE', { characterSpacing: 1 });
    doc.fillColor(COLOR_BRAND_RED).font('Helvetica-Bold').fontSize(13)
      .text('INSPECTION REPORT', { characterSpacing: 2 });
    doc.moveDown(0.8);
    ruler(doc);

    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(10);
    if (technicianName) {
      doc.text('TECHNICIAN', { characterSpacing: 1.5 });
      doc.fillColor(COLOR_TEXT).font('Helvetica-Bold').fontSize(13)
        .text(technicianName);
      doc.moveDown(0.4);
    }
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(10)
      .text('SUBMITTED', { characterSpacing: 1.5 });
    doc.fillColor(COLOR_TEXT).font('Helvetica-Bold').fontSize(13)
      .text(submittedAt);
    doc.moveDown(0.8);
    ruler(doc);

    sectionHeading(doc, 'Description');
    doc.fillColor(COLOR_TEXT).font('Helvetica').fontSize(11)
      .text(description || '(none)', { lineGap: 2 });
    doc.moveDown(0.8);

    sectionHeading(doc, 'Extracted Text');
    if (text) {
      const startY = doc.y;
      // Save current position; render code-style block with pad + bg.
      const padX = 8, padY = 6;
      const blockX = doc.page.margins.left;
      const blockW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      // Measure text height to size the rectangle.
      doc.font('Courier').fontSize(10);
      const textH = doc.heightOfString(text, { width: blockW - padX * 2 });
      doc.fillColor(COLOR_CODE_BG).rect(blockX, startY - 2, blockW, textH + padY * 2).fill();
      doc.fillColor(COLOR_TEXT).text(text, blockX + padX, startY + padY - 2, {
        width: blockW - padX * 2,
        lineGap: 1,
      });
      doc.y = startY + textH + padY * 2 + 4;
    } else {
      doc.fillColor(COLOR_MUTED).font('Helvetica-Oblique').fontSize(11)
        .text('No text detected.');
    }
    doc.moveDown(0.8);

    sectionHeading(doc, 'Detected Objects');
    if (objects.length === 0) {
      doc.fillColor(COLOR_MUTED).font('Helvetica-Oblique').fontSize(11)
        .text('No objects detected.');
    } else {
      doc.fillColor(COLOR_TEXT).font('Helvetica').fontSize(11)
        .list(objects, { bulletRadius: 2, textIndent: 14, lineGap: 2 });
    }

    // ---- Photo pages ----------------------------------------------------
    images.forEach((img, i) => {
      doc.addPage();
      const labelName = PHOTO_LABELS[i] || `Photo ${i + 1}`;

      doc.fillColor(COLOR_BRAND_YELLOW).font('Helvetica-Bold').fontSize(20)
        .text(`PHOTO ${i + 1}`, { characterSpacing: 1 });
      doc.fillColor(COLOR_TEXT).font('Helvetica-Bold').fontSize(15)
        .text(labelName.toUpperCase(), { characterSpacing: 1 });
      doc.moveDown(0.4);
      ruler(doc);

      // Embed the photo. PDFKit supports JPEG and PNG; HEIC won't work, but
      // the client downscales+re-encodes everything to JPEG before upload,
      // so we shouldn't see HEIC here.
      try {
        const buffer = fs.readFileSync(img.path);
        const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const usableH = doc.page.height - doc.y - doc.page.margins.bottom;
        doc.image(buffer, doc.page.margins.left, doc.y, {
          fit: [usableW, usableH],
          align: 'center',
          valign: 'center',
        });
      } catch (err) {
        doc.fillColor(COLOR_BRAND_RED).font('Helvetica-Oblique').fontSize(12)
          .text(`(unable to embed image: ${err.message})`);
      }
    });

    doc.end();
  });
}

function pdfFilename({ technicianName = '', submittedAt = '' } = {}) {
  const date = new Date().toISOString().slice(0, 10);
  const techSlug = (technicianName || 'unknown')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
  return `Hollywood-Oil-Change-Inspection-${date}-${techSlug}.pdf`;
}

module.exports = { buildInspectionPdf, pdfFilename };
