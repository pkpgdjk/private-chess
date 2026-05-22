# Next.js Mongo Web Conversion Design

## Goal

Convert the current Expo React Native chess trainer into a website-first Next.js application deployed on Cloudflare, with MongoDB-backed persistence, custom username/password authentication, private server-side AI provider calls, and a web-native touch experience.

The iOS/EAS/TestFlight path is out of scope for the converted app. The target product is a full-stack web app.

## Chosen Stack

- Framework: Next.js App Router.
- Deployment: Cloudflare Workers using OpenNext.
- Database: MongoDB Atlas free tier.
- Authentication: custom username/password auth with no public registration.
- Password hashing: Argon2id.
- Sessions: secure HTTP-only cookies backed by MongoDB session records.
- Chess rules: chess.js reused from the current app.
- Board/engine runtime: browser-side React, pointer events, and Stockfish Web Worker/WASM.
- AI providers: OpenAI and Anthropic called only from server routes.

This design favors one full-stack Next.js codebase while keeping latency-sensitive board interaction in the browser.

## User Model And Auth

The web app has no public registration screen. Users are created locally by a CLI script that connects to MongoDB with an admin connection string.

Initial scripts:

- `npm run user:create -- <username>` prompts for password and creates a user.
- `npm run user:reset-password -- <username>` prompts for a new password.
- `npm run user:disable -- <username>` disables login without deleting game data.

MongoDB `users` documents contain:

- `_id`
- `username` with a unique index
- `passwordHash`
- `disabled`
- `createdAt`
- `updatedAt`
- `lastLoginAt`

Login accepts username and password, verifies Argon2id, creates a session, and sets a secure HTTP-only cookie. Logout deletes the session and clears the cookie. Every app route and API route that reads user data requires a valid session.

## MongoDB Collections

Use user-owned documents. Every query for application data must include `userId`.

Collections:

- `users`
- `sessions`
- `userSettings`
- `games`
- `activeGames`
- `coachMemory`

`sessions`:

- `_id`
- `userId`
- `tokenHash`
- `expiresAt`
- `createdAt`
- `lastSeenAt`

`userSettings`:

- `_id`
- `userId` unique index
- all non-secret fields from the current `Settings` type
- `createdAt`
- `updatedAt`

Provider API keys are not stored in browser state. The first version uses server environment variables for provider keys. If user-owned provider keys are added later, they must be encrypted server-side and never returned to the browser.

`games`:

- `_id`
- `userId`
- `legacyLocalId`
- `date`
- `pgn`
- `result`
- `playerColor`
- `botStrength`
- `coachMessages`
- `moveHistory`
- `createdAt`
- `updatedAt`

Index: `{ userId: 1, date: -1 }`.

`activeGames`:

- `_id`
- `userId` unique index
- `history`
- `playerColor`
- `currentMoveIndex`
- `updatedAt`

This replaces the current single-row SQLite `active_game` table.

`coachMemory`:

- `_id`
- `userId`
- `memoryKey`
- `label`
- `detail`
- `severity`
- `count`
- `lastSeen`
- `createdAt`
- `updatedAt`

Unique index: `{ userId: 1, memoryKey: 1 }`.

## Routing

Use App Router route groups:

```text
app/
  (public)/
    login/page.tsx
  (app)/
    layout.tsx
    page.tsx
    play/page.tsx
    analysis/[gameId]/page.tsx
    history/page.tsx
    settings/page.tsx
    tactics/page.tsx
  api/
    auth/login/route.ts
    auth/logout/route.ts
    auth/session/route.ts
    games/route.ts
    games/[gameId]/route.ts
    active-game/route.ts
    settings/route.ts
    coach/analyze-move/route.ts
    coach/game-story/route.ts
    coach/follow-up/route.ts
```

Protected pages redirect unauthenticated users to `/login`. API routes return `401` for missing or invalid sessions.

## API Behavior

Auth:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

Settings:

- `GET /api/settings`
- `PATCH /api/settings`

Games:

- `GET /api/games`
- `POST /api/games`
- `GET /api/games/:gameId`
- `PATCH /api/games/:gameId`
- `DELETE /api/games/:gameId`

