import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import type { SavedGame } from '@/types/chess';

interface HistoryStore {
  games: SavedGame[];
  isLoading: boolean;
  loadGames: () => Promise<void>;
  saveGame: (game: SavedGame) => Promise<void>;
  deleteGame: (id: string) => Promise<void>;
  getGame: (id: string) => SavedGame | undefined;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('chess-trainer.db').then(async (db) => {
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS games (
          id TEXT PRIMARY KEY,
          date INTEGER,
          pgn TEXT,
          result TEXT,
          playerColor TEXT,
          botStrength INTEGER,
          coachMessages TEXT,
          moveHistory TEXT
        )
      `);
      return db;
    });
  }
  return dbPromise;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  games: [],
  isLoading: false,

  loadGames: async () => {
    set({ isLoading: true });
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM games ORDER BY date DESC');
      const games: SavedGame[] = rows.map((row) => ({
        id: String(row.id),
        date: Number(row.date),
        pgn: String(row.pgn),
        result: row.result as SavedGame['result'],
        playerColor: row.playerColor as SavedGame['playerColor'],
        botStrength: Number(row.botStrength),
        coachMessages: String(row.coachMessages),
        moveHistory: JSON.parse(String(row.moveHistory)),
      }));
      set({ games, isLoading: false });
    } catch (error) {
      console.error('Failed to load games:', error);
      set({ isLoading: false });
    }
  },

  saveGame: async (game) => {
    try {
      const db = await getDb();
      const id = game.id || Date.now().toString(36);
      await db.runAsync(
        `INSERT OR REPLACE INTO games (id, date, pgn, result, playerColor, botStrength, coachMessages, moveHistory) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          game.date,
          game.pgn,
          game.result,
          game.playerColor,
          game.botStrength,
          game.coachMessages,
          JSON.stringify(game.moveHistory),
        ]
      );
      await get().loadGames();
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  },

  deleteGame: async (id) => {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM games WHERE id = ?', [id]);
      set((state) => ({
        games: state.games.filter((g) => g.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  },

  getGame: (id) => {
    return get().games.find((g) => g.id === id);
  },
}));
