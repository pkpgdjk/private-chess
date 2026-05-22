import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { palette } from '@/constants/design';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Chess Trainer' }} />
        <Stack.Screen name="game" options={{ title: 'Play' }} />
        <Stack.Screen name="analysis" options={{ title: 'Analysis' }} />
        <Stack.Screen name="tactics" options={{ title: 'Tactics' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="history" options={{ title: 'History' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
