import { describe, expect, it } from 'vitest';

import { defaultSettings } from '@/constants/settings';
import { settingsPatchSchema } from '@/server/validation/settings';

describe('settingsPatchSchema', () => {
  it('accepts safe settings patches', () => {
    const parsed = settingsPatchSchema.safeParse({
      boardTheme: 'dark',
      botStrength: 12,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({
      boardTheme: 'dark',
      botStrength: 12,
    });
  });

  it('accepts provider API key fields', () => {
    expect(
      settingsPatchSchema.safeParse({
        openaiApiKey: 'sk-test',
      }).success,
    ).toBe(true);
    expect(
      settingsPatchSchema.safeParse({
        anthropicApiKey: 'sk-ant-test',
      }).success,
    ).toBe(true);
  });

  it('rejects generic API key fields', () => {
    expect(
      settingsPatchSchema.safeParse({
        apiKey: 'secret',
      }).success,
    ).toBe(false);
    expect(
      settingsPatchSchema.safeParse({
        openaiApiKey: '',
      }).success,
    ).toBe(false);
  });

  it('rejects invalid numeric settings values', () => {
    expect(settingsPatchSchema.safeParse({ botStrength: 0 }).success).toBe(
      false,
    );
    expect(settingsPatchSchema.safeParse({ botStrength: 12.5 }).success).toBe(
      false,
    );
    expect(settingsPatchSchema.safeParse({ botStrength: 21 }).success).toBe(
      false,
    );
    expect(settingsPatchSchema.safeParse({ botTimeMs: 99 }).success).toBe(
      false,
    );
    expect(settingsPatchSchema.safeParse({ botTimeMs: 100.5 }).success).toBe(
      false,
    );
    expect(settingsPatchSchema.safeParse({ botTimeMs: 10001 }).success).toBe(
      false,
    );
  });

  it('stays complete with default settings keys', () => {
    const {
      hasAnthropicKey: _hasAnthropicKey,
      hasOpenAIKey: _hasOpenAIKey,
      ...patchableDefaults
    } = defaultSettings;
    const parsed = settingsPatchSchema.safeParse(patchableDefaults);
    const defaultKeys = Object.keys(patchableDefaults).sort();
    const patchKeys = [
      ...defaultKeys,
      'anthropicApiKey',
      'openaiApiKey',
    ].sort();

    if (!parsed.success) {
      throw new Error('defaultSettings should be accepted by settingsPatchSchema');
    }

    expect(Object.keys(parsed.data).sort()).toEqual(defaultKeys);
    expect(Object.keys(settingsPatchSchema.shape).sort()).toEqual(patchKeys);
  });
});
