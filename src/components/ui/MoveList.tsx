import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { palette, radius, space, font } from '@/constants/design';

const { width, height } = Dimensions.get('window');
const isNarrow = width < 700;

interface MoveListProps {
  onExploreMove?: (index: number) => void;
}

export const MoveList: React.FC<MoveListProps> = ({ onExploreMove }) => {
  const history = useGameStore((state) => state.history);
  const currentMoveIndex = useGameStore((state) => state.currentMoveIndex);
  const jumpToMove = useGameStore((state) => state.jumpToMove);

  const movePairs: { moveNumber: number; white?: string; black?: string; whiteIndex: number; blackIndex: number }[] = [];

  for (let i = 0; i < history.length; i += 2) {
    const whiteMove = history[i];
    const blackMove = history[i + 1];
    movePairs.push({
      moveNumber: whiteMove.moveNumber,
      white: whiteMove.san,
      black: blackMove?.san,
      whiteIndex: i,
      blackIndex: i + 1,
    });
  }

  return (
    <View style={[styles.container, isNarrow ? styles.narrow : styles.wide]}>
      <Text style={styles.header}>Moves</Text>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {movePairs.map((pair) => (
          <View key={pair.moveNumber} style={styles.moveRow}>
            <Text style={styles.moveNumber}>{pair.moveNumber}.</Text>
            <Pressable
              style={[
                styles.moveButton,
                currentMoveIndex === pair.whiteIndex && styles.activeMove,
              ]}
              onPress={() => jumpToMove(pair.whiteIndex)}
              onLongPress={() => onExploreMove?.(pair.whiteIndex)}
            >
              <Text
                style={[
                  styles.moveText,
                  currentMoveIndex === pair.whiteIndex && styles.activeMoveText,
                ]}
              >
                {pair.white}
              </Text>
            </Pressable>
            {pair.black && (
              <Pressable
                style={[
                  styles.moveButton,
                  currentMoveIndex === pair.blackIndex && styles.activeMove,
                ]}
                onPress={() => jumpToMove(pair.blackIndex)}
                onLongPress={() => onExploreMove?.(pair.blackIndex)}
              >
                <Text
                  style={[
                    styles.moveText,
                    currentMoveIndex === pair.blackIndex && styles.activeMoveText,
                  ]}
                >
                  {pair.black}
                </Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.panel,
    borderRadius: radius.lg,
    padding: space.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  wide: {
    width: 132,
    maxHeight: Math.min(width, height) * 0.9,
  },
  narrow: {
    width: '100%',
    maxHeight: 120,
    marginTop: space.sm,
  },
  header: {
    color: palette.primary,
    fontSize: font.tiny,
    fontWeight: '900',
    marginBottom: space.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  moveNumber: {
    color: palette.faint,
    fontSize: font.sm,
    width: 24,
    textAlign: 'right',
    marginRight: 4,
  },
  moveButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.sm,
    minWidth: 40,
  },
  moveText: {
    color: palette.text,
    fontSize: font.sm,
    fontWeight: '700',
  },
  activeMove: {
    backgroundColor: palette.primary,
  },
  activeMoveText: {
    color: palette.bg,
    fontWeight: '900',
  },
});
