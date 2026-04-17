import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, DEFAULT_SETTINGS, DEFAULT_INVENTORY } from '../constants/defaults';

const STORAGE_KEY = 'stockBancho_v1';
const USER_ID_KEY = 'stockBancho_userId';

function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        settings:     deepCopy(DEFAULT_SETTINGS),
        inventory:    deepCopy(DEFAULT_INVENTORY),
        purchaseLogs: [],
      };
    }
    const data = JSON.parse(raw);
    return {
      settings:     data.settings     ?? deepCopy(DEFAULT_SETTINGS),
      inventory:    data.inventory    ?? deepCopy(DEFAULT_INVENTORY),
      purchaseLogs: data.purchaseLogs ?? [],
    };
  } catch {
    return {
      settings:     deepCopy(DEFAULT_SETTINGS),
      inventory:    deepCopy(DEFAULT_INVENTORY),
      purchaseLogs: [],
    };
  }
}

export async function saveState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── ユーザーID（UUIDをデバイスに保存） ──────────────────────
export async function getUserId(): Promise<string> {
  let id = await AsyncStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = generateUUID();
    await AsyncStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
