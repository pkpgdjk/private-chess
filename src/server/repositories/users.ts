import { ObjectId } from 'mongodb';

import { withDb } from '@/server/db/client';
import { collections } from '@/server/db/collections';

export type UserDocument = {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
};

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function toObjectId(id: ObjectId | string): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

export async function findByUsername(
  username: string,
): Promise<UserDocument | null> {
  return withDb((db) => {
    const users = db.collection<UserDocument>(collections.users);

    return users.findOne({
      username: normalizeUsername(username),
      disabled: false,
    });
  });
}

export async function findById(
  id: ObjectId | string,
): Promise<UserDocument | null> {
  return withDb((db) => {
    const users = db.collection<UserDocument>(collections.users);

    return users.findOne({
      _id: toObjectId(id),
      disabled: false,
    });
  });
}

export async function createUser(
  username: string,
  passwordHash: string,
): Promise<UserDocument> {
  return withDb(async (db) => {
    const users = db.collection<UserDocument>(collections.users);
    const now = new Date();
    const user: UserDocument = {
      _id: new ObjectId(),
      username: normalizeUsername(username),
      passwordHash,
      disabled: false,
      createdAt: now,
      updatedAt: now,
    };

    await users.insertOne(user);

    return user;
  });
}

export async function setPassword(
  id: ObjectId | string,
  passwordHash: string,
): Promise<void> {
  await withDb(async (db) => {
    const users = db.collection<UserDocument>(collections.users);

    await users.updateOne(
      { _id: toObjectId(id), disabled: false },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
        },
      },
    );
  });
}

export async function disable(id: ObjectId | string): Promise<void> {
  await withDb(async (db) => {
    const users = db.collection<UserDocument>(collections.users);

    await users.updateOne(
      { _id: toObjectId(id) },
      {
        $set: {
          disabled: true,
          updatedAt: new Date(),
        },
      },
    );
  });
}

export async function markLogin(id: ObjectId | string): Promise<void> {
  await withDb(async (db) => {
    const users = db.collection<UserDocument>(collections.users);
    const now = new Date();

    await users.updateOne(
      { _id: toObjectId(id), disabled: false },
      {
        $set: {
          lastLoginAt: now,
          updatedAt: now,
        },
      },
    );
  });
}
