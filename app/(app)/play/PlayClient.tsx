'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { apiJson } from '@/client/api';
import { useGameStore } from '@/client/stores/gameStore';
import { useHistoryStore } from '@/client/stores/historyStore';
import { useSettingsStore } from '@/client/stores/settingsStore';
import { piecesFromFen } from '@/components/web/board/BoardPieces';
import { ChessBoard } from '@/components/web/board/ChessBoard';
import { buildLocalGameReview, coerceGameReview } from '@/utils/gameReview';
import type {
  AIAnalysisResponse,
  GameState,
  GameStoryResponse,
  MoveNode,
  SavedGame,
  Settings,
} from '@/types/chess';

export { buildLocalGameReview, coerceGameReview } from '@/utils/gameReview';

type PlayClientProps = {
  newGameRequested?: boolean;
  username: string;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type CoachLanguage = Settings['coachLanguage'];
type GameReviewState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  result: GameStoryResponse | null;
};

type CoachInsight = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  whatHappened: string;
  enemyIdea: string;
  thinkingCue: string;
};

type CompletedGameInput = {
  history: MoveNode[];
  playerColor: 'w' | 'b';
  result: NonNullable<GameState['result']>;
  botStrength: number;
};

function colorName(color: 'w' | 'b') {
  return color === 'w' ? 'White' : 'Black';
}

function gamePhase(historyLength: number): 'opening' | 'middlegame' | 'endgame' {
  if (historyLength <= 12) {
    return 'opening';
  }

  if (historyLength <= 50) {
    return 'middlegame';
  }

  return 'endgame';
}

function defaultCoachInsight(language: CoachLanguage = 'en'): CoachInsight {
  if (language === 'th') {
    return {
      status: 'idle',
      whatHappened: 'เดินตาแรกก่อน แล้วโค้ชจะช่วยอ่านตำแหน่งให้',
      enemyIdea: 'หลังบอทตอบ ให้ดูว่าบอทกำลังเล็งอะไรหรือกดดันจุดไหน',
      thinkingCue: 'ก่อนเดิน ลองถามตัวเองว่าอะไรโดนโจมตี ตัวไหนหลวม และตัวไหนควรพัฒนาก่อน',
    };
  }

  return {
    status: 'idle',
    whatHappened: 'Make a move and I will help you read the position.',
    enemyIdea: 'Watch what the opponent attacks after each reply.',
    thinkingCue: 'Before moving, ask: what is attacked, what is loose, and what improves my worst piece?',
  };
}

export function fallbackCoachInsight(
  playerMove?: MoveNode,
  botMove?: MoveNode,
  language: CoachLanguage = 'en',
): CoachInsight {
  if (!playerMove) {
    return defaultCoachInsight(language);
  }

  if (language === 'th') {
    return {
      status: 'ready',
      whatHappened: `${playerMove.san} ทำให้รูปเกมเปลี่ยน ลองหยุดดูว่าตานี้คุมช่องไหนเพิ่มขึ้นบ้าง`,
      enemyIdea: botMove
        ? `หลัง ${botMove.san} บอทกำลังทดสอบความปลอดภัยของหมากและการคุมกลางของคุณ ดูภัยคุกคามใหม่ก่อนเลือกแผน`
        : 'บอทยังไม่ตอบ ลองเดาก่อนว่าบอทมีเช็ก กิน หรือโจมตีที่แรงที่สุดตรงไหน',
      thinkingCue: 'อย่ารีบหาตาเดินก่อน ให้เทียบแผนว่าเราควรพัฒนาหมาก ป้องกันจุดอ่อน หรือสร้างภัยคุกคาม',
    };
  }

  return {
    status: 'ready',
    whatHappened: `${playerMove.san} changed the shape of the position. Slow down and name what your move controls now.`,
    enemyIdea: botMove
      ? `After ${botMove.san}, the opponent is testing your piece safety and central control. Look for the new threat before choosing a plan.`
      : 'The opponent has not replied yet. Predict their most forcing checks, captures, and attacks.',
    thinkingCue: 'Do not hunt for a move first. Compare candidate plans: improve a piece, defend a weakness, or create a threat.',
  };
}

