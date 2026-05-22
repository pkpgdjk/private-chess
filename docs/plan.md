# Chess Trainer — Master Plan

## Overview
A React Native (Expo) chess training game for iOS, built from Ubuntu. Play against a Stockfish bot with an AI coach powered by Anthropic Claude. The app explains every move, analyzes games, and simulates variations to make the player better at chess.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 51+ (React Native) |
| Navigation | Expo Router (file-based) |
| Chess Logic | `chess.js` |
| Chess Engine | Stockfish 16 WASM (`stockfish.js` via `react-native-stockfish` or WebView bridge) |
| State Management | Zustand |
| UI Components | React Native + Reanimated 3 |
| Bottom Sheet | `@gorhom/bottom-sheet` |
| Storage | `expo-sqlite` (games), `AsyncStorage` (settings) |
| AI API | Anthropic Claude 3.5 Sonnet (Messages API) |
| HTTP Client | `axios` |

## Directory Structure
```
chess-trainer/
├── app/
│   ├── index.tsx              # Main menu
│   ├── game.tsx               # Active game screen
│   ├── analysis.tsx           # Post-game analysis
│   ├── tactics.tsx            # Tactic trainer placeholder
│   └── settings.tsx           # Settings screen
├── src/
│   ├── components/
│   │   ├── board/
│   │   │   ├── ChessBoard.tsx
│   │   │   ├── Piece.tsx
│   │   │   ├── MoveOverlay.tsx
│   │   │   └── AnalysisArrows.tsx
│   │   ├── coach/
│   │   │   ├── CoachPanel.tsx
│   │   │   ├── MoveAnalysisCard.tsx
│   │   │   ├── GameStoryView.tsx
│   │   │   └── FollowUpInput.tsx
│   │   ├── ui/
│   │   │   ├── EvalBar.tsx
│   │   │   ├── MoveList.tsx
│   │   │   └── CapturedPieces.tsx
│   │   └── settings/
│   │       └── SettingToggle.tsx
│   ├── engine/
│   │   ├── chessLogic.ts      # chess.js wrapper
│   │   ├── stockfish.ts       # Stockfish WASM wrapper
│   │   └── evaluator.ts       # Position evaluation helpers
│   ├── ai/
│   │   ├── anthropic.ts       # API client
│   │   ├── prompts.ts         # Prompt templates
│   │   └── parser.ts          # Response parser
│   ├── store/
│   │   ├── gameStore.ts       # Game state
│   │   ├── settingsStore.ts   # Settings state
│   │   └── historyStore.ts    # Saved games
│   ├── types/
│   │   └── chess.ts           # All TypeScript types
│   ├── constants/
│   │   ├── settings.ts        # Toggleable features config
│   │   ├── openings.ts        # Opening name DB (minimal)
│   │   └── colors.ts          # Theme colors
│   ├── hooks/
│   │   ├── useChessEngine.ts
│   │   └── useAIAnalysis.ts
│   └── utils/
│       └── formatters.ts
├── assets/
│   └── pieces/                # Chess piece PNGs (or SVG)
├── docs/
│   ├── plan.md
│   ├── memory.md
│   └── tasks.md
├── package.json
├── app.json
├── tsconfig.json
└── babel.config.js
```

## Critical Interface Contracts

### Game State (Zustand)
```typescript
interface GameState {
  // Core
  chess: Chess; // chess.js instance
  fen: string;
  turn: 'w' | 'b';
  isGameOver: boolean;
  result: 'win' | 'loss' | 'draw' | null;
  
  // Moves
  history: MoveNode[];
  currentMoveIndex: number; // for replay
  
  // UI
  selectedSquare: string | null;
  legalMoves: string[];
  lastMove: { from: string; to: string } | null;
  
  // Analysis
  currentEval: number; // centipawns, + is white advantage
  currentBestLine: string[];
  isAnalyzing: boolean;
  
  // Coach
  coachMessage: string | null;
  coachMessageType: 'info' | 'warning' | 'praise' | 'blunder' | null;
  
  // Simulation
  isSimulationMode: boolean;
  simulationParentIndex: number | null;
  
  // Actions
  selectSquare: (square: string) => void;
  makeMove: (from: string, to: string, promotion?: string) => void;
  undoMove: () => void;
  jumpToMove: (index: number) => void;
  startSimulation: (fromMoveIndex: number) => void;
  exitSimulation: () => void;
  setCoachMessage: (msg: string, type: string) => void;
}
```

### MoveNode
```typescript
interface MoveNode {
  moveNumber: number;
  san: string;           // "Nf3"
  uci: string;           // "g1f3"
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
}

type MoveQuality = 'brilliant' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
```

