import { useCallback, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ItemDef } from '../../constants/items';
import { AppState, PurchaseLog } from '../../constants/defaults';
import { getStockDays, getStockStatus, getNextShoppingInfo, getAlertItemNames, todayString } from '../../lib/stockLogic';
import { loadState, saveState, getUserId } from '../../lib/storage';
import { syncToServer } from '../../lib/supabase';
import { scheduleStockNotification } from '../../lib/notifications';

export default function UpdateScreen() {
  const router = useRouter();
  const [appState,  setAppState]  = useState<AppState | null>(null);
  const [counts,    setCounts]    = useState<Record<string, number>>({});
  const [purchased, setPurchased] = useState<Record<string, number>>({});
  const [memo,      setMemo]      = useState('');
  const [saved,     setSaved]     = useState(false);
  const userIdRef = useRef('');

  useFocusEffect(
    useCallback(() => {
      setSaved(false);
      (async () => {
        userIdRef.current = await getUserId();
        const state = await loadState();
        setAppState(state);

        // 在庫カウントを品目IDキーで初期化
        const initCounts: Record<string, number> = {};
        const initPurchased: Record<string, number> = {};
        for (const item of state.settings.items) {
          initCounts[item.id]    = state.inventory[item.id]?.count ?? 0;
          initPurchased[item.id] = 0;
        }
        setCounts(initCounts);
        setPurchased(initPurchased);

        // 今日のメモを復元
        const todayLog = state.purchaseLogs.find(l => l.date === todayString());
        setMemo(todayLog?.memo ?? '');
      })();
    }, [])
  );

  if (!appState) {
    return <View style={s.loading}><Text>読み込み中...</Text></View>;
  }

  const { settings } = appState;
  const { daysUntil } = getNextShoppingInfo(settings.shoppingDays);

  const changeCount = (item: ItemDef, delta: number) => {
    const step = item.decimal ? 0.1 : 1;
    setCounts(prev => {
      const raw    = (prev[item.id] ?? 0) + delta * step;
      const newVal = Math.max(0, Math.round(raw * 10) / 10);
      return { ...prev, [item.id]: newVal };
    });
  };

  const changePurchased = (item: ItemDef, delta: number) => {
    const step = item.decimal ? 0.1 : 1;
    setPurchased(prev => {
      const raw    = (prev[item.id] ?? 0) + delta * step;
      const newVal = Math.max(0, Math.round(raw * 10) / 10);
      return { ...prev, [item.id]: newVal };
    });
  };

  const handleSave = async () => {
    const now   = new Date().toISOString();
    const today = todayString();

    // 在庫更新
    const newInventory = { ...appState.inventory };
    for (const item of settings.items) {
      newInventory[item.id] = {
        count:     counts[item.id] ?? 0,
        updatedAt: now,
      };
    }

    // 購入ログ
    const wentShopping = settings.items.some(item => (purchased[item.id] ?? 0) > 0);
    const purchasedLog: Record<string, { count: number; unit: string }> = {};
    for (const item of settings.items) {
      purchasedLog[item.id] = { count: purchased[item.id] ?? 0, unit: item.unit };
    }

    const logEntry: PurchaseLog = {
      date: today,
      wentShopping,
      memo,
      purchased: purchasedLog,
    };

    const newLogs = [logEntry, ...appState.purchaseLogs.filter(l => l.date !== today)].slice(0, 30);
    const newState: AppState = { ...appState, inventory: newInventory, purchaseLogs: newLogs };

    await saveState(newState);
    setAppState(newState);
    setSaved(true);

    // Supabase同期（バックグラウンド）
    syncToServer(userIdRef.current, newState);

    // 通知を最新の在庫状況で再スケジュール
    const alertNames = getAlertItemNames(settings.items, newInventory, daysUntil);
    scheduleStockNotification(settings.notifyHour, settings.notifyMinute, alertNames);

    // 少し待ってからホームへ
    setTimeout(() => router.push('/'), 800);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll}>
        {settings.items.map((item: ItemDef) => {
          const count     = counts[item.id] ?? 0;
          const stockDays = getStockDays(item, count);
          const status    = getStockStatus(stockDays, daysUntil);
          const daysColor = { OK: COLORS.primaryMid, WARNING: COLORS.warnText, ALERT: COLORS.alertText }[status];

          return (
            <View key={item.id} style={s.itemCard}>
              <View style={s.itemHeader}>
                <Text style={s.itemName}>{item.emoji} {item.name}</Text>
                <Text style={[s.itemDays, { color: daysColor }]}>
                  あと {stockDays.toFixed(1)} 日分
                </Text>
              </View>

              {/* 現在の在庫 */}
              <Text style={s.rowLabel}>現在の在庫</Text>
              <View style={s.counter}>
                <TouchableOpacity style={s.counterBtn} onPress={() => changeCount(item, -1)}>
                  <Text style={s.counterBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={s.counterInput}
                  value={item.decimal ? count.toFixed(1) : String(count)}
                  keyboardType="decimal-pad"
                  onChangeText={t => {
                    const v = parseFloat(t);
                    if (!isNaN(v) && v >= 0)
                      setCounts(prev => ({ ...prev, [item.id]: Math.round(v * 10) / 10 }));
                  }}
                />
                <Text style={s.counterUnit}>{item.unit}</Text>
                <TouchableOpacity style={s.counterBtn} onPress={() => changeCount(item, 1)}>
                  <Text style={s.counterBtnText}>＋</Text>
                </TouchableOpacity>
              </View>

              {/* 今日購入した数 */}
              <Text style={s.rowLabel}>今日購入した数　<Text style={s.rowLabelSub}>（任意）</Text></Text>
              <View style={s.counter}>
                <TouchableOpacity style={s.counterBtn} onPress={() => changePurchased(item, -1)}>
                  <Text style={s.counterBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={s.counterInput}
                  value={item.decimal ? (purchased[item.id] ?? 0).toFixed(1) : String(purchased[item.id] ?? 0)}
                  keyboardType="decimal-pad"
                  onChangeText={t => {
                    const v = parseFloat(t);
                    if (!isNaN(v) && v >= 0)
                      setPurchased(prev => ({ ...prev, [item.id]: Math.round(v * 10) / 10 }));
                  }}
                />
                <Text style={s.counterUnit}>{item.unit}</Text>
                <TouchableOpacity style={s.counterBtn} onPress={() => changePurchased(item, 1)}>
                  <Text style={s.counterBtnText}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* メモ */}
        <View style={s.memoCard}>
          <Text style={s.memoLabel}>📝 メモ（任意）</Text>
          <TextInput
            style={s.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder="今日の気づきや買い物メモなど自由に入力"
            placeholderTextColor={COLORS.grayMid}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* 保存ボタン */}
        <TouchableOpacity
          style={[s.saveBtn, saved && s.saveBtnDone]}
          onPress={handleSave}
          disabled={saved}
        >
          <Ionicons name={saved ? 'checkmark-circle' : 'save'} size={20} color={COLORS.white} />
          <Text style={s.saveBtnText}>{saved ? '✅ 保存しました！' : '在庫を保存する'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  loading:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:        { padding: 16, paddingBottom: 40 },

  itemCard:      { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12,
                   shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  itemHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemName:      { fontSize: 17, fontWeight: 'bold', color: COLORS.black },
  itemDays:      { fontSize: 13, fontWeight: 'bold' },

  rowLabel:      { fontSize: 13, color: COLORS.grayMid, marginBottom: 6 },
  rowLabelSub:   { fontSize: 11, color: COLORS.grayMid },

  counter:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  counterBtn:    { width: 44, height: 44, backgroundColor: COLORS.lightBg, borderRadius: 10,
                   justifyContent: 'center', alignItems: 'center' },
  counterBtnText:{ fontSize: 22, color: COLORS.primary, fontWeight: 'bold' },
  counterInput:  { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: 'bold',
                   color: COLORS.black, marginHorizontal: 8,
                   borderBottomWidth: 2, borderBottomColor: COLORS.border, paddingBottom: 2 },
  counterUnit:   { fontSize: 14, color: COLORS.grayMid, marginRight: 8 },

  memoCard:      { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 16 },
  memoLabel:     { fontSize: 14, fontWeight: 'bold', color: COLORS.black, marginBottom: 8 },
  memoInput:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10,
                   fontSize: 14, color: COLORS.black, textAlignVertical: 'top', minHeight: 100 },

  saveBtn:       { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16,
                   flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnDone:   { backgroundColor: COLORS.primaryMid },
  saveBtnText:   { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
});