function quietCoachInsight(language: CoachLanguage = 'en'): CoachInsight {
  if (language === 'th') {
    return {
      status: 'idle',
      whatHappened: 'ตำแหน่งนี้ยังไม่ใช่จังหวะสำคัญ',
      enemyIdea: 'บอทยังไม่ได้สร้างภัยคุกคามที่ต้องรีบตอบทันที',
      thinkingCue: 'ใช้จังหวะนี้จัดหมากให้ดีขึ้น แล้วรอโค้ชเตือนตอนมีจุดเปลี่ยนจริงๆ',
    };
  }

  return {
    status: 'idle',
    whatHappened: 'This is a quiet position, not a critical moment.',
    enemyIdea: 'The opponent has not created a forcing threat that needs urgent coaching.',
    thinkingCue: 'Use this move to improve a piece, then I will step in when the position changes sharply.',
  };
}

function moveHasTacticalMarker(move?: MoveNode) {
  return Boolean(move?.san.match(/[+#x=]/));
}

function moveHasLargeEvalSwing(move?: MoveNode) {
  return typeof move?.evalChange === 'number' && Math.abs(move.evalChange) >= 1.5;
}

function moveHasCriticalQuality(move?: MoveNode) {
  return Boolean(
    move?.quality && ['brilliant', 'mistake', 'blunder'].includes(move.quality),
  );
}

export function isCriticalCoachMoment({
  botMove,
  historyLength,
  isGameOver,
  playerMove,
}: {
  botMove?: MoveNode;
  historyLength: number;
  isGameOver: boolean;
  playerMove?: MoveNode;
}) {
  const isPhaseBoundary = [2, 12, 13, 50, 51].includes(historyLength);

  return (
    isGameOver ||
    isPhaseBoundary ||
    moveHasTacticalMarker(playerMove) ||
    moveHasTacticalMarker(botMove) ||
    moveHasLargeEvalSwing(playerMove) ||
    moveHasLargeEvalSwing(botMove) ||
    moveHasCriticalQuality(playerMove) ||
    moveHasCriticalQuality(botMove)
  );
}

export function getThreatenedPlayerSquares(fen: string, playerColor: 'w' | 'b') {
  const chess = new Chess(fen);
  const enemyColor = playerColor === 'w' ? 'b' : 'w';

  return piecesFromFen(fen)
    .filter((piece) => piece.color === playerColor)
    .filter((piece) => chess.isAttacked(piece.square as Square, enemyColor))
    .map((piece) => piece.square);
}

function insightFromAnalysis(
  result: AIAnalysisResponse,
  playerMove: MoveNode,
  botMove?: MoveNode,
  language: CoachLanguage = 'en',
): CoachInsight {
  return {
    status: 'ready',
    whatHappened: result.shortSummary || (
      language === 'th'
        ? `${playerMove.san} ทำให้ตำแหน่งเปลี่ยน`
        : `${playerMove.san} changed the position.`
    ),
    enemyIdea: result.botReplyExplanation || (
      language === 'th'
        ? (
          botMove
            ? `ตา ${botMove.san} บอกว่าบอทอยากกดดันอะไรต่อ`
            : 'คิดถึงคำตอบของบอทก่อนเลือกแผน'
        )
        : (
          botMove
            ? `The reply ${botMove.san} shows what the opponent wants to pressure next.`
            : 'Think about the opponent response before you pick a plan.'
        )
    ),
    thinkingCue: result.coachAdvice || (
      language === 'th'
        ? 'หาแรงคุกคามก่อน แล้วค่อยเลือกแผนที่ทำให้ตำแหน่งดีขึ้น'
        : 'Identify threats first, then choose a plan that improves your position.'
    ),
  };
}

export function coachUiCopy(status: CoachInsight['status'], language: CoachLanguage) {
  if (language === 'th') {
    return {
      title: 'โค้ช AI',
      status: {
        idle: 'รอตาเดิน',
        loading: 'thinking...',
        ready: 'คิดก่อนเดิน',
        error: 'โค้ชในเครื่อง',
      }[status],
      whatHappened: 'เกิดอะไรขึ้น',
      enemyIdea: 'แผนของบอท',
      thinkingCue: 'วิธีคิด',
    };
  }

  return {
    title: 'AI Coach',
    status: {
      idle: 'Waiting for a move',
      loading: 'thinking...',
      ready: 'Think first',
      error: 'Local coaching',
    }[status],
    whatHappened: 'What happened',
    enemyIdea: 'Enemy idea',
    thinkingCue: 'How to think',
  };
}

function resultTitle(result: NonNullable<GameState['result']>) {
  if (result === 'win') {
    return 'You won';
  }

  if (result === 'loss') {
    return 'Bot won';
  }

  return 'Draw';
}

function formatPgn(history: MoveNode[]) {
  return history
    .map((move, index) => (
      index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ${move.san}` : move.san
    ))
    .join(' ');
}

function completedGameId(history: MoveNode[]) {
  const source = history.map((move) => move.uci).join('|');
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = Math.imul(31, hash) + source.charCodeAt(index);
    hash |= 0;
  }

  return `completed-${history.length}-${Math.abs(hash).toString(36)}`;
}

export function buildCompletedGame({
  history,
  playerColor,
  result,
  botStrength,
}: CompletedGameInput): SavedGame {
  const coachMessages = history
    .flatMap((move) => [move.aiShortCommentary, move.aiCommentary])
    .filter((message): message is string => Boolean(message?.trim()))
    .join('\n\n');

  return {
    id: completedGameId(history),
    date: history.at(-1)?.timestamp ?? Date.now(),
    pgn: formatPgn(history),
    result,
    playerColor,
    botStrength,
    coachMessages,
    moveHistory: history,
  };
}

export function GameResultPanel({
  result,
  moveCount,
  review = { status: 'idle', result: null },
  saveStatus,
  onSave,
}: {
  result: NonNullable<GameState['result']>;
  moveCount: number;
  review?: GameReviewState;
  saveStatus: SaveStatus;
  onSave: () => void;
}) {
  return (
    <section className="play-result" aria-live="polite" aria-label="Game result">
      <p className="eyebrow">Game complete</p>
      <h2>{resultTitle(result)}</h2>
      <p>
        {moveCount} {moveCount === 1 ? 'move' : 'moves'} recorded. Review it from
        history or start a new board.
      </p>
      <div className="play-result__actions">
        <span data-status={saveStatus}>
          {saveStatus === 'saved' ? 'Saved to history' : null}
          {saveStatus === 'saving' ? 'Saving to history...' : null}
          {saveStatus === 'error' ? 'Save failed' : null}
          {saveStatus === 'idle' ? 'Ready to save' : null}
        </span>
        {saveStatus !== 'saved' ? (
          <button
            className="play-actions__button play-actions__button--primary"
            disabled={saveStatus === 'saving'}
            onClick={onSave}
            type="button"
          >
            Save game
          </button>
        ) : null}
      </div>
      {review.status !== 'idle' ? (
        <section className="play-result__review" aria-label="Game review">
          <p className="eyebrow">
            {review.status === 'loading' ? 'thinking...' : 'Game review'}
          </p>
          {review.result ? (
            <>
              <h3>{review.result.title}</h3>
              <p>{review.result.overallAdvice}</p>
              <div className="play-result__review-grid">
                <div>
                  <strong>Keep</strong>
                  <span>{review.result.playerStrengths[0] ?? 'Review your best phase.'}</span>
                </div>
                <div>
                  <strong>Train</strong>
                  <span>{review.result.playerWeaknesses[0] ?? 'Review the turning point.'}</span>
                </div>
              </div>
            </>
          ) : (
            <p>thinking...</p>
          )}
          {review.status === 'error' ? (
            <span className="play-result__review-note">
              AI review failed, showing a local review.
            </span>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function useGameStatus() {
  const turn = useGameStore((state) => state.turn);
  const playerColor = useGameStore((state) => state.playerColor);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const result = useGameStore((state) => state.result);
  const history = useGameStore((state) => state.history);

  return useMemo(() => {
    if (isGameOver) {
      if (result === 'draw') {
        return 'Draw by table agreement';
      }

      if (result === 'win') {
        return 'You found mate';
      }

      return 'The bot found mate';
    }

    if (history.length === 0) {
      return playerColor === 'w' ? 'Your first move' : 'Bot opens';
    }

    return turn === playerColor ? 'Your move' : 'Bot thinking';
  }, [history.length, isGameOver, playerColor, result, turn]);
}

export function PlayClient({ newGameRequested = false, username }: PlayClientProps) {
  const router = useRouter();
  const fen = useGameStore((state) => state.fen);
  const selectedSquare = useGameStore((state) => state.selectedSquare);
  const legalMoves = useGameStore((state) => state.legalMoves);
  const playerColor = useGameStore((state) => state.playerColor);
  const turn = useGameStore((state) => state.turn);
  const history = useGameStore((state) => state.history);
  const lastMove = useGameStore((state) => state.lastMove);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const result = useGameStore((state) => state.result);
  const selectSquare = useGameStore((state) => state.selectSquare);
  const makeMove = useGameStore((state) => state.makeMove);
  const makeBotMove = useGameStore((state) => state.makeBotMove);
  const resetGame = useGameStore((state) => state.resetGame);
  const undoMove = useGameStore((state) => state.undoMove);
  const resumeActiveGame = useGameStore((state) => state.resumeActiveGame);
  const canUndo = useGameStore((state) => state.canUndo);
  const saveGame = useHistoryStore((state) => state.saveGame);

  const settings = useSettingsStore((state) => state.settings);
  const isSettingsLoading = useSettingsStore((state) => state.isLoading);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const allowUndo = settings.allowUndo && canUndo();
  const status = useGameStatus();
  const latestHistoryMove = history.at(-1);
  const recentEnemyMove =
    latestHistoryMove && latestHistoryMove.player !== playerColor ? lastMove : null;
  const threatenedPlayerSquares = useMemo(() => (
    settings.threatIndicator ? getThreatenedPlayerSquares(fen, playerColor) : []
  ), [fen, playerColor, settings.threatIndicator]);
  const moveRows = useMemo(() => {
    const rows: { moveNumber: number; white?: string; black?: string }[] = [];

    for (const move of history) {
      const rowIndex = Math.floor((move.moveNumber - 1) / 2);
      const row = rows[rowIndex] ?? { moveNumber: rowIndex + 1 };
      if (move.player === 'w') {
        row.white = move.san;
      } else {
        row.black = move.san;
      }
      rows[rowIndex] = row;
    }

    return rows.slice(-9);
  }, [history]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [coachInsight, setCoachInsight] = useState<CoachInsight>(() => defaultCoachInsight());
  const [gameReview, setGameReview] = useState<GameReviewState>({ status: 'idle', result: null });
  const savedGameIdRef = useRef<string | null>(null);
  const analyzedPairRef = useRef<string | null>(null);
  const reviewedGameKeyRef = useRef<string | null>(null);
  const completedGame = useMemo(() => (
    result
      ? buildCompletedGame({
        history,
        playerColor,
        result,
        botStrength: settings.botStrength,
      })
      : null
  ), [history, playerColor, result, settings.botStrength]);
  const coachCopy = coachUiCopy(coachInsight.status, settings.coachLanguage);

  useEffect(() => {
    let isMounted = true;

    async function hydrateGame() {
      await loadSettings();

      if (!isMounted) {
        return;
      }

      if (newGameRequested) {
        await apiJson('/api/active-game', { method: 'DELETE' }).catch((error) => {
          console.warn('Failed to clear active game before starting new board', error);
        });

        if (!isMounted) {
          return;
        }

        resetGame(useSettingsStore.getState().settings.playerColor);
        router.replace('/play');
        return;
      }

      const hadActiveGame = await resumeActiveGame();

      if (!isMounted || hadActiveGame) {
        return;
      }

      resetGame(useSettingsStore.getState().settings.playerColor);
    }

    void hydrateGame();

    return () => {
      isMounted = false;
    };
  }, [loadSettings, newGameRequested, resetGame, resumeActiveGame, router]);

  useEffect(() => {
    if (turn === playerColor || isGameOver) {
      return;
    }

    const timer = window.setTimeout(() => {
      makeBotMove(settings.botStrength);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [isGameOver, makeBotMove, playerColor, settings.botStrength, turn]);

  useEffect(() => {
    const botMove = history.at(-1);
    const coachLanguage = settings.coachLanguage;

    if (!botMove || botMove.player === playerColor) {
      setCoachInsight(fallbackCoachInsight(history.at(-1), undefined, coachLanguage));
      return;
    }

    const playerMove = [...history].reverse().find((move) => move.player === playerColor);

    if (!playerMove) {
      setCoachInsight(fallbackCoachInsight(undefined, botMove, coachLanguage));
      return;
    }

    const pairKey = `${playerMove.uci}:${botMove.uci}:${settings.coachProvider}:${settings.coachModel}:${settings.coachEffort}:${settings.coachLanguage}`;

    if (analyzedPairRef.current === pairKey) {
      return;
    }

    analyzedPairRef.current = pairKey;
    setCoachInsight({
      ...fallbackCoachInsight(playerMove, botMove, coachLanguage),
      status: 'loading',
    });

    const providerHasKey =
      settings.coachProvider === 'openai'
        ? settings.hasOpenAIKey
        : settings.hasAnthropicKey;

    if (!settings.realTimeCoach || !providerHasKey) {
      setCoachInsight(fallbackCoachInsight(playerMove, botMove, coachLanguage));
      return;
    }

    if (
      settings.criticalMomentsOnly &&
      !isCriticalCoachMoment({
        botMove,
        historyLength: history.length,
        isGameOver,
        playerMove,
      })
    ) {
      setCoachInsight(quietCoachInsight(coachLanguage));
      return;
    }

    let isCancelled = false;

    void apiJson<{ result: AIAnalysisResponse }>('/api/coach/analyze-move', {
      method: 'POST',
      body: JSON.stringify({
        fen: playerMove.fen,
        moveHistorySan: history.map((move) => move.san),
        lastMoveSan: playerMove.san,
        lastMoveUci: playerMove.uci,
        playerColor,
        evalBefore: playerMove.evalBefore,
        evalAfter: playerMove.evalAfter,
        stockfishBestMove: null,
        stockfishBestLine: null,
        coachLevel: settings.coachLevel,
        coachLanguage: settings.coachLanguage,
        context: gamePhase(history.length),
        openingName: null,
        botReplySan: botMove.san,
        botReplyUci: botMove.uci,
        provider: settings.coachProvider,
        model: settings.coachModel,
        effort: settings.coachEffort,
      }),
    })
      .then(({ result }) => {
        if (!isCancelled) {
          setCoachInsight(insightFromAnalysis(result, playerMove, botMove, coachLanguage));
        }
      })
      .catch((error) => {
        console.warn('Failed to load AI coach insight', error);
        if (!isCancelled) {
          setCoachInsight({
            ...fallbackCoachInsight(playerMove, botMove, coachLanguage),
            status: 'error',
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [history, isGameOver, playerColor, settings]);

  const persistCompletedGame = useCallback(async (game: SavedGame) => {
    setSaveStatus('saving');
    const savedGame = await saveGame(game);

    if (!savedGame) {
      setSaveStatus('error');
      savedGameIdRef.current = null;
      return;
    }

    setSaveStatus('saved');
    void apiJson('/api/active-game', { method: 'DELETE' }).catch((error) => {
      console.warn('Failed to clear completed active game', error);
    });
  }, [saveGame]);

  useEffect(() => {
    if (!completedGame) {
      savedGameIdRef.current = null;
      setSaveStatus('idle');
      return;
    }

    if (!settings.autoSaveGames || savedGameIdRef.current === completedGame.id) {
      return;
    }

    savedGameIdRef.current = completedGame.id;
    void persistCompletedGame(completedGame);
  }, [completedGame, persistCompletedGame, settings.autoSaveGames]);

  useEffect(() => {
    if (!completedGame) {
      reviewedGameKeyRef.current = null;
      setGameReview({ status: 'idle', result: null });
      return;
    }

    const reviewKey = [
      completedGame.id,
      settings.coachProvider,
      settings.coachModel,
      settings.coachEffort,
      settings.coachLanguage,
      settings.realTimeCoach,
      settings.hasAnthropicKey,
      settings.hasOpenAIKey,
    ].join(':');

    if (reviewedGameKeyRef.current === reviewKey) {
      return;
    }

    reviewedGameKeyRef.current = reviewKey;
    setGameReview({ status: 'loading', result: null });

    const localReview = buildLocalGameReview({
      history,
      playerColor,
      result: completedGame.result,
      botStrength: settings.botStrength,
    }, settings.coachLanguage);
    const providerHasKey =
      settings.coachProvider === 'openai'
        ? settings.hasOpenAIKey
        : settings.hasAnthropicKey;

    if (!settings.realTimeCoach || !providerHasKey) {
      setGameReview({ status: 'ready', result: localReview });
      return;
    }

    let isCancelled = false;

    void apiJson<{ result: GameStoryResponse }>('/api/coach/game-story', {
      method: 'POST',
      body: JSON.stringify({
        botStrength: completedGame.botStrength,
        moveHistory: completedGame.moveHistory,
        language: settings.coachLanguage,
        playerColor: completedGame.playerColor,
        provider: settings.coachProvider,
        model: settings.coachModel,
        result: completedGame.result,
        effort: settings.coachEffort,
      }),
    })
      .then(({ result }) => {
        if (!isCancelled) {
          setGameReview({
            status: 'ready',
            result: coerceGameReview(result, {
              history,
              playerColor,
              result: completedGame.result,
              botStrength: settings.botStrength,
            }, settings.coachLanguage),
          });
        }
      })
      .catch((error) => {
        console.warn('Failed to load AI game review', error);
        if (!isCancelled) {
          setGameReview({ status: 'error', result: localReview });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [completedGame, history, playerColor, settings]);

  const chooseSide = (nextColor: 'w' | 'b') => {
    void updateSettings({ playerColor: nextColor });
    resetGame(nextColor);
  };

  return (
    <section className="play-page" aria-labelledby="play-title">
      <div className="play-page__top">
        <div className="play-brand">
          <Image
            alt=""
            aria-hidden="true"
            height={760}
            priority
            src="/assets/logo-v3.png"
            width={456}
          />
          <div>
            <h1 id="play-title">Purrmate</h1>
            <span>Chess for everyone</span>
          </div>
        </div>
        <div className="play-top-actions">
          <span>{colorName(turn)} turn</span>
        </div>
      </div>

      <aside className="play-history" aria-label="Move history">
        <p className="eyebrow">Move History</p>
        <ol>
          {moveRows.length > 0 ? moveRows.map((row) => (
            <li key={row.moveNumber}>
              <span>{row.moveNumber}.</span>
              <strong>{row.white ?? ''}</strong>
              <strong>{row.black ?? ''}</strong>
            </li>
          )) : (
            <li>
              <span>1.</span>
              <strong>Start</strong>
              <strong />
            </li>
          )}
        </ol>
      </aside>

      <div className="play-matchup" aria-label="Players">
        <div className="play-player-card">
          <Image alt="" aria-hidden="true" height={760} src="/assets/logo-v3.png" width={456} />
          <div>
            <strong>You</strong>
            <span>{username} · {colorName(playerColor)}</span>
          </div>
        </div>
        <span className="play-versus">VS</span>
        <div className="play-player-card">
          <Image
            alt=""
            aria-hidden="true"
            height={760}
            src="/assets/opponent-icon-v3.png"
            width={441}
          />
          <div>
            <strong>Midnight Meow</strong>
            <span>Level {settings.botStrength}</span>
          </div>
        </div>
      </div>

      <div className="play-page__board">
        <ChessBoard
          fen={fen}
          flipped={playerColor === 'b' || settings.flipBoard}
          legalMoves={settings.legalMoveOverlay ? legalMoves : []}
          onMove={makeMove}
          onSelectSquare={selectSquare}
          recentEnemyMove={recentEnemyMove}
          selectedSquare={selectedSquare}
          threatSquares={threatenedPlayerSquares}
        />
      </div>

      {completedGame ? (
        <GameResultPanel
          moveCount={history.length}
          onSave={() => {
            savedGameIdRef.current = completedGame.id;
            void persistCompletedGame(completedGame);
          }}
          review={gameReview}
          result={completedGame.result}
          saveStatus={settings.autoSaveGames ? saveStatus : 'idle'}
        />
      ) : null}

      <aside className="play-coach" aria-label="AI coach">
        <div className="play-coach__header">
          <Image
            alt=""
            aria-hidden="true"
            height={760}
            src="/assets/coach-icon-v3.png"
            width={495}
          />
          <div>
            <h2>{coachCopy.title}</h2>
            <span>{coachCopy.status}</span>
          </div>
        </div>
        <div className="play-coach__card">
          <strong>{coachCopy.whatHappened}</strong>
          <p>{coachInsight.whatHappened}</p>
        </div>
        <div className="play-coach__card">
          <strong>{coachCopy.enemyIdea}</strong>
          <p>{coachInsight.enemyIdea}</p>
        </div>
        <div className="play-coach__card">
          <strong>{coachCopy.thinkingCue}</strong>
          <p>{coachInsight.thinkingCue}</p>
        </div>
      </aside>

      <div className="play-panel" aria-label="Game controls">
        <div className="play-panel__status">
          <span>{isSettingsLoading ? 'Loading board' : status}</span>
          <strong>{colorName(turn)} to move</strong>
        </div>

        <div className="play-side" aria-label="Choose your side">
          <button
            aria-pressed={playerColor === 'w'}
            className="play-side__button"
            onClick={() => chooseSide('w')}
            type="button"
          >
            White
          </button>
          <button
            aria-pressed={playerColor === 'b'}
            className="play-side__button"
            onClick={() => chooseSide('b')}
            type="button"
          >
            Black
          </button>
        </div>

        <div className="play-actions">
          <button
            className="play-actions__button"
            disabled={!allowUndo}
            onClick={undoMove}
            type="button"
          >
            Undo
          </button>
          <button
            className="play-actions__button play-actions__button--primary"
            onClick={() => resetGame(playerColor)}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
