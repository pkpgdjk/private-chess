import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGameStore } from '@/store/gameStore';
import { useHistoryStore } from '@/store/historyStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCoachMemoryStore } from '@/store/coachMemoryStore';
import { MoveList } from '@/components/ui/MoveList';
import { ChessBoard } from '@/components/board/ChessBoard';
import { AccuracyGraph } from '@/components/ui/AccuracyGraph';
import { CoachMemoryCard } from '@/components/ui/CoachMemoryCard';
import {
  analyzeGameHistory,
  configureCoachProvider,
  getConfiguredCoachApiKey,
} from '@/ai/coachProvider';
import { colors } from '@/constants/colors';
import { palette, radius, shadow, space, font } from '@/constants/design';
import { qualityColor as qualityColors } from '@/constants/quality';
import type { MoveQuality, GameStoryResponse } from '@/types/chess';

const qualityWeights: Record<MoveQuality, number> = {
  brilliant: 100,
  excellent: 100,
  good: 80,
  inaccuracy: 50,
  mistake: 20,
  blunder: 0,
};

function buildPgn(
  history: { moveNumber: number; san: string; player: 'w' | 'b' }[],
  result: 'win' | 'loss' | 'draw' | null
): string {
  if (history.length === 0) {
    return result === 'win' ? '1-0' : result === 'loss' ? '0-1' : '1/2-1/2';
  }
  let pgn = '';
  for (let i = 0; i < history.length; i++) {
    const node = history[i];
    if (node.player === 'w') {
      pgn += `${node.moveNumber}. ${node.san}`;
    } else {
      pgn += ` ${node.san}`;
    }
    if (i < history.length - 1) {
      pgn += ' ';
    }
  }
  const pgnResult = result === 'win' ? '1-0' : result === 'loss' ? '0-1' : '1/2-1/2';
  pgn += ` ${pgnResult}`;
  return pgn;
}

