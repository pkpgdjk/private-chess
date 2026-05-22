import { ObjectId, type Collection } from 'mongodb';

import { sessionDurationMs } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import { collections } from '@/server/db/collections';

export type SessionDocument = {
  _id: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

async function getSessionsCollection(): Promise<Collection<SessionDocument>> {
  const db = await getDb();

  return db.collection<SessionDocument>(collections.sessions);
}

function toObjectId(id: ObjectId | string): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

export async function createSession(
  userId: ObjectId | string,
  tokenHash: string,
): Promise<SessionDocument> {
  const sessions = await getSessionsCollection();
  const now = new Date();
  const session: SessionDocument = {
    _id: new ObjectId(),
    userId: toObjectId(userId),
    tokenHash,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + sessionDurationMs),
  };

  await sessions.insertOne(session);

  return session;
}

export async function findValidByTokenHash(
  tokenHash: string,
): Promise<SessionDocument | null> {
  const sessions = await getSessionsCollection();

  return sessions.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
}

export async function touch(id: ObjectId | string): Promise<void> {
  const sessions = await getSessionsCollection();

  await sessions.updateOne(
    { _id: toObjectId(id) },
    {
      $set: {
        updatedAt: new Date(),
      },
    },
  );
}

export async function deleteByTokenHash(tokenHash: string): Promise<void> {
  const sessions = await getSessionsCollection();

  await sessions.deleteOne({ tokenHash });
}
