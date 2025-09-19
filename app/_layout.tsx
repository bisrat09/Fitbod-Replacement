import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';

export default function RootLayout(){
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#ef4444',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: { borderTopColor: '#e5e7eb' },
        tabBarLabelStyle: { fontSize: 18, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>💪</Text>,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>📒</Text>,
        }}
      />
      {/* Hidden routes still accessible via router.push */}
      <Tabs.Screen name="history" options={{ href: null, title: 'History' }} />
      <Tabs.Screen name="equipment" options={{ href: null, title: 'Equipment' }} />
    </Tabs>
  );
}
