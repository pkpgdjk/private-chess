import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHistoryStore } from '@/store/historyStore';
import { palette, radius, space, font } from '@/constants/design';
import type { SavedGame } from '@/types/chess';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resultLabel(result: SavedGame['result']): string {
  if (result === 'win') return 'Win';
  if (result === 'loss') return 'Loss';
  return 'Draw';
}

function resultColor(result: SavedGame['result']): string {
  if (result === 'win') return palette.green;
  if (result === 'loss') return palette.red;
  return palette.yellow;
}

export default function HistoryScreen() {
  const router = useRouter();
  const games = useHistoryStore((state) => state.games);
  const loadGames = useHistoryStore((state) => state.loadGames);
  const deleteGame = useHistoryStore((state) => state.deleteGame);
  const isLoading = useHistoryStore((state) => state.isLoading);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const handleDelete = (game: SavedGame) => {
    Alert.alert('Delete game', `Remove the ${formatDate(game.date)} game?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGame(game.id) },
    ]);
  };

  const renderItem = ({ item }: { item: SavedGame }) => {
    const accent = resultColor(item.result);
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/analysis', params: { id: item.id } })}
        onLongPress={() => handleDelete(item)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{resultLabel(item.result)} vs bot</Text>
            <View style={[styles.badge, { borderColor: accent }]}>
              <Text style={[styles.badgeText, { color: accent }]}>Level {item.botStrength}</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {item.moveHistory.length} moves · {item.playerColor === 'w' ? 'White' : 'Black'} · {formatDate(item.date)}
          </Text>
          <Text style={styles.pgn} numberOfLines={1}>{item.pgn}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Archive</Text>
        <Text style={styles.heading}>Game history</Text>
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Loading games</Text>
        </View>
      ) : games.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No saved games yet</Text>
          <Text style={styles.emptyText}>Finish a game and it will appear here for review.</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.md,
  },
  kicker: {
    color: palette.primary,
    fontSize: font.sm,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heading: {
    color: palette.text,
    fontSize: font.xl,
    fontWeight: '900',
    marginTop: space.xs,
  },
  list: {
    padding: space.lg,
    gap: space.md,
  },
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  accent: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: space.lg,
    gap: space.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
  },
  title: {
    color: palette.text,
    fontSize: font.md,
    fontWeight: '900',
  },
  meta: {
    color: palette.muted,
    fontSize: font.body,
  },
  pgn: {
    color: palette.faint,
    fontSize: font.sm,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: font.tiny,
    fontWeight: '900',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: font.lg,
    fontWeight: '900',
  },
  emptyText: {
    color: palette.muted,
    fontSize: font.body,
    textAlign: 'center',
    marginTop: space.sm,
    maxWidth: 260,
  },
  pressed: {
    opacity: 0.72,
  },
});

