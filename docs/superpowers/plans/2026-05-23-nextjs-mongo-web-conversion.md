# Next.js Mongo Web Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Expo chess trainer into a Next.js full-stack website on Cloudflare Workers with MongoDB persistence, custom username/password auth, server-side AI routes, and smooth web-native chess touch interaction.

**Architecture:** Replace Expo Router and React Native screens with Next.js App Router pages and DOM components. Keep chess domain logic client-side for instant play, while MongoDB repositories, auth sessions, protected APIs, and AI provider calls run in Next.js route handlers deployed through OpenNext on Cloudflare Workers.

**Tech Stack:** Next.js App Router, React, TypeScript, MongoDB Atlas, Cloudflare Workers/OpenNext, custom cookie auth, Argon2id password hashing, Zustand, chess.js, Vitest, Playwright.

---

## File Structure

Create or replace these primary areas:

- `app/(public)/login/page.tsx`: username/password login page.
- `app/(app)/layout.tsx`: protected app shell.
- `app/(app)/page.tsx`: dashboard/home.
- `app/(app)/play/page.tsx`: chess board and live game.
- `app/(app)/analysis/[gameId]/page.tsx`: saved game analysis.
- `app/(app)/history/page.tsx`: saved games.
- `app/(app)/settings/page.tsx`: user settings.
- `app/(app)/tactics/page.tsx`: tactics page.
- `app/api/**/route.ts`: auth, settings, game, active-game, coach-memory, and AI routes.
- `src/server/db/*`: MongoDB connection, collection names, and indexes.
- `src/server/auth/*`: password hashing, session cookies, current user, auth route helpers.
- `src/server/repositories/*`: MongoDB repositories scoped by `userId`.
- `src/server/ai/*`: server-only AI provider implementations.
- `src/client/stores/*`: browser Zustand stores for live game state and cached server data.
- `src/components/web/*`: web-native app shell, controls, cards, board, coach UI.
- `src/engine/stockfishWorkerClient.ts`: browser worker wrapper for engine calls.
- `scripts/users.ts`: local user management CLI.
- `tests/**`: Vitest unit tests and Playwright flow tests.

Delete or stop using Expo-native files after the replacement is working:

- `app.json`
- `eas.json`
- `babel.config.js`
- `metro.config.js`
- `index.ts`
- Expo-specific imports under old screens/stores/components.

---

## Task 1: Convert Project Scaffold To Next.js And Cloudflare

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `next.config.ts`
- Create: `wrangler.jsonc`
- Create: `.env.example`
- Create: `src/env.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Replace package scripts and dependencies**

Set `package.json` to this shape while preserving `"name"`, `"version"`, and `"private"`:

```json
{
  "name": "chess-trainer",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "preview": "opennextjs-cloudflare build && wrangler dev",
    "deploy": "opennextjs-cloudflare build && wrangler deploy",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "user:create": "tsx scripts/users.ts create",
    "user:reset-password": "tsx scripts/users.ts reset-password",
    "user:disable": "tsx scripts/users.ts disable",
    "db:indexes": "tsx scripts/create-indexes.ts"
  },
  "dependencies": {
    "@opennextjs/cloudflare": "latest",
    "@taylorzane/hash-wasm": "latest",
    "chess.js": "^1.4.0",
    "mongodb": "latest",
    "next": "latest",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "stockfish.wasm": "latest",
    "zustand": "^5.0.13",
    "zod": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@types/node": "latest",
    "@types/react": "~19.1.0",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "tsx": "latest",
    "typescript": "~5.9.2",
    "vitest": "latest",
    "wrangler": "latest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` updates without dependency resolution errors.

- [ ] **Step 3: Replace TypeScript config**

Use this `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Add Next config**

Create `next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
```

- [ ] **Step 5: Add Cloudflare config**

Create `wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "private-chess",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-05-23",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

- [ ] **Step 6: Add environment contract**

Create `.env.example`:

```bash
MONGODB_URI=mongodb+srv://user:password@cluster.example.mongodb.net/private_chess
MONGODB_DB=private_chess
AUTH_SESSION_SECRET=replace-with-32-byte-random-string
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

Create `src/env.ts`:

```ts
import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default('private_chess'),
  AUTH_SESSION_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export function getEnv() {
  return envSchema.parse({
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB,
    AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  });
}
```

- [ ] **Step 7: Update ignored output**

Append to `.gitignore`:

```gitignore
.next/
.open-next/
.wrangler/
playwright-report/
test-results/
```

- [ ] **Step 8: Verify scaffold**

Run:

```bash
npm run typecheck
```

Expected initially: errors from Expo files still present. Record them, then continue to Task 2 where those imports are removed.

- [ ] **Step 9: Commit scaffold**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts wrangler.jsonc .env.example src/env.ts .gitignore
git commit -m "chore: scaffold Next.js Cloudflare app"
```

---

## Task 2: Preserve Domain Types And Remove Expo Entrypoints

**Files:**
- Modify: `src/types/chess.ts`
- Keep: `src/engine/chessLogic.ts`
- Keep: `src/engine/evaluator.ts`
- Keep: `src/ai/parser.ts`
- Keep: `src/ai/prompts.ts`
- Keep: `src/utils/learning.ts`
- Delete: `app.json`
- Delete: `eas.json`
- Delete: `babel.config.js`
- Delete: `metro.config.js`
- Delete: `index.ts`
- Delete old Expo screens under `app/*.tsx`

- [ ] **Step 1: Move legacy Expo screens out of Next route space**

Delete the old Expo route files after their behavior has been reviewed:

```bash
git rm app/_layout.tsx app/index.tsx app/game.tsx app/analysis.tsx app/history.tsx app/settings.tsx app/tactics.tsx
```

- [ ] **Step 2: Delete Expo-only root config**

```bash
git rm app.json eas.json babel.config.js metro.config.js index.ts
```

- [ ] **Step 3: Keep shared domain files unchanged**

Run:

```bash
npx tsc --noEmit --pretty false src/types/chess.ts src/engine/chessLogic.ts src/engine/evaluator.ts src/ai/parser.ts src/ai/prompts.ts src/utils/learning.ts
```

Expected: no Expo import errors from these kept files.

- [ ] **Step 4: Commit domain cleanup**

```bash
git add app src/types src/engine/chessLogic.ts src/engine/evaluator.ts src/ai/parser.ts src/ai/prompts.ts src/utils/learning.ts
git commit -m "chore: remove Expo entrypoints"
```

---

## Task 3: Add Test Harness

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/setup/env.ts`

- [ ] **Step 1: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup/env.ts'],
  },
});
```

- [ ] **Step 2: Add test environment defaults**

Create `tests/setup/env.ts`:

```ts
process.env.MONGODB_URI ??= 'mongodb://localhost:27017/private_chess_test';
process.env.MONGODB_DB ??= 'private_chess_test';
process.env.AUTH_SESSION_SECRET ??= 'test-secret-test-secret-test-secret-1234';
process.env.OPENAI_API_KEY ??= 'test-openai-key';
process.env.ANTHROPIC_API_KEY ??= 'test-anthropic-key';
```

- [ ] **Step 3: Add Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 15'] } },
  ],
});
```

- [ ] **Step 4: Verify empty harness**

Run:

```bash
npm run test
```

Expected: Vitest reports no test files or exits successfully after config load.

- [ ] **Step 5: Commit harness**

```bash
git add vitest.config.ts playwright.config.ts tests/setup/env.ts
git commit -m "test: add web test harness"
```

---

## Task 4: MongoDB Connection, Collections, And Indexes

**Files:**
- Create: `src/server/db/client.ts`
- Create: `src/server/db/collections.ts`
- Create: `src/server/db/indexes.ts`
- Create: `scripts/create-indexes.ts`
- Test: `tests/server/db/indexes.test.ts`

- [ ] **Step 1: Write failing index test**

Create `tests/server/db/indexes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getIndexSpecs } from '@/server/db/indexes';

