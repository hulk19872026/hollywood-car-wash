import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@image_analyzer:history';
const MAX = 30;

export async function getHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addHistory(entry) {
  try {
    const list = await getHistory();
    const next = [
      { ...entry, savedAt: Date.now() },
      ...list,
    ].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export async function clearHistory() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
