import { z } from 'zod';

import type { MoveNode } from '@/types/chess';

const MAX_HISTORY_PLIES = 240;
const MAX_STOCKFISH_LINE = 20;
const MAX_VARIATION_LINES = 3;
const MAX_VARIATION_PLIES = 5;
const MAX_VARIATION_DEPTH = 2;
const MAX_TOTAL_MOVE_NODES = 300;
const MAX_FOCUS_SQUARES = 4;
const MAX_TAGS = 4;

const fenSchema = z.string().min(1).max(200);
const sanSchema = z.string().min(1).max(32);
const uciSchema = z.string().min(1).max(16);
const shortTextSchema = z.string().max(120);
const commentarySchema = z.string().max(5000);
const pgnSchema = z.string().max(50000);
const tagSchema = z.string().min(1).max(32);
const squareSchema = z.string().min(2).max(2);
const nullableNumberSchema = z.number().finite().nullable();
const nullableSanSchema = sanSchema.nullable();
const nullableCommentarySchema = commentarySchema.nullable();

const shallowMoveNodeSchema = z.object({
  moveNumber: z.number().int().min(1),
  san: sanSchema,
  uci: uciSchema,
  fen: fenSchema,
  player: z.enum(['w', 'b']),
  evalBefore: nullableNumberSchema,
  evalAfter: nullableNumberSchema,
  evalChange: nullableNumberSchema,
  quality: z
    .enum(['brilliant', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'])
    .nullable(),
  aiCommentary: nullableCommentarySchema,
  aiShortCommentary: shortTextSchema.nullable(),
  stockfishBestMove: nullableSanSchema,
  stockfishBestLine: z.array(sanSchema).max(MAX_STOCKFISH_LINE).nullable(),
  variations: z.unknown(),
  timestamp: z.number().finite(),
  focusSquares: z.array(squareSchema).max(MAX_FOCUS_SQUARES).optional(),
  tags: z.array(tagSchema).max(MAX_TAGS).optional(),
  botReplySan: nullableSanSchema.optional(),
  botReplyExplanation: nullableCommentarySchema.optional(),
}).strict();

function addMoveHistoryIssue(
  context: z.RefinementCtx,
  message: string,
) {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    message,
  });
}

function validateMoveHistory(
  value: unknown,
  context: z.RefinementCtx,
) {
  if (!Array.isArray(value)) {
    addMoveHistoryIssue(context, 'Move history must be an array');
    return;
  }

  if (value.length > MAX_HISTORY_PLIES) {
    addMoveHistoryIssue(
      context,
      `Move history cannot exceed ${MAX_HISTORY_PLIES} plies`,
    );
    return;
  }

  let totalNodes = 0;
  const stack = value.map((move) => ({ move, depth: 0 }));

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    totalNodes += 1;

    if (current.depth > MAX_VARIATION_DEPTH) {
      addMoveHistoryIssue(
        context,
        `Move variation depth cannot exceed ${MAX_VARIATION_DEPTH}`,
      );
      return;
    }

    if (totalNodes > MAX_TOTAL_MOVE_NODES) {
      addMoveHistoryIssue(
        context,
        `Move history cannot exceed ${MAX_TOTAL_MOVE_NODES} total nodes`,
      );
      return;
    }

    const parsedMove = shallowMoveNodeSchema.safeParse(current.move);

    if (!parsedMove.success) {
      addMoveHistoryIssue(context, 'Move history contains an invalid move node');
      return;
    }

    if (!Array.isArray(parsedMove.data.variations)) {
      addMoveHistoryIssue(context, 'Move variations must be an array');
      return;
    }

    if (parsedMove.data.variations.length > MAX_VARIATION_LINES) {
      addMoveHistoryIssue(
        context,
        `Move variations cannot exceed ${MAX_VARIATION_LINES} lines`,
      );
      return;
    }

    for (const variation of parsedMove.data.variations) {
      if (!Array.isArray(variation)) {
        addMoveHistoryIssue(context, 'Move variation lines must be arrays');
        return;
      }

      if (variation.length > MAX_VARIATION_PLIES) {
        addMoveHistoryIssue(
          context,
          `Move variation lines cannot exceed ${MAX_VARIATION_PLIES} plies`,
        );
        return;
      }

      for (const move of variation) {
        stack.push({ move, depth: current.depth + 1 });
      }
    }
  }
}

const moveHistorySchema = z
  .unknown()
  .superRefine(validateMoveHistory)
  .transform((value) => value as MoveNode[]);

const savedGameObjectSchema = z
  .object({
    id: z.string().min(1).max(128).optional(),
    date: z.number().finite().nonnegative(),
    pgn: pgnSchema,
    result: z.enum(['win', 'loss', 'draw']),
    playerColor: z.enum(['w', 'b']),
    botStrength: z.number().int().min(1).max(20),
    coachMessages: commentarySchema,
    moveHistory: moveHistorySchema,
  })
  .strict();

export const savedGamePatchSchema = savedGameObjectSchema
  .omit({ id: true })
  .partial()
  .strict();

export const savedGameSchema = savedGameObjectSchema;

export const activeGameSchema = z
  .object({
    history: moveHistorySchema,
    playerColor: z.enum(['w', 'b']),
    currentMoveIndex: z.number().int().min(0),
    updatedAt: z.number().finite().nonnegative(),
  })
  .strict();

export type SavedGameInput = z.infer<typeof savedGameSchema>;
export type SavedGamePatch = z.infer<typeof savedGamePatchSchema>;
export type ActiveGameInput = z.infer<typeof activeGameSchema>;
