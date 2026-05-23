'use client';

import { create } from 'zustand';

import { apiJson } from '@/client/api';
import { defaultSettings } from '@/constants/settings';
import type { Settings } from '@/types/chess';

type SettingsResponse = {
  settings: Settings;
};

type SettingsPatch = Partial<Settings> & {
  anthropicApiKey?: string;
  openaiApiKey?: string;
};

type SettingsStore = {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: SettingsPatch) => Promise<void>;
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      const { settings } = await apiJson<SettingsResponse>('/api/settings');
      set({ settings, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load settings',
        isLoading: false,
      });
    }
  },

  updateSettings: async (patch) => {
    const previous = get().settings;
    const {
      anthropicApiKey: _anthropicApiKey,
      openaiApiKey: _openaiApiKey,
      ...settingsPatch
    } = patch;
    const nextSettings = { ...previous, ...settingsPatch };
    set({ settings: nextSettings, error: null });

    try {
      const { settings } = await apiJson<SettingsResponse>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      set({ settings });
    } catch (error) {
      set({
        settings: previous,
        error: error instanceof Error ? error.message : 'Failed to save settings',
      });
    }
  },
}));
