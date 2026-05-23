import { ObjectId, type Db } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import { settingsRepository } from '@/server/repositories/settings';

describe('settingsRepository API key storage', () => {
  it('stores provider API keys encrypted and returns only saved-key status', async () => {
    const userId = new ObjectId();
    const findOne = vi.fn().mockResolvedValue(null);
    const updateOne = vi.fn();
    const db = {
      collection: vi.fn(() => ({
        findOne,
        updateOne,
      })),
    } as unknown as Db;

    const settings = await settingsRepository(db).patchForUser(userId, {
      openaiApiKey: 'sk-user-openai',
    });

    expect(settings.hasOpenAIKey).toBe(true);
    expect(settings).not.toHaveProperty('openaiApiKey');
    expect(updateOne).toHaveBeenCalledWith(
      { userId },
      expect.objectContaining({
        $set: expect.objectContaining({
          'encryptedApiKeys.openai': expect.not.stringContaining('sk-user-openai'),
        }),
      }),
      { upsert: true },
    );
  });

  it('reports saved API keys without exposing encrypted values in settings', async () => {
    const userId = new ObjectId();
    const findOne = vi.fn().mockResolvedValue({
      _id: new ObjectId(),
      userId,
      settings: {},
      encryptedApiKeys: {
        anthropic: 'v1:stored-anthropic-key',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const updateOne = vi.fn();
    const db = {
      collection: vi.fn(() => ({
        findOne,
        updateOne,
      })),
    } as unknown as Db;

    const settings = await settingsRepository(db).getForUser(userId);

    expect(settings.hasAnthropicKey).toBe(true);
    expect(settings.hasOpenAIKey).toBe(false);
    expect(settings).not.toHaveProperty('anthropicApiKey');
    expect(updateOne).not.toHaveBeenCalled();
  });
});
