import { ItemDef, DAY_NAMES } from '../constants/items';
import { Inventory } from '../constants/defaults';

// ── 在庫日数計算 ─────────────────────────────────────────────
export function getStockDays(item: ItemDef, count: number): number {
  if (!item.dailyAmount || item.dailyAmount <= 0) return 999;
  return count / item.dailyAmount;
}

// ── 次の買い物日 ─────────────────────────────────────────────
export function getNextShoppingInfo(shoppingDays: number[]): {
  dayIndex: number;
  daysUntil: number;
  dayName: string;
} {
  const today = new Date().getDay();
  const candidates = shoppingDays
    .map(day => ({ day, diff: (day - today + 7) % 7 }))
    .filter(x => x.diff > 0)
    .sort((a, b) => a.diff - b.diff);

  if (candidates.length > 0) {
    const { day, diff } = candidates[0];
    return { dayIndex: day, daysUntil: diff, dayName: DAY_NAMES[day] };
  }
  const firstDay = [...shoppingDays].sort((a, b) => a - b)[0];
  return { dayIndex: firstDay, daysUntil: 7, dayName: DAY_NAMES[firstDay] };
}

export function isShoppingDay(shoppingDays: number[]): boolean {
  return shoppingDays.includes(new Date().getDay());
}

// ── ステータス判定 ───────────────────────────────────────────
export type StockStatus = 'OK' | 'WARNING' | 'ALERT';

export function getStockStatus(stockDays: number, daysUntilShopping: number): StockStatus {
  if (stockDays < daysUntilShopping)        return 'ALERT';
  if (stockDays < daysUntilShopping * 1.5) return 'WARNING';
  return 'OK';
}

// ── 買い物サジェスト計算 ─────────────────────────────────────
export interface Suggestion {
  needed: boolean;
  unitCount: number;    // 購入単位の数
  displayCount: number; // 表示用の数量（unit換算）
}

export function getSuggestedPurchase(
  item: ItemDef,
  currentCount: number,
  daysUntilNextShopping: number,
): Suggestion {
  const needed    = item.dailyAmount * daysUntilNextShopping;
  const shortage  = needed - currentCount;

  if (shortage <= 0) return { needed: false, unitCount: 0, displayCount: 0 };

  const unitCount    = Math.ceil(shortage / item.purchaseAmount);
  const displayCount = unitCount * item.purchaseAmount;

  return { needed: true, unitCount, displayCount };
}

export function formatSuggestionAmount(item: ItemDef, s: Suggestion): string {
  if (!s.needed) return '購入不要 ✅';
  const { unitCount, displayCount } = s;
  if (item.purchaseUnitName && item.purchaseUnitName !== item.unit) {
    return `${unitCount}${item.purchaseUnitName}（${displayCount}${item.unit}）`;
  }
  return `${displayCount}${item.unit}`;
}

// ── アラート品目名リスト（通知用） ────────────────────────────
export function getAlertItemNames(
  items: ItemDef[],
  inventory: Inventory,
  daysUntil: number,
): string[] {
  return items
    .filter(item => {
      const count     = inventory[item.id]?.count ?? 0;
      const stockDays = getStockDays(item, count);
      return getStockStatus(stockDays, daysUntil) === 'ALERT';
    })
    .map(item => item.name);
}

// ── 日付フォーマット ─────────────────────────────────────────
export function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  const d  = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}
