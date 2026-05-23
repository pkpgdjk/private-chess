# Private Chess

Private Chess is a Next.js chess trainer with a custom username/password login, MongoDB persistence, a mobile-first web board, browser Stockfish, and server-side AI coach routes for Anthropic or OpenAI.

## Stack

- Next.js App Router
- Cloudflare Workers via OpenNext
- MongoDB Atlas
- Custom session auth
- `chess.js`, Zustand, Playwright, Vitest
- Anthropic Messages API and OpenAI Responses API from server routes only

## Local Development

1. Install dependencies:

```bash
node --version
npm install
```

Use Node 22 or newer.

2. Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Set at least:

```text
MONGODB_URI=mongodb+srv://...
MONGODB_DB=private_chess
AUTH_SESSION_SECRET=replace-with-at-least-32-characters
```

AI coach keys are optional:

```text
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

3. Create MongoDB indexes:

```bash
npm run db:indexes
```

4. Create a local user:

```bash
npm run user:create -- tokyo
```

The password prompt requires at least 8 characters.

5. Start the website:

```bash
npm run dev
```

Open http://localhost:3000 and log in with the created username.

## Useful Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
npm run test:e2e
```

User management:

```bash
npm run user:create -- <username>
npm run user:reset-password -- <username>
npm run user:disable -- <username>
```

Database setup:

```bash
npm run db:indexes
```

## Deploy To Cloudflare Workers

This project is configured for Cloudflare Workers through OpenNext, not Cloudflare Pages.

Build and preview the Worker locally:

```bash
npm run preview
```

Deploy:

```bash
npm run deploy
```

Configure Cloudflare environment variables or secrets for:

```text
MONGODB_URI
MONGODB_DB
AUTH_SESSION_SECRET
OPENAI_API_KEY
ANTHROPIC_API_KEY
```

Only server routes read AI keys. The browser never receives provider secrets.

## Project Structure

```text
app/
  (app)/              Protected app pages
  (public)/login      Login flow
  api/                Auth, settings, game, coach routes
src/
  client/             Browser API helpers and Zustand stores
  components/web/     Web UI, board, cards, settings
  engine/             chess.js helpers and Stockfish worker client
  server/             Auth, MongoDB, repositories, AI providers
  types/              Shared chess and settings types
tests/
  client/             Vitest client tests
  server/             Vitest server tests
  e2e/                Playwright smoke tests
```

## Notes

- There is no public registration. Use the local user CLI to add accounts.
- The app is mobile-first but also supports desktop.
- MongoDB Atlas free tier is enough for local/private use.
- The browser Stockfish worker uses cross-origin isolation headers configured in `next.config.ts`.
