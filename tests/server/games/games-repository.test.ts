import { ObjectId, type Db } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import { gamesRepository } from '@/server/repositories/games';
import type { SavedGameInput } from '@/server/validation/games';

describe('gamesRepository', () => {
  it('updates an existing user game when legacyLocalId is present', async () => {
    const userId = new ObjectId();
    const existingId = new ObjectId();
    const updatedDocument = {
      _id: existingId,
      userId,
      legacyLocalId: 'local-1',
      date: 1779480000000,
      pgn: '1. e4 e5',
      result: 'win',
      playerColor: 'w',
      botStrength: 7,
      coachMessages: 'Good game',
      moveHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const findOneAndUpdate = vi.fn().mockResolvedValue({
      value: updatedDocument,
      lastErrorObject: { updatedExisting: true },
      ok: 1,
    });
    const insertOne = vi.fn();
    const db = {
      collection: vi.fn(() => ({
        findOneAndUpdate,
        insertOne,
      })),
    } as unknown as Db;

    const saved = await gamesRepository(db).save(userId, completedGame());

    expect(saved).toEqual({
      game: expect.objectContaining({ id: existingId.toHexString() }),
      created: false,
    });
    expect(insertOne).not.toHaveBeenCalled();
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { userId, legacyLocalId: 'local-1' },
      {
        $set: expect.objectContaining({
          date: 1779480000000,
          pgn: '1. e4 e5',
          result: 'win',
          playerColor: 'w',
          botStrength: 7,
          coachMessages: 'Good game',
          moveHistory: [],
          updatedAt: expect.any(Date),
        }),
        $setOnInsert: expect.objectContaining({
          _id: expect.any(ObjectId),
          userId,
          legacyLocalId: 'local-1',
          createdAt: expect.any(Date),
        }),
      },
      expect.objectContaining({
        includeResultMetadata: true,
        returnDocument: 'after',
        upsert: true,
      }),
    );
  });

  it('inserts a new game when legacyLocalId has not been seen', async () => {
    const userId = new ObjectId();
    const insertedId = new ObjectId();
    const findOneAndUpdate = vi.fn().mockResolvedValue({
      value: {
        _id: insertedId,
        userId,
        legacyLocalId: 'local-1',
        ...completedGame(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      lastErrorObject: { upserted: insertedId },
      ok: 1,
    });
    const insertOne = vi.fn();
    const db = {
      collection: vi.fn(() => ({
        findOneAndUpdate,
        insertOne,
      })),
    } as unknown as Db;

    const saved = await gamesRepository(db).save(userId, completedGame());

    expect(saved.created).toBe(true);
    expect(saved.game).toEqual(expect.objectContaining({ result: 'win' }));
    expect(insertOne).not.toHaveBeenCalled();
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        userId,
        legacyLocalId: 'local-1',
      },
      {
        $set: expect.objectContaining({
          date: 1779480000000,
          pgn: '1. e4 e5',
          result: 'win',
          playerColor: 'w',
          botStrength: 7,
          coachMessages: 'Good game',
          moveHistory: [],
          updatedAt: expect.any(Date),
        }),
        $setOnInsert: expect.objectContaining({
          _id: expect.any(ObjectId),
          userId,
          legacyLocalId: 'local-1',
          createdAt: expect.any(Date),
        }),
      },
      expect.objectContaining({
        includeResultMetadata: true,
        returnDocument: 'after',
        upsert: true,
      }),
    );
  });

  it('inserts games without a legacyLocalId as new rows', async () => {
    const userId = new ObjectId();
    const insertOne = vi.fn().mockResolvedValue({ insertedId: new ObjectId() });
    const findOneAndUpdate = vi.fn();
    const db = {
      collection: vi.fn(() => ({
        findOneAndUpdate,
        insertOne,
      })),
    } as unknown as Db;

    const { id: _legacyId, ...gameWithoutLegacyId } = completedGame();
    const saved = await gamesRepository(db).save(userId, gameWithoutLegacyId);

    expect(saved.created).toBe(true);
    expect(findOneAndUpdate).not.toHaveBeenCalled();
    expect(insertOne).toHaveBeenCalledWith(
      expect.not.objectContaining({ legacyLocalId: expect.anything() }),
    );
  });
});

function completedGame(): SavedGameInput {
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
