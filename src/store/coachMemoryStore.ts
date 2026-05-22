import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import type { MoveNode } from '@/types/chess';
import { deriveCoachMemoryUpdates, type CoachMemoryUpdate } from '@/utils/learning';

export interface CoachMemoryEntry {
  id: string;
  label: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  lastSeen: number;
}

interface CoachMemoryStore {
  entries: CoachMemoryEntry[];
  isLoading: boolean;
  loadMemory: () => Promise<void>;
  recordGame: (history: MoveNode[], playerColor: 'w' | 'b') => Promise<void>;
  clearMemory: () => Promise<void>;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('chess-trainer.db').then(async (db) => {
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS coach_memory (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          detail TEXT NOT NULL,
          severity TEXT NOT NULL,
          count INTEGER NOT NULL,
          lastSeen INTEGER NOT NULL
        )
      `);
      return db;
    });
  }
  return dbPromise;
}

export const useCoachMemoryStore = create<CoachMemoryStore>((set, get) => ({
  entries: [],
  isLoading: false,

  loadMemory: async () => {
    set({ isLoading: true });
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<Record<string, unknown>>(
        'SELECT * FROM coach_memory ORDER BY count DESC, lastSeen DESC'
      );
      set({
        entries: rows.map((row) => ({
          id: String(row.id),
          label: String(row.label),
          detail: String(row.detail),
          severity: row.severity as CoachMemoryEntry['severity'],
          count: Number(row.count),
          lastSeen: Number(row.lastSeen),
        })),
        isLoading: false,
      });
    } catch (error) {
      console.warn('loadCoachMemory failed', error);
      set({ isLoading: false });
    }
  },

  recordGame: async (history, playerColor) => {
    const updates = deriveCoachMemoryUpdates(history, playerColor);
    if (updates.length === 0) return;
    try {
      const db = await getDb();
      const now = Date.now();
      for (const update of updates) {
        await db.runAsync(
          `INSERT INTO coach_memory (id, label, detail, severity, count, lastSeen)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             count = count + excluded.count,
             lastSeen = excluded.lastSeen,
             label = excluded.label,
             detail = excluded.detail,
             severity = excluded.severity`,
          [update.id, update.label, update.detail, update.severity, update.count, now]
        );
      }
      await get().loadMemory();
    } catch (error) {
      console.warn('recordCoachMemory failed', error);
    }
  },

  clearMemory: async () => {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM coach_memory');
      set({ entries: [] });
    } catch (error) {
      console.warn('clearCoachMemory failed', error);
    }
  },
}));
