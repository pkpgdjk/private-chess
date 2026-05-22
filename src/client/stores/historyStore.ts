'use client';

import { create } from 'zustand';

import { apiJson } from '@/client/api';
import type { SavedGame } from '@/types/chess';

type GamesListResponse = {
  games: SavedGame[];
};

type GameSaveResponse = {
  game: SavedGame;
};

type HistoryStore = {
  games: SavedGame[];
  isLoading: boolean;
  error: string | null;
  loadGames: () => Promise<void>;
  saveGame: (game: SavedGame) => Promise<SavedGame | null>;
};

export const useHistoryStore = create<HistoryStore>((set) => ({
  games: [],
  isLoading: false,
  error: null,

  loadGames: async () => {
    set({ isLoading: true, error: null });

    try {
      const { games } = await apiJson<GamesListResponse>('/api/games');
      set({ games, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load games',
        isLoading: false,
      });
    }
  },

  saveGame: async (game) => {
    set({ error: null });

    try {
      const { game: savedGame } = await apiJson<GameSaveResponse>('/api/games', {
        method: 'POST',
        body: JSON.stringify(game),
      });
      set((state) => ({
        games: [
          savedGame,
          ...state.games.filter((item) => item.id !== savedGame.id),
        ],
      }));
      return savedGame;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save game',
      });
      return null;
    }
  },
}));
