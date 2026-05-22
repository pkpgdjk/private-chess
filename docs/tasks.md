# Chess Trainer — Task Tracker

## Legend
- `⏳` Pending
- `🔄` In Progress
- `✅` Done
- `🐛` Needs Fix

---

## Phase 1: Foundation

### P1.1: Expo Scaffold + Dependencies
- **Status:** ✅ Done
- **Assigned to:** Agent-Scaffold
- **Dependencies:** None
- **Requirements:**
  - Create Expo project in `/home/tokyo/workspace/my/chess/chess-trainer/`
  - Install dependencies: `chess.js`, `zustand`, `react-native-reanimated`, `@gorhom/bottom-sheet`, `@gorhom/bottom-sheet@^5`, `react-native-gesture-handler`, `react-native-webview`, `axios`, `expo-sqlite`, `expo-constants`, `expo-haptics`, `expo-av`
  - Install dev dependencies: `@types/chess.js`
  - Configure `tsconfig.json` with path aliases: `@/*` → `src/*`
  - Configure `babel.config.js` for Reanimated plugin
  - Configure `app.json` with app name "Chess Trainer", bundle ID, orientation portrait
  - Create directory structure under `src/` as per plan.md
  - Create placeholder files for all components so imports don't break
- **Acceptance Criteria:**
  - `npx expo start` launches without errors
  - Metro bundler resolves `@/` aliases
  - All dependencies listed in package.json
  - Directory structure matches plan.md

### P1.2: Types, Constants, Settings Schema
- **Status:** ✅ Done
- **Assigned to:** Agent-Types
- **Dependencies:** P1.1
- **Requirements:**
  - Create `src/types/chess.ts` with ALL interfaces from plan.md (MoveNode, GameState interface, Settings, AnalysisRequest, etc.)
  - Create `src/constants/settings.ts` with default settings object and feature toggle definitions
  - Create `src/constants/colors.ts` with dark theme palette
  - Create `src/constants/openings.ts` with minimal opening name map (first 3-4 moves → name)
- **Acceptance Criteria:**
  - All types compile with `tsc --noEmit`
  - Default settings object matches plan.md schema exactly
  - No `any` types used

### P1.3: Chess Engine Wrapper
- **Status:** ✅ Done
- **Assigned to:** Agent-Engine
- **Dependencies:** P1.1
- **Requirements:**
  - Create `src/engine/chessLogic.ts`: Wrapper around `chess.js`
    - `createGame(): Chess`
    - `getLegalMoves(chess, square): Move[]`
    - `makeMove(chess, from, to, promotion?): Move | null`
    - `getGameState(chess): { fen, turn, isCheckmate, isDraw, isCheck }`
    - `cloneGame(chess): Chess`
    - `getMoveQuality(evalBefore, evalAfter, playerColor): MoveQuality`
  - Create `src/engine/evaluator.ts`:
    - `parseEvalFromStockfish(line): number` (handles `cp` and `mate`)
    - `evalToWinProbability(cp): number` (for eval bar)
- **Acceptance Criteria:**
  - All functions have unit-test-like behavior (can be verified via simple script)
  - `getMoveQuality` correctly tags blunders (>3.0 swing), mistakes (1.5-3.0), etc.
  - `parseEvalFromStockfish` handles both `score cp 50` and `score mate 3`

### P1.4: Zustand Stores
- **Status:** ✅ Done
- **Assigned to:** Agent-Store
- **Dependencies:** P1.1, P1.2
- **Requirements:**
  - Create `src/store/settingsStore.ts`:
    - Zustand store with all settings from schema
    - `persist` middleware to AsyncStorage
    - `resetSettings()` action
    - `updateSetting(key, value)` action
  - Create `src/store/gameStore.ts`:
    - All state and actions from plan.md GameState interface
    - `makeMove` validates via chessLogic.ts
    - `selectSquare` calculates legal moves
    - `undoMove` reverts last move
    - `jumpToMove` replays to specific history index
    - `startSimulation` / `exitSimulation` modes
  - Create `src/store/historyStore.ts`:
    - `saveGame(game: SavedGame)` to SQLite
    - `loadGames(): SavedGame[]`
    - `deleteGame(id)`
