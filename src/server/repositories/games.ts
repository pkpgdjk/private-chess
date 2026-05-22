import { ObjectId, type Db } from 'mongodb';

import { collections } from '@/server/db/collections';
import type {
  SavedGameInput,
  SavedGamePatch,
} from '@/server/validation/games';
import type { SavedGame } from '@/types/chess';

export interface GameDocument extends Omit<SavedGame, 'id'> {
  _id: ObjectId;
  userId: ObjectId;
  legacyLocalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedGameResult {
  game: SavedGame;
  created: boolean;
}

function getObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function toSavedGame(document: GameDocument): SavedGame {
  return {
    id: document._id.toHexString(),
    date: document.date,
    pgn: document.pgn,
    result: document.result,
    playerColor: document.playerColor,
    botStrength: document.botStrength,
    coachMessages: document.coachMessages,
    moveHistory: document.moveHistory,
  };
}

export function gamesRepository(db: Db) {
  const games = db.collection<GameDocument>(collections.games);

  async function list(userId: ObjectId): Promise<SavedGame[]> {
    const documents = await games
      .find({ userId })
      .sort({ date: -1 })
      .limit(100)
      .toArray();

    return documents.map(toSavedGame);
  }

  async function get(
    userId: ObjectId,
    gameId: string,
  ): Promise<SavedGame | null> {
    const _id = getObjectId(gameId);

    if (!_id) {
      return null;
    }

    const document = await games.findOne({ _id, userId });
    return document ? toSavedGame(document) : null;
  }

  async function save(
    userId: ObjectId,
    game: SavedGameInput,
  ): Promise<SavedGameResult> {
    const now = new Date();
    const gameFields = {
      date: game.date,
      pgn: game.pgn,
      result: game.result,
      playerColor: game.playerColor,
      botStrength: game.botStrength,
      coachMessages: game.coachMessages,
      moveHistory: game.moveHistory,
      updatedAt: now,
    };

    if (game.id) {
      const result = await games.findOneAndUpdate(
        { userId, legacyLocalId: game.id },
        {
          $set: gameFields,
          $setOnInsert: {
            _id: new ObjectId(),
            userId,
            legacyLocalId: game.id,
            createdAt: now,
          },
        },
        {
          includeResultMetadata: true,
          returnDocument: 'after',
          upsert: true,
        },
      );

      const document =
        result.value ??
        (await games.findOne({ userId, legacyLocalId: game.id }));

      if (!document) {
        throw new Error('Failed to save game');
      }

      return {
        game: toSavedGame(document),
        created: Boolean(result.lastErrorObject?.upserted),
      };
    }

    const document: GameDocument = {
      _id: new ObjectId(),
      userId,
      ...gameFields,
      createdAt: now,
    };

    await games.insertOne(document);
    return {
      game: toSavedGame(document),
      created: true,
    };
  }

  async function patch(
    userId: ObjectId,
    gameId: string,
    patch: SavedGamePatch,
  ): Promise<SavedGame | null> {
    const _id = getObjectId(gameId);

    if (!_id) {
      return null;
    }

    const result = await games.findOneAndUpdate(
      { _id, userId },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );

    return result ? toSavedGame(result) : null;
  }

  async function deleteGame(userId: ObjectId, gameId: string): Promise<boolean> {
    const _id = getObjectId(gameId);

    if (!_id) {
      return false;
    }

    const result = await games.deleteOne({ _id, userId });
    return result.deletedCount === 1;
  }

  return {
    list,
    get,
    save,
    patch,
    delete: deleteGame,
  };
}
