'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSettingsStore } from '@/client/stores/settingsStore';
import { HomeStartPanel } from '@/components/web/HomeStartPanel';

export function HomeClient() {
  const router = useRouter();
  const settings = useSettingsStore((state) => state.settings);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return (
    <HomeStartPanel
      isLoading={isLoading}
      onPatch={updateSettings}
      onStart={() => router.push('/play?new=1')}
      settings={settings}
    />
  );
}
