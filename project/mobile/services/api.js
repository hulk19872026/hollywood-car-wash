/**
 * API client.
 *
 * The base URL is read from Expo config (`app.json` → `expo.extra.apiBaseUrl`).
 * You can also override at runtime by setting the `EXPO_PUBLIC_API_BASE_URL`
 * environment variable when starting Expo (e.g. in EAS or a `.env` file).
 */
import axios from 'axios';
import Constants from 'expo-constants';

const FALLBACK_URL = 'http://localhost:3000';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  Constants.manifest?.extra?.apiBaseUrl ||
  FALLBACK_URL;

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90_000,
});

/**
 * Upload an image for analysis.
 * @param {string} imageUri — local file URI from expo-image-picker
 * @returns {Promise<{id:string,description:string,text:string,objects:string[],timestamp:number}>}
 */
export async function analyzeImage(imageUri) {
  const formData = new FormData();
  // React Native's FormData accepts { uri, name, type } objects
  formData.append('image', {
    uri: imageUri,
    name: `photo-${Date.now()}.jpg`,
    type: 'image/jpeg',
  });

  const { data } = await client.post('/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Send results via email.
 * If `historyId` is provided, the server will attach the originally analyzed image.
 */
export async function sendEmail({ email, description, text, objects, historyId }) {
  const { data } = await client.post(
    '/send-email',
    { email, description, text, objects, historyId },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return data;
}

/** Re-send a previous scan by id. */
export async function resendEmail(id, email) {
  const { data } = await client.post(`/history/${id}/resend`, { email });
  return data;
}

/** Fetch history from the server (optional — the app also keeps local history). */
export async function fetchHistory() {
  const { data } = await client.get('/history');
  return data.items || [];
}

/** Simple health check. */
export async function ping() {
  const { data } = await client.get('/health');
  return data;
}

export default client;
