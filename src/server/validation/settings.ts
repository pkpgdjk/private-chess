import { z } from 'zod';

export const settingsPatchSchema = z
  .object({
    realTimeCoach: z.boolean(),
    blunderShield: z.boolean(),
    moveConfirmation: z.boolean(),
    hintButton: z.boolean(),
    coachLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    coachLanguage: z.enum(['en', 'th']),
    criticalMomentsOnly: z.boolean(),
    coachProvider: z.enum(['anthropic', 'openai']),
    coachModel: z.enum(['haiku', 'sonnet', 'gpt-mini', 'gpt']),
    coachEffort: z.enum(['low', 'medium', 'high']),
    showEvalBar: z.boolean(),
    showArrows: z.boolean(),
    legalMoveOverlay: z.boolean(),
    showCapturedPieces: z.boolean(),
    boardCoordinates: z.boolean(),
    pieceDragOrTap: z.enum(['drag', 'tap']),
    autoQueenPromotion: z.boolean(),
    allowUndo: z.boolean(),
    flipBoard: z.boolean(),
    zenMode: z.boolean(),
    soundEffects: z.boolean(),
    hapticFeedback: z.boolean(),
    aiVoice: z.boolean(),
    autoSaveGames: z.boolean(),
    showOpeningName: z.boolean(),
    threatIndicator: z.boolean(),
    botStrength: z.number().int().min(1).max(20),
    botTimeMs: z.number().int().min(100).max(10000),
    playerColor: z.enum(['w', 'b']),
    boardTheme: z.enum(['classic', 'dark', 'marble']),
    pieceSet: z.enum(['unicode', 'svg']),
  })
  .partial()
  .strict();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
