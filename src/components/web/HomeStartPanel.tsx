'use client';

import type { Settings } from '@/types/chess';

import styles from './HomeStartPanel.module.css';

type SettingsPatch = Pick<Settings, 'botStrength' | 'playerColor'>;

type HomeStartPanelProps = {
  settings: Settings;
  isLoading: boolean;
  onPatch: (patch: Partial<SettingsPatch>) => void | Promise<void>;
  onStart: () => void;
};

const botLevelPresets = [
  { detail: 'Learn safely', icon: '♧', label: 'Easy', value: 4 },
  { detail: 'A balanced challenge', icon: '★', label: 'Medium', value: 10 },
  { detail: 'Tactical pressure', icon: '♜', label: 'Hard', value: 15 },
  { detail: 'Sharp defense', icon: '♛', label: 'Expert', value: 20 },
] as const;

export function HomeStartPanel({
  settings,
  isLoading,
  onPatch,
  onStart,
}: HomeStartPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="start-setup-title">
      <div className={styles.header}>
        <div>
          <p className="eyebrow">Choose your level</p>
          <h2 id="start-setup-title">New game</h2>
        </div>
        <span>{isLoading ? 'Loading' : `Level ${settings.botStrength}`}</span>
      </div>

      <div className={styles.presets} aria-label="AI bot level">
        {botLevelPresets.map((preset) => (
          <button
            aria-pressed={settings.botStrength === preset.value}
            key={preset.value}
            onClick={() => onPatch({ botStrength: preset.value })}
            type="button"
          >
            <span aria-hidden="true">{preset.icon}</span>
            <strong>{preset.label}</strong>
            <small>{preset.detail}</small>
          </button>
        ))}
      </div>

      <button className={styles.startButton} onClick={onStart} type="button">
        <span aria-hidden="true">▶</span>
        Play New
      </button>
    </section>
  );
}
