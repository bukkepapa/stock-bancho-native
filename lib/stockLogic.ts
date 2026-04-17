import { ItemKey, DAY_NAMES } from '../constants/items';
import { Settings } from '../constants/defaults';

// ── 在庫日数計算 ─────────────────────────────────────────────
export function getStockDays(item: ItemKey, count: number, settings: Settings): number {
  if (item === 'coffee') {
    const totalMl = count * settings.purchaseUnit.coffee.amount;
    return totalMl / settings.dailyConsumption.coffee.amount;
  }
  return count / settings.dailyConsumption[item].amount;
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
  unitCount: number;
  displayCount: number;
}

export function getSuggestedPurchase(
  item: ItemKey,
  currentCount: number,
  daysUntilNextShopping: number,
  settings: Settings
): Suggestion {
  const daily    = settings.dailyConsumption[item].amount;
  const unitSize = settings.purchaseUnit[item].amount;

  const currentAmount = item === 'coffee'
    ? currentCount * unitSize
    : currentCount;

  const needed   = daily * daysUntilNextShopping;
  const shortage = needed - currentAmount;

  if (shortage <= 0) return { needed: false, unitCount: 0, displayCount: 0 };

  const unitCount   = Math.ceil(shortage / unitSize);
  const totalAmount = unitCount * unitSize;
  const displayCount = item === 'coffee' ? unitCount : totalAmount;

  return { needed: true, unitCount, displayCount };
}

export function formatSuggestionAmount(item: ItemKey, s: Suggestion): string {
  if (!s.needed) return '購入不要 ✅';
  const { unitCount, displayCount } = s;
  if (item === 'coffee') return `${unitCount}本`;
  if (item === 'egg')    return `${unitCount}ケース（${displayCount}個）`;
  if (item === 'cheese') return `${unitCount}スリーブ（${displayCount}個）`;
  return `${displayCount}個`;
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
