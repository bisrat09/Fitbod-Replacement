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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 14 }}>💪</Text>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 14 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 14 }}>📈</Text>,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programs',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 14 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 14 }}>⚙️</Text>,
        }}
      />
      {/* Hidden routes accessible via router.push */}
      <Tabs.Screen name="log" options={{ href: null, title: 'Log' }} />
      <Tabs.Screen name="equipment" options={{ href: null, title: 'Equipment' }} />
      <Tabs.Screen name="exercises" options={{ href: null, title: 'Exercises' }} />
    </Tabs>
  );
}