describe('getIndexSpecs', () => {
  it('declares required unique user ownership indexes', () => {
    const specs = getIndexSpecs();

    expect(specs.users).toContainEqual({
      keys: { username: 1 },
      options: { unique: true, name: 'users_username_unique' },
    });
    expect(specs.sessions).toContainEqual({
      keys: { tokenHash: 1 },
      options: { unique: true, name: 'sessions_token_hash_unique' },
    });
    expect(specs.userSettings).toContainEqual({
      keys: { userId: 1 },
      options: { unique: true, name: 'user_settings_user_unique' },
    });
    expect(specs.activeGames).toContainEqual({
      keys: { userId: 1 },
      options: { unique: true, name: 'active_games_user_unique' },
    });
    expect(specs.games).toContainEqual({
      keys: { userId: 1, date: -1 },
      options: { name: 'games_user_date_desc' },
    });
  });
});
```

- [ ] **Step 2: Run test to verify red**

```bash
npm run test -- tests/server/db/indexes.test.ts
```

Expected: fail because `@/server/db/indexes` does not exist.

- [ ] **Step 3: Implement collection helpers**

Create `src/server/db/collections.ts`:

```ts
export const collections = {
  users: 'users',
  sessions: 'sessions',
  userSettings: 'userSettings',
  games: 'games',
  activeGames: 'activeGames',
  coachMemory: 'coachMemory',
} as const;

export type CollectionName = keyof typeof collections;
```

Create `src/server/db/indexes.ts`:

```ts
import type { IndexSpecification, CreateIndexesOptions } from 'mongodb';

type IndexSpec = {
  keys: IndexSpecification;
  options: CreateIndexesOptions;
};

export function getIndexSpecs(): Record<string, IndexSpec[]> {
  return {
    users: [
      { keys: { username: 1 }, options: { unique: true, name: 'users_username_unique' } },
      { keys: { disabled: 1 }, options: { name: 'users_disabled' } },
    ],
    sessions: [
      { keys: { tokenHash: 1 }, options: { unique: true, name: 'sessions_token_hash_unique' } },
      { keys: { userId: 1 }, options: { name: 'sessions_user' } },
      { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'sessions_expiry_ttl' } },
    ],
    userSettings: [
      { keys: { userId: 1 }, options: { unique: true, name: 'user_settings_user_unique' } },
    ],
    games: [
      { keys: { userId: 1, date: -1 }, options: { name: 'games_user_date_desc' } },
    ],
    activeGames: [
      { keys: { userId: 1 }, options: { unique: true, name: 'active_games_user_unique' } },
    ],
    coachMemory: [
      { keys: { userId: 1, memoryKey: 1 }, options: { unique: true, name: 'coach_memory_user_key_unique' } },
      { keys: { userId: 1, count: -1, lastSeen: -1 }, options: { name: 'coach_memory_user_rank' } },
    ],
  };
}
```

Create `src/server/db/client.ts`:

```ts
import { MongoClient, type Db } from 'mongodb';
import { getEnv } from '@/env';

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const env = getEnv();
    clientPromise = new MongoClient(env.MONGODB_URI, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
    }).connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const env = getEnv();
  const client = await getMongoClient();
  return client.db(env.MONGODB_DB);
}
```

Create `scripts/create-indexes.ts`:

```ts
import { getDb } from '../src/server/db/client';
import { getIndexSpecs } from '../src/server/db/indexes';

async function main() {
  const db = await getDb();
  const specs = getIndexSpecs();

  for (const [collectionName, indexes] of Object.entries(specs)) {
    const collection = db.collection(collectionName);
    for (const index of indexes) {
      await collection.createIndex(index.keys, index.options);
      console.log(`created ${collectionName}.${String(index.options.name)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 4: Run test to verify green**

```bash
npm run test -- tests/server/db/indexes.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit DB foundation**

```bash
git add src/server/db scripts/create-indexes.ts tests/server/db/indexes.test.ts
git commit -m "feat: add MongoDB foundation"
```

---

## Task 5: Custom Auth Core And User CLI

**Files:**
- Create: `src/server/auth/password.ts`
- Create: `src/server/auth/session.ts`
- Create: `src/server/auth/currentUser.ts`
- Create: `src/server/repositories/users.ts`
- Create: `src/server/repositories/sessions.ts`
- Create: `scripts/users.ts`
- Test: `tests/server/auth/password.test.ts`
- Test: `tests/server/auth/session.test.ts`

- [ ] **Step 1: Write failing password test**

Create `tests/server/auth/password.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/server/auth/password';

describe('password auth', () => {
  it('hashes and verifies a password without storing plaintext', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).not.toContain('correct horse');
    expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true);
    expect(await verifyPassword(hash, 'wrong password')).toBe(false);
  });
});
```

- [ ] **Step 2: Run password test to verify red**

```bash
npm run test -- tests/server/auth/password.test.ts
```

Expected: fail because `password.ts` does not exist.

- [ ] **Step 3: Implement password helpers**

Create `src/server/auth/password.ts` with a Worker-compatible WASM Argon2id implementation:

```ts
import { argon2id } from '@taylorzane/hash-wasm';

const memorySize = 19_456;
const iterations = 2;
const parallelism = 1;
const hashLength = 32;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await argon2id({
    password,
    salt,
    iterations,
    memorySize,
    parallelism,
    hashLength,
    outputType: 'hex',
  });
  return `argon2id$m=${memorySize},t=${iterations},p=${parallelism},l=${hashLength}$${bytesToBase64Url(salt)}$${digest}`;
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    const [algorithm, paramsPart, saltPart, expectedDigest] = passwordHash.split('$');
    if (algorithm !== 'argon2id' || !paramsPart || !saltPart || !expectedDigest) return false;
    const params = Object.fromEntries(paramsPart.split(',').map((part) => part.split('=')));
    const digest = await argon2id({
      password,
      salt: base64UrlToBytes(saltPart),
      iterations: Number(params.t),
      memorySize: Number(params.m),
      parallelism: Number(params.p),
      hashLength: Number(params.l),
      outputType: 'hex',
    });
    return constantTimeEqual(digest, expectedDigest);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run password test to verify green**

```bash
npm run test -- tests/server/auth/password.test.ts
```

Expected: pass.

- [ ] **Step 5: Write failing session token test**

Create `tests/server/auth/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createSessionToken, hashSessionToken } from '@/server/auth/session';

describe('session tokens', () => {
  it('creates long random tokens and hashes them deterministically', async () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(64);
    await expect(hashSessionToken(first)).resolves.toBe(await hashSessionToken(first));
    await expect(hashSessionToken(first)).resolves.not.toBe(await hashSessionToken(second));
  });
});
```

- [ ] **Step 6: Run session test to verify red**

```bash
npm run test -- tests/server/auth/session.test.ts
```

Expected: fail because `session.ts` does not export helpers.

- [ ] **Step 7: Implement session helpers**

Create `src/server/auth/session.ts`:

```ts
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getEnv } from '@/env';

export const sessionCookieName = 'private_chess_session';
export const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;

export function createSessionToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export async function hashSessionToken(token: string): Promise<string> {
  const secret = getEnv().AUTH_SESSION_SECRET;
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}

export async function readSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(sessionCookieName)?.value ?? null;
}
```

- [ ] **Step 8: Add user/session repository interfaces**

Create `src/server/repositories/users.ts`:

```ts
import { ObjectId, type Db } from 'mongodb';

