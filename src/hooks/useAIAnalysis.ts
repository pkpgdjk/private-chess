import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useStockfishEngine } from '@/engine/stockfish';
import {
  analyzeMoveStream,
  configureCoachProvider,
  getCoachProviderLabel,
  getConfiguredCoachApiKey,
} from '@/ai/coachProvider';
import { getOpeningName } from '@/constants/openings';
import { createGame } from '@/engine/chessLogic';
import type { AnalysisRequestExtended } from '@/types/chess';

function determineGamePhase(moveCount: number): 'opening' | 'middlegame' | 'endgame' {
  if (moveCount < 10) return 'opening';
  if (moveCount < 30) return 'middlegame';
  return 'endgame';
}

/**
 * Pull the shortSummary value out of a partial JSON stream. Returns null
 * until we've seen the opening `"shortSummary": "` and some content.
 */
function extractLiveSummary(partial: string): string | null {
  const match = partial.match(/"shortSummary"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!match) return null;
  // Unescape simple JSON sequences for nicer display.
  const raw = match[1]
    .replace(/\\n/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
  return raw.trim() ? raw : null;
}

export function useAIAnalysis(): { isAnalyzing: boolean } {
  const history = useGameStore((s) => s.history);
  const currentMoveIndex = useGameStore((s) => s.currentMoveIndex);
  const playerColor = useGameStore((s) => s.playerColor);
  const isAnalyzing = useGameStore((s) => s.isAnalyzing);

  const realTimeCoach = useSettingsStore((s) => s.realTimeCoach);
  const coachLevel = useSettingsStore((s) => s.coachLevel);
  const coachLanguage = useSettingsStore((s) => s.coachLanguage);
  const coachProvider = useSettingsStore((s) => s.coachProvider);
  const criticalMomentsOnly = useSettingsStore((s) => s.criticalMomentsOnly);
  const coachModel = useSettingsStore((s) => s.coachModel);
  const coachEffort = useSettingsStore((s) => s.coachEffort);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const openaiApiKey = useSettingsStore((s) => s.openaiApiKey);

  const { evaluatePosition, getTopCandidates } = useStockfishEngine();

  const launchedRef = useRef<Set<number>>(new Set());
  const generationRef = useRef(0);

  // Reset on game reset (history shrinks to zero).
  useEffect(() => {
    if (history.length === 0) {
      launchedRef.current.clear();
      generationRef.current += 1;
    }
  }, [history.length]);

  useEffect(() => {
    if (!realTimeCoach) return;
    if (history.length === 0) return;
    if (currentMoveIndex !== history.length - 1) return;

    // We trigger AFTER the bot's reply. So the *last* move in history should
    // be the bot's; the player's move we're analyzing is one before that.
    const lastIdx = history.length - 1;
    const lastNode = history[lastIdx];
    const isBotsLastMove = lastNode.player !== playerColor;
    if (!isBotsLastMove) return;
    if (history.length < 2) return; // need a player move to analyze

    const playerIdx = lastIdx - 1;
    const playerNode = history[playerIdx];
    if (playerNode.player !== playerColor) return;
    if (playerNode.aiCommentary !== null) return;
    if (launchedRef.current.has(playerIdx)) return;

    launchedRef.current.add(playerIdx);
    const myGen = generationRef.current;
    const store = useGameStore.getState();
    store.setIsAnalyzing(true);

    (async () => {
      try {
        const activeApiKey = getConfiguredCoachApiKey(coachProvider, apiKey, openaiApiKey);
        if (!activeApiKey) {
          store.setCoachMessage(
            `Set your ${getCoachProviderLabel(coachProvider)} API key in Settings to enable AI coaching ✨`,
            'info'
          );
          return;
        }
        configureCoachProvider(coachProvider, apiKey, openaiApiKey);

        // Position BEFORE the player's move — replay history up to playerIdx-1
        const beforeChess = createGame();
        for (let i = 0; i < playerIdx; i++) {
          const n = history[i];
          beforeChess.move({
            from: n.uci.slice(0, 2),
            to: n.uci.slice(2, 4),
            promotion: n.uci.slice(4) || undefined,
          });
        }
        const beforeFen = beforeChess.fen();

        // Run engine analyses in parallel: candidates from BEFORE position,
        // eval of position AFTER bot's reply.
        const [candidates, afterEval] = await Promise.all([
          getTopCandidates(beforeFen, 3),
          evaluatePosition(lastNode.fen),
        ]);
        if (myGen !== generationRef.current) return;

        const evalBefore = playerIdx > 0 ? (history[playerIdx - 1].evalAfter ?? 0) : 0;
        const evalAfter = afterEval.eval / 100;

        // Critical-moments-only gate: when enabled, only call AI for
        // genuinely interesting moments (eval swing, phase change, game end).
        // Other moves get a free Stockfish-derived quality tag.
        if (criticalMomentsOnly) {
          const swing = playerColor === 'w' ? evalBefore - evalAfter : evalAfter - evalBefore;
          const phaseBoundary = history.length === 10 || history.length === 30;
          const gameEnded = useGameStore.getState().isGameOver;
          const isImportant = Math.abs(swing) >= 1.5 || phaseBoundary || gameEnded;
          if (!isImportant) {
            // Store a lightweight quality tag derived from eval swing.
            let quietQuality: 'good' | 'inaccuracy' | 'mistake' | 'blunder' = 'good';
            if (swing > 3.0) quietQuality = 'blunder';
            else if (swing > 1.5) quietQuality = 'mistake';
            else if (swing > 0.5) quietQuality = 'inaccuracy';
            useGameStore.getState().updateMoveNode(playerIdx, {
              quality: quietQuality,
              evalBefore,
              evalAfter,
              stockfishBestMove: candidates[0]?.san ?? null,
              stockfishBestLine: afterEval.bestLine,
            });
            useGameStore.getState().setCoachMessage(null, null);
            return;
          }
        }

        const request: AnalysisRequestExtended = {
          fen: lastNode.fen,
          moveHistorySan: history.slice(0, lastIdx + 1).map((h) => h.san),
          lastMoveSan: playerNode.san,
          lastMoveUci: playerNode.uci,
          playerColor,
          evalBefore,
          evalAfter,
          stockfishBestMove: candidates[0]?.uci ?? null,
          stockfishBestLine: afterEval.bestLine,
          coachLevel,
          coachProvider,
          coachLanguage,
          coachModel,
          coachEffort,
          context: determineGamePhase(history.length),
          openingName: getOpeningName(history.map((h) => h.san)),
          botReplySan: lastNode.san,
          botReplyUci: lastNode.uci,
          candidates,
        };

        const response = await analyzeMoveStream(coachProvider, request, (partial) => {
          if (myGen !== generationRef.current) return;
          // Extract live shortSummary as JSON streams in so the user sees
          // something growing rather than waiting on a blank spinner.
          const live = extractLiveSummary(partial);
          if (live) {
            useGameStore.getState().setCoachMessage(live, 'info');
          }
        });
        if (myGen !== generationRef.current) return;

        const latestState = useGameStore.getState();
        if (playerIdx >= latestState.history.length) return;
        const latestPlayerNode = latestState.history[playerIdx];
        if (!latestPlayerNode || latestPlayerNode.uci !== playerNode.uci) return;

        latestState.updateMoveNode(playerIdx, {
          aiCommentary: response.fullExplanation,
          aiShortCommentary: response.shortSummary,
          quality: response.quality,
          stockfishBestMove: response.betterMove ?? candidates[0]?.san ?? null,
          evalBefore,
          evalAfter,
          stockfishBestLine: afterEval.bestLine,
          focusSquares: response.focusSquares,
          tags: response.tags,
          botReplySan: response.botReplySan ?? lastNode.san,
          botReplyExplanation: response.botReplyExplanation ?? null,
        });

        const message = response.shortSummary || response.coachAdvice || 'Move analyzed';
        let type: 'info' | 'warning' | 'praise' | 'blunder';
        if (response.quality === 'blunder' || response.quality === 'mistake') {
          type = 'blunder';
        } else if (response.quality === 'brilliant' || response.quality === 'excellent') {
          type = 'praise';
        } else {
          type = 'info';
        }
        latestState.setCoachMessage(message, type);
      } catch (err) {
        const s = useGameStore.getState();
        s.setCoachMessage(
          `Coach unavailable: ${err instanceof Error ? err.message : 'unknown error'}`,
          'info'
        );
      } finally {
        const s = useGameStore.getState();
        s.setIsAnalyzing(false);
      }
    })();
  }, [history, currentMoveIndex, playerColor, realTimeCoach, coachProvider, apiKey, openaiApiKey, coachLevel, coachLanguage, coachModel, coachEffort, criticalMomentsOnly, evaluatePosition, getTopCandidates]);

  return { isAnalyzing };
}
