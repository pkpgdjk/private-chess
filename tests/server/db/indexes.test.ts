import { describe, expect, it } from 'vitest';

import { getIndexSpecs } from '@/server/db/indexes';

describe('getIndexSpecs', () => {
  it('defines all required indexes from the persistence plan', () => {
    const specs = getIndexSpecs();
    const indexNames = specs.map((spec) => spec.options.name);

    expect(new Set(indexNames).size).toBe(indexNames.length);
    expect(specs).toEqual(
      expect.arrayContaining([
      {
        collection: 'users',
        keys: { username: 1 },
        options: { unique: true, name: 'users_username_unique' },
      },
      {
        collection: 'users',
        keys: { disabled: 1 },
        options: { name: 'users_disabled' },
      },
      {
        collection: 'sessions',
        keys: { tokenHash: 1 },
        options: { unique: true, name: 'sessions_token_hash_unique' },
      },
      {
        collection: 'sessions',
        keys: { userId: 1 },
        options: { name: 'sessions_user' },
      },
      {
        collection: 'sessions',
        keys: { expiresAt: 1 },
        options: { expireAfterSeconds: 0, name: 'sessions_expiry_ttl' },
      },
      {
        collection: 'userSettings',
        keys: { userId: 1 },
        options: { unique: true, name: 'user_settings_user_unique' },
      },
      {
        collection: 'games',
        keys: { userId: 1, date: -1 },
        options: { name: 'games_user_date_desc' },
      },
      {
        collection: 'games',
        keys: { userId: 1, legacyLocalId: 1 },
        options: {
          unique: true,
          partialFilterExpression: { legacyLocalId: { $type: 'string' } },
          name: 'games_user_legacy_local_id_unique',
        },
      },
      {
        collection: 'activeGames',
        keys: { userId: 1 },
        options: { unique: true, name: 'active_games_user_unique' },
      },
      {
        collection: 'coachMemory',
        keys: { userId: 1, memoryKey: 1 },
        options: { unique: true, name: 'coach_memory_user_key_unique' },
      },
      {
        collection: 'coachMemory',
        keys: { userId: 1, count: -1, lastSeen: -1 },
        options: { name: 'coach_memory_user_rank' },
      },
      ]),
    );
  });
});