export interface UserDocument {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export function usersRepository(db: Db) {
  const collection = db.collection<UserDocument>('users');

  return {
    findByUsername(username: string) {
      return collection.findOne({ username: username.toLowerCase() });
    },
    findById(userId: ObjectId) {
      return collection.findOne({ _id: userId, disabled: false });
    },
    async createUser(username: string, passwordHash: string) {
      const now = new Date();
      const doc: UserDocument = {
        _id: new ObjectId(),
        username: username.toLowerCase(),
        passwordHash,
        disabled: false,
        createdAt: now,
        updatedAt: now,
      };
      await collection.insertOne(doc);
      return doc;
    },
    async setPassword(username: string, passwordHash: string) {
      const result = await collection.updateOne(
        { username: username.toLowerCase() },
        { $set: { passwordHash, updatedAt: new Date() } }
      );
      return result.modifiedCount === 1;
    },
    async disable(username: string) {
      const result = await collection.updateOne(
        { username: username.toLowerCase() },
        { $set: { disabled: true, updatedAt: new Date() } }
      );
      return result.modifiedCount === 1;
    },
    markLogin(userId: ObjectId) {
      return collection.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } });
    },
  };
}
```

Create `src/server/repositories/sessions.ts`:

```ts
import { ObjectId, type Db } from 'mongodb';

export interface SessionDocument {
  _id: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastSeenAt: Date;
}

export function sessionsRepository(db: Db) {
  const collection = db.collection<SessionDocument>('sessions');

  return {
    async createSession(userId: ObjectId, tokenHash: string, expiresAt: Date) {
      const now = new Date();
      const doc: SessionDocument = {
        _id: new ObjectId(),
        userId,
        tokenHash,
        expiresAt,
        createdAt: now,
        lastSeenAt: now,
      };
      await collection.insertOne(doc);
      return doc;
    },
    async findValidByTokenHash(tokenHash: string) {
      return collection.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
    },
    touch(sessionId: ObjectId) {
      return collection.updateOne({ _id: sessionId }, { $set: { lastSeenAt: new Date() } });
    },
    deleteByTokenHash(tokenHash: string) {
      return collection.deleteOne({ tokenHash });
    },
  };
}
```

- [ ] **Step 9: Implement current user helper**

Create `src/server/auth/currentUser.ts`:

```ts
import { getDb } from '@/server/db/client';
import { readSessionCookie, hashSessionToken } from '@/server/auth/session';
import { sessionsRepository } from '@/server/repositories/sessions';
import { usersRepository, type UserDocument } from '@/server/repositories/users';

export interface CurrentUser {
  id: string;
  username: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await readSessionCookie();
  if (!token) return null;

  const db = await getDb();
  const tokenHash = await hashSessionToken(token);
  const session = await sessionsRepository(db).findValidByTokenHash(tokenHash);
  if (!session) return null;

  const user: UserDocument | null = await usersRepository(db).findById(session.userId);
  if (!user) return null;

  await sessionsRepository(db).touch(session._id);
  return { id: user._id.toHexString(), username: user.username };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return user;
}
```

- [ ] **Step 10: Implement local user CLI**

Create `scripts/users.ts`:

```ts
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { getDb } from '../src/server/db/client';
import { hashPassword } from '../src/server/auth/password';
import { usersRepository } from '../src/server/repositories/users';

async function promptPassword(label: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const password = await rl.question(`${label}: `);
    return password;
  } finally {
    rl.close();
  }
}

async function main() {
  const [command, username] = process.argv.slice(2);
  if (!command || !username) {
    throw new Error('Usage: npm run user:create -- <username> | npm run user:reset-password -- <username> | npm run user:disable -- <username>');
  }

  const db = await getDb();
  const users = usersRepository(db);

  if (command === 'create') {
    const password = await promptPassword('Password');
    const passwordHash = await hashPassword(password);
    await users.createUser(username, passwordHash);
    console.log(`created user ${username.toLowerCase()}`);
    return;
  }

  if (command === 'reset-password') {
    const password = await promptPassword('New password');
    const passwordHash = await hashPassword(password);
    const changed = await users.setPassword(username, passwordHash);
    if (!changed) throw new Error(`user not found: ${username}`);
    console.log(`reset password for ${username.toLowerCase()}`);
    return;
  }

  if (command === 'disable') {
    const changed = await users.disable(username);
    if (!changed) throw new Error(`user not found: ${username}`);
    console.log(`disabled user ${username.toLowerCase()}`);
    return;
  }

  throw new Error(`unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 11: Run auth tests**

```bash
npm run test -- tests/server/auth/password.test.ts tests/server/auth/session.test.ts
```

Expected: pass.

- [ ] **Step 12: Commit auth core**

```bash
git add src/server/auth src/server/repositories scripts/users.ts tests/server/auth
git commit -m "feat: add custom username auth core"
```

---

## Task 6: Auth API Routes And Login Page

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/session/route.ts`
- Create: `app/(public)/login/page.tsx`
- Create: `app/(public)/login/LoginForm.tsx`
- Create: `src/components/web/AuthCard.tsx`
- Test: `tests/server/auth/login-route.test.ts`

- [ ] **Step 1: Write failing login route shape test**

Create `tests/server/auth/login-route.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('login route contract', () => {
  it('documents username password payload', () => {
    const payload = { username: 'tokyo', password: 'password123' };
    expect(Object.keys(payload)).toEqual(['username', 'password']);
  });
});
```

This is a low-cost contract test until route handlers are covered by integration tests.

- [ ] **Step 2: Implement login route**

Create `app/api/auth/login/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/server/db/client';
import { usersRepository } from '@/server/repositories/users';
import { sessionsRepository } from '@/server/repositories/sessions';
import { verifyPassword } from '@/server/auth/password';
import { createSessionToken, hashSessionToken, sessionDurationMs, setSessionCookie } from '@/server/auth/session';

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid login payload' }, { status: 400 });
  }

  const db = await getDb();
  const users = usersRepository(db);
  const user = await users.findByUsername(parsed.data.username);

  if (!user || user.disabled || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + sessionDurationMs);

  await sessionsRepository(db).createSession(user._id, tokenHash, expiresAt);
  await users.markLogin(user._id);
  await setSessionCookie(token, expiresAt);

  return NextResponse.json({ user: { id: user._id.toHexString(), username: user.username } });
}
```

- [ ] **Step 3: Implement logout route**

Create `app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { clearSessionCookie, hashSessionToken, readSessionCookie } from '@/server/auth/session';
import { sessionsRepository } from '@/server/repositories/sessions';

export async function POST() {
  const token = await readSessionCookie();
  if (token) {
    const db = await getDb();
    await sessionsRepository(db).deleteByTokenHash(await hashSessionToken(token));
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Implement session route**

Create `app/api/auth/session/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/currentUser';

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
```

- [ ] **Step 5: Implement login UI**

Create `src/components/web/AuthCard.tsx`:

```tsx
import type { ReactNode } from 'react';

export function AuthCard({ children }: { children: ReactNode }) {
  return <div className="auth-card">{children}</div>;
}
```

Create `app/(public)/login/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/currentUser';
import { AuthCard } from '@/components/web/AuthCard';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/');

  return (
    <main className="login-page">
      <AuthCard>
        <p className="eyebrow">Private Chess</p>
        <h1>Sign in</h1>
        <LoginForm />
      </AuthCard>
    </main>
  );
}
```

Create `app/(public)/login/LoginForm.tsx`:

```tsx
'use client';

import { useState, type FormEvent } from 'react';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: String(form.get('username') ?? ''),
        password: String(form.get('password') ?? ''),
      }),
    });
    setPending(false);
    if (!response.ok) {
      setError('Invalid username or password');
      return;
    }
    window.location.href = '/';
  }

  return (
    <form onSubmit={onSubmit} className="login-form">
      <label>
        Username
        <input name="username" autoComplete="username" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && <p role="alert">{error}</p>}
      <button disabled={pending}>{pending ? 'Signing in' : 'Sign in'}</button>
    </form>
  );
}
```

- [ ] **Step 6: Run auth route tests and typecheck**

```bash
npm run test -- tests/server/auth/login-route.test.ts
npm run typecheck
```

Expected: tests pass, typecheck passes after route imports resolve.

- [ ] **Step 7: Commit auth routes**

```bash
git add app/api/auth app/'(public)' src/components/web/AuthCard.tsx tests/server/auth/login-route.test.ts
git commit -m "feat: add custom login flow"
```

---

## Task 7: App Shell, Global CSS, And Protected Layout

**Files:**
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/(app)/layout.tsx`
- Create: `src/components/web/AppShell.tsx`
- Create: `src/components/web/LogoutButton.tsx`

