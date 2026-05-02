import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ItemDef } from '../../constants/items';
import { AppState } from '../../constants/defaults';
import {
  getStockDays, getStockStatus, getNextShoppingInfo, isShoppingDay,
  getSuggestedPurchase, formatSuggestionAmount, formatDateTime,
} from '../../lib/stockLogic';
import { loadState, saveState, getUserId } from '../../lib/storage';
import { syncToServer, syncFromServer } from '../../lib/supabase';
import { registerForPushNotifications } from '../../lib/notifications';

export default function HomeScreen() {
  const [appState,   setAppState]   = useState<AppState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const userIdRef = useRef<string>('');

  // 初期化
  useEffect(() => {
    (async () => {
      const userId = await getUserId();
      userIdRef.current = userId;
      const state = await loadState();
      setAppState(state);

      // サーバー同期（バックグラウンド）
      const merged = await syncFromServer(userId, state);
      if (merged) {
        await saveState(merged);
        setAppState(merged);
      }

      // Push通知トークン取得 & Supabaseに保存
      const token = await registerForPushNotifications();
      if (token) {
        syncToServer(userId, state, token);
      }
    })();
  }, []);

  // タブフォーカス時に再描画
  useFocusEffect(
    useCallback(() => {
      loadState().then(setAppState);
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const state = await loadState();
    const merged = await syncFromServer(userIdRef.current, state);
    if (merged) {
      await saveState(merged);
      setAppState(merged);
    } else {
      setAppState(state);
    }
    setRefreshing(false);
  }, []);

  if (!appState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  const { settings, inventory } = appState;
  const { daysUntil, dayName }  = getNextShoppingInfo(settings.shoppingDays);
  const todayIsShopping         = isShoppingDay(settings.shoppingDays);

  const latestUpdate = settings.items
    .map(item => inventory[item.id]?.updatedAt)
    .filter(Boolean)
    .map(s => new Date(s!).getTime())
    .sort((a, b) => b - a)[0];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* 買い物日バッジ */}
        <View style={[styles.badge, todayIsShopping ? styles.badgeToday : styles.badgeNormal]}>
          <Text style={styles.badgeText}>
            {todayIsShopping ? '🛒 今日が買い物日！' : `次：${dayName}曜（${daysUntil}日後）`}
          </Text>
        </View>

        {/* アラートバナー */}
        {(() => {
          const alertNames = settings.items
            .filter(item => {
              const count     = inventory[item.id]?.count ?? 0;
              const stockDays = getStockDays(item, count);
              return getStockStatus(stockDays, daysUntil) === 'ALERT';
            })
            .map(item => item.name);

          if (alertNames.length === 0) return null;
          return (
            <View style={styles.alertBanner}>
              <Ionicons name="warning" size={16} color={COLORS.alertText} />
              <Text style={styles.alertBannerText}>
                {todayIsShopping ? '🛒 補充必要：' : '⚠️ 切れそう：'}
                {alertNames.join('、')}
              </Text>
            </View>
          );
        })()}

        {/* 在庫カード */}
        {settings.items.map(item => {
          const count     = inventory[item.id]?.count ?? 0;
          const stockDays = getStockDays(item, count);
          const status    = getStockStatus(stockDays, daysUntil);

          const cardStyle = {
            OK:      styles.cardOk,
            WARNING: styles.cardWarning,
            ALERT:   styles.cardAlert,
          }[status];

          const badgeStyle = {
            OK:      styles.statusBadgeOk,
            WARNING: styles.statusBadgeWarn,
            ALERT:   styles.statusBadgeAlert,
          }[status];

          const badgeText = {
            OK:      '🟢 余裕あり',
            WARNING: '🟡 要注意',
            ALERT:   '🔴 補充必要',
          }[status];

          return (
            <View key={item.id} style={[styles.card, cardStyle]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
                <Text style={styles.cardName}>{item.name}</Text>
                <View style={[styles.statusBadge, badgeStyle]}>
                  <Text style={styles.statusBadgeText}>{badgeText}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardCount}>
                  {item.decimal ? Number(count).toFixed(1) : count} {item.unit}
                </Text>
                <Text style={styles.cardDays}>
                  あと <Text style={styles.cardDaysBold}>{stockDays.toFixed(1)}</Text> 日分
                </Text>
              </View>
            </View>
          );
        })}

        {/* 最終更新 */}
        <Text style={styles.lastUpdated}>
          {latestUpdate ? `最終更新：${formatDateTime(new Date(latestUpdate).toISOString())}` : '在庫を更新してください'}
        </Text>

        {/* 買い物サジェストボタン（買い物日のみ） */}
        {todayIsShopping && (
          <TouchableOpacity style={styles.suggestionBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="cart" size={20} color={COLORS.white} />
            <Text style={styles.suggestionBtnText}>今日の買い物リストを見る</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 買い物サジェストモーダル */}
      <SuggestionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        appState={appState}
        daysUntil={daysUntil}
        dayName={dayName}
      />
    </View>
  );
}

// ── サジェストモーダル ─────────────────────────────────────
function SuggestionModal({
  visible, onClose, appState, daysUntil, dayName,
}: {
  visible: boolean;
  onClose: () => void;
  appState: AppState;
  daysUntil: number;
  dayName: string;
}) {
  const { settings, inventory } = appState;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>🛒 今日の買い物リスト</Text>
          <Text style={modal.subtitle}>{dayName}曜まで（{daysUntil}日分）</Text>

          <ScrollView>
            {settings.items.map((item: ItemDef) => {
              const count = inventory[item.id]?.count ?? 0;
              const s     = getSuggestedPurchase(item, count, daysUntil);
              return (
                <View key={item.id} style={[modal.row, s.needed ? modal.rowNeeded : modal.rowOk]}>
                  <Text style={modal.rowEmoji}>{item.emoji}</Text>
                  <Text style={modal.rowName}>{item.name}</Text>
                  <Text style={[modal.rowAmount, s.needed ? modal.rowAmountNeeded : modal.rowAmountOk]}>
                    {formatSuggestionAmount(item, s)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={modal.closeBtn} onPress={onClose}>
            <Text style={modal.closeBtnText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── スタイル ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.gray },
  loading:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:   { color: COLORS.grayMid },
  scroll:        { padding: 16, paddingBottom: 32 },

  badge:         { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'center', marginBottom: 12 },
  badgeNormal:   { backgroundColor: COLORS.lightBg, borderWidth: 1, borderColor: COLORS.border },
  badgeToday:    { backgroundColor: COLORS.accent },
  badgeText:     { fontWeight: 'bold', fontSize: 14, color: COLORS.black },

  alertBanner:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.alertBg,
                   borderRadius: 8, padding: 10, marginBottom: 12, gap: 6 },
  alertBannerText:{ color: COLORS.alertText, fontSize: 13, flex: 1 },

  card:          { borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4 },
  cardOk:        { backgroundColor: COLORS.okBg,    borderLeftColor: COLORS.primaryMid },
  cardWarning:   { backgroundColor: COLORS.warnBg,  borderLeftColor: COLORS.accent },
  cardAlert:     { backgroundColor: COLORS.alertBg, borderLeftColor: COLORS.alertText },

  cardHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardEmoji:     { fontSize: 24, marginRight: 8 },
  cardName:      { fontSize: 16, fontWeight: 'bold', flex: 1, color: COLORS.black },

  statusBadge:      { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeOk:    { backgroundColor: COLORS.primaryMid },
  statusBadgeWarn:  { backgroundColor: COLORS.accent },
  statusBadgeAlert: { backgroundColor: COLORS.alertText },
  statusBadgeText:  { color: COLORS.white, fontSize: 11, fontWeight: 'bold' },

  cardBody:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardCount:     { fontSize: 28, fontWeight: 'bold', color: COLORS.black },
  cardDays:      { fontSize: 14, color: COLORS.grayMid },
  cardDaysBold:  { fontWeight: 'bold', color: COLORS.primary },

  lastUpdated:   { textAlign: 'center', color: COLORS.grayMid, fontSize: 12, marginTop: 4, marginBottom: 16 },

  suggestionBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: 10,
                   padding: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  suggestionBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});

const modal = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
               padding: 24, paddingBottom: 40, maxHeight: '80%' },
  title:     { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  subtitle:  { fontSize: 13, color: COLORS.grayMid, marginBottom: 16 },
  row:       { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8 },
  rowNeeded: { backgroundColor: COLORS.alertBg },
  rowOk:     { backgroundColor: COLORS.lightBg },
  rowEmoji:  { fontSize: 22, marginRight: 10 },
  rowName:   { fontSize: 15, flex: 1, color: COLORS.black },
  rowAmount: { fontSize: 15, fontWeight: 'bold' },
  rowAmountNeeded: { color: COLORS.alertText },
  rowAmountOk:     { color: COLORS.primaryMid },
  closeBtn:  { backgroundColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  closeBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});
