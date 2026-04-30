/**
 * API client for the Hollywood Oil Change inspection flow.
 *
 * Mirrors the request shape used by the public web page (backend/public/index.html):
 *   POST /analyze     multipart, images[] (5 files)        → { id, description, text, objects[] }
 *   POST /send-email  multipart, images[], technicianName, → { sentTo, attachmentCount }
 *                     submittedAt, description, text,
 *                     objects (JSON), historyId
 */
import axios from 'axios';
import Constants from 'expo-constants';

const FALLBACK = 'http://localhost:3000';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  Constants.manifest?.extra?.apiBaseUrl ||
  FALLBACK;

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
});

function buildPart(asset, idx) {
  const uri = asset.uri;
  const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
  const isPng = ext === 'png';
  return {
    uri,
    name: `photo${idx + 1}.${isPng ? 'png' : 'jpg'}`,
    type: isPng ? 'image/png' : 'image/jpeg',
  };
}

function errorFromAxios(err) {
  const data = err?.response?.data;
  const detail = data?.detail || data?.error;
  if (detail) return new Error(detail);
  return err;
}

export async function analyze(assets) {
  const fd = new FormData();
  assets.forEach((a, i) => fd.append('images', buildPart(a, i)));
  try {
    const { data } = await client.post('/analyze', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } catch (err) {
    throw errorFromAxios(err);
  }
}

export async function sendReport({
  photos,
  technicianName,
  submittedAt,
  description,
  text,
  objects,
  historyId,
}) {
  const fd = new FormData();
  fd.append('technicianName', technicianName);
  fd.append('submittedAt', submittedAt);
  fd.append('description', description || '');
  fd.append('text', text || '');
  fd.append('objects', JSON.stringify(objects || []));
  if (historyId) fd.append('historyId', historyId);
  photos.forEach((a, i) => fd.append('images', buildPart(a, i)));
  try {
    const { data } = await client.post('/send-email', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      recipient: data.sentTo || 'david@hulkautomation.com',
      attachmentCount: data.attachmentCount,
    };
  } catch (err) {
    throw errorFromAxios(err);
  }
}

export async function ping() {
  const { data } = await client.get('/health');
  return data;
}

export default client;