- [ ] **Step 1: Add root layout**

Create `app/layout.tsx`:

```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Private Chess',
  description: 'A private chess trainer with AI coaching.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Add global CSS**

Create `app/globals.css` with the Catppuccin-inspired base:

```css
:root {
  color-scheme: dark;
  --bg: #1e1e2e;
  --surface: #242438;
  --surface-2: #303047;
  --text: #f5e0dc;
  --muted: #b7a9b9;
  --line: rgba(245, 224, 220, 0.12);
  --pink: #f5c2e7;
  --peach: #fab387;
  --green: #a6e3a1;
  --blue: #89b4fa;
  --red: #f38ba8;
  --radius: 14px;
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

a {
  color: inherit;
  text-decoration: none;
}

.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.auth-card {
  width: min(100%, 380px);
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--peach);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0;
}

.login-form {
  display: grid;
  gap: 16px;
}

.login-form label {
  display: grid;
  gap: 8px;
  color: var(--muted);
}

.login-form input {
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  padding: 0 12px;
}

.login-form button,
.primary-button {
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  background: var(--peach);
  color: #21151b;
  font-weight: 800;
}
```

- [ ] **Step 3: Add app shell**

Create `src/components/web/LogoutButton.tsx`:

```tsx
'use client';

export function LogoutButton() {
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return <button onClick={logout}>Logout</button>;
}
```

Create `src/components/web/AppShell.tsx`:

```tsx
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CurrentUser } from '@/server/auth/currentUser';
import { LogoutButton } from './LogoutButton';

export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Private Chess</p>
          <strong>{user.username}</strong>
        </div>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/play">Play</Link>
          <Link href="/history">History</Link>
          <Link href="/settings">Settings</Link>
        </nav>
        <LogoutButton />
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
```

Append to `app/globals.css`:

```css
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: grid;
  align-content: start;
  gap: 28px;
  padding: 24px;
  border-right: 1px solid var(--line);
  background: rgba(36, 36, 56, 0.78);
}

.sidebar nav {
  display: grid;
  gap: 8px;
}

.sidebar a,
.sidebar button {
  min-height: 40px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  text-align: left;
  padding: 10px 12px;
}

.sidebar a:hover,
.sidebar button:hover {
  background: var(--surface-2);
}

.main-panel {
  min-width: 0;
  padding: 28px;
}

@media (max-width: 760px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
}
```

- [ ] **Step 4: Add protected layout**

Create `app/(app)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/server/auth/currentUser';
import { AppShell } from '@/components/web/AppShell';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <AppShell user={user}>{children}</AppShell>;
}
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: pass for shell files.

- [ ] **Step 6: Commit shell**

```bash
git add app/layout.tsx app/globals.css app/'(app)'/layout.tsx src/components/web
git commit -m "feat: add protected web app shell"
```

---

## Task 8: Settings Repository And API

**Files:**
- Create: `src/server/repositories/settings.ts`
- Create: `src/server/validation/settings.ts`
- Create: `app/api/settings/route.ts`
- Create: `src/client/api.ts`
- Test: `tests/server/settings/settings-validation.test.ts`

- [ ] **Step 1: Write failing settings validation test**

Create `tests/server/settings/settings-validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { settingsPatchSchema } from '@/server/validation/settings';

describe('settingsPatchSchema', () => {
  it('accepts safe settings and rejects provider keys', () => {
    expect(settingsPatchSchema.parse({ boardTheme: 'dark', botStrength: 12 })).toEqual({
      boardTheme: 'dark',
      botStrength: 12,
    });
    expect(() => settingsPatchSchema.parse({ openaiApiKey: 'secret' })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify red**

```bash
npm run test -- tests/server/settings/settings-validation.test.ts
```

Expected: fail because validation file does not exist.

- [ ] **Step 3: Implement settings validation**

Create `src/server/validation/settings.ts`:

```ts
import { z } from 'zod';

export const settingsPatchSchema = z.object({
  realTimeCoach: z.boolean().optional(),
  blunderShield: z.boolean().optional(),
  moveConfirmation: z.boolean().optional(),
  hintButton: z.boolean().optional(),
  coachLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  coachLanguage: z.enum(['en', 'th']).optional(),
  criticalMomentsOnly: z.boolean().optional(),
  coachProvider: z.enum(['anthropic', 'openai']).optional(),
  coachModel: z.enum(['haiku', 'sonnet', 'gpt-mini', 'gpt']).optional(),
  coachEffort: z.enum(['low', 'medium', 'high']).optional(),
  showEvalBar: z.boolean().optional(),
  showArrows: z.boolean().optional(),
  legalMoveOverlay: z.boolean().optional(),
  showCapturedPieces: z.boolean().optional(),
  boardCoordinates: z.boolean().optional(),
  pieceDragOrTap: z.enum(['drag', 'tap']).optional(),
  autoQueenPromotion: z.boolean().optional(),
  allowUndo: z.boolean().optional(),
  flipBoard: z.boolean().optional(),
  zenMode: z.boolean().optional(),
  soundEffects: z.boolean().optional(),
  hapticFeedback: z.boolean().optional(),
  aiVoice: z.boolean().optional(),
  autoSaveGames: z.boolean().optional(),
  showOpeningName: z.boolean().optional(),
  threatIndicator: z.boolean().optional(),
  botStrength: z.number().int().min(1).max(20).optional(),
  botTimeMs: z.number().int().min(100).max(10000).optional(),
  playerColor: z.enum(['w', 'b']).optional(),
  boardTheme: z.enum(['classic', 'dark', 'marble']).optional(),
  pieceSet: z.enum(['unicode', 'svg']).optional(),
}).strict();
```

- [ ] **Step 4: Implement settings repository and route**

Create `src/server/repositories/settings.ts`:

```ts
import { ObjectId, type Db } from 'mongodb';
import type { Settings } from '@/types/chess';
import { defaultSettings } from '@/constants/settings';

