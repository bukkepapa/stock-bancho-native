import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { COLORS, ITEM_KEYS, ITEMS, DAY_NAMES } from '../../constants/items';
import { AppState, DEFAULT_SETTINGS } from '../../constants/defaults';
import { loadState, saveState } from '../../lib/storage';

export default function SettingsScreen() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [saved, setSaved]       = useState(false);

  // ローカル編集用
  const [dailyAmounts, setDailyAmounts]   = useState({ egg: '4', cheese: '3', coffee: '300' });
  const [unitAmounts,  setUnitAmounts]    = useState({ egg: '10', cheese: '4', coffee: '900' });
  const [shoppingDays, setShoppingDays]   = useState<number[]>([1, 4]);
  const [notifyHour,   setNotifyHour]     = useState(20);
  const [notifyMinute, setNotifyMinute]   = useState(0);

  useFocusEffect(
    useCallback(() => {
      setSaved(false);
      loadState().then(state => {
        setAppState(state);
        const s = state.settings;
        setDailyAmounts({ egg: String(s.dailyConsumption.egg.amount), cheese: String(s.dailyConsumption.cheese.amount), coffee: String(s.dailyConsumption.coffee.amount) });
        setUnitAmounts({ egg: String(s.purchaseUnit.egg.amount), cheese: String(s.purchaseUnit.cheese.amount), coffee: String(s.purchaseUnit.coffee.amount) });
        setShoppingDays(s.shoppingDays);
        setNotifyHour(s.notifyHour);
        setNotifyMinute(s.notifyMinute);
      });
    }, [])
  );

  if (!appState) {
    return <View style={s.loading}><Text>読み込み中...</Text></View>;
  }

  const toggleDay = (day: number) => {
    setShoppingDays(prev => {
      if (prev.includes(day)) {
        if (prev.length <= 1) { Alert.alert('⚠️ 最低1日は選択してください'); return prev; }
        return prev.filter(d => d !== day);
      }
      return [...prev, day];
    });
  };

  const adjustNotify = (delta: number) => {
    let total = notifyHour * 60 + notifyMinute + delta * 15;
    if (total < 0)    total = 23 * 60 + 45;
    if (total >= 24 * 60) total = 0;
    setNotifyHour(Math.floor(total / 60));
    setNotifyMinute(total % 60);
  };

  const handleSave = async () => {
    const newSettings = {
      ...appState.settings,
      dailyConsumption: {
        egg:    { ...appState.settings.dailyConsumption.egg,    amount: Math.max(1, parseInt(dailyAmounts.egg)   || 1) },
        cheese: { ...appState.settings.dailyConsumption.cheese, amount: Math.max(1, parseInt(dailyAmounts.cheese) || 1) },
        coffee: { ...appState.settings.dailyConsumption.coffee, amount: Math.max(1, parseInt(dailyAmounts.coffee) || 1) },
      },
      purchaseUnit: {
        egg:    { ...appState.settings.purchaseUnit.egg,    amount: Math.max(1, parseInt(unitAmounts.egg)   || 1) },
        cheese: { ...appState.settings.purchaseUnit.cheese, amount: Math.max(1, parseInt(unitAmounts.cheese) || 1) },
        coffee: { ...appState.settings.purchaseUnit.coffee, amount: Math.max(1, parseInt(unitAmounts.coffee) || 1) },
      },
      shoppingDays,
      notifyHour,
      notifyMinute,
    };
    const newState = { ...appState, settings: newSettings };
    await saveState(newState);
    setAppState(newState);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    Alert.alert('設定をリセット', 'すべての設定をデフォルト値に戻しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセット', style: 'destructive',
        onPress: async () => {
          const s = DEFAULT_SETTINGS;
          setDailyAmounts({ egg: String(s.dailyConsumption.egg.amount), cheese: String(s.dailyConsumption.cheese.amount), coffee: String(s.dailyConsumption.coffee.amount) });
          setUnitAmounts({ egg: String(s.purchaseUnit.egg.amount), cheese: String(s.purchaseUnit.cheese.amount), coffee: String(s.purchaseUnit.coffee.amount) });
          setShoppingDays(s.shoppingDays);
          setNotifyHour(s.notifyHour);
          setNotifyMinute(s.notifyMinute);
          const newState = { ...appState, settings: JSON.parse(JSON.stringify(s)) };
          await saveState(newState);
          setAppState(newState);
        },
      },
    ]);
  };

  const notifyDisplay = `${String(notifyHour).padStart(2, '0')}:${String(notifyMinute).padStart(2, '0')}`;
  const dailyAmountsTyped = dailyAmounts as Record<string, string>;
  const unitAmountsTyped  = unitAmounts  as Record<string, string>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* 1日消費量 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>1日の消費量</Text>
          {ITEM_KEYS.map(item => (
            <View key={item} style={s.row}>
              <Text style={s.rowLabel}>{ITEMS[item].emoji} {ITEMS[item].name}</Text>
              <View style={s.inputGroup}>
                <TextInput
                  style={s.input}
                  value={dailyAmountsTyped[item]}
                  onChangeText={t => setDailyAmounts(prev => ({ ...prev, [item]: t }))}
                  keyboardType="numeric"
                />
                <Text style={s.unit}>{item === 'coffee' ? 'ml/日' : `${ITEMS[item].inputUnit}/日`}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 購入単位 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>購入単位（1回の購入量）</Text>
          {ITEM_KEYS.map(item => (
            <View key={item} style={s.row}>
              <Text style={s.rowLabel}>{ITEMS[item].emoji} {ITEMS[item].name}</Text>
              <View style={s.inputGroup}>
                <TextInput
                  style={s.input}
                  value={unitAmountsTyped[item]}
                  onChangeText={t => setUnitAmounts(prev => ({ ...prev, [item]: t }))}
                  keyboardType="numeric"
                />
                <Text style={s.unit}>{item === 'coffee' ? 'ml/本' : `${ITEMS[item].inputUnit}/${ITEMS[item].purchaseUnitLabel}`}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 買い物曜日 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>買い物曜日</Text>
          <View style={s.dayRow}>
            {DAY_NAMES.map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[s.dayBtn, shoppingDays.includes(i) && s.dayBtnActive]}
                onPress={() => toggleDay(i)}
              >
                <Text style={[s.dayBtnText, shoppingDays.includes(i) && s.dayBtnTextActive]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 通知時刻 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>通知時刻</Text>
          <View style={s.notifyRow}>
            <TouchableOpacity style={s.notifyBtn} onPress={() => adjustNotify(-1)}>
              <Text style={s.notifyBtnText}>◀</Text>
            </TouchableOpacity>
            <Text style={s.notifyDisplay}>{notifyDisplay}</Text>
            <TouchableOpacity style={s.notifyBtn} onPress={() => adjustNotify(1)}>
              <Text style={s.notifyBtnText}>▶</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.notifyNote}>15分刻みで設定できます</Text>
        </View>

        {/* ボタン */}
        <TouchableOpacity
          style={[s.saveBtn, saved && s.saveBtnDone]}
          onPress={handleSave}
        >
          <Text style={s.saveBtnText}>{saved ? '✅ 保存しました！' : '設定を保存する'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.resetBtn} onPress={handleReset}>
          <Text style={s.resetBtnText}>デフォルトに戻す</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  loading:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:      { padding: 16, paddingBottom: 40 },

  section:     { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12,
                 shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  sectionTitle:{ fontSize: 15, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12 },

  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowLabel:    { fontSize: 14, color: COLORS.black, flex: 1 },
  inputGroup:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 8,
                 width: 70, textAlign: 'center', fontSize: 16, color: COLORS.black },
  unit:        { fontSize: 13, color: COLORS.grayMid, minWidth: 60 },

  dayRow:      { flexDirection: 'row', gap: 6 },
  dayBtn:      { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.lightBg,
                 alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  dayBtnActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayBtnText:  { fontSize: 13, color: COLORS.grayMid, fontWeight: 'bold' },
  dayBtnTextActive: { color: COLORS.white },

  notifyRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 6 },
  notifyBtn:   { backgroundColor: COLORS.lightBg, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  notifyBtnText:{ fontSize: 16, color: COLORS.primary },
  notifyDisplay:{ fontSize: 36, fontWeight: 'bold', color: COLORS.black, minWidth: 100, textAlign: 'center' },
  notifyNote:  { textAlign: 'center', fontSize: 12, color: COLORS.grayMid },

  saveBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16,
                 alignItems: 'center', marginBottom: 10 },
  saveBtnDone: { backgroundColor: COLORS.primaryMid },
  saveBtnText: { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },

  resetBtn:    { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  resetBtnText:{ color: COLORS.grayMid, fontSize: 15 },
});
