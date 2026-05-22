import React from 'react';
import { View, StyleSheet } from 'react-native';

interface MoveOverlayProps {
  square: string;
  isLegal: boolean;
  isCapture: boolean;
  squareSize: number;
}

// Catppuccin Mocha green (#a6e3a1) — same family as the hint highlights so they
// read as the same visual language.
const LEGAL_TINT = 'rgba(166, 227, 161, 0.22)';
const CAPTURE_TINT = 'rgba(243, 139, 168, 0.30)'; // red (#f38ba8) for captures
const CAPTURE_RING = 'rgba(243, 139, 168, 0.85)';

export const MoveOverlay = React.memo(({ isLegal, isCapture, squareSize }: MoveOverlayProps) => {
  if (!isLegal) return null;

  if (isCapture) {
    return (
      <View
        style={[
          styles.fill,
          {
            backgroundColor: CAPTURE_TINT,
            borderWidth: Math.max(2.5, squareSize * 0.05),
            borderColor: CAPTURE_RING,
          },
        ]}
        pointerEvents="none"
      />
    );
  }

  return (
    <View
      style={[styles.fill, { backgroundColor: LEGAL_TINT }]}
      pointerEvents="none"
    />
  );
});

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
