import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireCurrentUserMock = vi.hoisted(() => vi.fn());
const getDbMock = vi.hoisted(() => vi.fn());
const saveMock = vi.hoisted(() => vi.fn());
const recordGameMock = vi.hoisted(() => vi.fn());

vi.mock('@/server/auth/currentUser', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/server/db/client', () => ({
  getDb: getDbMock,
}));

vi.mock('@/server/repositories/games', () => ({
  gamesRepository: () => ({
    save: saveMock,
  }),
}));

vi.mock('@/server/repositories/coachMemory', () => ({
  coachMemoryRepository: () => ({
    recordGame: recordGameMock,
  }),
}));

describe('POST /api/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentUserMock.mockResolvedValue({
      id: new ObjectId().toHexString(),
      username: 'capablanca',
    });
    getDbMock.mockResolvedValue({});
    saveMock.mockResolvedValue({
      game: savedGame(),
      created: true,
    });
  });

  it('returns the saved game when coach memory recording fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    recordGameMock.mockRejectedValue(new Error('memory unavailable'));
    const { POST } = await import('../../../app/api/games/route');

    const response = await POST(
      new Request('http://localhost/api/games', {
        method: 'POST',
        body: JSON.stringify(completedGamePayload()),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      game: expect.objectContaining({
        result: 'win',
        pgn: '1. e4 e5',
      }),
      coachMemory: [],
    });
    expect(response.status).toBe(201);
    expect(warn).toHaveBeenCalledWith(
      'Failed to record coach memory for saved game',
      expect.any(Error),
    );

    warn.mockRestore();
  });

  it('does not record coach memory for existing legacyLocalId retries', async () => {
    saveMock.mockResolvedValue({
      game: savedGame(),
      created: false,
    });
    const { POST } = await import('../../../app/api/games/route');

    const response = await POST(
      new Request('http://localhost/api/games', {
        method: 'POST',
        body: JSON.stringify(completedGamePayload()),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      game: expect.objectContaining({
        result: 'win',
        pgn: '1. e4 e5',
      }),
      coachMemory: [],
    });
    expect(response.status).toBe(201);
    expect(recordGameMock).not.toHaveBeenCalled();
  });
});

function savedGame() {
  return {
    id: new ObjectId().toHexString(),
    date: 1779480000000,
    pgn: '1. e4 e5',
    result: 'win',
    playerColor: 'w',
    botStrength: 7,
    coachMessages: 'Good game',
    moveHistory: [],
  };
}

function completedGamePayload() {
  return {
    id: 'local-1',
    date: 1779480000000,
    pgn: '1. e4 e5',
    result: 'win',
    playerColor: 'w',
    botStrength: 7,
    coachMessages: 'Good game',
    moveHistory: [],
  };
}
