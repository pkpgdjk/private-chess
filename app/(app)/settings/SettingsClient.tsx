'use client';

import { useEffect } from 'react';

import { useSettingsStore } from '@/client/stores/settingsStore';
import { SettingsPanel } from '@/components/web/settings/SettingsPanel';

export function SettingsClient() {
  const settings = useSettingsStore((state) => state.settings);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const error = useSettingsStore((state) => state.error);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return (
    <SettingsPanel
      error={error}
      isLoading={isLoading}
      onPatch={updateSettings}
      settings={settings}
    />
  );
}
