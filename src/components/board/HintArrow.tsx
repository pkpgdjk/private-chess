import React from 'react';
import { View, StyleSheet } from 'react-native';

interface HintArrowProps {
  from: string;
  to: string;
  squareSize: number;
  flipBoard: boolean;
}

// Catppuccin Mocha green (#a6e3a1) at two intensities.
const FROM_TINT = 'rgba(166, 227, 161, 0.28)';
const TO_TINT = 'rgba(166, 227, 161, 0.48)';
const TO_RING = 'rgba(166, 227, 161, 0.95)';

function squareToTopLeft(square: string, squareSize: number, flip: boolean): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97; // a..h → 0..7
  const rank = parseInt(square[1], 10);
  let col = file;
  let row = 8 - rank;
  if (flip) {
    col = 7 - col;
    row = 7 - row;
  }
  return { x: col * squareSize, y: row * squareSize };
}

export const HintArrow = React.memo(({ from, to, squareSize, flipBoard }: HintArrowProps) => {
  const f = squareToTopLeft(from, squareSize, flipBoard);
  const t = squareToTopLeft(to, squareSize, flipBoard);

  return (
    <View style={styles.layer} pointerEvents="none">
      {/* From-square: soft fill */}
      <View
        style={{
          position: 'absolute',
          left: f.x,
          top: f.y,
          width: squareSize,
          height: squareSize,
          backgroundColor: FROM_TINT,
        }}
      />
      {/* To-square: brighter fill + ring */}
      <View
        style={{
          position: 'absolute',
          left: t.x,
          top: t.y,
          width: squareSize,
          height: squareSize,
          backgroundColor: TO_TINT,
          borderWidth: Math.max(3, squareSize * 0.06),
          borderColor: TO_RING,
        }}
      />
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
