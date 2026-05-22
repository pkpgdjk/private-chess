import { PassThrough, Writable } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import { promptPassword } from '../../../scripts/users';

type RawInput = PassThrough & {
  isTTY: boolean;
  setRawMode: (mode: boolean) => unknown;
};

class CapturingOutput extends Writable {
  chunks: string[] = [];

  _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    this.chunks.push(chunk.toString());
    callback();
  }

  text() {
    return this.chunks.join('');
  }
}

function createInput(): RawInput {
  const input = new PassThrough() as RawInput;
  input.isTTY = true;
  input.setRawMode = vi.fn((_mode: boolean) => undefined);

  return input;
}

describe('users CLI password prompt', () => {
  it('reads a password without echoing typed characters', async () => {
    const input = createInput();
    const output = new CapturingOutput();

    const passwordPromise = promptPassword('Password: ', { input, output });

    input.write('secret-password\n');

    await expect(passwordPromise).resolves.toBe('secret-password');
    expect(output.text()).toBe('Password: \n');
    expect(output.text()).not.toContain('secret-password');
  });

  it('restores raw mode and rejects when Ctrl+C is pressed', async () => {
    const input = createInput();
    const output = new CapturingOutput();

    const passwordPromise = promptPassword('Password: ', { input, output });

    input.write('\u0003');

    await expect(passwordPromise).rejects.toThrow('Password prompt cancelled');
    expect(input.setRawMode).toHaveBeenNthCalledWith(1, true);
    expect(input.setRawMode).toHaveBeenLastCalledWith(false);
    expect(output.text()).toBe('Password: \n');
  });
});
