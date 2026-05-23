import { z } from 'zod';

import type {
  AnalysisRequestExtended,
  CoachEffort,
  CoachModel,
  CoachProvider,
  MoveNode,
} from '@/types/chess';

const MAX_HISTORY_PLIES = 240;
const MAX_CANDIDATES = 5;
const MAX_STOCKFISH_LINE = 20;
const MAX_FOCUS_SQUARES = 4;
const MAX_TAGS = 4;
const MAX_VARIATION_LINES = 3;
const MAX_VARIATION_PLIES = 5;

const fenSchema = z.string().min(1).max(200);
const sanSchema = z.string().min(1).max(32);
const uciSchema = z.string().min(1).max(16);
const shortTextSchema = z.string().max(120);
const explanationSchema = z.string().max(1000);
const tagSchema = z.string().min(1).max(32);
const squareSchema = z.string().min(2).max(2);

export const coachProviderSchema = z.enum(['openai', 'anthropic']) satisfies z.ZodType<CoachProvider>;

export const coachEffortSchema = z.enum(['low', 'medium', 'high']) satisfies z.ZodType<CoachEffort>;

const anthropicModelSchema = z.enum(['haiku', 'sonnet']);
const openAIModelSchema = z.enum(['gpt-mini', 'gpt']);

export const coachModelSchema = z.union([
  anthropicModelSchema,
  openAIModelSchema,
]) satisfies z.ZodType<CoachModel>;

export const coachSelectionSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('anthropic'),
    model: anthropicModelSchema,
    effort: coachEffortSchema.default('medium'),
  }),
  z.object({
    provider: z.literal('openai'),
    model: openAIModelSchema,
    effort: coachEffortSchema.default('medium'),
  }),
]);

const nullableNumberSchema = z.number().finite().nullable();
const nullableStringSchema = explanationSchema.nullable();
const nullableSanSchema = sanSchema.nullable();

const candidateMoveSchema = z.object({
  uci: uciSchema,
  san: sanSchema,
  eval: z.number().finite(),
});

export const analyzeMovePayloadSchema = z
  .object({
    fen: fenSchema,
    moveHistorySan: z.array(sanSchema).max(MAX_HISTORY_PLIES),
    lastMoveSan: sanSchema,
    lastMoveUci: uciSchema,
    playerColor: z.enum(['w', 'b']),
    evalBefore: nullableNumberSchema,
    evalAfter: nullableNumberSchema,
    stockfishBestMove: nullableSanSchema,
    stockfishBestLine: z.array(sanSchema).max(MAX_STOCKFISH_LINE).nullable(),
    coachLevel: z.string().min(1).max(32),
    coachLanguage: z.enum(['en', 'th']).default('en'),
    context: z.enum(['opening', 'middlegame', 'endgame']),
    openingName: shortTextSchema.nullable(),
    botReplySan: sanSchema.optional(),
    botReplyUci: uciSchema.optional(),
    candidates: z.array(candidateMoveSchema).max(MAX_CANDIDATES).optional(),
  })
  .and(coachSelectionSchema.transform(({ provider, model, effort }) => ({
    coachProvider: provider,
    coachModel: model,
    coachEffort: effort,
  }))) satisfies z.ZodType<AnalysisRequestExtended>;

const moveNodeSchema: z.ZodType<MoveNode> = z.object({
  moveNumber: z.number().int(),
  san: sanSchema,
  uci: uciSchema,
  fen: fenSchema,
  player: z.enum(['w', 'b']),
  evalBefore: nullableNumberSchema,
  evalAfter: nullableNumberSchema,
  evalChange: nullableNumberSchema,
  quality: z.enum(['brilliant', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder']).nullable(),
  aiCommentary: nullableStringSchema,
  aiShortCommentary: shortTextSchema.nullable(),
  stockfishBestMove: nullableSanSchema,
  stockfishBestLine: z.array(sanSchema).max(MAX_STOCKFISH_LINE).nullable(),
  variations: z.array(z.lazy(() => z.array(moveNodeSchema).max(MAX_VARIATION_PLIES))).max(MAX_VARIATION_LINES),
  timestamp: z.number().finite(),
  focusSquares: z.array(squareSchema).max(MAX_FOCUS_SQUARES).optional(),
  tags: z.array(tagSchema).max(MAX_TAGS).optional(),
  botReplySan: nullableSanSchema.optional(),
  botReplyExplanation: nullableStringSchema.optional(),
});

export const gameStoryPayloadSchema = z
  .object({
    botStrength: z.number().int().min(1).max(20).optional(),
    moveHistory: z.array(moveNodeSchema).max(MAX_HISTORY_PLIES),
    language: z.enum(['en', 'th']).default('en'),
    playerColor: z.enum(['w', 'b']).optional(),
    result: z.enum(['win', 'loss', 'draw']).optional(),
  })
  .and(coachSelectionSchema);

export const followUpPayloadSchema = z
  .object({
    question: z.string().trim().min(1).max(1000),
    context: z.object({
      fen: fenSchema,
      moveHistory: z.array(sanSchema).max(MAX_HISTORY_PLIES),
      language: z.enum(['en', 'th']).default('en'),
    }),
  })
  .and(coachSelectionSchema);

export function parseJsonPayload<T>(schema: z.ZodType<T>, payload: unknown) {
  return schema.safeParse(payload);
}
