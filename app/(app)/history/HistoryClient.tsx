'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect } from 'react';

import { useHistoryStore } from '@/client/stores/historyStore';
import type { SavedGame } from '@/types/chess';

import styles from './history.module.css';

const resultCopy: Record<SavedGame['result'], string> = {
  win: 'Win',
  loss: 'Loss',
  draw: 'Draw',
};

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatMoveCount(game: SavedGame) {
  const count = game.moveHistory.length;
  return `${count} ${count === 1 ? 'move' : 'moves'}`;
}

function analysisHref(gameId: string) {
  return `/analysis/${gameId}` as Route;
}

function GameRow({ game }: { game: SavedGame }) {
  return (
    <Link className={styles.gameRow} href={analysisHref(game.id)}>
      <div className={styles.gameMain}>
        <span className={styles.result} data-result={game.result}>
          {resultCopy[game.result]}
        </span>
        <div className={styles.gameText}>
          <strong>{formatDate(game.date)}</strong>
          <span>
            Bot strength {game.botStrength} / {formatMoveCount(game)}
          </span>
        </div>
      </div>
      <span className={styles.chevron} aria-hidden="true">
        &rarr;
      </span>
    </Link>
  );
}

export function HistoryClient() {
  const games = useHistoryStore((state) => state.games);
  const isLoading = useHistoryStore((state) => state.isLoading);
  const error = useHistoryStore((state) => state.error);
  const loadGames = useHistoryStore((state) => state.loadGames);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  return (
    <section className={styles.page} aria-labelledby="history-title">
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Games</p>
          <h1 id="history-title">History</h1>
        </div>
        <span className={styles.count}>{games.length} saved</span>
      </header>

      {error ? (
        <div className={styles.notice} role="alert">
          {error}
        </div>
      ) : null}

      {isLoading && games.length === 0 ? (
        <div className={styles.notice}>Loading saved games...</div>
      ) : null}

      {!isLoading && games.length === 0 && !error ? (
        <div className={styles.empty}>
          <div>
            <p className="eyebrow">No saved games</p>
            <h2>Your archive is still warming up.</h2>
            <p>Play a game and it will appear here for review.</p>
          </div>
          <Link className={styles.primaryAction} href="/play">
            Start playing
          </Link>
        </div>
      ) : null}

      {games.length > 0 ? (
        <div className={styles.list} aria-label="Saved games">
          {games.map((game) => (
            <GameRow game={game} key={game.id} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