Active game:

- `GET /api/active-game`
- `PUT /api/active-game`
- `DELETE /api/active-game`

Coach memory:

- derive memory during completed game save
- `GET /api/coach-memory`
- `DELETE /api/coach-memory`

AI:

- `POST /api/coach/analyze-move`
- `POST /api/coach/game-story`
- `POST /api/coach/follow-up`

AI routes validate inputs, enforce session, rate-limit by user, and use server-side provider keys.

## Client State

Keep Zustand or an equivalent local store for live game interaction:

- selected square
- legal moves
- pending promotion
- current board position
- current analysis state
- bot move status
- simulation mode
- temporary coach message state

MongoDB is the durable source of truth for saved games, settings, active games, and coach memory. The browser may keep optimistic local state for responsiveness, but server saves happen in the background after committed moves and game completion.

Do not write active games to MongoDB on every small UI state change. Save after committed main-line moves with debounce.

## Web-Native Board UX

The current board is tap-based through 64 React Native `Pressable` squares. The web version must use a board-level pointer layer.

Required interaction behavior:

- support drag and tap
- use `pointerdown`, `pointermove`, and `pointerup`
- call `setPointerCapture` during drag
- set `touch-action: none` and `user-select: none` on the board
- render a floating dragged piece layer
- keep board squares stable with CSS sizing
- avoid React/Zustand updates on every pointer move
- snap back on illegal moves
- optimistically commit legal player moves before server save
- run engine and coach work off the main interaction path

This is the core smoothness requirement.

## AI And Engine Boundary

Move OpenAI and Anthropic calls to server routes. The browser sends chess context, not provider keys. The server validates the request, calls the selected provider, parses the response, and returns structured coach data.

Keep chess legality and bot move selection client-side for instant feel in the first web version. Replace the current hidden WebView Stockfish path with a real browser Web Worker/WASM Stockfish integration.

Server-side engine routes are not part of the first version. They can be added later if server-trusted analysis is needed.

## Reuse And Rewrite

Reuse or adapt:

- `src/types/chess.ts`
- `src/engine/chessLogic.ts`
- `src/engine/evaluator.ts`
- `src/ai/prompts.ts`
- `src/ai/parser.ts`
- `src/constants/*`
- `src/utils/learning.ts`
- horsey piece SVG assets

Rewrite:

- all Expo Router screens under `app/*.tsx`
- React Native UI components under `src/components/**`
- Expo SQLite persistence stores
- Expo SecureStore settings store
- Expo Haptics/AV sound utilities
- hidden WebView Stockfish integration
- iOS/EAS-specific config and documentation

## Deployment

Deploy with OpenNext for Cloudflare Workers. The project needs:

- `@opennextjs/cloudflare`
- `wrangler`
- `nodejs_compat`
- Cloudflare environment variables for MongoDB and AI provider keys
- MongoDB indexes created by a local or deployment script

Secrets:

- `MONGODB_URI`
- `AUTH_SESSION_SECRET`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

## Risks

- MongoDB connectivity from Cloudflare Workers must be tested early because driver/runtime compatibility is the highest platform risk.
- Next.js features that require unsupported Node APIs must be avoided or replaced.
- AI keys must never be exposed to browser bundles.
- Auth cookies need secure flags, session expiry, and CSRF-aware mutation handling.
- Large recursive `moveHistory.variations` arrays can approach MongoDB document limits if analysis grows without bounds.
- The current `game.tsx` combines too many responsibilities; direct porting would preserve that complexity. Split route UI, board interaction, game orchestration, and persistence calls.

## Validation Plan

Before implementation is considered complete:

- Unit test password hashing, session creation, and protected route behavior.
- Unit test Mongo repositories with mocked or test database access.
- Unit test learning-memory derivation and settings validation.
- Browser-test login, play, save active game, finish game, history, analysis, and logout.
- Touch-test board drag and tap behavior on mobile viewport.
- Verify no OpenAI or Anthropic key appears in client JavaScript bundles or browser network requests.

