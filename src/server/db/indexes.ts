import type { CreateIndexesOptions, IndexSpecification } from 'mongodb';

import { collections, type CollectionName } from './collections';

export type IndexSpec = {
  collection: CollectionName;
  keys: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
};

export function getIndexSpecs(): IndexSpec[] {
  return [
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
  ];
}

export function getCollectionName(name: CollectionName) {
  return collections[name];
}
