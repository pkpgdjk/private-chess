'use client';

import type { FormEvent } from 'react';

import type {
  CoachEffort,
  CoachModel,
  CoachProvider,
  Settings,
} from '@/types/chess';

import styles from './SettingsPanel.module.css';

type SettingsPatch = Partial<Settings> & {
  anthropicApiKey?: string;
  openaiApiKey?: string;
};

type SettingsPanelProps = {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  onPatch: (patch: SettingsPatch) => void | Promise<void>;
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

const inputModeOptions: Option<Settings['pieceDragOrTap']>[] = [
  { value: 'drag', label: 'Drag pieces (soon)' },
  { value: 'tap', label: 'Tap squares (soon)' },
];

const boardThemeOptions: Option<Settings['boardTheme']>[] = [
  { value: 'classic', label: 'Classic (soon)' },
  { value: 'dark', label: 'Dark (soon)' },
  { value: 'marble', label: 'Marble (soon)' },
];

const pieceSetOptions: Option<Settings['pieceSet']>[] = [
  { value: 'unicode', label: 'Unicode (soon)' },
  { value: 'svg', label: 'Horsey (soon)' },
];

type CoachModelSettings = Pick<Settings, 'coachProvider' | 'coachModel'>;

export function getCompatibleCoachModel(settings: CoachModelSettings) {
  const providerModels = modelOptions[settings.coachProvider];
  const modelIsAvailable = providerModels.some(
    (option) => option.value === settings.coachModel,
  );

  return modelIsAvailable ? settings.coachModel : providerModels[0].value;
}

export function getCoachModelNormalizationPatch(settings: CoachModelSettings) {
  const coachModel = getCompatibleCoachModel(settings);

  return coachModel === settings.coachModel ? null : { coachModel };
}

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

function ApiKeyControl({
  provider,
  saved,
  onPatch,
}: {
  provider: CoachProvider;
  saved: boolean;
  onPatch: SettingsPanelProps['onPatch'];
}) {
  const label = provider === 'openai' ? 'OpenAI API key' : 'Anthropic API key';
  const patchKey = provider === 'openai' ? 'openaiApiKey' : 'anthropicApiKey';
  const inputId = `api-key-${provider}`;

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const value = formData.get('apiKey');
    const trimmed = typeof value === 'string' ? value.trim() : '';

    if (!trimmed) {
      return;
    }

    void onPatch({ [patchKey]: trimmed });
    form.reset();
  };

  return (
    <div className={styles.secretField}>
      <span className={styles.secretHeader}>
        <label htmlFor={inputId}>{label}</label>
        <strong>{saved ? 'Saved' : 'Not saved'}</strong>
      </span>
      <form className={styles.secretInputRow} onSubmit={save}>
        <input
          autoComplete="off"
          id={inputId}
          name="apiKey"
          placeholder={saved ? 'Replace saved key' : 'Paste key'}
          type="password"
        />
        <button type="submit">Save</button>
      </form>
    </div>
  );
}

