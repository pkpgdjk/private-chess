import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { HORSEY_SVG } from '@/assets/horseySvg';
import { useSettingsStore } from '@/store/settingsStore';
import { catppuccin } from '@/constants/colors';

interface PieceProps {
  piece: string;
  color: 'w' | 'b';
  size: number;
}

const UNICODE: Record<string, string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

export const Piece = React.memo(({ piece, color, size }: PieceProps) => {
  const pieceSet = useSettingsStore((s) => s.pieceSet);

  if (pieceSet === 'unicode') {
    return (
      <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
        <Text
          style={[
            styles.glyph,
            {
              fontSize: size * 0.78,
              lineHeight: size,
              color: color === 'w' ? catppuccin.rosewater : catppuccin.surface0,
              textShadowColor:
                color === 'w' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.15)',
            },
          ]}
        >
          {UNICODE[piece]}
        </Text>
      </View>
    );
  }

  const key = `${color}${piece.toUpperCase()}`;
  const svg = HORSEY_SVG[key];
  if (!svg) return null;

  const renderSize = Math.floor(size * 0.94);
  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      <SvgXml xml={svg} width={renderSize} height={renderSize} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glyph: {
    textAlign: 'center',
    fontWeight: '600',
    includeFontPadding: false,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1.5,
  },
});