### Settings Schema
```typescript
interface Settings {
  // Coach AI
  realTimeCoach: boolean;
  blunderShield: boolean;
  moveConfirmation: boolean;
  hintButton: boolean;
  coachLevel: 'beginner' | 'intermediate' | 'advanced';
  showEvalBar: boolean;
  showArrows: boolean;
  
  // Gameplay
  legalMoveOverlay: boolean;
  showCapturedPieces: boolean;
  boardCoordinates: boolean;
  pieceDragOrTap: 'drag' | 'tap';
  autoQueenPromotion: boolean;
  allowUndo: boolean;
  flipBoard: boolean;
  zenMode: boolean;
  
  // Feedback
  soundEffects: boolean;
  hapticFeedback: boolean;
  aiVoice: boolean;
  
  // Data
  autoSaveGames: boolean;
  showOpeningName: boolean;
  threatIndicator: boolean;
  
  // Bot
  botStrength: number; // 1-20 (Stockfish skill level)
  botTimeMs: number;   // thinking time
  playerColor: 'w' | 'b';
}
```

### Anthropic API Request
```typescript
interface AnalysisRequest {
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
  context: 'opening' | 'middlegame' | 'endgame';
  openingName: string | null;
}
```

## Feature Specs

### F1: Chess Board with Move Overlay
- Render 8x8 board with algebraic notation
- Pieces rendered from PNG assets (or Unicode fallback)
- Tap piece → highlight with glow → show legal moves as translucent dots
- Capturable squares show ring indicator
- Special moves (castling, en passant, promotion) use distinct icons
- Last move highlighted (from/to in subtle yellow)
- Check highlight: king square flashes red

### F2: Stockfish Bot (Offline)
- Bundled as WASM, runs entirely offline
- Skill level 1-20 (UCI option)
- Thinking time configurable
- Bot plays automatically after player move (if bot's turn)
- UCI communication via postMessage (WebView or react-native-stockfish)

### F3: Coach Panel (Bottom Sheet)
- Swipeable bottom panel, ~40% height default, expandable to 70%
- Scrollable rich text content
- Shows: Move quality badge, detailed explanation, pros/cons bullets, better move suggestion
- Tabs: Current Move | Game Story | My Mistakes
- "Ask Follow-up" input at bottom
- Expand/collapse long explanations

### F4: AI Move Analysis (Anthropic)
- Called after every player move (if realTimeCoach ON)
- Prompt asks for structured JSON response
- Response includes: quality, shortSummary, fullExplanation, warning, betterMove, betterMoveExplanation, strategicConcepts
- If blunder detected and blunderShield ON, warn BEFORE move is committed (requires pre-validation)

### F5: Game History Timeline
- Flat list of move pairs (1. e4 e5, 2. Nf3 Nc6...)
- Tap any move → board jumps to that position
- Active move highlighted
- Navigation bar: ⏮ ◀ ▶ ⏭
- "Explore from here" button on any move → enters simulation mode
- Variations shown as indented sub-items under parent move

### F6: Simulation Board
- Entered from timeline "Explore from here"
- Free play: user can make any legal moves, no bot auto-response
- "Play vs Bot" toggle: bot responds to simulation moves
- Coach analyzes simulation moves too
- Save variation | Return to main game | Make main line

### F7: Settings Screen
- All toggleable features organized in sections
- Coach Level picker
- Bot strength slider
- Theme picker (board colors, piece set)
- Reset to defaults button

### F8: Post-Game Analysis
- Auto-triggered when game ends
- AI narrates the game story
- Critical moments auto-detected (big eval swings)
- Blunder review with AI explanation
- Export PGN with AI annotations

## UI/UX Decisions
- **Portrait-first**: Board fits in upper 60%, Coach Panel in lower 40%
- **No 3D pieces**: Clean 2D flat design for readability
- **Colors**: Dark mode default (#1a1a2e background, #16213e panels, #e94560 accents)
- **Board squares**: Light #f0d9b5, Dark #b58863 (classic Lichess theme as default)
- **Typography**: System font, 16px body, 14px captions, 20px headers
- **Animations**: Reanimated 3 for piece movement, panel transitions, arrow draws

## Development Phases

### Phase 1: Foundation
- P1.1: Expo scaffold + dependencies + tsconfig paths
- P1.2: Types, constants, settings schema
- P1.3: Chess engine wrapper (chess.js + move validation)
- P1.4: Zustand stores (game, settings, history)

### Phase 2: Game UI & Bot
- P2.1: ChessBoard component with piece rendering
- P2.2: MoveOverlay (legal moves, selection)
- P2.3: Game screen layout (board + eval bar + captured pieces)
- P2.4: Stockfish integration + bot gameplay loop
- P2.5: Move confirmation, undo, flip board

### Phase 3: Coach & AI
- P3.1: CoachPanel bottom sheet UI
- P3.2: Anthropic API client + prompt engineering
- P3.3: Move analysis integration (real-time coach)
- P3.4: Blunder shield pre-validation
- P3.5: Game history timeline
- P3.6: Simulation board

### Phase 4: Polish
- P4.1: Sound effects + haptics
- P4.2: Board themes + piece sets
- P4.3: Settings screen
- P4.4: Game save/load + SQLite
- P4.5: Post-game analysis screen
- P4.6: EAS Build config + iOS build
