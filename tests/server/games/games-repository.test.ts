import { ObjectId, type Db } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import { gamesRepository } from '@/server/repositories/games';
import type { SavedGameInput } from '@/server/validation/games';

describe('gamesRepository', () => {
  it('updates an existing user game when legacyLocalId is present', async () => {
    const userId = new ObjectId();
    const existingId = new ObjectId();
    const existingDocument = {
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
    const updatedDocument = {
      ...existingDocument,
      coachMessages: 'Good game',
      updatedAt: new Date(),
    };
    const findOne = vi
      .fn()
      .mockResolvedValueOnce(existingDocument)
      .mockResolvedValueOnce(updatedDocument);
    const updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    const insertOne = vi.fn();
    const db = {
      collection: vi.fn(() => ({
        findOne,
        updateOne,
        insertOne,
      })),
    } as unknown as Db;

    const saved = await gamesRepository(db).save(userId, completedGame());

    expect(saved).toEqual({
      game: expect.objectContaining({ id: existingId.toHexString() }),
      created: false,
    });
    expect(insertOne).not.toHaveBeenCalled();
    expect(findOne).toHaveBeenNthCalledWith(1, {
      userId,
      legacyLocalId: 'local-1',
    });
    expect(updateOne).toHaveBeenCalledWith(
      { _id: existingId, userId },
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
      },
    );
    expect(findOne).toHaveBeenNthCalledWith(2, { _id: existingId, userId });
  });

  it('inserts a new game when legacyLocalId has not been seen', async () => {
    const userId = new ObjectId();
    const findOne = vi.fn().mockResolvedValue(null);
    const insertOne = vi.fn().mockResolvedValue({ insertedId: new ObjectId() });
    const db = {
      collection: vi.fn(() => ({
        findOne,
        insertOne,
      })),
    } as unknown as Db;

    const saved = await gamesRepository(db).save(userId, completedGame());

    expect(saved.created).toBe(true);
    expect(saved.game).toEqual(expect.objectContaining({ result: 'win' }));
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(ObjectId),
        userId,
        legacyLocalId: 'local-1',
        date: 1779480000000,
        pgn: '1. e4 e5',
        result: 'win',
        playerColor: 'w',
        botStrength: 7,
        coachMessages: 'Good game',
        moveHistory: [],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
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
