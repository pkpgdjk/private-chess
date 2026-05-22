'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { apiJson } from '@/client/api';
import type { MoveNode, MoveQuality, SavedGame } from '@/types/chess';
import {
  buildAccuracyPoints,
  deriveCoachMemoryUpdates,
} from '@/utils/learning';

import styles from './analysis.module.css';

type GameResponse = {
  game: SavedGame;
};

type AnalysisClientProps = {
  gameId: string;
};

const resultCopy: Record<SavedGame['result'], string> = {
  win: 'Win',
  loss: 'Loss',
  draw: 'Draw',
};

const qualityCopy: Record<MoveQuality, string> = {
  brilliant: 'Brilliant',
  excellent: 'Excellent',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatColor(color: SavedGame['playerColor']) {
  return color === 'w' ? 'White' : 'Black';
}

function formatEval(value: number | null) {
  if (value === null) {
    return 'n/a';
  }

  const pawns = value / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

function getAverageAccuracy(game: SavedGame) {
  const points = buildAccuracyPoints(game.moveHistory, game.playerColor);

  if (points.length === 0) {
    return null;
  }

  return Math.round(
    points.reduce((sum, point) => sum + point.score, 0) / points.length,
  );
}

function getMoveLabel(move: MoveNode) {
  return `${move.moveNumber}${move.player === 'w' ? '.' : '...'} ${move.san}`;
}

function getLearningNotes(game: SavedGame) {
  return game.moveHistory
    .filter((move) => move.player === game.playerColor)
    .flatMap((move) => {
      const notes = [
        move.aiShortCommentary,
        move.aiCommentary,
        move.botReplyExplanation,
      ].filter((note): note is string => Boolean(note?.trim()));

      return notes.map((note) => ({
        id: `${move.moveNumber}-${move.player}-${move.san}-${note}`,
        moveLabel: getMoveLabel(move),
        note,
      }));
    })
    .slice(0, 8);
}

function Summary({ game }: { game: SavedGame }) {
  const accuracy = getAverageAccuracy(game);

  return (
    <div className={styles.summaryGrid}>
      <div className={styles.stat}>
        <span>Result</span>
        <strong>{resultCopy[game.result]}</strong>
      </div>
      <div className={styles.stat}>
        <span>Accuracy</span>
        <strong>{accuracy === null ? 'n/a' : `${accuracy}%`}</strong>
      </div>
      <div className={styles.stat}>
        <span>Bot</span>
        <strong>{game.botStrength}</strong>
      </div>
      <div className={styles.stat}>
        <span>Moves</span>
        <strong>{game.moveHistory.length}</strong>
      </div>
    </div>
  );
}

function AccuracyGraph({ game }: { game: SavedGame }) {
  const points = buildAccuracyPoints(game.moveHistory, game.playerColor);

  if (points.length === 0) {
    return (
      <div className={styles.emptyPanel}>
        Accuracy appears after analyzed player moves.
      </div>
    );
  }

  return (
    <div className={styles.graph} aria-label="Accuracy by player move">
      {points.map((point) => (
        <div className={styles.barWrap} key={point.moveIndex}>
          <div
            className={styles.bar}
            data-quality={point.quality ?? 'unknown'}
            style={{ height: `${Math.max(point.score, 8)}%` }}
            title={`${point.moveNumber}. ${point.san}: ${point.score}%`}
          />
        </div>
      ))}
    </div>
  );
}

function MoveList({ moves }: { moves: MoveNode[] }) {
  if (moves.length === 0) {
    return <div className={styles.emptyPanel}>No moves were saved.</div>;
  }

  return (
    <ol className={styles.moveList}>
      {moves.map((move, index) => (
        <li className={styles.moveItem} key={`${move.moveNumber}-${move.player}-${index}`}>
          <div>
            <strong>{getMoveLabel(move)}</strong>
            <span>Eval {formatEval(move.evalAfter)}</span>
          </div>
          {move.quality ? (
            <span className={styles.quality} data-quality={move.quality}>
              {qualityCopy[move.quality]}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function LearningNotes({ game }: { game: SavedGame }) {
  const updates = deriveCoachMemoryUpdates(game.moveHistory, game.playerColor);
  const notes = getLearningNotes(game);

  if (updates.length === 0 && notes.length === 0 && !game.coachMessages.trim()) {
    return (
      <div className={styles.emptyPanel}>
        Coach notes will appear here after analyzed moves.
      </div>
    );
  }

  return (
    <div className={styles.notes}>
      {updates.map((update) => (
        <article className={styles.memoryCard} data-severity={update.severity} key={update.id}>
          <div>
            <strong>{update.label}</strong>
            <span>{update.count} signal{update.count === 1 ? '' : 's'}</span>
          </div>
          <p>{update.detail}</p>
        </article>
      ))}

      {game.coachMessages.trim() ? (
        <article className={styles.coachMessage}>
          <strong>Coach summary</strong>
          <p>{game.coachMessages}</p>
        </article>
      ) : null}

      {notes.map((note) => (
        <article className={styles.coachMessage} key={note.id}>
          <strong>{note.moveLabel}</strong>
          <p>{note.note}</p>
        </article>
      ))}
    </div>
  );
}

export function AnalysisClient({ gameId }: AnalysisClientProps) {
  const [game, setGame] = useState<SavedGame | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGame() {
      setIsLoading(true);
      setError(null);
      setGame(null);

      try {
        const { game: loadedGame } = await apiJson<GameResponse>(
          `/api/games/${gameId}`,
        );

        if (isMounted) {
          setGame(loadedGame);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load game',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadGame();

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  const openingMoves = useMemo(
    () => game?.moveHistory.slice(0, 6).map((move) => move.san).join(' ') ?? '',
    [game],
  );

  return (
    <section className={styles.page} aria-labelledby="analysis-title">
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Analysis</p>
          <h1 id="analysis-title">Game review</h1>
          {game ? (
            <p>
              {formatDate(game.date)} / You played {formatColor(game.playerColor)}
            </p>
          ) : null}
        </div>
        <Link className={styles.backLink} href="/history">
          History
        </Link>
      </header>

      {isLoading ? <div className={styles.panel}>Loading game...</div> : null}

      {error ? (
        <div className={styles.panel} role="alert">
          <strong>Could not load this game.</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {game ? (
        <div className={styles.layout}>
          <section className={styles.panel} aria-label="Game summary">
            <Summary game={game} />
            {openingMoves ? <p className={styles.pgnPreview}>{openingMoves}</p> : null}
          </section>

          <section className={styles.panel} aria-labelledby="accuracy-title">
            <div className={styles.sectionTitle}>
              <p className="eyebrow">Quality</p>
              <h2 id="accuracy-title">Accuracy lane</h2>
            </div>
            <AccuracyGraph game={game} />
          </section>

          <section className={styles.panel} aria-labelledby="moves-title">
            <div className={styles.sectionTitle}>
              <p className="eyebrow">Moves</p>
              <h2 id="moves-title">Move list</h2>
            </div>
            <MoveList moves={game.moveHistory} />
          </section>

          <section className={styles.panel} aria-labelledby="memory-title">
            <div className={styles.sectionTitle}>
              <p className="eyebrow">Coach</p>
              <h2 id="memory-title">Memory notes</h2>
            </div>
            <LearningNotes game={game} />
          </section>
        </div>
      ) : null}
    </section>
  );
}
