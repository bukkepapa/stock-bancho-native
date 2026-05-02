import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// 通知ハンドラー設定（フォアグラウンド時も通知を表示）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

// ── Androidチャンネル初期化 ────────────────────────────────────
async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('stock-bancho', {
      name: 'ストック番長',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B5E20',
    });
  }
}

// ── Expo Push Token 取得 ─────────────────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('プッシュ通知は実機でのみ動作します');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('通知の許可が得られませんでした');
    return null;
  }

  await ensureChannel();

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;  // "ExponentPushToken[xxxx...]"
  } catch (e) {
    console.warn('Push token 取得失敗:', e);
    return null;
  }
}

// ── ローカル通知スケジューリング ──────────────────────────────
// 毎日指定時刻に在庫確認通知を送る（在庫更新保存時にも呼び出す）
export async function scheduleStockNotification(
  hour: number,
  minute: number,
  alertItems: string[],  // ['卵', 'チーズ'] など
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await ensureChannel();

    // 既存のスケジュールをリセット
    await Notifications.cancelAllScheduledNotificationsAsync();

    const body = alertItems.length > 0
      ? `補充が必要です：${alertItems.join('、')}`
      : '今日の在庫を確認しましょう';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'ストック番長 📦',
        body,
        sound: true,
        data: { type: 'stock-check' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: 'stock-bancho',
      },
    });
  } catch (e) {
    console.warn('通知スケジュール設定失敗:', e);
  }
}

// ── 通知キャンセル ────────────────────────────────────────────
export async function cancelStockNotification(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
