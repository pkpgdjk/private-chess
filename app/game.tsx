import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/ui/EvalBar';
import { CapturedPieces } from '@/components/ui/CapturedPieces';
import { MoveList } from '@/components/ui/MoveList';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useHistoryStore } from '@/store/historyStore';
import { useCoachMemoryStore } from '@/store/coachMemoryStore';
import { useRouter } from 'expo-router';
import { useStockfishEngine } from '@/engine/stockfish';
import { colors } from '@/constants/colors';
import { palette, radius, shadow, space, font } from '@/constants/design';
import { getOpeningName } from '@/constants/openings';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { qualityColor } from '@/constants/quality';
import { FollowUpInput } from '@/components/coach/FollowUpInput';
import { ChessText } from '@/components/coach/ChessText';
import {
  askFollowUp,
  analyzeGameHistory,
  configureCoachProvider,
  getCoachProviderLabel,
  getConfiguredCoachApiKey,
} from '@/ai/coachProvider';
import type { SavedGame, MoveNode } from '@/types/chess';

const { width, height } = Dimensions.get('window');
const isNarrow = width < 700;
const boardSize = Math.min(width, height) * 0.92;

function buildPgn(history: MoveNode[], result: 'win' | 'loss' | 'draw'): string {
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
    if (i < history.length - 1) pgn += ' ';
  }

  const pgnResult = result === 'win' ? '1-0' : result === 'loss' ? '0-1' : '1/2-1/2';
  pgn += ` ${pgnResult}`;
  return pgn;
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.min(insets.top, 56);

  // Game state
  const fen = useGameStore((s) => s.fen);
  const turn = useGameStore((s) => s.turn);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const result = useGameStore((s) => s.result);
  const playerColor = useGameStore((s) => s.playerColor);
  const history = useGameStore((s) => s.history);
  const makeBotMove = useGameStore((s) => s.makeBotMove);
  const undoMove = useGameStore((s) => s.undoMove);
  const resetGame = useGameStore((s) => s.resetGame);
  const setCurrentEval = useGameStore((s) => s.setCurrentEval);
  const pendingMove = useGameStore((s) => s.pendingMove);
  const confirmPendingMove = useGameStore((s) => s.confirmPendingMove);
  const cancelPendingMove = useGameStore((s) => s.cancelPendingMove);
  const currentEval = useGameStore((s) => s.currentEval);
  const isSimulationMode = useGameStore((s) => s.isSimulationMode);
  const startSimulation = useGameStore((s) => s.startSimulation);
  const exitSimulation = useGameStore((s) => s.exitSimulation);
  const promoteSimulationToMain = useGameStore((s) => s.promoteSimulationToMain);
  const setHint = useGameStore((s) => s.setHint);
  const pendingPromotion = useGameStore((s) => s.pendingPromotion);
  const confirmPromotion = useGameStore((s) => s.confirmPromotion);
  const cancelPromotion = useGameStore((s) => s.cancelPromotion);

  // Settings
  const allowUndo = useSettingsStore((s) => s.allowUndo);
  const hintButton = useSettingsStore((s) => s.hintButton);
  const flipBoard = useSettingsStore((s) => s.flipBoard);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const botStrength = useSettingsStore((s) => s.botStrength);
  const botTimeMs = useSettingsStore((s) => s.botTimeMs);
  const autoSaveGames = useSettingsStore((s) => s.autoSaveGames);
  const zenMode = useSettingsStore((s) => s.zenMode);
  const blunderShield = useSettingsStore((s) => s.blunderShield);
  const moveConfirmation = useSettingsStore((s) => s.moveConfirmation);
  const showOpeningName = useSettingsStore((s) => s.showOpeningName);
  const realTimeCoach = useSettingsStore((s) => s.realTimeCoach);
  const coachLanguage = useSettingsStore((s) => s.coachLanguage);
  const coachProvider = useSettingsStore((s) => s.coachProvider);
  const coachModel = useSettingsStore((s) => s.coachModel);
  const coachEffort = useSettingsStore((s) => s.coachEffort);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const openaiApiKey = useSettingsStore((s) => s.openaiApiKey);
  const activeCoachApiKey = getConfiguredCoachApiKey(coachProvider, apiKey, openaiApiKey);

  // Coach state
  const coachMessage = useGameStore((s) => s.coachMessage);
  const coachMessageType = useGameStore((s) => s.coachMessageType);
  const isAnalyzing = useGameStore((s) => s.isAnalyzing);
  const [coachExpanded, setCoachExpanded] = useState(false);
  const [followUp, setFollowUp] = useState<{ q: string; a: string | null; loading: boolean } | null>(null);

  // The "analyzed move" is the player's move. After the bot replies, the
  // player's move lives at history[length-2].
  const lastNode = history.length > 0 ? history[history.length - 1] : null;
  const analyzedIdx =
    lastNode && lastNode.player !== playerColor && history.length >= 2
      ? history.length - 2
      : history.length - 1;
  const analyzedMove = analyzedIdx >= 0 ? history[analyzedIdx] : null;
  const botReply =
    lastNode && lastNode.player !== playerColor && history.length >= 2
      ? lastNode
      : null;

  // History
  const saveGame = useHistoryStore((s) => s.saveGame);
  const recordCoachMemory = useCoachMemoryStore((s) => s.recordGame);

  // Router
  const router = useRouter();

  // Engine
  const { webView, initEngine, getBestMove, evaluatePosition } = useStockfishEngine();
  const [botThinking, setBotThinking] = useState(false);

  // AI coach (mounts realTimeCoach + coachLevel effects)
  useAIAnalysis();

  // Modals + banners
  const [showGameOver, setShowGameOver] = useState(false);
  const [blunderWarning, setBlunderWarning] = useState<{ move: string } | null>(null);
  const [gameOverSummary, setGameOverSummary] = useState<{ title: string; recap: string } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Initialize engine on mount (no-op for pure-JS engine but kept for symmetry).
  useEffect(() => {
    initEngine().catch(console.error);
  }, [initEngine]);

  // Post-move blunder check — runs *after* the player's move is on the board,
  // so the piece moves instantly and the check happens in the background.
  // If a blunder is detected, we surface a non-blocking banner with Undo.
  const evalBeforeMoveRef = useRef(0);
  const lastCheckedIdxRef = useRef(-1);

  // While it's the player's turn, snapshot the current eval so we know the
  // "before" value when they finally move.
  useEffect(() => {
    if (turn === playerColor && !isGameOver) {
      evalBeforeMoveRef.current = currentEval;
    }
  }, [turn, currentEval, playerColor, isGameOver]);

  useEffect(() => {
    if (!blunderShield) return;
    if (history.length === 0) return;
    const lastIdx = history.length - 1;
    if (lastIdx === lastCheckedIdxRef.current) return;
    const last = history[lastIdx];
    if (last.player !== playerColor) return;
    lastCheckedIdxRef.current = lastIdx;

    (async () => {
      try {
        const after = await evaluatePosition(fen);
        const beforeCp = evalBeforeMoveRef.current * 100;
        const signed =
          playerColor === 'w'
            ? (beforeCp - after.eval) / 100
            : (after.eval - beforeCp) / 100;

        if (signed > 2.5) {
          setBlunderWarning({ move: last.san });
        }
      } catch {
        // ignore — blunder check is best-effort
      }
    })();
  }, [history, blunderShield, fen, playerColor, evaluatePosition]);

  // Auto-dismiss the warning after 6s in case the user ignores it.
  useEffect(() => {
    if (!blunderWarning) return;
    const t = setTimeout(() => setBlunderWarning(null), 6000);
    return () => clearTimeout(t);
  }, [blunderWarning]);

  // Bot move logic — runs whenever it's the bot's turn.
  useEffect(() => {
    if (isGameOver || isSimulationMode) return;
    if (turn === playerColor) return;

    let cancelled = false;
    setBotThinking(true);
    getBestMove(fen, botTimeMs, botStrength)
      .then(({ bestMove, eval: evalCp }) => {
        if (cancelled) return;
        if (bestMove) {
          makeBotMove(bestMove);
          setCurrentEval(evalCp / 100, []);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setBotThinking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [turn, isGameOver, isSimulationMode, playerColor, fen, botTimeMs, botStrength, getBestMove, makeBotMove, setCurrentEval]);

  // Game over modal
  useEffect(() => {
    if (isGameOver) {
      const timer = setTimeout(() => setShowGameOver(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isGameOver]);

  // Fetch AI recap when the game ends.
  const recapFetchedRef = useRef(false);
  useEffect(() => {
    if (!isGameOver) {
      recapFetchedRef.current = false;
      setGameOverSummary(null);
      return;
    }
    if (recapFetchedRef.current) return;
    if (!activeCoachApiKey) return;
    if (history.length < 4) return; // too short to recap meaningfully
    recapFetchedRef.current = true;
    setSummaryLoading(true);

    (async () => {
      try {
        configureCoachProvider(coachProvider, apiKey, openaiApiKey);
        const story = await analyzeGameHistory(coachProvider, history, coachLanguage, coachModel, coachEffort);
        const recap = story.phases[0]?.summary ?? story.overallAdvice ?? '';
        setGameOverSummary({ title: story.title, recap });
      } catch {
        // Best-effort — silently skip if recap fails.
      } finally {
        setSummaryLoading(false);
      }
    })();
  }, [isGameOver, activeCoachApiKey, apiKey, openaiApiKey, history, coachProvider, coachLanguage, coachModel, coachEffort]);

  // Auto-save on game over
  const hasAutoSaved = useRef(false);
  const hasRecordedMemory = useRef(false);
  useEffect(() => {
    if (!isGameOver) {
      hasAutoSaved.current = false;
      hasRecordedMemory.current = false;
      return;
    }
    if (!hasRecordedMemory.current && history.length > 0) {
      hasRecordedMemory.current = true;
      void recordCoachMemory(history, playerColor);
    }
    if (hasAutoSaved.current || !result || !autoSaveGames) return;
    hasAutoSaved.current = true;

    const pgn = buildPgn(history, result);
    const savedGame: SavedGame = {
      id: Date.now().toString(36),
      date: Date.now(),
      pgn,
      result,
      playerColor,
      botStrength,
      coachMessages: JSON.stringify(history.map((h) => h.aiCommentary)),
      moveHistory: history,
    };
    saveGame(savedGame);
  }, [isGameOver, result, autoSaveGames, history, playerColor, botStrength, saveGame, recordCoachMemory]);

  // Hint — sets a move in the store; ChessBoard draws an arrow overlay.
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleHint = useCallback(async () => {
    try {
      const { bestLine } = await evaluatePosition(fen);
      if (bestLine.length > 0) {
        setHint(bestLine[0]);
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        hintTimerRef.current = setTimeout(() => setHint(null), 4000);
      }
    } catch (e) {
      console.error('Hint error:', e);
    }
  }, [fen, evaluatePosition, setHint]);

  const handleUndoBlunder = useCallback(() => {
    setBlunderWarning(null);
    undoMove();
  }, [undoMove]);

  const handleNewGame = useCallback(() => {
    setShowGameOver(false);
    resetGame(playerColor);
  }, [resetGame, playerColor]);

  const handleFlip = useCallback(() => {
    updateSetting('flipBoard', !flipBoard);
  }, [flipBoard, updateSetting]);

  const isPlayerTurn = turn === playerColor;
  const openingName = showOpeningName ? getOpeningName(history.map((h) => h.san)) : null;

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: insets.bottom }]}>
      {/* Hidden Stockfish WebView */}
      {webView}

      {/* Top Bar — status + controls */}
      {!zenMode && (
        <View style={styles.topBar}>
          <View style={styles.statusPill}>
            {botThinking ? (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.statusText}>Bot is thinking</Text>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.turnDot,
                    { backgroundColor: turn === 'w' ? colors.text : colors.background },
                  ]}
                />
                <Text style={styles.statusText}>
                  {isPlayerTurn ? 'Your move' : "Bot's move"}
                </Text>
              </>
            )}
          </View>

          <View style={styles.controls}>
            {allowUndo && (
              <Pressable
                style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
                onPress={undoMove}
              >
                <Text style={styles.controlText}>↶</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
              onPress={handleFlip}
            >
              <Text style={styles.controlText}>⇅</Text>
            </Pressable>
            {hintButton && (
              <Pressable
                style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
                onPress={handleHint}
              >
                <Text style={styles.controlText}>?</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
              onPress={() => resetGame(playerColor)}
            >
              <Text style={styles.controlText}>↺</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Move-confirmation bar (only when blunderShield is off) */}
      {pendingMove && moveConfirmation && !blunderShield && (
        <View style={styles.confirmBar}>
          <Text style={styles.confirmText}>
            Play {pendingMove.from} to {pendingMove.to}?
          </Text>
          <View style={styles.confirmButtons}>
            <Pressable
              style={[styles.confirmBtn, styles.confirmBtnCancel]}
              onPress={cancelPendingMove}
            >
              <Text style={styles.confirmBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, styles.confirmBtnOk]}
              onPress={confirmPendingMove}
            >
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Simulation Banner */}
      {isSimulationMode && (
        <View style={styles.simulationBanner}>
          <Text style={styles.simulationBannerText}>Simulation</Text>
          <View style={styles.simulationBannerButtons}>
            <Pressable style={styles.simulationBannerBtn} onPress={exitSimulation}>
              <Text style={styles.simulationBannerBtnText}>Return</Text>
            </Pressable>
            <Pressable style={styles.simulationBannerBtn} onPress={promoteSimulationToMain}>
              <Text style={styles.simulationBannerBtnText}>Make Main Line</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Opening name pill */}
        {openingName && !zenMode && (
          <View style={styles.openingPill}>
            <Text style={styles.openingText}>{openingName}</Text>
          </View>
        )}

        {/* Opponent captured row */}
        {!zenMode && <CapturedPieces fen={fen} side={playerColor === 'w' ? 'b' : 'w'} />}

        {/* Board */}
        <View style={[styles.boardArea, isNarrow && styles.boardAreaNarrow]}>
          {!isNarrow && !zenMode && <EvalBar boardSize={boardSize} />}
          <View style={styles.boardWrapper}>
            {isNarrow && !zenMode && <EvalBar horizontal boardSize={boardSize} />}
            <ChessBoard />
          </View>
          {!isNarrow && !zenMode && <MoveList onExploreMove={(i) => startSimulation(i)} />}
        </View>

        {/* Player captured row */}
        {!zenMode && <CapturedPieces fen={fen} side={playerColor} />}

        {/* Coach card */}
        {realTimeCoach && !zenMode && (
          <CoachCard
            analyzedMove={analyzedMove}
            analyzedIdx={analyzedIdx}
            botReply={botReply}
            isAnalyzing={isAnalyzing}
            apiKey={activeCoachApiKey}
            anthropicApiKey={apiKey}
            openaiApiKey={openaiApiKey}
            coachMessage={coachMessage}
            coachMessageType={coachMessageType}
            coachExpanded={coachExpanded}
            setCoachExpanded={setCoachExpanded}
            followUp={followUp}
            setFollowUp={setFollowUp}
            startSimulation={startSimulation}
            fen={fen}
            historyForFollowUp={history.map((h) => h.san)}
            coachLanguage={coachLanguage}
            coachProvider={coachProvider}
            coachModel={coachModel}
            coachEffort={coachEffort}
          />
        )}

        {/* Move list on narrow */}
        {isNarrow && !zenMode && <MoveList onExploreMove={(i) => startSimulation(i)} />}
      </ScrollView>

      {/* Blunder warning banner (non-blocking) */}
      {blunderWarning && (
        <View style={styles.blunderBanner}>
          <Text style={styles.blunderText}>
            {blunderWarning.move} may be a blunder
          </Text>
          <View style={styles.blunderButtons}>
            <Pressable
              style={[styles.blunderBtn, styles.blunderBtnUndo]}
              onPress={handleUndoBlunder}
            >
              <Text style={styles.blunderBtnText}>Undo</Text>
            </Pressable>
            <Pressable
              style={styles.blunderBtn}
              onPress={() => setBlunderWarning(null)}
            >
              <Text style={styles.blunderBtnTextGhost}>Keep</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Promotion picker */}
      <Modal
        visible={!!pendingPromotion}
        transparent
        animationType="fade"
        onRequestClose={cancelPromotion}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Promote to</Text>
            <View style={styles.promoRow}>
              {(['q', 'r', 'b', 'n'] as const).map((p) => (
                <Pressable
                  key={p}
                  style={({ pressed }) => [styles.promoBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => confirmPromotion(p)}
                >
                  <Text style={styles.promoGlyph}>
                    {playerColor === 'w'
                      ? { q: '♕', r: '♖', b: '♗', n: '♘' }[p]
                      : { q: '♛', r: '♜', b: '♝', n: '♞' }[p]}
                  </Text>
                  <Text style={styles.promoLabel}>
                    {{ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[p]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnGhost]}
              onPress={cancelPromotion}
            >
              <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Game Over */}
      <Modal
        visible={showGameOver}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGameOver(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>
              {result === 'win' && '1-0'}
              {result === 'loss' && '0-1'}
              {result === 'draw' && '1/2'}
            </Text>
            <Text style={styles.modalTitle}>
              {result === 'win' && 'Checkmate. You win.'}
              {result === 'loss' && 'You Were Checkmated'}
              {result === 'draw' && 'Drawn Game'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {history.length} {history.length === 1 ? 'move' : 'moves'} played
            </Text>

            {/* AI recap */}
            {summaryLoading && (
              <View style={styles.coachRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.coachThinking}>
                  {coachLanguage === 'th' ? 'กำลังสรุปเกม' : 'Generating recap'}
                </Text>
              </View>
            )}
            {gameOverSummary && (
              <View style={styles.recapBox}>
                <Text style={styles.recapTitle}>"{gameOverSummary.title}"</Text>
                <ChessText style={styles.recapBody}>
                  {gameOverSummary.recap}
                </ChessText>
              </View>
            )}

            <Pressable style={styles.modalBtn} onPress={handleNewGame}>
              <Text style={styles.modalBtnText}>
                {coachLanguage === 'th' ? 'เกมใหม่' : 'New Game'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={() => {
                setShowGameOver(false);
                router.push('/analysis');
              }}
            >
              <Text style={styles.modalBtnTextSecondary}>Review Game</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnGhost]}
              onPress={() => {
                setShowGameOver(false);
                router.replace('/');
              }}
            >
              <Text style={styles.modalBtnTextSecondary}>Back to Menu</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ----------------------------------------------------------------------------
// CoachCard — reads the analyzed move, renders commentary, "Try this position",
// and a follow-up input. Pulled out so the main GameScreen stays readable.
// ----------------------------------------------------------------------------

interface CoachCardProps {
  analyzedMove: MoveNode | null;
  analyzedIdx: number;
  botReply: MoveNode | null;
  isAnalyzing: boolean;
  apiKey: string;
  anthropicApiKey: string;
  openaiApiKey: string;
  coachMessage: string | null;
  coachMessageType: 'info' | 'warning' | 'praise' | 'blunder' | null;
  coachExpanded: boolean;
  setCoachExpanded: (v: boolean) => void;
  followUp: { q: string; a: string | null; loading: boolean } | null;
  setFollowUp: (v: { q: string; a: string | null; loading: boolean } | null) => void;
  startSimulation: (fromMoveIndex: number) => void;
  fen: string;
  historyForFollowUp: string[];
  coachLanguage: 'en' | 'th';
  coachProvider: 'anthropic' | 'openai';
  coachModel: 'haiku' | 'sonnet' | 'gpt-mini' | 'gpt';
  coachEffort: 'low' | 'medium' | 'high';
}

function CoachCard({
  analyzedMove,
  analyzedIdx,
  botReply,
  isAnalyzing,
  apiKey,
  anthropicApiKey,
  openaiApiKey,
  coachMessage,
  coachMessageType,
  coachExpanded,
  setCoachExpanded,
  followUp,
  setFollowUp,
  startSimulation,
  fen,
  historyForFollowUp,
  coachLanguage,
  coachProvider,
  coachModel,
  coachEffort,
}: CoachCardProps) {
  const handleTryPosition = useCallback(() => {
    if (analyzedIdx < 0) return;
    // Drop into simulation at the position *before* the player's move,
    // so they can try the better alternative.
    startSimulation(analyzedIdx - 1);
  }, [analyzedIdx, startSimulation]);

  const handleFollowUp = useCallback(
    async (question: string) => {
      if (!apiKey) {
        setFollowUp({ q: question, a: `Set your ${getCoachProviderLabel(coachProvider)} API key in Settings first.`, loading: false });
        return;
      }
      setFollowUp({ q: question, a: null, loading: true });
      try {
        configureCoachProvider(coachProvider, anthropicApiKey, openaiApiKey);
        const answer = await askFollowUp(coachProvider, question, {
          fen,
          moveHistory: historyForFollowUp,
          language: coachLanguage,
          model: coachModel,
          effort: coachEffort,
        });
        setFollowUp({ q: question, a: answer, loading: false });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown error';
        setFollowUp({ q: question, a: `Couldn't answer: ${msg}`, loading: false });
      }
    },
    [apiKey, anthropicApiKey, openaiApiKey, fen, historyForFollowUp, setFollowUp, coachLanguage, coachProvider, coachModel, coachEffort]
  );

  const handleWhyBotMove = useCallback(() => {
    if (!botReply) return;
    const question =
      coachLanguage === 'th'
        ? `ทำไมบอทถึงเดิน ${botReply.san}? อธิบายแผนและสิ่งที่ต้องระวังแบบสั้นๆ`
        : `Why did the bot play ${botReply.san}? Explain its plan and what I should watch for.`;
    void handleFollowUp(question);
  }, [botReply, coachLanguage, handleFollowUp]);

  const hasBetterMove = !!analyzedMove?.stockfishBestMove && analyzedMove.quality !== 'brilliant' && analyzedMove.quality !== 'excellent';

  return (
    <View style={styles.coachCard}>
      <View style={styles.coachHeader}>
        <Text style={styles.coachTitle}>Coach</Text>
        {analyzedMove?.quality && analyzedMove.aiCommentary && (
          <View
            style={[
              styles.coachQualityBadge,
              { backgroundColor: qualityColor[analyzedMove.quality] },
            ]}
          >
            <Text style={styles.coachQualityText}>{analyzedMove.quality}</Text>
          </View>
        )}
      </View>

      {isAnalyzing ? (
        <View style={styles.coachRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.coachThinking}>
            {coachLanguage === 'th' ? 'กำลังวิเคราะห์' : 'Analyzing the exchange'}
          </Text>
        </View>
      ) : !apiKey ? (
        <Text style={styles.coachHint}>
          {coachLanguage === 'th'
            ? `ใส่ ${getCoachProviderLabel(coachProvider)} API key ใน Settings เพื่อเปิดใช้โค้ช`
            : `Add your ${getCoachProviderLabel(coachProvider)} API key in Settings to enable coaching`}
        </Text>
      ) : !coachMessage ? (
        <Text style={styles.coachHint}>
          {coachLanguage === 'th'
            ? 'เดินหมากดูสิ เดี๋ยวอธิบายให้หลังบอทตอบ'
            : "Make a move. I'll explain it after the bot replies."}
        </Text>
      ) : (
        <>
          <ChessText
            style={[
              styles.coachMessage,
              coachMessageType === 'blunder' && { color: colors.danger },
              coachMessageType === 'praise' && { color: colors.success },
            ]}
            numberOfLines={coachExpanded ? undefined : 3}
          >
            {coachExpanded && analyzedMove?.aiCommentary
              ? analyzedMove.aiCommentary
              : coachMessage}
          </ChessText>

          {analyzedMove?.aiCommentary && analyzedMove.aiCommentary !== coachMessage && (
            <Pressable onPress={() => setCoachExpanded(!coachExpanded)}>
              <Text style={styles.coachExpand}>
                {coachExpanded
                  ? coachLanguage === 'th' ? 'ย่อ ▲' : 'Show less ▲'
                  : coachLanguage === 'th' ? 'อ่านต่อ ▼' : 'Read more ▼'}
              </Text>
            </Pressable>
          )}

          {botReply && (
            <View style={styles.botReplyBox}>
              <Text style={styles.botReplyHeader}>
                {coachLanguage === 'th' ? `บอทตอบ: ${botReply.san}` : `Bot replied: ${botReply.san}`}
              </Text>
              {analyzedMove?.botReplyExplanation && (
                <ChessText style={styles.botReplyText}>{analyzedMove.botReplyExplanation}</ChessText>
              )}
              <Pressable
                onPress={handleWhyBotMove}
                style={({ pressed }) => [styles.whyBotBtn, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.whyBotText}>
                  {coachLanguage === 'th' ? 'ทำไมเดินนี้?' : 'Why this move?'}
                </Text>
              </Pressable>
            </View>
          )}

          {analyzedMove?.tags && analyzedMove.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {analyzedMove.tags.map((t: string) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {hasBetterMove && (
            <Pressable
              onPress={handleTryPosition}
              style={({ pressed }) => [
                styles.tryBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.tryBtnText}>
                {coachLanguage === 'th'
                  ? `▶ ลองเดิน ${analyzedMove?.stockfishBestMove} แทน`
                  : `▶ Try ${analyzedMove?.stockfishBestMove} instead`}
              </Text>
            </Pressable>
          )}

          {/* Follow-up Q&A */}
          {followUp && (
            <View style={styles.followUpBox}>
              <Text style={styles.followUpQ}>
                {coachLanguage === 'th' ? `คุณ: ${followUp.q}` : `You: ${followUp.q}`}
              </Text>
              {followUp.loading ? (
                <View style={styles.coachRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.coachThinking}>
                    {coachLanguage === 'th' ? 'โค้ชกำลังคิด' : 'Coach is thinking'}
                  </Text>
                </View>
              ) : (
                <ChessText style={styles.followUpA}>
                  {coachLanguage === 'th' ? `โค้ช: ${followUp.a}` : `Coach: ${followUp.a}`}
                </ChessText>
              )}
            </View>
          )}

          <FollowUpInput onSubmit={handleFollowUp} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: space.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.panel,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    gap: space.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  turnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  statusText: {
    color: palette.text,
    fontSize: font.sm,
    fontWeight: '800',
  },
  controls: {
    flexDirection: 'row',
    gap: space.sm,
  },
  controlBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  controlBtnPressed: {
    backgroundColor: palette.cardAlt,
    transform: [{ scale: 0.94 }],
  },
  controlText: {
    fontSize: 17,
    color: palette.text,
    fontWeight: '900',
  },
  boardArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: space.sm,
    gap: space.sm,
  },
  boardAreaNarrow: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  boardWrapper: {
    position: 'relative',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,17,27,0.86)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.xl,
  },
  modalContent: {
    backgroundColor: palette.panel,
    padding: space.xl,
    borderRadius: radius.xl,
    alignItems: 'center',
    minWidth: 280,
    gap: 10,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    ...shadow.soft,
  },
  modalEmoji: {
    color: palette.primary,
    fontSize: font.xl,
    fontWeight: '900',
    marginBottom: space.xs,
  },
  modalTitle: {
    color: palette.text,
    fontSize: font.lg,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: palette.muted,
    fontSize: font.body,
    marginBottom: space.sm,
    textAlign: 'center',
  },
  modalBtn: {
    backgroundColor: palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  modalBtnSecondary: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modalBtnGhost: {
    backgroundColor: 'transparent',
  },
  modalBtnText: {
    color: palette.bg,
    fontSize: font.md,
    fontWeight: '900',
  },
  modalBtnTextSecondary: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: '800',
  },
  simulationBanner: {
    backgroundColor: palette.tealSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: space.md,
    borderRadius: radius.lg,
    marginTop: space.xs,
    borderWidth: 1,
    borderColor: palette.teal,
  },
  simulationBannerText: {
    color: palette.teal,
    fontWeight: '900',
    fontSize: font.body,
  },
  simulationBannerButtons: {
    flexDirection: 'row',
    gap: space.sm,
  },
  simulationBannerBtn: {
    backgroundColor: palette.panel,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  simulationBannerBtnText: {
    color: palette.text,
    fontSize: font.sm,
    fontWeight: '800',
  },
  confirmBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.panel,
    marginHorizontal: space.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: space.xs,
  },
  confirmText: { color: palette.text, fontSize: font.body, fontWeight: '800' },
  confirmButtons: { flexDirection: 'row', gap: space.sm },
  confirmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  confirmBtnOk: { backgroundColor: palette.green },
  confirmBtnCancel: { backgroundColor: palette.cardAlt },
  confirmBtnText: { color: palette.bg, fontWeight: '900', fontSize: font.sm },
  promoRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginVertical: space.sm,
  },
  promoBtn: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 70,
  },
  promoGlyph: {
    fontSize: 36,
    color: palette.text,
  },
  promoLabel: {
    fontSize: font.tiny,
    color: palette.muted,
    marginTop: space.xs,
    fontWeight: '800',
  },
  coachCard: {
    backgroundColor: palette.panel,
    marginHorizontal: space.md,
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    gap: space.sm,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coachTitle: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: '900',
  },
  coachQualityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  coachQualityText: {
    color: palette.bg,
    fontSize: font.tiny,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  coachThinking: {
    color: palette.muted,
    fontSize: font.sm,
  },
  coachHint: {
    color: palette.muted,
    fontSize: font.body,
  },
  coachMessage: {
    color: palette.text,
    fontSize: font.body,
    lineHeight: 22,
  },
  coachExpand: {
    color: palette.primary,
    fontSize: font.sm,
    fontWeight: '900',
    marginTop: space.xs,
  },
  botReplyBox: {
    marginTop: space.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: palette.teal,
  },
  botReplyHeader: {
    color: palette.text,
    fontSize: font.sm,
    fontWeight: '900',
    marginBottom: 2,
  },
  botReplyText: {
    color: palette.muted,
    fontSize: font.sm,
    lineHeight: 20,
  },
  whyBotBtn: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: palette.tealSoft,
    borderWidth: 1,
    borderColor: palette.teal,
  },
  whyBotText: {
    color: palette.teal,
    fontSize: font.sm,
    fontWeight: '900',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
  tag: {
    backgroundColor: palette.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagText: {
    color: palette.muted,
    fontSize: font.tiny,
    fontWeight: '800',
  },
  tryBtn: {
    marginTop: space.md,
    backgroundColor: palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  tryBtnText: {
    color: palette.bg,
    fontSize: font.sm,
    fontWeight: '900',
  },
  followUpBox: {
    marginTop: space.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    gap: space.xs,
  },
  followUpQ: {
    color: palette.text,
    fontSize: font.sm,
    fontWeight: '900',
  },
  followUpA: {
    color: palette.muted,
    fontSize: font.sm,
    lineHeight: 20,
  },
  recapBox: {
    backgroundColor: palette.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    marginVertical: 6,
    gap: 6,
    width: '100%',
  },
  recapTitle: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: '900',
    textAlign: 'center',
  },
  recapBody: {
    color: palette.muted,
    fontSize: font.sm,
    lineHeight: 19,
  },
  blunderBanner: {
    position: 'absolute',
    bottom: 18,
    left: 14,
    right: 14,
    backgroundColor: palette.panel,
    borderRadius: radius.xl,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1.5,
    borderColor: palette.yellow,
    ...shadow.soft,
    zIndex: 50,
  },
  blunderText: {
    color: palette.text,
    fontSize: font.sm,
    fontWeight: '900',
    flex: 1,
  },
  blunderButtons: { flexDirection: 'row', gap: space.sm },
  blunderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  blunderBtnUndo: { backgroundColor: palette.yellow },
  blunderBtnText: { color: palette.bg, fontSize: font.sm, fontWeight: '900' },
  blunderBtnTextGhost: { color: palette.muted, fontSize: font.sm, fontWeight: '800' },
  openingPill: {
    alignSelf: 'center',
    backgroundColor: palette.card,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: space.xs,
    borderWidth: 1,
    borderColor: palette.border,
  },
  openingText: { color: palette.muted, fontSize: font.tiny, fontWeight: '800' },
});
