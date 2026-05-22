'use client';

import type {
  CoachEffort,
  CoachModel,
  CoachProvider,
  Settings,
} from '@/types/chess';

import styles from './SettingsPanel.module.css';

type SettingsPanelProps = {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  onPatch: (patch: Partial<Settings>) => void | Promise<void>;
};

type Option<T extends string> = {
  value: T;
  label: string;
};

const providerOptions: Option<CoachProvider>[] = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
];

const modelOptions: Record<CoachProvider, Option<CoachModel>[]> = {
  anthropic: [
    { value: 'haiku', label: 'Haiku' },
    { value: 'sonnet', label: 'Sonnet' },
  ],
  openai: [
    { value: 'gpt-mini', label: 'GPT mini' },
    { value: 'gpt', label: 'GPT' },
  ],
};

const effortOptions: Option<CoachEffort>[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const levelOptions: Option<Settings['coachLevel']>[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Steady' },
  { value: 'advanced', label: 'Sharp' },
];

const languageOptions: Option<Settings['coachLanguage']>[] = [
  { value: 'en', label: 'English' },
  { value: 'th', label: 'Thai' },
];

function patchSetting<K extends keyof Settings>(
  onPatch: SettingsPanelProps['onPatch'],
  key: K,
  value: Settings[K],
) {
  void onPatch({ [key]: value } as Partial<Settings>);
}

function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
        className={styles.select}
        onChange={(event) => onChange(event.currentTarget.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleControl({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.toggle}>
      <span>{label}</span>
      <input
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
    </label>
  );
}

function RangeControl({
  label,
  max,
  min,
  step = 1,
  suffix,
  value,
  onChange,
}: {
  label: string;
  max: number;
  min: number;
  step?: number;
  suffix?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.range}>
      <span className={styles.rangeHeader}>
        <span>{label}</span>
        <strong>
          {value}
          {suffix}
        </strong>
      </span>
      <input
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

export function SettingsPanel({
  settings,
  isLoading,
  error,
  onPatch,
}: SettingsPanelProps) {
  const providerModels = modelOptions[settings.coachProvider];
  const modelIsAvailable = providerModels.some(
    (option) => option.value === settings.coachModel,
  );
  const coachModel = modelIsAvailable
    ? settings.coachModel
    : providerModels[0].value;

  const updateProvider = (provider: CoachProvider) => {
    const firstModel = modelOptions[provider][0].value;
    void onPatch({ coachProvider: provider, coachModel: firstModel });
  };

  return (
    <section className={styles.page} aria-labelledby="settings-title">
      <div className={styles.header}>
        <div>
          <p className="eyebrow">Profile</p>
          <h1 id="settings-title">Settings</h1>
        </div>
        <span className={styles.status}>
          {isLoading ? 'Syncing' : 'Saved on change'}
        </span>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="settings-gameplay">
          <div className={styles.cardHeader}>
            <p className="eyebrow">Game</p>
            <h2 id="settings-gameplay">Board feel</h2>
          </div>

          <div className={styles.segmented} aria-label="Player color">
            <button
              aria-pressed={settings.playerColor === 'w'}
              onClick={() => patchSetting(onPatch, 'playerColor', 'w')}
              type="button"
            >
              White
            </button>
            <button
              aria-pressed={settings.playerColor === 'b'}
              onClick={() => patchSetting(onPatch, 'playerColor', 'b')}
              type="button"
            >
              Black
            </button>
          </div>

          <RangeControl
            label="Bot strength"
            max={20}
            min={1}
            onChange={(value) => patchSetting(onPatch, 'botStrength', value)}
            value={settings.botStrength}
          />
          <RangeControl
            label="Move time"
            max={10000}
            min={100}
            onChange={(value) => patchSetting(onPatch, 'botTimeMs', value)}
            step={100}
            suffix=" ms"
            value={settings.botTimeMs}
          />

          <div className={styles.toggles}>
            <ToggleControl
              checked={settings.legalMoveOverlay}
              label="Legal move overlay"
              onChange={(checked) =>
                patchSetting(onPatch, 'legalMoveOverlay', checked)
              }
            />
            <ToggleControl
              checked={settings.flipBoard}
              label="Flip board"
              onChange={(checked) => patchSetting(onPatch, 'flipBoard', checked)}
            />
            <ToggleControl
              checked={settings.allowUndo}
              label="Allow undo"
              onChange={(checked) => patchSetting(onPatch, 'allowUndo', checked)}
            />
            <ToggleControl
              checked={settings.soundEffects}
              label="Sound effects"
              onChange={(checked) =>
                patchSetting(onPatch, 'soundEffects', checked)
              }
            />
          </div>
        </section>

        <section className={styles.card} aria-labelledby="settings-coach">
          <div className={styles.cardHeader}>
            <p className="eyebrow">Coach</p>
            <h2 id="settings-coach">AI style</h2>
          </div>

          <div className={styles.fields}>
            <SelectControl
              label="Provider"
              onChange={updateProvider}
              options={providerOptions}
              value={settings.coachProvider}
            />
            <SelectControl
              label="Model"
              onChange={(value) => patchSetting(onPatch, 'coachModel', value)}
              options={providerModels}
              value={coachModel}
            />
            <SelectControl
              label="Effort"
              onChange={(value) => patchSetting(onPatch, 'coachEffort', value)}
              options={effortOptions}
              value={settings.coachEffort}
            />
            <SelectControl
              label="Level"
              onChange={(value) => patchSetting(onPatch, 'coachLevel', value)}
              options={levelOptions}
              value={settings.coachLevel}
            />
            <SelectControl
              label="Language"
              onChange={(value) =>
                patchSetting(onPatch, 'coachLanguage', value)
              }
              options={languageOptions}
              value={settings.coachLanguage}
            />
          </div>

          <div className={styles.toggles}>
            <ToggleControl
              checked={settings.criticalMomentsOnly}
              label="Critical moments only"
              onChange={(checked) =>
                patchSetting(onPatch, 'criticalMomentsOnly', checked)
              }
            />
          </div>
        </section>
      </div>
    </section>
  );
}
