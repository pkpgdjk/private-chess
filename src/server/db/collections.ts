export const collections = {
  users: 'users',
  sessions: 'sessions',
  userSettings: 'userSettings',
  games: 'games',
  activeGames: 'activeGames',
  coachMemory: 'coachMemory',
} as const;

export type CollectionName = keyof typeof collections;
