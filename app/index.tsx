import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useHistoryStore } from '@/store/historyStore';
import { useCoachMemoryStore } from '@/store/coachMemoryStore';
import { loadActiveGame, type ActiveGameRecord } from '@/store/activeGame';
import { CoachMemoryCard } from '@/components/ui/CoachMemoryCard';
import { HORSEY_SVG } from '@/assets/horseySvg';
import { palette, radius, shadow, space, font } from '@/constants/design';

function relativeTime(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

interface Difficulty {
  label: string;
  detail: string;
  strength: number;
  timeMs: number;
  tint: string;
}

const DIFFICULTIES: Difficulty[] = [
  { label: 'Cozy', detail: 'slow and forgiving', strength: 3, timeMs: 400, tint: palette.green },
  { label: 'Easy', detail: 'light tactics', strength: 7, timeMs: 700, tint: palette.teal },
  { label: 'Hard', detail: 'sharp replies', strength: 13, timeMs: 1200, tint: palette.peach },
  { label: 'Master', detail: 'deep pressure', strength: 19, timeMs: 2000, tint: palette.red },
];

const SECONDARY: { label: string; route: '/history' | '/analysis' | '/settings' }[] = [
  { label: 'History', route: '/history' },
  { label: 'Review', route: '/analysis' },
  { label: 'Settings', route: '/settings' },
];

export default function Index() {
  const router = useRouter();
  const resetGame = useGameStore((s) => s.resetGame);
  const resumeActiveGame = useGameStore((s) => s.resumeActiveGame);
  const playerColor = useSettingsStore((s) => s.playerColor);
  const botStrength = useSettingsStore((s) => s.botStrength);
  const coachProvider = useSettingsStore((s) => s.coachProvider);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const games = useHistoryStore((s) => s.games);
  const loadGames = useHistoryStore((s) => s.loadGames);
  const memoryEntries = useCoachMemoryStore((s) => s.entries);
  const loadMemory = useCoachMemoryStore((s) => s.loadMemory);
  const [activeGame, setActiveGame] = useState<ActiveGameRecord | null>(null);

  useEffect(() => {
    loadGames();
    loadMemory();
  }, [loadGames, loadMemory]);

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      loadActiveGame().then((game) => {
        if (mounted) setActiveGame(game);
      });
      return () => {
        mounted = false;
      };
    }, [])
  );

  const currentDiff =
    DIFFICULTIES.find((d) => Math.abs(d.strength - botStrength) <= 2) ?? DIFFICULTIES[1];
  const lastGame = games[0];

  const handlePlay = () => {
    resetGame(playerColor);
    router.push('/game');
  };

  const handleContinue = () => {
    if (!activeGame) return;
    resumeActiveGame(activeGame);
    router.push('/game');
  };

  const handleSelectDifficulty = (difficulty: Difficulty) => {
    updateSetting('botStrength', difficulty.strength);
    updateSetting('botTimeMs', difficulty.timeMs);
  };

  const handleToggleColor = () => {
    updateSetting('playerColor', playerColor === 'w' ? 'b' : 'w');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.identity}>
            <View>
              <Text style={styles.kicker}>Chess Trainer</Text>
              <Text style={styles.title}>Play sharper, stay cozy.</Text>
            </View>
            <View style={styles.logoBubble}>
              <SvgXml xml={HORSEY_SVG.wN} width={62} height={62} />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>Provider</Text>
              <Text style={styles.metaValue}>{coachProvider === 'openai' ? 'OpenAI' : 'Anthropic'}</Text>
            </View>
            <Pressable onPress={handleToggleColor} style={({ pressed }) => [styles.metaPill, pressed && styles.pressed]}>
              <Text style={styles.metaLabel}>You play</Text>
              <Text style={styles.metaValue}>{playerColor === 'w' ? 'White' : 'Black'}</Text>
            </Pressable>
          </View>
        </View>

        {activeGame && activeGame.history.length > 0 && (
          <Pressable onPress={handleContinue} style={({ pressed }) => [styles.resume, pressed && styles.pressed]}>
            <View style={styles.resumeIcon}>
              <SvgXml xml={activeGame.playerColor === 'w' ? HORSEY_SVG.wK : HORSEY_SVG.bK} width={36} height={36} />
            </View>
            <View style={styles.resumeText}>
              <Text style={styles.cardTitle}>Continue current game</Text>
              <Text style={styles.cardSub}>
                {activeGame.history.length} moves · {relativeTime(activeGame.updatedAt)} · {activeGame.playerColor === 'w' ? 'White' : 'Black'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}

        <View style={styles.playPanel}>
          <View style={styles.playHeader}>
            <View>
              <Text style={styles.sectionLabel}>Quick play</Text>
              <Text style={styles.playTitle}>{currentDiff.label}</Text>
              <Text style={styles.playSub}>
                Bot {currentDiff.strength}/20 · {Math.round(currentDiff.timeMs / 100) / 10}s · {currentDiff.detail}
              </Text>
            </View>
            <Pressable onPress={handlePlay} style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}>
              <Text style={styles.playButtonText}>{activeGame ? 'New game' : 'Play'}</Text>
            </Pressable>
          </View>

          <View style={styles.difficultyGrid}>
            {DIFFICULTIES.map((difficulty) => {
              const selected = difficulty.label === currentDiff.label;
              return (
                <Pressable
                  key={difficulty.label}
                  onPress={() => handleSelectDifficulty(difficulty)}
                  style={({ pressed }) => [
                    styles.difficulty,
                    selected && { borderColor: difficulty.tint, backgroundColor: 'rgba(205, 214, 244, 0.08)' },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: difficulty.tint }]} />
                  <Text style={styles.difficultyLabel}>{difficulty.label}</Text>
                  <Text style={styles.difficultySub}>{difficulty.strength}/20</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {lastGame && (
          <Pressable onPress={() => router.push('/analysis')} style={({ pressed }) => [styles.lastGame, pressed && styles.pressed]}>
            <View>
              <Text style={styles.cardTitle}>Last game</Text>
              <Text style={styles.cardSub}>
                {lastGame.result === 'win' ? 'Win' : lastGame.result === 'loss' ? 'Loss' : 'Draw'} · {new Date(lastGame.date).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}

        <CoachMemoryCard entries={memoryEntries} compact />

        <View style={styles.secondaryRow}>
          {SECONDARY.map((item) => (
            <Pressable key={item.label} onPress={() => router.push(item.route)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  scroll: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.lg,
  },
  hero: {
    paddingTop: space.xl,
    gap: space.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
  },
  kicker: {
    color: palette.muted,
    fontSize: font.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: font.hero,
    fontWeight: '800',
    lineHeight: 46,
    maxWidth: 270,
    marginTop: space.xs,
  },
  logoBubble: {
    width: 86,
    height: 86,
    borderRadius: radius.xl,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  metaPill: {
    flex: 1,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: space.md,
  },
  metaLabel: {
    color: palette.faint,
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: palette.text,
    fontSize: font.md,
    fontWeight: '800',
    marginTop: 2,
  },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  resumeIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: palette.peachSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeText: { flex: 1 },
  playPanel: {
    padding: space.lg,
    borderRadius: radius.xl,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    gap: space.lg,
    ...shadow.soft,
  },
  playHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  sectionLabel: {
    color: palette.primary,
    fontSize: font.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  playTitle: {
    color: palette.text,
    fontSize: font.xl,
    fontWeight: '900',
    marginTop: 3,
  },
  playSub: {
    color: palette.muted,
    fontSize: font.body,
    marginTop: 4,
    maxWidth: 190,
  },
  playButton: {
    minWidth: 98,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: {
    color: palette.bg,
    fontSize: font.body,
    fontWeight: '900',
  },
  difficultyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  difficulty: {
    width: '48%',
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    padding: space.md,
    justifyContent: 'space-between',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
  },
  difficultyLabel: {
    color: palette.text,
    fontSize: font.md,
    fontWeight: '800',
  },
  difficultySub: {
    color: palette.muted,
    fontSize: font.sm,
    fontWeight: '700',
  },
  lastGame: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardTitle: {
    color: palette.text,
    fontSize: font.md,
    fontWeight: '800',
  },
  cardSub: {
    color: palette.muted,
    fontSize: font.body,
    marginTop: 3,
  },
  chevron: {
    color: palette.faint,
    fontSize: 28,
    fontWeight: '300',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  secondary: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
