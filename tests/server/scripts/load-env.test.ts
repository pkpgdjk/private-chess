import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadLocalEnv } from '../../../scripts/load-env';

const envKeys = ['MONGODB_URI', 'MONGODB_DB', 'AUTH_SESSION_SECRET'];
const originalCwd = process.cwd();
const originalEnv = new Map(
  envKeys.map((key) => [key, process.env[key]] as const),
);

afterEach(() => {
  process.chdir(originalCwd);

  for (const key of envKeys) {
    const value = originalEnv.get(key);

    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
});

describe('loadLocalEnv', () => {
  it('loads .env.local values for local scripts', () => {
    const directory = mkdtempSync(join(tmpdir(), 'private-chess-env-'));

    try {
      for (const key of envKeys) {
        delete process.env[key];
      }

      writeFileSync(
        join(directory, '.env.local'),
        [
          'MONGODB_URI="mongodb+srv://user:password@example/private_chess"',
          "MONGODB_DB='private_chess'",
          'AUTH_SESSION_SECRET=replace-with-at-least-32-characters',
        ].join('\n'),
      );
      process.chdir(directory);

      loadLocalEnv();

      expect(process.env.MONGODB_URI).toBe(
        'mongodb+srv://user:password@example/private_chess',
      );
      expect(process.env.MONGODB_DB).toBe('private_chess');
      expect(process.env.AUTH_SESSION_SECRET).toBe(
        'replace-with-at-least-32-characters',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('does not override already exported environment values', () => {
    const directory = mkdtempSync(join(tmpdir(), 'private-chess-env-'));

    try {
      process.env.MONGODB_URI = 'mongodb://exported';
      writeFileSync(
        join(directory, '.env.local'),
        'MONGODB_URI=mongodb://from-file',
      );
      process.chdir(directory);

      loadLocalEnv();

      expect(process.env.MONGODB_URI).toBe('mongodb://exported');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