- **Acceptance Criteria:**
  - Settings persist across app restarts
  - Game store can play a full game (e2e4, e7e5...) and history is accurate
  - Undo works correctly and restores previous FEN
  - Simulation mode doesn't corrupt main history

---

## Phase 2: Game UI & Bot

### P2.1: ChessBoard Component
- **Status:** ✅ Done
- **Assigned to:** TBD
- **Dependencies:** P1.1, P1.2, P1.4
- **Requirements:**
  - Render 8x8 grid with alternating colors from constants
  - Render pieces using Unicode characters (MVP) or images
  - Support `flipBoard` setting (rotate 180°)
  - Show board coordinates (a-h, 1-8) when setting is ON
  - Show last move highlight (from/to squares)
  - Show king in check (red pulse highlight)
  - Tap piece → selectSquare action
  - Tap destination → makeMove action
- **Acceptance Criteria:**
  - Starting position renders correctly
  - Pieces move when tapping
  - Board flips correctly
  - Coordinates show/hide

### P2.2: MoveOverlay Component
- **Status:** ✅ Done
- **Assigned to:** TBD
- **Dependencies:** P2.1
- **Requirements:**
  - When piece selected, overlay translucent dots on legal destination squares
  - Capturable squares show ring outline (different color)
  - Special moves: castling (king icon), en passant (special dot), promotion (crown icon)
  - Overlay only shows when `legalMoveOverlay` setting is ON
  - Fade in animation (Reanimated)
- **Acceptance Criteria:**
  - Selecting knight shows L-shaped dots
  - Selecting pawn shows diagonal capture rings when enemy present
  - Overlay disappears after move is made

### P2.3: Game Screen Layout
- **Status:** ✅ Done
- **Assigned to:** TBD
- **Dependencies:** P2.1
- **Requirements:**
  - Create `app/game.tsx`
  - Top bar: captured pieces, turn indicator, undo button
  - Center: ChessBoard (square aspect ratio)
  - Right side (or bottom): EvalBar vertical bar
  - Bottom: CoachPanel placeholder (collapsed state)
  - Zen mode: hides everything except board
- **Acceptance Criteria:**
  - Layout works in portrait
  - All elements visible and reachable
  - Zen mode hides eval bar, captured pieces, coach panel

### P2.4: Stockfish Bot Integration
- **Status:** ✅ Done
- **Assigned to:** TBD
- **Dependencies:** P1.3, P2.1
- **Requirements:**
  - Create `src/engine/stockfish.ts`:
    - Load stockfish.js WASM in hidden WebView
    - UCI command wrapper: `init()`, `setPosition(fen)`, `go(movetime)`, `stop()`, `setSkillLevel(1-20)`
    - Promise-based API: `getBestMove(fen, timeMs): Promise<string>`
    - Parse evaluation continuously during search
  - Integrate into gameStore: after player move, if bot's turn, auto-trigger Stockfish and play response
  - Bot strength controlled by settings
- **Acceptance Criteria:**
  - Bot responds to player moves within configured time
  - Skill level 1 plays randomly/badly, level 20 plays strong moves
  - Evaluation updates in real-time during bot thinking
  - Works offline (no network)

### P2.5: Game Controls
- **Status:** ✅ Done
- **Assigned to:** TBD
- **Dependencies:** P2.1, P2.4
- **Requirements:**
  - Undo button (only if `allowUndo` and not vs online human)
  - Move confirmation: if setting ON, require tap piece → tap destination → confirm dialog
  - Flip board button
  - Hint button (if setting ON): shows Stockfish best move as arrow highlight
  - Pawn promotion picker modal
  - Game over modal (win/loss/draw) with "New Game" and "Analyze" buttons
- **Acceptance Criteria:**
  - Undo reverts both player and bot moves (pairs)
  - Move confirmation prevents accidental moves
  - Hint draws arrow on board temporarily
  - Promotion picker shows all 4 options

---

## Phase 3: Coach & AI

