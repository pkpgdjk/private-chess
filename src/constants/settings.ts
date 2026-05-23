import { Settings } from '@/types/chess';

export const defaultSettings: Settings = {
  realTimeCoach: true,
  blunderShield: true,
  moveConfirmation: false,
  hintButton: true,
  coachLevel: 'intermediate',
  coachLanguage: 'en',
  criticalMomentsOnly: false,
  coachProvider: 'anthropic',
  coachModel: 'haiku',
  coachEffort: 'low',
  hasAnthropicKey: false,
  hasOpenAIKey: false,
  showEvalBar: true,
  showArrows: true,
  legalMoveOverlay: true,
  showCapturedPieces: true,
  boardCoordinates: true,
  pieceDragOrTap: 'drag',
  autoQueenPromotion: true,
  allowUndo: true,
  flipBoard: false,
  zenMode: false,
  soundEffects: true,
  hapticFeedback: true,
  aiVoice: false,
  autoSaveGames: true,
  showOpeningName: true,
  threatIndicator: false,
  botStrength: 10,
  botTimeMs: 1000,
  playerColor: 'w',
  boardTheme: 'classic',
  pieceSet: 'unicode',
};

export const featureToggleSections: { title: string; keys: (keyof Settings)[] }[] = [
  { title: 'Coach AI', keys: ['realTimeCoach', 'criticalMomentsOnly', 'blunderShield', 'moveConfirmation', 'hintButton', 'coachLevel', 'coachLanguage', 'coachProvider', 'coachModel', 'coachEffort', 'showEvalBar', 'showArrows'] },
  { title: 'Gameplay', keys: ['legalMoveOverlay', 'showCapturedPieces', 'boardCoordinates', 'autoQueenPromotion', 'allowUndo', 'flipBoard', 'zenMode'] },
  { title: 'Feedback', keys: ['soundEffects', 'hapticFeedback'] },
  { title: 'Data', keys: ['autoSaveGames', 'showOpeningName'] },
  { title: 'Bot', keys: ['botStrength', 'botTimeMs', 'playerColor'] },
  { title: 'Appearance', keys: ['boardTheme', 'pieceSet'] },
];

export const coachLevelDescriptions: Record<string, string> = {
  beginner: 'Gentle, encouraging explanations for new players',
  intermediate: 'Balanced feedback with some tactical depth',
  advanced: 'Technical, concise analysis for experienced players',
};
