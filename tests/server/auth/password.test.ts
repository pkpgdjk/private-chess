import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '@/server/auth/password';

describe('password helpers', () => {
  it('hashes passwords without storing plaintext and verifies only the correct password', async () => {
    const password = 'correct horse battery staple';

    const hash = await hashPassword(password);

    expect(hash).not.toContain(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong horse battery staple', hash)).resolves.toBe(
      false,
    );
  });

  it('rejects passwords shorter than 8 characters', async () => {
    await expect(hashPassword('short')).rejects.toThrow(
      'at least 8 characters',
    );
  });
});
