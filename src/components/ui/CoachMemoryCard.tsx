import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, radius, space, font } from '@/constants/design';
import type { CoachMemoryEntry } from '@/store/coachMemoryStore';

interface CoachMemoryCardProps {
  entries: CoachMemoryEntry[];
  compact?: boolean;
}

function severityColor(severity: CoachMemoryEntry['severity']): string {
  if (severity === 'high') return palette.red;
  if (severity === 'medium') return palette.peach;
  return palette.teal;
}

export const CoachMemoryCard: React.FC<CoachMemoryCardProps> = ({ entries, compact = false }) => {
  const topEntries = entries.slice(0, compact ? 2 : 4);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Coach memory</Text>
          <Text style={styles.title}>Recurring focus</Text>
        </View>
        <Text style={styles.count}>{entries.length}</Text>
      </View>

      {topEntries.length === 0 ? (
        <Text style={styles.empty}>Finish games with analysis to build a personal pattern map.</Text>
      ) : (
        <View style={styles.list}>
          {topEntries.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: severityColor(entry.severity) }]} />
              <View style={styles.rowText}>
                <Text style={styles.label}>{entry.label}</Text>
                {!compact && <Text style={styles.detail}>{entry.detail}</Text>}
              </View>
              <Text style={styles.badge}>{entry.count}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.panel,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: space.lg,
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kicker: {
    color: palette.primary,
    fontSize: font.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: font.md,
    fontWeight: '900',
    marginTop: 2,
  },
  count: {
    color: palette.faint,
    fontSize: font.sm,
    fontWeight: '900',
  },
  empty: {
    color: palette.muted,
    fontSize: font.body,
    lineHeight: 20,
  },
  list: {
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
  },
  rowText: {
    flex: 1,
  },
  label: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: '900',
  },
  detail: {
    color: palette.muted,
    fontSize: font.sm,
    lineHeight: 17,
    marginTop: 2,
  },
  badge: {
    color: palette.faint,
    fontSize: font.sm,
    fontWeight: '900',
  },
});

