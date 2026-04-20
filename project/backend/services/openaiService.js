/**
 * OpenAI Vision service.
 * Sends the image (base64) to the Chat Completions API with a vision-capable
 * model and asks for a strict JSON response containing:
 *   { description: string, text: string, objects: string[] }
 */
const fs = require('fs');
const axios = require('axios');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

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

async function analyzeImage(filePath, mimeType = 'image/jpeg') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const payload = {
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this image and return JSON as instructed.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    max_tokens: 800,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  };

  const { data } = await axios.post(OPENAI_URL, payload, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 60_000,
  });

  const raw = data?.choices?.[0]?.message?.content || '';
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