export interface UserSettingsDocument extends Settings {
  _id: ObjectId;
  userId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export function settingsRepository(db: Db) {
  const collection = db.collection<UserSettingsDocument>('userSettings');

  return {
    async getForUser(userId: ObjectId): Promise<Settings> {
      const existing = await collection.findOne({ userId });
      if (existing) {
        const { _id, userId: _userId, createdAt, updatedAt, ...settings } = existing;
        return settings;
      }
      const now = new Date();
      await collection.insertOne({ _id: new ObjectId(), userId, ...defaultSettings, createdAt: now, updatedAt: now });
      return defaultSettings;
    },
    async patchForUser(userId: ObjectId, patch: Partial<Settings>): Promise<Settings> {
      await collection.updateOne(
        { userId },
        { $set: { ...patch, updatedAt: new Date() }, $setOnInsert: { _id: new ObjectId(), createdAt: new Date() } },
        { upsert: true }
      );
      return this.getForUser(userId);
    },
  };
}
```

Create `app/api/settings/route.ts`:

```ts
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/server/auth/currentUser';
import { getDb } from '@/server/db/client';
import { settingsRepository } from '@/server/repositories/settings';
import { settingsPatchSchema } from '@/server/validation/settings';

export async function GET() {
  const user = await requireCurrentUser();
  const settings = await settingsRepository(await getDb()).getForUser(new ObjectId(user.id));
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const user = await requireCurrentUser();
  const patch = settingsPatchSchema.parse(await request.json());
  const settings = await settingsRepository(await getDb()).patchForUser(new ObjectId(user.id), patch);
  return NextResponse.json({ settings });
}
```

Create `src/client/api.ts`:

```ts
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}
```

- [ ] **Step 5: Run settings tests**

```bash
npm run test -- tests/server/settings/settings-validation.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Commit settings API**

```bash
git add src/server/repositories/settings.ts src/server/validation/settings.ts app/api/settings src/client/api.ts tests/server/settings
git commit -m "feat: add user settings API"
```

---

## Task 9: Games, Active Game, And Coach Memory APIs

**Files:**
- Create: `src/server/repositories/games.ts`
- Create: `src/server/repositories/activeGames.ts`
- Create: `src/server/repositories/coachMemory.ts`
- Create: `src/server/validation/games.ts`
- Create: `app/api/games/route.ts`
- Create: `app/api/games/[gameId]/route.ts`
- Create: `app/api/active-game/route.ts`
- Create: `app/api/coach-memory/route.ts`
- Test: `tests/server/games/game-validation.test.ts`

- [ ] **Step 1: Write failing game validation test**

Create `tests/server/games/game-validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { savedGameSchema } from '@/server/validation/games';

describe('savedGameSchema', () => {
  it('accepts a completed game payload', () => {
    const parsed = savedGameSchema.parse({
      id: 'local-1',
      date: 1779480000000,
      pgn: '1. e4 e5',
      result: 'win',
      playerColor: 'w',
      botStrength: 7,
      coachMessages: 'Good game',
      moveHistory: [],
    });
    expect(parsed.result).toBe('win');
  });
});
```

- [ ] **Step 2: Run test to verify red**

```bash
npm run test -- tests/server/games/game-validation.test.ts
```

Expected: fail because validation does not exist.

- [ ] **Step 3: Implement game validation**

Create `src/server/validation/games.ts`:

```ts
import { z } from 'zod';

const moveNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    moveNumber: z.number(),
    san: z.string(),
    uci: z.string(),
    fen: z.string(),
    player: z.enum(['w', 'b']),
    evalBefore: z.number().nullable(),
    evalAfter: z.number().nullable(),
    evalChange: z.number().nullable(),
    quality: z.enum(['brilliant', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder']).nullable(),
    aiCommentary: z.string().nullable(),
    aiShortCommentary: z.string().nullable(),
    stockfishBestMove: z.string().nullable(),
    stockfishBestLine: z.array(z.string()).nullable(),
    variations: z.array(z.array(moveNodeSchema)),
    timestamp: z.number(),
    focusSquares: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    botReplySan: z.string().nullable().optional(),
    botReplyExplanation: z.string().nullable().optional(),
  })
);

export const savedGameSchema = z.object({
  id: z.string().optional(),
  date: z.number(),
  pgn: z.string(),
  result: z.enum(['win', 'loss', 'draw']),
  playerColor: z.enum(['w', 'b']),
  botStrength: z.number().int().min(1).max(20),
  coachMessages: z.string(),
  moveHistory: z.array(moveNodeSchema),
});

export const activeGameSchema = z.object({
  history: z.array(moveNodeSchema),
  playerColor: z.enum(['w', 'b']),
  currentMoveIndex: z.number().int().min(0),
  updatedAt: z.number(),
});
```

- [ ] **Step 4: Implement repositories and routes**

Implement repositories that accept `ObjectId userId` and always include `userId` in filters. Use `legacyLocalId` for client IDs and Mongo `_id` for route IDs.

Create `src/server/repositories/games.ts`:

```ts
import { ObjectId, type Db } from 'mongodb';
import type { SavedGame } from '@/types/chess';

export interface GameDocument extends Omit<SavedGame, 'id'> {
  _id: ObjectId;
  userId: ObjectId;
  legacyLocalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function gamesRepository(db: Db) {
  const collection = db.collection<GameDocument>('games');

  function toSavedGame(doc: GameDocument): SavedGame {
    return { id: doc._id.toHexString(), date: doc.date, pgn: doc.pgn, result: doc.result, playerColor: doc.playerColor, botStrength: doc.botStrength, coachMessages: doc.coachMessages, moveHistory: doc.moveHistory };
  }

  return {
    async list(userId: ObjectId) {
      const docs = await collection.find({ userId }).sort({ date: -1 }).limit(100).toArray();
      return docs.map(toSavedGame);
    },
    async get(userId: ObjectId, gameId: string) {
      const doc = await collection.findOne({ _id: new ObjectId(gameId), userId });
      return doc ? toSavedGame(doc) : null;
    },
    async save(userId: ObjectId, game: SavedGame) {
      const now = new Date();
      const doc: GameDocument = { _id: new ObjectId(), userId, legacyLocalId: game.id, date: game.date, pgn: game.pgn, result: game.result, playerColor: game.playerColor, botStrength: game.botStrength, coachMessages: game.coachMessages, moveHistory: game.moveHistory, createdAt: now, updatedAt: now };
      await collection.insertOne(doc);
      return toSavedGame(doc);
    },
    async delete(userId: ObjectId, gameId: string) {
      const result = await collection.deleteOne({ _id: new ObjectId(gameId), userId });
      return result.deletedCount === 1;
    },
  };
}
```

Create `src/server/repositories/activeGames.ts`:

