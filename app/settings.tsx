import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  TouchableOpacity,
  GestureResponderEvent,
  LayoutChangeEvent,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useSettingsStore } from '@/store/settingsStore';
import { featureToggleSections, coachLevelDescriptions } from '@/constants/settings';
import { colors } from '@/constants/colors';
import { palette, radius, space, font } from '@/constants/design';
import { SettingToggle } from '@/components/settings/SettingToggle';
import type { Settings } from '@/types/chess';
import { getDefaultModelForProvider } from '@/ai/coachProvider';

const settingLabels: Record<keyof Settings, string> = {
  realTimeCoach: 'Real-time Coach',
  criticalMomentsOnly: 'Critical Moments Only',
  blunderShield: 'Blunder Shield',
  moveConfirmation: 'Move Confirmation',
  hintButton: 'Hint Button',
  coachLevel: 'Coach Level',
  coachLanguage: 'Coach Language',
  coachProvider: 'Coach Provider',
  coachModel: 'Coach Model',
  coachEffort: 'Coach Effort',
  showEvalBar: 'Show Eval Bar',
  showArrows: 'Show Arrows',
  legalMoveOverlay: 'Legal Move Overlay',
  showCapturedPieces: 'Show Captured Pieces',
  boardCoordinates: 'Board Coordinates',
  pieceDragOrTap: 'Piece Drag or Tap',
  autoQueenPromotion: 'Auto Queen Promotion',
  allowUndo: 'Allow Undo',
  flipBoard: 'Flip Board',
  zenMode: 'Zen Mode',
  soundEffects: 'Sound Effects',
  hapticFeedback: 'Haptic Feedback',
  aiVoice: 'AI Voice',
  autoSaveGames: 'Auto Save Games',
  showOpeningName: 'Show Opening Name',
  threatIndicator: 'Threat Indicator',
  botStrength: 'Bot Strength',
  botTimeMs: 'Bot Time (ms)',
  playerColor: 'Player Color',
  boardTheme: 'Board Theme',
  pieceSet: 'Piece Set',
};

const COACH_LEVELS: Settings['coachLevel'][] = ['beginner', 'intermediate', 'advanced'];
const COACH_LANGUAGES: Settings['coachLanguage'][] = ['en', 'th'];
const COACH_PROVIDERS: Settings['coachProvider'][] = ['anthropic', 'openai'];
const ANTHROPIC_MODELS: Settings['coachModel'][] = ['haiku', 'sonnet'];
const OPENAI_MODELS: Settings['coachModel'][] = ['gpt-mini', 'gpt'];
const COACH_EFFORTS: Settings['coachEffort'][] = ['low', 'medium', 'high'];

const coachModelDescriptions: Record<Settings['coachModel'], string> = {
  haiku: 'Haiku 4.5. Fast and cheap, about $0.003 per move. Best for everyday play.',
  sonnet: 'Sonnet 4.6. Slower but more nuanced, about $0.009 per move. Best for serious study.',
  'gpt-mini': 'GPT-5.4 mini. Fast OpenAI coach for everyday play.',
  gpt: 'GPT-5.5. Strongest OpenAI coach for deeper review.',
};

const coachEffortDescriptions: Record<Settings['coachEffort'], string> = {
  low: 'Low. Fastest, terser answers. Good default. Sonnet only, ignored for Haiku.',
  medium: 'Medium. Balanced. Slightly slower, more thorough.',
  high: 'High. Most thorough but noticeably slower, about 2-3x the low-effort time.',
};
const PLAYER_COLORS: Settings['playerColor'][] = ['w', 'b'];
const DRAG_TAP_OPTIONS: Settings['pieceDragOrTap'][] = ['drag', 'tap'];
const BOARD_THEMES: Settings['boardTheme'][] = ['classic', 'dark', 'marble'];
const PIECE_SETS: Settings['pieceSet'][] = ['unicode', 'svg'];

