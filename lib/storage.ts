import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, DEFAULT_SETTINGS, DEFAULT_STATE, buildDefaultInventory, ensureInventoryItems, migrateLegacySettings } from '../constants/defaults';

const STORAGE_KEY    = 'stockBancho_v2';  // v2フォーマット（動的品目対応）
const STORAGE_KEY_V1 = 'stockBancho_v1'; // 旧フォーマット（読み取り専用）
const USER_ID_KEY    = 'stockBancho_userId';

function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function loadState(): Promise<AppState> {
  try {
    // v2を試す
    const rawV2 = await AsyncStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const data = JSON.parse(rawV2);
      const settings = migrateLegacySettings(data.settings);
      const inventory = ensureInventoryItems(data.inventory ?? {}, settings.items);
      return {
        settings,
        inventory,
        purchaseLogs: data.purchaseLogs ?? [],
      };
    }

    // v1フォールバック：旧フォーマットからマイグレーション
    const rawV1 = await AsyncStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const data = JSON.parse(rawV1);
      const settings = migrateLegacySettings(data.settings);
      // 旧在庫をIDベースに変換（egg/cheese/coffeeはIDが同じなのでそのまま使える）
      const legacyInv: Record<string, { count: number; updatedAt: string | null }> = {};
      const oldInv = data.inventory ?? {};
      for (const [key, val] of Object.entries(oldInv)) {
        const v = val as { count: number; updatedAt?: string | null };
        legacyInv[key] = { count: v.count ?? 0, updatedAt: v.updatedAt ?? null };
      }
      const inventory = ensureInventoryItems(legacyInv, settings.items);
      return {
        settings,
        inventory,
        purchaseLogs: data.purchaseLogs ?? [],
      };
    }

    // データなし：デフォルト値を返す
    return deepCopy(DEFAULT_STATE);
  } catch {
    return deepCopy(DEFAULT_STATE);
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