```ts
import { ObjectId, type Db } from 'mongodb';
import type { MoveNode } from '@/types/chess';

export interface ActiveGameDocument {
  _id: ObjectId;
  userId: ObjectId;
  history: MoveNode[];
  playerColor: 'w' | 'b';
  currentMoveIndex: number;
  updatedAt: number;
}

export function activeGamesRepository(db: Db) {
  const collection = db.collection<ActiveGameDocument>('activeGames');
  return {
    async get(userId: ObjectId) {
      const doc = await collection.findOne({ userId });
      if (!doc) return null;
      return { history: doc.history, playerColor: doc.playerColor, currentMoveIndex: doc.currentMoveIndex, updatedAt: doc.updatedAt };
    },
    async put(userId: ObjectId, record: Omit<ActiveGameDocument, '_id' | 'userId'>) {
      await collection.updateOne(
        { userId },
        { $set: { ...record, userId }, $setOnInsert: { _id: new ObjectId() } },
        { upsert: true }
      );
      return record;
    },
    delete(userId: ObjectId) {
      return collection.deleteOne({ userId });
    },
  };
}
```

Create `src/server/repositories/coachMemory.ts`:

```ts
import { ObjectId, type Db } from 'mongodb';
import type { MoveNode } from '@/types/chess';
import { deriveCoachMemoryUpdates } from '@/utils/learning';

export interface CoachMemoryEntry {
  id: string;
  label: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  lastSeen: number;
}

export function coachMemoryRepository(db: Db) {
  const collection = db.collection<CoachMemoryEntry & { _id: ObjectId; userId: ObjectId; memoryKey: string; createdAt: Date; updatedAt: Date }>('coachMemory');

  return {
    async list(userId: ObjectId): Promise<CoachMemoryEntry[]> {
      const docs = await collection.find({ userId }).sort({ count: -1, lastSeen: -1 }).toArray();
      return docs.map((doc) => ({ id: doc.memoryKey, label: doc.label, detail: doc.detail, severity: doc.severity, count: doc.count, lastSeen: doc.lastSeen }));
    },
    async recordGame(userId: ObjectId, history: MoveNode[], playerColor: 'w' | 'b') {
      const updates = deriveCoachMemoryUpdates(history, playerColor);
      const now = new Date();
      for (const update of updates) {
        await collection.updateOne(
          { userId, memoryKey: update.id },
          {
            $set: { label: update.label, detail: update.detail, severity: update.severity, lastSeen: Date.now(), updatedAt: now },
            $inc: { count: update.count },
            $setOnInsert: { _id: new ObjectId(), userId, memoryKey: update.id, createdAt: now },
          },
          { upsert: true }
        );
      }
    },
    clear(userId: ObjectId) {
      return collection.deleteMany({ userId });
    },
  };
}
```

Create route handlers matching the spec. Each route starts with:

```ts
const user = await requireCurrentUser();
const userId = new ObjectId(user.id);
```

Then calls the repository method for that user.

- [ ] **Step 5: Run tests**

```bash
npm run test -- tests/server/games/game-validation.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Commit persistence APIs**

```bash
git add src/server/repositories src/server/validation/games.ts app/api/games app/api/active-game app/api/coach-memory tests/server/games
git commit -m "feat: add game persistence APIs"
```

---

## Task 10: Server-Side AI Providers And Coach API

**Files:**
- Create: `src/server/ai/providers.ts`
- Create: `src/server/ai/openai.ts`
- Create: `src/server/ai/anthropic.ts`
- Create: `src/server/validation/coach.ts`
- Create: `app/api/coach/analyze-move/route.ts`
- Create: `app/api/coach/game-story/route.ts`
- Create: `app/api/coach/follow-up/route.ts`
- Test: `tests/server/coach/coach-validation.test.ts`

- [ ] **Step 1: Write failing coach validation test**

Create `tests/server/coach/coach-validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { coachProviderSchema } from '@/server/validation/coach';