export default function AnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id;
  const [isLoading, setIsLoading] = useState(true);
  const [story, setStory] = useState<GameStoryResponse | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [showPgnModal, setShowPgnModal] = useState(false);
  const storyInitiated = useRef<string>('');

  const history = useGameStore((state) => state.history);
  const result = useGameStore((state) => state.result);
  const playerColor = useGameStore((state) => state.playerColor);
  const jumpToMove = useGameStore((state) => state.jumpToMove);
  const resetGame = useGameStore((state) => state.resetGame);
  const loadGame = useGameStore((state) => state.loadGame);

  const games = useHistoryStore((state) => state.games);
  const getGame = useHistoryStore((state) => state.getGame);
  const loadGames = useHistoryStore((state) => state.loadGames);
  const memoryEntries = useCoachMemoryStore((state) => state.entries);
  const loadMemory = useCoachMemoryStore((state) => state.loadMemory);

  const apiKey = useSettingsStore((state) => state.apiKey);
  const openaiApiKey = useSettingsStore((state) => state.openaiApiKey);
  const coachProvider = useSettingsStore((state) => state.coachProvider);
  const coachLanguage = useSettingsStore((state) => state.coachLanguage);
  const coachModel = useSettingsStore((state) => state.coachModel);
  const coachEffort = useSettingsStore((state) => state.coachEffort);
  const activeCoachApiKey = getConfiguredCoachApiKey(coachProvider, apiKey, openaiApiKey);

  // Load coach memory
  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  // Load game data
  useEffect(() => {
    let mounted = true;
    async function init() {
      const gameId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : undefined;
      if (gameId) {
        if (games.length === 0) {
          await loadGames();
        }
        const savedGame = getGame(gameId);
        if (savedGame && mounted) {
          loadGame(savedGame);
        }
      }
      if (mounted) {
        setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [id, games.length, loadGames, getGame, loadGame]);

  // Generate AI story
  useEffect(() => {
    if (!activeCoachApiKey || history.length === 0) return;
    const gameId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : 'current';
    const cacheKey = `${gameId}-${history.length}`;
    if (storyInitiated.current === cacheKey) return;
    storyInitiated.current = cacheKey;

    setStoryLoading(true);
    configureCoachProvider(coachProvider, apiKey, openaiApiKey);
    analyzeGameHistory(coachProvider, history, coachLanguage, coachModel, coachEffort)
      .then((res) => {
        if (res.title !== 'Game Story Unavailable') {
          setStory(res);
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        setStoryLoading(false);
      });
  }, [activeCoachApiKey, apiKey, openaiApiKey, history, id, coachProvider, coachLanguage, coachModel, coachEffort]);

  const playerMoves = useMemo(() => {
    return history.filter((m) => m.player === playerColor);
  }, [history, playerColor]);

  const accuracy = useMemo(() => {
    if (playerMoves.length === 0) return 0;
    const total = playerMoves.reduce((sum, move) => {
      return sum + (qualityWeights[move.quality ?? 'good'] ?? 80);
    }, 0);
    return Math.round(total / playerMoves.length);
  }, [playerMoves]);

  const qualityCounts = useMemo(() => {
    const counts: Record<MoveQuality, number> = {
      brilliant: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    };
    playerMoves.forEach((m) => {
      if (m.quality) counts[m.quality]++;
    });
    return counts;
  }, [playerMoves]);

  const mistakes = useMemo(() => {
    return history
      .map((move, index) => ({ move, index }))
      .filter(
        ({ move }) =>
          move.player === playerColor &&
          (move.quality === 'blunder' || move.quality === 'mistake')
      );
  }, [history, playerColor]);

  const pgn = useMemo(() => buildPgn(history, result), [history, result]);

  const handleJumpToMistake = useCallback(
    (index: number) => {
      jumpToMove(index);
    },
    [jumpToMove]
  );

  const handleNewGame = useCallback(() => {
    resetGame(playerColor);
    router.replace('/game');
  }, [resetGame, playerColor, router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (history.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>No game data available</Text>
          <Pressable style={styles.btnPrimary} onPress={() => router.back()}>
            <Text style={styles.btnPrimaryText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Post-Game Analysis</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Mini Board */}
        <View style={styles.boardSection}>
          <ChessBoard onSquarePress={() => {}} />
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Game stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{history.length}</Text>
              <Text style={styles.statLabel}>Total Moves</Text>
            </View>
            <View style={styles.statItem}>
              <View
                style={[
                  styles.resultBadge,
                  {
                    backgroundColor:
                      result === 'win'
                        ? colors.success
                        : result === 'loss'
                        ? colors.danger
                        : colors.textMuted,
                  },
                ]}
              >
                <Text style={styles.resultBadgeText}>
                  {result === 'win' ? 'Win' : result === 'loss' ? 'Loss' : 'Draw'}
                </Text>
              </View>
              <Text style={styles.statLabel}>Result</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{accuracy}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        </View>

        {/* Accuracy Graph */}
        <View style={styles.card}>
          <AccuracyGraph history={history} playerColor={playerColor} onSelectMove={handleJumpToMistake} />
        </View>

        {/* Quality Distribution */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Move quality</Text>
          <View style={styles.qualityRow}>
            {(
              ['brilliant', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'] as MoveQuality[]
            ).map((q) => (
              <View key={q} style={styles.qualityItem}>
                <Text style={[styles.qualityCount, { color: qualityColors[q] }]}>
                  {qualityCounts[q]}
                </Text>
                <Text style={styles.qualityLabel}>
                  {q.charAt(0).toUpperCase() + q.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Mistake Review */}
        {mistakes.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Mistake review</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.mistakeScroll}
            >
              {mistakes.map(({ move, index }) => (
                <Pressable
                  key={index}
                  style={styles.mistakeCard}
                  onPress={() => handleJumpToMistake(index)}
                >
                  <Text style={styles.mistakeTitle}>
                    [{move.quality?.toUpperCase()}] Move {move.moveNumber}: {move.san}
                  </Text>
                  {move.aiCommentary ? (
                    <Text style={styles.mistakeCommentary} numberOfLines={3}>
                      {move.aiCommentary}
                    </Text>
                  ) : (
                    <Text style={styles.mistakeCommentary}>No commentary available.</Text>
                  )}
                  {move.stockfishBestMove && (
                    <Text style={styles.mistakeBestMove}>
                      Best: {move.stockfishBestMove}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Move List */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Move list</Text>
          <View style={styles.moveListWrapper}>
            <MoveList />
          </View>
        </View>

        {/* AI Story */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Game story</Text>
          {storyLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.storyLoader} />
          ) : story ? (
            <View>
              <Text style={styles.storyTitle}>{story.title}</Text>
              {story.phases.map((phase) => (
                <View key={phase.phase} style={styles.phaseBlock}>
                  <Text style={styles.phaseTitle}>
                    {phase.phase.charAt(0).toUpperCase() + phase.phase.slice(1)}
                  </Text>
                  <Text style={styles.phaseSummary}>{phase.summary}</Text>
                </View>
              ))}
              {story.overallAdvice ? (
                <Text style={styles.overallAdvice}>{story.overallAdvice}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.placeholderText}>
              Enable AI coaching to get full game narratives.
            </Text>
          )}
        </View>

        <CoachMemoryCard entries={memoryEntries} />

        {/* PGN Export */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PGN</Text>
          <Pressable style={styles.btnSecondary} onPress={() => setShowPgnModal(true)}>
            <Text style={styles.btnSecondaryText}>View PGN</Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.btnPrimary} onPress={handleNewGame}>
            <Text style={styles.btnPrimaryText}>New Game</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* PGN Modal */}
      <Modal
        visible={showPgnModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPgnModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Game PGN</Text>
            <ScrollView style={styles.pgnScroll}>
              <Text style={styles.pgnText} selectable>
                {pgn}
              </Text>
            </ScrollView>
            <Pressable style={styles.modalBtn} onPress={() => setShowPgnModal(false)}>
              <Text style={styles.modalBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.lg,
  },
  emptyText: {
    color: palette.muted,
    fontSize: font.md,
  },
  scrollContent: {
    padding: space.lg,
    gap: space.md,
    paddingBottom: space.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  backBtnText: {
    color: palette.text,
    fontSize: font.lg,
    fontWeight: '900',
  },
  headerTitle: {
    color: palette.text,
    fontSize: font.lg,
    fontWeight: '900',
  },
  boardSection: {
    alignItems: 'center',
    marginVertical: space.xs,
  },
  card: {
    backgroundColor: palette.panel,
    borderRadius: radius.xl,
    padding: space.lg,
    gap: space.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: font.md,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: palette.text,
    fontSize: font.xl,
    fontWeight: '900',
  },
  statLabel: {
    color: palette.muted,
    fontSize: font.sm,
  },
  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  resultBadgeText: {
    color: palette.bg,
    fontSize: font.body,
    fontWeight: '900',
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  qualityItem: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  qualityCount: {
    fontSize: 18,
    fontWeight: '900',
  },
  qualityLabel: {
    color: palette.muted,
    fontSize: font.tiny,
    textTransform: 'capitalize',
  },
  mistakeScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  mistakeCard: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: space.md,
    marginRight: space.md,
    width: 260,
    gap: space.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  mistakeTitle: {
    color: palette.red,
    fontSize: font.sm,
    fontWeight: '900',
  },
  mistakeCommentary: {
    color: palette.muted,
    fontSize: font.sm,
    lineHeight: 18,
  },
  mistakeBestMove: {
    color: palette.green,
    fontSize: font.sm,
    fontWeight: '900',
  },
  moveListWrapper: {
    height: 160,
  },
  storyLoader: {
    marginVertical: 12,
  },
  storyTitle: {
    color: palette.text,
    fontSize: font.md,
    fontWeight: '900',
    marginBottom: space.sm,
  },
  phaseBlock: {
    marginBottom: space.md,
    gap: 2,
  },
  phaseTitle: {
    color: palette.primary,
    fontSize: font.sm,
    fontWeight: '900',
  },
  phaseSummary: {
    color: palette.muted,
    fontSize: font.sm,
    lineHeight: 20,
  },
  overallAdvice: {
    color: palette.text,
    fontSize: font.sm,
    lineHeight: 20,
    marginTop: 4,
    fontStyle: 'italic',
  },
  placeholderText: {
    color: palette.muted,
    fontSize: font.sm,
    lineHeight: 20,
  },
  btnPrimary: {
    backgroundColor: palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.lg,
    alignItems: 'center',
    flex: 1,
  },
  btnPrimaryText: {
    color: palette.bg,
    fontSize: font.md,
    fontWeight: '900',
  },
  btnSecondary: {
    backgroundColor: palette.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,17,27,0.86)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
  },
  modalContent: {
    backgroundColor: palette.panel,
    borderRadius: radius.xl,
    padding: space.xl,
    width: '100%',
    maxHeight: '80%',
    gap: space.md,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    ...shadow.soft,
  },
  modalTitle: {
    color: palette.text,
    fontSize: font.lg,
    fontWeight: '900',
    textAlign: 'center',
  },
  pgnScroll: {
    maxHeight: 300,
  },
  pgnText: {
    color: palette.text,
    fontSize: font.sm,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  modalBtn: {
    backgroundColor: palette.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  modalBtnText: {
    color: palette.bg,
    fontSize: font.body,
    fontWeight: '900',
  },
});