### P3.1: CoachPanel Bottom Sheet
- **Status:** ✅ Done
- **Assigned to:** TBD
- **Dependencies:** P1.4, P2.1
- **Requirements:**
  - Implement `@gorhom/bottom-sheet` panel
  - Default height: 35% of screen
  - Expandable to 70% via swipe
  - Collapsible to 10% (handle only)
  - Contains:
    - Move quality badge (colored pill: Brilliant/Excellent/Good/...)
    - Scrollable explanation text area
    - "Read more" / "Show less" toggle for long explanations
    - Tabs: "Current Move" | "Game Story" | "Mistakes"
    - "Ask Coach" text input at bottom
  - Rich text rendering: bold, bullet points, emoji
- **Acceptance Criteria:**
  - Swipe up/down works smoothly
  - Content scrolls independently of panel drag
  - Tabs switch content correctly
  - Quality badge colors match conventions (green=good, red=blunder)

### P3.2: Anthropic API Client + Prompts
- **Status:** ✅ Done
- **Assigned to:** TBD
- **Dependencies:** P1.2
- **Requirements:**
  - Create `src/ai/anthropic.ts`:
    - `analyzeMove(request: AnalysisRequest): Promise<AIAnalysisResponse>`
    - `analyzeGame(moveHistory: MoveNode[]): Promise<GameStoryResponse>`
    - Proper error handling (network, rate limit, invalid JSON)
    - Timeout after 15 seconds
    - API key from `process.env.ANTHROPIC_API_KEY` with Settings fallback
  - Create `src/ai/prompts.ts`:
    - `buildMoveAnalysisPrompt(req): string` — follows memory.md system prompt template
    - `buildGameStoryPrompt(history): string`
    - `buildFollowUpPrompt(question, context): string`
  - Create `src/ai/parser.ts`:
    - Safely parse JSON from AI response (handle markdown fences)
    - Validate required fields
    - Fallback message if parsing fails
- **Acceptance Criteria:**
  - API client can be tested with a mock request
  - Prompt includes all required fields from AnalysisRequest
  - Parser handles JSON wrapped in ```json ... ```
  - Graceful fallback on API failure ("Coach is thinking...")

### P3.3: Real-Time Move Analysis
- **Status:** ⏳ Pending
- **Assigned to:** TBD
- **Dependencies:** P3.1, P3.2, P2.4
- **Requirements:**
  - After each player move, if `realTimeCoach` is ON:
    1. Get Stockfish evaluation of position before and after move
    2. Get Stockfish best move for comparison
    3. Call Anthropic API with full context
    4. Update `coachMessage` in gameStore with response
    5. Update `MoveNode` with AI commentary and quality tag
  - Show loading state in CoachPanel while waiting
  - Cancel pending AI request if user makes next move before response arrives
- **Acceptance Criteria:**
  - Coach message appears within 3-5 seconds of move
  - Message quality matches Stockfish eval swing
  - No duplicate/cancelled messages shown
  - Works with airplane mode off (obviously needs API)

### P3.4: Blunder Shield
- **Status:** ✅ Done
- **Assigned to:** TBD
- **Dependencies:** P3.2, P2.4
- **Requirements:**
  - BEFORE committing player move, if `blunderShield` is ON:
    1. Ask Stockfish: "What is eval if I play this move?"
    2. If eval swing > 2.5 against player, show confirmation dialog
    3. Dialog: "⚠️ This looks like a blunder. You may lose material. Play anyway?"
    4. Options: "Cancel" (return to board) | "Play Anyway" | "Show Best Move"
  - "Show Best Move" draws Stockfish best move arrow on board
- **Acceptance Criteria:**
  - Blunder moves trigger popup
  - Good moves do NOT trigger popup
  - Cancel returns to piece selection state

### P3.5: Game History Timeline
- **Status:** ⏳ Pending
- **Assigned to:** TBD
- **Dependencies:** P1.4, P2.1
- **Requirements:**
  - Create `src/components/ui/MoveList.tsx`:
    - FlatList of move pairs: `1. e4 e5`
    - Current move highlighted
    - Tap any move → `jumpToMove(index)`
    - Long-press any move → "Explore from here" option
    - Show move quality icon/color dot next to each move
  - Navigation buttons: ⏮ (start), ◀ (prev), ▶ (next), ⏭ (end)
  - Show variations as indented rows under parent move