describe('coachProviderSchema', () => {
  it('allows known providers only', () => {
    expect(coachProviderSchema.parse('openai')).toBe('openai');
    expect(coachProviderSchema.parse('anthropic')).toBe('anthropic');
    expect(() => coachProviderSchema.parse('browser-key')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify red**

```bash
npm run test -- tests/server/coach/coach-validation.test.ts
```

Expected: fail because validation does not exist.

- [ ] **Step 3: Implement validation**

Create `src/server/validation/coach.ts`:

```ts
import { z } from 'zod';

export const coachProviderSchema = z.enum(['anthropic', 'openai']);

export const analyzeMovePayloadSchema = z.object({
  provider: coachProviderSchema,
  request: z.object({
    fen: z.string(),
    moveHistorySan: z.array(z.string()),
    lastMoveSan: z.string(),
    lastMoveUci: z.string(),
    playerColor: z.enum(['w', 'b']),
    evalBefore: z.number().nullable(),
    evalAfter: z.number().nullable(),
    stockfishBestMove: z.string().nullable(),
    stockfishBestLine: z.array(z.string()).nullable(),
    coachLevel: z.string(),
    coachLanguage: z.enum(['en', 'th']).optional(),
    coachProvider: coachProviderSchema.optional(),
    coachModel: z.enum(['haiku', 'sonnet', 'gpt-mini', 'gpt']).optional(),
    coachEffort: z.enum(['low', 'medium', 'high']).optional(),
    context: z.enum(['opening', 'middlegame', 'endgame']),
    openingName: z.string().nullable(),
    botReplySan: z.string().optional(),
    botReplyUci: z.string().optional(),
    candidates: z.array(z.object({ uci: z.string(), san: z.string(), eval: z.number() })).optional(),
  }),
});
```

- [ ] **Step 4: Implement server provider wrapper**

Create `src/server/ai/providers.ts`:

```ts
import type { AIAnalysisResponse, AnalysisRequestExtended, CoachProvider, GameStoryResponse, MoveNode } from '@/types/chess';
import { analyzeMoveWithOpenAI, analyzeGameWithOpenAI, askOpenAIFollowUp } from './openai';
import { analyzeMoveWithAnthropic, analyzeGameWithAnthropic, askAnthropicFollowUp } from './anthropic';

export async function analyzeMoveServer(provider: CoachProvider, request: AnalysisRequestExtended): Promise<AIAnalysisResponse> {
  return provider === 'openai' ? analyzeMoveWithOpenAI(request) : analyzeMoveWithAnthropic(request);
}

export async function analyzeGameServer(provider: CoachProvider, history: MoveNode[], language: 'en' | 'th'): Promise<GameStoryResponse> {
  return provider === 'openai' ? analyzeGameWithOpenAI(history, language) : analyzeGameWithAnthropic(history, language);
}

export async function askFollowUpServer(provider: CoachProvider, question: string, context: { fen: string; moveHistory: string[]; language?: 'en' | 'th' }): Promise<string> {
  return provider === 'openai' ? askOpenAIFollowUp(question, context) : askAnthropicFollowUp(question, context);
}
```

Port the current prompt and parser logic from `src/ai/openai.ts` and `src/ai/anthropic.ts`, but remove module-level mutable API key setters. Read keys from `getEnv()` inside each server call.

- [ ] **Step 5: Implement analyze route**

Create `app/api/coach/analyze-move/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/server/auth/currentUser';
import { analyzeMoveServer } from '@/server/ai/providers';
import { analyzeMovePayloadSchema } from '@/server/validation/coach';

export async function POST(request: Request) {
  await requireCurrentUser();
  const payload = analyzeMovePayloadSchema.parse(await request.json());
  const result = await analyzeMoveServer(payload.provider, payload.request);
  return NextResponse.json({ result });
}
```

Implement game-story and follow-up routes with the same pattern.

- [ ] **Step 6: Run coach tests**

```bash
npm run test -- tests/server/coach/coach-validation.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 7: Commit AI routes**

```bash
git add src/server/ai src/server/validation/coach.ts app/api/coach tests/server/coach
git commit -m "feat: move AI coach behind server routes"
```

---

## Task 11: Web Chess Board Interaction

**Files:**
- Create: `src/components/web/board/ChessBoard.tsx`
- Create: `src/components/web/board/BoardPieces.tsx`
- Create: `src/components/web/board/boardGeometry.ts`
- Create: `src/components/web/board/ChessBoard.module.css`
- Test: `tests/client/board/boardGeometry.test.ts`

- [ ] **Step 1: Write failing geometry test**

Create `tests/client/board/boardGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pointToSquare } from '@/components/web/board/boardGeometry';

describe('pointToSquare', () => {
  it('maps pointer coordinates to white-oriented board squares', () => {
    expect(pointToSquare({ x: 10, y: 10 }, { left: 0, top: 0, size: 800, flipped: false })).toBe('a8');
    expect(pointToSquare({ x: 790, y: 790 }, { left: 0, top: 0, size: 800, flipped: false })).toBe('h1');
  });

  it('maps pointer coordinates to black-oriented board squares', () => {
    expect(pointToSquare({ x: 10, y: 10 }, { left: 0, top: 0, size: 800, flipped: true })).toBe('h1');
    expect(pointToSquare({ x: 790, y: 790 }, { left: 0, top: 0, size: 800, flipped: true })).toBe('a8');
  });
});
```

- [ ] **Step 2: Run geometry test to verify red**

```bash
npm run test -- tests/client/board/boardGeometry.test.ts
```

Expected: fail because geometry file does not exist.

- [ ] **Step 3: Implement board geometry**

Create `src/components/web/board/boardGeometry.ts`:

```ts
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export interface BoardRect {
  left: number;
  top: number;
  size: number;
  flipped: boolean;
}

export function pointToSquare(point: { x: number; y: number }, rect: BoardRect): string | null {
  const localX = point.x - rect.left;
  const localY = point.y - rect.top;
  if (localX < 0 || localY < 0 || localX > rect.size || localY > rect.size) return null;

  const rawFile = Math.min(7, Math.max(0, Math.floor(localX / (rect.size / 8))));
  const rawRank = Math.min(7, Math.max(0, Math.floor(localY / (rect.size / 8))));
  const fileIndex = rect.flipped ? 7 - rawFile : rawFile;
  const rank = rect.flipped ? rawRank + 1 : 8 - rawRank;
  return `${files[fileIndex]}${rank}`;
}
```

- [ ] **Step 4: Run geometry test to verify green**

```bash
npm run test -- tests/client/board/boardGeometry.test.ts
```

Expected: pass.

- [ ] **Step 5: Implement board CSS**

Create `src/components/web/board/ChessBoard.module.css`:

```css
.board {
  width: min(92vw, 92vh, 720px);
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  contain: layout paint;
}

.square {
  position: relative;
  display: grid;
  place-items: center;
}

.light {
  background: #b7bdf8;
}

.dark {
  background: #6c7086;
}

.pieceLayer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.piece {
  position: absolute;
  width: 12.5%;
  height: 12.5%;
  display: grid;
  place-items: center;
  font-size: clamp(30px, 8vw, 62px);
  will-change: transform;
}

.dragged {
  z-index: 5;
  filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.32));
}
```

- [ ] **Step 6: Implement board component**

Create `src/components/web/board/ChessBoard.tsx` with props:

```ts
export interface WebChessBoardProps {
  fen: string;
  flipped: boolean;
  selectedSquare: string | null;
  legalMoves: string[];
  onSelectSquare: (square: string) => void;
  onMove: (from: string, to: string) => void;
}
```

Use one `onPointerDown`, `onPointerMove`, and `onPointerUp` on the board root. Store drag coordinates in `useRef` and update the dragged piece DOM node style directly or with local component state throttled by `requestAnimationFrame`.

- [ ] **Step 7: Run board tests and typecheck**

```bash
npm run test -- tests/client/board/boardGeometry.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 8: Commit board foundation**

```bash
git add src/components/web/board tests/client/board
git commit -m "feat: add web chess board interaction layer"
```

---

## Task 12: Client Game Store And Play Page

**Files:**
- Create: `src/client/stores/gameStore.ts`
- Create: `src/client/stores/settingsStore.ts`
- Create: `src/client/stores/historyStore.ts`
- Create: `app/(app)/play/page.tsx`
- Create: `app/(app)/play/PlayClient.tsx`

- [ ] **Step 1: Port game store without persistence side effects**

Create `src/client/stores/gameStore.ts` by adapting the current `src/store/gameStore.ts` and removing imports from `@/store/activeGame`, SQLite, SecureStore, Expo APIs, and React Native APIs. Keep these actions:

- `resetGame`
- `selectSquare`
- `makeMove`
- `makeBotMove`
- `undoMove`
- `resumeActiveGame`
- `clearHint`

Save active game by calling a new debounced helper:

```ts
async function saveActiveGame(record: { history: MoveNode[]; playerColor: 'w' | 'b'; currentMoveIndex: number; updatedAt: number }) {
  await fetch('/api/active-game', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(record),
  });
}
```

- [ ] **Step 2: Add play page server wrapper**

Create `app/(app)/play/page.tsx`:

```tsx
import { PlayClient } from './PlayClient';
import { getCurrentUser } from '@/server/auth/currentUser';

export default async function PlayPage() {
  await getCurrentUser();
  return <PlayClient />;
}
```

- [ ] **Step 3: Add play client**

Create `app/(app)/play/PlayClient.tsx`:

```tsx
'use client';

import { ChessBoard } from '@/components/web/board/ChessBoard';
import { useGameStore } from '@/client/stores/gameStore';

export function PlayClient() {
  const fen = useGameStore((state) => state.fen);
  const selectedSquare = useGameStore((state) => state.selectedSquare);
  const legalMoves = useGameStore((state) => state.legalMoves);
  const selectSquare = useGameStore((state) => state.selectSquare);
  const makeMove = useGameStore((state) => state.makeMove);
  const playerColor = useGameStore((state) => state.playerColor);

  return (
    <section>
      <h1>Play</h1>
      <ChessBoard
        fen={fen}
        flipped={playerColor === 'b'}
        selectedSquare={selectedSquare}
        legalMoves={legalMoves}
        onSelectSquare={selectSquare}
        onMove={(from, to) => makeMove(from, to)}
      />
    </section>
  );
}
```

- [ ] **Step 4: Verify play route**

```bash
npm run typecheck
```

Expected: pass after store imports are resolved.

- [ ] **Step 5: Commit play page**

```bash
git add src/client/stores app/'(app)'/play
git commit -m "feat: add web play page"
```

---

## Task 13: Dashboard, History, Settings, Analysis, And Tactics Pages

**Files:**
- Create: `app/(app)/page.tsx`
- Create: `app/(app)/history/page.tsx`
- Create: `app/(app)/settings/page.tsx`
- Create: `app/(app)/analysis/[gameId]/page.tsx`
- Create: `app/(app)/tactics/page.tsx`
- Create: `src/components/web/cards/*`
- Create: `src/components/web/settings/*`
- Create: `src/components/web/analysis/*`

- [ ] **Step 1: Implement dashboard**

Create `app/(app)/page.tsx`:

```tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <section>
      <p className="eyebrow">Chess Trainer</p>
      <h1>Play sharper, stay cozy.</h1>
      <div className="home-actions">
        <Link className="primary-button" href="/play">Play</Link>
        <Link href="/history">History</Link>
        <Link href="/settings">Settings</Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Implement history page**

Fetch `GET /api/games` from a client component and render date, result, bot strength, and link to `/analysis/:id`.

- [ ] **Step 3: Implement settings page**

Fetch `GET /api/settings`, render compact controls, and call `PATCH /api/settings` on change. Do not render provider API key fields.

- [ ] **Step 4: Implement analysis page**

Read `params.gameId`, fetch `GET /api/games/:gameId`, render game summary, move list, accuracy graph, and coach memory links using web DOM components.

- [ ] **Step 5: Implement tactics placeholder**

Create a useful first version with opening/tactic practice cards based on existing constants. Do not add a marketing page.

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 7: Commit app pages**

```bash
git add app/'(app)' src/components/web
git commit -m "feat: add web app pages"
```

---

## Task 14: Browser Stockfish Worker And Sound Feedback

**Files:**
- Create: `src/engine/stockfishWorkerClient.ts`
- Create: `public/workers/stockfish-loader.js`
- Copy from dependency: `public/workers/stockfish/stockfish.js`
- Copy from dependency: `public/workers/stockfish/stockfish.wasm`
- Copy from dependency: `public/workers/stockfish/stockfish.worker.js`
- Create: `src/client/sounds.ts`
- Test: `tests/client/engine/stockfish-client.test.ts`

- [ ] **Step 1: Add worker client fallback test**

Create `tests/client/engine/stockfish-client.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeBestMove } from '@/engine/stockfishWorkerClient';

describe('normalizeBestMove', () => {
  it('extracts bestmove from UCI output', () => {
    expect(normalizeBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4');
    expect(normalizeBestMove('info depth 1')).toBeNull();
  });
});
```

- [ ] **Step 2: Implement client helper**

Create `src/engine/stockfishWorkerClient.ts`:

```ts
export function normalizeBestMove(line: string): string | null {
  const match = line.match(/^bestmove\s+(\S+)/);
  return match?.[1] ?? null;
}

export class StockfishWorkerClient {
  private worker: Worker | null = null;

  start() {
    if (!this.worker && typeof Worker !== 'undefined') {
      this.worker = new Worker('/workers/stockfish-loader.js');
    }
  }

  stop() {
    this.worker?.terminate();
    this.worker = null;
  }
}
```

Copy the `stockfish.wasm` browser files into `public/workers/stockfish/`:

```bash
mkdir -p public/workers/stockfish
cp node_modules/stockfish.wasm/stockfish.js public/workers/stockfish/stockfish.js
cp node_modules/stockfish.wasm/stockfish.wasm public/workers/stockfish/stockfish.wasm
cp node_modules/stockfish.wasm/stockfish.worker.js public/workers/stockfish/stockfish.worker.js
```

Create `public/workers/stockfish-loader.js`:

```js
importScripts('/workers/stockfish/stockfish.js');

let enginePromise = self.Stockfish();

self.onmessage = async function onMessage(event) {
  const engine = await enginePromise;
  engine.addMessageListener(function onLine(line) {
    self.postMessage(line);
  });
  engine.postMessage(event.data);
};
```

- [ ] **Step 3: Add non-blocking web sounds**

Create `src/client/sounds.ts`:

```ts
export function playMoveTick(enabled: boolean) {
  if (!enabled || typeof AudioContext === 'undefined') return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 520;
  gain.gain.value = 0.02;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.035);
}
```

- [ ] **Step 4: Run engine tests**

```bash
npm run test -- tests/client/engine/stockfish-client.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 5: Commit worker foundation**

```bash
git add src/engine/stockfishWorkerClient.ts public/workers src/client/sounds.ts tests/client/engine
git commit -m "feat: add browser engine worker foundation"
```

---

## Task 15: E2E Login And Basic App Flow

**Files:**
- Create: `tests/e2e/auth.spec.ts`
- Create: `tests/e2e/play.spec.ts`
- Modify: `scripts/users.ts` if needed for test user creation.

- [ ] **Step 1: Write login E2E test**

Create `tests/e2e/auth.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('login page renders username password form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
```

- [ ] **Step 2: Write play page protected redirect test**

Create `tests/e2e/play.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('play page redirects anonymous users to login', async ({ page }) => {
  await page.goto('/play');
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 3: Run E2E tests**

```bash
npm run test:e2e
```

Expected: login form test passes and anonymous play redirect passes.

- [ ] **Step 4: Commit E2E coverage**

```bash
git add tests/e2e
git commit -m "test: add web auth smoke tests"
```

---

## Task 16: Documentation And Deployment Verification

**Files:**
- Modify: `README.md`
- Delete or replace: `.github/workflows/ios-build.yml`
- Create: `.github/workflows/web-check.yml`

- [ ] **Step 1: Rewrite README run instructions**

Update README with:

```markdown
## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`.

3. Create MongoDB indexes:

```bash
npm run db:indexes
```

4. Create a local user:

```bash
npm run user:create -- tokyo
```

5. Start the website:

```bash
npm run dev
```

Open http://localhost:3000 and log in with the created username.
```

- [ ] **Step 2: Replace iOS workflow**

Delete `.github/workflows/ios-build.yml`.

Create `.github/workflows/web-check.yml`:

```yaml
name: Web Check

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  web-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 3: Verify final checks**

Run:

```bash
npm run typecheck
npm run test
npm run build
```

Expected: all pass.

- [ ] **Step 4: Commit docs and CI**

```bash
git add README.md .github/workflows
git commit -m "docs: update web deployment workflow"
```

---

## Task 17: Cloudflare Dry Run

**Files:**
- Modify only config files if dry run exposes platform issues.

- [ ] **Step 1: Build OpenNext output**

Run:

```bash
npm run build
npx opennextjs-cloudflare build
```

Expected: `.open-next/worker.js` and `.open-next/assets` are created.

- [ ] **Step 2: Run local Worker preview**

Run:

```bash
npx wrangler dev
```

Expected: local Cloudflare Worker starts and serves the Next.js app.

- [ ] **Step 3: Confirm no client secret leak**

Run:

```bash
rg -n "OPENAI_API_KEY|ANTHROPIC_API_KEY|AUTH_SESSION_SECRET|MONGODB_URI" .next .open-next || true
```

Expected: no bundled secret values appear. Variable names may appear in server worker code; raw secret values must not.

- [ ] **Step 4: Commit platform fixes if any**

If changes were required:

```bash
git add next.config.ts wrangler.jsonc package.json package-lock.json
git commit -m "fix: align Next.js build with Cloudflare"
```

If no changes were required, do not create an empty commit.

---

## Completion Criteria

- Expo-native runtime is removed from the app path.
- Next.js app runs locally with `npm run dev`.
- Login works with a user created by `npm run user:create -- <username>`.
- Protected pages redirect anonymous users.
- Games, settings, active game, and coach memory persist through MongoDB.
- AI routes call providers server-side only.
- The chess board supports drag and tap on mobile viewport.
- `npm run typecheck`, `npm run test`, and `npm run build` pass.
- OpenNext build produces a Cloudflare Worker bundle.
