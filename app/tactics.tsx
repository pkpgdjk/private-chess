import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { palette, radius, space, font } from '@/constants/design';

export default function Tactics() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.kicker}>Training</Text>
        <Text style={styles.title}>Tactics are getting a quiet little studio.</Text>
        <Text style={styles.body}>
          This mode will become focused puzzle practice. For now, use post-game review and hints to study the critical positions from your own games.
        </Text>
        <Pressable onPress={() => router.replace('/game')} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>Play a game</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: space.xl,
  },
  kicker: {
    color: palette.teal,
    fontSize: font.sm,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: font.xl,
    fontWeight: '900',
    lineHeight: 31,
    marginTop: space.sm,
  },
  body: {
    color: palette.muted,
    fontSize: font.md,
    lineHeight: 23,
    marginTop: space.md,
  },
  button: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.xl,
  },
  buttonText: {
    color: palette.bg,
    fontSize: font.body,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});