export function SettingsPanel({
  settings,
  isLoading,
  error,
  onPatch,
}: SettingsPanelProps) {
  const providerModels = modelOptions[settings.coachProvider];
  const coachModel = getCompatibleCoachModel(settings);
  const hasSelectedProviderKey =
    settings.coachProvider === 'openai'
      ? settings.hasOpenAIKey
      : settings.hasAnthropicKey;

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
            label="Bot delay (soon)"
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
              checked={settings.showCapturedPieces}
              label="Captured pieces (soon)"
              onChange={(checked) =>
                patchSetting(onPatch, 'showCapturedPieces', checked)
              }
            />
            <ToggleControl
              checked={settings.boardCoordinates}
              label="Coordinates (soon)"
              onChange={(checked) =>
                patchSetting(onPatch, 'boardCoordinates', checked)
              }
            />
            <ToggleControl
              checked={settings.autoQueenPromotion}
              label="Promotion choice (soon)"
              onChange={(checked) =>
                patchSetting(onPatch, 'autoQueenPromotion', checked)
              }
            />
            <ToggleControl
              checked={settings.allowUndo}
              label="Allow undo"
              onChange={(checked) => patchSetting(onPatch, 'allowUndo', checked)}
            />
            <ToggleControl
              checked={settings.moveConfirmation}
              label="Confirm moves (soon)"
              onChange={(checked) =>
                patchSetting(onPatch, 'moveConfirmation', checked)
              }
            />
            <ToggleControl
              checked={settings.hintButton}
              label="Hint button (soon)"
              onChange={(checked) => patchSetting(onPatch, 'hintButton', checked)}
            />
            <ToggleControl
              checked={settings.soundEffects}
              label="Sound effects (soon)"
              onChange={(checked) =>
                patchSetting(onPatch, 'soundEffects', checked)
              }
            />
            <ToggleControl
              checked={settings.hapticFeedback}
              label="Haptic feedback (soon)"
              onChange={(checked) =>
                patchSetting(onPatch, 'hapticFeedback', checked)
              }
            />
            <ToggleControl
              checked={settings.zenMode}
              label="Zen mode (soon)"
              onChange={(checked) => patchSetting(onPatch, 'zenMode', checked)}
            />
          </div>

          <div className={styles.fields}>
            <SelectControl
              label="Input mode (soon)"
              onChange={(value) =>
                patchSetting(onPatch, 'pieceDragOrTap', value)
              }
              options={inputModeOptions}
              value={settings.pieceDragOrTap}
            />
            <SelectControl
              label="Board theme (soon)"
              onChange={(value) => patchSetting(onPatch, 'boardTheme', value)}
              options={boardThemeOptions}
              value={settings.boardTheme}
            />
            <SelectControl
              label="Piece set (soon)"
              onChange={(value) => patchSetting(onPatch, 'pieceSet', value)}
              options={pieceSetOptions}
              value={settings.pieceSet}
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
              label="Coach level"
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
            <ApiKeyControl
              onPatch={onPatch}
              provider={settings.coachProvider}
              saved={hasSelectedProviderKey}
            />
          </div>

          <div className={styles.toggles}>
            <ToggleControl
              checked={settings.realTimeCoach}
              label="Real-time coach"
              onChange={(checked) =>
                patchSetting(onPatch, 'realTimeCoach', checked)
              }
            />
            <ToggleControl
              checked={settings.criticalMomentsOnly}
              label="Critical moments only"
              onChange={(checked) =>
                patchSetting(onPatch, 'criticalMomentsOnly', checked)
              }
            />
            <ToggleControl
              checked={settings.blunderShield}
              label="Blunder shield (soon)"
              onChange={(checked) =>
                patchSetting(onPatch, 'blunderShield', checked)
              }
            />
            <ToggleControl
              checked={settings.showEvalBar}
              label="Eval bar (soon)"
              onChange={(checked) => patchSetting(onPatch, 'showEvalBar', checked)}
            />
            <ToggleControl
              checked={settings.showArrows}
              label="Coach arrows (soon)"
              onChange={(checked) => patchSetting(onPatch, 'showArrows', checked)}
            />
            <ToggleControl
              checked={settings.threatIndicator}
              label="Threat indicator"
              onChange={(checked) =>
                patchSetting(onPatch, 'threatIndicator', checked)
              }
            />
            <ToggleControl
              checked={settings.aiVoice}
              label="AI voice (soon)"
              onChange={(checked) => patchSetting(onPatch, 'aiVoice', checked)}
            />
            <ToggleControl
              checked={settings.autoSaveGames}
              label="Auto-save games"
              onChange={(checked) =>
                patchSetting(onPatch, 'autoSaveGames', checked)
              }
            />
            <ToggleControl
              checked={settings.showOpeningName}
              label="Opening name (soon)"
              onChange={(checked) =>
                patchSetting(onPatch, 'showOpeningName', checked)
              }
            />
          </div>
        </section>
      </div>
    </section>
  );
}
