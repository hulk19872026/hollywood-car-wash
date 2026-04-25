/**
 * Image analysis service.
 *
 * Filename kept as `openaiService.js` for backwards-compat with existing
 * imports; implementation uses the Anthropic Claude API (vision).
 *
 * The Hollywood Oil Change app requires the user to submit four photos in a
 * single batch. analyzeImage() takes an array of files and returns a single
 * consolidated analysis:
 *   { description: string, text: string, objects: string[] }
 */
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';

const SYSTEM_PROMPT = `You are an image analysis assistant for Hollywood Oil Change, an automotive oil-change service. The user has uploaded four photos of a single vehicle in this exact order:
  1. Registration (the vehicle's registration sticker, card, or document)
  2. Mileage on the dashboard (odometer reading)
  3. Engine bay
  4. Undercarriage

Each photo also has its label and the capture timestamp burned into the top of the image.

Analyze all four photos together and respond ONLY with a valid JSON object matching EXACTLY this schema and nothing else (no markdown, no code fences, no commentary):
{
  "description": "a clear 4-8 sentence natural-language summary covering: vehicle make/model/year if identifiable from the registration, the odometer reading, visible engine-bay condition (oil leaks, belt wear, fluid levels), and any notable undercarriage observations (rust, damage, fluid leaks). Reference the photos by their labels when relevant.",
  "text": "all readable text extracted from the images via OCR (registration details, license/VIN, odometer reading, decals, fluid labels), concatenated with newlines, or empty string if none",
  "objects": ["list", "of", "distinct", "notable", "objects", "or", "components", "visible", "across", "the", "four", "photos"]
}`;

function safeParseJson(raw) {
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

function wrapAnthropicError(err) {
  if (err && err instanceof Anthropic.APIError) {
    const message =
      err.error?.error?.message ||
      err.error?.message ||
      err.message ||
      'Anthropic API error';
    const wrapped = new Error(message);
    wrapped.response = {
      status: err.status,
      data: { error: { message, type: err.error?.error?.type || err.name } },
    };
    return wrapped;
  }
  return err;
}

/**
 * @param {Array<{filePath: string, mimeType?: string}>} files — exactly 4 image files
 */
async function analyzeImage(files) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('analyzeImage requires a non-empty array of files');
  }

  const client = new Anthropic();

  const imageBlocks = files.map(({ filePath, mimeType = 'image/jpeg' }) => {
    const buffer = fs.readFileSync(filePath);
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeType,
        data: buffer.toString('base64'),
      },
    };
  });

  let response;
  try {
    response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text: `Analyze these ${files.length} photos together and return JSON as instructed.`,
            },
          ],
        },
      ],
    });
  } catch (err) {
    throw wrapAnthropicError(err);
  }

  const raw = (response.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  const parsed = safeParseJson(raw);

  if (!parsed) {
    throw new Error('Failed to parse model response as JSON');
  }

  return {
    description: String(parsed.description || '').trim(),
    text: String(parsed.text || '').trim(),
    objects: Array.isArray(parsed.objects)
      ? parsed.objects.map((o) => String(o).trim()).filter(Boolean)
      : [],
  };
}

module.exports = { analyzeImage };
