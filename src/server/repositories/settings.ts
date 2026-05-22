import { ObjectId, type Collection, type Db } from 'mongodb';

import { defaultSettings } from '@/constants/settings';
import { collections } from '@/server/db/collections';
import type { SettingsPatch } from '@/server/validation/settings';
import type { Settings } from '@/types/chess';

export type UserSettingsDocument = {
  _id: ObjectId;
  userId: ObjectId;
  settings: Settings;
  createdAt: Date;
  updatedAt: Date;
};

function toObjectId(id: ObjectId | string): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

function withDefaults(settings?: Partial<Settings>): Settings {
  return {
    ...defaultSettings,
    ...settings,
  };
}

export function settingsRepository(db: Db) {
  const userSettings = db.collection<UserSettingsDocument>(
    collections.userSettings,
  );

  async function getForUser(userId: ObjectId | string): Promise<Settings> {
    const objectUserId = toObjectId(userId);
    const document = await userSettings.findOne({ userId: objectUserId });

    if (document) {
      return withDefaults(document.settings);
    }

    const now = new Date();
    const settings = withDefaults();

    await userSettings.updateOne(
      { userId: objectUserId },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          userId: objectUserId,
          settings,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    return settings;
  }

  async function patchForUser(
    userId: ObjectId | string,
    patch: SettingsPatch,
  ): Promise<Settings> {
    const objectUserId = toObjectId(userId);
    const document = await userSettings.findOne({ userId: objectUserId });
    const now = new Date();
    const settings = withDefaults({
      ...document?.settings,
      ...patch,
    });

    await userSettings.updateOne(
      { userId: objectUserId },
      {
        $set: {
          settings,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          userId: objectUserId,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return settings;
  }

  return {
    getForUser,
    patchForUser,
  };
}
