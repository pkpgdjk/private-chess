import { argon2id, setWASMModules } from 'argon2-wasm-edge';

const passwordMinLength = 8;
const saltLength = 16;

type Argon2idHash = {
  memorySize: number;
  iterations: number;
  parallelism: number;
  salt: Uint8Array;
  digest: Uint8Array;
};

let wasmModuleSetupPromise: Promise<void> | null = null;

function isWebAssemblyModule(value: unknown): value is WebAssembly.Module {
  return value instanceof WebAssembly.Module;
}

function canUsePackageFallback(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('Invalid or unexpected token') ||
      error.message.includes('Unknown file extension') ||
      error.message.includes('Cannot find module') ||
      error.message.includes('does not provide an export named'))
  );
}

async function ensureWasmModules(): Promise<void> {
  wasmModuleSetupPromise ??= import('./argon2Modules')
    .then(async ({ argon2WASM, blake2bWASM }) => {
      if (
        !isWebAssemblyModule(argon2WASM) ||
        !isWebAssemblyModule(blake2bWASM)
      ) {
        return;
      }

      await setWASMModules({ argon2WASM, blake2bWASM });
    })
    .catch((error: unknown) => {
      if (canUsePackageFallback(error)) {
        return;
      }

      throw error;
    });

  await wasmModuleSetupPromise;
}

function decodeBase64(data: string): Uint8Array {
  const normalized = data.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = globalThis.atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function parsePositiveInteger(value: string | undefined): number {
  if (!value) {
    throw new Error('Missing Argon2id parameter');
  }

  const number = Number.parseInt(value, 10);

  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error('Invalid Argon2id parameter');
  }

  return number;
}

function parseArgon2idHash(hash: string): Argon2idHash {
  const match = hash.match(
    /^\$argon2id\$v=19\$([^$]+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/,
  );

  if (!match) {
    throw new Error('Invalid Argon2id hash');
  }

  const [, parameters, salt, digest] = match;
  const parsedParameters = new Map(
    parameters.split(',').map((parameter) => {
      const [name, value] = parameter.split('=');

      return [name, value];
    }),
  );

  return {
    memorySize: parsePositiveInteger(parsedParameters.get('m')),
    iterations: parsePositiveInteger(parsedParameters.get('t')),
    parallelism: parsePositiveInteger(parsedParameters.get('p')),
    salt: decodeBase64(salt),
    digest: decodeBase64(digest),
  };
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const maxLength = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }

  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < passwordMinLength) {
    throw new Error('Password must be at least 8 characters long');
  }

  await ensureWasmModules();

  const salt = new Uint8Array(saltLength);
  globalThis.crypto.getRandomValues(salt);

  return argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 19 * 1024,
    hashLength: 32,
    outputType: 'encoded',
  });
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  let parsedHash: Argon2idHash;

  await ensureWasmModules();

  try {
    parsedHash = parseArgon2idHash(passwordHash);
  } catch {
    return false;
  }

  const digest = await argon2id({
    password,
    salt: parsedHash.salt,
    parallelism: parsedHash.parallelism,
    iterations: parsedHash.iterations,
    memorySize: parsedHash.memorySize,
    hashLength: parsedHash.digest.length,
    outputType: 'binary',
  });

  return constantTimeEqual(digest, parsedHash.digest);
}
