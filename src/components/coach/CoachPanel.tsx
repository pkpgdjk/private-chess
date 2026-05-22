import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useGameStore } from '@/store/gameStore';
import { MoveAnalysisCard } from './MoveAnalysisCard';
import { GameStoryView } from './GameStoryView';
import { FollowUpInput } from './FollowUpInput';
import { palette, radius, space, font } from '@/constants/design';
import { askFollowUp, configureCoachProvider, getConfiguredCoachApiKey } from '@/ai/coachProvider';
import { useSettingsStore } from '@/store/settingsStore';

type Tab = 'current' | 'story' | 'mistakes';

const TABS: { key: Tab; label: string }[] = [
  { key: 'current', label: 'Current Move' },
  { key: 'story', label: 'Game Story' },
  { key: 'mistakes', label: 'Mistakes' },
];

export const CoachPanel = React.memo(() => {
  const [activeTab, setActiveTab] = useState<Tab>('current');
  const coachMessage = useGameStore((state) => state.coachMessage);
  const history = useGameStore((state) => state.history);
  const currentMoveIndex = useGameStore((state) => state.currentMoveIndex);
  const fen = useGameStore((state) => state.fen);
  const coachProvider = useSettingsStore((state) => state.coachProvider);
  const apiKey = useSettingsStore((state) => state.apiKey);
  const openaiApiKey = useSettingsStore((state) => state.openaiApiKey);
  const coachLanguage = useSettingsStore((state) => state.coachLanguage);
  const coachModel = useSettingsStore((state) => state.coachModel);
  const coachEffort = useSettingsStore((state) => state.coachEffort);

  const handleFollowUp = useCallback(
    async (text: string) => {
      const moveHistory = history.map((m) => m.san);
      try {
        const activeApiKey = getConfiguredCoachApiKey(coachProvider, apiKey, openaiApiKey);
        if (!activeApiKey) return;
        configureCoachProvider(coachProvider, apiKey, openaiApiKey);
        await askFollowUp(coachProvider, text, {
          fen,
          moveHistory,
          language: coachLanguage,
          model: coachModel,
          effort: coachEffort,
        });
      } catch {
        // Silently ignore — the parent agent said "DO NOT: Make actual API calls"
        // but the component should still wire up the callback
      }
    },
    [fen, history, coachProvider, apiKey, openaiApiKey, coachLanguage, coachModel, coachEffort]
  );

  const mistakeMoves = React.useMemo(() => {
    return history.filter(
      (m) => m.quality === 'mistake' || m.quality === 'blunder'
    );
  }, [history]);

  const renderContent = () => {
    switch (activeTab) {
      case 'current':
        return <MoveAnalysisCard />;
      case 'story':
        return <GameStoryView />;
      case 'mistakes':
        return (
          <View style={styles.mistakesContainer}>
            {mistakeMoves.length === 0 ? (
              <Text style={styles.emptyText}>No mistakes yet. Clean game.</Text>
            ) : (
              mistakeMoves.map((move, index) => (
                <View key={index} style={styles.mistakeRow}>
                  <Text style={styles.mistakeText}>
                    {move.moveNumber}. {move.san}
                  </Text>
                  {move.aiCommentary && (
                    <Text style={styles.mistakeCommentary} numberOfLines={2}>
                      {move.aiCommentary.length > 100
                        ? move.aiCommentary.slice(0, 100) + '...'
                        : move.aiCommentary}
                    </Text>
                  )}
                </View>
              ))
            )}
            <FollowUpInput onSubmit={handleFollowUp} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <BottomSheet
      snapPoints={['15%', '40%', '70%']}
      index={0}
      backgroundStyle={{ backgroundColor: palette.panel }}
      handleIndicatorStyle={{ backgroundColor: palette.faint }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.container}>
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.content}>{renderContent()}</View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
    gap: space.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: palette.primary,
  },
  tabText: {
    color: palette.muted,
    fontSize: font.sm,
    fontWeight: '800',
  },
  tabTextActive: {
    color: palette.bg,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    minHeight: 200,
  },
  mistakesContainer: {
    padding: space.lg,
    flex: 1,
  },
  emptyText: {
    color: palette.muted,
    fontSize: font.body,
    textAlign: 'center',
    paddingVertical: space.xxl,
  },
  mistakeRow: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: space.sm,
  },
  mistakeText: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: '900',
  },
  mistakeCommentary: {
    color: palette.muted,
    fontSize: font.sm,
    marginTop: space.xs,
    lineHeight: 18,
  },
});
