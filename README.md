# Private Chess

Private Chess is a Next.js chess trainer with a custom username/password login, MongoDB persistence, a mobile-first web board, browser Stockfish, and server-side AI coach routes for Anthropic or OpenAI.

It is installable as a PWA. The PWA is online-only: it registers a service worker for installability but does not cache pages or provide offline gameplay.

## Stack

- Next.js App Router
- Cloudflare Workers via OpenNext
- MongoDB Atlas
- Custom session auth
- `chess.js`, Zustand, Vitest
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

### One-time Cloudflare setup

Log in locally:

```bash
npx wrangler login
```

Create a production secrets file. This file is ignored by git:

```bash
cat > .env.production <<'EOF'
MONGODB_URI=mongodb+srv://...
MONGODB_DB=private_chess
AUTH_SESSION_SECRET=replace-with-at-least-32-characters
EOF
```

Deploy once with the secrets file:

```bash
./node_modules/.bin/opennextjs-cloudflare build
./node_modules/.bin/wrangler deploy --secrets-file .env.production
```

After the Worker has secrets, normal deploys preserve them:

```bash
npm run deploy
```

Build and preview the Worker locally:

```bash
npm run preview
```

Deploy:

```bash
npm run deploy
```

The Worker declares these required Cloudflare secrets in `wrangler.jsonc`:

```text
MONGODB_URI
MONGODB_DB
AUTH_SESSION_SECRET
```

Each user saves their own Anthropic or OpenAI key in Settings. Keys are encrypted with `AUTH_SESSION_SECRET` before they are stored in MongoDB, and API responses only return saved-key status.

### GitHub Actions deploy

The deploy workflow lives at `.github/workflows/deploy-cloudflare.yml`. It runs on pushes to `main` and can also be started manually from GitHub Actions.

Add these GitHub secrets under repository secrets or the `production` environment:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
MONGODB_URI
MONGODB_DB
AUTH_SESSION_SECRET
```

The workflow installs dependencies, runs server-side checks, builds the OpenNext Worker, writes a temporary `.wrangler-secrets.env` file from GitHub secrets, and deploys with:

```bash
wrangler deploy --secrets-file .wrangler-secrets.env
```

Do not commit `.env.production`, `.env.local`, or `.wrangler-secrets.env`.

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
  server/             Vitest server tests
```

## Notes

- There is no public registration. Use the local user CLI to add accounts.
- The app is mobile-first but also supports desktop.
- MongoDB Atlas free tier is enough for local/private use.
- The browser Stockfish worker uses cross-origin isolation headers configured in `next.config.ts`.
