'use client';

import { useEffect } from 'react';

import { useSettingsStore } from '@/client/stores/settingsStore';
import {
  getCoachModelNormalizationPatch,
  SettingsPanel,
} from '@/components/web/settings/SettingsPanel';

export function SettingsClient() {
  const settings = useSettingsStore((state) => state.settings);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const error = useSettingsStore((state) => state.error);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const { coachModel, coachProvider } = settings;

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const patch = getCoachModelNormalizationPatch({
      coachModel,
      coachProvider,
    });

    if (patch) {
      void updateSettings(patch);
    }
  }, [coachModel, coachProvider, updateSettings]);

  return (
    <SettingsPanel
      error={error}
      isLoading={isLoading}
      onPatch={updateSettings}
      settings={settings}
    />
  );
}
