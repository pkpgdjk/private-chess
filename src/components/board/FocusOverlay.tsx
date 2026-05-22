import React from 'react';
import { View, StyleSheet } from 'react-native';

interface FocusOverlayProps {
  squares: string[];
  squareSize: number;
  flipBoard: boolean;
}

// Catppuccin Mocha mauve (#cba6f7) — different family from the green hint
// arrow / move dots so the player can tell coach-focus apart at a glance.
const HALO_FILL = 'rgba(203, 166, 247, 0.30)';
const HALO_RING = 'rgba(203, 166, 247, 0.85)';

function squareToTopLeft(square: string, squareSize: number, flip: boolean): { x: number; y: number } | null {
  if (!/^[a-h][1-8]$/.test(square)) return null;
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10);
  let col = file;
  let row = 8 - rank;
  if (flip) {
    col = 7 - col;
    row = 7 - row;
  }
  return { x: col * squareSize, y: row * squareSize };
}

export const FocusOverlay = React.memo(({ squares, squareSize, flipBoard }: FocusOverlayProps) => {
  if (!squares || squares.length === 0) return null;

  return (
    <View style={styles.layer} pointerEvents="none">
      {squares.map((sq) => {
        const pos = squareToTopLeft(sq, squareSize, flipBoard);
        if (!pos) return null;
        return (
          <View
            key={sq}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: squareSize,
              height: squareSize,
              backgroundColor: HALO_FILL,
              borderWidth: Math.max(2, squareSize * 0.04),
              borderColor: HALO_RING,
              borderStyle: 'dashed',
            }}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
