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

  // Android チャンネル設定
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('stock-bancho', {
      name: 'ストック番長',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#1B5E20',
    });
  }

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
