import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, Switch, StyleSheet, Platform,
} from 'react-native';
import { ItemDef, UNIT_PRESETS, suggestEmoji, generateItemId } from '../constants/items';
import { COLORS } from '../constants/items';

interface Props {
  visible: boolean;
  editItem: ItemDef | null;  // null = 新規追加、非null = 編集
  onSave: (item: ItemDef) => void;
  onClose: () => void;
}

export default function ItemFormModal({ visible, editItem, onSave, onClose }: Props) {
  const [emoji,            setEmoji]            = useState('');
  const [name,             setName]             = useState('');
  const [unit,             setUnit]             = useState('個');
  const [dailyAmount,      setDailyAmount]      = useState('');
  const [purchaseAmount,   setPurchaseAmount]   = useState('');
  const [purchaseUnitName, setPurchaseUnitName] = useState('');
  const [decimal,          setDecimal]          = useState(false);
  const [suggestedEmoji,   setSuggestedEmoji]   = useState<string | null>(null);
  const [error,            setError]            = useState('');

  // フォームを初期化
  useEffect(() => {
    if (visible) {
      if (editItem) {
        setEmoji(editItem.emoji);
        setName(editItem.name);
        setUnit(editItem.unit);
        setDailyAmount(String(editItem.dailyAmount));
        setPurchaseAmount(String(editItem.purchaseAmount));
        setPurchaseUnitName(editItem.purchaseUnitName);
        setDecimal(editItem.decimal);
      } else {
        setEmoji('');
        setName('');
        setUnit('個');
        setDailyAmount('');
        setPurchaseAmount('');
        setPurchaseUnitName('');
        setDecimal(false);
      }
      setSuggestedEmoji(null);
      setError('');
    }
  }, [visible, editItem]);

  // 品目名入力時に絵文字を提案
  const handleNameChange = (text: string) => {
    setName(text);
    const s = suggestEmoji(text);
    setSuggestedEmoji(s && s !== emoji ? s : null);
  };

  // 単位ボタン押下
  const selectUnit = (u: string) => {
    setUnit(u);
    // 購入時の呼び名が未入力なら単位と同じにする
    if (!purchaseUnitName) setPurchaseUnitName(u);
  };

  const handleSave = () => {
    if (!name.trim()) { setError('品目名を入力してください'); return; }
    if (!unit.trim())  { setError('単位を入力してください'); return; }
    const daily    = parseFloat(dailyAmount);
    const purchase = parseFloat(purchaseAmount);
    if (isNaN(daily)    || daily    <= 0) { setError('1日の消費量を正しく入力してください'); return; }
    if (isNaN(purchase) || purchase <= 0) { setError('1回の購入量を正しく入力してください'); return; }

    const item: ItemDef = {
      id:               editItem?.id ?? generateItemId(),
      name:             name.trim(),
      emoji:            emoji.trim() || '📦',
      unit:             unit.trim(),
      dailyAmount:      daily,
      purchaseAmount:   purchase,
      purchaseUnitName: purchaseUnitName.trim() || unit.trim(),
      decimal,
    };
    onSave(item);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <Text style={s.title}>{editItem ? '品目を編集' : '品目を追加'}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* 絵文字 */}
            <Text style={s.label}>絵文字</Text>
            <View style={s.emojiRow}>
              <TextInput
                style={[s.input, s.emojiInput]}
                value={emoji}
                onChangeText={setEmoji}
                maxLength={2}
                placeholder="🥚"
              />
              {suggestedEmoji && (
                <TouchableOpacity
                  style={s.suggestBtn}
                  onPress={() => { setEmoji(suggestedEmoji); setSuggestedEmoji(null); }}
                >
                  <Text style={s.suggestBtnText}>{suggestedEmoji} を使う</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 品目名 */}
            <Text style={s.label}>品目名 <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={handleNameChange}
              placeholder="例：卵"
              returnKeyType="done"
            />

            {/* 在庫の単位 */}
            <Text style={s.label}>在庫の単位 <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="下から選ぶか直接入力"
            />
            {/* 単位ボタングリッド */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.unitScroll}>
              <View style={s.unitGrid}>
                {UNIT_PRESETS.map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[s.unitBtn, unit === u && s.unitBtnActive]}
                    onPress={() => selectUnit(u)}
                  >
                    <Text style={[s.unitBtnText, unit === u && s.unitBtnTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* 1日の消費量 */}
            <Text style={s.label}>1日の消費量 <Text style={s.required}>*</Text></Text>
            <View style={s.amountRow}>
              <TextInput
                style={[s.input, s.amountInput]}
                value={dailyAmount}
                onChangeText={setDailyAmount}
                keyboardType="decimal-pad"
                placeholder="4"
              />
              <Text style={s.amountUnit}>{unit || '単位'}/日</Text>
            </View>

            {/* 1回の購入量 */}
            <Text style={s.label}>1回の購入量 <Text style={s.required}>*</Text></Text>
            <View style={s.amountRow}>
              <TextInput
                style={[s.input, s.amountInput]}
                value={purchaseAmount}
                onChangeText={setPurchaseAmount}
                keyboardType="decimal-pad"
                placeholder="10"
              />
              <Text style={s.amountUnit}>{unit || '単位'}</Text>
            </View>

            {/* 購入時の呼び名 */}
            <Text style={s.label}>購入時の呼び名（省略可）</Text>
            <TextInput
              style={s.input}
              value={purchaseUnitName}
              onChangeText={setPurchaseUnitName}
              placeholder="例：ケース・スリーブ（省略可）"
            />

            {/* 小数点入力 */}
            <View style={s.switchRow}>
              <Text style={s.switchLabel}>小数点入力（0.1刻み）</Text>
              <Switch
                value={decimal}
                onValueChange={setDecimal}
                trackColor={{ false: COLORS.border, true: COLORS.primaryMid }}
                thumbColor={COLORS.white}
              />
            </View>

            {/* エラー表示 */}
            {!!error && <Text style={s.errorText}>{error}</Text>}

          </ScrollView>

          {/* ボタン */}
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={handleSave}>
              <Text style={s.btnPrimaryText}>✅ 保存する</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={onClose}>
              <Text style={s.btnSecondaryText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
                  padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, maxHeight: '90%' },
  title:        { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 16 },

  label:        { fontSize: 13, color: COLORS.grayMid, marginTop: 12, marginBottom: 4 },
  required:     { color: COLORS.alertText },

  input:        { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10,
                  fontSize: 15, color: COLORS.black, backgroundColor: COLORS.gray },

  emojiRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiInput:   { width: 64, textAlign: 'center', fontSize: 24 },
  suggestBtn:   { backgroundColor: COLORS.lightBg, borderRadius: 8, paddingHorizontal: 12,
                  paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  suggestBtnText:{ fontSize: 15, color: COLORS.primary, fontWeight: 'bold' },

  unitScroll:   { marginTop: 6, marginBottom: 4 },
  unitGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 4 },
  unitBtn:      { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
                  backgroundColor: COLORS.gray, borderWidth: 1, borderColor: COLORS.border },
  unitBtnActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  unitBtnText:  { fontSize: 13, color: COLORS.black, fontWeight: 'bold' },
  unitBtnTextActive: { color: COLORS.white },

  amountRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInput:  { width: 100 },
  amountUnit:   { fontSize: 14, color: COLORS.grayMid },

  switchRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 16, paddingVertical: 4 },
  switchLabel:  { fontSize: 14, color: COLORS.black },

  errorText:    { color: COLORS.alertText, fontSize: 13, marginTop: 10 },

  btnRow:       { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn:          { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  btnPrimary:   { backgroundColor: COLORS.primary },
  btnPrimaryText:{ color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
  btnSecondary: { backgroundColor: COLORS.gray, borderWidth: 1, borderColor: COLORS.border },
  btnSecondaryText: { color: COLORS.grayMid, fontSize: 15 },
});
