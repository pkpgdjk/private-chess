export type MoveQuality = 'brilliant' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
export type CoachProvider = 'anthropic' | 'openai';
export type AnthropicCoachModel = 'haiku' | 'sonnet';
export type OpenAICoachModel = 'gpt-mini' | 'gpt';
export type CoachModel = AnthropicCoachModel | OpenAICoachModel;
export type CoachEffort = 'low' | 'medium' | 'high';

export interface MoveNode {
  moveNumber: number;
  san: string;           // e.g. "Nf3"
  uci: string;           // e.g. "g1f3"
  fen: string;
  player: 'w' | 'b';
  evalBefore: number | null;
  evalAfter: number | null;
  evalChange: number | null;
  quality: MoveQuality | null;
  aiCommentary: string | null;
  aiShortCommentary: string | null;
  stockfishBestMove: string | null;
  stockfishBestLine: string[] | null;
  variations: MoveNode[][];
  timestamp: number;
  /** Squares the AI wants the user to look at; rendered as halos on the board. */
  focusSquares?: string[];
  /** Short tags about the move (pin, fork, missed-tactic, etc.). */
  tags?: string[];
  /** Bot's reply (SAN) that this move analysis covers, if any. */
  botReplySan?: string | null;
  /** Brief gloss on the bot's reply. */
  botReplyExplanation?: string | null;
}

export interface CandidateMove {
  uci: string;
  san: string;
  /** Eval in centipawns, white POV. */
  eval: number;
}

export interface AnalysisRequestExtended extends AnalysisRequest {
  /** Bot's reply that followed the player's move, in SAN. */
  botReplySan?: string;
  botReplyUci?: string;
  /** Top engine candidates for the position before the player's move. */
  candidates?: CandidateMove[];
}

export interface SavedGame {
  id: string;
  date: number;
  pgn: string;
  result: 'win' | 'loss' | 'draw';
  playerColor: 'w' | 'b';
  botStrength: number;
  coachMessages: string;
  moveHistory: MoveNode[];
}

export interface Settings {
  realTimeCoach: boolean;
  blunderShield: boolean;
  moveConfirmation: boolean;
  hintButton: boolean;
  coachLevel: 'beginner' | 'intermediate' | 'advanced';
  coachLanguage: 'en' | 'th';
  /** When on, AI coach only fires on important moves (big eval swings, phase transitions, game end). */
  criticalMomentsOnly: boolean;
  /** Which AI provider the coach uses. */
  coachProvider: CoachProvider;
  /** Which provider-specific model the coach uses. */
  coachModel: CoachModel;
  /** Effort level for reasoning-capable models. Ignored by models that do not support it. */
  coachEffort: CoachEffort;
  /** Whether the current user has saved an Anthropic API key. Secret value is never returned. */
  hasAnthropicKey: boolean;
  /** Whether the current user has saved an OpenAI API key. Secret value is never returned. */
  hasOpenAIKey: boolean;
  showEvalBar: boolean;
  showArrows: boolean;
  legalMoveOverlay: boolean;
  showCapturedPieces: boolean;
  boardCoordinates: boolean;
  pieceDragOrTap: 'drag' | 'tap';
  autoQueenPromotion: boolean;
  allowUndo: boolean;
  flipBoard: boolean;
  zenMode: boolean;
  soundEffects: boolean;
  hapticFeedback: boolean;
  aiVoice: boolean;
  autoSaveGames: boolean;
  showOpeningName: boolean;
  threatIndicator: boolean;
  botStrength: number;
  botTimeMs: number;
  playerColor: 'w' | 'b';
  boardTheme: 'classic' | 'dark' | 'marble';
  pieceSet: 'unicode' | 'svg';
}

export interface AnalysisRequest {
  fen: string;
  moveHistorySan: string[];
  lastMoveSan: string;
  lastMoveUci: string;
  playerColor: 'w' | 'b';
  evalBefore: number | null;
  evalAfter: number | null;
  stockfishBestMove: string | null;
  stockfishBestLine: string[] | null;
  coachLevel: string;
  coachLanguage?: 'en' | 'th';
  coachProvider?: CoachProvider;
  coachModel?: CoachModel;
  coachEffort?: CoachEffort;
  context: 'opening' | 'middlegame' | 'endgame';
  openingName: string | null;
}

export interface AIAnalysisResponse {
  quality: MoveQuality;
  shortSummary: string;
  fullExplanation: string;
  warning: string | null;
  betterMove: string | null;
  betterMoveExplanation: string | null;
  strategicConcepts: string[];
  coachAdvice: string;
  /** Algebraic squares to visually highlight on the board (e.g., ["e4", "d5"]). */
  focusSquares: string[];
  /** Short categorical tags about the move (e.g., ["pin", "missed-fork"]). */
  tags: string[];
  /** Bot's response in SAN, if analysis covered the bot's reply. */
  botReplySan?: string | null;
  /** Brief gloss on what the bot's reply does. */
  botReplyExplanation?: string | null;
}

export interface GameStoryResponse {
  title: string;
  phases: {
    phase: 'opening' | 'middlegame' | 'endgame';
    summary: string;
    keyMoves: { moveNumber: number; san: string; explanation: string }[];
  }[];
  overallAdvice: string;
  playerStrengths: string[];
  playerWeaknesses: string[];
}

export interface GameState {
  fen: string;
  turn: 'w' | 'b';
  isGameOver: boolean;
  result: 'win' | 'loss' | 'draw' | null;
  history: MoveNode[];
  currentMoveIndex: number;
  selectedSquare: string | null;
  legalMoves: string[];
  lastMove: { from: string; to: string } | null;
  currentEval: number;
  currentBestLine: string[];
  isAnalyzing: boolean;
  coachMessage: string | null;
  coachMessageType: 'info' | 'warning' | 'praise' | 'blunder' | null;
  isSimulationMode: boolean;
  simulationParentIndex: number | null;
  simulationHistory: MoveNode[];
  pendingMove: { from: string; to: string } | null;
  pendingPromotion: { from: string; to: string } | null;
  playerColor: 'w' | 'b';
  hintMove: { from: string; to: string } | null;
}
