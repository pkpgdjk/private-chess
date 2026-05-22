import { ObjectId, type Db } from 'mongodb';

import { collections } from '@/server/db/collections';
import type { ActiveGameInput } from '@/server/validation/games';
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
  const activeGames = db.collection<ActiveGameDocument>(
    collections.activeGames,
  );

  async function get(userId: ObjectId): Promise<ActiveGameInput | null> {
    const document = await activeGames.findOne({ userId });

    if (!document) {
      return null;
    }

    return {
      history: document.history,
      playerColor: document.playerColor,
      currentMoveIndex: document.currentMoveIndex,
      updatedAt: document.updatedAt,
    };
  }

  async function put(
    userId: ObjectId,
    record: ActiveGameInput,
  ): Promise<ActiveGameInput> {
    await activeGames.updateOne(
      { userId },
      {
        $set: {
          history: record.history,
          playerColor: record.playerColor,
          currentMoveIndex: record.currentMoveIndex,
          updatedAt: record.updatedAt,
          userId,
        },
        $setOnInsert: {
          _id: new ObjectId(),
        },
      },
      { upsert: true },
    );

    return record;
  }

  async function deleteActiveGame(userId: ObjectId): Promise<boolean> {
    const result = await activeGames.deleteOne({ userId });
    return result.deletedCount === 1;
  }

  return {
    get,
    put,
    delete: deleteActiveGame,
  };
}
