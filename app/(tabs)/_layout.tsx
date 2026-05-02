import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/items';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   COLORS.primaryMid,
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor:  COLORS.border,
          borderTopWidth:  1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle:      { backgroundColor: COLORS.primary },
        headerTintColor:  COLORS.white,
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:      'ホーム',
          headerTitle:'ストック番長 📦',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="update"
        options={{
          title:      '在庫更新',
          headerTitle:'在庫を更新する',
          tabBarIcon: ({ color, size }) => <Ionicons name="pencil" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title:      '履歴',
          headerTitle:'購入履歴',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title:      '設定',
          headerTitle:'設定',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
