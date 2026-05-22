import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { palette, font } from '@/constants/design';

interface CapturedPiecesProps {
  fen: string;
  /** Which side's captures to render (i.e. pieces this side has taken from the opponent). */
  side: 'w' | 'b';
}

const pieceUnicode: Record<string, string> = {
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛',
  P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕',
};

const startingCounts: Record<string, number> = {
  p: 8, n: 2, b: 2, r: 2, q: 1,
  P: 8, N: 2, B: 2, R: 2, Q: 1,
};

const pieceValue: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9,
};

function countPiecesInFen(fen: string): Record<string, number> {
  const placement = fen.split(' ')[0];
  const counts: Record<string, number> = {
    p: 0, n: 0, b: 0, r: 0, q: 0,
    P: 0, N: 0, B: 0, R: 0, Q: 0,
  };
  for (const char of placement) {
    if (counts[char] !== undefined) counts[char]++;
  }
  return counts;
}

function getCaptured(fen: string, side: 'w' | 'b'): { pieces: string[]; advantage: number } {
  const current = countPiecesInFen(fen);
  // White captures lowercase (black) pieces; Black captures uppercase (white) pieces.
  const captureKeys = side === 'w' ? ['p', 'n', 'b', 'r', 'q'] : ['P', 'N', 'B', 'R', 'Q'];
  const lostKeys = side === 'w' ? ['P', 'N', 'B', 'R', 'Q'] : ['p', 'n', 'b', 'r', 'q'];

  const pieces: string[] = [];
  let captured = 0;
  let lost = 0;

  for (const key of captureKeys) {
    const diff = startingCounts[key] - current[key];
    captured += diff * pieceValue[key.toLowerCase()];
    for (let i = 0; i < diff; i++) pieces.push(pieceUnicode[key]);
  }
  for (const key of lostKeys) {
    const diff = startingCounts[key] - current[key];
    lost += diff * pieceValue[key.toLowerCase()];
  }

  return { pieces, advantage: captured - lost };
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ fen, side }) => {
  const showCapturedPieces = useSettingsStore((s) => s.showCapturedPieces);

  const { pieces, advantage } = useMemo(() => getCaptured(fen, side), [fen, side]);

  if (!showCapturedPieces) return null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {pieces.map((piece, i) => (
          <Text key={i} style={styles.piece}>{piece}</Text>
        ))}
        {advantage > 0 && (
          <Text style={styles.advantage}>+{advantage}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    minHeight: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  piece: {
    fontSize: 17,
    marginRight: -4,
    color: palette.text,
    opacity: 0.88,
  },
  advantage: {
    color: palette.green,
    fontSize: font.sm,
    fontWeight: '900',
    marginLeft: 8,
  },
});
