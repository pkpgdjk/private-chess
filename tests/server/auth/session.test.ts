import { describe, expect, it } from 'vitest';

import { createSessionToken, hashSessionToken } from '@/server/auth/session';

describe('session token helpers', () => {
  it('creates long random tokens and hashes them deterministically', async () => {
    const tokenA = createSessionToken();
    const tokenB = createSessionToken();

    expect(tokenA).toHaveLength(43);
    expect(tokenB).toHaveLength(43);
    expect(tokenA).not.toBe(tokenB);

    const hashA = await hashSessionToken(tokenA);
    const hashAAgain = await hashSessionToken(tokenA);
    const hashB = await hashSessionToken(tokenB);

    expect(hashA).toBe(hashAAgain);
    expect(hashA).not.toBe(tokenA);
    expect(hashA).not.toBe(hashB);
  });
});
