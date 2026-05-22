import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSettingsStore } from '@/client/stores/settingsStore';
import { defaultSettings } from '@/constants/settings';

describe('useSettingsStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useSettingsStore.setState({
      settings: defaultSettings,
      isLoading: false,
      error: null,
    });
  });

  it('sends partial settings updates to the settings API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          settings: { ...defaultSettings, playerColor: 'b' },
        }),
      })),
    );

    await useSettingsStore.getState().updateSettings({ playerColor: 'b' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/settings',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ playerColor: 'b' }),
      }),
    );
    expect(useSettingsStore.getState().settings.playerColor).toBe('b');
  });
});
