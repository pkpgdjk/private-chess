import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { MoveNode, MoveQuality } from '@/types/chess';
import { palette, space, font, radius } from '@/constants/design';
import { qualityColor as qualityColors } from '@/constants/quality';

export const GameStoryView = React.memo(() => {
  const history = useGameStore((state) => state.history);

  const moves = useMemo(() => {
    return history.map((move, index) => ({
      ...move,
      displayNumber: index % 2 === 0 ? `${move.moveNumber}.` : `${move.moveNumber}...`,
    }));
  }, [history]);

  if (history.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Play some moves to see your game story</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {moves.map((move, index) => (
        <View key={index} style={styles.moveRow}>
          <View style={styles.moveHeader}>
            <Text style={styles.moveNumber}>{move.displayNumber}</Text>
            <Text style={styles.san}>{move.san}</Text>
            {move.quality && (
              <View
                style={[styles.qualityDot, { backgroundColor: qualityColors[move.quality] }]}
              />
            )}
          </View>
          {move.aiCommentary && (
            <Text style={styles.commentary} numberOfLines={2}>
              {move.aiCommentary.length > 100
                ? move.aiCommentary.slice(0, 100) + '...'
                : move.aiCommentary}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: space.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: space.xxl,
  },
  emptyText: {
    color: palette.muted,
    fontSize: font.body,
    textAlign: 'center',
  },
  moveRow: {
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    marginBottom: space.xs,
    borderRadius: radius.md,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  moveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moveNumber: {
    color: palette.faint,
    fontSize: font.sm,
    width: 40,
  },
  san: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: '900',
    flex: 1,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: space.sm,
  },
  commentary: {
    color: palette.muted,
    fontSize: font.sm,
    marginTop: space.xs,
    marginLeft: 40,
    lineHeight: 18,
  },
});
