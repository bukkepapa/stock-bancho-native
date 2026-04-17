import { useCallback, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ITEM_KEYS, ITEMS, ItemKey } from '../../constants/items';
import { AppState, PurchaseLog } from '../../constants/defaults';
import { getStockDays, getStockStatus, getNextShoppingInfo, isShoppingDay, todayString } from '../../lib/stockLogic';
import { loadState, saveState, getUserId } from '../../lib/storage';
import { syncToServer } from '../../lib/supabase';

export default function UpdateScreen() {
  const router = useRouter();
  const [appState, setAppState]   = useState<AppState | null>(null);
  const [counts, setCounts]       = useState<Record<ItemKey, number>>({ egg: 0, cheese: 0, coffee: 0 });
  const [purchased, setPurchased] = useState<Record<ItemKey, number>>({ egg: 0, cheese: 0, coffee: 0 });
  const [memo, setMemo]           = useState('');
  const [saved, setSaved]         = useState(false);
  const userIdRef = useRef('');

  useFocusEffect(
    useCallback(() => {
      setSaved(false);
      (async () => {
        userIdRef.current = await getUserId();
        const state = await loadState();
        setAppState(state);
        setCounts({
          egg:    state.inventory.egg.count,
          cheese: state.inventory.cheese.count,
          coffee: state.inventory.coffee.count,
        });
        setPurchased({ egg: 0, cheese: 0, coffee: 0 });
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

  const changeCount = (item: ItemKey, delta: number) => {
    const step = ITEMS[item].decimal ? 0.1 : 1;
    setCounts(prev => {
      const raw    = (prev[item] ?? 0) + delta * step;
      const newVal = Math.max(0, Math.round(raw * 10) / 10);
      return { ...prev, [item]: newVal };
    });
  };

  const changePurchased = (item: ItemKey, delta: number) => {
    const step = ITEMS[item].decimal ? 0.1 : 1;
    setPurchased(prev => {
      const raw    = (prev[item] ?? 0) + delta * step;
      const newVal = Math.max(0, Math.round(raw * 10) / 10);
      return { ...prev, [item]: newVal };
    });
  };

  const handleSave = async () => {
    const now   = new Date().toISOString();
    const today = todayString();

    // 在庫更新
    const newInventory = { ...appState.inventory };
    ITEM_KEYS.forEach(item => {
      newInventory[item] = { ...newInventory[item], count: counts[item], updatedAt: now };
    });

    // 購入ログ
    const wentShopping = ITEM_KEYS.some(item => purchased[item] > 0);
    const logEntry: PurchaseLog = {
      date: today,
      wentShopping,
      memo,
      purchased: {
        egg:    { count: purchased.egg,    unit: ITEMS.egg.inputUnit },
        cheese: { count: purchased.cheese, unit: ITEMS.cheese.inputUnit },
        coffee: { count: purchased.coffee, unit: ITEMS.coffee.inputUnit },
      },
    };

    const newLogs = [logEntry, ...appState.purchaseLogs.filter(l => l.date !== today)].slice(0, 30);
    const newState: AppState = { ...appState, inventory: newInventory, purchaseLogs: newLogs };

    await saveState(newState);
    setAppState(newState);
    setSaved(true);

    // Supabase同期（バックグラウンド）
    syncToServer(userIdRef.current, newState);

    // 少し待ってからホームへ
    setTimeout(() => router.push('/'), 800);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll}>
        {ITEM_KEYS.map(item => {
          const { name, emoji, inputUnit } = ITEMS[item];
          const stockDays = getStockDays(item, counts[item], settings);
          const status    = getStockStatus(stockDays, daysUntil);
          const daysColor = { OK: COLORS.primaryMid, WARNING: COLORS.accent, ALERT: COLORS.alertText }[status];
          const isDecimal = ITEMS[item].decimal;

          return (
            <View key={item} style={s.itemCard}>
              <View style={s.itemHeader}>
                <Text style={s.itemName}>{emoji} {name}</Text>
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
                  value={isDecimal ? counts[item].toFixed(1) : String(counts[item])}
                  keyboardType="decimal-pad"
                  onChangeText={t => {
                    const v = parseFloat(t);
                    if (!isNaN(v) && v >= 0) setCounts(prev => ({ ...prev, [item]: Math.round(v * 10) / 10 }));
                  }}
                />
                <Text style={s.counterUnit}>{inputUnit}</Text>
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
                  value={isDecimal ? purchased[item].toFixed(1) : String(purchased[item])}
                  keyboardType="decimal-pad"
                  onChangeText={t => {
                    const v = parseFloat(t);
                    if (!isNaN(v) && v >= 0) setPurchased(prev => ({ ...prev, [item]: Math.round(v * 10) / 10 }));
                  }}
                />
                <Text style={s.counterUnit}>{inputUnit}</Text>
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
  loading:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:       { padding: 16, paddingBottom: 40 },

  itemCard:     { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12,
                  shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  itemHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemName:     { fontSize: 17, fontWeight: 'bold', color: COLORS.black },
  itemDays:     { fontSize: 13, fontWeight: 'bold' },

  rowLabel:     { fontSize: 13, color: COLORS.grayMid, marginBottom: 6 },
  rowLabelSub:  { fontSize: 11, color: COLORS.grayMid },

  counter:      { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  counterBtn:   { width: 44, height: 44, backgroundColor: COLORS.lightBg, borderRadius: 10,
                  justifyContent: 'center', alignItems: 'center' },
  counterBtnText:{ fontSize: 22, color: COLORS.primary, fontWeight: 'bold' },
  counterInput: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: 'bold',
                  color: COLORS.black, marginHorizontal: 8,
                  borderBottomWidth: 2, borderBottomColor: COLORS.border, paddingBottom: 2 },
  counterUnit:  { fontSize: 14, color: COLORS.grayMid, marginRight: 8 },

  memoCard:     { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 16 },
  memoLabel:    { fontSize: 14, fontWeight: 'bold', color: COLORS.black, marginBottom: 8 },
  memoInput:    { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10,
                  fontSize: 14, color: COLORS.black, textAlignVertical: 'top', minHeight: 100 },

  saveBtn:      { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnDone:  { backgroundColor: COLORS.primaryMid },
  saveBtnText:  { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
});
