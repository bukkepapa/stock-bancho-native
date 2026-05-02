import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DAY_NAMES, ItemDef } from '../../constants/items';
import { AppState, DEFAULT_SETTINGS } from '../../constants/defaults';
import { getNextShoppingInfo, getAlertItemNames } from '../../lib/stockLogic';
import { loadState, saveState } from '../../lib/storage';
import { scheduleStockNotification } from '../../lib/notifications';
import ItemFormModal from '../../components/ItemFormModal';

export default function SettingsScreen() {
  const [appState,     setAppState]     = useState<AppState | null>(null);
  const [saved,        setSaved]        = useState(false);
  const [items,        setItems]        = useState<ItemDef[]>([]);
  const [shoppingDays, setShoppingDays] = useState<number[]>([1, 4]);
  const [notifyHour,   setNotifyHour]   = useState(20);
  const [notifyMinute, setNotifyMinute] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem,     setEditItem]     = useState<ItemDef | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSaved(false);
      loadState().then(state => {
        setAppState(state);
        setItems(state.settings.items);
        setShoppingDays(state.settings.shoppingDays);
        setNotifyHour(state.settings.notifyHour);
        setNotifyMinute(state.settings.notifyMinute);
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

  // 30分刻みで通知時刻を調整
  const adjustNotify = (delta: number) => {
    let total = notifyHour * 60 + notifyMinute + delta * 30;
    if (total < 0)          total = 23 * 60 + 30;
    if (total >= 24 * 60)   total = 0;
    setNotifyHour(Math.floor(total / 60));
    setNotifyMinute(total % 60);
  };

  // 品目追加
  const handleAddItem = () => {
    setEditItem(null);
    setModalVisible(true);
  };

  // 品目編集
  const handleEditItem = (item: ItemDef) => {
    setEditItem(item);
    setModalVisible(true);
  };

  // 品目削除
  const handleDeleteItem = (item: ItemDef) => {
    if (items.length <= 1) {
      Alert.alert('⚠️', '最低1品目は必要です');
      return;
    }
    Alert.alert('品目を削除', `「${item.name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: () => setItems(prev => prev.filter(i => i.id !== item.id)),
      },
    ]);
  };

  // モーダルから品目を保存
  const handleSaveItem = (item: ItemDef) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = item;
        return updated;
      }
      return [...prev, item];
    });
    setModalVisible(false);
  };

  const handleSave = async () => {
    const newSettings = {
      items,
      shoppingDays,
      notifyHour,
      notifyMinute,
    };

    // 在庫に新品目のエントリを追加（既存は維持）
    const newInventory = { ...appState.inventory };
    for (const item of items) {
      if (!newInventory[item.id]) {
        newInventory[item.id] = { count: 0, updatedAt: null };
      }
    }

    const newState: AppState = { ...appState, settings: newSettings, inventory: newInventory };
    await saveState(newState);
    setAppState(newState);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    // ローカル通知を再スケジュール
    const { daysUntil } = getNextShoppingInfo(shoppingDays);
    const alertNames = getAlertItemNames(items, newInventory, daysUntil);
    await scheduleStockNotification(notifyHour, notifyMinute, alertNames);
  };

  const handleReset = () => {
    Alert.alert('設定をリセット', 'すべての設定をデフォルト値に戻しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセット', style: 'destructive',
        onPress: async () => {
          const d = DEFAULT_SETTINGS;
          setItems(d.items);
          setShoppingDays(d.shoppingDays);
          setNotifyHour(d.notifyHour);
          setNotifyMinute(d.notifyMinute);
          const newState = { ...appState, settings: { ...d } };
          await saveState(newState);
          setAppState(newState);
        },
      },
    ]);
  };

  const notifyDisplay = `${String(notifyHour).padStart(2, '0')}:${String(notifyMinute).padStart(2, '0')}`;

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll}>

          {/* ===== 管理品目 ===== */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>管理品目</Text>
            {items.map(item => (
              <View key={item.id} style={s.itemRow}>
                <Text style={s.itemEmoji}>{item.emoji}</Text>
                <View style={s.itemInfo}>
                  <Text style={s.itemName}>{item.name}</Text>
                  <Text style={s.itemSub}>
                    {item.dailyAmount}{item.unit}/日・{item.purchaseAmount}{item.unit}/{item.purchaseUnitName || item.unit}
                  </Text>
                </View>
                <TouchableOpacity style={s.iconBtn} onPress={() => handleEditItem(item)}>
                  <Ionicons name="pencil" size={18} color={COLORS.primaryMid} />
                </TouchableOpacity>
                <TouchableOpacity style={s.iconBtn} onPress={() => handleDeleteItem(item)}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.alertText} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.addBtn} onPress={handleAddItem}>
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              <Text style={s.addBtnText}>品目を追加する</Text>
            </TouchableOpacity>
          </View>

          {/* ===== 買い物曜日 ===== */}
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

          {/* ===== 通知時刻（30分刻み） ===== */}
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
            <Text style={s.notifyNote}>30分刻みで設定できます</Text>
          </View>

          {/* ===== ボタン ===== */}
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

      <ItemFormModal
        visible={modalVisible}
        editItem={editItem}
        onSave={handleSaveItem}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const s = StyleSheet.create({
  loading:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:       { padding: 16, paddingBottom: 40 },

  section:      { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12,
                  shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12 },

  // 品目リスト
  itemRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: COLORS.lightBg },
  itemEmoji:    { fontSize: 22, width: 36 },
  itemInfo:     { flex: 1 },
  itemName:     { fontSize: 14, fontWeight: 'bold', color: COLORS.black },
  itemSub:      { fontSize: 12, color: COLORS.grayMid, marginTop: 2 },
  iconBtn:      { padding: 8 },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingVertical: 12, justifyContent: 'center' },
  addBtnText:   { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },

  // 買い物曜日
  dayRow:       { flexDirection: 'row', gap: 6 },
  dayBtn:       { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.lightBg,
                  alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  dayBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayBtnText:   { fontSize: 13, color: COLORS.grayMid, fontWeight: 'bold' },
  dayBtnTextActive: { color: COLORS.white },

  // 通知時刻
  notifyRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 6 },
  notifyBtn:    { backgroundColor: COLORS.lightBg, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  notifyBtnText:{ fontSize: 16, color: COLORS.primary },
  notifyDisplay:{ fontSize: 36, fontWeight: 'bold', color: COLORS.black, minWidth: 100, textAlign: 'center' },
  notifyNote:   { textAlign: 'center', fontSize: 12, color: COLORS.grayMid },

  // ボタン
  saveBtn:      { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16,
                  alignItems: 'center', marginBottom: 10 },
  saveBtnDone:  { backgroundColor: COLORS.primaryMid },
  saveBtnText:  { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
  resetBtn:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  resetBtnText: { color: COLORS.grayMid, fontSize: 15 },
});
