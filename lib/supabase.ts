import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, PurchaseLog, migrateLegacySettings, ensureInventoryItems } from '../constants/defaults';

const SUPABASE_URL = 'https://spfdvwcgvaaqfwxfyicc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwZmR2d2NndmFhcWZ3eGZ5aWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTE0NDksImV4cCI6MjA5MTIyNzQ0OX0.aPDpCV0EBFCD-pARx0ECFJ32Uh1-nODdS0HZVcbqnp8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// ── サーバーへ同期 ───────────────────────────────────────────
export async function syncToServer(userId: string, state: AppState, expoToken?: string): Promise<void> {
  const payload: Record<string, unknown> = {
    settings:     state.settings,
    inventory:    state.inventory,
    purchaseLogs: state.purchaseLogs,
  };
  if (expoToken) payload.expo_token = expoToken;

  await supabase
    .from('stock_bancho_users')
    .upsert({ user_id: userId, data: payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

// ── サーバーから取得 ─────────────────────────────────────────
export async function syncFromServer(userId: string, localState: AppState): Promise<AppState | null> {
  const { data, error } = await supabase
    .from('stock_bancho_users')
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error || !data?.data) return null;

  const raw = data.data as Record<string, unknown>;
  if (!raw.inventory || !raw.settings) return null;

  // 旧フォーマット対応：サーバーデータをマイグレーション
  const serverSettings = migrateLegacySettings(raw.settings);
  const rawInv = raw.inventory as Record<string, { count: number; updatedAt?: string | null }>;
  const serverInv: Record<string, { count: number; updatedAt: string | null }> = {};
  for (const [k, v] of Object.entries(rawInv)) {
    serverInv[k] = { count: v.count ?? 0, updatedAt: v.updatedAt ?? null };
  }
  const serverInventory = ensureInventoryItems(serverInv, serverSettings.items);

  // 最終更新日時で新しい方を採用
  const serverLatest = Object.values(serverInventory)
    .map(v => (v.updatedAt ? new Date(v.updatedAt).getTime() : 0))
    .reduce((a, b) => Math.max(a, b), 0);
  const localLatest = Object.values(localState.inventory)
    .map(v => (v.updatedAt ? new Date(v.updatedAt).getTime() : 0))
    .reduce((a, b) => Math.max(a, b), 0);

  if (serverLatest <= localLatest) return null;

  // purchaseLogs マージ
  const serverLogs = (raw.purchaseLogs as PurchaseLog[]) ?? [];
  const localLogs  = localState.purchaseLogs;
  const byDate = new Map<string, PurchaseLog>();
  [...serverLogs, ...localLogs].forEach(log => {
    const prev = byDate.get(log.date);
    if (!prev) { byDate.set(log.date, log); return; }
    const prevHas = Object.values(prev.purchased  ?? {}).some(p => p.count > 0);
    const curHas  = Object.values(log.purchased ?? {}).some(p => p.count > 0);
    if (!prevHas && curHas) byDate.set(log.date, log);
  });
  const mergedLogs = [...byDate.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  return { settings: serverSettings, inventory: serverInventory, purchaseLogs: mergedLogs };
}
