import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { Settings } from '@/types/chess';
import { defaultSettings } from '@/constants/settings';

interface SettingsStore extends Settings {
  apiKey: string;
  openaiApiKey: string;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
  setApiKey: (key: string) => void;
  setOpenAIApiKey: (key: string) => void;
}

// SecureStore values are capped at 2 KB. Settings are small (booleans + a few
// short strings), so the whole store fits comfortably under that limit even
// with the API key included.
const secureStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return (await SecureStore.getItemAsync(name)) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {
      // Storage failures are non-fatal — settings just won't persist this run.
    }
  },
  removeItem: async (name) => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {
      // ignore
    }
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      apiKey: '',
      openaiApiKey: '',
      updateSetting: (key, value) => set((state) => ({ ...state, [key]: value })),
      resetSettings: () => set((state) => ({ ...defaultSettings, apiKey: state.apiKey, openaiApiKey: state.openaiApiKey })),
      setApiKey: (key) => set({ apiKey: key }),
      setOpenAIApiKey: (key) => set({ openaiApiKey: key }),
    }),
    {
      name: 'chess-trainer-settings',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
