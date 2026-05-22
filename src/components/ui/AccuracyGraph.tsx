import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { palette, radius, space, font } from '@/constants/design';
import type { MoveNode } from '@/types/chess';
import { qualityColor } from '@/constants/quality';
import { buildAccuracyPoints } from '@/utils/learning';

interface AccuracyGraphProps {
  history: MoveNode[];
  playerColor: 'w' | 'b';
  onSelectMove?: (index: number) => void;
}

export const AccuracyGraph: React.FC<AccuracyGraphProps> = ({ history, playerColor, onSelectMove }) => {
  const points = useMemo(() => buildAccuracyPoints(history, playerColor), [history, playerColor]);
  const width = Math.min(Dimensions.get('window').width - 64, 520);
  const height = 150;
  const pad = 18;
  const chartWidth = width - pad * 2;
  const chartHeight = height - pad * 2;

  const coords = points.map((point, index) => {
    const x = points.length <= 1 ? width / 2 : pad + (index / (points.length - 1)) * chartWidth;
    const y = pad + (1 - point.score / 100) * chartHeight;
    return { ...point, x, y };
  });

  const line = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const average =
    points.length === 0
      ? 0
      : Math.round(points.reduce((sum, point) => sum + point.score, 0) / points.length);
  const worst = [...points].sort((a, b) => a.score - b.score)[0] ?? null;

  if (points.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>Play a game to see your accuracy curve.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Accuracy</Text>
          <Text style={styles.title}>{average}% average</Text>
        </View>
        {worst && (
          <Text style={styles.worst}>
            Lowest: {worst.moveNumber}. {worst.san}
          </Text>
        )}
      </View>

      <View style={[styles.chart, { width, height }]}>
        <Svg width={width} height={height}>
          <Polyline
            points={line}
            fill="none"
            stroke={palette.primary}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {coords.map((point) => (
            <Circle
              key={`${point.moveIndex}-${point.san}`}
              cx={point.x}
              cy={point.y}
              r={5}
              fill={point.quality ? qualityColor[point.quality] : palette.primary}
              stroke={palette.bg}
              strokeWidth={2}
            />
          ))}
        </Svg>

        {coords.map((point) => (
          <Pressable
            key={`hit-${point.moveIndex}`}
            onPress={() => onSelectMove?.(point.moveIndex)}
            style={[
              styles.hitPoint,
              {
                left: point.x - 16,
                top: point.y - 16,
              },
            ]}
          />
        ))}
      </View>

      <Text style={styles.hint}>Tap a point to jump to that move.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
  },
  kicker: {
    color: palette.primary,
    fontSize: font.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: font.lg,
    fontWeight: '900',
    marginTop: 2,
  },
  worst: {
    color: palette.muted,
    fontSize: font.sm,
    fontWeight: '800',
    maxWidth: 150,
    textAlign: 'right',
  },
  chart: {
    position: 'relative',
    borderRadius: radius.lg,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  hitPoint: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: radius.pill,
  },
  hint: {
    color: palette.faint,
    fontSize: font.sm,
  },
  emptyCard: {
    borderRadius: radius.lg,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    padding: space.lg,
  },
  emptyText: {
    color: palette.muted,
    fontSize: font.body,
  },
});
