import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, PurchaseLog } from '../constants/defaults';

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

  const serverData = data.data as AppState;
  if (!serverData.inventory || !serverData.settings) return null;

  // 最終更新日時で新しい方を採用
  const serverLatest = Object.values(serverData.inventory)
    .map(v => (v.updatedAt ? new Date(v.updatedAt).getTime() : 0))
    .reduce((a, b) => Math.max(a, b), 0);
  const localLatest = Object.values(localState.inventory)
    .map(v => (v.updatedAt ? new Date(v.updatedAt).getTime() : 0))
    .reduce((a, b) => Math.max(a, b), 0);

  if (serverLatest <= localLatest) return null;

  // purchaseLogs マージ
  const serverLogs = serverData.purchaseLogs ?? [];
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

  return { settings: serverData.settings, inventory: serverData.inventory, purchaseLogs: mergedLogs };
}