- **Acceptance Criteria:**
  - Timeline matches game history exactly
  - Navigation buttons update board position
  - Variations display correctly indented

### P3.6: Simulation Board
- **Status:** ✅ Done
- **Assigned to:** TBD
- **Dependencies:** P3.5, P2.1
- **Requirements:**
  - Enter simulation from timeline "Explore from here"
  - Board shows position at selected move index
  - User can make free moves; history builds in `simulationHistory`
  - Toggle: "Play vs Bot" (bot responds to simulation moves)
  - CoachPanel works in simulation mode too
  - Buttons: "Save Variation" | "Return to Game" | "Make Main Line"
  - "Make Main Line" replaces main history from parent index
- **Acceptance Criteria:**
  - Simulation doesn't affect saved game until "Make Main Line"
  - Bot can be toggled on/off in simulation
  - Exit simulation returns to original position

---

## Phase 4: Polish

### P4.1: Sound + Haptics
- **Status:** ⏳ Pending
- **Assigned to:** TBD
- **Dependencies:** P2.1
- **Requirements:**
  - Sound effects using `expo-av`:
    - Move, capture, check, castle, illegal move, game end
  - Haptics using `expo-haptics`:
    - Light tap on piece select, medium on capture, heavy on check/blunder
  - All toggleable in settings
  - Works in silent mode (haptics still work)
- **Acceptance Criteria:**
  - Each action has distinct feedback
  - Toggling settings disables/enables correctly

### P4.2: Board Themes
- **Status:** ⏳ Pending
- **Assigned to:** TBD
- **Dependencies:** P2.1
- **Requirements:**
  - 3 board color schemes: Classic (Lichess), Dark (green/black), Marble (blue/gray)
  - 2 piece sets: Unicode, Custom SVG (if assets available)
  - Setting persists
- **Acceptance Criteria:**
  - Theme change applies immediately

### P4.3: Settings Screen
- **Status:** ⏳ Pending
- **Assigned to:** TBD
- **Dependencies:** P1.4
- **Requirements:**
  - Create `app/settings.tsx`
  - All toggleable features from schema organized in sections:
    - Coach AI
    - Gameplay
    - Feedback
    - Data
    - Bot
  - Each setting uses appropriate control: Switch, Slider, SegmentedControl
  - "Reset to Defaults" button with confirmation
  - API Key input field (secure text entry)
- **Acceptance Criteria:**
  - All settings save immediately
  - Reset restores defaults
  - UI matches app theme

### P4.4: Game Save/Load
- **Status:** ⏳ Pending
- **Assigned to:** TBD
- **Dependencies:** P1.4, P2.4
- **Requirements:**
  - Auto-save game on completion (if `autoSaveGames`)
  - Save to `expo-sqlite`:
    - Table: `games` (id, date, pgn, result, playerColor, botStrength, coachMessages JSON)
  - Create `app/history.tsx` to browse saved games
  - Tap saved game → load into analysis screen
  - Delete game with swipe
- **Acceptance Criteria:**
  - Games persist across app restarts
  - PGN export is valid and includes AI annotations as comments

### P4.5: Post-Game Analysis Screen
- **Status:** ⏳ Pending
- **Assigned to:** TBD
- **Dependencies:** P3.1, P3.2, P4.4
- **Requirements:**
  - Auto-open after game ends (or tap "Analyze" from game over modal)
  - AI narrates full game story
  - Auto-detect critical moments (eval swings > 2.0)
  - Blunder review carousel: swipe through each mistake with AI explanation
  - Accordion: "Opening Phase" | "Middlegame" | "Endgame"
  - Export PGN with `{[%eval +0.5]} {This move develops the knight...}` annotations
- **Acceptance Criteria:**
  - Critical moments are actually the biggest eval swings
  - PGN exports and is parseable by Lichess

### P4.6: EAS Build Config
- **Status:** ⏳ Pending
- **Assigned to:** TBD
- **Dependencies:** P1.1
- **Requirements:**
  - Configure `eas.json` with build profiles: `development`, `preview`, `production`
  - Configure iOS bundle identifier, app icon, splash screen
  - Test `eas build --platform ios --profile preview`
- **Acceptance Criteria:**
  - Build succeeds on EAS
  - IPA generated
