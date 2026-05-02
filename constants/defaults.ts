import { ItemDef, DEFAULT_ITEMS } from './items';

// ── 在庫アイテム ──────────────────────────────────────────────
export interface InventoryItem {
  count: number;
  updatedAt: string | null;
}

// 動的ID対応：Record<itemId, InventoryItem>
export type Inventory = Record<string, InventoryItem>;

// ── 設定 ───────────────────────────────────────────────────────
export interface Settings {
  items: ItemDef[];
  shoppingDays: number[];   // 0=日 … 6=土
  notifyHour: number;
  notifyMinute: number;
}

// ── 購入ログ ──────────────────────────────────────────────────
export interface PurchasedItem {
  count: number;
  unit: string;
}

export interface PurchaseLog {
  date: string;             // 'YYYY-MM-DD'
  wentShopping: boolean;
  purchased: Record<string, PurchasedItem>;  // キー=item.id
  memo: string;
}

// ── アプリ状態 ────────────────────────────────────────────────
export interface AppState {
  settings: Settings;
  inventory: Inventory;
  purchaseLogs: PurchaseLog[];
}

// ── デフォルト値 ──────────────────────────────────────────────
export const DEFAULT_SETTINGS: Settings = {
  items: DEFAULT_ITEMS,
  shoppingDays: [1, 4],
  notifyHour: 20,
  notifyMinute: 0,
};

export function buildDefaultInventory(items: ItemDef[]): Inventory {
  const inv: Inventory = {};
  for (const item of items) {
    inv[item.id] = { count: 0, updatedAt: null };
  }
  return inv;
}

// 新しい品目のエントリを追加（既存は維持）
export function ensureInventoryItems(inventory: Inventory, items: ItemDef[]): Inventory {
  const result = { ...inventory };
  for (const item of items) {
    if (result[item.id] === undefined) {
      result[item.id] = { count: 0, updatedAt: null };
    }
  }
  return result;
}

// ── 旧フォーマット → 新フォーマット マイグレーション ──────────
export function migrateLegacySettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const obj = raw as Record<string, unknown>;

  // 既に新フォーマット（items配列あり）の場合はそのまま使用
  if (Array.isArray(obj.items) && obj.items.length > 0) {
    return {
      items: obj.items as ItemDef[],
      shoppingDays: Array.isArray(obj.shoppingDays) ? (obj.shoppingDays as number[]) : [1, 4],
      notifyHour: typeof obj.notifyHour === 'number' ? obj.notifyHour : 20,
      notifyMinute: typeof obj.notifyMinute === 'number' ? obj.notifyMinute : 0,
    };
  }

  // 旧フォーマット（dailyConsumption / purchaseUnit）からの変換
  const daily    = obj.dailyConsumption as Record<string, { amount: number }> | undefined;
  const purchase = obj.purchaseUnit    as Record<string, { amount: number }> | undefined;

  const items: ItemDef[] = [
    {
      id: 'egg', name: '卵', emoji: '🥚', unit: '個',
      dailyAmount:    daily?.egg?.amount    ?? 4,
      purchaseAmount: purchase?.egg?.amount ?? 10,
      purchaseUnitName: 'ケース',
      decimal: false,
    },
    {
      id: 'cheese', name: 'プロセスチーズ', emoji: '🧀', unit: '個',
      dailyAmount:    daily?.cheese?.amount    ?? 3,
      purchaseAmount: purchase?.cheese?.amount ?? 4,
      purchaseUnitName: 'スリーブ',
      decimal: false,
    },
    {
      id: 'coffee', name: 'アイスコーヒー', emoji: '☕', unit: '本',
      // 旧フォーマットはml換算（300ml/日・900ml/本）→ 本換算に変換
      dailyAmount:    daily?.coffee?.amount ? daily.coffee.amount / 900 : 0.3333,
      purchaseAmount: 1,
      purchaseUnitName: '本',
      decimal: true,
    },
  ];

  return {
    items,
    shoppingDays: Array.isArray(obj.shoppingDays) ? (obj.shoppingDays as number[]) : [1, 4],
    notifyHour:   typeof obj.notifyHour   === 'number' ? obj.notifyHour   : 20,
    notifyMinute: typeof obj.notifyMinute === 'number' ? obj.notifyMinute : 0,
  };
}

export const DEFAULT_STATE: AppState = {
  settings:     DEFAULT_SETTINGS,
  inventory:    buildDefaultInventory(DEFAULT_ITEMS),
  purchaseLogs: [],
};
