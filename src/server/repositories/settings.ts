import { ObjectId, type Db } from 'mongodb';

import { defaultSettings } from '@/constants/settings';
import { decryptApiKey, encryptApiKey } from '@/server/crypto/apiKeys';
import { collections } from '@/server/db/collections';
import type { SettingsPatch } from '@/server/validation/settings';
import type { Settings } from '@/types/chess';

type EncryptedApiKeys = {
  anthropic?: string;
  openai?: string;
};

type StoredSettings = Omit<Settings, 'hasAnthropicKey' | 'hasOpenAIKey'>;

export type UserSettingsDocument = {
  _id: ObjectId;
  userId: ObjectId;
  settings: StoredSettings;
  encryptedApiKeys?: EncryptedApiKeys;
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

function withApiKeyStatus(
  settings?: Partial<Settings>,
  encryptedApiKeys?: EncryptedApiKeys,
): Settings {
  return {
    ...withDefaults(settings),
    hasAnthropicKey: Boolean(encryptedApiKeys?.anthropic),
    hasOpenAIKey: Boolean(encryptedApiKeys?.openai),
  };
}

function splitSettingsPatch(patch: SettingsPatch) {
  const { anthropicApiKey, openaiApiKey, ...settingsPatch } = patch;

  return {
    anthropicApiKey,
    openaiApiKey,
    settingsPatch,
  };
}

function toStoredSettings(settings: Settings): StoredSettings {
  const {
    hasAnthropicKey: _hasAnthropicKey,
    hasOpenAIKey: _hasOpenAIKey,
    ...storedSettings
  } = settings;

  return storedSettings;
}

export function settingsRepository(db: Db) {
  const userSettings = db.collection<UserSettingsDocument>(
    collections.userSettings,
  );

  async function getForUser(userId: ObjectId | string): Promise<Settings> {
    const objectUserId = toObjectId(userId);
    const document = await userSettings.findOne({ userId: objectUserId });

    if (document) {
      return withApiKeyStatus(document.settings, document.encryptedApiKeys);
    }

    const now = new Date();
    const settings = withApiKeyStatus();

    await userSettings.updateOne(
      { userId: objectUserId },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          userId: objectUserId,
          settings: toStoredSettings(settings),
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
    const { anthropicApiKey, openaiApiKey, settingsPatch } =
      splitSettingsPatch(patch);
    const encryptedApiKeys: EncryptedApiKeys = {
      ...document?.encryptedApiKeys,
    };
    const encryptedAnthropicKey = await encryptApiKey(anthropicApiKey);
    const encryptedOpenAIKey = await encryptApiKey(openaiApiKey);

    if (encryptedAnthropicKey) {
      encryptedApiKeys.anthropic = encryptedAnthropicKey;
    }

    if (encryptedOpenAIKey) {
      encryptedApiKeys.openai = encryptedOpenAIKey;
    }

    const settings = withApiKeyStatus({
      ...document?.settings,
      ...settingsPatch,
    }, encryptedApiKeys);

    const setFields: Record<string, unknown> = {
      settings: toStoredSettings(settings),
      updatedAt: now,
    };

    if (encryptedAnthropicKey) {
      setFields['encryptedApiKeys.anthropic'] = encryptedAnthropicKey;
    }

    if (encryptedOpenAIKey) {
      setFields['encryptedApiKeys.openai'] = encryptedOpenAIKey;
    }

    await userSettings.updateOne(
      { userId: objectUserId },
      {
        $set: setFields,
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

  async function getProviderApiKey(
    userId: ObjectId | string,
    provider: keyof EncryptedApiKeys,
  ): Promise<string | null> {
    const objectUserId = toObjectId(userId);
    const document = await userSettings.findOne({ userId: objectUserId });

    return decryptApiKey(document?.encryptedApiKeys?.[provider]);
  }

  return {
    getForUser,
    getProviderApiKey,
    patchForUser,
  };
}
