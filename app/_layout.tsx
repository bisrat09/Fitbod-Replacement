import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

function TabLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: c.headerBg },
        headerTintColor: c.text,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.tabBarBorder },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Workout', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 14 }}>💪</Text> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 14 }}>📊</Text> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 14 }}>📈</Text> }} />
      <Tabs.Screen name="programs" options={{ title: 'Programs', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 14 }}>📋</Text> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 14 }}>⚙️</Text> }} />
      <Tabs.Screen name="log" options={{ href: null, title: 'Log' }} />
      <Tabs.Screen name="equipment" options={{ href: null, title: 'Equipment' }} />
      <Tabs.Screen name="exercises" options={{ href: null, title: 'Exercises' }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <TabLayout />
    </ThemeProvider>
  );
}
