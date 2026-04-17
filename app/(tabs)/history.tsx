import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { COLORS, ITEM_KEYS, ITEMS, DAY_NAMES } from '../../constants/items';
import { AppState } from '../../constants/defaults';
import { loadState } from '../../lib/storage';

export default function HistoryScreen() {
  const [appState, setAppState] = useState<AppState | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadState().then(setAppState);
    }, [])
  );

  if (!appState) {
    return <View style={s.loading}><Text>読み込み中...</Text></View>;
  }

  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  const shoppingCount = last7.filter(date => {
    const log = appState.purchaseLogs.find(l => l.date === date);
    return log?.wentShopping;
  }).length;

  const pct = Math.min(100, (shoppingCount / 2) * 100);

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      {/* 週間サマリー */}
      <View style={s.weeklyCard}>
        <Text style={s.weeklyTitle}>今週のスーパー訪問（直近7日）</Text>
        <View style={s.weeklyRow}>
          <Text style={s.weeklyCount}>{shoppingCount}</Text>
          <Text style={s.weeklyGoal}> 回 / 目標 2 回</Text>
        </View>
        <View style={s.progressBar}>
          <View style={[s.progressFill, {
            width: `${pct}%` as `${number}%`,
            backgroundColor: shoppingCount <= 2 ? COLORS.primaryMid : COLORS.alertText,
          }]} />
        </View>
        <Text style={[s.weeklyComment, { color: shoppingCount <= 2 ? COLORS.primaryMid : COLORS.alertText }]}>
          {shoppingCount <= 2 ? '✅ 目標達成中！すばらしい' : `⚠️ 目標より ${shoppingCount - 2} 回多いです`}
        </Text>
      </View>

      <Text style={s.sectionTitle}>直近 7 日間</Text>

      {last7.map(date => {
        const log = appState.purchaseLogs.find(l => l.date === date);
        const d   = new Date(date + 'T00:00:00');
        const label = `${d.getMonth() + 1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}）`;

        if (!log) {
          return (
            <View key={date} style={[s.historyItem, s.noData]}>
              <View style={s.historyHeader}>
                <Text style={s.historyDate}>{label}</Text>
                <Text style={s.noDataText}>記録なし</Text>
              </View>
            </View>
          );
        }

        const purchasedItems = ITEM_KEYS.filter(
          item => log.purchased[item] && log.purchased[item].count > 0
        );

        return (
          <View key={date} style={[s.historyItem, log.wentShopping && s.wentShopping]}>
            <View style={s.historyHeader}>
              <Text style={s.historyDate}>{label}</Text>
              {log.wentShopping && (
                <View style={s.shoppingBadge}>
                  <Text style={s.shoppingBadgeText}>🛒 買い物</Text>
                </View>
              )}
            </View>

            {purchasedItems.length > 0 && (
              <View style={s.purchasedRow}>
                {purchasedItems.map(item => {
                  const cnt  = log.purchased[item].count;
                  const disp = ITEMS[item].decimal ? Number(cnt).toFixed(1) : cnt;
                  return (
                    <View key={item} style={s.purchasedChip}>
                      <Text style={s.purchasedChipText}>
                        {ITEMS[item].emoji} {disp}{ITEMS[item].inputUnit}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {log.memo ? (
              <Text style={s.memo}>📝 {log.memo}</Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  loading:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:        { padding: 16, paddingBottom: 40 },

  weeklyCard:    { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 16,
                   shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  weeklyTitle:   { fontSize: 14, color: COLORS.grayMid, marginBottom: 8 },
  weeklyRow:     { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  weeklyCount:   { fontSize: 36, fontWeight: 'bold', color: COLORS.black },
  weeklyGoal:    { fontSize: 14, color: COLORS.grayMid },
  progressBar:   { height: 8, backgroundColor: COLORS.lightBg, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: '100%', borderRadius: 4 },
  weeklyComment: { fontSize: 13, fontWeight: 'bold' },

  sectionTitle:  { fontSize: 14, fontWeight: 'bold', color: COLORS.grayMid, marginBottom: 8 },

  historyItem:   { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 8,
                   shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  noData:        { opacity: 0.5 },
  wentShopping:  { borderLeftWidth: 3, borderLeftColor: COLORS.accent },

  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  historyDate:   { fontSize: 15, fontWeight: 'bold', color: COLORS.black },
  noDataText:    { fontSize: 12, color: COLORS.grayMid },

  shoppingBadge: { backgroundColor: COLORS.warnBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  shoppingBadgeText: { fontSize: 12, color: COLORS.warnText, fontWeight: 'bold' },

  purchasedRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  purchasedChip: { backgroundColor: COLORS.lightBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  purchasedChipText: { fontSize: 13, color: COLORS.primaryMid },

  memo:          { fontSize: 13, color: COLORS.grayMid, marginTop: 4, fontStyle: 'italic' },
});
