import * as SQLite from 'expo-sqlite';
import type { MoveNode } from '@/types/chess';

export interface ActiveGameRecord {
  history: MoveNode[];
  playerColor: 'w' | 'b';
  currentMoveIndex: number;
  updatedAt: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('chess-trainer.db').then(async (db) => {
      // Single-row table — id=1 is the in-progress game; replaced on each save.
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS active_game (
          id INTEGER PRIMARY KEY,
          history TEXT NOT NULL,
          playerColor TEXT NOT NULL,
          currentMoveIndex INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function saveActiveGame(record: ActiveGameRecord): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO active_game (id, history, playerColor, currentMoveIndex, updatedAt) VALUES (1, ?, ?, ?, ?)`,
      [
        JSON.stringify(record.history),
        record.playerColor,
        record.currentMoveIndex,
        record.updatedAt,
      ]
    );
  } catch (err) {
    console.warn('saveActiveGame failed', err);
  }
}

export async function loadActiveGame(): Promise<ActiveGameRecord | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{
      history: string;
      playerColor: string;
      currentMoveIndex: number;
      updatedAt: number;
    }>(`SELECT history, playerColor, currentMoveIndex, updatedAt FROM active_game WHERE id = 1`);
    if (!row) return null;
    return {
      history: JSON.parse(row.history),
      playerColor: row.playerColor as 'w' | 'b',
      currentMoveIndex: row.currentMoveIndex,
      updatedAt: row.updatedAt,
    };
  } catch (err) {
    console.warn('loadActiveGame failed', err);
    return null;
  }
}

export async function clearActiveGame(): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(`DELETE FROM active_game WHERE id = 1`);
  } catch (err) {
    console.warn('clearActiveGame failed', err);
  }
}
