import { ObjectId, type Db } from 'mongodb';

import { collections } from '@/server/db/collections';
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

interface CoachMemoryDocument extends Omit<CoachMemoryEntry, 'id'> {
  _id: ObjectId;
  userId: ObjectId;
  memoryKey: string;
  createdAt: Date;
  updatedAt: Date;
}

function toCoachMemoryEntry(document: CoachMemoryDocument): CoachMemoryEntry {
  return {
    id: document.memoryKey,
    label: document.label,
    detail: document.detail,
    severity: document.severity,
    count: document.count,
    lastSeen: document.lastSeen,
  };
}

export function coachMemoryRepository(db: Db) {
  const coachMemory = db.collection<CoachMemoryDocument>(
    collections.coachMemory,
  );

  async function list(userId: ObjectId): Promise<CoachMemoryEntry[]> {
    const documents = await coachMemory
      .find({ userId })
      .sort({ count: -1, lastSeen: -1 })
      .limit(100)
      .toArray();

    return documents.map(toCoachMemoryEntry);
  }

  async function recordGame(
    userId: ObjectId,
    history: MoveNode[],
    playerColor: 'w' | 'b',
  ): Promise<CoachMemoryEntry[]> {
    const updates = deriveCoachMemoryUpdates(history, playerColor);
    const now = new Date();
    const lastSeen = Date.now();

    for (const update of updates) {
      await coachMemory.updateOne(
        { userId, memoryKey: update.id },
        {
          $set: {
            label: update.label,
            detail: update.detail,
            severity: update.severity,
            lastSeen,
            updatedAt: now,
          },
          $inc: { count: update.count },
          $setOnInsert: {
            _id: new ObjectId(),
            userId,
            memoryKey: update.id,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }

    return list(userId);
  }

  async function clear(userId: ObjectId): Promise<number> {
    const result = await coachMemory.deleteMany({ userId });
    return result.deletedCount;
  }

  return {
    list,
    recordGame,
    clear,
  };
}
