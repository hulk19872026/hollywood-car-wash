/**
 * Image analysis service.
 *
 * NOTE: filename is kept as `openaiService.js` so existing imports continue to
 * work; the implementation now uses the Anthropic Claude API (vision) instead
 * of OpenAI. Function signature, return shape, and error semantics are
 * preserved so analyzeController.js does not need to change.
 *
 * Sends the image (base64) to Claude with a vision-capable model and asks for
 * a strict JSON response containing:
 *   { description: string, text: string, objects: string[] }
 */
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';

const SYSTEM_PROMPT = `You are an image analysis assistant. For every image the user sends, respond ONLY with a valid JSON object matching EXACTLY this schema and nothing else (no markdown, no code fences, no commentary):
{
  "description": "a clear 2-4 sentence natural-language description of what is in the image",
  "text": "all readable text extracted from the image via OCR, concatenated with newlines, or empty string if none",
  "objects": ["list", "of", "distinct", "notable", "objects", "visible"]
}`;

function safeParseJson(raw) {
  if (!raw) return null;
  // strip possible ```json fences
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // fallback — extract first {...} block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

// Re-shape Anthropic SDK errors into the axios-style envelope that
// analyzeController.js inspects (`err.response.data.error.message`). This keeps
// the existing 502 branch working without touching the controller.
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

async function analyzeImage(filePath, mimeType = 'image/jpeg') {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const client = new Anthropic();

  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');

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
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 },
            },
            { type: 'text', text: 'Analyze this image and return JSON as instructed.' },
          ],
        },
      ],
    });
  } catch (err) {
    throw wrapAnthropicError(err);
  }

  // response.content is a list of ContentBlock; pull text from the first text block.
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
