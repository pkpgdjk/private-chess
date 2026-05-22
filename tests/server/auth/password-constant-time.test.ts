import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);

async function compilePackageWasm(path: string): Promise<WebAssembly.Module> {
  const bytes = await readFile(require.resolve(path));

  return WebAssembly.compile(bytes);
}

describe('verifyPassword', () => {
  it('hashes and verifies without runtime WebAssembly compilation', async () => {
    vi.resetModules();
    const [argon2WASM, blake2bWASM] = await Promise.all([
      compilePackageWasm('argon2-wasm-edge/wasm/argon2.wasm'),
      compilePackageWasm('argon2-wasm-edge/wasm/blake2b.wasm'),
    ]);

    vi.doMock('@/server/auth/argon2Modules', () => ({
      argon2WASM,
      blake2bWASM,
    }));

    const compileSpy = vi
      .spyOn(WebAssembly, 'compile')
      .mockRejectedValue(new Error('runtime compile is not allowed'));

    try {
      const { hashPassword, verifyPassword } = await import(
        '@/server/auth/password'
      );
      const hash = await hashPassword('correct horse battery staple');

      await expect(
        verifyPassword('correct horse battery staple', hash),
      ).resolves.toBe(true);
    } finally {
      compileSpy.mockRestore();
    }
  });

  it('does not delegate digest comparison to the package verifier', async () => {
    vi.resetModules();
    vi.doMock('argon2-wasm-edge', async (importOriginal) => {
      const actual =
        await importOriginal<typeof import('argon2-wasm-edge')>();

      return {
        ...actual,
        argon2Verify: vi.fn(() => {
          throw new Error('package verifier should not be used');
        }),
      };
    });

    const { hashPassword, verifyPassword } = await import(
      '@/server/auth/password'
    );
    const hash = await hashPassword('correct horse battery staple');

    await expect(
      verifyPassword('correct horse battery staple', hash),
    ).resolves.toBe(true);
  });
});
