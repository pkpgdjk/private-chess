import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { MoveQuality } from '@/types/chess';
import { colors } from '@/constants/colors';
import { palette, radius, space, font } from '@/constants/design';
import { qualityColor as qualityColors } from '@/constants/quality';
import { FollowUpInput } from './FollowUpInput';

export const MoveAnalysisCard = React.memo(() => {
  const coachMessage = useGameStore((state) => state.coachMessage);
  const coachMessageType = useGameStore((state) => state.coachMessageType);
  const isAnalyzing = useGameStore((state) => state.isAnalyzing);
  const history = useGameStore((state) => state.history);
  const currentMoveIndex = useGameStore((state) => state.currentMoveIndex);

  const currentMove = currentMoveIndex >= 0 ? history[currentMoveIndex] : null;

  const quality = currentMove?.quality ?? null;

  const { mainText, bullets, betterMove } = useMemo(() => {
    if (!coachMessage) return { mainText: '', bullets: [] as string[], betterMove: null as string | null };

    const lines = coachMessage.split('\n').map((l) => l.trim()).filter(Boolean);
    const bulletLines: string[] = [];
    let mainLines: string[] = [];
    let foundBetterMove: string | null = null;

    for (const line of lines) {
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        bulletLines.push(line.replace(/^[\•\-\*]\s*/, ''));
      } else if (line.toLowerCase().startsWith('better was') || line.toLowerCase().startsWith('better')) {
        foundBetterMove = line;
      } else {
        mainLines.push(line);
      }
    }

    return { mainText: mainLines.join('\n\n'), bullets: bulletLines, betterMove: foundBetterMove };
  }, [coachMessage]);

  if (isAnalyzing) {
    return (
      <View style={styles.container}>
        <View style={styles.thinkingContainer}>
          <Text style={styles.thinkingText}>Coach is thinking</Text>
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        </View>
      </View>
    );
  }

  if (!coachMessage) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Make a move to get analysis</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {quality && (
        <View style={[styles.badge, { backgroundColor: qualityColors[quality] }]}>
          <Text style={styles.badgeText}>
            {quality.charAt(0).toUpperCase() + quality.slice(1)}
          </Text>
        </View>
      )}

      {mainText.length > 0 && (
        <Text style={styles.explanation}>{mainText}</Text>
      )}

      {bullets.length > 0 && (
        <View style={styles.bulletsContainer}>
          {bullets.map((bullet, index) => (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      )}

      {betterMove && (
        <Text style={styles.betterMove}>{betterMove}</Text>
      )}

      {!betterMove && currentMove?.stockfishBestMove && (
        <Text style={styles.betterMove}>
          Better was {currentMove.stockfishBestMove}
        </Text>
      )}

      <FollowUpInput />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: space.lg,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xxl,
  },
  thinkingText: {
    color: palette.muted,
    fontSize: font.body,
  },
  spinner: {
    marginLeft: space.sm,
  },
  emptyText: {
    color: palette.muted,
    fontSize: font.body,
    textAlign: 'center',
    paddingVertical: space.xxl,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: space.md,
  },
  badgeText: {
    color: palette.bg,
    fontSize: font.sm,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  explanation: {
    color: palette.text,
    fontSize: font.body,
    lineHeight: 22,
    marginBottom: space.md,
  },
  bulletsContainer: {
    marginBottom: space.md,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: space.xs,
  },
  bulletDot: {
    color: palette.primary,
    fontSize: font.body,
    marginRight: space.sm,
    lineHeight: 20,
  },
  bulletText: {
    color: palette.text,
    fontSize: font.body,
    flex: 1,
    lineHeight: 20,
  },
  betterMove: {
    color: palette.yellow,
    fontSize: font.body,
    fontWeight: '900',
    marginBottom: space.md,
  },
});