function SegmentedControl<T extends string>({
  options,
  labels,
  selected,
  onSelect,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.segmentContainer}>
      {options.map((option) => {
        const isActive = option === selected;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
            onPress={() => onSelect(option)}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {labels[option]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CustomSlider({
  min,
  max,
  step,
  value,
  onValueChange,
  suffix = '',
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (v: number) => void;
  suffix?: string;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const percentage = (value - min) / (max - min);

  const handleTouch = useCallback(
    (e: GestureResponderEvent) => {
      if (trackWidth === 0) return;
      const x = e.nativeEvent.locationX;
      const pct = Math.max(0, Math.min(1, x / trackWidth));
      const raw = min + pct * (max - min);
      const stepped = Math.round(raw / step) * step;
      onValueChange(Math.max(min, Math.min(max, stepped)));
    },
    [trackWidth, min, max, step, onValueChange]
  );

  return (
    <View style={styles.sliderContainer}>
      <View
        style={styles.sliderTrackWrapper}
        onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
      >
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${percentage * 100}%` }]} />
        </View>
        <View style={[styles.sliderThumb, { left: percentage * trackWidth - 10 }]} />
      </View>
      <Text style={styles.sliderValue}>
        {value}
        {suffix}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const updateSetting = settings.updateSetting;
  const resetSettings = settings.resetSettings;
  const apiKey = settings.apiKey;
  const setApiKey = settings.setApiKey;
  const openaiApiKey = settings.openaiApiKey;
  const setOpenAIApiKey = settings.setOpenAIApiKey;

  const handleReset = useCallback(() => {
    Alert.alert('Reset Settings', 'Are you sure you want to reset all settings to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => resetSettings(),
      },
    ]);
  }, [resetSettings]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const renderSettingControl = (key: keyof Settings) => {
    const value = settings[key];

    switch (key) {
      case 'coachLevel': {
        const v = value as Settings['coachLevel'];
        return (
          <View>
            <SegmentedControl
              options={COACH_LEVELS}
              labels={{ beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }}
              selected={v}
              onSelect={(val) => updateSetting('coachLevel', val)}
            />
            <Text style={styles.descriptionText}>{coachLevelDescriptions[v]}</Text>
          </View>
        );
      }
      case 'coachLanguage':
        return (
          <SegmentedControl
            options={COACH_LANGUAGES}
            labels={{ en: 'English', th: 'ภาษาไทย' }}
            selected={value as Settings['coachLanguage']}
            onSelect={(val) => updateSetting('coachLanguage', val)}
          />
        );
      case 'coachProvider':
        return (
          <SegmentedControl
            options={COACH_PROVIDERS}
            labels={{ anthropic: 'Anthropic', openai: 'OpenAI' }}
            selected={value as Settings['coachProvider']}
            onSelect={(val) => {
              updateSetting('coachProvider', val);
              updateSetting('coachModel', getDefaultModelForProvider(val));
            }}
          />
        );
      case 'coachModel': {
        const v = value as Settings['coachModel'];
        const provider = settings.coachProvider;
        const options = provider === 'openai' ? OPENAI_MODELS : ANTHROPIC_MODELS;
        const labels: Record<Settings['coachModel'], string> =
          provider === 'openai'
            ? { haiku: 'Haiku', sonnet: 'Sonnet', 'gpt-mini': 'GPT Mini', gpt: 'GPT' }
            : { haiku: 'Haiku', sonnet: 'Sonnet', 'gpt-mini': 'GPT Mini', gpt: 'GPT' };
        const selected = options.includes(v) ? v : getDefaultModelForProvider(provider);
        return (
          <View>
            <SegmentedControl
              options={options}
              labels={labels}
              selected={selected}
              onSelect={(val) => updateSetting('coachModel', val)}
            />
            <Text style={styles.descriptionText}>{coachModelDescriptions[selected]}</Text>
          </View>
        );
      }
      case 'coachEffort': {
        const v = value as Settings['coachEffort'];
        return (
          <View>
            <SegmentedControl
              options={COACH_EFFORTS}
              labels={{ low: 'Low', medium: 'Medium', high: 'High' }}
              selected={v}
              onSelect={(val) => updateSetting('coachEffort', val)}
            />
            <Text style={styles.descriptionText}>{coachEffortDescriptions[v]}</Text>
          </View>
        );
      }
      case 'botStrength':
        return (
          <CustomSlider
            min={1}
            max={20}
            step={1}
            value={value as number}
            onValueChange={(val) => updateSetting('botStrength', val)}
          />
        );
      case 'botTimeMs':
        return (
          <CustomSlider
            min={500}
            max={5000}
            step={100}
            value={value as number}
            onValueChange={(val) => updateSetting('botTimeMs', val)}
            suffix="ms"
          />
        );
      case 'playerColor':
        return (
          <SegmentedControl
            options={PLAYER_COLORS}
            labels={{ w: 'White', b: 'Black' }}
            selected={value as Settings['playerColor']}
            onSelect={(val) => updateSetting('playerColor', val)}
          />
        );
      case 'pieceDragOrTap':
        return (
          <SegmentedControl
            options={DRAG_TAP_OPTIONS}
            labels={{ drag: 'Drag', tap: 'Tap' }}
            selected={value as Settings['pieceDragOrTap']}
            onSelect={(val) => updateSetting('pieceDragOrTap', val)}
          />
        );
      case 'boardTheme':
        return (
          <SegmentedControl
            options={BOARD_THEMES}
            labels={{ classic: 'Classic', dark: 'Dark', marble: 'Marble' }}
            selected={value as Settings['boardTheme']}
            onSelect={(val) => updateSetting('boardTheme', val)}
          />
        );
      case 'pieceSet':
        return (
          <SegmentedControl
            options={PIECE_SETS}
            labels={{ unicode: 'Unicode', svg: 'SVG' }}
            selected={value as Settings['pieceSet']}
            onSelect={(val) => updateSetting('pieceSet', val)}
          />
        );
      default:
        if (typeof value === 'boolean') {
          return (
            <SettingToggle
              label={settingLabels[key]}
              value={value}
              onValueChange={(v) => {
                (updateSetting as (k: keyof Settings, v: Settings[keyof Settings]) => void)(key, v);
              }}
            />
          );
        }
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        {featureToggleSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            {section.keys.map((key) => {
              const isBoolean = typeof settings[key] === 'boolean';
              return (
                <View key={key} style={isBoolean ? undefined : styles.settingRow}>
                  {!isBoolean && (
                    <Text style={styles.settingLabel}>{settingLabels[key]}</Text>
                  )}
                  {renderSettingControl(key)}
                </View>
              );
            })}
          </View>
        ))}

        {/* API Key Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>API</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Anthropic API Key</Text>
            <TextInput
              style={styles.textInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Enter Anthropic API key"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>OpenAI API Key</Text>
            <TextInput
              style={styles.textInput}
              value={openaiApiKey}
              onChangeText={setOpenAIApiKey}
              placeholder="Enter OpenAI API key"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>
          Version {Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  scrollContent: {
    padding: space.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xl,
    paddingTop: space.md,
  },
  backButton: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  backButtonText: {
    color: palette.primary,
    fontSize: font.body,
    fontWeight: '900',
  },
  backButtonPlaceholder: {
    width: 74,
  },
  headerTitle: {
    color: palette.text,
    fontSize: font.lg,
    fontWeight: '900',
  },
  section: {
    marginBottom: space.xl,
  },
  sectionHeader: {
    color: palette.primary,
    fontSize: font.sm,
    fontWeight: '900',
    marginBottom: space.sm,
    textTransform: 'uppercase',
  },
  settingRow: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: space.md,
    marginVertical: space.xs,
    borderWidth: 1,
    borderColor: palette.border,
  },
  settingLabel: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: '800',
    marginBottom: space.sm,
  },
  descriptionText: {
    color: palette.muted,
    fontSize: font.sm,
    marginTop: space.sm,
    lineHeight: 17,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: palette.panel,
    borderRadius: radius.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: palette.border,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 38,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  segmentBtnActive: {
    backgroundColor: palette.primary,
  },
  segmentText: {
    color: palette.muted,
    fontSize: font.sm,
    fontWeight: '800',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: palette.bg,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  sliderTrackWrapper: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: palette.panel,
    borderRadius: radius.pill,
  },
  sliderFill: {
    height: 6,
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: palette.pink,
    top: 4,
    borderWidth: 3,
    borderColor: palette.bg,
  },
  sliderValue: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: '900',
    minWidth: 62,
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: palette.panel,
    color: palette.text,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    fontSize: font.body,
  },
  resetButton: {
    backgroundColor: palette.redSoft,
    borderWidth: 1,
    borderColor: palette.red,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: space.sm,
    marginBottom: space.lg,
  },
  resetButtonText: {
    color: palette.red,
    fontSize: font.body,
    fontWeight: '900',
  },
  versionText: {
    color: palette.faint,
    fontSize: font.sm,
    textAlign: 'center',
  },
});
