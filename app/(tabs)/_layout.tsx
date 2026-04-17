import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/items';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.grayMid,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor:  COLORS.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11 },
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
