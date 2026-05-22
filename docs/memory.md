# Chess Trainer — Project Memory

## Key Decisions

### Platform & Build
- **Expo** is non-negotiable because developer is on Ubuntu targeting iOS. EAS Build will compile iOS binaries in the cloud.
- **Expo SDK 51+** for latest features and React Native 0.74+.
- **Expo Router** for navigation instead of React Navigation (simpler, file-based, Expo-native).

### AI Provider
- **Anthropic Claude 3.5 Sonnet** (Messages API, model: `claude-3-5-sonnet-20241022`).
- API endpoint: `https://api.anthropic.com/v1/messages`.
- Must use `max_tokens: 1024` minimum, `temperature: 0.3` for consistent structured output.
- Response MUST be requested as valid JSON via system prompt + `{"type": "json_object"}` equivalent (Anthropic uses explicit JSON instructions in system prompt).

### Chess Engine (Bot)
- **Stockfish 16 WASM** bundled locally for offline play.
- Implementation: Use `stockfish.js` (WASM build) loaded in a WebView or via `react-native-webview` with a UCI bridge.
- Alternative: `react-native-stockfish` if available and compatible.
- UCI commands to send:
  - `uci`
  - `isready`
  - `position fen <fen>`
  - `go movetime <ms>` or `go depth <depth>`
  - `setoption name Skill Level value <1-20>`
- Skill Level mapping: 1-5 (Beginner), 6-10 (Intermediate), 11-15 (Advanced), 16-20 (Master).
- The bot ALWAYS plays the color opposite to the player.

### State Management
- **Zustand** with `persist` middleware for settings.
- Game state is NOT persisted during play (only saved to SQLite on game end).
- One central `gameStore` handles all game logic; UI components are dumb.

### UI Architecture
- **Coach Panel**: `@gorhom/bottom-sheet` with `BottomSheetScrollView`.
- **Board**: Custom `<ChessBoard>` using absolute-positioned `<Piece>` components on a grid.
- **Move Overlay**: SVG or absolute positioned `<View>` dots overlaid on board squares.
- **Analysis Arrows**: SVG arrows drawn between square centers using calculated coordinates.

### Data Flow
1. User taps square → `gameStore.selectSquare(sq)` calculates legal moves
2. User taps destination → `gameStore.makeMove(from, to)`:
   a. chess.js validates and plays move
   b. Update history, FEN, turn
   c. If player move: trigger AI analysis (async)
   d. If bot turn: send FEN to Stockfish, await best move, play it
   e. Check game over conditions
3. AI analysis result updates `coachMessage` in store → CoachPanel re-renders
4. Stockfish evaluation result updates `currentEval` → EvalBar re-renders

### Critical Implementation Notes

#### chess.js + React Native
- `chess.js` is pure JS, works in RN without issues.
- Use `.history({ verbose: true })` to get SAN, before/after FEN, etc.
- Use `.moves({ square: 'e2', verbose: true })` for legal move overlay data.
- Always clone chess instance before speculative moves (simulation) to avoid mutating game state.

#### Stockfish WASM in RN
- Stockfish WASM requires a Web environment. In RN, load it inside a hidden `<WebView>`.
- Communicate via `postMessage` / `onMessage`.
- The WebView HTML bundles `stockfish.js` inline or loads from local file.
- MUST wait for `uciok` before sending position commands.
- Parse best move from `bestmove <uci>` response.
- Parse evaluation from `info depth <d> score cp <cp>` (centipawns) or `score mate <m>` (mate in N).

#### Anthropic Prompt Strategy
System prompt template:
```
You are a chess coach. Analyze the given chess position and move.
Respond ONLY with valid JSON in this exact format:
{
  "quality": "excellent|good|inaccuracy|mistake|blunder",
  "shortSummary": "One sentence summary",
  "fullExplanation": "Detailed educational explanation with bullet points using •",
  "warning": null or "Explain if this was a blunder/mistake",
  "betterMove": "SAN of better move or null",
  "betterMoveExplanation": "Why the better move is stronger",
  "strategicConcepts": ["concept1", "concept2"],
  "coachAdvice": "What to focus on next"
}
Coach level: <beginner|intermediate|advanced>.
Beginner: Explain basic principles, simple words, avoid deep theory.
Intermediate: Explain tactics, pawn structures, piece activity.
Advanced: Explain subtle positional ideas, long-term plans, opening theory.
```

#### Simulation Mode
- When `isSimulationMode = true`, moves are NOT appended to `history`.
- Instead, they build a `simulationHistory: MoveNode[]` array.
- The board renders from a temporary chess instance: `simulationChess`.
- Exit simulation discards `simulationHistory` and returns to main line.
- "Make Main Line" replaces the main history from `simulationParentIndex` with simulation moves.

#### Move Quality Algorithm
- Use Stockfish eval change to auto-tag move quality:
  - Blunder: eval swing > 3.0 pawns against player
  - Mistake: eval swing 1.5-3.0 against
  - Inaccuracy: eval swing 0.5-1.5 against
  - Good: eval within 0.5 of best
  - Excellent: eval within 0.2 of best
  - Brilliant: only player move that maintains advantage (rare, optional)
- AI commentary QUALITY tag should match this algorithm.

### Performance Rules
- NEVER call `setState` in a loop. Batch updates in Zustand.
- Stockfish runs in WebView (separate thread), so it won't block UI.
- AI API calls are async; show loading indicator in CoachPanel while waiting.
- Limit AI calls: if user makes 3 moves in 2 seconds, cancel pending requests.

### Security
- Anthropic API key stored in `process.env.ANTHROPIC_API_KEY` via `expo-constants` + `.env`.
- NEVER commit `.env` to git.
- API key input in Settings screen for users who want to use their own key.

### Assets
- Chess pieces: Use free Lichess/Chess.com-style SVGs or Unicode fallback (♔♕♖♗♘♙♚♛♜♝♞♟).
- Unicode fallback is acceptable for MVP; custom images for polish.
- Board sounds: free CC0 chess move/capture sounds.
