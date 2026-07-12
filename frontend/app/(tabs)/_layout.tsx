import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { theme } from '@/src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.red,
        tabBarInactiveTintColor: theme.colors.inkMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
          shadowColor: 'transparent',
        },
        headerTintColor: theme.colors.ink,
        headerTitleStyle: {
          fontWeight: '800',
          color: theme.colors.ink,
          letterSpacing: 0.3,
        },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Live Map',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Clips',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="videocam" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="warning" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Device',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle" size={size ?? 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
