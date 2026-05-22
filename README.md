# Chess Trainer

Chess Trainer is an Expo React Native app for playing chess against a bot and getting real-time coaching on your moves. It uses `chess.js` for legal move handling, Zustand for state, SQLite for saved games, and Anthropic Claude or OpenAI for optional move analysis and game recaps.

## Features

- Tap-based chess board with legal-move overlays, last-move highlights, hints, promotion picker, and board flipping.
- Bot play using a hidden WebView Stockfish path when available, with a pure-JS fallback engine for offline or failed engine loads.
- Real-time coach messages after the bot replies, including move quality, better-move suggestions, focus squares, and follow-up questions.
- Blunder shield, undo, simulation mode, saved game history, and post-game review.
- Settings for bot strength, board theme, piece set, coach language, model, effort, feedback, and data preferences.

## Tech Stack

- Expo SDK 54
- React 19 / React Native 0.81
- Expo Router
- Zustand
- `chess.js`
- `expo-sqlite`
- `expo-secure-store`
- `react-native-webview`
- Anthropic Messages API and OpenAI Responses API through `axios`
- EAS Build for iOS artifacts

## Getting Started

Install dependencies:

```sh
npm ci
```

Start the Expo development server:

```sh
npm start
```

Run on a target:

```sh
npm run android
npm run ios
npm run web
```

The iOS command requires a macOS/iOS simulator environment or a compatible Expo workflow. This project is configured for EAS Build so iOS builds can be produced from Ubuntu or CI.

## AI Coach Setup

The AI coach is optional. Without an API key for the selected provider, the app still plays chess, but coach analysis will show a setup message.

Choose the coach provider in Settings:

- `Anthropic`: uses Claude models.
- `OpenAI`: uses the OpenAI Responses API.

Set the matching API key in the app Settings screen. Do not commit `.env` files or credentials.

The current Anthropic model choices are configured in `src/ai/anthropic.ts`:

- `haiku`: fast/default coach mode
- `sonnet`: higher quality, more expensive coach mode

The current OpenAI model choices are configured in `src/ai/openai.ts`:

- `gpt-mini`: `gpt-5.4-mini`, fast/default OpenAI coach mode
- `gpt`: `gpt-5.5`, deeper OpenAI coach mode

## iOS Builds

This repo includes EAS profiles in `eas.json`:

- `development`: internal development client, iOS simulator build
- `preview`: internal device build, produces an IPA through EAS
- `production`: production iOS build

Build a preview IPA manually:

```sh
npx eas build --platform ios --profile preview
```

For iOS device, TestFlight, or App Store builds, you need access to an Apple Developer Program account and valid signing credentials. EAS can manage those credentials after project setup.

The placeholder bundle identifier in `app.json` should be changed before real distribution:

```json
"bundleIdentifier": "com.yourcompany.chesstrainer"
```

## GitHub Actions

The workflow at `.github/workflows/ios-build.yml` runs:

1. `npm ci`
2. `npx tsc --noEmit`
3. `eas build --platform ios --profile preview --non-interactive`

Add this repository secret before running it:

```text
EXPO_TOKEN
```

You can create an Expo token from your Expo account settings, then add it under GitHub repository settings: `Settings -> Secrets and variables -> Actions`.

The workflow can be started manually from the Actions tab or by pushing to `main`.

## Project Structure

```text
app/
  _layout.tsx        Expo Router stack
  index.tsx          Home screen and quick play
  game.tsx           Main game screen
  analysis.tsx       Post-game review
  history.tsx        Saved games
  settings.tsx       User settings and API key input

src/
  ai/                Anthropic client, prompts, response parsing
  components/        Board, coach, settings, and shared UI components
  constants/         Theme, settings, openings, quality colors
  engine/            chess.js wrapper, evaluator, bot engine hook
  hooks/             AI analysis and chess engine hooks
  store/             Zustand stores and SQLite persistence
  types/             Shared TypeScript types
  utils/             Formatting and feedback helpers
```

## Useful Commands

```sh
npm start
npx tsc --noEmit
npx eas build --platform ios --profile preview
```

There are also local verification scripts:

```sh
npx ts-node verify-engine.ts
npx ts-node verify-ai-providers.ts
```

`ts-node` is not currently listed as a dev dependency, so install or run it through your preferred TypeScript execution tool before using that command.

## Notes

- `node_modules/`, `.expo/`, `.codegraph/`, `.memsearch/`, `.claude/`, credentials, env files, and generated mobile artifacts are ignored by Git.
- CodeGraph is initialized locally for structural code navigation, but its index is intentionally not tracked.
- The WebView Stockfish path currently loads `stockfish.js` from a CDN. If that fails or the app is offline, the app falls back to the bundled pure-JS search engine.
